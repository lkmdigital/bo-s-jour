'use client';

import { useEffect, useRef } from 'react';
import { formatPrice } from '@/lib/utils';

export interface MapItem {
  id: number | string;
  title: string;
  price: number;
  lat: number;
  lng: number;
}

interface Props {
  items: MapItem[];
  provider?: string;
  mapboxToken?: string;
  className?: string;
}

// Chargement de Leaflet depuis le CDN (évite une dépendance npm + un rebuild)
let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.setAttribute('data-leaflet', 'true');
      document.head.appendChild(css);
    }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.async = true;
    s.onload = () => resolve((window as any).L);
    s.onerror = reject;
    document.body.appendChild(s);
  });
  return leafletPromise;
}

export default function ResultsMap({ items, provider = 'osm', mapboxToken = '', className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (!L || cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([7.54, -5.55], 6);
        if (provider === 'mapbox' && mapboxToken) {
          L.tileLayer(
            `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
            { tileSize: 512, zoomOffset: -1, attribution: '© Mapbox © OpenStreetMap' }
          ).addTo(mapRef.current);
        } else {
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19,
          }).addTo(mapRef.current);
        }
      }
      const map = mapRef.current;

      // Nettoyer les anciens marqueurs
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      const points: [number, number][] = [];
      items.forEach((it) => {
        if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) return;
        const icon = L.divIcon({
          className: '',
          html: `<a href="/accommodations/${it.id}" style="background:#FF0000;color:#fff;font-weight:700;font-size:12px;padding:4px 10px;border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap;text-decoration:none;display:inline-block">${formatPrice(it.price)} F</a>`,
          iconSize: [70, 26],
          iconAnchor: [35, 26],
        });
        const marker = L.marker([it.lat, it.lng], { icon, title: it.title }).addTo(map);
        markersRef.current.push(marker);
        points.push([it.lat, it.lng]);
      });

      if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
      setTimeout(() => map.invalidateSize(), 100);
    });
    return () => { cancelled = true; };
  }, [items, provider, mapboxToken]);

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  return <div ref={containerRef} className={`w-full h-[600px] rounded-2xl overflow-hidden border border-gray-200 z-0 ${className}`} />;
}
