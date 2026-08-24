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
                                   (or Offline Replay Engine)
                                              |
                                              | ThermalObservation
                                              v
+-----------------------------------------------------------------------------------------+
|                               SENTINEL ORCHESTRATOR                                     |
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

- **Backend API & Orchestrator**: Node.js, TypeScript, Express, SQLite (`better-sqlite3`), WebSockets (`ws`).
- **Risk Assessment Service**: Python 3.14, FastAPI, Pydantic, Uvicorn.
- **Operations Console Dashboard**: React, Vite, TypeScript, Lucide Icons, Vanilla CSS design system.
- **Testing**: Vitest for TypeScript monorepo, Pytest for Python risk service.
- **Infrastructure**: Docker, Docker Compose.

---

## 4. Repository Structure

```
sentinel-workers/
├── apps/
│   ├── api/                  # Express REST API, SQLite store & Orchestrator
│   ├── dashboard/            # React Vite Operations Console UI
│   └── risk-service/         # Python FastAPI deterministic risk engine
├── packages/
│   ├── policy/               # OSHA/NIOSH thermal policies & safety guardrails
│   ├── schemas/              # Shared TypeScript & runtime Zod contracts
│   └── simulation/           # Offline deterministic simulation engine & PRNG
├── providers/
│   └── fortyguard/           # FortyGuard Enterprise async API provider adapter
├── data/
│   ├── scenarios/            # Phoenix 12-hour heatwave scenario profile
│   └── synthetic-workers/    # 500 deterministic synthetic workers
├── docs/
│   ├── architecture/         # System overview and data-flow specifications
│   ├── demo/                 # Offline demo walkthrough script
│   └── evidence/             # Baseline benchmark metrics & claims audit
├── infra/
│   └── docker/               # Multi-stage Dockerfiles for API, UI, Risk Service
├── tests/
│   ├── unit/                 # Workers determinism, Simulation physics, Guardrails
│   └── integration/          # REST API health and full closed-loop e2e pipeline
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## 5. Quickstart & Local Development

### Option A: One-Command Docker Compose (Recommended)

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

3. **Start All Services Concurrently**:
   ```bash
   npm run dev
   ```

---

## 6. Running the Automated Test Suite

Run the full TypeScript and Python test suite:

```bash
# 1. Run all TypeScript unit and integration tests
npm test

# 2. Run Python Risk Service unit tests
python -m pytest apps/risk-service/tests

# 3. Run individual test suites
npm run test:workers       # 500 synthetic worker determinism test
npm run test:policy        # Policy threshold & guardrail safety test
npm run test:simulation    # Simulation physics & Stull wet-bulb formula test
npm run test:api           # REST API health & capability endpoints
npm run test:e2e           # Full closed-loop end-to-end integration pipeline
```

---

## 7. Operational API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and database connectivity |
| `GET` | `/api/system/capabilities` | System capabilities and active feature flags |
| `GET` | `/api/sites` | List of 5 configurable Phoenix construction sites |
| `GET` | `/api/workers?site_id=...` | List 500 synthetic workers (with site filtering) |
| `GET` | `/api/risk/summary` | Realtime distribution counts (GREEN, WATCH, ELEVATED, HIGH, CRITICAL) |
| `GET` | `/api/risk/workers` | Ranked worker list with latest risk states and metadata |
| `GET` | `/api/events` | Cryptographic SHA-256 audit log trail |
| `GET` | `/api/incidents` | Clustered site heat stress incidents |
| `POST` | `/api/simulation/start` | Start/Resume the 12-hour Phoenix heatwave replay |
| `POST` | `/api/simulation/pause` | Pause simulation clock |
| `POST` | `/api/simulation/step` | Advance simulation by 15-minute increment |
| `POST` | `/api/simulation/speed` | Set speed multiplier (1x, 2x, 5x, 10x) |
| `POST` | `/api/actions/:id/ack` | Supervisor acknowledgement of an action |
| `POST` | `/api/actions/:id/override` | Supervisor override with reason capture |
| `GET` | `/api/fortyguard/usage` | FortyGuard adapter status and credit metrics |
| `WS` | `/ws` | Realtime WebSocket event stream |

---

## 8. Safety & Claims Integrity

- **No Medical Claims**: Abstract risk modifiers only (`baseline`, `elevated`, `acclimatizing`).
- **Deterministic Guardrails**: Hard temperature limits (`>= 45°C`) automatically enforce `STOP_WORK` regardless of model scoring.
- **Evidence Integrity**: All performance metrics are labeled `[MEASURED]`, `[SIMULATED]`, `[TARGET]`, or `[EXTERNAL]` in `docs/evidence/p0-baseline.md`.
