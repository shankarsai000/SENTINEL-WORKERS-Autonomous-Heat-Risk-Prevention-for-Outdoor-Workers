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
  | 'SHADE_RECOMMENDATION'
  | 'RECOVERY_BREAK'
  | 'RELOCATE_TO_COOLING'
  | 'MODIFY_WORK'
  | 'STOP_WORK'
  | 'SUPERVISOR_REVIEW'
  | 'SUPERVISOR_ACK_REQUIRED'
  | 'ESCALATE'
  | 'EMERGENCY_PROTECTIVE_ACTION'
  | 'SHADED_BREAK'
  | 'MANDATORY_REST'
  | 'RELOCATE'
  | 'SUPERVISOR_ALERT'
  | 'EMERGENCY_ESCALATION';

export type ActionStatus =
  | 'PROPOSED'
  | 'POLICY_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPATCHING'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'ACK_PENDING'
  | 'ACKNOWLEDGED'
  | 'OVERRIDDEN'
  | 'EXPIRED'
  | 'ESCALATED'
  | 'COMPLETED';

export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';

export type ActionOutcome =
  | 'PENDING'
  | 'DELIVERED_SIMULATED'
  | 'ACKNOWLEDGED'
  | 'OVERRIDDEN'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'FAILED'
  | 'ESCALATED';


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
  provenance?: any;
}

export type DataFreshness = 'FRESH' | 'AGING' | 'STALE';

export interface RiskExplanationReason {
  code: string;
  message: string;
}

export interface RiskExplanation {
  summary: string;
  reasons: RiskExplanationReason[];
}

export interface WorkerRiskContext {
  worker_id: string;
  site_id: string;
  role: WorkerRole;
  task_intensity: TaskIntensity;
  shift_start: string; // ISO 8601 string (UTC)
  shift_end: string;   // ISO 8601 string (UTC)
  exposure_duration_minutes: number;
  recent_recovery_minutes: number | null;
  risk_modifier: RiskModifier;
  channel: CommunicationChannel;
  active: boolean;
}

export interface SiteRiskContext {
  site_id: string;
  zone_id: string;
  worker_count: number;
  active_worker_count: number;
  cooling_resources: CoolingResources;
  emergency_policy_id: string;
}

export interface DerivedEnvironmentFeatures {
  current_temperature: number;
  current_apparent_temperature?: number;
  current_wet_bulb?: number;
  humidity?: number;
  solar_irradiance?: number;
  temperature_delta_10m?: number;
  temperature_delta_30m?: number;
  trend_direction: 'RISING' | 'FALLING' | 'STABLE' | 'UNKNOWN';
  observation_age_seconds: number;
  data_quality: DataFreshness;
}

export interface ZoneClusterContext {
  zone_id: string;
  active_workers_in_zone: number;
  elevated_workers_in_zone: number;
  high_workers_in_zone: number;
  critical_workers_in_zone: number;
  cluster_density: number; // 0.0 - 1.0
}

export interface RiskState {
  worker_id: string;
  site_id: string;
  timestamp: string; // ISO 8601 string
  score: number; // 0.0 - 1.0
  level: RiskLevel;
  confidence: number; // 0.0 - 1.0
  policy_id?: string;
  policy_version?: string;
  reason_codes: string[];
  explanation?: RiskExplanation;
  environment_score?: number;
  exposure_score?: number;
  task_score?: number;
  zone_score?: number;
  worker_modifier_score?: number;
  recovery_score?: number;
  data_freshness?: DataFreshness;
  missing_features?: string[];
  guardrail_flags?: string[];
  action_eligibility?: string[];
  escalation_required?: boolean;
  source_observation_ids?: string[];
  forecast_breach_time?: string;
  exposure_duration_mins: number;
}

export interface ActionDecision {
  action_id: string;
  worker_id?: string;
  site_id: string;
  created_at: string;
  risk_state_id?: string;
  prediction_id?: string;
  action_type: ActionType;
  priority: ActionPriority;
  reason_codes: string[];
  evidence_refs: Record<string, unknown>;
  policy_id: string;
  policy_version: string;
  selected_by: 'AUTONOMOUS_POLICY_PLANNER' | 'SUPERVISOR_DIRECT' | 'EMERGENCY_GUARDRAIL';
  decision_mode: 'AUTONOMOUS' | 'SUPERVISOR_REQUIRED' | 'EMERGENCY_AUTO';
  confidence: number;
  requires_acknowledgement: boolean;
  ack_deadline?: string;
  allowed: boolean;
  rejected_reason?: string;
  idempotency_key: string;
  message: string;
  recommended_rest_minutes?: number;
}

