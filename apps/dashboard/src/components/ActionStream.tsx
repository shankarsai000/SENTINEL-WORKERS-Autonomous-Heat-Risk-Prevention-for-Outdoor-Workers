import React, { useState } from 'react';
import { Activity, CheckCircle, AlertOctagon, Check, ShieldAlert, Clock, AlertTriangle } from 'lucide-react';
import { Action, Incident } from '../types.js';

interface ActionStreamProps {
  actions: Action[];
  incidents: Incident[];
  onAcknowledgeAction: (actionId: string, actorType?: 'WORKER' | 'SUPERVISOR') => void;
  onOverrideAction?: (actionId: string, reason: string) => void;
}

export const ActionStream: React.FC<ActionStreamProps> = ({
  actions,
  incidents,
  onAcknowledgeAction,
  onOverrideAction,
}) => {
  const [selectedActionForOverride, setSelectedActionForOverride] = useState<Action | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionForOverride || !overrideReason.trim()) return;
    if (onOverrideAction) {
      onOverrideAction(selectedActionForOverride.action_id, overrideReason.trim());
    }
    setSelectedActionForOverride(null);
    setOverrideReason('');
  };

  const getStatusBadge = (action: Action) => {
    if (action.status === 'ACK_PENDING') {
      return (
        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', animation: 'pulse 2s infinite' }}>
          ACK PENDING
        </span>
      );
    }
    if (action.status === 'ESCALATED' || action.outcome === 'ESCALATED') {
      return (
        <span className="badge badge-critical" style={{ animation: 'bounce 1s infinite' }}>
          ESCALATED
        </span>
      );
    }
    if (action.status === 'COMPLETED' || action.outcome === 'ACKNOWLEDGED') {
      return (
        <span className="badge badge-safe">
          <CheckCircle size={10} style={{ display: 'inline', marginRight: 2 }} /> ACKED
        </span>
      );
    }
    if (action.status === 'OVERRIDDEN' || action.outcome === 'OVERRIDDEN') {
      return (
        <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
          OVERRIDDEN
        </span>
      );
    }
    if (action.status === 'DELIVERY_FAILED') {
      return (
        <span className="badge badge-critical">
          DELIVERY FAILED
        </span>
      );
    }
    return (
      <span className="badge badge-watch">
        DELIVERED
      </span>
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <Activity size={18} color="#f59e0b" />
          Autonomous Actions & Intervention Stream
        </h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono' }}>
            SIMULATED DELIVERY
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
            REALTIME
          </span>
        </div>
      </div>

      <div className="card-body">
        {incidents.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, fontFamily: 'JetBrains Mono', marginBottom: 6 }}>
              ACTIVE CLUSTER INCIDENTS ({incidents.length})
            </div>
            {incidents.map((inc) => (
              <div
                key={inc.incident_id}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-critical">INCIDENT: {inc.zone_id}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
                    {inc.affected_worker_count || (inc.workers_affected || inc.worker_ids || []).length} WORKERS
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', marginTop: 6, color: '#f8fafc', lineHeight: 1.35 }}>
                  {inc.summary}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="action-feed">
          {actions.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              No automated interventions dispatched yet.
            </div>
          ) : (
            actions.slice(0, 30).map((action) => {
              const isCritical = action.action_type === 'STOP_WORK' || action.action_type === 'EMERGENCY_PROTECTIVE_ACTION' || action.action_type === 'EMERGENCY_ESCALATION';
              const isAckPending = action.status === 'ACK_PENDING';
              const isEscalated = action.status === 'ESCALATED';

              return (
                <div key={action.action_id} className={`action-item ${isCritical ? 'critical' : ''}`}>
                  <div className="action-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, color: isCritical ? '#ef4444' : '#38bdf8', fontFamily: 'JetBrains Mono' }}>
                        {action.action_type.replace(/_/g, ' ')}
                      </span>
                      {getStatusBadge(action)}
                    </div>
                    <span className="action-time">
                      {new Date(action.issued_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="action-msg">
                    {action.message}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.68rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                      <span>Target: <strong style={{ color: '#cbd5e1' }}>{action.worker_id || action.site_id}</strong></span>
                      {action.ack_deadline && isAckPending && (
                        <span style={{ color: '#f59e0b' }}>
                          <Clock size={10} style={{ display: 'inline', marginRight: 2 }} />
                          Deadline: {new Date(action.ack_deadline).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      {isAckPending && (
                        <>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '2px 8px', fontSize: '0.68rem', background: '#059669', borderColor: '#10b981' }}
                            onClick={() => onAcknowledgeAction(action.action_id, 'WORKER')}
                            title="Simulate worker replying to SMS to confirm rest break"
                          >
                            <Check size={10} /> Simulate Worker Ack
                          </button>
                          {onOverrideAction && (
                            <button
                              className="btn"
                              style={{ padding: '2px 6px', fontSize: '0.68rem', color: '#94a3b8' }}
                              onClick={() => setSelectedActionForOverride(action)}
                            >
                              Override...
                            </button>
                          )}
                        </>
                      )}

                      {isEscalated && (
                        <button
                          className="btn"
                          style={{ padding: '2px 8px', fontSize: '0.68rem', background: '#dc2626', color: '#ffffff' }}
                          onClick={() => onAcknowledgeAction(action.action_id, 'SUPERVISOR')}
                        >
                          <ShieldAlert size={10} /> Supervisor Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Override Modal */}
      {selectedActionForOverride && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 10,
            maxWidth: 440,
            width: '100%',
            padding: 20,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: 600 }}>
                Supervisor Action Override
              </h3>
              <button
                onClick={() => setSelectedActionForOverride(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 14 }}>
              Override action <strong style={{ color: '#38bdf8' }}>{selectedActionForOverride.action_type}</strong> for worker <strong style={{ color: '#f8fafc' }}>{selectedActionForOverride.worker_id}</strong>. A documented justification is required by safety policy.
            </p>

            <form onSubmit={handleOverrideSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, marginBottom: 4 }}>
                  Mandatory Override Justification:
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Worker completed cooling in shaded trailer and reports normal recovery; transitioning to indoor task."
                  style={{
                    width: '100%',
                    padding: 8,
                    background: '#020617',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#f8fafc',
                    fontSize: '0.75rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedActionForOverride(null)}
                  className="btn"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#d97706', color: '#ffffff', fontWeight: 600 }}
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
