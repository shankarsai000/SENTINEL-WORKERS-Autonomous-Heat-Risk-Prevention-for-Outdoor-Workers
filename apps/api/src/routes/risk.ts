import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';
import { PolicyLoader } from '@sentinel/policy';

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

      let totalConfidence = 0;
      let staleDataCount = 0;
      const clusterZones = new Set<string>();

      for (const r of riskStates) {
        if (counts[r.level] !== undefined) {
          counts[r.level]++;
        }
        totalConfidence += r.confidence ?? 1.0;
        if (r.data_freshness === 'STALE') {
          staleDataCount++;
        }
        if (r.zone_score && r.zone_score > 0.3) {
          clusterZones.add(r.site_id);
        }
      }

      const avgConfidence = total > 0 ? Math.round((totalConfidence / total) * 100) / 100 : 0.95;
      const highestRiskWorkers = riskStates.slice(0, 5).map((r) => ({
        worker_id: r.worker_id,
        site_id: r.site_id,
        level: r.level,
        score: r.score,
        confidence: r.confidence,
        reason_codes: r.reason_codes,
      }));

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
        average_confidence: avgConfidence,
        stale_data_count: staleDataCount,
        cluster_count: clusterZones.size,
        highest_risk_workers: highestRiskWorkers,
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

  router.get('/risk/workers/:workerId', (req: Request, res: Response) => {
    try {
      const workerId = req.params.workerId as string;
      const workers = db.getWorkers();
      const worker = workers.find((w) => w.worker_id === workerId);
      if (!worker) {
        return res.status(404).json({ error: `Worker ${workerId} not found` });
      }

      const history = db.getWorkerRiskHistory(workerId, 20);
      const latestState = history[0] || null;

      const events = db.getDecisionEvents(50).filter((e) => e.worker_id === workerId || e.input_refs?.worker_id === workerId);

      res.json({
        worker,
        latest_risk_state: latestState,
        history,
        decision_events: events,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve worker detail', details: err.message });
    }
  });

  router.get('/risk/policies', (_req: Request, res: Response) => {
    try {
      const policies = PolicyLoader.getAllPolicies();
      res.json({
        count: policies.length,
        policies,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve safety policies', details: err.message });
    }
  });

  router.get('/risk/events', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = db.getDecisionEvents(limit);
      res.json({
        count: events.length,
        events,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve decision events', details: err.message });
    }
  });

  router.get('/risk/config', (_req: Request, res: Response) => {
    try {
      const activePolicy = PolicyLoader.getPolicy();
      res.json({
        active_policy_id: activePolicy.policy_id,
        version: activePolicy.version,
        scoring_weights: activePolicy.scoring_weights,
        risk_bands: activePolicy.risk_bands,
        guardrails: activePolicy.guardrails,
        freshness_rules: activePolicy.freshness_rules,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve risk config', details: err.message });
    }
  });

  return router;
}
