# PROMPT DE EJECUCIÓN: Puesta en Producción Hardware - Kiosco "El Tato"

Sos un ingeniero de software senior y especialista en infraestructura Windows y automatización de hardware.
Tenés acceso completo al proyecto ubicado en la raíz del repositorio.

## 1. Contexto del Proyecto
Es un sistema web local para un kiosco familiar atendido desde un teléfono móvil sobre Wi-Fi.
- **Frontend móvil (PWA):** `public/index.html`, `public/js/app.js`, `public/css/app.css`. El operador carga PDFs, Words o fotos, cotiza automáticamente en A4 y presiona `[ COBRAR E IMPRIMIR ]`.
- **Backend local:** Node.js Express (`server/index.js`, puerto `3000`).
- **Conversión de documentos:** `server/services/documentService.js` (fotos con `sharp` y orientación EXIF corregida; Word vía COM automation `Word.Application`).
- **Impresora física:** **Epson EcoTank L3560** conectada por cable/Wi-Fi a la PC de la casa con Windows.
- **Dúplex:** Dúplex **MANUAL** de 2 pasos asistido (Tanda 1: impares -> pausa para girar pila 180° hacia bandeja trasera -> Tanda 2: pares en orden inverso).

---

## 2. Objetivo Principal
Actualmente el proyecto funciona en **Modo Simulación (`MOCK_MODE: true`)** y todas las pruebas de lógica pasan al 100% (`test/test-system.js`).
Tu misión con privilegios elevados es **conectar el sistema al hardware real de la Epson EcoTank L3560**, asegurando que imprima físicamente en silencio, sin ventanas emergentes que bloqueen la PC, y que la red local permita el acceso desde los celulares.

---

## 3. Tareas Críticas a Ejecutar

### Tarea A: Detección del Nombre Exacto de la Impresora en Windows
1. Ejecutá en PowerShell:
   ```powershell
   Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus
   ```
2. Identificá el nombre exacto de la Epson L3560 (por ejemplo, `"EPSON L3560 Series"` o `"EPSON L3560 Series (Red)"`).
3. Actualizá `server/config.js` con el nombre exacto detectado:
   - `PRINTER_NAME: process.env.PRINTER_NAME || 'NOMBRE_EXACTO_DETECTADO'`
   - Cambiá `MOCK_MODE: false`.

### Tarea B: Motor de Impresión Silenciosa (Zero-Dialog)
Actualmente `server/services/printerService.js` usa `Start-Process -FilePath $pdf -Verb PrintTo`. En Windows, este verbo a menudo abre Microsoft Edge o Adobe Acrobat en primer plano o queda bloqueado esperando interacción del usuario.
1. La solución industrial para kioscos en Windows es utilizar **SumatraPDF en modo consola silenciosa** (`SumatraPDF.exe -print-to "NOMBRE_IMPRESORA" -silent "archivo.pdf"`).
2. Verificá si existe SumatraPDF en el sistema o descargá el binario portable de 64 bits a `server/bin/SumatraPDF.exe`:
   ```powershell
   New-Item -ItemType Directory -Force -Path "server\bin"
   Invoke-WebRequest -Uri "https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.exe" -OutFile "server\bin\SumatraPDF.exe"
   ```
3. En `server/services/printerService.js`, actualizá la función `sendPdfToPrinter` para usar SumatraPDF silencioso si está presente en `server/bin/SumatraPDF.exe`, con fallback a PowerShell `PrintTo`.

### Tarea C: Apertura de Puerto en el Firewall de Windows
Para que los celulares del mostrador conectados al Wi-Fi de la casa puedan abrir `http://<IP-DE-LA-PC>:3000` sin que el Firewall de Windows lo bloquee:
1. Ejecutá con privilegios de Administrador:
   ```powershell
   netsh advfirewall firewall add rule name="Kiosco El Tato Impresiones" dir=in action=allow protocol=TCP localport=3000
   ```

### Tarea D: Prueba de Impresión Física Real (Test Print)
1. Con la Epson L3560 encendida y con papel A4 cargado en la bandeja trasera:
2. Creá y ejecutá un script de prueba que mande una hoja de prueba real en blanco y negro y verifique que la cola de impresión de Windows (`Get-PrintJob`) procese el trabajo y lo termine (`Completed`).
3. Probá el flujo de doble faz asistido en papel real para comprobar que la tanda de páginas pares coincida exactamente con el dorso de las impares.

### Tarea E: Inicio Automático y Persistencia
1. Verificá `iniciar-kiosco.bat` para que inicie el servidor en modo producción con la IP local visible en pantalla.
2. Creá un acceso directo o tarea programada para que el servidor arranque automáticamente si se reinicia la PC de la casa.

---

## 4. Criterios de Aceptación
- El servidor arranca con `MOCK_MODE: false` y detecta la Epson L3560 lista.
- Un trabajo enviado desde `http://localhost:3000` o desde la IP local en el celular imprime físicamente en la Epson L3560 sin que salten diálogos ni ventanas en la PC.
- Las fotos e imágenes enviadas se imprimen ajustadas en A4.
- Los documentos de doble faz imprimen primero impares, muestran la pausa interactiva en el celular y, al confirmar, imprimen las pares en el dorso correcto.

