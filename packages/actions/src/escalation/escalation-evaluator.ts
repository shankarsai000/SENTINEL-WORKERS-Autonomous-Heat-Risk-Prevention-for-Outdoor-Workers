import { Action, EscalationDecision } from '@sentinel/schemas';
import { ActionStateMachine } from '../execution/action-state-machine.js';

export interface EscalationEvaluationResult {
  is_expired: boolean;
  action: Action;
  escalation?: EscalationDecision;
  audit_events: Array<{
    event_type: string;
    action_id: string;
    details: Record<string, unknown>;
  }>;
}

export class EscalationEvaluator {
  /**
   * Checks if an action in ACK_PENDING has exceeded its acknowledgement deadline.
   */
  public static evaluateDeadline(
    action: Action,
    currentTime: string = new Date().toISOString()
  ): EscalationEvaluationResult {
    if (action.status !== 'ACK_PENDING' || !action.ack_deadline) {
      return { is_expired: false, action, audit_events: [] };
    }

    const deadlineMs = new Date(action.ack_deadline).getTime();
    const currTimeMs = new Date(currentTime).getTime();

    if (currTimeMs < deadlineMs) {
      return { is_expired: false, action, audit_events: [] };
    }

    // Deadline Exceeded: Transition to ESCALATED
    ActionStateMachine.validateTransition(action.action_id, 'ACK_PENDING', 'ESCALATED');

    const escalationId = `esc_${Date.now()}_${action.action_id}`;
    const escalation: EscalationDecision = {
      escalation_id: escalationId,
      worker_id: action.worker_id,
      site_id: action.site_id,
      action_id: action.action_id,
      severity: action.priority === 'EMERGENCY' ? 'CRITICAL' : 'HIGH',
      reason_codes: [...(action.reason_codes || []), 'UNACKNOWLEDGED_ACTION_DEADLINE_EXCEEDED'],
      policy_id: action.policy_id || 'demo-construction-v1',
      policy_version: action.policy_version,
      created_at: currentTime,
      status: 'TRIGGERED',
      escalated_to: `SUPERVISOR_${action.site_id}`,
    };

    const updatedAction: Action = {
      ...action,
      status: 'ESCALATED',
      outcome: 'ESCALATED',
      reason_codes: [...(action.reason_codes || []), 'ESCALATED_DUE_TO_NO_ACK'],
    };

    const auditEvents = [
      {
        event_type: 'action.escalated',
        action_id: action.action_id,
        details: {
          escalation_id: escalationId,
          ack_deadline: action.ack_deadline,
          currentTime,
          severity: escalation.severity,
          escalated_to: escalation.escalated_to,
        },
      },
    ];

    return {
      is_expired: true,
      action: updatedAction,
      escalation,
      audit_events: auditEvents,
    };
  }
}
