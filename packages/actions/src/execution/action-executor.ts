import {
  Action,
  ActionDecision,
  ActionDelivery,
  ActionStatus,
} from '@sentinel/schemas';
import { ActionStateMachine } from './action-state-machine.js';
import { INotificationProvider, DeliveryResult } from '../delivery/notification-provider.js';
import { SimulatedNotificationProvider } from '../delivery/simulated-provider.js';
import { ActionDeduplicationService } from '../dedupe/deduplication.js';

export interface ExecuteActionOptions {
  decision: ActionDecision;
  provider?: INotificationProvider;
  dedupeService?: ActionDeduplicationService;
  customChannel?: 'SMS_SIMULATED' | 'CONSOLE' | 'RADIO_SIMULATED';
}

export interface ActionExecutionResult {
  action: Action;
  delivery?: ActionDelivery;
  deduplicated: boolean;
  status: ActionStatus;
  decision_to_dispatch_ms: number;
  dispatch_to_delivery_ms: number;
  total_latency_ms: number;
  audit_events: Array<{
    event_type: string;
    action_id: string;
    details: Record<string, unknown>;
  }>;
}

export class ActionExecutor {
  private defaultProvider: INotificationProvider;
  private dedupeService: ActionDeduplicationService;

  constructor(provider?: INotificationProvider, dedupeService?: ActionDeduplicationService) {
    this.defaultProvider = provider || new SimulatedNotificationProvider();
    this.dedupeService = dedupeService || new ActionDeduplicationService();
  }

