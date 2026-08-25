import { ActionStatus } from '@sentinel/schemas';

export class ActionStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
    PROPOSED: ['POLICY_REVIEW', 'REJECTED'],
    POLICY_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['DISPATCHING', 'REJECTED'],
    REJECTED: [], // Terminal
    DISPATCHING: ['DELIVERED', 'DELIVERY_FAILED'],
    DELIVERY_FAILED: ['DISPATCHING', 'EXPIRED', 'OVERRIDDEN'],
    DELIVERED: ['ACK_PENDING', 'COMPLETED', 'ACKNOWLEDGED', 'OVERRIDDEN'],
    ACK_PENDING: ['ACKNOWLEDGED', 'ESCALATED', 'OVERRIDDEN', 'EXPIRED'],
    ACKNOWLEDGED: ['COMPLETED'],
    OVERRIDDEN: ['COMPLETED', 'DISPATCHING'],
    EXPIRED: ['ESCALATED', 'OVERRIDDEN'],
    ESCALATED: ['ACKNOWLEDGED', 'OVERRIDDEN', 'COMPLETED'],
    COMPLETED: ['ACKNOWLEDGED'],
  };

  /**
   * Checks if a transition between states is permitted.
   */
  public static canTransition(current: ActionStatus, next: ActionStatus): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  /**
   * Asserts that a transition is legal; throws error if invalid.
   */
  public static validateTransition(actionId: string, current: ActionStatus, next: ActionStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(
        `Invalid Action state transition for '${actionId}': Cannot transition from '${current}' to '${next}'.`
      );
    }
  }
}
