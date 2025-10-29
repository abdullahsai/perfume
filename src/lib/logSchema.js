var PerfumeLib =
  (typeof globalThis !== 'undefined' && globalThis.PerfumeLib) ||
  (typeof self !== 'undefined' && self.PerfumeLib) ||
  {};

const LEVELS = ['debug', 'info', 'warn', 'error'];
const ORIGINS = ['client', 'server'];
const CATEGORIES = ['auth', 'sheet', 'ui', 'http', 'job'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function validateLogEntry(entry) {
  const errors = [];
  if (!isPlainObject(entry)) {
    errors.push('Log entry must be an object.');
    return { valid: false, errors };
  }

  if (!isNonEmptyString(entry.timestamp) || Number.isNaN(Date.parse(entry.timestamp))) {
    errors.push('timestamp must be an ISO string.');
  }
  if (!LEVELS.includes(entry.level)) {
    errors.push(`level must be one of ${LEVELS.join(', ')}.`);
  }
  if (!ORIGINS.includes(entry.origin)) {
    errors.push(`origin must be one of ${ORIGINS.join(', ')}.`);
  }
  if (!CATEGORIES.includes(entry.category)) {
    errors.push(`category must be one of ${CATEGORIES.join(', ')}.`);
  }
  if (!isNonEmptyString(entry.message)) {
    errors.push('message must be a non-empty string.');
  }
  if (!isPlainObject(entry.details)) {
    errors.push('details must be an object.');
  }
  if (!isNonEmptyString(entry.sessionId)) {
    errors.push('sessionId is required.');
  }
  if (!isNonEmptyString(entry.requestId)) {
    errors.push('requestId is required.');
  }
  if (!isPlainObject(entry.context)) {
    errors.push('context must be an object.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

const exported = {
  LEVELS,
  ORIGINS,
  CATEGORIES,
  validateLogEntry
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}

if (typeof globalThis !== 'undefined') {
  globalThis.PerfumeLib = globalThis.PerfumeLib || {};
  globalThis.PerfumeLib.logSchema = exported;
}
