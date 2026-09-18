const fs = require('fs');
const path = require('path');
const { exec, execFile } = require('child_process');
const { MOCK_MODE, PRINTER_NAME, MOCK_PRINTS_DIR } = require('../config');
const { splitPdfForManualDuplex } = require('./documentService');

const SUMATRA_PATH = path.join(__dirname, '..', 'bin', 'SumatraPDF.exe');

/**
 * Ejecuta la impresión de un archivo PDF en Windows o en modo Mock
 */
async function sendPdfToPrinter(pdfPath, printerName = PRINTER_NAME, isColor = false, jobCopies = 1) {
  if (MOCK_MODE) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mockLogPath = path.join(MOCK_PRINTS_DIR, `impresion_simulada_${timestamp}.txt`);
    const copies = jobCopies || 1;
    const logContent = [
      '==============================================',
      '       SIMULACIÓN DE IMPRESIÓN (MOCK MODE)    ',
      '==============================================',
      `Fecha/Hora:   ${new Date().toLocaleString()}`,
      `Archivo:      ${path.basename(pdfPath)}`,
      `Ruta:         ${pdfPath}`,
      `Impresora:    ${printerName}`,
      `Copias:       ${copies}`,
      `Modo Color:   ${isColor ? 'COLOR' : 'BLANCO Y NEGRO'}`,
      `Tamaño Papel: A4`,
      'Estado:       IMPRESO EXITOSAMENTE (SIMULADO)',
      '=============================================='
    ].join('\n');

    fs.writeFileSync(mockLogPath, logContent, 'utf8');
    console.log(`[MOCK PRINTER] Archivo simulado impreso (${copies}x): ${path.basename(pdfPath)}`);
    return { success: true, mode: 'mock', logFile: mockLogPath, copies };
  }

  const copies = Math.max(1, parseInt(jobCopies, 10) || 1);

  // MODO REAL 1: Motor industrial silencioso SumatraPDF (sin diálogos de Windows)
  if (fs.existsSync(SUMATRA_PATH)) {
    return new Promise((resolve) => {
      const settings = [
        `${copies}x`,
        isColor ? 'color' : 'monochrome',
        'paper=A4',
        'fit'
      ];
      const args = [
        '-print-to', printerName,
        '-silent',
        '-print-settings', settings.join(','),
        pdfPath
      ];

      console.log(`[REAL PRINTER] Despachando con SumatraPDF a '${printerName}' (${copies}x, ${isColor ? 'Color' : 'B&N'}): ${path.basename(pdfPath)}`);
      execFile(SUMATRA_PATH, args, (err) => {
        if (err) {
          console.error('[REAL PRINTER] Error con SumatraPDF:', err.message);
          resolve({
            success: false,
            mode: 'real',
            error: `Error al imprimir con SumatraPDF: ${err.message}`
          });
        } else {
          console.log(`[REAL PRINTER] Trabajo enviado exitosamente a '${printerName}'`);
          resolve({ success: true, mode: 'real', printer: printerName, copies });
        }
      });
    });
  }

  // MODO REAL 2 (Fallback): Envío vía PowerShell nativo
  return new Promise((resolve) => {
    const escapedPdf = pdfPath.replace(/'/g, "''");
    const escapedPrinter = printerName.replace(/'/g, "''");
    const psCmd = `powershell -NoProfile -Command "1..${copies} | ForEach-Object { Start-Process -FilePath '${escapedPdf}' -Verb PrintTo -ArgumentList '${escapedPrinter}' -PassThru | Wait-Process -Timeout 15 }"`;

    exec(psCmd, (err) => {
      if (err) {
        console.error('[REAL PRINTER] Error al imprimir vía PowerShell:', err.message);
        resolve({
          success: false,
          mode: 'real',
          error: `No se pudo enviar a la impresora '${printerName}'. Verifique que el servicio Spooler esté iniciado.`
        });
      } else {
        console.log(`[REAL PRINTER] Archivo enviado a ${printerName} (${copies}x)`);
        resolve({ success: true, mode: 'real', printer: printerName, copies });
      }
    });
  });
}

/**
 * Procesa la orden de impresión según si es Simple Faz o Doble Faz
 */
async function processJobPrint(job) {
  const isColor = !!job.isColor;
  const copies = job.copies || 1;

  if (!job.isDuplex || job.pages <= 1) {
    // Impresión directa Simple Faz
    job.status = 'printing';
    const result = await sendPdfToPrinter(job.pdfPath, PRINTER_NAME, isColor, copies);
    if (result.success) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
    } else {
      job.status = 'error';
      job.errorMessage = result.error;
    }
    return job;
  }

  // Proceso Doble Faz Manual:
  // Paso 1: Dividir PDF y mandar impares
  job.status = 'preparing_duplex';
  const duplexData = await splitPdfForManualDuplex(job.pdfPath, MOCK_PRINTS_DIR);
  job.duplexData = duplexData;

  job.status = 'printing_odds';
  const oddResult = await sendPdfToPrinter(duplexData.oddsPath, PRINTER_NAME, isColor, copies);

  if (oddResult.success) {
    // Queda a la espera de que el operador dé vuelta las hojas
    job.status = 'waiting_flip';
    job.flipInstructions = {
      mensaje: `Se imprimieron ${duplexData.oddsCount} páginas impares. Retirá la pila de la salida frontal, gírala 180° colocándola en la bandeja trasera y confirmá para imprimir el reverso.`,
      oddsCount: duplexData.oddsCount,
      evensCount: duplexData.evensCount
    };
  } else {
    job.status = 'error';
    job.errorMessage = oddResult.error;
  }

  return job;
}

/**
 * Paso 2 del Doble Faz: Imprime las páginas pares tras la confirmación del operador
 */
async function continueDuplexPrint(job) {
  if (job.status !== 'waiting_flip' || !job.duplexData?.evensPath) {
    throw new Error('El trabajo no está en estado de espera para girar hojas.');
  }

  const isColor = !!job.isColor;
  const copies = job.copies || 1;
  job.status = 'printing_evens';
  const evenResult = await sendPdfToPrinter(job.duplexData.evensPath, PRINTER_NAME, isColor, copies);

  if (evenResult.success) {
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
  } else {
    job.status = 'error';
    job.errorMessage = evenResult.error;
  }

  return job;
}

module.exports = {
  sendPdfToPrinter,
  processJobPrint,
  continueDuplexPrint
};

