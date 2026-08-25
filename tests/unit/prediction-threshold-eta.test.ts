import { describe, it, expect } from 'vitest';
import { ThresholdEstimator } from '../../packages/prediction/src/inference/threshold-estimator.js';
import { DEFAULT_DEMO_POLICY } from '../../packages/policy/src/loader/policy-loader.js';

describe('Lead-Time Threshold ETA Estimator', () => {
  it('solves expected time to threshold for deteriorating trajectory', () => {
    // Current risk 0.55 (ELEVATED), Target HIGH is 0.70. Delta needed = 0.15.
    // Projected 30m score = 0.72 (velocity ~ 0.0057 / min)
    const result = ThresholdEstimator.estimateTimeToThreshold(
      0.55,
      'ELEVATED',
      0.72,
      0.82,
      DEFAULT_DEMO_POLICY,
      240
    );

    expect(result.target_threshold_level).toBe('HIGH');
    expect(result.expected_time_to_threshold_minutes).toBeDefined();
    expect(result.expected_time_to_threshold_minutes).toBeGreaterThan(15);
    expect(result.expected_time_to_threshold_minutes).toBeLessThan(45);
  });

  it('returns null when risk trajectory is stable or falling (non-escalating)', () => {
    const result = ThresholdEstimator.estimateTimeToThreshold(
      0.40,
      'WATCH',
      0.38, // Falling
      0.35,
      DEFAULT_DEMO_POLICY,
      240
    );

    expect(result.expected_time_to_threshold_minutes).toBeNull();
  });

  it('returns 0 when current risk is already CRITICAL', () => {
    const result = ThresholdEstimator.estimateTimeToThreshold(
      0.90,
      'CRITICAL',
      0.92,
      0.95,
      DEFAULT_DEMO_POLICY,
      240
    );

    expect(result.expected_time_to_threshold_minutes).toBe(0);
  });

  it('returns null when time to breach exceeds remaining shift time', () => {
    const result = ThresholdEstimator.estimateTimeToThreshold(
      0.52,
      'ELEVATED',
      0.58, // Slow escalation ~0.002 / min -> needs ~90 mins for 0.70 HIGH
      0.65,
      DEFAULT_DEMO_POLICY,
      30 // Shift ends in 30 mins
    );

    expect(result.expected_time_to_threshold_minutes).toBeNull();
  });
});
