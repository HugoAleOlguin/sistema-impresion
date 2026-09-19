const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { DATA_DIR } = require('../config');
const TUNNEL_CONFIG_FILE = path.join(DATA_DIR, 'tunnel_config.json');

// Rutas posibles de cloudflared.exe
const CF_LOCATIONS = [
  path.join(__dirname, '..', '..', 'cloudflared.exe'),
  path.join(__dirname, '..', 'bin', 'cloudflared.exe'),
  path.join(__dirname, '..', '..', 'sistema-impresion', 'cloudflared.exe'),
  'cloudflared.exe'
];

let activeTunnelProcess = null;
let currentTunnelUrl = null;
let tunnelStatus = 'offline'; // offline | starting | online | error

function loadTunnelConfig() {
  try {
    if (fs.existsSync(TUNNEL_CONFIG_FILE)) {
      const raw = fs.readFileSync(TUNNEL_CONFIG_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Tunnel] Error al leer tunnel_config.json:', err.message);
  }

  // Fallback seguro leyendo la configuración vinculada de la app
  const appConfigPath = path.join(__dirname, '..', '..', 'android', 'app_config.json');
  let fallbackGistId = 'b54b662325e0b7066773fc7debc574b6';
  let fallbackSecret = 'eltato_1cfb4fdb4212d591808c821f88c6d2a4';
  if (fs.existsSync(appConfigPath)) {
    try {
      const appCfg = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
      if (appCfg.gistId) fallbackGistId = appCfg.gistId;
      if (appCfg.kioscoSecret) fallbackSecret = appCfg.kioscoSecret;
    } catch {}
  }

  return {
    githubToken: process.env.GITHUB_TOKEN || '',
    gistId: fallbackGistId,
    kioscoSecret: fallbackSecret,
    autoStartTunnel: true,
    lastUrl: '',
    lastUpdated: null
  };
}

function saveTunnelConfig(newConfig) {
  const current = loadTunnelConfig();
  const merged = { ...current, ...newConfig };
  fs.writeFileSync(TUNNEL_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function generateKioscoSecret() {
  return 'eltato_' + crypto.randomBytes(16).toString('hex');
}

function findCloudflaredExecutable() {
  for (const loc of CF_LOCATIONS) {
    if (fs.existsSync(loc)) return loc;
  }
  
  // Si no existe, descargar automáticamente con curl nativo de Windows
  const targetPath = path.join(__dirname, '..', '..', 'cloudflared.exe');
  console.log('[Tunnel] Descargando cloudflared.exe automáticamente para Windows...');
  try {
    const { execFileSync } = require('child_process');
    execFileSync('curl.exe', ['-L', '-s', '-o', targetPath, 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'], { timeout: 60000 });
    if (fs.existsSync(targetPath)) {
      console.log('[Tunnel] cloudflared.exe descargado exitosamente en:', targetPath);
      return targetPath;
    }
  } catch (err) {
    console.error('[Tunnel] No se pudo auto-descargar cloudflared.exe:', err.message);
  }

  return 'cloudflared.exe';
}

// -------------------------------------------------------------
// COMUNICACIÓN CON GITHUB API (GISTS)
// -------------------------------------------------------------

async function verifyGitHubToken(token) {
  if (!token) return { success: false, error: 'Token no proporcionado' };
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'User-Agent': 'Kiosco-ElTato-Sync',
        'Accept': 'application/vnd.github+json'
      }
    });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `GitHub API error (${res.status}): ${body}` };
    }
    const data = await res.json();
    return { success: true, username: data.login, name: data.name || data.login };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function createSecretGist(token, description = 'Kiosco El Tato - Enlace Dinamico de Impresion') {
  if (!token) throw new Error('Se requiere un token de GitHub con permiso "gist"');

  const payload = {
    description,
    public: false, // Gist secreto (no listado públicamente en búsquedas)
    files: {
      'kiosco_tunnel.json': {
        content: JSON.stringify({
          status: 'initialized',
          url: '',
          updatedAt: new Date().toISOString()
        }, null, 2)
      }
    }
  };

  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'User-Agent': 'Kiosco-ElTato-Sync',
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al crear Gist (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    gistId: data.id,
    gistUrl: data.html_url,
    rawUrl: data.files['kiosco_tunnel.json']?.raw_url || ''
  };
}

async function updateGistUrl(token, gistId, url, status = 'online') {
  if (!token || !gistId) {
    console.warn('[Tunnel] GitHub Token o GistId faltantes. Sincronización omitida.');
    return false;
  }

  const os = require('os');
  let lanIp = '192.168.100.193';
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
            lanIp = iface.address;
            break;
          }
        }
      }
    }
  } catch {}

  const payload = {
    description: 'Kiosco El Tato - Enlace Dinamico de Impresion',
    files: {
      'kiosco_tunnel.json': {
        content: JSON.stringify({
          status,
          url: url || '',
          lanIp,
          localPort: 3000,
          updatedAt: new Date().toISOString()
        }, null, 2)
      }
    }
  };

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'User-Agent': 'Kiosco-ElTato-Sync',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Tunnel] Error actualizando Gist (${res.status}):`, errText);
      return false;
    }

    console.log(`[Tunnel] GitHub Gist sincronizado exitosamente: [${status.toUpperCase()}] -> ${url || '(offline)'}`);
    return true;
  } catch (err) {
    console.error('[Tunnel] Error de red al actualizar Gist:', err.message);
    return false;
  }
}

async function fetchCurrentGist(gistId, token = null) {
  if (!gistId) throw new Error('gistId es requerido');
  const headers = {
    'User-Agent': 'Kiosco-ElTato-Sync',
    'Accept': 'application/vnd.github+json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const res = await fetch(`https://api.github.com/gists/${gistId}?t=${Date.now()}`, { headers });
  if (!res.ok) {
    throw new Error(`Error al leer Gist (${res.status})`);
  }
  const data = await res.json();
  const file = data.files['kiosco_tunnel.json'];
  if (!file) throw new Error('El Gist no contiene el archivo kiosco_tunnel.json');
  return JSON.parse(file.content);
}

