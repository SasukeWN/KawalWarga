"use client";

import React from "react";
import clsx from "clsx";
import { Bell, Menu } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";
import {
  DUMMY_STAFF_USERS,
  type StaffRole,
  type StaffUserDisplay,
} from "./Sidebar";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "KW";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export interface TopbarProps {
  role: StaffRole;
  user?: StaffUserDisplay;
  title?: string;
  subtitle?: string;
  onOpenMobileMenu?: () => void;
  className?: string;
}

export function Topbar({
  role,
  user,
  title,
  subtitle,
  onOpenMobileMenu,
  className,
}: TopbarProps) {
  const currentUser = user ?? DUMMY_STAFF_USERS[role];
  const defaultTitle =
    role === "admin" ? "Pusat kendali layanan" : "Ruang kerja petugas";
  const defaultSubtitle = `${APP_CONFIG.agencyName} · ${APP_CONFIG.regionName}`;
  const mobileRoleSubtitle =
    role === "admin" ? "Admin & Pimpinan" : "Petugas Lapangan";
  const initials = getInitials(currentUser.name);

  return (
    <header
      className={clsx(
        "sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-stone-200 bg-white px-4 md:px-8",
        className
      )}
    >
      {/* Kiri: Hamburger (Mobile) + Judul */}
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Buka menu navigasi"
            className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Tampilan Desktop */}
        <div className="hidden lg:block min-w-0">
          <p className="text-base font-bold text-stone-900 truncate">
            {title ?? defaultTitle}
          </p>
          <p className="text-xs text-stone-500 truncate">
            {subtitle ?? defaultSubtitle}
          </p>
        </div>

        {/* Tampilan Mobile */}
        <div className="block lg:hidden min-w-0">
          <p className="text-sm font-bold text-stone-900 truncate">
            {APP_CONFIG.appName}
          </p>
          <p className="text-[11px] text-stone-500 truncate">
            {mobileRoleSubtitle}
          </p>
        </div>
      </div>

      {/* Kanan: Lonceng dekoratif + Avatar Inisial */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifikasi"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div
          title={`${currentUser.name} (${currentUser.position})`}
          aria-label={`Profil ${currentUser.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
