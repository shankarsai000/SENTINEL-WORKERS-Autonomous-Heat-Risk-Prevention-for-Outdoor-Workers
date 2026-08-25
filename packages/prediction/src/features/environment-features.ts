import { ThermalObservation } from '@sentinel/schemas';
import { TrendFeatures } from './trend-features.js';

export interface ProjectedEnvironmentFeatures {
  projected_temp_30m_c: number;
  projected_temp_60m_c: number;
  projected_wet_bulb_30m_c: number;
  projected_wet_bulb_60m_c: number;
  normalized_env_load_30m: number; // 0.0 - 1.0
  normalized_env_load_60m: number; // 0.0 - 1.0
}

export function computeProjectedEnvironmentFeatures(
  obs: ThermalObservation,
  trend: TrendFeatures
): ProjectedEnvironmentFeatures {
  const currentTemp = obs.temperature_c;
  const currentWb = obs.wet_bulb_c ?? (currentTemp * 0.75);

  // Rate of change extrapolation
  const rate = trend.rate_of_change_c_per_min;

  // Extrapolate with damping on longer horizon
  const projTemp30 = Math.round((currentTemp + rate * 30) * 10) / 10;
  const projTemp60 = Math.round((currentTemp + rate * 60 * 0.85) * 10) / 10; // Slight dampening over 1h

  const projWb30 = Math.round((currentWb + rate * 30 * 0.8) * 10) / 10;
  const projWb60 = Math.round((currentWb + rate * 60 * 0.7) * 10) / 10;

  // Normalization curve: baseline 25°C = 0.0, extreme 45°C = 1.0 (effective temp 0.7 * WB + 0.3 * T)
  const eff30 = 0.7 * projWb30 + 0.3 * projTemp30;
  const eff60 = 0.7 * projWb60 + 0.3 * projTemp60;

  const norm30 = Math.round(Math.max(0, Math.min(1.0, (eff30 - 25) / 20)) * 100) / 100;
  const norm60 = Math.round(Math.max(0, Math.min(1.0, (eff60 - 25) / 20)) * 100) / 100;

  return {
    projected_temp_30m_c: projTemp30,
    projected_temp_60m_c: projTemp60,
    projected_wet_bulb_30m_c: projWb30,
    projected_wet_bulb_60m_c: projWb60,
    normalized_env_load_30m: norm30,
    normalized_env_load_60m: norm60,
  };
}
