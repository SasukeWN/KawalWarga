"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  ChevronDown,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
  Eyebrow,
} from "@/components/ui";
import { OfficerReportCard, useOfficerLocation } from "@/components/report";
import { useAuth } from "@/lib/auth";
import { ApiError, categoriesApi, officerApi } from "@/lib/api";
import {
  CATEGORY_OPTIONS,
  registerCategoryLabels,
  URGENCY_OPTIONS,
  type ReportCategory,
  type ReportUrgency,
} from "@/lib/labels";
import type {
  OfficerQueueSortOption,
  OfficerReportListItem,
} from "@/lib/types";

const PER_PAGE = 6;

export default function OfficerQueuePage() {
  const { user } = useAuth();
  const officerCoords = useOfficerLocation();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Budi";

  // Filter states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "">("");
  const [urgencyFilter, setUrgencyFilter] = useState<ReportUrgency | "">("");
  const [categoryOptions, setCategoryOptions] = useState<
    { value: string; label: string }[]
  >(CATEGORY_OPTIONS);

  // Data states
  const [items, setItems] = useState<OfficerReportListItem[]>([]);
  const [sort, setSort] = useState<OfficerQueueSortOption>("urgency");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refreshCategories = useCallback(() => {
    categoriesApi
      .listPublic({ all: true })
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          const opts = cats.map((c) => ({ value: c.value, label: c.label }));
          setCategoryOptions(opts);
          registerCategoryLabels(opts);
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat kategori petugas:", err);
      });
  }, []);

  // Load dynamic categories on mount & on window focus
  useEffect(() => {
    let isMounted = true;
    categoriesApi
      .listPublic({ all: true })
      .then((cats) => {
        if (!isMounted) return;
        if (Array.isArray(cats) && cats.length > 0) {
          const opts = cats.map((c) => ({ value: c.value, label: c.label }));
          setCategoryOptions(opts);
          registerCategoryLabels(opts);
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat kategori petugas:", err);
      });

    const handleFocus = () => {
      categoriesApi
        .listPublic({ all: true })
        .then((cats) => {
          if (!isMounted) return;
          if (Array.isArray(cats) && cats.length > 0) {
            const opts = cats.map((c) => ({ value: c.value, label: c.label }));
            setCategoryOptions(opts);
            registerCategoryLabels(opts);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Debounce 400ms untuk pencarian ID tiket
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadQueue = useCallback(
    async (
      targetPage: number,
      targetSort: OfficerQueueSortOption,
      targetSearch: string,
      targetCategory: ReportCategory | "",
      targetUrgency: ReportUrgency | "",
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
          search: targetSearch || undefined,
          category: targetCategory || undefined,
          urgency: targetUrgency || undefined,
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
    loadQueue(1, sort, debouncedSearch, categoryFilter, urgencyFilter, false);
  }, [sort, debouncedSearch, categoryFilter, urgencyFilter, loadQueue]);

  function handleToggleSort() {
    const nextSort: OfficerQueueSortOption =
      sort === "urgency" ? "newest" : "urgency";
    setSort(nextSort);
  }

  function handleLoadMore() {
    if (loadingMore || currentPage >= lastPage) return;
    loadQueue(
      currentPage + 1,
      sort,
      debouncedSearch,
      categoryFilter,
      urgencyFilter,
      true
    );
  }

  function handleResetFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setCategoryFilter("");
    setUrgencyFilter("");
  }

  const hasActiveFilter = Boolean(
    debouncedSearch || categoryFilter || urgencyFilter
  );

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

      {/* Kartu Filter */}
      <Card className="space-y-3 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Cari ID Tiket */}
          <div className="space-y-1.5">
            <label
              htmlFor="queue-search-id"
              className="block text-xs font-bold text-stone-900"
            >
              Cari ID tiket
            </label>
            <div className="relative">
              <input
                id="queue-search-id"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ketik ID, mis. ADU-204"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-3.5 pr-9 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <Search
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Filter Kategori */}
          <div className="space-y-1.5">
            <label
              htmlFor="queue-filter-category"
              className="block text-xs font-bold text-stone-900"
            >
              Kategori
            </label>
            <div className="relative">
              <select
                id="queue-filter-category"
                onFocus={refreshCategories}
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as ReportCategory | "")
                }
                className="h-11 w-full appearance-none rounded-xl border border-stone-200 bg-white pl-3.5 pr-9 text-xs sm:text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">Semua kategori</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Filter Urgensi */}
          <div className="space-y-1.5">
            <label
              htmlFor="queue-filter-urgency"
              className="block text-xs font-bold text-stone-900"
            >
              Urgensi
            </label>
            <div className="relative">
              <select
                id="queue-filter-urgency"
                value={urgencyFilter}
                onChange={(e) =>
                  setUrgencyFilter(e.target.value as ReportUrgency | "")
                }
                className="h-11 w-full appearance-none rounded-xl border border-stone-200 bg-white pl-3.5 pr-9 text-xs sm:text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">Semua urgensi</option>
                {URGENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {hasActiveFilter && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2.5 text-xs text-stone-500">
            <span>
              Filter aktif:{" "}
              {[
                debouncedSearch ? `ID "${debouncedSearch}"` : null,
                categoryFilter
                  ? categoryOptions.find((c) => c.value === categoryFilter)
                      ?.label || categoryFilter
                  : null,
                urgencyFilter
                  ? URGENCY_OPTIONS.find((u) => u.value === urgencyFilter)
                      ?.label || urgencyFilter
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              Atur ulang filter
            </button>
          </div>
        )}
      </Card>

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
          onRetry={() =>
            loadQueue(
              1,
              sort,
              debouncedSearch,
              categoryFilter,
              urgencyFilter,
              false
            )
          }
        />
      )}

      {/* State Empty */}
      {!loading && !errorMsg && items.length === 0 && (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title={
            hasActiveFilter
              ? "Tidak ada laporan yang cocok."
              : "Belum ada laporan siap ditangani."
          }
          description={
            hasActiveFilter
              ? "Coba ubah kata kunci pencarian ID atau sesuaikan filter kategori dan urgensi."
              : "Seluruh laporan yang sudah diverifikasi saat ini telah diambil atau diselesaikan oleh petugas."
          }
          action={
            hasActiveFilter ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Atur Ulang Filter
              </button>
            ) : undefined
          }
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
