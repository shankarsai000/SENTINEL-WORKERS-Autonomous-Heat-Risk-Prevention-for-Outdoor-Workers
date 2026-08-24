# Sentinel Workers — System Architecture Overview

## 1. Core Thesis
FortyGuard detects hyperlocal heat conditions. Sentinel Workers converts that temperature intelligence into contextual worker-risk decisions, predictive interventions, supervisor actions, and auditable operational workflows.

## 2. Core Service Boundaries

| Service | Responsibility | Non-Goals / Hard Constraints |
| :--- | :--- | :--- |
| **FortyGuard Adapter** | Authentication, request construction, async polling, caching, normalization | Never expose API key; never invent fake unsupported endpoints. |
| **Simulation Engine** | Deterministic 12-hour Phoenix heatwave replay, Stull Wet-Bulb physics, site thermal offsets | Never use non-deterministic seeds in test benchmarks. |
| **Risk Service (FastAPI)** | Stateless contextual risk scoring ($w_{\text{env}}\cdot\text{Env} + w_{\text{exp}}\cdot\text{Exp} + w_{\text{task}}\cdot\text{Task} + w_{\text{mod}}\cdot\text{Mod} - w_{\text{rec}}\cdot\text{Rec}$) | Never override hard deterministic safety limits. |
| **Policy & Guardrails** | Deterministic OSHA/NIOSH threshold rules, data freshness penalties, emergency halt triggers | Never allow an LLM to bypass safety guardrails. |
| **Orchestrator & API** | Ingestion loop, SQLite persistence, Action dispatch, Cluster incident aggregation | Never log real personal health PII or unhashed sensitive data. |
| **Audit Service** | SHA-256 cryptographic hashing of decisions and actions | Immutable event stream for full accountability. |
| **Operations Dashboard** | Realtime WebSocket visualization, Priority queue, Action acknowledgements, Map view | Console is a control surface over operational workflows, not a passive data-science notebook. |

## 3. Privacy-by-Design Rule
For the hackathon system:
- All 500 workers are synthetic with deterministic seed generation.
- No real personal information, SSNs, phone numbers, or clinical medical diagnoses are stored.
- Personalization is demonstrated via abstract tags (`risk_modifier: "baseline" | "elevated" | "acclimatizing"`).
