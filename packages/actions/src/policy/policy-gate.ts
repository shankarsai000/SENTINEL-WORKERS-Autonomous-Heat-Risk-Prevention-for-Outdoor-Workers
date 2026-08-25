import {
  ActionType,
  RiskState,
  PredictiveRiskState,
  WorkerRiskContext,
  SiteRiskContext,
  DataFreshness,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';
import { ActionOption } from '../planner/action-options.js';
import { ActionEligibilityChecker } from './action-eligibility.js';

export interface PolicyGateInput {
  candidate: ActionOption;
  currentRisk: RiskState;
  predictedRisk?: PredictiveRiskState | null;
  workerCtx: WorkerRiskContext;
  siteCtx: SiteRiskContext;
  policy: SafetyPolicy;
  freshness?: DataFreshness;
  confidence?: number;
}

export interface PolicyGateResult {
  allowed: boolean;
  rejected_reason?: string;
  decision_mode: 'AUTONOMOUS' | 'SUPERVISOR_REQUIRED' | 'EMERGENCY_AUTO';
  requires_acknowledgement: boolean;
  ack_deadline_minutes: number;
  policy_id: string;
  policy_version: string;
  cooldown_minutes: number;
}

export class PolicyGate {
  /**
   * Hard policy evaluation gate. No consequential action can be dispatched without passing this check.
   */
  public static evaluate(input: PolicyGateInput): PolicyGateResult {
    const {
      candidate,
      currentRisk,
      predictedRisk,
      policy,
      freshness = currentRisk.data_freshness || 'FRESH',
      confidence = currentRisk.confidence,
    } = input;

    const actionType = candidate.action_type;
    const isEarlyWarning = Boolean(predictedRisk?.early_warning);

    const criticalMin = policy?.risk_bands?.critical?.min ?? 0.85;
    const policyId = policy?.policy_id ?? (policy as any)?.policyId ?? 'demo-construction-v1';
    const policyVersion = policy?.version ?? '1.0.0';

    // 1. CRITICAL EMERGENCY RULE DOMINANCE
    if (currentRisk.level === 'CRITICAL' || currentRisk.score >= criticalMin) {
      if (actionType === 'STOP_WORK' || actionType === 'EMERGENCY_PROTECTIVE_ACTION' || actionType === 'SUPERVISOR_ACK_REQUIRED') {
        return {
          allowed: true,
          decision_mode: 'EMERGENCY_AUTO',
          requires_acknowledgement: true,
          ack_deadline_minutes: 15,
          policy_id: policyId,
          policy_version: policyVersion,
          cooldown_minutes: 0, // No cooldown on emergency stop work
        };
      }
    }

    // 2. Policy Action Eligibility Validation
    const isEligible = ActionEligibilityChecker.isActionEligible(
      actionType,
      currentRisk.level,
      policy,
      isEarlyWarning
    );

    if (!isEligible) {
      return {
        allowed: false,
        rejected_reason: `Action '${actionType}' is not eligible for risk level '${currentRisk.level}' under policy '${policy.policy_id}:${policy.version}'.`,
        decision_mode: 'SUPERVISOR_REQUIRED',
        requires_acknowledgement: candidate.requires_acknowledgement,
        ack_deadline_minutes: 30,
        policy_id: policy.policy_id,
        policy_version: policy.version,
        cooldown_minutes: 15,
      };
    }

    // 3. Uncertainty & Freshness Governance
    let decisionMode: PolicyGateResult['decision_mode'] = 'AUTONOMOUS';
    let requiresAck = candidate.requires_acknowledgement;

    if (freshness === 'STALE' || confidence < 0.50) {
      // Stale data restricts high-consequence autonomous actions
      if (actionType === 'STOP_WORK' || actionType === 'RECOVERY_BREAK' || actionType === 'RELOCATE_TO_COOLING') {
        decisionMode = 'SUPERVISOR_REQUIRED';
        requiresAck = true;
      }
    } else if (currentRisk.level === 'HIGH' || currentRisk.level === 'ELEVATED') {
      decisionMode = candidate.requires_acknowledgement ? 'AUTONOMOUS' : 'AUTONOMOUS';
    }

    // Default Ack Deadlines by Priority
    let ackDeadlineMins = 30;
    if (candidate.priority === 'EMERGENCY') {
      ackDeadlineMins = 15;
    } else if (candidate.priority === 'HIGH') {
      ackDeadlineMins = 20;
    } else if (candidate.priority === 'MEDIUM') {
      ackDeadlineMins = 30;
    }

    // Default Cooldown by Action Type
    let cooldownMins = 15;
    if (actionType === 'HYDRATION_REMINDER') cooldownMins = 15;
    else if (actionType === 'SHADE_RECOMMENDATION') cooldownMins = 20;
    else if (actionType === 'RECOVERY_BREAK') cooldownMins = 30;
    else if (actionType === 'MODIFY_WORK') cooldownMins = 45;
    else if (actionType === 'STOP_WORK') cooldownMins = 0;

    return {
      allowed: true,
      decision_mode: decisionMode,
      requires_acknowledgement: requiresAck,
      ack_deadline_minutes: ackDeadlineMins,
      policy_id: policy.policy_id,
      policy_version: policy.version,
      cooldown_minutes: cooldownMins,
    };
  }
}
