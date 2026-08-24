import { ThermalObservation } from '@sentinel/schemas';
import {
  FortyGuardEnvParamsRequest,
  FortyGuardHeatmapRequest,
  FortyGuardAsyncSubmissionResponse,
  FortyGuardActivityStatusResponse,
} from './types.js';

export interface FortyGuardConfig {
  apiKey?: string;
  baseUrl?: string;
  offlineFallback?: boolean;
}

export class FortyGuardAdapter {
  private apiKey: string;
  private baseUrl: string;
  private offlineFallback: boolean;
  private cache: Map<string, { data: FortyGuardActivityStatusResponse; expiresAt: number }>;
  private totalCreditsUsed: number = 0;

  constructor(config: FortyGuardConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.FORTYGUARD_API_KEY ?? 'fg_placeholder';
    this.baseUrl = config.baseUrl ?? process.env.FORTYGUARD_API_URL ?? 'https://api.fortyguard.com/v1';
    this.offlineFallback = config.offlineFallback ?? true;
    this.cache = new Map();
  }

  public async submitHeatmap(request: FortyGuardHeatmapRequest): Promise<FortyGuardAsyncSubmissionResponse> {
    if (this.offlineFallback) {
      const activityId = `act_hm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return {
        activity_id: activityId,
        status: 'COMPLETED',
        submitted_at: new Date().toISOString(),
        estimated_credits: 5,
      };
    }

    // Phase P1 will execute real HTTP fetch with api-key header
    throw new Error('Real FortyGuard HTTP integration is scheduled for Phase P1.');
  }

  public async submitEnvParams(request: FortyGuardEnvParamsRequest): Promise<FortyGuardAsyncSubmissionResponse> {
    if (this.offlineFallback) {
      const activityId = `act_env_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return {
        activity_id: activityId,
        status: 'COMPLETED',
        submitted_at: new Date().toISOString(),
        estimated_credits: 1,
      };
    }

    throw new Error('Real FortyGuard HTTP integration is scheduled for Phase P1.');
  }

  public async getStatus(activityId: string): Promise<FortyGuardActivityStatusResponse> {
    const cached = this.cache.get(activityId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (this.offlineFallback) {
      const mockResult: FortyGuardActivityStatusResponse = {
        activity_id: activityId,
        status: 'COMPLETED',
        result: {
          location: { lat: 33.4484, lon: -112.074 },
          temperature_c: 41.5,
          humidity_pct: 22,
          wet_bulb_c: 27.8,
          solar_irradiance: 950,
          apparent_temperature_c: 43.1,
          observed_at: new Date().toISOString(),
          granularity_m: 80,
        },
        credits_used: 1,
      };
      this.totalCreditsUsed += 1;
      this.cache.set(activityId, { data: mockResult, expiresAt: Date.now() + 60000 });
      return mockResult;
    }

    throw new Error('Real FortyGuard HTTP integration is scheduled for Phase P1.');
  }

  public normalize(statusResponse: FortyGuardActivityStatusResponse, siteId: string): ThermalObservation {
    if (!statusResponse.result) {
      throw new Error(`Cannot normalize incomplete FortyGuard result for activity ${statusResponse.activity_id}`);
    }

    const res = statusResponse.result;
    return {
      observation_id: `obs_fg_${statusResponse.activity_id}`,
      site_id: siteId,
      timestamp: res.observed_at,
      temperature_c: res.temperature_c,
      humidity_pct: res.humidity_pct,
      wet_bulb_c: res.wet_bulb_c ?? 25.0,
      apparent_temperature_c: res.apparent_temperature_c,
      solar_irradiance: res.solar_irradiance ?? 800,
      source: 'fortyguard',
      freshness_seconds: 0,
      confidence: 0.98,
      activity_id: statusResponse.activity_id,
    };
  }

  public getUsageMetrics() {
    return {
      provider: 'FortyGuard Enterprise API (v1.0.0 Adapter)',
      totalCreditsEstimated: this.totalCreditsUsed,
      cacheEntries: this.cache.size,
      offlineFallback: this.offlineFallback,
    };
  }
}
