import { describe, it, expect } from 'vitest';
import { FortyGuardPoller } from '../../providers/fortyguard/src/poller.js';
import { FortyGuardClient } from '../../providers/fortyguard/src/client.js';
import { FortyGuardTimeoutError } from '../../providers/fortyguard/src/errors.js';

describe('FortyGuard Bounded Asynchronous Poller', () => {
  it('polls status until activity reaches COMPLETED', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      if (callCount < 3) {
        return new Response(JSON.stringify({ activity_id: 'act_1', status: 'PROCESSING' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          activity_id: 'act_1',
          status: 'COMPLETED',
          result: { temperature_c: 42.5, humidity_pct: 20 },
        }),
        { status: 200 }
      );
    };

    const client = new FortyGuardClient({ apiKey: 'test_key', fetchFn: mockFetch as any });
    const poller = new FortyGuardPoller(client, {
      pollIntervalMs: 1,
      maxAttempts: 10,
      sleepFn: async () => {}, // Instant sleep for tests
    });

    const activity = await poller.pollActivity('act_1', 'heatmap');
    expect(activity.status).toBe('COMPLETED');
    expect(activity.attempts).toBe(3);
    expect(activity.result?.temperature_c).toBe(42.5);
  });

  it('stops polling and returns FAILED when activity status is FAILED', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ activity_id: 'act_err', status: 'FAILED', error: 'Invalid coordinate bounds' }), {
        status: 200,
      });

    const client = new FortyGuardClient({ apiKey: 'test_key', fetchFn: mockFetch as any });
    const poller = new FortyGuardPoller(client, {
      pollIntervalMs: 1,
      maxAttempts: 5,
      sleepFn: async () => {},
    });

    const activity = await poller.pollActivity('act_err', 'heatmap');
    expect(activity.status).toBe('FAILED');
    expect(activity.error_code).toBe('PROVIDER_TASK_FAILED');
  });

  it('times out and throws FortyGuardTimeoutError if maxAttempts is exceeded', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ activity_id: 'act_slow', status: 'PROCESSING' }), { status: 200 });

    const client = new FortyGuardClient({ apiKey: 'test_key', fetchFn: mockFetch as any });
    const poller = new FortyGuardPoller(client, {
      pollIntervalMs: 1,
      maxAttempts: 4,
      sleepFn: async () => {},
    });

    await expect(poller.pollActivity('act_slow', 'heatmap')).rejects.toThrow(FortyGuardTimeoutError);
  });
});
