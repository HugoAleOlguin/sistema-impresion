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
  currentPhotoFiles: [], // Fotos en memoria si se suben fotos
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
  inputBwSimplex: document.getElementById('inputBwSimplex'),
  inputBwDuplex: document.getElementById('inputBwDuplex'),
  inputColorSimplex: document.getElementById('inputColorSimplex'),
  inputColorDuplex: document.getElementById('inputColorDuplex'),
  selectPrinter: document.getElementById('selectPrinter'),

  // Tema Claro / Oscuro (solo en modal de configuración)
  btnThemeLight: document.getElementById('btnThemeLight'),
  btnThemeDark: document.getElementById('btnThemeDark'),

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
  btnTriggerAll: document.getElementById('btnTriggerAll'),
  docInput: document.getElementById('docInput'),
  galleryInput: document.getElementById('galleryInput'),
  cameraInput: document.getElementById('cameraInput'),
  allFilesInput: document.getElementById('allFilesInput'),
  addGalleryInput: document.getElementById('addGalleryInput'),
  addCameraInput: document.getElementById('addCameraInput'),
  fileLoadedInfo: document.getElementById('fileLoadedInfo'),
  fileTypeBadge: document.getElementById('fileTypeBadge'),
  fileName: document.getElementById('fileName'),
  filePages: document.getElementById('filePages'),
  btnOpenPageSelector: document.getElementById('btnOpenPageSelector'),
  btnPageSelectorLabel: document.getElementById('btnPageSelectorLabel'),
  btnAddPhoto: document.getElementById('btnAddPhoto'),
  fileSize: document.getElementById('fileSize'),
  btnRemoveFile: document.getElementById('btnRemoveFile'),
  btnChangeFile: document.getElementById('btnChangeFile'),
  changeFileModal: document.getElementById('changeFileModal'),
  btnCloseChangeFile: document.getElementById('btnCloseChangeFile'),
  btnChangeDocs: document.getElementById('btnChangeDocs'),
  btnChangeGallery: document.getElementById('btnChangeGallery'),
  btnChangeCamera: document.getElementById('btnChangeCamera'),
  addPhotoModal: document.getElementById('addPhotoModal'),
  btnCloseAddPhoto: document.getElementById('btnCloseAddPhoto'),
  btnChoiceCamera: document.getElementById('btnChoiceCamera'),
  btnChoiceGallery: document.getElementById('btnChoiceGallery'),

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
  detailIndicator: document.getElementById('detailIndicator'),

  // Modales Bloqueantes de Carga y Progreso
  uploadProgressModal: document.getElementById('uploadProgressModal'),
  uploadProgressRingFill: document.getElementById('uploadProgressRingFill'),
  uploadProgressPercent: document.getElementById('uploadProgressPercent'),
  uploadLinearProgressFill: document.getElementById('uploadLinearProgressFill'),
  uploadLoadingTitle: document.getElementById('uploadLoadingTitle'),
  uploadLoadingStage: document.getElementById('uploadLoadingStage'),
  uploadLoadingFileName: document.getElementById('uploadLoadingFileName'),

  printProgressModal: document.getElementById('printProgressModal'),
  printLoadingTitle: document.getElementById('printLoadingTitle'),
  printLoadingStage: document.getElementById('printLoadingStage'),
  printJobSummaryText: document.getElementById('printJobSummaryText'),
  printShimmerBar: document.getElementById('printShimmerBar'),
  printerAnimWrap: document.getElementById('printerAnimWrap'),
  printSuccessWrap: document.getElementById('printSuccessWrap'),

  // Modal de Doble Confirmación de Cancelación
  confirmCancelModal: document.getElementById('confirmCancelModal'),
  confirmCancelTitle: document.getElementById('confirmCancelTitle'),
  confirmCancelDesc: document.getElementById('confirmCancelDesc'),
  btnAbortCancel: document.getElementById('btnAbortCancel'),
  btnExecuteCancel: document.getElementById('btnExecuteCancel'),
  btnCancelDuplexJob: document.getElementById('btnCancelDuplexJob'),
  btnCancelWhilePrinting: document.getElementById('btnCancelWhilePrinting')
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
  try { initTheme(); } catch (e) { console.error('Error initTheme:', e); }

  ['touchstart', 'pointerdown', 'click'].forEach(evt => {
    window.addEventListener(evt, () => initAudio(), { once: true });
  });

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
  }

  try { registerServiceWorker(); } catch (e) { console.warn('SW:', e); }
  try { setupNetworkListeners(); } catch (e) { console.error('Error network:', e); }
  try { setupEventListeners(); } catch (e) { console.error('Error listeners:', e); }

  // Vital: cargar configuración y lista de impresoras (aislado para garantizar ejecución)
  try {
    await fetchConfig();
  } catch (e) {
    console.error('Error crítico fetchConfig:', e);
  }

  try {
    await fetchRecentJobs();
  } catch (e) {
    console.warn('Error fetchRecentJobs:', e);
  }

  // Comprobar si se abrió la app compartiendo un archivo desde WhatsApp o Galería
  try {
    if (typeof window.checkPendingSharedFiles === 'function') {
      await window.checkPendingSharedFiles();
    }
  } catch (e) {
    console.warn('Error checkPendingSharedFiles:', e);
  }
  setTimeout(() => {
    if (typeof window.checkPendingSharedFiles === 'function') {
      window.checkPendingSharedFiles();
    }
  }, 700);

  setInterval(() => {
    if (document.visibilityState === 'visible' && state.isOnline) {
      fetchRecentJobs(true);
    }
  }, 15000);
});

// -------------------------------------------------------------
// GESTIÓN DE TEMA (CLARO / OSCURO)
// MODO CLARO PREDETERMINADO
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('app-theme') || 'light';
  setTheme(savedTheme, false);
}

