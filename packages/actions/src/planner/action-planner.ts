import {
  RiskState,
  PredictiveRiskState,
  WorkerRiskContext,
  SiteRiskContext,
  ActionType,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';
import { ActionOption, ActionPlanResult } from './action-options.js';
import { DEFAULT_ACTION_PRIORITIES, ACTION_REST_MINUTES, ACTION_PRIORITY_WEIGHTS } from './action-types.js';

export interface PlanActionOptions {
  currentRisk: RiskState;
  predictedRisk?: PredictiveRiskState | null;
  workerCtx: WorkerRiskContext;
  siteCtx: SiteRiskContext;
  policy: SafetyPolicy;
}

export class ActionPlanner {
  /**
   * Evaluates current and predictive states to produce prioritized candidate action options.
   * Note: The planner is purely deterministic and does NOT execute actions directly.
   */
  public static planActions(options: PlanActionOptions): ActionPlanResult {
    const { currentRisk, predictedRisk, workerCtx, siteCtx, policy } = options;
    const candidates: ActionOption[] = [];

    const level = currentRisk.level;
    const isEarlyWarning = Boolean(predictedRisk?.early_warning);
    const predictedLevel = predictedRisk?.predicted_risk_level;

    // --- LEVEL 1: CRITICAL / HARD EMERGENCY ---
    if (level === 'CRITICAL') {
      candidates.push({
        action_type: 'STOP_WORK',
        priority: 'EMERGENCY',
        reason_codes: [...currentRisk.reason_codes, 'CRITICAL_RISK_LIMIT_EXCEEDED'],
        requires_acknowledgement: true,
        reversible: false,
        policy_basis: `${policy.policy_id}:${policy.version}#guardrails.extreme_temperature_c`,
        recommended_rest_minutes: 60,
        message_template: 'CRITICAL ALERT: Ambient thermal load exceeds safety threshold. Mandatory work halt. Report to climate-controlled cooling trailer immediately.',
      });

      candidates.push({
        action_type: 'SUPERVISOR_ACK_REQUIRED',
        priority: 'CRITICAL',
        reason_codes: ['CRITICAL_WORKER_ESCALATION'],
        requires_acknowledgement: true,
        reversible: false,
        policy_basis: `${policy.policy_id}:${policy.version}#action_eligibility.CRITICAL`,
        message_template: `Supervisor immediate notification: Worker ${workerCtx.worker_id} in ${siteCtx.site_id} transitioned to CRITICAL heat risk.`,
      });
    }
    // --- LEVEL 2: HIGH RISK ---
    else if (level === 'HIGH') {
      candidates.push({
        action_type: 'RECOVERY_BREAK',
        priority: 'HIGH',
        reason_codes: [...currentRisk.reason_codes, 'HIGH_THERMAL_EXPOSURE'],
        requires_acknowledgement: true,
        reversible: true,
        policy_basis: `${policy.policy_id}:${policy.version}#action_eligibility.HIGH`,
        recommended_rest_minutes: 20,
        message_template: 'HIGH RISK: Active task intensity and heat exposure require a mandatory 20-minute shaded hydration recovery break.',
      });

      if (siteCtx.cooling_resources.ac_trailers > 0) {
        candidates.push({
          action_type: 'RELOCATE_TO_COOLING',
          priority: 'HIGH',
          reason_codes: ['AC_COOLING_AVAILABLE'],
          requires_acknowledgement: true,
          reversible: true,
          policy_basis: `${policy.policy_id}:${policy.version}#cooling_resources.ac_trailers`,
          recommended_rest_minutes: 25,
          message_template: 'HIGH HEAT: Relocate to AC cooling station for active recovery.',
        });
      }

      candidates.push({
        action_type: 'MODIFY_WORK',
        priority: 'MEDIUM',
        reason_codes: ['TASK_INTENSITY_MODULATION'],
        requires_acknowledgement: false,
        reversible: true,
        policy_basis: `${policy.policy_id}:${policy.version}#task_intensity_weights`,
        recommended_rest_minutes: 15,
        message_template: 'Notice: Switch to lower-intensity task or seek intermittent shaded rotation.',
      });
    }
    // --- LEVEL 3: ELEVATED RISK ---
    else if (level === 'ELEVATED') {
      // If P3 predicts HIGH / CRITICAL within short horizon, upgrade recommendation
      if (isEarlyWarning && (predictedLevel === 'HIGH' || predictedLevel === 'CRITICAL')) {
        candidates.push({
          action_type: 'RECOVERY_BREAK',
          priority: 'HIGH',
          reason_codes: [
            ...currentRisk.reason_codes,
            'PREDICTIVE_EARLY_WARNING',
            `PREDICTED_${predictedLevel}_IN_${predictedRisk?.expected_time_to_threshold_minutes ?? 30}M`,
          ],
          requires_acknowledgement: true,
          reversible: true,
          policy_basis: `${policy.policy_id}:${policy.version}#predictive_early_warning`,
          recommended_rest_minutes: 15,
          message_template: `Pre-emptive Action: Trajectory indicates risk will reach ${predictedLevel} in ~${predictedRisk?.expected_time_to_threshold_minutes ?? 30}m. Take a proactive 15-min cooling break now.`,
        });
      } else {
        candidates.push({
          action_type: 'SHADE_RECOMMENDATION',
          priority: 'MEDIUM',
          reason_codes: [...currentRisk.reason_codes, 'ELEVATED_HEAT_LOAD'],
          requires_acknowledgement: true,
          reversible: true,
          policy_basis: `${policy.policy_id}:${policy.version}#action_eligibility.ELEVATED`,
          recommended_rest_minutes: 10,
          message_template: 'Elevated Heat Load: Take a 10-minute shade break and drink 500ml water before resuming work.',
        });
      }

      candidates.push({
        action_type: 'HYDRATION_REMINDER',
        priority: 'LOW',
        reason_codes: ['HYDRATION_MAINTENANCE'],
        requires_acknowledgement: false,
        reversible: true,
        policy_basis: `${policy.policy_id}:${policy.version}#hydration_protocol`,
        message_template: 'Hydration Reminder: Ensure scheduled fluid intake of 250ml every 20 minutes.',
      });
    }
    // --- LEVEL 4: WATCH RISK ---
    else if (level === 'WATCH') {
      // Prediction-driven pre-emptive recommendation
      if (isEarlyWarning && (predictedLevel === 'HIGH' || predictedLevel === 'CRITICAL')) {
        candidates.push({
          action_type: 'RECOVERY_BREAK',
          priority: 'HIGH',
          reason_codes: [
            ...currentRisk.reason_codes,
            'PREDICTIVE_EARLY_WARNING',
            `PREDICTED_${predictedLevel}`,
          ],
          requires_acknowledgement: true,
          reversible: true,
          policy_basis: `${policy.policy_id}:${policy.version}#predictive_early_warning`,
          recommended_rest_minutes: 15,
          message_template: `Early Warning: Rising heat trend projects ${predictedLevel} risk in ~${predictedRisk?.expected_time_to_threshold_minutes ?? 30}m. Rotate to shaded rest pre-emptively.`,
        });
      } else if (isEarlyWarning && predictedLevel === 'ELEVATED') {
        candidates.push({
          action_type: 'SHADE_RECOMMENDATION',
          priority: 'MEDIUM',
          reason_codes: [...currentRisk.reason_codes, 'PREDICTIVE_DETERIORATION'],
          requires_acknowledgement: false,
          reversible: true,
          policy_basis: `${policy.policy_id}:${policy.version}#predictive_early_warning`,
          recommended_rest_minutes: 10,
          message_template: 'Notice: Thermal conditions are rising. Plan a 10-minute shade break in the next rotation.',
        });
      } else {
        candidates.push({
          action_type: 'HYDRATION_REMINDER',
          priority: 'LOW',
          reason_codes: ['WATCH_STATUS_HYDRATION'],
          requires_acknowledgement: false,
          reversible: true,
          policy_basis: `${policy.policy_id}:${policy.version}#action_eligibility.WATCH`,
          message_template: 'Watch Advisory: Ambient conditions are warming. Maintain regular hydration.',
        });
      }

      candidates.push({
        action_type: 'MONITOR',
        priority: 'LOW',
        reason_codes: ['ROUTINE_MONITORING'],
        requires_acknowledgement: false,
        reversible: true,
        policy_basis: `${policy.policy_id}:${policy.version}#baseline`,
        message_template: 'Routine continuous monitoring active.',
      });
    }
    // --- LEVEL 5: GREEN ---
    else {
      candidates.push({
        action_type: 'MONITOR',
        priority: 'LOW',
        reason_codes: ['SAFE_THERMAL_MARGIN'],
        requires_acknowledgement: false,
        reversible: true,
        policy_basis: `${policy.policy_id}:${policy.version}#baseline`,
        message_template: 'Safe thermal conditions. Standard work protocols apply.',
      });

      if (workerCtx.exposure_duration_minutes >= 240) {
        candidates.push({
          action_type: 'HYDRATION_REMINDER',
          priority: 'LOW',
          reason_codes: ['EXTENDED_SHIFT_HYDRATION'],
          requires_acknowledgement: false,
          reversible: true,
          policy_basis: `${policy.policy_id}:${policy.version}#hydration_protocol`,
          message_template: 'Shift Hydration Check: 4 hours active work completed. Maintain continuous hydration.',
        });
      }
    }

    // Sort candidates descending by priority weight
    candidates.sort((a, b) => ACTION_PRIORITY_WEIGHTS[b.priority] - ACTION_PRIORITY_WEIGHTS[a.priority]);

    const recommended = candidates[0];

    return {
      worker_id: workerCtx.worker_id,
      site_id: siteCtx.site_id,
      current_risk_level: level,
      predicted_risk_level: predictedLevel,
      candidate_options: candidates,
      recommended_action: recommended,
    };
  }
}
