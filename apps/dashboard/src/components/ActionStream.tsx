import React from 'react';
import { Activity, Bell, CheckCircle, AlertOctagon, Check } from 'lucide-react';
import { Action, Incident } from '../types.js';

interface ActionStreamProps {
  actions: Action[];
  incidents: Incident[];
  onAcknowledgeAction: (actionId: string) => void;
}

export const ActionStream: React.FC<ActionStreamProps> = ({
  actions,
  incidents,
  onAcknowledgeAction,
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <Activity size={18} color="#f59e0b" />
          Autonomous Action & Incident Stream
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
          REALTIME DISPATCH
        </span>
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
                    {inc.workers_affected.length} WORKERS
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
            actions.slice(0, 20).map((action) => {
              const isCritical = action.action_type === 'STOP_WORK' || action.action_type === 'EMERGENCY_ESCALATION';
              const isAcked = action.outcome === 'ACKNOWLEDGED';

              return (
                <div key={action.action_id} className={`action-item ${isCritical ? 'critical' : ''}`}>
                  <div className="action-item-header">
                    <span style={{ fontWeight: 600, color: isCritical ? '#ef4444' : '#38bdf8', fontFamily: 'JetBrains Mono' }}>
                      {action.action_type}
                    </span>
                    <span className="action-time">
                      {new Date(action.issued_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="action-msg">
                    {action.message}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                      {action.worker_id ? `Target: ${action.worker_id}` : `Site: ${action.site_id}`} • {action.actor}
                    </span>

                    {!isAcked ? (
                      <button
                        className="btn"
                        style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                        onClick={() => onAcknowledgeAction(action.action_id)}
                      >
                        <Check size={10} /> Ack
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CheckCircle size={10} /> Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
