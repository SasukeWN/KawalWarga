"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileSearch,
  HardHat,
  MapPin,
  Navigation,
  Play,
  ShieldCheck,
} from "lucide-react";
import { clsx } from "clsx";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Eyebrow,
  Skeleton,
  StatusChip,
  Timeline,
  UrgencyChip,
  useToast,
} from "@/components/ui";
import { MapView } from "@/components/map";
import {
  PhotoPicker,
  useOfficerLocation,
  type OfficerCoordinates,
} from "@/components/report";
import { useAuth } from "@/lib/auth";
import { ApiError, officerApi } from "@/lib/api";
import {
  formatDateTime,
  formatTicket,
  normalizeTicketInput,
} from "@/lib/format";
import { formatDistanceKm, haversine } from "@/lib/geo";
import type { OfficerReportDetail } from "@/lib/types";

function OfficerDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat detail laporan">
      <Skeleton className="h-4 w-44" />
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-36 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Card className="space-y-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="aspect-[16/10] w-full rounded-xl" />
            <Skeleton className="h-16 w-full" />
          </Card>
          <Card className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function CitizenOriginalReportCard({ report }: { report: OfficerReportDetail }) {
  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-stone-900">
          Laporan asli warga
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Dikirim warga pada {formatDateTime(report.received_at)}
        </p>
      </div>

      <div className="space-y-2">
        <img
          src={report.photo_url}
          alt={`Foto laporan ${report.title}`}
          className="aspect-[16/10] w-full rounded-xl border border-stone-200 object-cover"
        />
        <p className="text-[11px] text-stone-500">
          Foto bukti yang dikirim pelapor.
        </p>
      </div>

      <div className="space-y-1.5 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
          DESKRIPSI KEJADIAN
        </p>
        <p className="text-sm leading-relaxed text-stone-800">
          {report.description}
        </p>
      </div>
    </Card>
  );
}

