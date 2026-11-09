"use client";

import React from "react";
import clsx from "clsx";
import { TriangleAlert, RotateCcw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Gagal memuat data",
  message = "Terjadi kendala saat menghubungkan ke server. Silakan periksa koneksi Anda lalu coba lagi.",
  onRetry,
  retryLabel = "Coba Lagi",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "flex flex-col items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 px-6 py-10 text-center",
        className
      )}
    >
      <div
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700"
        aria-hidden="true"
      >
        <TriangleAlert className="h-5 w-5" />
      </div>
      <h3 className="text-base md:text-lg font-bold text-rose-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-rose-700">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="danger-outline"
            size="sm"
            onClick={onRetry}
            icon={<RotateCcw className="h-4 w-4" />}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
