const readline = require('readline');
const fs = require('fs');
const path = require('path');
const {
  loadTunnelConfig,
  saveTunnelConfig,
  generateKioscoSecret,
  verifyGitHubToken,
  createSecretGist,
  fetchCurrentGist
} = require('../server/services/tunnelService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\n=============================================================');
  console.log('       CONFIGURACIÓN DE SINCRONIZACIÓN GITHUB - EL TATO      ');
  console.log('=============================================================\n');
  console.log('Esta herramienta permite que tu aplicación Android se conecte');
  console.log('al servidor de impresión automáticamente desde cualquier lugar');
  console.log('(Wi-Fi del local o Datos Móviles 4G/5G en la calle) sin pagar');
  console.log('dominios ni exponer la impresora a personas ajenas.\n');

  let config = loadTunnelConfig();

  if (config.githubToken && config.gistId) {
    console.log('Configuración actual detectada:');
    console.log(`- Token GitHub:  ${config.githubToken.substring(0, 7)}... (Guardado)`);
    console.log(`- Gist ID:       ${config.gistId}`);
    console.log(`- Clave Kiosco:  ${config.kioscoSecret ? config.kioscoSecret.substring(0, 10) + '...' : '(No configurada)'}`);
    console.log(`- Auto-arranque: ${config.autoStartTunnel ? 'Activado' : 'Desactivado'}\n');

    const reconfigure = await ask('¿Deseas volver a configurar todo de cero? (s/N): ');
    if (reconfigure.trim().toLowerCase() !== 's' && reconfigure.trim().toLowerCase() !== 'si') {
      console.log('\nConfiguración mantenida sin cambios. Listo para operar.\n');
      rl.close();
      return;
    }
  }

  console.log('-------------------------------------------------------------');
  console.log('PASO 1: Token Personal de GitHub (Personal Access Token)');
  console.log('-------------------------------------------------------------');
  console.log('Para crear el token gratuito en 30 segundos:');
  console.log('1. Abre este enlace en tu navegador:');
  console.log('   https://github.com/settings/tokens/new?scopes=gist&description=Kiosco-ElTato-Tunnel');
  console.log('2. Baja hasta el final de la página y pulsa "Generate token".');
  console.log('3. Copia el token generado (empieza por ghp_...).\n');

  let token = '';
  let tokenValid = false;
  let username = '';

  while (!tokenValid) {
    const inputToken = await ask('Pega tu token de GitHub aquí (o escribe "salir"): ');
    if (inputToken.trim().toLowerCase() === 'salir') {
      console.log('Operación cancelada.');
      rl.close();
      return;
    }

    token = inputToken.trim();
    if (!token) continue;

    console.log('\nVerificando token con GitHub...');
    const result = await verifyGitHubToken(token);
    if (result.success) {
      tokenValid = true;
      username = result.username;
      console.log(`[OK] Conectado exitosamente con GitHub: @${username}\n`);
    } else {
      console.log(`[!] Error: ${result.error}`);
      console.log('Asegúrate de que el token sea correcto y tenga el permiso marcado "gist".\n');
    }
  }

  console.log('-------------------------------------------------------------');
  console.log('PASO 2: Configuración del Gist (Coordinador Dinámico)');
  console.log('-------------------------------------------------------------');
  console.log('¿Cómo deseas configurar el Gist de sincronización?');
  console.log('1. Crear un nuevo Gist secreto automáticamente (Recomendado)');
  console.log('2. Utilizar un Gist existente pegando su ID');

  const gistOption = await ask('Opción [1 o 2] (Por defecto 1): ');
  let gistId = '';

  if (gistOption.trim() === '2') {
    let gistOk = false;
    while (!gistOk) {
      const inputGist = await ask('Pega el ID del Gist: ');
      try {
        const gistData = await fetchCurrentGist(inputGist.trim(), token);
        gistId = inputGist.trim();
        gistOk = true;
        console.log(`[OK] Gist verificado exitosamente.`);
      } catch (err) {
        console.log(`[!] No se pudo acceder al Gist (${err.message}). Intenta de nuevo.`);
      }
    }
  } else {
    console.log('\nCreando Gist secreto en tu cuenta de GitHub...');
    try {
      const created = await createSecretGist(token);
      gistId = created.gistId;
      console.log(`[OK] Gist secreto creado exitosamente!`);
      console.log(`     ID:  ${gistId}`);
      console.log(`     URL: ${created.gistUrl}\n`);
    } catch (err) {
      console.error(`[!] Error creando Gist: ${err.message}`);
      rl.close();
      return;
    }
  }

  console.log('-------------------------------------------------------------');
  console.log('PASO 3: Clave Secreta del Kiosco (Protección de Impresora)');
  console.log('-------------------------------------------------------------');
  let kioscoSecret = config.kioscoSecret || generateKioscoSecret();
  console.log(`Clave de seguridad asignada a tu app:`);
  console.log(`>> ${kioscoSecret} <<`);
  console.log('(Cualquier conexión desde internet sin esta clave será rechazada).\n');

  console.log('-------------------------------------------------------------');
  console.log('PASO 4: Opciones de Inicio');
  console.log('-------------------------------------------------------------');
  const autoStartAns = await ask('¿Deseas que el túnel inicie automáticamente cuando arranque el servidor? (s/N): ');
  const autoStart = autoStartAns.trim().toLowerCase() === 's' || autoStartAns.trim().toLowerCase() === 'si';

  // Guardar configuración en servidor
  const saved = saveTunnelConfig({
    githubToken: token,
    gistId: gistId,
    kioscoSecret: kioscoSecret,
    autoStartTunnel: autoStart
  });

  // Guardar también una copia para el proyecto Android en app_config.json
  const androidAssetsDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets');
  if (!fs.existsSync(androidAssetsDir)) {
    fs.mkdirSync(androidAssetsDir, { recursive: true });
  }
  const appConfigPath = path.join(androidAssetsDir, 'app_config.json');
  fs.writeFileSync(appConfigPath, JSON.stringify({
    gistId: gistId,
    kioscoSecret: kioscoSecret,
    localPort: 3000,
    githubUsername: username
  }, null, 2), 'utf8');

  // Guardar copia de respaldo en la raíz de android/ por si se compila con otras herramientas
  const androidRootConfig = path.join(__dirname, '..', 'android', 'app_config.json');
  fs.writeFileSync(androidRootConfig, JSON.stringify({
    gistId: gistId,
    kioscoSecret: kioscoSecret,
    localPort: 3000,
    githubUsername: username
  }, null, 2), 'utf8');

  console.log('\n=============================================================');
  console.log('            ¡CONFIGURACIÓN COMPLETADA CON ÉXITO!            ');
  console.log('=============================================================');
  console.log('✓ Credenciales guardadas de forma segura en server/data/tunnel_config.json');
  console.log('✓ Configuración vinculada para la app Android en android/app_config.json');
  console.log('\n¿Cómo probar la conexión?');
  console.log('1. Inicia el túnel ejecutando: iniciar-tunel.bat');
  console.log('2. Tu URL dinámica se actualizará sola en GitHub en tiempo real.');
  console.log('3. Luego compila el APK ejecutando: compilar-apk.bat\n');

  rl.close();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}
