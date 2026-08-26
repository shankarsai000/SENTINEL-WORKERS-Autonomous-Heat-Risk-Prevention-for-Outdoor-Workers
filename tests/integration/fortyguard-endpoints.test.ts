import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { SentinelDatabase } from '../../apps/api/src/db/database.js';
import { createFortyGuardRouter } from '../../apps/api/src/routes/fortyguard.js';
import { FortyGuardAdapter } from '../../providers/fortyguard/src/index.js';

describe('Phase P1-R: FortyGuard Backend REST Integration Endpoints', () => {
  let server: http.Server;
  let baseUrl: string;
  let db: SentinelDatabase;
  let adapter: FortyGuardAdapter;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    db = new SentinelDatabase('./test-fg-endpoints.db');

    const mockFetch = async (url: string, init: any) => {
      if (url.includes('/v1/heatmap')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: { activity_id: 'act_test_heatmap_999', submitted_at: new Date().toISOString() },
          }),
          { status: 200 }
        );
      }
      if (url.includes('/v1/status/act_test_heatmap_999')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              activity_id: 'act_test_heatmap_999',
              status: 'Completed',
              result: {
                stats_data: { min: 35.0, max: 44.0, mean: 41.2, std_dev: 1.6 },
                heat_index: 43.8,
                wet_bulb_temperature: 28.0,
                relative_humidity: 25.0,
              },
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('/v1/env_params')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: { activity_id: 'act_test_env_888', submitted_at: new Date().toISOString() },
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ status: 'success', data: { status: 'Completed' } }), { status: 200 });
    };

    adapter = new FortyGuardAdapter({
      apiKey: 'test_sec_key_123',
      fetchFn: mockFetch as any,
    });

    app.use('/api', createFortyGuardRouter(adapter, undefined, db));

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
    const fs = await import('fs');
    for (const f of fs.readdirSync('.')) {
      if (f.startsWith('test-fg-endpoints.db')) {
        try { fs.unlinkSync(f); } catch {}
      }
    }
  });

  it('GET /api/integrations/fortyguard/status returns safe diagnostic status with zero key leakage', async () => {
    const res = await fetch(`${baseUrl}/api/integrations/fortyguard/status`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.provider).toBe('FortyGuard');
    expect(body.configured).toBe(true);
    expect(body.reachable).toBe(true);
    expect(body.source).toBeDefined();

    // Verify ZERO secret leakage
    const jsonStr = JSON.stringify(body);
    expect(jsonStr).not.toContain('test_sec_key_123');
    expect(body.apiKey).toBeUndefined();
    expect(body.api_key).toBeUndefined();
  });

  it('POST /api/integrations/fortyguard/heatmap executes controlled submission and records activity', async () => {
    const res = await fetch(`${baseUrl}/api/integrations/fortyguard/heatmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: 'PHX-SITE-01',
        granularity: 80,
      }),
    });

    const body = await res.json();
    if (res.status !== 200) {
      console.error('Heatmap error response:', body);
    }
    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.observation.temperature_c).toBe(41.2);
    expect(body.observation.provenance?.activity_id).toBe('act_test_heatmap_999');

    // Verify activity persisted in DB
    const act = db.getFortyGuardActivity('act_test_heatmap_999');
    expect(act).toBeDefined();
    expect(act.endpoint).toBe('/v1/heatmap');
    expect(act.status).toBe('COMPLETED');
  });

  it('POST /api/integrations/fortyguard/environment executes env params query and records activity', async () => {
    const res = await fetch(`${baseUrl}/api/integrations/fortyguard/environment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: 'PHX-SITE-01',
        temperature: 39.0,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.submission.data.activity_id).toBe('act_test_env_888');

    // Verify activity persisted in DB
    const act = db.getFortyGuardActivity('act_test_env_888');
    expect(act).toBeDefined();
    expect(act.endpoint).toBe('/v1/env_params');
  });

  it('GET /api/integrations/fortyguard/activities returns list of persisted activities', async () => {
    const res = await fetch(`${baseUrl}/api/integrations/fortyguard/activities`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.activities[0].activity_id).toBeDefined();
  });
});
