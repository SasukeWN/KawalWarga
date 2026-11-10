import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Kategori Laporan",
};

export default function AdminKategoriLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
