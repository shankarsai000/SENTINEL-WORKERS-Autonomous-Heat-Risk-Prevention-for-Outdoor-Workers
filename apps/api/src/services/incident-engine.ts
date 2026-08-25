import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentActionSummary,
  RiskState,
  PredictiveRiskState,
  Worker,
  Action,
} from '@sentinel/schemas';
import { SafetyPolicy } from '@sentinel/policy';

export interface ClusteringOptions {
  min_workers?: number;
  time_window_mins?: number;
  min_risk_level?: 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

export class IncidentStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
    DETECTED: ['TRIAGED', 'ACTIVE', 'RESOLVED', 'OPEN', 'INVESTIGATING'],
    TRIAGED: ['ACTIVE', 'MITIGATING', 'RESOLVED'],
    ACTIVE: ['MITIGATING', 'RESOLVED', 'TRIAGED'],
    MITIGATING: ['RESOLVED', 'ACTIVE'],
    RESOLVED: ['CLOSED', 'ACTIVE'],
    CLOSED: ['ACTIVE'],
    OPEN: ['INVESTIGATING', 'CLOSED', 'ACTIVE', 'RESOLVED', 'TRIAGED'],
    INVESTIGATING: ['CLOSED', 'ACTIVE', 'RESOLVED', 'MITIGATING'],
  };

  public static canTransition(current: IncidentStatus, next: IncidentStatus): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  public static validateTransition(incidentId: string, current: IncidentStatus, next: IncidentStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid Incident state transition for '${incidentId}': Cannot transition from '${current}' to '${next}'.`);
    }
  }
}

export class IncidentEngine {
  /**
   * Evaluates spatial risk clusters and updates or creates incidents.
   */
  public static evaluateClustering(input: {
    site_id: string;
    workers: Worker[];
    currentRisks: Map<string, RiskState>;
    predictions: Map<string, PredictiveRiskState>;
    actions: Action[];
    existingIncidents: Incident[];
    timestamp: string;
    policy?: SafetyPolicy;
    options?: ClusteringOptions;
  }): {
    created_incidents: Incident[];
    updated_incidents: Incident[];
    resolved_incidents: Incident[];
    all_active_incidents: Incident[];
    audit_events: Array<{ event_type: string; incident_id: string; details: Record<string, unknown> }>;
  } {
    const {
      site_id,
      workers,
      currentRisks,
      predictions,
      actions,
      existingIncidents,
      timestamp,
      policy,
      options = {},
    } = input;

    const minWorkers = options.min_workers ?? 2;
    const created: Incident[] = [];
    const updated: Incident[] = [];
    const resolved: Incident[] = [];
    const auditEvents: Array<{ event_type: string; incident_id: string; details: Record<string, unknown> }> = [];

    // 1. Group workers by zone
    const workersByZone = new Map<string, Worker[]>();
    for (const worker of workers) {
      const zoneId = (worker as any).zone_id || `ZONE-${site_id}-A`;
      if (!workersByZone.has(zoneId)) {
        workersByZone.set(zoneId, []);
      }
      workersByZone.get(zoneId)!.push(worker);
    }

    // Active incidents index by zone
    const activeIncidentsByZone = new Map<string, Incident>();
    for (const inc of existingIncidents) {
      if (inc.status !== 'RESOLVED' && inc.status !== 'CLOSED') {
        activeIncidentsByZone.set(inc.zone_id, inc);
      }
    }

    // 2. Evaluate each zone
    for (const [zoneId, zoneWorkers] of workersByZone.entries()) {
      const affectedWorkers = zoneWorkers.filter((w) => {
        const risk = currentRisks.get(w.worker_id);
        const pred = predictions.get(w.worker_id);
        if (!risk) return false;
        const isHighOrCritical = risk.level === 'HIGH' || risk.level === 'CRITICAL';
        const isElevated = risk.level === 'ELEVATED';
        const isPredCritical = pred?.predicted_risk_level === 'CRITICAL' || Boolean(pred?.early_warning);
        return isHighOrCritical || isElevated || isPredCritical;
      });

      const existingIncident = activeIncidentsByZone.get(zoneId);

      if (affectedWorkers.length >= minWorkers) {
        // Derive common factors & severity
        const workerIds = affectedWorkers.map((w) => w.worker_id);
        const severity = this.deriveSeverity(affectedWorkers, currentRisks, predictions);
        const commonFactors = this.extractCommonFactors(affectedWorkers, currentRisks, predictions);
        const commonReasons = this.extractCommonReasons(affectedWorkers, currentRisks);
        const actionSummary = this.computeActionSummary(workerIds, actions);
        const confidence = this.computeAverageConfidence(affectedWorkers, currentRisks);

        if (existingIncident) {
          // Update existing incident
          const updatedInc: Incident = {
            ...existingIncident,
            updated_at: timestamp,
            severity,
            affected_worker_count: affectedWorkers.length,
            worker_ids: workerIds,
            workers_affected: workerIds,
            summary: `Heat stress cluster in ${zoneId} affecting ${affectedWorkers.length} workers (${severity} severity).`,
            common_factors: commonFactors,
            common_reason_codes: commonReasons,
            action_summary: actionSummary,
            confidence,
          };
          updated.push(updatedInc);
          auditEvents.push({
            event_type: 'incident.updated',
            incident_id: updatedInc.incident_id,
            details: {
              severity,
              affected_count: affectedWorkers.length,
              zone_id: zoneId,
              timestamp,
            },
          });
        } else {
          // Create new incident
          const incidentId = `INC-${Date.now().toString().slice(-4)}-${zoneId.slice(-1)}`;
          const newInc: Incident = {
            incident_id: incidentId,
            site_id,
            zone_id: zoneId,
            severity,
            status: 'ACTIVE',
            opened_at: timestamp,
            created_at: timestamp,
            updated_at: timestamp,
            affected_worker_count: affectedWorkers.length,
            worker_ids: workerIds,
            workers_affected: workerIds,
            summary: `Heat stress cluster detected in ${zoneId} with ${affectedWorkers.length} affected workers.`,
            common_factors: commonFactors,
            common_reason_codes: commonReasons,
            thermal_context: {
              zone_id: zoneId,
              worker_count: zoneWorkers.length,
            },
            prediction_context: {
              early_warning_count: affectedWorkers.filter((w) => predictions.get(w.worker_id)?.early_warning).length,
            },
            action_summary: actionSummary,
            owner: 'SUPERVISOR-UNASSIGNED',
            policy_id: policy?.policy_id || 'demo-construction-v1',
            policy_version: policy?.version || '1.0.0',
            confidence,
            uncertainty: affectedWorkers.some((w) => currentRisks.get(w.worker_id)?.data_freshness === 'STALE')
              ? ['DATA_STALE_IN_CLUSTER']
              : [],
          };
          created.push(newInc);
          auditEvents.push({
            event_type: 'incident.created',
            incident_id: newInc.incident_id,
            details: {
              severity,
              affected_count: affectedWorkers.length,
              zone_id: zoneId,
              timestamp,
            },
          });
        }
      } else if (existingIncident && affectedWorkers.length === 0) {
        // All workers recovered -> Auto-resolve incident
        const resolvedInc: Incident = {
          ...existingIncident,
          status: 'RESOLVED',
          updated_at: timestamp,
          closed_at: timestamp,
          affected_worker_count: 0,
          worker_ids: [],
          workers_affected: [],
          resolution: 'Auto-resolved: All workers in zone recovered to safe thermal margins.',
          resolution_note: 'Thermal loads and risk levels normalized below trigger thresholds.',
        };
        resolved.push(resolvedInc);
        auditEvents.push({
          event_type: 'incident.resolved',
          incident_id: resolvedInc.incident_id,
          details: {
            zone_id: zoneId,
            reason: 'WORKER_RISK_NORMALIZED',
            timestamp,
          },
        });
      }
    }

    // Build complete list of currently active incidents
    const allActive: Incident[] = [
      ...existingIncidents.filter((inc) => !updated.some((u) => u.incident_id === inc.incident_id) && !resolved.some((r) => r.incident_id === inc.incident_id) && inc.status !== 'RESOLVED' && inc.status !== 'CLOSED'),
      ...updated.filter((u) => u.status !== 'RESOLVED' && u.status !== 'CLOSED'),
      ...created,
    ];

    return {
      created_incidents: created,
      updated_incidents: updated,
      resolved_incidents: resolved,
      all_active_incidents: allActive,
      audit_events: auditEvents,
    };
  }

  private static deriveSeverity(
    workers: Worker[],
    risks: Map<string, RiskState>,
    predictions: Map<string, PredictiveRiskState>
  ): IncidentSeverity {
    let hasCritical = false;
    let hasHigh = false;

    for (const w of workers) {
      const r = risks.get(w.worker_id);
      const p = predictions.get(w.worker_id);
      if (r?.level === 'CRITICAL' || p?.predicted_risk_level === 'CRITICAL') {
        hasCritical = true;
        break;
      }
      if (r?.level === 'HIGH' || p?.predicted_risk_level === 'HIGH') {
        hasHigh = true;
      }
    }

    if (hasCritical) return 'CRITICAL';
    if (hasHigh) return 'HIGH';
    return 'ELEVATED';
  }

  private static extractCommonFactors(
    workers: Worker[],
    risks: Map<string, RiskState>,
    predictions: Map<string, PredictiveRiskState>
  ): string[] {
    const factors: string[] = ['ZONE_CLUSTER'];
    const total = workers.length || 1;

    let heavyCount = 0;
    let longExposureCount = 0;
    let earlyWarningCount = 0;

    for (const w of workers) {
      if (w.task_intensity === 'HEAVY' || w.task_intensity === 'MODERATE') heavyCount++;
      const r = risks.get(w.worker_id);
      if (r && r.exposure_duration_mins >= 120) longExposureCount++;
      const p = predictions.get(w.worker_id);
      if (p?.early_warning) earlyWarningCount++;
    }

    if (heavyCount / total >= 0.4) factors.push('HIGH_TASK_INTENSITY');
    if (longExposureCount / total >= 0.4) factors.push('LONG_EXPOSURE');
    if (earlyWarningCount / total >= 0.3) factors.push('RISING_THERMAL_TREND');

    return factors;
  }

  private static extractCommonReasons(workers: Worker[], risks: Map<string, RiskState>): string[] {
    const counts = new Map<string, number>();
    for (const w of workers) {
      const r = risks.get(w.worker_id);
      if (r?.reason_codes) {
        for (const code of r.reason_codes) {
          counts.set(code, (counts.get(code) || 0) + 1);
        }
      }
    }

    const threshold = Math.max(1, Math.floor(workers.length * 0.3));
    const common: string[] = [];
    for (const [code, count] of counts.entries()) {
      if (count >= threshold) {
        common.push(code);
      }
    }
    return common.length > 0 ? common : ['ELEVATED_HEAT'];
  }

  private static computeActionSummary(workerIds: string[], actions: Action[]): IncidentActionSummary {
    const relevant = actions.filter((a) => a.worker_id && workerIds.includes(a.worker_id));
    const summary: IncidentActionSummary = {
      proposed: 0,
      approved: 0,
      delivered: 0,
      acknowledged: 0,
      pending: 0,
      failed: 0,
      escalated: 0,
      completed: 0,
    };

    for (const a of relevant) {
      if (a.status === 'PROPOSED' || a.status === 'POLICY_REVIEW') summary.proposed++;
      else if (a.status === 'APPROVED' || a.status === 'DISPATCHING') summary.approved++;
      else if (a.status === 'DELIVERED') summary.delivered++;
      else if (a.status === 'ACK_PENDING') summary.pending++;
      else if (a.status === 'ACKNOWLEDGED' || a.outcome === 'ACKNOWLEDGED') summary.acknowledged++;
      else if (a.status === 'DELIVERY_FAILED' || a.outcome === 'FAILED') summary.failed++;
      else if (a.status === 'ESCALATED' || a.outcome === 'ESCALATED') summary.escalated++;
      else if (a.status === 'COMPLETED' || a.outcome === 'COMPLETED') summary.completed++;
    }

    return summary;
  }

  private static computeAverageConfidence(workers: Worker[], risks: Map<string, RiskState>): number {
    let sum = 0;
    let count = 0;
    for (const w of workers) {
      const r = risks.get(w.worker_id);
      if (r && typeof r.confidence === 'number') {
        sum += r.confidence;
        count++;
      }
    }
    return count > 0 ? Number((sum / count).toFixed(2)) : 0.85;
  }
}