export interface ActionDelivery {
  delivery_id: string;
  action_id: string;
  provider: 'SIMULATED_SMS' | 'TWILIO_SMS' | 'CONSOLE_ALERT';
  channel: CommunicationChannel;
  recipient_ref: string;
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'FAILED';
  attempt_count: number;
  sent_at: string;
  delivered_at?: string;
  failed_at?: string;
  failure_code?: string;
  is_simulated: boolean;
}

export interface ActionAcknowledgement {
  ack_id: string;
  action_id: string;
  actor_type: 'WORKER' | 'SUPERVISOR' | 'SYSTEM_OVERRIDE';
  actor_ref: string;
  acknowledged_at: string;
  source: 'SMS_REPLY' | 'CONSOLE_BUTTON' | 'SIMULATED_API' | 'RADIO';
  note?: string;
}

export interface EscalationDecision {
  escalation_id: string;
  worker_id?: string;
  site_id: string;
  action_id: string;
  severity: IncidentSeverity;
  reason_codes: string[];
  policy_id: string;
  policy_version: string;
  created_at: string;
  status: 'PENDING' | 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
  escalated_to?: string;
  resolution_note?: string;
}

export interface Action {
  action_id: string;
  worker_id?: string;
  site_id: string;
  action_type: ActionType;
  priority?: ActionPriority;
  status?: ActionStatus;
  risk_state_id?: string;
  prediction_id?: string;
  policy_id?: string;
  policy_version: string;
  decision_mode?: 'AUTONOMOUS' | 'SUPERVISOR_REQUIRED' | 'EMERGENCY_AUTO';
  issued_at: string;
  approved_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  ack_deadline?: string;
  acknowledged_at?: string;
  completed_at?: string;
  outcome?: ActionOutcome;
  message: string;
  recommended_rest_minutes?: number;
  actor: string;
  override_by?: string;
  override_at?: string;
  override_reason?: string;
  idempotency_key?: string;
  delivery_id?: string;
  delivery_status?: string;
  reason_codes?: string[];
  evidence_refs?: Record<string, unknown>;
  is_simulated?: boolean;
}

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'DETECTED'
  | 'TRIAGED'
  | 'ACTIVE'
  | 'MITIGATING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'OPEN'
  | 'INVESTIGATING';

export interface IncidentActionSummary {
  proposed: number;
  approved: number;
  delivered: number;
  acknowledged: number;
  pending: number;
  failed: number;
  escalated: number;
  completed: number;
}

export interface Incident {
  incident_id: string;
  zone_id: string;
  site_id: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  opened_at: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  affected_worker_count: number;
  worker_ids: string[];
  workers_affected?: string[];
  summary: string;
  common_reason_codes: string[];
  common_factors: string[];
  thermal_context?: Record<string, unknown>;
  prediction_context?: Record<string, unknown>;
  action_summary?: IncidentActionSummary;
  owner: string;
  policy_id?: string;
  policy_version?: string;
  confidence?: number;
  uncertainty?: string[];
  resolution?: string;
  resolution_note?: string;
}

export type SupervisorRole = 'SUPERVISOR' | 'OPERATOR' | 'VIEWER';

export interface PriorityWorkerItem {
  worker_id: string;
  site_id: string;
  zone_id: string;
  role: WorkerRole;
  task_intensity: TaskIntensity;
  current_risk_level: RiskLevel;
  current_risk_score: number;
  predicted_risk_level: RiskLevel | 'STABLE';
  predicted_risk_score: number;
  threshold_eta_mins: number | null;
  confidence: number;
  data_freshness: 'FRESH' | 'AGING' | 'STALE';
  exposure_duration_mins: number;
  primary_reason: string;
  priority_score: number;
  priority_rank: number;
  priority_reason: string;
  action_status: ActionStatus | 'NO_ACTION';
  ack_status: 'ACK_PENDING' | 'ACKNOWLEDGED' | 'ESCALATED' | 'NONE';
  active_incident_id?: string;
}

