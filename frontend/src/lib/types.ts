import type {
  ReportCategory,
  ReportStatus,
  ReportUrgency,
  TimelineEventType,
} from "./labels";

export type {
  ReportCategory,
  ReportStatus,
  ReportUrgency,
  TimelineEventType,
};

export type UserRole = "admin" | "petugas";

export type AiStatus = "pending" | "done" | "failed";

// ==========================================
// 1. Envelope & Pagination
// ==========================================

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[]>;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

// ==========================================
// 2. Objek Berulang (Shared Objects)
// ==========================================

export interface Actor {
  name: string;
  position: string;
}

export interface ReportLocation {
  latitude: number;
  longitude: number;
  address_text: string | null;
}

export interface TimelineItem {
  event: TimelineEventType;
  title: string;
  description: string;
  at: string;
}

export interface ReportCompletion {
  notes: string;
  photo_url: string;
  completed_by: Actor;
  completed_at: string;
}

export interface ReportRejection {
  reason: string;
  decided_by: Actor;
  at: string;
}

export interface ReportVerification {
  category: ReportCategory;
  urgency: ReportUrgency;
  note: string | null;
  verified_by: Actor;
  verified_at: string;
}

export interface ReportHandler extends Actor {
  taken_at: string;
}

export interface ReportLatestUpdate {
  note: string;
  actor: Actor;
  at: string;
}

export interface AiDuplicateItem {
  ticket_id: string;
  title: string;
  distance_m: number;
}

export interface ReportAiAnalysis {
  status: AiStatus;
  summary: string | null;
  category: ReportCategory | null;
  urgency: ReportUrgency | null;
  duplicates: AiDuplicateItem[];
}

// ==========================================
// 3. Endpoint Publik (Warga)
// ==========================================

export interface CreateReportPayload {
  description: string;
  latitude: number;
  longitude: number;
  address_text?: string;
  /** Kode kategori pilihan pelapor (opsional), dari GET /categories. */
  category?: string;
  photo: File;
  reporter_phone?: string;
}

/** Kategori aktif yang boleh dipilih warga (GET /categories). */
export interface CategoryOption {
  value: string;
  label: string;
  description: string | null;
}

/** Kategori untuk pengelolaan admin (GET /admin/categories). */
export interface AdminCategory extends CategoryOption {
  is_active: boolean;
  reports_count: number;
}

export interface CreateCategoryPayload {
  label: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  label?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CreatedReportResponse {
  ticket_id: string;
  status: ReportStatus;
  status_label: string;
  created_at: string;
}

export interface TrackedReport {
  ticket_id: string;
  title: string;
  status: ReportStatus;
  status_label: string;
  category: ReportCategory | null;
  category_label: string | null;
  description: string;
  location: ReportLocation;
  photo_url: string;
  received_at: string;
  latest_update: ReportLatestUpdate | null;
  timeline: TimelineItem[];
  rejection: ReportRejection | null;
  completion: ReportCompletion | null;
}

// ==========================================
// 4. Endpoint Chatbot AI
// ==========================================

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface SendChatPayload {
  message: string;
  history?: ChatHistoryItem[];
}

export interface ChatTicketCard {
  ticket_id: string;
  title: string;
  status: ReportStatus;
  status_label?: string;
}

export interface ChatbotResponse {
  reply: string;
  tickets: ChatTicketCard[];
}

// ==========================================
// 5. Endpoint Autentikasi
// ==========================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  position: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  token_type: "Bearer";
  user: User;
}

// ==========================================
// 6. Endpoint Admin
// ==========================================

export type ReportSortOption = "newest" | "oldest" | "urgency";

