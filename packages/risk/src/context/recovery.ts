/**
 * Recovery Context Calculation
 * Derives explicit recorded recovery duration without fabricating unobserved rest periods.
 */

export interface RecoveryInterval {
  start: string; // ISO 8601 UTC string
  end: string;   // ISO 8601 UTC string
}

export interface RecoveryCalculationOptions {
  recoveryEvents?: RecoveryInterval[];
  currentTime: string;
  lookbackWindowMins?: number;
}

export function calculateRecentRecoveryMinutes(options: RecoveryCalculationOptions): number | null {
  const { recoveryEvents, currentTime, lookbackWindowMins = 120 } = options;

  if (!recoveryEvents || recoveryEvents.length === 0) {
    return null; // Explicitly null if no recovery is recorded
  }

  const currentMs = new Date(currentTime).getTime();
  const windowStartMs = currentMs - lookbackWindowMins * 60 * 1000;
  let totalRecoveryMins = 0;

  for (const event of recoveryEvents) {
    const eventStartMs = new Date(event.start).getTime();
    const eventEndMs = new Date(event.end).getTime();

    if (isNaN(eventStartMs) || isNaN(eventEndMs) || eventEndMs <= eventStartMs) {
      continue;
    }

    // Check if interval overlaps with lookback window
    const overlapStart = Math.max(windowStartMs, eventStartMs);
    const overlapEnd = Math.min(currentMs, eventEndMs);

    if (overlapEnd > overlapStart) {
      totalRecoveryMins += Math.floor((overlapEnd - overlapStart) / 60000);
    }
  }

  return totalRecoveryMins > 0 ? totalRecoveryMins : null;
}
