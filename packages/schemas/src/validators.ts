import { z } from 'zod';

export const WorkerRoleSchema = z.enum([
  'Laborer',
  'Carpenter',
  'Electrician',
  'Welder',
  'Supervisor',
]);

export const TaskIntensitySchema = z.enum(['LIGHT', 'MODERATE', 'HEAVY']);

export const RiskModifierSchema = z.enum(['baseline', 'elevated', 'acclimatizing']);

export const CommunicationChannelSchema = z.enum([
  'SMS_SIMULATED',
  'CONSOLE',
  'RADIO_SIMULATED',
]);

export const RiskLevelSchema = z.enum(['GREEN', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL']);

export const ActionTypeSchema = z.enum([
  'MONITOR',
  'HYDRATION_REMINDER',
  'SHADE_RECOMMENDATION',
  'RECOVERY_BREAK',
  'RELOCATE_TO_COOLING',
  'MODIFY_WORK',
  'STOP_WORK',
  'SUPERVISOR_REVIEW',
  'SUPERVISOR_ACK_REQUIRED',
  'ESCALATE',
  'EMERGENCY_PROTECTIVE_ACTION',
  'SHADED_BREAK',
  'MANDATORY_REST',
  'RELOCATE',
  'SUPERVISOR_ALERT',
  'EMERGENCY_ESCALATION',
]);

export const ActionStatusSchema = z.enum([
  'PROPOSED',
  'POLICY_REVIEW',
  'APPROVED',
  'REJECTED',
  'DISPATCHING',
  'DELIVERED',
  'DELIVERY_FAILED',
  'ACK_PENDING',
  'ACKNOWLEDGED',
  'OVERRIDDEN',
  'EXPIRED',
  'ESCALATED',
  'COMPLETED',
]);

export const ActionPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY']);

export const ActionOutcomeSchema = z.enum([
  'PENDING',
  'DELIVERED_SIMULATED',
  'ACKNOWLEDGED',
  'OVERRIDDEN',
  'EXPIRED',
  'COMPLETED',
  'FAILED',
  'ESCALATED',
]);

export const IncidentSeveritySchema = z.enum(['LOW', 'MEDIUM', 'ELEVATED', 'HIGH', 'CRITICAL']);

export const ObservationSourceSchema = z.enum(['simulation', 'fortyguard', 'fortyguard_cache', 'sensor_fallback']);

export const ConsentFlagsSchema = z.object({
  data_processing: z.boolean(),
  notification_consent: z.boolean(),
});

export const CoolingResourcesSchema = z.object({
  shade_stations: z.number().int().nonnegative(),
  water_points: z.number().int().nonnegative(),
  misting_fans: z.number().int().nonnegative(),
  ac_trailers: z.number().int().nonnegative(),
});

export const WorkerSchema = z.object({
  worker_id: z.string().min(1),
  site_id: z.string().min(1),
  role: WorkerRoleSchema,
  shift_start: z.string(),
  shift_end: z.string(),
  task_intensity: TaskIntensitySchema,
  channel: CommunicationChannelSchema,
  consent_flags: ConsentFlagsSchema,
  risk_modifier: RiskModifierSchema,
});

export const SiteSchema = z.object({
  site_id: z.string().min(1),
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  zone_id: z.string().min(1),
  worker_count: z.number().int().nonnegative(),
  cooling_resources: CoolingResourcesSchema,
  emergency_policy_id: z.string().min(1),
});

export const ThermalObservationSchema = z.object({
  observation_id: z.string().min(1),
  site_id: z.string().min(1),
  timestamp: z.string(),
  temperature_c: z.number(),
  humidity_pct: z.number().min(0).max(100),
  wet_bulb_c: z.number(),
  apparent_temperature_c: z.number().optional(),
  solar_irradiance: z.number().nonnegative(),
  source: ObservationSourceSchema,
  freshness_seconds: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  activity_id: z.string().optional(),
});

export const DataFreshnessSchema = z.enum(['FRESH', 'AGING', 'STALE']);

export const RiskExplanationReasonSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

export const RiskExplanationSchema = z.object({
  summary: z.string().min(1),
  reasons: z.array(RiskExplanationReasonSchema),
});

export const WorkerRiskContextSchema = z.object({
  worker_id: z.string().min(1),
  site_id: z.string().min(1),
  role: WorkerRoleSchema,
  task_intensity: TaskIntensitySchema,
  shift_start: z.string(),
  shift_end: z.string(),
  exposure_duration_minutes: z.number().nonnegative(),
  recent_recovery_minutes: z.number().nonnegative().nullable(),
  risk_modifier: RiskModifierSchema,
  channel: CommunicationChannelSchema,
  active: z.boolean(),
});

export const SiteRiskContextSchema = z.object({
  site_id: z.string().min(1),
  zone_id: z.string().min(1),
  worker_count: z.number().int().nonnegative(),
  active_worker_count: z.number().int().nonnegative(),
  cooling_resources: CoolingResourcesSchema,
  emergency_policy_id: z.string().min(1),
});

export const DerivedEnvironmentFeaturesSchema = z.object({
  current_temperature: z.number(),
  current_apparent_temperature: z.number().optional(),
  current_wet_bulb: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  solar_irradiance: z.number().nonnegative().optional(),
  temperature_delta_10m: z.number().optional(),
  temperature_delta_30m: z.number().optional(),
  trend_direction: z.enum(['RISING', 'FALLING', 'STABLE', 'UNKNOWN']),
  observation_age_seconds: z.number().nonnegative(),
  data_quality: DataFreshnessSchema,
});

export const ZoneClusterContextSchema = z.object({
  zone_id: z.string().min(1),
  active_workers_in_zone: z.number().int().nonnegative(),
  elevated_workers_in_zone: z.number().int().nonnegative(),
  high_workers_in_zone: z.number().int().nonnegative(),
  critical_workers_in_zone: z.number().int().nonnegative(),
  cluster_density: z.number().min(0).max(1),
});

export const RiskStateSchema = z.object({
  worker_id: z.string().min(1),
  site_id: z.string().min(1),
  timestamp: z.string(),
  score: z.number().min(0).max(1),
  level: RiskLevelSchema,
  confidence: z.number().min(0).max(1),
  policy_id: z.string().optional(),
  policy_version: z.string().optional(),
  reason_codes: z.array(z.string()),
  explanation: RiskExplanationSchema.optional(),
  environment_score: z.number().min(0).max(1).optional(),
  exposure_score: z.number().min(0).max(1).optional(),
  task_score: z.number().min(0).max(1).optional(),
  zone_score: z.number().min(0).max(1).optional(),
  worker_modifier_score: z.number().min(0).max(1).optional(),
  recovery_score: z.number().min(0).max(1).optional(),
  data_freshness: DataFreshnessSchema.optional(),
  missing_features: z.array(z.string()).optional(),
  guardrail_flags: z.array(z.string()).optional(),
  action_eligibility: z.array(z.string()).optional(),
  escalation_required: z.boolean().optional(),
  source_observation_ids: z.array(z.string()).optional(),
  forecast_breach_time: z.string().optional(),
  exposure_duration_mins: z.number().nonnegative(),
});

export const ActionDecisionSchema = z.object({
  action_id: z.string().min(1),
  worker_id: z.string().optional(),
  site_id: z.string().min(1),
  created_at: z.string(),
  risk_state_id: z.string().optional(),
  prediction_id: z.string().optional(),
  action_type: ActionTypeSchema,
  priority: ActionPrioritySchema,
  reason_codes: z.array(z.string()),
  evidence_refs: z.record(z.unknown()),
  policy_id: z.string().min(1),
  policy_version: z.string().min(1),
  selected_by: z.enum(['AUTONOMOUS_POLICY_PLANNER', 'SUPERVISOR_DIRECT', 'EMERGENCY_GUARDRAIL']),
  decision_mode: z.enum(['AUTONOMOUS', 'SUPERVISOR_REQUIRED', 'EMERGENCY_AUTO']),
  confidence: z.number().min(0).max(1),
  requires_acknowledgement: z.boolean(),
  ack_deadline: z.string().optional(),
  allowed: z.boolean(),
  rejected_reason: z.string().optional(),
  idempotency_key: z.string().min(1),
  message: z.string(),
  recommended_rest_minutes: z.number().int().nonnegative().optional(),
});

export const ActionDeliverySchema = z.object({
  delivery_id: z.string().min(1),
  action_id: z.string().min(1),
  provider: z.enum(['SIMULATED_SMS', 'TWILIO_SMS', 'CONSOLE_ALERT']),
  channel: CommunicationChannelSchema,
  recipient_ref: z.string().min(1),
  status: z.enum(['PENDING', 'DISPATCHED', 'DELIVERED', 'FAILED']),
  attempt_count: z.number().int().nonnegative(),
  sent_at: z.string(),
  delivered_at: z.string().optional(),
  failed_at: z.string().optional(),
  failure_code: z.string().optional(),
  is_simulated: z.boolean(),
});

export const ActionAcknowledgementSchema = z.object({
  ack_id: z.string().min(1),
  action_id: z.string().min(1),
  actor_type: z.enum(['WORKER', 'SUPERVISOR', 'SYSTEM_OVERRIDE']),
  actor_ref: z.string().min(1),
  acknowledged_at: z.string(),
  source: z.enum(['SMS_REPLY', 'CONSOLE_BUTTON', 'SIMULATED_API', 'RADIO']),
  note: z.string().optional(),
});

export const EscalationDecisionSchema = z.object({
  escalation_id: z.string().min(1),
  worker_id: z.string().optional(),
  site_id: z.string().min(1),
  action_id: z.string().min(1),
  severity: IncidentSeveritySchema,
  reason_codes: z.array(z.string()),
  policy_id: z.string().min(1),
  policy_version: z.string().min(1),
  created_at: z.string(),
  status: z.enum(['PENDING', 'TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED']),
  escalated_to: z.string().optional(),
  resolution_note: z.string().optional(),
});

export const ActionSchema = z.object({
  action_id: z.string().min(1),
  worker_id: z.string().optional(),
  site_id: z.string().min(1),
  action_type: ActionTypeSchema,
  priority: ActionPrioritySchema.optional(),
  status: ActionStatusSchema.optional(),
  risk_state_id: z.string().optional(),
  prediction_id: z.string().optional(),
  policy_id: z.string().optional(),
  policy_version: z.string(),
  decision_mode: z.enum(['AUTONOMOUS', 'SUPERVISOR_REQUIRED', 'EMERGENCY_AUTO']).optional(),
  issued_at: z.string(),
  approved_at: z.string().optional(),
  dispatched_at: z.string().optional(),
  delivered_at: z.string().optional(),
  ack_deadline: z.string().optional(),
  acknowledged_at: z.string().optional(),
  completed_at: z.string().optional(),
  outcome: ActionOutcomeSchema.optional(),
  message: z.string(),
  recommended_rest_minutes: z.number().int().nonnegative().optional(),
  actor: z.string(),
  override_by: z.string().optional(),
  override_at: z.string().optional(),
  override_reason: z.string().optional(),
  idempotency_key: z.string().optional(),
  delivery_id: z.string().optional(),
  delivery_status: z.string().optional(),
  reason_codes: z.array(z.string()).optional(),
  evidence_refs: z.record(z.unknown()).optional(),
  is_simulated: z.boolean().optional(),
});

export const IncidentStatusSchema = z.enum([
  'DETECTED',
  'TRIAGED',
  'ACTIVE',
  'MITIGATING',
  'RESOLVED',
  'CLOSED',
  'OPEN',
  'INVESTIGATING',
]);

export const IncidentActionSummarySchema = z.object({
  proposed: z.number().int().nonnegative().default(0),
  approved: z.number().int().nonnegative().default(0),
  delivered: z.number().int().nonnegative().default(0),
  acknowledged: z.number().int().nonnegative().default(0),
  pending: z.number().int().nonnegative().default(0),
  failed: z.number().int().nonnegative().default(0),
  escalated: z.number().int().nonnegative().default(0),
  completed: z.number().int().nonnegative().default(0),
});

export const IncidentSchema = z.object({
  incident_id: z.string().min(1),
  zone_id: z.string().min(1),
  site_id: z.string().min(1),
  severity: IncidentSeveritySchema,
  status: IncidentStatusSchema,
  opened_at: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  closed_at: z.string().optional(),
  affected_worker_count: z.number().int().nonnegative().default(0),
  worker_ids: z.array(z.string()).default([]),
  workers_affected: z.array(z.string()).optional(),
  summary: z.string(),
  common_reason_codes: z.array(z.string()).default([]),
  common_factors: z.array(z.string()).default([]),
  thermal_context: z.record(z.unknown()).optional(),
  prediction_context: z.record(z.unknown()).optional(),
  action_summary: IncidentActionSummarySchema.optional(),
  owner: z.string(),
  policy_id: z.string().optional(),
  policy_version: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  uncertainty: z.array(z.string()).optional(),
  resolution: z.string().optional(),
  resolution_note: z.string().optional(),
});

export const SupervisorRoleSchema = z.enum(['SUPERVISOR', 'OPERATOR', 'VIEWER']);

export const PriorityWorkerItemSchema = z.object({
  worker_id: z.string().min(1),
  site_id: z.string().min(1),
  zone_id: z.string().min(1),
  role: WorkerRoleSchema,
  task_intensity: TaskIntensitySchema,
  current_risk_level: RiskLevelSchema,
  current_risk_score: z.number().min(0).max(1),
  predicted_risk_level: z.union([RiskLevelSchema, z.literal('STABLE')]),
  predicted_risk_score: z.number().min(0).max(1),
  threshold_eta_mins: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  data_freshness: z.enum(['FRESH', 'AGING', 'STALE']),
  exposure_duration_mins: z.number().nonnegative(),
  primary_reason: z.string(),
  priority_score: z.number(),
  priority_rank: z.number().int().positive(),
  priority_reason: z.string(),
  action_status: z.union([ActionStatusSchema, z.literal('NO_ACTION')]),
  ack_status: z.enum(['ACK_PENDING', 'ACKNOWLEDGED', 'ESCALATED', 'NONE']),
  active_incident_id: z.string().optional(),
});

export const OperationsSummarySchema = z.object({
  active_workers: z.number().int().nonnegative(),
  green_count: z.number().int().nonnegative(),
  watch_count: z.number().int().nonnegative(),
  elevated_count: z.number().int().nonnegative(),
  high_count: z.number().int().nonnegative(),
  critical_count: z.number().int().nonnegative(),
  predicted_deterioration_count: z.number().int().nonnegative(),
  pending_ack_count: z.number().int().nonnegative(),
  active_incidents: z.number().int().nonnegative(),
  escalated_incidents: z.number().int().nonnegative(),
  stale_data_count: z.number().int().nonnegative(),
  fortyguard_status: z.enum(['CONNECTED', 'DISABLED', 'DEGRADED']),
  risk_engine_status: z.enum(['HEALTHY', 'DEGRADED']),
  prediction_status: z.enum(['HEALTHY', 'DEGRADED']),
  action_engine_status: z.enum(['HEALTHY', 'DEGRADED']),
  system_status: z.enum(['ACTIVE', 'DEGRADED', 'OFFLINE']),
  data_freshness: z.enum(['FRESH', 'AGING', 'STALE']),
  last_updated: z.string(),
});

export const DecisionEventSchema = z.object({
  event_id: z.string().min(1),
  timestamp: z.string().optional(),
  worker_id: z.string().optional(),
  actor: z.string(),
  input_refs: z.object({
    observation_id: z.string().optional(),
    worker_id: z.string().optional(),
    risk_state_id: z.string().optional(),
    policy_id: z.string().optional(),
    site_id: z.string().optional(),
  }),
  risk_score: z.number().min(0).max(1).optional(),
  risk_level: RiskLevelSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  reason_codes: z.array(z.string()).optional(),
  policy_version: z.string().optional(),
  guardrail_result: z.string().optional(),
  decision: z.string(),
  explanation: z.string(),
});

export const AuditEventSchema = z.object({
  event_id: z.string().min(1),
  event_type: z.enum([
    'OBSERVATION_INGESTED',
    'RISK_EVALUATED',
    'ACTION_ISSUED',
    'ACTION_DEDUPLICATED',
    'ACTION_ACKNOWLEDGED',
    'ACTION_OVERRIDDEN',
    'INCIDENT_OPENED',
    'INCIDENT_ESCALATED',
    'INCIDENT_RESOLVED',
    'SIMULATION_STATE_CHANGED',
  ]),
  payload_hash: z.string(),
  payload_ref: z.string(),
  details: z.record(z.unknown()),
  created_at: z.string(),
});

export const PredictionStatusSchema = z.enum([
  'AVAILABLE',
  'INSUFFICIENT_DATA',
  'STALE_DATA',
  'LOW_CONFIDENCE',
  'MODEL_ERROR',
  'UNSUPPORTED_CONTEXT',
]);

export const PredictionUncertaintyBandSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const PredictiveStateSchema = z.enum([
  'NO_PREDICTION',
  'STABLE',
  'DETERIORATING',
  'PREDICTED_ELEVATED',
  'PREDICTED_HIGH',
  'PREDICTED_CRITICAL',
]);

export const PredictionSourceSchema = z.enum([
  'PROVIDER_FORECAST',
  'TREND_EXTRAPOLATION',
  'HISTORICAL_REPLAY',
]);

export const PredictiveRiskStateSchema = z.object({
  prediction_id: z.string().min(1),
  worker_id: z.string().min(1),
  site_id: z.string().min(1),
  timestamp: z.string(),
  current_risk_level: RiskLevelSchema,
  current_risk_score: z.number().min(0).max(1),
  p_elevated_30m: z.number().min(0).max(1).nullable(),
  p_critical_60m: z.number().min(0).max(1).nullable(),
  expected_time_to_threshold_minutes: z.number().int().nonnegative().nullable(),
  predicted_risk_level: RiskLevelSchema,
  predictive_state: PredictiveStateSchema,
  prediction_confidence: z.number().min(0).max(1),
  uncertainty_band: PredictionUncertaintyBandSchema,
  prediction_status: PredictionStatusSchema,
  prediction_source: PredictionSourceSchema,
  early_warning: z.boolean(),
  predictive_reason_codes: z.array(z.string()),
  feature_contributions: z.record(z.number()),
  feature_snapshot_id: z.string().optional(),
  model_id: z.string().min(1),
  model_version: z.string().min(1),
  source_risk_state_id: z.string().optional(),
  source_observation_ids: z.array(z.string()),
  policy_id: z.string().min(1),
  policy_version: z.string().min(1),
});

export const PredictionEventSchema = z.object({
  event_id: z.string().min(1),
  timestamp: z.string(),
  worker_id: z.string().min(1),
  site_id: z.string().min(1),
  event_type: z.enum([
    'prediction.calculated',
    'prediction.updated',
    'prediction.early_warning',
    'prediction.unavailable',
    'prediction.model_error',
    'prediction.threshold_eta_changed',
  ]),
  prediction_status: PredictionStatusSchema,
  predicted_level: RiskLevelSchema,
  p_elevated_30m: z.number().min(0).max(1).nullable(),
  p_critical_60m: z.number().min(0).max(1).nullable(),
  expected_time_to_threshold_minutes: z.number().int().nonnegative().nullable(),
  early_warning: z.boolean(),
  model_id: z.string().min(1),
  model_version: z.string().min(1),
  feature_snapshot_id: z.string().optional(),
  reason_codes: z.array(z.string()),
});

export const ModelVersionSchema = z.object({
  model_id: z.string().min(1),
  version: z.string().min(1),
  model_type: z.enum(['BASELINE_DETERMINISTIC', 'LOGISTIC_REGRESSION', 'EXPONENTIAL_SMOOTHING']),
  feature_schema_version: z.string().min(1),
  training_data_ref: z.string().min(1),
  metrics: z.record(z.union([z.number(), z.string()])),
  created_at: z.string().optional(),
  deployed_at: z.string(),
  status: z.enum(['ACTIVE', 'CANDIDATE', 'DEPRECATED']),
});
