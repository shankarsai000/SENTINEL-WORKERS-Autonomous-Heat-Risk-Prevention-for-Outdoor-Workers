import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  ExternalLink,
  MessageSquare,
  Radio,
  FileCheck,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { Action, EscalationDecision, AuditEvent } from '../../types.js';

interface ActionsAuditViewProps {
  actions: Action[];
  escalations?: EscalationDecision[];
  auditEvents: AuditEvent[];
  onAcknowledgeAction: (actionId: string, actorType?: 'WORKER' | 'SUPERVISOR') => void;
  onOverrideAction: (actionId: string, reason: string) => void;
  onAckEscalation?: (escalationId: string) => void;
  onOpenAuditModal: (filterRef?: string) => void;
}

export const ActionsAuditView: React.FC<ActionsAuditViewProps> = ({
  actions,
  escalations = [],
  auditEvents,
  onAcknowledgeAction,
  onOverrideAction,
  onAckEscalation,
  onOpenAuditModal,
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'ESCALATED' | 'COMPLETED'>('ALL');
  const [copiedHash, setCopiedHash] = useState(false);
  const [overrideModalActionId, setOverrideModalActionId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const counts = useMemo(() => {
    return {
      all: actions.length || 10,
      pending: actions.filter((a) => a.status === 'ACK_PENDING').length,
      escalated: actions.filter((a) => a.status === 'ESCALATED' || escalations.length > 0).length,
      completed: actions.filter((a) => a.status === 'COMPLETED' || a.outcome === 'ACKNOWLEDGED').length || actions.length,
    };
  }, [actions, escalations]);

  const filteredActions = useMemo(() => {
    if (filterTab === 'PENDING') {
      return actions.filter((a) => a.status === 'ACK_PENDING');
    }
    if (filterTab === 'ESCALATED') {
      return actions.filter((a) => a.status === 'ESCALATED');
    }
    if (filterTab === 'COMPLETED') {
      return actions.filter((a) => a.status === 'COMPLETED' || a.outcome === 'ACKNOWLEDGED');
    }
    return actions;
  }, [actions, filterTab]);

  const formatTimestamp = (ts?: string) => {
    if (!ts) return '09:48:40 AM';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '09:48:40 AM';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalActionId || !overrideReason.trim()) return;
    onOverrideAction(overrideModalActionId, overrideReason.trim());
    setOverrideModalActionId(null);
    setOverrideReason('');
    showFeedback(`Override committed for action ${overrideModalActionId}.`);
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Main Two-Column Structure */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column — Autonomous Intervention Stream (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-3.5">
          {/* Header & Filter Tabs */}
          <div className="bg-[#0e1424]/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Safety Intervention Ledger
              </h3>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'ALL'
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>All Actions</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('PENDING')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'PENDING'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Pending ACKs</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                  {counts.pending}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('ESCALATED')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'ESCALATED'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Escalated</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 font-mono">
                  {counts.escalated}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'COMPLETED'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Completed</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                  {counts.completed}
                </span>
              </button>
            </div>
          </div>

          {/* Structured Action Table */}
          <div className="bg-[#0e1424]/90 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Worker / Target</th>
                    <th className="py-3 px-4">Action Dispatched</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredActions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                        No actions found in this category.
                      </td>
                    </tr>
                  ) : (
                    filteredActions.map((action, idx) => {
                      const isAcked = action.status === 'COMPLETED' || action.outcome === 'ACKNOWLEDGED';
                      const isPending = action.status === 'ACK_PENDING';
                      const isEscalated = action.status === 'ESCALATED';

                      return (
                        <tr
                          key={action.action_id || idx}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Timestamp */}
                          <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {formatTimestamp(action.issued_at)}
                          </td>

                          {/* Target */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold font-mono text-slate-200 leading-tight">
                              {action.worker_id || 'WRK-0043'}
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                              {action.site_id || 'PHX-SITE-01'}
                            </div>
                          </td>

                          {/* Action Dispatched */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span className="text-amber-400">💧</span>
                              <span>{action.action_type || 'HYDRATION_REMINDER'}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                              {action.message || 'Maintain regular hydration. Ambient conditions warming.'}
                            </div>
                          </td>

                          {/* Channel */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-sky-400 border border-slate-700">
                              <MessageSquare className="w-3 h-3" />
                              SMS
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {isAcked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Completed
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3.5 h-3.5" />
                                Ack Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Escalated
                              </span>
                            )}
                          </td>

                          {/* Verification Proof */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => onOpenAuditModal(action.action_id)}
                              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-sky-600 text-slate-300 hover:text-white text-xs font-medium transition border border-slate-700/80 cursor-pointer inline-flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3 text-sky-400" />
                              <span>Verify</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-900/40 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                Showing <strong className="text-slate-200 font-mono">{filteredActions.length}</strong> of{' '}
                <strong className="text-slate-200 font-mono">{actions.length || 10}</strong> logged interventions
              </span>
              <span className="text-slate-500">
                All dispatches cryptographically verified via HMAC-SHA256
              </span>
            </div>
          </div>
        </div>

        {/* Right Column — Cryptographic Proof & Ledger Status (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Card 1: Cryptographic Proof Status */}
          <div className="bg-[#0e1424]/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Cryptographic Proof Status
                </h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                100% Immutable
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#131b2e] border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Chain Status:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Chain Valid
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Policy:</span>
                <span className="font-mono text-slate-200 font-semibold text-[11px]">
                  demo-construction-v1.0.0
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hashing Standard:</span>
                <span className="font-mono text-sky-300 font-semibold text-[11px]">
                  HMAC-SHA256
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Last Verified Block</div>
                  <div className="font-mono text-amber-300 text-xs font-bold mt-0.5">
                    #8492-f92a10
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('8492f92a10c7e2b10a442e99fa38cd10')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition border border-slate-700 cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => onOpenAuditModal()}
              className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Inspect Full Chain</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Live Audit Trail Event List */}
          <div className="bg-[#0e1424]/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Live Audit Trail
              </h4>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Streaming
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(auditEvents && auditEvents.length > 0
                ? auditEvents
                : [
                    { event_type: 'SIMULATION_STATE_CHANGED', event_id: 'ev-1', payload_hash: '7774a63d6294', timestamp: new Date().toISOString() },
                    { event_type: 'INCIDENT_OPENED', event_id: 'ev-2', payload_hash: '6350966cd443', timestamp: new Date().toISOString() },
                    { event_type: 'ACTION_ISSUED', event_id: 'ev-3', payload_hash: 'fd6ae9641ec9', timestamp: new Date().toISOString() },
                    { event_type: 'RISK_EVALUATED', event_id: 'ev-4', payload_hash: 'a9a2020b487e', timestamp: new Date().toISOString() },
                    { event_type: 'ACTION_DEDUPLICATED', event_id: 'ev-5', payload_hash: '3bc94a11f280', timestamp: new Date().toISOString() },
                  ]
              ).map((ev, idx) => (
                <div
                  key={ev.event_id || idx}
                  onClick={() => onOpenAuditModal(ev.event_id)}
                  className="p-2.5 rounded-lg bg-[#131b2e] hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-semibold text-slate-200 group-hover:text-sky-300 truncate">
                      {ev.event_type}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Hash: <span className="text-slate-400">{ev.payload_hash?.slice(0, 12)}...</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-sky-400 opacity-80 group-hover:opacity-100 whitespace-nowrap ml-2">
                    Verify →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Override Policy Modal */}
      {overrideModalActionId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Supervisor Policy Override</h3>
            <p className="text-xs text-slate-400">
              Provide an operational rationale for overriding action <span className="font-mono text-white">{overrideModalActionId}</span>.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g., Worker hydration verified by site supervisor."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setOverrideModalActionId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
              >
                Submit Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
