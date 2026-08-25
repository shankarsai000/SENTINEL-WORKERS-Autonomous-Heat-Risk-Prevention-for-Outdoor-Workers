import React, { useState } from 'react';
import { Worker, RiskState, PredictiveRiskState, Action, SupervisorRole } from '../types';

interface WorkerDetailInspectorProps {
  worker: Worker | null;
  currentRisk: RiskState | null;
  predictedRisk: PredictiveRiskState | null;
  recentActions: Action[];
  timeline: any[];
  userRole: SupervisorRole;
  onClose: () => void;
  onAcknowledgeAction: (actionId: string) => void;
  onOverrideAction: (actionId: string, reason: string) => void;
  onEscalateAction: (actionId: string, reason: string) => void;
  onOpenAudit: (payloadRef: string) => void;
}

export const WorkerDetailInspector: React.FC<WorkerDetailInspectorProps> = ({
  worker,
  currentRisk,
  predictedRisk,
  recentActions,
  timeline,
  userRole,
  onClose,
  onAcknowledgeAction,
  onOverrideAction,
  onEscalateAction,
  onOpenAudit,
}) => {
  const [overrideModalActionId, setOverrideModalActionId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [escalateModalActionId, setEscalateModalActionId] = useState<string | null>(null);
  const [escalateReason, setEscalateReason] = useState('');

  if (!worker) return null;

  const isReadOnly = userRole === 'VIEWER';

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-orange-950 text-orange-400 border border-orange-800">🟠 HIGH</span>;
      case 'ELEVATED':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-yellow-950 text-yellow-400 border border-yellow-800">🟡 ELEVATED</span>;
      case 'WATCH':
        return <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-blue-950 text-blue-400 border border-blue-800">🔵 WATCH</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">🟢 GREEN</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold font-mono">
            👷
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold font-mono text-slate-100">{worker.worker_id}</h2>
              <span className="text-xs text-slate-400">({worker.role})</span>
            </div>
            <p className="text-xs text-slate-400">Site: {worker.site_id} • Shift: {worker.shift_start} - {worker.shift_end}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          ✕
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Risk & Telemetry Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Risk */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Risk</div>
            <div className="mt-1.5 flex items-center space-x-2">
              {getRiskBadge(currentRisk?.level)}
              <span className="text-sm font-mono font-bold text-slate-100">
                {currentRisk ? Math.round(currentRisk.score * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-400">
              <div>Exposure: <span className="text-slate-200 font-mono">{currentRisk?.exposure_duration_mins || 0}m</span></div>
              <div>Confidence: <span className="text-slate-200 font-mono">{Math.round((currentRisk?.confidence || 0.9) * 100)}%</span></div>
              <div>Freshness: <span className="text-emerald-400 font-mono">{currentRisk?.data_freshness || 'FRESH'}</span></div>
            </div>
          </div>

          {/* Predictive Risk */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Predictive Trajectory</div>
            <div className="mt-1.5 flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 font-mono">
                ↗ {predictedRisk?.predicted_risk_level || 'STABLE'}
              </span>
              {predictedRisk?.early_warning && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
                  EARLY WARNING
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-400">
              <div>P(Elevated 30m): <span className="text-slate-200 font-mono">{Math.round((predictedRisk?.p_elevated_30m || 0) * 100)}%</span></div>
              <div>P(Critical 60m): <span className="text-slate-200 font-mono">{Math.round((predictedRisk?.p_critical_60m || 0) * 100)}%</span></div>
              <div>Threshold ETA: <span className="text-amber-300 font-mono">{predictedRisk?.expected_time_to_threshold_minutes ? `${predictedRisk.expected_time_to_threshold_minutes}m` : 'None'}</span></div>
            </div>
          </div>
        </div>

        {/* Reason Codes */}
        {currentRisk?.reason_codes && currentRisk.reason_codes.length > 0 && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contributing Heat Factors</div>
            <div className="flex flex-wrap gap-1.5">
              {currentRisk.reason_codes.map((code, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-200 border border-slate-700">
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Active Interventions & Action Controls */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Intervention Actions</div>
            <span className="text-xs text-slate-500 font-mono">{recentActions.length} recorded</span>
          </div>

          {recentActions.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">No recent interventions for this worker.</div>
          ) : (
            <div className="space-y-2">
              {recentActions.slice(0, 3).map((act) => (
                <div key={act.action_id} className="p-2.5 bg-slate-900 rounded border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-200">{act.action_type}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                      {act.status}
                    </span>
                  </div>
                  <div className="text-slate-300 mt-1 text-[11px]">{act.message}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Issued: {act.issued_at}</div>

                  {/* Actions Buttons */}
                  {!isReadOnly && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-end space-x-2">
                      {act.status === 'ACK_PENDING' && (
                        <button
                          onClick={() => onAcknowledgeAction(act.action_id)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition"
                        >
                          Ack on Behalf
                        </button>
                      )}
                      {act.status !== 'OVERRIDDEN' && act.status !== 'COMPLETED' && (
                        <button
                          onClick={() => setOverrideModalActionId(act.action_id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-amber-700 text-slate-300 hover:text-white rounded text-[11px] transition"
                        >
                          Override
                        </button>
                      )}
                      {act.status !== 'ESCALATED' && (
                        <button
                          onClick={() => setEscalateModalActionId(act.action_id)}
                          className="px-2 py-1 bg-rose-950 hover:bg-rose-800 text-rose-300 rounded text-[11px] transition"
                        >
                          Escalate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Worker Telemetry Timeline */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telemetry & Audit Timeline</div>
            <button
              onClick={() => onOpenAudit(worker.worker_id)}
              className="text-xs text-sky-400 hover:text-sky-300 underline font-mono"
            >
              Verify Audit Chain ↗
            </button>
          </div>

          <div className="space-y-2 mt-2">
            {timeline.slice(0, 8).map((ev, idx) => (
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

      {/* Override Modal */}
      {overrideModalActionId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Override Action {overrideModalActionId}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Provide mandatory justification for overriding this safety-constrained action.
            </p>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Worker was already relieved and resting in trailer #1..."
              className="mt-3 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-slate-600"
            />
            <div className="mt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => setOverrideModalActionId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!overrideReason.trim()}
                onClick={() => {
                  onOverrideAction(overrideModalActionId, overrideReason);
                  setOverrideModalActionId(null);
                  setOverrideReason('');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded text-xs"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalateModalActionId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Escalate Action {escalateModalActionId}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Provide justification for immediate escalation to site lead.
            </p>
            <textarea
              rows={3}
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="e.g. Worker unresponsive to SMS rest advisory..."
              className="mt-3 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-rose-500 outline-none placeholder:text-slate-600"
            />
            <div className="mt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => setEscalateModalActionId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!escalateReason.trim()}
                onClick={() => {
                  onEscalateAction(escalateModalActionId, escalateReason);
                  setEscalateModalActionId(null);
                  setEscalateReason('');
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded text-xs"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
