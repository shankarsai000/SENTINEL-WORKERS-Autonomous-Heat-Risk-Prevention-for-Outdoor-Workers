import { RiskLevel, ActionType } from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';

export function evaluatePolicyRiskLevel(score: number, policy: SafetyPolicy): RiskLevel {
  const { green, watch, elevated, high } = policy.risk_bands;

  if (score < green.max) return 'GREEN';
  if (score < watch.max) return 'WATCH';
  if (score < elevated.max) return 'ELEVATED';
  if (score < high.max) return 'HIGH';
  return 'CRITICAL';
}

export function getEligibleActions(level: RiskLevel, policy: SafetyPolicy): ActionType[] {
  return policy.action_eligibility[level] || ['MONITOR'];
}
