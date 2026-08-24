export interface ThermalScenarioStep {
  tick: number;
  timeOfDay: string; // e.g. "06:00", "07:00", etc.
  baseTemperatureC: number;
  humidityPct: number;
  solarIrradiance: number; // W/m^2
  siteVariations: Record<string, { tempOffsetC: number; humidityOffsetPct: number }>;
}

export interface SimulationScenario {
  scenarioId: string;
  name: string;
  description: string;
  durationHours: number;
  tickIntervalMinutes: number;
  totalTicks: number;
  steps: ThermalScenarioStep[];
}

/**
 * 12-Hour Phoenix Extreme Heatwave Scenario (06:00 to 18:00)
 * Morning start at 31°C climbing to afternoon peak 46.8°C with urban heat island offsets.
 */
export const PHOENIX_HEATWAVE_SCENARIO: SimulationScenario = {
  scenarioId: 'PHX_SUMMER_HEATWAVE_2026',
  name: 'Phoenix July Extreme Thermal Escalation (12-Hour Shift)',
  description: 'Deterministic scenario tracking a high-pressure heat dome event over Maricopa County with peak ambient temps exceeding 46°C.',
  durationHours: 12,
  tickIntervalMinutes: 15,
  totalTicks: 48,
  steps: [
    {
      tick: 0,
      timeOfDay: '06:00',
      baseTemperatureC: 31.2,
      humidityPct: 42,
      solarIrradiance: 120,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +0.4, humidityOffsetPct: -2 },
        'PHX-SITE-02': { tempOffsetC: +0.8, humidityOffsetPct: -1 },
        'PHX-SITE-03': { tempOffsetC: -0.5, humidityOffsetPct: +1 },
        'PHX-SITE-04': { tempOffsetC: +1.0, humidityOffsetPct: -4 },
        'PHX-SITE-05': { tempOffsetC: +0.2, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 4,
      timeOfDay: '07:00',
      baseTemperatureC: 33.5,
      humidityPct: 38,
      solarIrradiance: 350,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +0.6, humidityOffsetPct: -2 },
        'PHX-SITE-02': { tempOffsetC: +1.0, humidityOffsetPct: -1 },
        'PHX-SITE-03': { tempOffsetC: -0.4, humidityOffsetPct: +1 },
        'PHX-SITE-04': { tempOffsetC: +1.2, humidityOffsetPct: -3 },
        'PHX-SITE-05': { tempOffsetC: +0.3, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 8,
      timeOfDay: '08:00',
      baseTemperatureC: 36.0,
      humidityPct: 34,
      solarIrradiance: 580,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +0.8, humidityOffsetPct: -2 },
        'PHX-SITE-02': { tempOffsetC: +1.3, humidityOffsetPct: -2 },
        'PHX-SITE-03': { tempOffsetC: -0.3, humidityOffsetPct: +1 },
        'PHX-SITE-04': { tempOffsetC: +1.5, humidityOffsetPct: -4 },
        'PHX-SITE-05': { tempOffsetC: +0.4, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 12,
      timeOfDay: '09:00',
      baseTemperatureC: 38.5,
      humidityPct: 30,
      solarIrradiance: 780,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.0, humidityOffsetPct: -2 },
        'PHX-SITE-02': { tempOffsetC: +1.6, humidityOffsetPct: -2 },
        'PHX-SITE-03': { tempOffsetC: -0.2, humidityOffsetPct: +1 },
        'PHX-SITE-04': { tempOffsetC: +1.8, humidityOffsetPct: -4 },
        'PHX-SITE-05': { tempOffsetC: +0.5, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 16,
      timeOfDay: '10:00',
      baseTemperatureC: 40.8,
      humidityPct: 26,
      solarIrradiance: 920,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.2, humidityOffsetPct: -2 },
        'PHX-SITE-02': { tempOffsetC: +1.9, humidityOffsetPct: -2 },
        'PHX-SITE-03': { tempOffsetC: -0.1, humidityOffsetPct: +1 },
        'PHX-SITE-04': { tempOffsetC: +2.1, humidityOffsetPct: -3 },
        'PHX-SITE-05': { tempOffsetC: +0.6, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 20,
      timeOfDay: '11:00',
      baseTemperatureC: 42.6,
      humidityPct: 23,
      solarIrradiance: 1020,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.4, humidityOffsetPct: -1 },
        'PHX-SITE-02': { tempOffsetC: +2.2, humidityOffsetPct: -2 },
        'PHX-SITE-03': { tempOffsetC: 0.0, humidityOffsetPct: +1 },
        'PHX-SITE-04': { tempOffsetC: +2.4, humidityOffsetPct: -3 },
        'PHX-SITE-05': { tempOffsetC: +0.8, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 24,
      timeOfDay: '12:00',
      baseTemperatureC: 44.2,
      humidityPct: 20,
      solarIrradiance: 1080,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.5, humidityOffsetPct: -1 },
        'PHX-SITE-02': { tempOffsetC: +2.4, humidityOffsetPct: -2 },
        'PHX-SITE-03': { tempOffsetC: +0.2, humidityOffsetPct: +1 },
        'PHX-SITE-04': { tempOffsetC: +2.6, humidityOffsetPct: -3 },
        'PHX-SITE-05': { tempOffsetC: +0.9, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 28,
      timeOfDay: '13:00',
      baseTemperatureC: 45.4,
      humidityPct: 18,
      solarIrradiance: 1060,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.6, humidityOffsetPct: -1 },
        'PHX-SITE-02': { tempOffsetC: +2.6, humidityOffsetPct: -2 },
        'PHX-SITE-03': { tempOffsetC: +0.3, humidityOffsetPct: +1 },
        'PHX-SITE-04': { tempOffsetC: +2.8, humidityOffsetPct: -2 },
        'PHX-SITE-05': { tempOffsetC: +1.0, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 32,
      timeOfDay: '14:00',
      baseTemperatureC: 46.5,
      humidityPct: 17,
      solarIrradiance: 980,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.8, humidityOffsetPct: -1 },
        'PHX-SITE-02': { tempOffsetC: +2.8, humidityOffsetPct: -2 },
        'PHX-SITE-03': { tempOffsetC: +0.4, humidityOffsetPct: 0 },
        'PHX-SITE-04': { tempOffsetC: +3.0, humidityOffsetPct: -2 },
        'PHX-SITE-05': { tempOffsetC: +1.1, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 36,
      timeOfDay: '15:00',
      baseTemperatureC: 46.8,
      humidityPct: 16,
      solarIrradiance: 840,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.8, humidityOffsetPct: -1 },
        'PHX-SITE-02': { tempOffsetC: +2.9, humidityOffsetPct: -2 },
        'PHX-SITE-03': { tempOffsetC: +0.4, humidityOffsetPct: 0 },
        'PHX-SITE-04': { tempOffsetC: +2.9, humidityOffsetPct: -2 },
        'PHX-SITE-05': { tempOffsetC: +1.0, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 40,
      timeOfDay: '16:00',
      baseTemperatureC: 45.9,
      humidityPct: 16,
      solarIrradiance: 620,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.5, humidityOffsetPct: -1 },
        'PHX-SITE-02': { tempOffsetC: +2.5, humidityOffsetPct: -1 },
        'PHX-SITE-03': { tempOffsetC: +0.2, humidityOffsetPct: 0 },
        'PHX-SITE-04': { tempOffsetC: +2.4, humidityOffsetPct: -2 },
        'PHX-SITE-05': { tempOffsetC: +0.8, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 44,
      timeOfDay: '17:00',
      baseTemperatureC: 44.1,
      humidityPct: 17,
      solarIrradiance: 380,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +1.2, humidityOffsetPct: 0 },
        'PHX-SITE-02': { tempOffsetC: +2.1, humidityOffsetPct: -1 },
        'PHX-SITE-03': { tempOffsetC: +0.1, humidityOffsetPct: 0 },
        'PHX-SITE-04': { tempOffsetC: +1.9, humidityOffsetPct: -1 },
        'PHX-SITE-05': { tempOffsetC: +0.6, humidityOffsetPct: 0 },
      },
    },
    {
      tick: 47,
      timeOfDay: '17:45',
      baseTemperatureC: 41.8,
      humidityPct: 19,
      solarIrradiance: 150,
      siteVariations: {
        'PHX-SITE-01': { tempOffsetC: +0.9, humidityOffsetPct: 0 },
        'PHX-SITE-02': { tempOffsetC: +1.6, humidityOffsetPct: 0 },
        'PHX-SITE-03': { tempOffsetC: 0.0, humidityOffsetPct: 0 },
        'PHX-SITE-04': { tempOffsetC: +1.3, humidityOffsetPct: -1 },
        'PHX-SITE-05': { tempOffsetC: +0.4, humidityOffsetPct: 0 },
      },
    },
  ],
};
