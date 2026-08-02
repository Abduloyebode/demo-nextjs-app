import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { WorkflowStatus } from "@prisma/client";
import { DashboardShell } from "@/app/components/DashboardShell";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { WorkflowCreateForm } from "@/app/components/workflows/WorkflowCreateForm";
import { WorkflowRow } from "@/app/components/workflows/WorkflowRow";
import { auth } from "@/lib/auth";
import { listWorkflows, type WorkflowSort } from "@/lib/workflows";
import { workflowStatusLabels, workflowStatusValues } from "@/lib/workflow-validation";

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

  if (!session) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const status = parseStatus(
    typeof params.status === "string" ? params.status : undefined,
  );
  const sort = parseSort(typeof params.sort === "string" ? params.sort : undefined);

  const workflows = await listWorkflows(session.user.id, { search, status, sort });
  const hasActiveFilters = Boolean(search) || Boolean(status);

  return (
    <DashboardShell
      active="workflows"
      title="Workflows"
      subtitle={`Track the work that moves this week · ${session.user.email}`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
          {hasActiveFilters ? (
            <Link
              href="/dashboard"
              className="pb-2 text-sm font-medium text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <WorkflowCreateForm />
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
                ? "Clear search or status to see everything again."
                : "Create a workflow for the next concrete piece of work."
            }
            action={!hasActiveFilters ? <WorkflowCreateForm /> : undefined}
          />
        ) : (
          <ul className="space-y-3" aria-label="Workflow list">
            {workflows.map((workflow) => (
              <WorkflowRow key={workflow.id} workflow={workflow} />
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
