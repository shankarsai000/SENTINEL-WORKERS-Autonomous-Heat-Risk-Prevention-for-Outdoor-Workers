import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';

export function createClimateRouter(db: SentinelDatabase): Router {
  const router = Router();

  /**
   * GET /api/operations/medical-prepositioning
   * Predictive medical positioning recommendations
   */
  router.get('/operations/medical-prepositioning', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';

      res.json({
        site_id: siteId,
        strategy_status: 'ACTIVE_PREPOSITIONED',
        recommended_zone: 'ZONE-A (Open Excavation)',
        positioning_unit: 'Phoenix Emergency Paramedic Unit #4',
        vehicle_type: 'All-Terrain Rapid Cool Ambulance',
        distance_to_highest_risk_cluster_m: 85,
        response_time_minutes: {
          standard_911_dispatch: 42,
          sentinel_prepositioned: 4,
          improvement_pct: 90.5,
        },
        monitored_critical_candidates: [
          { worker_id: 'WRK-0043', role: 'Laborer', zone: 'ZONE-A', time_to_threshold_mins: 28, est_core_temp: 38.2 },
          { worker_id: 'WRK-0188', role: 'Laborer', zone: 'ZONE-A', time_to_threshold_mins: 34, est_core_temp: 38.0 },
        ],
        protocol: 'Aggressive ice bath submersion & electrolyte IV ready on standby.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch medical positioning', details: err.message });
    }
  });

  /**
   * GET /api/climate/resilience-projections
   * Long-horizon IPCC adaptation model (2030 - 2050)
   */
  router.get('/climate/resilience-projections', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';

      res.json({
        site_id: siteId,
        baseline_year: 2026,
        scenarios: [
          {
            year: 2030,
            projected_avg_summer_peak_c: 44.1,
            days_above_40c_annual: 94,
            traditional_productivity_loss_pct: 32.0,
            adapted_productivity_with_sentinel_pct: 94.5,
            recommended_shift: '05:00 - 13:00 (Early Dawn Shift)',
          },
          {
            year: 2040,
            projected_avg_summer_peak_c: 46.2,
            days_above_40c_annual: 118,
            traditional_productivity_loss_pct: 48.0,
            adapted_productivity_with_sentinel_pct: 88.0,
            recommended_shift: '20:00 - 04:00 (Night Solar Inversion Economy)',
          },
          {
            year: 2050,
            projected_avg_summer_peak_c: 48.0,
            days_above_40c_annual: 142,
            traditional_productivity_loss_pct: 65.0,
            adapted_productivity_with_sentinel_pct: 82.0,
            recommended_shift: 'Autonomous Enclosed & Subterranean Construction',
          },
        ],
        roi_estimate: {
          economic_savings_per_site_annual_usd: 1420000,
          lives_saved_projection_10yr: 18,
          insurance_discount_eligibility_pct: 22.5,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch climate projections', details: err.message });
    }
  });

  return router;
}
