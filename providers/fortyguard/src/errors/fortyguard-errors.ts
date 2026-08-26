export type FortyGuardErrorCode =
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_FAILED'
  | 'PLAN_ACCESS_DENIED'
  | 'ACTIVITY_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_SCHEMA_ERROR'
  | 'ACTIVITY_FAILED'
  | 'UNKNOWN_ERROR';

export function redactSecrets(text: string, apiKey?: string): string {
  if (!text) return '';
  let sanitized = text;

  if (apiKey && apiKey.length > 4) {
    sanitized = sanitized.split(apiKey).join('[REDACTED]');
  }

  // Common header & query secret patterns
  sanitized = sanitized.replace(/api-key[:=]\s*['"]?[a-zA-Z0-9_\-]+['"]?/gi, 'api-key: [REDACTED]');
  sanitized = sanitized.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
  sanitized = sanitized.replace(/token=[a-zA-Z0-9_\-]+/gi, 'token=[REDACTED]');

  return sanitized;
}

function sanitizeValue(val: unknown, apiKey?: string): unknown {
  if (typeof val === 'string') {
    return redactSecrets(val, apiKey);
  }
  if (val && typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map((item) => sanitizeValue(item, apiKey));
    }
    const cleanObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (/key|secret|token|password|auth/i.test(k) && typeof v === 'string' && apiKey && v.includes(apiKey)) {
        cleanObj[k] = '[REDACTED]';
      } else {
        cleanObj[k] = sanitizeValue(v, apiKey);
      }
    }
    return cleanObj;
  }
  return val;
}

export class FortyGuardError extends Error {
  public readonly code: FortyGuardErrorCode;
  public readonly http_status?: number;
  public readonly activity_id?: string;
  public readonly retryable: boolean;
  public readonly provider: 'FortyGuard' = 'FortyGuard';
  public readonly request_id?: string;
  public readonly details?: unknown;

  constructor(options: {
    message: string;
    code: FortyGuardErrorCode;
    http_status?: number;
    activity_id?: string;
    retryable?: boolean;
    request_id?: string;
    details?: unknown;
    apiKey?: string;
  }) {
    const cleanMsg = redactSecrets(options.message, options.apiKey);
    super(cleanMsg);
    this.name = 'FortyGuardError';
    this.code = options.code;
    this.http_status = options.http_status;
    this.activity_id = options.activity_id;
    this.retryable = options.retryable ?? (options.code === 'RATE_LIMITED' || options.code === 'PROVIDER_TIMEOUT' || options.code === 'PROVIDER_UNAVAILABLE');
    this.request_id = options.request_id;
    this.details = sanitizeValue(options.details, options.apiKey);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      provider: this.provider,
      code: this.code,
      message: this.message,
      http_status: this.http_status,
      activity_id: this.activity_id,
      retryable: this.retryable,
      request_id: this.request_id,
      details: this.details,
    };
  }
}

export class FortyGuardInvalidRequestError extends FortyGuardError {
  constructor(message: string, requestId?: string, details?: unknown, apiKey?: string) {
    super({
      message,
      code: 'INVALID_REQUEST',
      http_status: 400,
      request_id: requestId,
      details,
      apiKey,
      retryable: false,
    });
  }
}

export class FortyGuardAuthError extends FortyGuardError {
  constructor(message: string = 'FortyGuard authentication failed. Missing or invalid API key.', requestId?: string, details?: unknown, apiKey?: string) {
    super({
      message,
      code: 'AUTHENTICATION_FAILED',
      http_status: 401,
      request_id: requestId,
      details,
      apiKey,
      retryable: false,
    });
  }
}

export class FortyGuardPlanError extends FortyGuardError {
  constructor(message: string = 'FortyGuard plan access denied. Insufficient privileges or subscription plan.', requestId?: string, details?: unknown, apiKey?: string) {
    super({
      message,
      code: 'PLAN_ACCESS_DENIED',
      http_status: 403,
      request_id: requestId,
      details,
      apiKey,
      retryable: false,
    });
  }
}

export class FortyGuardNotFoundError extends FortyGuardError {
  constructor(message: string = 'Requested FortyGuard resource or activity not found.', requestId?: string, activityId?: string, apiKey?: string) {
    super({
      message,
      code: 'ACTIVITY_NOT_FOUND',
      http_status: 404,
      request_id: requestId,
      activity_id: activityId,
      apiKey,
      retryable: false,
    });
  }
}

export class FortyGuardValidationError extends FortyGuardError {
  constructor(message: string, requestId?: string, details?: unknown, apiKey?: string) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      http_status: 422,
      request_id: requestId,
      details,
      apiKey,
      retryable: false,
    });
  }
}

export class FortyGuardRateLimitError extends FortyGuardError {
  constructor(message: string = 'FortyGuard API rate limit exceeded.', requestId?: string, details?: unknown, apiKey?: string) {
    super({
      message,
      code: 'RATE_LIMITED',
      http_status: 429,
      request_id: requestId,
      details,
      apiKey,
      retryable: true,
    });
  }
}

export class FortyGuardServerError extends FortyGuardError {
  constructor(message: string, requestId?: string, details?: unknown, apiKey?: string, httpStatus: number = 500) {
    super({
      message,
      code: 'PROVIDER_ERROR',
      http_status: httpStatus,
      request_id: requestId,
      details,
      apiKey,
      retryable: true,
    });
  }
}

export class FortyGuardTimeoutError extends FortyGuardError {
  constructor(message: string, requestId?: string, activityId?: string, apiKey?: string) {
    super({
      message,
      code: 'PROVIDER_TIMEOUT',
      request_id: requestId,
      activity_id: activityId,
      apiKey,
      retryable: true,
    });
  }
}

export class FortyGuardUnavailableError extends FortyGuardError {
  constructor(message: string, requestId?: string, details?: unknown, apiKey?: string) {
    super({
      message,
      code: 'PROVIDER_UNAVAILABLE',
      request_id: requestId,
      details,
      apiKey,
      retryable: true,
    });
  }
}

export class FortyGuardSchemaError extends FortyGuardError {
  constructor(message: string, requestId?: string, details?: unknown, apiKey?: string) {
    super({
      message,
      code: 'PROVIDER_SCHEMA_ERROR',
      request_id: requestId,
      details,
      apiKey,
      retryable: false,
    });
  }
}
