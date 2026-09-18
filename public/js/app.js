// =============================================================
// EL TATO IMPRESIONES — CONTROLADOR DE ALTA VISIBILIDAD & FEEDBACK
// =============================================================

const state = {
  config: null,
  loadedFile: null,
  isColor: false,
  isDuplex: false,
  copies: 1,
  selectedPages: [], // Números de página 1-based seleccionados
  pdfArrayBuffer: null,
  currentQuote: null,
  activeJobId: null,
  isOnline: navigator.onLine
};

// Referencias DOM
const elements = {
  offlineBar: document.getElementById('offlineBar'),
  statusDot: document.getElementById('statusDot'),
  statusBadge: document.getElementById('statusBadge'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  settingsModal: document.getElementById('settingsModal'),
  pricesForm: document.getElementById('pricesForm'),
  networkIpsList: document.getElementById('networkIpsList'),

  btnOpenHistory: document.getElementById('btnOpenHistory'),
  btnCloseHistory: document.getElementById('btnCloseHistory'),
  historyDrawer: document.getElementById('historyDrawer'),
  jobsList: document.getElementById('jobsList'),
  btnRefreshJobs: document.getElementById('btnRefreshJobs'),

  // Avisos integrados con espacio fijo
  kioskTagline: document.getElementById('kioskTagline'),
  inlineAlert: document.getElementById('inlineAlert'),
  alertIcon: document.getElementById('alertIcon'),
  alertMessage: document.getElementById('alertMessage'),

  // Área de Subida
  uploadPanel: document.getElementById('uploadPanel'),
  dropZone: document.getElementById('dropZone'),
  btnSelectFileTrigger: document.getElementById('btnSelectFileTrigger'),
  fileInput: document.getElementById('fileInput'),
  fileLoadedInfo: document.getElementById('fileLoadedInfo'),
  fileTypeBadge: document.getElementById('fileTypeBadge'),
  fileName: document.getElementById('fileName'),
  filePages: document.getElementById('filePages'),
  btnOpenPageSelector: document.getElementById('btnOpenPageSelector'),
  fileSize: document.getElementById('fileSize'),
  btnChangeFile: document.getElementById('btnChangeFile'),

  // Modos
  btnBw: document.getElementById('btnBw'),
  btnColor: document.getElementById('btnColor'),
  btnSimplex: document.getElementById('btnSimplex'),
  btnDuplex: document.getElementById('btnDuplex'),

  // Copias
  btnDecCopies: document.getElementById('btnDecCopies'),
  btnIncCopies: document.getElementById('btnIncCopies'),
  copiesDisplay: document.getElementById('copiesDisplay'),

  // Cobro y Acciones
  checkoutCard: document.getElementById('checkoutCard'),
  priceAmount: document.getElementById('priceAmount'),
  priceDetails: document.getElementById('priceDetails'),
  btnApprovePrint: document.getElementById('btnApprovePrint'),
  btnApprovePrintText: document.getElementById('btnApprovePrintText'),
  printSpinner: document.getElementById('printSpinner'),
  btnCancelJob: document.getElementById('btnCancelJob'),

  // Modal Dúplex
  duplexModal: document.getElementById('duplexModal'),
  btnConfirmDuplex: document.getElementById('btnConfirmDuplex'),
  duplexSpinner: document.getElementById('duplexSpinner'),

  // Modal Selector de Páginas
  pageSelectorModal: document.getElementById('pageSelectorModal'),
  btnClosePageSelector: document.getElementById('btnClosePageSelector'),
  btnSelectAllPages: document.getElementById('btnSelectAllPages'),
  btnDeselectAllPages: document.getElementById('btnDeselectAllPages'),
  selectedPagesCountBadge: document.getElementById('selectedPagesCountBadge'),
  pagesGrid: document.getElementById('pagesGrid'),
  btnApplyPageSelection: document.getElementById('btnApplyPageSelection'),
  btnApplyCount: document.getElementById('btnApplyCount'),

  // Modal Visor de Detalle (Nativo)
  pageDetailModal: document.getElementById('pageDetailModal'),
  btnClosePageDetail: document.getElementById('btnClosePageDetail'),
  pageDetailTitle: document.getElementById('pageDetailTitle'),
  btnToggleDetailSelection: document.getElementById('btnToggleDetailSelection'),
  detailToggleIcon: document.getElementById('detailToggleIcon'),
  detailToggleText: document.getElementById('detailToggleText'),
  detailCanvasArea: document.getElementById('detailCanvasArea'),
  detailCanvas: document.getElementById('detailCanvas'),
  detailLoading: document.getElementById('detailLoading'),
  btnDetailPrev: document.getElementById('btnDetailPrev'),
  btnDetailNext: document.getElementById('btnDetailNext'),
  detailIndicator: document.getElementById('detailIndicator')
};

// -------------------------------------------------------------
// SISTEMA HÁPTICO UNIVERSAL (VIBRACIÓN + AUDIO CLIC FÍSICO)
// -------------------------------------------------------------
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

const HAPTICS = {
  tap: 25,
  select: 40,
  success: [40, 60, 120],
  warning: [60, 50, 60],
  duplex: [100, 60, 100]
};

function triggerHaptic(type = 'tap') {
  // 1. Vibración de hardware si el navegador la permite
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(HAPTICS[type] || 25);
    } catch (_) {}
  }

  // 2. Micro-pulso acústico de baja frecuencia para simular sensación táctil
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'tap' || type === 'select') {
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.035);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.06);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch (_) {}
}

