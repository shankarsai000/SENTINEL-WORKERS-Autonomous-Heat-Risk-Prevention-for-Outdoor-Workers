export type FaultType =
  | 'FORTYGUARD_TIMEOUT'
  | 'FORTYGUARD_429'
  | 'FORTYGUARD_500'
  | 'FORTYGUARD_MALFORMED'
  | 'PREDICTION_FAILURE'
  | 'NOTIFICATION_FAILURE'
  | 'WEBSOCKET_DROP'
  | 'DATABASE_DELAY'
  | 'DATABASE_FAILURE';

export class FaultInjector {
  private static instance: FaultInjector;
  private activeFaults: Set<string> = new Set();

  public static getInstance(): FaultInjector {
    if (!FaultInjector.instance) {
      FaultInjector.instance = new FaultInjector();
    }
    return FaultInjector.instance;
  }

  public setFault(fault: string, enabled: boolean): void {
    if (enabled) {
      this.activeFaults.add(fault.toUpperCase());
    } else {
      this.activeFaults.delete(fault.toUpperCase());
    }
  }

  public isFaultEnabled(fault: string): boolean {
    return this.activeFaults.has(fault.toUpperCase());
  }

  public getEnabledFaults(): string[] {
    return Array.from(this.activeFaults);
  }

  public clearFault(fault: string): void {
    this.activeFaults.delete(fault.toUpperCase());
  }

  public clearAllFaults(): void {
    this.activeFaults.clear();
  }
}

export const faultInjector = FaultInjector.getInstance();
