import { describe, it, expect } from 'vitest';
import { FortyGuardAdapter } from '../../providers/fortyguard/src/adapter.js';
import { PHOENIX_CONSTRUCTION_SITES } from '../../packages/simulation/src/sites-config.js';

describe('FortyGuard Gated Live Integration', () => {
  const isLiveEnabled = process.env.RUN_FORTYGUARD_LIVE_TESTS === 'true';
  const apiKey = process.env.FORTYGUARD_API_KEY;

  it('runs live FortyGuard API request when gated flag and credentials are provided', async () => {
    if (!isLiveEnabled || !apiKey) {
      console.log('LIVE PROVIDER TEST: BLOCKED — credential unavailable or RUN_FORTYGUARD_LIVE_TESTS not enabled');
      expect(true).toBe(true);
      return;
    }

    const adapter = new FortyGuardAdapter({
      apiKey,
      baseUrl: process.env.FORTYGUARD_API_BASE_URL || 'https://api.fortyguard.com',
      offlineFallback: false,
    });

    const testSite = PHOENIX_CONSTRUCTION_SITES[0];
    const { observation, cacheHit } = await adapter.fetchSiteHeatmapObservation(testSite);

    expect(observation).toBeDefined();
    expect(observation.source).toBe('fortyguard');
    expect(observation.temperature_c).toBeGreaterThan(-20);
    expect(observation.confidence).toBeGreaterThan(0);
    expect(cacheHit).toBe(false);

    // Verify cache hit on immediate second query
    const secondQuery = await adapter.fetchSiteHeatmapObservation(testSite);
    expect(secondQuery.cacheHit).toBe(true);
  });
});
