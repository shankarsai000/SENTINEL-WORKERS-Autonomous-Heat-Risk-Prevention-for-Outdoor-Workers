import React, { useState, useEffect, useCallback } from 'react';
import { useSentinelWebSocket } from './hooks/useSentinelWebSocket.js';
import { WorkerDetailInspector } from './components/WorkerDetailInspector.js';
import { IncidentDetailInspector } from './components/IncidentDetailInspector.js';
import { AuditInspectorModal } from './components/AuditInspectorModal.js';
import { OverviewView } from './components/views/OverviewView.js';
import { SpatialMapView } from './components/views/SpatialMapView.js';
import { WorkersFleetView } from './components/views/WorkersFleetView.js';
import { IncidentsAnalyticsView } from './components/views/IncidentsAnalyticsView.js';
import { ActionsAuditView } from './components/views/ActionsAuditView.js';
import { ShiftReportsView } from './components/views/ShiftReportsView.js';
import { SchedulingView } from './components/views/SchedulingView.js';
import { WelcomeSplashScreen } from './components/WelcomeSplashScreen.js';
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

/* ─── Nav Tab Definitions with Larger Icons & Descriptions ─── */
const navItems = [
  { id: 'overview', label: 'Overview', icon: '🏠', subtitle: 'Live Ops Center' },
  { id: 'map', label: 'Spatial Map', icon: '🗺️', subtitle: 'Thermal Zones & Studio' },
  { id: 'workers', label: 'Workers', icon: '👷', subtitle: 'Fleet Biometrics & Risk' },
  { id: 'incidents', label: 'Incidents', icon: '⚠️', subtitle: 'Predictive Triage Queue' },
  { id: 'actions', label: 'Audit Trail', icon: '🔒', subtitle: 'Cryptographic Ledger' },
  { id: 'scheduling', label: 'AI Scheduler', icon: '⏱️', subtitle: 'Diurnal Task Optimizer' },
  { id: 'reports', label: 'Reports', icon: '📊', subtitle: 'Shift & OSHA Compliance' },
];

