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
  source: 'simulation' | 'fortyguard' | 'sensor_fallback';
  freshness_seconds: number;
  confidence: number;
  activity_id?: string;
}

export interface RiskState {
  worker_id: string;
  site_id: string;
  timestamp: string;
  score: number;
  level: 'GREEN' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  confidence: number;
  reason_codes: string[];
  forecast_breach_time?: string;
  exposure_duration_mins: number;
  worker_metadata?: Worker;
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
}
