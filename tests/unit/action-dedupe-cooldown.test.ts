import { describe, it, expect } from 'vitest';
import { ActionCooldownTracker } from '../../packages/actions/src/dedupe/cooldown.js';
import { ActionDeduplicationService } from '../../packages/actions/src/dedupe/deduplication.js';

describe('Phase P4 Deduplication & Cooldown Unit Tests', () => {
  it('suppresses actions requested within active cooldown window', () => {
    const tracker = new ActionCooldownTracker();
    const now = '2026-06-15T12:00:00.000Z';

    tracker.recordActionIssued('worker-0042', 'HYDRATION_REMINDER', 15, now);

    // 5 minutes later -> within 15m cooldown
    const fiveMinsLater = '2026-06-15T12:05:00.000Z';
    expect(tracker.isWithinCooldown('worker-0042', 'HYDRATION_REMINDER', 15, fiveMinsLater)).toBe(true);

    // 20 minutes later -> cooldown expired
    const twentyMinsLater = '2026-06-15T12:20:00.000Z';
    expect(tracker.isWithinCooldown('worker-0042', 'HYDRATION_REMINDER', 15, twentyMinsLater)).toBe(false);
  });

  it('generates consistent deterministic idempotency keys for the same worker and time bucket', () => {
    const dedupeService = new ActionDeduplicationService();
    const time1 = '2026-06-15T12:01:00.000Z';
    const time2 = '2026-06-15T12:08:00.000Z'; // Same 15m bucket

    const key1 = dedupeService.generateIdempotencyKey('worker-0042', 'RECOVERY_BREAK', '1.0.0', time1, 15);
    const key2 = dedupeService.generateIdempotencyKey('worker-0042', 'RECOVERY_BREAK', '1.0.0', time2, 15);

    expect(key1).toBe(key2);

    const timeNextBucket = '2026-06-15T12:20:00.000Z';
    const key3 = dedupeService.generateIdempotencyKey('worker-0042', 'RECOVERY_BREAK', '1.0.0', timeNextBucket, 15);

    expect(key1).not.toBe(key3);
  });

  it('marks consecutive equivalent actions as duplicate in checkDuplicate', () => {
    const dedupeService = new ActionDeduplicationService();
    const timestamp = '2026-06-15T12:00:00.000Z';

    const check1 = dedupeService.checkDuplicate({
      worker_id: 'worker-0042',
      action_type: 'RECOVERY_BREAK',
      policy_version: '1.0.0',
      current_risk_level: 'HIGH',
      timestamp,
      cooldown_minutes: 20,
    });

    expect(check1.is_duplicate).toBe(false);

    // Record action dispatched
    dedupeService.recordActionDispatched('worker-0042', 'RECOVERY_BREAK', 20, timestamp);

    // Check immediately again
    const check2 = dedupeService.checkDuplicate({
      worker_id: 'worker-0042',
      action_type: 'RECOVERY_BREAK',
      policy_version: '1.0.0',
      current_risk_level: 'HIGH',
      timestamp: '2026-06-15T12:05:00.000Z',
      cooldown_minutes: 20,
    });

    expect(check2.is_duplicate).toBe(true);
    expect(check2.reason).toBeDefined();
  });
});
