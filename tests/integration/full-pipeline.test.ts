import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSentinelServer } from '../../apps/api/src/server.js';
import http from 'http';

describe('Full Closed-Loop End-to-End Pipeline Integration', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.DATABASE_PATH = './sentinel-e2e-test.db';
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

  it(
    'executes full cycle: step simulation -> generate observation -> evaluate risk -> issue action -> record audit -> acknowledge',
    async () => {
      // 1. Step simulation through API
      const stepRes = await fetch(`${baseUrl}/api/simulation/step`, { method: 'POST' });
      expect(stepRes.status).toBe(200);
      const stepData = await stepRes.json();
      expect(stepData.status).toBe('stepped');
      expect(stepData.tickResult.observations).toHaveLength(5);

      // 2. Verify observations persisted and available
      const riskWorkersRes = await fetch(`${baseUrl}/api/risk/workers?limit=10`);
      expect(riskWorkersRes.status).toBe(200);
      const riskWorkersData = await riskWorkersRes.json();
      expect(riskWorkersData.count).toBeGreaterThan(0);
      expect(riskWorkersData.workers[0].worker_id).toBeDefined();

      // 3. Step forward multiple times to escalate thermal load into elevated/critical zone
      for (let i = 0; i < 6; i++) {
        await fetch(`${baseUrl}/api/simulation/step`, { method: 'POST' });
      }

      // 4. Verify actions were issued by AutonomousActionAgent
      const actionsRes = await fetch(`${baseUrl}/api/actions?limit=10`);
      expect(actionsRes.status).toBe(200);
      const actionsData = await actionsRes.json();
      expect(actionsData.actions.length).toBeGreaterThan(0);

      const firstAction = actionsData.actions[0];
      expect(firstAction.action_id).toBeDefined();
      expect(firstAction.policy_version).toBeDefined();

      // 5. Supervisor acknowledges the action
      const ackRes = await fetch(`${baseUrl}/api/actions/${firstAction.action_id}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'Lead Safety Supervisor' }),
    });
    expect(ackRes.status).toBe(200);
    const ackData = await ackRes.json();
    expect(ackData.status).toBe('success');
    expect(ackData.action.outcome).toBe('ACKNOWLEDGED');
    expect(ackData.action.acknowledged_at).toBeDefined();

    // 6. Verify audit event was logged with cryptographic hash
    const eventsRes = await fetch(`${baseUrl}/api/events?limit=20`);
    expect(eventsRes.status).toBe(200);
    const eventsData = await eventsRes.json();
    expect(eventsData.events.length).toBeGreaterThan(0);

    const ackAuditEvent = eventsData.events.find(
      (e: any) => e.event_type === 'ACTION_ACKNOWLEDGED' && e.payload_ref === firstAction.action_id
    );
    expect(ackAuditEvent).toBeDefined();
    expect(ackAuditEvent.payload_hash).toHaveLength(64); // SHA-256 hex length
  }, 90000);
});
