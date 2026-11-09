import { mockLogin, mockLogout, mockMe } from "../../mocks";
import type { LoginPayload, LoginResponse, User } from "../types";
import { apiRequest, isMockEnabled } from "./client";

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (isMockEnabled()) {
    return mockLogin(payload);
  }

  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
    skipAuthRedirect: true,
  });
}

export async function logout(): Promise<null> {
  if (isMockEnabled()) {
    return mockLogout();
  }

  return apiRequest<null>("/auth/logout", {
    method: "POST",
  });
}

export async function me(): Promise<User> {
  if (isMockEnabled()) {
    return mockMe();
  }

  return apiRequest<User>("/auth/me", {
    method: "GET",
  });
}
