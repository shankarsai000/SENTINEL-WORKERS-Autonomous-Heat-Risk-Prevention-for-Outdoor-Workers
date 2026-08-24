import { describe, it, expect } from 'vitest';
import {
  OfflineSimulationEngine,
  calculateWetBulbC,
} from '../../packages/simulation/src/engine.js';
import { ThermalObservationSchema } from '../../packages/schemas/src/validators.js';

describe('Offline Simulation Engine & Physics Formulas', () => {
  it('calculates Wet Bulb temperature with accurate Stull formula approximation', () => {
    // 35°C at 50% RH -> approx 26.5°C wet bulb
    const wb1 = calculateWetBulbC(35, 50);
    expect(wb1).toBeGreaterThanOrEqual(25.5);
    expect(wb1).toBeLessThanOrEqual(27.5);

    // 45°C at 20% RH -> approx 24.5°C - 26.5°C wet bulb
    const wb2 = calculateWetBulbC(45, 20);
    expect(wb2).toBeGreaterThanOrEqual(23.5);
    expect(wb2).toBeLessThanOrEqual(27.5);
  });

  it('runs deterministic simulation steps with schema-valid observations', () => {
    const engine = new OfflineSimulationEngine();
    const tickResult0 = engine.step();

    expect(tickResult0.tick).toBe(0);
    expect(tickResult0.simulatedTime).toBe('06:00');
    expect(tickResult0.observations).toHaveLength(5);

    for (const obs of tickResult0.observations) {
      const parsed = ThermalObservationSchema.safeParse(obs);
      expect(parsed.success).toBe(true);
      expect(obs.temperature_c).toBeGreaterThanOrEqual(30);
      expect(obs.temperature_c).toBeLessThanOrEqual(35);
      expect(obs.source).toBe('simulation');
    }
  });

  it('progresses thermal curve over the 12-hour workday scenario', () => {
    const engine = new OfflineSimulationEngine();
    // Step forward to afternoon peak (tick 36 is ~15:00)
    for (let i = 0; i < 36; i++) {
      engine.step();
    }
    const peakTick = engine.step();
    expect(peakTick.simulatedTime).toBe('15:00');

    // Temperatures should peak around 46°C - 50°C
    for (const obs of peakTick.observations) {
      expect(obs.temperature_c).toBeGreaterThan(45.0);
    }
  });
});
