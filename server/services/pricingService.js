const { loadConfig } = require('../config');

/**
 * Calcula el costo de impresión y la cantidad de hojas físicas requeridas
 * @param {number} totalPages - Número de páginas del documento
 * @param {boolean} isColor - true para color, false para B&N
 * @param {boolean} isDuplex - true para doble faz, false para simple faz
 * @param {number} copies - Cantidad de juegos/copias (por defecto 1)
 * @returns {object} Detalle completo con total, hojas y desglose
 */
function calculateQuote(totalPages, isColor = false, isDuplex = false, copies = 1) {
  const config = loadConfig();
  const pages = Math.max(1, parseInt(totalPages, 10) || 1);
  const numCopies = Math.max(1, parseInt(copies, 10) || 1);

  let physicalSheetsPerCopy = 0;
  let unitPricePerCopy = 0;
  let breakdown = {};

  if (!isDuplex) {
    // Modo Simple Faz
    physicalSheetsPerCopy = pages;
    const unitRate = isColor ? config.color_simplex : config.bw_simplex;
    unitPricePerCopy = physicalSheetsPerCopy * unitRate;
    const totalPrice = unitPricePerCopy * numCopies;
    const totalPhysicalSheets = physicalSheetsPerCopy * numCopies;

    breakdown = {
      tipo: isColor ? 'Color (Simple Faz)' : 'Blanco y Negro (Simple Faz)',
      paginasPorJuego: pages,
      hojasFisicasPorJuego: physicalSheetsPerCopy,
      copias: numCopies,
      hojasFisicasTotales: totalPhysicalSheets,
      precioPorJuego: unitPricePerCopy,
      total: totalPrice
    };

    return {
      pages,
      physicalSheets: totalPhysicalSheets,
      sheetsPerCopy: physicalSheetsPerCopy,
      copies: numCopies,
      isColor,
      isDuplex,
      totalPrice,
      breakdown
    };
  } else {
    // Modo Doble Faz
    const duplexSheets = Math.floor(pages / 2);
    const hasRemainder = pages % 2 !== 0;
    const remainderSheets = hasRemainder ? 1 : 0;
    physicalSheetsPerCopy = duplexSheets + remainderSheets;

    const duplexUnitPrice = isColor ? config.color_duplex : config.bw_duplex;
    const simplexUnitPrice = isColor ? config.color_simplex : config.bw_simplex;

    const duplexSubtotal = duplexSheets * duplexUnitPrice;
    const remainderSubtotal = remainderSheets * simplexUnitPrice;
    unitPricePerCopy = duplexSubtotal + remainderSubtotal;

    const totalPrice = unitPricePerCopy * numCopies;
    const totalPhysicalSheets = physicalSheetsPerCopy * numCopies;

    breakdown = {
      tipo: isColor ? 'Color (Doble Faz)' : 'Blanco y Negro (Doble Faz)',
      paginasPorJuego: pages,
      hojasFisicasPorJuego: physicalSheetsPerCopy,
      copias: numCopies,
      hojasFisicasTotales: totalPhysicalSheets,
      hojasDobleFaz: duplexSheets * numCopies,
      precioDobleFaz: duplexUnitPrice,
      hojasSimpleFazRestante: remainderSheets * numCopies,
      precioSimpleFaz: simplexUnitPrice,
      precioPorJuego: unitPricePerCopy,
      total: totalPrice
    };

    return {
      pages,
      physicalSheets: totalPhysicalSheets,
      sheetsPerCopy: physicalSheetsPerCopy,
      copies: numCopies,
      isColor,
      isDuplex,
      totalPrice,
      breakdown
    };
  }
}

module.exports = {
  calculateQuote
};