function setTheme(theme, triggerSound = true) {
  const isDark = (theme === 'dark');
  const activeTheme = isDark ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', activeTheme);
  localStorage.setItem('app-theme', activeTheme);

  // Notificar al contenedor nativo de Android
  if (window.KioscoNativeApp && typeof window.KioscoNativeApp.notifyTheme === 'function') {
    try { window.KioscoNativeApp.notifyTheme(activeTheme); } catch (e) {}
  }

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
  }

  if (elements.btnThemeLight) {
    elements.btnThemeLight.classList.toggle('active', !isDark);
  }
  if (elements.btnThemeDark) {
    elements.btnThemeDark.classList.toggle('active', isDark);
  }

  if (elements.themeToggleIcon) {
    elements.themeToggleIcon.textContent = isDark ? '🌙' : '☀️';
  }
  if (elements.themeToggleLabel) {
    elements.themeToggleLabel.textContent = isDark ? 'Oscuro' : 'Claro';
  }

  if (triggerSound) {
    triggerHaptic('select');
  }
}

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

    if (elements.statusDot && elements.statusBadge) {
      if (data.mockMode) {
        elements.statusDot.className = 'status-dot mock';
        elements.statusBadge.textContent = 'Simulación';
      } else {
        elements.statusDot.className = 'status-dot real';
        elements.statusBadge.textContent = 'Epson Lista';
      }
    }

    const inputBwSimplex = elements.inputBwSimplex || document.getElementById('inputBwSimplex');
    const inputBwDuplex = elements.inputBwDuplex || document.getElementById('inputBwDuplex');
    const inputColorSimplex = elements.inputColorSimplex || document.getElementById('inputColorSimplex');
    const inputColorDuplex = elements.inputColorDuplex || document.getElementById('inputColorDuplex');

    if (inputBwSimplex && data.config) inputBwSimplex.value = data.config.bw_simplex ?? 100;
    if (inputBwDuplex && data.config) inputBwDuplex.value = data.config.bw_duplex ?? 150;
    if (inputColorSimplex && data.config) inputColorSimplex.value = data.config.color_simplex ?? 200;
    if (inputColorDuplex && data.config) inputColorDuplex.value = data.config.color_duplex ?? 250;

    const selectPrinter = elements.selectPrinter || document.getElementById('selectPrinter');
    if (selectPrinter) {
      selectPrinter.innerHTML = '';
      const printers = Array.isArray(data.availablePrinters) ? [...data.availablePrinters] : [];
      if (printers.length === 0 && (data.printerName || (data.config && data.config.printerName))) {
        printers.push({ Name: data.printerName || data.config.printerName, PortName: '' });
      }

      const activePrinterName = (data.config && data.config.printerName) || data.printerName || '';

      printers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.Name;
        opt.textContent = p.PortName ? `${p.Name} (${p.PortName})` : p.Name;
        if (p.Name === activePrinterName) {
          opt.selected = true;
        }
        selectPrinter.appendChild(opt);
      });

      if (!selectPrinter.value && selectPrinter.options.length > 0) {
        selectPrinter.selectedIndex = 0;
      }
    }
  } catch (err) {
    console.error('Error config:', err);
    if (elements.statusDot) elements.statusDot.className = 'status-dot disconnected';
    if (elements.statusBadge) elements.statusBadge.textContent = 'Desconectado';
  }
}

// -------------------------------------------------------------
// EVENT LISTENERS (DEFENSIVO: IMPOSIBLE QUE UN ELEMENTO FALTE Y ROMPA LA APP)
// -------------------------------------------------------------
function on(el, event, handler, options) {
  if (!el) return;
  el.addEventListener(event, handler, options);
}

