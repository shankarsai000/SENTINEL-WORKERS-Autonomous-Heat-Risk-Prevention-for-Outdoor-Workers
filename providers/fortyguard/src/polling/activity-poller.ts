import { FortyGuardClient } from '../client/fortyguard-client.js';
import { fetchActivityStatus } from '../endpoints/status.js';
import { ActivityStatusResponse } from '../models/fortyguard-types.js';
import {
  FortyGuardError,
  FortyGuardTimeoutError,
} from '../errors/fortyguard-errors.js';

export interface PollerOptions {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  maxAttempts?: number;
  activityTimeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

export class ActivityPoller {
  private client: FortyGuardClient;
  private pollIntervalMs: number;
  private maxPollAttempts: number;
  private activityTimeoutMs: number;
  private sleepFn: (ms: number) => Promise<void>;

  constructor(client: FortyGuardClient, options: PollerOptions = {}) {
    this.client = client;
    this.pollIntervalMs = options.pollIntervalMs || 1500;
    this.maxPollAttempts = options.maxPollAttempts || options.maxAttempts || 30;
    this.activityTimeoutMs = options.activityTimeoutMs || 45000;
    this.sleepFn = options.sleepFn || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  public async pollUntilComplete(
    activityId: string,
    correlationId?: string
  ): Promise<ActivityStatusResponse> {
    const startTime = Date.now();
    let attempts = 0;

    while (attempts < this.maxPollAttempts) {
      attempts++;
      const elapsed = Date.now() - startTime;

      if (elapsed > this.activityTimeoutMs) {
        throw new FortyGuardTimeoutError(
          `Activity ${activityId} polling timed out after ${elapsed}ms (${attempts} attempts)`,
          correlationId,
          activityId
        );
      }

      const statusRes = await fetchActivityStatus(this.client, activityId, correlationId);
      const status = statusRes.data.status;

      if (status === 'Completed') {
        (statusRes as any)._attempts = attempts;
        return statusRes;
      }

      if (status === 'Failed') {
        throw new FortyGuardError({
          message: `FortyGuard activity ${activityId} failed on provider side: ${statusRes.data.error || 'Unknown provider error'}`,
          code: 'ACTIVITY_FAILED',
          activity_id: activityId,
          request_id: correlationId,
          details: statusRes.data,
          retryable: false,
        });
      }

      // If Processing, wait and poll again
      await this.sleepFn(this.pollIntervalMs);
    }

    throw new FortyGuardTimeoutError(
      `Activity ${activityId} reached maximum poll attempts (${this.maxPollAttempts}) without completing`,
      correlationId,
      activityId
    );
  }

  public async pollActivity(
    activityId: string,
    endpoint?: string,
    submittedAt?: string,
    correlationId?: string
  ): Promise<any> {
    try {
      const res = await this.pollUntilComplete(activityId, correlationId);
      return {
        activity_id: activityId,
        endpoint: endpoint || '/v1/heatmap',
        submitted_at: submittedAt || res.data.submitted_at || new Date().toISOString(),
        completed_at: res.data.completed_at || new Date().toISOString(),
        status: res.data.status === 'Completed' ? 'COMPLETED' : res.data.status === 'Failed' ? 'FAILED' : 'PROCESSING',
        result: res.data.result,
        credits_used: res.data.credits_used,
        attempts: (res as any)._attempts || 1,
      };
    } catch (err: any) {
      if (err?.code === 'ACTIVITY_FAILED') {
        return {
          activity_id: activityId,
          endpoint: endpoint || '/v1/heatmap',
          submitted_at: submittedAt || new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: 'FAILED',
          error_code: 'PROVIDER_TASK_FAILED',
          error: err.message,
        };
      }
      throw err;
    }
  }
}

export { ActivityPoller as FortyGuardPoller };
export type PollerConfig = PollerOptions;
export interface ProviderActivity {
  activity_id: string;
  endpoint: string;
  submitted_at: string;
  completed_at?: string;
  status: 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
  credits_used?: number;
}
