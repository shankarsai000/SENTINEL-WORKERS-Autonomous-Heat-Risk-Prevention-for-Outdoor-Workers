import { describe, it, expect } from 'vitest';
import { ShortHorizonRiskPredictor } from '../../packages/prediction/src/predictor.js';
import {
  ThermalObservation,
  WorkerRiskContext,
  SiteRiskContext,
  ZoneClusterContext,
  RiskState,
} from '@sentinel/schemas';

describe('Prediction Engine Benchmark Scenarios A through G', () => {
  const predictor = new ShortHorizonRiskPredictor();

  const dummySite: SiteRiskContext = {
    site_id: 'PHX-SITE-01',
    zone_id: 'ZONE-01',
    worker_count: 30,
    active_worker_count: 30,
    cooling_resources: { shade_stations: 4, water_points: 6, misting_fans: 2, ac_trailers: 1 },
    emergency_policy_id: 'demo-construction-v1',
  };

  const dummyCluster: ZoneClusterContext = {
    zone_id: 'ZONE-01',
    active_workers_in_zone: 30,
    elevated_workers_in_zone: 4,
    high_workers_in_zone: 1,
    critical_workers_in_zone: 0,
    cluster_density: 0.15,
  };

  // Scenario A: Baseline Stable Thermal Conditions
  it('Scenario A: Stable thermal conditions with moderate task -> STABLE predictive state', () => {
    const obs: ThermalObservation = {
      observation_id: 'obs_scen_a',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-08-25T08:00:00.000Z',
      temperature_c: 32.0,
      humidity_pct: 35,
      wet_bulb_c: 21.0,
      solar_irradiance: 400,
      source: 'simulation',
      freshness_seconds: 15,
      confidence: 0.95,
    };

    const history: ThermalObservation[] = [
      { ...obs, observation_id: 'obs_a1', timestamp: '2026-08-25T07:00:00.000Z', temperature_c: 31.8 },
      { ...obs, observation_id: 'obs_a2', timestamp: '2026-08-25T07:30:00.000Z', temperature_c: 32.0 },
    ];

    const worker: WorkerRiskContext = {
      worker_id: 'WRK-A',
      site_id: 'PHX-SITE-01',
      role: 'Inspector',
      task_intensity: 'LIGHT',
      shift_start: '2026-08-25T07:00:00.000Z',
      shift_end: '2026-08-25T15:00:00.000Z',
      exposure_duration_minutes: 60,
      recent_recovery_minutes: null,
      risk_modifier: 'baseline',
      channel: 'SMS',
      active: true,
    };

    const currentRisk: RiskState = {
      worker_id: 'WRK-A',
      site_id: 'PHX-SITE-01',
      timestamp: obs.timestamp,
      score: 0.20,
      level: 'GREEN',
      confidence: 0.95,
      reason_codes: ['SAFE_THERMAL_MARGIN'],
      exposure_duration_mins: 60,
    };

    const res = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: worker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: history,
    });

    expect(res.predictiveState.predicted_risk_level).toBe('GREEN');
    expect(res.predictiveState.early_warning).toBe(false);
    expect(res.predictiveState.predictive_state).toBe('STABLE');
    expect(res.predictiveState.p_critical_60m).toBeLessThan(0.15);
  });

  // Scenario B: Rapidly Rising Heatwave Triggering Early Warning
  it('Scenario B: Rapidly rising temperature trend -> EARLY_WARNING triggered', () => {
    const obs: ThermalObservation = {
      observation_id: 'obs_scen_b',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-08-25T11:00:00.000Z',
      temperature_c: 41.5,
      humidity_pct: 25,
      wet_bulb_c: 27.0,
      solar_irradiance: 880,
      source: 'simulation',
      freshness_seconds: 15,
      confidence: 0.95,
    };

    const history: ThermalObservation[] = [
      { ...obs, observation_id: 'obs_b1', timestamp: '2026-08-25T10:00:00.000Z', temperature_c: 36.5 },
      { ...obs, observation_id: 'obs_b2', timestamp: '2026-08-25T10:30:00.000Z', temperature_c: 39.0 },
    ];

    const worker: WorkerRiskContext = {
      worker_id: 'WRK-B',
      site_id: 'PHX-SITE-01',
      role: 'Concrete Finisher',
      task_intensity: 'HEAVY',
      shift_start: '2026-08-25T06:00:00.000Z',
      shift_end: '2026-08-25T14:00:00.000Z',
      exposure_duration_minutes: 300,
      recent_recovery_minutes: null,
      risk_modifier: 'baseline',
      channel: 'SMS',
      active: true,
    };

    const currentRisk: RiskState = {
      worker_id: 'WRK-B',
      site_id: 'PHX-SITE-01',
      timestamp: obs.timestamp,
      score: 0.48, // Still WATCH / border ELEVATED
      level: 'WATCH',
      confidence: 0.92,
      reason_codes: ['APPROACHING_THRESHOLD'],
      exposure_duration_mins: 300,
    };

    const res = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: worker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: history,
    });

    expect(res.predictiveState.early_warning).toBe(true);
    expect(res.predictiveState.p_elevated_30m).toBeGreaterThan(0.65);
    expect(res.predictiveState.predictive_reason_codes).toContain('RISING_THERMAL_TREND');
  });

  // Scenario C: Long Exposure Accumulation
  it('Scenario C: High continuous exposure leads to high exposure contribution', () => {
    const obs: ThermalObservation = {
      observation_id: 'obs_scen_c',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-08-25T13:00:00.000Z',
      temperature_c: 38.0,
      humidity_pct: 28,
      wet_bulb_c: 24.5,
      solar_irradiance: 750,
      source: 'simulation',
      freshness_seconds: 15,
      confidence: 0.95,
    };

    const history: ThermalObservation[] = [
      { ...obs, observation_id: 'obs_c1', timestamp: '2026-08-25T12:00:00.000Z', temperature_c: 37.5 },
      { ...obs, observation_id: 'obs_c2', timestamp: '2026-08-25T12:30:00.000Z', temperature_c: 38.0 },
    ];

    const worker: WorkerRiskContext = {
      worker_id: 'WRK-C',
      site_id: 'PHX-SITE-01',
      role: 'Framing Carpenter',
      task_intensity: 'MODERATE',
      shift_start: '2026-08-25T06:00:00.000Z',
      shift_end: '2026-08-25T16:00:00.000Z',
      exposure_duration_minutes: 420, // 7 hours continuous exposure
      recent_recovery_minutes: null,
      risk_modifier: 'baseline',
      channel: 'SMS',
      active: true,
    };

    const currentRisk: RiskState = {
      worker_id: 'WRK-C',
      site_id: 'PHX-SITE-01',
      timestamp: obs.timestamp,
      score: 0.55,
      level: 'ELEVATED',
      confidence: 0.92,
      reason_codes: ['EXTENDED_EXPOSURE'],
      exposure_duration_mins: 420,
    };

    const res = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: worker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: history,
    });

    expect(res.predictiveState.feature_contributions.exposure_duration).toBeGreaterThan(0.08);
  });

  // Scenario D: Heavy Task vs Light Task
  it('Scenario D: Heavy task worker deteriorates faster than Light task worker', () => {
    const obs: ThermalObservation = {
      observation_id: 'obs_scen_d',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-08-25T11:30:00.000Z',
      temperature_c: 39.5,
      humidity_pct: 25,
      wet_bulb_c: 25.5,
      solar_irradiance: 800,
      source: 'simulation',
      freshness_seconds: 15,
      confidence: 0.95,
    };

    const history: ThermalObservation[] = [
      { ...obs, observation_id: 'obs_d1', timestamp: '2026-08-25T10:30:00.000Z', temperature_c: 37.0 },
      { ...obs, observation_id: 'obs_d2', timestamp: '2026-08-25T11:00:00.000Z', temperature_c: 38.5 },
    ];

    const heavyWorker: WorkerRiskContext = {
      worker_id: 'WRK-HEAVY',
      site_id: 'PHX-SITE-01',
      role: 'Rebar Tier',
      task_intensity: 'HEAVY',
      shift_start: '2026-08-25T07:00:00.000Z',
      shift_end: '2026-08-25T15:00:00.000Z',
      exposure_duration_minutes: 270,
      recent_recovery_minutes: null,
      risk_modifier: 'baseline',
      channel: 'SMS',
      active: true,
    };

    const lightWorker: WorkerRiskContext = {
      ...heavyWorker,
      worker_id: 'WRK-LIGHT',
      role: 'Safety Flagman',
      task_intensity: 'LIGHT',
    };

    const currentRisk: RiskState = {
      worker_id: 'WRK',
      site_id: 'PHX-SITE-01',
      timestamp: obs.timestamp,
      score: 0.45,
      level: 'WATCH',
      confidence: 0.92,
      reason_codes: ['WATCH_STATE'],
      exposure_duration_mins: 270,
    };

    const heavyRes = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: heavyWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: history,
    });

    const lightRes = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: lightWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: history,
    });

    expect((heavyRes.predictiveState.p_elevated_30m || 0)).toBeGreaterThan(
      (lightRes.predictiveState.p_elevated_30m || 0)
    );
  });

  // Scenario E: Recovery Mitigation
  it('Scenario E: Recent 30m recovery break lowers predicted probabilities', () => {
    const obs: ThermalObservation = {
      observation_id: 'obs_scen_e',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-08-25T12:00:00.000Z',
      temperature_c: 40.0,
      humidity_pct: 25,
      wet_bulb_c: 26.0,
      solar_irradiance: 820,
      source: 'simulation',
      freshness_seconds: 15,
      confidence: 0.95,
    };

    const history: ThermalObservation[] = [
      { ...obs, observation_id: 'obs_e1', timestamp: '2026-08-25T11:00:00.000Z', temperature_c: 38.0 },
      { ...obs, observation_id: 'obs_e2', timestamp: '2026-08-25T11:30:00.000Z', temperature_c: 39.2 },
    ];

    const restedWorker: WorkerRiskContext = {
      worker_id: 'WRK-RESTED',
      site_id: 'PHX-SITE-01',
      role: 'Roofer',
      task_intensity: 'HEAVY',
      shift_start: '2026-08-25T07:00:00.000Z',
      shift_end: '2026-08-25T15:00:00.000Z',
      exposure_duration_minutes: 270,
      recent_recovery_minutes: 30, // 30m shaded break
      risk_modifier: 'baseline',
      channel: 'SMS',
      active: true,
    };

    const unrecoveredWorker: WorkerRiskContext = {
      ...restedWorker,
      worker_id: 'WRK-UNRESTED',
      recent_recovery_minutes: null,
    };

    const currentRisk: RiskState = {
      worker_id: 'WRK',
      site_id: 'PHX-SITE-01',
      timestamp: obs.timestamp,
      score: 0.50,
      level: 'ELEVATED',
      confidence: 0.92,
      reason_codes: ['ELEVATED_HEAT'],
      exposure_duration_mins: 270,
    };

    const restedRes = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: restedWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: history,
    });

    const unrecoveredRes = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: unrecoveredWorker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk,
      observationHistory: history,
    });

    expect(restedRes.predictiveState.feature_contributions.recent_recovery).toBeLessThan(0);
    expect((restedRes.predictiveState.p_critical_60m || 0)).toBeLessThan(
      (unrecoveredRes.predictiveState.p_critical_60m || 0)
    );
  });

  // Scenario F: Stale Data Penalization
  it('Scenario F: Stale observations mark prediction as STALE_DATA with high uncertainty', () => {
    const obs: ThermalObservation = {
      observation_id: 'obs_scen_f',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-08-25T12:00:00.000Z',
      temperature_c: 40.0,
      humidity_pct: 25,
      wet_bulb_c: 26.0,
      solar_irradiance: 820,
      source: 'simulation',
      freshness_seconds: 15,
      confidence: 0.95,
    };

    const history: ThermalObservation[] = [
      { ...obs, observation_id: 'obs_f1', timestamp: '2026-08-25T11:00:00.000Z', temperature_c: 38.0 },
      { ...obs, observation_id: 'obs_f2', timestamp: '2026-08-25T11:30:00.000Z', temperature_c: 39.2 },
    ];

    const worker: WorkerRiskContext = {
      worker_id: 'WRK-F',
      site_id: 'PHX-SITE-01',
      role: 'Roofer',
      task_intensity: 'HEAVY',
      shift_start: '2026-08-25T07:00:00.000Z',
      shift_end: '2026-08-25T15:00:00.000Z',
      exposure_duration_minutes: 270,
      recent_recovery_minutes: null,
      risk_modifier: 'baseline',
      channel: 'SMS',
      active: true,
    };

    const staleRisk: RiskState = {
      worker_id: 'WRK-F',
      site_id: 'PHX-SITE-01',
      timestamp: obs.timestamp,
      score: 0.60,
      level: 'ELEVATED',
      confidence: 0.50,
      data_freshness: 'STALE',
      reason_codes: ['STALE_DATA'],
      exposure_duration_mins: 270,
    };

    const res = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: worker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk: staleRisk,
      observationHistory: history,
    });

    expect(res.predictiveState.prediction_status).toBe('STALE_DATA');
    expect(res.predictiveState.uncertainty_band).toBe('HIGH');
  });

  // Scenario G: Current Critical Risk Dominance
  it('Scenario G: Current risk is CRITICAL -> predicted risk level remains CRITICAL', () => {
    const obs: ThermalObservation = {
      observation_id: 'obs_scen_g',
      site_id: 'PHX-SITE-01',
      timestamp: '2026-08-25T14:00:00.000Z',
      temperature_c: 46.0,
      humidity_pct: 20,
      wet_bulb_c: 29.0,
      solar_irradiance: 950,
      source: 'simulation',
      freshness_seconds: 15,
      confidence: 0.95,
    };

    const history: ThermalObservation[] = [
      { ...obs, observation_id: 'obs_g1', timestamp: '2026-08-25T13:00:00.000Z', temperature_c: 44.0 },
      { ...obs, observation_id: 'obs_g2', timestamp: '2026-08-25T13:30:00.000Z', temperature_c: 45.2 },
    ];

    const worker: WorkerRiskContext = {
      worker_id: 'WRK-G',
      site_id: 'PHX-SITE-01',
      role: 'Welder',
      task_intensity: 'HEAVY',
      shift_start: '2026-08-25T07:00:00.000Z',
      shift_end: '2026-08-25T15:00:00.000Z',
      exposure_duration_minutes: 420,
      recent_recovery_minutes: null,
      risk_modifier: 'baseline',
      channel: 'SMS',
      active: true,
    };

    const criticalRisk: RiskState = {
      worker_id: 'WRK-G',
      site_id: 'PHX-SITE-01',
      timestamp: obs.timestamp,
      score: 0.95,
      level: 'CRITICAL',
      confidence: 0.95,
      reason_codes: ['EXTREME_HEAT_EMERGENCY'],
      exposure_duration_mins: 420,
    };

    const res = predictor.predictWorker({
      currentObservation: obs,
      workerCtx: worker,
      siteCtx: dummySite,
      clusterCtx: dummyCluster,
      currentRisk: criticalRisk,
      observationHistory: history,
    });

    expect(res.predictiveState.current_risk_level).toBe('CRITICAL');
    expect(res.predictiveState.predicted_risk_level).toBe('CRITICAL');
  });
});
