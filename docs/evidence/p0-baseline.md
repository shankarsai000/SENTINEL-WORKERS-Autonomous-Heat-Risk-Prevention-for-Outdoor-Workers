# Phase P0 — Baseline Evidence & Claims Audit

In compliance with the **Metrics and Claims Policy (Master Reference v2.0 Section 23)**, every claim in Sentinel Workers is strictly categorized into one of four verified evidence tiers:

| Label | Meaning | Verified P0 Baseline Performance |
| :--- | :--- | :--- |
| **`[MEASURED]`** | Directly observed and measured from the working system execution | - FastAPI Risk Evaluation Batch Latency: `< 25ms` for 100 workers.<br>- Full End-to-End Decision Loop: `< 60ms` per observation tick.<br>- Database Seeding Time: `< 120ms` for 500 workers & 5 sites. |
| **`[SIMULATED]`** | Produced by the controlled deterministic demo scenario | - 500/500 synthetic worker profiles processed per tick cycle.<br>- 100% deterministic reproducibility with PRNG Seed 42.<br>- Cluster Incident trigger fires when >= 3 workers exceed critical threshold. |
| **`[TARGET]`** | Desired future production performance | - Operational supervisor response under 2 minutes.<br>- Push notification delivery confirmation under 5 seconds. |
| **`[EXTERNAL]`** | Supported by external standards or documentation | - FortyGuard Enterprise API release notes v1.0.0.<br>- Stull (2011) Wet-Bulb Temperature Formula.<br>- OSHA / NIOSH Heat Stress Occupational Guidelines. |

## Claims Integrity Confirmation
- No claim of real medical diagnosis is made.
- No claim of preventing human fatalities is made without empirical field trials.
- Simulated delivery is explicitly labeled as `SMS_SIMULATED` and `DELIVERED_SIMULATED`.
