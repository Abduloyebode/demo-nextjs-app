import { prisma } from "@/lib/prisma";
import type { User, Workflow, WorkflowStatus } from "@prisma/client";

export type WorkflowSort = "newest" | "oldest" | "name";

export type WorkflowAssignee = Pick<User, "id" | "name" | "email">;

export type WorkflowListItem = Workflow & { assignee: WorkflowAssignee | null };

export type ListWorkflowsParams = {
  search?: string;
  status?: WorkflowStatus;
  sort?: WorkflowSort;
  /** Scope the list to workflows assigned to this user id. */
  assigneeId?: string;
  /** false/undefined = active workflows only (default). true = trash view (soft-deleted only). */
  deleted?: boolean;
};

export function listWorkflows(
  organisationId: string,
  params: ListWorkflowsParams,
): Promise<WorkflowListItem[]> {
  const { search, status, sort = "newest", assigneeId, deleted = false } = params;

  return prisma.workflow.findMany({
    where: {
      organisationId,
      deletedAt: deleted ? { not: null } : null,
      ...(status ? { status } : {}),
      ...(assigneeId ? { assigneeId } : {}),
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
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
}
