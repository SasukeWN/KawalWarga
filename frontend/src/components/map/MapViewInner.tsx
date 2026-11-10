"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { clsx } from "clsx";
import { APP_CONFIG } from "@/lib/config";
import { formatTicket } from "@/lib/format";
import { STATUS_CONFIG, type ReportStatus } from "@/lib/labels";
import { StatusChip } from "@/components/ui/StatusChip";
import type { DashboardMapPin } from "@/lib/types";

export interface MapViewInnerProps {
  latitude?: number;
  longitude?: number;
  status?: ReportStatus;
  useStatusPinColor?: boolean;
  pins?: DashboardMapPin[];
  caption?: string | null;
  heightClassName?: string;
  zoom?: number;
  detailBaseHref?: string;
}

function createPinIcon(hexColor: string): L.DivIcon {
  const svg = `
    <svg width="34" height="42" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2C9.71573 2 3 8.71573 3 17C3 27.5 18 41 18 41C18 41 33 27.5 33 17C33 8.71573 26.2843 2 18 2Z" fill="${hexColor}" stroke="white" stroke-width="2.5"/>
      <circle cx="18" cy="17" r="6" fill="white"/>
      <circle cx="18" cy="17" r="3" fill="${hexColor}"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "kw-leaflet-pin",
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -34],
  });
}

function MapCenterSync({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function MapViewInner({
  latitude,
  longitude,
  status = "diproses",
  useStatusPinColor = false,
  pins,
  caption = `Peta skematis · ${APP_CONFIG.regionName}`,
  heightClassName = "h-48 sm:h-52",
  zoom,
  detailBaseHref = "/admin/verifikasi",
}: MapViewInnerProps) {
  const isMultiPin = Array.isArray(pins);

  const centerLat =
    latitude ??
    (pins && pins.length > 0
      ? pins[0].latitude
      : APP_CONFIG.defaultMapCenter.lat);
  const centerLng =
    longitude ??
    (pins && pins.length > 0
      ? pins[0].longitude
      : APP_CONFIG.defaultMapCenter.lng);

  const effectiveZoom =
    zoom ?? (isMultiPin ? 14 : APP_CONFIG.defaultMapZoom);

  const singlePinHex = useStatusPinColor
    ? STATUS_CONFIG[status]?.pinHex || "#047857"
    : "#047857";

  const singlePinIcon = useMemo(
    () => createPinIcon(singlePinHex),
    [singlePinHex]
  );

  const statusPinIcons = useMemo(() => {
    return {
      menunggu_verifikasi: createPinIcon(
        STATUS_CONFIG.menunggu_verifikasi.pinHex
      ),
      menunggu_penanganan: createPinIcon(
        STATUS_CONFIG.menunggu_penanganan.pinHex
      ),
      diproses: createPinIcon(STATUS_CONFIG.diproses.pinHex),
      selesai: createPinIcon(STATUS_CONFIG.selesai.pinHex),
      ditolak: createPinIcon(STATUS_CONFIG.ditolak.pinHex),
    };
  }, []);

  return (
    <div
      className={clsx(
        "relative w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100",
        heightClassName
      )}
    >
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={effectiveZoom}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!isMultiPin && (
          <>
            <Marker position={[centerLat, centerLng]} icon={singlePinIcon} />
            <MapCenterSync lat={centerLat} lng={centerLng} />
          </>
        )}

        {isMultiPin &&
          pins.map((pin) => (
            <Marker
              key={pin.ticket_id}
              position={[pin.latitude, pin.longitude]}
              icon={statusPinIcons[pin.status] || singlePinIcon}
            >
              <Popup>
                <div className="w-52 space-y-2 py-0.5 text-stone-900">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={pin.photo_url}
                      alt={pin.title}
                      className="h-12 w-14 shrink-0 rounded-lg border border-stone-200 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-900">
                        {pin.category_label || "Belum Dikategorikan"}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {formatTicket(pin.ticket_id)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-stone-100 pt-2">
                    <StatusChip status={pin.status} size="sm" />
                    <Link
                      href={`${detailBaseHref}?id=${encodeURIComponent(pin.ticket_id)}`}
                      className="block text-[11px] font-bold text-emerald-800 hover:text-emerald-950"
                    >
                      Lihat detail laporan →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {caption && (
        <div className="pointer-events-none absolute bottom-2.5 left-3 z-[400] rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-medium text-stone-600 shadow-2xs backdrop-blur-xs">
          {caption}
        </div>
      )}
    </div>
  );
}
