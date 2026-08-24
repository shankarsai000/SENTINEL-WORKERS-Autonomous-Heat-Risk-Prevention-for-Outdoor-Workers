import { describe, it, expect } from 'vitest';
import { FortyGuardAdapter } from '../../providers/fortyguard/src/adapter.js';
import { ThermalObservationSchema } from '../../packages/schemas/src/validators.js';

describe('FortyGuard Adapter Contract & Normalization', () => {
  it('submits env_params task and normalizes result to ThermalObservation', async () => {
    const adapter = new FortyGuardAdapter({ offlineFallback: true });

    const submitRes = await adapter.submitEnvParams({
      lat: 33.4484,
      lon: -112.074,
      datetime_spec: new Date().toISOString(),
    });

    expect(submitRes.activity_id).toBeDefined();
    expect(submitRes.status).toBe('COMPLETED');

    const statusRes = await adapter.getStatus(submitRes.activity_id);
    expect(statusRes.status).toBe('COMPLETED');
    expect(statusRes.result).toBeDefined();

    const normalized = adapter.normalize(statusRes, 'PHX-SITE-02');
    const parsed = ThermalObservationSchema.safeParse(normalized);

    expect(parsed.success).toBe(true);
    expect(normalized.source).toBe('fortyguard');
    expect(normalized.site_id).toBe('PHX-SITE-02');
  });

  it('tracks API usage and credit estimates accurately', async () => {
    const adapter = new FortyGuardAdapter({ offlineFallback: true });
    await adapter.getStatus('test_act_1');
    const metrics = adapter.getUsageMetrics();

    expect(metrics.totalCreditsEstimated).toBeGreaterThanOrEqual(1);
    expect(metrics.offlineFallback).toBe(true);
  });
});
