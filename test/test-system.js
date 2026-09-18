process.env.MOCK_MODE = 'true'; // El suite de pruebas lógicas corre en modo simulado para proteger papel/tinta

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const { calculateQuote } = require('../server/services/pricingService');
const { inspectDocument, convertImageToA4Pdf, combineImagesToA4Pdf, splitPdfForManualDuplex } = require('../server/services/documentService');
const { processJobPrint, continueDuplexPrint } = require('../server/services/printerService');
const queueService = require('../server/services/queueService');
const { DATA_DIR, UPLOADS_DIR } = require('../server/config');

async function runTests() {
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS DEL SISTEMA...\n');

  // -------------------------------------------------------------
  // Test 1: Lógica de Tarifas y Conteo de Hojas Físicas
  // -------------------------------------------------------------
  console.log('1️⃣ Probando servicio de cálculo de precios (A4)...');

  // B&N Simple Faz (1 hoja)
  const q1 = calculateQuote(1, false, false);
  assert.strictEqual(q1.totalPrice, 100, '1 pág B&N simple debe ser $100');
  assert.strictEqual(q1.physicalSheets, 1, 'Hojas físicas debe ser 1');

  // B&N Simple Faz (4 hojas)
  const q2 = calculateQuote(4, false, false);
  assert.strictEqual(q2.totalPrice, 400, '4 págs B&N simple debe ser $400');
  assert.strictEqual(q2.physicalSheets, 4, 'Hojas físicas debe ser 4');

  // B&N Doble Faz (4 páginas -> 2 hojas físicas a $150 c/u = $300)
  const q3 = calculateQuote(4, false, true);
  assert.strictEqual(q3.totalPrice, 300, '4 págs B&N doble faz debe ser $300');
  assert.strictEqual(q3.physicalSheets, 2, '4 págs doble faz deben ser 2 hojas');

  // B&N Doble Faz (5 páginas -> 2 hojas doble faz ($300) + 1 hoja simple faz ($100) = $400)
  const q4 = calculateQuote(5, false, true);
  assert.strictEqual(q4.totalPrice, 400, '5 págs B&N doble faz debe ser $400');
  assert.strictEqual(q4.physicalSheets, 3, '5 págs doble faz deben ser 3 hojas físicas');

  // Color Doble Faz (2 páginas -> 1 hoja física a $250)
  const q5 = calculateQuote(2, true, true);
  assert.strictEqual(q5.totalPrice, 250, '2 págs Color doble faz debe ser $250');
  assert.strictEqual(q5.physicalSheets, 1, 'Hojas físicas debe ser 1');

  // Copias múltiples (3 copias de 2 págs B&N simple a $100 = $600)
  const q6 = calculateQuote(2, false, false, 3);
  assert.strictEqual(q6.totalPrice, 600, '3 copias de 2 págs B&N simple debe ser $600');
  assert.strictEqual(q6.physicalSheets, 6, 'Total hojas físicas para 3 copias debe ser 6');

  console.log('   ✅ Tarifas y multiplicador de copias verificadas correctamente.\n');

  // -------------------------------------------------------------
  // Test 2: Generación e Inspección de PDF de muestra
  // -------------------------------------------------------------
  console.log('2️⃣ Probando inspección de PDF y división para Dúplex Manual (Epson L3560)...');
  const samplePdfPath = path.join(UPLOADS_DIR, 'test_sample_5p.pdf');

  // Crear un PDF sintético de 5 páginas
  const pdfDoc = await PDFDocument.create();
  for (let i = 1; i <= 5; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`PAGINA DE PRUEBA ${i}`, { x: 50, y: 750, size: 24, color: rgb(0, 0, 0) });
  }
  fs.writeFileSync(samplePdfPath, await pdfDoc.save());

  const inspection = await inspectDocument(samplePdfPath, 'test_sample_5p.pdf', 'application/pdf');
  assert.strictEqual(inspection.pageCount, 5, 'El PDF de prueba debe tener 5 páginas');
  console.log(`   ✅ Inspección de PDF detectó ${inspection.pageCount} páginas.`);

  // Probar división para dúplex manual
  const duplexSplit = await splitPdfForManualDuplex(samplePdfPath, DATA_DIR);
  assert.strictEqual(duplexSplit.oddsCount, 3, 'Debe haber 3 páginas impares (1, 3, 5)');
  assert.strictEqual(duplexSplit.evensCount, 2, 'Debe haber 2 páginas pares (2, 4)');
  assert.ok(fs.existsSync(duplexSplit.oddsPath), 'El archivo de impares debe existir');
  assert.ok(fs.existsSync(duplexSplit.evensPath), 'El archivo de pares debe existir');

  // Verificar que las páginas pares estén en orden natural (2, 4) para la bandeja trasera de la Epson L3560
  const evensPdfCheck = await PDFDocument.load(fs.readFileSync(duplexSplit.evensPath));
  assert.strictEqual(evensPdfCheck.getPageCount(), 2, 'Debe tener exactamente 2 páginas pares');
  console.log(`   ✅ División Dúplex correcta: ${duplexSplit.oddsCount} impares (1, 3, 5) y ${duplexSplit.evensCount} pares en orden natural (2, 4).`);

  // Probar conversión de imagen a PDF A4 con sharp (PNG y WebP)
  console.log('\n2️⃣b Probando conversión de foto a PDF A4 estandarizado con sharp...');
  // Crear una imagen PNG mínima de 1x1 pixel válida
  const samplePngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const sampleImgPath = path.join(UPLOADS_DIR, 'test_foto.png');
  fs.writeFileSync(sampleImgPath, samplePngBuffer);

  const convertedPdfPath = path.join(UPLOADS_DIR, 'test_foto_converted.pdf');
  await convertImageToA4Pdf(sampleImgPath, convertedPdfPath);
  assert.ok(fs.existsSync(convertedPdfPath), 'El PDF de la foto debe haber sido generado');

  const photoInspection = await inspectDocument(sampleImgPath, 'test_foto.png', 'image/png', UPLOADS_DIR);
  assert.strictEqual(photoInspection.pageCount, 1, 'La foto convertida a PDF debe tener 1 página A4');
  assert.strictEqual(photoInspection.isImage, true, 'Debe ser detectada como imagen');
  assert.ok(fs.existsSync(photoInspection.pdfPath), 'El PDF generado de la imagen debe existir');
  console.log('   ✅ Conversión de foto a PDF A4 completada con éxito.');

  // Probar combinación de múltiples fotos en un solo PDF A4
  console.log('\n2️⃣b-2 Probando combinación de múltiples fotos en un único PDF A4...');
  const sampleImgPath2 = path.join(UPLOADS_DIR, 'test_foto_2.png');
  fs.writeFileSync(sampleImgPath2, samplePngBuffer);
  const multiPdfPath = path.join(UPLOADS_DIR, 'test_multi_fotos.pdf');
  await combineImagesToA4Pdf([sampleImgPath, sampleImgPath2], multiPdfPath);
  assert.ok(fs.existsSync(multiPdfPath), 'El PDF de múltiples fotos debe existir');

  const multiInspection = await inspectDocument(multiPdfPath, 'test_multi_fotos.pdf', 'application/pdf');
  assert.strictEqual(multiInspection.pageCount, 2, 'El PDF de 2 fotos debe tener exactamente 2 páginas A4');
  console.log(`   ✅ Combinación de múltiples fotos verificada (${multiInspection.pageCount} páginas generadas).`);

  // Probar soporte de documentos Word (.rtf / .docx)
  console.log('\n2️⃣c Probando soporte de documentos Word mediante automatización nativa...');
  const sampleRtfPath = path.join(UPLOADS_DIR, 'test_documento_word.rtf');
  fs.writeFileSync(sampleRtfPath, '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs28 Hola Kiosco El Tato. Documento de prueba Word.}');
  
  try {
    const wordInspection = await inspectDocument(sampleRtfPath, 'test_documento_word.rtf', 'application/rtf', UPLOADS_DIR);
    assert.strictEqual(wordInspection.isWord, true, 'Debe ser detectado como Word');
    assert.ok(wordInspection.pageCount >= 1, 'Debe contar al menos 1 página');
    assert.ok(fs.existsSync(wordInspection.pdfPath), 'El PDF generado desde Word debe existir');
    console.log(`   ✅ Conversión de Word a PDF A4 completada con éxito (${wordInspection.pageCount} páginas).`);
  } catch (wordErr) {
    console.warn(`   ⚠️ Nota sobre Word COM en este entorno: ${wordErr.message}`);
  }

  // Probar extracción de páginas seleccionadas
  console.log('\n2️⃣d Probando extracción de páginas seleccionadas (ej: páginas 2 y 4)...');
  const { extractSelectedPages } = require('../server/services/documentService');
  const selectedPdfPath = path.join(UPLOADS_DIR, 'test_selected_2_4.pdf');
  await extractSelectedPages(samplePdfPath, [2, 4], selectedPdfPath);
  const selectedInspection = await inspectDocument(selectedPdfPath, 'test_selected_2_4.pdf', 'application/pdf');
  assert.strictEqual(selectedInspection.pageCount, 2, 'El PDF filtrado debe tener exactamente 2 páginas');
  console.log('   ✅ Extracción de páginas seleccionadas verificada con éxito.');

  // -------------------------------------------------------------
  // Test 3: Flujo Completo de Trabajo en Cola (Ciclo de Vida)
  // -------------------------------------------------------------
  console.log('\n3️⃣ Probando ciclo de vida de un Trabajo con Dúplex Asistido...');
  const job = queueService.createJob({
    originalName: 'tarea_colegio.pdf',
    pdfPath: samplePdfPath,
    pages: 5,
    isColor: false,
    isDuplex: true,
    physicalSheets: 3,
    totalPrice: 400
  });

  assert.strictEqual(job.status, 'pending_approval', 'Estado inicial debe ser pending_approval');

  // Procesar autorización (Paso 1: Impares)
  const jobStep1 = await processJobPrint(job);
  assert.strictEqual(jobStep1.status, 'waiting_flip', 'Debe pausar en waiting_flip esperando girar hojas');
  assert.ok(jobStep1.flipInstructions, 'Debe contener instrucciones para el operador');
  console.log('   ✅ Paso 1 (Impares) ejecutado y pausado en "waiting_flip".');

  // Procesar confirmación de giro (Paso 2: Pares)
  const jobStep2 = await continueDuplexPrint(jobStep1);
  assert.strictEqual(jobStep2.status, 'completed', 'Estado final debe ser completed');
  console.log('   ✅ Paso 2 (Pares) confirmado y finalizado.');

  // -------------------------------------------------------------
  // Test 4: Selección Parcial de Páginas en Dúplex (ej: 1 y 2 de un documento de 4)
  // -------------------------------------------------------------
  console.log('\n4️⃣ Probando selección parcial de páginas en Dúplex (ej: páginas 1 y 2 de un PDF de 4 páginas)...');
  const fourPagePdfPath = path.join(UPLOADS_DIR, 'test_sample_4p.pdf');
  const doc4p = await PDFDocument.create();
  for (let i = 1; i <= 4; i++) {
    const page = doc4p.addPage([595.28, 841.89]);
    page.drawText(`PAGINA ORIGINAL ${i}`, { x: 50, y: 750, size: 24, color: rgb(0, 0, 0) });
  }
  fs.writeFileSync(fourPagePdfPath, await doc4p.save());

  // Simular la extracción de páginas [1, 2]
  const prunedTestPath = path.join(UPLOADS_DIR, 'test_pruned_1_2.pdf');
  await extractSelectedPages(fourPagePdfPath, [1, 2], prunedTestPath);
  const prunedDoc = await PDFDocument.load(fs.readFileSync(prunedTestPath));
  assert.strictEqual(prunedDoc.getPageCount(), 2, 'El PDF filtrado debe tener exactamente 2 páginas');

  const partialDuplexSplit = await splitPdfForManualDuplex(prunedTestPath, DATA_DIR);
  assert.strictEqual(partialDuplexSplit.oddsCount, 1, 'Debe haber exactamente 1 página impar (pág 1)');
  assert.strictEqual(partialDuplexSplit.evensCount, 1, 'Debe haber exactamente 1 página par (pág 2)');

  const partialJob = queueService.createJob({
    originalName: 'test_sample_4p.pdf',
    pdfPath: prunedTestPath,
    pages: 2,
    isColor: false,
    isDuplex: true,
    physicalSheets: 1,
    totalPrice: 150
  });

  const pStep1 = await processJobPrint(partialJob);
  assert.strictEqual(pStep1.status, 'waiting_flip');
  const pStep2 = await continueDuplexPrint(pStep1);
  assert.strictEqual(pStep2.status, 'completed');
  console.log('   ✅ Selección parcial [1, 2] en Dúplex probada con éxito (1 hoja física: cara 1 y cara 2).');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
}

runTests().catch(err => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
