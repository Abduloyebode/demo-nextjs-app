"use server";

import { revalidatePath } from "next/cache";
import {
  changeMemberRole,
  inviteMember,
  removeMember,
  revokeInvite,
  acceptInvite,
} from "@/lib/organisation-admin";
import {
  isAdmin,
  requireOrganisationMembership,
} from "@/lib/organisation";
import { inviteMemberSchema, parseMembershipRole } from "@/lib/organisation-validation";
import { requireUserId } from "@/lib/require-user-id";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type OrgActionResult = {
  error: string | null;
  inviteUrl?: string;
};

export async function inviteOrganisationMember(
  formData: FormData,
): Promise<OrgActionResult> {
  const ctx = await requireOrganisationMembership();
  if (!isAdmin(ctx.role)) {
    return { error: "Only admins can invite members." };
  }

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check your details and try again.",
    };
  }

  const result = await inviteMember(ctx, parsed.data);
  revalidatePath("/dashboard/organisation");
  return result;
}

export async function revokeOrganisationInvite(
  inviteId: string,
): Promise<OrgActionResult> {
  const ctx = await requireOrganisationMembership();
  const result = await revokeInvite(ctx, inviteId);
  revalidatePath("/dashboard/organisation");
  return result;
}

export async function removeOrganisationMember(
  membershipId: string,
): Promise<OrgActionResult> {
  const ctx = await requireOrganisationMembership();
  const result = await removeMember(ctx, membershipId);
  revalidatePath("/dashboard/organisation");
  return result;
}

export async function changeOrganisationMemberRole(
  formData: FormData,
): Promise<OrgActionResult> {
  const ctx = await requireOrganisationMembership();
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = parseMembershipRole(formData.get("role"));

  if (!membershipId || !role) {
    return { error: "Choose a valid member and role." };
  }

  const result = await changeMemberRole(ctx, membershipId, role);
  revalidatePath("/dashboard/organisation");
  return result;
}

export async function acceptOrganisationInvite(
  token: string,
): Promise<OrgActionResult> {
  const userId = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Sign in to accept this invite." };
  }

  const result = await acceptInvite(token, userId, session.user.email);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/organisation");
  return result;
}
