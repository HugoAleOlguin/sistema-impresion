const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { PORT, UPLOADS_DIR, MOCK_MODE, PRINTER_NAME, getPrinterName, getInstalledPrinters, loadConfig, saveConfig } = require('./config');
const { calculateQuote } = require('./services/pricingService');
const { inspectDocument, convertImageToA4Pdf, combineImagesToA4Pdf } = require('./services/documentService');
const { processJobPrint, continueDuplexPrint } = require('./services/printerService');
const queueService = require('./services/queueService');
const { tunnelSecurityMiddleware } = require('./services/securityService');
const { getTunnelStatus, startTunnel, loadTunnelConfig } = require('./services/tunnelService');

const app = express();
app.use(cors());
app.use(tunnelSecurityMiddleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configuración de carga de archivos (Multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1E4) + ext;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Límite de 50MB
});

// Helper para obtener las IPs locales del router (priorizando Wi-Fi/LAN sobre VPNs)
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  ips.sort((a, b) => {
    const isALocal = a.address.startsWith('192.168.') || a.address.startsWith('10.');
    const isBLocal = b.address.startsWith('192.168.') || b.address.startsWith('10.');
    if (isALocal && !isBLocal) return -1;
    if (!isALocal && isBLocal) return 1;
    return 0;
  });
  return ips.map(i => i.address);
}

// -------------------------------------------------------------
// ENDPOINTS DE LA API
// -------------------------------------------------------------

// 1. Obtener configuración y estado
app.get('/api/config', (req, res) => {
  const config = loadConfig();
  res.json({
    config,
    mockMode: MOCK_MODE,
    printerName: getPrinterName(),
    availablePrinters: getInstalledPrinters(),
    localIps: getLocalIpAddresses(),
    port: PORT
  });
});

// 1b. Obtener estado del túnel remoto Cloudflare y GitHub
app.get('/api/tunnel/status', (req, res) => {
  res.json(getTunnelStatus());
});

// 2. Actualizar configuración de precios (permite valores específicos de 0 a infinito sin redondeos)
app.post('/api/config', (req, res) => {
  const payload = {};
  const priceKeys = ['bw_simplex', 'bw_duplex', 'color_simplex', 'color_duplex'];
  priceKeys.forEach(key => {
    if (req.body[key] !== undefined && req.body[key] !== null && req.body[key] !== '') {
      const parsed = parseFloat(req.body[key]);
      if (!isNaN(parsed) && parsed >= 0) {
        payload[key] = Math.round((parsed + Number.EPSILON) * 100) / 100;
      }
    }
  });
  if (req.body.printerName) {
    payload.printerName = req.body.printerName;
  }
  const updated = saveConfig(payload);
  res.json({ success: true, config: updated });
});

// 3. Subir archivo(s) e inspeccionar (PDF, Word o una/varias Fotos)
app.post('/api/upload', upload.array('documento', 50), async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se envió ningún archivo.' });
    }

    // Caso A: Múltiples fotos enviadas para imprimir juntas
    if (files.length > 1) {
      const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.gif'];
      const allImages = files.every(f => {
        const ext = path.extname(f.originalname).toLowerCase();
        return imageExts.includes(ext) || (f.mimetype && f.mimetype.startsWith('image/'));
      });

      if (allImages) {
        const outPdfPath = path.join(UPLOADS_DIR, `a4_album_${Date.now()}.pdf`);
        const filePaths = files.map(f => f.path);
        await combineImagesToA4Pdf(filePaths, outPdfPath);

        return res.json({
          success: true,
          fileId: path.basename(outPdfPath),
          originalName: `${files.length} fotos seleccionadas`,
          isImage: true,
          isMultiImage: true,
          isWord: false,
          pageCount: files.length,
          pdfPath: outPdfPath,
          pdfUrl: `/api/pdf/${encodeURIComponent(path.basename(outPdfPath))}`
        });
      } else {
        return res.status(400).json({ error: 'Para imprimir varios archivos a la vez, por favor seleccioná únicamente fotos.' });
      }
    }

    // Caso B: Archivo único estándar (PDF, Word o 1 Foto)
    const singleFile = files[0];
    const inspection = await inspectDocument(singleFile.path, singleFile.originalname, singleFile.mimetype, UPLOADS_DIR);
    const finalPdfPath = inspection.pdfPath;

    res.json({
      success: true,
      fileId: path.basename(finalPdfPath),
      originalName: singleFile.originalname,
      isImage: inspection.isImage,
      isMultiImage: false,
      isWord: inspection.isWord,
      pageCount: inspection.pageCount,
      pdfPath: finalPdfPath,
      pdfUrl: `/api/pdf/${encodeURIComponent(path.basename(finalPdfPath))}`
    });
  } catch (err) {
    console.error('Error al procesar archivo subido:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para servir el PDF generado/convertido para el visor de la app
app.get('/api/pdf/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo PDF no encontrado.' });
  }
  res.sendFile(filePath);
});

