"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Card, StatusChip, UrgencyChip } from "@/components/ui";
import { formatDateTime, formatTicket } from "@/lib/format";
import { formatDistanceKm, haversine } from "@/lib/geo";
import type { OfficerReportListItem } from "@/lib/types";

export interface OfficerCoordinates {
  lat: number;
  lng: number;
}

/**
 * Mengambil koordinat GPS petugas lewat Geolocation browser.
 * Bila izin ditolak atau tidak tersedia, mengembalikan null sehingga teks jarak disembunyikan.
 */
export function useOfficerLocation(): OfficerCoordinates | null {
  const [coords, setCoords] = useState<OfficerCoordinates | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      () => {
        if (!cancelled) {
          setCoords(null);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 60000,
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}

export interface OfficerReportCardProps {
  item: OfficerReportListItem;
  officerCoords?: OfficerCoordinates | null;
}

export function OfficerReportCard({
  item,
  officerCoords,
}: OfficerReportCardProps) {
  const distanceKm = officerCoords
    ? haversine(
        officerCoords.lat,
        officerCoords.lng,
        item.location.latitude,
        item.location.longitude
      )
    : null;

  let timeCaption = `Diverifikasi ${formatDateTime(item.verified_at)}`;
  if (item.status === "selesai" && item.completed_at) {
    timeCaption = `Selesai ${formatDateTime(item.completed_at)}`;
  } else if (item.status === "diproses" && item.taken_at) {
    timeCaption = `Diambil ${formatDateTime(item.taken_at)}`;
  }

  return (
    <Card className="flex h-full flex-col justify-between space-y-4 p-4 sm:p-5">
      <div className="space-y-3.5">
        {/* Baris Atas: UrgencyChip Kiri + Kategori & ID Tiket Kanan */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <UrgencyChip urgency={item.urgency} size="sm" />
            {item.is_overdue && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                Terlambat
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-stone-500">{item.category_label}</p>
            <p className="text-xs font-extrabold text-emerald-900">
              {formatTicket(item.ticket_id)}
            </p>
          </div>
        </div>

        {/* Foto Bukti */}
        <img
          src={item.photo_url}
          alt={item.title}
          className="aspect-[16/10] w-full rounded-xl border border-stone-200 object-cover"
        />

        {/* Judul Laporan */}
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-stone-900">
          {item.title}
        </h3>

        {/* Chip Status & Info Target SLA */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusChip status={item.status} size="sm" />
          {item.sla_target_label && (
            <span className="text-[11px] font-medium text-stone-500">
              Target SLA: <strong className="font-semibold text-stone-700">{item.sla_target_label}</strong>
            </span>
          )}
        </div>

        {/* Lokasi & Jarak */}
        <div className="flex items-start gap-2 text-xs">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-stone-700">
              {item.location.address_text || "Lokasi sesuai pin warga"}
            </p>
            {distanceKm !== null && (
              <p className="mt-0.5 text-stone-500">
                {formatDistanceKm(distanceKm)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Waktu & Tombol Detail */}
      <div className="space-y-3 pt-1">
        <p className="text-[11px] text-stone-500">{timeCaption}</p>

        <Link
          href={`/petugas/laporan?id=${encodeURIComponent(item.ticket_id)}`}
          className="relative flex h-10 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-semibold text-emerald-950 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <span className="absolute left-3.5 flex items-center text-emerald-800">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>Lihat Detail Laporan</span>
        </Link>
      </div>
    </Card>
  );
}
