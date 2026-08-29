import { describe, it, expect } from 'vitest';
import { HydrationEngine } from '../../packages/hydration/src/hydration-engine.js';

describe('HydrationEngine (Vision 2030 ACGIH TLV Guidelines)', () => {
  const engine = new HydrationEngine();

  it('calculates standard hydration for mild WBGT and acclimatized worker', () => {
    const plan = engine.calculatePlan({
      taskIntensity: 'LIGHT',
      acclimatizationStatus: 'baseline',
      wbgt_c: 24.0,
      temperature_c: 28.0,
      humidity_pct: 35,
      exposureDurationMins: 45,
    });

    expect(plan.intervalMinutes).toBeGreaterThanOrEqual(15);
    expect(plan.volumeMl).toBeGreaterThanOrEqual(200);
    expect(plan.electrolyteRecommended).toBe(false);
    expect(plan.urgency).toBe('NORMAL');
    expect(plan.scienceBasis).toContain('ACGIH TLV');
  });

  it('escalates to aggressive hydration and electrolyte for high WBGT', () => {
    const plan = engine.calculatePlan({
      taskIntensity: 'HEAVY',
      acclimatizationStatus: 'acclimatizing',
      wbgt_c: 32.5,
      temperature_c: 42.0,
      humidity_pct: 45,
      exposureDurationMins: 140,
      riskLevel: 'HIGH',
    });

    expect(plan.intervalMinutes).toBeLessThanOrEqual(12);
    expect(plan.volumeMl).toBeGreaterThanOrEqual(300);
    expect(plan.electrolyteRecommended).toBe(true);
    expect(plan.urgency).toMatch(/AGGRESSIVE|CRITICAL/);
    expect(plan.electrolyteType).toBe('aggressive_electrolyte');
  });

  it('adjusts fluid intake for unacclimatized worker', () => {
    const baselinePlan = engine.calculatePlan({
      taskIntensity: 'MODERATE',
      acclimatizationStatus: 'baseline',
      wbgt_c: 27.0,
      temperature_c: 32.0,
      humidity_pct: 40,
      exposureDurationMins: 60,
    });

    const unacclimatizedPlan = engine.calculatePlan({
      taskIntensity: 'MODERATE',
      acclimatizationStatus: 'acclimatizing',
      wbgt_c: 27.0,
      temperature_c: 32.0,
      humidity_pct: 40,
      exposureDurationMins: 60,
    });

    // Unacclimatized should require more frequent or higher fluid requirement
    expect(unacclimatizedPlan.hourlyRequirementMl).toBeGreaterThanOrEqual(baselinePlan.hourlyRequirementMl);
  });
});
