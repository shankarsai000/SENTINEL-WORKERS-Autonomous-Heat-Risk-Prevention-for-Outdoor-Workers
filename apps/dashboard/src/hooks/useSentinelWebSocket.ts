import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SimulationState,
  ThermalObservation,
  RiskState,
  Action,
  Incident,
  AuditEvent,
} from '../types.js';

export interface UseSentinelWebSocketReturn {
  isConnected: boolean;
  simulationState: SimulationState | null;
  latestObservations: Map<string, ThermalObservation>;
  riskStates: RiskState[];
  actions: Action[];
  incidents: Incident[];
  auditEvents: AuditEvent[];
  refreshData: () => Promise<void>;
}

export function useSentinelWebSocket(): UseSentinelWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [latestObservations, setLatestObservations] = useState<Map<string, ThermalObservation>>(new Map());
  const [riskStates, setRiskStates] = useState<RiskState[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [simRes, riskRes, actionsRes, incRes, auditRes] = await Promise.all([
        fetch('/api/simulation/state').then((r) => r.json()).catch(() => null),
        fetch('/api/risk/workers?limit=50').then((r) => r.json()).catch(() => null),
        fetch('/api/actions?limit=50').then((r) => r.json()).catch(() => null),
        fetch('/api/incidents').then((r) => r.json()).catch(() => null),
        fetch('/api/events?limit=50').then((r) => r.json()).catch(() => null),
      ]);

      if (simRes) setSimulationState(simRes);
      if (riskRes?.workers) setRiskStates(riskRes.workers);
      if (actionsRes?.actions) setActions(actionsRes.actions);
      if (incRes?.incidents) setIncidents(incRes.incidents);
      if (auditRes?.events) setAuditEvents(auditRes.events);
    } catch (e) {
      console.warn('REST snapshot sync fallback error:', e);
    }
  }, []);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        refreshData();
      };

      ws.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          const { type, payload } = envelope;

          switch (type) {
            case 'SIMULATION_STATUS':
              setSimulationState(payload);
              break;

            case 'THERMAL_OBSERVATION':
              setLatestObservations((prev) => {
                const next = new Map(prev);
                next.set(payload.site_id, payload);
                return next;
              });
              break;

            case 'RISK_STATE_UPDATE':
              if (payload.risk_states) {
                setRiskStates((prev) => {
                  const map = new Map(prev.map((r) => [r.worker_id, r]));
                  for (const r of payload.risk_states) {
                    map.set(r.worker_id, r);
                  }
                  return Array.from(map.values()).sort((a, b) => b.score - a.score);
                });
              }
              break;

            case 'ACTION_EVENT':
              setActions((prev) => {
                const filtered = prev.filter((a) => a.action_id !== payload.action_id);
                return [payload, ...filtered].slice(0, 100);
              });
              break;

            case 'INCIDENT_EVENT':
              setIncidents((prev) => {
                const filtered = prev.filter((i) => i.incident_id !== payload.incident_id);
                return [payload, ...filtered];
              });
              break;

            case 'AUDIT_EVENT':
              setAuditEvents((prev) => [payload, ...prev].slice(0, 100));
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('WebSocket envelope parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Exponential backoff / retry after 2.5s
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [refreshData]);

  useEffect(() => {
    connect();
    refreshData();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect, refreshData]);

  return {
    isConnected,
    simulationState,
    latestObservations,
    riskStates,
    actions,
    incidents,
    auditEvents,
    refreshData,
  };
}
