/**
 * FortyGuard Enterprise API Types (v1.0.0 Release Contract)
 */

export interface FortyGuardPolygonAOI {
  type: 'Polygon';
  coordinates: number[][][]; // [ [ [lon, lat], [lon, lat], ... ] ]
}

export interface FortyGuardHeatmapRequest {
  aoi: FortyGuardPolygonAOI;
  datetime_spec: string; // ISO 8601 or range
  resolution_m?: 60 | 80 | 100;
  forecast_hours?: number; // up to 12h
}

export interface FortyGuardEnvParamsRequest {
  lat: number;
  lon: number;
  datetime_spec: string;
  parameters?: Array<'temp_c' | 'humidity_pct' | 'wet_bulb_c' | 'solar_irradiance' | 'heat_index'>;
}

export interface FortyGuardAsyncSubmissionResponse {
  activity_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  submitted_at: string;
  estimated_credits: number;
}

export interface FortyGuardActivityStatusResponse {
  activity_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: {
    location?: { lat: number; lon: number };
    temperature_c: number;
    humidity_pct: number;
    wet_bulb_c?: number;
    solar_irradiance?: number;
    apparent_temperature_c?: number;
    observed_at: string;
    granularity_m?: number;
  };
  error?: string;
  credits_used?: number;
}
