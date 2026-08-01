import { prisma } from "@/lib/prisma";

export function listDocuments(userId: string) {
  return prisma.document.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
}
