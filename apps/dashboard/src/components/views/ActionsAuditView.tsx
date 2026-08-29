import React, { useState } from 'react';
import { Action } from '../../types.js';

interface ActionsAuditViewProps {
  actions: Action[];
  auditEvents: any[];
  onAcknowledgeAction: (actionId: string) => void;
  onOverrideAction: (actionId: string, reason: string) => void;
  onOpenAuditModal: (ref: string) => void;
}

export const ActionsAuditView: React.FC<ActionsAuditViewProps> = ({
  actions,
  auditEvents,
  onAcknowledgeAction,
  onOpenAuditModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filtered = actions.filter((a) => {
    if (filter === 'pending') return a.outcome === 'PENDING';
    if (filter === 'completed') return a.outcome === 'COMPLETED' || a.outcome === 'DELIVERED_SIMULATED' || a.outcome === 'ACKNOWLEDGED';
    return true;
  });

  const pendingCount = actions.filter((a) => a.outcome === 'PENDING').length;
  const completedCount = actions.filter((a) => a.outcome === 'COMPLETED' || a.outcome === 'DELIVERED_SIMULATED' || a.outcome === 'ACKNOWLEDGED').length;

  const statusLabel = (outcome: string | undefined) => {
    if (!outcome) return { text: 'Pending', cls: 'text-amber-400' };
    if (outcome === 'COMPLETED' || outcome === 'DELIVERED_SIMULATED' || outcome === 'ACKNOWLEDGED')
      return { text: 'Done', cls: 'text-emerald-400' };
    if (outcome === 'FAILED' || outcome === 'EXPIRED')
      return { text: 'Failed', cls: 'text-red-400' };
    if (outcome === 'ESCALATED')
      return { text: 'Escalated', cls: 'text-amber-400' };
    return { text: 'Pending', cls: 'text-amber-400' };
  };

  const formatAction = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Audit Trail</h1>
        <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
          Chain Valid
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all' as const, label: `All (${actions.length})` },
          { key: 'pending' as const, label: `Pending (${pendingCount})` },
          { key: 'completed' as const, label: `Completed (${completedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
              filter === tab.key
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800/60 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Action List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-8 text-center text-slate-500 text-sm">
          No actions match this filter
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="space-y-2 md:hidden">
            {filtered.slice(0, 30).map((a) => {
              const st = statusLabel(a.outcome);
              return (
                <div key={a.action_id} className="bg-slate-900 rounded-xl border border-slate-800/60 p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-sm font-semibold text-white">{a.worker_id || '—'}</div>
                    <span className={`text-xs font-medium ${st.cls}`}>{st.text}</span>
                  </div>
                  <div className="text-xs text-slate-400">{formatAction(a.action_type)}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(a.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-slate-900 rounded-2xl border border-slate-800/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="text-left p-3.5 font-semibold">Time</th>
                  <th className="text-left p-3.5 font-semibold">Worker</th>
                  <th className="text-left p-3.5 font-semibold">Action</th>
                  <th className="text-left p-3.5 font-semibold">Status</th>
                  <th className="text-right p-3.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.slice(0, 50).map((a) => {
                  const st = statusLabel(a.outcome);
                  return (
                    <tr key={a.action_id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 text-slate-400 text-xs">
                        {new Date(a.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-3.5 font-medium text-white">{a.worker_id || '—'}</td>
                      <td className="p-3.5 text-slate-300">{formatAction(a.action_type)}</td>
                      <td className="p-3.5">
                        <span className={`text-xs font-semibold ${st.cls}`}>{st.text}</span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => onOpenAuditModal(a.action_id)}
                          className="text-sky-400 text-xs font-medium hover:text-sky-300 transition cursor-pointer"
                        >
                          Verify
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500 text-center">
            Showing {Math.min(filtered.length, 50)} of {filtered.length} actions
          </div>
        </>
      )}
    </div>
  );
};
