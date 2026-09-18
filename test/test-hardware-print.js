const fs = require('fs');
const path = require('path');
const { execFile, execSync } = require('child_process');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const PRINTER_NAME = process.env.PRINTER_NAME || 'EPSON L3560 Series (Copiar 1)';
const SUMATRA_PATH = path.join(__dirname, '..', 'server', 'bin', 'SumatraPDF.exe');
const OUTPUT_PDF = path.join(__dirname, 'test_hardware_a4.pdf');

async function createDiagnosticPdf() {
  console.log('📄 Generando PDF de calibración y diagnóstico A4...');
  const pdfDoc = await PDFDocument.create();
  
  // A4 en puntos (72 dpi): 595.28 x 841.89
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Marco exterior
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 2
  });

  // Cabecera
  page.drawRectangle({
    x: 20,
    y: height - 100,
    width: width - 40,
    height: 80,
    color: rgb(0.08, 0.45, 0.8)
  });

  page.drawText('KIOSCO "EL TATO" - SISTEMA DE IMPRESIÓN', {
    x: 40,
    y: height - 55,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page.drawText('Hoja de Prueba de Hardware y Calibración', {
    x: 40,
    y: height - 80,
    size: 13,
    font: fontRegular,
    color: rgb(0.9, 0.95, 1)
  });

  // Información Técnica
  let y = height - 140;
  const drawRow = (label, value) => {
    page.drawText(label, { x: 50, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(value, { x: 200, y, size: 11, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 22;
  };

  drawRow('Fecha y Hora:', new Date().toLocaleString('es-AR'));
  drawRow('Impresora Destino:', PRINTER_NAME);
  drawRow('Conexión:', 'USB (USB001) / Epson EcoTank L3560');
  drawRow('Motor de Impresión:', 'SumatraPDF Silent Print Engine');
  drawRow('Formato de Papel:', 'A4 (210 x 297 mm)');
  drawRow('Servidor Web Local:', 'http://localhost:3000');

  // Separador
  y -= 10;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });

  // Cuadros de prueba de color y tinta
  y -= 35;
  page.drawText('TEST DE TINTA Y ALINEACIÓN DE CABEZALES (CMYK):', {
    x: 50,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  y -= 50;
  const boxWidth = 100;
  const boxHeight = 40;
  const colors = [
    { name: 'CYAN', color: rgb(0, 0.7, 0.9), x: 50 },
    { name: 'MAGENTA', color: rgb(0.9, 0, 0.5), x: 170 },
    { name: 'YELLOW', color: rgb(0.95, 0.85, 0), x: 290 },
    { name: 'BLACK', color: rgb(0, 0, 0), x: 410 }
  ];

  for (const c of colors) {
    page.drawRectangle({
      x: c.x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: c.color
    });
    page.drawText(c.name, {
      x: c.x + 15,
      y: y + 14,
      size: 11,
      font: fontBold,
      color: c.name === 'YELLOW' ? rgb(0, 0, 0) : rgb(1, 1, 1)
    });
  }

  // Escala de Grises
  y -= 60;
  page.drawText('TEST DE ESCALA DE GRISES (B&N):', {
    x: 50,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  y -= 35;
  const graySteps = [0.1, 0.25, 0.5, 0.75, 0.9];
  const gWidth = (width - 100) / graySteps.length;
  graySteps.forEach((g, idx) => {
    page.drawRectangle({
      x: 50 + idx * gWidth,
      y,
      width: gWidth,
      height: 25,
      color: rgb(g, g, g)
    });
    page.drawText(`${Math.round((1 - g) * 100)}%`, {
      x: 50 + idx * gWidth + 25,
      y: y + 7,
      size: 10,
      font: fontBold,
      color: g < 0.5 ? rgb(1, 1, 1) : rgb(0, 0, 0)
    });
  });

  // Mensaje final instructivo
  y -= 80;
  page.drawRectangle({
    x: 50,
    y: y - 20,
    width: width - 100,
    height: 70,
    color: rgb(0.95, 0.97, 0.95),
    borderColor: rgb(0.3, 0.7, 0.3),
    borderWidth: 1
  });

  page.drawText('ESTADO DE LA PRUEBA: OK', {
    x: 70,
    y: y + 30,
    size: 13,
    font: fontBold,
    color: rgb(0.15, 0.5, 0.15)
  });

  page.drawText('Si esta hoja salio limpia y legible por la bandeja frontal, la comunicacion', {
    x: 70,
    y: y + 10,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2)
  });

  page.drawText('entre el servidor Node.js y la Epson EcoTank L3560 funciona al 100%.', {
    x: 70,
    y: y - 5,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2)
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(OUTPUT_PDF, pdfBytes);
  console.log(`✅ PDF generado: ${OUTPUT_PDF} (${pdfBytes.length} bytes)`);
  return OUTPUT_PDF;
}

async function sendToRealPrinter(pdfPath) {
  console.log(`\n🖨️ Enviando archivo a impresora física: "${PRINTER_NAME}"`);
  console.log(`🔧 Motor: ${SUMATRA_PATH}`);

  const args = [
    '-print-to', PRINTER_NAME,
    '-silent',
    '-print-settings', '1x,color,paper=A4,fit',
    pdfPath
  ];

  return new Promise((resolve, reject) => {
    console.log(`Ejecutando: SumatraPDF.exe -print-to "${PRINTER_NAME}" -silent -print-settings "1x,color,paper=A4,fit" "${pdfPath}"`);
    
    const startTime = Date.now();
    execFile(SUMATRA_PATH, args, (error, stdout, stderr) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if (error) {
        console.error(`❌ Error al ejecutar SumatraPDF (${elapsed}s):`, error.message);
        return reject(error);
      }
      console.log(`✅ Comando de impresión despachado exitosamente en ${elapsed}s.`);
      resolve({ success: true, elapsed });
    });
  });
}

function monitorPrintJob() {
  console.log('\n👀 Monitoreando cola de impresión de Windows...');
  let checks = 0;
  const maxChecks = 15;

  const interval = setInterval(() => {
    checks++;
    try {
      const psCmd = `powershell -NoProfile -Command "Get-PrintJob -PrinterName '${PRINTER_NAME.replace(/'/g, "''")}' | Select-Object Id, DocumentName, JobStatus, TotalPages, PagesPrinted | ConvertTo-Json"`;
      const output = execSync(psCmd, { encoding: 'utf8' }).trim();
      
      if (!output || output === '') {
        console.log(`⏱️ [T+${checks * 2}s] Cola vacía. El trabajo ya fue recibido y procesado por la memoria de la impresora Epson.`);
        clearInterval(interval);
        console.log('\n🎉 ¡Prueba de hardware completada! Verificá la salida física en la bandeja de la Epson L3560.');
        return;
      }

      console.log(`📄 [T+${checks * 2}s] Estado de cola: ${output}`);
    } catch (e) {
      // Ignorar errores transitorios de lectura
    }

    if (checks >= maxChecks) {
      clearInterval(interval);
      console.log('⏰ Fin de ventana de monitoreo (30s).');
    }
  }, 2000);
}

async function main() {
  try {
    const pdfPath = await createDiagnosticPdf();
    await sendToRealPrinter(pdfPath);
    monitorPrintJob();
  } catch (err) {
    console.error('Fallo en la prueba de hardware:', err);
    process.exit(1);
  }
}

main();
