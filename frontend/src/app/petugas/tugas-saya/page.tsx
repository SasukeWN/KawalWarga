import React from "react";
import { Card, PageHeading } from "@/components/ui";

export default function OfficerMyReportsPlaceholderPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="TUGAS SAYA"
        title="Laporan dalam tanggung jawab Anda."
        subtitle="Pantau laporan yang sedang Anda kerjakan dan riwayat penanganan yang telah tuntas."
      />
      <Card className="p-6 text-sm text-stone-600">
        Halaman Tugas Saya Petugas akan diimplementasikan pada Step 9.
      </Card>
    </div>
  );
}
