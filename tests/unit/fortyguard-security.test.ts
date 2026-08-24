import { describe, it, expect } from 'vitest';
import { redactSecrets, FortyGuardAuthError, FortyGuardServerError } from '../../providers/fortyguard/src/errors.js';
import { FortyGuardClient } from '../../providers/fortyguard/src/client.js';
import { FortyGuardAdapter } from '../../providers/fortyguard/src/adapter.js';

describe('FortyGuard Secret Security & Redaction Guardrails', () => {
  const superSecretKey = 'fg_live_sec_999888777666555444';

  it('redacts configured API key from error messages and text', () => {
    const rawError = `Failed request with api-key: ${superSecretKey} and bearer xyz123`;
    const clean = redactSecrets(rawError, superSecretKey);

    expect(clean).not.toContain(superSecretKey);
    expect(clean).toContain('[REDACTED]');
  });

  it('ensures FortyGuardError instances do not expose API key in message or JSON serialization', () => {
    const err = new FortyGuardAuthError(
      `Invalid key ${superSecretKey} for endpoint /v1/heatmap`,
      'req_123',
      { key: superSecretKey },
      superSecretKey
    );

    expect(err.message).not.toContain(superSecretKey);
    const jsonStr = JSON.stringify(err.toJSON());
    expect(jsonStr).not.toContain(superSecretKey);
  });

  it('returns masked API key in client and adapter status', () => {
    const client = new FortyGuardClient({ apiKey: superSecretKey });
    const masked = client.getMaskedApiKey();

    expect(masked).toBe('fg_l...5444');
    expect(masked).not.toBe(superSecretKey);

    const adapter = new FortyGuardAdapter({ apiKey: superSecretKey });
    const status = adapter.getProviderStatus();
    expect(status.apiKeyMasked).toBe('fg_l...5444');
    expect(JSON.stringify(status)).not.toContain(superSecretKey);
  });
});