  public async execute(options: ExecuteActionOptions): Promise<ActionExecutionResult> {
    const startOverall = performance.now();
    const { decision, provider = this.defaultProvider, dedupeService = this.dedupeService } = options;

    const auditEvents: ActionExecutionResult['audit_events'] = [];

    // 1. Audit proposed action
    auditEvents.push({
      event_type: 'action.proposed',
      action_id: decision.action_id,
      details: {
        worker_id: decision.worker_id,
        action_type: decision.action_type,
        priority: decision.priority,
        policy_version: decision.policy_version,
      },
    });

    // 2. Policy Rejection Guard
    if (!decision.allowed) {
      const rejectedAction: Action = {
        action_id: decision.action_id,
        worker_id: decision.worker_id,
        site_id: decision.site_id,
        action_type: decision.action_type,
        priority: decision.priority,
        status: 'REJECTED',
        policy_id: decision.policy_id,
        policy_version: decision.policy_version,
        decision_mode: decision.decision_mode,
        issued_at: decision.created_at,
        outcome: 'PENDING',
        message: decision.message,
        actor: decision.selected_by,
        override_reason: decision.rejected_reason,
        reason_codes: decision.reason_codes,
        evidence_refs: decision.evidence_refs,
        is_simulated: provider.isSimulated,
      };

      auditEvents.push({
        event_type: 'action.rejected',
        action_id: decision.action_id,
        details: { reason: decision.rejected_reason },
      });

      return {
        action: rejectedAction,
        deduplicated: false,
        status: 'REJECTED',
        decision_to_dispatch_ms: 0,
        dispatch_to_delivery_ms: 0,
        total_latency_ms: Math.round(performance.now() - startOverall),
        audit_events: auditEvents,
      };
    }

    // 3. Deduplication Check
    const dedupeCheck = dedupeService.checkDuplicate({
      worker_id: decision.worker_id || 'UNKNOWN',
      action_type: decision.action_type,
      policy_version: decision.policy_version,
      current_risk_level: (decision.evidence_refs.current_risk_level as any) || 'WATCH',
      timestamp: decision.created_at,
      cooldown_minutes: decision.priority === 'EMERGENCY' ? 0 : 15,
    });

    if (dedupeCheck.is_duplicate) {
      const dedupeAction: Action = {
        action_id: decision.action_id,
        worker_id: decision.worker_id,
        site_id: decision.site_id,
        action_type: decision.action_type,
        priority: decision.priority,
        status: 'REJECTED',
        policy_id: decision.policy_id,
        policy_version: decision.policy_version,
        decision_mode: decision.decision_mode,
        issued_at: decision.created_at,
        outcome: 'PENDING',
        message: decision.message,
        actor: decision.selected_by,
        idempotency_key: dedupeCheck.idempotency_key,
        override_reason: dedupeCheck.reason,
        reason_codes: [...decision.reason_codes, 'DEDUPLICATED'],
        evidence_refs: decision.evidence_refs,
        is_simulated: provider.isSimulated,
      };

      auditEvents.push({
        event_type: 'action.deduplicated',
        action_id: decision.action_id,
        details: { reason: dedupeCheck.reason, idempotency_key: dedupeCheck.idempotency_key },
      });

      return {
        action: dedupeAction,
        deduplicated: true,
        status: 'REJECTED',
        decision_to_dispatch_ms: 0,
        dispatch_to_delivery_ms: 0,
        total_latency_ms: Math.round(performance.now() - startOverall),
        audit_events: auditEvents,
      };
    }

    // 4. State Machine Transition: PROPOSED -> POLICY_REVIEW -> APPROVED -> DISPATCHING
    ActionStateMachine.validateTransition(decision.action_id, 'PROPOSED', 'POLICY_REVIEW');
    ActionStateMachine.validateTransition(decision.action_id, 'POLICY_REVIEW', 'APPROVED');
    ActionStateMachine.validateTransition(decision.action_id, 'APPROVED', 'DISPATCHING');

    auditEvents.push({
      event_type: 'action.approved',
      action_id: decision.action_id,
      details: { policy_version: decision.policy_version },
    });

    const approvedAt = new Date().toISOString();
    const dispatchStart = performance.now();
    const decisionToDispatchMs = Math.round(dispatchStart - startOverall);

    auditEvents.push({
      event_type: 'action.dispatched',
      action_id: decision.action_id,
      details: { provider: provider.providerName, timestamp: approvedAt },
    });

    // 5. Dispatch Notification through Provider
    const deliveryResult: DeliveryResult = await provider.send({
      action_id: decision.action_id,
      worker_id: decision.worker_id,
      site_id: decision.site_id,
      recipient_ref: decision.worker_id || `SUPERVISOR_${decision.site_id}`,
      channel: options.customChannel || (provider.providerName === 'CONSOLE_ALERT' ? 'CONSOLE' : 'SMS_SIMULATED'),
      message: decision.message,
      priority: decision.priority,
      policy_version: decision.policy_version,
    });

    const dispatchToDeliveryMs = deliveryResult.latency_ms;

    // 6. Handle Delivery Outcome
    const actionDelivery: ActionDelivery = {
      delivery_id: deliveryResult.delivery_id,
      action_id: decision.action_id,
      provider: deliveryResult.provider,
      channel: deliveryResult.channel,
      recipient_ref: deliveryResult.recipient_ref,
      status: deliveryResult.status,
      attempt_count: 1,
      sent_at: deliveryResult.sent_at,
      delivered_at: deliveryResult.delivered_at,
      failed_at: deliveryResult.status === 'FAILED' ? new Date().toISOString() : undefined,
      failure_code: deliveryResult.failure_code,
      is_simulated: deliveryResult.is_simulated,
    };

    if (deliveryResult.status === 'FAILED') {
      ActionStateMachine.validateTransition(decision.action_id, 'DISPATCHING', 'DELIVERY_FAILED');

      const failedAction: Action = {
        action_id: decision.action_id,
        worker_id: decision.worker_id,
        site_id: decision.site_id,
        action_type: decision.action_type,
        priority: decision.priority,
        status: 'DELIVERY_FAILED',
        risk_state_id: decision.risk_state_id,
        prediction_id: decision.prediction_id,
        policy_id: decision.policy_id,
        policy_version: decision.policy_version,
        decision_mode: decision.decision_mode,
        issued_at: decision.created_at,
        approved_at: approvedAt,
        dispatched_at: deliveryResult.sent_at,
        outcome: 'FAILED',
        message: deliveryResult.message,
        recommended_rest_minutes: decision.recommended_rest_minutes,
        actor: decision.selected_by,
        idempotency_key: decision.idempotency_key,
        delivery_id: deliveryResult.delivery_id,
        delivery_status: 'FAILED',
        reason_codes: [...decision.reason_codes, 'DELIVERY_FAILED', deliveryResult.failure_code || 'PROVIDER_ERROR'],
        evidence_refs: decision.evidence_refs,
        is_simulated: deliveryResult.is_simulated,
      };

      auditEvents.push({
        event_type: 'action.delivery_failed',
        action_id: decision.action_id,
        details: { failure_code: deliveryResult.failure_code, delivery_id: deliveryResult.delivery_id },
      });

      return {
        action: failedAction,
        delivery: actionDelivery,
        deduplicated: false,
        status: 'DELIVERY_FAILED',
        decision_to_dispatch_ms: decisionToDispatchMs,
        dispatch_to_delivery_ms: dispatchToDeliveryMs,
        total_latency_ms: Math.round(performance.now() - startOverall),
        audit_events: auditEvents,
      };
    }

    // Delivery Succeeded -> Record Action Dispatched in Dedupe Tracker
    dedupeService.recordActionDispatched(
      decision.worker_id || 'UNKNOWN',
      decision.action_type,
      decision.priority === 'EMERGENCY' ? 0 : 15,
      approvedAt
    );

    // Delivery Succeeded
    ActionStateMachine.validateTransition(decision.action_id, 'DISPATCHING', 'DELIVERED');

    auditEvents.push({
      event_type: 'action.delivered',
      action_id: decision.action_id,
      details: { delivery_id: deliveryResult.delivery_id, is_simulated: deliveryResult.is_simulated },
    });

    let finalStatus: ActionStatus = 'COMPLETED';
    let ackDeadline: string | undefined;

    if (decision.requires_acknowledgement) {
      ActionStateMachine.validateTransition(decision.action_id, 'DELIVERED', 'ACK_PENDING');
      finalStatus = 'ACK_PENDING';
      const deadlineMins = decision.priority === 'EMERGENCY' ? 15 : 20;
      ackDeadline = new Date(Date.now() + deadlineMins * 60 * 1000).toISOString();

      auditEvents.push({
        event_type: 'action.ack_pending',
        action_id: decision.action_id,
        details: { ack_deadline: ackDeadline },
      });
    } else {
      ActionStateMachine.validateTransition(decision.action_id, 'DELIVERED', 'COMPLETED');
      auditEvents.push({
        event_type: 'action.completed',
        action_id: decision.action_id,
        details: { completed_at: new Date().toISOString() },
      });
    }

    const executedAction: Action = {
      action_id: decision.action_id,
      worker_id: decision.worker_id,
      site_id: decision.site_id,
      action_type: decision.action_type,
      priority: decision.priority,
      status: finalStatus,
      risk_state_id: decision.risk_state_id,
      prediction_id: decision.prediction_id,
      policy_id: decision.policy_id,
      policy_version: decision.policy_version,
      decision_mode: decision.decision_mode,
      issued_at: decision.created_at,
      approved_at: approvedAt,
      dispatched_at: deliveryResult.sent_at,
      delivered_at: deliveryResult.delivered_at,
      ack_deadline: ackDeadline,
      completed_at: finalStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
      outcome: finalStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      message: deliveryResult.message,
      recommended_rest_minutes: decision.recommended_rest_minutes,
      actor: decision.selected_by,
      idempotency_key: decision.idempotency_key,
      delivery_id: deliveryResult.delivery_id,
      delivery_status: 'DELIVERED',
      reason_codes: decision.reason_codes,
      evidence_refs: decision.evidence_refs,
      is_simulated: deliveryResult.is_simulated,
    };

    return {
      action: executedAction,
      delivery: actionDelivery,
      deduplicated: false,
      status: finalStatus,
      decision_to_dispatch_ms: decisionToDispatchMs,
      dispatch_to_delivery_ms: dispatchToDeliveryMs,
      total_latency_ms: Math.round(performance.now() - startOverall),
      audit_events: auditEvents,
    };
  }
}