// 4. Calcular cotización en tiempo real (con soporte de copias)
app.post('/api/quote', (req, res) => {
  const { pageCount, isColor, isDuplex, copies = 1 } = req.body;
  const quote = calculateQuote(pageCount, isColor, isDuplex, copies);
  res.json(quote);
});

// 5. Crear una orden de impresión (pasa a cola PENDING_APPROVAL)
app.post('/api/jobs', async (req, res) => {
  try {
    const { pdfPath, originalName, pageCount, isColor, isDuplex, copies = 1, selectedPages } = req.body;

    if (!pdfPath || !fs.existsSync(pdfPath)) {
      return res.status(400).json({ error: 'Ruta de archivo no válida o inexistente.' });
    }

    let finalPdfPath = pdfPath;
    
    // Determinar cantidad real de páginas del PDF cargado
    const { PDFDocument } = require('pdf-lib');
    const { extractSelectedPages } = require('./services/documentService');
    const pdfBytes = fs.readFileSync(pdfPath);
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const originalTotalPages = srcDoc.getPageCount();

    let actualPageCount = originalTotalPages;

    // Si se especificó una selección de páginas y no son todas las originales
    if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
      const isCustomSelection = selectedPages.length < originalTotalPages ||
        selectedPages.some((p, idx) => p !== idx + 1);

      if (isCustomSelection) {
        const prunedPath = path.join(UPLOADS_DIR, `custom_${Date.now()}_${path.basename(pdfPath)}`);
        await extractSelectedPages(pdfPath, selectedPages, prunedPath);
        finalPdfPath = prunedPath;
      }
      actualPageCount = selectedPages.length;
    } else if (pageCount) {
      actualPageCount = parseInt(pageCount, 10) || originalTotalPages;
    }

    const quote = calculateQuote(actualPageCount, isColor, isDuplex, copies);

    const job = queueService.createJob({
      originalName,
      pdfPath: finalPdfPath,
      pages: quote.pages,
      copies: quote.copies,
      isColor: quote.isColor,
      isDuplex: quote.isDuplex,
      physicalSheets: quote.physicalSheets,
      sheetsPerCopy: quote.sheetsPerCopy,
      totalPrice: quote.totalPrice,
      breakdown: quote.breakdown
    });

    res.json({ success: true, job });
  } catch (err) {
    console.error('Error al crear orden:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 6. Autorizar y mandar a imprimir (cuando se cobra en mostrador)
app.post('/api/jobs/:id/approve', async (req, res) => {
  try {
    const job = queueService.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Trabajo no encontrado.' });
    }

    const processedJob = await processJobPrint(job);
    queueService.updateJob(job.id, processedJob);

    res.json({ success: true, job: processedJob });
  } catch (err) {
    console.error('Error al autorizar impresión:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 7. Continuar tanda 2 de Doble Faz (después de dar vuelta las hojas)
app.post('/api/jobs/:id/continue-duplex', async (req, res) => {
  try {
    const job = queueService.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Trabajo no encontrado.' });
    }

    const completedJob = await continueDuplexPrint(job);
    queueService.updateJob(job.id, completedJob);

    res.json({ success: true, job: completedJob });
  } catch (err) {
    console.error('Error al continuar doble faz:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 8. Cancelar o descartar orden
app.post('/api/jobs/:id/cancel', (req, res) => {
  const job = queueService.cancelJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Trabajo no encontrado.' });
  }
  res.json({ success: true, job });
});

// 9. Listar trabajos recientes
app.get('/api/jobs', (req, res) => {
  res.json(queueService.getAllJobs());
});

// Tarea de limpieza automática de temporales (> 24 hs)
function cleanupOldTempFiles() {
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 horas
  const now = Date.now();

  [UPLOADS_DIR, path.join(__dirname, 'data', 'mock_prints')].forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdir(dir, (err, files) => {
      if (err) return;
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        fs.stat(fullPath, (sErr, stats) => {
          if (sErr) return;
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlink(fullPath, () => {});
          }
        });
      });
    });
  });
}
setInterval(cleanupOldTempFiles, 60 * 60 * 1000); // Cada hora
cleanupOldTempFiles(); // Ejecutar al inicio

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 SERVIDOR DE IMPRESIÓN "EL TATO" INICIADO`);
  console.log(`📍 Modo de Impresión: ${MOCK_MODE ? 'SIMULACIÓN (MOCK MODE)' : 'REAL (EPSON L3560)'}`);
  console.log(`🖥️ Acceso local en la PC: http://localhost:${PORT}`);
  console.log('📱 Acceso desde celulares del mostrador (en la misma Wi-Fi):');
  const ips = getLocalIpAddresses();
  if (ips.length > 0) {
    ips.forEach(ip => console.log(`   👉 http://${ip}:${PORT}`));
  } else {
    console.log(`   👉 http://<IP-DE-TU-PC>:${PORT}`);
  }
  console.log('====================================================');

  const tunnelCfg = loadTunnelConfig();
  if (tunnelCfg.autoStartTunnel) {
    console.log('🌐 Auto-arranque de túnel Cloudflare habilitado...');
    startTunnel({ localPort: PORT });
  }
});

