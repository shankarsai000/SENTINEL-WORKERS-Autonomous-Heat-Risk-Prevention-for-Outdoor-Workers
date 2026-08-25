# Versioned Safety Policy Engine (Phase P2)

## 1. Overview & Separation of Concerns

In Sentinel Workers, safety thresholds and decision parameters are strictly decoupled from application code. All scoring weights, risk bands, guardrail trigger limits, and action eligibility matrices reside in validated, versioned JSON policy files.

---

## 2. Policy File Schema (`demo-construction-v1.json`)

```json
{
  "policy_id": "demo-construction-v1",
  "name": "Demo Construction Safety Policy",
  "version": "1.0.0",
  "effective_from": "2026-06-01T00:00:00.000Z",
  "risk_bands": {
    "green": { "min": 0.0, "max": 0.30 },
    "watch": { "min": 0.30, "max": 0.50 },
    "elevated": { "min": 0.50, "max": 0.70 },
    "high": { "min": 0.70, "max": 0.85 },
    "critical": { "min": 0.85, "max": 1.0 }
  },
  "scoring_weights": {
    "environment": 0.40,
    "exposure": 0.25,
    "task_intensity": 0.15,
    "zone_cluster": 0.10,
    "worker_modifier": 0.10,
    "recovery_mitigation": 0.15
  },
  "freshness_rules": {
    "fresh_max_seconds": 300,
    "aging_max_seconds": 900
  },
  "guardrails": {
    "extreme_temperature_c": 45.0,
    "extreme_apparent_temperature_c": 48.0,
    "extreme_wet_bulb_c": 31.0,
    "stale_confidence_penalty": 0.25,
    "unacknowledged_critical_escalation_mins": 15
  }
}
```

---

## 3. Security & Validation Invariants

1. **Pure Data, Zero Code Execution**: Policy files are validated with strict runtime Zod schemas. Dynamic code evaluation (`eval`, dynamic imports) is strictly prohibited.
2. **Contiguity Invariant**: Risk bands must start at `0.0`, end at `1.0`, and each band boundary must match adjacent bands without gaps or overlaps.
3. **Monotonicity Invariant**: Task intensity weights must strictly satisfy $\text{LIGHT} \le \text{MODERATE} \le \text{HEAVY}$.
4. **Freshness Invariant**: $\text{fresh\_max\_seconds} < \text{aging\_max\_seconds}$.
