const { validateLogEntry, LEVELS, ORIGINS, CATEGORIES } = require('../src/lib/logSchema');

describe('logSchema', () => {
  const validEntry = {
    timestamp: new Date().toISOString(),
    level: LEVELS[0],
    origin: ORIGINS[0],
    category: CATEGORIES[0],
    message: 'Test message',
    details: {},
    sessionId: 'session-1',
    requestId: 'request-1',
    context: {}
  };

  it('validates a proper log entry', () => {
    expect(validateLogEntry(validEntry).valid).toBe(true);
  });

  it('rejects missing fields', () => {
    const { valid, errors } = validateLogEntry({});
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid enums', () => {
    const entry = { ...validEntry, level: 'fatal' };
    const { valid, errors } = validateLogEntry(entry);
    expect(valid).toBe(false);
    expect(errors.join(' ')).toContain('level');
  });
});
