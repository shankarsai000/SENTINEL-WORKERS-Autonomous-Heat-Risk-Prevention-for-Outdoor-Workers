import React, { useState } from 'react';
import { Incident, SupervisorRole } from '../types';

interface IncidentCenterProps {
  incidents: Incident[];
  userRole: SupervisorRole;
  selectedIncidentId: string | null;
  onSelectIncident: (incidentId: string) => void;
  onAcknowledge: (incidentId: string) => void;
  onAssign: (incidentId: string, owner: string) => void;
  onStartMitigation: (incidentId: string) => void;
  onEscalate: (incidentId: string, reason: string) => void;
  onResolve: (incidentId: string, resolution: string) => void;
}

export const IncidentCenter: React.FC<IncidentCenterProps> = ({
  incidents,
  userRole,
  selectedIncidentId,
  onSelectIncident,
  onAcknowledge,
  onAssign,
  onStartMitigation,
  onEscalate,
  onResolve,
}) => {
  const [resolveModalId, setResolveModalId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [escalateModalId, setEscalateModalId] = useState<string | null>(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [assignModalId, setAssignModalId] = useState<string | null>(null);
  const [assignedOwner, setAssignedOwner] = useState('Lead Safety Officer');

  const activeIncidents = incidents.filter(
    (inc) => inc.status !== 'RESOLVED' && inc.status !== 'CLOSED'
  );
  const resolvedIncidents = incidents.filter(
    (inc) => inc.status === 'RESOLVED' || inc.status === 'CLOSED'
  );

  const isReadOnly = userRole === 'VIEWER';

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-950/80 text-red-400 border border-red-800 animate-pulse">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-950/80 text-orange-400 border border-orange-800">🟠 HIGH</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-950/80 text-yellow-400 border border-yellow-800">🟡 ELEVATED</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DETECTED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-800">DETECTED</span>;
      case 'TRIAGED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-800">TRIAGED</span>;
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">ACTIVE</span>;
      case 'MITIGATING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse">MITIGATING</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <h2 className="text-base font-semibold text-slate-100">Incident Intelligence & Triage</h2>
          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
            {activeIncidents.length} active
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono">Role: {userRole}</div>
      </div>

      {/* Incident List */}
      <div className="overflow-y-auto flex-1 mt-3 space-y-3 pr-1 max-h-[500px]">
        {activeIncidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            ✅ No active heat stress incidents. All zones normal.
          </div>
        ) : (
          activeIncidents.map((inc) => {
            const isSelected = selectedIncidentId === inc.incident_id;
            return (
              <div
                key={inc.incident_id}
                onClick={() => onSelectIncident(inc.incident_id)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-amber-500 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/60 hover:bg-slate-800/70 border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-slate-100">{inc.incident_id}</span>
                    <span className="text-xs font-mono text-slate-400">• {inc.zone_id}</span>
                    {getSeverityBadge(inc.severity)}
                  </div>
                  <div>{getStatusBadge(inc.status)}</div>
                </div>

                {/* Summary */}
                <div className="mt-2 text-xs text-slate-200">{inc.summary}</div>

                {/* Common Factors */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {inc.common_factors?.map((factor, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {factor}
                    </span>
                  ))}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    👥 {inc.affected_worker_count} Workers Affected
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    👤 Owner: {inc.owner}
                  </span>
                </div>

                {/* Action summary badge counts */}
                {inc.action_summary && (
                  <div className="mt-2 text-[11px] font-mono flex items-center space-x-3 text-slate-400">
                    <span>Interventions: </span>
                    <span className="text-emerald-400">{inc.action_summary.completed} done</span>
                    <span className="text-amber-400">{inc.action_summary.pending} ack pending</span>
                    {inc.action_summary.escalated > 0 && (
                      <span className="text-rose-400 font-bold">{inc.action_summary.escalated} escalated</span>
                    )}
                  </div>
                )}

                {/* Operational Triage Controls */}
                {!isReadOnly && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {inc.status === 'DETECTED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAcknowledge(inc.incident_id);
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition"
                        >
                          Ack / Triage
                        </button>
                      )}

                      {inc.status !== 'MITIGATING' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartMitigation(inc.incident_id);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition"
                        >
                          Start Mitigation
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignModalId(inc.incident_id);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition"
                      >
                        Assign
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEscalateModalId(inc.incident_id);
                        }}
                        className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-300 rounded text-xs font-medium transition"
                      >
                        Escalate
                      </button>
                    </div>

                    {userRole === 'SUPERVISOR' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setResolveModalId(inc.incident_id);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Resolved History Section */}
        {resolvedIncidents.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Recently Resolved ({resolvedIncidents.length})
            </h3>
            <div className="space-y-1.5 opacity-75">
              {resolvedIncidents.slice(0, 3).map((rInc) => (
                <div
                  key={rInc.incident_id}
                  onClick={() => onSelectIncident(rInc.incident_id)}
                  className="p-2 bg-slate-950/40 rounded border border-slate-800/60 text-xs flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-300">{rInc.incident_id}</span>
                    <span className="text-slate-400">({rInc.zone_id})</span>
                    <span className="text-[10px] text-emerald-400 font-mono">RESOLVED</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                    {rInc.resolution || 'Resolution completed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {resolveModalId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Resolve Incident {resolveModalId}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Provide mandatory operational resolution justification. This action is auditable.
            </p>
            <textarea
              rows={3}
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="e.g. Misting station active, workers rotated to AC trailer, wet-bulb normalized..."
              className="mt-3 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-600"
            />
            <div className="mt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => setResolveModalId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!resolutionText.trim()}
                onClick={() => {
                  onResolve(resolveModalId, resolutionText);
                  setResolveModalId(null);
                  setResolutionText('');
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded text-xs"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {escalateModalId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Escalate Incident {escalateModalId}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter justification to escalate severity to CRITICAL and alert senior management.
            </p>
            <textarea
              rows={3}
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="e.g. Multiple workers showing persistent elevated thermal strain despite hydration..."
              className="mt-3 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-rose-500 outline-none placeholder:text-slate-600"
            />
            <div className="mt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => setEscalateModalId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!escalationReason.trim()}
                onClick={() => {
                  onEscalate(escalateModalId, escalationReason);
                  setEscalateModalId(null);
                  setEscalationReason('');
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded text-xs"
              >
                Escalate Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignModalId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Assign Incident {assignModalId}</h3>
            <p className="text-xs text-slate-400 mt-1">Select operational owner for cluster mitigation.</p>
            <select
              value={assignedOwner}
              onChange={(e) => setAssignedOwner(e.target.value)}
              className="mt-3 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
            >
              <option value="Lead Safety Officer">Lead Safety Officer (Supervisor)</option>
              <option value="Zone A Field Lead">Zone A Field Lead</option>
              <option value="Zone B Field Lead">Zone B Field Lead</option>
              <option value="Site Medical Officer">Site Medical Officer</option>
            </select>
            <div className="mt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => setAssignModalId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAssign(assignModalId, assignedOwner);
                  setAssignModalId(null);
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-xs"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
