import type { ApiEnvelope, PaginationMeta } from "../types";

export const TOKEN_STORAGE_KEY = "kw_token";
export const USER_STORAGE_KEY = "kw_user";

export class ApiError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function isMockEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_USE_MOCK;
  if (flag === undefined || flag === "") {
    return true;
  }
  return flag.toLowerCase() === "true" || flag === "1";
}

export function getApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return raw.replace(/\/+$/, "");
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearAuthStorageAndRedirect(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Abaikan bila localStorage diblokir
  }
  if (!window.location.pathname.startsWith("/masuk")) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/masuk/";
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  skipAuthRedirect?: boolean;
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | undefined | null>
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = `${getApiBaseUrl()}${normalizedPath}`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined && val !== null && val !== "") {
      params.set(key, String(val));
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function apiRequestEnvelope<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T; meta?: PaginationMeta; message: string }> {
  const { body, query, headers: customHeaders, skipAuthRedirect, ...rest } =
    options;

  const headers = new Headers(customHeaders);
  headers.set("Accept", "application/json");

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let serializedBody: BodyInit | undefined;
  if (body instanceof FormData) {
    serializedBody = body;
  } else if (body !== undefined && body !== null) {
    headers.set("Content-Type", "application/json");
    serializedBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers,
      body: serializedBody,
    });
  } catch {
    throw new ApiError(
      0,
      "Gagal terhubung ke server. Periksa koneksi internet Anda lalu coba lagi."
    );
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (response.status === 401 && !skipAuthRedirect) {
    clearAuthStorageAndRedirect();
  }

  if (!response.ok || (payload && payload.success === false)) {
    const message =
      payload?.message ||
      (response.status === 401
        ? "Sesi Anda telah berakhir. Silakan masuk kembali."
        : response.status === 403
          ? "Anda tidak memiliki akses untuk tindakan ini."
          : response.status === 404
            ? "Data tidak ditemukan."
            : response.status === 409
              ? "Konflik status laporan."
              : response.status === 422
                ? "Data yang dikirim tidak valid."
                : "Terjadi kesalahan pada server.");
    throw new ApiError(response.status, message, payload?.errors);
  }

  if (!payload) {
    throw new ApiError(response.status, "Respons server tidak valid.");
  }

  return {
    data: payload.data,
    meta: payload.meta,
    message: payload.message || "OK",
  };
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const res = await apiRequestEnvelope<T>(path, options);
  return res.data;
}
