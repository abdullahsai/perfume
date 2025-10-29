var PerfumeLogging = (function () {
  var LogBufferCtor = PerfumeLib && PerfumeLib.logBuffer ? PerfumeLib.logBuffer.LogBuffer : null;
  if (!LogBufferCtor) {
    throw new Error('PerfumeLib.logBuffer is not available. Run npm run build:bundles and include perfumeLibBundle.gs.');
  }

  var logSheetName = PerfumeConfig.sheetNames.logs;

  function ensureLogSheet_() {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(logSheetName);
    if (!sheet) {
      sheet = ss.insertSheet(logSheetName);
      sheet.appendRow([
        'timestamp',
        'level',
        'origin',
        'category',
        'message',
        'details',
        'sessionId',
        'requestId',
        'context'
      ]);
    }
    return sheet;
  }

  function persistLogs_(batch) {
    if (!batch || batch.length === 0) {
      return;
    }
    var sheet = ensureLogSheet_();
    var rows = batch.map(function (entry) {
      return [
        entry.timestamp,
        entry.level,
        entry.origin,
        entry.category,
        entry.message,
        JSON.stringify(entry.details || {}),
        entry.sessionId,
        entry.requestId,
        JSON.stringify(entry.context || {})
      ];
    });
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    enforceLogRetention_(sheet);
  }

  function enforceLogRetention_(sheet) {
    var maxRows = PerfumeConfig.logRetentionRows;
    var lastRow = sheet.getLastRow();
    if (lastRow <= maxRows + 1) {
      return;
    }
    var rowsToDelete = lastRow - (maxRows + 1);
    if (rowsToDelete > 0) {
      sheet.deleteRows(2, rowsToDelete);
    }
  }

  var buffer = new LogBufferCtor({
    capacity: 5000,
    batchSize: 25,
    persistHandler: persistLogs_,
    now: function () {
      return Date.now();
    }
  });

  function enrichEntry_(entry, overrides) {
    var enriched = Object.assign(
      {
        origin: 'server',
        category: 'job',
        sessionId: 'server-session',
        requestId: Utilities.getUuid(),
        context: {
          scriptAppId: ScriptApp.getScriptId(),
          spreadsheetId: getSpreadsheet().getId()
        }
      },
      entry,
      overrides || {}
    );
    if (!enriched.timestamp) {
      enriched.timestamp = new Date().toISOString();
    }
    return enriched;
  }

  function log(entry) {
    return buffer.add(enrichEntry_(entry));
  }

  function logRequest(category, message, details, requestMeta) {
    return log({
      level: 'info',
      origin: 'server',
      category: category || 'http',
      message: message,
      details: details || {},
      requestId: (requestMeta && requestMeta.requestId) || Utilities.getUuid(),
      sessionId: (requestMeta && requestMeta.sessionId) || 'server-session',
      context: Object.assign(
        {
          scriptAppId: ScriptApp.getScriptId()
        },
        requestMeta && requestMeta.context
      )
    });
  }

  function logError(message, error, context) {
    var details = {
      stack: error && error.stack,
      name: error && error.name
    };
    if (error && error.details) {
      details.details = error.details;
    }
    return log({
      level: 'error',
      category: 'job',
      message: message,
      details: details,
      context: context || {}
    });
  }

  function recordClientBatch(batch, meta) {
    if (!Array.isArray(batch)) {
      throw new Error('Client log batch must be an array.');
    }
    return buffer.addMany(
      batch.map(function (entry) {
        return enrichEntry_(entry, {
          origin: 'client',
          sessionId: (meta && meta.sessionId) || entry.sessionId,
          requestId: (meta && meta.requestId) || entry.requestId || Utilities.getUuid()
        });
      })
    );
  }

  function fetchLogs(filters) {
    var normalizedFilters = filters || {};
    return {
      entries: buffer.getEntries(normalizedFilters),
      stats: buffer.stats(normalizedFilters)
    };
  }

  function exportLogs(filters, format) {
    var entries = buffer.getEntries(filters || {});
    if (format === 'csv') {
      return buffer.toCSV(entries);
    }
    return buffer.toJSONL(entries);
  }

  function flush() {
    buffer.flush();
  }

  return {
    log: log,
    logRequest: logRequest,
    logError: logError,
    recordClientBatch: recordClientBatch,
    fetchLogs: fetchLogs,
    exportLogs: exportLogs,
    flush: flush
  };
})();
