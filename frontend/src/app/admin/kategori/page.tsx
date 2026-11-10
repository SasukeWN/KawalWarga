"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import {
  Plus,
  Tags,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  X,
  Info,
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
import { ApiError, categoriesApi } from "@/lib/api";
import { registerCategoryLabels } from "@/lib/labels";
import type { AdminCategory } from "@/lib/types";

export default function AdminKategoriPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Tambah
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Modal Edit
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(
    null
  );
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal Konfirmasi Hapus
  const [deletingCategory, setDeletingCategory] =
    useState<AdminCategory | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Toggling status per item
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const addLabelId = useId();
  const addDescId = useId();
  const editLabelId = useId();
  const editDescId = useId();

  const refreshCategories = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setErrorMessage(null);

    try {
      const data = await categoriesApi.listAll();
      setCategories(data);
      registerCategoryLabels(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "Gagal memuat daftar kategori. Periksa koneksi dan coba lagi."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    categoriesApi
      .listAll()
      .then((data) => {
        if (!isMounted) return;
        setCategories(data);
        registerCategoryLabels(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage(
            "Gagal memuat daftar kategori. Periksa koneksi dan coba lagi."
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handler Tambah
  function openAddModal() {
    setAddLabel("");
    setAddDescription("");
    setAddError(null);
    setIsAddOpen(true);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLabel = addLabel.trim();
    if (!trimmedLabel) {
      setAddError("Nama kategori wajib diisi.");
      return;
    }
    if (trimmedLabel.length < 3) {
      setAddError("Nama kategori minimal 3 karakter.");
      return;
    }

    setSubmittingAdd(true);
    setAddError(null);

    try {
      const created = await categoriesApi.create({
        label: trimmedLabel,
        description: addDescription.trim() || undefined,
      });

      toastSuccess(
        "Kategori berhasil ditambahkan",
        `Kategori "${created.label}" kini aktif dan dapat dipilih oleh warga.`
      );
      setIsAddOpen(false);
      await refreshCategories(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setAddError(err.message);
      } else {
        setAddError("Terjadi kesalahan sistem saat menyimpan kategori.");
      }
    } finally {
      setSubmittingAdd(false);
    }
  }

  // Handler Edit
  function openEditModal(cat: AdminCategory) {
    setEditingCategory(cat);
    setEditLabel(cat.label);
    setEditDescription(cat.description || "");
    setEditIsActive(cat.is_active);
    setEditError(null);
  }

  async function handleUpdateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;

    const trimmedLabel = editLabel.trim();
    if (!trimmedLabel) {
      setEditError("Nama kategori tidak boleh kosong.");
      return;
    }

    setSubmittingEdit(true);
    setEditError(null);

    try {
      const updated = await categoriesApi.update(editingCategory.value, {
        label: trimmedLabel,
        description: editDescription.trim() || null,
        is_active: editIsActive,
      });

      toastSuccess(
        "Perubahan disimpan",
        `Kategori "${updated.label}" berhasil diperbarui.`
      );
      setEditingCategory(null);
      await refreshCategories(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(err.message);
      } else {
        setEditError("Gagal memperbarui kategori.");
      }
    } finally {
      setSubmittingEdit(false);
    }
  }

  // Handler Toggle Status Langsung
  async function handleToggleStatus(cat: AdminCategory) {
    if (togglingSlug) return;
    setTogglingSlug(cat.value);

    const nextStatus = !cat.is_active;

    try {
      await categoriesApi.update(cat.value, {
        is_active: nextStatus,
      });

      toastSuccess(
        nextStatus ? "Kategori diaktifkan" : "Kategori dinonaktifkan",
        nextStatus
          ? `Kategori "${cat.label}" kini dapat dipilih warga di formulir.`
          : `Kategori "${cat.label}" dinonaktifkan dari formulir warga.`
      );
      await refreshCategories(false);
    } catch (err) {
      toastError(
        "Gagal mengubah status kategori",
        err instanceof Error ? err.message : "Terjadi gangguan server."
      );
    } finally {
      setTogglingSlug(null);
    }
  }

  // Handler Hapus
  async function handleConfirmDelete() {
    if (!deletingCategory) return;

    setSubmittingDelete(true);
    try {
      await categoriesApi.remove(deletingCategory.value);
      toastSuccess(
        "Kategori dihapus",
        `Kategori "${deletingCategory.label}" berhasil dihapus permanen.`
      );
      setDeletingCategory(null);
      await refreshCategories(false);
    } catch (err) {
      toastError(
        "Gagal menghapus kategori",
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setSubmittingDelete(false);
    }
  }

  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.is_active).length;
  const totalReportsUsage = categories.reduce(
    (acc, c) => acc + (c.reports_count || 0),
    0
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-8">
      {/* Header Halaman */}
      <PageHeading
        eyebrow="PANEL ADMINISTRATOR"
        title="Kelola Kategori Laporan"
        subtitle="Atur kategori permasalahan fasilitas kota. Kategori aktif otomatis tersedia pada formulir pelaporan warga dan menjadi panduan bagi analisis AI."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={
                <RefreshCw
                  className={clsx("h-4 w-4", refreshing && "animate-spin")}
                />
              }
              onClick={() => refreshCategories(false)}
              disabled={loading || refreshing}
            >
              Segarkan
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={openAddModal}
            >
              Tambah Kategori
            </Button>
          </div>
        }
      />

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Kategori"
          value={loading ? "..." : totalCategories}
          helperText="Kategori tersimpan di basis data"
          dotColor="stone"
        />
        <StatCard
          label="Kategori Aktif"
          value={loading ? "..." : activeCategories}
          helperText="Dapat dipilih oleh warga & AI"
          dotColor="emerald"
        />
        <StatCard
          label="Total Laporan Terkait"
          value={loading ? "..." : totalReportsUsage}
          helperText="Laporan yang menggunakan kategori ini"
          dotColor="orange"
        />
      </div>

      {/* Catatan / Panduan untuk Admin */}
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs text-emerald-900 md:text-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div className="space-y-1">
          <p className="font-semibold text-emerald-950">
            Panduan Integritas Data & AI:
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-stone-700">
            <li>
              Kategori yang ditambahkan di sini akan otomatis muncul sebagai
              pilihan di formulir pelaporan warga serta pada filter riwayat dan
              antrean verifikasi.
            </li>
            <li>
              Kategori yang telah memiliki riwayat laporan warga tidak dapat
              dihapus demi keutuhan data statistik, namun dapat dinonaktifkan
              kapan saja.
            </li>
            <li>
              AI secara otomatis mempelajari seluruh kategori aktif untuk
              mendeteksi jenis laporan secara akurat saat warga mengunggah foto
              dan deskripsi.
            </li>
          </ul>
        </div>
      </div>

      {/* Konten Utama */}
      {loading ? (
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </Card>
      ) : errorMessage ? (
        <ErrorState
          title="Gagal Memuat Kategori"
          message={errorMessage}
          onRetry={() => refreshCategories(true)}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tags className="h-6 w-6" />}
          title="Belum Ada Kategori"
          description="Tambahkan kategori pertama untuk mulai mengorganisasi laporan warga."
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={openAddModal}
            >
              Tambah Kategori Sekarang
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-stone-200 bg-stone-50/50 px-6 py-4">
            <h2 className="text-base font-bold text-stone-900">
              Daftar Kategori ({categories.length})
            </h2>
            <p className="text-xs text-stone-500">
              Klik &quot;Nonaktifkan&quot; untuk menyembunyikan dari pilihan
              warga tanpa menghapus riwayat laporan lampau.
            </p>
          </div>

          <div className="divide-y divide-stone-200">
            {categories.map((cat) => {
              const isToggling = togglingSlug === cat.value;
              const hasReports = (cat.reports_count ?? 0) > 0;

              return (
                <div
                  key={cat.value}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-stone-50/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Info Kategori */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm sm:text-base">
                        {cat.label}
                      </span>

                      {/* Badge Status */}
                      {cat.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
                          <XCircle className="h-3 w-3" />
                          Nonaktif
                        </span>
                      )}

                      {/* Badge Kode Slug */}
                      <code className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                        {cat.value}
                      </code>
                    </div>

                    <p className="text-xs text-stone-600 sm:text-sm">
                      {cat.description || (
                        <span className="italic text-stone-400">
                          Tidak ada deskripsi.
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-stone-400" />
                        <strong className="text-stone-800">
                          {cat.reports_count ?? 0}
                        </strong>{" "}
                        laporan terkait
                      </span>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    {/* Toggle Status Aktif */}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleStatus(cat)}
                      className={clsx(
                        "inline-flex h-9 items-center rounded-xl border px-3 text-xs font-semibold transition-colors disabled:opacity-50",
                        cat.is_active
                          ? "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      )}
                    >
                      {isToggling
                        ? "Memproses..."
                        : cat.is_active
                        ? "Nonaktifkan"
                        : "Aktifkan"}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => openEditModal(cat)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Hapus (Hanya bila belum pernah digunakan) */}
                    <button
                      type="button"
                      disabled={hasReports}
                      onClick={() => setDeletingCategory(cat)}
                      title={
                        hasReports
                          ? `Tidak dapat dihapus karena digunakan oleh ${cat.reports_count} laporan. Anda dapat menonaktifkannya.`
                          : "Hapus kategori ini secara permanen"
                      }
                      className={clsx(
                        "inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-xs font-semibold transition-colors",
                        hasReports
                          ? "border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed"
                          : "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modal Tambah Kategori Baru */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Tags className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  Tambah Kategori Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={submittingAdd}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor={addLabelId}
                  className="block text-xs font-bold text-stone-900"
                >
                  Nama Kategori <span className="text-rose-600">*</span>
                </label>
                <input
                  id={addLabelId}
                  type="text"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder="Contoh: Pohon Tumbang, Saluran Mampet"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={addDescId}
                  className="block text-xs font-bold text-stone-900"
                >
                  Deskripsi Kategori{" "}
                  <span className="font-normal text-stone-500">(opsional)</span>
                </label>
                <textarea
                  id={addDescId}
                  rows={3}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Penjelasan ringkas mengenai permasalahan yang masuk kategori ini..."
                  className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {addError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  disabled={submittingAdd}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={submittingAdd}
                >
                  Simpan Kategori
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Kategori */}
      {editingCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Edit2 className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  Edit Kategori
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                disabled={submittingEdit}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="mt-4 space-y-4">
              <div className="space-y-1">
                <span className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Kode Sistem (Slug)
                </span>
                <code className="block rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-700 font-mono">
                  {editingCategory.value}
                </code>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={editLabelId}
                  className="block text-xs font-bold text-stone-900"
                >
                  Nama Kategori <span className="text-rose-600">*</span>
                </label>
                <input
                  id={editLabelId}
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={editDescId}
                  className="block text-xs font-bold text-stone-900"
                >
                  Deskripsi Kategori{" "}
                  <span className="font-normal text-stone-500">(opsional)</span>
                </label>
                <textarea
                  id={editDescId}
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                />
                <label
                  htmlFor="edit-is-active"
                  className="text-xs font-semibold text-stone-800 cursor-pointer"
                >
                  Aktifkan kategori ini (tampil pada formulir warga)
                </label>
              </div>

              {editError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingCategory(null)}
                  disabled={submittingEdit}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={submittingEdit}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title="Hapus Kategori Laporan?"
        description={`Apakah Anda yakin ingin menghapus kategori "${deletingCategory?.label}" secara permanen? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Kategori"
        confirmVariant="danger-outline"
        loading={submittingDelete}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingCategory(null)}
      />
    </div>
  );
}
