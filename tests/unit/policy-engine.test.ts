import { describe, it, expect } from 'vitest';
import { PolicyLoader, DEFAULT_DEMO_POLICY } from '../../packages/policy/src/loader/policy-loader.js';
import { validateSafetyPolicy, PolicyValidationError } from '../../packages/policy/src/validator/policy-validator.js';

describe('Versioned Safety Policy Engine', () => {
  it('loads and validates default demo construction policy', () => {
    const policy = PolicyLoader.getPolicy('demo-construction-v1');
    expect(policy.policy_id).toBe('demo-construction-v1');
    expect(policy.version).toBe('1.0.0');
    expect(policy.risk_bands.critical.max).toBe(1.0);
  });

  it('validates contiguous risk bands successfully', () => {
    const validated = validateSafetyPolicy(DEFAULT_DEMO_POLICY);
    expect(validated).toBeDefined();
    expect(validated.policy_id).toBe('demo-construction-v1');
  });

  it('throws PolicyValidationError when risk bands are non-contiguous', () => {
    const brokenPolicy = {
      ...DEFAULT_DEMO_POLICY,
      risk_bands: {
        ...DEFAULT_DEMO_POLICY.risk_bands,
        green: { min: 0.0, max: 0.25 },
        watch: { min: 0.35, max: 0.50 }, // Gap between 0.25 and 0.35
      },
    };

    expect(() => validateSafetyPolicy(brokenPolicy)).toThrow(PolicyValidationError);
  });

  it('throws PolicyValidationError when task intensity weights are non-monotonic', () => {
    const brokenPolicy = {
      ...DEFAULT_DEMO_POLICY,
      task_intensity_weights: {
        LIGHT: 0.8,
        MODERATE: 0.5, // LIGHT > MODERATE
        HEAVY: 0.9,
      },
    };

    expect(() => validateSafetyPolicy(brokenPolicy)).toThrow(PolicyValidationError);
  });
});
