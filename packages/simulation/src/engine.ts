import {
  ThermalObservation,
  Worker,
  Site,
  SimulationState,
} from '@sentinel/schemas';
import { SimulationScenario, PHOENIX_HEATWAVE_SCENARIO } from './scenario-data.js';
import { PHOENIX_CONSTRUCTION_SITES } from './sites-config.js';
import { generateSyntheticWorkers } from './worker-generator.js';

export interface SimulationTickResult {
  tick: number;
  simulatedTime: string;
  observations: ThermalObservation[];
  activeWorkerCount: number;
}

export type TickCallback = (result: SimulationTickResult) => void;

/**
 * Calculates accurate approximate Wet Bulb Temperature using Stull's formula (2011).
 * Valid for RH 5% - 99% and T -20°C to 50°C.
 */
export function calculateWetBulbC(tempC: number, rhPct: number): number {
  const t = tempC;
  const rh = rhPct;
  const tw =
    t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  return Math.round(tw * 10) / 10;
}

export class OfflineSimulationEngine {
  private scenario: SimulationScenario;
  private sites: Site[];
  private workers: Worker[];
  private currentTick: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private speedMultiplier: number = 1;
  private timer: NodeJS.Timeout | null = null;
  private tickIntervalMs: number = 1000; // 1 second real-time per tick at 1x
  private onTickCallback?: TickCallback;

  constructor(
    scenario: SimulationScenario = PHOENIX_HEATWAVE_SCENARIO,
    sites: Site[] = PHOENIX_CONSTRUCTION_SITES,
    seed: number = 42
  ) {
    this.scenario = scenario;
    this.sites = sites;
    this.workers = generateSyntheticWorkers({ seed, sites });
  }

  public getSites(): Site[] {
    return this.sites;
  }

  public getWorkers(): Worker[] {
    return this.workers;
  }

  public getScenario(): SimulationScenario {
    return this.scenario;
  }

  public getState(): SimulationState {
    const currentStep = this.getCurrentStep();
    return {
      running: this.isRunning,
      paused: this.isPaused,
      scenario_id: this.scenario.scenarioId,
      current_tick: this.currentTick,
      total_ticks: this.scenario.totalTicks,
      simulated_time: currentStep.timeOfDay,
      speed_multiplier: this.speedMultiplier,
      current_temp_c: currentStep.baseTemperatureC,
      current_humidity_pct: currentStep.humidityPct,
      active_workers: this.workers.length,
    };
  }

  public onTick(cb: TickCallback): void {
    this.onTickCallback = cb;
  }

  public start(speedMultiplier: number = 1): void {
    this.speedMultiplier = speedMultiplier;
    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextTick();
  }

  public pause(): void {
    this.isPaused = true;
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public resume(): void {
    if (this.isPaused) {
      this.isRunning = true;
      this.isPaused = false;
      this.scheduleNextTick();
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public reset(): void {
    this.stop();
    this.currentTick = 0;
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(20, multiplier));
    if (this.isRunning) {
      if (this.timer) clearTimeout(this.timer);
      this.scheduleNextTick();
    }
  }

  public step(): SimulationTickResult {
    const result = this.generateTickResult(this.currentTick);
    this.currentTick = (this.currentTick + 1) % this.scenario.totalTicks;
    if (this.onTickCallback) {
      this.onTickCallback(result);
    }
    return result;
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;

    const delay = Math.max(50, Math.round(this.tickIntervalMs / this.speedMultiplier));
    this.timer = setTimeout(() => {
      if (this.isRunning) {
        this.step();
        this.scheduleNextTick();
      }
    }, delay);
  }

  public generateTickResult(tick: number): SimulationTickResult {
    const stepData = this.interpolateStep(tick);
    const nowIso = new Date().toISOString();

    const observations: ThermalObservation[] = this.sites.map((site) => {
      const variation = stepData.siteVariations[site.site_id] ?? { tempOffsetC: 0, humidityOffsetPct: 0 };
      const siteTemp = Math.round((stepData.baseTemperatureC + variation.tempOffsetC) * 10) / 10;
      const siteHumidity = Math.max(5, Math.min(100, Math.round(stepData.humidityPct + variation.humidityOffsetPct)));
      const wetBulb = calculateWetBulbC(siteTemp, siteHumidity);

      return {
        observation_id: `obs_tick_${tick}_${site.site_id}`,
        site_id: site.site_id,
        timestamp: nowIso,
        temperature_c: siteTemp,
        humidity_pct: siteHumidity,
        wet_bulb_c: wetBulb,
        apparent_temperature_c: Math.round((siteTemp + 0.33 * (siteHumidity / 100 * 6.105 * Math.exp((17.27 * siteTemp) / (237.7 + siteTemp))) - 4.0) * 10) / 10,
        solar_irradiance: stepData.solarIrradiance,
        source: 'simulation',
        freshness_seconds: 0,
        confidence: 1.0,
        activity_id: `sim_act_${tick}`,
      };
    });

    return {
      tick,
      simulatedTime: stepData.timeOfDay,
      observations,
      activeWorkerCount: this.workers.length,
    };
  }

  private getCurrentStep() {
    return this.interpolateStep(this.currentTick);
  }

  private interpolateStep(tick: number) {
    const steps = this.scenario.steps;
    if (steps.length === 0) {
      throw new Error('Scenario has no steps configured');
    }

    // Find bounding steps
    let lower = steps[0];
    let upper = steps[steps.length - 1];

    for (let i = 0; i < steps.length; i++) {
      if (steps[i].tick <= tick) {
        lower = steps[i];
      }
      if (steps[i].tick >= tick) {
        upper = steps[i];
        break;
      }
    }

    if (lower.tick === upper.tick) {
      return lower;
    }

    const progress = (tick - lower.tick) / (upper.tick - lower.tick);

    const baseTemperatureC = lower.baseTemperatureC + progress * (upper.baseTemperatureC - lower.baseTemperatureC);
    const humidityPct = lower.humidityPct + progress * (upper.humidityPct - lower.humidityPct);
    const solarIrradiance = lower.solarIrradiance + progress * (upper.solarIrradiance - lower.solarIrradiance);

    // Compute hour/minute string
    const [startH, startM] = lower.timeOfDay.split(':').map(Number);
    const [endH, endM] = upper.timeOfDay.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const currentMins = Math.round(startMins + progress * (endMins - startMins));
    const hStr = String(Math.floor(currentMins / 60)).padStart(2, '0');
    const mStr = String(currentMins % 60).padStart(2, '0');

    return {
      tick,
      timeOfDay: `${hStr}:${mStr}`,
      baseTemperatureC: Math.round(baseTemperatureC * 10) / 10,
      humidityPct: Math.round(humidityPct * 10) / 10,
      solarIrradiance: Math.round(solarIrradiance),
      siteVariations: lower.siteVariations,
    };
  }
}
