import type { Metadata } from "next";
import Link from "next/link";
import type { WorkflowStatus } from "@prisma/client";
import { DashboardShell } from "@/app/components/DashboardShell";
import { WorkflowCreateForm } from "@/app/components/workflows/WorkflowCreateForm";
import { WorkflowRow } from "@/app/components/workflows/WorkflowRow";
import { requireOrganisationMembership } from "@/lib/organisation";
import { listWorkflows, type WorkflowSort } from "@/lib/workflows";
import { workflowStatusLabels, workflowStatusValues } from "@/lib/workflow-validation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Dashboard",
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { organisationId, organisation } = await requireOrganisationMembership();

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const status = parseStatus(
    typeof params.status === "string" ? params.status : undefined,
  );
  const sort = parseSort(typeof params.sort === "string" ? params.sort : undefined);

  const workflows = await listWorkflows(organisationId, { search, status, sort });
  const hasActiveFilters = Boolean(search) || Boolean(status);

  return (
    <DashboardShell
      active="workflows"
      eyebrow="Dashboard"
      title={`Welcome, ${session?.user.name ?? "there"}.`}
      subtitle={`Signed in as ${session?.user.email ?? "unknown"} · ${organisation.name}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <form className="flex flex-wrap items-end gap-3" role="search">
          <div>
            <label
              htmlFor="q"
              className="block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
            >
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Search workflows"
              className="mt-1.5 w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status ?? ""}
              className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            >
              <option value="">All statuses</option>
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
              className="block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
            >
              Sort
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Apply
          </button>
          {hasActiveFilters ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-800"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <WorkflowCreateForm />
      </div>

      <div className="mt-8">
        {workflows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {hasActiveFilters
                ? "No workflows match these filters."
                : "No workflows yet."}
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              {hasActiveFilters
                ? "Try clearing the search or status filter."
                : "Create your first workflow to get started."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {workflows.map((workflow) => (
              <WorkflowRow key={workflow.id} workflow={workflow} />
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
