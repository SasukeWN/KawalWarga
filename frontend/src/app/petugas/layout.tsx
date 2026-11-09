import type { Metadata } from "next";
import { PetugasGuard } from "./PetugasGuard";

export const metadata: Metadata = {
  title: "Antrean Penanganan",
};

export default function PetugasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PetugasGuard>{children}</PetugasGuard>;
}
