import type { Metadata } from "next";
import Link from "next/link";
import type { WorkflowStatus } from "@prisma/client";
import { DashboardShell } from "@/app/components/DashboardShell";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { WorkflowCreateForm } from "@/app/components/workflows/WorkflowCreateForm";
import { WorkflowRow } from "@/app/components/workflows/WorkflowRow";
import { WorkflowTrashRow } from "@/app/components/workflows/WorkflowTrashRow";
import { AttentionPanel } from "@/app/components/attention/AttentionPanel";
import { requireOrganisationMembership } from "@/lib/organisation";
import { listOrganisationMembers } from "@/lib/organisation-admin";
import { listWorkflows, type WorkflowSort } from "@/lib/workflows";
import { workflowStatusLabels, workflowStatusValues } from "@/lib/workflow-validation";
import { getAttentionSummary } from "@/lib/attention";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Workflows",
};

function parseStatus(value: string | undefined): WorkflowStatus | undefined {
  if (value && (workflowStatusValues as readonly string[]).includes(value)) {
    return value as WorkflowStatus;
  }
  return undefined;
}

function parseSort(value: string | undefined): WorkflowSort {
  if (value === "oldest" || value === "name") {
    return value;
  }
  return "newest";
}

const fieldClass =
  "mt-1.5 w-full min-w-[10rem] rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] sm:w-auto";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { userId, organisationId, organisation } = await requireOrganisationMembership();

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const status = parseStatus(
    typeof params.status === "string" ? params.status : undefined,
  );
  const sort = parseSort(typeof params.sort === "string" ? params.sort : undefined);
  const deletedView = params.view === "deleted";
  const assignedToMe = params.assignee === "me";

  const [workflows, members, attentionSummary] = await Promise.all([
    listWorkflows(organisationId, {
      search,
      status,
      sort,
      assigneeId: assignedToMe ? userId : undefined,
      deleted: deletedView,
    }),
    listOrganisationMembers(organisationId),
    deletedView ? null : getAttentionSummary(organisationId),
  ]);

  const memberOptions = members.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
  }));

  const hasActiveFilters = Boolean(search) || Boolean(status) || assignedToMe;

  return (
    <DashboardShell
      active="workflows"
      eyebrow={organisation.name}
      title="Workflows"
      subtitle={`Track the work that moves this week · ${session?.user.email ?? "unknown"}`}
    >
      {!deletedView && attentionSummary ? (
        <div className="mb-6">
          <AttentionPanel summary={attentionSummary} />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {deletedView ? (
            <Link
              href="/dashboard"
              className="font-medium text-[var(--teal)] underline decoration-[var(--teal)]/40 underline-offset-4 hover:text-[var(--teal-bright)]"
            >
              ← Back to workflows
            </Link>
          ) : (
            <Link
              href="/dashboard?view=deleted"
              className="font-medium text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]"
            >
              Recently deleted
            </Link>
          )}
        </div>
      </div>

      {deletedView ? (
        <div className="mt-6">
          {workflows.length === 0 ? (
            <EmptyState
              title="Nothing in the trash"
              description="Deleted workflows show up here and can be restored."
            />
          ) : (
            <ul className="space-y-3" aria-label="Deleted workflow list">
              {workflows.map((workflow) => (
                <WorkflowTrashRow key={workflow.id} workflow={workflow} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <form
              className="flex flex-1 flex-wrap items-end gap-3"
              role="search"
              aria-label="Filter workflows"
            >
              <div className="min-w-[12rem] flex-1 sm:max-w-xs">
                <label
                  htmlFor="q"
                  className="block text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase"
                >
                  Search
                </label>
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={search}
                  placeholder="Name or description"
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status ?? ""}
                  className={fieldClass}
                >
                  <option value="">All</option>
                  {workflowStatusValues.map((value) => (
                    <option key={value} value={value}>
                      {workflowStatusLabels[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sort"
                  className="block text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase"
                >
                  Sort
                </label>
                <select id="sort" name="sort" defaultValue={sort} className={fieldClass}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
              </div>

              <button
                type="submit"
                className="inline-flex min-h-10 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--teal)]/40 hover:bg-[var(--teal-soft)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
              >
                Apply
              </button>
              {assignedToMe ? (
                <Link
                  href={{ pathname: "/dashboard", query: { q: search, status } }}
                  className="pb-2 text-sm font-medium text-[var(--teal)] underline decoration-[var(--teal)]/40 underline-offset-4 hover:text-[var(--teal-bright)]"
                >
                  Assigned to me ✕
                </Link>
              ) : (
                <Link
                  href={{ pathname: "/dashboard", query: { q: search, status, assignee: "me" } }}
                  className="pb-2 text-sm font-medium text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]"
                >
                  Assigned to me
                </Link>
              )}
              {hasActiveFilters ? (
                <Link
                  href="/dashboard"
                  className="pb-2 text-sm font-medium text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]"
                >
                  Clear
                </Link>
              ) : null}
            </form>

            <WorkflowCreateForm members={memberOptions} />
          </div>

          <div className="mt-6">
            {workflows.length === 0 ? (
              <EmptyState
                title={
                  hasActiveFilters
                    ? "No workflows match these filters"
                    : "No workflows yet"
                }
                description={
                  hasActiveFilters
                    ? "Clear search, status, or assignee to see everything again."
                    : "Create a workflow for the next concrete piece of work."
                }
                action={!hasActiveFilters ? <WorkflowCreateForm members={memberOptions} /> : undefined}
              />
            ) : (
              <ul className="space-y-3" aria-label="Workflow list">
                {workflows.map((workflow) => (
                  <WorkflowRow key={workflow.id} workflow={workflow} members={memberOptions} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
