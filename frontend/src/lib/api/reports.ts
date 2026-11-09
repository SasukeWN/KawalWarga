import { normalizeTicketInput } from "../format";
import { mockCreateReport, mockTrackReport } from "../../mocks";
import type {
  CreatedReportResponse,
  CreateReportPayload,
  TrackedReport,
} from "../types";
import { apiRequest, isMockEnabled } from "./client";

export async function createReport(
  payload: CreateReportPayload
): Promise<CreatedReportResponse> {
  if (isMockEnabled()) {
    return mockCreateReport(payload);
  }

  const formData = new FormData();
  formData.append("description", payload.description);
  formData.append("latitude", String(payload.latitude));
  formData.append("longitude", String(payload.longitude));
  if (payload.address_text) {
    formData.append("address_text", payload.address_text);
  }
  formData.append("photo", payload.photo);
  if (payload.reporter_phone) {
    formData.append("reporter_phone", payload.reporter_phone);
  }

  return apiRequest<CreatedReportResponse>("/reports", {
    method: "POST",
    body: formData,
    skipAuthRedirect: true,
  });
}

export async function trackReport(ticketId: string): Promise<TrackedReport> {
  const normalized = normalizeTicketInput(ticketId);
  if (isMockEnabled()) {
    return mockTrackReport(normalized);
  }

  return apiRequest<TrackedReport>(
    `/reports/track/${encodeURIComponent(normalized)}`,
    {
      method: "GET",
      skipAuthRedirect: true,
    }
  );
}