// -------------------------------------------------------------
// INICIALIZACIÓN
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  ['touchstart', 'pointerdown', 'click'].forEach(evt => {
    window.addEventListener(evt, () => initAudio(), { once: true });
  });

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
  }

  registerServiceWorker();
  setupNetworkListeners();
  setupEventListeners();
  await fetchConfig();
  await fetchRecentJobs();

  setInterval(() => {
    if (document.visibilityState === 'visible' && state.isOnline) {
      fetchRecentJobs(true);
    }
  }, 15000);
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.warn('SW:', err));
  }
}

function setupNetworkListeners() {
  window.addEventListener('online', () => {
    state.isOnline = true;
    elements.offlineBar.classList.add('hidden');
    triggerHaptic('select');
    showInlineNotice('Conexión con la PC restaurada', 'success');
    fetchConfig();
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    elements.offlineBar.classList.remove('hidden');
    elements.statusDot.className = 'status-dot disconnected';
    elements.statusBadge.textContent = 'Sin conexión';
    triggerHaptic('warning');
    showInlineNotice('Modo sin conexión al Wi-Fi de la PC', 'warning');
  });
}

// -------------------------------------------------------------
// CONFIGURACIÓN DEL SERVIDOR
// -------------------------------------------------------------
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Servidor inaccesible');
    const data = await res.json();
    state.config = data.config;

    if (data.mockMode) {
      elements.statusDot.className = 'status-dot mock';
      elements.statusBadge.textContent = 'Simulación';
    } else {
      elements.statusDot.className = 'status-dot real';
      elements.statusBadge.textContent = 'Epson Lista';
    }

    document.getElementById('inputBwSimplex').value = data.config.bw_simplex;
    document.getElementById('inputBwDuplex').value = data.config.bw_duplex;
    document.getElementById('inputColorSimplex').value = data.config.color_simplex;
    document.getElementById('inputColorDuplex').value = data.config.color_duplex;

    renderNetworkIps(data.localIps, data.port);
  } catch (err) {
    console.error('Error config:', err);
    elements.statusDot.className = 'status-dot disconnected';
    elements.statusBadge.textContent = 'Desconectado';
  }
}

function renderNetworkIps(ips, port) {
  elements.networkIpsList.innerHTML = '';
  if (ips && ips.length > 0) {
    ips.forEach(ip => {
      const url = `http://${ip}:${port}`;
      const div = document.createElement('div');
      div.className = 'ip-row';
      div.innerHTML = `
        <a href="${url}" target="_blank" class="ip-link">${url}</a>
        <button type="button" class="btn-copy" data-url="${url}">Copiar</button>
      `;
      elements.networkIpsList.appendChild(div);
    });

    elements.networkIpsList.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic('tap');
        const urlToCopy = btn.getAttribute('data-url');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(urlToCopy).then(() => {
            showInlineNotice('Dirección copiada para enviar por WhatsApp', 'success');
          });
        }
      });
    });
  } else {
    elements.networkIpsList.innerHTML = `<div class="ip-row"><span class="ip-link">http://localhost:${port}</span></div>`;
  }
}

