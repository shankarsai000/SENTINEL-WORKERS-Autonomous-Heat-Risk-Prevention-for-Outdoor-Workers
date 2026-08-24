import {
  ThermalObservation,
  RiskState,
  Action,
  Incident,
  Worker,
  Site,
  SimulationState,
} from '@sentinel/schemas';
import { OfflineSimulationEngine, SimulationTickResult } from '@sentinel/simulation';
import { PolicyGuardrails, DEFAULT_PHOENIX_POLICY } from '@sentinel/policy';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';
import { SentinelDatabase } from '../db/database.js';
import { AuditService } from './audit-service.js';
import { SentinelWebSocketServer } from './websocket-server.js';
import pino from 'pino';

const logger = pino({ name: 'sentinel-orchestrator' });

export type ThermalDataMode = 'offline' | 'fortyguard' | 'hybrid';

export class SentinelOrchestrator {
  private engine: OfflineSimulationEngine;
  private db: SentinelDatabase;
  private audit: AuditService;
  private guardrails: PolicyGuardrails;
  private wsServer?: SentinelWebSocketServer;
  private fortyGuard: FortyGuardAdapter;
  private riskServiceUrl: string;
  private thermalDataMode: ThermalDataMode;
  private workerExposureTracker: Map<string, { exposureMins: number; recoveryMins: number }> = new Map();
  private activeClusterIncidents: Map<string, Incident> = new Map();

  constructor(
    db: SentinelDatabase,
    audit: AuditService,
    engine: OfflineSimulationEngine,
    wsServer?: SentinelWebSocketServer,
    riskServiceUrl: string = process.env.RISK_SERVICE_URL || 'http://localhost:8000',
    fortyGuardAdapter?: FortyGuardAdapter,
    initialMode?: ThermalDataMode
  ) {
    this.db = db;
    this.audit = audit;
    this.engine = engine;
    this.wsServer = wsServer;
    this.guardrails = new PolicyGuardrails(DEFAULT_PHOENIX_POLICY);
    this.fortyGuard = fortyGuardAdapter || new FortyGuardAdapter({ offlineFallback: true });
    this.riskServiceUrl = riskServiceUrl;
    this.thermalDataMode = initialMode || (process.env.THERMAL_DATA_MODE as ThermalDataMode) || 'offline';

    // Connect tick listener for offline/hybrid simulation
    this.engine.onTick((tickResult: SimulationTickResult) => {
      this.handleSimulationTick(tickResult);
    });
  }

  public setWebSocketServer(wsServer: SentinelWebSocketServer): void {
    this.wsServer = wsServer;
  }

  public getThermalDataMode(): ThermalDataMode {
    return this.thermalDataMode;
  }

  public setThermalDataMode(mode: ThermalDataMode): void {
    logger.info({ event: 'THERMAL_DATA_MODE_CHANGED', previous: this.thermalDataMode, new: mode });
    this.thermalDataMode = mode;
    this.audit.recordAuditEvent('SIMULATION_STATE_CHANGED', 'orchestrator_mode', {
      mode,
      timestamp: new Date().toISOString(),
    });
    this.broadcastSimulationStatus();
  }

  public getFortyGuardAdapter(): FortyGuardAdapter {
    return this.fortyGuard;
  }

  public getSimulationState(): SimulationState {
    return this.engine.getState();
  }

  public startSimulation(speedMultiplier: number = 1): void {
    logger.info({ event: 'SIMULATION_START', speedMultiplier, mode: this.thermalDataMode });
    this.engine.start(speedMultiplier);
    this.broadcastSimulationStatus();
    this.audit.recordAuditEvent('SIMULATION_STATE_CHANGED', 'simulation_engine', {
      action: 'START',
      speedMultiplier,
      tick: this.engine.getState().current_tick,
      mode: this.thermalDataMode,
    });
  }

