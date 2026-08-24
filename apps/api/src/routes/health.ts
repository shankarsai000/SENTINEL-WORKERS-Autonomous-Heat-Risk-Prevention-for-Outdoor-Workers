import { Router, Request, Response } from 'express';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'sentinel-api',
      version: '0.1.0',
      phase: 'P0_FOUNDATION',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  });

  router.get('/system/capabilities', (_req: Request, res: Response) => {
    res.json({
      system: 'Sentinel Workers',
      version: '0.1.0',
      phase: 'P0 - Foundation',
      offline_simulation_mode: true,
      supported_providers: ['FortyGuard Enterprise v1.0.0 (Offline Fallback)'],
      max_synthetic_workers: 500,
      active_sites: 5,
      deterministic_replay: true,
      realtime_websocket_supported: true,
      decision_loop_active: true,
    });
  });

  return router;
}
