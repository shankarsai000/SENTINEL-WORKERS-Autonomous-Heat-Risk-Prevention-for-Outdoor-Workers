import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSentinelServer } from '../../apps/api/src/server.js';
import http from 'http';
import fs from 'fs';
import path from 'path';

describe('Operations & Incident REST APIs Integration', () => {
  const testDbPath = path.join(process.cwd(), 'test-operations-api.db');
  let server: http.Server;
  let baseUrl: string;
  let db: any;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (_) {}
    }
    process.env.DATABASE_PATH = testDbPath;
    process.env.NODE_ENV = 'test';
    const serverInstance = createSentinelServer();
    server = serverInstance.server;
    db = serverInstance.db;

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3004;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (_) {}
    }
  });

  it('GET /api/operations/summary returns complete system operational metrics', async () => {
    const res = await fetch(`${baseUrl}/api/operations/summary?site_id=PHX-SITE-01`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('active_workers');
    expect(body).toHaveProperty('green_count');
    expect(body).toHaveProperty('active_incidents');
    expect(body).toHaveProperty('fortyguard_status');
    expect(body).toHaveProperty('data_freshness');
    expect(body.risk_engine_status).toBe('HEALTHY');
  });

  it('GET /api/operations/priority returns deterministic prioritized worker list', async () => {
    const res = await fetch(`${baseUrl}/api/operations/priority?site_id=PHX-SITE-01`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    if (body.items.length > 0) {
      const top = body.items[0];
      expect(top).toHaveProperty('worker_id');
      expect(top).toHaveProperty('priority_rank');
      expect(top).toHaveProperty('priority_score');
      expect(top).toHaveProperty('priority_reason');
    }
  });

  it('GET /api/operations/map returns spatial zones, cooling assets, and worker markers', async () => {
    const res = await fetch(`${baseUrl}/api/operations/map?site_id=PHX-SITE-01`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.location_disclaimer).toBe('SIMULATED WORKER LOCATIONS');
    expect(body.zones.length).toBeGreaterThan(0);
    expect(body.cooling_points.length).toBeGreaterThan(0);
    expect(body.workers.length).toBeGreaterThan(0);
  });

  it('manages incident lifecycle via REST API endpoints with RBAC enforcement', async () => {
    // 1. Create test incident
    const testInc = {
      incident_id: 'INC-TEST-001',
      site_id: 'PHX-SITE-01',
      zone_id: 'ZONE-A',
      severity: 'HIGH',
      status: 'DETECTED',
      opened_at: new Date().toISOString(),
      affected_worker_count: 3,
      worker_ids: ['W-001', 'W-002', 'W-003'],
      summary: 'Test cluster in ZONE-A',
      common_reason_codes: ['ELEVATED_HEAT'],
      common_factors: ['ZONE_CLUSTER'],
      owner: 'SUPERVISOR-UNASSIGNED',
    };
    db.saveIncident(testInc);

    // 2. GET /api/incidents
    const listRes = await fetch(`${baseUrl}/api/incidents`);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.incidents.some((i: any) => i.incident_id === 'INC-TEST-001')).toBe(true);

    // 3. POST /api/incidents/:id/ack
    const ackRes = await fetch(`${baseUrl}/api/incidents/INC-TEST-001/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'SUPERVISOR' },
      body: JSON.stringify({ actor: 'Safety Lead', note: 'Triaged by lead' }),
    });
    expect(ackRes.status).toBe(200);
    const ackBody = await ackRes.json();
    expect(ackBody.incident.status).toBe('TRIAGED');

    // 4. POST /api/incidents/:id/assign
    const assignRes = await fetch(`${baseUrl}/api/incidents/INC-TEST-001/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'SUPERVISOR' },
      body: JSON.stringify({ owner: 'Site Safety Officer' }),
    });
    expect(assignRes.status).toBe(200);
    const assignBody = await assignRes.json();
    expect(assignBody.incident.owner).toBe('Site Safety Officer');

    // 5. POST /api/incidents/:id/mitigate
    const mitRes = await fetch(`${baseUrl}/api/incidents/INC-TEST-001/mitigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'SUPERVISOR' },
      body: JSON.stringify({ actor: 'Site Safety Officer' }),
    });
    expect(mitRes.status).toBe(200);
    const mitBody = await mitRes.json();
    expect(mitBody.incident.status).toBe('MITIGATING');

    // 6. Test RBAC: VIEWER cannot resolve
    const viewerResolveRes = await fetch(`${baseUrl}/api/incidents/INC-TEST-001/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'VIEWER' },
      body: JSON.stringify({ resolution: 'Viewer attempt' }),
    });
    expect(viewerResolveRes.status).toBe(403);

    // 7. POST /api/incidents/:id/resolve by SUPERVISOR
    const resolveRes = await fetch(`${baseUrl}/api/incidents/INC-TEST-001/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'SUPERVISOR' },
      body: JSON.stringify({ resolution: 'AC Trailer deployed and thermal loads normalized.', actor: 'Supervisor' }),
    });
    expect(resolveRes.status).toBe(200);
    const resolveBody = await resolveRes.json();
    expect(resolveBody.incident.status).toBe('RESOLVED');
    expect(resolveBody.incident.resolution).toContain('AC Trailer deployed');
  });
});
