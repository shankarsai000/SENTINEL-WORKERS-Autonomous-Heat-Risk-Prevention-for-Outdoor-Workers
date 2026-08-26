export type FortyGuardMode = 'live' | 'simulation' | 'offline';

export interface FortyGuardConfig {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  mode: FortyGuardMode;
  timeoutMs: number;
  pollIntervalMs: number;
  maxPollAttempts: number;
  cacheTtlSeconds: number;
  maxRetries: number;
}

export function loadFortyGuardConfig(overrides: Partial<FortyGuardConfig> = {}): FortyGuardConfig {
  const apiKey = overrides.apiKey || process.env.FORTYGUARD_API_KEY || '';
  const baseUrl = (
    overrides.baseUrl ||
    process.env.FORTYGUARD_BASE_URL ||
    process.env.FORTYGUARD_API_BASE_URL ||
    'https://api.fortyguard.com'
  ).replace(/\/+$/, '');

  const modeRaw = overrides.mode || process.env.FORTYGUARD_MODE || process.env.THERMAL_DATA_MODE || 'simulation';
  const mode: FortyGuardMode =
    modeRaw === 'live' || modeRaw === 'fortyguard'
      ? 'live'
      : modeRaw === 'offline'
      ? 'offline'
      : 'simulation';

  const enabled =
    overrides.enabled !== undefined
      ? overrides.enabled
      : process.env.FORTYGUARD_ENABLED === 'true' || Boolean(apiKey && mode === 'live');

  const timeoutMs = overrides.timeoutMs || parseInt(process.env.FORTYGUARD_TIMEOUT_MS || '10000', 10);
  const pollIntervalMs = overrides.pollIntervalMs || parseInt(process.env.FORTYGUARD_POLL_INTERVAL_MS || '1500', 10);
  const maxPollAttempts = overrides.maxPollAttempts || parseInt(process.env.FORTYGUARD_MAX_POLL_ATTEMPTS || '30', 10);
  const cacheTtlSeconds = overrides.cacheTtlSeconds || parseInt(process.env.FORTYGUARD_CACHE_TTL_SECONDS || '300', 10);
  const maxRetries = overrides.maxRetries !== undefined ? overrides.maxRetries : 2;

  return {
    baseUrl,
    apiKey,
    enabled,
    mode,
    timeoutMs,
    pollIntervalMs,
    maxPollAttempts,
    cacheTtlSeconds,
    maxRetries,
  };
}

export function maskApiKey(apiKey?: string): string {
  if (!apiKey || apiKey.trim().length === 0) return 'NOT_CONFIGURED';
  if (apiKey.length <= 8) return '****';
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}
