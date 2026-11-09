"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Leaf, MapPinOff } from "lucide-react";
import { clsx } from "clsx";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  Skeleton,
  StatCard,
} from "@/components/ui";
import { MapView } from "@/components/map";
import { APP_CONFIG } from "@/lib/config";
import { ApiError, adminApi } from "@/lib/api";
import { STATUS_CONFIG } from "@/lib/labels";
import type {
  DashboardAiInsight,
  DashboardMapPin,
  DashboardSummary,
} from "@/lib/types";

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

interface DateRange {
  from: string;
  to: string;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultRange(): DateRange {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 7);
  return { from: toIsoDate(start), to: toIsoDate(today) };
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}

/** Contoh: "1–8 Nov 2026" atau "28 Okt – 3 Nov 2026". */
function formatRange(from: string, to: string): string {
  const a = parseIso(from);
  const b = parseIso(to);
  if (a.y === b.y && a.m === b.m) {
    if (a.d === b.d) return `${b.d} ${MONTHS_ID[b.m]} ${b.y}`;
    return `${a.d}–${b.d} ${MONTHS_ID[b.m]} ${b.y}`;
  }
  if (a.y === b.y) {
    return `${a.d} ${MONTHS_ID[a.m]} – ${b.d} ${MONTHS_ID[b.m]} ${b.y}`;
  }
  return `${a.d} ${MONTHS_ID[a.m]} ${a.y} – ${b.d} ${MONTHS_ID[b.m]} ${b.y}`;
}

