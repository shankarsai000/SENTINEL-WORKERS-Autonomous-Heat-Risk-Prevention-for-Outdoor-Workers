# Incident Postmortem Template — Sentinel Workers

## 1. Incident Overview

| Field | Details |
| :--- | :--- |
| **Incident ID** | `INC-YYYY-MM-DD-XX` |
| **Severity** | `CRITICAL` / `HIGH` / `ELEVATED` |
| **Date & Time** | `YYYY-MM-DD HH:MM:SS UTC` |
| **Duration** | `XX minutes` |
| **Lead Investigator** | Name / Role |
| **Affected Sites/Zones**| `PHX-SITE-01` / `ZONE-A` |
| **Workers Impacted** | `XX workers` |

---

## 2. Executive Summary
Brief non-technical description of what occurred, the root cause, and how the incident was detected and resolved.

---

## 3. Timeline of Events

| Timestamp (UTC) | Event Description | Cryptographic Payload Reference / Hash |
| :--- | :--- | :--- |
| `HH:MM:SS` | Initial thermal trigger observed ($T_{\text{ambient}} > 45^\circ\text{C}$) | `obs_tick_XX` |
| `HH:MM:SS` | Spatial cluster incident detected in Zone A | `INC-XXXX` |
| `HH:MM:SS` | Action issued to workers; 1 SMS delivery failed | `act_XXXX` |
| `HH:MM:SS` | Autonomous escalation triggered to supervisor | `esc_XXXX` |
| `HH:MM:SS` | Supervisor dispatched AC rest trailer; mitigated | `audit_XXXX` |
| `HH:MM:SS` | Thermal margins restored; incident resolved | `INC-XXXX` |

---

## 4. Root Cause Analysis (5 Whys)
1. **Why did the incident escalate?**
2. **Why was delivery delayed?**
3. **Why did thermal strain accumulate?**
4. **Why was the zone particularly vulnerable?**
5. **Why was the mitigation protocol effective?**

---

## 5. What Went Well vs. What Went Wrong

### What Went Well
- Sentinel autonomous policy gate issued rest mandates within 1 tick.
- Escalation engine detected unacknowledged delivery within 5 minutes.
- Cryptographic audit trail captured 100% of state transitions.

### Where We Got Lucky / Need Improvement
- Need automated SMS retry budget tuning under poor cellular coverage.

---

## 6. Corrective & Preventative Actions

| Action Item | Owner | Priority | Target Completion | Verification Test |
| :--- | :--- | :--- | :--- | :--- |
| Tune cooling station proximity thresholds | SRE Lead | P1 | YYYY-MM-DD | `tests/safety/` |
| Add cellular fallback channel | DevOps | P2 | YYYY-MM-DD | `tests/integration/` |
