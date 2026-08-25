import { ActionType, RiskLevel } from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';

export class ActionEligibilityChecker {
  /**
   * Evaluates whether an action type is eligible under the safety policy for the given risk level.
   */
  public static isActionEligible(
    actionType: ActionType,
    level: RiskLevel,
    policy: SafetyPolicy,
    isEarlyWarning: boolean = false
  ): boolean {
    // Normalization mapping for canonical action types
    const normalizedType = this.normalizeActionType(actionType);

    // Hard emergency rule
    if (level === 'CRITICAL' && (normalizedType === 'STOP_WORK' || normalizedType === 'EMERGENCY_PROTECTIVE_ACTION')) {
      return true;
    }

    const defaultEligibility: Record<RiskLevel, ActionType[]> = {
      GREEN: ['MONITOR'],
      WATCH: ['MONITOR', 'HYDRATION_REMINDER'],
      ELEVATED: ['HYDRATION_REMINDER', 'SHADE_RECOMMENDATION', 'SHADED_BREAK', 'RECOVERY_BREAK'],
      HIGH: ['SHADE_RECOMMENDATION', 'SHADED_BREAK', 'RECOVERY_BREAK', 'MANDATORY_REST', 'RELOCATE_TO_COOLING', 'RELOCATE', 'MODIFY_WORK'],
      CRITICAL: ['STOP_WORK', 'EMERGENCY_PROTECTIVE_ACTION', 'SUPERVISOR_ACK_REQUIRED', 'SUPERVISOR_ALERT', 'EMERGENCY_ESCALATION'],
    };

    const eligibleList = policy?.action_eligibility?.[level] || defaultEligibility[level] || [];
    const normalizedEligibleList = eligibleList.map((t) => this.normalizeActionType(t as ActionType));

    return normalizedEligibleList.includes(normalizedType);
  }

  public static normalizeActionType(type: ActionType): ActionType {
    switch (type) {
      case 'SHADED_BREAK': return 'SHADE_RECOMMENDATION';
      case 'MANDATORY_REST': return 'RECOVERY_BREAK';
      case 'RELOCATE': return 'RELOCATE_TO_COOLING';
      case 'SUPERVISOR_ALERT': return 'SUPERVISOR_REVIEW';
      case 'EMERGENCY_ESCALATION': return 'EMERGENCY_PROTECTIVE_ACTION';
      default: return type;
    }
  }
}
