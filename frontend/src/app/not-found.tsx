import Link from "next/link";
import { APP_CONFIG } from "@/lib/config";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 md:p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-bold text-lg">
          404
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
          {APP_CONFIG.appName}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 mb-2">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-stone-600 mb-6">
          Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
          Silakan kembali ke halaman utama layanan {APP_CONFIG.regionName}.
        </p>
        <Link
          href="/"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          Kembali ke Halaman Utama
        </Link>
      </div>
    </main>
  );
}
