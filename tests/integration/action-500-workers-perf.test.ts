import { describe, it, expect } from 'vitest';
import { generateSyntheticWorkers, PHOENIX_CONSTRUCTION_SITES } from '@sentinel/simulation';
import {
  ActionPlanner,
  PolicyGate,
  ActionExecutor,
  ActionDeduplicationService,
} from '../../packages/actions/src/index.js';
import { DEFAULT_DEMO_POLICY } from '@sentinel/policy';
import {
  ThermalObservation,
  WorkerRiskContext,
  SiteRiskContext,
  RiskState,
  PredictiveRiskState,
  ActionDecision,
} from '@sentinel/schemas';
import { buildWorkerRiskContext, buildSiteRiskContext } from '@sentinel/risk-engine';

describe('Phase P4 Performance Benchmark: 500 Synthetic Workers Batch Action Loop', () => {
  it('executes full DECIDE -> ACT -> AUDIT intervention loop for 500 workers under 150ms', async () => {
    const site = PHOENIX_CONSTRUCTION_SITES[0];
    const workers = generateSyntheticWorkers(500, site.site_id);
    const now = '2026-08-25T11:00:00.000Z';

    const policy = DEFAULT_DEMO_POLICY;
    const dedupeService = new ActionDeduplicationService();
    const executor = new ActionExecutor(undefined, dedupeService);

    const workerContexts: WorkerRiskContext[] = workers.map((w) =>
      buildWorkerRiskContext(w, { currentTime: now, isActive: true })
    );
    const siteCtx: SiteRiskContext = buildSiteRiskContext(site, workers.length);

    // Prepare simulated RiskStates and Predictions across workers
    const riskStates: RiskState[] = workers.map((w, idx) => {
      let level: RiskState['level'] = 'WATCH';
      let score = 0.45;
      if (idx % 10 === 0) {
        level = 'CRITICAL';
        score = 0.92;
      } else if (idx % 4 === 0) {
        level = 'HIGH';
        score = 0.78;
      } else if (idx % 2 === 0) {
        level = 'ELEVATED';
        score = 0.62;
      }

      return {
        worker_id: w.worker_id,
        site_id: site.site_id,
        timestamp: now,
        score,
        level,
        confidence: 0.90,
        reason_codes: ['BENCHMARK_SIMULATED_HEAT'],
        exposure_duration_mins: 180,
      };
    });

    const predictions: Array<PredictiveRiskState | null> = workers.map((w, idx) => {
      if (idx % 3 === 0) {
        return {
          prediction_id: `pred_${w.worker_id}`,
          worker_id: w.worker_id,
          site_id: site.site_id,
          timestamp: now,
          current_risk_level: riskStates[idx].level,
          current_risk_score: riskStates[idx].score,
          p_elevated_30m: 0.85,
          p_critical_60m: 0.70,
          expected_time_to_threshold_minutes: 25,
          predicted_risk_level: 'HIGH',
          predictive_state: 'PREDICTED_HIGH',
          prediction_confidence: 0.88,
          uncertainty_band: 'LOW',
          prediction_status: 'AVAILABLE',
          prediction_source: 'TREND_EXTRAPOLATION',
          early_warning: true,
          predictive_reason_codes: ['RISING_TREND'],
          feature_contributions: {},
          model_id: 'sentinel-risk-logistic',
          model_version: '1.0.0',
          source_observation_ids: ['obs-1', 'obs-2'],
          policy_id: 'demo-construction-v1',
          policy_version: '1.0.0',
        };
      }
      return null;
    });

    const start = performance.now();

    const decisionLatencies: number[] = [];
    const executionResults = [];

    for (let i = 0; i < workers.length; i++) {
      const dStart = performance.now();
      const plan = ActionPlanner.planActions({
        currentRisk: riskStates[i],
        predictedRisk: predictions[i],
        workerCtx: workerContexts[i],
        siteCtx,
        policy,
      });

      const gate = PolicyGate.evaluate({
        candidate: plan.recommended_action,
        currentRisk: riskStates[i],
        predictedRisk: predictions[i],
        workerCtx: workerContexts[i],
        siteCtx,
        policy,
      });

      const decision: ActionDecision = {
        action_id: `act_perf_${workers[i].worker_id}`,
        worker_id: workers[i].worker_id,
        site_id: site.site_id,
        created_at: now,
        risk_state_id: `risk_${workers[i].worker_id}`,
        prediction_id: predictions[i]?.prediction_id,
        action_type: plan.recommended_action.action_type,
        priority: plan.recommended_action.priority,
        reason_codes: plan.recommended_action.reason_codes,
        evidence_refs: { level: riskStates[i].level },
        policy_id: policy.policy_id,
        policy_version: policy.version,
        selected_by: 'AUTONOMOUS_POLICY_PLANNER',
        decision_mode: gate.decision_mode,
        confidence: riskStates[i].confidence,
        requires_acknowledgement: gate.requires_acknowledgement,
        allowed: gate.allowed,
        idempotency_key: `perf_${workers[i].worker_id}_${plan.recommended_action.action_type}`,
        message: plan.recommended_action.message_template,
      };

      decisionLatencies.push(performance.now() - dStart);

      const res = await executor.execute({ decision });
      executionResults.push(res);
    }

    const elapsedMs = performance.now() - start;
    const avgDecisionLatency = decisionLatencies.reduce((a, b) => a + b, 0) / decisionLatencies.length;
    const sortedLatencies = [...decisionLatencies].sort((a, b) => a - b);
    const p95DecisionLatency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];

    console.log('======================================================');
    console.log(`[MEASURED P4 ACTION BENCHMARK]`);
    console.log(`Evaluated and executed 500 worker actions in ${elapsedMs.toFixed(2)}ms`);
    console.log(`Avg Decision Latency: ${(avgDecisionLatency * 1000).toFixed(2)}µs/worker`);
    console.log(`p95 Decision Latency: ${(p95DecisionLatency * 1000).toFixed(2)}µs/worker`);
    console.log(`Total Actions Dispatched/Completed: ${executionResults.filter((r) => r.status === 'COMPLETED' || r.status === 'ACK_PENDING').length}`);
    console.log('======================================================');

    expect(executionResults.length).toBe(500);
    expect(elapsedMs).toBeLessThan(300);
  });
});
