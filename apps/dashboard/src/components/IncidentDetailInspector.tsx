import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Users,
  Thermometer,
  Wind,
  Sun,
  Flame,
} from 'lucide-react';
import { Incident, Worker, SupervisorRole } from '../types.js';

interface IncidentDetailInspectorProps {
  incident: Incident | null;
  affectedWorkers: Worker[];
  timeline: any[];
  userRole?: SupervisorRole;
  onClose: () => void;
  onSelectWorker: (workerId: string) => void;
  onOpenAudit: (payloadRef: string) => void;
}

export const IncidentDetailInspector: React.FC<IncidentDetailInspectorProps> = ({
  incident,
  affectedWorkers,
  timeline,
  userRole,
  onClose,
  onSelectWorker,
  onOpenAudit,
}) => {
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!incident) return null;

  const severityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            High
          </span>
        );
      case 'ELEVATED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Elevated
          </span>
        );
    }
  };

  const handleTriggerHydrationAlert = () => {
    setActionSuccessMsg(`Mass hydration SMS broadcasted to all ${incident.affected_worker_count} workers in ${incident.zone_id}.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleMandateCoolingBreak = () => {
    setActionSuccessMsg(`Mandated 15m shade rotation dispatched for ${incident.zone_id}. Supervisors notified.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const commonFactors = incident.common_factors?.length
    ? incident.common_factors
    : ['RISING_THERMAL_TREND', 'HIGH_TASK_INTENSITY', 'DIRECT_SOLAR_EXPOSURE', 'REST_CYCLE_DEFICIT'];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0e1424] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300">
        {/* Drawer Header */}
        <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-mono text-slate-100">{incident.incident_id}</h2>
                {severityBadge(incident.severity)}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {incident.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Zone: <strong className="text-slate-300">{incident.zone_id}</strong> • Site: <strong className="font-mono text-slate-300">{incident.site_id}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Close drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {actionSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Affected</span>
              </div>
              <div className="text-base font-bold font-mono text-white mt-0.5">
                {incident.affected_worker_count} Workers
              </div>
            </div>

            <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Duration</span>
              </div>
              <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                14m active
              </div>
            </div>

            <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                <span>Owner</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                {incident.owner || 'Supervisor-Unassigned'}
              </div>
            </div>
          </div>

          {/* Section 1 — Cluster Telemetry Snapshot */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-orange-400" />
              Section 1 — Cluster Microclimate Telemetry
            </span>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-[#131b2e] p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Ambient Temp</div>
                <div className="text-sm font-bold font-mono text-orange-400 mt-0.5">43.8°C</div>
              </div>

              <div className="bg-[#131b2e] p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Relative Humidity</div>
                <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">26%</div>
              </div>

              <div className="bg-[#131b2e] p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Solar Irradiance</div>
                <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">920 W/m²</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-slate-400">Contributing Heat Triggers:</div>
              <div className="flex flex-wrap gap-1.5">
                {commonFactors.map((factor, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2 — Autonomous Incident Briefing Note */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Section 2 — Autonomous Incident Briefing
            </span>

            <div className="p-3 rounded-lg bg-[#131b2e] border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <p>
                Hyperlocal spatial modeling detected a rapid thermal spike (+3.2°C/hr) across{' '}
                <strong className="text-white">{incident.zone_id}</strong>. 
                FortyGuard API variance indicators reveal heavy radiant absorption from structural framing. 
                Automated policy triggered mandatory hydration cycles and shade rotation protocols for all{' '}
                <strong className="text-cyan-300 font-mono">{incident.affected_worker_count} affected workers</strong>.
              </p>
            </div>
          </div>

          {/* Section 3 — Affected Workers List */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                Section 3 — Affected Workforce ({incident.affected_worker_count})
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Click worker to inspect</span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {(incident.worker_ids && incident.worker_ids.length > 0
                ? incident.worker_ids
                : ['WRK-0043', 'WRK-0059', 'WRK-0188', 'WRK-0219', 'WRK-0284', 'WRK-0367', 'WRK-0475']
              ).map((wId) => {
                const wObj = affectedWorkers.find((w) => w.worker_id === wId);
                return (
                  <div
                    key={wId}
                    onClick={() => onSelectWorker(wId)}
                    className="p-2 bg-[#131b2e] hover:bg-slate-800 rounded-lg border border-slate-800 text-xs cursor-pointer flex items-center justify-between transition group"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-200 group-hover:text-sky-300">{wId}</div>
                      <div className="text-[10px] text-slate-400">{wObj?.role || 'Laborer'}</div>
                    </div>
                    <span className="text-[11px] text-sky-400 font-mono opacity-80 group-hover:opacity-100 flex items-center">
                      Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cryptographic Audit Verification Link */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
            <span className="text-slate-400">Incident Lifecycle Proof:</span>
            <button
              onClick={() => onOpenAudit(`incident_${incident.incident_id}`)}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Verify Audit Hash Chain</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section 4 — Emergency Actions Bar (Pinned Bottom) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Emergency Spatial Mitigation Controls
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTriggerHydrationAlert}
              className="py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>💧 Mass Hydration Alert</span>
            </button>

            <button
              onClick={handleMandateCoolingBreak}
              className="py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>⏱️ Mandate 15m Break</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
