import React, { useState } from 'react';
import { X, Check, XCircle, Clock, User, Shield, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { RiskState, PredictiveRiskState } from '../types.js';

interface WorkerModalProps {
  worker: (RiskState & { prediction?: PredictiveRiskState }) | null;
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

  const getBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'ELEVATED': return 'badge-elevated';
      case 'WATCH': return 'badge-watch';
      default: return 'badge-green';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
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
          {/* Dual Current vs Predicted Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {/* CURRENT RISK (P2) */}
            <div style={{ background: '#090e18', padding: 12, borderRadius: 8, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
                CURRENT RISK (P2 CONTEXTUAL)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className={`badge ${getBadgeClass(worker.level)}`} style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                    {worker.level}
                  </span>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                    Score: {worker.score.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>CONFIDENCE</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#38bdf8' }}>
                    {Math.round(worker.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* PREDICTED RISK (P3) */}
            <div style={{ background: '#090e18', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
                PREDICTED RISK (P3 SHORT-HORIZON)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className={`badge ${getBadgeClass(worker.prediction?.predicted_risk_level || worker.level)}`} style={{ fontSize: '0.85rem', padding: '4px 8px', border: '1px dashed #38bdf8' }}>
                    {worker.prediction?.predicted_risk_level || 'EVALUATING'}
                  </span>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                    ETA to Threshold: <strong style={{ color: '#facc15' }}>{worker.prediction?.expected_time_to_threshold_minutes ? `${worker.prediction.expected_time_to_threshold_minutes} min` : 'Stable'}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>P(CRITICAL, 60m)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: worker.prediction?.p_critical_60m && worker.prediction.p_critical_60m >= 0.5 ? '#f97316' : '#94a3b8' }}>
                    {worker.prediction?.p_critical_60m !== null && worker.prediction?.p_critical_60m !== undefined ? `${Math.round(worker.prediction.p_critical_60m * 100)}%` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Early Warning Banner */}
          {worker.prediction?.early_warning && (
            <div style={{ background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.4)', padding: 10, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="#f97316" />
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#fed7aa', display: 'block' }}>Early Warning Deterioration Detected</strong>
                <span style={{ fontSize: '0.75rem', color: '#fdba74' }}>
                  Model projects risk escalation to {worker.prediction.predicted_risk_level} within ~{worker.prediction.expected_time_to_threshold_minutes ?? 30} minutes based on thermal trend and metabolic accumulation.
                </span>
              </div>
            </div>
          )}

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
                  {worker.worker_metadata?.risk_modifier || 'baseline'}
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

          {/* Model Predictive Feature Contributions */}
          {worker.prediction?.feature_contributions && Object.keys(worker.prediction.feature_contributions).length > 0 && (
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'JetBrains Mono' }}>
                Predictive Feature Contributions (Logistic Model)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 6 }}>
                {Object.entries(worker.prediction.feature_contributions).map(([feat, delta]) => (
                  <div key={feat} style={{ background: '#0c1220', padding: '6px 10px', borderRadius: 4, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>{feat.replace(/_/g, ' ')}</span>
                    <strong style={{ fontFamily: 'JetBrains Mono', color: delta > 0 ? '#f97316' : '#10b981' }}>
                      {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

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
