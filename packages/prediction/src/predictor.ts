import {
  ThermalObservation,
  WorkerRiskContext,
  SiteRiskContext,
  ZoneClusterContext,
  RiskState,
  PredictiveRiskState,
  PredictionEvent,
  PredictionSource,
  RiskLevel,
} from '@sentinel/schemas';
import { SafetyPolicy, PolicyLoader } from '@sentinel/policy';
import { PredictionFeatureBuilder, PredictionFeatureConfig, DEFAULT_PREDICTION_FEATURE_CONFIG } from './features/feature-builder.js';
import { IPredictionModel } from './models/model-types.js';
import { LogisticRegressionPredictionModel } from './models/logistic-model.js';
import { ThresholdEstimator } from './inference/threshold-estimator.js';
import { PredictionConfidenceEngine } from './confidence/prediction-confidence.js';
import { PredictiveStateMachine } from './state/predictive-risk-state.js';
import { PredictionExplanationBuilder } from './explanation/prediction-explanation.js';

export interface PredictWorkerOptions {
  currentObservation: ThermalObservation;
  workerCtx: WorkerRiskContext;
  siteCtx: SiteRiskContext;
  clusterCtx: ZoneClusterContext;
  currentRisk: RiskState;
  policy?: SafetyPolicy;
  observationHistory?: ThermalObservation[];
  source?: PredictionSource;
  config?: PredictionFeatureConfig;
}

export interface PredictWorkerResult {
  predictiveState: PredictiveRiskState;
  predictionEvent: PredictionEvent;
}

export interface PredictBatchOptions {
  currentObservation: ThermalObservation;
  workers: WorkerRiskContext[];
  siteCtx: SiteRiskContext;
  clusterCtx: ZoneClusterContext;
  currentRisks: Map<string, RiskState>;
  policy?: SafetyPolicy;
  observationHistory?: ThermalObservation[];
  source?: PredictionSource;
  config?: PredictionFeatureConfig;
}

export interface PredictBatchResult {
  predictions: PredictiveRiskState[];
  events: PredictionEvent[];
  failures: Array<{ worker_id: string; error: string }>;
  duration_ms: number;
}

export class ShortHorizonRiskPredictor {
  private model: IPredictionModel;
  private defaultPolicy: SafetyPolicy;

  constructor(model?: IPredictionModel, policy?: SafetyPolicy) {
    this.model = model || new LogisticRegressionPredictionModel();
    this.defaultPolicy = policy || PolicyLoader.getPolicy();
  }

  public getModel(): IPredictionModel {
    return this.model;
  }

  public setModel(model: IPredictionModel): void {
    this.model = model;
  }