function setupEventListeners() {
  // Botón único de carga (Paso 1) — abre el selector nativo del sistema
  on(elements.btnTriggerAll, 'click', (e) => {
    e.stopPropagation();
    triggerHaptic('tap');
    state.currentPhotoFiles = [];
    if (elements.allFilesInput) elements.allFilesInput.click();
  });

  // Clic en zona del dropzone fuera del botón
  on(elements.dropZone, 'click', (e) => {
    if (e.target.closest('.btn-upload-single')) return;
    triggerHaptic('tap');
    if (elements.allFilesInput) elements.allFilesInput.click();
  });

  // Listeners de cambio en los inputs de archivos
  on(elements.docInput, 'change', handleFileSelect);
  on(elements.galleryInput, 'change', handleFileSelect);
  on(elements.cameraInput, 'change', handleCameraSelect);
  on(elements.allFilesInput, 'change', handleFileSelect);

  // Botón Quitar archivo cargado (Paso 1)
  on(elements.btnRemoveFile, 'click', () => {
    triggerHaptic('tap');
    resetCurrentJob();
    showInlineNotice('Archivo quitado', 'info');
  });

  // Botón Cambiar archivo: dispara directamente el selector sin modal intermedio repetido
  on(elements.btnChangeFile, 'click', () => {
    triggerHaptic('tap');
    if (elements.allFilesInput) elements.allFilesInput.click();
  });

  // Botón Agregar otra foto: dispara directamente el selector nativo
  on(elements.btnAddPhoto, 'click', () => {
    triggerHaptic('tap');
    if (elements.addGalleryInput) elements.addGalleryInput.click();
  });

  on(elements.addCameraInput, 'change', handleAddPhotosSelected);
  on(elements.addGalleryInput, 'change', handleAddPhotosSelected);

  // Soporte de arrastrar y soltar (Drag & Drop) para múltiples archivos
  if (elements.dropZone) {
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
  }

  // Toggles de Color
  on(elements.btnBw, 'click', () => {
    triggerHaptic('select');
    setOption('color', false);
  });
  on(elements.btnColor, 'click', () => {
    triggerHaptic('select');
    setOption('color', true);
  });

  // Toggles de Caras
  on(elements.btnSimplex, 'click', () => {
    triggerHaptic('select');
    setOption('duplex', false);
  });
  on(elements.btnDuplex, 'click', () => {
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
  on(elements.btnDecCopies, 'click', () => {
    if (state.copies > 1) {
      triggerHaptic('tap');
      state.copies--;
      if (elements.copiesDisplay) elements.copiesDisplay.textContent = state.copies;
      updateQuote();
    }
  });
  on(elements.btnIncCopies, 'click', () => {
    if (state.copies < 50) {
      triggerHaptic('tap');
      state.copies++;
      if (elements.copiesDisplay) elements.copiesDisplay.textContent = state.copies;
      updateQuote();
    }
  });

  // Selector Visual de Páginas o Visor directo (Paso 1)
  on(elements.btnOpenPageSelector, 'click', () => {
    triggerHaptic('tap');
    const totalPages = (state.loadedFile && state.loadedFile.pageCount) ? state.loadedFile.pageCount : 1;
    if (totalPages === 1) {
      openPageDetail(1);
    } else {
      openPageSelector();
    }
  });

  on(elements.btnClosePageSelector, 'click', () => {
    triggerHaptic('tap');
    if (elements.pageSelectorModal) elements.pageSelectorModal.classList.add('hidden');
  });

  on(elements.btnSelectAllPages, 'click', () => {
    triggerHaptic('tap');
    toggleAllModalPages(true);
  });

  on(elements.btnDeselectAllPages, 'click', () => {
    triggerHaptic('tap');
    toggleAllModalPages(false);
  });

  on(elements.btnApplyPageSelection, 'click', applyPageSelection);

  on(elements.pageSelectorModal, 'click', (e) => {
    if (e.target === elements.pageSelectorModal) {
      elements.pageSelectorModal.classList.add('hidden');
    }
  });

  // Botón Principal de Imprimir
  on(elements.btnApprovePrint, 'click', handleApprovePrint);

  // Botón Cancelar Impresión (con doble confirmación)
  on(elements.btnCancelJob, 'click', () => {
    if (!state.loadedFile) return;
    promptCancelConfirmation('main');
  });

  // Botón Cancelar en modal Dúplex (con doble confirmación)
  on(elements.btnCancelDuplexJob, 'click', () => {
    promptCancelConfirmation('duplex');
  });

  // Botón Cancelar durante envío de impresión (con doble confirmación)
  on(elements.btnCancelWhilePrinting, 'click', () => {
    promptCancelConfirmation('printing');
  });

  // Acciones del Modal de Doble Confirmación
  on(elements.btnAbortCancel, 'click', abortCancel);
  on(elements.btnExecuteCancel, 'click', executeCancel);
  on(elements.confirmCancelModal, 'click', (e) => {
    if (e.target === elements.confirmCancelModal) {
      abortCancel();
    }
  });

  // Historial lateral
  on(elements.btnOpenHistory, 'click', () => {
    triggerHaptic('tap');
    fetchRecentJobs();
    if (elements.historyDrawer) elements.historyDrawer.classList.remove('hidden');
  });
  on(elements.btnCloseHistory, 'click', () => {
    triggerHaptic('tap');
    if (elements.historyDrawer) elements.historyDrawer.classList.add('hidden');
  });
  on(elements.btnRefreshJobs, 'click', () => {
    triggerHaptic('tap');
    fetchRecentJobs();
  });
  on(elements.historyDrawer, 'click', (e) => {
    if (e.target === elements.historyDrawer) {
      elements.historyDrawer.classList.add('hidden');
    }
  });

  // Configuración (con auto-recuperación y carga fresca de impresoras)
  on(elements.btnOpenSettings, 'click', async () => {
    triggerHaptic('tap');
    if (elements.settingsModal) elements.settingsModal.classList.remove('hidden');
    await fetchConfig();
  });
  on(elements.btnCloseSettings, 'click', () => {
    triggerHaptic('tap');
    if (elements.settingsModal) elements.settingsModal.classList.add('hidden');
  });
  on(elements.pricesForm, 'submit', handleSavePrices);
  on(elements.settingsModal, 'click', (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.classList.add('hidden');
    }
  });

  // Selector de Tema Claro / Oscuro (solo en modal de configuración)
  on(elements.btnThemeLight, 'click', () => setTheme('light'));
  on(elements.btnThemeDark, 'click', () => setTheme('dark'));

  // Modal Dúplex continuar
  on(elements.btnConfirmDuplex, 'click', handleConfirmDuplex);

  // Modal Visor de Detalle (Nativo)
  on(elements.btnClosePageDetail, 'click', () => {
    triggerHaptic('tap');
    if (elements.pageDetailModal) elements.pageDetailModal.classList.add('hidden');
  });

  on(elements.btnToggleDetailSelection, 'click', toggleDetailSelection);

  on(elements.btnDetailPrev, 'click', () => {
    if (currentDetailPage > 1) {
      triggerHaptic('tap');
      currentDetailPage--;
      renderDetailPage(currentDetailPage);
    }
  });

  on(elements.btnDetailNext, 'click', () => {
    if (pdfDocInstance && currentDetailPage < pdfDocInstance.numPages) {
      triggerHaptic('tap');
      currentDetailPage++;
      renderDetailPage(currentDetailPage);
    }
  });

  // Gestos táctiles de deslizamiento (swipe horizontal nativo)
  if (elements.detailCanvasArea) {
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
  }

  window.addEventListener('keydown', (e) => {
    if (elements.confirmCancelModal && !elements.confirmCancelModal.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        abortCancel();
      }
      return;
    }

    if (elements.pageDetailModal && !elements.pageDetailModal.classList.contains('hidden')) {
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
      if (elements.settingsModal) elements.settingsModal.classList.add('hidden');
      if (elements.historyDrawer) elements.historyDrawer.classList.add('hidden');
      if (elements.pageSelectorModal) elements.pageSelectorModal.classList.add('hidden');
    }
  });
}

// -------------------------------------------------------------
// CONTROL DE PANTALLAS DE CARGA Y PROGRESO (LOADING OVERLAYS)
// -------------------------------------------------------------
let uploadProgressInterval = null;
let currentUploadPercent = 0;

