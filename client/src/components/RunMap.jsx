import React, { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import EmptyState from './EmptyState';

function MapViewport({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 16);
    } else if (points.length > 1) {
      map.fitBounds(points.map((point) => [point.latitude, point.longitude]), { padding: [28, 28] });
    }
  }, [map, points]);

  return null;
}

export default function RunMap({
  points = [],
  height = '360px',
  sentence = 'Your map will appear after GPS records your first location.',
  actionLabel,
  onAction,
}) {
  if (!points.length) {
    return (
      <div className="vf-run-map-empty flex items-center justify-center overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0d0d] px-5" style={{ height }}>
        <EmptyState type="progress" sentence={sentence} actionLabel={actionLabel} onAction={onAction} className="py-3" />
      </div>
    );
  }

  const segments = points.reduce((groups, point) => {
    const segment = Number.isInteger(point.segment) ? point.segment : 0;
    groups[segment] ||= [];
    groups[segment].push([point.latitude, point.longitude]);
    return groups;
  }, []);
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10" style={{ height }}>
      <MapContainer center={[first.latitude, first.longitude]} zoom={15} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport points={points} />
        {segments.filter(Boolean).map((coordinates, index) => (
          <Polyline key={index} positions={coordinates} pathOptions={{ color: '#E10600', weight: 5, opacity: 0.9 }} />
        ))}
        <CircleMarker center={[first.latitude, first.longitude]} radius={8} pathOptions={{ color: '#fff', fillColor: '#16a34a', fillOpacity: 1 }} />
        <CircleMarker center={[last.latitude, last.longitude]} radius={8} pathOptions={{ color: '#fff', fillColor: '#E10600', fillOpacity: 1 }} />
      </MapContainer>
    </div>
  );
}
