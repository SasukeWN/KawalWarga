"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Leaf } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

export interface PublicHeaderProps {
  className?: string;
}

export function PublicHeader({ className }: PublicHeaderProps) {
  const pathname = usePathname();
  const isLacakActive = pathname?.startsWith("/lacak");
  const isTanyaAiActive = pathname?.startsWith("/tanya-ai");

  return (
    <header
      className={clsx(
        "sticky top-0 z-30 w-full border-b border-stone-200 bg-white",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Baris Utama (Desktop 64px, Mobile Baris 1) */}
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl"
          >
            <span className="inline-flex h-9 w-36 shrink-0 items-center overflow-hidden">
              <img
                src="/logo.png"
                alt={APP_CONFIG.appName}
                className="h-auto w-full scale-[1.12] object-cover object-center"
              />
            </span>
            <span className="hidden sm:inline-block h-6 w-px bg-stone-200" aria-hidden="true" />
            <span className="text-[11px] md:text-xs font-medium text-stone-500 leading-tight">
              {APP_CONFIG.agencyName} · {APP_CONFIG.regionName}
            </span>
          </Link>

          {/* Navigasi Kanan (Desktop) */}
          <nav
            aria-label="Navigasi publik utama"
            className="hidden md:flex items-center gap-5"
          >
            <Link
              href="/lacak"
              className={clsx(
                "text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg px-2 py-1",
                isLacakActive
                  ? "text-emerald-900 underline underline-offset-4"
                  : "text-emerald-800 hover:text-emerald-900"
              )}
            >
              Lacak Laporan
            </Link>
            <Link
              href="/tanya-ai"
              className={clsx(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                isTanyaAiActive
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-stone-200 bg-white text-emerald-900 hover:bg-stone-50"
              )}
            >
              <Leaf className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>Tanya Chatbot AI</span>
            </Link>
          </nav>
        </div>

        {/* Baris Kedua (Mobile) */}
        <nav
          aria-label="Navigasi publik seluler"
          className="flex md:hidden items-center justify-between border-t border-stone-100 py-2.5"
        >
          <Link
            href="/lacak"
            className={clsx(
              "text-xs font-semibold transition-colors py-1",
              isLacakActive ? "text-emerald-900 underline" : "text-emerald-800"
            )}
          >
            Lacak Laporan
          </Link>
          <Link
            href="/tanya-ai"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 py-1"
          >
            <Leaf className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            <span>Tanya Chatbot AI</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
