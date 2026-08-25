import { ThermalObservation, Site } from '@sentinel/schemas';
import { FortyGuardClient, FortyGuardClientConfig } from './client.js';
import { FortyGuardPoller, ProviderActivity, PollerConfig } from './poller.js';
import { FortyGuardCache } from './cache.js';
import { FortyGuardCapabilities, FortyGuardCapabilitySummary } from './capabilities.js';
import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker.js';
import { normalizeFortyGuardResult } from './normalizer.js';
import {
  HeatmapRequest,
  HeatmapRequestSchema,
  EnvParamsRequest,
  EnvParamsRequestSchema,
  AsyncSubmissionResponse,
  AsyncSubmissionResponseSchema,
} from './schemas.js';

export interface FortyGuardAdapterConfig extends FortyGuardClientConfig, PollerConfig {
  cacheTtlSeconds?: number;
  offlineFallback?: boolean;
  circuitBreaker?: CircuitBreakerOptions;
}

export interface APIUsageRecord {
  id: string;
  provider: 'fortyguard';
  endpoint: string;
  activity_id: string;
  submitted_at: string;
  completed_at?: string;
  status: 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT';
  cache_hit: boolean;
  estimated_credit_cost: number | null;
  credits_used?: number;
  error_code?: string;
}

export class FortyGuardAdapter {
  private client: FortyGuardClient;
  private poller: FortyGuardPoller;
  private cache: FortyGuardCache;
  private circuitBreaker: CircuitBreaker;
  private offlineFallback: boolean;
  private usageLog: APIUsageRecord[] = [];

  constructor(config: FortyGuardAdapterConfig = {}) {
    this.client = new FortyGuardClient(config);
    this.poller = new FortyGuardPoller(this.client, config);
    this.cache = new FortyGuardCache(config.cacheTtlSeconds);
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.offlineFallback = config.offlineFallback ?? true;
  }

  public getClient(): FortyGuardClient {
    return this.client;
  }

  public getCache(): FortyGuardCache {
    return this.cache;
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Generates a valid closed GeoJSON Polygon AOI around a site coordinate.
   */
  public static generateSitePolygonAoi(lat: number, lon: number, radiusMeters: number = 300) {
    // 1 deg latitude ≈ 111,320m; 1 deg longitude ≈ 111,320m * cos(lat)
    const latDelta = radiusMeters / 111320;
    const lonDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));

    const minLat = Math.round((lat - latDelta) * 10000) / 10000;
    const maxLat = Math.round((lat + latDelta) * 10000) / 10000;
    const minLon = Math.round((lon - lonDelta) * 10000) / 10000;
    const maxLon = Math.round((lon + lonDelta) * 10000) / 10000;

    // Closed GeoJSON ring: [SW, NW, NE, SE, SW]
    const ring: [number, number][] = [
      [minLon, minLat],
      [minLon, maxLat],
      [maxLon, maxLat],
      [maxLon, minLat],
      [minLon, minLat], // Closes ring
    ];

