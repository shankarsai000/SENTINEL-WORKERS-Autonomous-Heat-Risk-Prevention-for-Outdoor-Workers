import React, { useState } from 'react';
import { Play, Pause, Square, FastForward, StepForward, RefreshCw } from 'lucide-react';
import { SimulationState } from '../types.js';

interface SimulationControlsProps {
  state: SimulationState | null;
  onRefresh: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({ state, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const isRunning = state?.running ?? false;
  const currentSpeed = state?.speed_multiplier ?? 1;

  const handleStart = async () => {
    setLoading(true);
    try {
      await fetch('/api/simulation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed: currentSpeed }),
      });
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      await fetch('/api/simulation/pause', { method: 'POST' });
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await fetch('/api/simulation/stop', { method: 'POST' });
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleStep = async () => {
    setLoading(true);
    try {
      await fetch('/api/simulation/step', { method: 'POST' });
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleSetSpeed = async (speed: number) => {
    try {
      await fetch('/api/simulation/speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed }),
      });
      onRefresh();
    } catch (e) {}
  };

  return (
    <div className="control-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'JetBrains Mono' }}>
          Simulation Engine
        </span>
        <div className="btn-group">
          {!isRunning ? (
            <button className="btn btn-primary" onClick={handleStart} disabled={loading}>
              <Play size={14} fill="currentColor" /> Play Scenario
            </button>
          ) : (
            <button className="btn" onClick={handlePause} disabled={loading}>
              <Pause size={14} /> Pause
            </button>
          )}

          <button className="btn" onClick={handleStep} disabled={isRunning || loading}>
            <StepForward size={14} /> Step (15m)
          </button>

          <button className="btn btn-danger" onClick={handleStop} disabled={loading}>
            <Square size={14} fill="currentColor" /> Reset
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>SPEED:</span>
          <div className="speed-selector">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                className={`speed-btn ${currentSpeed === s ? 'active' : ''}`}
                onClick={() => handleSetSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
          <span>TICK: {state?.current_tick ?? 0} / {state?.total_ticks ?? 48}</span>
          <div style={{ width: 80, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(((state?.current_tick ?? 0) + 1) / (state?.total_ticks ?? 48)) * 100}%`,
                height: '100%',
                background: '#f97316',
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