function AdminVerificationNoteCard({ report }: { report: OfficerReportDetail }) {
  return (
    <Card variant="mint" className="space-y-3.5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-emerald-700"
            aria-hidden="true"
          />
          <h2 className="text-sm font-bold text-stone-900">
            Catatan verifikasi admin
          </h2>
        </div>

        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
          Valid · Urgensi {report.urgency_label}
        </span>
      </div>

      <div className="rounded-xl border border-emerald-200/80 bg-white p-3.5">
        <p className="text-xs sm:text-sm leading-relaxed text-stone-800">
          “{report.verification.note || "Laporan terverifikasi valid untuk segera ditangani di lapangan."}”
        </p>
        <p className="mt-2 text-[11px] text-stone-500">
          Diverifikasi oleh {report.verification.verified_by.name} ·{" "}
          {formatDateTime(report.verification.verified_at)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
        <span className="text-stone-600">Kategori ditetapkan:</span>
        <span className="font-bold text-stone-900">{report.category_label}</span>
      </div>
    </Card>
  );
}

function LocationHandlingCard({
  report,
  officerCoords,
}: {
  report: OfficerReportDetail;
  officerCoords: OfficerCoordinates | null;
}) {
  const distanceKm = officerCoords
    ? haversine(
        officerCoords.lat,
        officerCoords.lng,
        report.location.latitude,
        report.location.longitude
      )
    : null;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${report.location.latitude},${report.location.longitude}`;

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-stone-900">Lokasi penanganan</h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Titik GPS dari warga untuk navigasi lapangan.
        </p>
      </div>

      <MapView
        latitude={report.location.latitude}
        longitude={report.location.longitude}
        status={report.status}
        zoom={16}
        heightClassName="h-44 sm:h-48"
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
        <MapPin
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
          aria-hidden="true"
        />
        <div className="min-w-0 text-xs">
          <p className="font-bold text-stone-900">
            {report.location.address_text || "Titik koordinat laporan warga"}
          </p>
          <p className="mt-0.5 text-stone-500">
            {distanceKm !== null
              ? `${formatDistanceKm(distanceKm)} · Pin dari warga`
              : "Pin dari warga"}
          </p>
        </div>
      </div>

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 text-xs font-semibold text-emerald-950 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        <span className="inline-flex items-center gap-2">
          <Navigation
            className="h-3.5 w-3.5 text-emerald-700"
            aria-hidden="true"
          />
          <span>Buka Rute di Google Maps</span>
        </span>
        <ExternalLink
          className="h-3.5 w-3.5 text-stone-500"
          aria-hidden="true"
        />
      </a>
    </Card>
  );
}

function OfficerReportDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const officerCoords = useOfficerLocation();

  const rawId = searchParams.get("id") || "";
  const ticketId = normalizeTicketInput(rawId);

  const [report, setReport] = useState<OfficerReportDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(ticketId));
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State Ambil Laporan (menunggu_penanganan -> diproses)
  const [confirmTakeOpen, setConfirmTakeOpen] = useState(false);
  const [taking, setTaking] = useState(false);

  // State Penyelesaian Laporan (diproses -> selesai)
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>(undefined);
  const [completionNotes, setCompletionNotes] = useState("");
  const [notesError, setNotesError] = useState<string | undefined>(undefined);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchDetail = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    setErrorMsg(null);

    try {
      const data = await officerApi.getReport(id);
      setReport(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Tidak dapat memuat detail laporan petugas.";
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ticketId) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetail(ticketId);
  }, [ticketId, fetchDetail]);

  async function handleConfirmTake() {
    if (!report) return;
    setTaking(true);
    try {
      const updated = await officerApi.take(report.ticket_id);
      setReport(updated);
      setConfirmTakeOpen(false);
      toast.success(
        "Laporan berhasil diambil. Silakan mulai penanganan di lapangan."
      );
    } catch (err) {
      setConfirmTakeOpen(false);
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          err.message || "Laporan sudah diambil oleh petugas lain."
        );
        router.push("/petugas");
        return;
      }
      const msg =
        err instanceof ApiError
          ? err.message
          : "Gagal mengambil laporan. Silakan coba lagi.";
      toast.error(msg);
    } finally {
      setTaking(false);
    }
  }

  const trimmedNotes = completionNotes.trim();
  const hasPhoto = Boolean(completionPhoto);
  const hasValidNotes = trimmedNotes.length >= 10;
  const canComplete = hasPhoto && hasValidNotes;

  async function handleConfirmComplete() {
    if (!report || !completionPhoto || !hasValidNotes) return;
    setCompleting(true);
    setPhotoError(undefined);
    setNotesError(undefined);

    try {
      const updated = await officerApi.complete(report.ticket_id, {
        notes: trimmedNotes,
        photo: completionPhoto,
      });
      setReport(updated);
      setConfirmCompleteOpen(false);
      toast.success(
        "Laporan berhasil ditandai selesai! Bukti penanganan kini dapat dilihat warga."
      );
    } catch (err) {
      setConfirmCompleteOpen(false);
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        if (err.errors.photo?.[0]) setPhotoError(err.errors.photo[0]);
        if (err.errors.notes?.[0]) setNotesError(err.errors.notes[0]);
      }
      const msg =
        err instanceof ApiError
          ? err.message
          : "Gagal menyimpan bukti penyelesaian laporan.";
      toast.error(msg);
    } finally {
      setCompleting(false);
    }
  }

  if (!ticketId) {
    return (
      <EmptyState
        icon={<FileSearch className="h-6 w-6" />}
        title="Pilih laporan terlebih dahulu"
        description="Silakan pilih salah satu laporan dari antrean Siap Ditangani atau daftar Tugas Saya."
        action={
          <Link
            href="/petugas"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            Ke Antrean Siap Ditangani
          </Link>
        }
      />
    );
  }

  if (loading) {
    return <OfficerDetailSkeleton />;
  }

  if (notFound) {
    return (
      <EmptyState
        icon={<FileSearch className="h-6 w-6" />}
        title={`Tiket ${formatTicket(ticketId)} tidak ditemukan`}
        description="Laporan yang Anda cari tidak tersedia atau tidak termasuk dalam antrean petugas."
        action={
          <Link
            href="/petugas"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            Kembali ke Siap Ditangani
          </Link>
        }
      />
    );
  }

  if (errorMsg || !report) {
    return (
      <ErrorState
        title="Gagal memuat detail laporan"
        message={errorMsg || "Terjadi kesalahan saat menghubungi server."}
        onRetry={() => fetchDetail(ticketId)}
      />
    );
  }

  const isQueueStatus = report.status === "menunggu_penanganan";
  const isInProgress = report.status === "diproses";
  const isCompleted = report.status === "selesai";

  return (
    <div className="space-y-6">
      {/* Tautan Kembali */}
      <div>
        <Link
          href={isQueueStatus ? "/petugas" : "/petugas/tugas-saya"}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-800 transition-colors hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>
            {isQueueStatus
              ? "Kembali ke Siap Ditangani"
              : "Kembali ke Tugas Saya"}
          </span>
        </Link>
      </div>

      {/* Header Halaman Menyesuaikan Status */}
      <section className="space-y-3">
        <Eyebrow>
          {isQueueStatus
            ? `DETAIL LAPORAN · ${formatTicket(report.ticket_id)}`
            : `TUGAS SAYA · ${formatTicket(report.ticket_id)}`}
        </Eyebrow>

        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
          {isInProgress ? "Penanganan ada di tangan Anda." : report.title}
        </h1>

        <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
          {isQueueStatus &&
            "Tinjau laporan warga dan catatan verifikasi admin sebelum mengambil tugas."}
          {isInProgress &&
            "Kerjakan dengan aman, lalu dokumentasikan hasilnya untuk warga."}
          {isCompleted &&
            "Laporan ini telah diselesaikan. Berikut arsip bukti tindakan lapangan yang dikirimkan kepada warga."}
        </p>

        {/* Baris Chip Status, Urgensi & Meta */}
        <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
          <StatusChip status={report.status} />
          <UrgencyChip urgency={report.urgency} />
          <span className="text-xs text-stone-500">
            {isQueueStatus &&
              `${report.category_label} · Diterima ${formatDateTime(report.received_at)}`}
            {isInProgress &&
              `Diambil ${report.handler?.name || user?.name || "Budi Santoso"}, ${formatDateTime(report.handler?.taken_at || report.verification.verified_at)}`}
            {isCompleted &&
              `Diselesaikan ${report.completion?.completed_by.name || report.handler?.name || "Petugas"}, ${formatDateTime(report.completion?.completed_at || report.received_at)}`}
          </span>
        </div>
      </section>

      {/* Banner Konteks saat Diproses (Figma 23 & 24) */}
      {isInProgress && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:items-center sm:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-800">
            <HardHat className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-stone-900">
              {report.title.endsWith(".") ? report.title : `${report.title}.`}
            </p>
            <p className="mt-0.5 text-xs text-stone-600">
              {report.location.address_text || "Lokasi sesuai pin warga"} · Anda
              adalah petugas penanggung jawab.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
          TAMPILAN 1: MENUNGGU PENANGANAN (Figma 21 & 22)
      ========================================================= */}
      {isQueueStatus && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* Kolom Kiri */}
          <div className="space-y-5">
            <CitizenOriginalReportCard report={report} />
            <AdminVerificationNoteCard report={report} />
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-5">
            <LocationHandlingCard
              report={report}
              officerCoords={officerCoords}
            />

            <Card className="space-y-3.5 p-5">
              <p className="text-xs leading-relaxed text-stone-600">
                Dengan mengambil laporan, Anda bertanggung jawab atas
                penanganannya.
              </p>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<Play className="h-4 w-4 fill-current" />}
                onClick={() => setConfirmTakeOpen(true)}
              >
                Ambil &amp; Kerjakan Laporan
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================
          TAMPILAN 2: DIPROSES — FORM PENYELESAIAN (Figma 23 & 24)
      ========================================================= */}
      {isInProgress && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* Kolom Kiri */}
          <div className="space-y-5">
            <CitizenOriginalReportCard report={report} />
            <AdminVerificationNoteCard report={report} />
            <LocationHandlingCard
              report={report}
              officerCoords={officerCoords}
            />
          </div>

          {/* Kolom Kanan: Form Dokumentasi & Tombol Tandai Selesai */}
          <div className="space-y-4">
            <Card className="space-y-5 p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Dokumentasikan hasil penanganan
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Unggah foto kondisi setelah ditangani dan tulis tindakan yang
                  dilakukan.
                </p>
              </div>

              {/* Upload Foto Bukti Penanganan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-stone-900">
                    Upload Foto Bukti Penanganan{" "}
                    <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Wajib 1 foto
                  </span>
                </div>

                <PhotoPicker
                  file={completionPhoto}
                  onChange={setCompletionPhoto}
                  error={photoError}
                  onErrorChange={setPhotoError}
                  title="Ambil atau pilih foto hasil penanganan"
                  subtitle="JPG atau PNG · Maksimal 10 MB"
                />
              </div>

              {/* Catatan Tindakan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="officer-completion-notes"
                    className="text-xs font-bold text-stone-900"
                  >
                    Catatan Tindakan <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Minimal 10 karakter
                  </span>
                </div>

                <textarea
                  id="officer-completion-notes"
                  rows={4}
                  value={completionNotes}
                  onChange={(e) => {
                    setCompletionNotes(e.target.value);
                    if (notesError) setNotesError(undefined);
                  }}
                  placeholder="Jelaskan tindakan penanganan yang sudah dilakukan di lokasi..."
                  className={clsx(
                    "w-full rounded-xl border bg-white p-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2",
                    notesError
                      ? "border-rose-300 focus:ring-rose-500"
                      : "border-stone-200 focus:border-emerald-600 focus:ring-emerald-600"
                  )}
                />

                {notesError ? (
                  <p className="text-xs font-medium text-rose-600" role="alert">
                    {notesError}
                  </p>
                ) : (
                  <p className="text-[11px] leading-relaxed text-stone-500">
                    Contoh: “Lubang jalan sudah ditambal dengan aspal dingin dan
                    dipadatkan.”
                  </p>
                )}
              </div>

              {/* Checklist Syarat Penyelesaian */}
              <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
                <div className="flex items-center gap-2.5 text-xs">
                  {hasPhoto ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-4 w-4 shrink-0 text-stone-400"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={clsx(
                      hasPhoto
                        ? "font-semibold text-emerald-900"
                        : "text-stone-600"
                    )}
                  >
                    {hasPhoto
                      ? "Foto bukti penanganan sudah siap"
                      : "Foto bukti penanganan belum diunggah"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {hasValidNotes ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-4 w-4 shrink-0 text-stone-400"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={clsx(
                      hasValidNotes
                        ? "font-semibold text-emerald-900"
                        : "text-stone-600"
                    )}
                  >
                    {hasValidNotes
                      ? "Catatan tindakan sudah memenuhi syarat"
                      : "Catatan tindakan belum diisi"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Kartu Aksi Tandai Selesai */}
            <Card className="space-y-3.5 p-5">
              <p className="text-xs leading-relaxed text-stone-600">
                Isi foto bukti dan catatan tindakan untuk menyelesaikan laporan.
              </p>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canComplete}
                showLockWhenDisabled
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => setConfirmCompleteOpen(true)}
              >
                Tandai Selesai
              </Button>
            </Card>

            <p className="px-1 text-[11px] leading-relaxed text-stone-500">
              Foto dan catatan akan tampil di halaman pelacakan warga setelah
              laporan diselesaikan.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
          TAMPILAN 3: SELESAI — MODE BACA-SAJA DENGAN BUKTI
      ========================================================= */}
      {isCompleted && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* Kolom Kiri */}
          <div className="space-y-5">
            <CitizenOriginalReportCard report={report} />
            <AdminVerificationNoteCard report={report} />
            <LocationHandlingCard
              report={report}
              officerCoords={officerCoords}
            />
          </div>

          {/* Kolom Kanan: Bukti Penyelesaian & Riwayat */}
          <div className="space-y-5">
            {report.completion && (
              <Card variant="mint" className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    <h2 className="text-base font-bold text-stone-900">
                      Bukti penyelesaian lapangan
                    </h2>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                    Selesai Ditangani
                  </span>
                </div>

                <div className="space-y-2">
                  <img
                    src={report.completion.photo_url}
                    alt={`Foto hasil penanganan ${report.title}`}
                    className="aspect-[16/10] w-full rounded-xl border border-emerald-200 bg-white object-cover"
                  />
                  <p className="text-[11px] text-stone-600">
                    Foto kondisi lokasi setelah ditangani petugas.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    CATATAN TINDAKAN PETUGAS
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-800">
                    “{report.completion.notes}”
                  </p>
                  <p className="mt-2.5 text-xs text-stone-500">
                    Diselesaikan oleh {report.completion.completed_by.name} ·{" "}
                    {formatDateTime(report.completion.completed_at)}
                  </p>
                </div>
              </Card>
            )}

            <Card className="space-y-4 p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Riwayat Penanganan
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Jejak waktu pembaruan status laporan dari awal hingga selesai.
                </p>
              </div>
              <Timeline items={report.timeline} />
            </Card>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Ambil Laporan */}
      <ConfirmDialog
        open={confirmTakeOpen}
        title={`Ambil & Kerjakan Laporan ${formatTicket(report.ticket_id)}?`}
        description="Status laporan akan berubah menjadi Diproses dan masuk ke daftar Tugas Saya. Warga dapat melihat bahwa laporan sedang ditangani petugas."
        confirmLabel="Ya, Ambil Laporan"
        cancelLabel="Batal"
        loading={taking}
        onConfirm={handleConfirmTake}
        onClose={() => setConfirmTakeOpen(false)}
      />

      {/* Dialog Konfirmasi Tandai Selesai */}
      <ConfirmDialog
        open={confirmCompleteOpen}
        title={`Tandai Laporan ${formatTicket(report.ticket_id)} Selesai?`}
        description="Pastikan foto bukti setelah penanganan dan catatan tindakan sudah akurat. Hasil dokumentasi ini akan langsung ditampilkan kepada warga pelapor."
        confirmLabel="Ya, Tandai Selesai"
        cancelLabel="Periksa Lagi"
        loading={completing}
        onConfirm={handleConfirmComplete}
        onClose={() => setConfirmCompleteOpen(false)}
      />
    </div>
  );
}

export default function OfficerReportDetailPage() {
  return (
    <Suspense fallback={<OfficerDetailSkeleton />}>
      <OfficerReportDetailContent />
    </Suspense>
  );
}
