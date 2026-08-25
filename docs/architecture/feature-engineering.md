# Sentinel Workers: Predictive Feature Engineering Specification (Phase P3)

## 1. Feature Representation Contract

Sentinel Workers' Short-Horizon Predictive Engine transforms historical observation sequences and contextual worker attributes into a standardized 8-dimensional normalized feature vector $x \in \mathbb{R}^8$:

$$x = \begin{bmatrix} x_1 \\ x_2 \\ x_3 \\ x_4 \\ x_5 \\ x_6 \\ x_7 \\ x_8 \end{bmatrix} = \begin{bmatrix} \text{Current P2 Risk Score} \\ \text{Environmental Trend Rate} \\ \text{Projected Active Exposure (+30m)} \\ \text{Task Intensity Weight} \\ \text{Recent Recovery Factor} \\ \text{Zone Cluster Density} \\ \text{Worker Risk Modifier} \\ \text{Projected Effective Heat Load (+60m)} \end{bmatrix}$$

---

## 2. Mathematical Formulations & Normalization

| Feature Index | Feature Name | Raw Formula | Normalized Domain | Description |
| :--- | :--- | :--- | :--- | :--- |
| **$x_1$** | `x1_current_risk_score` | $R_0 \in [0.0, 1.0]$ | $[0.0, 1.0]$ | Contextual baseline risk score evaluated by P2 engine. |
| **$x_2$** | `x2_env_trend_rate` | $\frac{dT}{dt} = \frac{T_t - T_{t-30m}}{30}$ | $[-1.0, 1.0]$ | Thermal rate of change, normalized such that $\pm 0.10^\circ\text{C}/\text{min} \to \pm 1.0$. |
| **$x_3$** | `x3_projected_exposure_30m` | $\min(360, \text{exp}_0 + \Delta t_{30})$ | $[0.0, 1.0]$ | Active cumulative shift exposure projected at $+30\text{m}$, bounded by remaining shift time and normalized to $6\text{h}$ ($360\text{m}$). |
| **$x_4$** | `x4_task_intensity` | $W_{\text{task}}(\text{intensity})$ | $[0.0, 1.0]$ | Monotonic task intensity weight from active safety policy (`LIGHT`: $0.2$, `MODERATE`: $0.5$, `HEAVY`: $0.9$, `VERY_HEAVY`: $1.0$). |
| **$x_5$** | `x5_recovery_factor` | $\frac{\text{recovery\_mins}}{60}$ | $[0.0, 1.0]$ | Recent continuous shaded rest or AC cooling mitigation. |
| **$x_6$** | `x6_zone_density` | $\frac{\text{elevated} + \text{high} + \text{critical}}{\text{active\_workers}}$ | $[0.0, 1.0]$ | Spatial cluster density of heat-stressed workers in the same geographic zone. |
| **$x_7$** | `x7_worker_modifier` | $W_{\text{mod}}(\text{modifier})$ | $[0.0, 1.0]$ | Synthetic worker individual modifier (`acclimatized_new`: $0.15$, `chronic_dehydration_history`: $0.20$, `baseline`: $0.05$). |
| **$x_8$** | `x8_projected_env_load_60m` | $0.7 \cdot \text{WB}_{60} + 0.3 \cdot T_{60}$ | $[0.0, 1.0]$ | Projected effective temperature at $+60\text{m}$, scaled $25^\circ\text{C} \to 45^\circ\text{C}$. |

---

## 3. History Window Validation Invariant

Sentinel Workers requires at least **3 observations across a 60-minute window** before executing model inference:
- $N_{\text{obs}} \ge 3$ within $t_{\text{current}} - 60\text{m}$.
- If $N_{\text{obs}} < 3$:
  - `prediction_status = 'INSUFFICIENT_DATA'`
  - `p_elevated_30m = null`
  - `p_critical_60m = null`
  - `expected_time_to_threshold_minutes = null`
  - `prediction_confidence = 0.0`

Fabricating probabilities on insufficient observations is strictly prohibited by Sentinel Safety Invariant #5.

---

## 4. Deterministic Feature Snapshot Identifier

To guarantee 100% auditable provenance, every feature extraction produces a deterministic SHA-256 hash:

$$\text{feature\_snapshot\_id} = \text{sha256}(\text{worker\_id} \,\|\, t \,\|\, \text{canonical\_json}(x))[0:16]$$
