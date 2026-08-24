import {
  FortyGuardError,
  FortyGuardInvalidRequestError,
  FortyGuardAuthError,
  FortyGuardPlanError,
  FortyGuardNotFoundError,
  FortyGuardRateLimitError,
  FortyGuardServerError,
  FortyGuardTimeoutError,
  FortyGuardUnavailableError,
  FortyGuardSchemaError,
  redactSecrets,
} from './errors.js';
import { z } from 'zod';

export interface FortyGuardClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
}

export class FortyGuardClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private maxRetries: number;
  private fetchFn: typeof fetch;

  constructor(config: FortyGuardClientConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.FORTYGUARD_API_BASE_URL || 'https://api.fortyguard.com').replace(/\/+$/, '');
    this.apiKey = config.apiKey || process.env.FORTYGUARD_API_KEY || '';
    this.timeoutMs = config.timeoutMs || parseInt(process.env.FORTYGUARD_TIMEOUT_MS || '10000', 10);
    this.maxRetries = config.maxRetries ?? 2;
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public getMaskedApiKey(): string {
    if (!this.apiKey) return 'NOT_CONFIGURED';
    if (this.apiKey.length <= 8) return '****';
    return `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
  }

  public async post<T>(
    endpoint: string,
    body: unknown,
    schema?: z.ZodType<T>,
    correlationId: string = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new FortyGuardAuthError('FortyGuard API key is not configured.', correlationId);
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const payload = JSON.stringify(body);

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
          'x-correlation-id': correlationId,
        },
        body: payload,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      return await this.handleResponse(response, correlationId, schema);
    } catch (err: any) {
      this.handleFetchError(err, correlationId, endpoint);
    }
  }

  public async get<T>(
    endpoint: string,
    schema?: z.ZodType<T>,
    correlationId: string = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    allowRetry: boolean = true
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new FortyGuardAuthError('FortyGuard API key is not configured.', correlationId);
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    let attempts = 0;
    const maxAttempts = allowRetry ? this.maxRetries + 1 : 1;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await this.fetchFn(url, {
          method: 'GET',
          headers: {
            'api-key': this.apiKey,
            'x-correlation-id': correlationId,
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        return await this.handleResponse(response, correlationId, schema);
      } catch (err: any) {
        if (attempts < maxAttempts && (err instanceof FortyGuardServerError || err instanceof FortyGuardRateLimitError)) {
          // Exponential backoff with jitter
          const backoff = Math.min(2000, Math.pow(2, attempts) * 200 + Math.random() * 100);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        this.handleFetchError(err, correlationId, endpoint);
      }
    }

    throw new FortyGuardUnavailableError(`Request to ${endpoint} failed after ${maxAttempts} attempts`, correlationId);
  }

  private async handleResponse<T>(
    response: Response,
    correlationId: string,
    schema?: z.ZodType<T>
  ): Promise<T> {
    let rawText = '';
    try {
      rawText = await response.text();
    } catch (e) {
      rawText = '';
    }

    let parsedJson: any = null;
    if (rawText) {
      try {
        parsedJson = JSON.parse(rawText);
      } catch (e) {
        throw new FortyGuardSchemaError(
          `Invalid JSON received from provider: ${rawText.substring(0, 100)}`,
          correlationId,
          undefined,
          this.apiKey
        );
      }
    }

    if (!response.ok) {
      const errorMsg = parsedJson?.message || parsedJson?.error || `HTTP Error ${response.status}: ${response.statusText}`;
      switch (response.status) {
        case 400:
          throw new FortyGuardInvalidRequestError(errorMsg, correlationId, parsedJson, this.apiKey);
        case 401:
          throw new FortyGuardAuthError(errorMsg, correlationId, parsedJson, this.apiKey);
        case 403:
          throw new FortyGuardPlanError(errorMsg, correlationId, parsedJson, this.apiKey);
        case 404:
          throw new FortyGuardNotFoundError(errorMsg, correlationId, parsedJson, this.apiKey);
        case 429:
          throw new FortyGuardRateLimitError(errorMsg, correlationId, parsedJson, this.apiKey);
        case 500:
        case 502:
        case 503:
        case 504:
          throw new FortyGuardServerError(errorMsg, correlationId, parsedJson, this.apiKey);
        default:
          throw new FortyGuardError(errorMsg, 'UNKNOWN_ERROR', response.status, correlationId, parsedJson, this.apiKey);
      }
    }

    if (schema) {
      const validation = schema.safeParse(parsedJson);
      if (!validation.success) {
        throw new FortyGuardSchemaError(
          `Response validation failed: ${validation.error.message}`,
          correlationId,
          { zodErrors: validation.error.format() },
          this.apiKey
        );
      }
      return validation.data;
    }

    return parsedJson as T;
  }

  private handleFetchError(err: any, correlationId: string, endpoint: string): never {
    if (err instanceof FortyGuardError) {
      throw err;
    }

    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new FortyGuardTimeoutError(
        `Request to ${endpoint} timed out after ${this.timeoutMs}ms`,
        correlationId,
        undefined,
        this.apiKey
      );
    }

    throw new FortyGuardUnavailableError(
      `Network connection to FortyGuard API failed: ${err.message || err}`,
      correlationId,
      undefined,
      this.apiKey
    );
  }
}
