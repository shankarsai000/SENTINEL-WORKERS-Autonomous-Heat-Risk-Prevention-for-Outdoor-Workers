import { SafetyPolicy } from '@sentinel/policy';
import { RiskLevel } from '@sentinel/schemas';

export interface ThresholdEstimateResult {
  expected_time_to_threshold_minutes: number | null;
  target_threshold_level: RiskLevel;
  target_threshold_score: number;
}

export class ThresholdEstimator {
  public static estimateTimeToThreshold(
    currentScore: number,
    currentLevel: RiskLevel,
    score30m: number,
    score60m: number,
    policy: SafetyPolicy,
    shiftRemainingMins: number = 480
  ): ThresholdEstimateResult {
    // Determine the next target risk level
    let targetLevel: RiskLevel = 'CRITICAL';
    let targetScore = policy.risk_bands.critical.min; // 0.85

    if (currentLevel === 'GREEN') {
      targetLevel = 'WATCH';
      targetScore = policy.risk_bands.watch.min; // 0.30
    } else if (currentLevel === 'WATCH') {
      targetLevel = 'ELEVATED';
      targetScore = policy.risk_bands.elevated.min; // 0.50
    } else if (currentLevel === 'ELEVATED') {
      targetLevel = 'HIGH';
      targetScore = policy.risk_bands.high.min; // 0.70
    } else if (currentLevel === 'HIGH') {
      targetLevel = 'CRITICAL';
      targetScore = policy.risk_bands.critical.min; // 0.85
    } else if (currentLevel === 'CRITICAL') {
      return {
        expected_time_to_threshold_minutes: 0,
        target_threshold_level: 'CRITICAL',
        target_threshold_score: policy.risk_bands.critical.min,
      };
    }

    // If current score is already at or above target score, look to next higher tier
    if (currentScore >= targetScore && targetLevel !== 'CRITICAL') {
      targetLevel = 'CRITICAL';
      targetScore = policy.risk_bands.critical.min;
    }

    const deltaRequired = targetScore - currentScore;
    if (deltaRequired <= 0) {
      return {
        expected_time_to_threshold_minutes: 0,
        target_threshold_level: targetLevel,
        target_threshold_score: targetScore,
      };
    }

    // Velocity per minute estimated from 30m and 60m projections
    const v30 = (score30m - currentScore) / 30;
    const v60 = (score60m - currentScore) / 60;
    const velocity = Math.max(0, (v30 * 0.7 + v60 * 0.3));

    if (velocity <= 0.001) {
      // Non-escalating or falling trajectory: threshold unreachable
      return {
        expected_time_to_threshold_minutes: null,
        target_threshold_level: targetLevel,
        target_threshold_score: targetScore,
      };
    }

    const estimatedMins = Math.round(deltaRequired / velocity);

    // Limit lookahead horizon to 120 minutes or remaining shift
    if (estimatedMins > 120 || estimatedMins > shiftRemainingMins) {
      return {
        expected_time_to_threshold_minutes: null,
        target_threshold_level: targetLevel,
        target_threshold_score: targetScore,
      };
    }

    return {
      expected_time_to_threshold_minutes: estimatedMins,
      target_threshold_level: targetLevel,
      target_threshold_score: targetScore,
    };
  }
}
