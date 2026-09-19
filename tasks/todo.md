# Tareas de Implementación: APK Android Web Shell — Kiosco "El Tato"

## Tareas

- [ ] **Tarea 1: Estructurar Proyecto Android Nativo (Gradle + Manifest)**
  - Crear estructura de carpetas `android/` con Gradle Wrapper, `build.gradle.kts` y `settings.gradle.kts`.
  - Configurar `AndroidManifest.xml` con `INTERNET`, `CAMERA`, `ACCESS_NETWORK_STATE`, `READ_EXTERNAL_STORAGE` y `usesCleartextTraffic="true"`.
  - *Criterio de aceptación:* Gradle sincroniza y resuelve dependencias con SDK 34 y Java 17.

- [ ] **Tarea 2: Implementar MainActivity con WebView Avanzado y FileChooser**
  - Configurar `WebView` con `javaScriptEnabled = true`, `domStorageEnabled = true`, y cache local.
  - Implementar `WebChromeClient.onShowFileChooser` para soportar selección de archivos PDF/Word y captura directa con la cámara.
  - Manejar permisos de cámara en tiempo de ejecución (`ActivityResultContracts.RequestPermission`).
  - *Criterio de aceptación:* Al presionar "Subir archivo" en la app, abre el diálogo nativo de Android con cámara y galería.

- [ ] **Tarea 3: Implementar Sistema de Conexión Inteligente y Pantalla de Configuración / Error**
  - Guardar la URL activa (IP local o Cloudflare) en `SharedPreferences`.
  - En caso de error de conexión (`onReceivedError`), mostrar pantalla interactiva nativa con:
    - Estado de la conexión.
    - Campo para cambiar la IP o ingresar el enlace de Cloudflare Tunnel.
    - Botón de auto-reintento con animación.
  - Botón o gesto discreto para cambiar la IP en cualquier momento sin reinstalar la app.
  - *Criterio de aceptación:* Si la PC cambia de IP, el operador puede actualizarla en 3 segundos desde la app.

- [ ] **Tarea 4: Automatizar Script de Compilación `compilar-apk.bat`**
  - Crear `compilar-apk.bat` en la raíz del proyecto para ejecutar `./gradlew assembleDebug` o `assembleRelease`.
  - Copiar el archivo APK generado directamente a la raíz como `KioscoElTato.apk` para fácil instalación vía USB o WhatsApp Web.
  - *Criterio de aceptación:* Un doble clic en `compilar-apk.bat` genera el APK listo para instalar en cualquier teléfono.

- [ ] **Tarea 5: Script de Ayuda para Túnel Cloudflare (`iniciar_tunel_cloudflare.bat`)**
  - Crear un batch que ejecute `cloudflared.exe tunnel --url http://localhost:3000` y muestre en letras grandes la URL temporal para usar fuera del local sin comprar dominios.
  - *Criterio de aceptación:* Permite crear un túnel HTTPS público y gratuito con un doble clic.
