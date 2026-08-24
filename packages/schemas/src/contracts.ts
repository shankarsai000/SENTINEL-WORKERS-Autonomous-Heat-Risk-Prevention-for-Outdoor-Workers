/**
 * Sentinel Workers - Shared Versioned Data Contracts
 * Master Build Reference v2.0
 */

export type WorkerRole = 'Laborer' | 'Carpenter' | 'Electrician' | 'Welder' | 'Supervisor';

export type TaskIntensity = 'LIGHT' | 'MODERATE' | 'HEAVY';

export type RiskModifier = 'baseline' | 'elevated' | 'acclimatizing';

export type CommunicationChannel = 'SMS_SIMULATED' | 'CONSOLE' | 'RADIO_SIMULATED';

export type RiskLevel = 'GREEN' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export type ActionType =
  | 'MONITOR'
  | 'HYDRATION_REMINDER'
  | 'SHADED_BREAK'
  | 'MANDATORY_REST'
  | 'RELOCATE'
  | 'STOP_WORK'
  | 'SUPERVISOR_ALERT'
  | 'EMERGENCY_ESCALATION';

export type ActionOutcome =
  | 'PENDING'
  | 'DELIVERED_SIMULATED'
  | 'ACKNOWLEDGED'
  | 'OVERRIDDEN'
  | 'EXPIRED';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ObservationSource = 'simulation' | 'fortyguard' | 'fortyguard_cache' | 'sensor_fallback';

export interface ConsentFlags {
  data_processing: boolean;
  notification_consent: boolean;
}

export interface CoolingResources {
  shade_stations: number;
  water_points: number;
  misting_fans: number;
  ac_trailers: number;
}

export interface Worker {
  worker_id: string;
  site_id: string;
  role: WorkerRole;
  shift_start: string; // e.g. "06:00"
  shift_end: string;   // e.g. "14:30"
  task_intensity: TaskIntensity;
  channel: CommunicationChannel;
  consent_flags: ConsentFlags;
  risk_modifier: RiskModifier;
}

export interface Site {
  site_id: string;
  name: string;
  latitude: number;
  longitude: number;
  zone_id: string;
  worker_count: number;
  cooling_resources: CoolingResources;
  emergency_policy_id: string;
}

export interface ThermalObservation {
  observation_id: string;
  site_id: string;
  timestamp: string; // ISO 8601 string
  temperature_c: number;
  humidity_pct: number;
  wet_bulb_c: number;
  apparent_temperature_c?: number;
  solar_irradiance: number; // W/m^2
  source: ObservationSource;
  freshness_seconds: number;
  confidence: number; // 0.0 - 1.0
  activity_id?: string;
}

export interface RiskState {
  worker_id: string;
  site_id: string;
  timestamp: string;
  score: number; // 0.0 - 1.0
  level: RiskLevel;
  confidence: number;
  reason_codes: string[];
  forecast_breach_time?: string;
  exposure_duration_mins: number;
}

export interface Action {
  action_id: string;
  worker_id?: string;
  site_id: string;
  action_type: ActionType;
  policy_version: string;
  issued_at: string;
  delivered_at?: string;
  acknowledged_at?: string;
  outcome?: ActionOutcome;
  message: string;
  recommended_rest_minutes?: number;
  actor: string;
  override_reason?: string;
}

export interface Incident {
  incident_id: string;
  zone_id: string;
  site_id: string;
  severity: IncidentSeverity;
  opened_at: string;
  workers_affected: string[];
  owner: string;
  closed_at?: string;
  resolution?: string;
  summary: string;
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'CLOSED';
}

export interface DecisionEvent {
  event_id: string;
  actor: string;
  input_refs: {
    observation_id?: string;
    worker_id?: string;
    risk_state_id?: string;
    policy_id?: string;
    site_id?: string;
  };
  decision: string;
  explanation: string;
  policy_version: string;
  timestamp: string;
}

export interface AuditEvent {
  event_id: string;
  event_type:
    | 'OBSERVATION_INGESTED'
    | 'RISK_EVALUATED'
    | 'ACTION_ISSUED'
    | 'ACTION_ACKNOWLEDGED'
    | 'ACTION_OVERRIDDEN'
    | 'INCIDENT_OPENED'
    | 'INCIDENT_ESCALATED'
    | 'INCIDENT_RESOLVED'
    | 'SIMULATION_STATE_CHANGED';
  payload_hash: string;
  payload_ref: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ModelVersion {
  model_id: string;
  version: string;
  metrics: Record<string, number | string>;
  training_data_ref: string;
  deployed_at: string;
}

export interface APIUsage {
  id?: string;
  provider: string;
  endpoint: string;
  activity_id?: string;
  credits_estimate: number;
  status: string;
  timestamp: string;
}

export interface SimulationState {
  running: boolean;
  paused: boolean;
  scenario_id: string;
  current_tick: number;
  total_ticks: number;
  simulated_time: string;
  speed_multiplier: number;
  current_temp_c: number;
  current_humidity_pct: number;
  active_workers: number;
}