function showUploadProgress(fileName, fileCount = 1) {
  if (!elements.uploadProgressModal) return;

  if (elements.uploadLoadingFileName) {
    elements.uploadLoadingFileName.textContent = fileCount > 1
      ? `${fileCount} fotos seleccionadas`
      : (fileName || 'Archivo');
  }

  if (elements.uploadLoadingTitle) {
    elements.uploadLoadingTitle.textContent = fileCount > 1
      ? 'Procesando imágenes...'
      : 'Procesando archivo...';
  }

  currentUploadPercent = 0;
  updateUploadProgressUI(0, 'Subiendo archivo al servidor...');
  elements.uploadProgressModal.classList.remove('hidden');

  if (uploadProgressInterval) clearInterval(uploadProgressInterval);

  // Etapas secuenciales con porcentajes objetivos y velocidades fluidas
  const stages = [
    { target: 32, increment: 3.5, text: 'Subiendo archivo al servidor...' },
    { target: 64, increment: 2.2, text: fileCount > 1 ? 'Convirtiendo fotos a formato A4...' : 'Analizando páginas y formato...' },
    { target: 86, increment: 1.4, text: 'Optimizando resolución para Epson L3560...' },
    { target: 95, increment: 0.6, text: 'Generando vista previa de alta calidad...' }
  ];

  let stageIndex = 0;

  uploadProgressInterval = setInterval(() => {
    if (stageIndex >= stages.length) {
      // Se mantiene en 95% hasta que el backend responde
      return;
    }

    const stage = stages[stageIndex];
    if (currentUploadPercent < stage.target) {
      currentUploadPercent = Math.min(stage.target, currentUploadPercent + stage.increment);
      updateUploadProgressUI(Math.round(currentUploadPercent), stage.text);
    } else {
      stageIndex++;
    }
  }, 45);
}

function updateUploadProgressUI(percent, stageText) {
  const p = Math.min(100, Math.max(0, percent));
  if (elements.uploadProgressPercent) {
    elements.uploadProgressPercent.textContent = `${p}%`;
  }
  if (elements.uploadProgressRingFill) {
    // Circunferencia de r=50 es 2*PI*50 = 314.16
    const offset = 314.16 - (314.16 * p / 100);
    elements.uploadProgressRingFill.style.strokeDashoffset = offset;
  }
  if (elements.uploadLinearProgressFill) {
    elements.uploadLinearProgressFill.style.width = `${p}%`;
  }
  if (stageText && elements.uploadLoadingStage) {
    elements.uploadLoadingStage.textContent = stageText;
  }
}

async function finishUploadProgress(successText = '¡Documento listo!') {
  if (uploadProgressInterval) {
    clearInterval(uploadProgressInterval);
    uploadProgressInterval = null;
  }

  // Animación al 100%
  updateUploadProgressUI(100, successText);

  // Pausa perceptible de 320ms para confirmar visualmente el 100%
  await new Promise(resolve => setTimeout(resolve, 320));

  if (elements.uploadProgressModal) {
    elements.uploadProgressModal.classList.add('hidden');
  }
}

function hideUploadProgress() {
  if (uploadProgressInterval) {
    clearInterval(uploadProgressInterval);
    uploadProgressInterval = null;
  }
  if (elements.uploadProgressModal) {
    elements.uploadProgressModal.classList.add('hidden');
  }
}

let printStageTimer = null;

function showPrintProgress(options = {}) {
  if (!elements.printProgressModal) return;

  const {
    title = 'Enviando a la impresora...',
    stage = 'Conectando con Epson EcoTank L3560...',
    isDuplex = false
  } = options;

  // Resumen del trabajo actual
  if (elements.printJobSummaryText) {
    if (state.currentQuote) {
      const q = state.currentQuote;
      const copiesStr = q.copies === 1 ? '1 copia' : `${q.copies} copias`;
      const colorStr = q.isColor ? 'Color' : 'B&N';
      const duplexStr = q.isDuplex ? 'Doble faz' : 'Simple';
      const count = (state.selectedPages && state.selectedPages.length > 0)
        ? state.selectedPages.length
        : (state.loadedFile ? state.loadedFile.pageCount : 1);
      const pagesStr = `${count} ${count === 1 ? 'pág' : 'págs'}`;
      elements.printJobSummaryText.textContent = `${pagesStr} • ${copiesStr} • ${colorStr} • ${duplexStr}`;
    } else {
      elements.printJobSummaryText.textContent = 'Enviando trabajo a la cola de impresión...';
    }
  }

  if (elements.printLoadingTitle) elements.printLoadingTitle.textContent = title;
  if (elements.printLoadingStage) elements.printLoadingStage.textContent = stage;

  // Restaurar estado visual normal
  if (elements.printerAnimWrap) elements.printerAnimWrap.classList.remove('hidden');
  if (elements.printSuccessWrap) elements.printSuccessWrap.classList.add('hidden');
  if (elements.printShimmerBar) elements.printShimmerBar.classList.remove('hidden');

  elements.printProgressModal.classList.remove('hidden');

  if (printStageTimer) clearInterval(printStageTimer);
  let step = 0;
  const printMessages = isDuplex
    ? [
        'Enviando páginas pares a Epson L3560...',
        'Spooler de Windows procesando cara trasera...',
        'Alimentando papel desde la bandeja posterior...'
      ]
    : [
        'Conectando con Epson EcoTank L3560...',
        'Generando trabajo en cola de Windows...',
        'Enviando datos al spooler del sistema...',
        'Esperando respuesta de la impresora...'
      ];

  printStageTimer = setInterval(() => {
    step++;
    if (elements.printLoadingStage && step < printMessages.length) {
      elements.printLoadingStage.textContent = printMessages[step];
    }
  }, 950);
}

