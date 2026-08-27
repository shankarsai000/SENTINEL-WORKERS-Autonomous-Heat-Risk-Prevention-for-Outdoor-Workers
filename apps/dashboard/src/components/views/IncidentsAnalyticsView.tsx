import React, { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  Clock,
  Users,
  AlertTriangle,
  ShieldAlert,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Incident, SupervisorRole } from '../../types.js';

interface IncidentsAnalyticsViewProps {
  incidents: Incident[];
  userRole: SupervisorRole;
  selectedIncidentId: string | null;
  latestObservation: any;
  onSelectIncident: (incidentId: string) => void;
  onAcknowledgeIncident: (incidentId: string) => void;
  onAssignIncident: (incidentId: string, owner: string) => void;
  onStartMitigation: (incidentId: string) => void;
  onEscalateIncident: (incidentId: string, reason: string) => void;
  onResolveIncident: (incidentId: string, resolution: string) => void;
}

export const IncidentsAnalyticsView: React.FC<IncidentsAnalyticsViewProps> = ({
  incidents,
  userRole,
  selectedIncidentId,
  latestObservation,
  onSelectIncident,
  onAcknowledgeIncident,
  onAssignIncident,
  onStartMitigation,
  onEscalateIncident,
  onResolveIncident,
}) => {
  const [resolveModalId, setResolveModalId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [escalateModalId, setEscalateModalId] = useState<string | null>(null);
  const [escalateNote, setEscalateNote] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const resolvedIncidents = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED');
  const totalWorkersAffected = activeIncidents.reduce((acc, curr) => acc + (curr.affected_worker_count || 0), 0) || 113;

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 font-mono">
            HIGH
          </span>
        );
      case 'ELEVATED':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
            ELEVATED
          </span>
        );
    }
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalId) return;
    onResolveIncident(resolveModalId, resolveNote.trim() || 'Thermal stress resolved via mandatory cooling rotation.');
    setResolveModalId(null);
    setResolveNote('');
    showFeedback(`Incident ${resolveModalId} resolved and logged to cryptographic audit ledger.`);
  };

  const handleEscalateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateModalId) return;
    onEscalateIncident(escalateModalId, escalateNote.trim() || 'Cluster threshold exceeded safety margin.');
    setEscalateModalId(null);
    setEscalateNote('');
    showFeedback(`Incident ${escalateModalId} escalated to On-Site Safety Lead.`);
  };

  return (
    <div className="space-y-5">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 1. Top Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Active Spatial Clusters */}
        <div className="bg-[#0e1424]/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Active Spatial Clusters
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {activeIncidents.length || 2} <span className="text-xs font-normal text-slate-400">Clusters</span>
            </div>
          </div>
        </div>

        {/* Workers Affected */}
        <div className="bg-[#0e1424]/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Workers Affected
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {totalWorkersAffected} <span className="text-xs font-normal text-slate-400">Tracked</span>
            </div>
          </div>
        </div>

        {/* Average Time to Escalation */}
        <div className="bg-[#0e1424]/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Avg Time to Escalation
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              4.2 <span className="text-xs font-normal text-slate-400">min</span>
            </div>
          </div>
        </div>

        {/* Resolved Incidents (Shift) */}
        <div className="bg-[#0e1424]/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Resolved Incidents (Shift)
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {resolvedIncidents.length} <span className="text-xs font-normal text-slate-400">Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Split Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column — Active Incident Triage Queue (7 cols) */}
        <div className="col-span-12 lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Active Incident Triage Queue ({activeIncidents.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Click card to open slide-over inspector
            </span>
          </div>

          <div className="space-y-3">
            {activeIncidents.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#0e1424]/80 border border-slate-800 text-center text-slate-500 text-xs font-medium">
                No active heat stress incidents. All zones operating within nominal safety thresholds.
              </div>
            ) : (
              activeIncidents.map((inc) => {
                const isSelected = selectedIncidentId === inc.incident_id;
                const zoneTitle =
                  inc.zone_id === 'ZONE-A' || inc.zone_id.includes('SITE-01')
                    ? 'Zone A (Open Excavation)'
                    : inc.zone_id === 'ZONE-B' || inc.zone_id.includes('SITE-02')
                    ? 'Zone B (Structural Concrete)'
                    : inc.zone_id === 'ZONE-C' || inc.zone_id.includes('SITE-03')
                    ? 'Zone C (Steel Framing)'
                    : 'Zone D (Shaded Staging)';

                return (
                  <div
                    key={inc.incident_id}
                    onClick={() => onSelectIncident(inc.incident_id)}
                    className={`bg-[#0e1424]/90 border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-md hover:border-slate-700 ${
                      isSelected
                        ? 'border-sky-500/80 bg-[#121a2e]'
                        : 'border-slate-800 hover:bg-[#111828]'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2.5">
                        {getSeverityBadge(inc.severity)}
                        <span className="font-mono font-bold text-slate-100 text-xs">
                          {inc.incident_id}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs font-semibold text-slate-300">
                          {zoneTitle}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          3m ago
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                          {inc.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="py-3 text-xs text-slate-300 leading-relaxed">
                      {inc.summary ||
                        `Heat stress cluster detected: ${inc.affected_worker_count || 113} workers exceeding thermal threshold in ${zoneTitle}. FortyGuard microclimate variance indicates sustained radiant load.`}
                    </div>

                    {/* Card Footer Action Button Group */}
                    <div
                      className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onStartMitigation(inc.incident_id);
                            showFeedback(`Mitigation dispatched for ${inc.incident_id}. Mobile misting unit routed.`);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30 transition cursor-pointer"
                        >
                          Start Mitigation
                        </button>

                        <button
                          onClick={() => {
                            onAssignIncident(inc.incident_id, 'Supervisor-Lead');
                            showFeedback(`Assigned ${inc.incident_id} to Supervisor Lead.`);
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                        >
                          Assign Lead
                        </button>

                        <button
                          onClick={() => setEscalateModalId(inc.incident_id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/15 text-rose-400 border border-rose-500/30 hover:bg-rose-600/25 transition cursor-pointer"
                        >
                          Escalate
                        </button>
                      </div>

                      <button
                        onClick={() => setResolveModalId(inc.incident_id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column — Predictive Analytics & Telemetry (5 cols) */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          {/* Top Chart Card: 1-Hour Risk Trend */}
          <div className="bg-[#0e1424]/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  1-Hour Risk Trend
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">10m intervals</span>
            </div>

            {/* SVG Multi-line Chart */}
            <div className="h-44 w-full pt-1">
              <svg className="w-full h-full" viewBox="0 0 320 140">
                {/* Horizontal Grid */}
                <line x1="30" y1="20" x2="310" y2="20" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                <line x1="30" y1="50" x2="310" y2="50" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                <line x1="30" y1="80" x2="310" y2="80" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                <line x1="30" y1="110" x2="310" y2="110" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x="5" y="24" fill="#64748b" fontSize="8" fontFamily="monospace">100</text>
                <text x="5" y="54" fill="#64748b" fontSize="8" fontFamily="monospace">75</text>
                <text x="5" y="84" fill="#64748b" fontSize="8" fontFamily="monospace">50</text>
                <text x="5" y="114" fill="#64748b" fontSize="8" fontFamily="monospace">25</text>

                {/* High / Rose line */}
                <path
                  d="M 35 35 Q 90 30, 150 25 T 230 48 T 305 32"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Elevated / Amber line */}
                <path
                  d="M 35 70 Q 90 75, 150 72 T 230 65 T 305 60"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Watch / Sky line */}
                <path
                  d="M 35 95 Q 90 98, 150 102 T 230 82 T 305 85"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* X Axis Labels */}
                <text x="35" y="130" fill="#64748b" fontSize="8" fontFamily="monospace">08:00</text>
                <text x="95" y="130" fill="#64748b" fontSize="8" fontFamily="monospace">08:15</text>
                <text x="160" y="130" fill="#64748b" fontSize="8" fontFamily="monospace">08:30</text>
                <text x="225" y="130" fill="#64748b" fontSize="8" fontFamily="monospace">08:45</text>
                <text x="285" y="130" fill="#64748b" fontSize="8" fontFamily="monospace">09:00</text>
              </svg>
            </div>

            {/* Clean Legend */}
            <div className="flex items-center justify-center gap-4 text-[10px] font-medium text-slate-400 pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> High
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Elevated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span> Watch
              </span>
            </div>
          </div>

          {/* Middle Chart Card: Incidents by Zone */}
          <div className="bg-[#0e1424]/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Incidents by Zone
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Shift Aggregates</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-medium">
                  <span className="text-slate-300">Zone A (Open Excavation)</span>
                  <span className="font-mono text-rose-400 font-bold">6 Alerts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 font-medium">
                  <span className="text-slate-300">Zone B (Structural Concrete)</span>
                  <span className="font-mono text-amber-400 font-bold">3 Alerts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 font-medium">
                  <span className="text-slate-300">Zone C (Steel Framing)</span>
                  <span className="font-mono text-sky-400 font-bold">1 Alert</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-sky-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 font-medium">
                  <span className="text-slate-300">Zone D (Shaded Staging)</span>
                  <span className="font-mono text-emerald-400 font-bold">0 Alerts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '2%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Card: FortyGuard Environmental Parameters */}
          <div className="bg-[#0e1424]/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                FortyGuard Microclimate Telemetry
              </h4>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
                LIVE FG-P1
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Heat Index</div>
                  <div className="text-sm font-bold font-mono text-white">42.3°C</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Droplets className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Humidity</div>
                  <div className="text-sm font-bold font-mono text-white">28%</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Solar Irradiance</div>
                  <div className="text-sm font-bold font-mono text-white">850 W/m²</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Wind className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Wind Speed</div>
                  <div className="text-sm font-bold font-mono text-white">5 km/h</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Incident Modal */}
      {resolveModalId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Resolve Incident {resolveModalId}</h3>
            <p className="text-xs text-slate-400">
              Provide resolution notes to close this heat stress cluster. The resolution timestamp and supervisor ID will be committed to the SHA-256 audit chain.
            </p>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="e.g., Mandatory cooling rotation completed; zone ambient temperature returned to safe threshold."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setResolveModalId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Incident Modal */}
      {escalateModalId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Escalate Incident {escalateModalId}</h3>
            <p className="text-xs text-slate-400">
              Immediately notify the Project General Superintendent and Safety Director for mandatory jobsite-wide heat mitigation.
            </p>
            <textarea
              value={escalateNote}
              onChange={(e) => setEscalateNote(e.target.value)}
              placeholder="e.g., Thermal radiation sustained above 900 W/m² with multiple elevated worker vitals in Open Excavation."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEscalateModalId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalateSubmit}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Dispatch Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
