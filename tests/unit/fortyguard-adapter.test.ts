import { describe, it, expect } from 'vitest';
import { FortyGuardAdapter } from '../../providers/fortyguard/src/adapter.js';
import { ThermalObservationSchema } from '../../packages/schemas/src/validators.js';
import { PHOENIX_CONSTRUCTION_SITES } from '../../packages/simulation/src/sites-config.js';

describe('FortyGuard Adapter High-Level Facade', () => {
  it('generates valid closed GeoJSON Polygon AOI around coordinates', () => {
    const aoi = FortyGuardAdapter.generateSitePolygonAoi(33.4484, -112.074, 300);

    expect(aoi.type).toBe('Polygon');
    expect(aoi.coordinates[0]).toHaveLength(5);
    // Closed ring check: first === last
    expect(aoi.coordinates[0][0]).toEqual(aoi.coordinates[0][4]);
  });

  it('fetches site heatmap observation, caches it, and returns cache hit on subsequent calls', async () => {
    let callCount = 0;
    const mockFetch = async (url: string, init?: any) => {
      callCount++;
      if (url.includes('/v1/heatmap')) {
        return new Response(
          JSON.stringify({
            activity_id: 'act_hm_mock_1',
            status: 'PENDING',
            submitted_at: '2026-08-24T12:00:00Z',
          }),
          { status: 200 }
        );
      }
      if (url.includes('/v1/status/act_hm_mock_1')) {
        return new Response(
          JSON.stringify({
            activity_id: 'act_hm_mock_1',
            status: 'COMPLETED',
            result: {
              temperature_c: 43.2,
              humidity_pct: 22,
              wet_bulb_c: 26.5,
              solar_irradiance: 950,
              observed_at: '2026-08-24T12:00:00Z',
            },
          }),
          { status: 200 }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const adapter = new FortyGuardAdapter({
      apiKey: 'test_key_abc',
      fetchFn: mockFetch as any,
      pollIntervalMs: 1,
      sleepFn: async () => {},
    });

    const testSite = PHOENIX_CONSTRUCTION_SITES[0];

    // First call -> Cache Miss -> HTTP fetch
    const firstRes = await adapter.fetchSiteHeatmapObservation(testSite);
    expect(firstRes.cacheHit).toBe(false);
    expect(firstRes.observation.temperature_c).toBe(43.2);
    expect(firstRes.observation.source).toBe('fortyguard');
    const parsed = ThermalObservationSchema.safeParse(firstRes.observation);
    expect(parsed.success).toBe(true);

    // Second call -> Cache Hit
    const secondRes = await adapter.fetchSiteHeatmapObservation(testSite);
    expect(secondRes.cacheHit).toBe(true);
    expect(secondRes.observation.source).toBe('fortyguard_cache');

    // Provider status check
    const status = adapter.getProviderStatus();
    expect(status.configured).toBe(true);
    expect(status.cacheStats.hits).toBe(1);
  });

  it('tests connection and reports capability discovery', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Activity not found' }), { status: 404 });
    const adapter = new FortyGuardAdapter({
      apiKey: 'test_key_valid',
      fetchFn: mockFetch as any,
    });

    const capabilities = await adapter.testConnection();
    expect(capabilities.configured).toBe(true);
    expect(capabilities.authenticated).toBe(true);
    expect(capabilities.heatmap).toBe(true);
  });
});
