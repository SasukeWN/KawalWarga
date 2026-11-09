import React from "react";
import { Card, PageHeading } from "@/components/ui";

export default function AdminHistoryPlaceholderPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="BUKU BESAR LAYANAN"
        title="Riwayat & seluruh laporan."
        subtitle="Telusuri setiap laporan, dari pengajuan hingga bukti penyelesaian."
      />
      <Card className="p-6 text-sm text-stone-600">
        Halaman Riwayat Laporan Admin akan diimplementasikan pada Step 8.
      </Card>
    </div>
  );
}
