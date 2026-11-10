"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import clsx from "clsx";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeading,
  Skeleton,
  StatCard,
  useToast,
} from "@/components/ui";
import { ApiError, adminApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { OfficerSummary, OfficerUser } from "@/lib/types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "KW";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export default function AdminPetugasPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [officers, setOfficers] = useState<OfficerUser[]>([]);
  const [summary, setSummary] = useState<OfficerSummary>({
    total: 0,
    active: 0,
    suspended: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Modal Tambah Petugas
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addName, setAddName] = useState("");
  const [addPosition, setAddPosition] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Modal Konfirmasi Penangguhan / Pengaktifan
  const [targetOfficer, setTargetOfficer] = useState<OfficerUser | null>(null);
  const [targetNextStatus, setTargetNextStatus] = useState<boolean>(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();
  const positionId = useId();

  const loadOfficers = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setErrorMessage(null);

    try {
      const res = await adminApi.listOfficers();
      setOfficers(res.officers);
      setSummary(res.summary);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Gagal memuat data petugas. Periksa koneksi dan coba lagi.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    adminApi
      .listOfficers()
      .then((res) => {
        if (!isMounted) return;
        setOfficers(res.officers);
        setSummary(res.summary);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Gagal memuat data petugas. Periksa koneksi dan coba lagi.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter list
  const filteredOfficers = officers.filter((officer) => {
    const matchesSearch =
      officer.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      officer.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      officer.position.toLowerCase().includes(searchQuery.toLowerCase().trim());

    if (!matchesSearch) return false;

    if (statusFilter === "active") return officer.is_active;
    if (statusFilter === "suspended") return !officer.is_active;
    return true;
  });

  const totalTasksInProgress = officers.reduce(
    (acc, o) => acc + (o.tasks_in_progress_count || 0),
    0
  );

  async function handleCreateOfficer(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    const emailTrimmed = addEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setAddError("Email petugas wajib diisi.");
      return;
    }

    if (!addPassword || addPassword.length < 6) {
      setAddError("Kata sandi wajib diisi minimal 6 karakter.");
      return;
    }

    setSubmittingAdd(true);
    try {
      const created = await adminApi.createOfficer({
        email: emailTrimmed,
        password: addPassword,
        name: addName.trim() || undefined,
        position: addPosition.trim() || undefined,
      });

      setOfficers((prev) => [created, ...prev]);
      setSummary((prev) => ({
        ...prev,
        total: prev.total + 1,
        active: prev.active + 1,
      }));

      toastSuccess(
        "Petugas Berhasil Ditambahkan",
        `Akun petugas ${created.name} (${created.email}) siap digunakan.`
      );

      setIsAddOpen(false);
      setAddEmail("");
      setAddPassword("");
      setAddName("");
      setAddPosition("");
      setShowPassword(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          const firstErr = Object.values(err.errors)[0]?.[0];
          setAddError(firstErr || err.message);
        } else {
          setAddError(err.message);
        }
      } else {
        setAddError("Gagal menambahkan petugas. Coba beberapa saat lagi.");
      }
    } finally {
      setSubmittingAdd(false);
    }
  }

  function promptToggleStatus(officer: OfficerUser) {
    setTargetOfficer(officer);
    setTargetNextStatus(!officer.is_active);
  }

  async function handleConfirmStatusChange() {
    if (!targetOfficer) return;
    setSubmittingStatus(true);

    try {
      const updated = await adminApi.updateOfficerStatus(
        targetOfficer.id,
        targetNextStatus
      );

      setOfficers((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, is_active: updated.is_active } : o))
      );

      setSummary((prev) => ({
        ...prev,
        active: targetNextStatus ? prev.active + 1 : Math.max(0, prev.active - 1),
        suspended: targetNextStatus
          ? Math.max(0, prev.suspended - 1)
          : prev.suspended + 1,
      }));

      if (targetNextStatus) {
        toastSuccess(
          "Akun Diaktifkan Kembali",
          `Petugas ${targetOfficer.name} kini dapat login dan menerima tugas kembali.`
        );
      } else {
        toastSuccess(
          "Akun Berhasil Ditangguhkan",
          `Akses login untuk ${targetOfficer.name} telah dinonaktifkan.`
        );
      }

      setTargetOfficer(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Gagal memperbarui status akun petugas.";
      toastError("Gagal Mengubah Status", msg);
    } finally {
      setSubmittingStatus(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <PageHeading
        eyebrow="MANAJEMEN PENGGUNA"
        title="Kelola Petugas Lapangan"
        subtitle="Pantau daftar petugas instansi, beban penanganan laporan aktif, dan atur hak akses akun petugas lapangan."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => loadOfficers(false)}
              disabled={loading || refreshing}
              className="gap-2"
              title="Perbarui data"
            >
              <RefreshCw
                className={clsx("h-4 w-4", refreshing && "animate-spin")}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setAddError(null);
                setIsAddOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tambah Petugas</span>
            </Button>
          </div>
        }
      />

      {/* Ringkasan Statistik */}
      <section aria-label="Ringkasan Petugas">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Petugas"
            value={summary.total}
            helperText="Petugas terdaftar"
            dotColor="stone"
          />
          <StatCard
            label="Petugas Aktif"
            value={summary.active}
            helperText="Dapat bertugas & login"
            dotColor="emerald"
          />
          <StatCard
            label="Ditangguhkan"
            value={summary.suspended}
            helperText="Akses dinonaktifkan"
            dotColor="amber"
          />
          <StatCard
            label="Tugas Berjalan"
            value={totalTasksInProgress}
            helperText="Sedang dikerjakan di lapangan"
            dotColor="orange"
          />
        </div>
      </section>

      {/* Filter & Kontrol Pencarian */}
      <Card padding="sm" className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Input Cari */}
          <div className="relative flex-1 sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, atau jabatan petugas..."
              className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                aria-label="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-stone-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={clsx(
                "rounded-lg px-3 py-1.5 font-semibold transition-colors",
                statusFilter === "all"
                  ? "bg-white text-emerald-950 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              Semua ({summary.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={clsx(
                "rounded-lg px-3 py-1.5 font-semibold transition-colors",
                statusFilter === "active"
                  ? "bg-white text-emerald-950 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              Aktif ({summary.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("suspended")}
              className={clsx(
                "rounded-lg px-3 py-1.5 font-semibold transition-colors",
                statusFilter === "suspended"
                  ? "bg-white text-emerald-950 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              Ditangguhkan ({summary.suspended})
            </button>
          </div>
        </div>
      </Card>

      {/* Konten Utama */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : errorMessage ? (
        <ErrorState
          title="Gagal Memuat Data Petugas"
          message={errorMessage}
          onRetry={() => loadOfficers(true)}
        />
      ) : filteredOfficers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-stone-400" />}
          title={
            searchQuery || statusFilter !== "all"
              ? "Tidak Ada Petugas yang Cocok"
              : "Belum Ada Petugas Terdaftar"
          }
          description={
            searchQuery || statusFilter !== "all"
              ? "Coba sesuaikan kata kunci pencarian atau ubah filter status petugas."
              : "Tambahkan petugas lapangan pertama Anda untuk mulai membagikan tugas penanganan laporan warga."
          }
          action={
            searchQuery || statusFilter !== "all" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Reset Filter
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setAddError(null);
                  setIsAddOpen(true);
                }}
              >
                Tambah Petugas Sekarang
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/80 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Petugas
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Jabatan
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Beban Penanganan
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status Akun
                  </th>
                  <th scope="col" className="px-4 py-3.5 hidden md:table-cell">
                    Terdaftar
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOfficers.map((officer) => {
                  const initials = getInitials(officer.name);
                  return (
                    <tr
                      key={officer.id}
                      className={clsx(
                        "transition-colors hover:bg-stone-50/70",
                        !officer.is_active && "bg-stone-50/40 opacity-90"
                      )}
                    >
                      {/* Kolom Petugas (Avatar, Nama, Email) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            aria-hidden="true"
                            className={clsx(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              officer.is_active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-stone-200 text-stone-600"
                            )}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 truncate">
                              {officer.name}
                            </p>
                            <p className="text-xs text-stone-500 truncate">
                              {officer.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Jabatan */}
                      <td className="px-4 py-4 text-xs font-medium text-stone-700">
                        {officer.position}
                      </td>

                      {/* Beban Penanganan */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span
                            className={clsx(
                              "inline-flex items-center rounded-md px-2 py-0.5 font-semibold",
                              officer.tasks_in_progress_count > 0
                                ? "bg-orange-100 text-orange-800"
                                : "bg-stone-100 text-stone-600"
                            )}
                            title="Laporan yang sedang dikerjakan"
                          >
                            {officer.tasks_in_progress_count} proses
                          </span>
                          <span
                            className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800"
                            title="Laporan yang telah diselesaikan"
                          >
                            {officer.tasks_completed_count} tuntas
                          </span>
                        </div>
                      </td>

                      {/* Status Akun */}
                      <td className="px-4 py-4">
                        {officer.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-2.5 py-1 text-xs font-bold text-amber-900">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            Ditangguhkan
                          </span>
                        )}
                      </td>

                      {/* Terdaftar */}
                      <td className="px-4 py-4 text-xs text-stone-500 hidden md:table-cell">
                        {officer.created_at ? formatDate(officer.created_at) : "-"}
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4 text-right">
                        {officer.is_active ? (
                          <button
                            type="button"
                            onClick={() => promptToggleStatus(officer)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                          >
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                            <span>Tangguhkan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => promptToggleStatus(officer)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                            <span>Aktifkan</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL TAMBAH PETUGAS                                      */}
      {/* ========================================================= */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-officer-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <h2
                  id="add-officer-title"
                  className="text-lg font-extrabold text-stone-900"
                >
                  Tambah Petugas Lapangan Baru
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Masukkan email dan password untuk akun petugas baru instansi Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                aria-label="Tutup formulir"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Alert */}
            {addError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <p>{addError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateOfficer} className="space-y-4">
              {/* Email (Wajib) */}
              <div className="space-y-1.5">
                <label
                  htmlFor={emailId}
                  className="block text-xs font-bold text-stone-900"
                >
                  Alamat Email Petugas <span className="text-rose-600">*</span>
                </label>
                <input
                  id={emailId}
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="contoh: andi.lapangan@kawalwarga.id"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Password (Wajib) */}
              <div className="space-y-1.5">
                <label
                  htmlFor={passwordId}
                  className="block text-xs font-bold text-stone-900"
                >
                  Kata Sandi Sementara <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-3.5 pr-10 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  Petugas dapat mengganti kata sandi ini kapan saja dari menu profil mereka.
                </p>
              </div>

              {/* Nama Lengkap (Opsional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor={nameId}
                  className="block text-xs font-bold text-stone-900"
                >
                  Nama Lengkap Petugas{" "}
                  <span className="text-stone-400 font-normal">(Opsional)</span>
                </label>
                <input
                  id={nameId}
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="contoh: Andi Prasetyo"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-[11px] text-stone-500">
                  Jika dikosongkan, nama dibuat otomatis dari alamat email.
                </p>
              </div>

              {/* Posisi / Jabatan (Opsional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor={positionId}
                  className="block text-xs font-bold text-stone-900"
                >
                  Posisi / Jabatan{" "}
                  <span className="text-stone-400 font-normal">(Opsional)</span>
                </label>
                <input
                  id={positionId}
                  type="text"
                  value={addPosition}
                  onChange={(e) => setAddPosition(e.target.value)}
                  placeholder="Petugas lapangan"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Tombol Aksi Form */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={submittingAdd}
                  onClick={() => setIsAddOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submittingAdd}
                  className="gap-2"
                >
                  {submittingAdd && (
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  <span>{submittingAdd ? "Menyimpan..." : "Simpan Petugas"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI PENANGGUHAN / PENGAKTIFAN                */}
      {/* ========================================================= */}
      <ConfirmDialog
        open={Boolean(targetOfficer)}
        title={
          targetNextStatus
            ? `Aktifkan Kembali Akun ${targetOfficer?.name}?`
            : `Tangguhkan Akun ${targetOfficer?.name}?`
        }
        description={
          targetNextStatus
            ? `Akun petugas ${targetOfficer?.email} akan diaktifkan kembali. Petugas dapat login dan melanjutkan penanganan laporan di lapangan.`
            : `Petugas ${targetOfficer?.name} (${targetOfficer?.email}) tidak akan dapat login ke sistem. Seluruh sesi login aktif akan segera dicabut.`
        }
        confirmLabel={
          targetNextStatus
            ? submittingStatus
              ? "Mengaktifkan..."
              : "Ya, Aktifkan Akun"
            : submittingStatus
              ? "Menangguhkan..."
              : "Ya, Tangguhkan Akun"
        }
        cancelLabel="Batal"
        confirmVariant={targetNextStatus ? "primary" : "danger-outline"}
        loading={submittingStatus}
        onConfirm={handleConfirmStatusChange}
        onClose={() => {
          if (!submittingStatus) setTargetOfficer(null);
        }}
      />
    </div>
  );
}
