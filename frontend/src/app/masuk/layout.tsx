import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk ke Ruang Kerja",
};

export default function MasukLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