function formatRangeUpper(from: string, to: string): string {
  const a = parseIso(from);
  const b = parseIso(to);
  if (a.y === b.y && a.m === b.m) {
    return `${a.d}–${b.d} ${MONTHS_ID[b.m].toUpperCase()}`;
  }
  return `${a.d} ${MONTHS_ID[a.m].toUpperCase()} – ${b.d} ${MONTHS_ID[b.m].toUpperCase()}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className={clsx(
              "h-36 rounded-2xl",
              i === 0 && "col-span-2 lg:col-span-1"
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Skeleton className="h-[460px] rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DateRange | null>(null);
  const [draft, setDraft] = useState<DateRange | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pins, setPins] = useState<DashboardMapPin[] | null>(null);
  const [insight, setInsight] = useState<DashboardAiInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [insightFailed, setInsightFailed] = useState(false);

  // Rentang awal: 7 hari terakhir (dihitung di klien agar tidak mismatch saat prerender).
  useEffect(() => {
    const initial = getDefaultRange();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRange(initial);
    setDraft(initial);
  }, []);

  const loadDashboard = useCallback(async (target: DateRange) => {
    setLoading(true);
    setSummaryError(null);
    setMapError(null);
    setInsightFailed(false);

    const [summaryRes, mapRes, insightRes] = await Promise.allSettled([
      adminApi.summary(target),
      adminApi.map(target),
      adminApi.insight(target),
    ]);

    if (summaryRes.status === "fulfilled") {
      setSummary(summaryRes.value);
    } else {
      setSummary(null);
      setSummaryError(
        summaryRes.reason instanceof ApiError
          ? summaryRes.reason.message
          : "Tidak dapat memuat ringkasan dashboard."
      );
    }

    if (mapRes.status === "fulfilled") {
      setPins(mapRes.value);
    } else {
      setPins(null);
      setMapError(
        mapRes.reason instanceof ApiError
          ? mapRes.reason.message
          : "Tidak dapat memuat peta persebaran."
      );
    }

    if (insightRes.status === "fulfilled") {
      setInsight(insightRes.value);
    } else {
      setInsight(null);
      setInsightFailed(true);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!range) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard(range);
  }, [range, loadDashboard]);

  function handleApplyRange() {
    if (!draft) return;
    if (!draft.from || !draft.to) {
      setRangeError("Tanggal awal dan akhir wajib diisi.");
      return;
    }
    if (draft.from > draft.to) {
      setRangeError("Tanggal awal tidak boleh setelah tanggal akhir.");
      return;
    }
    setRangeError(null);
    setPopoverOpen(false);
    setRange(draft);
  }

  function handleResetRange() {
    const initial = getDefaultRange();
    setDraft(initial);
    setRangeError(null);
    setPopoverOpen(false);
    setRange(initial);
  }

  const rangeLabel = range ? formatRange(range.from, range.to) : "";

  const totals = summary?.totals;
  const activeCount = totals ? totals.menunggu_penanganan + totals.diproses : 0;
  const donePercent =
    totals && totals.all > 0
      ? Math.round((totals.selesai / totals.all) * 100)
      : 0;

  const categoryTotal = summary
    ? summary.by_category.reduce((acc, c) => acc + c.count, 0)
    : 0;

  const pinStatusCount = (status: string) =>
    pins ? pins.filter((p) => p.status === status).length : 0;

  const isInitialLoading = !range || (loading && !summary && !pins);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="space-y-2">
        <Eyebrow>MONITORING WILAYAH</Eyebrow>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Gambaran layanan hari ini.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          Pantau laporan masuk, persebaran masalah, dan progres penanganan.
        </p>
      </section>

      {/* Baris Periode */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone-600 sm:text-sm">
          {rangeLabel ? `${rangeLabel} · ` : ""}Seluruh wilayah{" "}
          {APP_CONFIG.regionName}
        </p>

        <div className="relative w-fit">
          <button
            type="button"
            onClick={() => setPopoverOpen((o) => !o)}
            aria-expanded={popoverOpen}
            aria-haspopup="dialog"
            className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-emerald-900 shadow-xs transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <CalendarDays
              className="h-4 w-4 text-emerald-700"
              aria-hidden="true"
            />
            <span>{rangeLabel || "Pilih periode"}</span>
          </button>

          {popoverOpen && draft && (
            <div
              role="dialog"
              aria-label="Pilih rentang tanggal"
              className="absolute left-0 z-30 mt-2 w-72 space-y-3.5 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl sm:left-auto sm:right-0"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="dashboard-date-from"
                  className="block text-xs font-bold text-stone-900"
                >
                  Dari tanggal
                </label>
                <input
                  id="dashboard-date-from"
                  type="date"
                  value={draft.from}
                  max={draft.to || undefined}
                  onChange={(e) =>
                    setDraft({ ...draft, from: e.target.value })
                  }
                  className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="dashboard-date-to"
                  className="block text-xs font-bold text-stone-900"
                >
                  Sampai tanggal
                </label>
                <input
                  id="dashboard-date-to"
                  type="date"
                  value={draft.to}
                  min={draft.from || undefined}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                  className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {rangeError && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {rangeError}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetRange}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  7 hari terakhir
                </button>
                <Button size="sm" onClick={handleApplyRange}>
                  Terapkan
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Kartu Statistik */}
          {summaryError ? (
            <ErrorState
              title="Gagal memuat ringkasan dashboard"
              message={summaryError}
              onRetry={() => range && loadDashboard(range)}
            />
          ) : (
            totals && (
              <div
                className={clsx(
                  "grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4",
                  loading && "opacity-60 transition-opacity"
                )}
              >
                <StatCard
                  className="col-span-2 lg:col-span-1"
                  label="Total Laporan Masuk"
                  value={totals.all}
                  dotColor="emerald"
                  helperText={`Termasuk ${totals.menunggu_penanganan} menunggu penanganan`}
                />
                <StatCard
                  label="Menunggu Verifikasi"
                  value={totals.menunggu_verifikasi}
                  dotColor="stone"
                  helperText="Perlu keputusan admin"
                />
                <StatCard
                  label="Sedang Diproses Petugas"
                  value={totals.diproses}
                  dotColor="orange"
                  helperText="Dikerjakan di lapangan"
                />
                <StatCard
                  label="Selesai Ditangani"
                  value={totals.selesai}
                  dotColor="emerald"
                  helperText={`${donePercent}% dari seluruh laporan`}
                />
                <StatCard
                  label="Laporan Ditolak"
                  value={totals.ditolak}
                  dotColor="rose"
                  helperText="Dengan alasan verifikasi"
                />
              </div>
            )
          )}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Kolom Kiri: Peta + Kartu Keputusan */}
            <div className="space-y-6 lg:col-span-8">
              <Card className="space-y-4 p-5 sm:p-6">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-stone-900">
                    Peta persebaran pengaduan
                  </h2>
                  {!mapError && (
                    <p className="text-xs leading-relaxed text-stone-600 sm:text-sm">
                      Pilih pin untuk melihat laporan. {activeCount} laporan
                      aktif: {totals?.menunggu_penanganan ?? 0} menunggu
                      penanganan, {totals?.diproses ?? 0} diproses.
                    </p>
                  )}
                </div>

                {mapError ? (
                  <ErrorState
                    title="Gagal memuat peta persebaran"
                    message={mapError}
                    onRetry={() => range && loadDashboard(range)}
                  />
                ) : pins && pins.length === 0 ? (
                  <EmptyState
                    icon={<MapPinOff className="h-6 w-6" />}
                    title="Belum ada laporan pada periode ini"
                    description="Ubah rentang tanggal untuk melihat persebaran laporan yang sudah diverifikasi."
                  />
                ) : (
                  pins && (
                    <>
                      <div className={clsx(loading && "opacity-60")}>
                        <MapView
                          key={`${range?.from}-${range?.to}-${pins.length}`}
                          pins={pins}
                          zoom={14}
                          heightClassName="h-72 sm:h-[26rem]"
                        />
                      </div>

                      <ul
                        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600"
                        aria-label="Legenda warna pin"
                      >
                        {(
                          [
                            "menunggu_penanganan",
                            "diproses",
                            "selesai",
                            "ditolak",
                          ] as const
                        ).map((status) => (
                          <li
                            key={status}
                            className="inline-flex items-center gap-1.5"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: STATUS_CONFIG[status].pinHex,
                              }}
                              aria-hidden="true"
                            />
                            <span>
                              {STATUS_CONFIG[status].label} (
                              {pinStatusCount(status)})
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-stone-500">
                        Menunggu Verifikasi belum dipetakan sebagai tugas
                        petugas.
                      </p>
                    </>
                  )
                )}
              </Card>

              {totals && (
                <Card variant="mint" className="space-y-2 p-5 sm:p-6">
                  <h2 className="text-base font-bold text-emerald-950 sm:text-lg">
                    {totals.menunggu_verifikasi} laporan menunggu keputusan Anda
                  </h2>
                  <p className="text-xs text-emerald-900 sm:text-sm">
                    Periksa bukti dan rekomendasi AI sebelum meneruskan laporan
                    ke petugas.
                  </p>
                  <Link
                    href="/admin/verifikasi"
                    className="inline-flex items-center gap-1.5 pt-1 text-sm font-bold text-emerald-900 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
                  >
                    <span>Buka Antrean Verifikasi</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Card>
              )}
            </div>

            {/* Kolom Kanan: Ringkasan AI + Tren Kategori */}
            <div className="space-y-6 lg:col-span-4">
              <Card variant="ai" className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Leaf
                    className="h-5 w-5 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <h2 className="text-base font-bold text-emerald-950 sm:text-lg">
                    Ringkasan Eksekutif AI
                  </h2>
                </div>

                {insightFailed || !insight ? (
                  <p className="text-sm leading-relaxed text-stone-600">
                    Ringkasan AI belum tersedia untuk periode ini. Data
                    statistik dan peta tetap dapat dipakai sebagai acuan.
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                      BERDASARKAN {insight.based_on_total} LAPORAN ·{" "}
                      {formatRangeUpper(
                        insight.period.from,
                        insight.period.to
                      )}
                    </p>
                    <ul className="space-y-3 text-sm leading-relaxed text-stone-800">
                      {insight.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex gap-2.5">
                          <span
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
                            aria-hidden="true"
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-stone-600">
                      Rekomendasi pendukung, bukan keputusan otomatis.
                    </p>
                  </>
                )}
              </Card>

              <Card className="space-y-5 p-5 sm:p-6">
                <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                  Tren kategori
                </h2>

                {summary && summary.by_category.length > 0 ? (
                  <ul className="space-y-4">
                    {summary.by_category.map((cat) => {
                      const percent =
                        categoryTotal > 0
                          ? Math.round((cat.count / categoryTotal) * 100)
                          : 0;
                      return (
                        <li key={cat.category} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-stone-900">
                              {cat.label}
                            </span>
                            <span className="font-bold text-emerald-800">
                              {percent}%
                            </span>
                          </div>
                          <div
                            className="h-2 w-full overflow-hidden rounded-full bg-emerald-50"
                            role="progressbar"
                            aria-valuenow={percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${cat.label} ${percent} persen`}
                          >
                            <div
                              className="h-full rounded-full bg-emerald-700"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="text-xs text-stone-500">
                            {cat.count} laporan
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-stone-600">
                    Belum ada data kategori pada periode ini.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
