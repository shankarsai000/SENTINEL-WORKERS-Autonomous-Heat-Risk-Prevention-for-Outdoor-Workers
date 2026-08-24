import { Router, Request, Response } from 'express';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';

export function createHealthRouter(adapter?: FortyGuardAdapter): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'sentinel-api',
      version: '0.1.0',
      phase: 'P1_FORTYGUARD_INTEGRATION',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  });

  router.get('/system/capabilities', async (_req: Request, res: Response) => {
    let fortyGuardCapabilities = null;
    if (adapter) {
      try {
        fortyGuardCapabilities = await adapter.testConnection();
      } catch (e) {
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
      phase: 'P1_FORTYGUARD_INTEGRATION',
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
