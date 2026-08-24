import React from 'react';
import { RiskState } from '../types.js';

interface RiskSummaryBarProps {
  riskStates: RiskState[];
  totalWorkers: number;
}

export const RiskSummaryBar: React.FC<RiskSummaryBarProps> = ({ riskStates, totalWorkers }) => {
  const counts = {
    GREEN: 0,
    WATCH: 0,
    ELEVATED: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const r of riskStates) {
    if (counts[r.level] !== undefined) {
      counts[r.level]++;
    }
  }

  // If no risk states calculated yet, default all to green
  const evaluatedCount = riskStates.length;
  if (evaluatedCount === 0) {
    counts.GREEN = totalWorkers;
  }

  const effectiveTotal = evaluatedCount > 0 ? evaluatedCount : totalWorkers;

  return (
    <div className="metrics-row">
      <div className="metric-card metric-green">
        <div className="metric-title">
          <span>GREEN (Normal)</span>
          <span>{Math.round((counts.GREEN / effectiveTotal) * 100)}%</span>
        </div>
        <div className="metric-val" style={{ color: 'var(--risk-green)' }}>
          {counts.GREEN}
        </div>
      </div>

      <div className="metric-card metric-watch">
        <div className="metric-title">
          <span>WATCH (Hydration)</span>
          <span>{Math.round((counts.WATCH / effectiveTotal) * 100)}%</span>
        </div>
        <div className="metric-val" style={{ color: 'var(--risk-watch)' }}>
          {counts.WATCH}
        </div>
      </div>

      <div className="metric-card metric-elevated">
        <div className="metric-title">
          <span>ELEVATED (Shade Break)</span>
          <span>{Math.round((counts.ELEVATED / effectiveTotal) * 100)}%</span>
        </div>
        <div className="metric-val" style={{ color: 'var(--risk-elevated)' }}>
          {counts.ELEVATED}
        </div>
      </div>

      <div className="metric-card metric-high">
        <div className="metric-title">
          <span>HIGH (Rest Required)</span>
          <span>{Math.round((counts.HIGH / effectiveTotal) * 100)}%</span>
        </div>
        <div className="metric-val" style={{ color: 'var(--risk-high)' }}>
          {counts.HIGH}
        </div>
      </div>

      <div className="metric-card metric-critical">
        <div className="metric-title">
          <span>CRITICAL (Work Halt)</span>
          <span>{Math.round((counts.CRITICAL / effectiveTotal) * 100)}%</span>
        </div>
        <div className="metric-val" style={{ color: 'var(--risk-critical)' }}>
          {counts.CRITICAL}
        </div>
      </div>
    </div>
  );
};
