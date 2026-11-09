"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff, LogIn } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui";
import { APP_CONFIG } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { ApiError, isMockEnabled } from "@/lib/api";

export default function StaffLoginPage() {
  const router = useRouter();
  const { user, isReady, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Jika sudah login, langsung redirect sesuai role
  useEffect(() => {
    if (!isReady || !user) return;
    const target = user.role === "admin" ? "/admin" : "/petugas";
    router.replace(target);
  }, [isReady, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMsg("Email dan password wajib diisi.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const loggedInUser = await login({
        email: trimmedEmail,
        password,
      });
      const target = loggedInUser.role === "admin" ? "/admin" : "/petugas";
      router.replace(target);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          const firstError =
            err.errors.email?.[0] ||
            err.errors.password?.[0] ||
            err.message;
          setErrorMsg(firstError);
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(
          "Gagal terhubung ke server. Periksa koneksi Anda lalu coba lagi."
        );
      }
      setSubmitting(false);
    }
  }

  function fillDemoCredentials(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
    setErrorMsg(null);
  }

  // Selama mengecek sesi awal atau sedang redirect user yang sudah login
  if (!isReady || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12">
        <div className="w-full max-w-md space-y-5">
          <Skeleton className="mx-auto h-10 w-40 rounded-xl" />
          <Card className="space-y-5 p-6 sm:p-8">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Logo KawalWarga di Atas */}
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="inline-flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl"
          >
            <span className="inline-flex h-11 w-44 items-center overflow-hidden">
              <img
                src="/logo.png"
                alt={APP_CONFIG.appName}
                className="h-auto w-full scale-[1.12] object-cover object-center"
              />
            </span>
            <span className="mt-1 text-xs font-medium text-stone-500">
              {APP_CONFIG.agencyName} · {APP_CONFIG.regionName}
            </span>
          </Link>
        </div>

        {/* Kartu Login */}
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl">
              Masuk ke ruang kerja
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              Khusus admin dan petugas instansi.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-800"
            >
              <CircleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                aria-hidden="true"
              />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs sm:text-sm font-bold text-stone-900"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="nama@kawalwarga.test"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs sm:text-sm font-bold text-stone-900"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Masukkan password"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-3.5 pr-11 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={submitting}
                icon={<LogIn className="h-4 w-4" />}
              >
                Masuk
              </Button>
            </div>
          </form>

          {/* Info Akun Seeder Demo */}
          {isMockEnabled() && (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs">
              <p className="font-bold text-emerald-950">
                Akun Demo Instansi (Klik untuk isi otomatis):
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials("admin@kawalwarga.test")}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <span className="block font-bold text-stone-900">
                    Admin (Nadia Putri)
                  </span>
                  <span className="block truncate text-[11px] text-stone-500">
                    admin@kawalwarga.test
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials("budi@kawalwarga.test")}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <span className="block font-bold text-stone-900">
                    Petugas (Budi Santoso)
                  </span>
                  <span className="block truncate text-[11px] text-stone-500">
                    budi@kawalwarga.test
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-stone-100 pt-4 text-center">
            <Link
              href="/"
              className="inline-block text-xs sm:text-sm font-bold text-emerald-800 transition-colors hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              ← Kembali ke halaman utama
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
