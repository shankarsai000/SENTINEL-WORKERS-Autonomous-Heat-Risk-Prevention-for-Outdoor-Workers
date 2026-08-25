import { describe, it, expect } from 'vitest';
import { PriorityEngine } from '../../apps/api/src/services/priority-engine.js';
import { Worker, RiskState, PredictiveRiskState, Action } from '@sentinel/schemas';

describe('PriorityEngine — Deterministic Priority Ranking & Reasons', () => {
  const mockWorkers: Worker[] = [
    {
      worker_id: 'W-CRITICAL',
      site_id: 'PHX-SITE-01',
      role: 'Laborer',
      shift_start: '06:00',
      shift_end: '14:30',
      task_intensity: 'HEAVY',
      channel: 'SMS_SIMULATED',
      consent_flags: { data_processing: true, notification_consent: true },
      risk_modifier: 'elevated',
    },
    {
      worker_id: 'W-HIGH-PRED-CRIT',
      site_id: 'PHX-SITE-01',
      role: 'Welder',
      shift_start: '06:00',
      shift_end: '14:30',
      task_intensity: 'HEAVY',
      channel: 'SMS_SIMULATED',
      consent_flags: { data_processing: true, notification_consent: true },
      risk_modifier: 'baseline',
    },
    {
      worker_id: 'W-ELEVATED-ACK-PENDING',
      site_id: 'PHX-SITE-01',
      role: 'Carpenter',
      shift_start: '06:00',
      shift_end: '14:30',
      task_intensity: 'MODERATE',
      channel: 'SMS_SIMULATED',
      consent_flags: { data_processing: true, notification_consent: true },
      risk_modifier: 'baseline',
    },
    {
      worker_id: 'W-GREEN',
      site_id: 'PHX-SITE-01',
      role: 'Electrician',
      shift_start: '06:00',
      shift_end: '14:30',
      task_intensity: 'LIGHT',
      channel: 'SMS_SIMULATED',
      consent_flags: { data_processing: true, notification_consent: true },
      risk_modifier: 'baseline',
    },
  ];

  it('ranks workers strictly according to safety priority hierarchy', () => {
    const currentRisks = new Map<string, RiskState>([
      [
        'W-CRITICAL',
        {
          worker_id: 'W-CRITICAL',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.95,
          level: 'CRITICAL',
          confidence: 0.92,
          reason_codes: ['CRITICAL_CORE_TEMP_BURDEN'],
          exposure_duration_mins: 180,
          data_freshness: 'FRESH',
        },
      ],
      [
        'W-HIGH-PRED-CRIT',
        {
          worker_id: 'W-HIGH-PRED-CRIT',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.78,
          level: 'HIGH',
          confidence: 0.90,
          reason_codes: ['EXTREME_AMBIENT_HEAT'],
          exposure_duration_mins: 140,
          data_freshness: 'FRESH',
        },
      ],
      [
        'W-ELEVATED-ACK-PENDING',
        {
          worker_id: 'W-ELEVATED-ACK-PENDING',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.62,
          level: 'ELEVATED',
          confidence: 0.88,
          reason_codes: ['ELEVATED_HEAT'],
          exposure_duration_mins: 90,
          data_freshness: 'FRESH',
        },
      ],
      [
        'W-GREEN',
        {
          worker_id: 'W-GREEN',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.15,
          level: 'GREEN',
          confidence: 0.95,
          reason_codes: ['BASELINE_NORMAL'],
          exposure_duration_mins: 20,
          data_freshness: 'FRESH',
        },
      ],
    ]);

    const predictions = new Map<string, PredictiveRiskState>([
      [
        'W-HIGH-PRED-CRIT',
        {
          prediction_id: 'pred-1',
          worker_id: 'W-HIGH-PRED-CRIT',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          current_risk_level: 'HIGH',
          current_risk_score: 0.78,
          p_elevated_30m: 0.95,
          p_critical_60m: 0.85,
          expected_time_to_threshold_minutes: 18,
          predicted_risk_level: 'CRITICAL',
          predictive_state: 'CRITICAL_IMMINENT',
          prediction_confidence: 0.89,
          uncertainty_band: [0.75, 0.95],
          prediction_status: 'VALID',
          prediction_source: 'ml_logistic_regression',
          early_warning: true,
          predictive_reason_codes: ['RAPID_CORE_HEAT_ACCUMULATION'],
          feature_contributions: {},
          feature_snapshot_id: 'snap-1',
          model_id: 'logistic_risk_predictor',
          model_version: '1.0.0',
          source_risk_state_id: 'r-1',
          source_observation_ids: ['obs-1'],
        },
      ],
    ]);

    const recentActions = new Map<string, Action>([
      [
        'W-ELEVATED-ACK-PENDING',
        {
          action_id: 'act-1',
          worker_id: 'W-ELEVATED-ACK-PENDING',
          site_id: 'PHX-SITE-01',
          action_type: 'MANDATORY_REST',
          policy_version: '1.0.0',
          issued_at: new Date().toISOString(),
          status: 'ACK_PENDING',
          outcome: 'PENDING',
          message: 'Mandatory rest',
          actor: 'Sentinel-Autonomous',
        },
      ],
    ]);

    const ranked = PriorityEngine.rankWorkers({
      workers: mockWorkers,
      currentRisks,
      predictions,
      recentActions,
    });

    expect(ranked.length).toBe(4);

    // Rank 1: Critical current risk
    expect(ranked[0].worker_id).toBe('W-CRITICAL');
    expect(ranked[0].priority_rank).toBe(1);
    expect(ranked[0].priority_reason).toContain('CRITICAL CURRENT RISK');

    // Rank 2: High risk + predicted critical
    expect(ranked[1].worker_id).toBe('W-HIGH-PRED-CRIT');
    expect(ranked[1].priority_rank).toBe(2);
    expect(ranked[1].priority_reason).toContain('HIGH RISK + PREDICTED CRITICAL');

    // Rank 3: Elevated + Ack Pending
    expect(ranked[2].worker_id).toBe('W-ELEVATED-ACK-PENDING');
    expect(ranked[2].priority_rank).toBe(3);
    expect(ranked[2].priority_reason).toContain('ACK PENDING');

    // Rank 4: Green
    expect(ranked[3].worker_id).toBe('W-GREEN');
    expect(ranked[3].priority_rank).toBe(4);
    expect(ranked[3].priority_reason).toContain('BASELINE NORMAL');
  });
});
