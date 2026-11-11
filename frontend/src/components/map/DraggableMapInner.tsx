"use client";

import React, { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { APP_CONFIG } from "@/lib/config";

export interface DraggableMapInnerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

function createLocationPinIcon(): L.DivIcon {
  const svg = `
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2C9.71573 2 3 8.71573 3 17C3 27.5 18 41 18 41C18 41 33 27.5 33 17C33 8.71573 26.2843 2 18 2Z" fill="#047857" stroke="white" stroke-width="2.5"/>
      <circle cx="18" cy="17" r="6" fill="white"/>
      <circle cx="18" cy="17" r="3" fill="#047857"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "kw-leaflet-pin",
    iconSize: [36, 44],
    iconAnchor: [18, 41],
  });
}

function MapCenterUpdater({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number }>({
    lat: latitude,
    lng: longitude,
  });

  useEffect(() => {
    const dLat = Math.abs(prevRef.current.lat - latitude);
    const dLng = Math.abs(prevRef.current.lng - longitude);
    if (dLat > 0.00001 || dLng > 0.00001) {
      prevRef.current = { lat: latitude, lng: longitude };
      map.panTo([latitude, longitude], { animate: true });
    }
  }, [latitude, longitude, map]);

  return null;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      );
    },
  });
  return null;
}

export default function DraggableMapInner({
  latitude,
  longitude,
  onChange,
}: DraggableMapInnerProps) {
  const pinIcon = useMemo(() => createLocationPinIcon(), []);
  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
        }
      },
    }),
    [onChange]
  );

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
      <MapContainer
        center={[latitude, longitude]}
        zoom={APP_CONFIG.defaultMapZoom}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          draggable
          eventHandlers={eventHandlers}
          position={[latitude, longitude]}
          icon={pinIcon}
          ref={markerRef}
        />
        <MapCenterUpdater latitude={latitude} longitude={longitude} />
        <MapClickHandler onSelect={onChange} />
      </MapContainer>

      {/* Badge Pojok Kiri Bawah Sesuai Figma */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-xl border border-stone-200/80 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-xs">
        <p className="text-xs font-bold text-stone-900">
          Geser pin ke lokasi kejadian
        </p>
        <p className="text-[11px] text-stone-500">
          Peta interaktif · {APP_CONFIG.regionName}
        </p>
      </div>
    </div>
  );
}