  public pauseSimulation(): void {
    logger.info({ event: 'SIMULATION_PAUSE' });
    this.engine.pause();
    this.broadcastSimulationStatus();
    this.audit.recordAuditEvent('SIMULATION_STATE_CHANGED', 'simulation_engine', {
      action: 'PAUSE',
      tick: this.engine.getState().current_tick,
    });
  }

  public resumeSimulation(): void {
    logger.info({ event: 'SIMULATION_RESUME' });
    this.engine.resume();
    this.broadcastSimulationStatus();
    this.audit.recordAuditEvent('SIMULATION_STATE_CHANGED', 'simulation_engine', {
      action: 'RESUME',
      tick: this.engine.getState().current_tick,
    });
  }

  public stopSimulation(): void {
    logger.info({ event: 'SIMULATION_STOP' });
    this.engine.stop();
    this.broadcastSimulationStatus();
    this.audit.recordAuditEvent('SIMULATION_STATE_CHANGED', 'simulation_engine', {
      action: 'STOP',
      tick: this.engine.getState().current_tick,
    });
  }

  public stepSimulation(): SimulationTickResult {
    return this.engine.step();
  }

  public setSpeed(multiplier: number): void {
    this.engine.setSpeed(multiplier);
    this.broadcastSimulationStatus();
  }

  /**
   * Fetches observation for a site using FortyGuard provider or hybrid fallback.
   */
  public async fetchSiteObservation(siteId: string): Promise<ThermalObservation> {
    const sites = this.db.getSites();
    const site = sites.find((s) => s.site_id === siteId);
    if (!site) {
      throw new Error(`Site ${siteId} not found in database.`);
    }

    if (this.thermalDataMode === 'offline') {
      const step = this.engine.step();
      const obs = step.observations.find((o) => o.site_id === siteId) || step.observations[0];
      await this.processSingleObservation(obs, step.tick);
      return obs;
    }

    try {
      // In fortyguard or hybrid mode: try FortyGuard adapter
      const result = await this.fortyGuard.fetchSiteHeatmapObservation(site);
      const obs = result.observation;
      await this.processSingleObservation(obs, this.engine.getState().current_tick);
      return obs;
    } catch (err: any) {
      if (this.thermalDataMode === 'hybrid') {
        logger.warn({
          event: 'FORTYGUARD_HYBRID_FALLBACK',
          siteId,
          error: err.message,
          msg: 'Falling back to deterministic simulation observation',
        });
        const step = this.engine.step();
        const fallbackObs = step.observations.find((o) => o.site_id === siteId) || step.observations[0];
        // Ensure source is explicitly marked as simulation
        fallbackObs.source = 'simulation';
        await this.processSingleObservation(fallbackObs, step.tick);
        return fallbackObs;
      }
      throw err;
    }
  }

  public async handleSimulationTick(tickResult: SimulationTickResult): Promise<void> {
    const { tick, observations } = tickResult;

    for (const rawObs of observations) {
      let activeObs = rawObs;

      // In fortyguard or hybrid mode: attempt to enrich observation from provider
      if (this.thermalDataMode === 'fortyguard' || this.thermalDataMode === 'hybrid') {
        const sites = this.db.getSites();
        const site = sites.find((s) => s.site_id === rawObs.site_id);
        if (site) {
          try {
            const fgResult = await this.fortyGuard.fetchSiteHeatmapObservation(site);
            activeObs = fgResult.observation;
          } catch (err: any) {
            if (this.thermalDataMode === 'fortyguard') {
              logger.error({ event: 'FORTYGUARD_FETCH_FAILED', siteId: site.site_id, error: err.message });
              continue; // In strict fortyguard mode, skip on failure
            }
            // In hybrid mode, continue with simulation observation
            activeObs.source = 'simulation';
          }
        }
      }

      await this.processSingleObservation(activeObs, tick);
    }

    // Broadcast simulation progress
    this.broadcastSimulationStatus();
  }

