# SRE Runbook: Notification & SMS Delivery Failure

## 1. What Happened?
Simulated SMS / notification gateway failed to deliver an advisory to a worker.

## 2. How to Confirm?
1. Query `GET /api/actions`: Action status reports `DELIVERY_FAILED`.
2. Operations Center: Action stream shows `DELIVERY FAILED` tag.

## 3. What Does Sentinel Do Automatically?
- Never marks a failed delivery as `DELIVERED`.
- Enqueues delivery for bounded retry according to policy retry budget (max 3 retries).
- If retries fail or acknowledgement deadline expires, automatically escalates action to supervisor (`escalations` table).

## 4. Operator Action Required
- Inspect Priority Queue in Operations Center: The worker will be highlighted with elevated priority score (+80 bonus).
- Verbally notify or radio the worker on site.
- Supervisor can click **Ack on Behalf** in Worker Detail Inspector to confirm manual intervention.

## 5. Recovery Verification
1. Verify action status transitions to `ACKNOWLEDGED` or `OVERRIDDEN`.
2. Inspect audit trail: Verify `ACTION_ACKNOWLEDGED` event is cryptographically recorded.
