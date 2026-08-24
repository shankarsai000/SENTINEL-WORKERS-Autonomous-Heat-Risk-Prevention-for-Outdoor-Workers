import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import pino from 'pino';
import { SentinelDatabase } from './db/database.js';
import { AuditService } from './services/audit-service.js';
import { OfflineSimulationEngine } from '@sentinel/simulation';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';
import { SentinelWebSocketServer } from './services/websocket-server.js';
import { SentinelOrchestrator } from './services/orchestrator.js';

import { createHealthRouter } from './routes/health.js';
import { createSitesRouter } from './routes/sites.js';
import { createWorkersRouter } from './routes/workers.js';
import { createRiskRouter } from './routes/risk.js';
import { createEventsRouter } from './routes/events.js';
import { createActionsRouter } from './routes/actions.js';
import { createSimulationRouter } from './routes/simulation.js';
import { createFortyGuardRouter } from './routes/fortyguard.js';

dotenv.config();

const logger = pino({
  name: 'sentinel-api',
  level: process.env.LOG_LEVEL || 'info',
});

const PORT = parseInt(process.env.PORT || '3001', 10);

export function createSentinelServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json());

  // Request correlation logger middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader('x-correlation-id', correlationId);

    res.on('finish', () => {
      logger.info({
        event: 'HTTP_REQUEST',
        correlation_id: correlationId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      });
    });

    next();
  });

  // Initialize DB, Audit, Simulation, WebSocket, Orchestrator
  const db = new SentinelDatabase(process.env.DATABASE_PATH || './sentinel.db');
  const audit = new AuditService(db.db);
  const simulationEngine = new OfflineSimulationEngine();
  const wsServer = new SentinelWebSocketServer(server);
  const fortyGuardAdapter = new FortyGuardAdapter({ offlineFallback: true });

  const orchestrator = new SentinelOrchestrator(
    db,
    audit,
    simulationEngine,
    wsServer,
    process.env.RISK_SERVICE_URL || 'http://localhost:8000'
  );

  // Mount API routers
  app.use('/api', createHealthRouter(fortyGuardAdapter));
  app.use('/api', createSitesRouter(db));
  app.use('/api', createWorkersRouter(db));
  app.use('/api', createRiskRouter(db));
  app.use('/api', createEventsRouter(db, audit));
  app.use('/api', createActionsRouter(orchestrator, db));
  app.use('/api', createSimulationRouter(orchestrator));
  app.use('/api', createFortyGuardRouter(fortyGuardAdapter, orchestrator));

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ event: 'UNHANDLED_ERROR', error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return { app, server, db, orchestrator, wsServer };
}

if (process.env.NODE_ENV !== 'test') {
  const { server } = createSentinelServer();
  server.listen(PORT, () => {
    logger.info({
      event: 'SERVER_STARTUP',
      port: PORT,
      message: `Sentinel Workers API running on http://localhost:${PORT}`,
      wsEndpoint: `ws://localhost:${PORT}/ws`,
    });
  });
}
