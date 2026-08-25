import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';
import { SentinelOrchestrator } from '../services/orchestrator.js';
import {
  ActionPlanner,
  PolicyGate,
  ActionExecutor,
  ActionAcknowledgementService,
} from '@sentinel/action-engine';
import { PolicyLoader } from '@sentinel/policy';
import { ActionDecision } from '@sentinel/schemas';
import { buildWorkerRiskContext, buildSiteRiskContext } from '@sentinel/risk-engine';

export function createActionsRouter(orchestrator: SentinelOrchestrator, db: SentinelDatabase): Router {
  const router = Router();
  const policy = PolicyLoader.getPolicy();
  const executor = new ActionExecutor();

  // 1. GET /api/actions
  router.get('/actions', (req: Request, res: Response) => {
    try {
      const workerId = req.query.worker_id as string | undefined;
      const siteId = req.query.site_id as string | undefined;
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const actions = db.getActions({ worker_id: workerId, site_id: siteId, status, limit });
      res.json({
        count: actions.length,
        actions,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve actions', details: err.message });
    }
  });

  // 2. GET /api/actions/:id
  router.get('/actions/:id', (req: Request, res: Response) => {
    try {
      const actionId = String(req.params.id);
      const action = db.getActionById(actionId);
      if (!action) {
        return res.status(404).json({ error: `Action '${actionId}' not found.` });
      }

      const deliveries = db.getDeliveriesForAction(actionId);
      const acknowledgements = db.getAcknowledgementsForAction(actionId);

      res.json({
        action,
        deliveries,
        acknowledgements,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve action details', details: err.message });
    }
  });

  // 3. POST /api/actions/:id/ack
  router.post('/actions/:id/ack', (req: Request, res: Response) => {
    try {
      const actionId = String(req.params.id);
      const { actor = 'Supervisor', actor_type = 'SUPERVISOR', actor_ref, source = 'CONSOLE_BUTTON', note } = req.body;

      const action = db.getActionById(actionId);
      if (!action) {
        return res.status(404).json({ error: `Action '${actionId}' not found.` });
      }

      // Process acknowledgement through ActionAcknowledgementService
      const ackResult = ActionAcknowledgementService.acknowledge({
        action,
        actor_type,
        actor_ref: actor_ref || actor,
        source,
        note,
      });

      // Persist state update & acknowledgement
      db.saveAction(ackResult.action);
      db.saveActionAcknowledgement(ackResult.acknowledgement);

      // Audit acknowledgement
      for (const ev of ackResult.audit_events) {
        orchestrator.getAuditService()?.recordAuditEvent(
          ev.event_type === 'action.acknowledged' ? 'ACTION_ACKNOWLEDGED' : 'ACTION_ISSUED',
          actionId,
          ev.details
        );
      }

      orchestrator.getWebSocketServer()?.broadcast('ACTION_EVENT', ackResult.action);

      res.json({
        status: 'success',
        action: ackResult.action,
        acknowledgement: ackResult.acknowledgement,
      });
    } catch (err: any) {
      res.status(400).json({ error: 'Acknowledgement failed', details: err.message });
    }
  });

  // 4. POST /api/actions/:id/override
  router.post('/actions/:id/override', (req: Request, res: Response) => {
    try {
      const actionId = String(req.params.id);
      const { actor = 'Supervisor', reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Override requires a mandatory non-empty justification reason.' });
      }

      const action = db.getActionById(actionId);
      if (!action) {
        return res.status(404).json({ error: `Action '${actionId}' not found.` });
      }

      // Enforce emergency safety dominance: Supervisor cannot override emergency stop work
      if (action.action_type === 'STOP_WORK' || action.action_type === 'EMERGENCY_PROTECTIVE_ACTION') {
        return res.status(403).json({
          error: 'Safety Invariant Violation: Deterministic emergency STOP_WORK rule cannot be disabled by supervisor override.',
        });
      }

      const updated = orchestrator.overrideAction(actionId, reason, actor);
      if (!updated) {
        return res.status(400).json({ error: 'Action could not be overridden.' });
      }

      res.json({
        status: 'OVERRIDDEN',
        action: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Override failed', details: err.message });
    }
  });

  // 5. POST /api/actions/:id/retry
  router.post('/actions/:id/retry', async (req: Request, res: Response) => {
    try {
      const actionId = String(req.params.id);
      const action = db.getActionById(actionId);
      if (!action) {
        return res.status(404).json({ error: `Action '${actionId}' not found.` });
      }

      if (action.status !== 'DELIVERY_FAILED') {
        return res.status(400).json({ error: `Action '${actionId}' is in status '${action.status}', not 'DELIVERY_FAILED'.` });
      }

      const decision: ActionDecision = {
        action_id: `act_retry_${Date.now()}_${action.worker_id}`,
        worker_id: action.worker_id,
        site_id: action.site_id,
        created_at: new Date().toISOString(),
        action_type: action.action_type,
        priority: action.priority || 'MEDIUM',
        reason_codes: [...(action.reason_codes || []), 'RETRY_ATTEMPT'],
        evidence_refs: action.evidence_refs || {},
        policy_id: action.policy_id || policy.policy_id,
        policy_version: action.policy_version,
        selected_by: 'SUPERVISOR_DIRECT',
        decision_mode: 'AUTONOMOUS',
        confidence: 0.9,
        requires_acknowledgement: Boolean(action.ack_deadline),
        allowed: true,
        idempotency_key: `retry_${actionId}_${Date.now()}`,
        message: action.message,
        recommended_rest_minutes: action.recommended_rest_minutes,
      };

      const result = await executor.execute({ decision });
      db.saveAction(result.action);
      if (result.delivery) db.saveActionDelivery(result.delivery);

      res.json({
        status: result.status,
        action: result.action,
        delivery: result.delivery,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Retry failed', details: err.message });
    }
  });

  // 6. GET /api/actions/:id/audit
  router.get('/actions/:id/audit', (req: Request, res: Response) => {
    try {
      const actionId = String(req.params.id);
      const action = db.getActionById(actionId);
      if (!action) {
        return res.status(404).json({ error: `Action '${actionId}' not found.` });
      }

      const deliveries = db.getDeliveriesForAction(actionId);
      const acknowledgements = db.getAcknowledgementsForAction(actionId);
      const auditEvents = orchestrator.getAuditService()?.getRecentAuditEvents(100).filter((e: any) => e.payload_ref === actionId) || [];

      res.json({
        action_id: actionId,
        action,
        deliveries,
        acknowledgements,
        audit_events: auditEvents,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Audit retrieval failed', details: err.message });
    }
  });

  // 7. GET /api/escalations
  router.get('/escalations', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const escalations = db.getEscalations(limit);
      res.json({
        count: escalations.length,
        escalations,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve escalations', details: err.message });
    }
  });

  // 8. POST /api/escalations/:id/ack
  router.post('/escalations/:id/ack', (req: Request, res: Response) => {
    try {
      const escalationId = String(req.params.id);
      const { note } = req.body;
      const updated = db.updateEscalation(escalationId, 'ACKNOWLEDGED', note);
      if (!updated) {
        return res.status(404).json({ error: `Escalation '${escalationId}' not found.` });
      }
      res.json({ status: 'ACKNOWLEDGED', escalation: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to acknowledge escalation', details: err.message });
    }
  });

  // 9. POST /api/escalations/:id/cancel
  router.post('/escalations/:id/cancel', (req: Request, res: Response) => {
    try {
      const escalationId = String(req.params.id);
      const { note } = req.body;
      const updated = db.updateEscalation(escalationId, 'CANCELLED', note);
      if (!updated) {
        return res.status(404).json({ error: `Escalation '${escalationId}' not found.` });
      }
      res.json({ status: 'CANCELLED', escalation: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to cancel escalation', details: err.message });
    }
  });

  // 10. POST /api/actions/preview (Dry-run without executing)
  router.post('/actions/preview', (req: Request, res: Response) => {
    try {
      const { worker_id, site_id = 'PHX-SITE-01' } = req.body;
      if (!worker_id) {
        return res.status(400).json({ error: 'worker_id is required for action preview.' });
      }

      const workers = db.getWorkers(site_id);
      const worker = workers.find((w) => w.worker_id === worker_id) || workers[0];
      const riskHistory = db.getWorkerRiskHistory(worker_id, 1);
      const predHistory = db.getWorkerPredictiveHistory(worker_id, 1);

      const currentRisk = riskHistory[0] || {
        worker_id,
        site_id,
        timestamp: new Date().toISOString(),
        score: 0.55,
        level: 'ELEVATED' as const,
        confidence: 0.90,
        reason_codes: ['ELEVATED_HEAT'],
        exposure_duration_mins: 180,
      };

      const predictedRisk = predHistory[0] || null;

      const workerCtx = buildWorkerRiskContext(worker, {
        currentTime: currentRisk.timestamp,
        isActive: true,
      });

      const sites = db.getSites();
      const site = sites.find((s) => s.site_id === site_id) || {
        site_id,
        name: 'Job Site',
        latitude: 33.4484,
        longitude: -112.074,
        zone_id: `ZONE-${site_id}`,
        worker_count: workers.length,
        cooling_resources: { shade_stations: 4, water_points: 6, misting_fans: 2, ac_trailers: 1 },
        emergency_policy_id: 'demo-construction-v1',
      };

      const siteCtx = buildSiteRiskContext(site, workers.length);

      const planResult = ActionPlanner.planActions({
        currentRisk,
        predictedRisk,
        workerCtx,
        siteCtx,
        policy,
      });

      const evaluatedCandidates = planResult.candidate_options.map((opt) => {
        const gate = PolicyGate.evaluate({
          candidate: opt,
          currentRisk,
          predictedRisk,
          workerCtx,
          siteCtx,
          policy,
        });

        return {
          action: opt.action_type,
          priority: opt.priority,
          allowed: gate.allowed,
          requires_acknowledgement: gate.requires_acknowledgement,
          decision_mode: gate.decision_mode,
          rejected_reason: gate.rejected_reason,
          reason_codes: opt.reason_codes,
          message: opt.message_template,
        };
      });

      res.json({
        worker_id,
        current_risk: currentRisk.level,
        predicted_risk: predictedRisk?.predicted_risk_level || 'STABLE',
        candidates: evaluatedCandidates,
        recommended_action: planResult.recommended_action.action_type,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Action preview failed', details: err.message });
    }
  });

  // 11. POST /api/actions/execute
  router.post('/actions/execute', async (req: Request, res: Response) => {
    try {
      const { worker_id, site_id = 'PHX-SITE-01', action_type, reason_override } = req.body;
      if (!worker_id || !action_type) {
        return res.status(400).json({ error: 'worker_id and action_type are required.' });
      }

      const workers = db.getWorkers(site_id);
      const worker = workers.find((w) => w.worker_id === worker_id) || workers[0];
      const riskHistory = db.getWorkerRiskHistory(worker_id, 1);
      const predHistory = db.getWorkerPredictiveHistory(worker_id, 1);

      const currentRisk = riskHistory[0] || {
        worker_id,
        site_id,
        timestamp: new Date().toISOString(),
        score: 0.55,
        level: 'ELEVATED' as const,
        confidence: 0.90,
        reason_codes: ['ELEVATED_HEAT'],
        exposure_duration_mins: 180,
      };

      const predictedRisk = predHistory[0] || null;

      const workerCtx = buildWorkerRiskContext(worker, {
        currentTime: currentRisk.timestamp,
        isActive: true,
      });

      const sites = db.getSites();
      const site = sites.find((s) => s.site_id === site_id) || {
        site_id,
        name: 'Job Site',
        latitude: 33.4484,
        longitude: -112.074,
        zone_id: `ZONE-${site_id}`,
        worker_count: workers.length,
        cooling_resources: { shade_stations: 4, water_points: 6, misting_fans: 2, ac_trailers: 1 },
        emergency_policy_id: 'demo-construction-v1',
      };

      const siteCtx = buildSiteRiskContext(site, workers.length);

      const plan = ActionPlanner.planActions({
        currentRisk,
        predictedRisk,
        workerCtx,
        siteCtx,
        policy,
      });

      const selectedOption = plan.candidate_options.find((o) => o.action_type === action_type) || plan.recommended_action;

      const gate = PolicyGate.evaluate({
        candidate: selectedOption,
        currentRisk,
        predictedRisk,
        workerCtx,
        siteCtx,
        policy,
      });

      const decision: ActionDecision = {
        action_id: `act_${Date.now()}_${worker_id}`,
        worker_id,
        site_id,
        created_at: new Date().toISOString(),
        risk_state_id: `${currentRisk.worker_id}_${currentRisk.timestamp}`,
        prediction_id: predictedRisk?.prediction_id,
        action_type: selectedOption.action_type,
        priority: selectedOption.priority,
        reason_codes: reason_override ? [reason_override] : selectedOption.reason_codes,
        evidence_refs: { current_risk: currentRisk.level, score: currentRisk.score },
        policy_id: policy.policy_id,
        policy_version: policy.version,
        selected_by: 'AUTONOMOUS_POLICY_PLANNER',
        decision_mode: gate.decision_mode,
        confidence: currentRisk.confidence,
        requires_acknowledgement: gate.requires_acknowledgement,
        allowed: gate.allowed,
        rejected_reason: gate.rejected_reason,
        idempotency_key: `manual_${worker_id}_${selectedOption.action_type}_${Date.now()}`,
        message: selectedOption.message_template,
        recommended_rest_minutes: selectedOption.recommended_rest_minutes,
      };

      const execResult = await executor.execute({ decision });

      db.saveAction(execResult.action);
      if (execResult.delivery) {
        db.saveActionDelivery(execResult.delivery);
      }

      orchestrator.getWebSocketServer()?.broadcast('ACTION_EVENT', execResult.action);

      res.json({
        action_id: execResult.action.action_id,
        status: execResult.status,
        channel: execResult.delivery?.channel || 'SMS_SIMULATED',
        delivery_id: execResult.delivery?.delivery_id,
        ack_required: execResult.action.status === 'ACK_PENDING',
        ack_deadline: execResult.action.ack_deadline,
        policy_version: execResult.action.policy_version,
        is_simulated: execResult.action.is_simulated,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Action execution failed', details: err.message });
    }
  });

  return router;
}
