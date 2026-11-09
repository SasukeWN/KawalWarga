"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { clsx } from "clsx";
import { compressImage } from "@/lib/image";

export interface PhotoPickerProps {
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  onErrorChange?: (errorMsg?: string) => void;
  title?: string;
  subtitle?: string;
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 0.1) {
    return `${mb.toFixed(1).replace(".", ",")} MB`;
  }
  const kb = Math.max(1, Math.round(bytes / 1024));
  return `${kb} KB`;
}

export function PhotoPicker({
  file,
  onChange,
  error,
  onErrorChange,
  title = "Unggah foto atau ambil langsung",
  subtitle = "JPG atau PNG · Maksimal 10 MB",
}: PhotoPickerProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      const msg =
        "Format file tidak didukung. Harap unggah foto berformat JPG atau PNG.";
      setLocalError(msg);
      onErrorChange?.(msg);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      const msg = "Ukuran foto melebihi batas maksimal 10 MB.";
      setLocalError(msg);
      onErrorChange?.(msg);
      return;
    }

    setLocalError(undefined);
    onErrorChange?.(undefined);
    setCompressing(true);

    try {
      const compressed = await compressImage(selected);
      onChange(compressed);
    } catch {
      onChange(selected);
    } finally {
      setCompressing(false);
    }
  }

  function handleRemove() {
    setLocalError(undefined);
    onErrorChange?.(undefined);
    onChange(null);
  }

  const displayedError = error || localError;

  return (
    <div className="space-y-2.5">
      {/* Area Dashed Hijau */}
      <div
        className={clsx(
          "rounded-2xl border border-dashed p-5 text-center transition-colors",
          displayedError
            ? "border-rose-300 bg-rose-50/40"
            : "border-emerald-300 bg-emerald-50/60"
        )}
      >
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center text-emerald-700">
          {compressing ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-6 w-6" aria-hidden="true" />
          )}
        </div>

        <p className="text-sm font-bold text-stone-900">
          {compressing ? "Mengompres foto..." : title}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={compressing}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs sm:text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
          >
            <ImagePlus
              className="h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <span>Pilih Foto</span>
          </button>

          <button
            type="button"
            disabled={compressing}
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs sm:text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
          >
            <Camera
              className="h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <span>Kamera</span>
          </button>
        </div>
      </div>

      {/* Preview File Terpilih */}
      {file && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-2.5 sm:p-3">
          <div className="flex min-w-0 items-center gap-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Pratinjau ${file.name}`}
                className="h-12 w-16 shrink-0 rounded-lg border border-stone-200 object-cover"
              />
            ) : (
              <div className="h-12 w-16 shrink-0 rounded-lg bg-stone-100" />
            )}
            <div className="min-w-0">
              <p className="truncate text-xs sm:text-sm font-bold text-stone-900">
                {file.name}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {formatFileSize(file.size)} · Siap diunggah
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            aria-label="Hapus foto"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {displayedError && (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {displayedError}
        </p>
      )}
    </div>
  );
}
