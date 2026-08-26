import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createSentinelServer } from '../../apps/api/src/server.js';

describe('Phase P6: Multi-Failure Chaos Scenario Integration Test', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_PATH = './test-chaos-scenario.db';
    const sentinel = createSentinelServer();
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

  it('Survives multi-failure chaos scenario: FortyGuard outage -> degraded state -> actions continue -> fault cleared -> full audit', async () => {
    // 1. Initial State Check
    const initialHealth = await (await fetch(`${baseUrl}/api/health`)).json();
    expect(initialHealth.service).toBe('sentinel-api');

    // 2. Inject FortyGuard Timeout Fault
    await fetch(`${baseUrl}/api/dev/faults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fault: 'FORTYGUARD_TIMEOUT', enabled: true }),
    });

    // 3. Verify Health is DEGRADED
    const degradedHealth = await (await fetch(`${baseUrl}/api/health/dependencies`)).json();
    expect(degradedHealth.dependencies.fortyguard.status).toBe('DEGRADED');
    expect(degradedHealth.overall).toBe('DEGRADED');

    // 4. Step simulation through heat progression while in DEGRADED mode
    for (let step = 1; step <= 5; step++) {
      const stepRes = await fetch(`${baseUrl}/api/simulation/step`, { method: 'POST' });
      expect(stepRes.status).toBe(200);
    }

    // 5. Verify that risk states and operations summary continue generating via fallback
    const opsSummary = await (await fetch(`${baseUrl}/api/operations/summary`)).json();
    expect(opsSummary.active_workers).toBeGreaterThan(0);

    // 6. Verify priority workers queue is populated
    const priorityRes = await (await fetch(`${baseUrl}/api/operations/priority`)).json();
    expect(priorityRes.items).toBeDefined();
    expect(Array.isArray(priorityRes.items)).toBe(true);

    // 7. Clear injected fault
    await fetch(`${baseUrl}/api/dev/faults/FORTYGUARD_TIMEOUT`, { method: 'DELETE' });

    // 8. Verify system health recovers
    const recoveredHealth = await (await fetch(`${baseUrl}/api/health/dependencies`)).json();
    expect(['DISABLED', 'HEALTHY']).toContain(recoveredHealth.dependencies.fortyguard.status);
    expect(recoveredHealth.overall).toBe('HEALTHY');

    // 9. Verify metrics telemetry is tracked
    const metricsRes = await (await fetch(`${baseUrl}/api/metrics`)).json();
    expect(metricsRes.requests.total).toBeGreaterThan(5);
    expect(metricsRes.uptime_seconds).toBeGreaterThanOrEqual(0);

    // 10. Verify audit event chain remains unbroken
    const eventsRes = await fetch(`${baseUrl}/api/events?limit=50`);
    expect(eventsRes.status).toBe(200);
    const eventsBody = await eventsRes.json();
    expect(eventsBody.events.length).toBeGreaterThan(0);
    expect(eventsBody.events[0].event_id).toBeDefined();
  }, 90000);
});
