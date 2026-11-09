"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Leaf,
  Lightbulb,
  TrafficCone,
  Trash2,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/layout";
import { Card, Eyebrow, Skeleton, StatusChip } from "@/components/ui";
import {
  ReportForm,
  TicketSearchBox,
  LAST_TICKET_STORAGE_KEY,
} from "@/components/report";
import { reportsApi } from "@/lib/api";
import { formatTicket } from "@/lib/format";
import type { ReportStatus, TrackedReport } from "@/lib/types";

function getLastTicketStatusCopy(status: ReportStatus): string {
  switch (status) {
    case "menunggu_verifikasi":
      return "Saat ini berstatus: MENUNGGU VERIFIKASI. Laporan Anda sedang diperiksa oleh admin.";
    case "menunggu_penanganan":
      return "Saat ini berstatus: MENUNGGU PENANGANAN. Laporan telah disetujui dan menunggu petugas.";
    case "diproses":
      return "Saat ini berstatus: DIPROSES. Petugas sedang menangani laporan Anda.";
    case "selesai":
      return "Saat ini berstatus: SELESAI. Penanganan laporan Anda telah dituntaskan petugas.";
    case "ditolak":
      return "Saat ini berstatus: DITOLAK. Lihat alasan hasil verifikasi dari admin.";
  }
}

export default function CitizenCreateReportPage() {
  const [lastReport, setLastReport] = useState<TrackedReport | null>(null);
  const [loadingLastTicket, setLoadingLastTicket] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      const savedTicketId = window.localStorage.getItem(
        LAST_TICKET_STORAGE_KEY
      );
      if (!savedTicketId) {
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingLastTicket(true);
      reportsApi
        .trackReport(savedTicketId)
        .then((data) => {
          if (active) {
            setLastReport(data);
          }
        })
        .catch(() => {
          // Sembunyikan banner bila tiket lama tidak ditemukan
        })
        .finally(() => {
          if (active) {
            setLoadingLastTicket(false);
          }
        });
    } catch {
      // Abaikan bila localStorage tidak dapat diakses
    }
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <PublicHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:py-8 md:px-6">
        {/* Banner Laporan Terakhir Anda (dari kw_last_ticket) */}
        {loadingLastTicket && (
          <Skeleton className="h-20 w-full rounded-2xl border border-emerald-200 bg-emerald-50/60" />
        )}

        {!loadingLastTicket && lastReport && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3.5 sm:px-5 sm:py-4">
            {/* Baris 1 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-900">
                <History
                  className="h-4 w-4 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <span>
                  Laporan terakhir Anda · {formatTicket(lastReport.ticket_id)}
                </span>
              </div>
              <div className="hidden sm:block">
                <StatusChip status={lastReport.status} size="sm" />
              </div>
            </div>

            {/* Baris 2 (Desktop: teks status + link; Mobile: chip + link) */}
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="hidden sm:block text-xs text-stone-600">
                {getLastTicketStatusCopy(lastReport.status)}
              </p>
              <div className="sm:hidden">
                <StatusChip status={lastReport.status} size="sm" />
              </div>
              <Link
                href={`/lacak?id=${encodeURIComponent(lastReport.ticket_id)}`}
                className="shrink-0 text-xs font-bold text-emerald-800 transition-colors hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
              >
                Lihat Detail →
              </Link>
            </div>
          </div>
        )}

        {/* Hero Heading */}
        <section className="space-y-2 pt-1">
          <Eyebrow>LAYANAN PENGADUAN MASYARAKAT</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Lingkungan lebih baik, dimulai dari laporan Anda.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            Temukan masalah prasarana atau kebersihan? Ceritakan kepada kami.
            Anda bisa melapor tanpa membuat akun.
          </p>
        </section>

        {/* Grid 2 Kolom (Desktop: Form Kiri, Sidebar Kanan; Mobile: 1 Kolom) */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Kolom Kiri: Form Buat Laporan Baru */}
          <div className="lg:col-span-8">
            <ReportForm />
          </div>

          {/* Kolom Kanan: Kartu Samping */}
          <aside className="space-y-5 lg:col-span-4">
            {/* Kartu 1: Sudah pernah melapor? */}
            <Card className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-stone-900">
                  Sudah pernah melapor?
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Pantau tindak lanjut kapan saja dengan ID tiket Anda.
                </p>
              </div>
              <TicketSearchBox variant="stacked" />
            </Card>

            {/* Kartu 2: Yang dapat Anda laporkan */}
            <Card className="space-y-4">
              <h2 className="text-base font-bold text-stone-900">
                Yang dapat Anda laporkan
              </h2>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-3">
                  <TrafficCone
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-stone-900">
                      Jalan rusak
                    </p>
                    <p className="text-xs text-stone-500">
                      Lubang dan kerusakan jalan lingkungan.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Trash2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-stone-900">
                      Sampah
                    </p>
                    <p className="text-xs text-stone-500">
                      Tumpukan sampah di ruang publik.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Lightbulb
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-stone-900">
                      Lampu mati
                    </p>
                    <p className="text-xs text-stone-500">
                      Penerangan jalan yang tidak berfungsi.
                    </p>
                  </div>
                </li>
              </ul>
            </Card>

            {/* Kartu 3: Butuh panduan? Tanya AI. */}
            <Card variant="ai" className="space-y-3.5">
              <div className="flex items-center gap-2">
                <Leaf
                  className="h-4 w-4 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-bold text-stone-900">
                  Butuh panduan? Tanya AI.
                </h2>
              </div>
              <p className="text-xs leading-relaxed text-stone-600">
                Asisten membantu mencari status tiket dan menjelaskan cara
                melapor. Keputusan laporan tetap di tangan petugas instansi.
              </p>
              <Link
                href="/tanya-ai"
                className="flex h-10 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs sm:text-sm font-semibold text-emerald-800 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Tanya Chatbot AI
              </Link>
            </Card>

            {/* Catatan Kecil */}
            <p className="px-1 text-xs leading-relaxed text-stone-500">
              Laporan akan diperiksa admin sebelum diteruskan ke petugas. Simpan
              ID tiket setelah mengirim.
            </p>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
