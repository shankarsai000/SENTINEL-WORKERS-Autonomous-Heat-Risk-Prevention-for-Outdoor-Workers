import { ThermalObservation } from '@sentinel/schemas';
import {
  ActivityStatusResponse,
  HeatmapStatsData,
  EnvironmentalParametersData,
  ObservationSource,
  FreshnessClassification,
  DataQuality,
} from '../models/fortyguard-types.js';

export interface NormalizerOptions {
  siteId: string;
  activityId?: string;
  source?: ObservationSource | 'fortyguard' | 'fortyguard_cache' | 'simulation';
  isCached?: boolean;
  referenceTimeMs?: number;
  observedAt?: string;
  retrievedAt?: string;
}

export function classifyFreshness(observedAtIso: string, nowMs: number = Date.now()): FreshnessClassification {
  const observedTime = new Date(observedAtIso).getTime();
  if (isNaN(observedTime)) return 'STALE';
  const ageSeconds = (nowMs - observedTime) / 1000;

  if (ageSeconds < 900) return 'FRESH';     // < 15 mins
  if (ageSeconds < 3600) return 'AGING';    // 15 - 60 mins
  return 'STALE';                           // > 60 mins
}

export function normalizeFortyGuardResult(
  result: ActivityStatusResponse['data']['result'] | any,
  options: NormalizerOptions
): ThermalObservation {
  const nowMs = options.referenceTimeMs !== undefined ? options.referenceTimeMs : Date.now();
  const nowIso = options.retrievedAt || new Date(nowMs).toISOString();
  const observedAt = options.observedAt || result?.observed_at || nowIso;

  const isCached = options.isCached === true || options.source === 'FORTYGUARD_CACHE' || options.source === 'fortyguard_cache';
  const sourceStr: ObservationSource = isCached ? 'FORTYGUARD_CACHE' : options.source === 'simulation' ? 'SIMULATION' : 'FORTYGUARD_LIVE';
  const normalizedSource = isCached ? 'fortyguard_cache' : sourceStr === 'SIMULATION' ? 'simulation' : 'fortyguard';

  // 1. Extract Temperature from stats_data or direct fields
  const stats: HeatmapStatsData = result?.stats_data || {};
  const tempMean = stats.mean !== undefined ? stats.mean : stats.minimum !== undefined ? stats.minimum : result?.temperature_c;
  const temperatureC = tempMean !== undefined ? Number(tempMean.toFixed(2)) : 35.0;

  // 2. Extract Environmental Parameters
  const env: EnvironmentalParametersData = result?.environmental_parameters || result || {};

  const heatIndexC =
    env.heat_index !== undefined
      ? Number(env.heat_index.toFixed(2))
      : undefined;

  const apparentTemperatureC =
    env.apparent_temperature !== undefined
      ? Number(env.apparent_temperature.toFixed(2))
      : undefined;

  const wetBulbC =
    env.wet_bulb_temperature !== undefined
      ? Number(env.wet_bulb_temperature.toFixed(2))
      : typeof result?.wet_bulb_c === 'number'
      ? Number(result.wet_bulb_c.toFixed(2))
      : undefined;

  const humidityPct =
    env.relative_humidity !== undefined
      ? Number(env.relative_humidity.toFixed(1))
      : typeof result?.humidity_pct === 'number'
      ? Number(result.humidity_pct.toFixed(1))
      : undefined;

  const precipitationMm =
    env.precipitation !== undefined
      ? Number(env.precipitation.toFixed(2))
      : undefined;

  const cloudCover =
    env.cloud_cover !== undefined
      ? Number(env.cloud_cover.toFixed(2))
      : undefined;

  // 3. Solar Irradiance Context
  let solarIrradiance: number | undefined = undefined;
  if (typeof env.solar_irradiance === 'number') {
    solarIrradiance = env.solar_irradiance;
  } else if (typeof result?.solar_irradiance === 'number') {
    solarIrradiance = result.solar_irradiance;
  } else if (env.solar_irradiance && typeof env.solar_irradiance === 'object') {
    solarIrradiance = env.solar_irradiance.ghi || env.solar_irradiance.dni || undefined;
  }

  // 4. Data Quality & Freshness Assessment
  const freshness = classifyFreshness(observedAt, nowMs);
  const missingFields: string[] = [];
  if (wetBulbC === undefined) missingFields.push('wet_bulb_temperature');
  if (humidityPct === undefined) missingFields.push('relative_humidity');
  if (solarIrradiance === undefined) missingFields.push('solar_irradiance');

  const dataQuality: DataQuality = {
    source: sourceStr,
    freshness,
    completeness: missingFields.length === 0 ? 'FULL' : missingFields.length <= 2 ? 'PARTIAL' : 'MINIMAL',
    provider_status: 'HEALTHY',
    missing_fields: missingFields.length > 0 ? missingFields : undefined,
  };

  const observationId = `obs_fg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const finalHumidity = humidityPct !== undefined ? humidityPct : 30.0;
  const finalWetBulb =
    wetBulbC !== undefined
      ? wetBulbC
      : Number(
          (
            temperatureC * Math.atan(0.151977 * Math.pow(finalHumidity + 8.313659, 0.5)) +
            Math.atan(temperatureC + finalHumidity) -
            Math.atan(finalHumidity - 1.676331) +
            0.00391838 * Math.pow(finalHumidity, 1.5) * Math.atan(0.023101 * finalHumidity) -
            4.686035
          ).toFixed(2)
        );

  const finalSolarIrradiance = solarIrradiance !== undefined ? solarIrradiance : 800;

  const observedMs = new Date(observedAt).getTime();
  const freshnessSeconds = Math.max(0, Math.round((nowMs - (isNaN(observedMs) ? nowMs : observedMs)) / 1000));

  let baseConfidence = isCached ? 0.85 : 0.95;
  if (missingFields.length > 0) {
    baseConfidence -= missingFields.length * 0.05;
  }
  if (freshnessSeconds > 300) {
    baseConfidence -= Math.min(0.2, (freshnessSeconds / 3600) * 0.2);
  }
  const confidence = Number(Math.max(0.5, baseConfidence).toFixed(2));

  return {
    observation_id: observationId,
    site_id: options.siteId,
    timestamp: observedAt,
    temperature_c: temperatureC,
    humidity_pct: finalHumidity,
    wet_bulb_c: finalWetBulb,
    solar_irradiance: finalSolarIrradiance,
    source: normalizedSource as any,
    apparent_temperature_c: apparentTemperatureC,
    freshness_seconds: freshnessSeconds,
    confidence,
    activity_id: options.activityId,
    provenance: {
      provider: 'fortyguard',
      source: sourceStr,
      activity_id: options.activityId,
      retrieved_at: nowIso,
      data_quality: dataQuality,
      stats: {
        min: stats.min !== undefined ? stats.min : stats.minimum !== undefined ? stats.minimum : temperatureC,
        max: stats.max !== undefined ? stats.max : stats.maximum !== undefined ? stats.maximum : temperatureC,
        mean: stats.mean !== undefined ? stats.mean : temperatureC,
        std_dev: stats.std_dev !== undefined ? stats.std_dev : stats.standard_deviation !== undefined ? stats.standard_deviation : 0,
      },
    },
  };
}
