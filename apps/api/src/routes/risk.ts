import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';

export function createRiskRouter(db: SentinelDatabase): Router {
  const router = Router();

  router.get('/risk/summary', (_req: Request, res: Response) => {
    try {
      const riskStates = db.getLatestRiskStates();
      const total = riskStates.length;

      const counts = {
        GREEN: 0,
        WATCH: 0,
        ELEVATED: 0,
        HIGH: 0,
        CRITICAL: 0,
      };

      for (const r of riskStates) {
        if (counts[r.level] !== undefined) {
          counts[r.level]++;
        }
      }

      res.json({
        total_active_workers: total,
        timestamp: new Date().toISOString(),
        distribution: counts,
        percentages: {
          GREEN: total > 0 ? Math.round((counts.GREEN / total) * 100) : 0,
          WATCH: total > 0 ? Math.round((counts.WATCH / total) * 100) : 0,
          ELEVATED: total > 0 ? Math.round((counts.ELEVATED / total) * 100) : 0,
          HIGH: total > 0 ? Math.round((counts.HIGH / total) * 100) : 0,
          CRITICAL: total > 0 ? Math.round((counts.CRITICAL / total) * 100) : 0,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve risk summary', details: err.message });
    }
  });

  router.get('/risk/workers', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const siteId = req.query.site_id as string | undefined;
      let states = db.getLatestRiskStates();

      if (siteId) {
        states = states.filter((s) => s.site_id === siteId);
      }

      // Join worker role and name metadata
      const allWorkers = db.getWorkers();
      const workerMap = new Map(allWorkers.map((w) => [w.worker_id, w]));

      const enriched = states.slice(0, limit).map((s) => ({
        ...s,
        worker_metadata: workerMap.get(s.worker_id) ?? null,
      }));

      res.json({
        count: enriched.length,
        total: states.length,
        workers: enriched,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve worker risk states', details: err.message });
    }
  });

  return router;
}
