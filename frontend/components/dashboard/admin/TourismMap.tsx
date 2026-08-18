'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star } from 'lucide-react';

export interface MapAccommodation {
  id: number;
  name: string;
  city: string;
  type: string;
  lat: number;
  lng: number;
  rating: number | null;
  total_reviews: number;
  price_per_night: number;
  is_featured: boolean;
}

// Repère rond aux couleurs bo séjour (rouge charte), en DivIcon pour éviter le
// souci classique des icônes par défaut Leaflet cassées par le bundler Next.js —
// et rester cohérent avec l'identité de marque plutôt que le marqueur bleu par défaut.
function brandIcon(featured: boolean) {
  const size = featured ? 16 : 12;
  const color = featured ? '#FF0000' : '#000000';
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

export default function TourismMap({ accommodations }: { accommodations: MapAccommodation[] }) {
  // Centre approximatif Côte d'Ivoire (proche d'Yamoussoukro, capitale).
  const center: [number, number] = accommodations.length > 0
    ? [accommodations[0].lat, accommodations[0].lng]
    : [7.539989, -5.54708];

  return (
    <MapContainer center={center} zoom={7} scrollWheelZoom style={{ height: '480px', width: '100%', borderRadius: '0.75rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {accommodations.map((a) => (
        <Marker key={a.id} position={[a.lat, a.lng]} icon={brandIcon(a.is_featured)}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{a.name}</p>
              <p className="text-gray-500">{a.city}</p>
              <p className="mt-1">{formatFCFA(a.price_per_night)} / nuit</p>
              {a.rating != null && a.rating > 0 && (
                <p className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 inline" /> {a.rating.toFixed(1)} ({a.total_reviews})
                </p>
              )}
              {a.is_featured && <p className="text-primary font-medium mt-1">Mis en avant</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
