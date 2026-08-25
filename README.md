# SENTINEL WORKERS
### Autonomous Heat-Risk Prevention for Outdoor Workers
**FortyGuard Hackathon 2026 — Master Build Reference v2.0**

---

## 1. Executive Summary

FortyGuard detects hyperlocal heat conditions. **Sentinel Workers** converts that temperature intelligence into contextual worker-risk decisions, predictive interventions, supervisor actions, and auditable operational workflows.

The system closes the operational safety loop:
$$\text{Observe} \longrightarrow \text{Contextualize} \longrightarrow \text{Predict} \longrightarrow \text{Decide} \longrightarrow \text{Act} \longrightarrow \text{Verify} \longrightarrow \text{Learn}$$

---

## 2. System Architecture

```
                       [ FORTYGUARD ENTERPRISE API ]
                          (v1.0.0 Asynchronous Task)
                                     |
                                     | POST /v1/heatmap (api-key header)
                                     v
                       [ Asynchronous activity_id ]
                                     |
                                     | GET /v1/status/{activity_id} (Bounded Polling)
                                     v
                       [ Normalized ThermalObservation ]
                          (source: fortyguard | cache | sim)
                                     |
                                     v
+-----------------------------------------------------------------------------------------+
|                               SENTINEL ORCHESTRATOR                                     |
|  - Data Modes: "offline" (Replay), "fortyguard" (Live API), "hybrid" (Auto Failover)   |
|  - Ingests thermal observations (Temp, Wet Bulb, Solar Irradiance)                      |
|  - Joins worker context (Role, Task Intensity, Exposure Duration, Risk Modifier)        |
+---------------------------------------------+-------------------------------------------+
                                              |
                                              | POST /evaluate-batch
                                              v
+-----------------------------------------------------------------------------------------+
|                            PYTHON FASTAPI RISK SERVICE                                  |
|  - Deterministic contextual scoring engine                                              |
|  - Outputs RiskState (GREEN, WATCH, ELEVATED, HIGH, CRITICAL) + Reason Codes            |
+---------------------------------------------+-------------------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------------+
|                            POLICY GUARDRAILS & ACTION AGENT                             |
|  - Deterministic safety gates (extreme condition override, data freshness rules)        |
|  - Dispatches targeted interventions (Hydration, Shaded Break, Mandatory Rest, Stop)   |
|  - Deduplicates zone spikes into single Supervisor Cluster Incidents                    |
+----------------------+----------------------+---------------------+---------------------+
                       |                      |                     |
                       v                      v                     v
            [ SQLite Persistence ]     [ SHA-256 Audit ]    [ Realtime WebSocket ]
                                                                    |
                                                                    v
                                                        [ Operations Console UI ]
```

---

## 3. Technology Stack

- **Environmental Intelligence**: FortyGuard Enterprise API (v1.0.0), Asynchronous Task Polling, Semantic Cache.
- **Backend API & Orchestrator**: Node.js 22, TypeScript, Express, SQLite (`better-sqlite3`), WebSockets (`ws`).
- **Risk Assessment Service**: Python 3.14, FastAPI, Pydantic, Uvicorn.
- **Operations Console Dashboard**: React 18, Vite, TypeScript, Lucide Icons, Vanilla CSS design system.
- **Testing**: Vitest for TypeScript monorepo, Pytest for Python risk service.
- **Infrastructure**: Docker, Docker Compose.

---

## 4. Repository Structure