export const App: React.FC = () => {
  const {
    isConnected,
    riskStates,
    actions,
    incidents,
    auditEvents,
    refreshData,
  } = useSentinelWebSocket();

  // Navigation
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('PHX-SITE-01');
  const [userRole] = useState<SupervisorRole>('SUPERVISOR');
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(true);

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

  // Operations data
  const [priorityItems, setPriorityItems] = useState<PriorityWorkerItem[]>([]);
  const [opsSummary, setOpsSummary] = useState<OperationsSummary | null>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [latestObservation, setLatestObservation] = useState<any>(null);

  /* ─── Data fetching ─── */
  const loadOperationsData = useCallback(() => {
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => { if (data.sites) setSites(data.sites); })
      .catch((e) => console.error('Failed to load sites:', e));

    fetch(`/api/operations/summary?site_id=${selectedSiteId}`)
      .then((r) => r.json())
      .then((data) => {
        setOpsSummary(data);
        if (data.latest_observation) setLatestObservation(data.latest_observation);
      })
      .catch((e) => console.error('Failed to load summary:', e));

    fetch(`/api/operations/priority?site_id=${selectedSiteId}`)
      .then((r) => r.json())
      .then((data) => { if (data.items) setPriorityItems(data.items); })
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

  /* ─── Worker Detail Drawer ─── */
  useEffect(() => {
    if (!selectedWorkerId) {
      setSelectedWorkerDetail(null);
      return;
    }

    fetch(`/api/workers/${selectedWorkerId}`)
      .then((r) => r.json())
      .then((data) => {
        const workerActions = actions.filter((a) => a.worker_id === selectedWorkerId);
        const wRisk = riskStates.find((r) => r.worker_id === selectedWorkerId) || null;
        setSelectedWorkerDetail({
          worker: data.worker || data,
          current_risk: wRisk,
          predicted_risk: null,
          recent_actions: workerActions,
          timeline: data.risk_history || [],
        });
      })
      .catch((e) => console.error('Worker fetch error:', e));
  }, [selectedWorkerId, riskStates, actions]);

  /* ─── Incident Detail Drawer ─── */
  useEffect(() => {
    if (!selectedIncidentId) {
      setSelectedIncidentDetail(null);
      return;
    }

    fetch(`/api/incidents/${selectedIncidentId}`)
      .then((r) => r.json())
      .then((data) => {
        const inc = data.incident || data;
        setSelectedIncidentDetail({
          incident: inc,
          timeline: data.timeline || [],
          affected_workers: data.affected_workers || [],
        });
      })
      .catch((e) => console.error('Incident fetch error:', e));
  }, [selectedIncidentId]);

  /* ─── Actions ─── */
  const handleAcknowledgeAction = async (actionId: string) => {
    try {
      await fetch(`/api/actions/${actionId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ actor: `${userRole} (Console)` }),
      });
      loadOperationsData(); refreshData();
    } catch (e) { console.error('Ack error:', e); }
  };

  const handleOverrideAction = async (actionId: string, reason: string) => {
    try {
      await fetch(`/api/actions/${actionId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ reason, actor: `${userRole} (Console)` }),
      });
      loadOperationsData(); refreshData();
    } catch (e) { console.error('Override error:', e); }
  };

  const handleEscalateAction = async (actionId: string, reason: string) => {
    try {
      await fetch(`/api/actions/${actionId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ reason, actor: `${userRole} (Console)` }),
      });
      loadOperationsData(); refreshData();
    } catch (e) { console.error('Escalate error:', e); }
  };

  const handleAcknowledgeIncident = async (incidentId: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ actor: `${userRole} (Console)` }),
      });
      loadOperationsData(); refreshData();
    } catch (e) { console.error('Incident ack error:', e); }
  };

  const handleAssignIncident = async (incidentId: string, owner: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ owner, actor: `${userRole} (Console)` }),
      });
      loadOperationsData(); refreshData();
    } catch (e) { console.error('Incident assign error:', e); }
  };

  const handleStartMitigation = async (incidentId: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/mitigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ actor: `${userRole} (Console)` }),
      });
      loadOperationsData(); refreshData();
    } catch (e) { console.error('Incident mitigate error:', e); }
  };

  const handleEscalateIncident = async (incidentId: string, reason: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ reason, actor: `${userRole} (Console)` }),
      });
      loadOperationsData(); refreshData();
    } catch (e) { console.error('Incident escalate error:', e); }
  };

  const handleResolveIncident = async (incidentId: string, resolution: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ resolution, actor: `${userRole} (Console)` }),
      });
      loadOperationsData(); refreshData();
    } catch (e) { console.error('Incident resolve error:', e); }
  };

  const openAuditInspector = (payloadRef: string) => {
    setAuditFilterRef(payloadRef);
    setAuditModalOpen(true);
  };

  const activeIncidentsCount = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;

  const siteDisplayName =
    selectedSiteId === 'PHX-SITE-01' ? 'Phoenix Sky Harbor (PHX-01)' :
    selectedSiteId === 'DFW-SITE-02' ? 'Dallas Metro Rail (DFW-02)' : 'Miami Port Terminal (MIA-03)';

  /* ─── Render Splash Intro Screen if active ─── */
  if (showWelcomeScreen) {
    return (
      <WelcomeSplashScreen
        siteName={siteDisplayName}
        onEnter={() => setShowWelcomeScreen(false)}
      />
    );
  }

  /* ─── Render Main Dashboard UI ─── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* ─── Left Navigation Panel (Sidebar) ─── */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-slate-950/95 border-r border-slate-800/80 p-5 shrink-0 justify-between select-none sticky top-0 h-screen z-40">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-sky-500/25 border border-sky-300/30">
              S
            </div>
            <div>
              <div className="text-base font-black tracking-wider text-white leading-none">
                SENTINEL
              </div>
              <div className="text-[11px] font-semibold text-sky-400 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                FortyGuard Live Stream
              </div>
            </div>
          </div>

          {/* Multi-Site Selector (Vision 2030 Phase 1 & 2) */}
          <div className="space-y-1 px-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Operational Site
            </label>
            <div className="relative">
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer appearance-none pr-8"
              >
                <option value="PHX-SITE-01">📍 Phoenix Sky Harbor (Active)</option>
                <option value="DFW-SITE-02">📍 Dallas Metro Rail (Ready)</option>
                <option value="MIA-SITE-03">📍 Miami Port Logistics (Ready)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Large Navigation Menu */}
          <nav className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Navigation Hub
            </div>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`nav-left-${item.id}`}
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left group ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xl shadow-sky-500/25 scale-[1.02] ring-1 ring-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/90 border border-transparent hover:border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`text-2xl p-2 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      isActive ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-900 text-slate-300 border border-slate-800/80'
                    }`}>
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate leading-tight">
                        {item.label}
                      </div>
                      <div className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-sky-100' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.id === 'incidents' && activeIncidentsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white font-bold shadow-md shadow-red-500/40 shrink-0 animate-bounce">
                      {activeIncidentsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System & Supervisor Card */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">System Telemetry</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Operational
              </span>
            </div>
            <div className="text-xs text-slate-300 font-medium truncate">
              Site: <span className="font-mono text-white font-semibold">{
                selectedSiteId === 'PHX-SITE-01' ? 'Phoenix Sky Harbor' :
                selectedSiteId === 'DFW-SITE-02' ? 'Dallas Metro Rail' : 'Miami Port Logistics'
              }</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              FortyGuard Feed: <span className="text-amber-300 font-mono font-bold">35.0°C</span> (Live API)
            </div>
            <button
              onClick={() => setShowWelcomeScreen(true)}
              className="mt-2 w-full py-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-[11px] font-semibold text-sky-400 hover:text-sky-300 border border-slate-700/60 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>✨ Replay Welcome Intro</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Header ─── */}
      <header className="md:hidden sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-sky-500/25">
            S
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">SENTINEL</div>
            <div className="text-[10px] text-slate-400 leading-tight">Heat-Risk Prevention</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
          <span className="text-xs text-slate-300 font-semibold">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </header>

      {/* ─── Main Content Canvas ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 w-full max-w-[1700px] mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
          {/* Active View Header Bar */}
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-white">AUTONOMOUS HEAT-RISK PREVENTION ACTIVE</span>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="hidden sm:inline text-slate-400">Zero threshold breaches</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-400">Live API: <strong className="text-amber-300">35.0°C</strong></span>
              <button
                onClick={() => setShowWelcomeScreen(true)}
                className="text-sky-400 hover:text-sky-300 text-[11px] font-semibold underline cursor-pointer ml-1"
              >
                Welcome Intro
              </button>
            </div>
          </div>

          {/* ─── Active View Rendering ─── */}
          {activeTab === 'overview' && (
            <OverviewView
              opsSummary={opsSummary}
              priorityItems={priorityItems}
              mapData={mapData}
              incidents={incidents}
              latestObservation={latestObservation}
              selectedWorkerId={selectedWorkerId}
              selectedIncidentId={selectedIncidentId}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onSelectWorker={(wId) => setSelectedWorkerId(wId)}
              onSelectIncident={(iId) => setSelectedIncidentId(iId)}
            />
          )}

          {activeTab === 'map' && (
            <SpatialMapView
              mapData={mapData}
              incidents={incidents}
              latestObservation={latestObservation}
              selectedWorkerId={selectedWorkerId}
              selectedIncidentId={selectedIncidentId}
              onSelectWorker={(wId) => setSelectedWorkerId(wId)}
              onSelectIncident={(iId) => setSelectedIncidentId(iId)}
            />
          )}

          {activeTab === 'workers' && (
            <WorkersFleetView
              priorityItems={priorityItems}
              selectedWorkerId={selectedWorkerId}
              onSelectWorker={(wId) => setSelectedWorkerId(wId)}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentsAnalyticsView
              incidents={incidents}
              userRole={userRole}
              selectedIncidentId={selectedIncidentId}
              latestObservation={latestObservation}
              onSelectIncident={(iId) => setSelectedIncidentId(iId)}
              onAcknowledgeIncident={handleAcknowledgeIncident}
              onAssignIncident={handleAssignIncident}
              onStartMitigation={handleStartMitigation}
              onEscalateIncident={handleEscalateIncident}
              onResolveIncident={handleResolveIncident}
            />
          )}

          {activeTab === 'actions' && (
            <ActionsAuditView
              actions={actions}
              auditEvents={auditEvents}
              onAcknowledgeAction={handleAcknowledgeAction}
              onOverrideAction={handleOverrideAction}
              onOpenAuditModal={(ref) => openAuditInspector(ref || '')}
            />
          )}

          {activeTab === 'reports' && (
            <ShiftReportsView />
          )}

          {activeTab === 'scheduling' && (
            <SchedulingView />
          )}
        </main>
      </div>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 md:hidden">
        <div className="flex items-center justify-around py-1.5 px-2">
          {navItems.map((tab) => (
            <button
              id={`mobile-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all cursor-pointer select-none touch-manipulation ${
                activeTab === tab.id
                  ? 'text-sky-400 bg-sky-500/10 font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[11px] font-medium leading-none">{tab.label}</span>
              {tab.id === 'incidents' && activeIncidentsCount > 0 && (
                <span className="absolute top-1 right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
                  {activeIncidentsCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ─── Slide-over Inspectors ─── */}
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
          onOpenAudit={(payloadRef) => openAuditInspector(payloadRef)}
        />
      )}

      {selectedIncidentDetail && (
        <IncidentDetailInspector
          incident={selectedIncidentDetail.incident}
          affectedWorkers={selectedIncidentDetail.affected_workers}
          timeline={selectedIncidentDetail.timeline}
          userRole={userRole}
          onClose={() => setSelectedIncidentId(null)}
          onSelectWorker={(workerId) => {
            setSelectedIncidentId(null);
            setSelectedWorkerId(workerId);
          }}
          onOpenAudit={(payloadRef) => openAuditInspector(payloadRef)}
        />
      )}

      {/* ─── Cryptographic Audit Inspector Modal ─── */}
      <AuditInspectorModal
        isOpen={auditModalOpen}
        onClose={() => {
          setAuditModalOpen(false);
          setAuditFilterRef(null);
        }}
        filterRef={auditFilterRef}
        auditEvents={auditEvents}
      />
    </div>
  );
};
