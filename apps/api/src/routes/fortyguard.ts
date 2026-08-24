import { Router, Request, Response } from 'express';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';
import { SentinelOrchestrator, ThermalDataMode } from '../services/orchestrator.js';

export function createFortyGuardRouter(adapter: FortyGuardAdapter, orchestrator?: SentinelOrchestrator): Router {
  const router = Router();

  router.get('/fortyguard/status', (_req: Request, res: Response) => {
    try {
      const status = adapter.getProviderStatus();
      const mode = orchestrator ? orchestrator.getThermalDataMode() : 'offline';
      res.json({
        ...status,
        active_mode: mode,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve FortyGuard status', details: err.message });
    }
  });

  router.get('/fortyguard/usage', (_req: Request, res: Response) => {
    try {
      const usage = adapter.getUsageLog();
      const status = adapter.getProviderStatus();
      res.json({
        provider: status.provider,
        total_records: usage.length,
        cache_stats: status.cacheStats,
        records: usage,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve FortyGuard usage metrics', details: err.message });
    }
  });

  router.post('/fortyguard/test-connection', async (_req: Request, res: Response) => {
    try {
      const capabilities = await adapter.testConnection();
      res.json({
        status: capabilities.authenticated ? 'connected' : 'disconnected',
        capabilities,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: err.message,
        errorCode: err.errorCode || 'UNKNOWN_ERROR',
      });
    }
  });

  router.post('/fortyguard/mode', (req: Request, res: Response) => {
    try {
      const { mode } = req.body;
      if (mode !== 'offline' && mode !== 'fortyguard' && mode !== 'hybrid') {
        return res.status(400).json({ error: 'Invalid mode. Must be "offline", "fortyguard", or "hybrid".' });
      }

      if (orchestrator) {
        orchestrator.setThermalDataMode(mode as ThermalDataMode);
      }

      res.json({
        status: 'updated',
        active_mode: mode,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update thermal data mode', details: err.message });
    }
  });

  router.post('/fortyguard/fetch-site-observation', async (req: Request, res: Response) => {
    try {
      const { site_id } = req.body;
      if (!site_id) {
        return res.status(400).json({ error: 'site_id is required' });
      }

      if (!orchestrator) {
        return res.status(500).json({ error: 'Orchestrator not available' });
      }

      const observation = await orchestrator.fetchSiteObservation(site_id);
      res.json({
        status: 'success',
        observation,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: err.message,
        errorCode: err.errorCode || 'FETCH_FAILED',
      });
    }
  });

  return router;
}
