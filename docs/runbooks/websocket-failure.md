# SRE Runbook: WebSocket Disconnect & Telemetry Recovery

## 1. What Happened?
WebSocket connection between the browser operations console and the Sentinel API server disconnected.

## 2. How to Confirm?
1. Operations Center top ribbon displays `DISCONNECTED` badge.
2. Browser console logs reconnection attempts.

## 3. What Does Sentinel Do Automatically?
- **Authoritative Database**: Database state in SQLite is always 100% authoritative; no state is lost.
- **Auto-Reconnection**: Frontend WebSocket hook automatically reconnects using exponential backoff.
- **REST Fallback Polling**: On reconnection, the console immediately issues REST calls (`/api/operations/summary`, `/api/operations/priority`, `/api/operations/map`, `/api/incidents`) to re-sync all live state.

## 4. Operator Action Required
- No manual intervention needed; dashboard recovers automatically.
- If server process was restarted, browser reconnects within 2-4 seconds.

## 5. Recovery Verification
1. Operations Center status ribbon changes from red `DISCONNECTED` to green pulsing `LIVE WS`.
2. Telemetry and incident counters update smoothly.
