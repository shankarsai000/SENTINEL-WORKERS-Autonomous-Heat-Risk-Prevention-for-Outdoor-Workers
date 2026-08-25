import {
  DataFreshness,
  PredictionSource,
  PredictionUncertaintyBand,
  PredictionStatus,
} from '@sentinel/schemas';

export interface PredictionConfidenceResult {
  confidence: number; // 0.0 - 1.0
  uncertainty_band: PredictionUncertaintyBand;
  status: PredictionStatus;
  uncertainty_reasons: string[];
}

export class PredictionConfidenceEngine {
  public static evaluate(
    freshness: DataFreshness,
    historyCount: number,
    source: PredictionSource,
    hasWetBulb: boolean,
    hasSolar: boolean
  ): PredictionConfidenceResult {
    let confidence = 0.92;
    const reasons: string[] = [];

    // 1. History validation
    if (historyCount < 3) {
      return {
        confidence: 0.0,
        uncertainty_band: 'HIGH',
        status: 'INSUFFICIENT_DATA',
        uncertainty_reasons: ['INSUFFICIENT_HISTORY_OBSERVATIONS'],
      };
    }

    // 2. Freshness degradation
    if (freshness === 'STALE') {
      confidence -= 0.35;
      reasons.push('STALE_ENVIRONMENTAL_OBSERVATION');
    } else if (freshness === 'AGING') {
      confidence -= 0.15;
      reasons.push('AGING_ENVIRONMENTAL_OBSERVATION');
    }

    // 3. Source penalty (trend extrapolation vs direct provider forecast)
    if (source === 'TREND_EXTRAPOLATION') {
      confidence -= 0.08;
      reasons.push('TREND_EXTRAPOLATION_UNCERTAINTY');
    }

    // 4. Missing sensor parameters
    if (!hasWetBulb) {
      confidence -= 0.08;
      reasons.push('DERIVED_WET_BULB_UNCERTAINTY');
    }
    if (!hasSolar) {
      confidence -= 0.04;
    }

    confidence = Math.round(Math.max(0.10, Math.min(1.0, confidence)) * 100) / 100;

    let uncertaintyBand: PredictionUncertaintyBand = 'LOW';
    if (confidence < 0.55) {
      uncertaintyBand = 'HIGH';
    } else if (confidence < 0.80) {
      uncertaintyBand = 'MEDIUM';
    }

    let status: PredictionStatus = 'AVAILABLE';
    if (freshness === 'STALE') {
      status = 'STALE_DATA';
    } else if (confidence < 0.50) {
      status = 'LOW_CONFIDENCE';
    }

    return {
      confidence,
      uncertainty_band: uncertaintyBand,
      status,
      uncertainty_reasons: reasons,
    };
  }
}
