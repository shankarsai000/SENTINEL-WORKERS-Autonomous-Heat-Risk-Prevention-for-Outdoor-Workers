import { describe, it, expect } from 'vitest';
import { generateSyntheticWorkers } from '../../packages/simulation/src/worker-generator.js';
import { PHOENIX_CONSTRUCTION_SITES } from '../../packages/simulation/src/sites-config.js';
import { ContextualRiskEngine } from '../../packages/risk/src/risk-engine.js';
import { ThermalObservation } from '@sentinel/schemas';

describe('500 Synthetic Workers Evaluation & Latency Benchmark', () => {
  it('evaluates 500 workers in a single batch cycle with zero failures and < 100ms latency', () => {
    const workers = generateSyntheticWorkers(500, 42);
    const site = PHOENIX_CONSTRUCTION_SITES[0];
    const engine = new ContextualRiskEngine();

    const obs: ThermalObservation = {
      observation_id: 'obs_bench_001',
      site_id: site.site_id,
      timestamp: '2026-08-25T13:00:00.000Z',
      temperature_c: 41.5,
      humidity_pct: 22.0,
      wet_bulb_c: 26.5,
      solar_irradiance: 920.0,
      source: 'fortyguard',
      freshness_seconds: 45,
      confidence: 0.95,
    };

    const start = performance.now();
    const result = engine.evaluateBatch({
      workers,
      site,
      observation: obs,
    });
    const duration = performance.now() - start;

    expect(result.failures).toHaveLength(0);
    expect(result.riskStates).toHaveLength(500);
    expect(result.decisionEvents).toHaveLength(500);

    // Performance assertion: 500 workers must process under 100ms
    expect(duration).toBeLessThan(100);

    // Detailed metrics calculation
    const avgPerWorker = duration / 500;
    console.log(`[MEASURED BENCHMARK] 500 workers evaluated in ${duration.toFixed(2)}ms (${avgPerWorker.toFixed(3)}ms/worker)`);
  });
});
