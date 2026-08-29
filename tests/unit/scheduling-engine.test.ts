import { describe, it, expect } from 'vitest';
import { SchedulingEngine, WorkTask } from '../../packages/scheduling/src/scheduling-engine.js';

describe('SchedulingEngine (Vision 2030 Diurnal Task Optimization)', () => {
  const engine = new SchedulingEngine();

  const testTasks: WorkTask[] = [
    { id: 'T-HEAVY-1', name: 'Excavation Trenching', zone_id: 'ZONE-A', durationHours: 4, intensity: 'HEAVY', tempSensitive: true, assignedWorkers: 20 },
    { id: 'T-MOD-1', name: 'Formwork Assembly', zone_id: 'ZONE-B', durationHours: 4, intensity: 'MODERATE', tempSensitive: false, assignedWorkers: 30 },
    { id: 'T-LIGHT-1', name: 'Electrical Conduit Check', zone_id: 'ZONE-C', durationHours: 2, intensity: 'LIGHT', tempSensitive: false, assignedWorkers: 15 },
  ];

  it('generates realistic diurnal temperature curve for Phoenix hot season', () => {
    const forecast = engine.generatePhoenixForecast(44.0);
    expect(forecast.length).toBe(13); // 06:00 to 18:00
    expect(forecast[0].hour).toBe(6);
    expect(forecast[0].temperature_c).toBeLessThan(30);
    expect(forecast[6].hour).toBe(12);
    expect(forecast[6].temperature_c).toBeGreaterThanOrEqual(43);
  });

  it('optimizes task sequence to schedule heavy exertion during cool morning hours', () => {
    const forecast = engine.generatePhoenixForecast(42.5);
    const result = engine.optimizeSchedule(testTasks, forecast, 'PHX-SITE-01');

    expect(result.scheduleId).toContain('SCHED-PHX-SITE-01');
    expect(result.optimizedSlots.length).toBeGreaterThan(0);

    // First scheduled task should be the heavy task in the morning
    const morningSlot = result.optimizedSlots[0];
    expect(morningSlot.intensity).toBe('HEAVY');
    expect(morningSlot.startHour).toBe(6);

    // Mandatory cooling break should be inserted during peak heat (12:00 - 14:00)
    const coolingBreak = result.optimizedSlots.find((s) => s.isCoolingBreak);
    expect(coolingBreak).toBeDefined();
    expect(coolingBreak?.startHour).toBe(12);
    expect(coolingBreak?.endHour).toBe(14);

    // Incident reduction must be 100% vs naive baseline
    expect(result.impactMetrics.predictedIncidentsOptimized).toBe(0);
    expect(result.impactMetrics.predictedIncidentsNaive).toBeGreaterThan(0);
    expect(result.impactMetrics.incidentReductionPct).toBe(100);
    expect(result.impactMetrics.productivityGainPct).toBeGreaterThan(20);
  });
});
