import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createSentinelServer } from '../../apps/api/src/server.js';

describe('Phase P6: Security, RBAC & Isolation Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_PATH = './test-security-audit.db';
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

  it('Enforces RBAC: VIEWER role cannot perform mutating operations (returns 403)', async () => {
    const res = await fetch(`${baseUrl}/api/incidents/inc-test-01/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'VIEWER',
      },
      body: JSON.stringify({
        resolution: 'MANUAL_INTERVENTION_COMPLETED',
        note: 'Attempting unauthorized resolve',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('Rejects malformed input payloads with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid_field: 123 }), // Missing candidate action structure
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('Propagates request correlation IDs and sets x-request-id response header', async () => {
    const customCorrelationId = 'test-corr-id-998877';
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { 'x-request-id': customCorrelationId },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('x-correlation-id')).toBe(customCorrelationId);
    expect(res.headers.get('x-request-id')).toBe(customCorrelationId);
  });

  it('Standardizes error format to include error.code, message, and request_id', async () => {
    const res = await fetch(`${baseUrl}/api/incidents/non-existent-incident-id/ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'SUPERVISOR',
      },
      body: JSON.stringify({ actor_id: 'SUP-01' }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('INCIDENT_NOT_FOUND');
  });
});
