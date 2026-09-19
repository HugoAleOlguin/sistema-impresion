# 🏠 Instrucciones para la PC de la Casa / Mostrador

¡Todo está listo para que llegues a la PC de la casa, hagas un `git pull` y el sistema quede funcionando de inmediato!

---

## ⚡ Pasos rápidos (2 minutos)

### 1. Abrir la terminal y actualizar el proyecto
En la PC de la casa, abrí la consola (PowerShell o CMD) en la carpeta del proyecto y ejecutá:
```bash
git pull
```

---

### 2. Iniciar el servidor
Hacé **doble clic** en:
👉 **`iniciar-kiosco.bat`**

> **¿Qué hace automáticamente este archivo?**
> - Verifica que Node.js esté disponible.
> - Si faltan dependencias, ejecuta `npm install` solo.
> - Si falta el motor de impresión (`SumatraPDF.exe`) o el túnel (`cloudflared.exe`), los descarga al instante.
> - Inicia el servidor en el puerto 3000 y activa el túnel Cloudflare enlazado a GitHub Gist.

*(Opcional: Si querés que encienda automáticamente cada vez que prendés la PC y cree un acceso directo en el Escritorio, hacé doble clic en **`instalar-kiosco.bat`** una sola vez).*

---

### 3. Conectar el celular
Tenés dos formas de conectarte:
- **Con la App Android instalada:** Abrí la app en el teléfono. Conectará automáticamente al mostrador de forma instantánea y silenciosa.
- **Vía Navegador:** Si estás en la misma red Wi-Fi, abrí Chrome en el celular e ingresá a la dirección IP que aparece en la consola negra (por ejemplo: `http://192.168.100.193:3000` o la que te indique la pantalla).

---

### 📱 Instalar la App actualizada en el Celular:
Si querés instalar la última versión de la app en cualquier celular:
- El archivo ejecutable actualizado está en la raíz: **`KioscoElTato.apk`**.
- Pasátelo por WhatsApp Web, Cable USB o Google Drive e instalalo en el teléfono.
