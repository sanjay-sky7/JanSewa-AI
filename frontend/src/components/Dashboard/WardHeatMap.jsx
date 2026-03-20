import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../../context/LanguageContext';

function getSeverity(ward) {
  if ((ward.critical_complaints || 0) > 0) return 'CRITICAL';
  if ((ward.open_complaints || 0) > 5) return 'HIGH';
  if ((ward.open_complaints || 0) > 0) return 'MEDIUM';
  return 'LOW';
}

const severityColor = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

export default function WardHeatMap({ data = [] }) {
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;

    // Center on Delhi
    mapInstance.current = L.map(mapRef.current, {
      center: [28.6139, 77.209],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstance.current || !data.length) return;

    // Clear old markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) mapInstance.current.removeLayer(layer);
    });

    const markerBounds = [];

    data.forEach((ward) => {
      if (!ward.latitude || !ward.longitude) return;

      const severity = getSeverity(ward);
      const color = severityColor[severity] || '#6b7280';
      const radius = Math.max(8, Math.min(30, (ward.total_complaints || 1) * 2));

      L.circleMarker([ward.latitude, ward.longitude], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.7,
      })
        .bindPopup(
          `<div class="text-sm">
            <p class="font-semibold">Ward ${ward.ward_number}: ${ward.ward_name}</p>
            <p>Total Complaints: ${ward.total_complaints || 0}</p>
            <p>Open: ${ward.open_complaints || 0}</p>
            <p>Critical: ${ward.critical_complaints || 0}</p>
            <p>Coordinates: ${Number(ward.latitude).toFixed(4)}, ${Number(ward.longitude).toFixed(4)}</p>
          </div>`
        )
        .addTo(mapInstance.current);

      markerBounds.push([ward.latitude, ward.longitude]);
    });

    if (markerBounds.length > 0) {
      mapInstance.current.fitBounds(markerBounds, { padding: [20, 20] });
    }
  }, [data]);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{t('heatmap_title', 'Ward Heat Map')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('heatmap_subtitle', 'Complaint density by geographic area')}</p>
      </div>
      <div ref={mapRef} className="h-[400px] w-full" />
      {/* Legend */}
      <div className="px-5 py-3 border-t border-gray-100 flex gap-4 text-xs">
        {Object.entries(severityColor).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
