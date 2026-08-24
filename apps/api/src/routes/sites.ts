import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';

export function createSitesRouter(db: SentinelDatabase): Router {
  const router = Router();

  router.get('/sites', (_req: Request, res: Response) => {
    try {
      const sites = db.getSites();
      res.json({
        count: sites.length,
        sites,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve sites', details: err.message });
    }
  });

  return router;
}
