const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const MOCK_PRINTS_DIR = path.join(DATA_DIR, 'mock_prints');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Asegurar directorios de trabajo
[DATA_DIR, UPLOADS_DIR, MOCK_PRINTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Tarifas predeterminadas (acordadas con el usuario)
const DEFAULT_PRICES = {
  bw_simplex: 100,  // Hoja B&N simple faz
  bw_duplex: 150,   // Hoja física B&N doble faz (contiene 2 páginas)
  color_simplex: 200, // Hoja Color simple faz
  color_duplex: 250,  // Hoja física Color doble faz (contiene 2 páginas)
  format: 'A4'       // Por defecto y exclusivamente A4
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...DEFAULT_PRICES, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error al leer config.json, usando predeterminados:', err.message);
  }
  return { ...DEFAULT_PRICES };
}

function saveConfig(newConfig) {
  const merged = { ...loadConfig(), ...newConfig };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function detectEpsonPrinter() {
  if (process.env.PRINTER_NAME) return process.env.PRINTER_NAME;
  if (process.platform !== 'win32') return 'EPSON L3560 Series';
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-Printer | Select-Object -ExpandProperty Name'], { encoding: 'utf8', timeout: 3000 });
    const list = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const found = list.find(p => p.toLowerCase().includes('l3560')) || list.find(p => p.toLowerCase().includes('epson'));
    if (found) return found;
  } catch {}
  return 'EPSON L3560 Series';
}

module.exports = {
  PORT: process.env.PORT || 3000,
  PRINTER_NAME: detectEpsonPrinter(),
  MOCK_MODE: process.env.MOCK_MODE === 'true', // Por defecto FALSE (modo producción/impresora real). Pasar MOCK_MODE=true para simular.
  DATA_DIR,
  UPLOADS_DIR,
  MOCK_PRINTS_DIR,
  loadConfig,
  saveConfig
};

