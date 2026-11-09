"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownWideNarrow, Loader2, ShieldCheck } from "lucide-react";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  Eyebrow,
} from "@/components/ui";
import { OfficerReportCard, useOfficerLocation } from "@/components/report";
import { useAuth } from "@/lib/auth";
import { ApiError, officerApi } from "@/lib/api";
import type {
  OfficerQueueSortOption,
  OfficerReportListItem,
} from "@/lib/types";

const PER_PAGE = 3;

export default function OfficerQueuePage() {
  const { user } = useAuth();
  const officerCoords = useOfficerLocation();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Budi";

  const [items, setItems] = useState<OfficerReportListItem[]>([]);
  const [sort, setSort] = useState<OfficerQueueSortOption>("urgency");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadQueue = useCallback(
    async (
      targetPage: number,
      targetSort: OfficerQueueSortOption,
      append: boolean
    ) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setErrorMsg(null);

      try {
        const res = await officerApi.queue({
          sort: targetSort,
          page: targetPage,
          per_page: PER_PAGE,
        });

        setItems((prev) => {
          if (!append) return res.data;
          const existingIds = new Set(prev.map((i) => i.ticket_id));
          const uniqueNext = res.data.filter(
            (i) => !existingIds.has(i.ticket_id)
          );
          return [...prev, ...uniqueNext];
        });
        setCurrentPage(res.meta.current_page);
        setLastPage(res.meta.last_page);
        setTotal(res.meta.total);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Tidak dapat memuat daftar laporan siap ditangani.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQueue(1, sort, false);
  }, [sort, loadQueue]);

  function handleToggleSort() {
    const nextSort: OfficerQueueSortOption =
      sort === "urgency" ? "newest" : "urgency";
    setSort(nextSort);
  }

  function handleLoadMore() {
    if (loadingMore || currentPage >= lastPage) return;
    loadQueue(currentPage + 1, sort, true);
  }

  return (
    <div className="space-y-6">
      {/* Header Sapaan */}
      <section className="space-y-2">
        <Eyebrow>TUGAS LAPANGAN</Eyebrow>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Selamat bertugas, {firstName}.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          Pilih laporan terverifikasi untuk mulai membantu warga hari ini.
        </p>
      </section>

      {/* Tab Navigasi */}
      <div className="flex items-center gap-6 border-b border-stone-200">
        <span
          aria-current="page"
          className="inline-flex items-center gap-2 border-b-2 border-emerald-700 pb-3 text-sm font-bold text-emerald-900"
        >
          <span>Siap Ditangani</span>
          {!loading && (
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {total}
            </span>
          )}
        </span>

        <Link
          href="/petugas/tugas-saya"
          className="pb-3 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
        >
          Tugas Saya
        </Link>
      </div>

      {/* Banner Info Mint */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3.5 text-xs sm:items-center sm:text-sm text-emerald-950">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 sm:mt-0"
          aria-hidden="true"
        />
        <span>
          Semua laporan di sini sudah diverifikasi admin dan berstatus Menunggu
          Penanganan. Ambil laporan sesuai prioritas dan kesiapan Anda.
        </span>
      </div>

      {/* Baris Kontrol & Urutan */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone-600">
          {loading
            ? "Memuat daftar laporan siap ditangani..."
            : `Menampilkan ${items.length} dari ${total} laporan siap ditangani`}
        </p>

        <button
          type="button"
          onClick={handleToggleSort}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-bold text-emerald-800 transition-colors hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {sort === "urgency"
              ? "Urgensi tertinggi dahulu"
              : "Terbaru lebih dulu"}
          </span>
        </button>
      </div>

      {/* State Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* State Error */}
      {!loading && errorMsg && (
        <ErrorState
          title="Gagal memuat antrean penanganan"
          message={errorMsg}
          onRetry={() => loadQueue(1, sort, false)}
        />
      )}

      {/* State Empty */}
      {!loading && !errorMsg && items.length === 0 && (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Belum ada laporan siap ditangani."
          description="Seluruh laporan yang sudah diverifikasi saat ini telah diambil atau diselesaikan oleh petugas."
        />
      )}

      {/* Grid Kartu Laporan */}
      {!loading && !errorMsg && items.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <OfficerReportCard
                key={item.ticket_id}
                item={item}
                officerCoords={officerCoords}
              />
            ))}
          </div>

          {/* Tombol Muat Laporan Lainnya */}
          {currentPage < lastPage && (
            <div>
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 text-xs sm:w-auto sm:text-sm font-semibold text-emerald-950 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
              >
                {loadingMore && (
                  <Loader2
                    className="h-4 w-4 animate-spin text-emerald-700"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {loadingMore
                    ? "Memuat laporan..."
                    : "Muat Laporan Lainnya"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
