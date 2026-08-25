import {
  ThermalObservation,
  Worker,
  Site,
  DerivedEnvironmentFeatures,
  WorkerRiskContext,
  SiteRiskContext,
  DataFreshness,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';
import { calculateActiveExposureMinutes } from './exposure.js';
import { calculateRecentRecoveryMinutes, RecoveryInterval } from './recovery.js';

export interface ContextBuilderOptions {
  worker: Worker;
  site: Site;
  observation: ThermalObservation;
  policy: SafetyPolicy;
  currentTime?: string;
  observationHistory?: ThermalObservation[];
  recoveryEvents?: RecoveryInterval[];
  isActive?: boolean;
}

export function buildDerivedEnvironmentFeatures(
  obs: ThermalObservation,
  policy: SafetyPolicy,
  history: ThermalObservation[] = [],
  currentTime: string = new Date().toISOString()
): DerivedEnvironmentFeatures {
  const currentMs = new Date(currentTime).getTime();
  const obsMs = new Date(obs.timestamp).getTime();
  const observationAgeSeconds = Math.max(0, Math.floor((currentMs - obsMs) / 1000));

  // Determine freshness
  let dataQuality: DataFreshness = 'FRESH';
  if (observationAgeSeconds > policy.freshness_rules.aging_max_seconds) {
    dataQuality = 'STALE';
  } else if (observationAgeSeconds > policy.freshness_rules.fresh_max_seconds) {
    dataQuality = 'AGING';
  }

  // Calculate temperature trend if history is available
  let delta10m: number | undefined;
  let delta30m: number | undefined;
  let trendDirection: DerivedEnvironmentFeatures['trend_direction'] = 'UNKNOWN';

  if (history.length > 0) {
    const obs10m = history.find((h) => {
      const age = (obsMs - new Date(h.timestamp).getTime()) / 1000;
      return age >= 500 && age <= 700; // ~10m
    });

    const obs30m = history.find((h) => {
      const age = (obsMs - new Date(h.timestamp).getTime()) / 1000;
      return age >= 1600 && age <= 2000; // ~30m
    });

    if (obs10m) {
      delta10m = Math.round((obs.temperature_c - obs10m.temperature_c) * 10) / 10;
    }
    if (obs30m) {
      delta30m = Math.round((obs.temperature_c - obs30m.temperature_c) * 10) / 10;
    }

    const baselineDelta = delta10m !== undefined ? delta10m : delta30m;
    if (baselineDelta !== undefined) {
      if (baselineDelta > 0.5) trendDirection = 'RISING';
      else if (baselineDelta < -0.5) trendDirection = 'FALLING';
      else trendDirection = 'STABLE';
    }
  }

  return {
    current_temperature: obs.temperature_c,
    current_apparent_temperature: obs.apparent_temperature_c,
    current_wet_bulb: obs.wet_bulb_c,
    humidity: obs.humidity_pct,
    solar_irradiance: obs.solar_irradiance,
    temperature_delta_10m: delta10m,
    temperature_delta_30m: delta30m,
    trend_direction: trendDirection,
    observation_age_seconds: observationAgeSeconds,
    data_quality: dataQuality,
  };
}

export function buildWorkerRiskContext(
  worker: Worker,
  options: {
    currentTime?: string;
    recoveryEvents?: RecoveryInterval[];
    isActive?: boolean;
  } = {}
): WorkerRiskContext {
  const currentTime = options.currentTime || new Date().toISOString();
  const isActive = options.isActive ?? true;

  const exposureDurationMins = calculateActiveExposureMinutes({
    shiftStart: worker.shift_start,
    shiftEnd: worker.shift_end,
    currentTime,
    isActive,
  });

  const recentRecoveryMins = calculateRecentRecoveryMinutes({
    recoveryEvents: options.recoveryEvents,
    currentTime,
  });

  return {
    worker_id: worker.worker_id,
    site_id: worker.site_id,
    role: worker.role,
    task_intensity: worker.task_intensity,
    shift_start: worker.shift_start,
    shift_end: worker.shift_end,
    exposure_duration_minutes: exposureDurationMins,
    recent_recovery_minutes: recentRecoveryMins,
    risk_modifier: worker.risk_modifier,
    channel: worker.channel,
    active: isActive,
  };
}

export function buildSiteRiskContext(site: Site, activeCount?: number): SiteRiskContext {
  return {
    site_id: site.site_id,
    zone_id: site.zone_id,
    worker_count: site.worker_count,
    active_worker_count: activeCount ?? site.worker_count,
    cooling_resources: site.cooling_resources,
    emergency_policy_id: site.emergency_policy_id,
  };
}
