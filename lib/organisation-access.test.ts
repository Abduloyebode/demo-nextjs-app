import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { listDocuments } from "./documents";
import { listWorkflows } from "./workflows";
import {
  acceptInvite,
  changeMemberRole,
  inviteMember,
  listPendingInvites,
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

  it("lets a user who is the sole member of their own organisation switch orgs by accepting an invite", async () => {
    // Mirrors the auto-created personal organisation every user gets on
    // first dashboard visit: one user, one org, that user as its only
    // (admin) member. Accepting an invite elsewhere should be allowed to
    // silently retire that membership rather than being permanently blocked.
    const soloUser = await prisma.user.create({
      data: { id: randomUUID(), name: "Solo", email: `solo-switch-${randomUUID()}@example.com`, emailVerified: false },
    });
    const soloOrg = await prisma.organisation.create({
      data: {
        name: "Solo Personal Org",
        slug: `solo-switch-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: soloUser.id, role: "ADMIN" } },
      },
    });

    const email = soloUser.email;
    const inviteResult = await inviteMember(adminCtx(), { email, role: "MEMBER" });
    expect(inviteResult.error).toBeNull();
    const rawToken = inviteResult.inviteUrl!.split("/invite/")[1]!;

    const acceptResult = await acceptInvite(rawToken, soloUser.id, email);
    expect(acceptResult.error).toBeNull();

    const membership = await prisma.membership.findUnique({ where: { userId: soloUser.id } });
    expect(membership?.organisationId).toBe(organisationId);
    expect(membership?.role).toBe("MEMBER");

    const oldOrgMemberCount = await prisma.membership.count({ where: { organisationId: soloOrg.id } });
    expect(oldOrgMemberCount).toBe(0);

    await prisma.membership.deleteMany({ where: { userId: soloUser.id } });
    await prisma.organisation.delete({ where: { id: soloOrg.id } });
    await prisma.user.delete({ where: { id: soloUser.id } });
  });

  it("still blocks inviting or switching a user whose existing organisation has other members", async () => {
    const teamUser = await prisma.user.create({
      data: { id: randomUUID(), name: "Teammate", email: `team-member-${randomUUID()}@example.com`, emailVerified: false },
    });
    const teamAdmin = await prisma.user.create({
      data: { id: randomUUID(), name: "Team Admin", email: `team-admin-${randomUUID()}@example.com`, emailVerified: false },
    });
    const teamOrg = await prisma.organisation.create({
      data: {
        name: "Real Team Org",
        slug: `team-${randomUUID().slice(0, 8)}`,
        memberships: {
          create: [
            { userId: teamAdmin.id, role: "ADMIN" },
            { userId: teamUser.id, role: "MEMBER" },
          ],
        },
      },
    });

    // inviteMember itself should refuse to create the invite in the first
    // place, since teamUser isn't the sole member of their current org.
    const inviteResult = await inviteMember(adminCtx(), { email: teamUser.email, role: "MEMBER" });
    expect(inviteResult.error).toMatch(/already belong/i);

    // Even if an invite exists anyway (e.g. created before teamUser joined
    // a second member), acceptInvite must still refuse to switch them.
    const rawToken = createInviteToken();
    await prisma.invite.create({
      data: {
        organisationId,
        email: teamUser.email,
        role: "MEMBER",
        token: hashInviteToken(rawToken),
        invitedById: adminId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const acceptResult = await acceptInvite(rawToken, teamUser.id, teamUser.email);
    expect(acceptResult.error).toMatch(/already belong/i);

    const membership = await prisma.membership.findUnique({ where: { userId: teamUser.id } });
    expect(membership?.organisationId).toBe(teamOrg.id);

    await prisma.organisation.delete({ where: { id: teamOrg.id } });
    await prisma.user.deleteMany({ where: { id: { in: [teamUser.id, teamAdmin.id] } } });
  });

  it("blocks two concurrent invites for the same email from both succeeding", async () => {
    const email = `concurrent-invite-${randomUUID()}@example.com`;

    const [r1, r2] = await Promise.all([
      inviteMember(adminCtx(), { email, role: "MEMBER" }),
      inviteMember(adminCtx(), { email, role: "MEMBER" }),
    ]);

    const errors = [r1.error, r2.error];
    expect(errors.filter((e) => e === null).length).toBe(1);
    expect(errors.find((e) => e !== null)).toMatch(/already pending/i);

    const liveInvites = await prisma.invite.count({
      where: { organisationId, email, status: "PENDING" },
    });
    expect(liveInvites).toBe(1);
  });

  it("excludes expired invites from the pending-invites list even before anyone tries to accept them", async () => {
    const email = `expired-${randomUUID()}@example.com`;
    await prisma.invite.create({
      data: {
        organisationId,
        email,
        role: "MEMBER",
        token: hashInviteToken(createInviteToken()),
        invitedById: adminId,
        status: "PENDING",
        expiresAt: new Date(Date.now() - 60_000), // already past TTL
      },
    });

    const pending = await listPendingInvites(organisationId);
    expect(pending.some((invite) => invite.email === email)).toBe(false);
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
