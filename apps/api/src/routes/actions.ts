import { Router, Request, Response } from 'express';
import { SentinelOrchestrator } from '../services/orchestrator.js';
import { SentinelDatabase } from '../db/database.js';

export function createActionsRouter(orchestrator: SentinelOrchestrator, db: SentinelDatabase): Router {
  const router = Router();

  router.get('/actions', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const actions = db.getRecentActions(limit);
      res.json({
        count: actions.length,
        actions,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve actions', details: err.message });
    }
  });

  router.post('/actions/:id/ack', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const actor = req.body.actor || 'Supervisor';
      const updated = orchestrator.acknowledgeAction(id, actor);

      if (!updated) {
        return res.status(404).json({ error: `Action ${id} not found` });
      }

      res.json({
        status: 'success',
        action: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to acknowledge action', details: err.message });
    }
  });

  router.post('/actions/:id/override', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { reason, actor } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Override reason is required' });
      }

      const updated = orchestrator.overrideAction(id, reason, actor || 'Supervisor');

      if (!updated) {
        return res.status(404).json({ error: `Action ${id} not found` });
      }

      res.json({
        status: 'success',
        action: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to override action', details: err.message });
    }
  });

  return router;
}
