import { prisma } from "@/lib/prisma";
import type { DocumentRiskLevel, DocumentStatus, WorkflowStatus } from "@prisma/client";

export const ATTENTION_ITEM_LIMIT = 5;

export type AttentionWorkflowItem = {
  id: string;
  name: string;
  status: WorkflowStatus;
  dueDate: Date | null;
};

export type AttentionDocumentItem = {
  id: string;
  fileName: string;
  title: string | null;
  status: DocumentStatus;
  riskLevel: DocumentRiskLevel | null;
};

export type AttentionBucket<T> = { count: number; items: T[] };

export type AttentionSummary = {
  overdueWorkflows: AttentionBucket<AttentionWorkflowItem>;
  dueTodayWorkflows: AttentionBucket<AttentionWorkflowItem>;
  failedDocuments: AttentionBucket<AttentionDocumentItem>;
  highRiskDocuments: AttentionBucket<AttentionDocumentItem>;
};

/**
 * "Today" has no per-user timezone in this app (none is stored anywhere in
 * the schema), so overdue/due-today boundaries are computed in UTC. For a
 * user meaningfully offset from UTC this can be off by up to ~12 hours near
 * midnight — an accepted simplification, not an oversight.
 */
function utcDayBounds(): { startOfToday: Date; startOfTomorrow: Date } {
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startOfTomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return { startOfToday, startOfTomorrow };
}

export async function getAttentionSummary(
  organisationId: string,
): Promise<AttentionSummary> {
  const { startOfToday, startOfTomorrow } = utcDayBounds();

  const workflowSelect = { id: true, name: true, status: true, dueDate: true } as const;
  const documentSelect = {
    id: true,
    fileName: true,
    title: true,
    status: true,
    riskLevel: true,
  } as const;

  const overdueWhere = {
    organisationId,
    deletedAt: null,
    status: { not: "DONE" as const },
    dueDate: { lt: startOfToday },
  };
  const dueTodayWhere = {
    organisationId,
    deletedAt: null,
    status: { not: "DONE" as const },
    dueDate: { gte: startOfToday, lt: startOfTomorrow },
  };
  const failedWhere = {
    organisationId,
    deletedAt: null,
    status: "FAILED" as const,
  };
  const highRiskWhere = {
    organisationId,
    deletedAt: null,
    status: "COMPLETED" as const,
    riskLevel: "HIGH" as const,
  };

  const [
    overdueCount,
    overdueItems,
    dueTodayCount,
    dueTodayItems,
    failedCount,
    failedItems,
    highRiskCount,
    highRiskItems,
  ] = await Promise.all([
    prisma.workflow.count({ where: overdueWhere }),
    prisma.workflow.findMany({
      where: overdueWhere,
      orderBy: { dueDate: "asc" },
      take: ATTENTION_ITEM_LIMIT,
      select: workflowSelect,
    }),
    prisma.workflow.count({ where: dueTodayWhere }),
    prisma.workflow.findMany({
      where: dueTodayWhere,
      orderBy: { dueDate: "asc" },
      take: ATTENTION_ITEM_LIMIT,
      select: workflowSelect,
    }),
    prisma.document.count({ where: failedWhere }),
    prisma.document.findMany({
      where: failedWhere,
      orderBy: { updatedAt: "desc" },
      take: ATTENTION_ITEM_LIMIT,
      select: documentSelect,
    }),
    prisma.document.count({ where: highRiskWhere }),
    prisma.document.findMany({
      where: highRiskWhere,
      orderBy: { updatedAt: "desc" },
      take: ATTENTION_ITEM_LIMIT,
      select: documentSelect,
    }),
  ]);

  return {
    overdueWorkflows: { count: overdueCount, items: overdueItems },
    dueTodayWorkflows: { count: dueTodayCount, items: dueTodayItems },
    failedDocuments: { count: failedCount, items: failedItems },
    highRiskDocuments: { count: highRiskCount, items: highRiskItems },
  };
}

/** Pure — no DB. True when every bucket in the summary is empty. */
export function hasAnyAttentionItems(summary: AttentionSummary): boolean {
  return (
    summary.overdueWorkflows.count > 0 ||
    summary.dueTodayWorkflows.count > 0 ||
    summary.failedDocuments.count > 0 ||
    summary.highRiskDocuments.count > 0
  );
}
