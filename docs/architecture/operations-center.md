# Sentinel Workers — Supervisor Operations Center Architecture (Phase P5)

## 1. Overview & Core UX Principle

The Sentinel Workers **Supervisor Operations Center** serves as the central operations console for site safety supervisors, field dispatchers, and health & safety compliance officers during extreme heat conditions.

### Core 5-Second Operational Clarity Principle
Within five seconds of looking at the console, any operator immediately understands:
1. **WHAT is happening?** Aggregate risk metrics, thermal trends, and active breaches.
2. **WHERE is it happening?** Spatial zones, heat clusters, and cooling asset proximity.
3. **WHO is affected?** Deterministically ranked worker queue with role & task intensity.
4. **WHY are they at risk?** Contextual reason codes and early predictive warnings.
5. **WHAT has Sentinel done?** Autonomous advisories, SMS deliveries, and acknowledgements.
6. **WHAT requires human attention?** Escalations, unacknowledged advisories, and active incident clusters.

---

## 2. System Architecture

```
                                 [ FortyGuard Hyperlocal API / Offline Simulation ]
                                                        │
                                                        ▼
                                         [ Sentinel API Orchestrator ]
                                                        │
                      ┌─────────────────────────────────┼─────────────────────────────────┐
                      ▼                                 ▼                                 ▼
         [ Contextual Risk Engine ]        [ Short-Horizon Predictor ]       [ Intervention Planner ]
                      │                                 │                                 │
                      └─────────────────────────────────┼─────────────────────────────────┘
                                                        │
                                                        ▼
                                        [ Deterministic Incident Engine ]
                                        • Zone Clustering (>=2 workers)
                                        • Common Factor Extraction
                                        • Lifecycle State Machine
                                                        │
                                                        ▼
                                        [ Deterministic Priority Engine ]
                                        • Safety Risk Hierarchy Ranking
                                        • Modifiers & ETA Thresholds
                                        • Human-Readable Reason Codes
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
       [ SQLite Persistence & Cryptographic Hash Audit ]                   [ WebSocket Broadcast Server ]
                                                                                          │
                                                                                          ▼
                                                                        [ React Operations Console ]
                                                                        • Supervisor Priority Queue
                                                                        • Interactive Live Risk Map
                                                                        • Incident Intelligence Center
                                                                        • Slide-over Deep Inspectors
                                                                        • Audit Chain Explorer Modal
                                                                        • 14-Step Magic Demo Controller
```

---

## 3. Key Frontend Components

### 3.1 `PriorityQueue.tsx`
- Ranks active workers using the multi-factor scoring function from `PriorityEngine`.
- Displays rank number, worker identity, current risk level, predictive trajectory, threshold ETA, primary heat strain reason, and action/acknowledgement state.
- Search and filter bar (by worker ID, role, risk level, or text query).

### 3.2 `RiskMap.tsx`
- Interactive SVG map displaying site zones (`Zone A - Excavation`, `Zone B - Concrete`, etc.).
- Synthetic worker markers colored by current risk level with pulsing halos for critical/early warning.
- Pulsing cluster zones for active incidents.
- Cooling asset locations (Misting tents, AC trailer, hydration points).
- Prominent compliance label: `[SIMULATED WORKER LOCATIONS]`.

### 3.3 `IncidentCenter.tsx`
- Incident cards with severity pills, affected worker counts, common factors tags, and intervention statistics.
- Interactive operational triage controls:
  - `Ack / Triage` (transitions `DETECTED` $\to$ `TRIAGED` or `ACTIVE`)
  - `Assign` (assigns operational owner)
  - `Start Mitigation` (transitions $\to$ `MITIGATING`)
  - `Escalate` (escalates to `CRITICAL` with justification)
  - `Resolve` (supervised closure with mandatory resolution explanation).

### 3.4 `WorkerDetailInspector.tsx` & `IncidentDetailInspector.tsx`
- Slide-over drawers providing deep context without navigation.
- 1-click action acknowledgements, overrides with reason capture, and escalation buttons.
- Chronological telemetry, risk history, and audit timeline.

### 3.5 `AuditInspectorModal.tsx`
- Cryptographic SHA-256 hash inspection and payload verification tool.
- Verifies that all decisions, observations, and acknowledgements are anchored in the immutable SQLite audit chain.

### 3.6 `DemoScenarioController.tsx`
- Direct controls for the 14-step Magic Demo Scenario (Section 48).
