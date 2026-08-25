import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';

export function createPredictionRouter(db: SentinelDatabase): Router {
  const router = Router();

  router.get('/prediction/summary', (_req: Request, res: Response) => {
    try {
      const predictions = db.getLatestPredictiveRiskStates();
      const total = predictions.length;

      let earlyWarningCount = 0;
      let deterioratingCount = 0;
      let predictedHighCount = 0;
      let predictedCriticalCount = 0;
      let totalConfidence = 0;
      let availableCount = 0;

      for (const p of predictions) {
        if (p.early_warning) earlyWarningCount++;
        if (p.predictive_state === 'DETERIORATING') deterioratingCount++;
        if (p.predicted_risk_level === 'HIGH') predictedHighCount++;
        if (p.predicted_risk_level === 'CRITICAL') predictedCriticalCount++;
        if (p.prediction_status === 'AVAILABLE') availableCount++;
        totalConfidence += p.prediction_confidence;
      }

      const avgConfidence = total > 0 ? Math.round((totalConfidence / total) * 100) / 100 : 0.0;

      const highestRiskPredictions = predictions.slice(0, 5).map((p) => ({
        worker_id: p.worker_id,
        site_id: p.site_id,
        current_risk_level: p.current_risk_level,
        predicted_risk_level: p.predicted_risk_level,
        p_elevated_30m: p.p_elevated_30m,
        p_critical_60m: p.p_critical_60m,
        expected_time_to_threshold_minutes: p.expected_time_to_threshold_minutes,
        early_warning: p.early_warning,
        prediction_confidence: p.prediction_confidence,
      }));

      res.json({
        total_predictions: total,
        available_predictions: availableCount,
        early_warning_count: earlyWarningCount,
        deteriorating_count: deterioratingCount,
        predicted_high_count: predictedHighCount,
        predicted_critical_count: predictedCriticalCount,
        average_confidence: avgConfidence,
        highest_risk_predictions: highestRiskPredictions,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve prediction summary', details: err.message });
    }
  });

  router.get('/prediction/workers', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const siteId = req.query.site_id as string | undefined;
      let predictions = db.getLatestPredictiveRiskStates();

      if (siteId) {
        predictions = predictions.filter((p) => p.site_id === siteId);
      }

      const allWorkers = db.getWorkers();
      const workerMap = new Map(allWorkers.map((w) => [w.worker_id, w]));

      const enriched = predictions.slice(0, limit).map((p) => ({
        ...p,
        worker_metadata: workerMap.get(p.worker_id) ?? null,
      }));

      res.json({
        count: enriched.length,
        total: predictions.length,
        predictions: enriched,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve worker predictions', details: err.message });
    }
  });

  router.get('/prediction/workers/:workerId', (req: Request, res: Response) => {
    try {
      const workerId = req.params.workerId as string;
      const workers = db.getWorkers();
      const worker = workers.find((w) => w.worker_id === workerId);
      if (!worker) {
        return res.status(404).json({ error: `Worker ${workerId} not found` });
      }

      const history = db.getWorkerPredictiveHistory(workerId, 20);
      const latestPrediction = history[0] || null;

      const riskHistory = db.getWorkerRiskHistory(workerId, 20);
      const latestRisk = riskHistory[0] || null;

      const events = db.getPredictionEvents(50).filter((e) => e.worker_id === workerId);

      res.json({
        worker,
        latest_risk_state: latestRisk,
        latest_prediction: latestPrediction,
        prediction_history: history,
        events,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve worker prediction detail', details: err.message });
    }
  });

  router.get('/prediction/models', (_req: Request, res: Response) => {
    try {
      const models = db.getModelVersions();
      res.json({
        count: models.length,
        models,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve predictive models', details: err.message });
    }
  });

  router.get('/prediction/events', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = db.getPredictionEvents(limit);
      res.json({
        count: events.length,
        events,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve prediction events', details: err.message });
    }
  });

  return router;
}
