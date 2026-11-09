"use client";

import React from "react";
import { Card, PageHeading } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function OfficerQueuePlaceholderPage() {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Petugas";

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="ANTREAN PENANGANAN"
        title={`Selamat bertugas, ${firstName}.`}
        subtitle="Pilih laporan terverifikasi untuk mulai membantu warga hari ini."
      />
      <Card className="p-6 text-sm text-stone-600">
        Halaman Antrean Penanganan Petugas akan diimplementasikan pada Step 9.
      </Card>
    </div>
  );
}
