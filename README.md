# Sistema de Impresión — Kiosco "El Tato"

Sistema web y servidor local de automatización de impresiones para kioscos y comercios familiares, diseñado para operar desde un celular en el mostrador sobre la red Wi-Fi local y despachar trabajos en silencio a una impresora en Windows (Epson EcoTank L3560).

---

## 🚀 Características Principales

- **Frontend Móvil (PWA):** Interfaz táctil ágil y sin fricción técnica para operar desde cualquier teléfono (Android o iOS) conectado al Wi-Fi del local.
- **Cotización Inmediata:** Cálculo automático de tarifas en segundos según páginas, copias, modo (Blanco y Negro o Color) y tipo de faz (Simple o Doble Faz).
- **Soporte de Documentos y Auto-Ajuste A4:**
  - Archivos PDF (inspección de páginas, previsualización y selector visual de páginas a imprimir).
  - Documentos Word (`.docx`, `.doc`, `.rtf`, `.txt`) con conversión nativa a PDF A4.
  - Fotos e imágenes individuales o combinadas (`.jpg`, `.png`, `.webp`, etc.) con orientación EXIF corregida y ajuste proporcional a hoja A4.
- **Dúplex Manual Asistido (Epson EcoTank L3560):** Algoritmo de división en 2 tandas (impares $\rightarrow$ pausa interactiva con guía visual para girar hojas $\rightarrow$ pares en orden natural), asegurando que el reverso coincida con la cara correspondiente.
- **Motor Silencioso Zero-Dialog:** Despacho industrial a través de **SumatraPDF portable** sin ventanas emergentes ni cuadros de diálogo que bloqueen la PC.
- **Instalador y Auto-Arranque con 1 Clic:** Script automatizado (`instalar-kiosco.bat`) que configura dependencias, firewall, accesos directos y auto-inicio con Windows.

---

## 🛠️ Requisitos

- **Sistema Operativo:** Windows 10 u 11 (en la PC conectada a la impresora).
- **Node.js:** Versión 18 o superior (el instalador intentará instalarlo automáticamente si no está presente).
- **Impresora:** Epson EcoTank (o cualquier impresora compatible con Windows).

---

## 📦 Instalación Rápida en Cualquier PC

1. Descargá o cloná este repositorio en la computadora conectada a la impresora:
   ```bash
   git clone https://github.com/HugoAleOlguin/sistema-impresion.git
   cd sistema-impresion
   ```
2. Hacé doble clic en:
   👉 **`instalar-kiosco.bat`**

El instalador se encargará de:
- Verificar o instalar Node.js.
- Instalar las dependencias (`npm install`).
- Descargar el binario de impresión silenciosa (`SumatraPDF.exe`).
- Abrir el puerto `3000` en el Firewall de Windows para permitir la conexión de celulares.
- Detectar la impresora Epson conectada.
- Configurar el inicio automático al encender la PC (`shell:startup`) y crear un acceso directo en el Escritorio.

---

## 📱 Uso Cotidiano

1. En la PC de la casa o mostrador, el servidor arranca solo al iniciar Windows (o podés abrirlo manualmente con `iniciar-kiosco.bat`).
2. En el celular del mostrador (conectado al mismo Wi-Fi), abrí el navegador e ingresá a la dirección IP local mostrada en la consola:
   ```
   http://<IP-DE-TU-PC>:3000
   ```
3. Subí el archivo del cliente, cotizá al instante, cobrá en el mostrador y presioná **`[ COBRAR E IMPRIMIR ]`**.

---

## 🧪 Pruebas y Diagnóstico

El proyecto incluye suites de pruebas automáticas:

```bash
# Ejecutar batería de pruebas lógicas (en modo simulado, no gasta hojas ni tinta)
npm test

# Imprimir hoja física de prueba y calibración CMYK en la impresora real
npm run test:hardware
```

---

## 📄 Licencia

Desarrollado para Kiosco El Tato. Licencia MIT.
