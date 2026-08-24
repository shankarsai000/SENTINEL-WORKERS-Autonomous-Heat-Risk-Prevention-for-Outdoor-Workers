import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';
import { AuditService } from '../services/audit-service.js';

export function createEventsRouter(db: SentinelDatabase, audit: AuditService): Router {
  const router = Router();

  router.get('/events', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = audit.getRecentAuditEvents(limit);
      res.json({
        count: events.length,
        events,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve audit events', details: err.message });
    }
  });

  router.get('/incidents', (_req: Request, res: Response) => {
    try {
      const incidents = db.getIncidents();
      res.json({
        count: incidents.length,
        incidents,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve incidents', details: err.message });
    }
  });

  return router;
}
