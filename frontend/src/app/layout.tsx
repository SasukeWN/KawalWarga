import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_CONFIG } from "@/lib/config";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_CONFIG.appName} — Layanan Pengaduan Masyarakat`,
    template: `%s · ${APP_CONFIG.appName}`,
  },
  description: `Platform pengaduan publik berbasis AI untuk ${APP_CONFIG.agencyName} ${APP_CONFIG.regionName}.`,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.png", sizes: "500x500", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
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
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
