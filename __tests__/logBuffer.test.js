require('../src/lib/masker');
require('../src/lib/logSchema');

const { LogBuffer } = require('../src/lib/logBuffer');
const { MASK_VALUE } = require('../src/lib/masker');

const baseEntry = () => ({
  timestamp: new Date().toISOString(),
  level: 'info',
  origin: 'server',
  category: 'sheet',
  message: 'ok',
  details: { durationMs: 10, payloadSize: 50 },
  sessionId: 'session',
  requestId: 'req-1',
  context: { environment: 'test' }
});

describe('LogBuffer', () => {
  it('masks sensitive data on add', () => {
    const buffer = new LogBuffer();
    const entry = baseEntry();
    entry.details.password = 'secret';
    buffer.add(entry);
    const stored = buffer.getEntries()[0];
    expect(stored.details.password).toBe(MASK_VALUE);
  });

  it('throws when entry invalid', () => {
    const buffer = new LogBuffer();
    expect(() => buffer.add({ message: 'missing fields' })).toThrow('Invalid log entry');
  });

  it('flushes batches to persistence handler', () => {
    const persisted = [];
    const buffer = new LogBuffer({ batchSize: 2, persistHandler: (batch) => persisted.push(batch) });
    buffer.add(baseEntry());
    expect(persisted).toHaveLength(0);
    buffer.add(baseEntry());
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toHaveLength(2);
  });

  it('filters and computes stats', () => {
    const buffer = new LogBuffer();
    buffer.add(baseEntry());
    buffer.add({ ...baseEntry(), level: 'error', details: { durationMs: 20 }, requestId: 'req-2' });
    const errors = buffer.getEntries({ level: 'error' });
    expect(errors).toHaveLength(1);
    const stats = buffer.stats();
    expect(stats.total).toBe(2);
    expect(stats.byLevel.error).toBe(1);
    expect(stats.timings.avg).toBeGreaterThan(0);
  });

  it('exports to JSONL and CSV', () => {
    const buffer = new LogBuffer();
    buffer.add(baseEntry());
    const jsonl = buffer.toJSONL();
    expect(jsonl.split('\n')).toHaveLength(1);
    const csv = buffer.toCSV();
    expect(csv).toContain('timestamp');
  });
});
