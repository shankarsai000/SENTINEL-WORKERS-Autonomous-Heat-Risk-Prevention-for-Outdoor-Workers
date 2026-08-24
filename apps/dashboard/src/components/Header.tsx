import React from 'react';
import { Flame, Activity, ShieldCheck, Clock, Wifi, WifiOff } from 'lucide-react';
import { SimulationState } from '../types.js';

interface HeaderProps {
  isConnected: boolean;
  simulationState: SimulationState | null;
  totalWorkers: number;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  simulationState,
  totalWorkers,
}) => {
  return (
    <header className="ops-header">
      <div className="ops-logo">
        <div className="ops-logo-icon">
          <Flame size={20} />
        </div>
        <div className="ops-logo-text">
          <h1>
            SENTINEL WORKERS
            <span className="badge badge-watch">PHASE P0 FOUNDATION</span>
          </h1>
          <p>Autonomous Heat-Risk Prevention & Environmental Intelligence</p>
        </div>
      </div>

      <div className="ops-telemetry">
        <div className="telemetry-item">
          <span className="telemetry-label">Active Scenario</span>
          <span className="telemetry-value">Phoenix Summer Heatwave</span>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">Simulated Time</span>
          <span className="telemetry-value" style={{ color: '#38bdf8' }}>
            <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
            {simulationState?.simulated_time || '06:00'} MST
          </span>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">Ambient Baseline</span>
          <span className="telemetry-value" style={{ color: '#f97316' }}>
            {simulationState?.current_temp_c ? `${simulationState.current_temp_c.toFixed(1)}°C` : '31.2°C'} / {simulationState?.current_humidity_pct ? `${simulationState.current_humidity_pct.toFixed(0)}%` : '42%'} RH
          </span>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">Monitored Fleet</span>
          <span className="telemetry-value">{totalWorkers} Workers</span>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">Stream Link</span>
          <span className="telemetry-value">
            {isConnected ? (
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="live-indicator"></span> WS ONLINE
              </span>
            ) : (
              <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <WifiOff size={14} /> RECONNECTING
              </span>
            )}
          </span>
        </div>
      </div>
    </header>
  );
};
