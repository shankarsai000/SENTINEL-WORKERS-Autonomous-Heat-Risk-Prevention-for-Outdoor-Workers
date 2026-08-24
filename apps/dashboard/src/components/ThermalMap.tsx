import React from 'react';
import { MapPin, Sun, Droplets, Thermometer, Wind } from 'lucide-react';
import { Site, ThermalObservation } from '../types.js';

interface ThermalMapProps {
  sites: Site[];
  observations: Map<string, ThermalObservation>;
  selectedSiteId?: string;
  onSelectSite: (siteId: string) => void;
}

export const ThermalMap: React.FC<ThermalMapProps> = ({
  sites,
  observations,
  selectedSiteId,
  onSelectSite,
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <MapPin size={18} color="#06b6d4" />
          Phoenix Metropolitan Construction Sites & Thermal Exposure Grid
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
          HYPERLOCAL INTELLIGENCE
        </span>
      </div>

      <div className="card-body">
        <div className="sites-grid">
          {sites.map((site) => {
            const obs = observations.get(site.site_id);
            const temp = obs ? obs.temperature_c : 31.2;
            const humidity = obs ? obs.humidity_pct : 40;
            const wetBulb = obs ? obs.wet_bulb_c : 20.5;
            const solar = obs ? obs.solar_irradiance : 150;

            const isHighHeat = temp >= 42;
            const isCritical = temp >= 45;

            return (
              <div
                key={site.site_id}
                className="site-box"
                style={{
                  borderColor: isCritical ? '#ef4444' : isHighHeat ? '#f97316' : '#1e293b',
                  background: isCritical ? 'rgba(239, 68, 68, 0.08)' : '#0c1220',
                }}
                onClick={() => onSelectSite(site.site_id)}
              >
                <div className="site-box-header">
                  <div>
                    <div className="site-name">{site.name}</div>
                    <div className="site-zone">{site.zone_id} • {site.worker_count} Workers</div>
                  </div>
                  {isCritical ? (
                    <span className="badge badge-critical">CRITICAL HEAT</span>
                  ) : isHighHeat ? (
                    <span className="badge badge-high">HIGH HEAT</span>
                  ) : (
                    <span className="badge badge-watch">STABLE</span>
                  )}
                </div>

                <div className="site-telemetry-grid">
                  <div className="site-telemetry-stat">
                    <span className="lbl"><Thermometer size={10} style={{ display: 'inline' }} /> AMBIENT</span>
                    <span className="val" style={{ color: temp >= 42 ? '#f97316' : '#f8fafc' }}>
                      {temp.toFixed(1)}°C
                    </span>
                  </div>

                  <div className="site-telemetry-stat">
                    <span className="lbl"><Droplets size={10} style={{ display: 'inline' }} /> WET BULB</span>
                    <span className="val" style={{ color: '#38bdf8' }}>
                      {wetBulb.toFixed(1)}°C
                    </span>
                  </div>

                  <div className="site-telemetry-stat">
                    <span className="lbl"><Sun size={10} style={{ display: 'inline' }} /> SOLAR</span>
                    <span className="val">
                      {solar} W/m²
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                  <span>Cooling Trailers: {site.cooling_resources.ac_trailers}</span>
                  <span>Shade Stations: {site.cooling_resources.shade_stations}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
