import React from 'react';
import { ShieldAlert, ArrowUpRight, Clock, AlertTriangle } from 'lucide-react';
import { RiskState } from '../types.js';

interface PriorityQueueProps {
  riskStates: RiskState[];
  onSelectWorker: (worker: RiskState) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({ riskStates, onSelectWorker }) => {
  // Sort descending by score and pick top 10
  const topQueue = [...riskStates]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const getBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'ELEVATED': return 'badge-elevated';
      case 'WATCH': return 'badge-watch';
      default: return 'badge-green';
    }
  };

  const getFreshnessBadge = (freshness?: string) => {
    if (freshness === 'STALE') return <span className="badge badge-critical" style={{ fontSize: '0.6rem' }}>STALE</span>;
    if (freshness === 'AGING') return <span className="badge badge-elevated" style={{ fontSize: '0.6rem' }}>AGING</span>;
    return <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>FRESH</span>;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <ShieldAlert size={18} color="#f97316" />
          Supervisor Priority Attention Queue
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
          TOP 10 ACTIONABLE • PREDICTIVE LEAD-TIME ACTIVE
        </span>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {topQueue.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No elevated risk profiles detected yet. Scenario running within safe thermal margins.
          </div>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Worker ID</th>
                <th>Site</th>
                <th>Intensity</th>
                <th>Exposure</th>
                <th>Current Score</th>
                <th>Confidence</th>
                <th>Primary Reasons</th>
                <th>Data</th>
                <th>Current Risk</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {topQueue.map((worker) => (
                <tr key={worker.worker_id} onClick={() => onSelectWorker(worker)}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#f8fafc' }}>
                    {worker.worker_id}
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    {worker.site_id}
                  </td>
                  <td>
                    <span style={{
                      color: worker.worker_metadata?.task_intensity === 'HEAVY' ? '#f97316' : '#94a3b8',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '0.75rem'
                    }}>
                      {worker.worker_metadata?.task_intensity || 'MODERATE'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>
                    <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                    {Math.floor(worker.exposure_duration_mins / 60)}h {worker.exposure_duration_mins % 60}m
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: worker.score >= 0.7 ? '#f97316' : '#f8fafc' }}>
                    {worker.score.toFixed(2)}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#38bdf8' }}>
                    {Math.round(worker.confidence * 100)}%
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {worker.reason_codes.slice(0, 2).map((code) => (
                        <span key={code} style={{
                          fontSize: '0.65rem',
                          fontFamily: 'JetBrains Mono',
                          background: 'rgba(255,255,255,0.06)',
                          padding: '2px 4px',
                          borderRadius: 3,
                          color: '#cbd5e1'
                        }}>
                          {code.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {getFreshnessBadge(worker.data_freshness)}
                  </td>
                  <td>
                    <span className={`badge ${getBadgeClass(worker.level)}`}>
                      {worker.level}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                      Inspect <ArrowUpRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
