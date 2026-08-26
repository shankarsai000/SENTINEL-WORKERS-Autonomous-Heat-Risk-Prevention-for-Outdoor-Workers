import { describe, it, expect } from 'vitest';
import dotenv from 'dotenv';
import { FortyGuardAdapter } from '../../providers/fortyguard/src/index.js';
import { ContextualRiskEngine } from '../../packages/risk/src/index.js';
import { ShortHorizonRiskPredictor } from '../../packages/prediction/src/index.js';
import { ActionPlanner, PolicyGate } from '../../packages/actions/src/index.js';
import { PolicyLoader } from '../../packages/policy/src/index.js';
import { PHOENIX_CONSTRUCTION_SITES, generateSyntheticWorkers } from '../../packages/simulation/src/index.js';

dotenv.config();

describe('Phase P1-R: FortyGuard Live End-to-End Pipeline Integration', () => {
  const apiKey = process.env.FORTYGUARD_API_KEY;
  const isKeyConfigured = Boolean(
    apiKey &&
    apiKey.trim().length > 0 &&
    !apiKey.startsWith('YOUR_') &&
    !apiKey.includes('placeholder') &&
    apiKey !== 'mock_fg_key' &&
    apiKey !== 'mock_api_key'
  );

  it('verifies live FortyGuard API request and downstream P2 -> P3 -> P4 ingestion when key is configured', async () => {
    if (!isKeyConfigured) {
      console.log('LIVE INTEGRATION NOTICE: FORTYGUARD_API_KEY is not configured in local environment. Gated test passed.');
      expect(true).toBe(true);
      return;
    }

    console.log('[FORTYGUARD LIVE TEST] Testing live FortyGuard API connectivity for Phoenix Jobsite...');
    const startMs = Date.now();

    const adapter = new FortyGuardAdapter({
      apiKey,
      baseUrl: process.env.FORTYGUARD_BASE_URL || process.env.FORTYGUARD_API_BASE_URL || 'https://api.fortyguard.com',
      timeoutMs: 30000,
      maxPollAttempts: 20,
      pollIntervalMs: 1500,
      offlineFallback: false,
    });

    const testSite = PHOENIX_CONSTRUCTION_SITES[0];

    // Step 1: Execute Live Heatmap Fetch & Polling
    const { observation, cacheHit } = await adapter.fetchSiteObservation(testSite, {
      granularity: 80,
      dateTime: new Date().toISOString(),
    });

    const durationMs = Date.now() - startMs;
    console.log(`[FORTYGUARD LIVE SUCCESS] Retrieved real observation in ${durationMs}ms:`);
    console.log(`  Source: ${observation.provenance?.source}`);
    console.log(`  Activity ID: ${observation.provenance?.activity_id}`);
    console.log(`  Temperature: ${observation.temperature_c}°C`);
    console.log(`  Wet-Bulb: ${observation.wet_bulb_c}°C`);
    console.log(`  Humidity: ${observation.humidity_pct}%`);

    // Verify observation properties
    expect(observation).toBeDefined();
    expect(observation.temperature_c).toBeGreaterThan(-10);
    expect(observation.provenance?.source).toBe('FORTYGUARD_LIVE');
    expect(observation.provenance?.activity_id).toBeDefined();
    expect(cacheHit).toBe(false);

    // Step 2: Feed Real Observation into P2 Contextual Risk Engine
    const policy = PolicyLoader.getPolicy();
    const riskEngine = new ContextualRiskEngine(policy);
    const workers = generateSyntheticWorkers(testSite.site_id, 10);

    const evalResult = riskEngine.evaluateBatch({
      workers,
      site: testSite,
      observation,
      previousStates: new Map(),
      currentTime: observation.timestamp,
    });

    expect(evalResult.riskStates.length).toBe(workers.length);
    expect(evalResult.riskStates[0].score).toBeGreaterThanOrEqual(0);
    expect(evalResult.riskStates[0].score).toBeLessThanOrEqual(1);

    // Step 3: Feed into P3 Short-Horizon Predictor
    const predictor = new ShortHorizonRiskPredictor();
    const dummyCluster = {
      zone_id: testSite.zone_id,
      active_workers_in_zone: workers.length,
      elevated_workers_in_zone: 0,
      high_workers_in_zone: 0,
      critical_workers_in_zone: 0,
      cluster_density: 0.1,
    };
    const predResult = predictor.predictWorker({
      workerCtx: {
        worker_id: workers[0].worker_id,
        site_id: testSite.site_id,
        role: workers[0].role,
        task_intensity: workers[0].task_intensity,
        shift_start: workers[0].shift_start,
        shift_end: workers[0].shift_end,
        exposure_duration_minutes: 60,
        recent_recovery_minutes: null,
        risk_modifier: workers[0].risk_modifier,
        channel: workers[0].channel,
        active: true,
      },
      siteCtx: {
        site_id: testSite.site_id,
        zone_id: testSite.zone_id,
        worker_count: testSite.worker_count,
        active_worker_count: workers.length,
        cooling_resources: { shade_stations: 2, water_points: 4, misting_fans: 2, ac_trailers: 1 },
        emergency_policy_id: testSite.emergency_policy_id,
      },
      clusterCtx: dummyCluster,
      currentObservation: observation,
      currentRisk: evalResult.riskStates[0],
    });

    expect(predResult).toBeDefined();
    expect(predResult.predictiveState.predicted_risk_level).toBeDefined();
    expect(predResult.predictiveState.prediction_confidence).toBeGreaterThanOrEqual(0);

    // Step 4: Feed into P4 Action Planner & Safety Policy Gate
    const actions = ActionPlanner.planActions({
      currentRisk: evalResult.riskStates[0],
      predictedRisk: predResult.predictiveState,
      workerCtx: {
        worker_id: workers[0].worker_id,
        site_id: testSite.site_id,
        role: workers[0].role,
        task_intensity: workers[0].task_intensity,
        shift_start: workers[0].shift_start,
        shift_end: workers[0].shift_end,
        exposure_duration_minutes: 60,
        recent_recovery_minutes: null,
        risk_modifier: workers[0].risk_modifier,
        channel: workers[0].channel,
        active: true,
      },
      siteCtx: {
        site_id: testSite.site_id,
        zone_id: testSite.zone_id,
        worker_count: testSite.worker_count,
        active_worker_count: workers.length,
        cooling_resources: { shade_stations: 2, water_points: 4, misting_fans: 2, ac_trailers: 1 },
        emergency_policy_id: testSite.emergency_policy_id,
      },
      policy,
    });

    expect(actions).toBeDefined();

    // Step 5: Test Credit Protection Cache Hit
    const cachedQuery = await adapter.fetchSiteObservation(testSite, {
      granularity: 80,
      dateTime: observation.timestamp,
    });

    expect(cachedQuery.cacheHit).toBe(true);
    expect(cachedQuery.observation.source).toBe('fortyguard_cache');
  }, 60000);
});
