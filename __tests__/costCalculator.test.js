const costCalculator = require('../src/lib/costCalculator');

describe('costCalculator', () => {
  it('calculates bottle cost with margin and wastage', () => {
    const formula = [
      { materialId: 'A', quantityMg: 1000 },
      { materialId: 'B', quantityMg: 500 }
    ];
    const catalog = {
      A: { pricePerMg: 0.01, wastageRate: 0.05 },
      B: { pricePerMg: 0.02, wastageRate: 0 }
    };

    const result = costCalculator.calculateBottleCost(formula, catalog, { marginPercentage: 0.25 });
    expect(result.cost).toBeCloseTo(20.53, 2);
    expect(result.marginAmount).toBeCloseTo(5.13, 2);
    expect(result.sellingPrice).toBeCloseTo(25.66, 2);
    expect(result.components).toHaveLength(2);
    expect(result.components[0]).toMatchObject({ materialId: 'A' });
  });

  it('summarizes formulas', () => {
    const summary = costCalculator.summarizeFormula([
      { materialId: 'A', quantityMg: 100 },
      { materialId: 'B', quantityMg: 200 }
    ]);
    expect(summary.totalComponents).toBe(2);
    expect(summary.totalQuantityMg).toBe(300);
  });

  it('throws on invalid formula data', () => {
    expect(() => costCalculator.calculateBottleCost([], {})).toThrow('Formula must be a non-empty array.');
    expect(() => costCalculator.calculateBottleCost([{ quantityMg: 1 }], {})).toThrow('Formula component missing materialId.');
  });

  it('validates materials and margin', () => {
    const formula = [{ materialId: 'A', quantityMg: 100 }];
    expect(() => costCalculator.calculateBottleCost(formula, {}, { marginPercentage: -1 })).toThrow('Margin percentage');
    expect(() => costCalculator.calculateBottleCost(formula, { A: { pricePerMg: -0.1 } })).toThrow('invalid price');
  });
});
