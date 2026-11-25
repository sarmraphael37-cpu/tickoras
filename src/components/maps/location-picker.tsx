"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CAMEROON_CENTER: [number, number] = [4.05, 11.0];

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Interactive venue picker: click the map or search an address (Nominatim /
 * OpenStreetMap, free, no key). Writes latitude/longitude/address into hidden
 * inputs for the surrounding form.
 */
export function LocationPicker({
  initialLat,
  initialLng,
  initialAddress,
  includeAddressInput = true,
}: {
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string | null;
  /** Set false when the surrounding form already has its own address field. */
  includeAddressInput?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    async function init() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const hasPoint = initialLat != null && initialLng != null;
      map = L.map(containerRef.current, {
        center: hasPoint ? [initialLat, initialLng] : CAMEROON_CENTER,
        zoom: hasPoint ? 14 : 6,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;

      const placeMarker = (la: number, ln: number, addr?: string) => {
        if (markerRef.current) markerRef.current.remove();
        const marker = L.marker([la, ln], { draggable: true }).addTo(map!);
        marker.on("dragend", async () => {
          const pos = marker.getLatLng();
          setLat(pos.lat);
          setLng(pos.lng);
          const name = await reverseGeocode(pos.lat, pos.lng);
          if (name) setAddress(name);
        });
        markerRef.current = marker;
      };

      if (hasPoint) placeMarker(initialLat!, initialLng!);

      map.on("click", async (event) => {
        const { lat: la, lng: ln } = event.latlng;
        setLat(la);
        setLng(ln);
        placeMarker(la, ln);
        const name = await reverseGeocode(la, ln);
        if (name) setAddress(name);
      });
    }

    void init();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocode(la: number, ln: number): Promise<string | null> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}&zoom=16`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { display_name?: string };
      return data.display_name ?? null;
    } catch {
      return null;
    }
  }

  async function searchAddress() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cm&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error("Search failed");
      const results = (await res.json()) as NominatimResult[];
      if (results.length === 0) {
        setSearchError("No results in Cameroon. Try a more specific address.");
        return;
      }
      const r = results[0];
      const la = Number.parseFloat(r.lat);
      const ln = Number.parseFloat(r.lon);
      setLat(la);
      setLng(ln);
      setAddress(r.display_name);
      const map = mapRef.current;
      if (map) {
        const L = await import("leaflet");
        if (markerRef.current) markerRef.current.remove();
        const marker = L.marker([la, ln], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setLat(pos.lat);
          setLng(pos.lng);
        });
        markerRef.current = marker;
        map.setView([la, ln], 15);
      }
    } catch {
      setSearchError("Address search is unavailable right now. Click the map instead.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchAddress();
              }
            }}
            placeholder="Search an address in Cameroon…"
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void searchAddress()}
          loading={searching}
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
        </Button>
      </div>
      {searchError ? <p className="text-[11px] text-danger">{searchError}</p> : null}

      <div
        ref={containerRef}
        style={{ height: 320 }}
        className="w-full overflow-hidden rounded-xl border border-line"
      />

      <div className="flex items-center gap-2 text-[11.5px] text-muted">
        <MapPin className="h-3.5 w-3.5 text-accent-300" />
        {lat != null && lng != null ? (
          <span className="font-mono">
            {lat.toFixed(5)}, {lng.toFixed(5)}
            {address ? ` — ${address.slice(0, 80)}` : ""}
          </span>
        ) : (
          <span>Click the map to drop a pin, or search an address above.</span>
        )}
      </div>

      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lng ?? ""} />
      {includeAddressInput ? (
        <input type="hidden" name="address" value={address} />
      ) : null}
    </div>
  );
}
