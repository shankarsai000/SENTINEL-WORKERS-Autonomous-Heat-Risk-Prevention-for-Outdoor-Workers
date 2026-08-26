import crypto from 'crypto';
import { ThermalObservation } from '@sentinel/schemas';

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  key: string;
  source: 'FORTYGUARD_LIVE' | 'FORTYGUARD_CACHE';
}

export class FortyGuardCache {
  private cache: Map<string, CacheEntry<ThermalObservation>> = new Map();
  private ttlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttlSeconds: number = 300) {
    this.ttlMs = ttlSeconds * 1000;
  }

  public static generateHeatmapKey(
    siteId: string,
    dateTime: string,
    granularity: number,
    polygonCoordinates: [number, number][] | [number, number][][]
  ): string {
    const polygonStr = JSON.stringify(polygonCoordinates);
    const hash = crypto.createHash('sha256').update(polygonStr).digest('hex').substring(0, 16);
    return `fg_heatmap_${siteId}_${dateTime}_${granularity}_${hash}`;
  }

  public static generateEnvParamsKey(
    siteId: string,
    lat: number,
    lon: number,
    dateTime: string
  ): string {
    const coordKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    return `fg_env_${siteId}_${coordKey}_${dateTime}`;
  }

  public static generateKey(
    type: 'heatmap' | 'env_params' | string,
    params: Record<string, any>
  ): string {
    const prefix = params.lat !== undefined && params.lon !== undefined ? `fg:${type}:${params.lat}:${params.lon}` : `fg:${type}`;
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc: any, k) => {
        acc[k] = params[k];
        return acc;
      }, {});
    const hash = crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex').substring(0, 16);
    return `${prefix}:${hash}`;
  }

  public get(key: string): {
    hit: boolean;
    data?: ThermalObservation;
    ageSeconds?: number;
    isStale?: boolean;
  } {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return { hit: false };
    }

    const ageMs = Date.now() - entry.cachedAt;
    const ageSeconds = Math.round(ageMs / 1000);
    const isStale = this.ttlMs === 0 || ageMs > this.ttlMs;

    this.hits++;
    return {
      hit: true,
      data: entry.data,
      ageSeconds,
      isStale,
    };
  }

  public set(key: string, data: ThermalObservation, customCachedAt?: number): void {
    this.cache.set(key, {
      data,
      cachedAt: customCachedAt !== undefined ? customCachedAt : Date.now(),
      key,
      source: 'FORTYGUARD_LIVE',
    });
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public size(): number {
    return this.cache.size;
  }

  public getStats() {
    let freshCount = 0;
    let staleCount = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (this.ttlMs > 0 && now - entry.cachedAt <= this.ttlMs) {
        freshCount++;
      } else {
        staleCount++;
      }
    }

    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      freshEntries: freshCount,
      staleEntries: staleCount,
      ttlSeconds: Math.round(this.ttlMs / 1000),
      hits: this.hits,
      misses: this.misses,
      hitRatio: Number(hitRatio.toFixed(2)),
    };
  }
}
