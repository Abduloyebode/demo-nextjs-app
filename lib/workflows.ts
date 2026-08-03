import { prisma } from "@/lib/prisma";
import type { WorkflowStatus } from "@prisma/client";

export type WorkflowSort = "newest" | "oldest" | "name";

export type ListWorkflowsParams = {
  search?: string;
  status?: WorkflowStatus;
  sort?: WorkflowSort;
};

export function listWorkflows(
  organisationId: string,
  params: ListWorkflowsParams,
) {
  const { search, status, sort = "newest" } = params;

  return prisma.workflow.findMany({
    where: {
      organisationId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy:
      sort === "name"
        ? { name: "asc" as const }
        : sort === "oldest"
          ? { createdAt: "asc" as const }
          : { createdAt: "desc" as const },
  });
}
