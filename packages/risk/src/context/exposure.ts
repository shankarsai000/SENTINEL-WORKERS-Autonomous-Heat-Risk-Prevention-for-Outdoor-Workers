/**
 * Exposure Duration Calculation Engine
 * UTC-based active exposure accumulator respecting shift windows and inactive states.
 */

export interface ShiftExposureOptions {
  shiftStart: string; // ISO 8601 UTC string
  shiftEnd: string;   // ISO 8601 UTC string
  currentTime: string;// ISO 8601 UTC string
  isActive?: boolean;
}

export function calculateActiveExposureMinutes(options: ShiftExposureOptions): number {
  const { shiftStart, shiftEnd, currentTime, isActive = true } = options;

  if (!isActive) {
    return 0;
  }

  const startMs = new Date(shiftStart).getTime();
  let endMs = new Date(shiftEnd).getTime();
  const currentMs = new Date(currentTime).getTime();

  if (isNaN(startMs) || isNaN(endMs) || isNaN(currentMs)) {
    return 0;
  }

  // Handle midnight crossing: if end time is before start time, shift extends to next UTC day
  if (endMs < startMs) {
    endMs += 24 * 60 * 60 * 1000;
  }

  // Case 1: Shift has not started yet
  if (currentMs < startMs) {
    return 0;
  }

  // Case 2: Shift has ended
  if (currentMs >= endMs) {
    return Math.max(0, Math.floor((endMs - startMs) / 60000));
  }

  // Case 3: Currently active inside shift window
  return Math.max(0, Math.floor((currentMs - startMs) / 60000));
}
