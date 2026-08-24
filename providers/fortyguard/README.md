# FortyGuard Provider Adapter (`@sentinel/fortyguard-provider`)

## Overview
This package is the isolated provider integration layer connecting Sentinel Workers to the **FortyGuard Enterprise API (v1.0.0)**.

## Architecture
- **`client.ts`**: Low-level HTTP transport enforcing `api-key: YOUR_API_KEY` authentication, request timeouts, and exponential backoff.
- **`errors.ts`**: Strongly typed domain errors (`FortyGuardAuthError`, `FortyGuardPlanError`, `FortyGuardRateLimitError`, etc.) with automated secret redaction.
- **`schemas.ts`**: Zod validation for GeoJSON AOIs, heatmap requests, and status response contracts.
- **`poller.ts`**: Bounded asynchronous status poller polling `GET /v1/status/{activity_id}`.
- **`cache.ts`**: Semantic in-memory cache keyed by operation, location AOI, time window, and granularity.
- **`normalizer.ts`**: Maps raw FortyGuard results to Sentinel's unified `ThermalObservation` schema, computing freshness and operational confidence.
- **`capabilities.ts`**: Discovers and reports active endpoints and plan authorizations.
- **`adapter.ts`**: Unified high-level facade.

## Authentication & Security
- Never uses Bearer tokens.
- All requests use the `api-key` header.
- API keys are never logged, serialized, or returned to the client frontend.
