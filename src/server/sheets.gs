var PerfumeSheets = (function () {
  var costCalculator = PerfumeLib && PerfumeLib.costCalculator;
  if (!costCalculator) {
    throw new Error('PerfumeLib.costCalculator missing. Ensure bundles are generated.');
  }

  var sheetNames = PerfumeConfig.sheetNames;

  function ensureSheet_(name, headers) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
    }
    return sheet;
  }

  function toObjects_(rows, headers) {
    return rows.map(function (row) {
      var obj = {};
      headers.forEach(function (header, index) {
        obj[header] = row[index];
      });
      return obj;
    });
  }

  function getMaterials() {
    var headers = ['materialId', 'name', 'vendor', 'pricePerMg', 'stockMg', 'lastPurchaseIso'];
    var sheet = ensureSheet_(sheetNames.materials, headers);
    var values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), headers.length).getValues();
    var data = values
      .filter(function (row) {
        return row[0];
      })
      .map(function (row) {
        return {
          materialId: row[0],
          name: row[1],
          vendor: row[2],
          pricePerMg: Number(row[3]) || 0,
          stockMg: Number(row[4]) || 0,
          lastPurchaseIso: row[5]
        };
      });
    return data;
  }

  function upsertMaterial(material) {
    var headers = ['materialId', 'name', 'vendor', 'pricePerMg', 'stockMg', 'lastPurchaseIso'];
    var sheet = ensureSheet_(sheetNames.materials, headers);
    var dataRange = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), headers.length);
    var rows = dataRange.getValues();
    var foundRowIndex = -1;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][0] === material.materialId) {
        foundRowIndex = i;
        break;
      }
    }
    var rowValues = [
      material.materialId,
      material.name,
      material.vendor,
      material.pricePerMg,
      material.stockMg,
      material.lastPurchaseIso
    ];
    if (foundRowIndex >= 0) {
      sheet.getRange(foundRowIndex + 2, 1, 1, headers.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    PerfumeLogging.log({
      level: 'info',
      category: 'sheet',
      message: 'Material upserted',
      details: {
        materialId: material.materialId,
        stockMg: material.stockMg,
        pricePerMg: material.pricePerMg
      }
    });
    return material;
  }

  function recordPurchase(purchase) {
    var headers = ['timestampIso', 'materialId', 'vendor', 'quantityMg', 'totalCost', 'unitPrice', 'notes'];
    var sheet = ensureSheet_(sheetNames.purchases, headers);
    var timestamp = new Date().toISOString();
    var unitPrice = Number(purchase.totalCost) / Number(purchase.quantityMg);
    sheet.appendRow([
      timestamp,
      purchase.materialId,
      purchase.vendor,
      purchase.quantityMg,
      purchase.totalCost,
      unitPrice,
      purchase.notes || ''
    ]);

    var materials = getMaterials();
    var existing = materials.find(function (m) {
      return m.materialId === purchase.materialId;
    });
    var newStock = (existing ? existing.stockMg : 0) + Number(purchase.quantityMg);
    var materialRecord = {
      materialId: purchase.materialId,
      name: purchase.name || (existing && existing.name) || purchase.materialId,
      vendor: purchase.vendor || (existing && existing.vendor) || '',
      pricePerMg: unitPrice,
      stockMg: newStock,
      lastPurchaseIso: timestamp
    };
    upsertMaterial(materialRecord);

    PerfumeLogging.log({
      level: 'info',
      category: 'sheet',
      message: 'Purchase recorded',
      details: {
        materialId: purchase.materialId,
        quantityMg: purchase.quantityMg,
        totalCost: purchase.totalCost
      }
    });

    return {
      purchase: {
        timestampIso: timestamp,
        materialId: purchase.materialId,
        vendor: purchase.vendor,
        quantityMg: purchase.quantityMg,
        totalCost: purchase.totalCost,
        unitPrice: unitPrice
      },
      material: materialRecord
    };
  }

  function listPurchases(limit) {
    var headers = ['timestampIso', 'materialId', 'vendor', 'quantityMg', 'totalCost', 'unitPrice', 'notes'];
    var sheet = ensureSheet_(sheetNames.purchases, headers);
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }
    var rowCount = Math.min(limit || 200, lastRow - 1);
    var range = sheet.getRange(Math.max(lastRow - rowCount + 1, 2), 1, rowCount, headers.length);
    return toObjects_(range.getValues(), headers);
  }

  function listFormulas() {
    var headers = ['formulaId', 'name', 'description', 'componentsJson', 'lastCost', 'margin', 'sellingPrice'];
    var sheet = ensureSheet_(sheetNames.formulas, headers);
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }
    var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    return values
      .filter(function (row) {
        return row[0];
      })
      .map(function (row) {
        return {
          formulaId: row[0],
          name: row[1],
          description: row[2],
          components: row[3] ? JSON.parse(row[3]) : [],
          lastCost: Number(row[4]) || 0,
          margin: row[5] !== '' && row[5] != null ? Number(row[5]) : PerfumeConfig.defaultMargin,
          sellingPrice: Number(row[6]) || 0
        };
      });
  }

  function saveFormula(formula) {
    if (!formula.formulaId) {
      formula.formulaId = Utilities.getUuid();
    }
    var materials = getMaterials();
    var catalog = {};
    materials.forEach(function (material) {
      catalog[material.materialId] = {
        pricePerMg: material.pricePerMg,
        wastageRate: material.wastageRate || 0
      };
    });
    var calculation = costCalculator.calculateBottleCost(formula.components, catalog, {
      marginPercentage: formula.margin != null ? formula.margin : PerfumeConfig.defaultMargin
    });
    var headers = ['formulaId', 'name', 'description', 'componentsJson', 'lastCost', 'margin', 'sellingPrice'];
    var sheet = ensureSheet_(sheetNames.formulas, headers);
    var lastRow = sheet.getLastRow();
    var rowValues = [
      formula.formulaId,
      formula.name,
      formula.description || '',
      JSON.stringify(formula.components || []),
      calculation.cost,
      calculation.marginPercentage,
      calculation.sellingPrice
    ];
    if (lastRow > 1) {
      var range = sheet.getRange(2, 1, lastRow - 1, headers.length);
      var rows = range.getValues();
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][0] === formula.formulaId) {
          sheet.getRange(i + 2, 1, 1, headers.length).setValues([rowValues]);
          break;
        }
      }
      if (i === rows.length) {
        sheet.appendRow(rowValues);
      }
    } else {
      sheet.appendRow(rowValues);
    }

    PerfumeLogging.log({
      level: 'info',
      category: 'sheet',
      message: 'Formula saved',
      details: {
        formulaId: formula.formulaId,
        margin: calculation.marginPercentage,
        sellingPrice: calculation.sellingPrice
      }
    });

    return {
      formulaId: formula.formulaId,
      calculation: calculation
    };
  }

  function recordProduction(request) {
    var materials = getMaterials();
    var catalog = {};
    materials.forEach(function (material) {
      catalog[material.materialId] = {
        pricePerMg: material.pricePerMg,
        wastageRate: material.wastageRate || 0
      };
    });
    var calculation = costCalculator.calculateBottleCost(request.components, catalog, {
      marginPercentage: request.margin != null ? request.margin : PerfumeConfig.defaultMargin
    });

    var headers = ['timestampIso', 'bottleId', 'formulaId', 'quantityMg', 'cost', 'margin', 'sellingPrice', 'notes'];
    var sheet = ensureSheet_(sheetNames.bottles, headers);
    var timestamp = new Date().toISOString();
    sheet.appendRow([
      timestamp,
      request.bottleId || Utilities.getUuid(),
      request.formulaId || '',
      calculation.components.reduce(function (acc, item) {
        return acc + item.quantityMg;
      }, 0),
      calculation.cost,
      calculation.marginPercentage,
      calculation.sellingPrice,
      request.notes || ''
    ]);

    // Update material stock
    request.components.forEach(function (component) {
      var material = materials.find(function (m) {
        return m.materialId === component.materialId;
      });
      if (material) {
        material.stockMg = Math.max(0, Number(material.stockMg || 0) - Number(component.quantityMg));
        upsertMaterial(material);
      }
    });

    PerfumeLogging.log({
      level: 'info',
      category: 'sheet',
      message: 'Bottle produced',
      details: {
        bottleId: request.bottleId,
        formulaId: request.formulaId,
        cost: calculation.cost,
        sellingPrice: calculation.sellingPrice
      }
    });

    return {
      timestampIso: timestamp,
      calculation: calculation
    };
  }

  return {
    getMaterials: getMaterials,
    recordPurchase: recordPurchase,
    listPurchases: listPurchases,
    saveFormula: saveFormula,
    listFormulas: listFormulas,
    recordProduction: recordProduction
  };
})();
