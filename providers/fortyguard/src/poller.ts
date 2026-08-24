import { FortyGuardClient } from './client.js';
import {
  ActivityStatusResponse,
  ActivityStatusResponseSchema,
  FortyGuardResultPayload,
} from './schemas.js';
import { FortyGuardTimeoutError, FortyGuardError } from './errors.js';

export interface PollerConfig {
  pollIntervalMs?: number;
  maxAttempts?: number;
  overallTimeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

export type InternalActivityStatus =
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMED_OUT';

export interface ProviderActivity {
  provider: 'fortyguard';
  activity_id: string;
  operation: 'heatmap' | 'env_params';
  submitted_at: string;
  status: InternalActivityStatus;
  attempts: number;
  completed_at?: string;
  error_code?: string;
  error_message?: string;
  result?: FortyGuardResultPayload;
  credits_used?: number;
}

export class FortyGuardPoller {
  private client: FortyGuardClient;
  private pollIntervalMs: number;
  private maxAttempts: number;
  private overallTimeoutMs: number;
  private sleep: (ms: number) => Promise<void>;

  constructor(client: FortyGuardClient, config: PollerConfig = {}) {
    this.client = client;
    this.pollIntervalMs = config.pollIntervalMs || parseInt(process.env.FORTYGUARD_POLL_INTERVAL_MS || '1000', 10);
    this.maxAttempts = config.maxAttempts || parseInt(process.env.FORTYGUARD_MAX_POLL_ATTEMPTS || '30', 10);
    this.overallTimeoutMs = config.overallTimeoutMs || 30000;
    this.sleep = config.sleepFn || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  public async pollActivity(
    activityId: string,
    operation: 'heatmap' | 'env_params',
    submittedAt: string = new Date().toISOString(),
    correlationId?: string
  ): Promise<ProviderActivity> {
    const startTime = Date.now();
    let attempts = 0;

    const activity: ProviderActivity = {
      provider: 'fortyguard',
      activity_id: activityId,
      operation,
      submitted_at: submittedAt,
      status: 'SUBMITTED',
      attempts: 0,
    };

    while (attempts < this.maxAttempts) {
      if (Date.now() - startTime > this.overallTimeoutMs) {
        activity.status = 'TIMED_OUT';
        activity.error_code = 'PROVIDER_TIMEOUT';
        activity.error_message = `Polling exceeded overall timeout of ${this.overallTimeoutMs}ms`;
        throw new FortyGuardTimeoutError(
          `Activity ${activityId} timed out after ${this.overallTimeoutMs}ms`,
          correlationId,
          { attempts, activityId }
        );
      }

      attempts++;
      activity.attempts = attempts;
      activity.status = 'PROCESSING';

      try {
        const response = await this.client.get<ActivityStatusResponse>(
          `/v1/status/${activityId}`,
          ActivityStatusResponseSchema,
          correlationId,
          true
        );

        if (response.status === 'COMPLETED') {
          activity.status = 'COMPLETED';
          activity.completed_at = new Date().toISOString();
          activity.result = response.result;
          activity.credits_used = response.credits_used;
          return activity;
        }

        if (response.status === 'FAILED') {
          activity.status = 'FAILED';
          activity.completed_at = new Date().toISOString();
          activity.error_code = 'PROVIDER_TASK_FAILED';
          activity.error_message = response.error || 'Provider task failed without error message';
          return activity;
        }

        // Status is PENDING or PROCESSING: wait interval before next attempt
        await this.sleep(this.pollIntervalMs);
      } catch (err: any) {
        if (err instanceof FortyGuardError && err.statusCode === 404) {
          activity.status = 'FAILED';
          activity.error_code = 'ACTIVITY_NOT_FOUND';
          activity.error_message = `Activity ${activityId} not found on provider.`;
          throw err;
        }
        if (attempts >= this.maxAttempts) {
          activity.status = 'TIMED_OUT';
          activity.error_code = 'POLLING_MAX_ATTEMPTS_EXCEEDED';
          activity.error_message = `Max polling attempts (${this.maxAttempts}) reached.`;
          throw err;
        }
        await this.sleep(this.pollIntervalMs);
      }
    }

    activity.status = 'TIMED_OUT';
    activity.error_code = 'MAX_ATTEMPTS_EXHAUSTED';
    activity.error_message = `Status polling exhausted ${this.maxAttempts} attempts without completion.`;
    throw new FortyGuardTimeoutError(
      `Activity ${activityId} exceeded maximum poll attempts (${this.maxAttempts})`,
      correlationId,
      { attempts, activityId }
    );
  }
}
