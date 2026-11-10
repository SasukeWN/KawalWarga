import { normalizeTicketInput } from "../format";
import {
  mockAdminApproveReport,
  mockAdminDashboardInsight,
  mockAdminDashboardMap,
  mockAdminDashboardSummary,
  mockAdminGetReport,
  mockAdminListReports,
  mockAdminReanalyzeReport,
  mockAdminRegenerateInsight,
  mockAdminRejectReport,
  mockAdminListOfficers,
  mockAdminCreateOfficer,
  mockAdminUpdateOfficerStatus,
} from "../../mocks";
import type {
  AdminListParams,
  AdminReportDetail,
  AdminReportListItem,
  ApproveReportPayload,
  CreateOfficerPayload,
  DashboardAiInsight,
  DashboardDateParams,
  DashboardMapPin,
  DashboardSummary,
  OfficerListResponse,
  OfficerUser,
  Paginated,
  RejectReportPayload,
  ReportAiAnalysis,
} from "../types";
import { apiRequest, apiRequestEnvelope, isMockEnabled } from "./client";

export async function listReports(
  params: AdminListParams = {}
): Promise<Paginated<AdminReportListItem>> {
  if (isMockEnabled()) {
    return mockAdminListReports(params);
  }

  const res = await apiRequestEnvelope<AdminReportListItem[]>(
    "/admin/reports",
    {
      method: "GET",
      query: {
        search: params.search,
        status: params.status,
        category: params.category,
        urgency: params.urgency,
        sort: params.sort,
        from: params.from,
        to: params.to,
        page: params.page,
        per_page: params.per_page,
      },
    }
  );

  return {
    data: res.data,
    meta: res.meta ?? {
      current_page: params.page || 1,
      last_page: 1,
      per_page: params.per_page || 8,
      total: res.data.length,
    },
  };
}

export async function getReport(ticketId: string): Promise<AdminReportDetail> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockAdminGetReport(normalized);
  }

  return apiRequest<AdminReportDetail>(
    `/admin/reports/${encodeURIComponent(normalized)}`,
    {
      method: "GET",
    }
  );
}

export async function approve(
  ticketId: string,
  payload: ApproveReportPayload
): Promise<AdminReportDetail> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockAdminApproveReport(normalized, payload);
  }

  return apiRequest<AdminReportDetail>(
    `/admin/reports/${encodeURIComponent(normalized)}/approve`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function reject(
  ticketId: string,
  payload: RejectReportPayload
): Promise<AdminReportDetail> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockAdminRejectReport(normalized, payload);
  }

  return apiRequest<AdminReportDetail>(
    `/admin/reports/${encodeURIComponent(normalized)}/reject`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function reanalyze(ticketId: string): Promise<ReportAiAnalysis> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockAdminReanalyzeReport(normalized);
  }

  return apiRequest<ReportAiAnalysis>(
    `/admin/reports/${encodeURIComponent(normalized)}/reanalyze`,
    {
      method: "POST",
    }
  );
}

export async function summary(
  params: DashboardDateParams = {}
): Promise<DashboardSummary> {
  if (isMockEnabled()) {
    return mockAdminDashboardSummary(params);
  }

  return apiRequest<DashboardSummary>("/admin/dashboard/summary", {
    method: "GET",
    query: {
      from: params.from,
      to: params.to,
    },
  });
}

export async function map(
  params: DashboardDateParams = {}
): Promise<DashboardMapPin[]> {
  if (isMockEnabled()) {
    return mockAdminDashboardMap(params);
  }

  return apiRequest<DashboardMapPin[]>("/admin/dashboard/map", {
    method: "GET",
    query: {
      from: params.from,
      to: params.to,
    },
  });
}

export async function insight(
  params: DashboardDateParams = {}
): Promise<DashboardAiInsight> {
  if (isMockEnabled()) {
    return mockAdminDashboardInsight(params);
  }

  return apiRequest<DashboardAiInsight>("/admin/dashboard/ai-insight", {
    method: "GET",
    query: {
      from: params.from,
      to: params.to,
    },
  });
}

export async function regenerateInsight(
  params: DashboardDateParams = {}
): Promise<DashboardAiInsight> {
  if (isMockEnabled()) {
    return mockAdminRegenerateInsight(params);
  }

  return apiRequest<DashboardAiInsight>(
    "/admin/dashboard/ai-insight/regenerate",
    {
      method: "POST",
      body: params,
    }
  );
}

// ==========================================
// Manajemen Petugas
// ==========================================

export async function listOfficers(): Promise<OfficerListResponse> {
  if (isMockEnabled()) {
    return mockAdminListOfficers();
  }

  return apiRequest<OfficerListResponse>("/admin/officers", {
    method: "GET",
  });
}

export async function createOfficer(
  payload: CreateOfficerPayload
): Promise<OfficerUser> {
  if (isMockEnabled()) {
    return mockAdminCreateOfficer(payload);
  }

  return apiRequest<OfficerUser>("/admin/officers", {
    method: "POST",
    body: payload,
  });
}

export async function updateOfficerStatus(
  id: number,
  isActive: boolean
): Promise<OfficerUser> {
  if (isMockEnabled()) {
    return mockAdminUpdateOfficerStatus(id, isActive);
  }

  return apiRequest<OfficerUser>(`/admin/officers/${id}/status`, {
    method: "PATCH",
    body: { is_active: isActive },
  });
}
