import React from 'react';
import { Flame, Clock, Wifi, WifiOff, Globe, Radio } from 'lucide-react';
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
  const fgStatus = simulationState?.fortyguard_status;
  const isFgConfigured = fgStatus?.configured ?? false;
  const mode = simulationState?.thermal_data_mode || 'offline';

  const getFgBadge = () => {
    if (!isFgConfigured) {
      return <span className="badge badge-fg-disabled">FG: OFFLINE READY</span>;
    }
    if (fgStatus && fgStatus.failedCalls > 0 && fgStatus.successfulCalls === 0) {
      return <span className="badge badge-elevated">FG: DEGRADED</span>;
    }
    return <span className="badge badge-fg-connected">FG: CONNECTED</span>;
  };

  const getModeBadge = () => {
    switch (mode) {
      case 'fortyguard':
        return <span className="badge badge-watch">MODE: FORTYGUARD</span>;
      case 'hybrid':
        return <span className="badge badge-elevated">MODE: HYBRID FAILOVER</span>;
      default:
        return <span className="badge badge-green">MODE: OFFLINE REPLAY</span>;
    }
  };

  return (
    <header className="ops-header">
      <div className="ops-logo">
        <div className="ops-logo-icon">
          <Flame size={20} />
        </div>
        <div className="ops-logo-text">
          <h1>
            SENTINEL WORKERS
            <span className="badge badge-watch">PHASE P1 FORTYGUARD</span>
          </h1>
          <p>Autonomous Heat-Risk Prevention & Environmental Intelligence</p>
        </div>
      </div>

      <div className="ops-telemetry">
        <div className="telemetry-item">
          <span className="telemetry-label">Provider Layer</span>
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            {getFgBadge()}
            {getModeBadge()}
          </div>
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
