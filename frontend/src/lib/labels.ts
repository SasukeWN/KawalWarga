export type ReportStatus =
  | "menunggu_verifikasi"
  | "menunggu_penanganan"
  | "diproses"
  | "selesai"
  | "ditolak";

/**
 * Kode kategori (slug) kini dinamis: admin dapat menambah kategori baru lewat
 * halaman Kelola Kategori, sehingga tipe ini berupa string bebas.
 */
export type ReportCategory = string;

export type ReportUrgency = "darurat" | "tinggi" | "sedang" | "rendah";

export type TimelineEventType =
  | "submitted"
  | "verified"
  | "rejected"
  | "taken"
  | "progress"
  | "completed";

export interface StatusStyleConfig {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  pinHex: string;
}

export const STATUS_CONFIG: Record<ReportStatus, StatusStyleConfig> = {
  menunggu_verifikasi: {
    label: "Menunggu Verifikasi",
    bgClass: "bg-stone-200",
    textClass: "text-stone-700",
    borderClass: "border-stone-200",
    dotClass: "bg-stone-500",
    pinHex: "#78716c",
  },
  menunggu_penanganan: {
    label: "Menunggu Penanganan",
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    borderClass: "border-amber-300",
    dotClass: "bg-amber-500",
    pinHex: "#f59e0b",
  },
  diproses: {
    label: "Diproses",
    bgClass: "bg-orange-100",
    textClass: "text-orange-800",
    borderClass: "border-orange-300",
    dotClass: "bg-orange-600",
    pinHex: "#ea580c",
  },
  selesai: {
    label: "Selesai",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-800",
    borderClass: "border-emerald-400",
    dotClass: "bg-emerald-600",
    pinHex: "#16a34a",
  },
  ditolak: {
    label: "Ditolak",
    bgClass: "bg-rose-100",
    textClass: "text-rose-800",
    borderClass: "border-rose-300",
    dotClass: "bg-rose-600",
    pinHex: "#e11d48",
  },
};

export interface CategoryStyleConfig {
  label: string;
  description: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryStyleConfig> = {
  jalan_rusak: {
    label: "Jalan Rusak",
    description: "Lubang dan kerusakan jalan lingkungan.",
  },
  sampah: {
    label: "Sampah",
    description: "Tumpukan sampah di ruang publik.",
  },
  lampu_mati: {
    label: "Lampu Mati",
    description: "Penerangan jalan yang tidak berfungsi.",
  },
};

export interface UrgencyStyleConfig {
  label: string;
  bgClass: string;
  textClass: string;
  weightClass: string;
  priority: number;
}

export const URGENCY_CONFIG: Record<ReportUrgency, UrgencyStyleConfig> = {
  darurat: {
    label: "Darurat",
    bgClass: "bg-rose-100",
    textClass: "text-rose-900",
    weightClass: "font-bold",
    priority: 4,
  },
  tinggi: {
    label: "Tinggi",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
    weightClass: "font-semibold",
    priority: 3,
  },
  sedang: {
    label: "Sedang",
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    weightClass: "font-semibold",
    priority: 2,
  },
  rendah: {
    label: "Rendah",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-800",
    weightClass: "font-semibold",
    priority: 1,
  },
};

export const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "menunggu_verifikasi", label: "Menunggu Verifikasi" },
  { value: "menunggu_penanganan", label: "Menunggu Penanganan" },
  { value: "diproses", label: "Diproses" },
  { value: "selesai", label: "Selesai" },
  { value: "ditolak", label: "Ditolak" },
];

export const CATEGORY_OPTIONS: { value: ReportCategory; label: string }[] = [
  { value: "jalan_rusak", label: "Jalan Rusak" },
  { value: "sampah", label: "Sampah" },
  { value: "lampu_mati", label: "Lampu Mati" },
];

export const URGENCY_OPTIONS: { value: ReportUrgency; label: string }[] = [
  { value: "rendah", label: "Rendah" },
  { value: "sedang", label: "Sedang" },
  { value: "tinggi", label: "Tinggi" },
  { value: "darurat", label: "Darurat" },
];

export function getStatusLabel(status: ReportStatus | null | undefined): string {
  if (!status) return "-";
  return STATUS_CONFIG[status]?.label ?? status;
}

/** Label kategori yang diterima dari API (kategori buatan admin). */
const dynamicCategoryLabels: Record<string, string> = {};

export function registerCategoryLabels(
  items: { value: string; label: string }[]
): void {
  for (const item of items) {
    dynamicCategoryLabels[item.value] = item.label;
  }
}

function humanizeSlug(slug: string): string {
  return slug
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCategoryLabel(
  category: ReportCategory | null | undefined
): string {
  if (!category) return "Belum Dikategorikan";
  return (
    dynamicCategoryLabels[category] ??
    CATEGORY_CONFIG[category]?.label ??
    humanizeSlug(category)
  );
}

export function getUrgencyLabel(
  urgency: ReportUrgency | null | undefined
): string {
  if (!urgency) return "-";
  return URGENCY_CONFIG[urgency]?.label ?? urgency;
}
