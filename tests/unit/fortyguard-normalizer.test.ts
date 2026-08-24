import { describe, it, expect } from 'vitest';
import { normalizeFortyGuardResult } from '../../providers/fortyguard/src/normalizer.js';
import { ThermalObservationSchema } from '@sentinel/schemas';

describe('FortyGuard Normalization & Freshness Engine', () => {
  it('normalizes complete provider response into schema-valid ThermalObservation', () => {
    const rawResult = {
      location: { lat: 33.4484, lon: -112.074 },
      temperature_c: 44.5,
      humidity_pct: 18.0,
      wet_bulb_c: 27.2,
      apparent_temperature_c: 46.1,
      solar_irradiance: 1020,
      observed_at: '2026-08-24T12:00:00.000Z',
    };

    const obs = normalizeFortyGuardResult(rawResult, {
      siteId: 'PHX-SITE-02',
      activityId: 'act_test_norm',
      referenceTimeMs: new Date('2026-08-24T12:01:00.000Z').getTime(), // 60s later
    });

    const parsed = ThermalObservationSchema.safeParse(obs);
    expect(parsed.success).toBe(true);
    expect(obs.source).toBe('fortyguard');
    expect(obs.freshness_seconds).toBe(60);
    expect(obs.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('handles missing optional fields and derives wet bulb gracefully', () => {
    const minimalResult = {
      temperature_c: 40.0,
      humidity_pct: 30.0,
      // wet_bulb_c, solar_irradiance, apparent_temp omitted
    };

    const obs = normalizeFortyGuardResult(minimalResult, {
      siteId: 'PHX-SITE-01',
      activityId: 'act_test_min',
    });

    expect(obs.temperature_c).toBe(40.0);
    expect(obs.wet_bulb_c).toBeGreaterThan(20);
    expect(obs.confidence).toBeLessThan(0.95); // Confidence discounted for missing fields
  });

  it('applies fortyguard_cache source and freshness calculation on cached results', () => {
    const rawResult = {
      temperature_c: 42.0,
      observed_at: '2026-08-24T11:50:00.000Z',
    };

    const obs = normalizeFortyGuardResult(rawResult, {
      siteId: 'PHX-SITE-03',
      activityId: 'act_cached_1',
      isCached: true,
      referenceTimeMs: new Date('2026-08-24T12:00:00.000Z').getTime(), // 600s age (10m)
    });

    expect(obs.source).toBe('fortyguard_cache');
    expect(obs.freshness_seconds).toBe(600);
    expect(obs.confidence).toBeLessThan(0.85); // Stale penalty applied
  });
});
