import { ThermalObservation } from '@sentinel/schemas';

export interface TrendFeatures {
  delta_10m: number;
  delta_30m: number;
  delta_60m: number;
  rate_of_change_c_per_min: number;
  acceleration_c_per_min2: number;
  ewma_temperature_c: number;
  trend_direction: 'RISING' | 'FALLING' | 'STABLE' | 'UNKNOWN';
}

export function computeTrendFeatures(
  currentObs: ThermalObservation,
  history: ThermalObservation[]
): TrendFeatures {
  if (!history || history.length === 0) {
    return {
      delta_10m: 0,
      delta_30m: 0,
      delta_60m: 0,
      rate_of_change_c_per_min: 0,
      acceleration_c_per_min2: 0,
      ewma_temperature_c: currentObs.temperature_c,
      trend_direction: 'UNKNOWN',
    };
  }

  // Sort observations chronologically (oldest to newest)
  const sorted = [...history, currentObs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const currentMs = new Date(currentObs.timestamp).getTime();

  // Find observations around 10m (600s), 30m (1800s), 60m (3600s)
  let obs10m: ThermalObservation | undefined;
  let obs30m: ThermalObservation | undefined;
  let obs60m: ThermalObservation | undefined;

  for (const obs of sorted) {
    const ageSeconds = (currentMs - new Date(obs.timestamp).getTime()) / 1000;
    if (ageSeconds >= 500 && ageSeconds <= 700) obs10m = obs;
    if (ageSeconds >= 1600 && ageSeconds <= 2000) obs30m = obs;
    if (ageSeconds >= 3300 && ageSeconds <= 3900) obs60m = obs;
  }

  // Fallbacks if exact interval not matched
  if (!obs10m && sorted.length >= 2) {
    obs10m = sorted[sorted.length - 2];
  }
  if (!obs30m && sorted.length >= 3) {
    obs30m = sorted[0];
  }

  const delta10m = obs10m
    ? Math.round((currentObs.temperature_c - obs10m.temperature_c) * 100) / 100
    : 0;

  const delta30m = obs30m
    ? Math.round((currentObs.temperature_c - obs30m.temperature_c) * 100) / 100
    : delta10m * 3;

  const delta60m = obs60m
    ? Math.round((currentObs.temperature_c - obs60m.temperature_c) * 100) / 100
    : delta30m * 2;

  // Rate of change per minute based on the longest available reliable delta
  let rateOfChange = 0;
  if (obs30m) {
    const dtMins = Math.max(1, (currentMs - new Date(obs30m.timestamp).getTime()) / 60000);
    rateOfChange = (currentObs.temperature_c - obs30m.temperature_c) / dtMins;
  } else if (obs10m) {
    const dtMins = Math.max(1, (currentMs - new Date(obs10m.timestamp).getTime()) / 60000);
    rateOfChange = (currentObs.temperature_c - obs10m.temperature_c) / dtMins;
  }

  // Acceleration (change in rate of change over time)
  let acceleration = 0;
  if (sorted.length >= 3) {
    const prev = sorted[sorted.length - 2];
    const prevPrev = sorted[sorted.length - 3];
    const dt1 = Math.max(1, (new Date(prev.timestamp).getTime() - new Date(prevPrev.timestamp).getTime()) / 60000);
    const dt2 = Math.max(1, (currentMs - new Date(prev.timestamp).getTime()) / 60000);
    const rate1 = (prev.temperature_c - prevPrev.temperature_c) / dt1;
    const rate2 = (currentObs.temperature_c - prev.temperature_c) / dt2;
    acceleration = (rate2 - rate1) / ((dt1 + dt2) / 2);
  }

  // Exponential Weighted Moving Average (alpha = 0.3)
  let ewma = sorted[0].temperature_c;
  const alpha = 0.3;
  for (let i = 1; i < sorted.length; i++) {
    ewma = alpha * sorted[i].temperature_c + (1 - alpha) * ewma;
  }

  // Trend direction
  let trendDirection: TrendFeatures['trend_direction'] = 'STABLE';
  if (rateOfChange > 0.03 || delta30m > 0.5) {
    trendDirection = 'RISING';
  } else if (rateOfChange < -0.03 || delta30m < -0.5) {
    trendDirection = 'FALLING';
  }

  return {
    delta_10m: delta10m,
    delta_30m: delta30m,
    delta_60m: delta60m,
    rate_of_change_c_per_min: Math.round(rateOfChange * 1000) / 1000,
    acceleration_c_per_min2: Math.round(acceleration * 10000) / 10000,
    ewma_temperature_c: Math.round(ewma * 100) / 100,
    trend_direction: trendDirection,
  };
}
