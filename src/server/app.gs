function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  try {
    PerfumeLogging.logRequest('ui', 'Serving UI', { query: e && e.parameter });
  } catch (error) {
    // ignore logging failures
  }
  var template = HtmlService.createTemplateFromFile('client/index');
  template.context = {
    sessionId: Utilities.getUuid()
  };
  return template.evaluate().setTitle('Perfume Production');
}

function getInitialData() {
  try {
    PerfumeLogging.logRequest('http', 'Loading initial data', {}, { requestId: Utilities.getUuid() });
    return {
      materials: PerfumeSheets.getMaterials(),
      formulas: PerfumeSheets.listFormulas(),
      purchases: PerfumeSheets.listPurchases(50),
      logs: PerfumeLogging.fetchLogs({}).entries.slice(-200)
    };
  } catch (error) {
    PerfumeLogging.logError('Failed to load initial data', error, { stage: 'getInitialData' });
    throw error;
  }
}

function recordPurchaseApi(payload) {
  try {
    PerfumeLogging.logRequest('http', 'Recording purchase', payload);
    var result = PerfumeSheets.recordPurchase(payload);
    return {
      material: result.material,
      purchase: result.purchase,
      materials: PerfumeSheets.getMaterials(),
      purchases: PerfumeSheets.listPurchases(50)
    };
  } catch (error) {
    PerfumeLogging.logError('Failed to record purchase', error, { payload: payload });
    throw error;
  }
}

function saveFormulaApi(payload) {
  try {
    PerfumeLogging.logRequest('http', 'Saving formula', { formulaId: payload.formulaId });
    var result = PerfumeSheets.saveFormula(payload);
    return {
      formulaId: result.formulaId,
      calculation: result.calculation,
      formulas: PerfumeSheets.listFormulas()
    };
  } catch (error) {
    PerfumeLogging.logError('Failed to save formula', error, { payload: payload });
    throw error;
  }
}

function recordProductionApi(payload) {
  try {
    PerfumeLogging.logRequest('http', 'Recording production', { formulaId: payload.formulaId });
    var result = PerfumeSheets.recordProduction(payload);
    return {
      production: result,
      materials: PerfumeSheets.getMaterials()
    };
  } catch (error) {
    PerfumeLogging.logError('Failed to record production', error, { payload: payload });
    throw error;
  }
}

function fetchLogsApi(filters) {
  return PerfumeLogging.fetchLogs(filters || {});
}

function exportLogsApi(filters, format) {
  return PerfumeLogging.exportLogs(filters || {}, format || 'jsonl');
}

function recordClientLogs(batch, meta) {
  return PerfumeLogging.recordClientBatch(batch, meta || {});
}
