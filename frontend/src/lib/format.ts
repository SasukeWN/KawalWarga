const INDONESIAN_SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

function getJakartaDateParts(dateInput: string | Date): {
  day: number;
  monthIndex: number;
  year: number;
  hour: string;
  minute: string;
} | null {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const day = Number.parseInt(map.day ?? "1", 10);
  const monthIndex = Number.parseInt(map.month ?? "1", 10) - 1;
  const year = Number.parseInt(map.year ?? "2026", 10);
  const rawHour = map.hour === "24" ? "00" : (map.hour ?? "00").padStart(2, "0");
  const minute = (map.minute ?? "00").padStart(2, "0");

  return {
    day,
    monthIndex: Math.max(0, Math.min(11, monthIndex)),
    year,
    hour: rawHour,
    minute,
  };
}

/**
 * Format waktu ke "8 Nov 2026 · 10.42 WIB" (zona Asia/Jakarta).
 */
export function formatDateTime(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return "-";
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return String(dateInput);

  const monthName = INDONESIAN_SHORT_MONTHS[parts.monthIndex];
  return `${parts.day} ${monthName} ${parts.year} · ${parts.hour}.${parts.minute} WIB`;
}

/**
 * Format tanggal ke "8 Nov 2026" (zona Asia/Jakarta).
 */
export function formatDate(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return "-";
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return String(dateInput);

  const monthName = INDONESIAN_SHORT_MONTHS[parts.monthIndex];
  return `${parts.day} ${monthName} ${parts.year}`;
}

/**
 * Format ID tiket untuk ditampilkan di UI dengan awalan "#" (contoh: "#ADU-204").
 */
export function formatTicket(ticketId: string | null | undefined): string {
  if (!ticketId) return "";
  const normalized = normalizeTicketInput(ticketId);
  if (!normalized) return "";
  return `#${normalized}`;
}

/**
 * Normalisasi berbagai bentuk input ID tiket (#adu-204, ADU-204, 204, adu204)
 * menjadi format kanonik ADU-204 (tanpa #).
 */
export function normalizeTicketInput(input: string | null | undefined): string {
  if (!input) return "";
  const cleaned = input.replace(/[#\s]+/g, "").toUpperCase();
  if (!cleaned) return "";

  if (/^\d+$/.test(cleaned)) {
    const trimmed = cleaned.replace(/^0+/, "");
    if (!trimmed) return "";
    return `ADU-${trimmed.padStart(3, "0")}`;
  }

  const match = cleaned.match(/^ADU-?(\d+)$/);
  if (match) {
    const trimmed = match[1].replace(/^0+/, "");
    if (!trimmed) return "";
    return `ADU-${trimmed.padStart(3, "0")}`;
  }

  return cleaned;
}
