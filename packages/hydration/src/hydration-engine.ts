/**
 * @sentinel/hydration-engine
 *
 * Science-based hydration intelligence engine using ACGIH TLV guidelines
 * for personalized fluid replacement recommendations.
 *
 * References:
 * - ACGIH TLV for Heat Stress & Strain (2024 edition)
 * - NIOSH Criteria for a Recommended Standard: Occupational Exposure to Heat and Hot Environments
 * - ISO 7933:2004 Ergonomics of the thermal environment
 */

export interface HydrationInput {
  /** Worker task intensity */
  taskIntensity: 'LIGHT' | 'MODERATE' | 'HEAVY';
  /** Worker acclimatization status */
  acclimatizationStatus: 'baseline' | 'elevated' | 'acclimatizing';
  /** Current Wet Bulb Globe Temperature in °C */
  wbgt_c: number;
  /** Ambient temperature in °C */
  temperature_c: number;
  /** Relative humidity in % */
  humidity_pct: number;
  /** Duration of continuous heat exposure in minutes */
  exposureDurationMins: number;
  /** Worker role for context */
  workerRole?: string;
  /** Current risk level for urgency escalation */
  riskLevel?: 'GREEN' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

export interface HydrationPlan {
  /** Recommended interval between fluid intake in minutes */
  intervalMinutes: number;
  /** Recommended volume per intake in milliliters */
  volumeMl: number;
  /** Whether electrolyte supplementation is recommended */
  electrolyteRecommended: boolean;
  /** Electrolyte type recommendation */
  electrolyteType: 'none' | 'standard_oral_rehydration' | 'aggressive_electrolyte';
  /** ISO timestamp for next recommended intake */
  nextIntakeAt: string;
  /** Urgency level of the hydration plan */
  urgency: 'NORMAL' | 'ELEVATED' | 'AGGRESSIVE' | 'CRITICAL';
  /** Human-readable recommendation summary */
  summary: string;
  /** Estimated hourly fluid requirement in mL */
  hourlyRequirementMl: number;
  /** Science basis reference */
  scienceBasis: string;
}

/**
 * ACGIH WBGT action brackets for water intake (acclimatized workers)
 *
 * WBGT < 25.6°C: Standard hydration (250ml / 20min)
 * WBGT 25.6–27.8°C: Moderate (250ml / 15min)
 * WBGT 27.8–30.0°C: Elevated (300ml / 15min)
 * WBGT 30.0–32.2°C: Aggressive (300ml / 12min)
 * WBGT > 32.2°C: Critical (300ml / 10min, electrolyte mandatory)
 */
const ACGIH_HYDRATION_BRACKETS = [
  { maxWbgt: 25.6, intervalMin: 20, volumeMl: 250, electrolyte: false, urgency: 'NORMAL' as const },
  { maxWbgt: 27.8, intervalMin: 15, volumeMl: 250, electrolyte: false, urgency: 'NORMAL' as const },
  { maxWbgt: 30.0, intervalMin: 15, volumeMl: 300, electrolyte: false, urgency: 'ELEVATED' as const },
  { maxWbgt: 32.2, intervalMin: 12, volumeMl: 300, electrolyte: true, urgency: 'AGGRESSIVE' as const },
  { maxWbgt: Infinity, intervalMin: 10, volumeMl: 300, electrolyte: true, urgency: 'CRITICAL' as const },
];

/**
 * Task intensity multipliers for fluid requirement.
 * Heavy work increases metabolic heat production significantly.
 */
const INTENSITY_MULTIPLIER: Record<string, number> = {
  LIGHT: 0.85,
  MODERATE: 1.0,
  HEAVY: 1.25,
};

/**
 * Non-acclimatized workers need more aggressive hydration.
 * ACGIH recommends lower WBGT thresholds for unacclimatized workers.
 */
const ACCLIMATIZATION_WBGT_OFFSET: Record<string, number> = {
  baseline: 0,       // Fully acclimatized
  elevated: -1.5,    // Partially acclimatized (lower threshold)
  acclimatizing: -2.5, // New/unacclimatized (much lower threshold)
};

export class HydrationEngine {
  /**
   * Calculate a personalized hydration plan for a worker.
   */
  public calculatePlan(input: HydrationInput): HydrationPlan {
    // Apply acclimatization offset to effective WBGT
    const wbgtOffset = ACCLIMATIZATION_WBGT_OFFSET[input.acclimatizationStatus] ?? 0;
    const effectiveWbgt = input.wbgt_c - wbgtOffset; // Higher effective = more aggressive

    // Find matching ACGIH bracket
    const bracket = ACGIH_HYDRATION_BRACKETS.find((b) => effectiveWbgt <= b.maxWbgt)
      || ACGIH_HYDRATION_BRACKETS[ACGIH_HYDRATION_BRACKETS.length - 1];

    // Apply task intensity multiplier
    const intensityMult = INTENSITY_MULTIPLIER[input.taskIntensity] ?? 1.0;
    const adjustedVolume = Math.round(bracket.volumeMl * intensityMult);
    const adjustedInterval = Math.max(8, Math.round(bracket.intervalMin / intensityMult));

    // Escalate urgency if risk level is HIGH or CRITICAL regardless of WBGT
    let urgency = bracket.urgency;
    let electrolyteRecommended = bracket.electrolyte;
    if (input.riskLevel === 'CRITICAL') {
      urgency = 'CRITICAL';
      electrolyteRecommended = true;
    } else if (input.riskLevel === 'HIGH' && urgency === 'NORMAL') {
      urgency = 'ELEVATED';
    }

    // Escalate for prolonged exposure (>120 min continuous)
    if (input.exposureDurationMins > 120 && !electrolyteRecommended) {
      electrolyteRecommended = true;
    }
    if (input.exposureDurationMins > 180 && urgency === 'NORMAL') {
      urgency = 'ELEVATED';
    }

    // Calculate hourly fluid requirement
    const intakesPerHour = 60 / adjustedInterval;
    const hourlyRequirementMl = Math.round(intakesPerHour * adjustedVolume);

    // Determine electrolyte type
    let electrolyteType: HydrationPlan['electrolyteType'] = 'none';
    if (electrolyteRecommended) {
      electrolyteType = urgency === 'CRITICAL' || urgency === 'AGGRESSIVE'
        ? 'aggressive_electrolyte'
        : 'standard_oral_rehydration';
    }

    // Generate next intake timestamp
    const nextIntakeAt = new Date(Date.now() + adjustedInterval * 60_000).toISOString();

    // Build human-readable summary
    const summary = this.buildSummary(adjustedVolume, adjustedInterval, electrolyteRecommended, urgency, input);

    return {
      intervalMinutes: adjustedInterval,
      volumeMl: adjustedVolume,
      electrolyteRecommended,
      electrolyteType,
      nextIntakeAt,
      urgency,
      summary,
      hourlyRequirementMl,
      scienceBasis: `ACGIH TLV Heat Stress (WBGT ${input.wbgt_c.toFixed(1)}°C, effective ${effectiveWbgt.toFixed(1)}°C after acclimatization adjustment)`,
    };
  }

  private buildSummary(
    volume: number,
    interval: number,
    electrolyte: boolean,
    urgency: string,
    input: HydrationInput
  ): string {
    const base = `Drink ${volume}ml every ${interval} minutes`;
    const elecNote = electrolyte ? '. Add electrolyte supplementation (sodium + potassium)' : '';
    const intensityNote = input.taskIntensity === 'HEAVY' ? '. Increased volume for heavy exertion' : '';
    const accNote = input.acclimatizationStatus === 'acclimatizing'
      ? '. Unacclimatized worker — elevated thresholds applied'
      : '';
    const urgencyNote = urgency === 'CRITICAL' ? '. CRITICAL: Medical standby recommended' : '';

    return `${base}${elecNote}${intensityNote}${accNote}${urgencyNote}`;
  }
}
