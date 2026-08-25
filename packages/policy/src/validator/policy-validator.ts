import { SafetyPolicy, SafetyPolicySchema } from '../schema/policy-schema.js';

export class PolicyValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'PolicyValidationError';
  }
}

export function validateSafetyPolicy(rawPolicy: unknown): SafetyPolicy {
  const result = SafetyPolicySchema.safeParse(rawPolicy);
  if (!result.success) {
    throw new PolicyValidationError('Policy schema validation failed', result.error.format());
  }

  const policy = result.data;

  // Invariant 1: Risk bands must be contiguous and ascending
  const { green, watch, elevated, high, critical } = policy.risk_bands;
  if (green.min !== 0.0) throw new PolicyValidationError('Green band must start at 0.0');
  if (Math.abs(green.max - watch.min) > 0.001) throw new PolicyValidationError('Green and Watch bands must be contiguous');
  if (Math.abs(watch.max - elevated.min) > 0.001) throw new PolicyValidationError('Watch and Elevated bands must be contiguous');
  if (Math.abs(elevated.max - high.min) > 0.001) throw new PolicyValidationError('Elevated and High bands must be contiguous');
  if (Math.abs(high.max - critical.min) > 0.001) throw new PolicyValidationError('High and Critical bands must be contiguous');
  if (critical.max < 1.0) throw new PolicyValidationError('Critical band max must reach 1.0');

  // Invariant 2: Freshness rules must be strictly ascending
  if (policy.freshness_rules.fresh_max_seconds >= policy.freshness_rules.aging_max_seconds) {
    throw new PolicyValidationError('fresh_max_seconds must be less than aging_max_seconds');
  }

  // Invariant 3: Task intensity monotonicity
  const { LIGHT, MODERATE, HEAVY } = policy.task_intensity_weights;
  if (LIGHT > MODERATE || MODERATE > HEAVY) {
    throw new PolicyValidationError('Task intensity weights must be monotonic (LIGHT <= MODERATE <= HEAVY)');
  }

  return policy;
}
