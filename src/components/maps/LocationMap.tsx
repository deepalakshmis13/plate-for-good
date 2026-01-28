import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'ngo' | 'donor' | 'volunteer' | 'pickup';
  description?: string;
}

interface LocationMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  showUserLocation?: boolean;
  className?: string;
}

// Custom marker colors based on type
const getMarkerIcon = (type: MapMarker['type']) => {
  const colors = {
    ngo: '#16a34a', // green-600
    donor: '#ea580c', // orange-600
    volunteer: '#2563eb', // blue-600
    pickup: '#dc2626', // red-600
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${colors[type]};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

export function LocationMap({
  markers = [],
  center = [20.5937, 78.9629], // Default to India center
  zoom = 5,
  height = '400px',
  onMarkerClick,
  showUserLocation = false,
  className = '',
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

    // Get user location if requested
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapRef.current) {
            L.marker([latitude, longitude])
              .addTo(mapRef.current)
              .bindPopup('Your Location')
              .openPopup();
            mapRef.current.setView([latitude, longitude], 12);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: getMarkerIcon(marker.type),
      });

      const popupContent = `
        <div style="min-width: 150px;">
          <strong>${marker.title}</strong>
          ${marker.description ? `<p style="margin: 4px 0 0; font-size: 12px;">${marker.description}</p>` : ''}
          <p style="margin: 4px 0 0; font-size: 11px; color: #666; text-transform: capitalize;">${marker.type}</p>
        </div>
      `;

      leafletMarker.bindPopup(popupContent);

      if (onMarkerClick) {
        leafletMarker.on('click', () => onMarkerClick(marker));
      }

      leafletMarker.addTo(markersLayerRef.current!);
    });

    // Fit bounds if we have markers
    if (markers.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [markers, onMarkerClick]);

  // Update center and zoom
  useEffect(() => {
    if (mapRef.current && markers.length === 0) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom, markers.length]);

  return (
    <div
      ref={mapContainerRef}
      className={`rounded-lg overflow-hidden border ${className}`}
      style={{ height, width: '100%' }}
    />
  );
}
