import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_CONFIG } from "@/lib/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_CONFIG.appName} — Layanan Pengaduan Masyarakat`,
  description: `Platform pengaduan publik berbasis AI untuk ${APP_CONFIG.agencyName} ${APP_CONFIG.regionName}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body
        className={`${inter.className} min-h-full flex flex-col bg-stone-50 text-stone-900`}
      >
        {children}
      </body>
    </html>
  );
}
