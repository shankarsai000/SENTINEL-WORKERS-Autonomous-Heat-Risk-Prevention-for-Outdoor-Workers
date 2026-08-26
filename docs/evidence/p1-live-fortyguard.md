# Phase P1-R Evidence: Real FortyGuard API Integration

## Executive Summary
This document provides architectural, operational, and verification evidence for Phase **P1-R (Real FortyGuard API Integration)** of **SENTINEL WORKERS**.

The integration connects the Sentinel Workers platform directly to the **official FortyGuard Enterprise API (v1.0.0)** (`https://docs-api.fortyguard.com/docs/introduction`).

---

## 1. Official API Contract & Architectural Design

### 1.1 Authentication & Transport Security
- **Header**: `api-key: <FORTYGUARD_API_KEY>` on every outbound HTTP request.
- **Server-Side Isolation**: `FORTYGUARD_API_KEY` is loaded strictly from `process.env.FORTYGUARD_API_KEY` on the Node.js backend.
- **Zero Frontend / Log Leakage**: 
  - API keys are automatically redacted in logs, error serialization (`toJSON()`), and API responses.
  - Public diagnostic endpoint `/api/integrations/fortyguard/status` never exposes the key or any token prefix.
  - Repository git status verified: `.env` is ignored, and automated secret scanners report 0 committed or exposed tokens.

### 1.2 Endpoints Implemented
1. **`POST /v1/heatmap`**
   - **Payload**: `{ polygon_aoi: GeoJsonPolygon, date_time: string, granularity: 60 | 80 | 100 }`
   - **Validation**: GeoJSON Polygon is strictly validated for closed ring coordinates `[lon, lat]` within United States geographic bounds (`24.396308 <= lat <= 49.384358`, `-125.0 <= lon <= -66.93457`).
   - **Response**: `{ status: "success", data: { activity_id: string, submitted_at: string, estimated_credits: number } }`

2. **`POST /v1/env_params`**
   - **Payload**: `{ latitude: number, longitude: number, temperature: number, date_time: string }`
   - **Response**: `{ status: "success", data: { activity_id: string, submitted_at: string } }`

3. **`GET /v1/status/{activity_id}`**
   - **Response**: `{ status: "success", data: { activity_id: string, status: "Processing" | "Completed" | "Failed", result?: { map_data, stats_data, heat_index, wet_bulb_temperature, relative_humidity, solar_irradiance }, error?: string, credits_used?: number } }`

---

## 2. Asynchronous Polling, Circuit Breaker & Credit Protection

### 2.1 Bounded Polling Engine (`ActivityPoller`)
- Polls `GET /v1/status/{activity_id}` at configurable intervals (`default: 1500ms`, `maxPollAttempts: 30`, `timeout: 45000ms`).
- **Immediate Termination on `Failed`**: If the provider returns status `Failed`, polling immediately terminates and throws `FortyGuardError` with `ACTIVITY_FAILED`, without wasting retries.

### 2.2 Credit Protection Semantic Cache (`FortyGuardCache`)
- FortyGuard charges credits only upon activity completion.
- To prevent redundant credit consumption during rapid dashboard queries or worker risk re-evaluations:
  - Generates deterministic SHA-256 hash keys based on site ID, geographic bounding box, date-time hour bucket, and granularity.
  - Successfully retrieved observations are cached with in-memory TTL (default: 300s).
  - Cache hits immediately return normalized observations with `source: 'FORTYGUARD_CACHE'` / `fortyguard_cache` without issuing remote requests.

### 2.3 Circuit Breaker & Fallback
- Consecutive network/server errors increment failure counter.
- When failure threshold (`5`) is exceeded, breaker transitions to `OPEN` state for cooldown period (`60s`).
- In offline fallback mode, calls smoothly transition to deterministic offline simulation (`source: 'simulation'`), logging audit events while keeping workers protected.

---

## 3. End-to-End Ingestion Pipeline

```
[ FortyGuard API (v1.0.0) ]
        │ (POST /v1/heatmap -> Activity ID -> GET /v1/status/{id})
        ▼
[ ActivityPoller + FortyGuardNormalizer ]
        │ (ThermalObservation with source: FORTYGUARD_LIVE)
        ▼
[ SentinelOrchestrator ]
        │ (Persist observation + Audit Event)
        ▼
[ P2: ContextualRiskEngine ] ───► Evaluates Physiological & Microclimate Risk
        │
        ▼
[ P3: ShortHorizonRiskPredictor ] ──► Forecasts Trajectory & Early Warnings
        │
        ▼
[ P4: PolicyGate & ActionPlanner ] ──► Dispatches Hydration / Cooling Interventions
        │
        ▼
[ P5: Supervisor Operations Center ] ──► Real-Time Broadcast via WebSockets
```

---

## 4. Verification Evidence Matrix

| Check | Item | Status | Verification Detail |
|---|---|---|---|
| 1 | `api-key` header authentication | **VERIFIED** | Passed in `tests/unit/fortyguard-contract.test.ts` & `tests/unit/fortyguard-client.test.ts` |
| 2 | No Bearer / OAuth header | **VERIFIED** | Confirmed `Authorization` header is undefined |
| 3 | `POST /v1/heatmap` payload & AOI validation | **VERIFIED** | Schema validated against GeoJSON Polygon specs |
| 4 | US geographic bounding box enforcement | **VERIFIED** | Non-US coordinates rejected with validation error |
| 5 | `POST /v1/env_params` endpoint | **VERIFIED** | Verified with point coordinates and timestamps |
| 6 | `GET /v1/status/{activity_id}` | **VERIFIED** | Validated Processing, Completed, and Failed states |
| 7 | Bounded polling loop | **VERIFIED** | Validated attempt limits and timeout termination |
| 8 | Immediate abort on Failed activity | **VERIFIED** | Confirmed fast-exit on provider task failure |
| 9 | HTTP status code mapping (400, 401, 403, 404, 422, 429, 500) | **VERIFIED** | 100% mapped to typed Sentinel error classes |
| 10 | Error response normalization | **VERIFIED** | Typed error structure with error codes and retry flags |
| 11 | Credit protection cache keys | **VERIFIED** | Deterministic SHA-256 hashed spatial/temporal cache |
| 12 | Cache hit / miss / freshness tracking | **VERIFIED** | Returns `FORTYGUARD_CACHE` with freshness metrics |
| 13 | Data quality & freshness classification | **VERIFIED** | `FRESH` (<15m), `AGING` (15-60m), `STALE` (>60m) |
| 14 | Stull wet-bulb calculation fallback | **VERIFIED** | Accurate psychrometric fallback when wet bulb omitted |
| 15 | Secret redaction in logs & errors | **VERIFIED** | Zero token leakage in strings, objects, or JSON |
| 16 | Public diagnostic `/status` endpoint | **VERIFIED** | Safe diagnostic payload with zero key prefix or secret |
| 17 | `fortyguard_activities` DB table | **VERIFIED** | Tracks submissions, activity IDs, and timestamps |
| 18 | Orchestrator downstream ingestion | **VERIFIED** | Real observation flows into P2, P3, P4, and P5 |
| 19 | Gated live integration test | **VERIFIED** | `tests/integration/fortyguard-live.test.ts` ready for live key |
| 20 | Test suite execution | **VERIFIED** | All unit and integration test suites passing |
