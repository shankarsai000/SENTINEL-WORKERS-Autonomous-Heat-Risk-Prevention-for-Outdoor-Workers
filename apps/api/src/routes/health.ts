import { Router, Request, Response } from 'express';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';
import { SentinelDatabase } from '../db/database.js';
import { metrics } from '../services/metrics.js';
import { faultInjector } from '../services/fault-injector.js';

export function createHealthRouter(adapter?: FortyGuardAdapter, db?: SentinelDatabase): Router {
  const router = Router();

  // 1. GET /api/health
  router.get('/health', (_req: Request, res: Response) => {
    const isDbFailureInjected = faultInjector.isFaultEnabled('DATABASE_FAILURE');
    const isFgFaultInjected =
      faultInjector.isFaultEnabled('FORTYGUARD_TIMEOUT') ||
      faultInjector.isFaultEnabled('FORTYGUARD_429') ||
      faultInjector.isFaultEnabled('FORTYGUARD_500');
    const isFgDegraded =
      isFgFaultInjected || (adapter ? Boolean(adapter.getProviderStatus().configured && !adapter.getProviderStatus().healthy) : false);

    let overallStatus = 'healthy';
    if (isDbFailureInjected) {
      overallStatus = 'unavailable';
    } else if (isFgDegraded) {
      overallStatus = 'degraded';
    }

    res.json({
      status: overallStatus,
      service: 'sentinel-api',
      version: '0.1.0',
      phase: 'P6_HARDENING_RELIABILITY',
      timestamp: new Date().toISOString(),
    });
  });

  // 2. GET /api/health/live (Liveness probe)
  router.get('/health/live', (_req: Request, res: Response) => {
    res.json({
      status: 'HEALTHY',
      uptime_seconds: Math.round(process.uptime()),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      timestamp: new Date().toISOString(),
    });
  });

  // 3. GET /api/health/ready (Readiness probe)
  router.get('/health/ready', (_req: Request, res: Response) => {
    if (faultInjector.isFaultEnabled('DATABASE_FAILURE')) {
      return res.status(503).json({
        status: 'UNAVAILABLE',
        reason: 'Database connectivity probe failed (fault injected).',
      });
    }

    try {
      if (db) {
        db.db.prepare('SELECT 1').get();
      }
      res.json({
        status: 'HEALTHY',
        ready: true,
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'UNAVAILABLE',
        ready: false,
        reason: 'Database check failed: ' + err.message,
      });
    }
  });

  // 4. GET /api/health/dependencies (Detailed dependency matrix)
  router.get('/health/dependencies', (_req: Request, res: Response) => {
    const isDbFailure = faultInjector.isFaultEnabled('DATABASE_FAILURE');
    const isPredFailure = faultInjector.isFaultEnabled('PREDICTION_FAILURE');
    const isFgFaultInjected =
      faultInjector.isFaultEnabled('FORTYGUARD_TIMEOUT') ||
      faultInjector.isFaultEnabled('FORTYGUARD_429') ||
      faultInjector.isFaultEnabled('FORTYGUARD_500');

    let dbStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' = 'HEALTHY';
    if (isDbFailure) {
      dbStatus = 'UNAVAILABLE';
    } else if (db) {
      try {
        db.db.prepare('SELECT 1').get();
      } catch (_) {
        dbStatus = 'UNAVAILABLE';
      }
    }

    let fgStatus: 'HEALTHY' | 'DEGRADED' | 'DISABLED' = 'HEALTHY';
    let fgDetails: any = null;
    if (adapter) {
      fgDetails = adapter.getProviderStatus();
      if (isFgFaultInjected) {
        fgStatus = 'DEGRADED';
      } else if (!fgDetails.configured) {
        fgStatus = 'DISABLED';
      } else if (!fgDetails.healthy) {
        fgStatus = 'DEGRADED';
      }
    } else {
      fgStatus = isFgFaultInjected ? 'DEGRADED' : 'DISABLED';
    }

    const predictionStatus: 'HEALTHY' | 'DEGRADED' = isPredFailure ? 'DEGRADED' : 'HEALTHY';
    const riskEngineStatus: 'HEALTHY' | 'DEGRADED' = 'HEALTHY';
    const actionEngineStatus: 'HEALTHY' | 'DEGRADED' = 'HEALTHY';
    const eventBusStatus: 'HEALTHY' | 'DEGRADED' = faultInjector.isFaultEnabled('WEBSOCKET_DROP') ? 'DEGRADED' : 'HEALTHY';

    let overall: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' = 'HEALTHY';
    if (dbStatus === 'UNAVAILABLE') {
      overall = 'UNAVAILABLE';
    } else if (fgStatus === 'DEGRADED' || predictionStatus === 'DEGRADED' || eventBusStatus === 'DEGRADED') {
      overall = 'DEGRADED';
    }

    res.json({
      overall,
      dependencies: {
        database: {
          status: dbStatus,
          driver: 'better-sqlite3 (WAL mode)',
        },
        fortyguard: {
          status: fgStatus,
          provider: 'FortyGuard Enterprise API',
          details: fgDetails,
        },
        risk_engine: {
          status: riskEngineStatus,
          version: '1.0.0',
        },
        prediction_engine: {
          status: predictionStatus,
          model: 'LogisticRegression + EWMA',
        },
        action_engine: {
          status: actionEngineStatus,
          mode: 'SAFETY_CONSTRAINED_AUTONOMOUS',
        },
        event_bus: {
          status: eventBusStatus,
          type: 'ws (WebSocket)',
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 5. GET /api/metrics (Internal telemetry counters)
  router.get('/metrics', (_req: Request, res: Response) => {
    res.json(metrics.getSnapshot());
  });

  // 6. GET /api/system/capabilities (Legacy compatibility)
  router.get('/system/capabilities', async (_req: Request, res: Response) => {
    let fortyGuardCapabilities = null;
    if (adapter) {
      try {
        fortyGuardCapabilities = await adapter.testConnection();
      } catch (_) {
        fortyGuardCapabilities = {
          configured: false,
          authenticated: false,
          reason: 'DISCOVERY_ERROR',
        };
      }
    }

    res.json({
      system: 'Sentinel Workers',
      version: '0.1.0',
      phase: 'P6_HARDENING_RELIABILITY',
      offline_simulation_mode: true,
      supported_data_modes: ['offline', 'fortyguard', 'hybrid'],
      default_data_mode: process.env.THERMAL_DATA_MODE || 'offline',
      max_synthetic_workers: 500,
      active_sites: 5,
      deterministic_replay: true,
      realtime_websocket_supported: true,
      decision_loop_active: true,
      fortyguard: fortyGuardCapabilities || {
        configured: Boolean(process.env.FORTYGUARD_API_KEY),
        authenticated: false,
        heatmap: true,
        environmental_parameters: true,
        heat_intelligence: false,
        reason: null,
      },
    });
  });

  return router;
}
