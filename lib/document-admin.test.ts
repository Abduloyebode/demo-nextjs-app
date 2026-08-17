import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  deleteDocumentForOrg,
  restoreDocumentForOrg,
  type DocumentContext,
} from "./document-admin";

// Integration test: exercises the real Postgres database (see docker-compose.yml).
// Requires DATABASE_URL to point at a running Postgres instance with migrations applied.

describe("document-admin", () => {
  let userId: string;
  let organisationId: string;
  let ctx: DocumentContext;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Doc Admin Test User",
        email: `doc-admin-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    userId = user.id;

    const organisation = await prisma.organisation.create({
      data: {
        name: "Document Admin Test Org",
        slug: `doc-admin-${randomUUID().slice(0, 8)}`,
        memberships: { create: { userId, role: "ADMIN" } },
      },
    });
    organisationId = organisation.id;

    ctx = { userId, organisationId };
  });

  afterAll(async () => {
    if (organisationId) await prisma.organisation.delete({ where: { id: organisationId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("soft-deletes: sets deletedAt, keeps fileData intact, writes an audit entry", async () => {
    const created = await prisma.document.create({
      data: {
        fileName: "still-pending.pdf",
        fileSize: 10,
        fileData: Buffer.from("%PDF-fake"),
        status: "PENDING",
        ownerId: userId,
        organisationId,
      },
    });

    const result = await deleteDocumentForOrg(ctx, created.id);
    expect(result.error).toBeNull();

    const deleted = await prisma.document.findUniqueOrThrow({ where: { id: created.id } });
    expect(deleted.deletedAt).not.toBeNull();
    expect(deleted.fileData).not.toBeNull();
    expect(deleted.status).toBe("PENDING");

    const auditEntry = await prisma.auditLog.findFirst({
      where: { organisationId, entityId: created.id, action: "DOCUMENT_DELETED" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("restore round-trip leaves fileData and status exactly as they were (lossless)", async () => {
    const created = await prisma.document.create({
      data: {
        fileName: "restore-me.pdf",
        fileSize: 10,
        fileData: Buffer.from("%PDF-fake"),
        status: "PENDING",
        ownerId: userId,
        organisationId,
        deletedAt: new Date(),
      },
    });

    const result = await restoreDocumentForOrg(ctx, created.id);
    expect(result.error).toBeNull();

    const restored = await prisma.document.findUniqueOrThrow({ where: { id: created.id } });
    expect(restored.deletedAt).toBeNull();
    expect(Buffer.from(restored.fileData!).toString()).toBe("%PDF-fake");
    expect(restored.status).toBe("PENDING");

    const auditEntry = await prisma.auditLog.findFirst({
      where: { organisationId, entityId: created.id, action: "DOCUMENT_RESTORED" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("returns a not-found error for a document in a different organisation", async () => {
    const otherOrg = await prisma.organisation.create({
      data: { name: "Other Doc Org", slug: `doc-admin-other-${randomUUID().slice(0, 8)}` },
    });
    const otherDoc = await prisma.document.create({
      data: {
        fileName: "not-yours.pdf",
        fileSize: 10,
        status: "PENDING",
        ownerId: userId,
        organisationId: otherOrg.id,
      },
    });

    try {
      const result = await deleteDocumentForOrg(ctx, otherDoc.id);
      expect(result.error).toMatch(/could not be found/i);
    } finally {
      await prisma.organisation.delete({ where: { id: otherOrg.id } });
    }
  });
});
