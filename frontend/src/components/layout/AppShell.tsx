"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";
import { Sidebar, type StaffRole, type StaffUserDisplay } from "./Sidebar";
import { Topbar } from "./Topbar";

export interface AppShellProps {
  role: StaffRole;
  user?: StaffUserDisplay;
  activePath?: string;
  topbarTitle?: string;
  topbarSubtitle?: string;
  onLogout?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  role,
  user,
  activePath,
  topbarTitle,
  topbarSubtitle,
  onLogout,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar
          role={role}
          user={user}
          activePath={activePath}
          onLogout={onLogout}
          className="sticky top-0 h-screen"
        />
      </div>

      {/* Drawer Sidebar Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-[260px] flex-col bg-stone-50 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu navigasi"
              className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200/70 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar
              role={role}
              user={user}
              activePath={activePath}
              onNavigate={() => setMobileMenuOpen(false)}
              onLogout={onLogout}
              className="h-full border-r-0"
            />
          </div>
        </div>
      )}

      {/* Area Konten Kanan */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          role={role}
          user={user}
          title={topbarTitle}
          subtitle={topbarSubtitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
        <footer className="border-t border-stone-200/80 px-4 py-5 md:px-8">
          <div className="mx-auto max-w-6xl text-xs text-stone-500">
            {APP_CONFIG.appName} · Konsep layanan {APP_CONFIG.regionName} / Data
            pribadi digunakan hanya untuk tindak lanjut laporan.
          </div>
        </footer>
      </div>
    </div>
  );
}
