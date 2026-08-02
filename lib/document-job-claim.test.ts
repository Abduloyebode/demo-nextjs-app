import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { claimDocumentForProcessing } from "./document-job-claim";

// Integration test: exercises the real Postgres database, same as
// lib/workflows.test.ts. Covers the atomic claim that prevents the same
// document from being processed twice concurrently (Step 4 success
// criterion: "Prevent the same job from being processed more than once").

describe("claimDocumentForProcessing", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Document Job Test User",
        email: `document-job-test-${randomUUID()}@example.com`,
        emailVerified: false,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("claims a PENDING document with file data", async () => {
    const document = await prisma.document.create({
      data: {
        ownerId: userId,
        fileName: "a.pdf",
        fileSize: 4,
        fileData: Buffer.from("%PDF"),
        status: "PENDING",
      },
    });

    const result = await claimDocumentForProcessing(document.id);
    expect(result).toEqual({ claimed: true });

    const updated = await prisma.document.findUnique({ where: { id: document.id } });
    expect(updated?.status).toBe("PROCESSING");
  });

  it("prevents a second concurrent claim of the same document", async () => {
    const document = await prisma.document.create({
      data: {
        ownerId: userId,
        fileName: "b.pdf",
        fileSize: 4,
        fileData: Buffer.from("%PDF"),
        status: "PENDING",
      },
    });

    // Simulate two "runs" racing to claim the same document at once.
    const [first, second] = await Promise.all([
      claimDocumentForProcessing(document.id),
      claimDocumentForProcessing(document.id),
    ]);

    const claims = [first, second].filter((r) => r.claimed);
    const skips = [first, second].filter((r) => !r.claimed);

    // Exactly one of the two racing attempts should have won the claim.
    expect(claims).toHaveLength(1);
    expect(skips).toHaveLength(1);
  });

  it("refuses to claim an already-COMPLETED document", async () => {
    const document = await prisma.document.create({
      data: {
        ownerId: userId,
        fileName: "c.pdf",
        fileSize: 4,
        status: "COMPLETED",
        title: "Already done",
      },
    });

    const result = await claimDocumentForProcessing(document.id);
    expect(result).toEqual({ claimed: false, reason: "COMPLETED" });
  });

  it("refuses to claim an already-FAILED document", async () => {
    const document = await prisma.document.create({
      data: {
        ownerId: userId,
        fileName: "d.pdf",
        fileSize: 4,
        status: "FAILED",
        errorMessage: "boom",
      },
    });

    const result = await claimDocumentForProcessing(document.id);
    expect(result).toEqual({ claimed: false, reason: "FAILED" });
  });

  it("refuses to claim a document with no file data", async () => {
    const document = await prisma.document.create({
      data: {
        ownerId: userId,
        fileName: "e.pdf",
        fileSize: 4,
        status: "PENDING",
        fileData: null,
      },
    });

    const result = await claimDocumentForProcessing(document.id);
    expect(result).toEqual({ claimed: false, reason: "no_file_data" });
  });

  it("returns not_found for a nonexistent document id", async () => {
    const result = await claimDocumentForProcessing("nonexistent-id");
    expect(result).toEqual({ claimed: false, reason: "not_found" });
  });
});
