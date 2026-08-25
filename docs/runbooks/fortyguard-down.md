# SRE Runbook: FortyGuard API Outage & Recovery

## 1. What Happened?
The FortyGuard environmental intelligence API is unreachable, returning HTTP 5xx errors, timing out ($>10\text{s}$), or experiencing rate-limiting exhaustion (HTTP 429).

## 2. How to Confirm?
1. Check `/api/health/dependencies`: `fortyguard` status will report `DEGRADED` or `UNAVAILABLE`.
2. Check Operations Center dashboard: FortyGuard badge shows `DEGRADED` or `FALLBACK`.
3. Check API logs for Pino error: `PROVIDER_CALL_FAILED` or `CIRCUIT_BREAKER_OPEN`.

## 3. What Does Sentinel Do Automatically?
- **Circuit Breaker**: Transitions to `OPEN` after 3 consecutive failures, preventing request storms.
- **Cache Fallback**: Serves valid unexpired observations from the in-memory cache if available.
- **Simulation Fallback**: In hybrid/offline mode, automatically generates deterministic microclimate observations matching the site coordinates.
- **Audit Record**: Records `PROVIDER_CALL_FAILED` in the immutable SQLite audit chain.
- **Safety Guarantee**: Contextual worker-risk evaluation and action execution continue without interruption.

## 4. Operator Action Required
- **Live FortyGuard Hackathon Mode**: Verify `FORTYGUARD_API_KEY` validity in `.env`.
- **Demo / Presentation Mode**: Switch `THERMAL_DATA_MODE=offline` or `hybrid` to use the deterministic 12-hour Phoenix heatwave replay simulator.

## 5. Recovery Verification
1. Call `GET /api/health/dependencies`: Verify `fortyguard` returns `HEALTHY`.
2. Check Operations Center header: Badge shows `CONNECTED`.
3. Query `GET /api/metrics`: Verify `fortyguard_requests` counter increments cleanly with zero failure delta.
