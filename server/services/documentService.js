const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');

// Dimensiones estándar de hoja A4 en puntos tipográficos (72 dpi)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 28.35; // ~10 mm de margen de seguridad

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.gif'];
const WORD_EXTENSIONS = ['.docx', '.doc', '.rtf', '.odt', '.txt'];

/**
 * Convierte un documento de Word/Office a PDF usando la automatización nativa de Windows
 */
function convertWordToPdf(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const fullIn = path.resolve(inputPath).replace(/'/g, "''");
    const fullOut = path.resolve(outputPath).replace(/'/g, "''");

    const psScript = `
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open('${fullIn}', $false, $true)
    $doc.ExportAsFixedFormat('${fullOut}', 17)
    $doc.Close([ref]$false)
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
`;

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;

    exec(psCmd, { timeout: 35000 }, (err, stdout, stderr) => {
      if (err || !fs.existsSync(outputPath)) {
        reject(new Error(`No se pudo convertir el documento Word a PDF: ${err ? err.message : stderr}`));
      } else {
        resolve(outputPath);
      }
    });
  });
}

/**
 * Convierte cualquier formato de foto/imagen a un PDF A4 perfectamente centrado y con rotación correcta (EXIF)
 */
async function convertImageToA4Pdf(imagePath, outputPath) {
  // Procesar con sharp: corrige rotación de celulares (.rotate()) y estandariza a JPEG de alta fidelidad
  const jpegBuffer = await sharp(imagePath)
    .rotate()
    .toFormat('jpeg', { quality: 94 })
    .toBuffer();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  const embeddedImage = await pdfDoc.embedJpg(jpegBuffer);
  const imgWidth = embeddedImage.width;
  const imgHeight = embeddedImage.height;

  // Calcular escala manteniendo la proporción dentro del área A4 con margen
  const maxWidth = A4_WIDTH - (MARGIN * 2);
  const maxHeight = A4_HEIGHT - (MARGIN * 2);

  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1.0);
  const finalWidth = imgWidth * scale;
  const finalHeight = imgHeight * scale;

  // Centrar en la hoja A4
  const x = (A4_WIDTH - finalWidth) / 2;
  const y = (A4_HEIGHT - finalHeight) / 2;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: finalWidth,
    height: finalHeight
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}

/**
 * Combina múltiples fotos en un único PDF A4, colocando cada foto en su propia página centrada y con rotación EXIF corregida
 */
