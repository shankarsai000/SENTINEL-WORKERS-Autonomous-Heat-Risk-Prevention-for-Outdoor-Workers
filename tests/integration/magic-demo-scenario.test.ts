import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSentinelServer } from '../../apps/api/src/server.js';
import http from 'http';
import fs from 'fs';
import path from 'path';

describe('Magic Demo Scenario — 14-Step End-to-End Validation', () => {
  const testDbPath = path.join(process.cwd(), 'test-magic-demo.db');
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (_) {}
    }
    process.env.DATABASE_PATH = testDbPath;
    process.env.NODE_ENV = 'test';
    process.env.THERMAL_DATA_MODE = 'offline';
    const serverInstance = createSentinelServer();
    serverInstance.orchestrator.setThermalDataMode('offline');
    server = serverInstance.server;

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3005;
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

  it('executes 14 steps of Phoenix heatwave simulation smoothly and produces auditable decisions', async () => {
    // Step 1: Initial Reset
    const resetRes = await fetch(`${baseUrl}/api/simulation/reset`, { method: 'POST' });
    expect(resetRes.status).toBe(200);

    // Run 14 steps
    for (let step = 1; step <= 14; step++) {
      const stepRes = await fetch(`${baseUrl}/api/simulation/step`, { method: 'POST' });
      expect(stepRes.status).toBe(200);
      const stepBody = await stepRes.json();
      expect(stepBody.state.current_tick).toBe(step);
    }

    // Verify operations summary
    const summaryRes = await fetch(`${baseUrl}/api/operations/summary`);
    expect(summaryRes.status).toBe(200);
    const summaryBody = await summaryRes.json();
    expect(summaryBody.active_workers).toBeGreaterThan(0);

    // Verify priority queue has ranked workers
    const priorityRes = await fetch(`${baseUrl}/api/operations/priority`);
    expect(priorityRes.status).toBe(200);
    const priorityBody = await priorityRes.json();
    expect(priorityBody.items.length).toBeGreaterThan(0);

    // Verify incidents exist and are tracked
    const incidentsRes = await fetch(`${baseUrl}/api/incidents`);
    expect(incidentsRes.status).toBe(200);

    // Verify audit logs are populated
    const auditRes = await fetch(`${baseUrl}/api/events?limit=20`);
    expect(auditRes.status).toBe(200);
    const auditBody = await auditRes.json();
    expect(auditBody.events.length).toBeGreaterThan(0);
  }, 90000);
});
