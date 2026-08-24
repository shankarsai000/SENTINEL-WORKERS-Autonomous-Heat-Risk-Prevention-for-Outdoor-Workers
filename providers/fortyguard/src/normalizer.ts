import { ThermalObservation } from '@sentinel/schemas';
import { FortyGuardResultPayload } from './schemas.js';

export interface NormalizationOptions {
  siteId: string;
  activityId: string;
  isCached?: boolean;
  referenceTimeMs?: number;
}

/**
 * Normalizes raw FortyGuard provider payloads into the unified Sentinel ThermalObservation contract.
 *
 * NOTE ON CONFIDENCE:
 * FortyGuard API returns raw physical thermal readings and does not provide an internal confidence score.
 * Sentinel calculates its own operational confidence metric (0.0 to 1.0) based on:
 * 1. Payload field completeness (temperature, wet bulb, humidity, solar irradiance).
 * 2. Ingestion freshness (penalized as observation age exceeds 300 seconds).
 */
export function normalizeFortyGuardResult(
  result: FortyGuardResultPayload,
  options: NormalizationOptions
): ThermalObservation {
  const { siteId, activityId, isCached = false, referenceTimeMs = Date.now() } = options;

  if (result.temperature_c === undefined || isNaN(result.temperature_c)) {
    throw new Error(`Invalid FortyGuard payload: temperature_c is missing or NaN for activity ${activityId}`);
  }

  const observedAt = result.observed_at || new Date(referenceTimeMs).toISOString();
  const observedTimestampMs = new Date(observedAt).getTime();
  const freshnessSeconds = Math.max(0, Math.floor((referenceTimeMs - observedTimestampMs) / 1000));

  // Derive Sentinel operational confidence
  let confidence = 0.95;

  // Field completeness checks
  if (result.humidity_pct === undefined) confidence -= 0.1;
  if (result.wet_bulb_c === undefined) confidence -= 0.15;
  if (result.solar_irradiance === undefined) confidence -= 0.05;

  // Freshness decay: after 5 mins (300s), degrade confidence proportionally
  if (freshnessSeconds > 300) {
    const agePenalty = Math.min(0.5, ((freshnessSeconds - 300) / 1800) * 0.5);
    confidence -= agePenalty;
  }

  // If cached, apply minor cache provenance discount
  if (isCached) {
    confidence = Math.max(0.2, confidence - 0.05);
  }

  confidence = Math.round(Math.max(0.1, Math.min(1.0, confidence)) * 100) / 100;

  // Derive approximate wet-bulb if omitted using ambient + humidity
  let wetBulbC = result.wet_bulb_c;
  if (wetBulbC === undefined && result.humidity_pct !== undefined) {
    const t = result.temperature_c;
    const rh = result.humidity_pct;
    // Standard Stull approximation
    const tw =
      t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
      Math.atan(t + rh) -
      Math.atan(rh - 1.676331) +
      0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
      4.686035;
    wetBulbC = Math.round(tw * 10) / 10;
  } else if (wetBulbC === undefined) {
    wetBulbC = result.temperature_c * 0.75; // Fallback conservative ratio
  }

  const source = isCached ? 'fortyguard_cache' : 'fortyguard';

  return {
    observation_id: `obs_fg_${activityId}`,
    site_id: siteId,
    timestamp: observedAt,
    temperature_c: Math.round(result.temperature_c * 10) / 10,
    humidity_pct: result.humidity_pct ?? 30,
    wet_bulb_c: Math.round(wetBulbC * 10) / 10,
    apparent_temperature_c: result.apparent_temperature_c,
    solar_irradiance: result.solar_irradiance ?? 0,
    source,
    freshness_seconds: freshnessSeconds,
    confidence,
    activity_id: activityId,
  };
}
