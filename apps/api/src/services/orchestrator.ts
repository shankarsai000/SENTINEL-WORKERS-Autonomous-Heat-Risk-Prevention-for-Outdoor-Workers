import {
  ThermalObservation,
  RiskState,
  Action,
  Incident,
  Worker,
  Site,
  SimulationState,
  DecisionEvent,
  PredictiveRiskState,
  PredictionEvent,
  ActionDecision,
} from '@sentinel/schemas';
import { OfflineSimulationEngine, SimulationTickResult } from '@sentinel/simulation';
import { PolicyGuardrails, DEFAULT_PHOENIX_POLICY, PolicyLoader } from '@sentinel/policy';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';
import { ContextualRiskEngine, buildWorkerRiskContext, buildSiteRiskContext, calculateZoneClusterContext } from '@sentinel/risk-engine';
import { ShortHorizonRiskPredictor } from '@sentinel/prediction-engine';
import {
  ActionPlanner,
  PolicyGate,
  ActionExecutor,
  ActionDeduplicationService,
  EscalationEvaluator,
} from '@sentinel/action-engine';
import { IncidentEngine } from './incident-engine.js';
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
  private riskEngine: ContextualRiskEngine;
  private predictor: ShortHorizonRiskPredictor;
  private actionExecutor: ActionExecutor;
  private dedupeService: ActionDeduplicationService;
  private riskServiceUrl: string;
  private thermalDataMode: ThermalDataMode;
  private workerExposureTracker: Map<string, { exposureMins: number; recoveryMins: number }> = new Map();
  private activeClusterIncidents: Map<string, Incident> = new Map();
  private siteObservationHistory: Map<string, ThermalObservation[]> = new Map();

  constructor(
    db: SentinelDatabase,
    audit: AuditService,
    engine: OfflineSimulationEngine,
    wsServer?: SentinelWebSocketServer,
    riskServiceUrl: string = process.env.RISK_SERVICE_URL || 'http://localhost:8000',
    fortyGuardAdapter?: FortyGuardAdapter,
    initialMode?: ThermalDataMode,
    predictor?: ShortHorizonRiskPredictor,
    actionExecutor?: ActionExecutor,
    dedupeService?: ActionDeduplicationService
  ) {
    this.db = db;
    this.audit = audit;
    this.engine = engine;
    this.wsServer = wsServer;
    this.guardrails = new PolicyGuardrails(DEFAULT_PHOENIX_POLICY);
    this.fortyGuard = fortyGuardAdapter || new FortyGuardAdapter({ offlineFallback: true });
    this.riskEngine = new ContextualRiskEngine(PolicyLoader.getPolicy());
    this.predictor = predictor || new ShortHorizonRiskPredictor();
    this.actionExecutor = actionExecutor || new ActionExecutor();
    this.dedupeService = dedupeService || new ActionDeduplicationService();
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

  public getAuditService(): AuditService {
    return this.audit;
  }

  public getWebSocketServer(): SentinelWebSocketServer | undefined {
    return this.wsServer;
  }

  public getActionExecutor(): ActionExecutor {
    return this.actionExecutor;
  }

  public getDedupeService(): ActionDeduplicationService {
    return this.dedupeService;
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

  public getRiskEngine(): ContextualRiskEngine {
    return this.riskEngine;
  }

  public getPredictor(): ShortHorizonRiskPredictor {
    return this.predictor;
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

  public resetSimulation(): void {
    logger.info({ event: 'SIMULATION_RESET' });
    this.engine.reset();
    this.broadcastSimulationStatus();
    this.audit.recordAuditEvent('SIMULATION_STATE_CHANGED', 'simulation_engine', {
      action: 'RESET',
      tick: 0,
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
              continue;
            }
            activeObs.source = 'simulation';
          }
        }
      }

      await this.processSingleObservation(activeObs, tick);
    }

    this.broadcastSimulationStatus();
  }

  private async processSingleObservation(obs: ThermalObservation, tick: number): Promise<void> {
    const policy = PolicyLoader.getPolicy();

    // 1. Ingest & Persist Observation
    this.db.saveObservation(obs);

    // Maintain sliding historical window of observations for this site (last 12 obs = 3h)
    const siteHistory = this.siteObservationHistory.get(obs.site_id) || [];
    const updatedHistory = [...siteHistory.slice(-11), obs];
    this.siteObservationHistory.set(obs.site_id, updatedHistory);

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

    // 2. Fetch workers & site assigned
    const workers = this.db.getWorkers(obs.site_id);
    if (workers.length === 0) return;

    const sites = this.db.getSites();
    const site = sites.find((s) => s.site_id === obs.site_id) || {
      site_id: obs.site_id,
      name: 'Job Site',
      latitude: 33.4484,
      longitude: -112.074,
      zone_id: `ZONE-${obs.site_id}`,
      worker_count: workers.length,
      cooling_resources: { shade_stations: 4, water_points: 6, misting_fans: 2, ac_trailers: 1 },
      emergency_policy_id: 'demo-construction-v1',
    };

    // Update exposure duration tracker
    for (const w of workers) {
      const current = this.workerExposureTracker.get(w.worker_id) || { exposureMins: 0, recoveryMins: 0 };
      current.exposureMins += 15;
      this.workerExposureTracker.set(w.worker_id, current);
    }

    // 3. Evaluate Risk via P2 ContextualRiskEngine
    const prevStates = new Map<string, RiskState>();
    const latestStates = this.db.getLatestRiskStates();
    for (const s of latestStates) {
      prevStates.set(s.worker_id, s);
    }

    const evalResult = this.riskEngine.evaluateBatch({
      workers,
      site,
      observation: obs,
      previousStates: prevStates,
      currentTime: obs.timestamp,
    });

    // 4. Save Decision Events Batch
    this.db.saveDecisionEvents(evalResult.decisionEvents);

    // 5. Save Processed Risk States to Database
    this.db.saveRiskStates(evalResult.riskStates);

    // 6. Broadcast Risk States Batch to Dashboard
    this.wsServer?.broadcast('RISK_STATE_UPDATE', {
      site_id: obs.site_id,
      timestamp: obs.timestamp,
      risk_states: evalResult.riskStates,
    });

    // 7. Phase P3 Short-Horizon Prediction Pipeline
    const workerContexts = workers.map((w) =>
      buildWorkerRiskContext(w, {
        currentTime: obs.timestamp,
        isActive: true,
      })
    );

    const siteCtx = buildSiteRiskContext(site, workers.length);
    const clusterCtx = calculateZoneClusterContext(
      site.zone_id,
      workers.map((w, idx) => ({
        zone_id: site.zone_id,
        level: evalResult.riskStates[idx]?.level || 'GREEN',
        active: true,
      }))
    );

    const riskMap = new Map<string, RiskState>();
    for (const r of evalResult.riskStates) {
      riskMap.set(r.worker_id, r);
    }

    // Historical observations excluding current one
    const historyObs = updatedHistory.slice(0, -1);

    const predResult = this.predictor.predictBatch({
      currentObservation: obs,
      workers: workerContexts,
      siteCtx,
      clusterCtx,
      currentRisks: riskMap,
      observationHistory: historyObs,
      source: obs.source === 'fortyguard' ? 'PROVIDER_FORECAST' : 'TREND_EXTRAPOLATION',
    });

    // Persist P3 Predictions & Events
    this.db.savePredictiveRiskStates(predResult.predictions);
    this.db.savePredictionEvents(predResult.events);

    // Broadcast Predictions Batch to Dashboard
    this.wsServer?.broadcast('PREDICTION_UPDATE', {
      site_id: obs.site_id,
      timestamp: obs.timestamp,
      predictions: predResult.predictions,
    });

    // Check for Early Warnings and broadcast
    const earlyWarnings = predResult.predictions.filter((p: PredictiveRiskState) => p.early_warning);
    if (earlyWarnings.length > 0) {
      this.wsServer?.broadcast('EARLY_WARNING', {
        site_id: obs.site_id,
        timestamp: obs.timestamp,
        count: earlyWarnings.length,
        early_warnings: earlyWarnings,
      });
    }

    // 8. Phase P4 Safety-Constrained Autonomous Action Loop
    const criticalWorkersInZone: string[] = [];

    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      const risk = evalResult.riskStates[i];
      const pred = predResult.predictions[i] || null;
      const workerCtx = workerContexts[i];

      if (risk.level === 'HIGH' || risk.level === 'CRITICAL') {
        criticalWorkersInZone.push(worker.worker_id);
      }

      // Only evaluate action planning if worker is not in normal Green baseline or is flagged early-warning
      if (risk.level !== 'GREEN' || pred?.early_warning) {
        const plan = ActionPlanner.planActions({
          currentRisk: risk,
          predictedRisk: pred,
          workerCtx,
          siteCtx,
          policy,
        });

        const selectedOption = plan.recommended_action;

        const gateResult = PolicyGate.evaluate({
          candidate: selectedOption,
          currentRisk: risk,
          predictedRisk: pred,
          workerCtx,
          siteCtx,
          policy,
        });

        const decision: ActionDecision = {
          action_id: `act_${Date.now()}_${worker.worker_id}`,
          worker_id: worker.worker_id,
          site_id: obs.site_id,
          created_at: obs.timestamp,
          risk_state_id: `${risk.worker_id}_${risk.timestamp}`,
          prediction_id: pred?.prediction_id,
          action_type: selectedOption.action_type,
          priority: selectedOption.priority,
          reason_codes: selectedOption.reason_codes,
          evidence_refs: {
            current_risk_level: risk.level,
            current_risk_score: risk.score,
            predicted_risk_level: pred?.predicted_risk_level,
            expected_time_to_threshold_minutes: pred?.expected_time_to_threshold_minutes,
          },
          policy_id: policy.policy_id,
          policy_version: policy.version,
          selected_by: risk.level === 'CRITICAL' ? 'EMERGENCY_GUARDRAIL' : 'AUTONOMOUS_POLICY_PLANNER',
          decision_mode: gateResult.decision_mode,
          confidence: risk.confidence,
          requires_acknowledgement: gateResult.requires_acknowledgement,
          ack_deadline: gateResult.requires_acknowledgement
            ? new Date(new Date(obs.timestamp).getTime() + gateResult.ack_deadline_minutes * 60000).toISOString()
            : undefined,
          allowed: gateResult.allowed,
          rejected_reason: gateResult.rejected_reason,
          idempotency_key: this.dedupeService.generateIdempotencyKey(
            worker.worker_id,
            selectedOption.action_type,
            policy.version,
            obs.timestamp,
            gateResult.cooldown_minutes
          ),
          message: selectedOption.message_template,
          recommended_rest_minutes: selectedOption.recommended_rest_minutes,
        };

        const execResult = await this.actionExecutor.execute({ decision, dedupeService: this.dedupeService });

        // Persist Action and Delivery only if not deduplicated
        if (!execResult.deduplicated) {
          this.db.saveAction(execResult.action);
          if (execResult.delivery) {
            this.db.saveActionDelivery(execResult.delivery);
          }
          // Broadcast Action Event to Dashboard
          this.wsServer?.broadcast('ACTION_EVENT', execResult.action);
        }

        // Record Audit Events (including deduplicated audit record)
        for (const ev of execResult.audit_events) {
          this.audit.recordAuditEvent(
            ev.event_type === 'action.deduplicated' ? 'ACTION_DEDUPLICATED' : 'ACTION_ISSUED',
            execResult.action.action_id,
            ev.details
          );
        }
      }
    }

    // 9. Check unacknowledged active actions for deadline expiration
    const activeActions = this.db.getActions({ status: 'ACK_PENDING', limit: 50 });
    for (const act of activeActions) {
      const escResult = EscalationEvaluator.evaluateDeadline(act, obs.timestamp);
      if (escResult.is_expired && escResult.escalation) {
        this.db.saveAction(escResult.action);
        this.db.saveEscalation(escResult.escalation);

        for (const ev of escResult.audit_events) {
          this.audit.recordAuditEvent('INCIDENT_ESCALATED', escResult.action.action_id, ev.details);
        }

        this.wsServer?.broadcast('ACTION_EVENT', escResult.action);
        this.wsServer?.broadcast('INCIDENT_EVENT', {
          incident_id: escResult.escalation.escalation_id,
          zone_id: `ZONE-${escResult.action.site_id}`,
          site_id: escResult.action.site_id,
          severity: escResult.escalation.severity,
          opened_at: escResult.escalation.created_at,
          workers_affected: escResult.action.worker_id ? [escResult.action.worker_id] : [],
          owner: escResult.escalation.escalated_to || 'Supervisor',
          summary: `Action '${escResult.action.action_type}' for worker ${escResult.action.worker_id} exceeded acknowledgement deadline. Escalated to supervisor.`,
          status: 'ACTIVE',
        });
      }
    }

    // 10. Spatial Incident Clustering Engine (Phase P5)
    const existingIncidents = this.db.getIncidents({ site_id: obs.site_id });
    const currentRisksMap = new Map<string, RiskState>();
    const predictionsMap = new Map<string, PredictiveRiskState>();

    for (const w of workers) {
      const r = this.db.getWorkerRiskHistory(w.worker_id, 1)[0];
      if (r) currentRisksMap.set(w.worker_id, r);
      const p = this.db.getWorkerPredictiveHistory(w.worker_id, 1)[0];
      if (p) predictionsMap.set(w.worker_id, p);
    }

    const recentActions = this.db.getActions({ site_id: obs.site_id, limit: 100 });

    const clusterResult = IncidentEngine.evaluateClustering({
      site_id: obs.site_id,
      workers,
      currentRisks: currentRisksMap,
      predictions: predictionsMap,
      actions: recentActions,
      existingIncidents,
      timestamp: obs.timestamp,
      policy: PolicyLoader.getPolicy(),
      options: { min_workers: 2 },
    });

    for (const inc of clusterResult.created_incidents) {
      this.db.saveIncident(inc);
      this.wsServer?.broadcast('INCIDENT_EVENT', inc);
    }
    for (const inc of clusterResult.updated_incidents) {
      this.db.saveIncident(inc);
      this.wsServer?.broadcast('INCIDENT_EVENT', inc);
    }
    for (const inc of clusterResult.resolved_incidents) {
      this.db.saveIncident(inc);
      this.wsServer?.broadcast('INCIDENT_EVENT', inc);
    }
    for (const ev of clusterResult.audit_events) {
      this.audit.recordAuditEvent(
        ev.event_type === 'incident.resolved' ? 'INCIDENT_RESOLVED' : 'INCIDENT_OPENED',
        ev.incident_id,
        ev.details
      );
    }
  }

  public overrideAction(actionId: string, reason: string, actor: string = 'Supervisor'): Action | null {
    const action = this.db.getActionById(actionId);
    if (!action) return null;

    const updated: Action = {
      ...action,
      status: 'OVERRIDDEN',
      outcome: 'OVERRIDDEN',
      override_by: actor,
      override_at: new Date().toISOString(),
      override_reason: reason,
    };

    this.db.saveAction(updated);

    this.audit.recordAuditEvent('ACTION_OVERRIDDEN', actionId, {
      actor,
      reason,
      timestamp: updated.override_at,
    });

    this.wsServer?.broadcast('ACTION_EVENT', updated);
    return updated;
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
