"use client";

import React, { useState } from "react";
import {
  Send,
  Search,
  Leaf,
  Check,
  TriangleAlert,
  Sparkles,
  Copy,
  ArrowRight,
  HardHat,
  ShieldCheck,
  LogIn,
  LogOut,
  Bot,
} from "lucide-react";
import {
  Button,
  Card,
  StatusChip,
  UrgencyChip,
  Eyebrow,
  PageHeading,
  Skeleton,
  CardSkeleton,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  useToast,
  Stepper,
  Timeline,
  StatCard,
  type TimelineEntry,
} from "@/components/ui";
import {
  PublicHeader,
  PublicFooter,
  AppShell,
  type StaffRole,
} from "@/components/layout";
import {
  STATUS_OPTIONS,
  URGENCY_OPTIONS,
  CATEGORY_OPTIONS,
  CATEGORY_CONFIG,
  type ReportStatus,
} from "@/lib/labels";
import {
  formatDateTime,
  formatDate,
  formatTicket,
  normalizeTicketInput,
} from "@/lib/format";
import {
  reportsApi,
  adminApi,
  officerApi,
  chatbotApi,
  ApiError,
  isMockEnabled,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haversine, formatDistanceKm } from "@/lib/geo";
import type { ChatbotResponse, TrackedReport } from "@/lib/types";

type ShellPreviewMode = "public" | "admin" | "petugas";

const SAMPLE_TIMELINE: TimelineEntry[] = [
  {
    event: "taken",
    title: "Petugas mulai menangani",
    description:
      "Budi Santoso melakukan pengecekan dan persiapan perbaikan.",
    at: "2026-11-08T09:15:00+07:00",
  },
  {
    event: "verified",
    title: "Laporan siap ditangani",
    description: "Admin menyetujui laporan. Menunggu Penanganan.",
    at: "2026-11-08T08:30:00+07:00",
  },
  {
    event: "submitted",
    title: "Laporan diterima",
    description: "Laporan masuk dan menunggu verifikasi admin.",
    at: "2026-11-07T16:40:00+07:00",
  },
];