// -------------------------------------------------------------
// EVENT LISTENERS
// -------------------------------------------------------------
function setupEventListeners() {
  const triggerFile = () => {
    triggerHaptic('tap');
    elements.fileInput.click();
  };

  elements.dropZone.addEventListener('click', triggerFile);
  elements.btnSelectFileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerFile();
  });
  elements.fileInput.addEventListener('change', handleFileSelect);
  elements.btnChangeFile.addEventListener('click', triggerFile);

  // Soporte de arrastrar y soltar (Drag & Drop) para múltiples archivos
  ['dragenter', 'dragover'].forEach(name => {
    elements.dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      elements.dropZone.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach(name => {
    elements.dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      elements.dropZone.classList.remove('drag-over');
    });
  });
  elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  });

  // Toggles de Color
  elements.btnBw.addEventListener('click', () => {
    triggerHaptic('select');
    setOption('color', false);
  });
  elements.btnColor.addEventListener('click', () => {
    triggerHaptic('select');
    setOption('color', true);
  });

  // Toggles de Caras
  elements.btnSimplex.addEventListener('click', () => {
    triggerHaptic('select');
    setOption('duplex', false);
  });

  elements.btnDuplex.addEventListener('click', () => {
    const pageCount = state.selectedPages.length || (state.loadedFile ? state.loadedFile.pageCount : 1);
    if (pageCount <= 1) {
      triggerHaptic('warning');
      showInlineNotice('Tiene 1 sola página: no necesita doble faz', 'info');
      return;
    }
    triggerHaptic('select');
    setOption('duplex', true);
  });

  // Selector de Copias (Paso 4)
  elements.btnDecCopies.addEventListener('click', () => {
    if (state.copies > 1) {
      triggerHaptic('tap');
      state.copies--;
      elements.copiesDisplay.textContent = state.copies;
      updateQuote();
    }
  });

  elements.btnIncCopies.addEventListener('click', () => {
    if (state.copies < 50) {
      triggerHaptic('tap');
      state.copies++;
      elements.copiesDisplay.textContent = state.copies;
      updateQuote();
    }
  });

  // Selector Visual de Páginas (Paso 1)
  elements.btnOpenPageSelector.addEventListener('click', () => {
    triggerHaptic('tap');
    openPageSelector();
  });

  elements.btnClosePageSelector.addEventListener('click', () => {
    triggerHaptic('tap');
    elements.pageSelectorModal.classList.add('hidden');
  });

  elements.btnSelectAllPages.addEventListener('click', () => {
    triggerHaptic('tap');
    toggleAllModalPages(true);
  });

  elements.btnDeselectAllPages.addEventListener('click', () => {
    triggerHaptic('tap');
    toggleAllModalPages(false);
  });

  elements.btnApplyPageSelection.addEventListener('click', applyPageSelection);

  elements.pageSelectorModal.addEventListener('click', (e) => {
    if (e.target === elements.pageSelectorModal) {
      elements.pageSelectorModal.classList.add('hidden');
    }
  });

  // Botón Principal de Imprimir
  elements.btnApprovePrint.addEventListener('click', handleApprovePrint);

  // Botón Descartar
  elements.btnCancelJob.addEventListener('click', () => {
    if (!state.loadedFile) return;
    triggerHaptic('warning');
    resetCurrentJob();
    showInlineNotice('Archivo descartado', 'info');
  });

  // Historial lateral
  elements.btnOpenHistory.addEventListener('click', () => {
    triggerHaptic('tap');
    fetchRecentJobs();
    elements.historyDrawer.classList.remove('hidden');
  });
  elements.btnCloseHistory.addEventListener('click', () => {
    triggerHaptic('tap');
    elements.historyDrawer.classList.add('hidden');
  });
  elements.btnRefreshJobs.addEventListener('click', () => {
    triggerHaptic('tap');
    fetchRecentJobs();
  });
  elements.historyDrawer.addEventListener('click', (e) => {
    if (e.target === elements.historyDrawer) {
      elements.historyDrawer.classList.add('hidden');
    }
  });

  // Configuración
  elements.btnOpenSettings.addEventListener('click', () => {
    triggerHaptic('tap');
    elements.settingsModal.classList.remove('hidden');
  });
  elements.btnCloseSettings.addEventListener('click', () => {
    triggerHaptic('tap');
    elements.settingsModal.classList.add('hidden');
  });
  elements.pricesForm.addEventListener('submit', handleSavePrices);
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.classList.add('hidden');
    }
  });

  // Modal Dúplex
  elements.btnConfirmDuplex.addEventListener('click', handleConfirmDuplex);

  // Modal Visor de Detalle (Nativo)
  elements.btnClosePageDetail.addEventListener('click', () => {
    triggerHaptic('tap');
    elements.pageDetailModal.classList.add('hidden');
  });

  elements.btnToggleDetailSelection.addEventListener('click', toggleDetailSelection);

  elements.btnDetailPrev.addEventListener('click', () => {
    if (currentDetailPage > 1) {
      triggerHaptic('tap');
      currentDetailPage--;
      renderDetailPage(currentDetailPage);
    }
  });

  elements.btnDetailNext.addEventListener('click', () => {
    if (pdfDocInstance && currentDetailPage < pdfDocInstance.numPages) {
      triggerHaptic('tap');
      currentDetailPage++;
      renderDetailPage(currentDetailPage);
    }
  });

  // Gestos táctiles de deslizamiento (swipe horizontal nativo)
  let touchStartX = 0;
  let touchStartY = 0;
  elements.detailCanvasArea.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  elements.detailCanvasArea.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1 && pdfDocInstance) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0 && currentDetailPage < pdfDocInstance.numPages) {
          triggerHaptic('tap');
          currentDetailPage++;
          renderDetailPage(currentDetailPage);
        } else if (deltaX > 0 && currentDetailPage > 1) {
          triggerHaptic('tap');
          currentDetailPage--;
          renderDetailPage(currentDetailPage);
        }
      }
    }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (!elements.pageDetailModal.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        elements.pageDetailModal.classList.add('hidden');
      } else if (e.key === 'ArrowLeft' && currentDetailPage > 1) {
        currentDetailPage--;
        renderDetailPage(currentDetailPage);
      } else if (e.key === 'ArrowRight' && pdfDocInstance && currentDetailPage < pdfDocInstance.numPages) {
        currentDetailPage++;
        renderDetailPage(currentDetailPage);
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleDetailSelection();
      }
      return;
    }

    if (e.key === 'Escape') {
      elements.settingsModal.classList.add('hidden');
      elements.historyDrawer.classList.add('hidden');
      elements.pageSelectorModal.classList.add('hidden');
    }
  });
}

