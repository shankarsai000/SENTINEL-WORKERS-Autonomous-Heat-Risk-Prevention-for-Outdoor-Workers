# Notification & Delivery System (Phase P4)

## 1. Overview
The Notification System handles multi-channel delivery of intervention notices to workers and supervisors while enforcing realistic latency simulation, delivery failure handling, bounded retries, and strict deduplication.

---

## 2. Notification Provider Abstraction

```typescript
export interface NotificationProvider {
  readonly providerName: string;
  readonly isSimulated: boolean;
  send(payload: SendNotificationPayload): Promise<DeliveryResult>;
}
```

### Supported Providers:
1. **`SimulatedNotificationProvider`**:
   - Injects realistic network latency (default 5–15ms).
   - Enforces the mandatory `[SIMULATED DELIVERY]` marker on all outward payload strings.
   - Configurable simulated failure rate and transient error injection for resilience testing.
2. **`SupervisorProvider`**:
   - Delivers urgent alerts directly to the Operations Console WebSocket broadcast stream.
3. **`SMSProvider`**:
   - Live SMS adapter interface ready for production Twilio / AWS SNS bindings.

---

## 3. Idempotency & Deduplication Strategy

To prevent worker alert fatigue and excessive SMS costs:
1. **Time-Bucket Idempotency Key**:
   $$\text{Key} = \text{SHA256}(\text{worker\_id} + \text{action\_type} + \text{policy\_version} + \lfloor\text{timestamp} / \text{bucket\_size}\rfloor)$$
2. **Action Cooldown Tracker**:
   - `MONITOR`: 30-minute cooldown
   - `HYDRATION_REMINDER`: 30-minute cooldown
   - `SHADE_RECOMMENDATION` / `RECOVERY_BREAK`: 15-minute cooldown
   - `STOP_WORK` / `EMERGENCY_PROTECTIVE_ACTION`: 0-minute cooldown (never suppressed)
3. **Deduplication Audit Trail**:
   - Suppressed actions generate a cryptographically hashed `ACTION_DEDUPLICATED` audit event documenting the exact suppression reason without cluttering the active intervention list.
