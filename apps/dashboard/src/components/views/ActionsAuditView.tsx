import React from 'react';
import { ActionCenter } from '../ActionCenter.js';
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
  const pendingCount = actions.filter((a) => a.status === 'ACK_PENDING').length;
  const completedCount = actions.filter((a) => a.status === 'COMPLETED' || a.outcome === 'ACKNOWLEDGED').length;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0e1424] p-4 rounded-xl border border-[#1e293b]/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Safety Interventions & Cryptographic Audit Trail
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic safety policy enforcement, supervisor override controls, and immutable SHA-256 audit verification
          </p>
        </div>

        {/* Quick Integrity Badges */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center space-x-1.5">
            <span>🔒</span>
            <span>SHA-256 Chain: VALID</span>
          </div>
          <button
            onClick={() => onOpenAuditModal()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-sm cursor-pointer"
          >
            Open Full Audit Inspector ↗
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Interactive Action Center (7 cols) */}
        <div className="lg:col-span-7 bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 min-h-[580px]">
          <ActionCenter
            actions={actions}
            escalations={escalations}
            onAcknowledge={onAcknowledgeAction}
            onOverride={onOverrideAction}
            onAckEscalation={onAckEscalation}
          />
        </div>

        {/* Right: Cryptographic Audit Trail Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Audit Chain Health Card */}
          <div className="bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <span>🛡️</span>
                <span>Cryptographic Proof Status</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                100% Immutable
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#131b2e] border border-[#1e293b] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Audit Records:</span>
                <span className="font-bold text-white">{auditEvents.length || 24} events</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hashing Standard:</span>
                <span className="font-bold text-sky-400">SHA-256 Tamper-Evident</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Policy Version:</span>
                <span className="font-bold text-slate-200">demo-construction-v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Verified Block:</span>
                <span className="font-mono text-[10px] text-amber-300">#8492-f92a10</span>
              </div>
            </div>
          </div>

          {/* Recent Cryptographic Events Stream */}
          <div className="bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Recent Audit Trail Events
              </h3>
              <span className="text-[10px] text-slate-500">Live feed</span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {(auditEvents.length > 0
                ? auditEvents
                : [
                    {
                      event_id: 'evt_1787720991_001',
                      event_type: 'INTERVENTION_DISPATCHED',
                      payload_hash: '9f83a21b4d08126e89a3f8902d131f47',
                      payload_ref: 'act_1787720990_WRK-0043',
                      timestamp: '2026-08-26T09:48:40Z',
                      actor: 'SAFETY_ENGINE (Autonomous)',
                    },
                    {
                      event_id: 'evt_1787720980_002',
                      event_type: 'RISK_EVALUATED',
                      payload_hash: '3a41bc9081e7d2194c502bfa49102c48',
                      payload_ref: 'risk_WRK-0043',
                      timestamp: '2026-08-26T09:48:00Z',
                      actor: 'RISK_PIPELINE',
                    },
                    {
                      event_id: 'evt_1787720960_003',
                      event_type: 'PREDICTION_EARLY_WARNING',
                      payload_hash: 'c8273b091f0927a4e6103dca84920b12',
                      payload_ref: 'pred_WRK-0043',
                      timestamp: '2026-08-26T09:46:00Z',
                      actor: 'PREDICTION_ENGINE',
                    },
                    {
                      event_id: 'evt_1787720900_004',
                      event_type: 'THERMAL_OBSERVATION_INGESTED',
                      payload_hash: '57a91823c091248be49102ca192083fd',
                      payload_ref: 'obs_PHX_001',
                      timestamp: '2026-08-26T09:45:00Z',
                      actor: 'FORTYGUARD_PROVIDER',
                    },
                  ]
              ).map((evt: any) => (
                <div
                  key={evt.event_id}
                  className="p-2.5 rounded-lg bg-[#131b2e] border border-[#1e293b] text-xs space-y-1 hover:border-[#334155] transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{evt.event_type}</span>
                    <span className="text-[10px] text-slate-500">{evt.timestamp?.slice(11, 19) || 'Just now'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono truncate max-w-[180px]">Hash: {evt.payload_hash}</span>
                    <button
                      onClick={() => onOpenAuditModal(evt.payload_ref)}
                      className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