// -------------------------------------------------------------
// SUBIDA Y ANÁLISIS DE ARCHIVOS (1 O MÚLTIPLES ARCHIVOS)
// -------------------------------------------------------------
async function handleFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    await uploadFiles(e.target.files);
  }
}

async function uploadFiles(filesInput) {
  const files = Array.from(filesInput);
  if (files.length === 0) return;

  triggerHaptic('tap');
  const isMultiple = files.length > 1;
  showInlineNotice(isMultiple ? `Analizando ${files.length} fotos...` : 'Analizando documento...', 'info');
  elements.priceAmount.textContent = '...';
  elements.priceDetails.textContent = 'Contando páginas...';

  const formData = new FormData();
  files.forEach(f => formData.append('documento', f));

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Error al procesar el archivo');
    }

    const data = await res.json();
    state.loadedFile = data;

    // Obtener buffer del PDF para el visor y selector
    if (data.pdfUrl) {
      try {
        const pdfRes = await fetch(data.pdfUrl);
        state.pdfArrayBuffer = await pdfRes.arrayBuffer();
      } catch (e) {
        console.warn('No se pudo descargar vista previa PDF:', e);
        state.pdfArrayBuffer = null;
      }
    } else if (!data.isImage && files.length === 1) {
      try {
        state.pdfArrayBuffer = await files[0].arrayBuffer();
      } catch (_) {
        state.pdfArrayBuffer = null;
      }
    } else {
      state.pdfArrayBuffer = null;
    }

    state.copies = 1;
    elements.copiesDisplay.textContent = '1';

    elements.dropZone.classList.add('hidden');
    elements.fileLoadedInfo.classList.remove('hidden');

    const pageCount = data.pageCount || 1;
    state.selectedPages = Array.from({ length: pageCount }, (_, i) => i + 1);

    let badgeText = 'PDF';
    elements.fileTypeBadge.className = 'file-type-pill';
    if (data.isImage) {
      badgeText = data.isMultiImage ? `${pageCount} FOTOS` : 'FOTO';
      elements.fileTypeBadge.classList.add('photo');
    } else if (data.isWord) {
      badgeText = 'WORD';
      elements.fileTypeBadge.classList.add('word');
    }
    elements.fileTypeBadge.textContent = badgeText;

    elements.fileName.textContent = data.originalName || (isMultiple ? `${files.length} fotos` : files[0].name) || 'Documento';
    elements.filePages.textContent = data.isImage
      ? (pageCount === 1 ? '1 pág (foto A4)' : `${pageCount} págs (${pageCount} fotos A4)`)
      : `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}`;

    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    elements.fileSize.textContent = formatBytes(totalBytes);

    // Habilitar selector de páginas si hay más de 1 página (PDF, Word o Múltiples Fotos)
    if (pageCount > 1) {
      elements.btnOpenPageSelector.classList.remove('hidden');
    } else {
      elements.btnOpenPageSelector.classList.add('hidden');
    }

    if (pageCount <= 1) {
      setOption('duplex', false);
      elements.btnDuplex.classList.add('disabled-hint');
    } else {
      elements.btnDuplex.classList.remove('disabled-hint');
    }

    // Activar botón de imprimir y descartar
    elements.btnApprovePrint.classList.remove('is-idle');
    elements.btnCancelJob.classList.remove('is-idle');

    await updateQuote();
    triggerHaptic('select');
    showInlineNotice(`¡Listo! ${pageCount} ${pageCount === 1 ? 'página detectada' : 'páginas detectadas'}`, 'success');
  } catch (err) {
    console.error('Error al subir:', err);
    triggerHaptic('warning');
    showInlineNotice(err.message || 'No se pudo leer el archivo', 'error');
    resetCurrentJob();
  }
}

