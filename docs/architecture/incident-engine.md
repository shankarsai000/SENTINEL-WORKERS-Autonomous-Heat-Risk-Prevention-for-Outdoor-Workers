# Sentinel Workers — Incident Clustering Engine & State Machine (Phase P5)

## 1. Overview

The **Incident Clustering Engine** converts individual worker risk states and predictive trajectories into actionable operational incidents. Rather than overwhelming supervisors with 50 individual alerts, Sentinel aggregates co-located workers into spatial incidents.

---

## 2. Clustering Criteria & Deduplication

### 2.1 Trigger Criteria
A spatial incident is triggered when:
- $\ge 2$ workers located in the same `zone_id` reach $\text{RiskLevel} \in \{\text{ELEVATED}, \text{HIGH}, \text{CRITICAL}\}$ OR exhibit predicted critical deterioration within 30 minutes.

### 2.2 Deduplication Invariant
If an active incident already exists for a `(site_id, zone_id)` pair, the engine **updates** the existing incident (updating `affected_worker_count`, `worker_ids`, `severity`, `common_factors`, `action_summary`, and `confidence`) instead of creating a duplicate incident.

### 2.3 Auto-Resolution
When thermal loads drop and all workers in the zone return to `GREEN` (safe thermal margins), the engine automatically transitions the incident to `RESOLVED` with the auto-resolution justification: `"Auto-resolved: All workers in zone recovered to safe thermal margins."`

---

## 3. Common Factor Extraction

The engine evaluates whether common contributing factors explain the cluster:
- **`ZONE_CLUSTER`**: Minimum $\ge 2$ workers in the zone.
- **`HIGH_TASK_INTENSITY`**: Extracted if $\ge 40\%$ of affected workers perform heavy/moderate labor.
- **`LONG_EXPOSURE`**: Extracted if $\ge 40\%$ of affected workers exceed 120 minutes of continuous heat exposure.
- **`RISING_THERMAL_TREND`**: Extracted if $\ge 30\%$ of workers have active early warning predictions.

---

## 4. Incident State Machine

```
              ┌───────────────┐
              │   DETECTED    │
              └───────┬───────┘
                      │ (Ack / Triage)
                      ▼
              ┌───────────────┐
              │    TRIAGED    │
              └───────┬───────┘
                      │ (Assign / Start Mitigation)
                      ▼
              ┌───────────────┐
              │    ACTIVE     │◄───────────────┐
              └───────┬───────┘               │ (Reopen on relapse)
                      │ (Dispatch Protocols)  │
                      ▼                       │
              ┌───────────────┐               │
              │  MITIGATING   │               │
              └───────┬───────┘               │
                      │ (Resolution / Auto)   │
                      ▼                       │
              ┌───────────────┐               │
              │   RESOLVED    ├───────────────┘
              └───────┬───────┘
                      │ (Post-Shift Close)
                      ▼
              ┌───────────────┐
              │    CLOSED     │
              └───────────────┘
```

### Transition Validation Rules:
- Direct mutation to `RESOLVED` requires supervisor role authorization and mandatory text explanation.
- Invalid state transitions (e.g. `CLOSED` $\to$ `MITIGATING`) throw a deterministic `Error`.
