"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, Leaf, MessageSquareText } from "lucide-react";
import { openChatWidget } from "@/components/chat";
import { PublicFooter, PublicHeader } from "@/components/layout";
import {
  LAST_TICKET_STORAGE_KEY,
  TicketSearchBox,
} from "@/components/report";
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Eyebrow,
  StatusChip,
} from "@/components/ui";
import { isMockEnabled, reportsApi } from "@/lib/api";
import { formatTicket } from "@/lib/format";
import type { ReportStatus, TrackedReport } from "@/lib/types";

function formatShortLocation(address: string | null | undefined): string {
  if (!address) return "Kota Harmoni";
  const parts = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1].replace(/^Kel\.\s*/i, "")}`;
  }
  return address;
}

function getLastReportSummary(report: TrackedReport): string {
  if (
    report.status === "diproses" &&
    report.ticket_id.toUpperCase() === "ADU-891"
  ) {
    return "Petugas sedang menyiapkan material perbaikan.";
  }
  if (report.latest_update?.note) {
    return report.latest_update.note;
  }
  const statusCopy: Record<ReportStatus, string> = {
    menunggu_verifikasi:
      "Laporan telah diterima dan sedang menunggu pemeriksaan admin.",
    menunggu_penanganan:
      "Laporan sudah diverifikasi admin dan siap ditangani petugas lapangan.",
    diproses: "Petugas sedang menyiapkan tindakan perbaikan di lokasi.",
    selesai:
      "Penanganan laporan telah selesai beserta dokumentasi bukti lapangan.",
    ditolak:
      report.rejection?.reason ||
      "Laporan tidak dapat diteruskan berdasarkan hasil verifikasi admin.",
  };
  return statusCopy[report.status];
}

export default function CitizenAskAiPage() {
  const [lastReport, setLastReport] = useState<TrackedReport | null>(null);
  const [searchDefaultId, setSearchDefaultId] = useState("");
  const [loadingLast, setLoadingLast] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadLastTicket() {
      let targetTicketId = "";
      try {
        targetTicketId =
          window.localStorage.getItem(LAST_TICKET_STORAGE_KEY) || "";
      } catch {
        targetTicketId = "";
      }

      if (!targetTicketId && isMockEnabled()) {
        targetTicketId = "ADU-891";
      }

      if (!targetTicketId) {
        if (active) {
          setLoadingLast(false);
        }
        return;
      }

      if (active) {
        setSearchDefaultId(formatTicket(targetTicketId));
      }

      try {
        const data = await reportsApi.trackReport(targetTicketId);
        if (active) {
          setLastReport(data);
        }
      } catch {
        if (active) {
          setLastReport(null);
        }
      } finally {
        if (active) {
          setLoadingLast(false);
        }
      }
    }

    loadLastTicket();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <PublicHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:py-8 md:px-6">
        {/* Hero */}
        <section className="space-y-2">
          <Eyebrow>LAYANAN WARGA</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Ada yang bisa kami bantu?
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            Cek perkembangan laporan atau tanyakan panduan layanan melalui
            asisten AI.
          </p>
        </section>

        {/* Kotak Pencarian ID Tiket */}
        <Card className="p-5 sm:p-6">
          <TicketSearchBox
            variant="inline"
            initialValue={searchDefaultId}
            placeholder="Contoh: #ADU-891"
          />
        </Card>

        {/* Grid Dua Kolom: Laporan Terakhir Anda + Kartu Info Mint */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Kolom Kiri: Laporan Terakhir Anda */}
          <div className="lg:col-span-7">
            {loadingLast ? (
              <CardSkeleton />
            ) : lastReport ? (
              <Card className="space-y-4 p-5 sm:p-6">
                <h2 className="text-base font-bold text-stone-900">
                  Laporan terakhir Anda
                </h2>

                <img
                  src={lastReport.photo_url}
                  alt={lastReport.title}
                  className="aspect-[16/9] w-full rounded-xl border border-stone-200 object-cover"
                />

                <div className="flex items-start justify-between gap-3 pt-0.5">
                  <h3 className="text-lg font-extrabold leading-snug text-stone-900">
                    {lastReport.title}
                  </h3>
                  <div className="shrink-0">
                    <StatusChip status={lastReport.status} size="sm" />
                  </div>
                </div>

                <div className="space-y-0.5 text-xs sm:text-sm text-stone-600">
                  <p>
                    {formatTicket(lastReport.ticket_id)} ·{" "}
                    {formatShortLocation(lastReport.location.address_text)}
                  </p>
                  <p>{getLastReportSummary(lastReport)}</p>
                </div>

                <Link
                  href={`/lacak?id=${encodeURIComponent(lastReport.ticket_id)}`}
                  className="flex h-11 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs sm:text-sm font-bold text-emerald-900 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  Lihat Detail
                </Link>
              </Card>
            ) : (
              <EmptyState
                icon={<FileSearch className="h-6 w-6" />}
                title="Belum ada riwayat laporan di perangkat ini"
                description="Masukkan ID tiket pada kolom di atas untuk melacak laporan, atau gunakan panel Tanya AI di kanan bawah bila Anda lupa ID tiket."
                action={
                  <Link
                    href="/"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                  >
                    Buat Laporan Baru
                  </Link>
                }
              />
            )}
          </div>

          {/* Kolom Kanan: Kartu Info Mint & Panduan Asisten */}
          <div className="space-y-5 lg:col-span-5">
            <Card variant="mint" className="space-y-2 p-5 sm:p-6">
              <h2 className="text-base font-bold text-stone-900">
                Tidak perlu akun untuk memantau
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-emerald-950">
                Cukup simpan ID tiket Anda. Cek perkembangan kapan saja dari
                halaman ini atau tanyakan langsung melalui Asisten KawalWarga.
              </p>
            </Card>

            <Card className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900">
                    Bantuan cepat Asisten KawalWarga
                  </h2>
                  <p className="text-xs text-stone-500">
                    Tersedia 24 jam untuk menjawab pertanyaan Anda
                  </p>
                </div>
              </div>

              <ul className="space-y-2 text-xs leading-relaxed text-stone-600">
                <li>
                  • <strong className="text-stone-800">Cek Status Tiket:</strong>{" "}
                  ketik nomor tiket seperti <span className="font-semibold text-emerald-800">#ADU-891</span> untuk melihat ringkasan progres terbaru.
                </li>
                <li>
                  • <strong className="text-stone-800">Lupa ID Tiket:</strong>{" "}
                  kirim nomor WhatsApp yang Anda gunakan saat melapor untuk menemukan hingga 3 tiket terakhir.
                </li>
                <li>
                  • <strong className="text-stone-800">Cara Melapor:</strong>{" "}
                  pelajari langkah mudah mengirim laporan beserta bukti foto dan titik peta.
                </li>
              </ul>

              <Button
                variant="secondary"
                size="sm"
                fullWidth
                icon={<Leaf className="h-4 w-4 text-emerald-700" />}
                onClick={() => openChatWidget()}
              >
                Buka Percakapan Asisten AI
              </Button>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
