import React, { useState } from 'react';
import { X, ShieldAlert, Check, XCircle, AlertTriangle, Clock, User } from 'lucide-react';
import { RiskState } from '../types.js';

interface WorkerModalProps {
  worker: RiskState | null;
  onClose: () => void;
  onAcknowledge: (workerId: string) => void;
  onOverride: (workerId: string, reason: string) => void;
}

export const WorkerModal: React.FC<WorkerModalProps> = ({
  worker,
  onClose,
  onAcknowledge,
  onOverride,
}) => {
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  if (!worker) return null;

  const handleOverrideSubmit = () => {
    if (!overrideReason.trim()) return;
    onOverride(worker.worker_id, overrideReason);
    setShowOverrideInput(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={18} color="#f97316" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              WORKER PROFILE: {worker.worker_id}
            </h3>
          </div>
          <button className="btn" style={{ padding: 4 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090e18', padding: 12, borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ASSIGNED LOCATION</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{worker.site_id}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CALCULATED RISK</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: worker.score >= 0.85 ? '#ef4444' : worker.score >= 0.7 ? '#f97316' : '#10b981' }}>
                {worker.score.toFixed(2)} ({worker.level})
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: '0.8rem' }}>
            <div style={{ background: '#0c1220', padding: 10, borderRadius: 6 }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>ROLE & INTENSITY</span>
              <strong>{worker.worker_metadata?.role || 'Laborer'}</strong> • {worker.worker_metadata?.task_intensity || 'HEAVY'}
            </div>

            <div style={{ background: '#0c1220', padding: 10, borderRadius: 6 }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>EXPOSURE DURATION</span>
              <strong>{Math.floor(worker.exposure_duration_mins / 60)}h {worker.exposure_duration_mins % 60}m</strong>
            </div>

            <div style={{ background: '#0c1220', padding: 10, borderRadius: 6 }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>RISK MODIFIER (SYNTHETIC)</span>
              <strong>{worker.worker_metadata?.risk_modifier || 'baseline'}</strong>
            </div>

            <div style={{ background: '#0c1220', padding: 10, borderRadius: 6 }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>DECISION CONFIDENCE</span>
              <strong>{(worker.confidence * 100).toFixed(0)}%</strong>
            </div>
          </div>

          {worker.forecast_breach_time && (
            <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', padding: 10, borderRadius: 6, fontSize: '0.78rem', color: '#fed7aa' }}>
              <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
              <strong>Predicted Breach:</strong> Likely to reach critical threshold in ~28 mins under current trajectory.
            </div>
          )}

          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'JetBrains Mono' }}>
              Explainable Reason Codes
            </span>
            <div style={{ marginTop: 6 }}>
              {worker.reason_codes.map((rc, idx) => (
                <span key={idx} className="reason-tag">
                  {rc}
                </span>
              ))}
            </div>
          </div>

          {showOverrideInput && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Supervisor Override Justification:</label>
              <input
                type="text"
                placeholder="e.g. Worker rotated to climate-controlled vehicle cab"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                style={{
                  background: '#090e18',
                  border: '1px solid #334155',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
            {!showOverrideInput ? (
              <>
                <button className="btn" onClick={() => setShowOverrideInput(true)}>
                  <XCircle size={14} /> Override
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onAcknowledge(worker.worker_id);
                    onClose();
                  }}
                >
                  <Check size={14} /> Acknowledge Action
                </button>
              </>
            ) : (
              <>
                <button className="btn" onClick={() => setShowOverrideInput(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleOverrideSubmit}>
                  Confirm Override
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
