var PerfumeLib =
  (typeof globalThis !== 'undefined' && globalThis.PerfumeLib) ||
  (typeof self !== 'undefined' && self.PerfumeLib) ||
  {};

const COST_CONSTANTS = {
  currency: 'USD'
};

function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function normalizeFormula(formula) {
  if (!Array.isArray(formula) || formula.length === 0) {
    throw new Error('Formula must be a non-empty array.');
  }

  return formula.map((component) => {
    if (!component || typeof component !== 'object') {
      throw new Error('Each formula component must be an object.');
    }
    const { materialId, quantityMg } = component;
    if (!materialId) {
      throw new Error('Formula component missing materialId.');
    }
    const qty = Number(quantityMg);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error(`Invalid quantity for material ${materialId}.`);
    }
    return {
      materialId,
      quantityMg: qty
    };
  });
}

function calculateBottleCost(formula, materialCatalog, options = {}) {
  const normalizedFormula = normalizeFormula(formula);
  if (!materialCatalog || typeof materialCatalog !== 'object') {
    throw new Error('Material catalog must be provided as an object keyed by materialId.');
  }
  const margin = options.marginPercentage != null ? Number(options.marginPercentage) : 0.2;
  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error('Margin percentage must be a non-negative number.');
  }

  let totalCost = 0;
  const components = normalizedFormula.map(({ materialId, quantityMg }) => {
    const catalogEntry = materialCatalog[materialId];
    if (!catalogEntry) {
      throw new Error(`Material ${materialId} missing from catalog.`);
    }
    const pricePerMg = Number(catalogEntry.pricePerMg);
    if (!Number.isFinite(pricePerMg) || pricePerMg < 0) {
      throw new Error(`Material ${materialId} has invalid price.`);
    }
    const wastageRate = Number(catalogEntry.wastageRate || 0);
    if (wastageRate < 0 || wastageRate >= 1) {
      throw new Error(`Material ${materialId} has invalid wastage rate.`);
    }
    const effectiveQuantity = quantityMg / (1 - wastageRate);
    const cost = effectiveQuantity * pricePerMg;
    totalCost += cost;
    return {
      materialId,
      quantityMg,
      effectiveQuantity,
      pricePerMg,
      cost: roundToTwo(cost)
    };
  });

  const roundedCost = roundToTwo(totalCost);
  const marginAmount = roundToTwo(roundedCost * margin);
  const sellingPrice = roundToTwo(roundedCost + marginAmount);

  return {
    currency: COST_CONSTANTS.currency,
    marginPercentage: margin,
    cost: roundedCost,
    marginAmount,
    sellingPrice,
    components
  };
}

function summarizeFormula(formula) {
  const normalizedFormula = normalizeFormula(formula);
  const totalQuantity = normalizedFormula.reduce((acc, item) => acc + item.quantityMg, 0);
  return {
    totalComponents: normalizedFormula.length,
    totalQuantityMg: totalQuantity
  };
}

const exported = {
  COST_CONSTANTS,
  calculateBottleCost,
  summarizeFormula
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}

if (typeof globalThis !== 'undefined') {
  globalThis.PerfumeLib = globalThis.PerfumeLib || {};
  globalThis.PerfumeLib.costCalculator = exported;
}
