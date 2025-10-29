var PerfumeLib =
  (typeof globalThis !== 'undefined' && globalThis.PerfumeLib) ||
  (typeof self !== 'undefined' && self.PerfumeLib) ||
  {};

const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'token',
  'secret',
  'key',
  'apiKey',
  'card',
  'authorization',
  'auth',
  'credential'
];

const MASK_VALUE = '[MASKED]';

function isSensitiveKey(key) {
  if (!key) return false;
  const lower = String(key).toLowerCase();
  return SENSITIVE_KEYS.some((keyword) => lower.includes(keyword));
}

function maskValue(value) {
  if (value == null) {
    return value;
  }
  if (typeof value === 'string') {
    return MASK_VALUE;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return MASK_VALUE;
  }
  if (Array.isArray(value)) {
    return value.map(() => MASK_VALUE);
  }
  if (value instanceof Date) {
    return MASK_VALUE;
  }
  return MASK_VALUE;
}

function maskSensitiveFields(input, seen = new WeakSet()) {
  if (input == null || typeof input !== 'object') {
    return input;
  }
  if (seen.has(input)) {
    return input;
  }
  seen.add(input);
  const clone = Array.isArray(input) ? [] : {};
  const entries = Object.entries(input);
  for (const [key, value] of entries) {
    if (isSensitiveKey(key)) {
      clone[key] = maskValue(value);
      continue;
    }
    if (value != null && typeof value === 'object') {
      clone[key] = maskSensitiveFields(value, seen);
    } else {
      clone[key] = value;
    }
  }
  return clone;
}

const exported = {
  maskSensitiveFields,
  isSensitiveKey,
  MASK_VALUE
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}

if (typeof globalThis !== 'undefined') {
  globalThis.PerfumeLib = globalThis.PerfumeLib || {};
  globalThis.PerfumeLib.masker = exported;
}
