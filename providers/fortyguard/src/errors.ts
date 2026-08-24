/**
 * FortyGuard Typed Errors & Secret Redaction
 * Master Build Reference v2.0
 */

export function redactSecrets(input: string, secret?: string): string {
  if (!input) return input;
  let sanitized = input;

  if (secret && secret.length > 3) {
    sanitized = sanitized.split(secret).join('[REDACTED_API_KEY]');
  }

  // Redact typical API key / token patterns
  sanitized = sanitized.replace(/(api[-_]?key[:=]\s*)['"]?([a-zA-Z0-9_\-]+)['"]?/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/(bearer\s+)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/([?&]key=)[^&]+/gi, '$1[REDACTED]');

  return sanitized;
}

export function redactObject<T>(obj: T, secret?: string): T {
  if (!obj) return obj;
  try {
    const str = JSON.stringify(obj);
    return JSON.parse(redactSecrets(str, secret));
  } catch (e) {
    return obj;
  }
}

export type FortyGuardErrorCode =
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_FAILED'
  | 'PLAN_OR_AUTHORIZATION_DENIED'
  | 'ACTIVITY_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'MALFORMED_RESPONSE'
  | 'UNKNOWN_ERROR';

export class FortyGuardError extends Error {
  public readonly statusCode?: number;
  public readonly errorCode: FortyGuardErrorCode;
  public readonly correlationId?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    errorCode: FortyGuardErrorCode = 'UNKNOWN_ERROR',
    statusCode?: number,
    correlationId?: string,
    details?: Record<string, unknown>,
    apiKeyToRedact?: string
  ) {
    const cleanMessage = redactSecrets(message, apiKeyToRedact);
    super(cleanMessage);
    this.name = 'FortyGuardError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.correlationId = correlationId;
    this.details = details ? redactObject(details, apiKeyToRedact) : undefined;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      message: this.message,
      correlationId: this.correlationId,
      details: this.details,
    };
  }
}

export class FortyGuardInvalidRequestError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'INVALID_REQUEST', 400, correlationId, details, apiKey);
    this.name = 'FortyGuardInvalidRequestError';
  }
}

export class FortyGuardAuthError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'AUTHENTICATION_FAILED', 401, correlationId, details, apiKey);
    this.name = 'FortyGuardAuthError';
  }
}

export class FortyGuardPlanError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'PLAN_OR_AUTHORIZATION_DENIED', 403, correlationId, details, apiKey);
    this.name = 'FortyGuardPlanError';
  }
}

export class FortyGuardNotFoundError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'ACTIVITY_NOT_FOUND', 404, correlationId, details, apiKey);
    this.name = 'FortyGuardNotFoundError';
  }
}

export class FortyGuardRateLimitError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'RATE_LIMITED', 429, correlationId, details, apiKey);
    this.name = 'FortyGuardRateLimitError';
  }
}

export class FortyGuardServerError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'PROVIDER_ERROR', 500, correlationId, details, apiKey);
    this.name = 'FortyGuardServerError';
  }
}

export class FortyGuardTimeoutError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'PROVIDER_TIMEOUT', 408, correlationId, details, apiKey);
    this.name = 'FortyGuardTimeoutError';
  }
}

export class FortyGuardUnavailableError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'PROVIDER_UNAVAILABLE', 503, correlationId, details, apiKey);
    this.name = 'FortyGuardUnavailableError';
  }
}

export class FortyGuardSchemaError extends FortyGuardError {
  constructor(message: string, correlationId?: string, details?: Record<string, unknown>, apiKey?: string) {
    super(message, 'MALFORMED_RESPONSE', 502, correlationId, details, apiKey);
    this.name = 'FortyGuardSchemaError';
  }
}
