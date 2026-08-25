import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createSentinelServer } from '../../apps/api/src/server.js';
import { CircuitBreaker } from '@sentinel/fortyguard-provider';

describe('Phase P6: Failure Recovery & Circuit Breaker Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_PATH = './test-failure-recovery.db';
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

  it('CircuitBreaker transitions CLOSED -> OPEN after repeated failures, then HALF_OPEN after cooldown', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 100 });
    expect(cb.getState()).toBe('CLOSED');

    const failingOp = async () => {
      throw new Error('Simulated network timeout');
    };

    // 3 failures trigger OPEN
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(failingOp);
      } catch (_) {}
    }

    expect(cb.getState()).toBe('OPEN');

    // While OPEN, fast-fails without executing
    let executed = false;
    try {
      await cb.execute(async () => {
        executed = true;
      });
    } catch (err: any) {
      expect(err.isCircuitBreakerOpen).toBe(true);
    }
    expect(executed).toBe(false);

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 120));
    expect(cb.getState()).toBe('HALF_OPEN');

    // Successful probe closes circuit
    const res = await cb.execute(async () => 'OK');
    expect(res).toBe('OK');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('Injected faults via /api/dev/faults reflect in /api/health/dependencies and clear cleanly', async () => {
    // 1. Enable FortyGuard timeout fault
    const setFaultRes = await fetch(`${baseUrl}/api/dev/faults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fault: 'FORTYGUARD_TIMEOUT', enabled: true }),
    });
    expect(setFaultRes.status).toBe(200);

    // 2. Health dependencies should report DEGRADED
    const healthDepRes = await fetch(`${baseUrl}/api/health/dependencies`);
    const healthDep = await healthDepRes.json();
    expect(healthDep.dependencies.fortyguard.status).toBe('DEGRADED');
    expect(healthDep.overall).toBe('DEGRADED');

    // 3. Clear fault
    const clearRes = await fetch(`${baseUrl}/api/dev/faults/FORTYGUARD_TIMEOUT`, {
      method: 'DELETE',
    });
    expect(clearRes.status).toBe(200);

    // 4. Verify fault is removed
    const listRes = await fetch(`${baseUrl}/api/dev/faults`);
    const listBody = await listRes.json();
    expect(listBody.enabled_faults).not.toContain('FORTYGUARD_TIMEOUT');
  });

  it('Development reset endpoint /api/dev/reset restores clean simulation state', async () => {
    const resetRes = await fetch(`${baseUrl}/api/dev/reset`, { method: 'POST' });
    expect(resetRes.status).toBe(200);
    const resetBody = await resetRes.json();
    expect(resetBody.status).toBe('reset_complete');
    expect(resetBody.simulation_state.current_tick).toBe(0);
  });
});