export interface AdminListParams {
  search?: string;
  status?: ReportStatus | "";
  category?: ReportCategory | "";
  urgency?: ReportUrgency | "";
  sort?: ReportSortOption;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface ReportSlaInfo {
  target_hours: number;
  target_label: string;
  deadline: string | null;
  is_overdue: boolean;
}

export interface AdminReportListItem {
  ticket_id: string;
  title: string;
  status: ReportStatus;
  status_label: string;
  category: ReportCategory | null;
  category_label: string | null;
  urgency: ReportUrgency | null;
  urgency_label: string | null;
  address_text: string | null;
  created_at: string;
  is_overdue?: boolean;
  sla_target_hours?: number;
  sla_target_label?: string;
  sla_deadline?: string | null;
}

export interface AdminReportDetail {
  ticket_id: string;
  title: string;
  status: ReportStatus;
  status_label: string;
  category: ReportCategory | null;
  category_label: string | null;
  urgency: ReportUrgency | null;
  urgency_label: string | null;
  description: string;
  photo_url: string;
  location: ReportLocation;
  reporter: {
    phone: string | null;
  };
  received_at: string;
  is_overdue?: boolean;
  sla?: ReportSlaInfo | null;
  ai: ReportAiAnalysis;
  verification: ReportVerification | null;
  rejection: ReportRejection | null;
  handler: ReportHandler | null;
  completion: ReportCompletion | null;
  timeline: TimelineItem[];
}

export interface ApproveReportPayload {
  category: ReportCategory;
  urgency: ReportUrgency;
  note?: string;
}

export interface RejectReportPayload {
  reason: string;
}

export interface DashboardDateParams {
  from?: string;
  to?: string;
}

export interface DashboardCategoryCount {
  category: ReportCategory;
  label: string;
  count: number;
}

export interface DashboardSummary {
  period: {
    from: string;
    to: string;
  };
  totals: {
    all: number;
    menunggu_verifikasi: number;
    menunggu_penanganan: number;
    diproses: number;
    selesai: number;
    ditolak: number;
    melewati_target?: number;
  };
  by_category: DashboardCategoryCount[];
}

export interface DashboardMapPin {
  ticket_id: string;
  title: string;
  category: ReportCategory | null;
  category_label: string | null;
  status: Exclude<ReportStatus, "menunggu_verifikasi">;
  status_label: string;
  latitude: number;
  longitude: number;
  photo_url: string;
}

export interface DashboardAiInsight {
  bullets: string[];
  based_on_total: number;
  period: {
    from: string;
    to: string;
  };
  generated_at: string;
}

// ==========================================
// 7. Endpoint Petugas
// ==========================================

export type OfficerQueueSortOption = "urgency" | "newest";

export interface OfficerQueueParams {
  search?: string;
  category?: ReportCategory | "";
  urgency?: ReportUrgency | "";
  sort?: OfficerQueueSortOption;
  page?: number;
  per_page?: number;
}

export interface OfficerMyReportsParams {
  search?: string;
  status?: "diproses" | "selesai" | "";
  category?: ReportCategory | "";
  urgency?: ReportUrgency | "";
  page?: number;
  per_page?: number;
}

export interface OfficerReportListItem {
  ticket_id: string;
  title: string;
  status: ReportStatus;
  status_label: string;
  category: ReportCategory;
  category_label: string;
  urgency: ReportUrgency;
  urgency_label: string;
  photo_url: string;
  location: ReportLocation;
  verified_at: string;
  taken_at?: string | null;
  completed_at?: string | null;
  is_overdue?: boolean;
  sla_target_hours?: number;
  sla_target_label?: string;
  sla_deadline?: string | null;
}

export interface OfficerReportDetail {
  ticket_id: string;
  title: string;
  status: ReportStatus;
  status_label: string;
  category: ReportCategory;
  category_label: string;
  urgency: ReportUrgency;
  urgency_label: string;
  description: string;
  photo_url: string;
  location: ReportLocation;
  received_at: string;
  is_overdue?: boolean;
  sla?: ReportSlaInfo | null;
  verification: ReportVerification;
  rejection: ReportRejection | null;
  handler: ReportHandler | null;
  completion: ReportCompletion | null;
  timeline: TimelineItem[];
}

export interface OfficerProgressPayload {
  note: string;
}

export interface OfficerCompletePayload {
  notes: string;
  photo: File;
}

// ==========================================
// 8. Manajemen Petugas & Profil
// ==========================================

export interface OfficerUser {
  id: number;
  name: string;
  email: string;
  position: string;
  is_active: boolean;
  tasks_in_progress_count: number;
  tasks_completed_count: number;
  created_at?: string;
}

export interface OfficerSummary {
  total: number;
  active: number;
  suspended: number;
}

export interface OfficerListResponse {
  summary: OfficerSummary;
  officers: OfficerUser[];
}

export interface CreateOfficerPayload {
  email: string;
  password: string;
  name?: string;
  position?: string;
}

export interface UpdateOfficerStatusPayload {
  is_active: boolean;
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}