async function finishPrintProgressSuccess(message = '¡Impresión enviada con éxito!') {
  if (printStageTimer) {
    clearInterval(printStageTimer);
    printStageTimer = null;
  }

  if (elements.printLoadingTitle) elements.printLoadingTitle.textContent = '¡Trabajo enviado!';
  if (elements.printLoadingStage) elements.printLoadingStage.textContent = message;

  if (elements.printerAnimWrap) elements.printerAnimWrap.classList.add('hidden');
  if (elements.printSuccessWrap) elements.printSuccessWrap.classList.remove('hidden');
  if (elements.printShimmerBar) elements.printShimmerBar.classList.add('hidden');

  // Permitir que el usuario aprecie el visto de éxito por 750ms
  await new Promise(resolve => setTimeout(resolve, 750));

  if (elements.printProgressModal) {
    elements.printProgressModal.classList.add('hidden');
  }
}

function hidePrintProgress() {
  if (printStageTimer) {
    clearInterval(printStageTimer);
    printStageTimer = null;
  }
  if (elements.printProgressModal) {
    elements.printProgressModal.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// SUBIDA Y ANÁLISIS DE ARCHIVOS (1 O MÚLTIPLES ARCHIVOS)
// -------------------------------------------------------------
function isAllImages(files) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.gif'];
  return files.every(f => {
    const ext = (f.name || '').substring((f.name || '').lastIndexOf('.')).toLowerCase();
    return imageExts.includes(ext) || (f.type && f.type.startsWith('image/'));
  });
}

async function handleFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    const files = Array.from(e.target.files);
    state.currentPhotoFiles = isAllImages(files) ? files : [];
    await uploadFiles(files);
    e.target.value = '';
  }
}

async function handleCameraSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    const files = Array.from(e.target.files);
    state.currentPhotoFiles = files;
    await uploadFiles(files);
    e.target.value = '';
  }
}

async function handleAddPhotosSelected(e) {
  if (e.target.files && e.target.files.length > 0) {
    const newFiles = Array.from(e.target.files);
    if (!state.currentPhotoFiles || state.currentPhotoFiles.length === 0) {
      state.currentPhotoFiles = [];
    }
    state.currentPhotoFiles.push(...newFiles);
    showInlineNotice(`Agregando ${newFiles.length === 1 ? '1 foto más' : `${newFiles.length} fotos más`}... (${state.currentPhotoFiles.length} en total)`, 'info');
    await uploadFiles(state.currentPhotoFiles);
    e.target.value = '';
  }
}

