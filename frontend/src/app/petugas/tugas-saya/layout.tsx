import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tugas Saya",
};

export default function TugasSayaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
