# Safety Policy Governance & Action Invariants (Phase P4)

## 1. Safety Invariants (Section 46 Compliance)

| Invariant ID | Rule Description | Enforcement Mechanism |
|---|---|---|
| **INV-1** | LLM strings cannot bypass deterministic policy gate | Hard `PolicyGate.evaluate()` whitelist |
| **INV-2** | Emergency STOP_WORK auto-executes in CRITICAL state | Deterministic Emergency Dominance rule |
| **INV-3** | Supervisor cannot disable emergency STOP_WORK | Mandatory 403 Forbidden check on `/api/actions/:id/override` |
| **INV-4** | Predictive probabilities cannot cancel high current risk | Current risk dominance logic in `ActionPlanner` |
| **INV-5** | Stale data degrades execution to SUPERVISOR_REQUIRED | `data_freshness === 'STALE'` gate check |
| **INV-6** | Low confidence degrades execution to SUPERVISOR_REQUIRED | `confidence < 0.60` gate check |
| **INV-7** | Duplicate actions are suppressed within cooldown window | `ActionDeduplicationService` cooldown tracker |
| **INV-8** | Unacknowledged mandatory actions escalate at deadline | `EscalationEvaluator` timeout checker |
| **INV-9** | Non-emergency overrides require mandatory justification | Schema validation on `override_reason` |
| **INV-10** | Simulated actions are explicitly labeled | Prefix tag `[SIMULATED DELIVERY]` |

---

## 2. Emergency Dominance Principle

When $\text{currentRisk.level} == \text{CRITICAL}$ or $\text{currentRisk.score} \ge \text{policy.risk\_bands.critical.min}$:
- **Autonomous Emergency Execution**: `STOP_WORK` and `EMERGENCY_PROTECTIVE_ACTION` are dispatched immediately in `EMERGENCY_AUTO` mode with zero cooldown.
- **Override Prohibition**: The action cannot be dismissed or overridden by supervisors via the console API.
- **Mandatory Escalation Timer**: A 15-minute acknowledgement deadline is initiated; if neither worker nor supervisor acknowledges within 15 minutes, an emergency incident escalation is triggered.
