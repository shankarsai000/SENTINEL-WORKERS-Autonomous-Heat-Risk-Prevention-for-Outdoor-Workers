import { FortyGuardClient } from '../client/fortyguard-client.js';
import {
  EnvParamsSubmissionRequest,
  EnvParamsSubmissionRequestSchema,
  AsyncSubmissionResponse,
  toFortyGuardDateTime,
} from '../models/fortyguard-types.js';
import { FortyGuardValidationError } from '../errors/fortyguard-errors.js';

export async function submitEnvParamsRequest(
  client: FortyGuardClient,
  request: EnvParamsSubmissionRequest,
  correlationId?: string
): Promise<AsyncSubmissionResponse> {
  const validated = EnvParamsSubmissionRequestSchema.parse(request);

  if (
    validated.latitude < 18 ||
    validated.latitude > 72 ||
    validated.longitude < -170 ||
    validated.longitude > -60
  ) {
    throw new FortyGuardValidationError(
      `Location [${validated.latitude}, ${validated.longitude}] is outside the United States regional coverage supported by FortyGuard.`,
      correlationId
    );
  }

  const dtObj = toFortyGuardDateTime(validated.date_time);
  const payload = {
    ...validated,
    date_time: dtObj,
  };

  const response = await client.post<any>('/v1/env_params', payload, undefined, correlationId);

  const activityId = response?.data?.activity_id || response?.activity_id;
  if (!activityId) {
    // If the endpoint returns immediate synchronous environmental result data
    if (response?.data?.heat_index !== undefined || response?.heat_index !== undefined) {
      return {
        status: response?.status || 'success',
        data: {
          activity_id: `sync_env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          submitted_at: new Date().toISOString(),
          ...response?.data,
        },
      };
    }

    throw new FortyGuardValidationError(
      'FortyGuard env_params response did not contain activity_id or environmental data.',
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
