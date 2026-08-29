import React from 'react';
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
  onSelectIncident,
  onStartMitigation,
  onResolveIncident,
}) => {
  const active = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const resolved = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED');

  const totalAffected = active.reduce((s, i) => s + (i.affected_worker_count || 0), 0);

  const riskBadge = (level: string) => {
    const c: Record<string, string> = {
      CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
      HIGH: 'bg-red-500/15 text-red-400 border-red-500/30',
      ELEVATED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      WATCH: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    };
    return c[level] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Incident Response & Triage</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time thermal risk detection and intervention tracking</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5">
          <div className="text-sm text-slate-400 mb-1">Active Clusters</div>
          <div className="text-3xl font-bold text-red-400">{active.length}</div>
          <div className="text-xs text-slate-500 mt-1">Requiring triage</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5">
          <div className="text-sm text-slate-400 mb-1">Workers Affected</div>
          <div className="text-3xl font-bold text-amber-400">{totalAffected}</div>
          <div className="text-xs text-slate-500 mt-1">In active zones</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5">
          <div className="text-sm text-slate-400 mb-1">Resolved Shift</div>
          <div className="text-3xl font-bold text-emerald-400">{resolved.length}</div>
          <div className="text-xs text-slate-500 mt-1">Mitigated incidents</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5">
          <div className="text-sm text-slate-400 mb-1">Total Logged</div>
          <div className="text-3xl font-bold text-white">{incidents.length}</div>
          <div className="text-xs text-slate-500 mt-1">Shift history</div>
        </div>
      </div>

      {/* Active Incidents Grid (2 columns on wide screens) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Active Incidents ({active.length})
          </h2>
        </div>

        {active.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-8 text-center text-slate-500 text-sm">
            No active incidents — all zones nominal
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {active.map((inc) => (
              <div
                key={inc.incident_id}
                className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-bold text-white leading-snug">
                      {inc.summary || 'Heat stress cluster'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span className="font-semibold text-slate-300">{inc.zone_id}</span>
                      <span>•</span>
                      <span>{inc.affected_worker_count || 0} workers affected</span>
                      <span>•</span>
                      <span className="text-slate-500">
                        {new Date(inc.opened_at || inc.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border shrink-0 ${riskBadge(inc.severity || 'ELEVATED')}`}>
                    {inc.severity || 'ELEVATED'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/60 flex-wrap">
                  <button
                    onClick={() => onSelectIncident(inc.incident_id)}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xs font-semibold hover:bg-sky-500/25 transition cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onStartMitigation(inc.incident_id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                  >
                    Start Mitigation
                  </button>
                  <button
                    onClick={() => onResolveIncident(inc.incident_id, 'Resolved from dashboard')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition cursor-pointer"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Incidents */}
      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Resolved Incidents ({resolved.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {resolved.slice(0, 6).map((inc) => (
              <button
                key={inc.incident_id}
                onClick={() => onSelectIncident(inc.incident_id)}
                className="w-full bg-slate-900/60 rounded-xl border border-slate-800/40 p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition cursor-pointer text-left opacity-80"
              >
                <div className="text-sm text-slate-300 truncate pr-3">
                  {inc.summary || `Cluster in ${inc.zone_id}`}
                </div>
                <span className="text-xs text-emerald-400 font-semibold shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  Resolved
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
