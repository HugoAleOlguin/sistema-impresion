# Manual de Operación y Referencia de Comandos — Kiosco "El Tato"

Este documento contiene la referencia técnica y operativa del sistema de impresiones, hardware conectado, comandos de diagnóstico y pasos de uso cotidiano.

---

## 1. Hardware y Configuración Detectada

| Parámetro | Valor Real en el Sistema | Observaciones |
| :--- | :--- | :--- |
| **Impresora Física** | `EPSON L3560 Series (Copiar 1)` | Nombre exacto en Windows con driver oficial del fabricante |
| **Controlador** | `EPSON L3560 Series` | Driver original Epson (no el genérico IPP) |
| **Puerto Físico** | `USB001` | Conexión directa por cable USB a la PC |
| **Dirección IP Local** | Dinámica (`http://<IP-DE-TU-PC>:3000`) | Detectada automáticamente por el servidor al iniciar |
| **Puerto del Servidor**| `3000` | Regla abierta en Firewall de Windows (`Kiosco El Tato Impresiones`) |
| **Motor de Impresión** | `server/bin/SumatraPDF.exe` | Impresión industrial silenciosa (Zero-Dialog, sin popups) |
| **Formato y Papel** | A4 (210 x 297 mm) | Bandeja trasera vertical |

---

## 2. Acceso al Sistema

### Para el Celular del Mostrador:
1. Conectar el celular a la red Wi-Fi del kiosco/casa.
2. Abrir Chrome / Safari e ingresar a la dirección mostrada en la consola del servidor, por ejemplo:
   **`http://<IP-DE-TU-PC>:3000`** (ej: `http://192.168.1.100:3000`)
3. *(Opcional)* Tocar los 3 puntitos del navegador -> **"Agregar a pantalla principal"** para tenerlo como aplicación rápida (PWA).

### Para la Computadora de la Casa:
- Abrir el navegador e ingresar a: **`http://localhost:3000`**

---

## 3. Instalación en Cualquier PC y Auto-Inicio

| Archivo Batch | Función |
| :--- | :--- |
| **`instalar-kiosco.bat`** | **Instalador Maestro:** Verifica Node.js, instala dependencias npm, descarga SumatraPDF, abre el puerto 3000 en el Firewall de Windows, auto-detecta la Epson y configura el auto-arranque al encender la PC (además de crear acceso directo en el Escritorio). |
| **`iniciar-kiosco.bat`** | **Inicio Manual:** Inicia el servidor mostrando las IPs locales detectadas. |
| **`desinstalar-autoinicio.bat`** | **Desactivar Auto-arranque:** Quita el servidor del inicio automático de Windows. |

---

## 4. Comandos Rápidos del Proyecto (npm)

Desde la terminal en la carpeta del proyecto:

| Comando | Acción |
| :--- | :--- |
| `npm start` | Inicia el servidor Node.js en modo producción con la Epson real. |
| `npm test` | Ejecuta la batería de pruebas lógicas en modo simulado (no gasta papel). |
| `npm run test:hardware` | Genera e imprime una hoja de prueba real A4 con calibración CMYK y diagnóstico. |

---

## 5. Comandos de Diagnóstico en Windows (PowerShell)

### A. Ver el estado de la impresora Epson
```powershell
Get-Printer -Name "EPSON*" | Format-List Name, DriverName, PortName, PrinterStatus
```

### B. Ver la cola de impresión en tiempo real (si hay documentos pendientes)
```powershell
Get-PrintJob -PrinterName "EPSON L3560 Series (Copiar 1)"
```

### C. Limpiar la cola si se atasca un trabajo en Windows
```powershell
# Detener spooler, vaciar cola y reiniciar
Stop-Service Spooler
Remove-Item "$env:SystemRoot\System32\spool\PRINTERS\*" -Force
Start-Service Spooler
```

### D. Probar impresión directa con SumatraPDF desde consola
```powershell
.\server\bin\SumatraPDF.exe -print-to "EPSON L3560 Series (Copiar 1)" -silent -print-settings "1x,color,paper=A4,fit" "test\test_hardware_a4.pdf"
```

### E. Verificar regla de Firewall para permitir celulares
```powershell
Get-NetFirewallRule -DisplayName "*Tato*" | Select-Object DisplayName, Direction, Action, Enabled
```

---

## 6. Tarifas Configuradas

Las tarifas se pueden ajustar desde la web o modificando `server/data/config.json`:

- **B&N Simple Faz (1 cara):** $100
- **B&N Doble Faz (1 hoja con 2 páginas):** $150
- **Color Simple Faz (1 cara):** $200
- **Color Doble Faz (1 hoja con 2 páginas):** $250