function setOption(type, value) {
  if (type === 'color') {
    state.isColor = value;
    elements.btnBw.classList.toggle('active', !value);
    elements.btnColor.classList.toggle('active', value);
  } else if (type === 'duplex') {
    state.isDuplex = value;
    elements.btnSimplex.classList.toggle('active', !value);
    elements.btnDuplex.classList.toggle('active', value);
  }

  if (state.loadedFile) {
    updateQuote();
  }
}

async function updateQuote() {
  if (!state.loadedFile) return;

  const actualPages = (state.selectedPages && state.selectedPages.length > 0)
    ? state.selectedPages.length
    : (state.loadedFile.pageCount || 1);

  try {
    const res = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageCount: actualPages,
        isColor: state.isColor,
        isDuplex: state.isDuplex,
        copies: state.copies || 1
      })
    });

    const quote = await res.json();
    state.currentQuote = quote;

    elements.priceAmount.textContent = quote.totalPrice;
    elements.priceAmount.classList.remove('price-pop');
    void elements.priceAmount.offsetWidth;
    elements.priceAmount.classList.add('price-pop');

    const modoTexto = quote.isColor ? 'Color' : 'B&N';
    const fazTexto = quote.isDuplex ? 'Doble faz' : 'Simple';
    const hojasLabel = quote.physicalSheets === 1 ? 'hoja física' : 'hojas físicas';
    const copiasTexto = (quote.copies > 1) ? ` • ${quote.copies} copias` : '';

    elements.priceDetails.textContent = `${quote.physicalSheets} ${hojasLabel} (${actualPages} págs. ${modoTexto} ${fazTexto}${copiasTexto})`;
  } catch (err) {
    console.error('Error cotización:', err);
  }
}

function resetCurrentJob() {
  state.loadedFile = null;
  state.currentQuote = null;
  state.activeJobId = null;
  state.copies = 1;
  state.selectedPages = [];
  state.pdfArrayBuffer = null;
  elements.copiesDisplay.textContent = '1';
  elements.btnOpenPageSelector.classList.add('hidden');
  elements.pageSelectorModal.classList.add('hidden');
  elements.pageDetailModal.classList.add('hidden');
  pdfDocInstance = null;
  elements.fileInput.value = '';
  elements.fileTypeBadge.className = 'file-type-pill';
  elements.fileTypeBadge.textContent = 'PDF';

  elements.dropZone.classList.remove('hidden');
  elements.fileLoadedInfo.classList.add('hidden');

  elements.priceAmount.textContent = '0';
  elements.priceDetails.textContent = 'Cargue un archivo para cotizar';
  
  elements.btnApprovePrint.classList.add('is-idle');
  elements.btnCancelJob.classList.add('is-idle');
  elements.btnDuplex.classList.remove('disabled-hint');
}

// -------------------------------------------------------------
// IMPRESIÓN Y COLA
// -------------------------------------------------------------
async function handleApprovePrint() {
  if (!state.loadedFile || !state.currentQuote) {
    triggerHaptic('warning');
    
    // Animación de temblor en la tarjeta de archivo sin mover el resto
    elements.uploadPanel.classList.remove('shake-panel');
    void elements.uploadPanel.offsetWidth;
    elements.uploadPanel.classList.add('shake-panel');

    showInlineNotice('¡Paso 1: elegí un archivo para imprimir!', 'warning', 4000);

    setTimeout(() => {
      elements.uploadPanel.classList.remove('shake-panel');
    }, 500);
    return;
  }

  triggerHaptic('select');
  elements.btnApprovePrint.disabled = true;
  elements.btnCancelJob.disabled = true;
  try {
    const actualPageCount = (state.selectedPages && state.selectedPages.length > 0)
      ? state.selectedPages.length
      : state.loadedFile.pageCount;

    const createRes = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfPath: state.loadedFile.pdfPath,
        originalName: state.loadedFile.originalName,
        pageCount: actualPageCount,
        copies: state.copies || 1,
        selectedPages: state.selectedPages,
        isColor: state.isColor,
        isDuplex: state.isDuplex
      })
    });

    const createData = await createRes.json();
    const jobId = createData.job.id;
    state.activeJobId = jobId;

    const approveRes = await fetch(`/api/jobs/${jobId}/approve`, {
      method: 'POST'
    });
    const approveData = await approveRes.json();
    const job = approveData.job;

    if (job.status === 'waiting_flip') {
      triggerHaptic('duplex');
      elements.duplexModal.classList.remove('hidden');
    } else if (job.status === 'completed') {
      triggerHaptic('success');
      showInlineNotice('¡Impresión enviada con éxito!', 'success');
      resetCurrentJob();
      await fetchRecentJobs();
    } else {
      showInlineNotice(`Estado: ${job.status}`, 'info');
      resetCurrentJob();
      await fetchRecentJobs();
    }
  } catch (err) {
    console.error('Error impresión:', err);
    triggerHaptic('warning');
    showInlineNotice(err.message || 'Error al imprimir', 'error');
  } finally {
    elements.btnApprovePrint.disabled = false;
    elements.btnCancelJob.disabled = false;
    elements.printSpinner.classList.add('hidden');
    elements.btnApprovePrintText.textContent = 'COBRAR E IMPRIMIR';
  }
}

