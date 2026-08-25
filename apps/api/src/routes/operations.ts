import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';
import { SentinelOrchestrator } from '../services/orchestrator.js';
import { PriorityEngine } from '../services/priority-engine.js';
import { OperationsSummary, RiskState, PredictiveRiskState, Action } from '@sentinel/schemas';

export function createOperationsRouter(orchestrator: SentinelOrchestrator, db: SentinelDatabase): Router {
  const router = Router();

  // 1. GET /api/operations/summary
  router.get('/operations/summary', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const workers = db.getWorkers(siteId);
      const incidents = db.getIncidents({ site_id: siteId });
      const actions = db.getActions({ site_id: siteId, limit: 100 });
      const latestObs = db.getRecentObservations(1)[0];

      const riskMap = new Map<string, RiskState>();
      const predMap = new Map<string, PredictiveRiskState>();

      let greenCount = 0;
      let watchCount = 0;
      let elevatedCount = 0;
      let highCount = 0;
      let criticalCount = 0;
      let staleCount = 0;
      let predDeteriorationCount = 0;

      for (const w of workers) {
        const rHistory = db.getWorkerRiskHistory(w.worker_id, 1);
        const r = rHistory[0];
        if (r) {
          riskMap.set(w.worker_id, r);
          if (r.level === 'GREEN') greenCount++;
          else if (r.level === 'WATCH') watchCount++;
          else if (r.level === 'ELEVATED') elevatedCount++;
          else if (r.level === 'HIGH') highCount++;
          else if (r.level === 'CRITICAL') criticalCount++;

          if (r.data_freshness === 'STALE') staleCount++;
        } else {
          greenCount++;
        }

        const pHistory = db.getWorkerPredictiveHistory(w.worker_id, 1);
        const p = pHistory[0];
        if (p) {
          predMap.set(w.worker_id, p);
          if (p.predicted_risk_level === 'HIGH' || p.predicted_risk_level === 'CRITICAL' || p.early_warning) {
            predDeteriorationCount++;
          }
        }
      }

      const pendingAckCount = actions.filter((a) => a.status === 'ACK_PENDING').length;
      const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
      const escalatedIncidents = incidents.filter((i) => i.severity === 'CRITICAL' || i.status === 'ACTIVE' && i.severity === 'HIGH').length;

      // Determine FortyGuard and engine status
      const providerState = (orchestrator.getFortyGuardAdapter() as any)?.getProviderStatus?.() || { healthy: true };
      const fortyguardStatus = providerState.healthy ? 'CONNECTED' : 'DEGRADED';

      const dataFreshness: 'FRESH' | 'AGING' | 'STALE' =
        staleCount > workers.length * 0.3 ? 'STALE' : staleCount > 0 ? 'AGING' : 'FRESH';

      const summary: OperationsSummary = {
        active_workers: workers.length,
        green_count: greenCount,
        watch_count: watchCount,
        elevated_count: elevatedCount,
        high_count: highCount,
        critical_count: criticalCount,
        predicted_deterioration_count: predDeteriorationCount,
        pending_ack_count: pendingAckCount,
        active_incidents: activeIncidents,
        escalated_incidents: escalatedIncidents,
        stale_data_count: staleCount,
        fortyguard_status: fortyguardStatus,
        risk_engine_status: 'HEALTHY',
        prediction_status: 'HEALTHY',
        action_engine_status: 'HEALTHY',
        system_status: dataFreshness === 'STALE' ? 'DEGRADED' : 'ACTIVE',
        data_freshness: dataFreshness,
        last_updated: latestObs?.timestamp || new Date().toISOString(),
      };

      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to compute operations summary', details: err.message });
    }
  });

  // 2. GET /api/operations/priority
  router.get('/operations/priority', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const limit = parseInt(req.query.limit as string) || 100;
      const riskFilter = req.query.risk as string | undefined;

      const workers = db.getWorkers(siteId);
      const currentRisks = new Map<string, RiskState>();
      const predictions = new Map<string, PredictiveRiskState>();
      const recentActions = new Map<string, Action>();

      for (const w of workers) {
        const r = db.getWorkerRiskHistory(w.worker_id, 1)[0];
        if (r) currentRisks.set(w.worker_id, r);

        const p = db.getWorkerPredictiveHistory(w.worker_id, 1)[0];
        if (p) predictions.set(w.worker_id, p);

        const a = db.getActions({ worker_id: w.worker_id, limit: 1 })[0];
        if (a) recentActions.set(w.worker_id, a);
      }

      const incidents = db.getIncidents({ site_id: siteId });
      const activeIncidentsByZone = new Map<string, string>();
      for (const inc of incidents) {
        if (inc.status !== 'RESOLVED' && inc.status !== 'CLOSED') {
          activeIncidentsByZone.set(inc.zone_id, inc.incident_id);
        }
      }

      let ranked = PriorityEngine.rankWorkers({
        workers,
        currentRisks,
        predictions,
        recentActions,
        activeIncidentsByZone,
      });

      if (riskFilter && riskFilter !== 'ALL') {
        ranked = ranked.filter((item) => {
          if (riskFilter === 'WATCH+') return item.current_risk_level !== 'GREEN';
          if (riskFilter === 'ELEVATED+') return item.current_risk_level === 'ELEVATED' || item.current_risk_level === 'HIGH' || item.current_risk_level === 'CRITICAL';
          if (riskFilter === 'HIGH+') return item.current_risk_level === 'HIGH' || item.current_risk_level === 'CRITICAL';
          if (riskFilter === 'CRITICAL') return item.current_risk_level === 'CRITICAL';
          return item.current_risk_level === riskFilter;
        });
      }

      res.json({
        total: ranked.length,
        items: ranked.slice(0, limit),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to compute priority queue', details: err.message });
    }
  });

  // 3. GET /api/operations/map
  router.get('/operations/map', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const sites = db.getSites();
      const site = sites.find((s) => s.site_id === siteId) || sites[0] || {
        site_id: 'PHX-SITE-01',
        name: 'Phoenix Central Jobsite',
        latitude: 33.4484,
        longitude: -112.074,
        zone_id: 'ZONE-A',
        worker_count: 50,
        cooling_resources: { shade_stations: 4, water_points: 6, misting_fans: 2, ac_trailers: 1 },
      };

      const workers = db.getWorkers(siteId);
      const incidents = db.getIncidents({ site_id: siteId });

      // Zones layout
      const zones = [
        { zone_id: 'ZONE-A', name: 'Zone A - Open Excavation', x: 20, y: 25, radius: 18, base_temp_delta: 1.2 },
        { zone_id: 'ZONE-B', name: 'Zone B - Structural Concrete', x: 70, y: 30, radius: 20, base_temp_delta: 0.8 },
        { zone_id: 'ZONE-C', name: 'Zone C - Steel Framing', x: 35, y: 75, radius: 22, base_temp_delta: 1.5 },
        { zone_id: 'ZONE-D', name: 'Zone D - Shaded Staging Area', x: 80, y: 75, radius: 15, base_temp_delta: -2.0 },
      ];

      // Cooling resources
      const coolingPoints = [
        { id: 'COOL-1', type: 'AC_TRAILER', name: 'Mobile AC Rest Trailer #1', x: 50, y: 50, capacity: 15 },
        { id: 'COOL-2', type: 'SHADE_STATION', name: 'Misting Shade Tent North', x: 25, y: 20, capacity: 10 },
        { id: 'COOL-3', type: 'SHADE_STATION', name: 'Misting Shade Tent South', x: 75, y: 70, capacity: 10 },
        { id: 'COOL-4', type: 'HYDRATION_STATION', name: 'Electrolyte Refill Station East', x: 65, y: 35, capacity: 20 },
      ];

      // Worker markers with deterministic synthetic spatial distribution
      const workerMarkers = workers.map((w, index) => {
        const assignedZone = zones[index % zones.length];
        const angle = (index * 137.5) * (Math.PI / 180);
        const distance = ((index % 7) / 7) * (assignedZone.radius - 4);
        const x = Math.round((assignedZone.x + Math.cos(angle) * distance) * 10) / 10;
        const y = Math.round((assignedZone.y + Math.sin(angle) * distance) * 10) / 10;

        const r = db.getWorkerRiskHistory(w.worker_id, 1)[0];
        const p = db.getWorkerPredictiveHistory(w.worker_id, 1)[0];
        const a = db.getActions({ worker_id: w.worker_id, limit: 1 })[0];

        return {
          worker_id: w.worker_id,
          role: w.role,
          zone_id: assignedZone.zone_id,
          x,
          y,
          current_risk_level: r?.level || 'GREEN',
          current_risk_score: r?.score || 0.15,
          predicted_risk_level: p?.predicted_risk_level || 'STABLE',
          early_warning: Boolean(p?.early_warning),
          action_status: a?.status || 'NO_ACTION',
          is_simulated: true,
        };
      });

      // Cluster overlays
      const clusters = incidents
        .filter((inc) => inc.status !== 'RESOLVED' && inc.status !== 'CLOSED')
        .map((inc) => {
          const zone = zones.find((z) => z.zone_id === inc.zone_id) || zones[0];
          return {
            incident_id: inc.incident_id,
            zone_id: inc.zone_id,
            severity: inc.severity,
            status: inc.status,
            affected_worker_count: inc.affected_worker_count,
            center_x: zone.x,
            center_y: zone.y,
            radius: zone.radius + 4,
          };
        });

      res.json({
        site_id: site.site_id,
        site_name: site.name,
        latitude: site.latitude,
        longitude: site.longitude,
        location_disclaimer: 'SIMULATED WORKER LOCATIONS',
        zones,
        cooling_points: coolingPoints,
        workers: workerMarkers,
        clusters,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to construct operations map', details: err.message });
    }
  });

  // 4. GET /api/operations/action-stream
  router.get('/operations/action-stream', (req: Request, res: Response) => {
    try {
      const siteId = req.query.site_id as string | undefined;
      const workerId = req.query.worker_id as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const actions = db.getActions({ site_id: siteId, worker_id: workerId, limit });
      const stream = actions.map((a) => {
        const deliveries = db.getDeliveriesForAction(a.action_id);
        const acks = db.getAcknowledgementsForAction(a.action_id);
        return {
          action_id: a.action_id,
          worker_id: a.worker_id,
          site_id: a.site_id,
          action_type: a.action_type,
          priority: a.priority || 'MEDIUM',
          status: a.status || 'COMPLETED',
          issued_at: a.issued_at,
          delivered_at: a.delivered_at,
          acknowledged_at: a.acknowledged_at,
          message: a.message,
          actor: a.actor,
          delivery_count: deliveries.length,
          acknowledgement_count: acks.length,
          is_simulated: a.is_simulated ?? true,
        };
      });

      res.json({
        count: stream.length,
        stream,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve action stream', details: err.message });
    }
  });

  // 5. GET /api/operations/freshness
  router.get('/operations/freshness', (req: Request, res: Response) => {
    try {
      const recentObs = db.getRecentObservations(10);
      const latest = recentObs[0];
      const now = Date.now();
      const ageSeconds = latest ? Math.round((now - new Date(latest.timestamp).getTime()) / 1000) : 999;

      let freshnessState: 'FRESH' | 'AGING' | 'STALE' = 'FRESH';
      if (ageSeconds > 900) freshnessState = 'STALE';
      else if (ageSeconds > 300) freshnessState = 'AGING';

      res.json({
        latest_observation_time: latest?.timestamp || null,
        age_seconds: ageSeconds,
        freshness: freshnessState,
        source: latest?.source || 'simulation',
        sample_count: recentObs.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve data freshness telemetry', details: err.message });
    }
  });

  // 6. GET /api/workers/:id
  router.get('/workers/:id', (req: Request, res: Response) => {
    try {
      const workerId = String(req.params.id);
      const allWorkers = db.getWorkers();
      const worker = allWorkers.find((w) => w.worker_id === workerId) || {
        worker_id: workerId,
        site_id: 'PHX-SITE-01',
        role: 'Laborer' as const,
        shift_start: '06:00',
        shift_end: '14:30',
        task_intensity: 'HEAVY' as const,
        channel: 'SMS_SIMULATED' as const,
        consent_flags: { data_processing: true, notification_consent: true },
        risk_modifier: 'elevated' as const,
      };

      const riskHistory = db.getWorkerRiskHistory(workerId, 10);
      const predHistory = db.getWorkerPredictiveHistory(workerId, 10);
      const actions = db.getActions({ worker_id: workerId, limit: 10 });
      const timeline = db.getWorkerTimeline(workerId, 30);
      const incidents = db.getIncidents();
      const activeIncident = incidents.find((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED' && i.worker_ids?.includes(workerId));

      res.json({
        worker,
        current_risk: riskHistory[0] || null,
        predicted_risk: predHistory[0] || null,
        risk_history: riskHistory,
        predictive_history: predHistory,
        recent_actions: actions,
        timeline,
        active_incident: activeIncident || null,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve worker detail', details: err.message });
    }
  });

  // 7. GET /api/sites/:id/overview
  router.get('/sites/:id/overview', (req: Request, res: Response) => {
    try {
      const siteId = String(req.params.id);
      const sites = db.getSites();
      const site = sites.find((s) => s.site_id === siteId) || sites[0];
      const workers = db.getWorkers(siteId);
      const incidents = db.getIncidents({ site_id: siteId });

      let highRiskCount = 0;
      let criticalRiskCount = 0;
      for (const w of workers) {
        const r = db.getWorkerRiskHistory(w.worker_id, 1)[0];
        if (r?.level === 'HIGH') highRiskCount++;
        else if (r?.level === 'CRITICAL') criticalRiskCount++;
      }

      res.json({
        site,
        active_workers: workers.length,
        high_risk_workers: highRiskCount,
        critical_risk_workers: criticalRiskCount,
        active_incidents: incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
        cooling_resources: site.cooling_resources,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve site overview', details: err.message });
    }
  });

  return router;
}
