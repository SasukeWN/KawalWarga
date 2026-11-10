import {
  mockAdminCreateCategory,
  mockAdminDeleteCategory,
  mockAdminListCategories,
  mockAdminUpdateCategory,
  mockListPublicCategories,
} from "../../mocks";
import type {
  AdminCategory,
  CategoryOption,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "../types";
import { apiRequest, isMockEnabled } from "./client";

/** Kategori aktif untuk formulir warga (publik, tanpa login). */
export async function listPublic(): Promise<CategoryOption[]> {
  if (isMockEnabled()) {
    return mockListPublicCategories();
  }

  return apiRequest<CategoryOption[]>("/categories", {
    method: "GET",
    skipAuthRedirect: true,
  });
}

/** Semua kategori (aktif & nonaktif) untuk admin. */
export async function listAll(): Promise<AdminCategory[]> {
  if (isMockEnabled()) {
    return mockAdminListCategories();
  }

  return apiRequest<AdminCategory[]>("/admin/categories", { method: "GET" });
}

export async function create(
  payload: CreateCategoryPayload
): Promise<AdminCategory> {
  if (isMockEnabled()) {
    return mockAdminCreateCategory(payload);
  }

  return apiRequest<AdminCategory>("/admin/categories", {
    method: "POST",
    body: payload,
  });
}

export async function update(
  slug: string,
  payload: UpdateCategoryPayload
): Promise<AdminCategory> {
  if (isMockEnabled()) {
    return mockAdminUpdateCategory(slug, payload);
  }

  return apiRequest<AdminCategory>(
    `/admin/categories/${encodeURIComponent(slug)}`,
    { method: "PUT", body: payload }
  );
}

export async function remove(slug: string): Promise<null> {
  if (isMockEnabled()) {
    return mockAdminDeleteCategory(slug);
  }

  return apiRequest<null>(`/admin/categories/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}
