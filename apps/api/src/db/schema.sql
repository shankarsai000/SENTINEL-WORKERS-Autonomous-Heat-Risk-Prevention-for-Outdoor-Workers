-- Sentinel Workers SQLite Database Schema
-- Master Build Reference v2.0

CREATE TABLE IF NOT EXISTS sites (
  site_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  zone_id TEXT NOT NULL,
  worker_count INTEGER NOT NULL,
  cooling_resources TEXT NOT NULL,
  emergency_policy_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workers (
  worker_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  role TEXT NOT NULL,
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  task_intensity TEXT NOT NULL,
  channel TEXT NOT NULL,
  consent_flags TEXT NOT NULL,
  risk_modifier TEXT NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

CREATE TABLE IF NOT EXISTS thermal_observations (
  observation_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  temperature_c REAL NOT NULL,
  humidity_pct REAL NOT NULL,
  wet_bulb_c REAL NOT NULL,
  apparent_temperature_c REAL,
  solar_irradiance REAL NOT NULL,
  source TEXT NOT NULL,
  freshness_seconds INTEGER NOT NULL,
  confidence REAL NOT NULL,
  activity_id TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

CREATE TABLE IF NOT EXISTS risk_states (
  worker_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  score REAL NOT NULL,
  level TEXT NOT NULL,
  confidence REAL NOT NULL,
  policy_id TEXT,
  policy_version TEXT,
  reason_codes TEXT NOT NULL,
  explanation TEXT,
  environment_score REAL,
  exposure_score REAL,
  task_score REAL,
  zone_score REAL,
  worker_modifier_score REAL,
  recovery_score REAL,
  data_freshness TEXT,
  missing_features TEXT,
  guardrail_flags TEXT,
  action_eligibility TEXT,
  escalation_required INTEGER,
  source_observation_ids TEXT,
  forecast_breach_time TEXT,
  exposure_duration_mins INTEGER NOT NULL,
  PRIMARY KEY (worker_id, timestamp),
  FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
  FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

CREATE TABLE IF NOT EXISTS actions (
  action_id TEXT PRIMARY KEY,
  worker_id TEXT,
  site_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  priority TEXT,
  status TEXT,
  risk_state_id TEXT,
  prediction_id TEXT,
  policy_id TEXT,
  policy_version TEXT NOT NULL,
  decision_mode TEXT,
  issued_at TEXT NOT NULL,
  approved_at TEXT,
  dispatched_at TEXT,
  delivered_at TEXT,
  ack_deadline TEXT,
  acknowledged_at TEXT,
  completed_at TEXT,
  outcome TEXT,
  message TEXT NOT NULL,
  recommended_rest_minutes INTEGER,
  actor TEXT NOT NULL,
  override_by TEXT,
  override_at TEXT,
  override_reason TEXT,
  idempotency_key TEXT,
  delivery_id TEXT,
  delivery_status TEXT,
  reason_codes TEXT,
  evidence_refs TEXT,
  is_simulated INTEGER,
  FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

CREATE TABLE IF NOT EXISTS action_deliveries (
  delivery_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL,
  sent_at TEXT NOT NULL,
  delivered_at TEXT,
  failed_at TEXT,
  failure_code TEXT,
  is_simulated INTEGER NOT NULL,
  FOREIGN KEY (action_id) REFERENCES actions(action_id)
);

CREATE TABLE IF NOT EXISTS action_acknowledgements (
  ack_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  acknowledged_at TEXT NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (action_id) REFERENCES actions(action_id)
);

CREATE TABLE IF NOT EXISTS escalations (
  escalation_id TEXT PRIMARY KEY,
  worker_id TEXT,
  site_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  reason_codes TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  escalated_to TEXT,
  resolution_note TEXT,
  FOREIGN KEY (action_id) REFERENCES actions(action_id)
);

CREATE TABLE IF NOT EXISTS incidents (
  incident_id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  closed_at TEXT,
  affected_worker_count INTEGER NOT NULL DEFAULT 0,
  workers_affected TEXT NOT NULL,
  summary TEXT NOT NULL,
  common_reason_codes TEXT,
  common_factors TEXT,
  thermal_context TEXT,
  prediction_context TEXT,
  action_summary TEXT,
  owner TEXT NOT NULL,
  policy_id TEXT,
  policy_version TEXT,
  confidence REAL,
  uncertainty TEXT,
  resolution TEXT,
  resolution_note TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

CREATE TABLE IF NOT EXISTS decision_events (
  event_id TEXT PRIMARY KEY,
  worker_id TEXT,
  actor TEXT NOT NULL,
  input_refs TEXT NOT NULL,
  risk_score REAL,
  risk_level TEXT,
  confidence REAL,
  reason_codes TEXT,
  policy_version TEXT,
  guardrail_result TEXT,
  decision TEXT NOT NULL,
  explanation TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_ref TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  cache_hit INTEGER NOT NULL,
  estimated_credit_cost REAL,
  error_code TEXT
);

CREATE TABLE IF NOT EXISTS model_versions (
  model_id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  model_type TEXT NOT NULL,
  feature_schema_version TEXT NOT NULL,
  training_data_ref TEXT NOT NULL,
  metrics TEXT NOT NULL,
  created_at TEXT,
  deployed_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS predictive_risk_states (
  prediction_id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  current_risk_level TEXT NOT NULL,
  current_risk_score REAL NOT NULL,
  p_elevated_30m REAL,
  p_critical_60m REAL,
  expected_time_to_threshold_minutes INTEGER,
  predicted_risk_level TEXT NOT NULL,
  predictive_state TEXT NOT NULL,
  prediction_confidence REAL NOT NULL,
  uncertainty_band TEXT NOT NULL,
  prediction_status TEXT NOT NULL,
  prediction_source TEXT NOT NULL,
  early_warning INTEGER NOT NULL,
  predictive_reason_codes TEXT NOT NULL,
  feature_contributions TEXT NOT NULL,
  feature_snapshot_id TEXT,
  model_id TEXT NOT NULL,
  model_version TEXT NOT NULL,
  source_risk_state_id TEXT,
  source_observation_ids TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
  FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

CREATE TABLE IF NOT EXISTS prediction_events (
  event_id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  prediction_status TEXT NOT NULL,
  predicted_level TEXT NOT NULL,
  p_elevated_30m REAL,
  p_critical_60m REAL,
  expected_time_to_threshold_minutes INTEGER,
  early_warning INTEGER NOT NULL,
  model_id TEXT NOT NULL,
  model_version TEXT NOT NULL,
  feature_snapshot_id TEXT,
  reason_codes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fortyguard_activities (
  activity_id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  completed_at TEXT,
  failed_at TEXT,
  request_hash TEXT,
  site_id TEXT,
  error_code TEXT,
  error_message TEXT,
  provider_request_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obs_site_time ON thermal_observations(site_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_worker_time ON risk_states(worker_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_site_level ON risk_states(site_id, level);
CREATE INDEX IF NOT EXISTS idx_pred_worker_time ON predictive_risk_states(worker_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pred_site_time ON predictive_risk_states(site_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pred_events_time ON prediction_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_actions_worker ON actions(worker_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fg_activities_status ON fortyguard_activities(status, created_at DESC);