// -------------------------------------------------------------
// CONTROLADOR DEL TÚNEL CLOUDFLARED
// -------------------------------------------------------------

function startTunnel({ localPort = 3000, onUrl = null, onError = null, onClose = null } = {}) {
  if (activeTunnelProcess) {
    console.log('[Tunnel] El proceso de túnel ya se encuentra en ejecución.');
    return { process: activeTunnelProcess, url: currentTunnelUrl };
  }

  const cfExe = findCloudflaredExecutable();
  if (!fs.existsSync(cfExe)) {
    const msg = `No se encontró el ejecutable de cloudflared en: ${cfExe}`;
    console.error(`[Tunnel] ${msg}`);
    if (onError) onError(new Error(msg));
    return null;
  }

  tunnelStatus = 'starting';
  console.log(`[Tunnel] Iniciando túnel Cloudflare hacia http://127.0.0.1:${localPort}...`);

  const args = ['tunnel', '--url', `http://127.0.0.1:${localPort}`];
  const proc = spawn(cfExe, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  activeTunnelProcess = proc;

  const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

  const handleStreamData = async (data) => {
    const text = data.toString();
    const match = text.match(urlRegex);
    if (match && match[0]) {
      const newUrl = match[0];
      if (newUrl !== currentTunnelUrl) {
        currentTunnelUrl = newUrl;
        tunnelStatus = 'online';
        console.log(`[Tunnel] NUEVA URL ASIGNADA: ${currentTunnelUrl}`);

        const cfg = loadTunnelConfig();
        saveTunnelConfig({
          lastUrl: currentTunnelUrl,
          lastUpdated: new Date().toISOString()
        });

        if (cfg.githubToken && cfg.gistId) {
          await updateGistUrl(cfg.githubToken, cfg.gistId, currentTunnelUrl, 'online');
        }

        if (onUrl) onUrl(currentTunnelUrl);
      }
    }
  };

  proc.stdout.on('data', handleStreamData);
  proc.stderr.on('data', handleStreamData);

  proc.on('error', (err) => {
    console.error('[Tunnel] Error en proceso cloudflared:', err.message);
    tunnelStatus = 'error';
    if (onError) onError(err);
  });

  proc.on('close', async (code) => {
    console.log(`[Tunnel] Proceso cloudflared finalizado con código ${code}`);
    activeTunnelProcess = null;
    currentTunnelUrl = null;
    tunnelStatus = 'offline';

    const cfg = loadTunnelConfig();
    if (cfg.githubToken && cfg.gistId) {
      await updateGistUrl(cfg.githubToken, cfg.gistId, '', 'offline');
    }

    if (onClose) onClose(code);
  });

  return { process: proc };
}

function stopTunnel() {
  if (activeTunnelProcess) {
    console.log('[Tunnel] Deteniendo túnel Cloudflare...');
    try {
      activeTunnelProcess.kill('SIGTERM');
    } catch {}
    activeTunnelProcess = null;
  }
  currentTunnelUrl = null;
  tunnelStatus = 'offline';
}

function getTunnelStatus() {
  const cfg = loadTunnelConfig();
  return {
    status: tunnelStatus,
    currentUrl: currentTunnelUrl,
    lastUrl: cfg.lastUrl || null,
    lastUpdated: cfg.lastUpdated || null,
    hasGitHubConfigured: Boolean(cfg.githubToken && cfg.gistId),
    gistId: cfg.gistId || null,
    kioscoSecretConfigured: Boolean(cfg.kioscoSecret),
    autoStartTunnel: Boolean(cfg.autoStartTunnel)
  };
}

module.exports = {
  loadTunnelConfig,
  saveTunnelConfig,
  generateKioscoSecret,
  verifyGitHubToken,
  createSecretGist,
  updateGistUrl,
  fetchCurrentGist,
  startTunnel,
  stopTunnel,
  getTunnelStatus
};
