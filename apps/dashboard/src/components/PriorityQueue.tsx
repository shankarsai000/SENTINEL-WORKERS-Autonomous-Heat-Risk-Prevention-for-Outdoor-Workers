import React from 'react';
import { AlertTriangle, UserCheck, ShieldAlert, ArrowUpRight } from 'lucide-react';
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

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <ShieldAlert size={18} color="#f97316" />
          Supervisor Priority Attention Queue
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
          TOP 10 ACTIONABLE
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
                <th>Site Location</th>
                <th>Role</th>
                <th>Intensity</th>
                <th>Exposure</th>
                <th>Score</th>
                <th>Status</th>
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
                  <td>{worker.worker_metadata?.role || 'Laborer'}</td>
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
                    {Math.floor(worker.exposure_duration_mins / 60)}h {worker.exposure_duration_mins % 60}m
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                    {worker.score.toFixed(2)}
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
