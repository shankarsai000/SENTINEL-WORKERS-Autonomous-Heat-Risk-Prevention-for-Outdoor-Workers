import { FortyGuardClient } from '../client/fortyguard-client.js';
import { ActivityStatusResponse } from '../models/fortyguard-types.js';
import { FortyGuardNotFoundError, FortyGuardValidationError } from '../errors/fortyguard-errors.js';

export async function fetchActivityStatus(
  client: FortyGuardClient,
  activityId: string,
  correlationId?: string
): Promise<ActivityStatusResponse> {
  if (!activityId || activityId.trim().length === 0) {
    throw new FortyGuardValidationError('activityId must be a non-empty string.', correlationId);
  }

  const endpoint = `/v1/status/${encodeURIComponent(activityId)}`;

  try {
    const response = await client.get<any>(endpoint, undefined, correlationId);

    // Normalize response shape to standard ActivityStatusResponse
    const rawData = response?.data || response;
    const rawStatus = rawData?.status || 'Processing';

    // Normalize status string capitalization
    let normalizedStatus: 'Processing' | 'Completed' | 'Failed' = 'Processing';
    if (/completed/i.test(rawStatus)) {
      normalizedStatus = 'Completed';
    } else if (/failed/i.test(rawStatus) || /error/i.test(rawStatus)) {
      normalizedStatus = 'Failed';
    }

    return {
      status: response?.status || 'success',
      data: {
        activity_id: rawData?.activity_id || activityId,
        status: normalizedStatus,
        submitted_at: rawData?.submitted_at,
        completed_at: rawData?.completed_at,
        failed_at: rawData?.failed_at,
        result: rawData?.result || rawData,
        error: rawData?.error || response?.error,
        error_code: rawData?.error_code,
        credits_used: rawData?.credits_used,
      },
    };
  } catch (err: any) {
    if (err.http_status === 404) {
      throw new FortyGuardNotFoundError(
        `FortyGuard activity ${activityId} was not found.`,
        correlationId,
        activityId
      );
    }
    throw err;
  }
}
