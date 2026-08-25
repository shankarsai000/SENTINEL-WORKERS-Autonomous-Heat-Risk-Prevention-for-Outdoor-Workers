import React, { useState } from 'react';
import { Action, EscalationDecision } from '../types';

interface ActionCenterProps {
  actions: Action[];
  escalations: EscalationDecision[];
  onAcknowledge: (actionId: string, actorType?: 'WORKER' | 'SUPERVISOR') => void;
  onOverride: (actionId: string, reason: string) => void;
  onAckEscalation?: (escalationId: string) => void;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
  actions,
  escalations,
  onAcknowledge,
  onOverride,
  onAckEscalation,
}) => {
  const [selectedActionForOverride, setSelectedActionForOverride] = useState<Action | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [filter, setFilter] = useState<'ALL' | 'ACK_PENDING' | 'ESCALATED' | 'COMPLETED'>('ALL');

  const filteredActions = actions.filter((act) => {
    if (filter === 'ACK_PENDING') return act.status === 'ACK_PENDING';
    if (filter === 'ESCALATED') return act.status === 'ESCALATED';
    if (filter === 'COMPLETED') return act.status === 'COMPLETED' || act.outcome === 'ACKNOWLEDGED';
    return true;
  });

  const activeAckPendingCount = actions.filter((a) => a.status === 'ACK_PENDING').length;
  const activeEscalationsCount = escalations.filter((e) => e.status === 'TRIGGERED' || e.status === 'PENDING').length;

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionForOverride || !overrideReason.trim()) return;
    onOverride(selectedActionForOverride.action_id, overrideReason.trim());
    setSelectedActionForOverride(null);
    setOverrideReason('');
  };

  const getStatusBadge = (status?: string, outcome?: string) => {
    if (status === 'ACK_PENDING') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">ACK PENDING</span>;
    }
    if (status === 'ESCALATED' || outcome === 'ESCALATED') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-bounce">ESCALATED</span>;
    }
    if (status === 'COMPLETED' || outcome === 'ACKNOWLEDGED') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">COMPLETED (ACKED)</span>;
    }
    if (status === 'OVERRIDDEN' || outcome === 'OVERRIDDEN') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">OVERRIDDEN</span>;
    }
    if (status === 'DELIVERY_FAILED') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-500/20 text-red-400 border border-red-500/40">DELIVERY FAILED</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/40">DELIVERED</span>;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'border-rose-500 bg-rose-950/30 text-rose-300';
      case 'CRITICAL': return 'border-orange-500 bg-orange-950/30 text-orange-300';
      case 'HIGH': return 'border-amber-500 bg-amber-950/30 text-amber-300';
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-950/30 text-yellow-300';
      default: return 'border-slate-700 bg-slate-900/40 text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">Autonomous Action & Intervention Center</h2>
            <p className="text-xs text-slate-400">Safety-constrained DECIDE → ACT → VERIFY intervention loop</p>
          </div>
        </div>

        {/* Counter Pills & Filters */}
        <div className="flex items-center space-x-2">
          {activeAckPendingCount > 0 && (
            <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
              {activeAckPendingCount} Awaiting Ack
            </span>
          )}
          {activeEscalationsCount > 0 && (
            <span className="px-2.5 py-1 text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full animate-pulse">
              {activeEscalationsCount} Escalations
            </span>
          )}

          <div className="bg-slate-800/80 p-0.5 rounded-lg flex space-x-1 text-xs">
            {(['ALL', 'ACK_PENDING', 'ESCALATED', 'COMPLETED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filter === f ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Escalation Alerts Bar */}
      {escalations.length > 0 && (
        <div className="mt-3 space-y-2">
          {escalations.slice(0, 2).map((esc) => (
            <div
              key={esc.escalation_id}
              className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-lg flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-2 text-rose-300">
                <span className="font-bold text-rose-400">🚨 SUPERVISOR ESCALATION:</span>
                <span>Worker {esc.worker_id || 'Unknown'} unacknowledged action exceeded safety deadline.</span>
              </div>
              {esc.status === 'TRIGGERED' && onAckEscalation && (
                <button
                  onClick={() => onAckEscalation(esc.escalation_id)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded text-xs transition"
                >
                  Acknowledge Incident
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Stream Cards */}
      <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
        {filteredActions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No active actions matching the current filter.
          </div>
        ) : (
          filteredActions.map((action) => (
            <div
              key={action.action_id}
              className={`p-3.5 rounded-lg border transition duration-150 ${getPriorityColor(action.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">
                      {action.action_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {action.worker_id || 'Site-Wide'}
                    </span>
                    {getStatusBadge(action.status, action.outcome)}
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                      SIMULATED DELIVERY
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                    {action.message}
                  </p>
                </div>

                {/* Timestamps and ETA */}
                <div className="text-right text-[11px] text-slate-400 whitespace-nowrap ml-4">
                  <div>Issued: {new Date(action.issued_at).toLocaleTimeString()}</div>
                  {action.ack_deadline && action.status === 'ACK_PENDING' && (
                    <div className="text-amber-400 font-mono mt-0.5">
                      Deadline: {new Date(action.ack_deadline).toLocaleTimeString()}
                    </div>
                  )}
                  {action.acknowledged_at && (
                    <div className="text-emerald-400 mt-0.5">
                      Acked: {new Date(action.acknowledged_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Controls & Audit Footprint */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                  <span>Policy: <code className="text-slate-300 font-mono">{action.policy_version}</code></span>
                  {action.recommended_rest_minutes && action.recommended_rest_minutes > 0 ? (
                    <span>• Rest: <strong className="text-amber-300">{action.recommended_rest_minutes}m</strong></span>
                  ) : null}
                  {action.idempotency_key && (
                    <span className="hidden md:inline">• Key: <code className="text-slate-500 font-mono">{action.idempotency_key.substring(0, 10)}...</code></span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {action.status === 'ACK_PENDING' && (
                    <>
                      <button
                        onClick={() => onAcknowledge(action.action_id, 'WORKER')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs transition shadow-sm"
                        title="Simulate worker sending reply SMS acknowledgment"
                      >
                        ✓ Simulate Worker Ack
                      </button>
                      <button
                        onClick={() => setSelectedActionForOverride(action)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded text-xs border border-slate-600 transition"
                      >
                        Override...
                      </button>
                    </>
                  )}

                  {action.status === 'ESCALATED' && (
                    <button
                      onClick={() => onAcknowledge(action.action_id, 'SUPERVISOR')}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded text-xs transition shadow-sm"
                    >
                      Supervisor Resolve Ack
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Override Justification Modal */}
      {selectedActionForOverride && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Supervisor Action Override</h3>
              <button
                onClick={() => setSelectedActionForOverride(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Overriding action <strong>{selectedActionForOverride.action_type}</strong> for worker{' '}
              <strong>{selectedActionForOverride.worker_id}</strong> requires an audited justification.
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Mandatory Override Justification Reason:
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Worker has already completed recovery break in shaded trailer; resuming low-intensity task."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedActionForOverride(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded text-xs transition"
                >
                  Confirm & Audit Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
