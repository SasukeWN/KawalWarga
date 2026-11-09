import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Antrean Verifikasi",
};

export default function VerifikasiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
