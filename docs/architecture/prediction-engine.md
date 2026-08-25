# Sentinel Workers: Short-Horizon Predictive Risk Architecture (Phase P3)

## 1. Executive Summary

Phase P3 extends Sentinel Workers' deterministic contextual risk engine (Phase P2) with explainable, calibrated, short-horizon predictive risk intelligence.

While P2 evaluates **current risk** ("Who is at risk right now?"), P3 evaluates **predictive trajectory** ("Who is likely to reach elevated, high, or critical risk within the next 30 to 60 minutes?").

```
                                    ┌────────────────────────┐
                                    │  Thermal Observation   │
                                    │  + 60m Sliding History │
                                    └───────────┬────────────┘
                                                │
                                                ▼
                                    ┌────────────────────────┐
                                    │  Feature Engineering   │
                                    │  (8-dim Feature Vector)│
                                    └───────────┬────────────┘
                                                │
                                                ▼
                                    ┌────────────────────────┐
                                    │ Model Inference Engine │
                                    │ (Logistic & Baseline)  │
                                    └───────────┬────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
    ┌─────────────────────────┐                                   ┌─────────────────────────┐
    │     Probability &       │                                   │  Threshold Estimator    │
    │  Trajectory Horizons    │                                   │     (Lead-Time ETA)     │
    │ P(Elevated, 30m)        │                                   │ Expected mins to breach │
    │ P(Critical, 60m)        │                                   └────────────┬────────────┘
    └────────────┬────────────┘                                                │
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                │
                                                ▼
                                    ┌────────────────────────┐
                                    │ Safety Dominance Gate  │
                                    │ (P2 CRITICAL dominates)│
                                    └───────────┬────────────┘
                                                │
                                                ▼
                                    ┌────────────────────────┐
                                    │  Predictive Risk State │
                                    │  & Early Warning Event │
                                    └────────────────────────┘
```

---

## 2. Core Prediction Objectives & Contracts

1. **Probability Horizons**:
   - `p_elevated_30m`: Model-estimated probability of the worker transitioning to or remaining in an `ELEVATED` risk state within 30 minutes ($0.0 \le P \le 1.0$).
   - `p_critical_60m`: Model-estimated probability of the worker transitioning to or remaining in a `CRITICAL` risk state within 60 minutes ($0.0 \le P \le 1.0$).
2. **Threshold ETA**:
   - `expected_time_to_threshold_minutes`: Number of minutes until the worker's projected risk score reaches the configured policy boundary of the next severity level (e.g. $0.50$ for `ELEVATED`, $0.70$ for `HIGH`, $0.85$ for `CRITICAL`).
   - Returns `null` if trajectory is non-escalating or threshold is unreachable within the shift.
3. **Operational Early Warning**:
   - `early_warning = true` when model predicts risk deterioration $(\ge \text{ELEVATED})$ before hard emergency thresholds are breached in the current state.
4. **Explainability & Attribution**:
   - Every prediction includes signed `feature_contributions` and standardized `predictive_reason_codes` (e.g., `RISING_THERMAL_TREND`, `LONG_EXPOSURE_ACCUMULATION`, `HEAVY_TASK_INTENSITY`).
5. **Prediction Confidence & Uncertainty**:
   - `prediction_confidence`: $0.0 \to 1.0$ confidence score reflecting data freshness, historical observation density, and sensor completeness.
   - `uncertainty_band`: Categorized as `LOW`, `MEDIUM`, or `HIGH`.

---

## 3. Strict Safety Invariant

> **CRITICAL RULE**: Prediction NEVER overrides deterministic safety guardrails.
> - A low predicted probability CANNOT downgrade an active `CRITICAL` current-risk state.
> - A prediction can trigger early proactive breaks, but cannot disable hard emergency stop-work rules.
> - Insufficient history or stale data forces `INSUFFICIENT_DATA` or `STALE_DATA` status rather than fabricating probabilities.
