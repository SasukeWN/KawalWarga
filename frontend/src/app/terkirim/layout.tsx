import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laporan Terkirim",
};

export default function TerkirimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
