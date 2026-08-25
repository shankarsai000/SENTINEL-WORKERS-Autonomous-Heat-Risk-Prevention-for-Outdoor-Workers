import React, { useState } from 'react';
import { X, Check, XCircle, Clock, User, Shield, Activity, Database, AlertTriangle } from 'lucide-react';
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

  const getScoreColor = (val?: number) => {
    if (val === undefined) return '#94a3b8';
    if (val >= 0.7) return '#f97316';
    if (val >= 0.5) return '#facc15';
    return '#10b981';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={18} color="#f97316" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              WORKER CONTEXT & AUDIT: {worker.worker_id}
            </h3>
          </div>
          <button className="btn" style={{ padding: 4 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Top Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090e18', padding: 12, borderRadius: 8, border: '1px solid #1e293b' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ASSIGNED LOCATION</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{worker.site_id}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Policy: {worker.policy_id || 'demo-construction-v1'} (v{worker.policy_version || '1.0.0'})</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CONTEXTUAL RISK SCORE</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: worker.score >= 0.85 ? '#ef4444' : worker.score >= 0.7 ? '#f97316' : '#10b981' }}>
                {worker.score.toFixed(2)} ({worker.level})
              </div>
              <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'JetBrains Mono' }}>
                Confidence: {Math.round(worker.confidence * 100)}%
              </div>
            </div>
          </div>

          {/* Structured Explanation Summary */}
          {worker.explanation && (
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: 10, borderRadius: 6, fontSize: '0.8rem', color: '#e0f2fe' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="#38bdf8" /> Explainable Risk Assessment
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#bae6fd' }}>{worker.explanation.summary}</p>
            </div>
          )}

          {/* 6-Factor Component Score Breakdown */}
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'JetBrains Mono' }}>
              Contextual Score Component Breakdown (0.0 - 1.0)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
              <div style={{ background: '#0c1220', padding: 8, borderRadius: 6, border: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>ENVIRONMENT</span>
                <strong style={{ fontFamily: 'JetBrains Mono', color: getScoreColor(worker.environment_score) }}>
                  {worker.environment_score !== undefined ? worker.environment_score.toFixed(2) : '0.40'}
                </strong>
              </div>

              <div style={{ background: '#0c1220', padding: 8, borderRadius: 6, border: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>EXPOSURE (ACTIVE)</span>
                <strong style={{ fontFamily: 'JetBrains Mono', color: getScoreColor(worker.exposure_score) }}>
                  {worker.exposure_score !== undefined ? worker.exposure_score.toFixed(2) : '0.35'}
                </strong>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>
                  {Math.floor(worker.exposure_duration_mins / 60)}h {worker.exposure_duration_mins % 60}m
                </span>
              </div>

              <div style={{ background: '#0c1220', padding: 8, borderRadius: 6, border: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>TASK INTENSITY</span>
                <strong style={{ fontFamily: 'JetBrains Mono', color: getScoreColor(worker.task_score) }}>
                  {worker.task_score !== undefined ? worker.task_score.toFixed(2) : '0.50'}
                </strong>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>
                  {worker.worker_metadata?.task_intensity || 'MODERATE'}
                </span>
              </div>

              <div style={{ background: '#0c1220', padding: 8, borderRadius: 6, border: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>ZONE CLUSTER</span>
                <strong style={{ fontFamily: 'JetBrains Mono', color: getScoreColor(worker.zone_score) }}>
                  {worker.zone_score !== undefined ? worker.zone_score.toFixed(2) : '0.10'}
                </strong>
              </div>

              <div style={{ background: '#0c1220', padding: 8, borderRadius: 6, border: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>WORKER MODIFIER</span>
                <strong style={{ fontFamily: 'JetBrains Mono', color: getScoreColor(worker.worker_modifier_score) }}>
                  {worker.worker_modifier_score !== undefined ? worker.worker_modifier_score.toFixed(2) : '0.10'}
                </strong>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>
                  {worker.worker_metadata?.risk_modifier || 'baseline'} (synthetic)
                </span>
              </div>

              <div style={{ background: '#0c1220', padding: 8, borderRadius: 6, border: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>RECOVERY MITIGATION</span>
                <strong style={{ fontFamily: 'JetBrains Mono', color: '#10b981' }}>
                  {worker.recovery_score !== undefined ? `-${worker.recovery_score.toFixed(2)}` : '0.00'}
                </strong>
              </div>
            </div>
          </div>

          {/* Explainable Reasons List */}
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'JetBrains Mono' }}>
              Contributing Factor Evidence
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {worker.explanation?.reasons?.map((r, idx) => (
                <div key={idx} style={{ background: '#0c1220', padding: '6px 10px', borderRadius: 4, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#cbd5e1' }}>{r.message}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 4px', borderRadius: 3 }}>
                    {r.code}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Guardrail Flags */}
          {worker.guardrail_flags && worker.guardrail_flags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#f97316' }}>
              <Shield size={14} />
              <span>Active Guardrails: {worker.guardrail_flags.join(', ')}</span>
            </div>
          )}

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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
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
