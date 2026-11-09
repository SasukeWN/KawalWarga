import { mockChatbotSendMessage } from "../../mocks";
import type { ChatbotResponse, SendChatPayload } from "../types";
import { apiRequest, isMockEnabled } from "./client";

export async function sendMessage(
  payload: SendChatPayload
): Promise<ChatbotResponse> {
  if (isMockEnabled()) {
    return mockChatbotSendMessage(payload);
  }

  return apiRequest<ChatbotResponse>("/chatbot", {
    method: "POST",
    body: {
      message: payload.message,
      history: payload.history?.slice(-6) ?? [],
    },
    skipAuthRedirect: true,
  });
}
