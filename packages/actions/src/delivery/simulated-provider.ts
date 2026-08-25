import { INotificationProvider, NotificationPayload, DeliveryResult } from './notification-provider.js';

export class SimulatedNotificationProvider implements INotificationProvider {
  public readonly providerName = 'SIMULATED_SMS';
  public readonly isSimulated = true;
  private deliveries: Map<string, DeliveryResult> = new Map();
  private failureSimulation: boolean = false;
  private failureCode: string = 'NETWORK_SIMULATION_ERROR';

  public setFailureSimulation(enabled: boolean, failureCode: string = 'SIMULATED_NETWORK_TIMEOUT'): void {
    this.failureSimulation = enabled;
    this.failureCode = failureCode;
  }

  public async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const startTime = performance.now();
    const sentAt = new Date().toISOString();
    const deliveryId = `sim_del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (this.failureSimulation) {
      const failedResult: DeliveryResult = {
        delivery_id: deliveryId,
        action_id: payload.action_id,
        provider: 'SIMULATED_SMS',
        channel: payload.channel,
        status: 'FAILED',
        recipient_ref: payload.recipient_ref,
        sent_at: sentAt,
        latency_ms: Math.round(performance.now() - startTime),
        failure_code: this.failureCode,
        is_simulated: true,
        message: payload.message,
      };
      this.deliveries.set(deliveryId, failedResult);
      return failedResult;
    }

    const deliveredAt = new Date(Date.now() + 15).toISOString();
    const result: DeliveryResult = {
      delivery_id: deliveryId,
      action_id: payload.action_id,
      provider: 'SIMULATED_SMS',
      channel: payload.channel,
      status: 'DELIVERED',
      recipient_ref: payload.recipient_ref,
      sent_at: sentAt,
      delivered_at: deliveredAt,
      latency_ms: Math.round(performance.now() - startTime) + 15,
      is_simulated: true,
      message: `[SIMULATED DELIVERY] ${payload.message}`,
    };

    this.deliveries.set(deliveryId, result);
    return result;
  }

  public async getStatus(deliveryId: string): Promise<DeliveryResult | null> {
    return this.deliveries.get(deliveryId) || null;
  }

  public clear(): void {
    this.deliveries.clear();
  }
}
