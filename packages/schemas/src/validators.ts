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
  'SHADED_BREAK',
  'MANDATORY_REST',
  'RELOCATE',
  'STOP_WORK',
  'SUPERVISOR_ALERT',
  'EMERGENCY_ESCALATION',
]);

export const ActionOutcomeSchema = z.enum([
  'PENDING',
  'DELIVERED_SIMULATED',
  'ACKNOWLEDGED',
  'OVERRIDDEN',
  'EXPIRED',
]);

export const IncidentSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const ObservationSourceSchema = z.enum(['simulation', 'fortyguard', 'sensor_fallback']);

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

export const RiskStateSchema = z.object({
  worker_id: z.string().min(1),
  site_id: z.string().min(1),
  timestamp: z.string(),
  score: z.number().min(0).max(1),
  level: RiskLevelSchema,
  confidence: z.number().min(0).max(1),
  reason_codes: z.array(z.string()),
  forecast_breach_time: z.string().optional(),
  exposure_duration_mins: z.number().nonnegative(),
});

export const ActionSchema = z.object({
  action_id: z.string().min(1),
  worker_id: z.string().optional(),
  site_id: z.string().min(1),
  action_type: ActionTypeSchema,
  policy_version: z.string(),
  issued_at: z.string(),
  delivered_at: z.string().optional(),
  acknowledged_at: z.string().optional(),
  outcome: ActionOutcomeSchema.optional(),
  message: z.string(),
  recommended_rest_minutes: z.number().int().nonnegative().optional(),
  actor: z.string(),
  override_reason: z.string().optional(),
});

export const IncidentSchema = z.object({
  incident_id: z.string().min(1),
  zone_id: z.string().min(1),
  site_id: z.string().min(1),
  severity: IncidentSeveritySchema,
  opened_at: z.string(),
  workers_affected: z.array(z.string()),
  owner: z.string(),
  closed_at: z.string().optional(),
  resolution: z.string().optional(),
  summary: z.string(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'MITIGATED', 'CLOSED']),
});

export const DecisionEventSchema = z.object({
  event_id: z.string().min(1),
  actor: z.string(),
  input_refs: z.record(z.string().optional()),
  decision: z.string(),
  explanation: z.string(),
  policy_version: z.string(),
  timestamp: z.string(),
});

export const AuditEventSchema = z.object({
  event_id: z.string().min(1),
  event_type: z.enum([
    'OBSERVATION_INGESTED',
    'RISK_EVALUATED',
    'ACTION_ISSUED',
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
