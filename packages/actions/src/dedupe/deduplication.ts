import crypto from 'crypto';
import { ActionType, RiskLevel } from '@sentinel/schemas';
import { ActionCooldownTracker } from './cooldown.js';

export interface DedupeCheckInput {
  worker_id: string;
  action_type: ActionType;
  policy_version: string;
  current_risk_level: RiskLevel;
  timestamp: string;
  cooldown_minutes: number;
}

export interface DedupeCheckResult {
  is_duplicate: boolean;
  reason?: string;
  idempotency_key: string;
}

export class ActionDeduplicationService {
  private cooldownTracker: ActionCooldownTracker;
  private seenKeys: Set<string> = new Set();

  constructor(cooldownTracker?: ActionCooldownTracker) {
    this.cooldownTracker = cooldownTracker || new ActionCooldownTracker();
  }

  /**
   * Generates a deterministic idempotency key for an action request.
   */
  public generateIdempotencyKey(
    workerId: string,
    actionType: ActionType,
    policyVersion: string,
    timestamp: string,
    bucketMinutes: number = 15
  ): string {
    const timeMs = new Date(timestamp).getTime();
    const bucketIndex = Math.floor(timeMs / (bucketMinutes * 60 * 1000));
    const raw = `${workerId}:${actionType}:${policyVersion}:${bucketIndex}`;
    return `idem_${crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16)}`;
  }

  /**
   * Checks if an action is a duplicate based on exact idempotency key or active cooldown.
   */
  public checkDuplicate(input: DedupeCheckInput): DedupeCheckResult {
    const { worker_id, action_type, policy_version, timestamp, cooldown_minutes } = input;
    const idempotencyKey = this.generateIdempotencyKey(
      worker_id,
      action_type,
      policy_version,
      timestamp,
      Math.max(5, cooldown_minutes)
    );

    // Exact key dedupe
    if (this.seenKeys.has(idempotencyKey)) {
      return {
        is_duplicate: true,
        reason: `Equivalent action '${action_type}' already issued in current time bucket.`,
        idempotency_key: idempotencyKey,
      };
    }

    // Cooldown window check
    if (this.cooldownTracker.isWithinCooldown(worker_id, action_type, cooldown_minutes, timestamp)) {
      return {
        is_duplicate: true,
        reason: `Action '${action_type}' is currently within cooldown window (${cooldown_minutes}m).`,
        idempotency_key: idempotencyKey,
      };
    }

    return {
      is_duplicate: false,
      idempotency_key: idempotencyKey,
    };
  }

  public recordActionDispatched(worker_id: string, action_type: ActionType, cooldown_minutes: number, timestamp: string): void {
    const idempotencyKey = this.generateIdempotencyKey(
      worker_id,
      action_type,
      '1.0.0',
      timestamp,
      Math.max(5, cooldown_minutes)
    );
    this.seenKeys.add(idempotencyKey);
    this.cooldownTracker.recordActionIssued(worker_id, action_type, cooldown_minutes, timestamp);
  }

  public clear(): void {
    this.seenKeys.clear();
    this.cooldownTracker.clear();
  }
}
