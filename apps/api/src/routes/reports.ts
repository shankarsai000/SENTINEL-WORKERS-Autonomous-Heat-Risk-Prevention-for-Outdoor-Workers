import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';
import { SentinelOrchestrator } from '../services/orchestrator.js';

export function createReportsRouter(orchestrator: SentinelOrchestrator, db: SentinelDatabase): Router {
  const router = Router();

  /**
   * GET /api/reports/shift
   * Generate a shift report with aggregated safety metrics.
   */
  router.get('/reports/shift', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const date = (req.query.date as string) || new Date().toISOString().substring(0, 10);
      const shift = (req.query.shift as string) || 'morning';

      // Determine shift time boundaries
      const shiftBounds = getShiftBounds(date, shift);

      // Gather workers for site
      const workers = db.getWorkers(siteId);

      // Gather observations in shift window
      const observations = db.getRecentObservations(200).filter(
        (o) => o.site_id === siteId && o.timestamp >= shiftBounds.start && o.timestamp <= shiftBounds.end
      );

      // Gather risk states in shift window
      const allRiskStates: any[] = [];
      for (const w of workers) {
        const history = db.getWorkerRiskHistory(w.worker_id, 50);
        const inWindow = history.filter(
          (r) => r.timestamp >= shiftBounds.start && r.timestamp <= shiftBounds.end
        );
        allRiskStates.push(...inWindow);
      }

      // Gather actions in shift window
      const actions = db.getActions({ site_id: siteId, limit: 500 }).filter(
        (a) => a.issued_at >= shiftBounds.start && a.issued_at <= shiftBounds.end
      );

      // Gather incidents in shift window
      const incidents = db.getIncidents({ site_id: siteId }).filter(
        (i) => i.opened_at >= shiftBounds.start && i.opened_at <= shiftBounds.end
      );

      // Compute metrics
      const peakTemp = observations.length > 0
        ? Math.max(...observations.map((o) => o.temperature_c))
        : null;
      const peakWbgt = observations.length > 0
        ? Math.max(...observations.map((o) => o.wet_bulb_c))
        : null;
      const peakHeatIndex = observations.length > 0
        ? Math.max(...observations.map((o) => o.apparent_temperature_c ?? o.temperature_c))
        : null;

      // Risk level distribution
      const riskDistribution = { GREEN: 0, WATCH: 0, ELEVATED: 0, HIGH: 0, CRITICAL: 0 };
      const latestPerWorker = new Map<string, any>();
      for (const r of allRiskStates) {
        const existing = latestPerWorker.get(r.worker_id);
        if (!existing || r.timestamp > existing.timestamp) {
          latestPerWorker.set(r.worker_id, r);
        }
      }
      for (const [, r] of latestPerWorker) {
        if (r.level in riskDistribution) {
          riskDistribution[r.level as keyof typeof riskDistribution]++;
        }
      }

      // Intervention summary
      const interventionsByType: Record<string, number> = {};
      const acknowledgedCount = actions.filter((a) => a.acknowledged_at).length;
      for (const a of actions) {
        interventionsByType[a.action_type] = (interventionsByType[a.action_type] || 0) + 1;
      }

      const complianceRate = actions.length > 0
        ? Math.round((acknowledgedCount / actions.length) * 100)
        : 100;

      // OSHA compliance assessment
      let oshaStatus: 'PASS' | 'NEEDS_REVIEW' | 'FAIL' = 'PASS';
      if (complianceRate < 70 || riskDistribution.CRITICAL > 0) {
        oshaStatus = 'FAIL';
      } else if (complianceRate < 90 || riskDistribution.HIGH > 2) {
        oshaStatus = 'NEEDS_REVIEW';
      }

      // FortyGuard source tracking
      const liveObservations = observations.filter((o) => o.source === 'fortyguard');
      const dataSourceBreakdown = {
        fortyguard_live: liveObservations.length,
        simulation: observations.filter((o) => o.source === 'simulation').length,
        cache: observations.filter((o) => o.source === 'fortyguard_cache').length,
        total: observations.length,
      };

      const report = {
        report_id: `RPT-${siteId}-${date}-${shift}`,
        site_id: siteId,
        date,
        shift,
        shift_start: shiftBounds.start,
        shift_end: shiftBounds.end,
        generated_at: new Date().toISOString(),

        workforce: {
          total_workers: workers.length,
          risk_distribution: riskDistribution,
        },

        environmental: {
          peak_temperature_c: peakTemp,
          peak_wbgt_c: peakWbgt,
          peak_heat_index_c: peakHeatIndex,
          observations_count: observations.length,
          data_source: dataSourceBreakdown,
        },

        interventions: {
          total_actions: actions.length,
          acknowledged: acknowledgedCount,
          by_type: interventionsByType,
          compliance_rate_pct: complianceRate,
        },

        incidents: {
          total: incidents.length,
          by_severity: {
            CRITICAL: incidents.filter((i) => i.severity === 'CRITICAL').length,
            HIGH: incidents.filter((i) => i.severity === 'HIGH').length,
            ELEVATED: incidents.filter((i) => i.severity === 'ELEVATED').length,
          },
          resolved: incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
        },

        compliance: {
          osha_status: oshaStatus,
          compliance_rate_pct: complianceRate,
          critical_workers: riskDistribution.CRITICAL,
          high_risk_workers: riskDistribution.HIGH,
        },

        actions_detail: actions.slice(0, 50).map((a) => ({
          action_id: a.action_id,
          worker_id: a.worker_id,
          type: a.action_type,
          issued_at: a.issued_at,
          acknowledged_at: a.acknowledged_at,
          outcome: a.outcome,
          message: a.message,
        })),
      };

      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate shift report', details: err.message });
    }
  });

  /**
   * GET /api/reports/shift/export
   * Export shift report as CSV for OSHA filing.
   */
  router.get('/reports/shift/export', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const date = (req.query.date as string) || new Date().toISOString().substring(0, 10);
      const shift = (req.query.shift as string) || 'morning';
      const shiftBounds = getShiftBounds(date, shift);

      const actions = db.getActions({ site_id: siteId, limit: 500 }).filter(
        (a) => a.issued_at >= shiftBounds.start && a.issued_at <= shiftBounds.end
      );

      const csvHeader = 'Action ID,Worker ID,Type,Issued At,Acknowledged At,Outcome,Message\n';
      const csvRows = actions.map((a) =>
        `"${a.action_id}","${a.worker_id}","${a.action_type}","${a.issued_at}","${a.acknowledged_at || ''}","${a.outcome}","${(a.message || '').replace(/"/g, '""')}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sentinel-shift-report-${siteId}-${date}-${shift}.csv"`);
      res.send(csvHeader + csvRows);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to export shift report', details: err.message });
    }
  });

  /**
   * GET /api/reports/weekly
   * Weekly trend summary across multiple shifts.
   */
  router.get('/reports/weekly', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const endDate = new Date(req.query.end_date as string || new Date().toISOString());
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const actions = db.getActions({ site_id: siteId, limit: 2000 }).filter(
        (a) => a.issued_at >= startDate.toISOString() && a.issued_at <= endDate.toISOString()
      );

      const incidents = db.getIncidents({ site_id: siteId }).filter(
        (i) => i.opened_at >= startDate.toISOString() && i.opened_at <= endDate.toISOString()
      );

      const acknowledgedCount = actions.filter((a) => a.acknowledged_at).length;

      res.json({
        site_id: siteId,
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
        total_interventions: actions.length,
        total_incidents: incidents.length,
        resolved_incidents: incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
        compliance_rate_pct: actions.length > 0 ? Math.round((acknowledgedCount / actions.length) * 100) : 100,
        interventions_by_day: groupByDay(actions, 'issued_at'),
        incidents_by_day: groupByDay(incidents, 'opened_at'),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate weekly report', details: err.message });
    }
  });

  return router;
}

function getShiftBounds(date: string, shift: string): { start: string; end: string } {
  const d = date.substring(0, 10);
  switch (shift) {
    case 'morning':
      return { start: `${d}T05:00:00.000Z`, end: `${d}T13:00:00.000Z` };
    case 'afternoon':
      return { start: `${d}T13:00:00.000Z`, end: `${d}T21:00:00.000Z` };
    case 'night':
      return { start: `${d}T21:00:00.000Z`, end: `${d}T05:00:00.000Z` };
    default:
      return { start: `${d}T00:00:00.000Z`, end: `${d}T23:59:59.999Z` };
  }
}

function groupByDay(items: any[], dateField: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const day = (item[dateField] || '').substring(0, 10);
    if (day) {
      result[day] = (result[day] || 0) + 1;
    }
  }
  return result;
}
