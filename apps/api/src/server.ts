import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root and local .env files
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();
import { SentinelDatabase } from './db/database.js';
import { AuditService } from './services/audit-service.js';
import { OfflineSimulationEngine } from '@sentinel/simulation';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';
import { SentinelWebSocketServer } from './services/websocket-server.js';
import { SentinelOrchestrator } from './services/orchestrator.js';
import { metrics } from './services/metrics.js';

import { createHealthRouter } from './routes/health.js';
import { createSitesRouter } from './routes/sites.js';
import { createWorkersRouter } from './routes/workers.js';
import { createRiskRouter } from './routes/risk.js';
import { createEventsRouter } from './routes/events.js';
import { createActionsRouter } from './routes/actions.js';
import { createSimulationRouter } from './routes/simulation.js';
import { createFortyGuardRouter } from './routes/fortyguard.js';
import { createPredictionRouter } from './routes/prediction.js';
import { createIncidentsRouter } from './routes/incidents.js';
import { createOperationsRouter } from './routes/operations.js';
import { createDevRouter } from './routes/dev.js';
import { createReportsRouter } from './routes/reports.js';
import { createHydrationRouter } from './routes/hydration.js';
import { createCoolingRouter } from './routes/cooling.js';
import { createSchedulingRouter } from './routes/scheduling.js';
import { createBuddyRouter } from './routes/buddy.js';
import { createSmsVerifyRouter } from './routes/sms-verify.js';
import { createWearablesRouter } from './routes/wearables.js';
import { createClimateRouter } from './routes/climate.js';



// Structured logger with strict PII and credential redaction
export const logger = pino({
  name: 'sentinel-api',
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'FORTYGUARD_API_KEY',
      'apiKey',
      'api_key',
      'token',
      'password',
      'authorization',
      'recipient_ref',
      'phone_number',
      'headers["api-key"]',
      'headers.authorization',
    ],
    censor: '[REDACTED_SECRET]',
  },
});

const PORT = parseInt(process.env.PORT || '3001', 10);

// Simple In-Memory Rate Limiter
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  public check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = (this.requests.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      return false;
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }
}

const rateLimiter = new RateLimiter();

export function createSentinelServer() {
  const app = express();
  const server = http.createServer(app);

  // Strict CORS configuration
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000'
  )
    .split(',')
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));

  // Request correlation & metrics tracking middleware
  app.use((req, res, next) => {
    metrics.request_count++;
    const start = Date.now();
    const correlationId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-request-id', correlationId);
    (req as any).correlationId = correlationId;

    // Rate limiting on mutating endpoints in production
    const isMutating = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
    if (isMutating && process.env.NODE_ENV === 'production') {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const isAllowed = rateLimiter.check(`${clientIp}:${req.path}`, 60, 60000); // 60 mutating reqs/min
      if (!isAllowed) {
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please throttle your client.',
            request_id: correlationId,
          },
        });
      }
    }

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        metrics.request_error_count++;
      }
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
  const fortyGuardAdapter = new FortyGuardAdapter({
    apiKey: process.env.FORTYGUARD_API_KEY,
    baseUrl: process.env.FORTYGUARD_BASE_URL || process.env.FORTYGUARD_API_BASE_URL || 'https://api.fortyguard.com',
    offlineFallback: true,
  });

  const orchestrator = new SentinelOrchestrator(
    db,
    audit,
    simulationEngine,
    wsServer,
    process.env.RISK_SERVICE_URL || 'http://localhost:8000',
    fortyGuardAdapter
  );

  // Mount API routers
  app.use('/api', createHealthRouter(fortyGuardAdapter, db));
  app.use('/api', createSitesRouter(db));
  app.use('/api', createWorkersRouter(db));
  app.use('/api', createRiskRouter(db));
  app.use('/api', createPredictionRouter(db));
  app.use('/api', createEventsRouter(db, audit));
  app.use('/api', createActionsRouter(orchestrator, db));
  app.use('/api', createIncidentsRouter(orchestrator, db));
  app.use('/api', createOperationsRouter(orchestrator, db));
  app.use('/api', createSimulationRouter(orchestrator));
  app.use('/api', createFortyGuardRouter(fortyGuardAdapter, orchestrator, db));
  app.use('/api', createDevRouter(orchestrator, db));
  app.use('/api', createReportsRouter(orchestrator, db));
  app.use('/api', createHydrationRouter(db));
  app.use('/api', createCoolingRouter(db));
  app.use('/api', createSchedulingRouter(db));
  app.use('/api', createBuddyRouter(db));
  app.use('/api', createSmsVerifyRouter(db));
  app.use('/api', createWearablesRouter(db));
  app.use('/api', createClimateRouter(db));

  // Standardized Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const correlationId = (req as any).correlationId || 'unknown';
    logger.error({
      event: 'UNHANDLED_ERROR',
      correlation_id: correlationId,
      error: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    res.status(err.status || 500).json({
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.',
        request_id: correlationId,
      },
    });
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
