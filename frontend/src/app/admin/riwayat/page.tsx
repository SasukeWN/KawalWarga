"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileSearch,
  Search,
} from "lucide-react";
import { clsx } from "clsx";
import {
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
  Eyebrow,
  Skeleton,
  StatusChip,
  UrgencyChip,
} from "@/components/ui";
import { ApiError, adminApi, categoriesApi } from "@/lib/api";
import { formatDate, formatTicket } from "@/lib/format";
import {
  CATEGORY_OPTIONS,
  getCategoryLabel,
  getStatusLabel,
  getUrgencyLabel,
  registerCategoryLabels,
  STATUS_OPTIONS,
  URGENCY_OPTIONS,
  type ReportCategory,
  type ReportStatus,
  type ReportUrgency,
} from "@/lib/labels";
import type { AdminReportListItem } from "@/lib/types";

const PER_PAGE = 8;

function formatShortAddress(address: string | null | undefined): string {
  if (!address) return "Lokasi sesuai pin warga";
  const firstPart = address.split(",")[0]?.trim();
  return firstPart || address;
}

export default function AdminHistoryPage() {
  // Filter states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "">("");
  const [urgencyFilter, setUrgencyFilter] = useState<ReportUrgency | "">("");
  const [categoryOptions, setCategoryOptions] = useState<
    { value: string; label: string }[]
  >(CATEGORY_OPTIONS);
  const [page, setPage] = useState(1);

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

  // Data states
  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounce 400 ms untuk pencarian ID tiket
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchReports = useCallback(
    async (
      targetPage: number,
      search: string,
      status: ReportStatus | "",
      category: ReportCategory | "",
      urgency: ReportUrgency | ""
    ) => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await adminApi.listReports({
          search: search || undefined,
          status: status || undefined,
          category: category || undefined,
          urgency: urgency || undefined,
          sort: "newest",
          page: targetPage,
          per_page: PER_PAGE,
        });

        setItems(res.data);
        setCurrentPage(res.meta.current_page);
        setLastPage(res.meta.last_page);
        setTotal(res.meta.total);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Tidak dapat memuat daftar riwayat laporan.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports(
      page,
      debouncedSearch,
      statusFilter,
      categoryFilter,
      urgencyFilter
    );
  }, [
    page,
    debouncedSearch,
    statusFilter,
    categoryFilter,
    urgencyFilter,
    fetchReports,
  ]);

  const hasActiveFilter = Boolean(
    searchInput.trim() || statusFilter || categoryFilter || urgencyFilter
  );

  function handleResetFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("");
    setCategoryFilter("");
    setUrgencyFilter("");
    setPage(1);
  }

  const filterSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (statusFilter) parts.push(`Status: ${getStatusLabel(statusFilter)}`);
    if (categoryFilter)
      parts.push(`Kategori: ${getCategoryLabel(categoryFilter)}`);
    if (urgencyFilter) parts.push(`Urgensi: ${getUrgencyLabel(urgencyFilter)}`);
    if (debouncedSearch) parts.push(`Pencarian: "${debouncedSearch}"`);

    if (parts.length === 0) {
      return "Semua status, kategori, dan urgensi";
    }
    return parts.join(" · ");
  }, [statusFilter, categoryFilter, urgencyFilter, debouncedSearch]);

  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(total, (currentPage - 1) * PER_PAGE + items.length);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= lastPage; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [lastPage]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <section className="space-y-2">
        <Eyebrow>BUKU BESAR LAYANAN</Eyebrow>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Riwayat &amp; seluruh laporan.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          Telusuri setiap laporan, dari pengajuan hingga bukti penyelesaian.
        </p>
      </section>

      {/* Kartu Filter */}
      <Card className="space-y-3.5 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Cari ID Tiket */}
          <div className="space-y-1.5">
            <label
              htmlFor="history-search-id"
              className="block text-xs font-bold text-stone-900"
            >
              Cari ID tiket
            </label>
            <div className="relative">
              <input
                id="history-search-id"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ketik ID, mis. ADU-891"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-3.5 pr-9 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <Search
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Filter Status */}
          <div className="space-y-1.5">
            <label
              htmlFor="history-filter-status"
              className="block text-xs font-bold text-stone-900"
            >
              Status
            </label>
            <div className="relative">
              <select
                id="history-filter-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ReportStatus | "");
                  setPage(1);
                }}
                className="h-11 w-full appearance-none rounded-xl border border-stone-200 bg-white pl-3.5 pr-9 text-xs sm:text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">Semua status</option>
                {STATUS_OPTIONS.map((opt) => (
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

          {/* Filter Kategori */}
          <div className="space-y-1.5">
            <label
              htmlFor="history-filter-category"
              className="block text-xs font-bold text-stone-900"
            >
              Kategori
            </label>
            <div className="relative">
              <select
                id="history-filter-category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value as ReportCategory | "");
                  setPage(1);
                }}
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
              htmlFor="history-filter-urgency"
              className="block text-xs font-bold text-stone-900"
            >
              Urgensi
            </label>
            <div className="relative">
              <select
                id="history-filter-urgency"
                value={urgencyFilter}
                onChange={(e) => {
                  setUrgencyFilter(e.target.value as ReportUrgency | "");
                  setPage(1);
                }}
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

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
          <p>
            Periode 1–8 Nov 2026 · {total} laporan · {filterSummaryText}
          </p>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              Atur ulang filter
            </button>
          )}
        </div>
      </Card>

      {/* State Error */}
      {!loading && errorMsg && (
        <ErrorState
          title="Gagal memuat riwayat laporan"
          message={errorMsg}
          onRetry={() =>
            fetchReports(
              page,
              debouncedSearch,
              statusFilter,
              categoryFilter,
              urgencyFilter
            )
          }
        />
      )}

      {/* State Empty */}
      {!loading && !errorMsg && items.length === 0 && (
        <EmptyState
          icon={<FileSearch className="h-6 w-6" />}
          title="Tidak ada laporan yang cocok"
          description="Coba ubah kata kunci pencarian ID tiket atau pilih filter status, kategori, dan urgensi lainnya."
          action={
            hasActiveFilter ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                Reset Filter
              </button>
            ) : undefined
          }
        />
      )}

      {/* =========================================================
          TAMPILAN DESKTOP: TABEL SELURUH LAPORAN (Figma 17)
      ========================================================= */}
      {(loading || (!errorMsg && items.length > 0)) && (
        <>
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-base font-bold text-stone-900">
                Seluruh laporan
              </h2>
              <p className="text-xs text-stone-500">
                {loading
                  ? "Memuat laporan..."
                  : `Menampilkan ${rangeStart}–${rangeEnd} dari ${total}`}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-y border-stone-200 bg-stone-50/80 text-[11px] font-bold text-stone-600">
                    <th className="py-3 pl-6 pr-3">ID Tiket</th>
                    <th className="px-3 py-3">Laporan / Kategori</th>
                    <th className="px-3 py-3">Lokasi</th>
                    <th className="px-3 py-3">Urgensi</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Tanggal</th>
                    <th className="py-3 pl-3 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-xs">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="py-4 pl-6 pr-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-3 py-4 space-y-1.5">
                          <Skeleton className="h-4 w-44" />
                          <Skeleton className="h-3 w-24" />
                        </td>
                        <td className="px-3 py-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-3 py-4">
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </td>
                        <td className="px-3 py-4">
                          <Skeleton className="h-6 w-32 rounded-full" />
                        </td>
                        <td className="px-3 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="py-4 pl-3 pr-6 text-right">
                          <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    items.map((item) => (
                      <tr
                        key={item.ticket_id}
                        className="transition-colors hover:bg-stone-50/70"
                      >
                        <td className="whitespace-nowrap py-4 pl-6 pr-3 font-extrabold text-emerald-800">
                          <Link
                            href={`/admin/verifikasi?id=${encodeURIComponent(item.ticket_id)}`}
                            className="hover:underline"
                          >
                            {formatTicket(item.ticket_id)}
                          </Link>
                        </td>

                        <td className="px-3 py-4">
                          <p className="font-bold text-stone-900">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-stone-500">
                            {item.category_label || "Belum Dikategorikan"}
                          </p>
                        </td>

                        <td className="px-3 py-4 text-stone-700">
                          {formatShortAddress(item.address_text)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          {item.urgency ? (
                            <UrgencyChip urgency={item.urgency} size="sm" />
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          <StatusChip status={item.status} size="sm" />
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-stone-600">
                          {formatDate(item.created_at)}
                        </td>

                        <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                          <Link
                            href={`/admin/verifikasi?id=${encodeURIComponent(item.ticket_id)}`}
                            aria-label={`Lihat detail laporan ${formatTicket(item.ticket_id)}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-800 transition-colors hover:bg-emerald-50 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                          >
                            <ArrowUpRight
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* =========================================================
              TAMPILAN MOBILE: DAFTAR KARTU LAPORAN (Figma 18)
          ========================================================= */}
          <div className="space-y-3.5 md:hidden">
            {loading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : (
              items.map((item) => (
                <Card key={item.ticket_id} className="space-y-2.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-emerald-800">
                      {formatTicket(item.ticket_id)}
                    </span>
                    {item.urgency && (
                      <UrgencyChip urgency={item.urgency} size="sm" />
                    )}
                  </div>

                  <h3 className="text-base font-bold leading-snug text-stone-900">
                    {item.title}
                  </h3>

                  <p className="text-xs text-stone-600">
                    {item.category_label || "Belum Dikategorikan"} ·{" "}
                    {formatShortAddress(item.address_text)}
                  </p>

                  <div className="pt-0.5">
                    <StatusChip status={item.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-stone-500">
                      {formatDate(item.created_at)}
                    </span>
                    <Link
                      href={`/admin/verifikasi?id=${encodeURIComponent(item.ticket_id)}`}
                      className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950"
                    >
                      <span>Lihat Detail</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* =========================================================
              BARIS PAGINASI
          ========================================================= */}
          {!loading && total > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">
                {rangeStart}–{rangeEnd} dari {total} laporan · Halaman{" "}
                {currentPage} dari {lastPage}
              </p>

              <div
                className="flex items-center gap-2"
                role="navigation"
                aria-label="Paginasi riwayat laporan"
              >
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Halaman sebelumnya"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                {pageNumbers.map((num) => {
                  const active = num === currentPage;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPage(num)}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                        active
                          ? "bg-emerald-800 text-white"
                          : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
                      )}
                    >
                      {num}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  aria-label="Halaman berikutnya"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
