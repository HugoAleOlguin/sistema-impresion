# CONTEXT.md — Kiosco "El Tato" (Sistema de Impresiones)

Este documento centraliza el estado actual, objetivos, restricciones de hardware y decisiones clave tomadas para el proyecto de impresiones en el kiosco.

---

## 1. Resumen del Negocio y Objetivo

- **Negocio:** Mini kiosco familiar de barrio ("El Tato").
- **Nuevo Servicio:** Incorporar el servicio de impresión de documentos (PDFs, trámites, apuntes, boletas) y fotos directamente desde archivos enviados por vecinos y clientes.
- **Experiencia previa:** Cero experiencia previa en servicios de impresión / copistería.
- **Objetivo central:** Implementar un sistema ágil y sin fricción técnica que permita cotizar al instante, cobrar y despachar impresiones a la impresora ubicada en la casa, operando todo desde el celular del mostrador.

---

## 2. Operativa Humana y Perfil de Usuarios

- **Atención del mostrador:** Generalmente hay **una sola persona** atendiendo todo el kiosco (la madre, el padre, el hermano o el usuario).
- **Nivel técnico de los operadores:** No son especialistas en tecnología. No deben lidiar con interfaces complicadas, menús de controladores de Windows, cálculos matemáticos mentales ni configuraciones avanzadas.
- **Dinámica con el cliente:** El cliente llega al mostrador, pide imprimir y usualmente pregunta *"¿Cuánto me sale?"* antes de que comience el trabajo. El cobro se realiza en el mostrador (efectivo o QR de Mercado Pago).
- **Atención al público:** Quien atiende no puede abandonar el mostrador por mucho tiempo ni sentarse en una computadora mientras otros clientes esperan para comprar productos del kiosco.

---

## 3. Infraestructura y Hardware

| Elemento | Ubicación | Detalles / Estado |
| :--- | :--- | :--- |
| **Impresora** | En la casa (adentro/atrás) | **Epson EcoTank L3560** (tanque de tinta continua, Wi-Fi / Wi-Fi Direct, bandeja trasera vertical). |
| **Tipo de Dúplex** | Epson L3560 | **Dúplex MANUAL** (no invierte hojas automáticamente; requiere imprimir impares, dar vuelta la pila a mano e imprimir pares). |
| **Computadora** | En la casa | PC de escritorio con Windows conectada a la impresora, normalmente **encendida todo el día**. |
| **Dispositivo de atención**| En el mostrador (kiosco) | **Celulares** (Android/iOS). **No hay PC en el mostrador**. |
| **Red / Conectividad** | Local | Misma red Wi-Fi compartida entre la casa y el kiosco. |

---

## 4. Decisiones Clave y Descartes (Anti-patrones evitados)

1. **NO a los Bots no oficiales de WhatsApp:**
   - *Motivo:* Riesgo de baneo del número por parte de Meta, fragilidad técnica ante actualizaciones de WhatsApp y pérdida de cercanía humana con el vecino del barrio.
2. **NO al Autoservicio directo sin control (QR abierto):**
   - *Motivo:* Riesgo de saturación de cola, impresiones de broma o desperdicio de tinta y papel costoso sin haber cobrado previamente. Además, muchos clientes no saben o no pueden escanear códigos QR.
3. **NO a obligar al operador a sentarse en la PC:**
   - *Motivo:* Como hay una sola persona atendiendo, dejar el mostrador solo para abrir archivos, contar páginas y configurar diálogos de impresión hace perder ventas y tiempo valioso.
4. **SÍ a la arquitectura asistida por Wi-Fi:**
   - Celular en mostrador (para cotizar en 5 segundos y autorizar con un toque) + Servicio ligero en la PC de la casa (para ejecutar la impresión en alta fidelidad y controlar la cola).

---

## 5. Estado y Tareas Completadas

- [x] Extracción y refinamiento de intenciones iniciales (`interview-me` / `idea-refine`).
- [x] Documentación de contexto y propuesta técnica preliminar.
- [x] Definición de la lista de precios inicial (B&N, Color, Doble Faz, Fotos).
- [x] Desarrollo del stack MVP: PWA móvil + Backend Node.js Express.
- [x] Conversión y soporte de PDFs, Word (.docx/.rtf) e imágenes con auto-ajuste A4.
- [x] Algoritmo de Dúplex Manual de 2 pasos para Epson L3560.
- [x] **Correcciones de Dúplex y Selección Parcial:**
  - Corregida condición en `/api/jobs` para recortar y respetar selecciones parciales (ej: hojas 1 y 2).
  - Corregido orden de páginas pares a natural (2, 4, ...) para que coincida con el giro tipo libro hacia la bandeja trasera de la Epson L3560.
- [x] **Instalador y Auto-Arranque Universal:**
  - Creado `instalar-kiosco.bat` y `scripts/install.ps1`: verifica Node.js, instala dependencias, descarga SumatraPDF, configura Firewall, detecta la Epson y añade el servidor al Inicio de Windows (`Startup`) y crea acceso en el Escritorio.
  - Creado `desinstalar-autoinicio.bat`: permite desactivar el auto-arranque en cualquier momento.
  - Auto-detección dinámica de impresora Epson en cualquier PC en `server/config.js`.
- [x] **Sincronización Remota y Túnel Permanente sin Dominios:**
  - **Coordinador Dinámico vía GitHub Gist:** Sincroniza en tiempo real la URL temporal emitida por `cloudflared.exe` sin costo ni dominios pagos.
  - **Seguridad y Privacidad Absoluta:** Implementado `tunnelSecurityMiddleware` en Express; peticiones locales (LAN/Wi-Fi) transparentes; peticiones externas vía Cloudflare protegidas mediante token secreto `X-Kiosco-Token` (403 Forbidden para extraños).
  - **Asistente Interactivo de Configuración:** Creados `configurar_github.bat` y `scripts/configurar_github.js` para vincular el token de GitHub y crear el Gist automáticamente con 1 solo clic.
  - **Gestor de Túnel:** Creados `iniciar-tunel.bat` y `scripts/tunnel_manager.js` para arranque manual o automático con detección y reconexión en vivo.


