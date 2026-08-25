import { ActionType } from '@sentinel/schemas';

export interface ActionCooldownRecord {
  worker_id: string;
  action_type: ActionType;
  last_issued_at: string;
  cooldown_minutes: number;
}

export class ActionCooldownTracker {
  private records: Map<string, ActionCooldownRecord> = new Map();

  private makeKey(workerId: string, actionType: ActionType): string {
    return `${workerId}:${actionType}`;
  }

  public isWithinCooldown(
    workerId: string,
    actionType: ActionType,
    cooldownMinutes: number,
    currentTime: string = new Date().toISOString()
  ): boolean {
    if (cooldownMinutes <= 0) return false;

    const key = this.makeKey(workerId, actionType);
    const existing = this.records.get(key);
    if (!existing) return false;

    const lastTimeMs = new Date(existing.last_issued_at).getTime();
    const currTimeMs = new Date(currentTime).getTime();
    const elapsedMinutes = (currTimeMs - lastTimeMs) / 60000;

    return elapsedMinutes < cooldownMinutes;
  }

  public recordActionIssued(
    workerId: string,
    actionType: ActionType,
    cooldownMinutes: number,
    issuedAt: string = new Date().toISOString()
  ): void {
    const key = this.makeKey(workerId, actionType);
    this.records.set(key, {
      worker_id: workerId,
      action_type: actionType,
      last_issued_at: issuedAt,
      cooldown_minutes: cooldownMinutes,
    });
  }

  public clear(): void {
    this.records.clear();
  }
}
