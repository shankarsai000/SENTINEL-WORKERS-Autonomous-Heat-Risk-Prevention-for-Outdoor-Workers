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
  reason_codes TEXT NOT NULL,
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
  policy_version TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  delivered_at TEXT,
  acknowledged_at TEXT,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  recommended_rest_minutes INTEGER,
  actor TEXT NOT NULL,
  override_reason TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

CREATE TABLE IF NOT EXISTS incidents (
  incident_id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  workers_affected TEXT NOT NULL,
  owner TEXT NOT NULL,
  closed_at TEXT,
  resolution TEXT,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

CREATE TABLE IF NOT EXISTS decision_events (
  event_id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  input_refs TEXT NOT NULL,
  decision TEXT NOT NULL,
  explanation TEXT NOT NULL,
  policy_version TEXT NOT NULL,
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
  activity_id TEXT,
  credits_estimate REAL NOT NULL,
  status TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_versions (
  model_id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  metrics TEXT NOT NULL,
  training_data_ref TEXT NOT NULL,
  deployed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obs_site_time ON thermal_observations(site_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_worker_time ON risk_states(worker_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_site_level ON risk_states(site_id, level);
CREATE INDEX IF NOT EXISTS idx_actions_worker ON actions(worker_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(created_at DESC);
