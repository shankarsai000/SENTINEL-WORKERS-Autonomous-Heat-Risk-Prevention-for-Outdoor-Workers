# Sentinel Workers — Full System Audit & Inventory (Phase P6)

## 1. Executive Summary

This document establishes the authoritative system audit and component inventory for **Sentinel Workers** across all services, packages, interfaces, data stores, background routines, and external integration points.

Each component is classified based on its operational safety impact if it fails:
- **`CRITICAL`**: Immediate safety breach, worker data corruption, or policy bypass.
- **`HIGH`**: Degrades risk evaluation, action dispatch, or supervisor situational awareness.
- **`MEDIUM`**: Non-blocking operational degradation with automated fallback available.
- **`LOW`**: Telemetry cosmetic or optional non-critical analytics.

---

## 2. Service Inventory

| Service Name | Location | Primary Responsibility | Criticality | Failure Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Sentinel API Server** | `apps/api/` | REST APIs, SQLite state, WebSocket broker, Orchestration | **CRITICAL** | Total loss of monitoring and action loop |
| **Contextual Risk Engine** | `packages/risk/` | P2 worker contextual heat-risk evaluation | **CRITICAL** | Workers at risk remain undetected |
| **Action Planner & Policy Gate** | `packages/actions/` | P4 safety-constrained intervention decisions | **CRITICAL** | Automated rest/cooling mitigations fail |
| **Incident Clustering Engine** | `apps/api/src/services/incident-engine.ts` | P5 spatial incident aggregation & lifecycle | **HIGH** | Supervisors miss zone-level heat clusters |
| **Priority Ranking Engine** | `apps/api/src/services/priority-engine.ts` | P5 multi-factor safety queue ordering | **HIGH** | Triage queue ordering becomes unordered |
| **Short-Horizon Risk Predictor** | `packages/prediction/` | P3 30m/60m breach probability & threshold ETA | **MEDIUM** | Early warnings lost; falls back to P2 |
| **FortyGuard API Provider** | `packages/fortyguard-provider/` | P1 hyperlocal microclimate data ingestion | **MEDIUM** | Hyperlocal deltas lost; falls back to simulation |
| **Offline Simulation Engine** | `packages/simulation/` | Deterministic Phoenix heatwave scenario replay | **MEDIUM** | Demo replay stalls |
| **Supervisor Operations Console** | `apps/dashboard/` | React frontend for triage & telemetry | **HIGH** | Supervisor cannot view or override actions |
| **Audit Service** | `apps/api/src/services/audit-service.ts` | Cryptographic SHA-256 event chaining | **CRITICAL** | Compliance and audit trail broken |

---

## 3. Dependency Inventory

### Core Production Dependencies
- **`better-sqlite3`** (`^11.8.1`): Synchronous embedded SQLite database engine. (Impact: `CRITICAL`)
- **`express`** (`^4.21.2`): HTTP API web server framework. (Impact: `CRITICAL`)
- **`ws`** (`^8.18.0`): WebSocket server for real-time dashboard events. (Impact: `HIGH`)
- **`zod`** (`^3.24.1`): Schema validation and contract enforcement. (Impact: `CRITICAL`)
- **`pino`** (`^9.6.0`): High-performance structured JSON logging. (Impact: `HIGH`)
- **`cors`** (`^2.8.5`): Cross-Origin Resource Sharing control. (Impact: `HIGH`)
- **`dotenv`** (`^16.4.7`): Environment configuration loader. (Impact: `MEDIUM`)

### Development & Verification Dependencies
- **`vitest`** (`^3.0.4`): Test runner across 45 suites (165 tests).
- **`typescript`** (`^5.7.3`): Static typing and workspace build orchestration.
- **`vite`** (`^6.4.3`): Frontend bundler.

---

## 4. API Endpoint Inventory

