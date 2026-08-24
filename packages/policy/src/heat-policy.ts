import { RiskLevel, ActionType, TaskIntensity } from '@sentinel/schemas';

export interface WorkRestSchedule {
  workMinutes: number;
  restMinutes: number;
  shadeRequired: boolean;
  hydrationMlPerHour: number;
}

export interface HeatPolicyTier {
  level: RiskLevel;
  minTempC: number;
  minWetBulbC: number;
  scheduleByIntensity: Record<TaskIntensity, WorkRestSchedule>;
  primaryAction: ActionType;
  supervisorActionRequired: boolean;
  escalationTimeoutMinutes: number;
}

export interface SafetyPolicy {
  policyId: string;
  version: string;
  name: string;
  staleDataThresholdSeconds: number;
  tiers: HeatPolicyTier[];
}

export const DEFAULT_PHOENIX_POLICY: SafetyPolicy = {
  policyId: 'OSHA_NIOSH_PHX_V1',
  version: '2.0.0',
  name: 'Phoenix Extreme Heat Standard Policy (OSHA/NIOSH Inspired)',
  staleDataThresholdSeconds: 300, // 5 minutes
  tiers: [
    {
      level: 'GREEN',
      minTempC: 0,
      minWetBulbC: 0,
      scheduleByIntensity: {
        LIGHT: { workMinutes: 60, restMinutes: 0, shadeRequired: false, hydrationMlPerHour: 500 },
        MODERATE: { workMinutes: 60, restMinutes: 0, shadeRequired: false, hydrationMlPerHour: 750 },
        HEAVY: { workMinutes: 50, restMinutes: 10, shadeRequired: true, hydrationMlPerHour: 1000 },
      },
      primaryAction: 'MONITOR',
      supervisorActionRequired: false,
      escalationTimeoutMinutes: 60,
    },
    {
      level: 'WATCH',
      minTempC: 32.0,
      minWetBulbC: 26.0,
      scheduleByIntensity: {
        LIGHT: { workMinutes: 55, restMinutes: 5, shadeRequired: true, hydrationMlPerHour: 750 },
        MODERATE: { workMinutes: 45, restMinutes: 15, shadeRequired: true, hydrationMlPerHour: 1000 },
        HEAVY: { workMinutes: 40, restMinutes: 20, shadeRequired: true, hydrationMlPerHour: 1200 },
      },
      primaryAction: 'HYDRATION_REMINDER',
      supervisorActionRequired: false,
      escalationTimeoutMinutes: 30,
    },
    {
      level: 'ELEVATED',
      minTempC: 38.0,
      minWetBulbC: 29.0,
      scheduleByIntensity: {
        LIGHT: { workMinutes: 45, restMinutes: 15, shadeRequired: true, hydrationMlPerHour: 1000 },
        MODERATE: { workMinutes: 30, restMinutes: 30, shadeRequired: true, hydrationMlPerHour: 1250 },
        HEAVY: { workMinutes: 20, restMinutes: 40, shadeRequired: true, hydrationMlPerHour: 1500 },
      },
      primaryAction: 'SHADED_BREAK',
      supervisorActionRequired: true,
      escalationTimeoutMinutes: 15,
    },
    {
      level: 'HIGH',
      minTempC: 42.0,
      minWetBulbC: 31.0,
      scheduleByIntensity: {
        LIGHT: { workMinutes: 30, restMinutes: 30, shadeRequired: true, hydrationMlPerHour: 1250 },
        MODERATE: { workMinutes: 15, restMinutes: 45, shadeRequired: true, hydrationMlPerHour: 1500 },
        HEAVY: { workMinutes: 10, restMinutes: 50, shadeRequired: true, hydrationMlPerHour: 1500 },
      },
      primaryAction: 'MANDATORY_REST',
      supervisorActionRequired: true,
      escalationTimeoutMinutes: 10,
    },
    {
      level: 'CRITICAL',
      minTempC: 45.0,
      minWetBulbC: 33.0,
      scheduleByIntensity: {
        LIGHT: { workMinutes: 15, restMinutes: 45, shadeRequired: true, hydrationMlPerHour: 1500 },
        MODERATE: { workMinutes: 0, restMinutes: 60, shadeRequired: true, hydrationMlPerHour: 1500 },
        HEAVY: { workMinutes: 0, restMinutes: 60, shadeRequired: true, hydrationMlPerHour: 1500 },
      },
      primaryAction: 'STOP_WORK',
      supervisorActionRequired: true,
      escalationTimeoutMinutes: 5,
    },
  ],
};
