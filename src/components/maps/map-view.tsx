"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  href?: string;
}

const CAMEROON_CENTER: [number, number] = [4.05, 11.0];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Read-only Leaflet map. Client-only: dynamically imports Leaflet inside
 * useEffect so SSR never touches window.
 */
export function EventMap({
  points,
  height = 420,
  zoom = 11,
  center,
}: {
  points: MapPoint[];
  height?: number;
  zoom?: number;
  center?: [number, number];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    async function init() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: center ?? CAMEROON_CENTER,
        zoom: points.length > 1 ? zoom : 12,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;

      const bounds: [number, number][] = [];
      for (const point of points) {
        const marker = L.marker([point.lat, point.lng]).addTo(map);
        const popupHtml = point.href
          ? `<a href="${escapeHtml(point.href)}" style="font-weight:600;color:#1d4ed8">${escapeHtml(point.title)}</a>${
              point.subtitle ? `<br/><span style="font-size:11px;color:#666">${escapeHtml(point.subtitle)}</span>` : ""
            }`
          : `<strong>${escapeHtml(point.title)}</strong>${
              point.subtitle ? `<br/><span style="font-size:11px;color:#666">${escapeHtml(point.subtitle)}</span>` : ""
            }`;
        marker.bindPopup(popupHtml);
        markersRef.current.push(marker);
        bounds.push([point.lat, point.lng]);
      }
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      }
    }

    void init();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // Rebuild only when the point set changes materially.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => `${p.id}:${p.lat}:${p.lng}`).join("|")]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-xl border border-line bg-surface"
      role="application"
      aria-label="Interactive map"
    />
  );
}

/** Open turn-by-turn directions in OpenStreetMap. */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}&routing=pedestrian`;
}