  public predictWorker(options: PredictWorkerOptions): PredictWorkerResult {
    const {
      currentObservation,
      workerCtx,
      siteCtx,
      clusterCtx,
      currentRisk,
      policy = this.defaultPolicy,
      observationHistory = [],
      source = 'TREND_EXTRAPOLATION',
      config = DEFAULT_PREDICTION_FEATURE_CONFIG,
    } = options;

    const timestamp = currentObservation.timestamp || new Date().toISOString();
    const predictionId = `pred_${Date.now()}_${workerCtx.worker_id}`;

    // 1. Build & validate feature vector
    const featResult = PredictionFeatureBuilder.buildFeatures(
      currentObservation,
      workerCtx,
      siteCtx,
      clusterCtx,
      currentRisk,
      policy,
      observationHistory,
      config
    );

    // Handle Insufficient Historical Data
    if (featResult.status === 'INSUFFICIENT_DATA' || !featResult.features || !featResult.trend) {
      const predState: PredictiveRiskState = {
        prediction_id: predictionId,
        worker_id: workerCtx.worker_id,
        site_id: siteCtx.site_id,
        timestamp,
        current_risk_level: currentRisk.level,
        current_risk_score: currentRisk.score,
        p_elevated_30m: null,
        p_critical_60m: null,
        expected_time_to_threshold_minutes: null,
        predicted_risk_level: currentRisk.level,
        predictive_state: 'NO_PREDICTION',
        prediction_confidence: 0.0,
        uncertainty_band: 'HIGH',
        prediction_status: 'INSUFFICIENT_DATA',
        prediction_source: source,
        early_warning: false,
        predictive_reason_codes: ['INSUFFICIENT_HISTORICAL_OBSERVATIONS'],
        feature_contributions: {},
        model_id: this.model.modelId,
        model_version: this.model.version,
        source_risk_state_id: `${currentRisk.worker_id}_${currentRisk.timestamp}`,
        source_observation_ids: [currentObservation.observation_id],
        policy_id: policy.policy_id,
        policy_version: policy.version,
      };

      const event: PredictionEvent = {
        event_id: `pevt_${Date.now()}_${workerCtx.worker_id}`,
        timestamp,
        worker_id: workerCtx.worker_id,
        site_id: siteCtx.site_id,
        event_type: 'prediction.unavailable',
        prediction_status: 'INSUFFICIENT_DATA',
        predicted_level: currentRisk.level,
        p_elevated_30m: null,
        p_critical_60m: null,
        expected_time_to_threshold_minutes: null,
        early_warning: false,
        model_id: this.model.modelId,
        model_version: this.model.version,
        reason_codes: predState.predictive_reason_codes,
      };

      return { predictiveState: predState, predictionEvent: event };
    }

    // 2. Model Inference
    const inference = this.model.predict(featResult.features);

    // 3. Map predicted scores to preliminary risk levels
    let preliminaryPredictedLevel: RiskLevel = 'GREEN';
    if (inference.predicted_score_30m >= policy.risk_bands.critical.min) {
      preliminaryPredictedLevel = 'CRITICAL';
    } else if (inference.predicted_score_30m >= policy.risk_bands.high.min) {
      preliminaryPredictedLevel = 'HIGH';
    } else if (inference.predicted_score_30m >= policy.risk_bands.elevated.min) {
      preliminaryPredictedLevel = 'ELEVATED';
    } else if (inference.predicted_score_30m >= policy.risk_bands.watch.min) {
      preliminaryPredictedLevel = 'WATCH';
    }

    // 4. CRITICAL SAFETY DOMINANCE: Safety guardrails and P2 CRITICAL state strictly dominate
    const finalPredictedLevel = PredictiveStateMachine.enforceSafetyDominance(
      currentRisk.level,
      preliminaryPredictedLevel
    );

    // 5. Threshold ETA Calculation
    const etaResult = ThresholdEstimator.estimateTimeToThreshold(
      currentRisk.score,
      currentRisk.level,
      inference.predicted_score_30m,
      inference.predicted_score_60m,
      policy,
      featResult.exposure?.shift_remaining_mins
    );

    // 6. Confidence & Uncertainty
    const totalObsCount = observationHistory.length + 1;
    const confidenceResult = PredictionConfidenceEngine.evaluate(
      currentRisk.data_freshness || 'FRESH',
      totalObsCount,
      source,
      currentObservation.wet_bulb_c !== undefined,
      currentObservation.solar_irradiance !== undefined
    );

    // 7. Early Warning & Predictive State
    const earlyWarning = PredictiveStateMachine.evaluateEarlyWarning(
      currentRisk.level,
      finalPredictedLevel,
      inference.p_elevated_30m,
      inference.p_critical_60m
    );

    const predictiveState = PredictiveStateMachine.evaluatePredictiveState(
      currentRisk.level,
      finalPredictedLevel,
      inference.p_critical_60m
    );

    // 8. Reason Codes
    const reasonCodes = PredictionExplanationBuilder.buildReasonCodes(
      featResult.trend,
      currentRisk,
      finalPredictedLevel,
      inference,
      earlyWarning
    );

    // 9. Assemble Extended PredictiveRiskState
    const predictiveRiskState: PredictiveRiskState = {
      prediction_id: predictionId,
      worker_id: workerCtx.worker_id,
      site_id: siteCtx.site_id,
      timestamp,
      current_risk_level: currentRisk.level,
      current_risk_score: currentRisk.score,
      p_elevated_30m: inference.p_elevated_30m,
      p_critical_60m: inference.p_critical_60m,
      expected_time_to_threshold_minutes: etaResult.expected_time_to_threshold_minutes,
      predicted_risk_level: finalPredictedLevel,
      predictive_state: predictiveState,
      prediction_confidence: confidenceResult.confidence,
      uncertainty_band: confidenceResult.uncertainty_band,
      prediction_status: confidenceResult.status,
      prediction_source: source,
      early_warning: earlyWarning,
      predictive_reason_codes: reasonCodes,
      feature_contributions: inference.feature_contributions,
      feature_snapshot_id: featResult.feature_snapshot_id,
      model_id: this.model.modelId,
      model_version: this.model.version,
      source_risk_state_id: `${currentRisk.worker_id}_${currentRisk.timestamp}`,
      source_observation_ids: [currentObservation.observation_id],
      policy_id: policy.policy_id,
      policy_version: policy.version,
    };

    // 10. Assemble PredictionEvent
    const predictionEvent: PredictionEvent = {
      event_id: `pevt_${Date.now()}_${workerCtx.worker_id}`,
      timestamp,
      worker_id: workerCtx.worker_id,
      site_id: siteCtx.site_id,
      event_type: earlyWarning ? 'prediction.early_warning' : 'prediction.calculated',
      prediction_status: confidenceResult.status,
      predicted_level: finalPredictedLevel,
      p_elevated_30m: inference.p_elevated_30m,
      p_critical_60m: inference.p_critical_60m,
      expected_time_to_threshold_minutes: etaResult.expected_time_to_threshold_minutes,
      early_warning: earlyWarning,
      model_id: this.model.modelId,
      model_version: this.model.version,
      feature_snapshot_id: featResult.feature_snapshot_id,
      reason_codes: reasonCodes,
    };

    return {
      predictiveState: predictiveRiskState,
      predictionEvent,
    };
  }

