"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, MapPin, SearchX, SquarePen } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/layout";
import {
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  Skeleton,
  Timeline,
} from "@/components/ui";
import { ReportSummaryCard, TicketSearchBox } from "@/components/report";
import { MapView } from "@/components/map";
import { ApiError, reportsApi } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatTicket,
  normalizeTicketInput,
} from "@/lib/format";
import type { TrackedReport } from "@/lib/types";

function getBeforeAfterCaption(
  report: TrackedReport,
  kind: "before" | "after"
): string {
  if (kind === "before") {
    if (report.category === "jalan_rusak") {
      return `${formatDate(report.received_at)} · Lubang pada permukaan jalan`;
    }
    if (report.category === "sampah") {
      return `${formatDate(report.received_at)} · Tumpukan sampah awal`;
    }
    if (report.category === "lampu_mati") {
      return `${formatDate(report.received_at)} · Kondisi lampu padam`;
    }
    return `${formatDate(report.received_at)} · Foto awal dari warga`;
  }

  const completedDate = formatDate(
    report.completion?.completed_at || report.received_at
  );
  if (report.category === "jalan_rusak") {
    return `${completedDate} · Permukaan jalan telah ditambal`;
  }
  if (report.category === "sampah") {
    return `${completedDate} · Area telah dibersihkan petugas`;
  }
  if (report.category === "lampu_mati") {
    return `${completedDate} · Lampu PJU kembali menyala`;
  }
  return `${completedDate} · Penanganan selesai dilakukan`;
}

function LacakContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQueryId = searchParams.get("id") || "";
  const normalizedId = normalizeTicketInput(rawQueryId);

  const [report, setReport] = useState<TrackedReport | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(normalizedId));
  const [notFoundError, setNotFoundError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTrackedReport = useCallback(async (ticketId: string) => {
    if (!ticketId) {
      setReport(null);
      setLoading(false);
      setNotFoundError(false);
      setErrorMessage(null);
      return;
    }

    setLoading(true);
    setNotFoundError(false);
    setErrorMessage(null);

    try {
      const data = await reportsApi.trackReport(ticketId);
      setReport(data);
    } catch (err) {
      setReport(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFoundError(true);
      } else if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "Tidak dapat memuat data laporan saat ini. Periksa koneksi Anda lalu coba lagi."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTrackedReport(normalizedId);
  }, [normalizedId, fetchTrackedReport]);

  function handleSearchTicket(nextNormalizedId: string) {
    if (nextNormalizedId === normalizedId) {
      fetchTrackedReport(nextNormalizedId);
    } else {
      router.push(`/lacak/?id=${encodeURIComponent(nextNormalizedId)}`);
    }
  }

  // Judul hero dinamis menyesuaikan status laporan sesuai Figma 05-10
  let pageTitle = "Pantau laporan Anda.";
  let pageSubtitle =
    "Setiap tahap tercatat. Lihat status dan kabar terbaru dari petugas di sini.";

  if (!loading && report) {
    if (report.status === "selesai") {
      pageTitle = "Laporan tuntas, lingkungan lebih nyaman.";
      pageSubtitle =
        "Terima kasih sudah membantu kami menjaga prasarana lingkungan.";
    } else if (report.status === "ditolak") {
      pageTitle = "Informasi hasil verifikasi.";
      pageSubtitle =
        "Baca keputusan admin dan langkah yang dapat Anda lakukan berikutnya.";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <section className="space-y-2">
        <Eyebrow>PELACAKAN LAPORAN</Eyebrow>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          {pageTitle}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          {pageSubtitle}
        </p>
      </section>

      {/* Kotak Pencarian Tiket */}
      <Card className="p-4 sm:p-5">
        <TicketSearchBox
          variant="inline"
          initialValue={normalizedId ? formatTicket(normalizedId) : ""}
          onSearch={handleSearchTicket}
        />
      </Card>

      {/* State Loading (Skeleton) */}
      {loading && <LacakSkeleton />}

      {/* State 404: Tiket Tidak Ditemukan */}
      {!loading && notFoundError && (
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title="Tiket tidak ditemukan. Periksa kembali ID tiket Anda."
          description={`Kami tidak menemukan laporan dengan ID tiket ${formatTicket(normalizedId)}. Pastikan kode tiket sudah sesuai atau gunakan bantuan Tanya AI bila Anda lupa ID tiket.`}
          action={
            <Link
              href="/tanya-ai"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-stone-200 bg-white px-3.5 text-xs font-semibold text-stone-900 transition-colors hover:bg-stone-50"
            >
              Buka Bantuan Tanya AI
            </Link>
          }
        />
      )}

      {/* State Error Jaringan / Server */}
      {!loading && errorMessage && (
        <ErrorState
          title="Gagal memuat data pelacakan"
          message={errorMessage}
          onRetry={() => fetchTrackedReport(normalizedId)}
        />
      )}

      {/* Konten Utama Saat Laporan Ditemukan */}
      {!loading && report && (
        <div className="space-y-6">
          {/* Kartu Ringkasan + Stepper 4 Langkah (disembunyikan bila ditolak) */}
          <ReportSummaryCard report={report} />

          {/* =========================================================
              TAMPILAN A: DIPROSES / MENUNGGU VERIFIKASI / MENUNGGU PENANGANAN
              (Layar Figma 05 & 06)
          ========================================================= */}
          {(report.status === "menunggu_verifikasi" ||
            report.status === "menunggu_penanganan" ||
            report.status === "diproses") && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              {/* Kolom Kiri: Kartu Laporan Anda + Peta Kecil */}
              <div className="space-y-5 lg:col-span-7">
                <Card className="space-y-4 p-5 sm:p-6">
                  <h3 className="text-base font-bold text-stone-900">
                    Laporan Anda
                  </h3>

                  <div className="space-y-2">
                    <img
                      src={report.photo_url}
                      alt={report.title}
                      className="aspect-[16/10] w-full rounded-xl border border-stone-200 object-cover"
                    />
                    <p className="text-xs text-stone-500">
                      Foto awal dari warga · {formatDate(report.received_at)}
                    </p>
                  </div>

                  <p className="text-sm leading-relaxed text-stone-700">
                    {report.description}
                  </p>

                  <div className="flex items-start gap-2 text-xs text-stone-600">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    <span>
                      {report.location.address_text ||
                        "Titik koordinat lokasi dari warga"}
                    </span>
                  </div>
                </Card>

                <MapView
                  latitude={report.location.latitude}
                  longitude={report.location.longitude}
                  status={report.status}
                  heightClassName="h-44 sm:h-48"
                />
              </div>

              {/* Kolom Kanan: Kabar Terbaru Petugas (bila ada) + Riwayat Perkembangan */}
              <div className="space-y-5 lg:col-span-5">
                {report.latest_update && (
                  <Card variant="mint" className="space-y-3 p-5 sm:p-6">
                    <h3 className="text-base font-bold text-stone-900">
                      Kabar terbaru petugas
                    </h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-emerald-950">
                      “{report.latest_update.note}”
                    </p>
                    <p className="text-xs font-bold text-emerald-900">
                      <span>
                        {report.latest_update.actor.name} ·{" "}
                        {report.latest_update.actor.position}
                      </span>
                      <span className="hidden sm:inline"> / </span>
                      <span className="block sm:inline">
                        {formatDateTime(report.latest_update.at)}
                      </span>
                    </p>
                  </Card>
                )}

                <Card className="space-y-4 p-5 sm:p-6">
                  <h3 className="text-base font-bold text-stone-900">
                    Riwayat perkembangan
                  </h3>
                  <Timeline items={report.timeline} />
                </Card>

                <p className="px-1 text-xs leading-relaxed text-stone-500">
                  Status diperbarui oleh instansi. Simpan ID tiket{" "}
                  {formatTicket(report.ticket_id)} untuk pengecekan berikutnya.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================
              TAMPILAN B: SELESAI
              (Layar Figma 07 & 08)
          ========================================================= */}
          {report.status === "selesai" && (
            <div className="space-y-6">
              {/* Kartu Bukti Perubahan di Lapangan (Sebelum vs Sesudah) */}
              <Card className="space-y-4 p-5 sm:p-6">
                <h3 className="text-base font-bold text-stone-900">
                  Bukti perubahan di lapangan
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Foto Sebelum */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                      SEBELUM · FOTO WARGA
                    </p>
                    <img
                      src={report.photo_url}
                      alt={`Sebelum penanganan ${report.title}`}
                      className="aspect-[16/10] w-full rounded-xl border border-stone-200 object-cover"
                    />
                    <p className="text-xs text-stone-500">
                      {getBeforeAfterCaption(report, "before")}
                    </p>
                  </div>

                  {/* Foto Sesudah */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      SESUDAH · FOTO PETUGAS
                    </p>
                    <img
                      src={
                        report.completion?.photo_url ||
                        "/mock/jalan-selesai.png"
                      }
                      alt={`Sesudah penanganan ${report.title}`}
                      className="aspect-[16/10] w-full rounded-xl border border-stone-200 object-cover"
                    />
                    <p className="text-xs text-stone-500">
                      {getBeforeAfterCaption(report, "after")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1 text-xs text-stone-600">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <span>
                    {report.location.address_text ||
                      "Titik koordinat lokasi laporan"}
                  </span>
                </div>
              </Card>

              {/* Grid Bawah: Catatan Tindakan Petugas & Riwayat Perkembangan */}
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <Card variant="mint" className="space-y-3 p-5 sm:p-6">
                    <h3 className="text-base font-bold text-stone-900">
                      Catatan tindakan petugas
                    </h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-emerald-950">
                      {report.completion?.notes ||
                        "Penanganan telah diselesaikan di lapangan oleh petugas."}
                    </p>
                    <p className="text-xs font-bold text-emerald-900">
                      <span>
                        {report.completion?.completed_by.name ||
                          "Budi Santoso"}{" "}
                        ·{" "}
                        {report.completion?.completed_by.position ||
                          "Petugas lapangan"}
                      </span>
                      <span className="hidden sm:inline"> / </span>
                      <span className="block sm:inline">
                        Selesai{" "}
                        {formatDateTime(
                          report.completion?.completed_at || report.received_at
                        )}
                      </span>
                    </p>
                  </Card>

                  <p className="px-1 text-xs leading-relaxed text-stone-500">
                    Bukti dan catatan di atas merupakan bagian dari riwayat
                    penanganan {formatTicket(report.ticket_id)}.
                  </p>
                </div>

                <Card className="space-y-4 p-5 sm:p-6">
                  <h3 className="text-base font-bold text-stone-900">
                    Riwayat perkembangan
                  </h3>
                  <Timeline items={report.timeline} />
                </Card>
              </div>
            </div>
          )}

          {/* =========================================================
              TAMPILAN C: DITOLAK
              (Layar Figma 09 & 10)
          ========================================================= */}
          {report.status === "ditolak" && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              {/* Kolom Kiri: Laporan Anda */}
              <div className="lg:col-span-6">
                <Card className="space-y-4 p-5 sm:p-6">
                  <h3 className="text-base font-bold text-stone-900">
                    Laporan Anda
                  </h3>

                  <div className="space-y-2">
                    <img
                      src={report.photo_url}
                      alt={report.title}
                      className="aspect-[16/10] w-full rounded-xl border border-stone-200 object-cover"
                    />
                    <p className="text-xs text-stone-500">
                      Foto awal dari warga · {formatDate(report.received_at)}
                    </p>
                  </div>

                  <p className="text-sm leading-relaxed text-stone-700">
                    {report.description}
                  </p>

                  <p className="text-xs text-stone-500">
                    Lokasi:{" "}
                    {report.location.address_text ||
                      "Sesuai titik koordinat yang dikirim"}
                  </p>
                </Card>
              </div>

              {/* Kolom Kanan: Alasan Penolakan & Apa yang bisa dilakukan? */}
              <div className="space-y-5 lg:col-span-6">
                <Card variant="danger" className="space-y-3 p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-rose-900">
                    <CircleAlert
                      className="h-5 w-5 shrink-0 text-rose-800"
                      aria-hidden="true"
                    />
                    <h3 className="text-base font-bold">
                      Laporan tidak dapat diteruskan
                    </h3>
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                    ALASAN PENOLAKAN DARI ADMIN
                  </p>

                  <p className="text-sm sm:text-base font-bold leading-snug text-rose-900">
                    {report.rejection?.reason ||
                      "Lokasi kejadian berada di luar wilayah layanan instansi."}
                  </p>

                  <p className="text-xs text-rose-800">
                    <span>
                      {report.rejection?.decided_by.name || "Nadia Putri"} ·{" "}
                      {report.rejection?.decided_by.position ||
                        "Admin verifikator"}
                    </span>
                    <span className="hidden sm:inline"> / </span>
                    <span className="block sm:inline">
                      {formatDateTime(
                        report.rejection?.at || report.received_at
                      )}
                    </span>
                  </p>
                </Card>

                <Card className="space-y-4 p-5 sm:p-6">
                  <h3 className="text-base font-bold text-stone-900">
                    Apa yang bisa dilakukan?
                  </h3>

                  <p className="text-xs sm:text-sm leading-relaxed text-stone-600">
                    Silakan sampaikan laporan ke instansi yang melayani lokasi
                    tersebut. Jika titik lokasi keliru, buat laporan baru dengan
                    pin yang benar.
                  </p>

                  <div className="border-t border-stone-100 pt-4 space-y-3">
                    <Link
                      href="/"
                      className="relative flex h-11 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs sm:text-sm font-semibold text-emerald-950 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <span className="absolute left-4 flex items-center text-emerald-800">
                        <SquarePen className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span>Buat Laporan Baru</span>
                    </Link>

                    <p className="text-xs text-stone-500">
                      Laporan ini tidak masuk tahap penanganan. Keputusan dan
                      alasannya tetap tersimpan.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LacakSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-64 sm:w-80" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-56" />
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 md:grid-cols-4">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <Card className="space-y-4 p-5 sm:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="aspect-[16/10] w-full rounded-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </Card>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <div className="space-y-5 lg:col-span-5">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function CitizenTrackReportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 md:px-6">
        <Suspense fallback={<LacakSkeleton />}>
          <LacakContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
