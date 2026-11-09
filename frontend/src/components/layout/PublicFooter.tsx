import React from "react";
import Link from "next/link";
import clsx from "clsx";
import { APP_CONFIG } from "@/lib/config";

export interface PublicFooterProps {
  className?: string;
  showStaffLoginLink?: boolean;
}

export function PublicFooter({
  className,
  showStaffLoginLink = true,
}: PublicFooterProps) {
  return (
    <footer
      className={clsx(
        "w-full border-t border-stone-200/80 bg-stone-50 py-6",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <p>
          {APP_CONFIG.appName} · Konsep layanan {APP_CONFIG.regionName}{" "}
          <span className="hidden sm:inline">/</span>{" "}
          <span className="block sm:inline">
            Data pribadi digunakan hanya untuk tindak lanjut laporan.
          </span>
        </p>
        {showStaffLoginLink && (
          <Link
            href="/masuk"
            className="shrink-0 font-medium text-stone-500 hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
          >
            Masuk Petugas/Admin
          </Link>
        )}
      </div>
    </footer>
  );
}
