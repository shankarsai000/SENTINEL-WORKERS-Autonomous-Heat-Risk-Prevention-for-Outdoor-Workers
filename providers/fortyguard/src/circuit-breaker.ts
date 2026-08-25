export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
}

export class CircuitBreakerOpenError extends Error {
  public readonly isCircuitBreakerOpen = true;
  constructor(message: string = 'Circuit breaker is OPEN. Fast-failing external call.') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private failureThreshold: number;
  private cooldownMs: number;
  private lastFailureTime: number | null = null;
  private onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000;
    this.onStateChange = options.onStateChange;
  }

  public getState(): CircuitBreakerState {
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.cooldownMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
    return this.state;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      throw new CircuitBreakerOpenError(
        `FortyGuard circuit breaker is OPEN (${this.failureCount} failures). Cooling down (${Math.round((this.cooldownMs - (Date.now() - (this.lastFailureTime || 0))) / 1000)}s left).`
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err: any) {
      this.recordFailure(err);
      throw err;
    }
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN' || this.state === 'OPEN') {
      this.transitionTo('CLOSED');
    }
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  public recordFailure(_err?: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  public reset(): void {
    this.transitionTo('CLOSED');
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  public getStatus() {
    const currentState = this.getState();
    const cooldownRemainingMs =
      currentState === 'OPEN' && this.lastFailureTime
        ? Math.max(0, this.cooldownMs - (Date.now() - this.lastFailureTime))
        : 0;

    return {
      state: currentState,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      cooldownRemainingMs,
    };
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const prev = this.state;
      this.state = newState;
      if (this.onStateChange) {
        this.onStateChange(prev, newState);
      }
    }
  }
}
