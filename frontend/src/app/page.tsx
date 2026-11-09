import Link from "next/link";
import { APP_CONFIG } from "@/lib/config";
import { PublicHeader, PublicFooter } from "@/components/layout";
import { Card, Eyebrow } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12 md:px-6">
        <Card className="w-full max-w-xl text-center space-y-4" padding="lg">
          <Eyebrow>LAYANAN PENGADUAN MASYARAKAT</Eyebrow>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900">
            Lingkungan lebih baik, dimulai dari laporan Anda.
          </h1>
          <p className="text-sm text-stone-600">
            {APP_CONFIG.agencyName} · {APP_CONFIG.regionName}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/design-kit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              Buka Design Kit (Step 1)
            </Link>
          </div>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
