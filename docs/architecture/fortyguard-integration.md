# FortyGuard Enterprise Integration Architecture (v1.0.0)

## 1. Core Thesis & Decoupling Principle

Sentinel Workers treats FortyGuard as an isolated environmental intelligence substrate. The system converts raw hyperlocal temperature intelligence into actionable worker safety decisions without creating hard dependencies or architectural tight coupling.

```
[ FortyGuard Enterprise API ]
           |
           | POST /v1/heatmap (with api-key header & Polygon AOI)
           v
[ Asynchronous Activity ID ]
           |
           | GET /v1/status/{activity_id} (Bounded Polling)
           v
[ Completed Provider Result ]
           |
           | normalizer.ts
           v
[ Unified ThermalObservation Contract ]
           |
           +---------------------------------------+
           |                                       |
           v                                       v
[ SQLite Persistent Store ]             [ Sentinel Orchestrator ]
(thermal_observations)                  (Context Packet -> Risk -> Action)
```

---

## 2. Authentication & Task Lifecycle

### Header Authentication
All HTTP requests to the FortyGuard Enterprise API strictly use:
```http
api-key: YOUR_API_KEY
Content-Type: application/json
x-correlation-id: req_1787594059_a8f2c
```
- **Strictly No Bearer Tokens**: Conforms to official v1.0.0 release notes.
- **Zero Token Leakage**: The API key is redacted in all error messages, string serializations, and logs.

### Asynchronous Activity State Machine
1. **Submission**: Sentinel posts task (`/v1/heatmap` or `/v1/env_params`).
2. **Activity ID**: Provider immediately returns `{ activity_id, status: "PENDING", submitted_at }`.
3. **Bounded Polling**: Sentinel polls `GET /v1/status/{activity_id}` with configurable intervals (default 1000ms), maximum attempts (default 30), and overall timeouts (30s).
4. **Resolution**: Poller returns normalized `COMPLETED` result, or raises typed `FortyGuardError` on `FAILED` / `TIMED_OUT`.

---

## 3. Supported Operations & Request Contracts

### A. Heatmaps (`POST /v1/heatmap`)
- **AOI Generator**: Automatically calculates closed GeoJSON polygon coordinates `[[[lon, lat], ...]]` around construction site latitude/longitude with configurable radii.
- **Granularities Supported**: `60m`, `80m`, `100m`.
- **Filter Types**: Single Hour (`filter_type = 1`), Range of Hours (`filter_type = 2`).
- **Forecasting Horizon**: Supported up to 12 hours beyond present time.

### B. Environmental Parameters (`POST /v1/env_params`)
- Point-based queries for `temperature_c`, `humidity_pct`, `wet_bulb_c`, `solar_irradiance`, `apparent_temperature_c`, and `air_quality`.
- Gracefully handles omitted optional fields without fabricating missing readings.

---

## 4. Semantic Caching & Rate Limit Protection

- **Semantic Key**: Generated from operation, coordinate/AOI hash, datetime window, and granularity:
  `fg:heatmap:33.4484:-112.0740:8f21ab902e11:latest:80:1`
- **Observable Stats**: Exposes `cache_hit`, `cache_miss`, and `cache_age_seconds`.
- **Stale Detection**: Observations exceeding configured TTL (`FORTYGUARD_CACHE_TTL_SECONDS`) are flagged stale and trigger conservative policy penalties.

---

## 5. Data Modes & Hybrid Fallback

Sentinel supports three environmental data modes via `THERMAL_DATA_MODE`:
1. **`offline`** (Default): System runs 100% on the deterministic 12-hour Phoenix heatwave replay without making external HTTP requests.
2. **`fortyguard`**: System strictly queries FortyGuard Enterprise API endpoints.
3. **`hybrid`**: System queries FortyGuard -> if unavailable or unconfigured, serves unexpired cached data (`source: "fortyguard_cache"`) -> if stale or missing, falls back to deterministic simulation (`source: "simulation"`).
