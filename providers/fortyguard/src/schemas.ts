import { z } from 'zod';

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
        .min(4) // Minimum 4 points for a closed linear ring
    )
    .refine((coords) => {
      const ring = coords[0];
      if (!ring || ring.length < 4) return false;
      const first = ring[0];
      const last = ring[ring.length - 1];
      return first[0] === last[0] && first[1] === last[1];
    }, { message: 'Polygon ring must be closed (first and last coordinate must be identical)' }),
});

export const HeatmapRequestSchema = z.object({
  aoi: GeoJsonPolygonSchema,
  datetime_spec: z.string().min(1),
  granularity_m: z.union([z.literal(60), z.literal(80), z.literal(100)]).default(80),
  filter_type: z.union([z.literal(1), z.literal(2)]).default(1), // 1 = Single Hour, 2 = Range
  start_hour: z.number().int().min(0).max(23).optional(),
  end_hour: z.number().int().min(0).max(23).optional(),
  forecast_hours: z.number().min(0).max(12).optional(),
});

export const EnvParamsRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  datetime_spec: z.string().min(1),
  parameters: z
    .array(
      z.enum([
        'temperature_c',
        'apparent_temperature_c',
        'wet_bulb_c',
        'humidity_pct',
        'solar_irradiance',
        'heat_index',
        'air_quality',
      ])
    )
    .optional(),
});

export const AsyncSubmissionResponseSchema = z.object({
  activity_id: z.string().min(1),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  submitted_at: z.string(),
  estimated_credits: z.number().optional(),
});

export const FortyGuardResultPayloadSchema = z.object({
  location: z
    .object({
      lat: z.number(),
      lon: z.number(),
    })
    .optional(),
  temperature_c: z.number(),
  humidity_pct: z.number().optional(),
  wet_bulb_c: z.number().optional(),
  solar_irradiance: z.number().optional(),
  apparent_temperature_c: z.number().optional(),
  air_quality: z.union([z.number(), z.string()]).optional(),
  observed_at: z.string().optional(),
  granularity_m: z.number().optional(),
});

export const ActivityStatusResponseSchema = z.object({
  activity_id: z.string().min(1),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  result: FortyGuardResultPayloadSchema.optional(),
  error: z.string().optional(),
  credits_used: z.number().optional(),
});

export type HeatmapRequest = z.infer<typeof HeatmapRequestSchema>;
export type EnvParamsRequest = z.infer<typeof EnvParamsRequestSchema>;
export type AsyncSubmissionResponse = z.infer<typeof AsyncSubmissionResponseSchema>;
export type ActivityStatusResponse = z.infer<typeof ActivityStatusResponseSchema>;
export type FortyGuardResultPayload = z.infer<typeof FortyGuardResultPayloadSchema>;