async function combineImagesToA4Pdf(imagePaths, outputPath) {
  const pdfDoc = await PDFDocument.create();

  for (const imagePath of imagePaths) {
    const jpegBuffer = await sharp(imagePath)
      .rotate()
      .toFormat('jpeg', { quality: 94 })
      .toBuffer();

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const embeddedImage = await pdfDoc.embedJpg(jpegBuffer);
    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    const maxWidth = A4_WIDTH - (MARGIN * 2);
    const maxHeight = A4_HEIGHT - (MARGIN * 2);

    const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1.0);
    const finalWidth = imgWidth * scale;
    const finalHeight = imgHeight * scale;

    const x = (A4_WIDTH - finalWidth) / 2;
    const y = (A4_HEIGHT - finalHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: finalWidth,
      height: finalHeight
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}

/**
 * Inspecciona cualquier archivo subido y lo estandariza a PDF A4 si es necesario
 */
async function inspectDocument(filePath, originalFilename, mimeType, uploadsDir = path.dirname(filePath)) {
  const ext = path.extname(originalFilename || filePath).toLowerCase();
  const isPdf = ext === '.pdf' || mimeType === 'application/pdf';
  const isImage = IMAGE_EXTENSIONS.includes(ext) || (mimeType && mimeType.startsWith('image/'));
  const isWord = WORD_EXTENSIONS.includes(ext) || (mimeType && (
    mimeType.includes('word') || mimeType.includes('officedocument') || mimeType.includes('rtf')
  ));

  if (isPdf) {
    const fileBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    return {
      type: 'pdf',
      pageCount,
      isImage: false,
      isWord: false,
      name: originalFilename || path.basename(filePath),
      pdfPath: filePath
    };
  }

  if (isImage) {
    const convertedPath = path.join(uploadsDir, `a4_img_${Date.now()}.pdf`);
    await convertImageToA4Pdf(filePath, convertedPath);

    return {
      type: 'image',
      pageCount: 1,
      isImage: true,
      isWord: false,
      name: originalFilename || path.basename(filePath),
      pdfPath: convertedPath
    };
  }

  if (isWord) {
    const convertedPath = path.join(uploadsDir, `a4_word_${Date.now()}.pdf`);
    await convertWordToPdf(filePath, convertedPath);

    const fileBytes = fs.readFileSync(convertedPath);
    const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    return {
      type: 'word',
      pageCount,
      isImage: false,
      isWord: true,
      name: originalFilename || path.basename(filePath),
      pdfPath: convertedPath
    };
  }

  throw new Error(`Formato no soportado: ${ext}. Se admiten PDFs, Word (.docx, .doc, .rtf, .txt) y Fotos (.jpg, .png, .webp, .heic, etc).`);
}

/**
 * Divide un PDF para el proceso de Dúplex Manual de la Epson L3560
 * Genera dos PDFs:
 * - Tanda 1 (Impares): páginas 1, 3, 5...
 * - Tanda 2 (Pares orden inverso): para alimentar directamente desde la bandeja trasera sin reordenar a mano
 */
async function splitPdfForManualDuplex(inputPdfPath, outputDir) {
  const fileBytes = fs.readFileSync(inputPdfPath);
  const srcDoc = await PDFDocument.load(fileBytes);
  const totalPages = srcDoc.getPageCount();

  if (totalPages <= 1) {
    return {
      isSinglePage: true,
      oddsPath: inputPdfPath,
      evensPath: null,
      totalPages: 1
    };
  }

  const oddsIndices = [];
  const evensIndices = [];

  for (let i = 0; i < totalPages; i++) {
    if (i % 2 === 0) {
      oddsIndices.push(i); // Índice 0 = Pág 1, Índice 2 = Pág 3...
    } else {
      evensIndices.push(i); // Índice 1 = Pág 2, Índice 3 = Pág 4...
    }
  }

  // Tanda 1: Impares (1, 3, 5...)
  const oddsDoc = await PDFDocument.create();
  const copiedOddPages = await oddsDoc.copyPages(srcDoc, oddsIndices);
  copiedOddPages.forEach(p => oddsDoc.addPage(p));
  const oddsPath = path.join(outputDir, `tanda_impares_${Date.now()}.pdf`);
  fs.writeFileSync(oddsPath, await oddsDoc.save());

  // Tanda 2: Pares en orden natural (2, 4, 6...)
  // Al girar la pila 180° e insertarla en la bandeja trasera vertical con la cara en blanco
  // mirando al frente, el rodillo toma primero la hoja de la pág 1 (que recibe la pág 2),
  // luego la hoja de la pág 3 (que recibe la pág 4), etc.
  const evensDoc = await PDFDocument.create();
  const copiedEvenPages = await evensDoc.copyPages(srcDoc, evensIndices);
  copiedEvenPages.forEach(p => evensDoc.addPage(p));
  const evensPath = path.join(outputDir, `tanda_pares_${Date.now()}.pdf`);
  fs.writeFileSync(evensPath, await evensDoc.save());

  return {
    isSinglePage: false,
    oddsPath,
    evensPath,
    oddsCount: oddsIndices.length,
    evensCount: evensIndices.length,
    totalPages
  };
}

/**
 * Extrae únicamente las páginas seleccionadas de un PDF y genera un nuevo PDF limpio
 * @param {string} inputPdfPath - Ruta del PDF original
 * @param {number[]} selectedPageNumbers - Array de números de página (1-indexados: [1, 3, 5])
 * @param {string} outputPath - Ruta de destino
 */
async function extractSelectedPages(inputPdfPath, selectedPageNumbers, outputPath) {
  const fileBytes = fs.readFileSync(inputPdfPath);
  const srcDoc = await PDFDocument.load(fileBytes);
  const totalPages = srcDoc.getPageCount();

  // Convertir a índices 0-based y validar
  const validIndices = selectedPageNumbers
    .map(p => parseInt(p, 10) - 1)
    .filter(idx => idx >= 0 && idx < totalPages);

  if (validIndices.length === 0) {
    throw new Error('No se seleccionó ninguna página válida para imprimir.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
  copiedPages.forEach(page => newDoc.addPage(page));

  const newBytes = await newDoc.save();
  fs.writeFileSync(outputPath, newBytes);
  return outputPath;
}

module.exports = {
  inspectDocument,
  convertImageToA4Pdf,
  combineImagesToA4Pdf,
  splitPdfForManualDuplex,
  extractSelectedPages,
  A4_WIDTH,
  A4_HEIGHT
};

