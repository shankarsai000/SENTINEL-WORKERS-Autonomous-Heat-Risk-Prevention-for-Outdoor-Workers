import React, { useState } from 'react';
import { Incident } from '../types';

export interface MapZone {
  zone_id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  base_temp_delta: number;
}

export interface MapCoolingPoint {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  capacity: number;
}

export interface MapWorkerNode {
  worker_id: string;
  role: string;
  zone_id: string;
  x: number;
  y: number;
  current_risk_level: string;
  current_risk_score: number;
  predicted_risk_level: string;
  early_warning: boolean;
  action_status: string;
}

interface RiskMapProps {
  siteName: string;
  zones?: MapZone[];
  coolingPoints?: MapCoolingPoint[];
  workers?: MapWorkerNode[];
  activeIncidents?: Incident[];
  selectedWorkerId: string | null;
  selectedIncidentId: string | null;
  onSelectWorker: (workerId: string) => void;
  onSelectIncident: (incidentId: string) => void;
}

export const RiskMap: React.FC<RiskMapProps> = ({
  siteName,
  zones = [
    { zone_id: 'ZONE-A', name: 'Zone A - Open Excavation', x: 25, y: 30, radius: 20, base_temp_delta: 1.2 },
    { zone_id: 'ZONE-B', name: 'Zone B - Structural Concrete', x: 75, y: 30, radius: 20, base_temp_delta: 0.8 },
    { zone_id: 'ZONE-C', name: 'Zone C - Steel Framing', x: 30, y: 75, radius: 22, base_temp_delta: 1.5 },
    { zone_id: 'ZONE-D', name: 'Zone D - Shaded Staging Area', x: 75, y: 75, radius: 18, base_temp_delta: -2.0 },
  ],
  coolingPoints = [
    { id: 'COOL-1', type: 'AC_TRAILER', name: 'Mobile AC Rest Trailer #1', x: 50, y: 52, capacity: 15 },
    { id: 'COOL-2', type: 'SHADE_STATION', name: 'Misting Shade Tent North', x: 25, y: 22, capacity: 10 },
    { id: 'COOL-3', type: 'SHADE_STATION', name: 'Misting Shade Tent South', x: 75, y: 68, capacity: 10 },
    { id: 'COOL-4', type: 'HYDRATION_STATION', name: 'Electrolyte Refill East', x: 68, y: 32, capacity: 20 },
  ],
  workers = [],
  activeIncidents = [],
  selectedWorkerId,
  selectedIncidentId,
  onSelectWorker,
  onSelectIncident,
}) => {
  const [hoveredNode, setHoveredNode] = useState<MapWorkerNode | null>(null);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#ef4444'; // Red
      case 'HIGH':
        return '#f97316'; // Orange
      case 'ELEVATED':
        return '#eab308'; // Yellow
      case 'WATCH':
        return '#38bdf8'; // Sky Blue
      default:
        return '#10b981'; // Emerald
    }
  };

  const getIncidentSeverityStroke = (severity: string) => {
    if (severity === 'CRITICAL') return 'rgba(239, 68, 68, 0.8)';
    if (severity === 'HIGH') return 'rgba(249, 115, 22, 0.8)';
    return 'rgba(234, 179, 8, 0.8)';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-slate-100">Live Risk Map & Spatial Zones</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              SIMULATED WORKER LOCATIONS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{siteName} • Hyperlocal Microclimate Grid</p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Green</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Watch</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
            <span>Elevated</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>High</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Interactive Map SVG Canvas */}
      <div className="relative flex-1 mt-3 bg-slate-950/80 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center min-h-[380px]">
        <svg viewBox="0 0 100 100" className="w-full h-full p-2 select-none" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="0.5" />
            </pattern>
            {/* Pulsing Filter */}
            <radialGradient id="clusterPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
              <stop offset="70%" stopColor="rgba(239, 68, 68, 0.15)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
            </radialGradient>
          </defs>

          {/* Background Grid */}
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Zones */}
          {zones.map((zone) => (
            <g key={zone.zone_id}>
              <circle
                cx={zone.x}
                cy={zone.y}
                r={zone.radius}
                fill="rgba(30, 41, 59, 0.4)"
                stroke="rgba(71, 85, 105, 0.5)"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
              <text
                x={zone.x}
                y={zone.y - zone.radius + 3.5}
                textAnchor="middle"
                fill="rgba(148, 163, 184, 0.7)"
                fontSize="2.6"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {zone.name}
              </text>
            </g>
          ))}

          {/* Active Incident Cluster Rings */}
          {activeIncidents
            .filter((inc) => inc.status !== 'RESOLVED' && inc.status !== 'CLOSED')
            .map((inc) => {
              const zone = zones.find((z) => z.zone_id === inc.zone_id) || zones[0];
              const isSelected = selectedIncidentId === inc.incident_id;
              return (
                <g
                  key={inc.incident_id}
                  onClick={() => onSelectIncident(inc.incident_id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={zone.x}
                    cy={zone.y}
                    r={zone.radius + 2}
                    fill="url(#clusterPulse)"
                    className="animate-pulse"
                  />
                  <circle
                    cx={zone.x}
                    cy={zone.y}
                    r={zone.radius + 2}
                    fill="none"
                    stroke={getIncidentSeverityStroke(inc.severity)}
                    strokeWidth={isSelected ? '1.5' : '1.0'}
                    strokeDasharray="3,2"
                  />
                  <rect
                    x={zone.x - 12}
                    y={zone.y + zone.radius - 4}
                    width="24"
                    height="4.5"
                    rx="1"
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke={getIncidentSeverityStroke(inc.severity)}
                    strokeWidth="0.5"
                  />
                  <text
                    x={zone.x}
                    y={zone.y + zone.radius - 1}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="2.2"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    🚨 {inc.incident_id} ({inc.affected_worker_count} affected)
                  </text>
                </g>
              );
            })}

          {/* Cooling Points */}
          {coolingPoints.map((cp) => (
            <g key={cp.id} transform={`translate(${cp.x}, ${cp.y})`}>
              <rect
                x="-2.5"
                y="-2.5"
                width="5"
                height="5"
                rx="1"
                fill="rgba(14, 165, 233, 0.3)"
                stroke="#0284c7"
                strokeWidth="0.8"
              />
              <text x="0" y="1" textAnchor="middle" fontSize="2.8" fill="#38bdf8">
                ❄️
              </text>
            </g>
          ))}

          {/* Worker Nodes */}
          {workers.map((w) => {
            const isSelected = selectedWorkerId === w.worker_id;
            const color = getRiskColor(w.current_risk_level);
            return (
              <g
                key={w.worker_id}
                onClick={() => onSelectWorker(w.worker_id)}
                onMouseEnter={() => setHoveredNode(w)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer transition-transform duration-200 hover:scale-125"
                transform={`translate(${w.x}, ${w.y})`}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle cx="0" cy="0" r="3.2" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
                )}
                {/* Pulsing ring for critical / early warning */}
                {(w.current_risk_level === 'CRITICAL' || w.early_warning) && (
                  <circle
                    cx="0"
                    cy="0"
                    r="2.5"
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                    className="animate-ping opacity-75"
                  />
                )}
                {/* Worker dot */}
                <circle
                  cx="0"
                  cy="0"
                  r={isSelected ? '1.8' : '1.4'}
                  fill={color}
                  stroke="#0f172a"
                  strokeWidth="0.4"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div className="absolute top-4 left-4 bg-slate-900/95 border border-slate-700 backdrop-blur-md rounded-lg p-2.5 shadow-xl text-xs font-mono z-20 pointer-events-none">
            <div className="flex items-center space-x-2 font-bold text-slate-100">
              <span>{hoveredNode.worker_id}</span>
              <span className="text-[10px] text-slate-400">({hoveredNode.role})</span>
            </div>
            <div className="mt-1 space-y-0.5 text-[11px]">
              <div className="text-slate-300">
                Risk Level: <span className="font-bold text-slate-100">{hoveredNode.current_risk_level}</span> ({Math.round(hoveredNode.current_risk_score * 100)}%)
              </div>
              <div className="text-slate-400">Zone: {hoveredNode.zone_id}</div>
              {hoveredNode.predicted_risk_level !== 'STABLE' && (
                <div className="text-amber-400">Trajectory: ↗ Pred {hoveredNode.predicted_risk_level}</div>
              )}
              {hoveredNode.action_status !== 'NO_ACTION' && (
                <div className="text-sky-400">Action: {hoveredNode.action_status}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Bar */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
        <div>
          <span>Active Cooling Points: </span>
          <span className="text-slate-200 font-mono font-medium">{coolingPoints.length} stations</span>
        </div>
        <div>
          <span>Spatial Density: </span>
          <span className="text-slate-200 font-mono font-medium">{workers.length} workers tracked</span>
        </div>
      </div>
    </div>
  );
};
