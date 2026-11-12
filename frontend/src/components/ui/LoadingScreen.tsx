"use client";

import React from "react";
import { APP_CONFIG } from "@/lib/config";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "Memuat layanan...",
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stone-50/95 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center px-4 text-center">
        {/* Box Logo KawalWarga */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute -inset-3 rounded-3xl bg-emerald-100/70 blur-md animate-pulse" />
          <div className="relative flex h-20 w-48 items-center justify-center rounded-2xl bg-white p-3 shadow-lg shadow-stone-200/60 border border-stone-200/80">
            <img
              src="/logo.png"
              alt={APP_CONFIG.appName}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>

        {/* Spinner & Keterangan Status */}
        <div className="flex items-center gap-2.5 text-stone-700">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600/25 border-t-emerald-600" />
          <span className="text-xs font-semibold tracking-wide">{message}</span>
        </div>

        <p className="mt-1 text-[11px] text-stone-500">
          {APP_CONFIG.agencyName} · {APP_CONFIG.regionName}
        </p>
      </div>
    </div>
  );
}
