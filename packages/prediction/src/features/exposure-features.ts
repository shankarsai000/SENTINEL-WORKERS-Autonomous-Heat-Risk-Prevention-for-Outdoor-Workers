import { WorkerRiskContext } from '@sentinel/schemas';

export interface ProjectedExposureFeatures {
  current_exposure_mins: number;
  projected_exposure_30m_mins: number;
  projected_exposure_60m_mins: number;
  normalized_projected_30m: number; // 0.0 - 1.0
  normalized_projected_60m: number; // 0.0 - 1.0
  shift_remaining_mins: number;
}

export function computeProjectedExposureFeatures(
  workerCtx: WorkerRiskContext,
  currentTime: string = new Date().toISOString()
): ProjectedExposureFeatures {
  const currentMins = workerCtx.exposure_duration_minutes;

  // Calculate remaining shift duration
  let shiftRemainingMins = 480; // Default 8h
  const startMs = new Date(workerCtx.shift_start).getTime();
  let endMs = new Date(workerCtx.shift_end).getTime();
  const currentMs = new Date(currentTime).getTime();

  if (!isNaN(startMs) && !isNaN(endMs) && !isNaN(currentMs)) {
    if (endMs < startMs) {
      endMs += 24 * 60 * 60 * 1000;
    }
    if (currentMs < endMs) {
      shiftRemainingMins = Math.max(0, Math.floor((endMs - currentMs) / 60000));
    } else {
      shiftRemainingMins = 0;
    }
  }

  // Active exposure projection (capped at remaining shift time if shift ends earlier)
  const add30 = Math.min(30, shiftRemainingMins);
  const add60 = Math.min(60, shiftRemainingMins);

  const projected30 = currentMins + add30;
  const projected60 = currentMins + add60;

  // Normalization baseline (360 mins = 6h max)
  const norm30 = Math.round(Math.max(0, Math.min(1.0, projected30 / 360)) * 100) / 100;
  const norm60 = Math.round(Math.max(0, Math.min(1.0, projected60 / 360)) * 100) / 100;

  return {
    current_exposure_mins: currentMins,
    projected_exposure_30m_mins: projected30,
    projected_exposure_60m_mins: projected60,
    normalized_projected_30m: norm30,
    normalized_projected_60m: norm60,
    shift_remaining_mins: shiftRemainingMins,
  };
}
