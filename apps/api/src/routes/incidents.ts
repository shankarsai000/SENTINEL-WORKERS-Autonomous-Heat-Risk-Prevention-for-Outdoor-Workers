import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';
import { SentinelOrchestrator } from '../services/orchestrator.js';
import { IncidentStateMachine } from '../services/incident-engine.js';
import { SupervisorRole, IncidentStatus } from '@sentinel/schemas';

export function createIncidentsRouter(orchestrator: SentinelOrchestrator, db: SentinelDatabase): Router {
  const router = Router();

  // Helper for simple role checking
  const getRole = (req: Request): SupervisorRole => {
    const roleHeader = req.headers['x-user-role'] as string | undefined;
    const bodyRole = req.body?.user_role as string | undefined;
    const role = (roleHeader || bodyRole || 'SUPERVISOR').toUpperCase();
    if (role === 'OPERATOR') return 'OPERATOR';
    if (role === 'VIEWER') return 'VIEWER';
    return 'SUPERVISOR';
  };

  const requireWriteRole = (req: Request, res: Response): boolean => {
    const role = getRole(req);
    if (role === 'VIEWER') {
      res.status(403).json({ error: 'Access Denied: Read-only VIEWER role cannot perform operational mutations.' });
      return false;
    }
    return true;
  };

  // 1. GET /api/incidents
  router.get('/incidents', (req: Request, res: Response) => {
    try {
      const siteId = req.query.site_id as string | undefined;
      const zoneId = req.query.zone_id as string | undefined;
      const status = req.query.status as string | undefined;
      const severity = req.query.severity as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const incidents = db.getIncidents({ site_id: siteId, zone_id: zoneId, status, severity, limit });
      res.json({
        count: incidents.length,
        incidents,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve incidents', details: err.message });
    }
  });

  // 2. GET /api/incidents/:id
  router.get('/incidents/:id', (req: Request, res: Response) => {
    try {
      const incidentId = String(req.params.id);
      const incident = db.getIncidentById(incidentId);
      if (!incident) {
        return res.status(404).json({ error: `Incident '${incidentId}' not found.` });
      }

      const timeline = db.getIncidentTimeline(incidentId, 50);
      const allWorkers = db.getWorkers(incident.site_id);
      const affectedWorkers = allWorkers.filter((w) => incident.worker_ids?.includes(w.worker_id));

      res.json({
        incident,
        timeline,
        affected_workers: affectedWorkers,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve incident details', details: err.message });
    }
  });

  // 3. POST /api/incidents/:id/ack
  router.post('/incidents/:id/ack', (req: Request, res: Response) => {
    try {
      if (!requireWriteRole(req, res)) return;
      const incidentId = String(req.params.id);
      const { actor = 'Supervisor', note } = req.body;

      const incident = db.getIncidentById(incidentId);
      if (!incident) {
        return res.status(404).json({ error: `Incident '${incidentId}' not found.` });
      }

      const targetStatus: IncidentStatus = incident.status === 'DETECTED' ? 'TRIAGED' : incident.status;
      if (incident.status === 'DETECTED') {
        IncidentStateMachine.validateTransition(incidentId, incident.status, 'TRIAGED');
      }

      const updated = db.updateIncidentStatus(incidentId, targetStatus, undefined, note, actor);
      if (!updated) {
        return res.status(400).json({ error: 'Failed to acknowledge incident' });
      }

      orchestrator.getAuditService()?.recordAuditEvent('INCIDENT_OPENED', incidentId, {
        action: 'INCIDENT_ACKNOWLEDGED',
        actor,
        status: targetStatus,
        note,
      });

      orchestrator.getWebSocketServer()?.broadcast('INCIDENT_EVENT', updated);

      res.json({
        status: 'success',
        incident: updated,
      });
    } catch (err: any) {
      res.status(400).json({ error: 'Incident acknowledgement failed', details: err.message });
    }
  });

  // 4. POST /api/incidents/:id/assign
  router.post('/incidents/:id/assign', (req: Request, res: Response) => {
    try {
      if (!requireWriteRole(req, res)) return;
      const incidentId = String(req.params.id);
      const { owner, assigned_by = 'Supervisor' } = req.body;

      if (!owner || !owner.trim()) {
        return res.status(400).json({ error: 'Owner identity is required for incident assignment.' });
      }

      const incident = db.getIncidentById(incidentId);
      if (!incident) {
        return res.status(404).json({ error: `Incident '${incidentId}' not found.` });
      }

      const updated = db.updateIncidentStatus(incidentId, incident.status, undefined, undefined, owner.trim());
      if (!updated) {
        return res.status(400).json({ error: 'Failed to assign incident' });
      }

      orchestrator.getAuditService()?.recordAuditEvent('INCIDENT_OPENED', incidentId, {
        action: 'INCIDENT_ASSIGNED',
        assigned_to: owner,
        assigned_by,
        previous_owner: incident.owner,
      });

      orchestrator.getWebSocketServer()?.broadcast('INCIDENT_EVENT', updated);

      res.json({
        status: 'success',
        incident: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Incident assignment failed', details: err.message });
    }
  });

  // 5. POST /api/incidents/:id/mitigate
  router.post('/incidents/:id/mitigate', (req: Request, res: Response) => {
    try {
      if (!requireWriteRole(req, res)) return;
      const incidentId = String(req.params.id);
      const { actor = 'Supervisor', mitigation_note = 'Mitigation protocols initiated' } = req.body;

      const incident = db.getIncidentById(incidentId);
      if (!incident) {
        return res.status(404).json({ error: `Incident '${incidentId}' not found.` });
      }

      IncidentStateMachine.validateTransition(incidentId, incident.status, 'MITIGATING');

      const updated = db.updateIncidentStatus(incidentId, 'MITIGATING', undefined, mitigation_note, actor);
      if (!updated) {
        return res.status(400).json({ error: 'Failed to update mitigation status' });
      }

      orchestrator.getAuditService()?.recordAuditEvent('INCIDENT_OPENED', incidentId, {
        action: 'MITIGATION_STARTED',
        actor,
        note: mitigation_note,
      });

      orchestrator.getWebSocketServer()?.broadcast('INCIDENT_EVENT', updated);

      res.json({
        status: 'success',
        incident: updated,
      });
    } catch (err: any) {
      res.status(400).json({ error: 'Mitigation trigger failed', details: err.message });
    }
  });

  // 6. POST /api/incidents/:id/escalate
  router.post('/incidents/:id/escalate', (req: Request, res: Response) => {
    try {
      if (!requireWriteRole(req, res)) return;
      const incidentId = String(req.params.id);
      const { actor = 'Supervisor', reason, target_severity = 'CRITICAL' } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Escalation requires a mandatory justification reason.' });
      }

      const incident = db.getIncidentById(incidentId);
      if (!incident) {
        return res.status(404).json({ error: `Incident '${incidentId}' not found.` });
      }

      const updated = {
        ...incident,
        severity: target_severity,
        updated_at: new Date().toISOString(),
        summary: `${incident.summary} [ESCALATED: ${reason}]`,
      };
      db.saveIncident(updated);

      orchestrator.getAuditService()?.recordAuditEvent('INCIDENT_ESCALATED', incidentId, {
        action: 'INCIDENT_MANUAL_ESCALATION',
        actor,
        reason,
        previous_severity: incident.severity,
        new_severity: target_severity,
      });

      orchestrator.getWebSocketServer()?.broadcast('INCIDENT_EVENT', updated);

      res.json({
        status: 'success',
        incident: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Incident escalation failed', details: err.message });
    }
  });

  // 7. POST /api/incidents/:id/resolve
  router.post('/api/incidents/:id/resolve', (req: Request, res: Response) => {
    // Forward to handler
  });

  router.post('/incidents/:id/resolve', (req: Request, res: Response) => {
    try {
      const role = getRole(req);
      if (role !== 'SUPERVISOR') {
        return res.status(403).json({ error: 'Access Denied: Only SUPERVISOR role can resolve incidents.' });
      }

      const incidentId = String(req.params.id);
      const { actor = 'Supervisor', resolution, note } = req.body;

      if (!resolution || !resolution.trim()) {
        return res.status(400).json({ error: 'Resolution explanation is required to resolve an incident.' });
      }

      const incident = db.getIncidentById(incidentId);
      if (!incident) {
        return res.status(404).json({ error: `Incident '${incidentId}' not found.` });
      }

      IncidentStateMachine.validateTransition(incidentId, incident.status, 'RESOLVED');

      const updated = db.updateIncidentStatus(incidentId, 'RESOLVED', resolution.trim(), note, actor);
      if (!updated) {
        return res.status(400).json({ error: 'Failed to resolve incident' });
      }

      orchestrator.getAuditService()?.recordAuditEvent('INCIDENT_RESOLVED', incidentId, {
        action: 'INCIDENT_RESOLVED',
        actor,
        resolution,
        note,
      });

      orchestrator.getWebSocketServer()?.broadcast('INCIDENT_EVENT', updated);

      res.json({
        status: 'success',
        incident: updated,
      });
    } catch (err: any) {
      res.status(400).json({ error: 'Incident resolution failed', details: err.message });
    }
  });

  // 8. GET /api/incidents/:id/audit
  router.get('/incidents/:id/audit', (req: Request, res: Response) => {
    try {
      const incidentId = String(req.params.id);
      const incident = db.getIncidentById(incidentId);
      if (!incident) {
        return res.status(404).json({ error: `Incident '${incidentId}' not found.` });
      }

      const auditEvents = orchestrator
        .getAuditService()
        ?.getRecentAuditEvents(100)
        .filter((e: any) => e.payload_ref === incidentId || incident.worker_ids?.includes(e.payload_ref)) || [];

      res.json({
        incident_id: incidentId,
        incident,
        audit_events: auditEvents,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve incident audit trail', details: err.message });
    }
  });

  return router;
}
