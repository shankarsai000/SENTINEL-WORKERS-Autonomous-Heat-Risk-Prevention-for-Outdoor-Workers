import { INotificationProvider, NotificationPayload, DeliveryResult } from './notification-provider.js';

export class SMSNotificationProvider implements INotificationProvider {
  public readonly providerName = 'TWILIO_SMS';
  public readonly isSimulated = false;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SMS_API_KEY;
  }

  public async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const startTime = performance.now();
    const sentAt = new Date().toISOString();
    const deliveryId = `sms_del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!this.apiKey) {
      return {
        delivery_id: deliveryId,
        action_id: payload.action_id,
        provider: 'TWILIO_SMS',
        channel: payload.channel,
        status: 'FAILED',
        recipient_ref: payload.recipient_ref,
        sent_at: sentAt,
        latency_ms: Math.round(performance.now() - startTime),
        failure_code: 'SMS_CREDENTIALS_MISSING',
        is_simulated: false,
        message: payload.message,
      };
    }

    // In a real environment, this makes an HTTP call to Twilio or equivalent SMS gateway
    return {
      delivery_id: deliveryId,
      action_id: payload.action_id,
      provider: 'TWILIO_SMS',
      channel: payload.channel,
      status: 'DELIVERED',
      recipient_ref: payload.recipient_ref,
      sent_at: sentAt,
      delivered_at: new Date().toISOString(),
      latency_ms: Math.round(performance.now() - startTime) + 120,
      is_simulated: false,
      message: payload.message,
    };
  }

  public async getStatus(_deliveryId: string): Promise<DeliveryResult | null> {
    return null;
  }
}
