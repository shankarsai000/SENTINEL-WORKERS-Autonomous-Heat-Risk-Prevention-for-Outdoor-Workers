import { FortyGuardClient } from './client.js';
import { FortyGuardAuthError, FortyGuardPlanError } from './errors.js';

export interface FortyGuardCapabilitySummary {
  configured: boolean;
  authenticated: boolean;
  heatmap: boolean;
  environmental_parameters: boolean;
  heat_intelligence: boolean;
  supported_granularities: number[];
  max_forecast_hours: number;
  reason: string | null;
}

export class FortyGuardCapabilities {
  public static async discover(client: FortyGuardClient): Promise<FortyGuardCapabilitySummary> {
    if (!client.isConfigured()) {
      return {
        configured: false,
        authenticated: false,
        heatmap: false,
        environmental_parameters: false,
        heat_intelligence: false,
        supported_granularities: [60, 80, 100],
        max_forecast_hours: 12,
        reason: 'NO_API_KEY_CONFIGURED',
      };
    }

    try {
      // Test authentication against a lightweight status probe or query
      await client.get('/v1/status/probe_auth_test', undefined, undefined, false);
      return {
        configured: true,
        authenticated: true,
        heatmap: true,
        environmental_parameters: true,
        heat_intelligence: false, // Premium-only
        supported_granularities: [60, 80, 100],
        max_forecast_hours: 12,
        reason: null,
      };
    } catch (err: any) {
      if (err instanceof FortyGuardAuthError) {
        return {
          configured: true,
          authenticated: false,
          heatmap: false,
          environmental_parameters: false,
          heat_intelligence: false,
          supported_granularities: [60, 80, 100],
          max_forecast_hours: 12,
          reason: 'AUTHENTICATION_FAILED',
        };
      }

      if (err instanceof FortyGuardPlanError) {
        return {
          configured: true,
          authenticated: true,
          heatmap: false,
          environmental_parameters: false,
          heat_intelligence: false,
          supported_granularities: [60, 80, 100],
          max_forecast_hours: 12,
          reason: 'PLAN_OR_AUTHORIZATION_DENIED',
        };
      }

      // If probe was 404 (ACTIVITY_NOT_FOUND), authentication succeeded!
      if (err?.http_status === 404 || err?.code === 'ACTIVITY_NOT_FOUND' || err?.statusCode === 404 || err?.errorCode === 'ACTIVITY_NOT_FOUND') {
        return {
          configured: true,
          authenticated: true,
          heatmap: true,
          environmental_parameters: true,
          heat_intelligence: false,
          supported_granularities: [60, 80, 100],
          max_forecast_hours: 12,
          reason: null,
        };
      }

      return {
        configured: true,
        authenticated: false,
        heatmap: false,
        environmental_parameters: false,
        heat_intelligence: false,
        supported_granularities: [60, 80, 100],
        max_forecast_hours: 12,
        reason: err.message || 'DISCOVERY_FAILED',
      };
    }
  }
}