```
sentinel-workers/
├── apps/
│   ├── api/                  # Express REST API, SQLite store & Orchestrator
│   ├── dashboard/            # React Vite Operations Console UI (Data provenance badges)
│   └── risk-service/         # Python FastAPI deterministic risk engine
├── packages/
│   ├── policy/               # OSHA/NIOSH thermal policies & safety guardrails
│   ├── schemas/              # Shared TypeScript & runtime Zod contracts
│   └── simulation/           # Offline deterministic simulation engine & PRNG
├── providers/
│   └── fortyguard/           # FortyGuard client, poller, cache, normalizer, capabilities
├── data/
│   ├── scenarios/            # Phoenix 12-hour heatwave scenario profile
│   └── synthetic-workers/    # 500 deterministic synthetic workers
├── docs/
│   ├── architecture/         # System overview, data-flow, and fortyguard-integration specs
│   ├── demo/                 # Offline and live demo walkthrough scripts
│   └── evidence/             # Baseline benchmark metrics & claims audit (p0 & p1)
├── infra/
│   └── docker/               # Multi-stage Dockerfiles for API, UI, Risk Service
├── tests/
│   ├── fixtures/fortyguard/  # Official FortyGuard request/response contract JSONs
│   ├── unit/                 # Workers, Simulation, Guardrails, Client, Poller, Cache, Security
│   └── integration/          # API health, Full pipeline, Hybrid fallback, Gated live test
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## 5. Quickstart & Local Development

### Option A: One-Command Docker Compose

```bash
docker compose up --build
```

- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:3001](http://localhost:3001)
- **Risk Service**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Option B: Local Monorepo Startup

1. **Install Node Dependencies**:
   ```bash
   npm install
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r apps/risk-service/requirements.txt
   ```

3. **Build Packages & Start All Services**:
   ```bash
   npm run build
   npm run dev
   ```

---

## 6. Running the Automated Test Suite

Run the full TypeScript and Python test suite:

```bash
# 1. Run all TypeScript unit and integration tests (including FortyGuard mock suite)
npm test

# 2. Run Python Risk Service unit tests
python -m pytest apps/risk-service/tests

# 3. Run FortyGuard specific unit and security tests
npm run test:fortyguard

# 4. Optional: Run live FortyGuard integration test (requires API key)
RUN_FORTYGUARD_LIVE_TESTS=true FORTYGUARD_API_KEY=your_key npm test tests/integration/fortyguard-live.test.ts
```

---

## 7. Operational API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and database connectivity |
| `GET` | `/api/system/capabilities` | System capabilities and FortyGuard capability discovery |
| `GET` | `/api/sites` | List of 5 configurable Phoenix construction sites |
| `GET` | `/api/workers?site_id=...` | List 500 synthetic workers (with site filtering) |
| `GET` | `/api/risk/summary` | Realtime distribution counts, average confidence, and clusters |
| `GET` | `/api/risk/workers` | Ranked worker list with 6-factor component scores and explanations |
| `GET` | `/api/risk/workers/:workerId` | Deep worker detail with audit trail and historical risk states |
| `GET` | `/api/risk/policies` | Active versioned safety policy configurations |
| `GET` | `/api/risk/events` | Decision events and policy evaluation audit logs |
| `GET` | `/api/risk/config` | Active scoring weights, risk bands, and guardrail limits |
| `GET` | `/api/events` | Cryptographic SHA-256 audit log trail |
| `GET` | `/api/incidents` | Clustered site heat stress incidents |
| `GET` | `/api/fortyguard/status` | FortyGuard adapter status, masked key, and cache metrics |
| `GET` | `/api/fortyguard/usage` | Detailed API usage log and estimated credit tracking |
| `POST` | `/api/fortyguard/test-connection` | Safe development connection and capability test |
| `POST` | `/api/fortyguard/mode` | Switch data mode (`offline`, `fortyguard`, `hybrid`) |
| `POST` | `/api/fortyguard/fetch-site-observation` | Fetch provider observation for a specific site |
| `POST` | `/api/simulation/start` | Start/Resume the 12-hour Phoenix heatwave replay |
| `POST` | `/api/simulation/pause` | Pause simulation clock |
| `POST` | `/api/simulation/step` | Advance simulation by 15-minute increment |
| `POST` | `/api/actions/:id/ack` | Supervisor acknowledgement of an action |
| `POST` | `/api/actions/:id/override` | Supervisor override with reason capture |
| `WS` | `/ws` | Realtime WebSocket event stream |

---

## 8. Safety & Claims Integrity

- **No Medical Claims**: Abstract risk modifiers only (`baseline`, `elevated`, `acclimatizing`).
- **Deterministic Guardrails**: Hard temperature limits (`>= 45°C`) automatically enforce `STOP_WORK` regardless of model scoring.
- **Provider Decoupling**: FortyGuard is the environmental substrate; Sentinel is the decision system.
- **Evidence Integrity**: All performance metrics are labeled `[MEASURED]`, `[SIMULATED]`, `[TARGET]`, or `[EXTERNAL]` in `docs/evidence/`.
