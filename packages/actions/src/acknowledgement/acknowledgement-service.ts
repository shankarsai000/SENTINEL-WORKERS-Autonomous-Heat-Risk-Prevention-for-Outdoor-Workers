import {
  Action,
  ActionAcknowledgement,
} from '@sentinel/schemas';
import { ActionStateMachine } from '../execution/action-state-machine.js';

export interface AcknowledgeInput {
  action: Action;
  actor_type: 'WORKER' | 'SUPERVISOR' | 'SYSTEM_OVERRIDE';
  actor_ref: string;
  source: 'SMS_REPLY' | 'CONSOLE_BUTTON' | 'SIMULATED_API' | 'RADIO';
  note?: string;
  acknowledged_at?: string;
}

export interface AcknowledgeResult {
  action: Action;
  acknowledgement: ActionAcknowledgement;
  audit_events: Array<{
    event_type: string;
    action_id: string;
    details: Record<string, unknown>;
  }>;
}

export class ActionAcknowledgementService {
  /**
   * Processes worker or supervisor acknowledgement for an active action.
   */
  public static acknowledge(input: AcknowledgeInput): AcknowledgeResult {
    const { action, actor_type, actor_ref, source, note, acknowledged_at = new Date().toISOString() } = input;
    const currentStatus = action.status || 'ACK_PENDING';

    if (currentStatus === 'REJECTED' || currentStatus === 'DELIVERY_FAILED') {
      throw new Error(`Cannot acknowledge action '${action.action_id}' in '${currentStatus}' status.`);
    }

    const ackId = `ack_${Date.now()}_${action.action_id}`;
    const ack: ActionAcknowledgement = {
      ack_id: ackId,
      action_id: action.action_id,
      actor_type,
      actor_ref,
      acknowledged_at,
      source,
      note,
    };

    const updatedAction: Action = {
      ...action,
      status: 'COMPLETED',
      outcome: 'ACKNOWLEDGED',
      acknowledged_at,
      completed_at: acknowledged_at,
    };

    const auditEvents = [
      {
        event_type: 'action.acknowledged',
        action_id: action.action_id,
        details: {
          ack_id: ackId,
          actor_type,
          actor_ref,
          source,
          acknowledged_at,
          note,
        },
      },
      {
        event_type: 'action.completed',
        action_id: action.action_id,
        details: {
          completed_at: acknowledged_at,
          outcome: 'ACKNOWLEDGED',
        },
      },
    ];

    return {
      action: updatedAction,
      acknowledgement: ack,
      audit_events: auditEvents,
    };
  }
}
