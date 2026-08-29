import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';

export interface CoolingStation {
  station_id: string;
  site_id: string;
  zone_id: string;
  name: string;
  type: 'shade' | 'water' | 'mist' | 'ac_trailer';
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'FULL' | 'OFFLINE';
}

// In-memory cooling station store (seeded on first access)
let coolingStationsStore: CoolingStation[] = [];

function seedCoolingStations(): CoolingStation[] {
  if (coolingStationsStore.length > 0) return coolingStationsStore;

  // Phoenix Sky Harbor construction site — 4 zones, 4 stations per zone
  const zones = [
    { zone_id: 'ZONE-PHX-SITE-01-A', lat: 33.4490, lon: -112.0750 },
    { zone_id: 'ZONE-PHX-SITE-01-B', lat: 33.4480, lon: -112.0730 },
    { zone_id: 'ZONE-PHX-SITE-01-C', lat: 33.4475, lon: -112.0760 },
    { zone_id: 'ZONE-PHX-SITE-01-D', lat: 33.4485, lon: -112.0720 },
  ];

  const stationTypes: Array<{ type: CoolingStation['type']; name: string; capacity: number }> = [
    { type: 'shade', name: 'Shade Canopy', capacity: 12 },
    { type: 'water', name: 'Water Station', capacity: 20 },
    { type: 'mist', name: 'Misting Fan Array', capacity: 8 },
    { type: 'ac_trailer', name: 'AC Recovery Trailer', capacity: 6 },
  ];

  let stationIndex = 1;
  for (const zone of zones) {
    for (const st of stationTypes) {
      const jitter = () => (Math.random() - 0.5) * 0.002;
      const occupancy = Math.floor(Math.random() * st.capacity * 0.6);
      coolingStationsStore.push({
        station_id: `CS-${String(stationIndex).padStart(3, '0')}`,
        site_id: 'PHX-SITE-01',
        zone_id: zone.zone_id,
        name: `${zone.zone_id.split('-').pop()} ${st.name}`,
        type: st.type,
        latitude: zone.lat + jitter(),
        longitude: zone.lon + jitter(),
        capacity: st.capacity,
        current_occupancy: occupancy,
        status: occupancy >= st.capacity ? 'FULL' : occupancy >= st.capacity * 0.75 ? 'NEAR_CAPACITY' : 'AVAILABLE',
      });
      stationIndex++;
    }
  }

  return coolingStationsStore;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function createCoolingRouter(db: SentinelDatabase): Router {
  const router = Router();

  /**
   * GET /api/cooling/stations
   * List all cooling stations with live capacity for a site.
   */
  router.get('/cooling/stations', (_req: Request, res: Response) => {
    try {
      const siteId = (_req.query.site_id as string) || 'PHX-SITE-01';
      const stations = seedCoolingStations().filter((s) => s.site_id === siteId);

      // Simulate slight occupancy drift for realism
      for (const s of stations) {
        const drift = Math.floor(Math.random() * 3) - 1;
        s.current_occupancy = Math.max(0, Math.min(s.capacity, s.current_occupancy + drift));
        s.status = s.current_occupancy >= s.capacity ? 'FULL'
          : s.current_occupancy >= s.capacity * 0.75 ? 'NEAR_CAPACITY'
          : 'AVAILABLE';
      }

      const summary = {
        total_stations: stations.length,
        available: stations.filter((s) => s.status === 'AVAILABLE').length,
        near_capacity: stations.filter((s) => s.status === 'NEAR_CAPACITY').length,
        full: stations.filter((s) => s.status === 'FULL').length,
        total_capacity: stations.reduce((sum, s) => sum + s.capacity, 0),
        total_occupancy: stations.reduce((sum, s) => sum + s.current_occupancy, 0),
      };

      res.json({ site_id: siteId, summary, stations });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch cooling stations', details: err.message });
    }
  });

  /**
   * GET /api/cooling/nearest
   * Find nearest available cooling station from given coordinates.
   */
  router.get('/cooling/nearest', (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'lat and lon query parameters are required' });
      }

      const stations = seedCoolingStations()
        .filter((s) => s.site_id === siteId && s.status !== 'FULL' && s.status !== 'OFFLINE')
        .map((s) => ({
          ...s,
          distance_m: Math.round(haversineDistance(lat, lon, s.latitude, s.longitude)),
        }))
        .sort((a, b) => a.distance_m - b.distance_m);

      if (stations.length === 0) {
        return res.status(404).json({ error: 'No available cooling stations found' });
      }

      res.json({
        nearest: stations[0],
        alternatives: stations.slice(1, 4),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to find nearest cooling station', details: err.message });
    }
  });

  /**
   * POST /api/cooling/stations/:stationId/checkin
   * Worker checks in to a cooling station.
   */
  router.post('/cooling/stations/:stationId/checkin', (req: Request, res: Response) => {
    try {
      const { stationId } = req.params;
      const stations = seedCoolingStations();
      const station = stations.find((s) => s.station_id === stationId);

      if (!station) {
        return res.status(404).json({ error: `Station ${stationId} not found` });
      }

      if (station.current_occupancy >= station.capacity) {
        return res.status(409).json({ error: 'Station is at full capacity', station });
      }

      station.current_occupancy++;
      station.status = station.current_occupancy >= station.capacity ? 'FULL'
        : station.current_occupancy >= station.capacity * 0.75 ? 'NEAR_CAPACITY'
        : 'AVAILABLE';

      res.json({ status: 'checked_in', station });
    } catch (err: any) {
      res.status(500).json({ error: 'Check-in failed', details: err.message });
    }
  });

  /**
   * POST /api/cooling/stations/:stationId/checkout
   * Worker checks out of a cooling station.
   */
  router.post('/cooling/stations/:stationId/checkout', (req: Request, res: Response) => {
    try {
      const { stationId } = req.params;
      const stations = seedCoolingStations();
      const station = stations.find((s) => s.station_id === stationId);

      if (!station) {
        return res.status(404).json({ error: `Station ${stationId} not found` });
      }

      station.current_occupancy = Math.max(0, station.current_occupancy - 1);
      station.status = station.current_occupancy >= station.capacity ? 'FULL'
        : station.current_occupancy >= station.capacity * 0.75 ? 'NEAR_CAPACITY'
        : 'AVAILABLE';

      res.json({ status: 'checked_out', station });
    } catch (err: any) {
      res.status(500).json({ error: 'Check-out failed', details: err.message });
    }
  });

  return router;
}
