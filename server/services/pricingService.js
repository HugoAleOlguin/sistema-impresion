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
  const pages = Math.max(0, parseInt(totalPages, 10) || 0);
  const numCopies = Math.max(1, parseInt(copies, 10) || 1);

  if (pages === 0) {
    return {
      pages: 0,
      physicalSheets: 0,
      sheetsPerCopy: 0,
      copies: numCopies,
      isColor,
      isDuplex,
      totalPrice: 0,
      breakdown: {
        tipo: 'Ninguna página',
        paginasPorJuego: 0,
        hojasFisicasPorJuego: 0,
        copias: numCopies,
        hojasFisicasTotales: 0,
        precioPorJuego: 0,
        total: 0
      }
    };
  }

  let physicalSheetsPerCopy = 0;
  let unitPricePerCopy = 0;
  let breakdown = {};

  if (!isDuplex) {
    // Modo Simple Faz
    physicalSheetsPerCopy = pages;
    const unitRate = isColor ? config.color_simplex : config.bw_simplex;
    unitPricePerCopy = Math.round((physicalSheetsPerCopy * unitRate + Number.EPSILON) * 100) / 100;
    const totalPrice = Math.round((unitPricePerCopy * numCopies + Number.EPSILON) * 100) / 100;
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
    unitPricePerCopy = Math.round((duplexSubtotal + remainderSubtotal + Number.EPSILON) * 100) / 100;

    const totalPrice = Math.round((unitPricePerCopy * numCopies + Number.EPSILON) * 100) / 100;
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

