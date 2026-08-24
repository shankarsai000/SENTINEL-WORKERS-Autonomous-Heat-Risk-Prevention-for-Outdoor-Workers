import { describe, it, expect } from 'vitest';
import { FortyGuardClient } from '../../providers/fortyguard/src/client.js';
import {
  FortyGuardAuthError,
  FortyGuardPlanError,
  FortyGuardInvalidRequestError,
  FortyGuardNotFoundError,
  FortyGuardRateLimitError,
  FortyGuardServerError,
  FortyGuardTimeoutError,
  FortyGuardUnavailableError,
} from '../../providers/fortyguard/src/errors.js';

describe('FortyGuard HTTP Client & Transport Security', () => {
  it('throws FortyGuardAuthError if API key is unconfigured', async () => {
    const client = new FortyGuardClient({ apiKey: '' });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardAuthError);
  });

  it('sends api-key header and Content-Type in requests', async () => {
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = async (_url: any, init: any) => {
      capturedHeaders = init.headers;
      return new Response(JSON.stringify({ activity_id: 'act_123', status: 'PENDING', submitted_at: '2026-08-24T12:00:00Z' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = new FortyGuardClient({
      apiKey: 'test_secret_key_456',
      fetchFn: mockFetch as any,
    });

    await client.post('/v1/heatmap', { test: true });

    expect(capturedHeaders['api-key']).toBe('test_secret_key_456');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedHeaders['x-correlation-id']).toBeDefined();
    expect(capturedHeaders['Authorization']).toBeUndefined(); // Strictly NO Bearer
  });

  it('maps HTTP 400 to FortyGuardInvalidRequestError', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Invalid AOI polygon' }), { status: 400 });
    const client = new FortyGuardClient({ apiKey: 'k', fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardInvalidRequestError);
  });

  it('maps HTTP 401 to FortyGuardAuthError', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Unauthorized key' }), { status: 401 });
    const client = new FortyGuardClient({ apiKey: 'k', fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardAuthError);
  });

  it('maps HTTP 403 to FortyGuardPlanError', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Plan does not include this feature' }), { status: 403 });
    const client = new FortyGuardClient({ apiKey: 'k', fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardPlanError);
  });

  it('maps HTTP 404 to FortyGuardNotFoundError', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Activity not found' }), { status: 404 });
    const client = new FortyGuardClient({ apiKey: 'k', fetchFn: mockFetch as any });
    await expect(client.get('/v1/status/act_unknown', undefined, undefined, false)).rejects.toThrow(FortyGuardNotFoundError);
  });

  it('maps HTTP 429 to FortyGuardRateLimitError', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
    const client = new FortyGuardClient({ apiKey: 'k', fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardRateLimitError);
  });

  it('maps HTTP 500 to FortyGuardServerError', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    const client = new FortyGuardClient({ apiKey: 'k', fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardServerError);
  });

  it('maps network failures to FortyGuardUnavailableError', async () => {
    const mockFetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    const client = new FortyGuardClient({ apiKey: 'k', fetchFn: mockFetch as any });
    await expect(client.post('/v1/heatmap', {})).rejects.toThrow(FortyGuardUnavailableError);
  });
});
