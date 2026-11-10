"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Leaf,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
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
import { ApiError, adminApi, categoriesApi } from "@/lib/api";
import {
  formatDateTime,
  formatTicket,
  normalizeTicketInput,
} from "@/lib/format";
import {
  CATEGORY_OPTIONS,
  getCategoryLabel,
  getUrgencyLabel,
  registerCategoryLabels,
  URGENCY_OPTIONS,
  type ReportCategory,
  type ReportUrgency,
} from "@/lib/labels";
import type { AdminReportDetail, AdminReportListItem } from "@/lib/types";

function getDisplayPhotoName(ticketId: string, photoUrl: string): string {
  if (normalizeTicketInput(ticketId) === "ADU-204") {
    return "jalan-melati.jpg";
  }
  const parts = photoUrl.split("/");
  const last = parts[parts.length - 1];
  if (!last || last.startsWith("blob:")) {
    return `${ticketId.toLowerCase()}.jpg`;
  }
  return last;
}

function getUrgencyButtonActiveClass(urgency: ReportUrgency): string {
  switch (urgency) {
    case "darurat":
      return "border-rose-400 bg-rose-100 text-rose-900 font-bold";
    case "tinggi":
      return "border-rose-300 bg-rose-50 text-rose-700 font-bold";
    case "sedang":
      return "border-amber-300 bg-amber-100 text-amber-900 font-bold";
    case "rendah":
      return "border-emerald-300 bg-emerald-100 text-emerald-900 font-bold";
  }
}

function AdminVerificationSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Memuat halaman verifikasi laporan"
    >
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-9 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-6 w-36 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          <Card className="space-y-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="aspect-[16/10] w-full rounded-xl" />
            <Skeleton className="h-16 w-full" />
          </Card>
          <Card className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-6">
          <Card className="space-y-4">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </Card>
          <Card className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function PhotoZoomModal({
  open,
  photoUrl,
  title,
  ticketId,
  onClose,
}: {
  open: boolean;
  photoUrl: string;
  title: string;
  ticketId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ukuran penuh ${formatTicket(ticketId)}`}
    >
      <div
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-emerald-800">
              {formatTicket(ticketId)} · Foto Asli Warga
            </p>
            <p className="truncate text-sm font-bold text-stone-900">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau foto"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="bg-stone-900 p-2 sm:p-4">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[75vh] w-full rounded-xl object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function AdminVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const rawId = searchParams.get("id") || "";
  const requestedId = rawId ? normalizeTicketInput(rawId) : "";

  const [queueItems, setQueueItems] = useState<AdminReportListItem[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pilihan Kategori & Urgensi dari AI / Admin
  const [categoryOptions, setCategoryOptions] = useState<
    { value: string; label: string }[]
  >(CATEGORY_OPTIONS);
  const [selectedCategory, setSelectedCategory] =
    useState<ReportCategory | "">("");
  const [selectedUrgency, setSelectedUrgency] =
    useState<ReportUrgency | "">("");
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    categoriesApi
      .listAll()
      .then((cats) => {
        if (!isMounted) return;
        if (Array.isArray(cats) && cats.length > 0) {
          const opts = cats.map((c) => ({ value: c.value, label: c.label }));
          setCategoryOptions(opts);
          registerCategoryLabels(opts);
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat kategori admin:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Modal Foto
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // State Keputusan Setujui
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [approving, setApproving] = useState(false);

  // State Keputusan Tolak
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | undefined>(undefined);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const syncFormWithReport = useCallback((detail: AdminReportDetail) => {
    const initialCat: ReportCategory | "" =
      detail.verification?.category ?? detail.ai.category ?? "";
    const initialUrg: ReportUrgency | "" =
      detail.verification?.urgency ?? detail.ai.urgency ?? "";

    setCategoryOptions((prev) => {
      if (initialCat && !prev.some((o) => o.value === initialCat)) {
        return [
          ...prev,
          { value: initialCat, label: getCategoryLabel(initialCat) },
        ];
      }
      return prev;
    });

    setSelectedCategory(initialCat);
    setSelectedUrgency(initialUrg);
    setAdminNote("");
    setRejectReason("");
    setRejectError(undefined);
  }, []);

  const loadQueueAndDetail = useCallback(
    async (targetId: string) => {
      setLoading(true);
      setNotFound(false);
      setErrorMsg(null);

      try {
        const queueRes = await adminApi.listReports({
          status: "menunggu_verifikasi",
          sort: "newest",
          page: 1,
          per_page: 50,
        });

        const list = queueRes.data;
        setQueueItems(list);
        setQueueTotal(queueRes.meta.total);

        const activeTicketId = targetId || list[0]?.ticket_id || "";

        if (!activeTicketId) {
          setReport(null);
          return;
        }

        const detail = await adminApi.getReport(activeTicketId);
        setReport(detail);
        syncFormWithReport(detail);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          const msg =
            err instanceof ApiError
              ? err.message
              : "Tidak dapat memuat data verifikasi laporan.";
          setErrorMsg(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [syncFormWithReport]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQueueAndDetail(requestedId);
  }, [requestedId, loadQueueAndDetail]);

  const currentQueueIndex = report
    ? queueItems.findIndex(
        (item) =>
          normalizeTicketInput(item.ticket_id) ===
          normalizeTicketInput(report.ticket_id)
      )
    : -1;

  function getNextQueueTicketId(excludeTicketId?: string): string | null {
    const remaining = excludeTicketId
      ? queueItems.filter(
          (i) =>
            normalizeTicketInput(i.ticket_id) !==
            normalizeTicketInput(excludeTicketId)
        )
      : queueItems;

    if (remaining.length === 0) return null;

    if (currentQueueIndex >= 0 && currentQueueIndex < remaining.length) {
      return remaining[currentQueueIndex].ticket_id;
    }
    return remaining[0].ticket_id;
  }

  function handleNextReport() {
    if (queueItems.length <= 1) return;
    const nextIdx =
      currentQueueIndex >= 0
        ? (currentQueueIndex + 1) % queueItems.length
        : 0;
    const nextTicket = queueItems[nextIdx]?.ticket_id;
    if (nextTicket) {
      router.push(`/admin/verifikasi?id=${encodeURIComponent(nextTicket)}`);
    }
  }

  async function handleReanalyze() {
    if (!report || reanalyzing) return;
    setReanalyzing(true);
    try {
      const updatedAi = await adminApi.reanalyze(report.ticket_id);
      setReport((prev) => (prev ? { ...prev, ai: updatedAi } : prev));
      if (updatedAi.category) setSelectedCategory(updatedAi.category);
      if (updatedAi.urgency) setSelectedUrgency(updatedAi.urgency);
      toast.success("Analisis AI berhasil diperbarui.");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Gagal menjalankan ulang analisis AI.";
      toast.error(msg);
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleConfirmApprove() {
    if (!report || !selectedCategory || !selectedUrgency) return;
    setApproving(true);
    try {
      const currentTicketId = report.ticket_id;
      await adminApi.approve(currentTicketId, {
        category: selectedCategory,
        urgency: selectedUrgency,
        note: adminNote.trim() || undefined,
      });

      setConfirmApproveOpen(false);
      toast.success(
        `Laporan ${formatTicket(currentTicketId)} disetujui dan diteruskan ke antrean petugas.`
      );

      const nextId = getNextQueueTicketId(currentTicketId);
      if (nextId) {
        router.push(`/admin/verifikasi?id=${encodeURIComponent(nextId)}`);
      } else {
        if (requestedId) {
          router.push("/admin/verifikasi");
        } else {
          loadQueueAndDetail("");
        }
      }
    } catch (err) {
      setConfirmApproveOpen(false);
      const msg =
        err instanceof ApiError
          ? err.message
          : "Gagal menyetujui laporan. Silakan coba lagi.";
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  }

  const trimmedRejectReason = rejectReason.trim();
  const canReject = trimmedRejectReason.length >= 10;

  async function handleConfirmReject() {
    if (!report || !canReject) return;
    setRejecting(true);
    setRejectError(undefined);

    try {
      const currentTicketId = report.ticket_id;
      await adminApi.reject(currentTicketId, {
        reason: trimmedRejectReason,
      });

      setConfirmRejectOpen(false);
      toast.info(
        `Laporan ${formatTicket(currentTicketId)} telah ditolak beserta alasan verifikasi.`
      );

      const nextId = getNextQueueTicketId(currentTicketId);
      if (nextId) {
        router.push(`/admin/verifikasi?id=${encodeURIComponent(nextId)}`);
      } else {
        if (requestedId) {
          router.push("/admin/verifikasi");
        } else {
          loadQueueAndDetail("");
        }
      }
    } catch (err) {
      setConfirmRejectOpen(false);
      if (err instanceof ApiError && err.status === 422 && err.errors?.reason) {
        setRejectError(err.errors.reason[0]);
      }
      const msg =
        err instanceof ApiError
          ? err.message
          : "Gagal menolak laporan. Silakan coba lagi.";
      toast.error(msg);
    } finally {
      setRejecting(false);
    }
  }

  if (loading) {
    return <AdminVerificationSkeleton />;
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <Eyebrow>VERIFIKASI LAPORAN</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Periksa bukti. Putuskan dengan yakin.
          </h1>
        </section>

        <EmptyState
          title={`Tiket ${formatTicket(requestedId)} tidak ditemukan`}
          description="Laporan yang Anda cari tidak tersedia di dalam sistem."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/admin/verifikasi"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                Buka Antrean Verifikasi
              </Link>
              <Link
                href="/admin/riwayat"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-50"
              >
                Lihat Riwayat Laporan
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <Eyebrow>VERIFIKASI LAPORAN</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Periksa bukti. Putuskan dengan yakin.
          </h1>
        </section>

        <ErrorState
          title="Gagal memuat halaman verifikasi"
          message={errorMsg}
          onRetry={() => loadQueueAndDetail(requestedId)}
        />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <Eyebrow>VERIFIKASI LAPORAN</Eyebrow>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Periksa bukti. Putuskan dengan yakin.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            AI membantu menganalisis. Keputusan akhir tetap dibuat oleh admin.
          </p>
        </section>

        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title="Semua laporan sudah diperiksa."
          description="Tidak ada laporan baru yang berstatus Menunggu Verifikasi saat ini. Anda dapat menelusuri seluruh laporan pada halaman Riwayat Laporan."
          action={
            <Link
              href="/admin/riwayat"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Buka Riwayat Laporan
            </Link>
          }
        />
      </div>
    );
  }

  const isPendingVerification = report.status === "menunggu_verifikasi";
  const displayQueueOrder =
    currentQueueIndex >= 0 ? currentQueueIndex + 1 : 1;
  const displayQueueTotal = Math.max(queueTotal, queueItems.length, 1);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <section className="space-y-2">
        <Eyebrow>VERIFIKASI LAPORAN</Eyebrow>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Periksa bukti. Putuskan dengan yakin.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          AI membantu menganalisis. Keputusan akhir tetap dibuat oleh admin.
        </p>
      </section>

      {/* Kartu Navigator Antrean / Navigasi Baca-Saja */}
      {isPendingVerification ? (
        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs sm:text-sm font-bold text-stone-900">
              {displayQueueTotal} laporan menunggu verifikasi
            </p>
            <p className="text-xs text-stone-500">
              Terbaru lebih dahulu · Laporan {displayQueueOrder} dari{" "}
              {displayQueueTotal}
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-emerald-950">
              <span className="line-clamp-2 sm:line-clamp-1">
                {formatTicket(report.ticket_id)} · {report.title}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextReport}
              disabled={queueItems.length <= 1}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="hidden sm:inline">Laporan berikutnya</span>
              <span className="sm:hidden">Berikut</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/riwayat"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Kembali ke Riwayat Laporan</span>
            </Link>
            <span className="hidden text-stone-300 sm:inline">·</span>
            <span className="text-xs text-stone-500">
              Mode baca-saja (laporan sudah diputuskan)
            </span>
          </div>

          {queueItems.length > 0 && (
            <Link
              href={`/admin/verifikasi?id=${encodeURIComponent(queueItems[0].ticket_id)}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-900 transition-colors hover:bg-emerald-100"
            >
              <span>
                Ke Antrean Verifikasi ({queueTotal})
              </span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </Card>
      )}

      {/* Judul Pemeriksaan & Chip Status */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl">
          Pemeriksaan {formatTicket(report.ticket_id)}
        </h2>
        <div>
          <StatusChip status={report.status} />
        </div>
      </div>

      {/* Grid Dua Kolom */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* =====================================================
            KOLOM KIRI: Bukti & Deskripsi Asli + Lokasi Kejadian
        ===================================================== */}
        <div className="space-y-6 lg:col-span-6">
          {/* Kartu Bukti & Deskripsi Asli */}
          <Card className="space-y-4 p-5 sm:p-6">
            <h3 className="text-base font-bold text-stone-900">
              Bukti &amp; deskripsi asli
            </h3>

            <div className="space-y-2.5">
              <img
                src={report.photo_url}
                alt={`Foto bukti ${report.title}`}
                onClick={() => setPhotoModalOpen(true)}
                className="aspect-[16/10] w-full cursor-zoom-in rounded-xl border border-stone-200 object-cover"
              />

              <p className="text-xs text-stone-500">
                {getDisplayPhotoName(report.ticket_id, report.photo_url)} · Foto
                asli warga
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 transition-colors hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
                >
                  <span>Perbesar foto</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-stone-800">
              “{report.description}”
            </p>

            <div className="border-t border-stone-200 pt-3 text-xs text-stone-500">
              <span className="block sm:inline">
                Diterima {formatDateTime(report.received_at)}
              </span>
              <span className="hidden sm:inline"> / </span>
              <span className="mt-0.5 block sm:mt-0 sm:inline">
                {report.reporter.phone
                  ? `WhatsApp: ${report.reporter.phone}`
                  : "WhatsApp tidak disertakan"}
              </span>
            </div>
          </Card>

          {/* Kartu Lokasi Kejadian */}
          <Card className="space-y-4 p-5 sm:p-6">
            <h3 className="text-base font-bold text-stone-900">
              Lokasi kejadian
            </h3>

            <MapView
              latitude={report.location.latitude}
              longitude={report.location.longitude}
              status={report.status}
              zoom={16}
              heightClassName="h-48 sm:h-52"
            />

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-stone-800">
                {report.location.address_text ||
                  "Titik koordinat lokasi dari pelapor"}
              </p>
              <p className="text-[11px] text-stone-500">
                Pin lokasi dari warga · Dalam wilayah layanan
              </p>
            </div>
          </Card>
        </div>

        {/* =====================================================
            KOLOM KANAN: Rekomendasi Analisis AI + Keputusan / Hasil
        ===================================================== */}
        <div className="space-y-6 lg:col-span-6">
          {/* Kartu Rekomendasi Analisis AI */}
          <Card variant="ai" className="space-y-4 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Leaf
                  className="h-4 w-4 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <h3 className="text-base font-bold text-stone-900">
                  Rekomendasi Analisis AI
                </h3>
              </div>

              {(report.ai.status === "failed" ||
                report.ai.status === "pending") && (
                <button
                  type="button"
                  disabled={reanalyzing}
                  onClick={handleReanalyze}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={clsx(
                      "h-3.5 w-3.5",
                      reanalyzing && "animate-spin"
                    )}
                    aria-hidden="true"
                  />
                  <span>
                    {reanalyzing ? "Menganalisis..." : "Analisis Ulang"}
                  </span>
                </button>
              )}
            </div>

            {/* Ringkasan Cepat */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                RINGKASAN CEPAT
              </p>
              <p className="text-sm leading-relaxed text-stone-800">
                {report.ai.summary ||
                  "Analisis AI belum tersedia. Admin dapat menentukan kategori dan urgensi secara manual."}
              </p>
            </div>

            {/* Select Kategori Laporan */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-verify-category"
                className="block text-xs font-bold text-stone-900"
              >
                Kategori laporan
              </label>
              <div className="relative">
                <select
                  id="admin-verify-category"
                  disabled={!isPendingVerification}
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(e.target.value as ReportCategory)
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-stone-200 bg-white pl-3.5 pr-10 text-sm font-medium text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-600"
                >
                  <option value="" disabled>
                    -- Pilih Kategori Permasalahan --
                  </option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Pilihan Tombol Urgensi */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-stone-900">
                Urgensi
              </span>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Pilih tingkat urgensi laporan"
              >
                {URGENCY_OPTIONS.map((opt) => {
                  const active = selectedUrgency === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!isPendingVerification}
                      onClick={() => setSelectedUrgency(opt.value)}
                      className={clsx(
                        "inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-3.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed",
                        active
                          ? getUrgencyButtonActiveClass(opt.value)
                          : "border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50"
                      )}
                    >
                      <span>{opt.label}</span>
                      {active && <span aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-500">
                Kategori dan urgensi dapat diubah sesuai hasil pemeriksaan
                admin.
              </p>
            </div>

            {/* Peringatan Duplikat */}
            {report.ai.duplicates && report.ai.duplicates.length > 0 && (
              <div className="space-y-2.5">
                {report.ai.duplicates.map((dup) => (
                  <div
                    key={dup.ticket_id}
                    className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                        aria-hidden="true"
                      />
                      <div className="space-y-1">
                        <p className="font-bold text-amber-900">
                          Terdeteksi mirip dengan Tiket{" "}
                          {formatTicket(dup.ticket_id)} (Jarak {dup.distance_m}
                          m).
                        </p>
                        <Link
                          href={`/admin/verifikasi?id=${encodeURIComponent(dup.ticket_id)}`}
                          className="inline-flex items-center gap-1 font-bold text-amber-900 underline-offset-2 hover:underline"
                        >
                          <span>Lihat Tiket Terkait</span>
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-stone-600">
              Periksa kemiripan sebelum menyetujui. AI memberi rekomendasi,
              bukan keputusan.
            </p>
          </Card>

          {/* Kartu Keputusan Admin (hanya saat menunggu_verifikasi) */}
          {isPendingVerification ? (
            <Card className="space-y-5 p-5 sm:p-6">
              <h3 className="text-base font-bold text-stone-900">
                Keputusan admin
              </h3>

              {/* Bagian Setujui */}
              <div className="space-y-2.5">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  icon={<Check className="h-4 w-4" />}
                  disabled={!selectedCategory || !selectedUrgency}
                  onClick={() => setConfirmApproveOpen(true)}
                >
                  Setujui &amp; Teruskan ke Petugas
                </Button>
                {(!selectedCategory || !selectedUrgency) && (
                  <p className="text-[11px] font-semibold text-amber-700">
                    * Pilih kategori dan tingkat urgensi terlebih dahulu untuk menyetujui.
                  </p>
                )}
                <p className="text-[11px] text-emerald-900">
                  Setelah disetujui: Menunggu Penanganan. Petugas dapat
                  mengambil laporan ini.
                </p>
              </div>

              {/* Bagian Tolak Laporan */}
              <div className="space-y-3 border-t border-stone-200 pt-4">
                <p className="text-xs font-bold text-stone-900">
                  Jika laporan harus ditolak
                </p>

                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-reject-reason"
                    className="block text-xs font-bold text-stone-900"
                  >
                    Alasan penolakan <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id="admin-reject-reason"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (rejectError) setRejectError(undefined);
                    }}
                    placeholder="Jelaskan alasan agar warga memahami keputusan Anda..."
                    className={clsx(
                      "w-full rounded-xl border bg-white p-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2",
                      rejectError
                        ? "border-rose-300 focus:ring-rose-500"
                        : "border-stone-200 focus:border-emerald-600 focus:ring-emerald-600"
                    )}
                  />
                  {rejectError ? (
                    <p
                      className="text-xs font-medium text-rose-600"
                      role="alert"
                    >
                      {rejectError}
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-rose-700">
                      Wajib diisi sebelum menolak. Alasan akan terlihat oleh
                      warga.
                    </p>
                  )}
                </div>

                <Button
                  variant="danger-outline"
                  size="md"
                  fullWidth
                  disabled={!canReject}
                  onClick={() => setConfirmRejectOpen(true)}
                >
                  Tolak Laporan
                </Button>
              </div>
            </Card>
          ) : (
            /* Mode Baca-Saja untuk laporan yang sudah diverifikasi / ditolak */
            <div className="space-y-6">
              {report.status === "ditolak" && report.rejection ? (
                <Card variant="danger" className="space-y-3.5 p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <XCircle
                      className="h-5 w-5 shrink-0 text-rose-700"
                      aria-hidden="true"
                    />
                    <h3 className="text-base font-bold text-stone-900">
                      Hasil keputusan: Laporan ditolak
                    </h3>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                      ALASAN PENOLAKAN DARI ADMIN
                    </p>
                    <p className="mt-1.5 text-sm font-semibold leading-relaxed text-stone-900">
                      “{report.rejection.reason}”
                    </p>
                    <p className="mt-2 text-xs text-stone-500">
                      {report.rejection.decided_by.name} ·{" "}
                      {report.rejection.decided_by.position} /{" "}
                      {formatDateTime(report.rejection.at)}
                    </p>
                  </div>
                </Card>
              ) : (
                <Card variant="mint" className="space-y-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className="h-5 w-5 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                      <h3 className="text-base font-bold text-stone-900">
                        Hasil verifikasi admin
                      </h3>
                    </div>
                    {report.urgency && <UrgencyChip urgency={report.urgency} />}
                  </div>

                  {report.verification && (
                    <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2">
                      <p className="text-sm leading-relaxed text-stone-800">
                        “
                        {report.verification.note ||
                          "Laporan telah diverifikasi valid dan diteruskan kepada petugas lapangan."}
                        ”
                      </p>
                      <p className="text-xs text-stone-500">
                        Diverifikasi oleh{" "}
                        {report.verification.verified_by.name} ·{" "}
                        {formatDateTime(report.verification.verified_at)}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                      <p className="text-stone-500">Kategori ditetapkan</p>
                      <p className="mt-0.5 font-bold text-stone-900">
                        {report.category_label || "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                      <p className="text-stone-500">Petugas penanggung jawab</p>
                      <p className="mt-0.5 font-bold text-stone-900">
                        {report.handler?.name || "Menunggu diambil petugas"}
                      </p>
                    </div>
                  </div>

                  {report.completion && (
                    <div className="space-y-2.5 rounded-xl border border-emerald-200 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        BUKTI PENYELESAIAN PETUGAS
                      </p>
                      <img
                        src={report.completion.photo_url}
                        alt="Bukti penyelesaian"
                        className="aspect-[16/10] w-full rounded-lg border border-stone-200 object-cover"
                      />
                      <p className="text-xs leading-relaxed text-stone-800">
                        “{report.completion.notes}”
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Selesai oleh {report.completion.completed_by.name} ·{" "}
                        {formatDateTime(report.completion.completed_at)}
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* Riwayat Perkembangan */}
              <Card className="space-y-4 p-5 sm:p-6">
                <h3 className="text-base font-bold text-stone-900">
                  Riwayat perkembangan
                </h3>
                <Timeline items={report.timeline} />
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modal Perbesar Foto */}
      <PhotoZoomModal
        open={photoModalOpen}
        photoUrl={report.photo_url}
        title={report.title}
        ticketId={report.ticket_id}
        onClose={() => setPhotoModalOpen(false)}
      />

      {/* Dialog Konfirmasi Setujui & Teruskan */}
      <ConfirmDialog
        open={confirmApproveOpen}
        title={`Setujui & Teruskan ${formatTicket(report.ticket_id)}?`}
        description={`Laporan akan ditetapkan dengan kategori "${selectedCategory ? getCategoryLabel(selectedCategory) : "-"}" dan urgensi "${selectedUrgency ? getUrgencyLabel(selectedUrgency) : "-"}", lalu masuk ke antrean petugas lapangan.`}
        confirmLabel="Ya, Setujui & Teruskan"
        cancelLabel="Batal"
        loading={approving}
        onConfirm={handleConfirmApprove}
        onClose={() => setConfirmApproveOpen(false)}
      >
        <div className="space-y-1.5">
          <label
            htmlFor="admin-approve-note"
            className="block text-xs font-bold text-stone-900"
          >
            Catatan instruksi untuk petugas (opsional)
          </label>
          <textarea
            id="admin-approve-note"
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Contoh: Amankan area terlebih dahulu, lalu lakukan penambalan..."
            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </ConfirmDialog>

      {/* Dialog Konfirmasi Tolak Laporan */}
      <ConfirmDialog
        open={confirmRejectOpen}
        title={`Tolak Laporan ${formatTicket(report.ticket_id)}?`}
        description="Laporan yang ditolak tidak akan diteruskan ke petugas lapangan. Alasan penolakan berikut akan ditampilkan secara terbuka pada halaman pelacakan warga:"
        confirmLabel="Ya, Tolak Laporan"
        cancelLabel="Batal"
        confirmVariant="danger-outline"
        loading={rejecting}
        onConfirm={handleConfirmReject}
        onClose={() => setConfirmRejectOpen(false)}
      >
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-950">
          “{trimmedRejectReason}”
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default function AdminVerificationPage() {
  return (
    <Suspense fallback={<AdminVerificationSkeleton />}>
      <AdminVerificationContent />
    </Suspense>
  );
}
