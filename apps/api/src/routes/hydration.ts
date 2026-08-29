import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';
import { HydrationEngine, HydrationPlan } from '@sentinel/hydration-engine';

export function createHydrationRouter(db: SentinelDatabase): Router {
  const router = Router();
  const engine = new HydrationEngine();

  /**
   * GET /api/workers/:workerId/hydration
   * Returns personalized hydration plan for a specific worker.
   */
  router.get('/workers/:workerId/hydration', (req: Request, res: Response) => {
    try {
      const workerId = String(req.params.workerId);
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';

      // Fetch worker
      const workers = db.getWorkers(siteId);
      const worker = workers.find((w) => w.worker_id === workerId);
      if (!worker) {
        return res.status(404).json({ error: `Worker ${workerId} not found` });
      }

      // Fetch latest observation for environment
      const observations = db.getRecentObservations(5);
      const latestObs = observations.find((o) => o.site_id === siteId) || observations[0];

      // Fetch latest risk state
      const riskHistory = db.getWorkerRiskHistory(workerId, 1);
      const currentRisk = riskHistory[0];

      if (!latestObs) {
        return res.status(503).json({ error: 'No environmental data available yet' });
      }

      const plan = engine.calculatePlan({
        taskIntensity: worker.task_intensity,
        acclimatizationStatus: worker.risk_modifier,
        wbgt_c: latestObs.wet_bulb_c,
        temperature_c: latestObs.temperature_c,
        humidity_pct: latestObs.humidity_pct,
        exposureDurationMins: currentRisk?.exposure_duration_mins ?? 60,
        workerRole: worker.role,
        riskLevel: currentRisk?.level,
      });

      res.json({
        worker_id: workerId,
        site_id: siteId,
        plan,
        environment: {
          wbgt_c: latestObs.wet_bulb_c,
          temperature_c: latestObs.temperature_c,
          humidity_pct: latestObs.humidity_pct,
          source: latestObs.source,
        },
        worker_context: {
          task_intensity: worker.task_intensity,
          acclimatization: worker.risk_modifier,
          role: worker.role,
          risk_level: currentRisk?.level || 'GREEN',
        },
        generated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate hydration plan', details: err.message });
    }
  });

  /**
   * GET /api/hydration/site/:siteId
   * Returns aggregate hydration intelligence for all workers at a site.
   */
  router.get('/hydration/site/:siteId', (req: Request, res: Response) => {
    try {
      const siteId = String(req.params.siteId || 'PHX-SITE-01');
      const workers = db.getWorkers(siteId);

      const observations = db.getRecentObservations(5);
      const latestObs = observations.find((o) => o.site_id === siteId) || observations[0];

      if (!latestObs) {
        return res.status(503).json({ error: 'No environmental data available' });
      }

      const plans: Array<{ worker_id: string; plan: HydrationPlan }> = [];
      let aggressiveCount = 0;
      let criticalCount = 0;
      let electrolyteCount = 0;
      let totalHourlyMl = 0;

      for (const worker of workers) {
        const riskHistory = db.getWorkerRiskHistory(worker.worker_id, 1);
        const currentRisk = riskHistory[0];

        const plan = engine.calculatePlan({
          taskIntensity: worker.task_intensity,
          acclimatizationStatus: worker.risk_modifier,
          wbgt_c: latestObs.wet_bulb_c,
          temperature_c: latestObs.temperature_c,
          humidity_pct: latestObs.humidity_pct,
          exposureDurationMins: currentRisk?.exposure_duration_mins ?? 60,
          workerRole: worker.role,
          riskLevel: currentRisk?.level,
        });

        plans.push({ worker_id: worker.worker_id, plan });

        if (plan.urgency === 'AGGRESSIVE') aggressiveCount++;
        if (plan.urgency === 'CRITICAL') criticalCount++;
        if (plan.electrolyteRecommended) electrolyteCount++;
        totalHourlyMl += plan.hourlyRequirementMl;
      }

      const avgInterval = plans.length > 0
        ? Math.round(plans.reduce((sum, p) => sum + p.plan.intervalMinutes, 0) / plans.length)
        : 20;

      res.json({
        site_id: siteId,
        total_workers: workers.length,
        average_interval_minutes: avgInterval,
        aggressive_hydration_count: aggressiveCount,
        critical_hydration_count: criticalCount,
        electrolyte_recommended_count: electrolyteCount,
        total_hourly_site_requirement_liters: Math.round(totalHourlyMl / 1000),
        environment: {
          wbgt_c: latestObs.wet_bulb_c,
          temperature_c: latestObs.temperature_c,
          humidity_pct: latestObs.humidity_pct,
        },
        generated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate site hydration summary', details: err.message });
    }
  });

  return router;
}
