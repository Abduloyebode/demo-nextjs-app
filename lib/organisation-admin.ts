import { prisma } from "@/lib/prisma";
import {
  createInviteToken,
  hashInviteToken,
  isAdmin,
  type OrganisationContext,
} from "@/lib/organisation";
import { writeAuditLog } from "@/lib/audit";
import type { MembershipRole } from "@prisma/client";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function listOrganisationMembers(organisationId: string) {
  return prisma.membership.findMany({
    where: { organisationId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export function listPendingInvites(organisationId: string) {
  return prisma.invite.findMany({
    where: { organisationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function inviteMember(
  ctx: OrganisationContext,
  input: { email: string; role: MembershipRole },
): Promise<{ error: string | null; inviteUrl?: string }> {
  if (!isAdmin(ctx.role)) {
    return { error: "Only admins can invite members." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  if (input.role !== "ADMIN" && input.role !== "MEMBER") {
    return { error: "Choose a valid role." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: { userId: existingUser.id },
    });
    if (existingMembership?.organisationId === ctx.organisationId) {
      return { error: "That person is already in this organisation." };
    }
    if (existingMembership) {
      return {
        error:
          "That person already belongs to another organisation and cannot join this one.",
      };
    }
  }

  const pending = await prisma.invite.findFirst({
    where: {
      organisationId: ctx.organisationId,
      email,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });
  if (pending) {
    return { error: "An invite is already pending for that email." };
  }

  const rawToken = createInviteToken();
  const invite = await prisma.invite.create({
    data: {
      organisationId: ctx.organisationId,
      email,
      role: input.role,
      token: hashInviteToken(rawToken),
      invitedById: ctx.userId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "MEMBER_INVITED",
    entityType: "invite",
    entityId: invite.id,
    metadata: { email, role: input.role },
  });

  const baseUrl =
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${rawToken}`;

  // No email provider yet — same approach as password reset.
  console.log(`[org] Invite created for ${email}. Accept link: ${inviteUrl}`);

  return { error: null, inviteUrl };
}

export async function revokeInvite(
  ctx: OrganisationContext,
  inviteId: string,
): Promise<{ error: string | null }> {
  if (!isAdmin(ctx.role)) {
    return { error: "Only admins can revoke invites." };
  }

  const result = await prisma.invite.updateMany({
    where: {
      id: inviteId,
      organisationId: ctx.organisationId,
      status: "PENDING",
    },
    data: { status: "REVOKED" },
  });

  if (result.count === 0) {
    return { error: "That invite could not be found." };
  }

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "INVITE_REVOKED",
    entityType: "invite",
    entityId: inviteId,
  });

  return { error: null };
}

export async function removeMember(
  ctx: OrganisationContext,
  membershipId: string,
): Promise<{ error: string | null }> {
  if (!isAdmin(ctx.role)) {
    return { error: "Only admins can remove members." };
  }

  const target = await prisma.membership.findFirst({
    where: { id: membershipId, organisationId: ctx.organisationId },
  });

  if (!target) {
    return { error: "That member could not be found." };
  }

  if (target.userId === ctx.userId) {
    return { error: "You cannot remove yourself." };
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.membership.count({
      where: { organisationId: ctx.organisationId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      return { error: "You cannot remove the last admin." };
    }
  }

  await prisma.membership.delete({ where: { id: target.id } });

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "MEMBER_REMOVED",
    entityType: "membership",
    entityId: target.id,
    metadata: { userId: target.userId, role: target.role },
  });

  return { error: null };
}

export async function changeMemberRole(
  ctx: OrganisationContext,
  membershipId: string,
  role: MembershipRole,
): Promise<{ error: string | null }> {
  if (!isAdmin(ctx.role)) {
    return { error: "Only admins can change roles." };
  }

  if (role !== "ADMIN" && role !== "MEMBER") {
    return { error: "Choose a valid role." };
  }

  const target = await prisma.membership.findFirst({
    where: { id: membershipId, organisationId: ctx.organisationId },
  });

  if (!target) {
    return { error: "That member could not be found." };
  }

  if (target.role === "ADMIN" && role === "MEMBER") {
    const adminCount = await prisma.membership.count({
      where: { organisationId: ctx.organisationId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      return { error: "You cannot demote the last admin." };
    }
  }

  if (target.userId === ctx.userId && role !== "ADMIN") {
    return { error: "You cannot demote yourself." };
  }

  if (target.role === role) {
    return { error: null };
  }

  await prisma.membership.update({
    where: { id: target.id },
    data: { role },
  });

  await writeAuditLog({
    organisationId: ctx.organisationId,
    actorId: ctx.userId,
    action: "MEMBER_ROLE_CHANGED",
    entityType: "membership",
    entityId: target.id,
    metadata: {
      userId: target.userId,
      from: target.role,
      to: role,
    },
  });

  return { error: null };
}

export async function acceptInvite(
  rawToken: string,
  userId: string,
  userEmail: string,
): Promise<{ error: string | null }> {
  const tokenHash = hashInviteToken(rawToken);
  const invite = await prisma.invite.findUnique({
    where: { token: tokenHash },
  });

  if (!invite || invite.status !== "PENDING") {
    return { error: "That invite is no longer valid." };
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    return { error: "That invite has expired." };
  }

  if (invite.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    return {
      error: "Sign in with the email address this invite was sent to.",
    };
  }

  const existing = await prisma.membership.findUnique({
    where: { userId },
  });

  if (existing?.organisationId === invite.organisationId) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });
    return { error: null };
  }

  if (existing) {
    return {
      error:
        "You already belong to another organisation. Leave it before accepting this invite.",
    };
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: {
        organisationId: invite.organisationId,
        userId,
        role: invite.role,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  await writeAuditLog({
    organisationId: invite.organisationId,
    actorId: userId,
    action: "INVITE_ACCEPTED",
    entityType: "invite",
    entityId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  return { error: null };
}

export async function getInvitePreview(rawToken: string) {
  const invite = await prisma.invite.findUnique({
    where: { token: hashInviteToken(rawToken) },
    include: {
      organisation: { select: { id: true, name: true } },
    },
  });

  if (!invite) return null;

  const expired =
    invite.status === "EXPIRED" || invite.expiresAt.getTime() < Date.now();

  return {
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expired,
    expiresAt: invite.expiresAt,
    organisationName: invite.organisation.name,
  };
}
