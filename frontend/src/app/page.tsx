import Link from "next/link";
import { APP_CONFIG } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-6 md:p-8 shadow-sm text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt={APP_CONFIG.appName}
            className="h-12 w-auto object-contain"
          />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
          LAYANAN PENGADUAN MASYARAKAT
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900 mb-2">
          {APP_CONFIG.appName}
        </h1>
        <p className="text-sm text-stone-600 mb-6">
          {APP_CONFIG.agencyName} · {APP_CONFIG.regionName}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-xs font-semibold text-emerald-800">
          Setup awal proyek selesai (Step 0)
        </div>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            Beranda Layanan
          </Link>
        </div>
      </div>
    </main>
  );
}
