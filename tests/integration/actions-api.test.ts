import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSentinelServer } from '../../apps/api/src/server.js';
import http from 'http';
import fs from 'fs';

describe('Phase P4 Actions REST API Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let orchestrator: any;
  const testDbPath = './sentinel-actions-test.db';

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (_) {}
    }
    process.env.DATABASE_PATH = testDbPath;
    process.env.NODE_ENV = 'test';
    const instance = createSentinelServer();
    server = instance.server;
    orchestrator = instance.orchestrator;

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3002;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Step simulation to seed observations and workers
    orchestrator.stepSimulation();
    orchestrator.stepSimulation();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (_) {}
  });

  it('POST /api/actions/preview returns candidate options and policy evaluation without execution', async () => {
    const res = await fetch(`${baseUrl}/api/actions/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: 'worker-0042', site_id: 'PHX-SITE-01' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.worker_id).toBe('worker-0042');
    expect(Array.isArray(body.candidates)).toBe(true);
    expect(body.candidates.length).toBeGreaterThan(0);
    expect(body.recommended_action).toBeDefined();
  });

  it('POST /api/actions/execute creates and dispatches an action', async () => {
    const res = await fetch(`${baseUrl}/api/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_id: 'worker-0042',
        site_id: 'PHX-SITE-01',
        action_type: 'RECOVERY_BREAK',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action_id).toBeDefined();
    expect(body.is_simulated).toBe(true);
    expect(body.status).toBeDefined();

    const createdActionId = body.action_id;

    // Verify GET /api/actions includes the new action
    const getRes = await fetch(`${baseUrl}/api/actions`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.count).toBeGreaterThan(0);

    // Verify GET /api/actions/:id
    const detailRes = await fetch(`${baseUrl}/api/actions/${createdActionId}`);
    expect(detailRes.status).toBe(200);
    const detailBody = await detailRes.json();
    expect(detailBody.action.action_id).toBe(createdActionId);

    // Verify POST /api/actions/:id/ack
    const ackRes = await fetch(`${baseUrl}/api/actions/${createdActionId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'Site Supervisor', source: 'CONSOLE_BUTTON' }),
    });

    expect(ackRes.status).toBe(200);
    const ackBody = await ackRes.json();
    expect(ackBody.status).toBe('success');
    expect(ackBody.action.outcome).toBe('ACKNOWLEDGED');

    // Verify GET /api/actions/:id/audit
    const auditRes = await fetch(`${baseUrl}/api/actions/${createdActionId}/audit`);
    expect(auditRes.status).toBe(200);
    const auditBody = await auditRes.json();
    expect(auditBody.action_id).toBe(createdActionId);
  });

  it('POST /api/actions/:id/override overrides an active action with justification', async () => {
    // Create an action
    const execRes = await fetch(`${baseUrl}/api/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_id: 'worker-0043',
        site_id: 'PHX-SITE-01',
        action_type: 'SHADE_RECOMMENDATION',
      }),
    });

    const execBody = await execRes.json();
    const actionId = execBody.action_id;

    const overrideRes = await fetch(`${baseUrl}/api/actions/${actionId}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'Supervisor Dave',
        reason: 'Worker reassigned to indoor air-conditioned fabrication room.',
      }),
    });

    expect(overrideRes.status).toBe(200);
    const overrideBody = await overrideRes.json();
    expect(overrideBody.status).toBe('OVERRIDDEN');
  });

  it('GET /api/escalations retrieves active escalations', async () => {
    const res = await fetch(`${baseUrl}/api/escalations`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.escalations)).toBe(true);
  });
});
