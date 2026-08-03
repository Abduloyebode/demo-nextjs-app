import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";
import { removeMember, changeMemberRole } from "./organisation-admin";
import type { OrganisationContext } from "./organisation";

async function makeTwoAdminOrg() {
  const admin1 = await prisma.user.create({
    data: { id: randomUUID(), name: "A1", email: `a1-${randomUUID()}@example.com`, emailVerified: false },
  });
  const admin2 = await prisma.user.create({
    data: { id: randomUUID(), name: "A2", email: `a2-${randomUUID()}@example.com`, emailVerified: false },
  });
  const org = await prisma.organisation.create({
    data: {
      name: "Race Org",
      slug: `race-${randomUUID().slice(0, 8)}`,
      memberships: {
        create: [
          { userId: admin1.id, role: "ADMIN" },
          { userId: admin2.id, role: "ADMIN" },
        ],
      },
    },
    include: { memberships: true },
  });
  const m1 = org.memberships.find((m) => m.userId === admin1.id)!;
  const m2 = org.memberships.find((m) => m.userId === admin2.id)!;
  return { admin1, admin2, org, m1, m2 };
}

describe("last-admin protection under concurrent requests", () => {
  it("two admins concurrently removing each other never leaves zero admins", async () => {
    const { admin1, admin2, org, m1, m2 } = await makeTwoAdminOrg();
    const ctx1: OrganisationContext = { userId: admin1.id, organisationId: org.id, role: "ADMIN", membershipId: m1.id, organisation: org };
    const ctx2: OrganisationContext = { userId: admin2.id, organisationId: org.id, role: "ADMIN", membershipId: m2.id, organisation: org };

    const [r1, r2] = await Promise.all([
      removeMember(ctx1, m2.id),
      removeMember(ctx2, m1.id),
    ]);

    const remainingAdmins = await prisma.membership.count({ where: { organisationId: org.id, role: "ADMIN" } });
    expect(remainingAdmins).toBeGreaterThanOrEqual(1);
    // exactly one of the two concurrent calls should have been rejected
    expect([r1.error, r2.error].filter((e) => e !== null).length).toBe(1);

    await prisma.organisation.deleteMany({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { id: { in: [admin1.id, admin2.id] } } });
  });

  it("two admins concurrently demoting each other never leaves zero admins", async () => {
    const { admin1, admin2, org, m1, m2 } = await makeTwoAdminOrg();
    const ctx1: OrganisationContext = { userId: admin1.id, organisationId: org.id, role: "ADMIN", membershipId: m1.id, organisation: org };
    const ctx2: OrganisationContext = { userId: admin2.id, organisationId: org.id, role: "ADMIN", membershipId: m2.id, organisation: org };

    const [r1, r2] = await Promise.all([
      changeMemberRole(ctx1, m2.id, "MEMBER"),
      changeMemberRole(ctx2, m1.id, "MEMBER"),
    ]);

    const remainingAdmins = await prisma.membership.count({ where: { organisationId: org.id, role: "ADMIN" } });
    expect(remainingAdmins).toBeGreaterThanOrEqual(1);
    expect([r1.error, r2.error].filter((e) => e !== null).length).toBe(1);

    await prisma.organisation.deleteMany({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { id: { in: [admin1.id, admin2.id] } } });
  });

  it("removeMember blocks deleting the last admin even if the pre-fetch snapshot was stale", async () => {
    // Simulates: another request promotes `target` to admin (its org's only
    // admin) in the gap between removeMember's initial findFirst and the
    // transaction that decides whether to delete it. The guard must judge
    // the *current* DB state, not whatever findFirst happened to return.
    const caller = await prisma.user.create({
      data: { id: randomUUID(), name: "Caller", email: `caller-${randomUUID()}@example.com`, emailVerified: false },
    });
    const targetUser = await prisma.user.create({
      data: { id: randomUUID(), name: "Target", email: `target-${randomUUID()}@example.com`, emailVerified: false },
    });
    const org = await prisma.organisation.create({
      data: {
        name: "Stale Read Org",
        slug: `stale-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: targetUser.id, role: "MEMBER" } },
      },
      include: { memberships: true },
    });
    const target = org.memberships[0]!;

    const staleSnapshot = { ...target, role: "MEMBER" as const };
    const findFirstSpy = vi
      .spyOn(prisma.membership, "findFirst")
      .mockImplementationOnce(
        (async () => staleSnapshot) as unknown as typeof prisma.membership.findFirst,
      );

    // Really promote target to admin — it's now the org's only admin —
    // simulating the concurrent change the stale snapshot missed.
    await prisma.membership.update({ where: { id: target.id }, data: { role: "ADMIN" } });

    const ctx: OrganisationContext = {
      userId: caller.id,
      organisationId: org.id,
      role: "ADMIN",
      membershipId: "not-a-real-membership",
      organisation: org,
    };

    const result = await removeMember(ctx, target.id);
    findFirstSpy.mockRestore();

    expect(result.error).toMatch(/last admin/i);
    const stillThere = await prisma.membership.findUnique({ where: { id: target.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.role).toBe("ADMIN");

    await prisma.organisation.deleteMany({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { id: { in: [caller.id, targetUser.id] } } });
  });

  it("changeMemberRole blocks demoting the last admin even if the pre-fetch snapshot was stale", async () => {
    const caller = await prisma.user.create({
      data: { id: randomUUID(), name: "Caller", email: `caller-${randomUUID()}@example.com`, emailVerified: false },
    });
    const targetUser = await prisma.user.create({
      data: { id: randomUUID(), name: "Target", email: `target-${randomUUID()}@example.com`, emailVerified: false },
    });
    const org = await prisma.organisation.create({
      data: {
        name: "Stale Read Org 2",
        slug: `stale2-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId: targetUser.id, role: "MEMBER" } },
      },
      include: { memberships: true },
    });
    const target = org.memberships[0]!;

    const staleSnapshot = { ...target, role: "MEMBER" as const };
    const findFirstSpy = vi
      .spyOn(prisma.membership, "findFirst")
      .mockImplementationOnce(
        (async () => staleSnapshot) as unknown as typeof prisma.membership.findFirst,
      );

    await prisma.membership.update({ where: { id: target.id }, data: { role: "ADMIN" } });

    const ctx: OrganisationContext = {
      userId: caller.id,
      organisationId: org.id,
      role: "ADMIN",
      membershipId: "not-a-real-membership",
      organisation: org,
    };

    const result = await changeMemberRole(ctx, target.id, "MEMBER");
    findFirstSpy.mockRestore();

    expect(result.error).toMatch(/last admin/i);
    const stillThere = await prisma.membership.findUnique({ where: { id: target.id } });
    expect(stillThere?.role).toBe("ADMIN");

    await prisma.organisation.deleteMany({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { id: { in: [caller.id, targetUser.id] } } });
  });
});
