"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Copy, MessageCircle } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/layout";
import { Card, Skeleton, StatusChip, useToast } from "@/components/ui";
import {
  LAST_TICKET_META_STORAGE_KEY,
  LAST_TICKET_STORAGE_KEY,
} from "@/components/report";
import { reportsApi } from "@/lib/api";
import {
  formatDateTime,
  formatTicket,
  normalizeTicketInput,
} from "@/lib/format";
import type { CreatedReportResponse, ReportStatus } from "@/lib/types";

function TerkirimContent() {
  const searchParams = useSearchParams();
  const { success } = useToast();

  const queryTicketId = normalizeTicketInput(searchParams.get("id") || "");
  const [ticketId, setTicketId] = useState<string>(queryTicketId || "ADU-204");
  const [status, setStatus] = useState<ReportStatus>("menunggu_verifikasi");
  const [createdAt, setCreatedAt] = useState<string>(
    "2026-11-08T10:42:00+07:00"
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    let resolvedId = queryTicketId;

    try {
      if (!resolvedId) {
        const storedId = window.localStorage.getItem(LAST_TICKET_STORAGE_KEY);
        if (storedId) {
          resolvedId = normalizeTicketInput(storedId);
        }
      }

      if (resolvedId) {
        window.localStorage.setItem(LAST_TICKET_STORAGE_KEY, resolvedId);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTicketId(resolvedId);
      }

      const rawMeta = window.localStorage.getItem(LAST_TICKET_META_STORAGE_KEY);
      if (rawMeta) {
        const parsed = JSON.parse(rawMeta) as CreatedReportResponse;
        if (
          parsed &&
          normalizeTicketInput(parsed.ticket_id) === (resolvedId || "ADU-204")
        ) {
          setStatus(parsed.status);
          setCreatedAt(parsed.created_at);
        }
      }
    } catch {
      // Abaikan bila localStorage tidak dapat diakses
    }

    const targetTicket = resolvedId || "ADU-204";
    reportsApi
      .trackReport(targetTicket)
      .then((tracked) => {
        if (!active) return;
        setTicketId(tracked.ticket_id);
        setStatus(tracked.status);
        setCreatedAt(tracked.received_at);
      })
      .catch(() => {
        // Tetap tampilkan informasi dari state lokal bila gagal
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [queryTicketId]);

  const formattedTicket = formatTicket(ticketId);

  async function handleCopyTicket() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(formattedTicket);
      }
    } catch {
      // Fallback bila clipboard API diblokir
    }
    success("ID tiket disalin", `${formattedTicket} telah disalin.`);
  }

  function handleSaveToWhatsApp() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const trackUrl = `${origin}/lacak?id=${encodeURIComponent(ticketId)}`;
    const text = `ID tiket laporan KawalWarga saya: ${formattedTicket}. Lacak di ${trackUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card className="space-y-6 p-6 text-center sm:p-10">
        {/* Lingkaran Mint dengan Centang */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
        </div>

        {/* Judul & Subteks */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
            Terima kasih sudah peduli.
          </h1>
          <p className="mx-auto max-w-md text-xs sm:text-sm leading-relaxed text-stone-600">
            Laporan Anda berhasil diterima. Simpan ID tiket ini untuk memantau
            perkembangannya.
          </p>
        </div>

        {/* Kotak Mint Berborder Hijau */}
        <div className="space-y-3 rounded-2xl border-2 border-emerald-700 bg-emerald-50/70 px-5 py-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-900">
            ID TIKET ANDA
          </p>

          {loading ? (
            <Skeleton className="mx-auto h-10 w-44 rounded-xl" />
          ) : (
            <p className="text-3xl font-extrabold tracking-tight text-emerald-950 sm:text-4xl">
              {formattedTicket}
            </p>
          )}

          <div className="flex justify-center">
            <StatusChip status={status} size="sm" />
          </div>

          <p className="text-xs text-stone-600">{formatDateTime(createdAt)}</p>
        </div>

        {/* Tombol Salin ID Tiket & Simpan ke WhatsApp */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleCopyTicket}
            className="relative flex h-11 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs sm:text-sm font-semibold text-emerald-950 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <span className="absolute left-4 flex items-center text-emerald-800">
              <Copy className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Salin ID Tiket</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToWhatsApp}
            className="relative flex h-11 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs sm:text-sm font-semibold text-emerald-950 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <span className="absolute left-4 flex items-center text-emerald-800">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Simpan ke WhatsApp</span>
          </button>
        </div>

        {/* Garis Pemisah & Apa yang terjadi selanjutnya? */}
        <div className="space-y-1.5 border-t border-stone-100 pt-5 text-left">
          <h2 className="text-xs sm:text-sm font-bold text-stone-900">
            Apa yang terjadi selanjutnya?
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-stone-600">
            Admin akan memverifikasi deskripsi, foto, dan lokasi laporan Anda.
            Jika sesuai wilayah layanan, laporan diteruskan ke petugas untuk
            ditangani.
          </p>
        </div>

        {/* Tombol Utama Lacak Laporan Saya & Link Kembali */}
        <div className="space-y-4 pt-1">
          <Link
            href={`/lacak?id=${encodeURIComponent(ticketId)}`}
            className="relative flex h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <span className="absolute left-4 flex items-center">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Lacak Laporan Saya</span>
          </Link>

          <div>
            <Link
              href="/"
              className="inline-block text-xs sm:text-sm font-bold text-emerald-800 transition-colors hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              Kembali ke halaman utama
            </Link>
          </div>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs leading-relaxed text-stone-500">
        Tidak perlu membuat akun. Anda dapat membuka pelacakan menggunakan ID
        tiket kapan saja.
      </p>
    </div>
  );
}

function TerkirimSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <Card className="space-y-6 p-6 sm:p-10">
        <Skeleton className="mx-auto h-14 w-14 rounded-full" />
        <Skeleton className="mx-auto h-8 w-64" />
        <Skeleton className="mx-auto h-4 w-80" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </Card>
    </div>
  );
}

export default function CitizenReportSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-8 sm:py-14 md:px-6">
        <Suspense fallback={<TerkirimSkeleton />}>
          <TerkirimContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
