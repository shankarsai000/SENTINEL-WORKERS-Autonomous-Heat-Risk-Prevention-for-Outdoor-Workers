import { describe, it, expect } from 'vitest';
import { FortyGuardCache } from '../../providers/fortyguard/src/cache.js';
import { ThermalObservation } from '@sentinel/schemas';

describe('FortyGuard Semantic In-Memory Cache', () => {
  const mockObs: ThermalObservation = {
    observation_id: 'obs_fg_1',
    site_id: 'PHX-SITE-01',
    timestamp: new Date().toISOString(),
    temperature_c: 41.5,
    humidity_pct: 22,
    wet_bulb_c: 27,
    solar_irradiance: 900,
    source: 'fortyguard',
    freshness_seconds: 0,
    confidence: 0.95,
  };

  it('generates deterministic semantic cache keys', () => {
    const key1 = FortyGuardCache.generateKey('heatmap', {
      lat: 33.4352,
      lon: -112.0101,
      aoi: { type: 'Polygon', coordinates: [] },
      datetime: '2026-08-24T12:00:00Z',
      granularity: 80,
    });

    const key2 = FortyGuardCache.generateKey('heatmap', {
      lat: 33.4352,
      lon: -112.0101,
      aoi: { type: 'Polygon', coordinates: [] },
      datetime: '2026-08-24T12:00:00Z',
      granularity: 80,
    });

    expect(key1).toBe(key2);
    expect(key1).toContain('fg:heatmap:33.4352:-112.0101');
  });

  it('records cache hit and returns unexpired observation', () => {
    const cache = new FortyGuardCache(300);
    const key = 'test_key_1';

    expect(cache.get(key).hit).toBe(false);

    cache.set(key, mockObs);

    const lookup = cache.get(key);
    expect(lookup.hit).toBe(true);
    expect(lookup.isStale).toBe(false);
    expect(lookup.data?.temperature_c).toBe(41.5);

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBe(0.5);
  });

  it('marks data stale when TTL expires', async () => {
    const cache = new FortyGuardCache(0); // 0s TTL -> immediately expired
    const key = 'test_key_stale';

    cache.set(key, mockObs, 0);

    const lookup = cache.get(key);
    expect(lookup.hit).toBe(true);
    expect(lookup.isStale).toBe(true);
  });
});
