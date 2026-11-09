import React from "react";
import { Card, PageHeading } from "@/components/ui";

export default function AdminVerificationPlaceholderPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="VERIFIKASI LAPORAN"
        title="Periksa bukti. Putuskan dengan yakin."
        subtitle="AI membantu menganalisis. Keputusan akhir tetap dibuat oleh admin."
      />
      <Card className="p-6 text-sm text-stone-600">
        Halaman Antrean Verifikasi Admin akan diimplementasikan pada Step 7.
      </Card>
    </div>
  );
}
