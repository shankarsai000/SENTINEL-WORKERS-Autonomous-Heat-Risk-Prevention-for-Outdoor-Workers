import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createSentinelServer } from '../../apps/api/src/server.js';

describe('Phase P6: Complete End-to-End Demo Validation Test', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_PATH = './test-e2e-demo.db';
    process.env.THERMAL_DATA_MODE = 'offline';
    const sentinel = createSentinelServer();
    sentinel.orchestrator.setThermalDataMode('offline');
    server = sentinel.server;
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
  });

  it('Executes the complete Sentinel end-to-end workflow without any errors or unhandled rejections', async () => {
    // 1. Check Initial Health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    expect(healthRes.status).toBe(200);

    // 2. Fetch Initial Summary
    const initialSummaryRes = await fetch(`${baseUrl}/api/operations/summary`);
    expect(initialSummaryRes.status).toBe(200);

    // 3. Step through 10 simulation ticks (simulating 10 hours of heat accumulation)
    for (let tick = 1; tick <= 10; tick++) {
      const stepRes = await fetch(`${baseUrl}/api/simulation/step`, { method: 'POST' });
      expect(stepRes.status).toBe(200);
      const stepData = await stepRes.json();
      expect(stepData.status).toBe('stepped');
    }

    // 4. Verify Contextual Risk Summary
    const riskSummaryRes = await fetch(`${baseUrl}/api/risk/summary`);
    expect(riskSummaryRes.status).toBe(200);
    const riskSummary = await riskSummaryRes.json();
    expect(riskSummary.total_active_workers).toBeGreaterThan(0);

    // 5. Verify Prediction Telemetry
    const predSummaryRes = await fetch(`${baseUrl}/api/prediction/summary`);
    expect(predSummaryRes.status).toBe(200);
    const predSummary = await predSummaryRes.json();
    expect(predSummary.total_predictions).toBeGreaterThanOrEqual(0);

    // 6. Verify Priority Worker Queue
    const priorityRes = await fetch(`${baseUrl}/api/operations/priority`);
    expect(priorityRes.status).toBe(200);
    const priorityBody = await priorityRes.json();
    expect(priorityBody.items.length).toBeGreaterThan(0);
    expect(priorityBody.items[0].priority_rank).toBe(1);

    // 7. Verify Spatial Map
    const mapRes = await fetch(`${baseUrl}/api/operations/map`);
    expect(mapRes.status).toBe(200);
    const mapBody = await mapRes.json();
    expect(mapBody.zones.length).toBeGreaterThan(0);
    expect(mapBody.cooling_points.length).toBeGreaterThan(0);

    // 8. Verify Actions Issued
    const actionsRes = await fetch(`${baseUrl}/api/actions?limit=10`);
    expect(actionsRes.status).toBe(200);
    const actionsBody = await actionsRes.json();
    expect(Array.isArray(actionsBody.actions)).toBe(true);

    // 9. Verify Audit Events
    const eventsRes = await fetch(`${baseUrl}/api/events?limit=20`);
    expect(eventsRes.status).toBe(200);
    const eventsBody = await eventsRes.json();
    expect(eventsBody.events.length).toBeGreaterThan(0);
  }, 90000);
});