    return {
      type: 'Polygon' as const,
      coordinates: [ring],
    };
  }

  /**
   * Submits a Heatmap task to FortyGuard Enterprise API (POST /v1/heatmap)
   */
  public async submitHeatmap(request: HeatmapRequest, correlationId?: string): Promise<AsyncSubmissionResponse> {
    const validated = HeatmapRequestSchema.parse(request);
    return await this.client.post<AsyncSubmissionResponse>(
      '/v1/heatmap',
      validated,
      AsyncSubmissionResponseSchema,
      correlationId
    );
  }

  /**
   * Submits an Environmental Parameters task to FortyGuard API (POST /v1/env_params)
   */
  public async submitEnvParams(request: EnvParamsRequest, correlationId?: string): Promise<AsyncSubmissionResponse> {
    const validated = EnvParamsRequestSchema.parse(request);
    return await this.client.post<AsyncSubmissionResponse>(
      '/v1/env_params',
      validated,
      AsyncSubmissionResponseSchema,
      correlationId
    );
  }

  /**
   * High-level operation: Fetches normalized thermal observation for a site using FortyGuard Heatmap.
   */
  public async fetchSiteHeatmapObservation(
    site: Site,
    options: {
      datetime?: string;
      granularity?: 60 | 80 | 100;
      filterType?: 1 | 2;
      startHour?: number;
      endHour?: number;
      correlationId?: string;
    } = {}
  ): Promise<{ observation: ThermalObservation; cacheHit: boolean }> {
    const aoi = FortyGuardAdapter.generateSitePolygonAoi(site.latitude, site.longitude);
    const cacheDatetime = options.datetime || 'latest';
    const requestDatetime = options.datetime || new Date().toISOString();
    const granularity = options.granularity || 80;
    const filterType = options.filterType || 1;

    const cacheKey = FortyGuardCache.generateKey('heatmap', {
      lat: site.latitude,
      lon: site.longitude,
      aoi,
      datetime: cacheDatetime,
      granularity,
      filterType,
    });

    const cached = this.cache.get(cacheKey);
    if (cached.hit && cached.data && !cached.isStale) {
      return {
        observation: {
          ...cached.data,
          source: 'fortyguard_cache',
          freshness_seconds: cached.ageSeconds || 0,
        },
        cacheHit: true,
      };
    }

    const usageRecord: APIUsageRecord = {
      id: `usg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider: 'fortyguard',
      endpoint: '/v1/heatmap',
      activity_id: '',
      submitted_at: new Date().toISOString(),
      status: 'SUBMITTED',
      cache_hit: false,
      estimated_credit_cost: null, // As per instruction: null if not given as exact measured fact
    };

    try {
      const observation = await this.circuitBreaker.execute(async () => {
        const submission = await this.submitHeatmap(
          {
            aoi,
            datetime_spec: requestDatetime,
            granularity_m: granularity,
            filter_type: filterType,
            start_hour: options.startHour,
            end_hour: options.endHour,
          },
          options.correlationId
        );

        usageRecord.activity_id = submission.activity_id;
        usageRecord.status = 'PROCESSING';

        const activity = await this.poller.pollActivity(
          submission.activity_id,
          'heatmap',
          submission.submitted_at,
          options.correlationId
        );

        usageRecord.completed_at = activity.completed_at;
        usageRecord.status = activity.status;
        usageRecord.credits_used = activity.credits_used;

        if (!activity.result) {
          throw new Error(`FortyGuard activity ${activity.activity_id} completed without result payload.`);
        }

        return normalizeFortyGuardResult(activity.result, {
          siteId: site.site_id,
          activityId: activity.activity_id,
          isCached: false,
        });
      });

      this.cache.set(cacheKey, observation);
      this.usageLog.push(usageRecord);

      return { observation, cacheHit: false };
    } catch (err: any) {
      usageRecord.status = 'FAILED';
      usageRecord.error_code = err.errorCode || err.name || 'UNKNOWN_ERROR';
      this.usageLog.push(usageRecord);
      throw err;
    }
  }

  /**
   * Tests provider connectivity and endpoint discovery.
   */
  public async testConnection(): Promise<FortyGuardCapabilitySummary> {
    return await FortyGuardCapabilities.discover(this.client);
  }

  public getUsageLog(): APIUsageRecord[] {
    return [...this.usageLog];
  }

  public getProviderStatus() {
    const cbStatus = this.circuitBreaker.getStatus();
    const isHealthy = this.client.isConfigured() && cbStatus.state === 'CLOSED';
    return {
      provider: 'FortyGuard Enterprise API (v1.0.0)',
      configured: this.client.isConfigured(),
      apiKeyMasked: this.client.getMaskedApiKey(),
      offlineFallback: this.offlineFallback,
      healthy: isHealthy,
      circuitBreaker: cbStatus,
      cacheStats: this.cache.getStats(),
      totalApiCalls: this.usageLog.length,
      successfulCalls: this.usageLog.filter((u) => u.status === 'COMPLETED').length,
      failedCalls: this.usageLog.filter((u) => u.status === 'FAILED' || u.status === 'TIMED_OUT').length,
    };
  }
}
