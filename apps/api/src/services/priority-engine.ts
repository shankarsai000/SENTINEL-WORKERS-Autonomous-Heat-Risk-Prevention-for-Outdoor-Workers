import {
  Worker,
  RiskState,
  PredictiveRiskState,
  Action,
  PriorityWorkerItem,
} from '@sentinel/schemas';

export class PriorityEngine {
  /**
   * Computes deterministic priority ranking and human-readable priority reasons for workers.
   */
  public static rankWorkers(input: {
    workers: Worker[];
    currentRisks: Map<string, RiskState>;
    predictions: Map<string, PredictiveRiskState>;
    recentActions: Map<string, Action>;
    activeIncidentsByZone?: Map<string, string>;
  }): PriorityWorkerItem[] {
    const { workers, currentRisks, predictions, recentActions, activeIncidentsByZone } = input;

    const scoredItems: Array<{ item: PriorityWorkerItem; rawScore: number }> = [];

    for (const worker of workers) {
      const risk = currentRisks.get(worker.worker_id) || {
        worker_id: worker.worker_id,
        site_id: worker.site_id,
        timestamp: new Date().toISOString(),
        score: 0.15,
        level: 'GREEN' as const,
        confidence: 0.90,
        reason_codes: ['BASELINE_NORMAL'],
        exposure_duration_mins: 15,
        data_freshness: 'FRESH' as const,
      };

      const pred = predictions.get(worker.worker_id) || null;
      const action = recentActions.get(worker.worker_id) || null;
      const zoneId = (worker as any).zone_id || `ZONE-${worker.site_id}-A`;

      const { score, reason } = this.calculatePriorityScore(risk, pred, action);

      let ackStatus: 'ACK_PENDING' | 'ACKNOWLEDGED' | 'ESCALATED' | 'NONE' = 'NONE';
      if (action) {
        if (action.status === 'ACK_PENDING') ackStatus = 'ACK_PENDING';
        else if (action.status === 'ACKNOWLEDGED' || action.outcome === 'ACKNOWLEDGED') ackStatus = 'ACKNOWLEDGED';
        else if (action.status === 'ESCALATED' || action.outcome === 'ESCALATED') ackStatus = 'ESCALATED';
      }

      const primaryReason = risk.reason_codes?.[0] || 'NORMAL_LIMITS';

      const item: PriorityWorkerItem = {
        worker_id: worker.worker_id,
        site_id: worker.site_id,
        zone_id: zoneId,
        role: worker.role,
        task_intensity: worker.task_intensity,
        current_risk_level: risk.level,
        current_risk_score: risk.score,
        predicted_risk_level: pred?.predicted_risk_level || 'STABLE',
        predicted_risk_score: pred?.p_elevated_30m || 0,
        threshold_eta_mins: pred?.expected_time_to_threshold_minutes ?? null,
        confidence: risk.confidence,
        data_freshness: risk.data_freshness || 'FRESH',
        exposure_duration_mins: risk.exposure_duration_mins || 0,
        primary_reason: primaryReason,
        priority_score: Math.round(score),
        priority_rank: 1, // Will be set after sorting
        priority_reason: reason,
        action_status: action?.status || 'NO_ACTION',
        ack_status: ackStatus,
        active_incident_id: activeIncidentsByZone?.get(zoneId),
      };

      scoredItems.push({ item, rawScore: score });
    }

    // Sort descending by priority score
    scoredItems.sort((a, b) => b.rawScore - a.rawScore);

    // Assign 1-indexed ranks
    return scoredItems.map((entry, index) => ({
      ...entry.item,
      priority_rank: index + 1,
    }));
  }

  private static calculatePriorityScore(
    risk: RiskState,
    pred: PredictiveRiskState | null,
    action: Action | null
  ): { score: number; reason: string } {
    let baseScore = 100;
    let reason = 'BASELINE NORMAL';

    const level = risk.level;
    const isPredCritical = pred?.predicted_risk_level === 'CRITICAL' || (pred?.p_critical_60m ?? 0) >= 0.65;
    const isPredHigh = pred?.predicted_risk_level === 'HIGH' || Boolean(pred?.early_warning);
    const eta = pred?.expected_time_to_threshold_minutes;

    // 1. Current Risk Base Hierarchy
    if (level === 'CRITICAL') {
      baseScore = 1000;
      reason = 'CRITICAL CURRENT RISK';
    } else if (level === 'HIGH') {
      if (isPredCritical) {
        baseScore = 850;
        reason = eta ? `HIGH RISK + PREDICTED CRITICAL IN ${eta}M` : 'HIGH RISK + IMMINENT CRITICAL DETERIORATION';
      } else {
        baseScore = 750;
        reason = 'HIGH CURRENT RISK';
      }
    } else if (level === 'ELEVATED') {
      if (isPredCritical) {
        baseScore = 650;
        reason = eta ? `ELEVATED + PREDICTED CRITICAL IN ${eta}M` : 'ELEVATED + PREDICTED CRITICAL';
      } else if (isPredHigh) {
        baseScore = 550;
        reason = eta ? `PREDICTED HIGH IN ${eta}M (EARLY WARNING)` : 'PREDICTED HIGH SOON';
      } else {
        baseScore = 400;
        reason = `ELEVATED HEAT EXPOSURE (${risk.exposure_duration_mins}M)`;
      }
    } else if (level === 'WATCH') {
      if (isPredCritical || isPredHigh) {
        baseScore = 450;
        reason = eta ? `WATCH + PREDICTED DETERIORATION IN ${eta}M` : 'WATCH + PREDICTED RISE';
      } else {
        baseScore = 200;
        reason = 'WATCH MONITORING';
      }
    } else {
      // GREEN
      if (isPredHigh) {
        baseScore = 300;
        reason = 'PREDICTED ELEVATED (EARLY WARNING)';
      } else {
        baseScore = 100;
        reason = 'BASELINE NORMAL';
      }
    }

    // 2. Threshold ETA Modifier
    if (eta !== undefined && eta !== null && eta > 0 && eta <= 60) {
      const etaBonus = Math.max(0, 60 - eta) * 2;
      baseScore += etaBonus;
    }

    // 3. Action State Modifiers
    if (action) {
      if (action.status === 'ESCALATED' || action.outcome === 'ESCALATED') {
        baseScore += 120;
        reason += ' — ESCALATION ACTIVE';
      } else if (action.status === 'ACK_PENDING') {
        baseScore += 60;
        reason += ' — ACK PENDING';
      } else if (action.status === 'DELIVERY_FAILED') {
        baseScore += 80;
        reason += ' — DELIVERY FAILED';
      }
    }

    // 4. Exposure modifier
    if (risk.exposure_duration_mins > 120) {
      baseScore += Math.min(50, Math.floor((risk.exposure_duration_mins - 120) / 4));
    }

    // 5. Stale data penalty flag
    if (risk.data_freshness === 'STALE') {
      baseScore += 30; // Prioritize investigating stale data workers
    }

    return { score: baseScore, reason };
  }
}
