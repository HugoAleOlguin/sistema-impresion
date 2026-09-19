const { loadTunnelConfig } = require('./tunnelService');

/**
 * Middleware de seguridad para proteger el servidor de accesos no autorizados
 * cuando se expone mediante Cloudflare Tunnel o red pública.
 * 
 * - Accesos locales (localhost, 127.0.0.1, ::1) y LAN privada (192.168.x, 10.x):
 *   Acceso PERMITIDO automáticamente sin fricción para el mostrador y Wi-Fi local.
 * 
 * - Accesos remotos (vía Cloudflare Tunnel o IP externa):
 *   Se requiere autenticación mediante el header 'X-Kiosco-Token', query param '?token=' o cookie 'kiosco_auth'.
 *   Esto previene que personas ajenas en internet impriman o accedan al servidor.
 */
function tunnelSecurityMiddleware(req, res, next) {
  const tunnelConfig = loadTunnelConfig();

  // Si no se ha configurado ninguna clave secreta, permitir
  if (!tunnelConfig.kioscoSecret) {
    return next();
  }

  // Detectar si la petición viene a través de Cloudflare
  const isCloudflare = Boolean(
    req.headers['cf-connecting-ip'] ||
    req.headers['cf-ray'] ||
    (req.headers.host && req.headers.host.includes('.trycloudflare.com'))
  );

  // Obtener IP remota
  const remoteIp = req.socket.remoteAddress || '';
  const isLoopback = remoteIp.includes('127.0.0.1') || remoteIp === '::1' || remoteIp.endsWith('127.0.0.1');
  const isLocalLan = remoteIp.includes('192.168.') || remoteIp.includes('10.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(remoteIp);

  // Tráfico local sin intermediación de Cloudflare: Libre acceso
  if (!isCloudflare && (isLoopback || isLocalLan)) {
    return next();
  }

  // Extraer token de autenticación provisto
  const authHeader = req.headers['x-kiosco-token'];
  const queryToken = req.query.token;
  
  let cookieToken = null;
  if (req.headers.cookie) {
    const match = req.headers.cookie.split('; ').find(row => row.startsWith('kiosco_auth='));
    if (match) cookieToken = match.split('=')[1];
  }

  const providedToken = authHeader || queryToken || cookieToken;

  if (providedToken && providedToken === tunnelConfig.kioscoSecret) {
    // Si vino por query param, inyectar cookie de sesión para llamadas subsecuentes (assets, fetch)
    if (queryToken) {
      res.setHeader('Set-Cookie', `kiosco_auth=${tunnelConfig.kioscoSecret}; Path=/; HttpOnly; SameSite=Lax`);
    }
    return next();
  }

  // Acceso denegado
  return res.status(403).json({
    error: 'Acceso denegado',
    message: 'Esta instancia del Kiosco El Tato está protegida contra accesos externos no autorizados.'
  });
}

module.exports = {
  tunnelSecurityMiddleware
};
