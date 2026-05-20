import { getUserRole } from "@backend/auth/auth";

export async function requireAdmin(userId: string) {
  if (!userId) throw new Error("Not authenticated");
  const role = await getUserRole(userId);
  if (role !== "admin" && role !== "super_admin") {
    throw new Error("Access Denied: Admin role required");
  }
  return role;
}
