import { ZoneClusterContext } from '@sentinel/schemas';

export interface ZoneTrendFeatures {
  cluster_density: number; // 0.0 - 1.0
  active_workers: number;
  heat_stressed_workers: number;
  projected_cluster_density_30m: number;
}

export function computeZoneTrendFeatures(
  clusterCtx: ZoneClusterContext
): ZoneTrendFeatures {
  const currentDensity = clusterCtx.cluster_density;
  const stressedCount =
    clusterCtx.elevated_workers_in_zone +
    clusterCtx.high_workers_in_zone +
    clusterCtx.critical_workers_in_zone;

  // Projected density with upward momentum if cluster already has high/critical workers
  let projDensity = currentDensity;
  if (clusterCtx.critical_workers_in_zone > 0 || clusterCtx.high_workers_in_zone >= 2) {
    projDensity = Math.min(1.0, currentDensity * 1.25);
  }

  return {
    cluster_density: currentDensity,
    active_workers: clusterCtx.active_workers_in_zone,
    heat_stressed_workers: stressedCount,
    projected_cluster_density_30m: Math.round(projDensity * 100) / 100,
  };
}
