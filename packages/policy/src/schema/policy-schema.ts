import { z } from 'zod';
import { ActionTypeSchema, RiskLevelSchema } from '@sentinel/schemas';

export const RiskBandSchema = z.object({
  min: z.number().min(0).max(1),
  max: z.number().min(0).max(1),
});

export const SafetyPolicySchema = z.object({
  policy_id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  effective_from: z.string(),
  description: z.string().optional(),
  risk_bands: z.object({
    green: RiskBandSchema,
    watch: RiskBandSchema,
    elevated: RiskBandSchema,
    high: RiskBandSchema,
    critical: RiskBandSchema,
  }),
  scoring_weights: z.object({
    environment: z.number().min(0).max(1),
    exposure: z.number().min(0).max(1),
    task_intensity: z.number().min(0).max(1),
    zone_cluster: z.number().min(0).max(1),
    worker_modifier: z.number().min(0).max(1),
    recovery_mitigation: z.number().min(0).max(1),
  }),
  task_intensity_weights: z.object({
    LIGHT: z.number().min(0).max(1),
    MODERATE: z.number().min(0).max(1),
    HEAVY: z.number().min(0).max(1),
  }),
  worker_modifier_weights: z.object({
    baseline: z.number().min(0).max(1),
    elevated: z.number().min(0).max(1),
    acclimatizing: z.number().min(0).max(1),
  }),
  freshness_rules: z.object({
    fresh_max_seconds: z.number().int().positive(),
    aging_max_seconds: z.number().int().positive(),
  }),
  guardrails: z.object({
    extreme_temperature_c: z.number(),
    extreme_apparent_temperature_c: z.number().optional(),
    extreme_wet_bulb_c: z.number().optional(),
    stale_confidence_penalty: z.number().min(0).max(1),
    unacknowledged_critical_escalation_mins: z.number().int().positive(),
  }),
  action_eligibility: z.record(RiskLevelSchema, z.array(ActionTypeSchema)),
});

export type SafetyPolicy = z.infer<typeof SafetyPolicySchema>;
