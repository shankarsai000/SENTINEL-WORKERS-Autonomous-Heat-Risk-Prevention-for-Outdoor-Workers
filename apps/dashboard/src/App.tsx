import React, { useState, useEffect, useCallback } from 'react';
import { useSentinelWebSocket } from './hooks/useSentinelWebSocket.js';
import { Sidebar } from './components/Sidebar.js';
import { TopKpiCards } from './components/TopKpiCards.js';
import { PriorityQueue } from './components/PriorityQueue.js';
import { RiskMap } from './components/RiskMap.js';
import { RightSidebarCards } from './components/RightSidebarCards.js';
import { BottomAnalyticsRow } from './components/BottomAnalyticsRow.js';
import { WorkerDetailInspector } from './components/WorkerDetailInspector.js';
import { IncidentDetailInspector } from './components/IncidentDetailInspector.js';
import { AuditInspectorModal } from './components/AuditInspectorModal.js';
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

  const openAuditInspector = (payloadRef: string) => {
    setAuditFilterRef(payloadRef);
    setAuditModalOpen(true);
  };

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
        <header className="bg-[#0e1424]/90 border-b border-[#1e293b]/70 backdrop-blur-md px-6 py-3 sticky top-0 z-20 flex items-center justify-between">
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

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3">
            {/* Theme Sun Icon */}
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b]/60 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

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
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs font-semibold transition cursor-pointer">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Export Report</span>
            </button>
          </div>
        </header>

        {/* Dashboard Main Workspace Grid */}
        <main className="p-4 sm:p-5 space-y-3.5 max-w-[1600px] w-full mx-auto">
          {/* Top Row: KPI Cards with Time Filter on Right */}
          <div className="space-y-2">
            <div className="flex justify-end">
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-[#111828] border border-[#1e293b] text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer pr-6 appearance-none font-medium"
                >
                  <option value="1h">Last 1 hour</option>
                  <option value="3h">Last 3 hours</option>
                  <option value="8h">Full Shift</option>
                </select>
                <svg className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <TopKpiCards summary={opsSummary} />
          </div>

          {/* Middle Row: 3-Column Operations Center Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-[460px]">
            {/* Left: Supervisor Priority Queue (approx 28% = 3.5 cols) */}
            <div className="lg:col-span-4 xl:col-span-3 h-full">
              <PriorityQueue
                items={priorityItems}
                selectedWorkerId={selectedWorkerId}
                onSelectWorker={(wId) => setSelectedWorkerId(wId)}
              />
            </div>

            {/* Center: Live Risk Map & Spatial Zones (approx 48% = 6 cols) */}
            <div className="lg:col-span-8 xl:col-span-6 h-full">
              <RiskMap
                siteName={mapData?.site_name || 'Sky Harbor Air Logistics Hub'}
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

            {/* Right: Alerts & System Health (approx 24% = 3 cols) */}
            <div className="lg:col-span-12 xl:col-span-3 h-full">
              <RightSidebarCards summary={opsSummary} />
            </div>
          </div>

          {/* Bottom Row: 4 Analytics Cards */}
          <BottomAnalyticsRow
            incidents={incidents}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
            observation={latestObservation}
          />
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
        filterRef={auditFilterRef}
        auditEvents={auditEvents}
        onClose={() => setAuditModalOpen(false)}
      />
    </div>
  );
};