export default function DesignKitPage() {
  const { success, error, info } = useToast();
  const { user, isReady, login, logout } = useAuth();
  const [shellMode, setShellMode] = useState<ShellPreviewMode>("public");
  const [stepperStatus, setStepperStatus] =
    useState<ReportStatus>("diproses");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [ticketInputDemo, setTicketInputDemo] = useState(" #adu-204 ");

  // State untuk uji API & Mock Step 2
  const [apiLoading, setApiLoading] = useState(false);
  const [trackedResult, setTrackedResult] = useState<TrackedReport | null>(
    null
  );
  const [chatResult, setChatResult] = useState<ChatbotResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  async function handleTestTrack(ticketId: string) {
    setApiLoading(true);
    try {
      const data = await reportsApi.trackReport(ticketId);
      setTrackedResult(data);
      success(
        `Berhasil memuat ${formatTicket(data.ticket_id)}`,
        `Status saat ini: ${data.status_label}`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Gagal memuat tiket.";
      error("Gagal Lacak Tiket", msg);
    } finally {
      setApiLoading(false);
    }
  }

  async function handleTestStatefulApprove() {
    setApiLoading(true);
    try {
      await adminApi.approve("ADU-204", {
        category: "jalan_rusak",
        urgency: "darurat",
        note: "Disetujui dari halaman uji kit (stateful mock).",
      });
      const updated = await reportsApi.trackReport("ADU-204");
      setTrackedResult(updated);
      success(
        "Laporan #ADU-204 disetujui!",
        `Status berubah ke: ${updated.status_label}`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Gagal menyetujui laporan.";
      error("Konflik / Error API", msg);
    } finally {
      setApiLoading(false);
    }
  }

  async function handleTestStatefulTake() {
    setApiLoading(true);
    try {
      await officerApi.take("ADU-198");
      const updated = await reportsApi.trackReport("ADU-198");
      setTrackedResult(updated);
      success(
        "Laporan #ADU-198 diambil petugas!",
        `Status berubah ke: ${updated.status_label}`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Gagal mengambil laporan.";
      error("Konflik / Error API", msg);
    } finally {
      setApiLoading(false);
    }
  }

  async function handleTestChatbot() {
    setApiLoading(true);
    try {
      const res = await chatbotApi.sendMessage({
        message: "Cek laporan saya #ADU-891",
      });
      setChatResult(res);
      success(
        "Balasan Chatbot AI diterima",
        `Membawa ${res.tickets.length} kartu tiket.`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Gagal menghubungi chatbot.";
      error("Error Chatbot", msg);
    } finally {
      setApiLoading(false);
    }
  }

  async function handleQuickLogin(email: string) {
    setAuthLoading(true);
    try {
      const loggedIn = await login({ email, password: "password123" });
      success(
        `Login berhasil sebagai ${loggedIn.name}`,
        `Role: ${loggedIn.role} (${loggedIn.position})`
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal login.";
      error("Login Gagal", msg);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleQuickLogout() {
    setAuthLoading(true);
    try {
      await logout();
      info("Logout berhasil", "Token & data user dihapus dari localStorage.");
    } finally {
      setAuthLoading(false);
    }
  }

  const demoDistanceKm = haversine(-6.2088, 106.8456, -6.2142, 106.8431);

  const kitContent = (
    <div className="space-y-10">
      {/* Banner Dev Only + Switcher Layout Shell */}
      <Card
        variant="mint"
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
            DEV ONLY · STEP 1 & STEP 2
          </div>
          <h2 className="text-base font-bold text-stone-900">
            KawalWarga Design System, Layout Shell & API Mock Showcase
          </h2>
          <p className="text-xs text-stone-600">
            Gunakan tombol di kanan untuk menguji tampilan{" "}
            <strong>Public Layout</strong>,{" "}
            <strong>AppShell Admin</strong>, dan{" "}
            <strong>AppShell Petugas</strong> (termasuk drawer mobile).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={shellMode === "public" ? "primary" : "secondary"}
            onClick={() => setShellMode("public")}
          >
            Layout Publik (Warga)
          </Button>
          <Button
            size="sm"
            variant={shellMode === "admin" ? "primary" : "secondary"}
            onClick={() => setShellMode("admin")}
          >
            AppShell Admin
          </Button>
          <Button
            size="sm"
            variant={shellMode === "petugas" ? "primary" : "secondary"}
            onClick={() => setShellMode("petugas")}
          >
            AppShell Petugas
          </Button>
        </div>
      </Card>

      {/* STEP 2: Tes API Layer, Mock Stateful & Auth Context */}
      <section className="space-y-3">
        <Eyebrow>STEP 2 · TES API LAYER, STATEFUL MOCK & AUTH CONTEXT</Eyebrow>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-stone-900">
                Uji Lacak Laporan & Transisi Stateful
              </h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Mock: {isMockEnabled() ? "AKTIF" : "NONAKTIF"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                loading={apiLoading}
                onClick={() => handleTestTrack("ADU-891")}
              >
                Tes API: Lacak #ADU-891 (Diproses)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={apiLoading}
                onClick={() => handleTestTrack("ADU-204")}
              >
                Lacak #ADU-204 (Baru)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={apiLoading}
                onClick={() => handleTestTrack("ADU-176")}
              >
                Lacak #ADU-176 (Selesai)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={apiLoading}
                onClick={() => handleTestTrack("ADU-183")}
              >
                Lacak #ADU-183 (Ditolak)
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-3">
              <Button
                size="sm"
                variant="secondary"
                loading={apiLoading}
                icon={<Check className="h-3.5 w-3.5 text-emerald-700" />}
                onClick={handleTestStatefulApprove}
              >
                Simulasi Admin Setujui #ADU-204
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={apiLoading}
                icon={<HardHat className="h-3.5 w-3.5 text-orange-600" />}
                onClick={handleTestStatefulTake}
              >
                Simulasi Petugas Ambil #ADU-198
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={apiLoading}
                icon={<Bot className="h-3.5 w-3.5 text-emerald-700" />}
                onClick={handleTestChatbot}
              >
                Tes Chatbot (#ADU-891)
              </Button>
            </div>

            {trackedResult && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">
                    {formatTicket(trackedResult.ticket_id)} —{" "}
                    {trackedResult.title}
                  </span>
                  <StatusChip status={trackedResult.status} size="sm" />
                </div>
                <p className="text-stone-600">{trackedResult.description}</p>
                <p className="text-stone-500">
                  Lokasi: {trackedResult.location.address_text} · Diterima:{" "}
                  {formatDateTime(trackedResult.received_at)}
                </p>
              </div>
            )}

            {chatResult && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs space-y-2">
                <p className="font-bold text-stone-900">
                  Balasan Chatbot AI:
                </p>
                <p className="text-stone-700">{chatResult.reply}</p>
                {chatResult.tickets.map((t) => (
                  <div
                    key={t.ticket_id}
                    className="flex items-center justify-between rounded-lg bg-white p-2 border border-stone-200"
                  >
                    <span className="font-semibold text-stone-900">
                      {formatTicket(t.ticket_id)} · {t.title}
                    </span>
                    <StatusChip status={t.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Uji Auth Context (localStorage kw_token & kw_user)
            </h3>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs space-y-1.5">
              <p>
                <span className="text-stone-500">isReady:</span>{" "}
                <strong>{isReady ? "true" : "false"}</strong>
              </p>
              <p>
                <span className="text-stone-500">User aktif:</span>{" "}
                <strong>
                  {user
                    ? `${user.name} (${user.role} — ${user.position})`
                    : "Belum login (Tamu)"}
                </strong>
              </p>
              <p>
                <span className="text-stone-500">Uji Haversine (geo.ts):</span>{" "}
                <strong>{formatDistanceKm(demoDistanceKm)}</strong>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                loading={authLoading}
                icon={<LogIn className="h-3.5 w-3.5" />}
                onClick={() => handleQuickLogin("admin@kawalwarga.test")}
              >
                Login Admin (Nadia Putri)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={authLoading}
                icon={<LogIn className="h-3.5 w-3.5" />}
                onClick={() => handleQuickLogin("budi@kawalwarga.test")}
              >
                Login Petugas (Budi Santoso)
              </Button>
              {user && (
                <Button
                  size="sm"
                  variant="danger-outline"
                  loading={authLoading}
                  icon={<LogOut className="h-3.5 w-3.5" />}
                  onClick={handleQuickLogout}
                >
                  Logout
                </Button>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* 1. Eyebrow & PageHeading */}
      <section className="space-y-4">
        <PageHeading
          eyebrow="LAYANAN PENGADUAN MASYARAKAT"
          title="Lingkungan lebih baik, dimulai dari laporan Anda."
          subtitle="Temukan masalah prasarana atau kebersihan? Ceritakan kepada kami. Anda bisa melapor tanpa membuat akun."
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={<Copy className="h-4 w-4" />}
              onClick={() => success("ID tiket disalin", "#ADU-204")}
            >
              Salin Contoh Tiket
            </Button>
          }
        />
      </section>

      {/* 2. StatCard (5 Kartu Dashboard Admin) */}
      <section className="space-y-3">
        <Eyebrow>KOMPONEN STATCARD</Eyebrow>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard
            className="col-span-2 lg:col-span-1"
            label="Total Laporan Masuk"
            value={200}
            helperText="Termasuk 16 menunggu penanganan"
            dotColor="emerald"
          />
          <StatCard
            label="Menunggu Verifikasi"
            value={24}
            helperText="Perlu keputusan admin"
            dotColor="stone"
          />
          <StatCard
            label="Sedang Diproses Petugas"
            value={40}
            helperText="Dikerjakan di lapangan"
            dotColor="orange"
          />
          <StatCard
            label="Selesai Ditangani"
            value={110}
            helperText="55% dari seluruh laporan"
            dotColor="emerald"
          />
          <StatCard
            label="Laporan Ditolak"
            value={10}
            helperText="Dengan alasan verifikasi"
            dotColor="rose"
          />
        </div>
      </section>

      {/* 3. Button Variants */}
      <section className="space-y-3">
        <Eyebrow>KOMPONEN BUTTON</Eyebrow>
        <Card className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Send className="h-4 w-4" />}>
              Kirim Laporan (Primary)
            </Button>
            <Button variant="secondary" icon={<Search className="h-4 w-4" />}>
              Lacak Laporan (Secondary)
            </Button>
            <Button variant="danger-outline">
              Tolak Laporan (Danger Outline)
            </Button>
            <Button
              variant="ghost"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Lihat Detail (Ghost)
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
            <Button variant="primary" loading>
              Mengirim Laporan...
            </Button>
            <Button variant="primary" disabled showLockWhenDisabled>
              Tandai Selesai (Disabled + Gembok)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Leaf className="h-4 w-4 text-emerald-700" />}
            >
              Ukuran Kecil (sm)
            </Button>
          </div>

          <div className="border-t border-stone-100 pt-4">
            <Button
              variant="primary"
              fullWidth
              icon={<Check className="h-4 w-4" />}
            >
              Setujui & Teruskan ke Petugas (Full Width)
            </Button>
          </div>
        </Card>
      </section>

      {/* 4. StatusChip, UrgencyChip, & Kategori */}
      <section className="space-y-3">
        <Eyebrow>STATUS CHIP, URGENCY CHIP & KATEGORI</Eyebrow>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="space-y-3">
            <h3 className="text-base font-bold text-stone-900">
              5 Status Laporan
            </h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((item) => (
                <StatusChip key={item.value} status={item.value} />
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-base font-bold text-stone-900">
              4 Tingkat Urgensi
            </h3>
            <div className="flex flex-wrap gap-2">
              {URGENCY_OPTIONS.map((item) => (
                <UrgencyChip key={item.value} urgency={item.value} />
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-base font-bold text-stone-900">
              3 Kategori Layanan
            </h3>
            <ul className="space-y-2 text-sm">
              {CATEGORY_OPTIONS.map((item) => (
                <li key={item.value} className="flex flex-col">
                  <span className="font-bold text-stone-900">{item.label}</span>
                  <span className="text-xs text-stone-500">
                    {CATEGORY_CONFIG[item.value].description}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* 5. Card Variants */}
      <section className="space-y-3">
        <Eyebrow>5 VARIAN CARD</Eyebrow>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card variant="default" className="space-y-2">
            <h3 className="text-base font-bold">Card Default (Putih)</h3>
            <p className="text-sm text-stone-600">
              Kartu standar dengan latar putih dan border stone-200 untuk form,
              detail laporan, dan tabel.
            </p>
          </Card>

          <Card variant="mint" className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <HardHat className="h-4 w-4 text-emerald-700" />
              <span>Card Mint (emerald-50)</span>
            </div>
            <p className="text-sm text-emerald-900">
              Dipakai untuk banner laporan terakhir, kabar terbaru petugas, dan
              catatan verifikasi admin.
            </p>
          </Card>

          <Card variant="ai" className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-900">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              <span>Card AI (teal-50)</span>
            </div>
            <p className="text-sm text-stone-600">
              Dipakai untuk Rekomendasi Analisis AI dan Ringkasan Eksekutif AI
              di dashboard.
            </p>
          </Card>

          <Card variant="warning" className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <TriangleAlert className="h-4 w-4 text-amber-700" />
              <span>Terdeteksi mirip dengan Tiket #ADU-198 (Jarak 50m).</span>
            </div>
            <p className="text-xs font-semibold text-amber-800">
              Lihat Tiket Terkait →
            </p>
          </Card>

          <Card variant="danger" className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
              ALASAN PENOLAKAN DARI ADMIN
            </p>
            <p className="text-sm font-bold text-rose-900">
              Lokasi kejadian berada di luar wilayah layanan instansi.
            </p>
            <p className="text-xs text-rose-700">
              Nadia Putri · Admin verifikator / 6 Nov 2026 · 11.20 WIB
            </p>
          </Card>
        </div>
      </section>

      {/* 6. Stepper & Timeline */}
      <section className="space-y-3">
        <Eyebrow>STEPPER (4 LANGKAH) & TIMELINE</Eyebrow>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-stone-500">Laporan #ADU-891</p>
                <h3 className="text-xl font-extrabold text-stone-900">
                  Jalan berlubang di Jl. Melati
                </h3>
              </div>
              <StatusChip status={stepperStatus} />
            </div>

            <Stepper status={stepperStatus} />

            {stepperStatus === "ditolak" && (
              <p className="text-xs text-rose-700 font-medium">
                (Sesuai spesifikasi: untuk status Ditolak, Stepper disembunyikan)
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
              <span className="text-xs font-semibold text-stone-500 mr-1">
                Uji Status Stepper:
              </span>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStepperStatus(opt.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    stepperStatus === opt.value
                      ? "bg-emerald-700 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Riwayat perkembangan
            </h3>
            <Timeline items={SAMPLE_TIMELINE} />
          </Card>
        </div>
      </section>

      {/* 7. Toast & ConfirmDialog */}
      <section className="space-y-3">
        <Eyebrow>TOAST & CONFIRM DIALOG</Eyebrow>
        <Card className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              success(
                "ID tiket disalin",
                "#ADU-204 telah disalin ke clipboard."
              )
            }
          >
            Toast Sukses
          </Button>
          <Button
            size="sm"
            variant="danger-outline"
            onClick={() =>
              error(
                "Laporan sudah diambil petugas lain",
                "Silakan pilih laporan lain di antrean."
              )
            }
          >
            Toast Error (409)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              info("Mode Mock Aktif", "Data dibaca dari lapisan mock lokal.")
            }
          >
            Toast Info
          </Button>
          <span className="h-6 w-px bg-stone-200 mx-1" aria-hidden="true" />
          <Button
            size="sm"
            variant="primary"
            onClick={() => setApproveDialogOpen(true)}
          >
            Buka Dialog Setujui
          </Button>
          <Button
            size="sm"
            variant="danger-outline"
            onClick={() => setRejectDialogOpen(true)}
          >
            Buka Dialog Tolak
          </Button>
        </Card>

        <ConfirmDialog
          open={approveDialogOpen}
          title="Setujui & Teruskan Laporan?"
          description="Laporan #ADU-204 akan diubah menjadi Menunggu Penanganan dan masuk ke antrean petugas lapangan."
          confirmLabel="Ya, Setujui Laporan"
          onClose={() => setApproveDialogOpen(false)}
          onConfirm={() => {
            setApproveDialogOpen(false);
            success("Laporan #ADU-204 disetujui");
          }}
        />

        <ConfirmDialog
          open={rejectDialogOpen}
          title="Tolak Laporan #ADU-204?"
          description="Laporan yang ditolak tidak akan diteruskan ke petugas. Alasan penolakan akan tampil di halaman pelacakan warga."
          confirmLabel="Ya, Tolak Laporan"
          confirmVariant="danger-outline"
          onClose={() => setRejectDialogOpen(false)}
          onConfirm={() => {
            setRejectDialogOpen(false);
            error("Laporan #ADU-204 ditolak");
          }}
        />
      </section>

      {/* 8. Skeleton, EmptyState, & ErrorState */}
      <section className="space-y-3">
        <Eyebrow>LOADING (SKELETON), EMPTY STATE & ERROR STATE</Eyebrow>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CardSkeleton />
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Semua laporan sudah diperiksa."
            description="Belum ada laporan baru yang menunggu verifikasi admin saat ini."
            action={
              <Button size="sm" variant="secondary">
                Muat Ulang Antrean
              </Button>
            }
          />
          <ErrorState
            title="Gagal memuat daftar laporan"
            message="Tidak dapat terhubung ke server KawalWarga. Periksa jaringan Anda lalu coba kembali."
            onRetry={() => info("Mencoba memuat ulang data...")}
          />
        </div>
        <Card className="space-y-2">
          <p className="text-xs font-semibold text-stone-500">
            Skeleton Baris Tabel:
          </p>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </section>

      {/* 9. Format Helpers (src/lib/format.ts) */}
      <section className="space-y-3">
        <Eyebrow>HELPER FORMAT (SRC/LIB/FORMAT.TS)</Eyebrow>
        <Card className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
          <div className="space-y-2">
            <p>
              <span className="text-stone-500">formatDateTime:</span>{" "}
              <strong className="text-stone-900">
                {formatDateTime("2026-11-08T10:42:00+07:00")}
              </strong>
            </p>
            <p>
              <span className="text-stone-500">formatDate:</span>{" "}
              <strong className="text-stone-900">
                {formatDate("2026-11-08T10:42:00+07:00")}
              </strong>
            </p>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-600">
              Uji normalizeTicketInput & formatTicket:
            </label>
            <input
              type="text"
              value={ticketInputDemo}
              onChange={(e) => setTicketInputDemo(e.target.value)}
              className="h-10 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none"
            />
            <p className="text-xs text-stone-600">
              API (normalized):{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-bold text-stone-900">
                {normalizeTicketInput(ticketInputDemo) || "(kosong)"}
              </code>{" "}
              · UI (formatted):{" "}
              <code className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800">
                {formatTicket(ticketInputDemo) || "(kosong)"}
              </code>
            </p>
          </div>
        </Card>
      </section>
    </div>
  );

  if (shellMode === "admin" || shellMode === "petugas") {
    const role: StaffRole = shellMode;
    return (
      <AppShell
        role={role}
        user={
          user && user.role === role
            ? { name: user.name, position: user.position, role: user.role }
            : undefined
        }
        activePath={role === "admin" ? "/admin" : "/petugas"}
        onLogout={() => {
          info("Kembali ke tampilan Layout Publik");
          setShellMode("public");
        }}
      >
        {kitContent}
      </AppShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        {kitContent}
      </main>
      <PublicFooter />
    </div>
  );
}