async function handleConfirmDuplex() {
  if (!state.activeJobId) return;

  triggerHaptic('tap');
  elements.btnConfirmDuplex.disabled = true;
  elements.duplexSpinner.classList.remove('hidden');

  try {
    const res = await fetch(`/api/jobs/${state.activeJobId}/continue-duplex`, {
      method: 'POST'
    });
    const data = await res.json();

    if (data.success && data.job.status === 'completed') {
      elements.duplexModal.classList.add('hidden');
      triggerHaptic('success');
      showInlineNotice('¡Doble faz finalizado correctamente!', 'success');
      resetCurrentJob();
      await fetchRecentJobs();
    } else {
      showInlineNotice('Hubo un inconveniente al imprimir pares', 'error');
    }
  } catch (err) {
    console.error('Error continuar doble faz:', err);
    triggerHaptic('warning');
    showInlineNotice(err.message || 'Error de impresión', 'error');
  } finally {
    elements.btnConfirmDuplex.disabled = false;
    elements.duplexSpinner.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// HISTORIAL DE TRABAJOS
// -------------------------------------------------------------
async function fetchRecentJobs(silent = false) {
  try {
    const res = await fetch('/api/jobs');
    if (!res.ok) return;
    const jobs = await res.json();

    if (!jobs || jobs.length === 0) {
      elements.jobsList.innerHTML = '<div class="empty-jobs">No hay impresiones en este turno</div>';
      return;
    }

    elements.jobsList.innerHTML = jobs.slice(0, 15).map(job => {
      const fecha = new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let statusClass = 'completed';
      let statusText = 'Listo';

      if (job.status === 'waiting_flip') {
        statusClass = 'waiting_flip';
        statusText = 'Girar hojas';
      } else if (job.status === 'cancelled') {
        statusClass = 'cancelled';
        statusText = 'Cancelado';
      } else if (job.status === 'printing' || job.status === 'printing_odds') {
        statusClass = 'printing';
        statusText = 'Imprimiendo';
      }

      return `
        <div class="job-item">
          <div class="job-info">
            <span class="job-title">${escapeHtml(job.originalName || 'Documento')}</span>
            <span class="job-sub">${fecha} • ${job.pages} págs (${job.isColor ? 'Color' : 'B&N'}) • $${job.totalPrice}</span>
          </div>
          <span class="job-pill ${statusClass}">${statusText}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    if (!silent) console.error('Error historial:', err);
  }
}

// -------------------------------------------------------------
// GUARDAR TARIFAS
// -------------------------------------------------------------
async function handleSavePrices(e) {
  e.preventDefault();
  triggerHaptic('tap');

  const bw_simplex = parseInt(document.getElementById('inputBwSimplex').value, 10);
  const bw_duplex = parseInt(document.getElementById('inputBwDuplex').value, 10);
  const color_simplex = parseInt(document.getElementById('inputColorSimplex').value, 10);
  const color_duplex = parseInt(document.getElementById('inputColorDuplex').value, 10);

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bw_simplex, bw_duplex, color_simplex, color_duplex })
    });

    const data = await res.json();
    state.config = data.config;
    elements.settingsModal.classList.add('hidden');
    triggerHaptic('select');
    showInlineNotice('Tarifas guardadas correctamente', 'success');

    if (state.loadedFile) {
      await updateQuote();
    }
  } catch (err) {
    console.error('Error al guardar:', err);
    triggerHaptic('warning');
    showInlineNotice('No se pudieron guardar las tarifas', 'error');
  }
}

// -------------------------------------------------------------
// AVISOS FIJOS (CERO MOVIMIENTO DE LA PANTALLA)
// -------------------------------------------------------------
const NOTICE_SVGS = {
  success: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  warning: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
  error: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  info: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

let noticeTimer = null;
function showInlineNotice(message, type = 'info', duration = 3000) {
  elements.alertMessage.textContent = message;
  elements.alertIcon.innerHTML = NOTICE_SVGS[type] || NOTICE_SVGS.info;
  elements.inlineAlert.className = `inline-alert ${type}`;
  elements.inlineAlert.classList.remove('hidden');

  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    elements.inlineAlert.classList.add('hidden');
  }, duration);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `(${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]})`;
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// -------------------------------------------------------------
// VISOR Y SELECTOR VISUAL DE PÁGINAS PDF
// -------------------------------------------------------------
let modalTempSelectedPages = new Set();
let pdfDocInstance = null;

async function openPageSelector() {
  if (!state.loadedFile || !state.pdfArrayBuffer) {
    showInlineNotice('No se puede cargar el visor de este archivo', 'error');
    return;
  }

  elements.pageSelectorModal.classList.remove('hidden');
  elements.pagesGrid.innerHTML = `
    <div class="loading-pages">
      <span class="spinner" style="border-top-color: var(--color-blue); border-color: #cbd5e1;"></span>
      <p>Generando vista previa de las hojas...</p>
    </div>
  `;

  const totalPages = state.loadedFile.pageCount || 1;
  modalTempSelectedPages = new Set(
    (state.selectedPages && state.selectedPages.length > 0)
      ? state.selectedPages
      : Array.from({ length: totalPages }, (_, i) => i + 1)
  );

  updateModalCounter();

  try {
    if (!window.pdfjsLib) {
      throw new Error('Librería PDF.js no disponible.');
    }

    const loadingTask = pdfjsLib.getDocument({ data: state.pdfArrayBuffer.slice(0) });
    pdfDocInstance = await loadingTask.promise;
    const pdf = pdfDocInstance;

    elements.pagesGrid.innerHTML = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = 150 / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const card = document.createElement('div');
      card.className = `page-thumb-card ${modalTempSelectedPages.has(pageNum) ? '' : 'is-excluded'}`;
      card.id = `thumb-page-${pageNum}`;
      card.setAttribute('data-page', pageNum);

      const canvasWrapper = document.createElement('div');
      canvasWrapper.className = 'page-canvas-wrapper';

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');

      canvasWrapper.appendChild(canvas);

      const footer = document.createElement('div');
      footer.className = 'page-thumb-footer';
      footer.innerHTML = `
        <span class="page-num-label">Pág. ${pageNum}</span>
        <div class="thumb-footer-btns">
          <button type="button" class="btn-thumb-inspect" data-page="${pageNum}" title="Ver hoja en detalle">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>Ver</span>
          </button>
          <span class="page-status-pill">${modalTempSelectedPages.has(pageNum) ? '✓ Lista' : '✕ Excluida'}</span>
        </div>
      `;

      const btnInspect = footer.querySelector('.btn-thumb-inspect');
      btnInspect.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic('tap');
        openPageDetail(pageNum);
      });

      card.appendChild(canvasWrapper);
      card.appendChild(footer);

      card.addEventListener('click', () => {
        triggerHaptic('tap');
        toggleModalPage(pageNum);
      });

      elements.pagesGrid.appendChild(card);

      // Renderizar la miniatura en el canvas
      page.render({ canvasContext: context, viewport });
    }
  } catch (err) {
    console.error('Error renderizando miniaturas:', err);
    elements.pagesGrid.innerHTML = `
      <div class="loading-pages">
        <p style="color: #b91c1c;">No se pudieron generar las miniaturas visuales.</p>
      </div>
    `;
  }
}

function toggleModalPage(pageNum) {
  if (modalTempSelectedPages.has(pageNum)) {
    if (modalTempSelectedPages.size <= 1) {
      triggerHaptic('warning');
      showInlineNotice('Tenés que dejar al menos 1 página seleccionada', 'warning');
      return;
    }
    modalTempSelectedPages.delete(pageNum);
  } else {
    modalTempSelectedPages.add(pageNum);
  }

  const card = document.getElementById(`thumb-page-${pageNum}`);
  if (card) {
    const isSelected = modalTempSelectedPages.has(pageNum);
    card.classList.toggle('is-excluded', !isSelected);
    const pill = card.querySelector('.page-status-pill');
    if (pill) {
      pill.textContent = isSelected ? '✓ Lista' : '✕ Excluida';
    }
  }

  // Sincronizar en tiempo real con el visor de detalle si está abierto
  if (elements.pageDetailModal && !elements.pageDetailModal.classList.contains('hidden') && currentDetailPage === pageNum) {
    const isSel = modalTempSelectedPages.has(pageNum);
    elements.btnToggleDetailSelection.className = `btn-detail-toggle ${isSel ? 'is-included' : 'is-excluded'}`;
    elements.detailToggleIcon.textContent = isSel ? '✓' : '✕';
    elements.detailToggleText.textContent = isSel ? 'Incluida' : 'Excluida';
  }

  updateModalCounter();
}

// -------------------------------------------------------------
// VISOR DE HOJA EN DETALLE (SENSACIÓN NATIVA MÓVIL)
// -------------------------------------------------------------
let currentDetailPage = 1;
let isRenderingDetail = false;

async function openPageDetail(pageNum) {
  if (!pdfDocInstance) return;
  currentDetailPage = pageNum;
  elements.pageDetailModal.classList.remove('hidden');
  await renderDetailPage(currentDetailPage);
}

async function renderDetailPage(pageNum) {
  if (!pdfDocInstance || isRenderingDetail) return;
  isRenderingDetail = true;

  const totalPages = pdfDocInstance.numPages;
  elements.pageDetailTitle.textContent = `Página ${pageNum} de ${totalPages}`;
  elements.detailIndicator.textContent = `${pageNum} / ${totalPages}`;

  elements.btnDetailPrev.disabled = (pageNum <= 1);
  elements.btnDetailNext.disabled = (pageNum >= totalPages);

  const isSelected = modalTempSelectedPages.has(pageNum);
  elements.btnToggleDetailSelection.className = `btn-detail-toggle ${isSelected ? 'is-included' : 'is-excluded'}`;
  elements.detailToggleIcon.textContent = isSelected ? '✓' : '✕';
  elements.detailToggleText.textContent = isSelected ? 'Incluida' : 'Excluida';

  elements.detailLoading.classList.remove('hidden');

  try {
    const page = await pdfDocInstance.getPage(pageNum);

    // Renderizado nítido de alta resolución (DPR aware)
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const unscaledViewport = page.getViewport({ scale: 1 });

    const containerWidth = Math.min(window.innerWidth * 0.92, 580);
    const containerHeight = Math.max(window.innerHeight * 0.70, 320);

    const scale = Math.min(containerWidth / unscaledViewport.width, containerHeight / unscaledViewport.height);
    const viewport = page.getViewport({ scale: scale * dpr });

    const canvas = elements.detailCanvas;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${Math.round(viewport.width / dpr)}px`;
    canvas.style.height = `${Math.round(viewport.height / dpr)}px`;

    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
  } catch (err) {
    console.error('Error renderizando detalle:', err);
  } finally {
    elements.detailLoading.classList.add('hidden');
    isRenderingDetail = false;
  }
}

function toggleDetailSelection() {
  if (!pdfDocInstance) return;
  triggerHaptic('tap');
  toggleModalPage(currentDetailPage);
}

function toggleAllModalPages(selectAll) {
  if (!state.loadedFile) return;
  const total = state.loadedFile.pageCount || 1;

  if (selectAll) {
    for (let i = 1; i <= total; i++) modalTempSelectedPages.add(i);
  } else {
    modalTempSelectedPages.clear();
    modalTempSelectedPages.add(1);
  }

  for (let i = 1; i <= total; i++) {
    const card = document.getElementById(`thumb-page-${i}`);
    if (card) {
      const isSelected = modalTempSelectedPages.has(i);
      card.classList.toggle('is-excluded', !isSelected);
      const pill = card.querySelector('.page-status-pill');
      if (pill) {
        pill.textContent = isSelected ? '✓ Lista' : '✕ Excluida';
      }
    }
  }

  updateModalCounter();
}

function updateModalCounter() {
  const count = modalTempSelectedPages.size;
  elements.selectedPagesCountBadge.textContent = `${count} ${count === 1 ? 'pág' : 'págs'} elegidas`;
  elements.btnApplyCount.textContent = count;
}

function applyPageSelection() {
  triggerHaptic('select');
  state.selectedPages = Array.from(modalTempSelectedPages).sort((a, b) => a - b);
  elements.pageSelectorModal.classList.add('hidden');

  const totalOriginal = state.loadedFile.pageCount || 1;
  const selectedCount = state.selectedPages.length;

  if (selectedCount < totalOriginal) {
    elements.filePages.textContent = `${selectedCount} de ${totalOriginal} págs`;
    showInlineNotice(`Seleccionadas ${selectedCount} de ${totalOriginal} páginas`, 'success');
  } else {
    elements.filePages.textContent = `${totalOriginal} págs (todas)`;
    showInlineNotice('Todas las páginas seleccionadas', 'info');
  }

  if (selectedCount <= 1) {
    setOption('duplex', false);
    elements.btnDuplex.classList.add('disabled-hint');
  } else {
    elements.btnDuplex.classList.remove('disabled-hint');
  }

  updateQuote();
}
