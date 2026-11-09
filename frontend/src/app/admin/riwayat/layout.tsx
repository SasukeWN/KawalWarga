import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riwayat Seluruh Laporan",
};

export default function RiwayatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
