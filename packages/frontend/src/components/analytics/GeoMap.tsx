import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { formatNumber } from '@/utils/format';

interface GeoDataPoint {
  country: string;
  clicks: number;
  lat: number;
  lng: number;
}

interface GeoMapProps {
  data: GeoDataPoint[];
  height?: number;
}

export default function GeoMap({ data, height = 350 }: GeoMapProps) {
  const maxClicks = Math.max(...data.map((d) => d.clicks), 1);

  if (!data || data.length === 0) {
    return (
      <div className="card p-8 text-center" style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-secondary-400 text-sm">No geographic data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden" style={{ height }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={false}
        style={{ height, width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data.map((point, idx) => {
          const radius = Math.max(5, (point.clicks / maxClicks) * 30);
          return (
            <CircleMarker
              key={idx}
              center={[point.lat, point.lng]}
              radius={radius}
              pathOptions={{
                color: '#6366f1',
                fillColor: '#818cf8',
                fillOpacity: 0.6,
                weight: 2,
                opacity: 0.8,
              }}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-sm">{point.country}</p>
                  <p className="text-xs text-secondary-500">{formatNumber(point.clicks)} clicks</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
