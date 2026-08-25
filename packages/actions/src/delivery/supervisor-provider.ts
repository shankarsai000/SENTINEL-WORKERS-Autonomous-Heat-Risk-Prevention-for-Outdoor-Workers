import { INotificationProvider, NotificationPayload, DeliveryResult } from './notification-provider.js';

export class SupervisorConsoleNotificationProvider implements INotificationProvider {
  public readonly providerName = 'CONSOLE_ALERT';
  public readonly isSimulated = true;
  private deliveries: Map<string, DeliveryResult> = new Map();

  public async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const startTime = performance.now();
    const sentAt = new Date().toISOString();
    const deliveryId = `sup_del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result: DeliveryResult = {
      delivery_id: deliveryId,
      action_id: payload.action_id,
      provider: 'CONSOLE_ALERT',
      channel: 'CONSOLE',
      status: 'DELIVERED',
      recipient_ref: payload.recipient_ref || 'SUPERVISOR_CONSOLE',
      sent_at: sentAt,
      delivered_at: sentAt,
      latency_ms: Math.round(performance.now() - startTime),
      is_simulated: true,
      message: `[CONSOLE ALERT] ${payload.message}`,
    };

    this.deliveries.set(deliveryId, result);
    return result;
  }

  public async getStatus(deliveryId: string): Promise<DeliveryResult | null> {
    return this.deliveries.get(deliveryId) || null;
  }
}
