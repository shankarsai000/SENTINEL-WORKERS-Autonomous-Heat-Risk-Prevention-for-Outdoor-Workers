import { ThermalObservation, Site } from '@sentinel/schemas';
import { FortyGuardClient, FortyGuardClientOptions } from '../client/fortyguard-client.js';
import { ActivityPoller, PollerOptions } from '../polling/activity-poller.js';
import { FortyGuardCache } from '../cache/fortyguard-cache.js';
import { normalizeFortyGuardResult } from '../normalizer/fortyguard-normalizer.js';
import { submitHeatmapRequest } from '../endpoints/heatmap.js';
import { submitEnvParamsRequest } from '../endpoints/environmental-parameters.js';
import { fetchActivityStatus } from '../endpoints/status.js';
import {
  HeatmapSubmissionRequest,
  EnvParamsSubmissionRequest,
  AsyncSubmissionResponse,
  ActivityStatusResponse,
} from '../models/fortyguard-types.js';
import { CircuitBreaker, CircuitBreakerOptions } from '../circuit-breaker.js';
import { loadFortyGuardConfig } from '../config/fortyguard-config.js';

export interface FortyGuardAdapterOptions extends FortyGuardClientOptions, PollerOptions {
  cacheTtlSeconds?: number;
  circuitBreaker?: CircuitBreakerOptions;
  offlineFallback?: boolean;
}

export interface ActivityUsageLog {
  id: string;
  provider: 'FortyGuard';
  endpoint: string;
  activity_id: string;
  site_id?: string;
  submitted_at: string;
  completed_at?: string;
  status: 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  cache_hit: boolean;
  credits_used?: number;
  error_code?: string;
}

export class FortyGuardAdapter {
  private client: FortyGuardClient;
  private poller: ActivityPoller;
  private cache: FortyGuardCache;
  private circuitBreaker: CircuitBreaker;
  private offlineFallback: boolean;
  private usageLog: ActivityUsageLog[] = [];

  constructor(options: FortyGuardAdapterOptions = {}) {
    const config = loadFortyGuardConfig(options);
    this.client = new FortyGuardClient(options);
    this.poller = new ActivityPoller(this.client, {
      pollIntervalMs: config.pollIntervalMs,
      maxPollAttempts: config.maxPollAttempts,
      activityTimeoutMs: options.activityTimeoutMs,
      sleepFn: options.sleepFn,
    });
    this.cache = new FortyGuardCache(config.cacheTtlSeconds);
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.offlineFallback = options.offlineFallback ?? true;
  }

  public getClient(): FortyGuardClient {
    return this.client;
  }

  public getPoller(): ActivityPoller {
    return this.poller;
  }

  public getCache(): FortyGuardCache {
    return this.cache;
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Generates a valid closed GeoJSON Polygon AOI around a site coordinate.
   * Coordinate order: [longitude, latitude].
   * Closed ring: first coordinate equals last coordinate.
   */
  public static generateSitePolygonAoi(lat: number, lon: number, radiusMeters: number = 300) {
    const latDelta = radiusMeters / 111320;
    const lonDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));

    const minLat = Math.round((lat - latDelta) * 10000) / 10000;
    const maxLat = Math.round((lat + latDelta) * 10000) / 10000;
    const minLon = Math.round((lon - lonDelta) * 10000) / 10000;
    const maxLon = Math.round((lon + lonDelta) * 10000) / 10000;

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
   * Submits a Heatmap task to FortyGuard API (POST /v1/heatmap)
   */
  public async submitHeatmap(
    request: HeatmapSubmissionRequest,
    correlationId?: string
  ): Promise<AsyncSubmissionResponse> {
    return await submitHeatmapRequest(this.client, request, correlationId);
  }

  /**
   * Submits an Environmental Parameters task to FortyGuard API (POST /v1/env_params)
   */
  public async submitEnvParams(
    request: EnvParamsSubmissionRequest,
    correlationId?: string
  ): Promise<AsyncSubmissionResponse> {
    return await submitEnvParamsRequest(this.client, request, correlationId);
  }

  /**
   * Polls activity status by activity ID (GET /v1/status/{activity_id})
   */
  public async pollActivity(
    activityId: string,
    correlationId?: string
  ): Promise<ActivityStatusResponse> {
    return await this.poller.pollUntilComplete(activityId, correlationId);
  }

