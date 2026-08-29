import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';
import { SchedulingEngine, WorkTask } from '@sentinel/scheduling-engine';

export function createSchedulingRouter(db: SentinelDatabase): Router {
  const router = Router();
  const engine = new SchedulingEngine();

  // Seed default site tasks
  const defaultTasks: WorkTask[] = [
    { id: 'TSK-01', name: 'Open Excavation & Earthwork', zone_id: 'ZONE-A', durationHours: 4, intensity: 'HEAVY', tempSensitive: true, assignedWorkers: 24 },
    { id: 'TSK-02', name: 'Structural Concrete Pouring', zone_id: 'ZONE-B', durationHours: 4, intensity: 'HEAVY', tempSensitive: true, assignedWorkers: 38 },
    { id: 'TSK-03', name: 'Steel Framing & Joist Erection', zone_id: 'ZONE-C', durationHours: 4, intensity: 'MODERATE', tempSensitive: false, assignedWorkers: 31 },
    { id: 'TSK-04', name: 'Pre-Shift Safety & Quality Inspection', zone_id: 'ZONE-D', durationHours: 2, intensity: 'LIGHT', tempSensitive: false, assignedWorkers: 20 },
  ];

  /**
   * GET /api/scheduling/current
   * Returns current AI-optimized schedule vs naive sequential schedule
   */
  router.get('/scheduling/current', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const forecast = engine.generatePhoenixForecast(42.5);
      const result = engine.optimizeSchedule(defaultTasks, forecast, siteId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate schedule', details: err.message });
    }
  });

  /**
   * POST /api/scheduling/optimize
   * Custom optimization with user-submitted tasks & peak temp
   */
  router.post('/scheduling/optimize', (req: Request, res: Response) => {
    try {
      const siteId = req.body.site_id || 'PHX-SITE-01';
      const peakTemp = parseFloat(req.body.peak_temp_c || 42.5);
      const tasks: WorkTask[] = req.body.tasks && Array.isArray(req.body.tasks) && req.body.tasks.length > 0
        ? req.body.tasks
        : defaultTasks;

      const forecast = engine.generatePhoenixForecast(peakTemp);
      const result = engine.optimizeSchedule(tasks, forecast, siteId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to optimize custom schedule', details: err.message });
    }
  });

  return router;
}
