import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';

export function createWorkersRouter(db: SentinelDatabase): Router {
  const router = Router();

  router.get('/workers', (req: Request, res: Response) => {
    try {
      const siteId = req.query.site_id as string | undefined;
      const workers = db.getWorkers(siteId);
      res.json({
        count: workers.length,
        filter_site_id: siteId ?? null,
        workers,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve workers', details: err.message });
    }
  });

  return router;
}
