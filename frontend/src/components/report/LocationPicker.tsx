"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, Loader2 } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";
import { reverseGeocode } from "@/lib/geo";
import { Skeleton } from "@/components/ui/Skeleton";

const DraggableMap = dynamic(
  () => import("@/components/map/DraggableMapInner"),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-56 w-full rounded-2xl border border-stone-200" />
    ),
  }
);

export interface LocationValue {
  latitude: number;
  longitude: number;
  address_text: string;
}

export interface LocationPickerProps {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  error?: string;
}

const DEFAULT_SAMPLE_ADDRESS =
  "Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni";

export function LocationPicker({
  value,
  onChange,
  error,
}: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const lookupAddress = useCallback(
    (lat: number, lng: number) => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(async () => {
        setGeocoding(true);
        try {
          const resolved = await reverseGeocode(lat, lng);
          onChange({
            latitude: lat,
            longitude: lng,
            address_text:
              resolved ||
              `Koordinat ${lat.toFixed(5)}, ${lng.toFixed(5)}, ${APP_CONFIG.regionName}`,
          });
        } finally {
          setGeocoding(false);
        }
      }, 350);
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  function handlePinMove(lat: number, lng: number) {
    setGeoNotice(null);
    onChange({
      latitude: lat,
      longitude: lng,
      address_text: value.address_text,
    });
    lookupAddress(lat, lng);
  }

  function handleUseCurrentLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoNotice(
        "Perangkat Anda tidak mendukung fitur lokasi otomatis. Silakan geser pin secara manual."
      );
      return;
    }

    setLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLocating(false);
        onChange({
          latitude: lat,
          longitude: lng,
          address_text: value.address_text,
        });
        lookupAddress(lat, lng);
      },
      () => {
        setLocating(false);
        setGeoNotice(
          "Izin lokasi ditolak atau tidak tersedia. Menggunakan titik peta saat ini — silakan geser pin ke lokasi kejadian."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  }

  const displayAddress = value.address_text || DEFAULT_SAMPLE_ADDRESS;

  return (
    <div className="space-y-2.5">
      <DraggableMap
        latitude={value.latitude}
        longitude={value.longitude}
        onChange={handlePinMove}
      />

      <button
        type="button"
        disabled={locating}
        onClick={handleUseCurrentLocation}
        className="relative flex h-11 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs sm:text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
      >
        <span className="absolute left-4 flex items-center text-emerald-700">
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <span>
          {locating
            ? "Mendeteksi lokasi Anda..."
            : "Gunakan Lokasi Saya Saat Ini"}
        </span>
      </button>

      <div className="text-xs text-stone-500 leading-relaxed">
        <span className="text-stone-600">
          {geocoding ? "Memperbarui alamat lokasi..." : displayAddress}
        </span>
        <span className="hidden sm:inline"> · </span>
        <span className="block sm:inline">
          Geser pin untuk menyesuaikan titik lokasi.
        </span>
      </div>

      {geoNotice && (
        <p className="text-xs font-medium text-amber-800">{geoNotice}</p>
      )}

      {error && (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