async function compressImageIfNeeded(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  if (file.size < 500 * 1024 && !file.type.includes('heic')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1920;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const cleanName = (file.name || 'foto').replace(/\.[^.]+$/, '.jpg');
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

async function uploadFiles(filesInput) {
  const files = Array.from(filesInput);
  if (files.length === 0) return;

  triggerHaptic('tap');
  const isMultiple = files.length > 1;
  const initialName = isMultiple ? `${files.length} fotos` : (files[0].name || 'Documento');

  // Mostrar pantalla de carga bloqueante con porcentaje animado
  showUploadProgress(initialName, files.length);

  showInlineNotice(isMultiple ? `Preparando ${files.length} fotos...` : 'Analizando documento...', 'info');
  elements.priceAmount.textContent = '...';
  elements.priceDetails.textContent = 'Contando páginas...';

  // Optimizar fotos en el cliente para subidas livianas y veloces por túnel
  const preparedFiles = [];
  for (const f of files) {
    if (f.type && f.type.startsWith('image/')) {
      const optimized = await compressImageIfNeeded(f);
      preparedFiles.push(optimized);
    } else {
      preparedFiles.push(f);
    }
  }

  const formData = new FormData();
  preparedFiles.forEach(f => formData.append('documento', f));

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

    // Resetear instancia para que la próxima visualización cargue el PDF fresco
    pdfDocInstance = null;

    // Si todas las entradas son imágenes, mantener la lista en memoria
    if (isAllImages(files) || data.isImage) {
      state.currentPhotoFiles = files;
    }

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

    // Botón de visualización SIEMPRE visible (incluso con 1 sola hoja o 1 sola foto)
    elements.btnOpenPageSelector.classList.remove('hidden');
    if (pageCount === 1) {
      if (elements.btnPageSelectorLabel) {
        elements.btnPageSelectorLabel.textContent = data.isImage ? 'Ver foto' : 'Ver documento';
      }
      elements.btnOpenPageSelector.title = data.isImage ? 'Abrir y ver la foto en pantalla completa' : 'Abrir y ver la hoja en pantalla completa';
    } else {
      if (elements.btnPageSelectorLabel) {
        elements.btnPageSelectorLabel.textContent = 'Ver / Elegir páginas';
      }
      elements.btnOpenPageSelector.title = 'Ver miniaturas y elegir páginas';
    }

    // Botón para agregar otra foto (visible si el archivo actual es foto)
    if (data.isImage && elements.btnAddPhoto) {
      elements.btnAddPhoto.classList.remove('hidden');
    } else if (elements.btnAddPhoto) {
      elements.btnAddPhoto.classList.add('hidden');
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
    elements.btnCancelJob.classList.remove('hidden');

    await updateQuote();
    triggerHaptic('select');

    // Finalizar animación al 100% y desbloquear pantalla
    await finishUploadProgress(data.isImage ? (isMultiple ? '¡Fotos listas!' : '¡Foto lista!') : '¡Documento listo!');
    showInlineNotice(`¡Listo! ${pageCount} ${pageCount === 1 ? 'página detectada' : 'páginas detectadas'}`, 'success');
  } catch (err) {
    hideUploadProgress();
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

function formatDisplayPrice(val) {
  const n = Number(val);
  if (isNaN(n) || n === 0) return '0';
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(2)).toString();
}

async function updateQuote() {
  if (!state.loadedFile) return;

  const actualPages = Array.isArray(state.selectedPages)
    ? state.selectedPages.length
    : (state.loadedFile.pageCount || 1);

  if (actualPages === 0) {
    state.currentQuote = {
      pages: 0,
      physicalSheets: 0,
      sheetsPerCopy: 0,
      copies: state.copies || 1,
      isColor: state.isColor,
      isDuplex: false,
      totalPrice: 0,
      breakdown: {
        tipo: 'Ninguna página',
        paginasPorJuego: 0,
        hojasFisicasPorJuego: 0,
        copias: state.copies || 1,
        hojasFisicasTotales: 0,
        precioPorJuego: 0,
        total: 0
      }
    };
    elements.priceAmount.textContent = '0';
    elements.priceDetails.textContent = '0 páginas seleccionadas (marcá al menos 1 para imprimir)';
    elements.btnApprovePrint.classList.add('is-idle');
    return;
  }

  elements.btnApprovePrint.classList.remove('is-idle');

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

    elements.priceAmount.textContent = formatDisplayPrice(quote.totalPrice);
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
  if (elements.btnAddPhoto) elements.btnAddPhoto.classList.add('hidden');
  if (elements.pagesGrid) {
    elements.pagesGrid.dataset.cachedFileId = '';
    elements.pagesGrid.innerHTML = '';
  }
  pdfDocInstance = null;
  state.currentPhotoFiles = [];
  if (elements.docInput) elements.docInput.value = '';
  if (elements.galleryInput) elements.galleryInput.value = '';
  if (elements.cameraInput) elements.cameraInput.value = '';
  if (elements.allFilesInput) elements.allFilesInput.value = '';
  if (elements.addCameraInput) elements.addCameraInput.value = '';
  if (elements.addGalleryInput) elements.addGalleryInput.value = '';
  elements.fileTypeBadge.className = 'file-type-pill';
  elements.fileTypeBadge.textContent = 'PDF';

  elements.dropZone.classList.remove('hidden');
  elements.fileLoadedInfo.classList.add('hidden');

  elements.priceAmount.textContent = '0';
  elements.priceDetails.textContent = 'Cargue un archivo para cotizar';
  
  elements.btnApprovePrint.classList.add('is-idle');
  elements.btnCancelJob.classList.add('is-idle');
  elements.btnCancelJob.classList.add('hidden');
  elements.btnDuplex.classList.remove('disabled-hint');

  if (elements.confirmCancelModal) {
    elements.confirmCancelModal.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// CANCELACIÓN DE IMPRESIÓN CON DOBLE CONFIRMACIÓN
// -------------------------------------------------------------
let pendingCancelContext = null;

function promptCancelConfirmation(context = 'main') {
  pendingCancelContext = context;
  triggerHaptic('warning');

  if (elements.confirmCancelTitle && elements.confirmCancelDesc) {
    if (context === 'duplex') {
      elements.confirmCancelTitle.textContent = '¿Cancelar impresión doble faz?';
      elements.confirmCancelDesc.textContent = 'Ya salieron las páginas impares. Si cancelás ahora, el trabajo quedará anulado y no se imprimirán las páginas pares restantes.';
    } else if (context === 'printing') {
      elements.confirmCancelTitle.textContent = '¿Detener el envío a la impresora?';
      elements.confirmCancelDesc.textContent = 'Se interrumpirá el envío de datos al equipo Epson y se descartará el trabajo actual.';
    } else {
      elements.confirmCancelTitle.textContent = '¿Cancelar la impresión?';
      elements.confirmCancelDesc.textContent = 'Se descartará el documento cargado y se cancelará la orden de impresión actual.';
    }
  }

  if (elements.confirmCancelModal) {
    elements.confirmCancelModal.classList.remove('hidden');
  }
}

function abortCancel() {
  triggerHaptic('tap');
  if (elements.confirmCancelModal) {
    elements.confirmCancelModal.classList.add('hidden');
  }
  pendingCancelContext = null;
}

async function executeCancel() {
  triggerHaptic('warning');

  if (elements.confirmCancelModal) {
    elements.confirmCancelModal.classList.add('hidden');
  }

  // Notificar al backend si hay trabajo activo en cola
  if (state.activeJobId) {
    try {
      await fetch(`/api/jobs/${state.activeJobId}/cancel`, { method: 'POST' });
    } catch (e) {
      console.warn('No se pudo cancelar en backend:', e);
    }
  }

  // Ocultar modales si estaban abiertos
  if (elements.duplexModal) elements.duplexModal.classList.add('hidden');
  hidePrintProgress();

  resetCurrentJob();
  showInlineNotice('Impresión cancelada', 'warning');
  await fetchRecentJobs(true);
  pendingCancelContext = null;
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

  if (Array.isArray(state.selectedPages) && state.selectedPages.length === 0) {
    triggerHaptic('warning');
    showInlineNotice('No hay ninguna página seleccionada para imprimir', 'warning');
    return;
  }

  triggerHaptic('select');
  elements.btnApprovePrint.disabled = true;
  elements.btnCancelJob.disabled = true;
  elements.printSpinner.classList.remove('hidden');
  elements.btnApprovePrintText.textContent = 'ENVIANDO...';

  // Mostrar pantalla de carga bloqueante para el envío a la impresora
  showPrintProgress({
    title: 'Enviando a la impresora...',
    stage: 'Conectando con Epson EcoTank L3560...'
  });

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
      hidePrintProgress();
      triggerHaptic('duplex');
      elements.duplexModal.classList.remove('hidden');
    } else if (job.status === 'completed') {
      triggerHaptic('success');
      await finishPrintProgressSuccess('¡Impresión enviada a la Epson L3560!');
      showInlineNotice('¡Impresión enviada con éxito!', 'success');
      resetCurrentJob();
      await fetchRecentJobs();
    } else {
      hidePrintProgress();
      showInlineNotice(`Estado: ${job.status}`, 'info');
      resetCurrentJob();
      await fetchRecentJobs();
    }
  } catch (err) {
    hidePrintProgress();
    console.error('Error impresión:', err);
    triggerHaptic('warning');
    showInlineNotice(err.message || 'Error al imprimir', 'error');
  } finally {
    hidePrintProgress();
    elements.btnApprovePrint.disabled = false;
    elements.btnCancelJob.disabled = false;
    elements.printSpinner.classList.add('hidden');
    elements.btnApprovePrintText.textContent = 'COBRAR E IMPRIMIR';
  }
}

async function handleConfirmDuplex() {
  if (!state.activeJobId) return;

  triggerHaptic('tap');
  elements.duplexModal.classList.add('hidden');
  elements.btnConfirmDuplex.disabled = true;
  elements.duplexSpinner.classList.remove('hidden');

  // Mostrar pantalla bloqueante mientras imprime la segunda cara
  showPrintProgress({
    title: 'Imprimiendo páginas pares...',
    stage: 'Enviando segunda cara a Epson L3560...',
    isDuplex: true
  });

  try {
    const res = await fetch(`/api/jobs/${state.activeJobId}/continue-duplex`, {
      method: 'POST'
    });
    const data = await res.json();

    if (data.success && data.job.status === 'completed') {
      triggerHaptic('success');
      await finishPrintProgressSuccess('¡Doble faz finalizado con éxito!');
      showInlineNotice('¡Doble faz finalizado correctamente!', 'success');
      resetCurrentJob();
      await fetchRecentJobs();
    } else {
      hidePrintProgress();
      showInlineNotice('Hubo un inconveniente al imprimir pares', 'error');
    }
  } catch (err) {
    hidePrintProgress();
    console.error('Error continuar doble faz:', err);
    triggerHaptic('warning');
    showInlineNotice(err.message || 'Error de impresión', 'error');
  } finally {
    hidePrintProgress();
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

  const inputBwSimplex = elements.inputBwSimplex || document.getElementById('inputBwSimplex');
  const inputBwDuplex = elements.inputBwDuplex || document.getElementById('inputBwDuplex');
  const inputColorSimplex = elements.inputColorSimplex || document.getElementById('inputColorSimplex');
  const inputColorDuplex = elements.inputColorDuplex || document.getElementById('inputColorDuplex');
  const selectPrinter = elements.selectPrinter || document.getElementById('selectPrinter');

  const bw_simplex = parseFloat(inputBwSimplex ? inputBwSimplex.value : NaN);
  const bw_duplex = parseFloat(inputBwDuplex ? inputBwDuplex.value : NaN);
  const color_simplex = parseFloat(inputColorSimplex ? inputColorSimplex.value : NaN);
  const color_duplex = parseFloat(inputColorDuplex ? inputColorDuplex.value : NaN);
  const printerName = selectPrinter ? selectPrinter.value : undefined;

  if (isNaN(bw_simplex) || bw_simplex < 0 ||
      isNaN(bw_duplex) || bw_duplex < 0 ||
      isNaN(color_simplex) || color_simplex < 0 ||
      isNaN(color_duplex) || color_duplex < 0) {
    triggerHaptic('warning');
    showInlineNotice('Los precios deben ser números mayores o iguales a 0', 'error');
    return;
  }

  try {
    const payload = { bw_simplex, bw_duplex, color_simplex, color_duplex };
    if (printerName) payload.printerName = printerName;

    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al guardar');
    }

    const data = await res.json();
    state.config = data.config;
    if (elements.settingsModal) elements.settingsModal.classList.add('hidden');
    triggerHaptic('select');
    showInlineNotice('Configuración guardada correctamente', 'success');

    if (state.loadedFile) {
      await updateQuote();
    }
  } catch (err) {
    console.error('Error al guardar:', err);
    triggerHaptic('warning');
    showInlineNotice(err.message || 'No se pudieron guardar las tarifas', 'error');
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

async function ensurePdfDoc() {
  if (pdfDocInstance) return pdfDocInstance;
  if (!state.pdfArrayBuffer) {
    if (state.loadedFile && state.loadedFile.pdfUrl) {
      const pdfRes = await fetch(state.loadedFile.pdfUrl);
      state.pdfArrayBuffer = await pdfRes.arrayBuffer();
    } else {
      throw new Error('No hay buffer de archivo disponible.');
    }
  }
  if (!window.pdfjsLib) {
    throw new Error('Librería PDF.js no disponible.');
  }
  const loadingTask = pdfjsLib.getDocument({ data: state.pdfArrayBuffer.slice(0) });
  pdfDocInstance = await loadingTask.promise;
  return pdfDocInstance;
}

async function openPageSelector() {
  if (!state.loadedFile) {
    showInlineNotice('No hay ningún archivo cargado', 'error');
    return;
  }

  const totalPages = state.loadedFile.pageCount || 1;
  modalTempSelectedPages = new Set(
    Array.isArray(state.selectedPages)
      ? state.selectedPages
      : Array.from({ length: totalPages }, (_, i) => i + 1)
  );

  updateModalCounter();

  // Si ya están cacheadas las miniaturas para este mismo archivo, abrir instantáneamente sin re-renderizar
  const currentFileId = state.loadedFile.fileId || state.loadedFile.pdfPath || '';
  if (currentFileId && elements.pagesGrid.dataset.cachedFileId === currentFileId) {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const card = document.getElementById(`thumb-page-${pageNum}`);
      if (card) {
        card.classList.toggle('is-excluded', !modalTempSelectedPages.has(pageNum));
        const statusPill = card.querySelector('.page-status-pill');
        if (statusPill) {
          statusPill.textContent = modalTempSelectedPages.has(pageNum) ? '✓ Lista' : '✕ Excluida';
        }
      }
    }
    elements.pageSelectorModal.classList.remove('hidden');
    return;
  }

  elements.pageSelectorModal.classList.remove('hidden');
  elements.pagesGrid.innerHTML = `
    <div class="loading-pages">
      <span class="spinner" style="border-top-color: var(--color-blue); border-color: #cbd5e1;"></span>
      <p>Generando vista previa de las hojas...</p>
    </div>
  `;

  try {
    const pdf = await ensurePdfDoc();
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

    // Si es imagen, añadir tarjeta al final para sumar otra foto
    if (state.loadedFile && state.loadedFile.isImage) {
      const addCard = document.createElement('div');
      addCard.className = 'page-thumb-card add-more-card';
      addCard.innerHTML = `
        <div class="add-thumb-inner">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <strong>+ Otra foto</strong>
          <span>Cámara o Galería</span>
        </div>
      `;
      addCard.addEventListener('click', () => {
        triggerHaptic('tap');
        elements.pageSelectorModal.classList.add('hidden');
        if (elements.addGalleryInput) elements.addGalleryInput.click();
      });
      elements.pagesGrid.appendChild(addCard);
    }

    elements.pagesGrid.dataset.cachedFileId = currentFileId;
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
  try {
    await ensurePdfDoc();
  } catch (err) {
    console.error(err);
    showInlineNotice('No se puede cargar la vista previa', 'error');
    return;
  }

  const totalPages = pdfDocInstance ? pdfDocInstance.numPages : 1;
  if (!modalTempSelectedPages) {
    modalTempSelectedPages = new Set(
      Array.isArray(state.selectedPages)
        ? state.selectedPages
        : Array.from({ length: totalPages }, (_, i) => i + 1)
    );
  }

  currentDetailPage = pageNum;
  elements.pageDetailModal.classList.remove('hidden');
  await renderDetailPage(currentDetailPage);
}

async function renderDetailPage(pageNum) {
  if (!pdfDocInstance || isRenderingDetail) return;
  isRenderingDetail = true;

  const totalPages = pdfDocInstance.numPages;
  if (totalPages <= 1) {
    elements.pageDetailTitle.textContent = state.loadedFile?.isImage ? 'Vista previa (Foto A4)' : 'Vista previa (Hoja A4)';
    elements.detailIndicator.textContent = '1 de 1';
    elements.btnDetailPrev.classList.add('hidden');
    elements.btnDetailNext.classList.add('hidden');
    elements.btnToggleDetailSelection.classList.add('hidden');
  } else {
    elements.pageDetailTitle.textContent = `Página ${pageNum} de ${totalPages}`;
    elements.detailIndicator.textContent = `${pageNum} / ${totalPages}`;
    elements.btnDetailPrev.classList.remove('hidden');
    elements.btnDetailNext.classList.remove('hidden');
    elements.btnToggleDetailSelection.classList.remove('hidden');

    elements.btnDetailPrev.disabled = (pageNum <= 1);
    elements.btnDetailNext.disabled = (pageNum >= totalPages);

    const isSelected = modalTempSelectedPages.has(pageNum);
    elements.btnToggleDetailSelection.className = `btn-detail-toggle ${isSelected ? 'is-included' : 'is-excluded'}`;
    elements.detailToggleIcon.textContent = isSelected ? '✓' : '✕';
    elements.detailToggleText.textContent = isSelected ? 'Incluida' : 'Excluida';
  }

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
  if (count === 0) {
    elements.selectedPagesCountBadge.textContent = '0 págs (ninguna)';
  } else {
    elements.selectedPagesCountBadge.textContent = `${count} ${count === 1 ? 'pág' : 'págs'} elegidas`;
  }
  elements.btnApplyCount.textContent = count;
}

function applyPageSelection() {
  triggerHaptic('select');
  state.selectedPages = Array.from(modalTempSelectedPages).sort((a, b) => a - b);
  elements.pageSelectorModal.classList.add('hidden');

  const totalOriginal = state.loadedFile.pageCount || 1;
  const selectedCount = state.selectedPages.length;

  if (selectedCount === 0) {
    elements.filePages.textContent = `0 de ${totalOriginal} págs (ninguna)`;
    showInlineNotice('No marcaste ninguna página. El total a pagar es $0', 'info');
  } else if (selectedCount < totalOriginal) {
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

// -------------------------------------------------------------
// RECEPCIÓN DE ARCHIVOS COMPARTIDOS DESDE WHATSAPP / GALERÍA (ANDROID SHARE INTENT)
// -------------------------------------------------------------
function base64ToFile(base64Str, fileName, mimeType) {
  const binaryString = atob(base64Str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new File([bytes], fileName, {
    type: mimeType || 'application/octet-stream',
    lastModified: Date.now()
  });
}

let isProcessingSharedFiles = false;

window.checkPendingSharedFiles = async function() {
  if (isProcessingSharedFiles) return;
  if (!window.KioscoNativeApp || typeof window.KioscoNativeApp.getSharedFilesCount !== 'function') {
    return;
  }

  try {
    const count = window.KioscoNativeApp.getSharedFilesCount();
    if (!count || count <= 0) return;

    isProcessingSharedFiles = true;

    const files = [];
    for (let i = 0; i < count; i++) {
      const name = window.KioscoNativeApp.getSharedFileName(i);
      const mime = window.KioscoNativeApp.getSharedFileMime(i);
      const b64 = window.KioscoNativeApp.getSharedFileBase64(i);
      if (b64 && b64.length > 0) {
        const fileObj = base64ToFile(b64, name || `archivo_${i + 1}`, mime);
        files.push(fileObj);
      }
    }

    if (typeof window.KioscoNativeApp.clearSharedFiles === 'function') {
      window.KioscoNativeApp.clearSharedFiles();
    }

    if (files.length > 0) {
      resetCurrentJob();
      showInlineNotice(
        files.length === 1
          ? `Cargando archivo compartido: ${files[0].name}`
          : `Cargando ${files.length} fotos compartidas...`,
        'info',
        3500
      );
      await uploadFiles(files);
    }
  } catch (err) {
    console.error('Error procesando archivos compartidos de Android:', err);
    showInlineNotice('Error al cargar archivo compartido', 'error');
  } finally {
    isProcessingSharedFiles = false;
  }
};

