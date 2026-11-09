"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  ClipboardCheck,
  Files,
  ListChecks,
  Briefcase,
  MapPin,
} from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

export type StaffRole = "admin" | "petugas";

export interface StaffUserDisplay {
  name: string;
  position: string;
  role: StaffRole;
}

export const DUMMY_STAFF_USERS: Record<StaffRole, StaffUserDisplay> = {
  admin: {
    name: "Nadia Putri",
    position: "Admin verifikator",
    role: "admin",
  },
  petugas: {
    name: "Budi Santoso",
    position: "Petugas lapangan",
    role: "petugas",
  },
};

export interface NavMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export const STAFF_MENU_ITEMS: Record<StaffRole, NavMenuItem[]> = {
  admin: [
    {
      href: "/admin",
      label: "Dashboard & Peta",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/verifikasi",
      label: "Antrean Verifikasi",
      icon: ClipboardCheck,
    },
    {
      href: "/admin/riwayat",
      label: "Riwayat Laporan",
      icon: Files,
    },
  ],
  petugas: [
    {
      href: "/petugas",
      label: "Antrean Penanganan",
      icon: ListChecks,
      exact: true,
    },
    {
      href: "/petugas/tugas-saya",
      label: "Tugas Saya",
      icon: Briefcase,
    },
  ],
};

export interface SidebarProps {
  role: StaffRole;
  user?: StaffUserDisplay;
  activePath?: string;
  onNavigate?: () => void;
  onLogout?: () => void;
  className?: string;
}

export function Sidebar({
  role,
  user,
  activePath,
  onNavigate,
  onLogout,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const currentPath = activePath ?? pathname ?? "";
  const currentUser = user ?? DUMMY_STAFF_USERS[role];
  const menuItems = STAFF_MENU_ITEMS[role];
  const groupLabel =
    role === "admin" ? "RUANG ADMIN & PIMPINAN" : "RUANG PETUGAS";

  const isItemActive = (item: NavMenuItem) => {
    const normalizedCurrent = currentPath.replace(/\/+$/, "") || "/";
    const normalizedHref = item.href.replace(/\/+$/, "") || "/";
    if (item.exact) {
      return normalizedCurrent === normalizedHref;
    }
    return (
      normalizedCurrent === normalizedHref ||
      normalizedCurrent.startsWith(`${normalizedHref}/`)
    );
  };

  return (
    <aside
      aria-label={groupLabel}
      className={clsx(
        "flex w-[260px] shrink-0 flex-col justify-between border-r border-stone-200 bg-stone-50/70 p-4",
        className
      )}
    >
      <div className="space-y-6">
        {/* Brand */}
        <div className="px-2 pt-1">
          <Link
            href={role === "admin" ? "/admin" : "/petugas"}
            onClick={onNavigate}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl"
          >
            <span className="inline-flex h-9 w-36 items-center overflow-hidden">
              <img
                src="/logo.png"
                alt={APP_CONFIG.appName}
                className="h-auto w-full scale-[1.12] object-cover object-center"
              />
            </span>
            <p className="mt-0.5 text-[11px] font-medium text-stone-500">
              {APP_CONFIG.agencyName}
            </p>
          </Link>
        </div>

        {/* Grup & Menu */}
        <div className="space-y-2">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-stone-500">
            {groupLabel}
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                    active
                      ? "bg-emerald-50 font-semibold text-emerald-800"
                      : "font-medium text-stone-700 hover:bg-stone-100"
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4 shrink-0",
                      active ? "text-emerald-700" : "text-stone-500"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Info Wilayah & Profil Bawah */}
      <div className="mt-8 space-y-4">
        <div className="rounded-2xl bg-stone-100/90 p-4">
          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold text-stone-900">
            Wilayah {APP_CONFIG.regionName}
          </p>
          <p className="mt-0.5 text-xs text-stone-500 leading-relaxed">
            Satu instansi, satu alur penanganan.
          </p>
        </div>

        <div className="border-t border-stone-200 px-2 pt-4">
          <p className="text-sm font-bold text-stone-900">{currentUser.name}</p>
          <p className="text-xs text-stone-500">{currentUser.position}</p>
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 inline-block text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              Keluar dari akun
            </button>
          ) : (
            <Link
              href="/masuk"
              onClick={onNavigate}
              className="mt-2 inline-block text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              Keluar dari akun
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
