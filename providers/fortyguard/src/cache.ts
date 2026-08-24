import crypto from 'crypto';
import { ThermalObservation } from '@sentinel/schemas';

export interface CacheEntry<T> {
  key: string;
  data: T;
  cachedAt: number; // ms timestamp
  expiresAt: number; // ms timestamp
}

export interface CacheLookupResult<T> {
  hit: boolean;
  data?: T;
  ageSeconds?: number;
  isStale: boolean;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRatio: number;
}

export class FortyGuardCache {
  private store: Map<string, CacheEntry<ThermalObservation>> = new Map();
  private defaultTtlSeconds: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(defaultTtlSeconds: number = parseInt(process.env.FORTYGUARD_CACHE_TTL_SECONDS || '300', 10)) {
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  public static generateKey(
    operation: string,
    params: {
      lat?: number;
      lon?: number;
      aoi?: Record<string, unknown>;
      datetime?: string;
      granularity?: number;
      filterType?: number;
    }
  ): string {
    const aoiHash = params.aoi
      ? crypto.createHash('sha256').update(JSON.stringify(params.aoi)).digest('hex').substring(0, 12)
      : 'no_aoi';

    const latStr = params.lat !== undefined ? params.lat.toFixed(4) : 'none';
    const lonStr = params.lon !== undefined ? params.lon.toFixed(4) : 'none';
    const dtStr = params.datetime || 'latest';
    const granStr = params.granularity ? String(params.granularity) : 'default';
    const ftStr = params.filterType ? String(params.filterType) : '1';

    return `fg:${operation}:${latStr}:${lonStr}:${aoiHash}:${dtStr}:${granStr}:${ftStr}`;
  }

  public get(key: string): CacheLookupResult<ThermalObservation> {
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry) {
      this.misses++;
      return { hit: false, isStale: true };
    }

    const ageSeconds = Math.floor((now - entry.cachedAt) / 1000);
    const isExpired = now >= entry.expiresAt;

    if (isExpired) {
      this.misses++;
      return {
        hit: true,
        data: entry.data,
        ageSeconds,
        isStale: true,
      };
    }

    this.hits++;
    return {
      hit: true,
      data: entry.data,
      ageSeconds,
      isStale: false,
    };
  }

  public set(key: string, data: ThermalObservation, ttlSeconds?: number): void {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const now = Date.now();
    this.store.set(key, {
      key,
      data,
      cachedAt: now,
      expiresAt: now + ttl * 1000,
    });
  }

  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? Math.round((this.hits / total) * 100) / 100 : 0,
    };
  }

  public clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
