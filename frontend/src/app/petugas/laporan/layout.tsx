import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detail & Penanganan Laporan",
};

export default function PetugasLaporanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
