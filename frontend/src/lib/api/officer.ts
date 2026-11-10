import { normalizeTicketInput } from "../format";
import {
  mockOfficerCompleteReport,
  mockOfficerGetReport,
  mockOfficerMyReports,
  mockOfficerProgressReport,
  mockOfficerQueue,
  mockOfficerTakeReport,
} from "../../mocks";
import type {
  OfficerCompletePayload,
  OfficerMyReportsParams,
  OfficerProgressPayload,
  OfficerQueueParams,
  OfficerReportDetail,
  OfficerReportListItem,
  Paginated,
} from "../types";
import { apiRequest, apiRequestEnvelope, isMockEnabled } from "./client";

export async function queue(
  params: OfficerQueueParams = {}
): Promise<Paginated<OfficerReportListItem>> {
  if (isMockEnabled()) {
    return mockOfficerQueue(params);
  }

  const res = await apiRequestEnvelope<OfficerReportListItem[]>(
    "/officer/queue",
    {
      method: "GET",
      query: {
        search: params.search ? normalizeTicketInput(params.search) : undefined,
        category: params.category,
        urgency: params.urgency,
        sort: params.sort,
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
      per_page: params.per_page || 6,
      total: res.data.length,
    },
  };
}

export async function myReports(
  params: OfficerMyReportsParams = {}
): Promise<Paginated<OfficerReportListItem>> {
  if (isMockEnabled()) {
    return mockOfficerMyReports(params);
  }

  const res = await apiRequestEnvelope<OfficerReportListItem[]>(
    "/officer/my-reports",
    {
      method: "GET",
      query: {
        search: params.search ? normalizeTicketInput(params.search) : undefined,
        status: params.status,
        category: params.category,
        urgency: params.urgency,
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
      per_page: params.per_page || 6,
      total: res.data.length,
    },
  };
}

export async function getReport(
  ticketId: string
): Promise<OfficerReportDetail> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockOfficerGetReport(normalized);
  }

  return apiRequest<OfficerReportDetail>(
    `/officer/reports/${encodeURIComponent(normalized)}`,
    {
      method: "GET",
    }
  );
}

export async function take(ticketId: string): Promise<OfficerReportDetail> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockOfficerTakeReport(normalized);
  }

  return apiRequest<OfficerReportDetail>(
    `/officer/reports/${encodeURIComponent(normalized)}/take`,
    {
      method: "POST",
    }
  );
}

export async function progress(
  ticketId: string,
  payload: OfficerProgressPayload
): Promise<OfficerReportDetail> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockOfficerProgressReport(normalized, payload);
  }

  return apiRequest<OfficerReportDetail>(
    `/officer/reports/${encodeURIComponent(normalized)}/progress`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function complete(
  ticketId: string,
  payload: OfficerCompletePayload
): Promise<OfficerReportDetail> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockOfficerCompleteReport(normalized, payload);
  }

  const formData = new FormData();
  formData.append("notes", payload.notes);
  formData.append("photo", payload.photo);

  return apiRequest<OfficerReportDetail>(
    `/officer/reports/${encodeURIComponent(normalized)}/complete`,
    {
      method: "POST",
      body: formData,
    }
  );
}
