"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import clsx from "clsx";
import {
  Button,
  Card,
  ErrorState,
  PageHeading,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { ApiError, officerApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { OfficerUser } from "@/lib/types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "KW";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export default function OfficerProfilePage() {
  const { user: authUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [profile, setProfile] = useState<OfficerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Ubah Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const currentPassId = useId();
  const newPassId = useId();
  const confirmPassId = useId();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await officerApi.getProfile();
      setProfile(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Gagal memuat profil petugas. Periksa koneksi internet Anda.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    officerApi
      .getProfile()
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Gagal memuat profil petugas.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Kata sandi saat ini wajib diisi.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("Kata sandi baru harus berbeda dari kata sandi saat ini.");
      return;
    }

    setSubmittingPassword(true);
    try {
      await officerApi.updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setPasswordSuccess("Kata sandi Anda berhasil diperbarui.");
      toastSuccess(
        "Kata Sandi Diperbarui",
        "Kata sandi akun Anda telah berhasil diganti."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.errors
            ? Object.values(err.errors)[0]?.[0] || err.message
            : err.message
          : "Gagal memperbarui kata sandi. Periksa koneksi lalu coba lagi.";
      setPasswordError(msg);
      toastError("Gagal Mengubah Kata Sandi", msg);
    } finally {
      setSubmittingPassword(false);
    }
  }

  const effectiveName = profile?.name || authUser?.name || "Petugas Lapangan";
  const effectiveEmail = profile?.email || authUser?.email || "petugas@kawalwarga.id";
  const effectivePosition = profile?.position || "Petugas lapangan";
  const initials = getInitials(effectiveName);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Halaman */}
      <PageHeading
        eyebrow="PROFIL PENGGUNA"
        title="Profil & Keamanan Akun"
        subtitle="Pantau informasi akun petugas Anda dan perbarui kata sandi secara berkala untuk menjaga keamanan akses."
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : errorMessage ? (
        <ErrorState
          title="Gagal Memuat Profil"
          message={errorMessage}
          onRetry={loadProfile}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ========================================================= */}
          {/* KARTU PROFIL PENGGUNA                                     */}
          {/* ========================================================= */}
          <div className="lg:col-span-1 space-y-6">
            <Card padding="md" className="space-y-5 text-center sm:text-left">
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
                <div
                  aria-hidden="true"
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-black text-emerald-800 shadow-xs"
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-stone-900 truncate">
                    {effectiveName}
                  </h2>
                  <p className="text-xs text-stone-500 truncate mt-0.5">
                    {effectiveEmail}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                    <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                      <UserIcon className="h-3 w-3" />
                      {effectivePosition}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      <ShieldCheck className="h-3 w-3 text-emerald-700" />
                      Aktif
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between text-stone-600">
                  <span className="flex items-center gap-1.5 text-stone-500">
                    <Mail className="h-3.5 w-3.5" />
                    Email Akun
                  </span>
                  <span className="font-semibold text-stone-900 truncate max-w-[180px]">
                    {effectiveEmail}
                  </span>
                </div>

                {profile?.created_at && (
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="text-stone-500">Terdaftar Sejak</span>
                    <span className="font-semibold text-stone-900">
                      {formatDate(profile.created_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Statistik Penanganan */}
              <div className="border-t border-stone-100 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2.5">
                  Statistik Tugas Lapangan
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-orange-50/80 p-3 text-center border border-orange-100">
                    <p className="text-xl font-extrabold text-orange-900">
                      {profile?.tasks_in_progress_count ?? 0}
                    </p>
                    <p className="text-[11px] font-semibold text-orange-800 mt-0.5">
                      Sedang Diproses
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/80 p-3 text-center border border-emerald-100">
                    <p className="text-xl font-extrabold text-emerald-900">
                      {profile?.tasks_completed_count ?? 0}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                      Telah Selesai
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ========================================================= */}
          {/* FORMULIR GANTI PASSWORD                                   */}
          {/* ========================================================= */}
          <div className="lg:col-span-2">
            <Card padding="lg" className="space-y-6">
              <div className="flex items-start gap-3.5 border-b border-stone-100 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <KeyRound className="h-5 w-5 text-emerald-800" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-stone-900">
                    Perbarui Kata Sandi
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                    Ubah kata sandi akun Anda secara berkala. Pastikan kata sandi baru
                    memiliki minimal 6 karakter.
                  </p>
                </div>
              </div>

              {/* Pesan Sukses */}
              {passwordSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950 animate-in fade-in"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
                  <p>{passwordSuccess}</p>
                </div>
              )}

              {/* Pesan Error */}
              {passwordError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-950 animate-in fade-in"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <p>{passwordError}</p>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Kata Sandi Saat Ini */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={currentPassId}
                    className="block text-xs font-bold text-stone-900"
                  >
                    Kata Sandi Saat Ini <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id={currentPassId}
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan kata sandi lama Anda"
                      className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-3.5 pr-10 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      aria-label={
                        showCurrentPassword
                          ? "Sembunyikan kata sandi"
                          : "Lihat kata sandi"
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Kata Sandi Baru */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={newPassId}
                    className="block text-xs font-bold text-stone-900"
                  >
                    Kata Sandi Baru <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id={newPassId}
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-3.5 pr-10 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      aria-label={
                        showNewPassword
                          ? "Sembunyikan kata sandi"
                          : "Lihat kata sandi"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Kata Sandi Baru */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={confirmPassId}
                    className="block text-xs font-bold text-stone-900"
                  >
                    Konfirmasi Kata Sandi Baru <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id={confirmPassId}
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className={clsx(
                        "h-11 w-full rounded-xl border bg-white pl-3.5 pr-10 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2",
                        confirmPassword && confirmPassword !== newPassword
                          ? "border-rose-300 focus:border-rose-600 focus:ring-rose-600"
                          : "border-stone-200 focus:border-emerald-600 focus:ring-emerald-600"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      aria-label={
                        showConfirmPassword
                          ? "Sembunyikan kata sandi"
                          : "Lihat kata sandi"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-rose-600">
                      Konfirmasi kata sandi belum sama.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submittingPassword}
                    className="w-full sm:w-auto gap-2"
                  >
                    {submittingPassword ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    <span>
                      {submittingPassword
                        ? "Menyimpan Perubahan..."
                        : "Simpan Kata Sandi Baru"}
                    </span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
