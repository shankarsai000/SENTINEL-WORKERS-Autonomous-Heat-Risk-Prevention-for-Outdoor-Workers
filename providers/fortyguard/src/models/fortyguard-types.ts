import { z } from 'zod';

export type ActivityLifecycleStatus = 'Processing' | 'Completed' | 'Failed' | 'Pending';

export interface GeoJsonPolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][]; // Array of linear rings with [lon, lat]
}

export const GeoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z
    .array(
      z
        .array(
          z.tuple([
            z.number().min(-180).max(180), // Longitude
            z.number().min(-90).max(90),   // Latitude
          ])
        )
        .min(4)
    )
    .refine(
      (coords) => {
        const ring = coords[0];
        if (!ring || ring.length < 4) return false;
        const first = ring[0];
        const last = ring[ring.length - 1];
        return Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7;
      },
      { message: 'Polygon ring must be closed (first and last coordinate must be identical)' }
    ),
});

export const DateTimeObjectSchema = z.object({
  year: z.number().int().min(2019),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export type FortyGuardDateTimeObject = z.infer<typeof DateTimeObjectSchema>;

export const DateTimeInputSchema = z.union([
  z.string().min(1),
  DateTimeObjectSchema,
]);

export function toFortyGuardDateTime(input: any): any {
  if (typeof input === 'object' && input !== null && 'start_date' in input) {
    return input;
  }
  const d = typeof input === 'string' ? new Date(input) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const yyyy = validDate.getUTCFullYear();
  const mm = String(validDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(validDate.getUTCDate()).padStart(2, '0');
  const hh = String(validDate.getUTCHours()).padStart(2, '0');
  const min = String(validDate.getUTCMinutes()).padStart(2, '0');

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}:${min}`;

  return {
    filter_type: typeof input === 'object' && typeof input?.filter_type === 'number' ? input.filter_type : 1,
    start_date: dateStr,
    end_date: dateStr,
    start_time: timeStr,
    end_time: timeStr,
    year: yyyy,
    month: validDate.getUTCMonth() + 1,
    day: validDate.getUTCDate(),
    hour: validDate.getUTCHours(),
    minute: validDate.getUTCMinutes(),
  };
}

export const HeatmapSubmissionRequestSchema = z.object({
  polygon_aoi: GeoJsonPolygonSchema,
  date_time: DateTimeInputSchema,
  granularity: z.union([z.literal(60), z.literal(80), z.literal(100)]).default(80),
});

export type HeatmapSubmissionRequest = z.infer<typeof HeatmapSubmissionRequestSchema>;

export const EnvParamsSubmissionRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  temperature: z.number(),
  date_time: DateTimeInputSchema,
});

export type EnvParamsSubmissionRequest = z.infer<typeof EnvParamsSubmissionRequestSchema>;

export interface AsyncSubmissionResponse {
  status?: string;
  data: {
    activity_id: string;
    submitted_at?: string;
    estimated_credits?: number;
    message?: string;
  };
}

export interface HeatmapStatsData {
  minimum?: number;
  min?: number;
  maximum?: number;
  max?: number;
  mean?: number;
  standard_deviation?: number;
  std_dev?: number;
  count?: number;
  distribution?: Record<string, number>;
}

export interface EnvironmentalParametersData {
  heat_index?: number;
  apparent_temperature?: number;
  relative_humidity?: number;
  wet_bulb_temperature?: number;
  precipitation?: number;
  cloud_cover?: number;
  solar_irradiance?: {
    ghi?: number;
    dni?: number;
    dhi?: number;
  } | number;
  air_quality?: number | string | Record<string, number>;
  pm25?: number;
  pm10?: number;
  no2?: number;
  co?: number;
  o3?: number;
  so2?: number;
}

export interface ActivityStatusResponse {
  status?: string;
  data: {
    activity_id: string;
    status: ActivityLifecycleStatus;
    submitted_at?: string;
    completed_at?: string;
    failed_at?: string;
    result?: {
      map_data?: any;
      stats_data?: HeatmapStatsData;
      environmental_parameters?: EnvironmentalParametersData;
      // Flat env params directly on result
      heat_index?: number;
      apparent_temperature?: number;
      relative_humidity?: number;
      wet_bulb_temperature?: number;
      precipitation?: number;
      cloud_cover?: number;
      solar_irradiance?: any;
      air_quality?: any;
      temperature_c?: number;
    };
    error?: string;
    error_code?: string;
    credits_used?: number;
  };
}

export type ObservationSource =
  | 'FORTYGUARD_LIVE'
  | 'FORTYGUARD_CACHE'
  | 'SIMULATION'
  | 'OFFLINE';

export type FreshnessClassification = 'FRESH' | 'AGING' | 'STALE';

export interface DataQuality {
  source: ObservationSource;
  freshness: FreshnessClassification;
  completeness: 'FULL' | 'PARTIAL' | 'MINIMAL';
  provider_status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  missing_fields?: string[];
  validation_errors?: string[];
}

export interface NormalizedHeatmapResult {
  activity_id: string;
  site_id: string;
  timestamp: string;
  map_data: any;
  temperature_min: number;
  temperature_max: number;
  temperature_mean: number;
  temperature_standard_deviation: number;
  source: ObservationSource;
  provider: 'FortyGuard';
  provider_version: string;
  retrieved_at: string;
}
