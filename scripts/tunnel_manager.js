const path = require('path');
const fs = require('fs');
const {
  loadTunnelConfig,
  startTunnel,
  stopTunnel,
  getTunnelStatus,
  updateGistUrl
} = require('../server/services/tunnelService');

const PORT = process.env.PORT || 3000;

console.log('\n=============================================================');
console.log('       GESTOR DE TÚNEL Y SINCRONIZACIÓN - KIOSCO EL TATO     ');
console.log('=============================================================\n');

const cfg = loadTunnelConfig();

if (!cfg.githubToken || !cfg.gistId) {
  console.log('[!] AVISO: No se ha configurado la sincronización con GitHub aún.');
  console.log('    Para que el teléfono se conecte desde datos móviles automáticamente,');
  console.log('    ejecuta primero: configurar_github.bat\n');
} else {
  console.log(`[i] Sincronización GitHub: ACTIVA (Gist ID: ${cfg.gistId})`);
  console.log(`[i] Clave de protección:   ${cfg.kioscoSecret ? 'CONFIGURADA' : 'NO DEFINIDA'}\n`);
}

// Iniciar túnel
const tunnelInstance = startTunnel({
  localPort: PORT,
  onUrl: (url) => {
    console.log('\n=============================================================');
    console.log('                 TÚNEL CONECTADO Y SEGURO                    ');
    console.log('=============================================================');
    console.log(`\n  URL PÚBLICA ACTIVA:`);
    console.log(`  --> ${url} <---`);
    if (cfg.kioscoSecret) {
      console.log(`\n  Enlace de acceso directo con credencial (Navegador):`);
      console.log(`  --> ${url}/?token=${cfg.kioscoSecret}`);
    }
    console.log('\n  Estado de sincronización:');
    if (cfg.githubToken && cfg.gistId) {
      console.log('  [✓] Gist de GitHub actualizado en tiempo real.');
      console.log('  [✓] Tu APK Android ya conoce esta nueva dirección.');
    } else {
      console.log('  [!] GitHub no configurado. Debes copiar la URL a mano.');
    }
    console.log('\n  Mantén esta ventana abierta mientras uses la conexión remota.');
    console.log('  Presiona Ctrl + C para detener el túnel en cualquier momento.');
    console.log('=============================================================\n');
  },
  onError: (err) => {
    console.error(`\n[!] Error en el túnel: ${err.message}`);
  },
  onClose: (code) => {
    console.log(`\n[i] Túnel cerrado.`);
    process.exit(code || 0);
  }
});

// Limpieza al salir
function cleanup() {
  console.log('\nCerrando túnel y notificando a GitHub...');
  if (cfg.githubToken && cfg.gistId) {
    updateGistUrl(cfg.githubToken, cfg.gistId, '', 'offline')
      .finally(() => {
        stopTunnel();
        process.exit(0);
      });
  } else {
    stopTunnel();
    process.exit(0);
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
