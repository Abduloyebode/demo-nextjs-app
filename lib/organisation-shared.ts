import type { MembershipRole } from "@prisma/client";

export const membershipRoleLabels: Record<MembershipRole, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
};

export const membershipRoleValues = ["ADMIN", "MEMBER"] as const satisfies readonly MembershipRole[];

export function isAdmin(role: MembershipRole): boolean {
  return role === "ADMIN";
}

export function slugifyOrgBase(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "org";
}
