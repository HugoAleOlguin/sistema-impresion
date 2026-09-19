const assert = require('assert');
const {
  loadTunnelConfig,
  saveTunnelConfig,
  generateKioscoSecret,
  getTunnelStatus
} = require('../server/services/tunnelService');
const { tunnelSecurityMiddleware } = require('../server/services/securityService');

console.log('🧪 Probando módulo de Túnel y Seguridad Cloudflare/GitHub...\n');

// 1. Probar generación de clave secreta
const secret = generateKioscoSecret();
assert(secret.startsWith('eltato_'), 'El secret debe comenzar con eltato_');
assert(secret.length >= 20, 'El secret debe tener longitud adecuada de seguridad');
console.log('✅ 1. Generación de clave secreta validada:', secret);

// 2. Probar guardado y carga de configuración
saveTunnelConfig({
  kioscoSecret: secret,
  gistId: 'test_gist_12345',
  autoStartTunnel: false
});

const cfg = loadTunnelConfig();
assert.strictEqual(cfg.kioscoSecret, secret);
assert.strictEqual(cfg.gistId, 'test_gist_12345');
console.log('✅ 2. Guardado y persistencia de configuración validada.');

// 3. Probar middleware de seguridad con diferentes orígenes de red
console.log('✅ 3. Probando Middleware de Seguridad:');

// Caso A: Petición local (Loopback / LAN) -> Debe pasar sin token
let calledNext = false;
let statusCode = null;
let jsonResponse = null;

const mockReqLocal = {
  headers: {},
  query: {},
  socket: { remoteAddress: '127.0.0.1' }
};
const mockRes = {
  status: (code) => { statusCode = code; return mockRes; },
  json: (data) => { jsonResponse = data; return mockRes; },
  setHeader: () => {}
};

tunnelSecurityMiddleware(mockReqLocal, mockRes, () => { calledNext = true; });
assert.strictEqual(calledNext, true, 'Petición local debe permitirse sin token');
console.log('   ✓ Petición local (127.0.0.1) permitida libremente.');

// Caso B: Petición desde Cloudflare sin token -> Debe retornar 403
calledNext = false;
statusCode = null;
jsonResponse = null;

const mockReqCfNoToken = {
  headers: {
    'cf-connecting-ip': '203.0.113.195',
    'host': 'my-printer.trycloudflare.com'
  },
  query: {},
  socket: { remoteAddress: '104.28.1.1' }
};

tunnelSecurityMiddleware(mockReqCfNoToken, mockRes, () => { calledNext = true; });
assert.strictEqual(calledNext, false, 'Petición externa sin token no debe continuar');
assert.strictEqual(statusCode, 403, 'Petición externa sin token debe ser 403 Forbidden');
console.log('   ✓ Petición externa de Cloudflare sin token bloqueada con 403 Forbidden.');

// Caso C: Petición desde Cloudflare con header 'X-Kiosco-Token' correcto -> Debe permitirse
calledNext = false;
statusCode = null;
const mockReqCfWithToken = {
  headers: {
    'cf-connecting-ip': '203.0.113.195',
    'host': 'my-printer.trycloudflare.com',
    'x-kiosco-token': secret
  },
  query: {},
  socket: { remoteAddress: '104.28.1.1' }
};

tunnelSecurityMiddleware(mockReqCfWithToken, mockRes, () => { calledNext = true; });
assert.strictEqual(calledNext, true, 'Petición externa con token debe permitirse');
console.log('   ✓ Petición externa de Cloudflare con X-Kiosco-Token permitida.');

// Caso D: Petición desde Cloudflare con query '?token=' -> Debe permitirse e inyectar Cookie
calledNext = false;
statusCode = null;
let setCookieHeader = null;
const mockResCookie = {
  status: (code) => { statusCode = code; return mockResCookie; },
  json: (data) => { jsonResponse = data; return mockResCookie; },
  setHeader: (name, val) => {
    if (name.toLowerCase() === 'set-cookie') setCookieHeader = val;
  }
};
const mockReqCfWithQuery = {
  headers: {
    'cf-connecting-ip': '203.0.113.195',
    'host': 'my-printer.trycloudflare.com'
  },
  query: { token: secret },
  socket: { remoteAddress: '104.28.1.1' }
};

tunnelSecurityMiddleware(mockReqCfWithQuery, mockResCookie, () => { calledNext = true; });
assert.strictEqual(calledNext, true, 'Petición externa con token en query debe permitirse');
assert(setCookieHeader && setCookieHeader.includes('kiosco_auth='), 'Debe inyectar cookie de autenticación');
console.log('   ✓ Petición externa con query ?token= permitida y cookie de sesión inyectada.');

// 4. Probar status report
const status = getTunnelStatus();
assert.strictEqual(typeof status.status, 'string');
assert.strictEqual(status.kioscoSecretConfigured, true);
assert.strictEqual(status.gistId, 'test_gist_12345');
console.log('✅ 4. Reporte de estado getTunnelStatus() validado.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE TÚNEL Y SEGURIDAD PASARON CON ÉXITO!\n');