  private async processSingleObservation(obs: ThermalObservation, tick: number): Promise<void> {
    // 1. Ingest & Persist Observation
    this.db.saveObservation(obs);
    this.audit.recordAuditEvent('OBSERVATION_INGESTED', obs.observation_id, {
      site_id: obs.site_id,
      temperature_c: obs.temperature_c,
      humidity_pct: obs.humidity_pct,
      wet_bulb_c: obs.wet_bulb_c,
      solar_irradiance: obs.solar_irradiance,
      source: obs.source,
      tick,
    });

    // Broadcast Observation to Dashboard
    this.wsServer?.broadcast('THERMAL_OBSERVATION', obs);

    // 2. Fetch workers assigned to this site
    const workers = this.db.getWorkers(obs.site_id);
    if (workers.length === 0) return;

    // Update exposure duration tracker
    for (const w of workers) {
      const current = this.workerExposureTracker.get(w.worker_id) || { exposureMins: 0, recoveryMins: 0 };
      current.exposureMins += 15;
      this.workerExposureTracker.set(w.worker_id, current);
    }

    // 3. Evaluate Risk via Risk Service or fallback
    const evaluatedRiskStates = await this.evaluateBatchRisk(workers, obs);

    // 4. Check Guardrails and Policy
    const processedRiskStates: RiskState[] = [];
    const criticalWorkersInZone: string[] = [];

    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      let risk = evaluatedRiskStates[i];

      // Evaluate guardrails
      const guardrailCheck = this.guardrails.checkEmergencyConditions(worker, risk, obs);
      if (!guardrailCheck.passed && guardrailCheck.enforcedAction) {
        risk = {
          ...risk,
          score: Math.max(risk.score, 0.88),
          level: 'CRITICAL',
          reason_codes: [...risk.reason_codes, 'GUARDRAIL_EMERGENCY_OVERRIDE'],
        };
        this.issueAction(guardrailCheck.enforcedAction);
      } else if (risk.level === 'HIGH' || risk.level === 'CRITICAL' || risk.level === 'ELEVATED') {
        this.evaluateAndIssueWorkerAction(worker, risk, obs);
      }

      if (risk.level === 'HIGH' || risk.level === 'CRITICAL') {
        criticalWorkersInZone.push(worker.worker_id);
      }

      processedRiskStates.push(risk);
    }

    // Save processed risk states
    this.db.saveRiskStates(processedRiskStates);

    // Broadcast risk states batch
    this.wsServer?.broadcast('RISK_STATE_UPDATE', {
      site_id: obs.site_id,
      timestamp: obs.timestamp,
      risk_states: processedRiskStates,
    });