| Endpoint | Method | Role Required | Rate Limit | Classification | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/health` | GET | Any | 100/min | `LOW` | Basic service status |
| `/api/health/live` | GET | Any | 100/min | `LOW` | Process liveness probe |
| `/api/health/ready` | GET | Any | 100/min | `MEDIUM` | Service readiness probe |
| `/api/health/dependencies` | GET | Any | 60/min | `MEDIUM` | Dependency health check |
| `/api/metrics` | GET | Any | 60/min | `LOW` | Internal telemetry counters |
| `/api/sites` | GET | Any | 100/min | `LOW` | Site configurations |
| `/api/workers` | GET | Any | 100/min | `MEDIUM` | Active worker directory |
| `/api/risk/summary` | GET | Any | 100/min | `HIGH` | Contextual risk summary |
| `/api/risk/workers` | GET | Any | 100/min | `HIGH` | Contextual risk per worker |
| `/api/prediction/summary` | GET | Any | 100/min | `MEDIUM` | Prediction telemetry |
| `/api/prediction/workers` | GET | Any | 100/min | `MEDIUM` | Short-horizon predictions |
| `/api/actions` | GET | Any | 100/min | `HIGH` | Action stream query |
| `/api/actions/execute` | POST | OPERATOR / SUPERVISOR | 30/min | `CRITICAL` | Safety action execution |
| `/api/actions/:id/ack` | POST | OPERATOR / SUPERVISOR | 60/min | `CRITICAL` | Worker / supervisor action ack |
| `/api/actions/:id/override` | POST | SUPERVISOR | 30/min | `CRITICAL` | Action supervisor override |
| `/api/incidents` | GET | Any | 100/min | `HIGH` | Spatial incident list |
| `/api/incidents/:id/ack` | POST | OPERATOR / SUPERVISOR | 60/min | `HIGH` | Incident acknowledgement |
| `/api/incidents/:id/assign` | POST | OPERATOR / SUPERVISOR | 60/min | `HIGH` | Incident owner assignment |
| `/api/incidents/:id/mitigate` | POST | OPERATOR / SUPERVISOR | 60/min | `HIGH` | Start mitigation protocol |
| `/api/incidents/:id/escalate` | POST | SUPERVISOR | 30/min | `CRITICAL` | Manual incident escalation |
| `/api/incidents/:id/resolve` | POST | SUPERVISOR | 30/min | `CRITICAL` | Supervised incident closure |
| `/api/operations/summary` | GET | Any | 100/min | `HIGH` | 5-second operational ribbon |
| `/api/operations/priority` | GET | Any | 100/min | `HIGH` | Ranked priority queue |
| `/api/operations/map` | GET | Any | 100/min | `HIGH` | Spatial map & zones |
| `/api/events` | GET | Any | 100/min | `HIGH` | Audit events log query |
| `/api/fortyguard/fetch-site-observation` | POST | Any | 20/min | `MEDIUM` | Provider heatmap fetch |
| `/api/simulation/step` | POST | OPERATOR / SUPERVISOR | 120/min | `MEDIUM` | Advance simulation tick |
| `/api/simulation/reset` | POST | OPERATOR / SUPERVISOR | 20/min | `MEDIUM` | Reset simulation state |
| `/api/dev/faults` | GET/POST | Dev Only | None | `CRITICAL` | Injected fault management |
| `/api/dev/reset` | POST | Dev Only | None | `CRITICAL` | Development data reset |

---

## 5. Database Inventory (SQLite)

| Table Name | Criticality | Records | Primary Key | Key Foreign Keys |
| :--- | :--- | :--- | :--- | :--- |
| `sites` | `HIGH` | Configured job sites | `site_id` | — |
| `workers` | `CRITICAL` | Worker profiles & consent | `worker_id` | `site_id` $\to$ `sites` |
| `thermal_observations` | `HIGH` | Environmental observations | `observation_id` | `site_id` $\to$ `sites` |
| `risk_states` | `CRITICAL` | P2 contextual risk calculations | `(worker_id, timestamp)` | `worker_id` $\to$ `workers` |
| `predictive_risk_states`| `HIGH` | P3 short-horizon predictions | `prediction_id` | `worker_id` $\to$ `workers` |
| `actions` | `CRITICAL` | P4 interventions & lifecycles | `action_id` | `worker_id` $\to$ `workers` |
| `action_deliveries` | `HIGH` | SMS simulated dispatch records | `delivery_id` | `action_id` $\to$ `actions` |
| `action_acknowledgements`| `HIGH` | Worker/supervisor acks | `ack_id` | `action_id` $\to$ `actions` |
| `escalations` | `CRITICAL` | Deadline breach escalations | `escalation_id` | `action_id` $\to$ `actions` |
| `incidents` | `HIGH` | P5 spatial risk clusters | `incident_id` | `site_id` $\to$ `sites` |
| `audit_events` | `CRITICAL` | Immutable SHA-256 hash chain | `event_id` | `payload_ref` |
| `api_usage` | `LOW` | FortyGuard API credit logs | `id` | — |

---

## 6. External Provider & Secrets Inventory

| Provider / Credential | Env Variable | Sensitivity | Required in Offline Mode? |
| :--- | :--- | :--- | :--- |
| FortyGuard API Key | `FORTYGUARD_API_KEY` | `CRITICAL` | No (Clean offline fallback) |
| FortyGuard Base URL | `FORTYGUARD_API_BASE_URL` | `LOW` | No |
| Risk Service Microservice URL | `RISK_SERVICE_URL` | `MEDIUM` | No (In-process TS fallback) |
| Simulated SMS Gateway | `SMS_SIMULATED_KEY` | `LOW` | No (In-memory mock) |

---

## 7. Background Jobs & Loops

1. **Simulation Auto-Ticking (`simulation.ts`)**:
   - Ticks scenario forward at `speedMultiplier` (1x to 20x).
   - Bounds: Safe timeout clearance on pause/stop/reset.
2. **Action Acknowledgement Deadline Poller (`orchestrator.ts`)**:
   - Checks `ACK_PENDING` actions against `ack_deadline`.
   - Bounded execution per tick; auto-escalates expired actions to `escalations`.
3. **FortyGuard Async Poller (`poller.ts`)**:
   - Polls activity status with maximum 30 attempts at exponential backoff.
   - Bounded by 45s hard timeout; never loops infinitely.

---

## 8. WebSocket Event Flows

| Event Name | Direction | Payload Type | Authoritative Source |
| :--- | :--- | :--- | :--- |
| `SIMULATION_STATUS` | Server $\to$ Client | `SimulationState` | SQLite / Engine |
| `OBSERVATION_INGESTED` | Server $\to$ Client | `ThermalObservation` | SQLite `thermal_observations` |
| `RISK_STATE_UPDATE` | Server $\to$ Client | `RiskState` | SQLite `risk_states` |
| `PREDICTION_UPDATE` | Server $\to$ Client | `PredictiveRiskState` | SQLite `predictive_risk_states` |
| `ACTION_EVENT` | Server $\to$ Client | `Action` | SQLite `actions` |
| `INCIDENT_EVENT` | Server $\to$ Client | `Incident` | SQLite `incidents` |

---

## 9. Security-Sensitive Paths & Failure Points

1. **Action Overrides & Policy Exceptions**: Must require `SUPERVISOR` role and mandatory text rationale. Cannot bypass `STOP_WORK` rules.
2. **Incident Closure**: Must require `SUPERVISOR` role and explicit justification note.
3. **Dev Endpoints (`/api/dev/*`)**: Must be disabled when `NODE_ENV === 'production'`.
4. **Data Stale / Missing Anomaly**: Stale data ($>15\text{m}$) must trigger confidence penalty and downgrade discretionary actions.
