import { Router, Request, Response, NextFunction } from 'express';
import { faultInjector } from '../services/fault-injector.js';
import { metrics } from '../services/metrics.js';
import { SentinelOrchestrator } from '../services/orchestrator.js';
import { SentinelDatabase } from '../db/database.js';

export function createDevRouter(orchestrator: SentinelOrchestrator, db: SentinelDatabase): Router {
  const router = Router();

  // Strict Production Mode Gating Middleware
  router.use((_req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Development fault injection and reset endpoints are strictly disabled in production mode.',
        },
      });
    }
    next();
  });

  // 1. GET /api/dev/faults
  router.get('/dev/faults', (_req: Request, res: Response) => {
    res.json({
      enabled_faults: faultInjector.getEnabledFaults(),
      count: faultInjector.getEnabledFaults().length,
    });
  });

  // 2. POST /api/dev/faults
  router.post('/dev/faults', (req: Request, res: Response) => {
    const { fault, enabled = true } = req.body;
    if (!fault || typeof fault !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_FAULT_SPEC',
          message: 'Field "fault" is required and must be a valid fault string.',
        },
      });
    }

    faultInjector.setFault(fault, Boolean(enabled));
    res.json({
      status: 'success',
      fault: fault.toUpperCase(),
      enabled: Boolean(enabled),
      enabled_faults: faultInjector.getEnabledFaults(),
    });
  });

  // 3. DELETE /api/dev/faults/:fault
  router.delete('/dev/faults/:fault', (req: Request, res: Response) => {
    const fault = String(req.params.fault);
    faultInjector.clearFault(fault);
    res.json({
      status: 'cleared',
      fault: fault.toUpperCase(),
      enabled_faults: faultInjector.getEnabledFaults(),
    });
  });

  // 4. POST /api/dev/reset
  router.post('/dev/reset', (_req: Request, res: Response) => {
    try {
      // 1. Clear active faults
      faultInjector.clearAllFaults();

      // 2. Reset metrics
      metrics.reset();

      // 3. Reset orchestrator and simulation engine
      orchestrator.resetSimulation();

      // 4. Reset DB non-structural state
      db.db.exec(`
        DELETE FROM actions;
        DELETE FROM action_deliveries;
        DELETE FROM action_acknowledgements;
        DELETE FROM escalations;
        DELETE FROM incidents;
        DELETE FROM risk_states;
        DELETE FROM predictive_risk_states;
        DELETE FROM thermal_observations;
        DELETE FROM audit_events;
        DELETE FROM api_usage;
      `);

      // 5. Re-seed default demo incident or audit
      orchestrator.getAuditService()?.recordAuditEvent('SIMULATION_STATE_CHANGED', 'dev_reset', {
        action: 'DEVELOPMENT_SYSTEM_RESET',
        timestamp: new Date().toISOString(),
      });

      res.json({
        status: 'reset_complete',
        message: 'All simulation data, actions, incidents, metrics, and audit logs have been reset.',
        simulation_state: orchestrator.getSimulationState(),
      });
    } catch (err: any) {
      res.status(500).json({
        error: {
          code: 'RESET_FAILED',
          message: 'Failed to reset development state: ' + err.message,
        },
      });
    }
  });

  return router;
}
