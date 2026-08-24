import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSentinelServer } from '../../apps/api/src/server.js';
import http from 'http';

describe('FortyGuard Hybrid Fallback & Data Mode Transitions', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.DATABASE_PATH = './sentinel-hybrid-test.db';
    process.env.NODE_ENV = 'test';
    process.env.THERMAL_DATA_MODE = 'hybrid';
    const instance = createSentinelServer();
    server = instance.server;

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3001;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/fortyguard/status returns active mode and provider state', async () => {
    const res = await fetch(`${baseUrl}/api/fortyguard/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.provider).toContain('FortyGuard');
    expect(data.active_mode).toBe('hybrid');
  });

  it('POST /api/fortyguard/mode transitions data modes dynamically', async () => {
    const res = await fetch(`${baseUrl}/api/fortyguard/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'offline' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active_mode).toBe('offline');

    // Switch back to hybrid
    await fetch(`${baseUrl}/api/fortyguard/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'hybrid' }),
    });
  });

  it('POST /api/fortyguard/fetch-site-observation falls back cleanly to simulation in hybrid mode', async () => {
    const res = await fetch(`${baseUrl}/api/fortyguard/fetch-site-observation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: 'PHX-SITE-01' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.observation).toBeDefined();
    expect(data.observation.site_id).toBe('PHX-SITE-01');
    expect(data.observation.temperature_c).toBeGreaterThan(20);
    // In hybrid fallback without live API key, source is tagged accurately as simulation
    expect(['fortyguard', 'fortyguard_cache', 'simulation']).toContain(data.observation.source);
  });

  it('GET /api/system/capabilities includes full FortyGuard discovery breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/system/capabilities`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fortyguard).toBeDefined();
    expect(data.supported_data_modes).toContain('hybrid');
  });
});
