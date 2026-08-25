# SRE Runbook: Prediction Engine Anomaly & Fallback

## 1. What Happened?
The short-horizon risk prediction engine encountered an inference error, invalid feature tensor, or insufficient observation history ($< 3$ time steps).

## 2. How to Confirm?
1. Check `GET /api/prediction/summary`: reports `status: "DEGRADED"` or error counters increment.
2. Worker modal shows `Prediction: Accumulating data` or `Level 1 Baseline Active`.

## 3. What Does Sentinel Do Automatically?
- **Safety Dominance**: Contextual risk scoring (P2) is strictly dominant; failure of P3 prediction never suppresses or lowers an active `CRITICAL` or `HIGH` risk state.
- **Physics Baseline Fallback**: Falls back to deterministic Level 1 physics-based projection if ML inference fails.
- **Audit Logging**: Logs `PREDICTION_FAILED` with worker ID and root cause without terminating the observation loop.

## 4. Operator Action Required
- Verify whether the system was just restarted (history window requires 3 observations = 3 ticks to initialize sliding trend features).
- If persistent, check Python risk service microservice logs if enabled.

## 5. Recovery Verification
1. Step simulation forward 3 ticks to accumulate time series window.
2. Call `GET /api/prediction/summary`: Verify `status: "HEALTHY"`, `predictions_generated > 0`.
