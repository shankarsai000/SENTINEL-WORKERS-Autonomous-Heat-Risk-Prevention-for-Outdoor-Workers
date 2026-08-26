import { describe, it, expect } from 'vitest';
import {
  FortyGuardClient,
  submitHeatmapRequest,
  submitEnvParamsRequest,
  fetchActivityStatus,
  ActivityPoller,
  normalizeFortyGuardResult,
  FortyGuardAdapter,
  FortyGuardInvalidRequestError,
  FortyGuardAuthError,
  FortyGuardPlanError,
  FortyGuardNotFoundError,
  FortyGuardValidationError,
  FortyGuardRateLimitError,
  FortyGuardServerError,
  FortyGuardTimeoutError,
  FortyGuardUnavailableError,
  FortyGuardError,
} from '../../providers/fortyguard/src/index.js';

describe('Phase P1-R: FortyGuard Official API Contract & Schema Tests', () => {
  const mockApiKey = 'fg_test_secret_key_mock_999';

  const validPolygon: [number, number][][] = [
    [
      [-112.0785, 33.4445],
      [-112.0785, 33.4525],
      [-112.0695, 33.4525],
      [-112.0695, 33.4445],
      [-112.0785, 33.4445], // Closed ring
    ],
  ];

  // --- 1. Heatmap Submission Contract (POST /v1/heatmap) ---

  it('submits valid heatmap request and extracts activity_id', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        activity_id: 'act_heat_2026_phx_001',
        submitted_at: '2026-08-26T12:00:00Z',
        estimated_credits: 5,
      },
    };

    let capturedUrl = '';
    let capturedBody: any = null;
    let capturedHeaders: any = null;

    const mockFetch = async (url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      capturedHeaders = init.headers;
      return new Response(JSON.stringify(mockResponse), { status: 200 });
    };

    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });

    const submission = await submitHeatmapRequest(client, {
      polygon_aoi: { type: 'Polygon', coordinates: validPolygon },
      date_time: '2026-08-26T12:00:00Z',
      granularity: 80,
    });

    expect(capturedUrl).toContain('/v1/heatmap');
    expect(capturedHeaders['api-key']).toBe(mockApiKey);
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedBody.granularity).toBe(80);
    expect(submission.data.activity_id).toBe('act_heat_2026_phx_001');
  });

  // --- 2. Environmental Parameters Submission Contract (POST /v1/env_params) ---

  it('submits valid environmental parameters request', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        activity_id: 'act_env_2026_phx_002',
        submitted_at: '2026-08-26T12:00:00Z',
      },
    };

    const mockFetch = async () => new Response(JSON.stringify(mockResponse), { status: 200 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });

    const submission = await submitEnvParamsRequest(client, {
      latitude: 33.4484,
      longitude: -112.074,
      temperature: 38.5,
      date_time: '2026-08-26T12:00:00Z',
    });

    expect(submission.data.activity_id).toBe('act_env_2026_phx_002');
  });

  // --- 3. Status Polling Contract (GET /v1/status/{activity_id}) ---

  it('retrieves Processing activity status correctly', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        activity_id: 'act_heat_001',
        status: 'Processing',
        submitted_at: '2026-08-26T12:00:00Z',
      },
    };

    const mockFetch = async () => new Response(JSON.stringify(mockResponse), { status: 200 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });

    const statusRes = await fetchActivityStatus(client, 'act_heat_001');
    expect(statusRes.data.status).toBe('Processing');
    expect(statusRes.data.activity_id).toBe('act_heat_001');
  });

  it('retrieves Completed activity status with GeoJSON and stats_data', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        activity_id: 'act_heat_001',
        status: 'Completed',
        submitted_at: '2026-08-26T12:00:00Z',
        completed_at: '2026-08-26T12:00:04Z',
        credits_used: 5,
        result: {
          map_data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: validPolygon },
                properties: { temp: 42.1 },
              },
            ],
          },
          stats_data: {
            min: 36.2,
            max: 43.8,
            mean: 41.5,
            std_dev: 1.8,
          },
          heat_index: 44.2,
          wet_bulb_temperature: 28.5,
          relative_humidity: 25.0,
          solar_irradiance: { ghi: 850, dni: 920, dhi: 110 },
        },
      },
    };

    const mockFetch = async () => new Response(JSON.stringify(mockResponse), { status: 200 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });

    const statusRes = await fetchActivityStatus(client, 'act_heat_001');
    expect(statusRes.data.status).toBe('Completed');
    expect(statusRes.data.result?.stats_data?.mean).toBe(41.5);
  });

  // --- 4. Bounded Polling Loop & Terminal Failure ---

  it('polls boundedly until Completed', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      if (callCount < 3) {
        return new Response(JSON.stringify({ data: { activity_id: 'act_01', status: 'Processing' } }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          data: {
            activity_id: 'act_01',
            status: 'Completed',
            result: { stats_data: { mean: 40.0 } },
          },
        }),
        { status: 200 }
      );
    };

    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });
    const poller = new ActivityPoller(client, {
      pollIntervalMs: 5,
      sleepFn: async () => {},
    });

    const result = await poller.pollUntilComplete('act_01');
    expect(result.data.status).toBe('Completed');
    expect(callCount).toBe(3);
  });

  it('immediately halts polling and throws if activity status is Failed', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          data: {
            activity_id: 'act_fail_01',
            status: 'Failed',
            error: 'AOI contains unsupported terrain',
          },
        }),
        { status: 200 }
      );

    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });
    const poller = new ActivityPoller(client, {
      pollIntervalMs: 5,
      sleepFn: async () => {},
    });

    await expect(poller.pollUntilComplete('act_fail_01')).rejects.toThrow('AOI contains unsupported terrain');
  });

  // --- 5. Error Code Mapping Matrix ---

  it('maps HTTP 400 to INVALID_REQUEST', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Malformed polygon' }), { status: 400 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardInvalidRequestError);
  });

  it('maps HTTP 401 to AUTHENTICATION_FAILED', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardAuthError);
  });

  it('maps HTTP 403 to PLAN_ACCESS_DENIED', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Plan does not allow granularity 60' }), { status: 403 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardPlanError);
  });

  it('maps HTTP 404 to ACTIVITY_NOT_FOUND', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Activity act_xyz not found' }), { status: 404 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });
    await expect(fetchActivityStatus(client, 'act_xyz')).rejects.toThrow(FortyGuardNotFoundError);
  });

  it('maps HTTP 422 to VALIDATION_ERROR', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Unprocessable Entity' }), { status: 422 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardValidationError);
  });

  it('maps HTTP 429 to RATE_LIMITED', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any, maxRetries: 0 });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardRateLimitError);
  });

  it('maps HTTP 500 to PROVIDER_ERROR', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    const client = new FortyGuardClient({ apiKey: mockApiKey, fetchFn: mockFetch as any, maxRetries: 0 });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardServerError);
  });

  // --- 6. Normalization & ThermalObservation Schema Validation ---

  it('normalizes Completed result into a standard ThermalObservation', () => {
    const rawResult = {
      map_data: { type: 'FeatureCollection', features: [] },
      stats_data: {
        min: 34.0,
        max: 42.0,
        mean: 39.5,
        std_dev: 1.5,
      },
      heat_index: 43.1,
      wet_bulb_temperature: 27.2,
      relative_humidity: 28.0,
      solar_irradiance: { ghi: 800 },
    };

    const obs = normalizeFortyGuardResult(rawResult, {
      siteId: 'PHX-SITE-01',
      activityId: 'act_heat_001',
      source: 'FORTYGUARD_LIVE',
    });

    expect(obs.temperature_c).toBe(39.5);
    expect(obs.wet_bulb_c).toBe(27.2);
    expect(obs.humidity_pct).toBe(28.0);
    expect(obs.solar_irradiance).toBe(800);
    expect(obs.provenance?.source).toBe('FORTYGUARD_LIVE');
    expect(obs.provenance?.activity_id).toBe('act_heat_001');
    expect(obs.provenance?.data_quality?.freshness).toBe('FRESH');
  });

  // --- 7. US-Only Location Boundary Enforcement ---

  it('rejects coordinates outside the United States with validation error', async () => {
    const client = new FortyGuardClient({ apiKey: mockApiKey });

    // Non-US coordinate (e.g. Dubai 25.2° N, 55.3° E or India 13.0° N, 80.2° E)
    await expect(
      submitHeatmapRequest(client, {
        polygon_aoi: {
          type: 'Polygon',
          coordinates: [
            [
              [55.3, 25.2],
              [55.3, 25.3],
              [55.4, 25.3],
              [55.4, 25.2],
              [55.3, 25.2],
            ],
          ],
        },
        date_time: '2026-08-26T12:00:00Z',
        granularity: 80,
      })
    ).rejects.toThrow(/outside the United States/);
  });
});
