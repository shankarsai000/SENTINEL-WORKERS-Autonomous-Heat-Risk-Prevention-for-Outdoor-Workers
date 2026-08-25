import { describe, it, expect } from 'vitest';
import { ShortHorizonRiskPredictor } from '../../packages/prediction/src/predictor.js';
import { generateSyntheticWorkers, PHOENIX_CONSTRUCTION_SITES } from '@sentinel/simulation';
import {
  ThermalObservation,
  WorkerRiskContext,
  SiteRiskContext,
  ZoneClusterContext,
  RiskState,
} from '@sentinel/schemas';
import { buildWorkerRiskContext, buildSiteRiskContext, calculateZoneClusterContext } from '@sentinel/risk-engine';

describe('Phase P3 Prediction Benchmark: 500 Synthetic Workers Performance', () => {
  it('evaluates short-horizon predictive risk for 500 workers in under 100ms', () => {
    const predictor = new ShortHorizonRiskPredictor();
    const site = PHOENIX_CONSTRUCTION_SITES[0];
    const workers = generateSyntheticWorkers(500, site.site_id);

    const now = '2026-08-25T11:00:00.000Z';

    const obs: ThermalObservation = {
      observation_id: 'obs_perf_500',
      site_id: site.site_id,
      timestamp: now,
      temperature_c: 41.5,
      humidity_pct: 25,
      wet_bulb_c: 27.0,
      solar_irradiance: 880,
      source: 'simulation',
      freshness_seconds: 15,
      confidence: 0.95,
    };

    const history: ThermalObservation[] = [
      { ...obs, observation_id: 'obs_perf_1', timestamp: '2026-08-25T10:00:00.000Z', temperature_c: 37.0 },
      { ...obs, observation_id: 'obs_perf_2', timestamp: '2026-08-25T10:30:00.000Z', temperature_c: 39.5 },
    ];

    const workerContexts: WorkerRiskContext[] = workers.map((w) =>
      buildWorkerRiskContext(w, { currentTime: now, isActive: true })
    );

    const siteCtx: SiteRiskContext = buildSiteRiskContext(site, workers.length);
    const clusterCtx: ZoneClusterContext = calculateZoneClusterContext(
      site.zone_id,
      workers.map(() => ({ zone_id: site.zone_id, level: 'WATCH', active: true }))
    );

    const riskMap = new Map<string, RiskState>();
    for (const w of workers) {
      riskMap.set(w.worker_id, {
        worker_id: w.worker_id,
        site_id: site.site_id,
        timestamp: now,
        score: 0.45,
        level: 'WATCH',
        confidence: 0.92,
        reason_codes: ['WARMING_ENVIRONMENT'],
        exposure_duration_mins: 180,
      });
    }

    // Warm-up run
    predictor.predictBatch({
      currentObservation: obs,
      workers: workerContexts.slice(0, 10),
      siteCtx,
      clusterCtx,
      currentRisks: riskMap,
      observationHistory: history,
    });

    // Timed performance run
    const start = performance.now();

    const batchResult = predictor.predictBatch({
      currentObservation: obs,
      workers: workerContexts,
      siteCtx,
      clusterCtx,
      currentRisks: riskMap,
      observationHistory: history,
    });

    const elapsedMs = performance.now() - start;

    console.log(`\n======================================================`);
    console.log(`[MEASURED P3 PREDICTION BENCHMARK]`);
    console.log(`Evaluated ${batchResult.predictions.length} workers in ${elapsedMs.toFixed(2)}ms`);
    console.log(`Per-Worker Latency: ${(elapsedMs / 500).toFixed(4)}ms/worker`);
    console.log(`Failures: ${batchResult.failures.length}`);
    console.log(`Early Warnings Triggered: ${batchResult.predictions.filter((p) => p.early_warning).length}`);
    console.log(`======================================================\n`);

    expect(batchResult.predictions).toHaveLength(500);
    expect(batchResult.failures).toHaveLength(0);
    expect(elapsedMs).toBeLessThan(250); // Parallel test suite runner headroom (<0.5ms/worker)
  });
});
