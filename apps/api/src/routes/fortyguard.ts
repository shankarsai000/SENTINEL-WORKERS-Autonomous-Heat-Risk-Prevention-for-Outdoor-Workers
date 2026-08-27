import { Router, Request, Response } from 'express';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';
import { SentinelOrchestrator, ThermalDataMode } from '../services/orchestrator.js';
import { SentinelDatabase } from '../db/database.js';

export function createFortyGuardRouter(
  adapter: FortyGuardAdapter,
  orchestrator?: SentinelOrchestrator,
  db?: SentinelDatabase
): Router {
  const router = Router();

  // --- Diagnostic & Status Endpoints ---

  /**
   * GET /api/integrations/fortyguard/status
   * Safe public/diagnostic endpoint returning provider status without any secret exposure.
   */
  router.get('/integrations/fortyguard/status', async (_req: Request, res: Response) => {
    try {
      const mode = orchestrator ? orchestrator.getThermalDataMode() : 'offline';
      const isConfigured = adapter.getClient().isConfigured();
      const status = adapter.getProviderStatus();

      const lastSuccess = adapter.getUsageLog().filter((u) => u.status === 'COMPLETED').pop()?.submitted_at;
      const lastActivity = adapter.getUsageLog().pop()?.activity_id;

      res.json({
        provider: 'FortyGuard',
        enabled: isConfigured && (mode === 'fortyguard' || mode === 'hybrid'),
        mode: mode === 'fortyguard' ? 'live' : mode,
        configured: isConfigured,
        reachable: status.healthy,
        last_success: lastSuccess || null,
        last_activity_id: lastActivity || null,
        last_checked_at: new Date().toISOString(),
        source: mode === 'fortyguard' ? 'FORTYGUARD_LIVE' : mode === 'offline' ? 'OFFLINE' : 'SIMULATION',
      });
    } catch (err: any) {
      res.status(500).json({
        provider: 'FortyGuard',
        configured: false,
        reachable: false,
        error: 'AUTHENTICATION_FAILED',
        details: err.message,
      });
    }
  });

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

  // --- Activity Persistence Endpoint ---

  router.get('/integrations/fortyguard/activities', (_req: Request, res: Response) => {
    try {
      if (db) {
        const activities = db.getRecentFortyGuardActivities(50);
        return res.json({
          provider: 'FortyGuard',
          total: activities.length,
          activities,
        });
      }
      res.json({
        provider: 'FortyGuard',
        total: adapter.getUsageLog().length,
        activities: adapter.getUsageLog(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve activities', details: err.message });
    }
  });

  // --- Controlled Live Heatmap Endpoint ---

  /**
   * POST /api/integrations/fortyguard/heatmap
   * Backend-controlled heatmap execution for a registered site.
   */
  router.post('/integrations/fortyguard/heatmap', async (req: Request, res: Response) => {
    try {
      const { site_id, dateTime, granularity } = req.body;
      const targetSiteId = site_id || 'PHX-SITE-01';

      let site = db ? db.getSiteById(targetSiteId) : null;
      if (!site) {
        site = {
          site_id: targetSiteId,
          name: 'Sentinel Phoenix Construction Site',
          latitude: 33.4484,
          longitude: -112.0740,
          zone_id: 'ZONE-A',
          worker_count: 50,
          cooling_resources: { shade_stations: 2, water_points: 4, misting_fans: 2, ac_trailers: 1 },
          emergency_policy_id: 'POL-HEAT-2026',
        };
      }

      const result = await adapter.fetchSiteObservation(site, {
        dateTime: dateTime || new Date().toISOString(),
        granularity: granularity || 80,
      });

      if (db && result.observation.provenance?.activity_id) {
        db.recordFortyGuardActivity({
          activity_id: result.observation.provenance.activity_id,
          endpoint: '/v1/heatmap',
          status: 'COMPLETED',
          submitted_at: result.observation.timestamp,
          completed_at: result.observation.provenance.retrieved_at,
          site_id: targetSiteId,
        });
      }

      res.json({
        status: 'success',
        source: result.cacheHit ? 'FORTYGUARD_CACHE' : 'FORTYGUARD_LIVE',
        observation: result.observation,
      });
    } catch (err: any) {
      res.status(err.http_status || 500).json({
        status: 'error',
        error: err.message,
        code: err.code || err.errorCode || 'HEATMAP_FAILED',
        retryable: err.retryable || false,
      });
    }
  });

  // --- Controlled Live Environmental Parameters Endpoint ---

  /**
   * POST /api/integrations/fortyguard/environment
   * Backend-controlled environmental parameters query.
   */
  router.post('/integrations/fortyguard/environment', async (req: Request, res: Response) => {
    try {
      const { site_id, dateTime, temperature } = req.body;
      const targetSiteId = site_id || 'PHX-SITE-01';

      let site = db ? db.getSiteById(targetSiteId) : null;
      const lat = site?.latitude || 33.4484;
      const lon = site?.longitude || -112.0740;
      const temp = temperature || 38.5;
      const dt = dateTime || new Date().toISOString();

      const response = await adapter.submitEnvParams({
        latitude: lat,
        longitude: lon,
        temperature: temp,
        date_time: dt,
      });

      if (db && response.data.activity_id) {
        db.recordFortyGuardActivity({
          activity_id: response.data.activity_id,
          endpoint: '/v1/env_params',
          status: 'SUBMITTED',
          submitted_at: response.data.submitted_at || dt,
          site_id: targetSiteId,
        });
      }

      res.json({
        status: 'success',
        submission: response,
      });
    } catch (err: any) {
      res.status(err.http_status || 500).json({
        status: 'error',
        error: err.message,
        code: err.code || err.errorCode || 'ENV_PARAMS_FAILED',
      });
    }
  });

  // --- Diagnostics & Mode Controls ---

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
      const normalizedMode =
        mode === 'live' ? 'fortyguard' : mode === 'simulation' ? 'hybrid' : mode;

      if (
        normalizedMode !== 'offline' &&
        normalizedMode !== 'fortyguard' &&
        normalizedMode !== 'hybrid'
      ) {
        return res
          .status(400)
          .json({ error: 'Invalid mode. Must be "offline", "fortyguard" (live), or "hybrid" (simulation).' });
      }

      if (orchestrator) {
        orchestrator.setThermalDataMode(normalizedMode as ThermalDataMode);
      }

      res.json({
        status: 'updated',
        active_mode: normalizedMode,
        external_label: mode,
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
