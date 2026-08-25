import React from 'react';
import { Incident, Worker, SupervisorRole } from '../types';

interface IncidentDetailInspectorProps {
  incident: Incident | null;
  affectedWorkers: Worker[];
  timeline: any[];
  userRole: SupervisorRole;
  onClose: () => void;
  onSelectWorker: (workerId: string) => void;
  onOpenAudit: (payloadRef: string) => void;
}

export const IncidentDetailInspector: React.FC<IncidentDetailInspectorProps> = ({
  incident,
  affectedWorkers,
  timeline,
  onClose,
  onSelectWorker,
  onOpenAudit,
}) => {
  if (!incident) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold font-mono">
            🚨
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold font-mono text-slate-100">{incident.incident_id}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {incident.severity}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                {incident.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Zone: {incident.zone_id} • Site: {incident.site_id} • Owner: {incident.owner}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Incident Summary Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Summary</div>
          <div className="text-sm text-slate-200">{incident.summary}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {incident.common_factors?.map((factor, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700"
              >
                {factor}
              </span>
            ))}
          </div>
        </div>

        {/* Affected Workers List */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Affected Workers ({incident.affected_worker_count})
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Click to inspect</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {incident.worker_ids?.map((wId) => {
              const wObj = affectedWorkers.find((w) => w.worker_id === wId);
              return (
                <div
                  key={wId}
                  onClick={() => onSelectWorker(wId)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-xs cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-200">{wId}</span>
                    <div className="text-[10px] text-slate-400">{wObj?.role || 'Worker'}</div>
                  </div>
                  <span className="text-xs text-sky-400 font-mono">Inspect →</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interventions Summary */}
        {incident.action_summary && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Action Status Breakdown
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-slate-400 text-[10px]">PROPOSED</div>
                <div className="text-slate-100 font-bold text-sm mt-0.5">{incident.action_summary.proposed}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-emerald-400 text-[10px]">COMPLETED</div>
                <div className="text-emerald-300 font-bold text-sm mt-0.5">{incident.action_summary.completed}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-amber-400 text-[10px]">PENDING ACK</div>
                <div className="text-amber-300 font-bold text-sm mt-0.5">{incident.action_summary.pending}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-rose-400 text-[10px]">ESCALATED</div>
                <div className="text-rose-300 font-bold text-sm mt-0.5">{incident.action_summary.escalated}</div>
              </div>
            </div>
          </div>
        )}

        {/* Resolution Details */}
        {incident.resolution && (
          <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-lg p-3.5">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Resolution</div>
            <div className="text-xs text-emerald-200">{incident.resolution}</div>
            {incident.resolution_note && (
              <div className="text-[11px] text-slate-400 mt-1">{incident.resolution_note}</div>
            )}
          </div>
        )}

        {/* Incident Timeline */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Incident Timeline</div>
            <button
              onClick={() => onOpenAudit(incident.incident_id)}
              className="text-xs text-sky-400 hover:text-sky-300 underline font-mono"
            >
              Incident Audit Trail ↗
            </button>
          </div>

          <div className="space-y-2 mt-2">
            {timeline.map((ev, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800/60 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-slate-300">{ev.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-slate-400 mt-0.5 text-[11px]">{ev.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
