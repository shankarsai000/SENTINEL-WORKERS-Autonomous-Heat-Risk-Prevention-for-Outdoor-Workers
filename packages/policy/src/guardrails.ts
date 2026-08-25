import { LegacySafetyPolicy, DEFAULT_PHOENIX_POLICY } from './heat-policy.js';
import { ThermalObservation, RiskState, Action, Worker } from '@sentinel/schemas';

export interface GuardrailEvaluation {
  passed: boolean;
  enforcedAction?: Action;
  downgradeConfidence: boolean;
  confidencePenalty: number;
  warnings: string[];
  requiresSupervisorAttention: boolean;
}

export class PolicyGuardrails {
  private policy: LegacySafetyPolicy;

  constructor(policy: LegacySafetyPolicy = DEFAULT_PHOENIX_POLICY) {
    this.policy = policy;
  }

  /**
   * Evaluates input observation freshness and hard physical limits.
   */
  public evaluateObservation(obs: ThermalObservation): {
    isStale: boolean;
    confidence: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isStale = false;
    let confidence = obs.confidence;

    if (obs.freshness_seconds > this.policy.staleDataThresholdSeconds) {
      isStale = true;
      confidence = Math.max(0.2, confidence - 0.4);
      warnings.push(`DATA_STALE: Freshness is ${obs.freshness_seconds}s (limit: ${this.policy.staleDataThresholdSeconds}s)`);
    }

    if (obs.temperature_c > 55 || obs.temperature_c < -10) {
      warnings.push(`ANOMALOUS_TEMPERATURE: ${obs.temperature_c}°C is outside plausible bounds`);
      confidence = Math.min(confidence, 0.1);
    }

    return { isStale, confidence, warnings };
  }

  /**
   * Deterministic safety check for extreme conditions or emergency triggers.
   */
  public checkEmergencyConditions(
    worker: Worker,
    risk: RiskState,
    obs: ThermalObservation
  ): GuardrailEvaluation {
    const warnings: string[] = [];
    let requiresSupervisor = false;
    let downgrade = false;
    let penalty = 0.0;

    // Check data freshness
    if (obs.freshness_seconds > this.policy.staleDataThresholdSeconds) {
      downgrade = true;
      penalty = 0.3;
      warnings.push('Data stale: conservative evaluation active');
      requiresSupervisor = true;
    }

    // Hard emergency condition: temperature >= 45C or score >= 0.85
    if (obs.temperature_c >= 45.0 || risk.score >= 0.85 || risk.level === 'CRITICAL') {
      requiresSupervisor = true;
      const enforcedAction: Action = {
        action_id: `act_${Date.now()}_${worker.worker_id}`,
        worker_id: worker.worker_id,
        site_id: worker.site_id,
        action_type: 'STOP_WORK',
        policy_version: this.policy.version,
        issued_at: new Date().toISOString(),
        outcome: 'PENDING',
        message: `MANDATORY SAFETY HALT: Critical thermal risk detected (${obs.temperature_c}°C / Risk ${risk.score.toFixed(2)}). Move immediately to cooling trailer.`,
        recommended_rest_minutes: 60,
        actor: 'PolicyGuardrailEngine',
      };

      return {
        passed: false, // Indicates mandatory override by hard safety policy
        enforcedAction,
        downgradeConfidence: downgrade,
        confidencePenalty: penalty,
        warnings,
        requiresSupervisorAttention: true,
      };
    }

    return {
      passed: true,
      downgradeConfidence: downgrade,
      confidencePenalty: penalty,
      warnings,
      requiresSupervisorAttention: requiresSupervisor,
    };
  }

  /**
   * Checks if an action requires escalation due to lack of acknowledgement.
   */
  public checkEscalation(
    action: Action,
    currentIsoTime: string
  ): { shouldEscalate: boolean; reason?: string } {
    if (action.outcome === 'ACKNOWLEDGED' || action.outcome === 'OVERRIDDEN') {
      return { shouldEscalate: false };
    }

    const issuedAt = new Date(action.issued_at).getTime();
    const now = new Date(currentIsoTime).getTime();
    const elapsedMinutes = (now - issuedAt) / (1000 * 60);

    if (action.action_type === 'STOP_WORK' && elapsedMinutes > 5) {
      return {
        shouldEscalate: true,
        reason: `CRITICAL action unacknowledged after ${Math.round(elapsedMinutes)} minutes`,
      };
    }

    if (action.action_type === 'MANDATORY_REST' && elapsedMinutes > 10) {
      return {
        shouldEscalate: true,
        reason: `HIGH priority rest action unacknowledged after ${Math.round(elapsedMinutes)} minutes`,
      };
    }

    return { shouldEscalate: false };
  }
}