    // 5. Cluster Incident Detection
    if (criticalWorkersInZone.length >= 3) {
      this.handleClusterIncident(obs.site_id, criticalWorkersInZone, obs.temperature_c);
    }
  }

  private async evaluateBatchRisk(workers: Worker[], obs: ThermalObservation): Promise<RiskState[]> {
    try {
      const payload = {
        site_id: obs.site_id,
        observation: {
          observation_id: obs.observation_id,
          site_id: obs.site_id,
          timestamp: obs.timestamp,
          temperature_c: obs.temperature_c,
          humidity_pct: obs.humidity_pct,
          wet_bulb_c: obs.wet_bulb_c,
          apparent_temperature_c: obs.apparent_temperature_c,
          solar_irradiance: obs.solar_irradiance,
          source: obs.source,
          freshness_seconds: obs.freshness_seconds,
          confidence: obs.confidence,
        },
        workers: workers.map((w) => {
          const tracker = this.workerExposureTracker.get(w.worker_id) || { exposureMins: 0, recoveryMins: 0 };
          return {
            worker_id: w.worker_id,
            site_id: w.site_id,
            role: w.role,
            task_intensity: w.task_intensity,
            risk_modifier: w.risk_modifier,
            exposure_duration_mins: tracker.exposureMins,
            recent_recovery_mins: tracker.recoveryMins,
          };
        }),
      };

      const response = await fetch(`${this.riskServiceUrl}/evaluate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(150),
      });

      if (response.ok) {
        const data = (await response.json()) as { risk_states: RiskState[] };
        return data.risk_states;
      }
    } catch (err) {
      // Clean fallback to deterministic local logic without error spam
    }

    // Local deterministic fallback calculation
    return workers.map((w) => {
      const tracker = this.workerExposureTracker.get(w.worker_id) || { exposureMins: 0, recoveryMins: 0 };
      const temp = obs.temperature_c;
      const wb = obs.wet_bulb_c;
      const effectiveTemp = 0.7 * wb + 0.3 * temp;
      const envScore = Math.max(0, Math.min(1, (effectiveTemp - 25) / 20));
      const expScore = Math.max(0, Math.min(1, tracker.exposureMins / 360));
      const taskScore = w.task_intensity === 'HEAVY' ? 0.9 : w.task_intensity === 'MODERATE' ? 0.5 : 0.2;
      const modScore = w.risk_modifier === 'elevated' ? 0.8 : w.risk_modifier === 'acclimatizing' ? 0.5 : 0.1;

      let score = 0.45 * envScore + 0.25 * expScore + 0.20 * taskScore + 0.10 * modScore;
      if (temp >= 45) score = Math.max(score, 0.86);
      else if (temp >= 42) score = Math.max(score, 0.72);
      score = Math.round(score * 100) / 100;

      let level: RiskState['level'] = 'GREEN';
      const reasonCodes: string[] = [];

      if (score >= 0.85) {
        level = 'CRITICAL';
        reasonCodes.push('CRITICAL_HEAT_STRESS_IMMOBILIZATION_RISK', 'EXTREME_AMBIENT_HEAT');
      } else if (score >= 0.70) {
        level = 'HIGH';
        reasonCodes.push('HIGH_RISK_IMMEDIATE_ACTION_REQUIRED', 'HIGH_TEMPERATURE');
      } else if (score >= 0.50) {
        level = 'ELEVATED';
        reasonCodes.push('ELEVATED_RISK_SCHEDULED_REST_REQUIRED');
      } else if (score >= 0.30) {
        level = 'WATCH';
        reasonCodes.push('WATCH_HYDRATION_MONITORING');
      } else {
        level = 'GREEN';
        reasonCodes.push('NORMAL_OPERATING_LIMITS');
      }

      if (tracker.exposureMins >= 180) reasonCodes.push('PROLONGED_EXPOSURE_180MIN');
      if (w.task_intensity === 'HEAVY') reasonCodes.push('HEAVY_METABOLIC_LOAD');

      return {
        worker_id: w.worker_id,
        site_id: w.site_id,
        timestamp: obs.timestamp,
        score,
        level,
        confidence: 0.95,
        reason_codes: reasonCodes,
        exposure_duration_mins: tracker.exposureMins,
      };
    });
  }

  private evaluateAndIssueWorkerAction(worker: Worker, risk: RiskState, obs: ThermalObservation): void {
    let actionType: Action['action_type'] = 'MONITOR';
    let message = '';
    let restMins = 0;

    if (risk.level === 'CRITICAL') {
      actionType = 'STOP_WORK';
      message = `CRITICAL ALERT: Ambient ${obs.temperature_c}°C / Risk score ${risk.score.toFixed(2)}. Mandatory work halt. Report to AC cooling trailer immediately.`;
      restMins = 60;
    } else if (risk.level === 'HIGH') {
      actionType = 'MANDATORY_REST';
      message = `HIGH RISK WARNING: Task intensity ${worker.task_intensity}, exposure ${risk.exposure_duration_mins}m. Mandatory 20-min shaded hydration break required.`;
      restMins = 20;
    } else if (risk.level === 'ELEVATED') {
      actionType = 'SHADED_BREAK';
      message = `ELEVATED HEAT LOAD: Pre-emptive 10-minute shade break + 500ml water intake advised.`;
      restMins = 10;
    } else if (risk.level === 'WATCH') {
      actionType = 'HYDRATION_REMINDER';
      message = `WATCH NOTICE: Increasing temperature (${obs.temperature_c}°C). Maintain standard hydration schedule.`;
      restMins = 0;
    }

    if (actionType !== 'MONITOR') {
      const action: Action = {
        action_id: `act_${Date.now()}_${worker.worker_id}`,
        worker_id: worker.worker_id,
        site_id: worker.site_id,
        action_type: actionType,
        policy_version: DEFAULT_PHOENIX_POLICY.version,
        issued_at: new Date().toISOString(),
        outcome: 'PENDING',
        message,
        recommended_rest_minutes: restMins,
        actor: 'AutonomousActionAgent',
      };

      this.issueAction(action);
    }
  }

  public issueAction(action: Action): void {
    this.db.saveAction(action);

    this.audit.recordDecisionEvent({
      actor: action.actor,
      input_refs: {
        worker_id: action.worker_id,
        site_id: action.site_id,
      },
      decision: `ISSUED_${action.action_type}`,
      explanation: action.message,
      policy_version: action.policy_version,
    });

    this.wsServer?.broadcast('ACTION_EVENT', action);
  }

  public acknowledgeAction(actionId: string, actor: string = 'Supervisor'): Action | null {
    const actions = this.db.getRecentActions(100);
    const target = actions.find((a) => a.action_id === actionId);
    if (!target) return null;

    const updated: Action = {
      ...target,
      outcome: 'ACKNOWLEDGED',
      acknowledged_at: new Date().toISOString(),
      actor,
    };

    this.db.saveAction(updated);

    this.audit.recordAuditEvent('ACTION_ACKNOWLEDGED', actionId, {
      actor,
      acknowledged_at: updated.acknowledged_at,
    });

    this.wsServer?.broadcast('ACTION_EVENT', updated);
    return updated;
  }

  public overrideAction(actionId: string, reason: string, actor: string = 'Supervisor'): Action | null {
    const actions = this.db.getRecentActions(100);
    const target = actions.find((a) => a.action_id === actionId);
    if (!target) return null;

    const updated: Action = {
      ...target,
      outcome: 'OVERRIDDEN',
      override_reason: reason,
      actor,
    };

    this.db.saveAction(updated);

    this.audit.recordAuditEvent('ACTION_OVERRIDDEN', actionId, {
      actor,
      reason,
      timestamp: new Date().toISOString(),
    });

    this.wsServer?.broadcast('ACTION_EVENT', updated);
    return updated;
  }

  private handleClusterIncident(siteId: string, criticalWorkerIds: string[], tempC: number): void {
    let incident = this.activeClusterIncidents.get(siteId);

    if (!incident) {
      incident = {
        incident_id: `inc_${Date.now()}_${siteId}`,
        zone_id: `ZONE-${siteId}`,
        site_id: siteId,
        severity: tempC >= 45 ? 'CRITICAL' : 'HIGH',
        opened_at: new Date().toISOString(),
        workers_affected: criticalWorkerIds,
        owner: 'Site Safety Supervisor',
        summary: `Heat Stress Cluster: ${criticalWorkerIds.length} workers at ${siteId} exceeded safety threshold during ${tempC}°C thermal peak.`,
        status: 'OPEN',
      };

      this.activeClusterIncidents.set(siteId, incident);
      this.db.saveIncident(incident);

      this.audit.recordAuditEvent('INCIDENT_OPENED', incident.incident_id, {
        site_id: siteId,
        severity: incident.severity,
        workers_affected: criticalWorkerIds,
      });

      this.wsServer?.broadcast('INCIDENT_EVENT', incident);
    } else {
      incident.workers_affected = Array.from(new Set([...incident.workers_affected, ...criticalWorkerIds]));
      this.db.saveIncident(incident);
      this.wsServer?.broadcast('INCIDENT_EVENT', incident);
    }
  }

  private broadcastSimulationStatus(): void {
    const state = this.engine.getState();
    this.wsServer?.broadcast('SIMULATION_STATUS', {
      ...state,
      thermal_data_mode: this.thermalDataMode,
      fortyguard_status: this.fortyGuard.getProviderStatus(),
    });
  }
}
