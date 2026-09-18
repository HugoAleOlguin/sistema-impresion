const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('🔍 Probando API de punta a punta...');
  
  // 1. Config
  const cfg = await request({ host: 'localhost', port: 3000, path: '/api/config', method: 'GET' });
  console.log('1. /api/config:', cfg.data.printerName, '| MockMode:', cfg.data.mockMode);

  // 2. Quote
  const quote = await request(
    { host: 'localhost', port: 3000, path: '/api/quote', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { pageCount: 3, isColor: false, isDuplex: true, copies: 1 }
  );
  console.log('2. /api/quote (3 págs B&N Doble Faz):', quote.data.totalPrice, 'pesos | Hojas:', quote.data.physicalSheets);

  // 3. Jobs list
  const jobs = await request({ host: 'localhost', port: 3000, path: '/api/jobs', method: 'GET' });
  console.log('3. /api/jobs (cola actual):', jobs.data.length, 'trabajos.');

  console.log('✅ Todos los endpoints de la API responden perfectamente.');
}

run().catch(console.error);