export interface OperationsSummary {
  active_workers: number;
  green_count: number;
  watch_count: number;
  elevated_count: number;
  high_count: number;
  critical_count: number;
  predicted_deterioration_count: number;
  pending_ack_count: number;
  active_incidents: number;
  escalated_incidents: number;
  stale_data_count: number;
  fortyguard_status: 'CONNECTED' | 'DISABLED' | 'DEGRADED';
  risk_engine_status: 'HEALTHY' | 'DEGRADED';
  prediction_status: 'HEALTHY' | 'DEGRADED';
  action_engine_status: 'HEALTHY' | 'DEGRADED';
  system_status: 'ACTIVE' | 'DEGRADED' | 'OFFLINE';
  data_freshness: 'FRESH' | 'AGING' | 'STALE';
  last_updated: string;
}

export interface DecisionEvent {
  event_id: string;
  timestamp?: string;
  worker_id?: string;
  actor: string;
  input_refs: {
    observation_id?: string;
    worker_id?: string;
    risk_state_id?: string;
    policy_id?: string;
    site_id?: string;
  };
  risk_score?: number;
  risk_level?: RiskLevel;
  confidence?: number;
  reason_codes?: string[];
  policy_version?: string;
  guardrail_result?: string;
  decision: string;
  explanation: string;
}

export interface AuditEvent {
  event_id: string;
  event_type:
    | 'OBSERVATION_INGESTED'
    | 'RISK_EVALUATED'
    | 'ACTION_ISSUED'
    | 'ACTION_DEDUPLICATED'
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
  model_type: 'BASELINE_DETERMINISTIC' | 'LOGISTIC_REGRESSION' | 'EXPONENTIAL_SMOOTHING';
  feature_schema_version: string;
  training_data_ref: string;
  metrics: Record<string, number | string>;
  created_at?: string;
  deployed_at: string;
  status: 'ACTIVE' | 'CANDIDATE' | 'DEPRECATED';
}

export type PredictionStatus =
  | 'AVAILABLE'
  | 'INSUFFICIENT_DATA'
  | 'STALE_DATA'
  | 'LOW_CONFIDENCE'
  | 'MODEL_ERROR'
  | 'UNSUPPORTED_CONTEXT';

export type PredictionUncertaintyBand = 'LOW' | 'MEDIUM' | 'HIGH';

export type PredictiveState =
  | 'NO_PREDICTION'
  | 'STABLE'
  | 'DETERIORATING'
  | 'PREDICTED_ELEVATED'
  | 'PREDICTED_HIGH'
  | 'PREDICTED_CRITICAL';

export type PredictionSource =
  | 'PROVIDER_FORECAST'
  | 'TREND_EXTRAPOLATION'
  | 'HISTORICAL_REPLAY';

export interface PredictiveRiskState {
  prediction_id: string;
  worker_id: string;
  site_id: string;
  timestamp: string;

  // Current P2 Baseline State
  current_risk_level: RiskLevel;
  current_risk_score: number;

  // Probability Horizons
  p_elevated_30m: number | null;
  p_critical_60m: number | null;

  // Threshold ETA
  expected_time_to_threshold_minutes: number | null;

  // Predicted State & Trajectory
  predicted_risk_level: RiskLevel;
  predictive_state: PredictiveState;

  // Confidence & Uncertainty
  prediction_confidence: number; // 0.0 - 1.0
  uncertainty_band: PredictionUncertaintyBand;
  prediction_status: PredictionStatus;
  prediction_source: PredictionSource;

  // Operational Early Warning Flag
  early_warning: boolean;

  // Explainability
  predictive_reason_codes: string[];
  feature_contributions: Record<string, number>;
  feature_snapshot_id?: string;

  // Provenance & Audit
  model_id: string;
  model_version: string;
  source_risk_state_id?: string;
  source_observation_ids: string[];
  policy_id: string;
  policy_version: string;
}

export interface PredictionEvent {
  event_id: string;
  timestamp: string;
  worker_id: string;
  site_id: string;
  event_type:
    | 'prediction.calculated'
    | 'prediction.updated'
    | 'prediction.early_warning'
    | 'prediction.unavailable'
    | 'prediction.model_error'
    | 'prediction.threshold_eta_changed';
  prediction_status: PredictionStatus;
  predicted_level: RiskLevel;
  p_elevated_30m: number | null;
  p_critical_60m: number | null;
  expected_time_to_threshold_minutes: number | null;
  early_warning: boolean;
  model_id: string;
  model_version: string;
  feature_snapshot_id?: string;
  reason_codes: string[];
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
