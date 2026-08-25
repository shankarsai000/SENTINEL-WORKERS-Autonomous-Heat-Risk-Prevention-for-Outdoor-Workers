import { describe, it, expect } from 'vitest';
import { PredictionConfidenceEngine } from '../../packages/prediction/src/confidence/prediction-confidence.js';

describe('Prediction Confidence & Uncertainty Engine', () => {
  it('returns high confidence and LOW uncertainty for fresh complete data with >= 3 history', () => {
    const res = PredictionConfidenceEngine.evaluate('FRESH', 4, 'PROVIDER_FORECAST', true, true);

    expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    expect(res.uncertainty_band).toBe('LOW');
    expect(res.status).toBe('AVAILABLE');
  });

  it('degrades confidence and sets status to STALE_DATA when observation is STALE', () => {
    const res = PredictionConfidenceEngine.evaluate('STALE', 4, 'TREND_EXTRAPOLATION', true, true);

    expect(res.confidence).toBeLessThan(0.60);
    expect(res.uncertainty_band).toBe('HIGH');
    expect(res.status).toBe('STALE_DATA');
    expect(res.uncertainty_reasons).toContain('STALE_ENVIRONMENTAL_OBSERVATION');
  });

  it('returns INSUFFICIENT_DATA and confidence 0 when history count is < 3', () => {
    const res = PredictionConfidenceEngine.evaluate('FRESH', 2, 'TREND_EXTRAPOLATION', true, true);

    expect(res.confidence).toBe(0.0);
    expect(res.status).toBe('INSUFFICIENT_DATA');
    expect(res.uncertainty_band).toBe('HIGH');
  });

  it('applies slight penalty when trend extrapolation is used instead of provider forecast', () => {
    const forecastRes = PredictionConfidenceEngine.evaluate('FRESH', 4, 'PROVIDER_FORECAST', true, true);
    const trendRes = PredictionConfidenceEngine.evaluate('FRESH', 4, 'TREND_EXTRAPOLATION', true, true);

    expect(trendRes.confidence).toBeLessThan(forecastRes.confidence);
  });
});
