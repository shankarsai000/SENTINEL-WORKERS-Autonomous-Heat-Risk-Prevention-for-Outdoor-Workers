import React, { useState, useEffect, useCallback } from 'react';
import { useSentinelWebSocket } from './hooks/useSentinelWebSocket.js';
import { Sidebar } from './components/Sidebar.js';
import { WorkerDetailInspector } from './components/WorkerDetailInspector.js';
import { IncidentDetailInspector } from './components/IncidentDetailInspector.js';
import { AuditInspectorModal } from './components/AuditInspectorModal.js';
import { OverviewView } from './components/views/OverviewView.js';
import { SpatialMapView } from './components/views/SpatialMapView.js';
import { WorkersFleetView } from './components/views/WorkersFleetView.js';
import { IncidentsAnalyticsView } from './components/views/IncidentsAnalyticsView.js';
import { ActionsAuditView } from './components/views/ActionsAuditView.js';
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
    riskStates,
    actions,
    incidents,
    auditEvents,
    refreshData,
  } = useSentinelWebSocket();

  // Navigation & Operational state
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [viewDropdownOpen, setViewDropdownOpen] = useState<boolean>(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('PHX-SITE-01');
  const [userRole] = useState<SupervisorRole>('SUPERVISOR');
  const [timeRange, setTimeRange] = useState<string>('1h');

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
  const [latestObservation, setLatestObservation] = useState<any>(null);

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
      .then((data) => {
        setOpsSummary(data);
        if (data.latest_observation) {
          setLatestObservation(data.latest_observation);
        }
      })
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
  const handleAcknowledgeIncident = async (incidentId: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ actor: `${userRole} (Console)` }),
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
        body: JSON.stringify({ owner, actor: `${userRole} (Console)` }),
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
        body: JSON.stringify({ actor: `${userRole} (Console)` }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Incident mitigate error:', e);
    }
  };

  const handleEscalateIncident = async (incidentId: string, reason: string) => {
    try {
      await fetch(`/api/incidents/${incidentId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ reason, actor: `${userRole} (Console)` }),
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
        body: JSON.stringify({ resolution, actor: `${userRole} (Console)` }),
      });
      loadOperationsData();
      refreshData();
    } catch (e) {
      console.error('Incident resolve error:', e);
    }
  };

  const openAuditInspector = (payloadRef: string) => {
    setAuditFilterRef(payloadRef);
    setAuditModalOpen(true);
  };

  const activeIncidentsCount = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;

  const viewOptions = [
    {
      id: 'overview',
      label: 'Ops Center Overview',
      icon: '🏢',
      desc: 'KPIs, priority queue & spatial risk map',
    },
    {
      id: 'map',
      label: 'Live Spatial Map & Heatmap',
      icon: '🗺️',
      desc: 'Microclimate studio & cooling stations',
    },
    {
      id: 'workers',
      label: 'Worker Fleet & Vitals',
      icon: '👷',
      badge: '113',
      desc: 'Workforce physiological telemetry',
    },
    {
      id: 'incidents',
      label: 'Incidents & Predictive Analytics',
      icon: '📈',
      badge: activeIncidentsCount > 0 ? String(activeIncidentsCount) : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold',
      desc: 'Cluster triage & risk trajectory',
    },
    {
      id: 'actions',
      label: 'Safety Actions & Audit',
      icon: '🛡️',
      desc: 'Intervention ledger & HMAC-SHA256 proof',
    },
  ];

  const normalizedActiveTab = activeTab === 'reports' ? 'incidents' : activeTab === 'audit' ? 'actions' : activeTab;
  const currentView = viewOptions.find((v) => v.id === normalizedActiveTab) || viewOptions[0];

  return (
    <div className="min-h-screen bg-[#0b101b] text-slate-100 flex font-sans selection:bg-blue-600 selection:text-white">
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        onOpenAudit={() => setAuditModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Top Header Bar */}
        <header className="bg-[#0e1424]/95 border-b border-[#1e293b]/70 backdrop-blur-md px-6 py-2.5 sticky top-0 z-30 flex items-center justify-between">
          {/* Site Selector & Status Pills */}
          <div className="flex items-center space-x-4">
            {/* Site Dropdown */}
            <div className="relative">
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="bg-transparent text-sm font-bold text-white hover:text-blue-400 flex items-center space-x-1 outline-none cursor-pointer pr-5 appearance-none"
              >
                <option value="PHX-SITE-01" className="bg-[#0e1424] text-white">
                  Sky Harbor Air Logistics Hub (PHX-SITE-01)
                </option>
                {sites.map((s) => (
                  <option key={s.site_id} value={s.site_id} className="bg-[#0e1424] text-white">
                    {s.name} ({s.site_id})
                  </option>
                ))}
              </select>
              <svg className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Status Pills */}
            <div className="flex items-center space-x-2 text-xs font-medium">
              {/* LIVE indicator */}
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#131b2e] border border-[#1e293b]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-white text-[11px] font-semibold">LIVE</span>
              </div>

              {/* FortyGuard Status */}
              <div className="text-[11px] text-slate-300">
                <span className="text-slate-400">FortyGuard: </span>
                <span className="text-amber-400 font-bold">
                  {opsSummary?.fortyguard_status?.toUpperCase() || 'DEGRADED'}
                </span>
              </div>

              <span className="text-slate-600">|</span>

              {/* Data Freshness */}
              <div className="text-[11px] text-slate-300">
                <span className="text-slate-400">Data Freshness: </span>
                <span className="text-emerald-400 font-bold">
                  {opsSummary?.data_freshness?.toUpperCase() || 'FRESH'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls & Studio View Selector Dropdown */}
          <div className="flex items-center space-x-3">
            {/* View Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1a233a] border border-slate-700/80 text-slate-100 text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <span className="text-sm">{currentView.icon}</span>
                <span className="font-semibold text-white">{currentView.label}</span>
                {currentView.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${currentView.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {currentView.badge}
                  </span>
                )}
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${viewDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu Overlay & List */}
              {viewDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setViewDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-[#0e1424] border border-slate-700 rounded-xl shadow-2xl z-40 py-1.5 overflow-hidden backdrop-blur-xl animate-fade-in divide-y divide-slate-800/80">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Select Studio View
                    </div>
                    <div className="py-1">
                      {viewOptions.map((opt) => {
                        const isSelected = normalizedActiveTab === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setActiveTab(opt.id);
                              setViewDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/15 text-sky-300 font-semibold border-l-2 border-sky-500'
                                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-sm shrink-0">{opt.icon}</span>
                              <div className="min-w-0">
                                <div className="truncate font-medium">{opt.label}</div>
                                <div className="text-[10px] text-slate-500 truncate">{opt.desc}</div>
                              </div>
                            </div>
                            {opt.badge && (
                              <span className={`ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${opt.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                                {opt.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b]/60 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <span className="absolute 0 top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                2
              </span>
            </div>

            {/* Export Report Button */}
            <button
              onClick={() => setActiveTab('reports')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Export Report</span>
            </button>
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <main className="p-4 sm:p-5 max-w-[1600px] w-full mx-auto">
          {/* Panel 1: Operations Center Overview */}
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

          {/* Panel 2: Live Spatial Risk & Heatmap Studio */}
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

          {/* Panel 3: Worker Fleet & Predictive Vitals Hub */}
          {activeTab === 'workers' && (
            <WorkersFleetView
              priorityItems={priorityItems}
              selectedWorkerId={selectedWorkerId}
              onSelectWorker={(wId) => setSelectedWorkerId(wId)}
            />
          )}

          {/* Panel 4: Incidents & Predictive Analytics */}
          {(activeTab === 'incidents' || activeTab === 'reports') && (
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

          {/* Panel 5: Safety Actions & Cryptographic Audit Trail */}
          {(activeTab === 'actions' || activeTab === 'audit') && (
            <ActionsAuditView
              actions={actions}
              auditEvents={auditEvents}
              onAcknowledgeAction={handleAcknowledgeAction}
              onOverrideAction={handleOverrideAction}
              onOpenAuditModal={(ref) => openAuditInspector(ref || '')}
            />
          )}

          {/* Settings Tab fallback */}
          {activeTab === 'settings' && (
            <div className="bg-[#0e1424] rounded-xl border border-[#1e293b] p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-white flex items-center space-x-2">
                <span>⚙️</span>
                <span>System Configuration & Policy Guardrails</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-[#131b2e] border border-[#1e293b] space-y-2">
                  <div className="font-bold text-slate-200">Active Safety Policy</div>
                  <div className="text-slate-400">Policy: <span className="text-blue-400 font-bold">demo-construction-v1.0.0</span></div>
                  <div className="text-slate-400">Extreme Temp Work Halt: <span className="text-rose-400 font-bold">46.0°C</span></div>
                  <div className="text-slate-400">Elevated Rest Ratio: <span className="text-amber-400 font-bold">15 min / 45 min work</span></div>
                </div>
                <div className="p-4 rounded-lg bg-[#131b2e] border border-[#1e293b] space-y-2">
                  <div className="font-bold text-slate-200">Environmental Data Mode</div>
                  <div className="text-slate-400">Primary Provider: <span className="text-emerald-400 font-bold">FortyGuard Enterprise API</span></div>
                  <div className="text-slate-400">Credit Protection Cache: <span className="text-slate-200 font-bold">15 min TTL</span></div>
                  <div className="text-slate-400">Sensor Failover: <span className="text-slate-200 font-bold">Autonomous Hybrid Mode</span></div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Global Footer */}
        <footer className="mt-auto py-3 text-center border-t border-[#1e293b]/40 text-[11px] text-slate-500 font-medium select-none">
          SENTINEL WORKERS © 2026 | Autonomous Heat-Risk Prevention & Hyperlocal Environmental Intelligence
        </footer>
      </div>

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
