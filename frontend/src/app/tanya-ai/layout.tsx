import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tanya AI Warga",
};

export default function TanyaAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
