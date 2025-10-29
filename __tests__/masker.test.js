const { maskSensitiveFields, isSensitiveKey, MASK_VALUE } = require('../src/lib/masker');

describe('masker', () => {
  it('masks sensitive keys recursively', () => {
    const input = {
      username: 'user',
      password: 'secret',
      profile: {
        token: 'abc',
        nested: {
          apiKey: 'xyz',
          list: [
            { cardNumber: '1234', name: 'a' },
            'value'
          ]
        }
      }
    };

    const result = maskSensitiveFields(input);
    expect(result.password).toBe(MASK_VALUE);
    expect(result.profile.token).toBe(MASK_VALUE);
    expect(result.profile.nested.apiKey).toBe(MASK_VALUE);
    expect(result.profile.nested.list[0].cardNumber).toBe(MASK_VALUE);
    expect(result.profile.nested.list[0].name).toBe('a');
  });

  it('ignores non-sensitive keys', () => {
    const input = { name: 'perfume', quantity: 10 };
    expect(maskSensitiveFields(input)).toEqual(input);
  });

  it('detects sensitive key names', () => {
    expect(isSensitiveKey('Password')).toBe(true);
    expect(isSensitiveKey('session')).toBe(false);
  });

  it('handles arrays and primitive values', () => {
    const input = {
      items: [
        { secretCode: 1234, value: 'ok' },
        'plain text'
      ],
      tokenList: ['abc', 'def']
    };
    const result = maskSensitiveFields(input);
    expect(result.items[0].secretCode).toBe(MASK_VALUE);
    expect(result.items[0].value).toBe('ok');
    expect(result.tokenList[0]).toBe(MASK_VALUE);
  });

  it('avoids infinite recursion with cyclic objects', () => {
    const obj = { password: 'abc' };
    obj.self = obj;
    const result = maskSensitiveFields(obj);
    expect(result.password).toBe(MASK_VALUE);
    expect(result.self).toBe(obj.self);
  });
});
