import React, { useState, useEffect, useCallback } from 'react';
import { useSentinelWebSocket } from './hooks/useSentinelWebSocket.js';
import { PriorityQueue } from './components/PriorityQueue.js';
import { RiskMap } from './components/RiskMap.js';
import { IncidentCenter } from './components/IncidentCenter.js';
import { WorkerDetailInspector } from './components/WorkerDetailInspector.js';
import { IncidentDetailInspector } from './components/IncidentDetailInspector.js';
import { AuditInspectorModal } from './components/AuditInspectorModal.js';
import { DemoScenarioController } from './components/DemoScenarioController.js';
import {
  Site,
  Worker,
  RiskState,
  PredictiveRiskState,
  Action,
  Incident,
  PriorityWorkerItem,
  OperationsSummary,
  SupervisorRole,
} from './types.js';

export const App: React.FC = () => {
  const {
    isConnected,
    simulationState,
    latestObservations,
    riskStates,
    actions,
    incidents,
    auditEvents,
    refreshData,
  } = useSentinelWebSocket();

  // Operational state
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('PHX-SITE-01');
  const [userRole, setUserRole] = useState<SupervisorRole>('SUPERVISOR');
  const [demoStep, setDemoStep] = useState<number>(1);

  // Inspector states
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState<{
    worker: Worker;
    current_risk: RiskState | null;
    predicted_risk: PredictiveRiskState | null;
    recent_actions: Action[];
    timeline: any[];
  } | null>(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState<{
    incident: Incident;
    timeline: any[];
    affected_workers: Worker[];
  } | null>(null);

  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditFilterRef, setAuditFilterRef] = useState<string | null>(null);

  // Operations Summary and Priority Queue
  const [priorityItems, setPriorityItems] = useState<PriorityWorkerItem[]>([]);
  const [opsSummary, setOpsSummary] = useState<OperationsSummary | null>(null);
  const [mapData, setMapData] = useState<any>(null);

  // Fetch initial sites & operations data
  const loadOperationsData = useCallback(() => {
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => {
        if (data.sites) setSites(data.sites);
      })
      .catch((e) => console.error('Failed to load sites:', e));

    fetch(`/api/operations/summary?site_id=${selectedSiteId}`)
      .then((r) => r.json())
      .then((data) => setOpsSummary(data))
      .catch((e) => console.error('Failed to load summary:', e));

    fetch(`/api/operations/priority?site_id=${selectedSiteId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setPriorityItems(data.items);
      })
      .catch((e) => console.error('Failed to load priority queue:', e));

    fetch(`/api/operations/map?site_id=${selectedSiteId}`)
      .then((r) => r.json())
      .then((data) => setMapData(data))
      .catch((e) => console.error('Failed to load map data:', e));
  }, [selectedSiteId]);

  useEffect(() => {
    loadOperationsData();
    const interval = setInterval(loadOperationsData, 4000);
    return () => clearInterval(interval);
  }, [loadOperationsData]);

  // Load worker detail when worker selected
  useEffect(() => {
    if (!selectedWorkerId) {
      setSelectedWorkerDetail(null);
      return;
    }
    fetch(`/api/workers/${selectedWorkerId}`)
      .then((r) => r.json())
      .then((data) => {
        setSelectedWorkerDetail({
          worker: data.worker,
          current_risk: data.current_risk,
          predicted_risk: data.predicted_risk,
          recent_actions: data.recent_actions || [],
          timeline: data.timeline || [],
        });
      })
      .catch((e) => console.error('Failed to load worker detail:', e));
  }, [selectedWorkerId]);

  // Load incident detail when incident selected
  useEffect(() => {
    if (!selectedIncidentId) {
      setSelectedIncidentDetail(null);
      return;
    }
    fetch(`/api/incidents/${selectedIncidentId}`)
      .then((r) => r.json())
      .then((data) => {
        setSelectedIncidentDetail({
          incident: data.incident,
          timeline: data.timeline || [],
          affected_workers: data.affected_workers || [],
        });
      })
      .catch((e) => console.error('Failed to load incident detail:', e));
  }, [selectedIncidentId]);

  // Action handlers
  const handleAcknowledgeAction = async (actionId: string) => {
    try {
      await fetch(`/api/actions/${actionId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({
          actor: `${userRole} (Console)`,
          actor_type: 'SUPERVISOR',
          source: 'CONSOLE_BUTTON',
        }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Ack error:', e);
    }
  };

  const handleOverrideAction = async (actionId: string, reason: string) => {
    try {
      await fetch(`/api/actions/${actionId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ reason, actor: `${userRole} (Console)` }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Override error:', e);
    }
  };

  const handleEscalateAction = async (actionId: string, reason: string) => {
    try {
      await fetch(`/api/actions/${actionId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ reason, actor: `${userRole} (Console)` }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Escalate error:', e);
    }
  };

  // Incident handlers
  const handleAckIncident = async (incidentId: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ actor: `${userRole} (Console)`, note: 'Incident triaged from console' }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Incident ack error:', e);
    }
  };

  const handleAssignIncident = async (incidentId: string, owner: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ owner, assigned_by: `${userRole} (Console)` }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Incident assign error:', e);
    }
  };

  const handleStartMitigation = async (incidentId: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/mitigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({
          actor: `${userRole} (Console)`,
          mitigation_note: 'Active mitigation protocol dispatched from console',
        }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Mitigation start error:', e);
    }
  };

  const handleEscalateIncident = async (incidentId: string, reason: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ actor: `${userRole} (Console)`, reason }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Incident escalate error:', e);
    }
  };

  const handleResolveIncident = async (incidentId: string, resolution: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ actor: `${userRole} (Console)`, resolution }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Incident resolve error:', e);
    }
  };

  const handleRunSimulationStep = async () => {
    try {
      await fetch('/api/simulation/step', { method: 'POST' });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Step simulation error:', e);
    }
  };

  const handleResetSimulation = async () => {
    try {
      await fetch('/api/simulation/reset', { method: 'POST' });
      setDemoStep(1);
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Reset simulation error:', e);
    }
  };

  const openAuditInspector = (payloadRef: string) => {
    setAuditFilterRef(payloadRef);
    setAuditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-lg">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/25 text-lg">
              🛡️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white">SENTINEL WORKERS</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  Supervisor Ops Center
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Autonomous Heat-Risk Prevention & Hyperlocal Environmental Intelligence
              </p>
            </div>
          </div>

          {/* Center: Site Switcher & Status Indicators */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-sky-500 outline-none transition cursor-pointer"
            >
              {sites.map((s) => (
                <option key={s.site_id} value={s.site_id}>
                  {s.name} ({s.site_id})
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/90 rounded-lg border border-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              ></span>
              <span className="text-slate-300 font-semibold">{isConnected ? 'LIVE WS' : 'DISCONNECTED'}</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/90 rounded-lg border border-slate-700">
              <span className="text-slate-400">FortyGuard:</span>
              <span className="text-emerald-400 font-bold">
                {opsSummary?.fortyguard_status || 'CONNECTED'}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/90 rounded-lg border border-slate-700">
              <span className="text-slate-400">Data Freshness:</span>
              <span
                className={`font-bold ${
                  opsSummary?.data_freshness === 'STALE'
                    ? 'text-rose-400'
                    : opsSummary?.data_freshness === 'AGING'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {opsSummary?.data_freshness || 'FRESH'}
              </span>
            </div>
          </div>

          {/* Right: Role Switcher & Audit Link */}
          <div className="flex items-center space-x-2.5 text-xs">
            <div className="flex items-center space-x-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
              {(['SUPERVISOR', 'OPERATOR', 'VIEWER'] as SupervisorRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRole(r)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
                    userRole === r
                      ? 'bg-sky-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setAuditFilterRef(null);
                setAuditModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 font-mono text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              <span>🔐</span>
              <span className="font-semibold">Audit Trail</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Operational Container */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1680px] w-full mx-auto">
        {/* 5-Second Aggregated Telemetry Ribbon */}
        {opsSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 font-mono">
            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-md transition">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Active Workers</div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{opsSummary.active_workers}</div>
              <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">{opsSummary.green_count} Green (Safe)</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-md transition">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Watch & Elevated</div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">
                {opsSummary.watch_count + opsSummary.elevated_count}
              </div>
              <div className="text-[11px] text-yellow-500 mt-0.5 font-medium">Monitoring thresholds</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-md transition">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">High & Critical</div>
              <div className="text-2xl font-bold text-red-400 mt-1">
                {opsSummary.high_count + opsSummary.critical_count}
              </div>
              <div className="text-[11px] text-red-500 mt-0.5 font-medium">{opsSummary.critical_count} Critical</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-md transition">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Early Warnings</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {opsSummary.predicted_deterioration_count}
              </div>
              <div className="text-[11px] text-amber-500 mt-0.5 font-medium">Pred breach &lt; 30m</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-md transition">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Incidents</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">{opsSummary.active_incidents}</div>
              <div className="text-[11px] text-purple-400/80 mt-0.5 font-medium">Spatial clusters</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-md transition">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pending Acks</div>
              <div className="text-2xl font-bold text-rose-400 mt-1">{opsSummary.pending_ack_count}</div>
              <div className="text-[11px] text-rose-400/80 mt-0.5 font-medium">Advisories awaiting ack</div>
            </div>
          </div>
        )}

        {/* 14-Step Magic Demo Controller Bar */}
        <DemoScenarioController
          currentStep={demoStep}
          onStepChange={(s) => setDemoStep(s)}
          onRunSimulationStep={handleRunSimulationStep}
          onResetSimulation={handleResetSimulation}
        />

        {/* 2-Column Operational Command Center Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Priority Worker Queue & Incident Center (7 cols) */}
          <div className="xl:col-span-7 flex flex-col space-y-6">
            <PriorityQueue
              items={priorityItems}
              selectedWorkerId={selectedWorkerId}
              onSelectWorker={(wId) => setSelectedWorkerId(wId)}
            />

            <IncidentCenter
              incidents={incidents}
              userRole={userRole}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(iId) => setSelectedIncidentId(iId)}
              onAcknowledge={handleAckIncident}
              onAssign={handleAssignIncident}
              onStartMitigation={handleStartMitigation}
              onEscalate={handleEscalateIncident}
              onResolve={handleResolveIncident}
            />
          </div>

          {/* Right: Live Interactive Risk Map & Spatial Zones (5 cols) */}
          <div className="xl:col-span-5 flex flex-col space-y-6">
            <RiskMap
              siteName={mapData?.site_name || 'Phoenix Jobsite'}
              zones={mapData?.zones}
              coolingPoints={mapData?.cooling_points}
              workers={mapData?.workers}
              activeIncidents={incidents}
              selectedWorkerId={selectedWorkerId}
              selectedIncidentId={selectedIncidentId}
              onSelectWorker={(wId) => setSelectedWorkerId(wId)}
              onSelectIncident={(iId) => setSelectedIncidentId(iId)}
            />
          </div>
        </div>
      </main>

      {/* Slide-Over Worker Detail Inspector */}
      {selectedWorkerDetail && (
        <WorkerDetailInspector
          worker={selectedWorkerDetail.worker}
          currentRisk={selectedWorkerDetail.current_risk}
          predictedRisk={selectedWorkerDetail.predicted_risk}
          recentActions={selectedWorkerDetail.recent_actions}
          timeline={selectedWorkerDetail.timeline}
          userRole={userRole}
          onClose={() => setSelectedWorkerId(null)}
          onAcknowledgeAction={handleAcknowledgeAction}
          onOverrideAction={handleOverrideAction}
          onEscalateAction={handleEscalateAction}
          onOpenAudit={openAuditInspector}
        />
      )}

      {/* Slide-Over Incident Detail Inspector */}
      {selectedIncidentDetail && (
        <IncidentDetailInspector
          incident={selectedIncidentDetail.incident}
          affectedWorkers={selectedIncidentDetail.affected_workers}
          timeline={selectedIncidentDetail.timeline}
          userRole={userRole}
          onClose={() => setSelectedIncidentId(null)}
          onSelectWorker={(wId) => setSelectedWorkerId(wId)}
          onOpenAudit={openAuditInspector}
        />
      )}

      {/* Cryptographic Audit Trail Inspector Modal */}
      <AuditInspectorModal
        isOpen={auditModalOpen}
        filterRef={auditFilterRef}
        auditEvents={auditEvents}
        onClose={() => setAuditModalOpen(false)}
      />
    </div>
  );
};
