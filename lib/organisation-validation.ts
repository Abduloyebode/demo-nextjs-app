import { z } from "zod";

export const membershipRoleValues = ["ADMIN", "MEMBER"] as const;

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(255),
  role: z.enum(membershipRoleValues),
});

export const changeRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(membershipRoleValues),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export function parseMembershipRole(
  value: FormDataEntryValue | null,
): (typeof membershipRoleValues)[number] | null {
  if (value === "ADMIN" || value === "MEMBER") {
    return value;
  }
  return null;
}
