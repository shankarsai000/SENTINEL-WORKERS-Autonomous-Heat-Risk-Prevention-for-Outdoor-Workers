import { RiskLevel, RiskExplanation, RiskExplanationReason } from '@sentinel/schemas';
import { ScoreBreakdownResult } from '../scoring/score-normalizer.js';
import { REASON_CODES } from '../scoring/reason-codes.js';

export interface ExplanationBuilderOptions {
  workerId: string;
  level: RiskLevel;
  score: number;
  confidence: number;
  reasonCodes: string[];
  breakdown?: ScoreBreakdownResult;
}

const REASON_EXPLANATIONS: Record<string, string> = {
  [REASON_CODES.EXTREME_AMBIENT_HEAT]: 'Extreme ambient heat exceeds mandatory safety limit (>= 45°C).',
  [REASON_CODES.HIGH_THERMAL_LOAD]: 'Thermal exposure load is elevated based on ambient and wet-bulb temperatures.',
  [REASON_CODES.HEAT_RISE]: 'Hyperlocal temperature trend is actively rising over the past 30 minutes.',
  [REASON_CODES.ELEVATED_HUMIDITY]: 'High relative humidity impedes natural evaporative sweat cooling.',
  [REASON_CODES.HIGH_SOLAR_EXPOSURE]: 'Intense direct solar irradiance (> 800 W/m²) increases effective heat burden.',
  [REASON_CODES.LONG_EXPOSURE]: 'Active shift exposure duration has accumulated beyond recommended thresholds.',
  [REASON_CODES.HIGH_TASK_INTENSITY]: 'Worker is performing heavy metabolic physical activity.',
  [REASON_CODES.ELEVATED_WORKER_MODIFIER]: 'Worker context flagged with elevated synthetic risk modifier.',
  [REASON_CODES.LOW_RECOVERY]: 'Minimal or zero shaded recovery time recorded during prolonged exposure.',
  [REASON_CODES.RECENT_RECOVERY_APPLIED]: 'Recent shaded rest period applied mitigating exposure accumulation.',
  [REASON_CODES.ZONE_CLUSTER_DENSITY]: 'High concentration of elevated/high risk workers detected in this site zone.',
  [REASON_CODES.DATA_STALE]: 'Environmental observation is stale (> 15m old); conservative uncertainty applied.',
  [REASON_CODES.DATA_AGING]: 'Environmental observation is aging (> 5m old).',
  [REASON_CODES.MISSING_ENVIRONMENT_FIELD]: 'One or more physical sensor parameters were omitted; derived estimate used.',
  [REASON_CODES.GUARDRAIL_EMERGENCY_OVERRIDE]: 'Hard emergency policy guardrail triggered an automatic safety state override.',
  [REASON_CODES.UNACKNOWLEDGED_CRITICAL_ESCALATION]: 'Critical alert remained unacknowledged beyond the policy response window.',
  [REASON_CODES.NORMAL_OPERATING_LIMITS]: 'Thermal and physiological exposure factors are within normal operating bounds.',
};

export class ExplanationBuilder {
  public static build(options: ExplanationBuilderOptions): RiskExplanation {
    const { workerId, level, score, confidence, reasonCodes } = options;

    const summary = `Worker ${workerId} is currently at ${level} risk (Contextual Score: ${score.toFixed(2)}, Assessment Confidence: ${Math.round(confidence * 100)}%).`;

    const reasons: RiskExplanationReason[] = reasonCodes.map((code) => ({
      code,
      message: REASON_EXPLANATIONS[code] || `Operational factor: ${code}`,
    }));

    if (reasons.length === 0) {
      reasons.push({
        code: REASON_CODES.NORMAL_OPERATING_LIMITS,
        message: 'All monitored exposure parameters are within standard baseline thresholds.',
      });
    }

    return {
      summary,
      reasons,
    };
  }
}
