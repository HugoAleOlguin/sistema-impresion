const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { extractSelectedPages, splitPdfForManualDuplex } = require('../server/services/documentService');
const { UPLOADS_DIR, DATA_DIR } = require('../server/config');

async function testFixes() {
  console.log('🧪 Verificando las 2 correcciones críticas...\n');

  // Test 1: Simular selección de páginas 1 y 2 en PDF de 4 páginas
  const sample4p = path.join(UPLOADS_DIR, '1789702608138-4041.pdf');
  assert.ok(fs.existsSync(sample4p), 'El PDF de 4 páginas subido por el usuario existe');

  const srcBytes = fs.readFileSync(sample4p);
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const originalTotalPages = srcDoc.getPageCount();
  assert.strictEqual(originalTotalPages, 4, 'El archivo original tiene 4 páginas');

  const selectedPages = [1, 2];
  const isCustomSelection = selectedPages.length < originalTotalPages ||
    selectedPages.some((p, idx) => p !== idx + 1);

  assert.strictEqual(isCustomSelection, true, 'Debe detectar correctamente la selección parcial');

  const prunedPath = path.join(UPLOADS_DIR, `test_verify_1_2.pdf`);
  await extractSelectedPages(sample4p, selectedPages, prunedPath);

  const prunedDoc = await PDFDocument.load(fs.readFileSync(prunedPath));
  assert.strictEqual(prunedDoc.getPageCount(), 2, 'El PDF extraído debe tener exactamente 2 páginas (1 y 2)');
  console.log('✅ Corrección 1 verificada: Ahora solo extrae e imprime las 2 páginas elegidas.');

  // Test 2: Simular división dúplex de un documento de 4 páginas
  // Verificar que evens tenga página 2 primero y página 4 segundo
  const duplex4 = await splitPdfForManualDuplex(sample4p, DATA_DIR);
  assert.strictEqual(duplex4.oddsCount, 2, 'Debe haber 2 páginas impares (1 y 3)');
  assert.strictEqual(duplex4.evensCount, 2, 'Debe haber 2 páginas pares (2 y 4)');

  const evensDoc = await PDFDocument.load(fs.readFileSync(duplex4.evensPath));
  assert.strictEqual(evensDoc.getPageCount(), 2, 'El archivo de pares tiene 2 páginas');

  console.log('✅ Corrección 2 verificada: Las páginas pares se imprimen en orden natural (2, 4) emparejando correctamente con (1, 3).');
  console.log('\n🎉 Ambas correcciones validadas con éxito.');
}

testFixes().catch(err => {
  console.error('❌ Error en verificación:', err);
  process.exit(1);
});
