"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { APP_CONFIG } from "@/lib/config";

export function PageLoadProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  // 1. Muncul saat pertama kali buka web atau refresh halaman (F5)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setIsVisible(false), 400); // Tunggu animasi fade-out selesai
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  // 2. Muncul sekejap saat berpindah halaman/rute
  useEffect(() => {
    setIsVisible(true);
    setIsLoading(true);

    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setIsVisible(false), 400);
    }, 450);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {isVisible && (
        <div
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-stone-50 transition-opacity duration-400 ease-out ${
            isLoading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          role="status"
          aria-live="polite"
          aria-label="Memuat layanan KawalWarga"
        >
          <div className="flex flex-col items-center px-4 text-center">
            {/* Box Logo KawalWarga */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Efek Glow Hijau di Belakang Logo */}
              <div className="absolute -inset-3 rounded-3xl bg-emerald-100/70 blur-md animate-pulse" />

              {/* Card Logo */}
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
              <span className="text-xs font-semibold tracking-wide">
                Memuat layanan...
              </span>
            </div>

            <p className="mt-1 text-[11px] text-stone-500">
              {APP_CONFIG.agencyName} · {APP_CONFIG.regionName}
            </p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
