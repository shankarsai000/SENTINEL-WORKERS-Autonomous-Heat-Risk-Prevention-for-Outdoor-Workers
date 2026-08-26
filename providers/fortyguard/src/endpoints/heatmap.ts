import { FortyGuardClient } from '../client/fortyguard-client.js';
import {
  HeatmapSubmissionRequest,
  HeatmapSubmissionRequestSchema,
  AsyncSubmissionResponse,
} from '../models/fortyguard-types.js';
import { FortyGuardValidationError } from '../errors/fortyguard-errors.js';

export async function submitHeatmapRequest(
  client: FortyGuardClient,
  request: HeatmapSubmissionRequest,
  correlationId?: string
): Promise<AsyncSubmissionResponse> {
  const validated = HeatmapSubmissionRequestSchema.parse(request);

  // Validate US-only regional coverage constraint
  const ring = validated.polygon_aoi.coordinates[0];
  for (const [lon, lat] of ring) {
    if (lat < 18 || lat > 72 || lon < -170 || lon > -60) {
      throw new FortyGuardValidationError(
        `Coordinate [${lon}, ${lat}] is outside the United States regional coverage supported by FortyGuard.`,
        correlationId
      );
    }
  }

  // Validate date is not before 2019-01-01
  const reqDate = new Date(validated.date_time);
  if (isNaN(reqDate.getTime()) || reqDate < new Date('2019-01-01T00:00:00Z')) {
    throw new FortyGuardValidationError(
      `date_time (${validated.date_time}) must be a valid timestamp on or after 2019-01-01.`,
      correlationId
    );
  }

  const response = await client.post<any>('/v1/heatmap', validated, undefined, correlationId);

  const activityId = response?.data?.activity_id || response?.activity_id;
  if (!activityId) {
    throw new FortyGuardValidationError(
      'FortyGuard heatmap submission response did not contain an activity_id.',
      correlationId,
      response
    );
  }

  return {
    status: response?.status || 'success',
    data: {
      activity_id: activityId,
      submitted_at: response?.data?.submitted_at || new Date().toISOString(),
      estimated_credits: response?.data?.estimated_credits,
    },
  };
}
