import { describe, it, expect } from 'vitest';
import { ConfidenceEngine } from '../../packages/risk/src/confidence/confidence-engine.js';
import { DerivedEnvironmentFeatures } from '@sentinel/schemas';
import { REASON_CODES } from '../../packages/risk/src/scoring/reason-codes.js';

describe('Assessment Confidence & Uncertainty Engine', () => {
  it('returns high confidence for fresh, complete environmental and worker context', () => {
    const freshCompleteEnv: DerivedEnvironmentFeatures = {
      current_temperature: 36.0,
      current_wet_bulb: 25.0,
      humidity: 35,
      solar_irradiance: 750,
      trend_direction: 'STABLE',
      observation_age_seconds: 60,
      data_quality: 'FRESH',
    };

    const res = ConfidenceEngine.evaluate(freshCompleteEnv);
    expect(res.confidence).toBeGreaterThanOrEqual(0.90);
    expect(res.missing_features).toHaveLength(0);
    expect(res.uncertainty_reasons).toHaveLength(0);
  });

  it('penalizes confidence and notes uncertainty when observation is STALE', () => {
    const staleEnv: DerivedEnvironmentFeatures = {
      current_temperature: 36.0,
      current_wet_bulb: 25.0,
      trend_direction: 'STABLE',
      observation_age_seconds: 1200,
      data_quality: 'STALE',
    };

    const res = ConfidenceEngine.evaluate(staleEnv);
    expect(res.confidence).toBeLessThan(0.75);
    expect(res.uncertainty_reasons).toContain(REASON_CODES.DATA_STALE);
  });

  it('penalizes confidence and records missing features when wet_bulb is omitted', () => {
    const missingWbEnv: DerivedEnvironmentFeatures = {
      current_temperature: 36.0,
      // wet_bulb omitted
      trend_direction: 'STABLE',
      observation_age_seconds: 60,
      data_quality: 'FRESH',
    };

    const res = ConfidenceEngine.evaluate(missingWbEnv);
    expect(res.missing_features).toContain('wet_bulb_c');
    expect(res.uncertainty_reasons).toContain(REASON_CODES.MISSING_ENVIRONMENT_FIELD);
  });
});
