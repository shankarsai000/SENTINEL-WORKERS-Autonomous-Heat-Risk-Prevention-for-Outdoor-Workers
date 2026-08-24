# Sentinel Workers — End-to-End Data Flow & Decision Loop

```
+-----------------------------------------------------------------------------------+
|                            ENVIRONMENTAL INGESTION                                |
|                                                                                   |
|  [ FortyGuard Enterprise API ]  OR  [ Deterministic Offline Simulation Engine ]   |
+------------------------------------------+----------------------------------------+
                                           |
                                           | ThermalObservation (JSON)
                                           v
+-----------------------------------------------------------------------------------+
|                        SENTINEL ORCHESTRATOR (Node.js)                            |
|                                                                                   |
|  1. Persist observation to SQLite (thermal_observations)                          |
|  2. Ingest worker exposure durations from local tracking cache                    |
|  3. Assemble WorkerContextPacket                                                  |
+------------------------------------------+----------------------------------------+
                                           |
                                           | POST /evaluate-batch
                                           v
+-----------------------------------------------------------------------------------+
|                       RISK EVALUATION SERVICE (FastAPI)                           |
|                                                                                   |
|  - Normalized Environmental Load (Ambient + Wet Bulb)                             |
|  - Accumulated Exposure Duration (mins)                                           |
|  - Task Intensity Weight (LIGHT: 0.15, MODERATE: 0.50, HEAVY: 0.90)                |
|  - Abstract Risk Modifier (baseline: 0.1, acclimatizing: 0.5, elevated: 0.8)       |
|  - Outputs RiskState (Score 0-1, Level GREEN/WATCH/ELEVATED/HIGH/CRITICAL)       |
+------------------------------------------+----------------------------------------+
                                           |
                                           | RiskStates Batch
                                           v
+-----------------------------------------------------------------------------------+
|                        POLICY GUARDRAILS & ACTION AGENT                           |
|                                                                                   |
|  - If Temp >= 45°C or Score >= 0.85 -> Mandatory STOP_WORK Override               |
|  - If Data Stale (>300s) -> Downgrade confidence & flag supervisor                |
|  - If Risk >= HIGH -> Issue MANDATORY_REST + Supervisor alert                     |
|  - If 3+ workers critical in zone -> Open Cluster Incident (deduplicated)         |
+---------------------+--------------------+--------------------+-------------------+
                      |                    |                    |
                      v                    v                    v
          +-----------------------+  +-----------+  +------------------------+
          | SQLite DB Persistence |  | Audit Log |  | Realtime WS Broadcast  |
          | (actions, incidents)  |  | (SHA-256) |  | (to React Dashboard)   |
          +-----------------------+  +-----------+  +------------------------+
```
