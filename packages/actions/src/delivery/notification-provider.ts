import { CommunicationChannel } from '@sentinel/schemas';

export interface NotificationPayload {
  action_id: string;
  worker_id?: string;
  site_id: string;
  recipient_ref: string;
  channel: CommunicationChannel;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  policy_version: string;
}

export interface DeliveryResult {
  delivery_id: string;
  action_id: string;
  provider: 'SIMULATED_SMS' | 'TWILIO_SMS' | 'CONSOLE_ALERT';
  channel: CommunicationChannel;
  status: 'DELIVERED' | 'FAILED' | 'DISPATCHED';
  recipient_ref: string;
  sent_at: string;
  delivered_at?: string;
  latency_ms: number;
  failure_code?: string;
  is_simulated: boolean;
  message: string;
}

export interface INotificationProvider {
  readonly providerName: string;
  readonly isSimulated: boolean;

  send(payload: NotificationPayload): Promise<DeliveryResult>;
  getStatus(deliveryId: string): Promise<DeliveryResult | null>;
}
