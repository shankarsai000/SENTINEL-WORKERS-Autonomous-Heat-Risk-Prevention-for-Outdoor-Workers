import { describe, it, expect } from 'vitest';
import { calculateActiveExposureMinutes } from '../../packages/risk/src/context/exposure.js';
import { calculateRecentRecoveryMinutes } from '../../packages/risk/src/context/recovery.js';
import { calculateZoneClusterContext } from '../../packages/risk/src/context/clustering.js';

describe('Risk Context Calculations: Exposure, Recovery, Clustering', () => {
  describe('Active Exposure Duration', () => {
    it('returns 0 if worker is inactive', () => {
      const mins = calculateActiveExposureMinutes({
        shiftStart: '2026-08-25T06:00:00.000Z',
        shiftEnd: '2026-08-25T14:00:00.000Z',
        currentTime: '2026-08-25T09:00:00.000Z',
        isActive: false,
      });
      expect(mins).toBe(0);
    });

    it('returns 0 if shift has not started yet', () => {
      const mins = calculateActiveExposureMinutes({
        shiftStart: '2026-08-25T06:00:00.000Z',
        shiftEnd: '2026-08-25T14:00:00.000Z',
        currentTime: '2026-08-25T05:30:00.000Z',
      });
      expect(mins).toBe(0);
    });

    it('returns exact accumulated minutes within active shift window', () => {
      const mins = calculateActiveExposureMinutes({
        shiftStart: '2026-08-25T06:00:00.000Z',
        shiftEnd: '2026-08-25T14:00:00.000Z',
        currentTime: '2026-08-25T08:45:00.000Z', // 2h 45m = 165 mins
      });
      expect(mins).toBe(165);
    });

    it('caps exposure at total shift length when shift has ended', () => {
      const mins = calculateActiveExposureMinutes({
        shiftStart: '2026-08-25T06:00:00.000Z',
        shiftEnd: '2026-08-25T14:00:00.000Z', // 8h = 480 mins
        currentTime: '2026-08-25T16:00:00.000Z',
      });
      expect(mins).toBe(480);
    });

    it('handles midnight-crossing night shifts correctly', () => {
      const mins = calculateActiveExposureMinutes({
        shiftStart: '2026-08-25T22:00:00.000Z',
        shiftEnd: '2026-08-26T06:00:00.000Z',
        currentTime: '2026-08-26T01:30:00.000Z', // 3h 30m = 210 mins
      });
      expect(mins).toBe(210);
    });
  });

  describe('Explicit Recovery Calculation', () => {
    it('returns null when no recovery events are recorded (never invents recovery)', () => {
      const res = calculateRecentRecoveryMinutes({
        recoveryEvents: undefined,
        currentTime: '2026-08-25T12:00:00.000Z',
      });
      expect(res).toBeNull();
    });

    it('sums valid recovery minutes within lookback window', () => {
      const res = calculateRecentRecoveryMinutes({
        recoveryEvents: [
          {
            start: '2026-08-25T11:00:00.000Z',
            end: '2026-08-25T11:20:00.000Z', // 20 mins
          },
          {
            start: '2026-08-25T11:45:00.000Z',
            end: '2026-08-25T11:55:00.000Z', // 10 mins
          },
        ],
        currentTime: '2026-08-25T12:00:00.000Z',
        lookbackWindowMins: 120,
      });
      expect(res).toBe(30);
    });
  });

  describe('Zone Clustering Density', () => {
    it('calculates cluster density for zone workers', () => {
      const cluster = calculateZoneClusterContext('ZONE-A', [
        { zone_id: 'ZONE-A', level: 'GREEN', active: true },
        { zone_id: 'ZONE-A', level: 'ELEVATED', active: true },
        { zone_id: 'ZONE-A', level: 'HIGH', active: true },
        { zone_id: 'ZONE-A', level: 'CRITICAL', active: true },
        { zone_id: 'ZONE-B', level: 'CRITICAL', active: true }, // Different zone
      ]);

      expect(cluster.active_workers_in_zone).toBe(4);
      expect(cluster.elevated_workers_in_zone).toBe(1);
      expect(cluster.high_workers_in_zone).toBe(1);
      expect(cluster.critical_workers_in_zone).toBe(1);
      expect(cluster.cluster_density).toBe(0.75); // 3 / 4
    });
  });
});
