import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSentinelServer } from '../../apps/api/src/server.js';
import http from 'http';
import fs from 'fs';

describe('Phase P3 Prediction REST API Endpoints', () => {
  let server: http.Server;
  let baseUrl: string;
  let orchestrator: any;
  const testDbPath = './sentinel-pred-test.db';

  beforeAll(async () => {
    process.env.DATABASE_PATH = testDbPath;
    process.env.NODE_ENV = 'test';
    const instance = createSentinelServer();
    server = instance.server;
    orchestrator = instance.orchestrator;

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3001;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Step simulation twice to seed observations, risk states, and predictions
    orchestrator.stepSimulation();
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

  it('GET /api/prediction/summary returns valid prediction telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/prediction/summary`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('total_predictions');
    expect(data).toHaveProperty('early_warning_count');
    expect(data).toHaveProperty('average_confidence');
    expect(data).toHaveProperty('highest_risk_predictions');
  });

  it('GET /api/prediction/workers returns list of worker predictions with metadata', async () => {
    const res = await fetch(`${baseUrl}/api/prediction/workers?limit=10`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('predictions');
    expect(Array.isArray(data.predictions)).toBe(true);

    if (data.predictions.length > 0) {
      const pred = data.predictions[0];
      expect(pred).toHaveProperty('prediction_id');
      expect(pred).toHaveProperty('worker_id');
      expect(pred).toHaveProperty('model_id');
      expect(pred).toHaveProperty('predicted_risk_level');
      expect(pred).toHaveProperty('prediction_confidence');
    }
  });

  it('GET /api/prediction/models returns registered model versions with metrics', async () => {
    const res = await fetch(`${baseUrl}/api/prediction/models`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('models');
    expect(data.models.length).toBeGreaterThanOrEqual(1);

    const model = data.models[0];
    expect(model).toHaveProperty('model_id');
    expect(model).toHaveProperty('version');
    expect(model).toHaveProperty('metrics');
    expect(model).toHaveProperty('training_data_ref');
  });

  it('GET /api/prediction/events returns recent prediction events', async () => {
    const res = await fetch(`${baseUrl}/api/prediction/events`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('events');
    expect(Array.isArray(data.events)).toBe(true);
  });
});
