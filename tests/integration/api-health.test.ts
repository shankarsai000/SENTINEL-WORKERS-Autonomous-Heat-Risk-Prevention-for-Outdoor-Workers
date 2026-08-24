import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSentinelServer } from '../../apps/api/src/server.js';
import http from 'http';

describe('Sentinel Workers REST API Health & Endpoints', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.DATABASE_PATH = './sentinel-test.db';
    process.env.NODE_ENV = 'test';
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

  it('GET /api/health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('sentinel-api');
    expect(data.phase).toMatch(/^P[0-9]/);
  });

  it('GET /api/system/capabilities lists offline simulation and 500 workers', async () => {
    const res = await fetch(`${baseUrl}/api/system/capabilities`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.offline_simulation_mode).toBe(true);
    expect(data.max_synthetic_workers).toBe(500);
    expect(data.active_sites).toBe(5);
  });

  it('GET /api/sites returns all 5 Phoenix sites', async () => {
    const res = await fetch(`${baseUrl}/api/sites`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(5);
    expect(data.sites[0].site_id).toBe('PHX-SITE-01');
  });

  it('GET /api/workers returns 500 deterministic synthetic workers', async () => {
    const res = await fetch(`${baseUrl}/api/workers`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(500);
    expect(data.workers[0].worker_id).toBe('WRK-0001');
  });

  it('GET /api/risk/summary returns initial risk distribution', async () => {
    const res = await fetch(`${baseUrl}/api/risk/summary`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.distribution).toBeDefined();
    expect(data.percentages).toBeDefined();
  });
});
