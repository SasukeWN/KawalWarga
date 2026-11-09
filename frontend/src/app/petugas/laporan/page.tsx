import React from "react";
import { Card, PageHeading } from "@/components/ui";

export default function OfficerReportDetailPlaceholderPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="DETAIL LAPORAN"
        title="Penanganan laporan lapangan."
        subtitle="Periksa kondisi dan lokasi sebelum mengambil tanggung jawab penanganan."
      />
      <Card className="p-6 text-sm text-stone-600">
        Halaman Detail & Penyelesaian Laporan Petugas akan diimplementasikan
        pada Step 10.
      </Card>
    </div>
  );
}
