import React, { useState, useEffect } from 'react';
import { useSentinelWebSocket } from './hooks/useSentinelWebSocket.js';
import { Header } from './components/Header.js';
import { SimulationControls } from './components/SimulationControls.js';
import { RiskSummaryBar } from './components/RiskSummaryBar.js';
import { PriorityQueue } from './components/PriorityQueue.js';
import { ThermalMap } from './components/ThermalMap.js';
import { ActionStream } from './components/ActionStream.js';
import { WorkerModal } from './components/WorkerModal.js';
import { AuditDrawer } from './components/AuditDrawer.js';
import { Site, RiskState } from './types.js';

export const App: React.FC = () => {
  const {
    isConnected,
    simulationState,
    latestObservations,
    riskStates,
    actions,
    incidents,
    auditEvents,
    refreshData,
  } = useSentinelWebSocket();

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<RiskState | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>();

  useEffect(() => {
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => {
        if (data.sites) setSites(data.sites);
      })
      .catch((e) => console.error('Failed to load sites:', e));
  }, []);

  const handleAcknowledgeAction = async (actionId: string) => {
    try {
      await fetch(`/api/actions/${actionId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'Site Safety Supervisor' }),
      });
      refreshData();
    } catch (e) {
      console.error('Ack error:', e);
    }
  };

  const handleOverride = async (workerId: string, reason: string) => {
    const action = actions.find((a) => a.worker_id === workerId);
    if (action) {
      try {
        await fetch(`/api/actions/${action.action_id}/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, actor: 'Site Safety Supervisor' }),
        });
        refreshData();
      } catch (e) {
        console.error('Override error:', e);
      }
    }
  };

  const totalWorkers = sites.reduce((sum, s) => sum + s.worker_count, 0) || 500;

  return (
    <div className="app-container">
      <Header
        isConnected={isConnected}
        simulationState={simulationState}
        totalWorkers={totalWorkers}
      />

      <main className="ops-content">
        <SimulationControls state={simulationState} onRefresh={refreshData} />

        <RiskSummaryBar riskStates={riskStates} totalWorkers={totalWorkers} />

        <ThermalMap
          sites={sites}
          observations={latestObservations}
          selectedSiteId={selectedSiteId}
          onSelectSite={(siteId) => setSelectedSiteId(siteId)}
        />

        <div className="dashboard-grid">
          <PriorityQueue
            riskStates={riskStates}
            onSelectWorker={(worker) => setSelectedWorker(worker)}
          />

          <ActionStream
            actions={actions}
            incidents={incidents}
            onAcknowledgeAction={handleAcknowledgeAction}
          />
        </div>

        <AuditDrawer events={auditEvents} />
      </main>

      <WorkerModal
        worker={selectedWorker}
        onClose={() => setSelectedWorker(null)}
        onAcknowledge={(workerId) => {
          const act = actions.find((a) => a.worker_id === workerId);
          if (act) handleAcknowledgeAction(act.action_id);
        }}
        onOverride={handleOverride}
      />
    </div>
  );
};
