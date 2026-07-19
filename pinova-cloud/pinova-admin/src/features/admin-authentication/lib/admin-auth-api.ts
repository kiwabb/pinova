import { adminApiRequest, clearAdminCsrf } from "../../../lib/admin-api-client";
import type { AuthenticatedAdmin } from "../types";

export const ADMIN_SESSION_QUERY_KEY = ["admin-session"] as const;

export function getCurrentAdmin() {
  return adminApiRequest<AuthenticatedAdmin>("/admin/auth/me");
}

export function loginAdmin(input: { username: string; password: string }) {
  return adminApiRequest<AuthenticatedAdmin>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function changeAdminPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  await adminApiRequest<null>("/admin/auth/password", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  clearAdminCsrf();
}

export async function logoutAdmin() {
  await adminApiRequest<null>("/admin/auth/logout", { method: "POST" });
  clearAdminCsrf();
}

