var PerfumeLib =
  (typeof globalThis !== 'undefined' && globalThis.PerfumeLib) ||
  (typeof self !== 'undefined' && self.PerfumeLib) ||
  {};
const { maskSensitiveFields } = (PerfumeLib.masker || {});
const { validateLogEntry } = (PerfumeLib.logSchema || {});

class LogBuffer {
  constructor(options = {}) {
    const {
      capacity = 2000,
      retentionMs = 1000 * 60 * 60 * 24 * 30,
      batchSize = 40,
      persistHandler = null,
      now = () => Date.now()
    } = options;

    this.capacity = capacity;
    this.retentionMs = retentionMs;
    this.batchSize = batchSize;
    this.persistHandler = persistHandler;
    this.now = now;
    this.buffer = [];
    this.batch = [];
    this.lastFlush = 0;
  }

  normalize(entry) {
    const candidate = Object.assign({}, entry);
    candidate.timestamp = candidate.timestamp ? new Date(candidate.timestamp).toISOString() : new Date(this.now()).toISOString();
    candidate.details = candidate.details && typeof candidate.details === 'object' ? candidate.details : {};
    candidate.context = candidate.context && typeof candidate.context === 'object' ? candidate.context : {};
    return candidate;
  }

  add(entry) {
    const normalized = this.normalize(entry);
    const validation = validateLogEntry ? validateLogEntry(normalized) : { valid: true, errors: [] };
    if (!validation.valid) {
      const error = new Error(`Invalid log entry: ${validation.errors.join('; ')}`);
      error.validation = validation;
      throw error;
    }
    const masked = maskSensitiveFields ? maskSensitiveFields(normalized) : normalized;
    this.buffer.push(masked);
    if (this.buffer.length > this.capacity) {
      this.buffer.splice(0, this.buffer.length - this.capacity);
    }
    this.trimRetention();
    this.batch.push(masked);
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
    return masked;
  }

  addMany(entries) {
    if (!Array.isArray(entries)) {
      throw new Error('addMany expects an array.');
    }
    return entries.map((entry) => this.add(entry));
  }

  trimRetention() {
    if (!this.retentionMs) return;
    const threshold = this.now() - this.retentionMs;
    while (this.buffer.length > 0) {
      const entry = this.buffer[0];
      if (Date.parse(entry.timestamp) < threshold) {
        this.buffer.shift();
      } else {
        break;
      }
    }
  }

  flush() {
    if (!this.persistHandler || this.batch.length === 0) {
      this.batch = [];
      return [];
    }
    const payload = this.batch.slice();
    this.batch = [];
    this.lastFlush = this.now();
    this.persistHandler(payload);
    return payload;
  }

  getEntries(filters = {}) {
    const { level, origin, category, search, since } = filters;
    return this.buffer.filter((entry) => {
      if (level && entry.level !== level) return false;
      if (origin && entry.origin !== origin) return false;
      if (category && entry.category !== category) return false;
      if (since && Date.parse(entry.timestamp) < Date.parse(since)) return false;
      if (search) {
        const haystack = JSON.stringify(entry).toLowerCase();
        if (!haystack.includes(String(search).toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }

  stats(filters = {}) {
    const entries = this.getEntries(filters);
    const totals = entries.reduce(
      (acc, entry) => {
        acc.total += 1;
        acc.byLevel[entry.level] = (acc.byLevel[entry.level] || 0) + 1;
        const duration = entry.details && Number(entry.details.durationMs);
        if (Number.isFinite(duration)) {
          acc.timings.count += 1;
          acc.timings.sum += duration;
          acc.timings.max = Math.max(acc.timings.max, duration);
          acc.timings.min = Math.min(acc.timings.min, duration);
        }
        return acc;
      },
      {
        total: 0,
        byLevel: {},
        timings: {
          count: 0,
          sum: 0,
          max: Number.NEGATIVE_INFINITY,
          min: Number.POSITIVE_INFINITY
        }
      }
    );
    if (totals.timings.count === 0) {
      totals.timings.avg = 0;
      totals.timings.max = 0;
      totals.timings.min = 0;
    } else {
      totals.timings.avg = totals.timings.sum / totals.timings.count;
    }
    return totals;
  }

  toJSONL(entries = this.buffer) {
    return entries.map((entry) => JSON.stringify(entry)).join('\n');
  }

  toCSV(entries = this.buffer) {
    if (entries.length === 0) {
      return 'timestamp,level,origin,category,message,sessionId,requestId';
    }
    const header = ['timestamp', 'level', 'origin', 'category', 'message', 'sessionId', 'requestId'];
    const rows = entries.map((entry) =>
      header
        .map((key) => {
          const value = entry[key] != null ? String(entry[key]).replace(/"/g, '""') : '';
          return `"${value}"`;
        })
        .join(',')
    );
    return [header.join(','), ...rows].join('\n');
  }
}

const exported = {
  LogBuffer
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}

if (typeof globalThis !== 'undefined') {
  globalThis.PerfumeLib = globalThis.PerfumeLib || {};
  globalThis.PerfumeLib.logBuffer = exported;
}
