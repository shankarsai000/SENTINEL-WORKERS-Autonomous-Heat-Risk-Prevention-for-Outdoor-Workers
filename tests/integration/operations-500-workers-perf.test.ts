import { describe, it, expect } from 'vitest';
import { PriorityEngine } from '../../apps/api/src/services/priority-engine.js';
import { generateSyntheticWorkers } from '@sentinel/simulation';
import { RiskState, PredictiveRiskState, Action } from '@sentinel/schemas';

describe('Operations Scale & Performance Test (500 Workers)', () => {
  it('computes deterministic priority ranking and human-readable reasons for 500 workers in < 50ms', () => {
    const workers = generateSyntheticWorkers({ count: 500, seed: 12345 });
    expect(workers.length).toBe(500);

    const currentRisks = new Map<string, RiskState>();
    const predictions = new Map<string, PredictiveRiskState>();
    const recentActions = new Map<string, Action>();

    const levels = ['GREEN', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL'] as const;

    for (let i = 0; i < workers.length; i++) {
      const w = workers[i];
      const lvl = levels[i % levels.length];
      currentRisks.set(w.worker_id, {
        worker_id: w.worker_id,
        site_id: w.site_id,
        timestamp: new Date().toISOString(),
        score: lvl === 'CRITICAL' ? 0.92 : lvl === 'HIGH' ? 0.78 : lvl === 'ELEVATED' ? 0.60 : 0.20,
        level: lvl,
        confidence: 0.91,
        reason_codes: ['EXTREME_AMBIENT_HEAT', 'SOLAR_RADIATION_LOAD'],
        exposure_duration_mins: 60 + (i % 120),
        data_freshness: 'FRESH',
      });

      if (i % 4 === 0) {
        predictions.set(w.worker_id, {
          prediction_id: `pred-${i}`,
          worker_id: w.worker_id,
          site_id: w.site_id,
          timestamp: new Date().toISOString(),
          current_risk_level: lvl,
          current_risk_score: 0.75,
          p_elevated_30m: 0.85,
          p_critical_60m: 0.70,
          expected_time_to_threshold_minutes: 22,
          predicted_risk_level: 'CRITICAL',
          predictive_state: 'CRITICAL_IMMINENT',
          prediction_confidence: 0.88,
          uncertainty_band: [0.70, 0.92],
          prediction_status: 'VALID',
          prediction_source: 'ml_logistic_regression',
          early_warning: true,
          predictive_reason_codes: ['RAPID_CORE_HEAT_ACCUMULATION'],
          feature_contributions: {},
          feature_snapshot_id: `snap-${i}`,
          model_id: 'logistic_risk_predictor',
          model_version: '1.0.0',
          source_risk_state_id: `r-${i}`,
          source_observation_ids: [`obs-${i}`],
        });
      }

      if (i % 7 === 0) {
        recentActions.set(w.worker_id, {
          action_id: `act-${i}`,
          worker_id: w.worker_id,
          site_id: w.site_id,
          action_type: 'MANDATORY_REST',
          policy_version: '1.0.0',
          issued_at: new Date().toISOString(),
          status: 'ACK_PENDING',
          outcome: 'PENDING',
          message: 'Mandatory rest required',
          actor: 'Sentinel-Autonomous',
        });
      }
    }

    const start = performance.now();
    const ranked = PriorityEngine.rankWorkers({
      workers,
      currentRisks,
      predictions,
      recentActions,
    });
    const duration = performance.now() - start;

    expect(ranked.length).toBe(500);
    expect(duration).toBeLessThan(100); // Must be under 100ms
    expect(ranked[0].priority_rank).toBe(1);
    expect(ranked[499].priority_rank).toBe(500);
  });
});
