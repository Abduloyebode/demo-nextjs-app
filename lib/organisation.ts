import { createHash, randomBytes } from "node:crypto";
import type { MembershipRole, Organisation } from "@prisma/client";
import { isUniqueConstraintViolation, prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user-id";
import { writeAuditLog } from "@/lib/audit";
import { slugifyOrgBase } from "@/lib/organisation-shared";

export type OrganisationContext = {
  userId: string;
  organisationId: string;
  role: MembershipRole;
  organisation: Organisation;
  membershipId: string;
};

export {
  isAdmin,
  membershipRoleLabels,
  membershipRoleValues,
  slugifyOrgBase,
} from "@/lib/organisation-shared";

export function buildOrganisationSlug(base: string): string {
  const suffix = randomBytes(4).toString("hex");
  return `${slugifyOrgBase(base)}-${suffix}`;
}

export function createInviteToken(): string {
  return randomBytes(24).toString("hex");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPersonalOrganisation(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const baseName = user.name.trim() || user.email.split("@")[0] || "Team";
  const name = `${baseName}'s organisation`;
  const slug = buildOrganisationSlug(user.email.split("@")[0] || "org");

  try {
    const organisation = await prisma.organisation.create({
      data: {
        name,
        slug,
        memberships: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });

    await writeAuditLog({
      organisationId: organisation.id,
      actorId: userId,
      action: "ORGANISATION_CREATED",
      entityType: "organisation",
      entityId: organisation.id,
      metadata: { source: "bootstrap" },
    });
  } catch (error) {
    // Two concurrent first-ever dashboard loads for a brand-new user can
    // both reach here; only one organisation.create can win the unique
    // constraint on Membership.userId (nested writes are atomic, so the
    // loser's whole create — organisation included — rolls back cleanly).
    // Fall back to the membership the winner created instead of surfacing
    // an unhandled 500.
    if (!isUniqueConstraintViolation(error)) {
      throw error;
    }
  }

  const membership = await prisma.membership.findUniqueOrThrow({
    where: { userId },
    include: { organisation: true },
  });

  return membership;
}

export async function requireOrganisationMembership(): Promise<OrganisationContext> {
  const userId = await requireUserId();

  let membership = await prisma.membership.findUnique({
    where: { userId },
    include: { organisation: true },
  });

  if (!membership) {
    membership = await createPersonalOrganisation(userId);
  }

  return {
    userId,
    organisationId: membership.organisationId,
    role: membership.role,
    organisation: membership.organisation,
    membershipId: membership.id,
  };
}
