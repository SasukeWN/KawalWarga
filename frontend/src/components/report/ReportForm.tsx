"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, ShieldCheck, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Card, useToast } from "@/components/ui";
import { APP_CONFIG } from "@/lib/config";
import { ApiError, reportsApi } from "@/lib/api";
import { PhotoPicker } from "./PhotoPicker";
import { LocationPicker, type LocationValue } from "./LocationPicker";

export const LAST_TICKET_STORAGE_KEY = "kw_last_ticket";
export const LAST_TICKET_META_STORAGE_KEY = "kw_last_ticket_meta";

interface FormFieldErrors {
  description?: string;
  photo?: string;
  location?: string;
  reporter_phone?: string;
}

const INDONESIAN_PHONE_REGEX = /^(\+62|62|0)8[0-9]{7,13}$/;

export function ReportForm() {
  const router = useRouter();
  const { error: showToastError } = useToast();

  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [location, setLocation] = useState<LocationValue>({
    latitude: APP_CONFIG.defaultMapCenter.lat,
    longitude: APP_CONFIG.defaultMapCenter.lng,
    address_text: "Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni",
  });
  const [reporterPhone, setReporterPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validateForm(): boolean {
    const errors: FormFieldErrors = {};
    const trimmedDesc = description.trim();

    if (!trimmedDesc) {
      errors.description = "Deskripsi permasalahan wajib diisi.";
    } else if (trimmedDesc.length < 20) {
      errors.description = `Deskripsi minimal 20 karakter (saat ini ${trimmedDesc.length} karakter).`;
    } else if (trimmedDesc.length > 2000) {
      errors.description = "Deskripsi maksimal 2000 karakter.";
    }

    if (!photo) {
      errors.photo = "Foto bukti kejadian wajib diunggah.";
    }

    if (
      typeof location.latitude !== "number" ||
      Number.isNaN(location.latitude) ||
      location.latitude < -90 ||
      location.latitude > 90 ||
      typeof location.longitude !== "number" ||
      Number.isNaN(location.longitude) ||
      location.longitude < -180 ||
      location.longitude > 180
    ) {
      errors.location = "Titik lokasi kejadian pada peta tidak valid.";
    }

    const cleanedPhone = reporterPhone.trim().replace(/[\s-]/g, "");
    if (cleanedPhone && !INDONESIAN_PHONE_REGEX.test(cleanedPhone)) {
      errors.reporter_phone =
        "Format nomor WhatsApp tidak valid. Gunakan awalan 08 atau +628 (9–15 digit).";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm() || !photo) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    const cleanedPhone = reporterPhone.trim().replace(/[\s-]/g, "");

    try {
      const created = await reportsApi.createReport({
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        address_text: location.address_text?.trim() || undefined,
        photo,
        reporter_phone: cleanedPhone || undefined,
      });

      try {
        window.localStorage.setItem(LAST_TICKET_STORAGE_KEY, created.ticket_id);
        window.localStorage.setItem(
          LAST_TICKET_META_STORAGE_KEY,
          JSON.stringify(created)
        );
      } catch {
        // Abaikan bila localStorage tidak tersedia
      }

      router.push(`/terkirim/?id=${encodeURIComponent(created.ticket_id)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          const apiErrors: FormFieldErrors = {};
          if (err.errors.description?.[0]) {
            apiErrors.description = err.errors.description[0];
          }
          if (err.errors.photo?.[0]) {
            apiErrors.photo = err.errors.photo[0];
          }
          if (err.errors.latitude?.[0] || err.errors.longitude?.[0]) {
            apiErrors.location =
              err.errors.latitude?.[0] || err.errors.longitude?.[0];
          }
          if (err.errors.reporter_phone?.[0]) {
            apiErrors.reporter_phone = err.errors.reporter_phone[0];
          }
          setFieldErrors(apiErrors);
        }
        showToastError("Gagal mengirim laporan", err.message);
      } else {
        showToastError(
          "Gagal mengirim laporan",
          "Terjadi gangguan jaringan. Silakan coba beberapa saat lagi."
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-7">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            Buat laporan baru
          </h2>
          <p className="text-xs text-stone-500">
            Tanda * wajib diisi. Pastikan informasi sesuai kondisi di lapangan.
          </p>
        </div>

        {/* 1. Deskripsi */}
        <div className="space-y-2">
          <label
            htmlFor="report-description"
            className="block text-xs sm:text-sm font-bold text-stone-900"
          >
            Apa yang ingin Anda laporkan?{" "}
            <span className="text-stone-900">*</span>
          </label>
          <textarea
            id="report-description"
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (fieldErrors.description) {
                setFieldErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            placeholder="Ceritakan permasalahan di sekitar Anda secara jelas..."
            className={clsx(
              "w-full rounded-xl border bg-white p-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2",
              fieldErrors.description
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-stone-200 focus:border-emerald-600 focus:ring-emerald-600/20"
            )}
          />
          {fieldErrors.description && (
            <p className="text-xs font-medium text-rose-600" role="alert">
              {fieldErrors.description}
            </p>
          )}
        </div>

        {/* 2. Foto Bukti */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold text-stone-900">
            Foto bukti kejadian <span className="text-stone-900">*</span>
          </label>
          <PhotoPicker
            file={photo}
            onChange={(nextFile) => {
              setPhoto(nextFile);
              if (nextFile && fieldErrors.photo) {
                setFieldErrors((prev) => ({ ...prev, photo: undefined }));
              }
            }}
            error={fieldErrors.photo}
            onErrorChange={(errMsg) =>
              setFieldErrors((prev) => ({ ...prev, photo: errMsg }))
            }
          />
        </div>

        {/* 3. Lokasi Kejadian */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold text-stone-900">
            Lokasi kejadian <span className="text-stone-900">*</span>
          </label>
          <LocationPicker
            value={location}
            onChange={(nextLoc) => {
              setLocation(nextLoc);
              if (fieldErrors.location) {
                setFieldErrors((prev) => ({ ...prev, location: undefined }));
              }
            }}
            error={fieldErrors.location}
          />
        </div>

        {/* 4. Nomor WhatsApp */}
        <div className="space-y-2">
          <label
            htmlFor="report-whatsapp"
            className="block text-xs sm:text-sm font-bold text-stone-900"
          >
            Nomor WhatsApp{" "}
            <span className="font-normal text-stone-500">(opsional)</span>
          </label>
          <input
            id="report-whatsapp"
            type="tel"
            inputMode="tel"
            value={reporterPhone}
            onChange={(e) => {
              setReporterPhone(e.target.value);
              if (fieldErrors.reporter_phone) {
                setFieldErrors((prev) => ({
                  ...prev,
                  reporter_phone: undefined,
                }));
              }
            }}
            placeholder="08xxxxxxxxxx"
            className={clsx(
              "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2",
              fieldErrors.reporter_phone
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-stone-200 focus:border-emerald-600 focus:ring-emerald-600/20"
            )}
          />
          {fieldErrors.reporter_phone ? (
            <p className="text-xs font-medium text-rose-600" role="alert">
              {fieldErrors.reporter_phone}
            </p>
          ) : (
            <p className="text-xs text-stone-500">
              Opsional, untuk membantu pencarian tiket jika Anda lupa ID
              laporan.
            </p>
          )}
        </div>

        {/* Garis Pemisah & Catatan Privasi */}
        <div className="space-y-4 border-t border-stone-200 pt-4">
          <div className="flex items-start gap-2 text-xs text-stone-500">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <span>
              Data Anda hanya digunakan untuk tindak lanjut laporan. Tanpa
              login, tanpa biaya.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="relative flex h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute left-4 flex items-center">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span>{submitting ? "Mengirim Laporan..." : "Kirim Laporan"}</span>
          </button>
        </div>
      </form>
    </Card>
  );
}
