export interface Site {
  site_id: string;
  name: string;
  latitude: number;
  longitude: number;
  zone_id: string;
  worker_count: number;
  cooling_resources: {
    shade_stations: number;
    water_points: number;
    misting_fans: number;
    ac_trailers: number;
  };
  emergency_policy_id: string;
}

export interface Worker {
  worker_id: string;
  site_id: string;
  role: 'Laborer' | 'Carpenter' | 'Electrician' | 'Welder' | 'Supervisor';
  shift_start: string;
  shift_end: string;
  task_intensity: 'LIGHT' | 'MODERATE' | 'HEAVY';
  channel: 'SMS_SIMULATED' | 'CONSOLE' | 'RADIO_SIMULATED';
  consent_flags: { data_processing: boolean; notification_consent: boolean };
  risk_modifier: 'baseline' | 'elevated' | 'acclimatizing';
}

export interface ThermalObservation {
  observation_id: string;
  site_id: string;
  timestamp: string;
  temperature_c: number;
  humidity_pct: number;
  wet_bulb_c: number;
  apparent_temperature_c?: number;
  solar_irradiance: number;
  source: 'simulation' | 'fortyguard' | 'fortyguard_cache' | 'sensor_fallback';
  freshness_seconds: number;
  confidence: number;
  activity_id?: string;
}

export interface RiskExplanationReason {
  code: string;
  message: string;
}

export interface RiskExplanation {
  summary: string;
  reasons: RiskExplanationReason[];
}

export interface RiskState {
  worker_id: string;
  site_id: string;
  timestamp: string;
  score: number;
  level: 'GREEN' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  confidence: number;
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
  data_freshness?: 'FRESH' | 'AGING' | 'STALE';
  missing_features?: string[];
  guardrail_flags?: string[];
  action_eligibility?: string[];
  escalation_required?: boolean;
  source_observation_ids?: string[];
  forecast_breach_time?: string;
  exposure_duration_mins: number;
  worker_metadata?: Worker;
}

export interface PredictiveRiskState {
  prediction_id: string;
  worker_id: string;
  site_id: string;
  timestamp: string;
  current_risk_level: 'GREEN' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  current_risk_score: number;
  p_elevated_30m: number | null;
  p_critical_60m: number | null;
  expected_time_to_threshold_minutes: number | null;
  predicted_risk_level: 'GREEN' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  predictive_state: 'NO_PREDICTION' | 'STABLE' | 'DETERIORATING' | 'PREDICTED_ELEVATED' | 'PREDICTED_HIGH' | 'PREDICTED_CRITICAL';
  prediction_confidence: number;
  uncertainty_band: 'LOW' | 'MEDIUM' | 'HIGH';
  prediction_status: 'AVAILABLE' | 'INSUFFICIENT_DATA' | 'STALE_DATA' | 'LOW_CONFIDENCE' | 'MODEL_ERROR' | 'UNSUPPORTED_CONTEXT';
  prediction_source: 'PROVIDER_FORECAST' | 'TREND_EXTRAPOLATION' | 'HISTORICAL_REPLAY';
  early_warning: boolean;
  predictive_reason_codes: string[];
  feature_contributions: Record<string, number>;
  feature_snapshot_id?: string;
  model_id: string;
  model_version: string;
  source_risk_state_id?: string;
  source_observation_ids: string[];
  policy_id: string;
  policy_version: string;
  worker_metadata?: Worker;
}

export interface PredictionSummary {
  total_predictions: number;
  available_predictions: number;
  early_warning_count: number;
  deteriorating_count: number;
  predicted_high_count: number;
  predicted_critical_count: number;
  average_confidence: number;
  timestamp: string;
}

export interface DecisionEvent {
  event_id: string;
  timestamp?: string;
  worker_id?: string;
  actor: string;
  input_refs: Record<string, string | undefined>;
  risk_score?: number;
  risk_level?: string;
  confidence?: number;
  reason_codes?: string[];
  policy_version?: string;
  guardrail_result?: string;
  decision: string;
  explanation: string;
}

export interface Action {
  action_id: string;
  worker_id?: string;
  site_id: string;
  action_type:
    | 'MONITOR'
    | 'HYDRATION_REMINDER'
    | 'SHADED_BREAK'
    | 'MANDATORY_REST'
    | 'RELOCATE'
    | 'STOP_WORK'
    | 'SUPERVISOR_ALERT'
    | 'EMERGENCY_ESCALATION';
  policy_version: string;
  issued_at: string;
  delivered_at?: string;
  acknowledged_at?: string;
  outcome?: 'PENDING' | 'DELIVERED_SIMULATED' | 'ACKNOWLEDGED' | 'OVERRIDDEN' | 'EXPIRED';
  message: string;
  recommended_rest_minutes?: number;
  actor: string;
  override_reason?: string;
}

export interface Incident {
  incident_id: string;
  zone_id: string;
  site_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  opened_at: string;
  workers_affected: string[];
  owner: string;
  closed_at?: string;
  resolution?: string;
  summary: string;
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'CLOSED';
}

export interface AuditEvent {
  event_id: string;
  event_type: string;
  payload_hash: string;
  payload_ref: string;
  details: Record<string, any>;
  created_at: string;
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
  thermal_data_mode?: 'offline' | 'fortyguard' | 'hybrid';
  fortyguard_status?: {
    provider: string;
    configured: boolean;
    apiKeyMasked: string;
    offlineFallback: boolean;
    cacheStats: { size: number; hits: number; misses: number; hitRatio: number };
    totalApiCalls: number;
    successfulCalls: number;
    failedCalls: number;
  };
}
