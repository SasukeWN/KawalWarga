import React from "react";
import { Card, PageHeading } from "@/components/ui";

export default function AdminDashboardPlaceholderPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="MONITORING WILAYAH"
        title="Gambaran layanan hari ini."
        subtitle="Pantau laporan masuk, persebaran masalah, dan progres penanganan."
      />
      <Card className="p-6 text-sm text-stone-600">
        Halaman Dashboard & Peta Admin akan diimplementasikan pada Step 6.
      </Card>
    </div>
  );
}
