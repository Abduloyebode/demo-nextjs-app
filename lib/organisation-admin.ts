import {
  isConcurrentWriteConflict,
  isUniqueConstraintViolation,
  prisma,
} from "@/lib/prisma";
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
    where: { organisationId, status: "PENDING", expiresAt: { gt: new Date() } },
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
      // Every user gets a personal organisation auto-created on first
      // dashboard visit, so almost any existing account already has a
      // membership somewhere. If they're the sole member of that org,
      // inviting them here is fine — acceptInvite() safely retires that
      // membership when they accept, since nobody else depends on it.
      const existingOrgMemberCount = await prisma.membership.count({
        where: { organisationId: existingMembership.organisationId },
      });
      if (existingOrgMemberCount > 1) {
        return {
          error:
            "That person already belongs to another organisation and cannot join this one.",
        };
      }
    }
  }

  // Flip any invites that passed their TTL but are still marked PENDING
  // (status only flips lazily, when someone tries to accept) so the
  // database's partial unique index below only ever blocks a genuinely
  // live invite, never a stale one nobody redeemed.
  await prisma.invite.updateMany({
    where: {
      organisationId: ctx.organisationId,
      email,
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const rawToken = createInviteToken();
  let invite;
  try {
    invite = await prisma.invite.create({
      data: {
        organisationId: ctx.organisationId,
        email,
        role: input.role,
        token: hashInviteToken(rawToken),
        invitedById: ctx.userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
  } catch (error) {
    // A concurrent invite request for the same organisation + email can
    // race this exact check-then-insert; the database's partial unique
    // index (one PENDING invite per org+email) is what actually prevents
    // duplicates, so a violation here just means someone else won the race.
    if (isUniqueConstraintViolation(error)) {
      return { error: "An invite is already pending for that email." };
    }
    throw error;
  }

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

  const result = await prisma.$transaction(async (tx) => {
    // Lock every membership row in this org, in a stable order (so
    // concurrent removeMember/changeMemberRole calls always acquire locks
    // in the same sequence and can't deadlock each other), and re-derive
    // the target's *current* role and the *current* admin count from that
    // locked snapshot. `target` was fetched before this transaction opened
    // — if some other call changed its role in between (e.g. promoted it
    // to admin), that stale value must not be what decides whether the
    // last-admin guard below applies, or the guard can be silently skipped.
    const rows = await tx.$queryRaw<{ id: string; role: MembershipRole }[]>`
      SELECT id, role FROM membership
      WHERE "organisationId" = ${ctx.organisationId}
      ORDER BY id
      FOR UPDATE
    `;
    const current = rows.find((row) => row.id === target.id);
    if (!current) {
      return { error: "That member could not be found." };
    }

    const adminCount = rows.filter((row) => row.role === "ADMIN").length;
    if (current.role === "ADMIN" && adminCount <= 1) {
      return { error: "You cannot remove the last admin." };
    }

    await tx.membership.delete({ where: { id: current.id } });
    return { error: null };
  });

  if (result.error) {
    return result;
  }

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

  const result = await prisma.$transaction(async (tx) => {
    // Lock every membership row in this org, in a stable order (same
    // pattern as removeMember, so the two functions can never deadlock
    // each other), and re-derive the target's *current* role from that
    // locked snapshot rather than the `target` fetched before this
    // transaction opened — a concurrent role change in that gap must not
    // be missed, or the last-admin guard below can be silently skipped.
    const rows = await tx.$queryRaw<{ id: string; role: MembershipRole }[]>`
      SELECT id, role FROM membership
      WHERE "organisationId" = ${ctx.organisationId}
      ORDER BY id
      FOR UPDATE
    `;
    const current = rows.find((row) => row.id === target.id);
    if (!current) {
      return { error: "That member could not be found.", updated: false };
    }

    // Order matches the original checks exactly: last-admin guard first,
    // then self-demote, then no-op — only the error precedence for a solo
    // admin demoting themselves ("last admin", not "yourself") depends on it.
    if (current.role === "ADMIN" && role === "MEMBER") {
      const adminCount = rows.filter((row) => row.role === "ADMIN").length;
      if (adminCount <= 1) {
        return { error: "You cannot demote the last admin.", updated: false };
      }
    }

    if (target.userId === ctx.userId && role !== "ADMIN") {
      return { error: "You cannot demote yourself.", updated: false };
    }

    if (current.role === role) {
      return { error: null, updated: false };
    }

    await tx.membership.update({ where: { id: current.id }, data: { role } });
    return { error: null, updated: true };
  });

  if (result.error) {
    return { error: result.error };
  }

  if (!result.updated) {
    return { error: null };
  }

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
    // Every user gets a personal organisation auto-created the first time
    // they load the dashboard (see createPersonalOrganisation), so almost
    // any returning user already has a membership by the time they open an
    // invite. If they're the sole member of that org, leaving it to join
    // the invited one is safe — nobody else is affected, and there's no
    // other way to escape this (no self-service "leave" exists). Only
    // block the switch if leaving would actually orphan other members.
    const existingOrgMemberCount = await prisma.membership.count({
      where: { organisationId: existing.organisationId },
    });

    if (existingOrgMemberCount > 1) {
      return {
        error:
          "You already belong to another organisation. Leave it before accepting this invite.",
      };
    }

    try {
      await prisma.$transaction([
        prisma.membership.delete({ where: { id: existing.id } }),
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
    } catch (error) {
      // A double-submitted accept (double-click, replayed request) can race
      // itself here: the second call's delete/create can hit a row the
      // first call already removed or already claimed. Degrade to a clean
      // message instead of an unhandled 500 — the first call's result
      // stands either way.
      if (isConcurrentWriteConflict(error)) {
        return { error: "This invite may have already been accepted. Refresh and check your dashboard." };
      }
      throw error;
    }

    await writeAuditLog({
      organisationId: invite.organisationId,
      actorId: userId,
      action: "INVITE_ACCEPTED",
      entityType: "invite",
      entityId: invite.id,
      metadata: {
        email: invite.email,
        role: invite.role,
        switchedFromOrganisationId: existing.organisationId,
      },
    });

    return { error: null };
  }

  try {
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
  } catch (error) {
    if (isConcurrentWriteConflict(error)) {
      return { error: "This invite may have already been accepted. Refresh and check your dashboard." };
    }
    throw error;
  }

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