  public predictBatch(options: PredictBatchOptions): PredictBatchResult {
    const startTime = performance.now();
    const {
      currentObservation,
      workers,
      siteCtx,
      clusterCtx,
      currentRisks,
      policy = this.defaultPolicy,
      observationHistory = [],
      source = 'TREND_EXTRAPOLATION',
      config = DEFAULT_PREDICTION_FEATURE_CONFIG,
    } = options;

    const predictions: PredictiveRiskState[] = [];
    const events: PredictionEvent[] = [];
    const failures: Array<{ worker_id: string; error: string }> = [];

    for (const workerCtx of workers) {
      try {
        const currentRisk = currentRisks.get(workerCtx.worker_id) || {
          worker_id: workerCtx.worker_id,
          site_id: siteCtx.site_id,
          timestamp: currentObservation.timestamp,
          score: 0.1,
          level: 'GREEN' as const,
          confidence: 0.9,
          reason_codes: ['BASELINE'],
          exposure_duration_mins: workerCtx.exposure_duration_minutes,
        };

        const result = this.predictWorker({
          currentObservation,
          workerCtx,
          siteCtx,
          clusterCtx,
          currentRisk,
          policy,
          observationHistory,
          source,
          config,
        });

        predictions.push(result.predictiveState);
        events.push(result.predictionEvent);
      } catch (err: any) {
        failures.push({
          worker_id: workerCtx.worker_id,
          error: err.message || 'PREDICTION_CALCULATION_FAILED',
        });
      }
    }

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      predictions,
      events,
      failures,
      duration_ms: durationMs,
    };
  }
}
