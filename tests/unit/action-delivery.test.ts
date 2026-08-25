import { describe, it, expect } from 'vitest';
import { SimulatedNotificationProvider } from '../../packages/actions/src/delivery/simulated-provider.js';
import { SMSNotificationProvider } from '../../packages/actions/src/delivery/sms-provider.js';

describe('Phase P4 Notification Delivery Providers Unit Tests', () => {
  it('delivers simulated notifications with explicit simulated metadata', async () => {
    const provider = new SimulatedNotificationProvider();

    const result = await provider.send({
      action_id: 'act-001',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      recipient_ref: 'worker-0042',
      channel: 'SMS_SIMULATED',
      message: 'Sentinel: Take a recovery break.',
      priority: 'HIGH',
      policy_version: '1.0.0',
    });

    expect(result.status).toBe('DELIVERED');
    expect(result.is_simulated).toBe(true);
    expect(result.message).toContain('[SIMULATED DELIVERY]');
    expect(result.latency_ms).toBeGreaterThanOrEqual(15);
  });

  it('handles simulated network failure without false DELIVERED status', async () => {
    const provider = new SimulatedNotificationProvider();
    provider.setFailureSimulation(true, 'SIMULATED_CARRIER_TIMEOUT');

    const result = await provider.send({
      action_id: 'act-002',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      recipient_ref: 'worker-0042',
      channel: 'SMS_SIMULATED',
      message: 'Sentinel: Hydration reminder.',
      priority: 'LOW',
      policy_version: '1.0.0',
    });

    expect(result.status).toBe('FAILED');
    expect(result.failure_code).toBe('SIMULATED_CARRIER_TIMEOUT');
    expect(result.delivered_at).toBeUndefined();
  });

  it('fails gracefully when real SMS credentials are not configured', async () => {
    const smsProvider = new SMSNotificationProvider(''); // No key

    const result = await smsProvider.send({
      action_id: 'act-003',
      worker_id: 'worker-0042',
      site_id: 'PHX-SITE-01',
      recipient_ref: '+16025550199',
      channel: 'SMS_SIMULATED',
      message: 'Sentinel emergency notice.',
      priority: 'EMERGENCY',
      policy_version: '1.0.0',
    });

    expect(result.status).toBe('FAILED');
    expect(result.failure_code).toBe('SMS_CREDENTIALS_MISSING');
  });
});
