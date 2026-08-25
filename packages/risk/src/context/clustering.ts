import { RiskLevel, ZoneClusterContext } from '@sentinel/schemas';

export interface WorkerZoneState {
  zone_id: string;
  level: RiskLevel;
  active: boolean;
}

export function calculateZoneClusterContext(
  zoneId: string,
  workerStates: WorkerZoneState[]
): ZoneClusterContext {
  const zoneWorkers = workerStates.filter((w) => w.zone_id === zoneId && w.active);
  const activeCount = zoneWorkers.length;

  if (activeCount === 0) {
    return {
      zone_id: zoneId,
      active_workers_in_zone: 0,
      elevated_workers_in_zone: 0,
      high_workers_in_zone: 0,
      critical_workers_in_zone: 0,
      cluster_density: 0.0,
    };
  }

  let elevatedCount = 0;
  let highCount = 0;
  let criticalCount = 0;

  for (const w of zoneWorkers) {
    if (w.level === 'ELEVATED') elevatedCount++;
    else if (w.level === 'HIGH') highCount++;
    else if (w.level === 'CRITICAL') criticalCount++;
  }

  const heatStressedCount = elevatedCount + highCount + criticalCount;
  const clusterDensity = Math.round((heatStressedCount / activeCount) * 100) / 100;

  return {
    zone_id: zoneId,
    active_workers_in_zone: activeCount,
    elevated_workers_in_zone: elevatedCount,
    high_workers_in_zone: highCount,
    critical_workers_in_zone: criticalCount,
    cluster_density: clusterDensity,
  };
}
