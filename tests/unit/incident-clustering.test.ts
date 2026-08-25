import { describe, it, expect } from 'vitest';
import { IncidentEngine } from '../../apps/api/src/services/incident-engine.js';
import { Worker, RiskState, PredictiveRiskState, Action } from '@sentinel/schemas';
import { DEFAULT_PHOENIX_POLICY } from '@sentinel/policy';

describe('IncidentEngine — Spatial Clustering & Factor Extraction', () => {
  const mockWorkers: Worker[] = [
    {
      worker_id: 'W-001',
      site_id: 'PHX-SITE-01',
      role: 'Laborer',
      shift_start: '06:00',
      shift_end: '14:30',
      task_intensity: 'HEAVY',
      channel: 'SMS_SIMULATED',
      consent_flags: { data_processing: true, notification_consent: true },
      risk_modifier: 'elevated',
      zone_id: 'ZONE-A',
    } as any,
    {
      worker_id: 'W-002',
      site_id: 'PHX-SITE-01',
      role: 'Carpenter',
      shift_start: '06:00',
      shift_end: '14:30',
      task_intensity: 'HEAVY',
      channel: 'SMS_SIMULATED',
      consent_flags: { data_processing: true, notification_consent: true },
      risk_modifier: 'baseline',
      zone_id: 'ZONE-A',
    } as any,
    {
      worker_id: 'W-003',
      site_id: 'PHX-SITE-01',
      role: 'Electrician',
      shift_start: '06:00',
      shift_end: '14:30',
      task_intensity: 'LIGHT',
      channel: 'SMS_SIMULATED',
      consent_flags: { data_processing: true, notification_consent: true },
      risk_modifier: 'baseline',
      zone_id: 'ZONE-B',
    } as any,
  ];

  it('detects a new spatial incident cluster when >= 2 workers in a zone reach ELEVATED/HIGH risk', () => {
    const currentRisks = new Map<string, RiskState>([
      [
        'W-001',
        {
          worker_id: 'W-001',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.78,
          level: 'HIGH',
          confidence: 0.92,
          reason_codes: ['EXTREME_AMBIENT_HEAT', 'HEAVY_WORKLOAD'],
          exposure_duration_mins: 150,
          data_freshness: 'FRESH',
        },
      ],
      [
        'W-002',
        {
          worker_id: 'W-002',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.65,
          level: 'ELEVATED',
          confidence: 0.88,
          reason_codes: ['ELEVATED_HEAT'],
          exposure_duration_mins: 130,
          data_freshness: 'FRESH',
        },
      ],
      [
        'W-003',
        {
          worker_id: 'W-003',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.15,
          level: 'GREEN',
          confidence: 0.95,
          reason_codes: ['BASELINE_NORMAL'],
          exposure_duration_mins: 30,
          data_freshness: 'FRESH',
        },
      ],
    ]);

    const predictions = new Map<string, PredictiveRiskState>();
    const actions: Action[] = [];

    const result = IncidentEngine.evaluateClustering({
      site_id: 'PHX-SITE-01',
      workers: mockWorkers,
      currentRisks,
      predictions,
      actions,
      existingIncidents: [],
      timestamp: new Date().toISOString(),
      policy: DEFAULT_PHOENIX_POLICY,
      options: { min_workers: 2 },
    });

    expect(result.created_incidents.length).toBe(1);
    const inc = result.created_incidents[0];
    expect(inc.zone_id).toBe('ZONE-A');
    expect(inc.severity).toBe('HIGH');
    expect(inc.affected_worker_count).toBe(2);
    expect(inc.worker_ids).toContain('W-001');
    expect(inc.worker_ids).toContain('W-002');
    expect(inc.common_factors).toContain('HIGH_TASK_INTENSITY');
    expect(inc.common_factors).toContain('LONG_EXPOSURE');
    expect(result.audit_events.length).toBe(1);
    expect(result.audit_events[0].event_type).toBe('incident.created');
  });

  it('updates existing incident instead of creating a duplicate if active incident exists in zone', () => {
    const existingInc = {
      incident_id: 'INC-001',
      site_id: 'PHX-SITE-01',
      zone_id: 'ZONE-A',
      severity: 'HIGH' as const,
      status: 'ACTIVE' as const,
      opened_at: '2026-08-25T10:00:00Z',
      affected_worker_count: 2,
      worker_ids: ['W-001', 'W-002'],
      summary: 'Existing cluster in ZONE-A',
      common_reason_codes: ['ELEVATED_HEAT'],
      common_factors: ['ZONE_CLUSTER'],
      owner: 'Supervisor',
    };

    const currentRisks = new Map<string, RiskState>([
      [
        'W-001',
        {
          worker_id: 'W-001',
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
        'W-002',
        {
          worker_id: 'W-002',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.70,
          level: 'ELEVATED',
          confidence: 0.88,
          reason_codes: ['ELEVATED_HEAT'],
          exposure_duration_mins: 140,
          data_freshness: 'FRESH',
        },
      ],
    ]);

    const result = IncidentEngine.evaluateClustering({
      site_id: 'PHX-SITE-01',
      workers: mockWorkers,
      currentRisks,
      predictions: new Map(),
      actions: [],
      existingIncidents: [existingInc as any],
      timestamp: new Date().toISOString(),
      policy: DEFAULT_PHOENIX_POLICY,
      options: { min_workers: 2 },
    });

    expect(result.created_incidents.length).toBe(0);
    expect(result.updated_incidents.length).toBe(1);
    expect(result.updated_incidents[0].severity).toBe('CRITICAL');
    expect(result.updated_incidents[0].incident_id).toBe('INC-001');
  });

  it('auto-resolves existing incident when all workers in the zone recover to safe levels', () => {
    const existingInc = {
      incident_id: 'INC-001',
      site_id: 'PHX-SITE-01',
      zone_id: 'ZONE-A',
      severity: 'HIGH' as const,
      status: 'ACTIVE' as const,
      opened_at: '2026-08-25T10:00:00Z',
      affected_worker_count: 2,
      worker_ids: ['W-001', 'W-002'],
      summary: 'Active cluster',
      common_reason_codes: ['ELEVATED_HEAT'],
      common_factors: ['ZONE_CLUSTER'],
      owner: 'Supervisor',
    };

    // All workers normalized to GREEN
    const currentRisks = new Map<string, RiskState>([
      [
        'W-001',
        {
          worker_id: 'W-001',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.12,
          level: 'GREEN',
          confidence: 0.95,
          reason_codes: ['BASELINE_NORMAL'],
          exposure_duration_mins: 15,
          data_freshness: 'FRESH',
        },
      ],
      [
        'W-002',
        {
          worker_id: 'W-002',
          site_id: 'PHX-SITE-01',
          timestamp: new Date().toISOString(),
          score: 0.14,
          level: 'GREEN',
          confidence: 0.95,
          reason_codes: ['BASELINE_NORMAL'],
          exposure_duration_mins: 15,
          data_freshness: 'FRESH',
        },
      ],
    ]);

    const result = IncidentEngine.evaluateClustering({
      site_id: 'PHX-SITE-01',
      workers: mockWorkers,
      currentRisks,
      predictions: new Map(),
      actions: [],
      existingIncidents: [existingInc as any],
      timestamp: new Date().toISOString(),
      policy: DEFAULT_PHOENIX_POLICY,
      options: { min_workers: 2 },
    });

    expect(result.resolved_incidents.length).toBe(1);
    expect(result.resolved_incidents[0].status).toBe('RESOLVED');
    expect(result.resolved_incidents[0].affected_worker_count).toBe(0);
    expect(result.resolved_incidents[0].resolution).toContain('Auto-resolved');
  });
});
