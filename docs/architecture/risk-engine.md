# Contextual Risk Engine Architecture (Phase P2)

> **Safety Disclaimer**: Sentinel Workers is a safety-adjacent operational decision engine, not a medical diagnostic system. It computes contextual risk states and recommended operational interventions from engineering environmental and operational data, without clinical diagnosis or private medical health data.

---

## 1. Architectural Overview

The Contextual Risk Engine (`@sentinel/risk-engine`) transforms raw environmental intelligence, worker operational context, site parameters, and versioned safety policies into standardized, auditable `RiskState` assessments and SHA-256 hashed `DecisionEvent` records.

```
+-----------------------------------------------------------------------------------------+
|                                    INPUT CONTEXTS                                       |
|  - ThermalObservation (Ambient Temp, Wet Bulb, Humidity, Solar, Freshness, Source)      |
|  - WorkerRiskContext  (Role, Task Intensity, UTC Shift Window, Exposure, Recovery)      |
|  - SiteRiskContext    (Cooling Resources, Worker Capacity, Emergency Policy ID)         |
|  - ZoneClusterContext (Elevated / High / Critical Worker Density)                       |
|  - VersionedPolicy    (Scoring Weights, Risk Bands, Hard Guardrail Thresholds)          |
+---------------------------------------------+-------------------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------------+
|                                 CONTEXTUAL RISK ENGINE                                  |
|                                                                                         |
|  1. Component Normalizer:                                                               |
|     - Environment Score (0.7 * WB + 0.3 * Ambient curve)                                |
|     - Active Exposure Score (monotonic with shift elapsed time)                         |
|     - Task Intensity Score (LIGHT=0.2, MODERATE=0.5, HEAVY=0.9)                         |
|     - Zone Cluster Density (ratio of heat-stressed workers)                             |
|     - Worker Modifier Score (baseline=0.1, elevated=0.8)                                |
|     - Recovery Mitigation (subtraction based on explicit rest periods)                  |
|                                                                                         |
|  2. Scoring Formula:                                                                    |
|     Score = clamp(0.0, 1.0, w_env*E + w_exp*X + w_task*T + w_zone*Z + w_work*W - w_rec*R)|
|                                                                                         |
|  3. Hard Safety Guardrails:                                                             |
|     - Extreme Temperature Override (>= 45°C -> CRITICAL, Score >= 0.88)                 |
|     - Stale Data Quality Check -> DATA_STALE flag & confidence penalty                  |
|     - Unacknowledged Critical Escalation Check -> escalation_required = true            |
|                                                                                         |
|  4. Assessment Confidence & Uncertainty:                                                |
|     - Freshness decay, missing sensor field penalty, worker completeness                |
|                                                                                         |
|  5. Deterministic Explanation Builder:                                                  |
|     - Summary statement + human-readable evidence reasons list                          |
|                                                                                         |
|  6. State Machine:                                                                      |
|     - Enforces valid transitions, prevents oscillation, records audit history           |
+---------------------------------------------+-------------------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------------+
|                                    OUTPUT CONTRACTS                                     |
|  - RiskState    (Score, Level, Confidence, 6-Component Breakdown, Explanation, Freshness)|
|  - DecisionEvent(Auditable event with SHA-256 payload hash in SQLite store)             |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Contextual Scoring Formula & Configurable Weights

$$\text{raw\_score} = w_{\text{env}} E + w_{\text{exp}} X + w_{\text{task}} T + w_{\text{zone}} Z + w_{\text{worker}} W - w_{\text{recovery}} R$$
$$\text{score} = \max\left(0.0, \min\left(1.0, \text{raw\_score}\right)\right)$$

### Default Weights (`demo-construction-v1.json`)
- $w_{\text{env}} = 0.40$ (Environmental load)
- $w_{\text{exp}} = 0.25$ (Active shift exposure)
- $w_{\text{task}} = 0.15$ (Task metabolic intensity)
- $w_{\text{zone}} = 0.10$ (Zone cluster density)
- $w_{\text{worker}} = 0.10$ (Synthetic worker modifier)
- $w_{\text{recovery}} = 0.15$ (Explicit recovery mitigation)

---

## 3. Discrete Risk Levels & Bands

| Level | Score Range | Default Operational State |
| :--- | :---: | :--- |
| **`GREEN`** | $[0.00, 0.30)$ | Standard monitoring; normal operating limits |
| **`WATCH`** | $[0.30, 0.50)$ | Hydration schedule reminder; increased monitoring |
| **`ELEVATED`** | $[0.50, 0.70)$ | 10-minute shaded break + 500ml water advised |
| **`HIGH`** | $[0.70, 0.85)$ | Mandatory 20-minute shaded rest break required |
| **`CRITICAL`** | $[0.85, 1.00]$ | Mandatory work halt; report to AC cooling trailer |

---

## 4. Assessment Confidence & Uncertainty Modeling

Assessment confidence ($0.0 \to 1.0$) represents certainty in the input evidence:
- **Base Confidence**: `0.95`
- **Freshness Penalty**: `-0.30` for `STALE` observations (> 15m), `-0.12` for `AGING` (> 5m).
- **Sensor Field Penalties**: `-0.10` if wet bulb is missing; `-0.05` each for missing humidity or solar irradiance.
- **Worker Context Penalty**: `-0.20` if worker context is unassigned.
- **Uncertainty Reasons**: Machine-readable tags (`DATA_STALE`, `MISSING_ENVIRONMENT_FIELD`) exposed transparently to supervisors.
