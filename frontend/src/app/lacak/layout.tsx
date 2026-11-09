import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lacak Laporan",
};

export default function LacakLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