  /**
   * High-level operation: Fetches normalized thermal observation for a site using FortyGuard Heatmap and Env Params.
   */
  public async fetchSiteObservation(
    site: Site,
    options: {
      dateTime?: string;
      granularity?: 60 | 80 | 100;
      correlationId?: string;
    } = {}
  ): Promise<{ observation: ThermalObservation; cacheHit: boolean }> {
    const aoi = FortyGuardAdapter.generateSitePolygonAoi(site.latitude, site.longitude);
    const dateTime = options.dateTime || new Date().toISOString();
    const granularity = options.granularity || 80;

    const cacheKey = FortyGuardCache.generateHeatmapKey(
      site.site_id,
      dateTime.substring(0, 13), // Cache per hour bucket
      granularity,
      aoi.coordinates[0]
    );

    // 1. Check Credit Protection Cache
    const cached = this.cache.get(cacheKey);
    if (cached.hit && cached.data && !cached.isStale) {
      return {
        observation: {
          ...cached.data,
          source: 'fortyguard_cache' as any,
          freshness_seconds: cached.ageSeconds || 0,
        },
        cacheHit: true,
      };
    }

    const usageRecord: ActivityUsageLog = {
      id: `usg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider: 'FortyGuard',
      endpoint: '/v1/heatmap',
      activity_id: '',
      site_id: site.site_id,
      submitted_at: new Date().toISOString(),
      status: 'SUBMITTED',
      cache_hit: false,
    };

    try {
      const observation = await this.circuitBreaker.execute(async () => {
        // Step 1: Submit Heatmap Request
        const submission = await this.submitHeatmap(
          {
            polygon_aoi: aoi,
            date_time: dateTime,
            granularity,
          },
          options.correlationId
        );

        usageRecord.activity_id = submission.data.activity_id;
        usageRecord.status = 'PROCESSING';

        // Step 2: Poll Until Completed
        const completedActivity = await this.pollActivity(
          submission.data.activity_id,
          options.correlationId
        );

        usageRecord.completed_at = completedActivity.data.completed_at || new Date().toISOString();
        usageRecord.status = 'COMPLETED';
        usageRecord.credits_used = completedActivity.data.credits_used;

        // Step 3: Normalize Response
        return normalizeFortyGuardResult(completedActivity.data.result, {
          siteId: site.site_id,
          activityId: completedActivity.data.activity_id,
          source: 'FORTYGUARD_LIVE',
          observedAt: completedActivity.data.submitted_at || dateTime,
          retrievedAt: new Date().toISOString(),
        });
      });

      this.cache.set(cacheKey, observation);
      this.usageLog.push(usageRecord);

      return { observation, cacheHit: false };
    } catch (err: any) {
      usageRecord.status = 'FAILED';
      usageRecord.error_code = err.code || err.errorCode || err.name || 'UNKNOWN_ERROR';
      this.usageLog.push(usageRecord);

      if (this.offlineFallback) {
        const simObs: ThermalObservation = {
          observation_id: `obs_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          site_id: site.site_id,
          timestamp: dateTime,
          temperature_c: 41.5,
          humidity_pct: 25.0,
          wet_bulb_c: 27.5,
          solar_irradiance: 850,
          source: 'simulation',
          freshness_seconds: 0,
          confidence: 0.70,
          apparent_temperature_c: 44.0,
          provenance: {
            provider: 'simulation_fallback',
            source: 'simulation',
            error: err.message,
          },
        };
        return { observation: simObs, cacheHit: false };
      }

      throw err;
    }
  }

  /**
   * Alias for fetchSiteObservation for backward compatibility
   */
  public async fetchSiteHeatmapObservation(
    site: Site,
    options: {
      dateTime?: string;
      datetime?: string;
      granularity?: 60 | 80 | 100;
      correlationId?: string;
    } = {}
  ): Promise<{ observation: ThermalObservation; cacheHit: boolean }> {
    return await this.fetchSiteObservation(site, {
      dateTime: options.dateTime || options.datetime,
      granularity: options.granularity,
      correlationId: options.correlationId,
    });
  }

  /**
   * Diagnostic connection test that safely validates reachability without exposing secrets.
   */
  public async testConnection(): Promise<{
    provider: string;
    configured: boolean;
    reachable: boolean;
    authenticated: boolean;
    heatmap: boolean;
    environmental_parameters: boolean;
    latency_ms: number;
    error?: string;
  }> {
    if (!this.client.isConfigured()) {
      return {
        provider: 'FortyGuard',
        configured: false,
        reachable: false,
        authenticated: false,
        heatmap: false,
        environmental_parameters: false,
        latency_ms: 0,
        error: 'AUTHENTICATION_FAILED',
      };
    }

    const start = Date.now();
    try {
      // Diagnostic lightweight query (fetch a dummy activity status or diagnostic probe)
      await fetchActivityStatus(this.client, 'diag_probe_001');
      return {
        provider: 'FortyGuard',
        configured: true,
        reachable: true,
        authenticated: true,
        heatmap: true,
        environmental_parameters: true,
        latency_ms: Date.now() - start,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      if (err.http_status === 404 || err.code === 'ACTIVITY_NOT_FOUND') {
        // HTTP 404 means the API key was valid and accepted, but the probe ID doesn't exist
        return {
          provider: 'FortyGuard',
          configured: true,
          reachable: true,
          authenticated: true,
          heatmap: true,
          environmental_parameters: true,
          latency_ms: latency,
        };
      }

      if (err.http_status === 401 || err.code === 'AUTHENTICATION_FAILED') {
        return {
          provider: 'FortyGuard',
          configured: true,
          reachable: false,
          authenticated: false,
          heatmap: false,
          environmental_parameters: false,
          latency_ms: latency,
          error: 'AUTHENTICATION_FAILED',
        };
      }

      return {
        provider: 'FortyGuard',
        configured: true,
        reachable: false,
        authenticated: false,
        heatmap: false,
        environmental_parameters: false,
        latency_ms: latency,
        error: err.code || 'PROVIDER_UNAVAILABLE',
      };
    }
  }

  public getUsageLog(): ActivityUsageLog[] {
    return [...this.usageLog];
  }

  public getProviderStatus() {
    const cbStatus = this.circuitBreaker.getStatus();
    const isHealthy = this.client.isConfigured() && cbStatus.state === 'CLOSED';
    return {
      provider: 'FortyGuard',
      configured: this.client.isConfigured(),
      apiKeyMasked: this.client.getMaskedApiKey(),
      offlineFallback: this.offlineFallback,
      healthy: isHealthy,
      circuitBreaker: cbStatus,
      cacheStats: this.cache.getStats(),
      totalApiCalls: this.usageLog.length,
      successfulCalls: this.usageLog.filter((u) => u.status === 'COMPLETED').length,
      failedCalls: this.usageLog.filter((u) => u.status === 'FAILED').length,
    };
  }
}
