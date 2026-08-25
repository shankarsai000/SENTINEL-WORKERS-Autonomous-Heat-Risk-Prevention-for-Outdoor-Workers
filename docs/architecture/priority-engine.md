# Sentinel Workers — Deterministic Priority Engine (Phase P5)

## 1. Overview

The **Priority Engine** computes a deterministic safety score for every worker on site and assigns a strictly ordered rank (1 to $N$) and a human-readable `priority_reason`.

---

## 2. Priority Scoring Formula

The deterministic score $S$ is calculated from base safety tiers, predictive modifiers, action state, and environmental factors:

$$S = S_{\text{base}} + \Delta S_{\text{ETA}} + \Delta S_{\text{action}} + \Delta S_{\text{exposure}} + \Delta S_{\text{stale}}$$

### 2.1 Base Safety Hierarchy ($S_{\text{base}}$)
1. **`CRITICAL Current Risk`**: Base $1000$ points (`"CRITICAL CURRENT RISK"`).
2. **`HIGH Risk + Predicted Critical`**: Base $850$ points (`"HIGH RISK + PREDICTED CRITICAL IN {ETA}M"`).
3. **`HIGH Current Risk`**: Base $750$ points (`"HIGH CURRENT RISK"`).
4. **`ELEVATED + Predicted Critical`**: Base $650$ points (`"ELEVATED + PREDICTED CRITICAL"`).
5. **`ELEVATED + Predicted High (Early Warning)`**: Base $550$ points (`"PREDICTED HIGH IN {ETA}M (EARLY WARNING)"`).
6. **`WATCH + Predicted Deterioration`**: Base $450$ points (`"WATCH + PREDICTED RISE"`).
7. **`ELEVATED Current Risk`**: Base $400$ points (`"ELEVATED HEAT EXPOSURE ({duration}M)"`).
8. **`WATCH Monitoring`**: Base $200$ points (`"WATCH MONITORING"`).
9. **`GREEN Normal Baseline`**: Base $100$ points (`"BASELINE NORMAL"`).

### 2.2 Threshold ETA Modifier ($\Delta S_{\text{ETA}}$)
If a predictive threshold ETA is within $\le 60\text{ minutes}$:
$$\Delta S_{\text{ETA}} = 2 \times (60 - \text{ETA}_{\text{mins}})$$

### 2.3 Action & Acknowledgement State Modifier ($\Delta S_{\text{action}}$)
- Escalation Active: $+120\text{ points}$ (Appends `" — ESCALATION ACTIVE"`)
- Unacknowledged Action Pending: $+60\text{ points}$ (Appends `" — ACK PENDING"`)
- Delivery Failed: $+80\text{ points}$ (Appends `" — DELIVERY FAILED"`)

### 2.4 Exposure & Freshness Modifiers
- Long Exposure ($>120\text{ mins}$): $+\min\left(50, \lfloor (\text{exposure} - 120) / 4 \rfloor\right)$
- Stale Data Flag: $+30\text{ points}$ (Prompts supervisor verification)

---

## 3. Scale & Performance

- Evaluates and ranks **500 workers in $< 50\text{ms}$** (verified in `tests/integration/operations-500-workers-perf.test.ts`).
