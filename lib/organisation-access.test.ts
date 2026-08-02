import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { listDocuments } from "./documents";
import { listWorkflows } from "./workflows";
import {
  acceptInvite,
  changeMemberRole,
  inviteMember,
  removeMember,
} from "./organisation-admin";
import {
  createInviteToken,
  hashInviteToken,
  type OrganisationContext,
} from "./organisation";
import { writeAuditLog } from "./audit";

describe("organisation access control", () => {
  let adminId: string;
  let memberId: string;
  let outsiderId: string;
  let organisationId: string;
  let otherOrganisationId: string;
  let adminMembershipId: string;
  let memberMembershipId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Org Admin",
        email: `org-admin-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    adminId = admin.id;

    const member = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Org Member",
        email: `org-member-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    memberId = member.id;

    const outsider = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Outsider",
        email: `org-outsider-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    outsiderId = outsider.id;

    const organisation = await prisma.organisation.create({
      data: {
        name: "Access Control Org",
        slug: `access-${randomUUID().slice(0, 8)}`,
        memberships: {
          create: [
            { userId: adminId, role: "ADMIN" },
            { userId: memberId, role: "MEMBER" },
          ],
        },
      },
      include: { memberships: true },
    });
    organisationId = organisation.id;
    adminMembershipId = organisation.memberships.find((m) => m.userId === adminId)!.id;
    memberMembershipId = organisation.memberships.find((m) => m.userId === memberId)!.id;

    const otherOrganisation = await prisma.organisation.create({
      data: {
        name: "Other Access Org",
        slug: `other-access-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: outsiderId, role: "ADMIN" } },
      },
    });
    otherOrganisationId = otherOrganisation.id;

    await prisma.workflow.create({
      data: {
        name: "Org workflow",
        ownerId: adminId,
        organisationId,
        status: "NOT_STARTED",
      },
    });
    await prisma.workflow.create({
      data: {
        name: "Other org workflow",
        ownerId: outsiderId,
        organisationId: otherOrganisationId,
        status: "DONE",
      },
    });

    await prisma.document.create({
      data: {
        fileName: "org.pdf",
        fileSize: 10,
        ownerId: adminId,
        organisationId,
        status: "COMPLETED",
      },
    });
    await prisma.document.create({
      data: {
        fileName: "other.pdf",
        fileSize: 10,
        ownerId: outsiderId,
        organisationId: otherOrganisationId,
        status: "COMPLETED",
      },
    });
  });

  afterAll(async () => {
    if (organisationId) {
      await prisma.organisation.delete({ where: { id: organisationId } });
    }
    if (otherOrganisationId) {
      await prisma.organisation.delete({ where: { id: otherOrganisationId } });
    }
    if (adminId) await prisma.user.delete({ where: { id: adminId } });
    if (memberId) await prisma.user.delete({ where: { id: memberId } });
    if (outsiderId) await prisma.user.delete({ where: { id: outsiderId } });
    await prisma.$disconnect();
  });

  function adminCtx(): OrganisationContext {
    return {
      userId: adminId,
      organisationId,
      role: "ADMIN",
      membershipId: adminMembershipId,
      organisation: {
        id: organisationId,
        name: "Access Control Org",
        slug: "x",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  function memberCtx(): OrganisationContext {
    return {
      userId: memberId,
      organisationId,
      role: "MEMBER",
      membershipId: memberMembershipId,
      organisation: {
        id: organisationId,
        name: "Access Control Org",
        slug: "x",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  it("lists only workflows for the caller's organisation", async () => {
    const mine = await listWorkflows(organisationId, {});
    expect(mine.map((w) => w.name)).toEqual(["Org workflow"]);

    const theirs = await listWorkflows(otherOrganisationId, {});
    expect(theirs.map((w) => w.name)).toEqual(["Other org workflow"]);
  });

  it("lists only documents for the caller's organisation", async () => {
    const mine = await listDocuments(organisationId);
    expect(mine.map((d) => d.fileName)).toEqual(["org.pdf"]);

    const theirs = await listDocuments(otherOrganisationId);
    expect(theirs.map((d) => d.fileName)).toEqual(["other.pdf"]);
  });

  it("blocks members from inviting other people", async () => {
    const result = await inviteMember(memberCtx(), {
      email: `new-${randomUUID()}@example.com`,
      role: "MEMBER",
    });
    expect(result.error).toMatch(/only admins/i);
  });

  it("blocks members from changing roles", async () => {
    const result = await changeMemberRole(memberCtx(), memberMembershipId, "ADMIN");
    expect(result.error).toMatch(/only admins/i);
  });

  it("blocks members from removing people", async () => {
    const result = await removeMember(memberCtx(), memberMembershipId);
    expect(result.error).toMatch(/only admins/i);
  });

  it("lets admins invite and accept a new member, writing audit events", async () => {
    const email = `invitee-${randomUUID()}@example.com`;
    const inviteResult = await inviteMember(adminCtx(), {
      email,
      role: "MEMBER",
    });
    expect(inviteResult.error).toBeNull();
    expect(inviteResult.inviteUrl).toContain("/invite/");

    const rawToken = inviteResult.inviteUrl!.split("/invite/")[1]!;
    const invitee = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Invitee",
        email,
        emailVerified: false,
      },
    });

    const acceptResult = await acceptInvite(rawToken, invitee.id, email);
    expect(acceptResult.error).toBeNull();

    const membership = await prisma.membership.findUnique({
      where: { userId: invitee.id },
    });
    expect(membership?.organisationId).toBe(organisationId);
    expect(membership?.role).toBe("MEMBER");

    const audits = await prisma.auditLog.findMany({
      where: {
        organisationId,
        action: { in: ["MEMBER_INVITED", "INVITE_ACCEPTED"] },
      },
    });
    expect(audits.length).toBeGreaterThanOrEqual(2);

    await prisma.user.delete({ where: { id: invitee.id } });
  });

  it("rejects accepting an invite with the wrong email", async () => {
    const email = `wrong-email-${randomUUID()}@example.com`;
    const rawToken = createInviteToken();
    await prisma.invite.create({
      data: {
        organisationId,
        email,
        role: "MEMBER",
        token: hashInviteToken(rawToken),
        invitedById: adminId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const result = await acceptInvite(rawToken, outsiderId, "not-the-invite@example.com");
    expect(result.error).toMatch(/email/i);
  });

  it("prevents demoting the last admin", async () => {
    const soloAdmin = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Solo Admin",
        email: `solo-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    const soloOrg = await prisma.organisation.create({
      data: {
        name: "Solo Org",
        slug: `solo-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: soloAdmin.id, role: "ADMIN" } },
      },
      include: { memberships: true },
    });

    const ctx: OrganisationContext = {
      userId: soloAdmin.id,
      organisationId: soloOrg.id,
      role: "ADMIN",
      membershipId: soloOrg.memberships[0]!.id,
      organisation: soloOrg,
    };

    const result = await changeMemberRole(
      ctx,
      soloOrg.memberships[0]!.id,
      "MEMBER",
    );
    expect(result.error).toMatch(/last admin/i);

    await prisma.organisation.delete({ where: { id: soloOrg.id } });
    await prisma.user.delete({ where: { id: soloAdmin.id } });
  });

  it("records an audit log entry", async () => {
    await writeAuditLog({
      organisationId,
      actorId: adminId,
      action: "MEMBER_ROLE_CHANGED",
      entityType: "membership",
      entityId: memberMembershipId,
      metadata: { from: "MEMBER", to: "MEMBER" },
    });

    const latest = await prisma.auditLog.findFirst({
      where: { organisationId, action: "MEMBER_ROLE_CHANGED" },
      orderBy: { createdAt: "desc" },
    });
    expect(latest?.actorId).toBe(adminId);
  });
});
