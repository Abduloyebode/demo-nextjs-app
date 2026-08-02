import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
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
});
