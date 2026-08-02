import type { Metadata } from "next";
import { DashboardShell } from "@/app/components/DashboardShell";
import { InviteMemberForm } from "@/app/components/organisation/InviteMemberForm";
import {
  MemberList,
  PendingInviteList,
} from "@/app/components/organisation/MemberList";
import { listAuditLogs } from "@/lib/audit";
import {
  isAdmin,
  membershipRoleLabels,
  requireOrganisationMembership,
} from "@/lib/organisation";
import {
  listOrganisationMembers,
  listPendingInvites,
} from "@/lib/organisation-admin";

export const metadata: Metadata = {
  title: "Organisation",
};

const auditLabels: Record<string, string> = {
  ORGANISATION_CREATED: "Organisation created",
  MEMBER_INVITED: "Member invited",
  INVITE_REVOKED: "Invite revoked",
  INVITE_ACCEPTED: "Invite accepted",
  MEMBER_REMOVED: "Member removed",
  MEMBER_ROLE_CHANGED: "Member role changed",
};

export default async function OrganisationPage() {
  const ctx = await requireOrganisationMembership();
  const canManage = isAdmin(ctx.role);

  const [members, invites, auditLogs] = await Promise.all([
    listOrganisationMembers(ctx.organisationId),
    canManage
      ? listPendingInvites(ctx.organisationId)
      : Promise.resolve([]),
    canManage
      ? listAuditLogs(ctx.organisationId)
      : Promise.resolve([]),
  ]);

  return (
    <DashboardShell
      active="organisation"
      eyebrow="Organisation"
      title={ctx.organisation.name}
      subtitle={
        canManage
          ? "You are an admin. Invite people, manage roles, and review the audit log."
          : `You are a ${membershipRoleLabels[ctx.role].toLowerCase()}. You can use workflows and documents; only admins manage membership.`
      }
    >
      <div className="space-y-6">
        {canManage ? <InviteMemberForm /> : null}

        <MemberList
          members={members}
          currentUserId={ctx.userId}
          canManage={canManage}
        />

        {canManage ? (
          <PendingInviteList invites={invites} canManage={canManage} />
        ) : null}

        {canManage ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
            <h3 className="text-sm font-semibold text-slate-900">Audit log</h3>
            <p className="mt-1 text-sm text-slate-500">
              Recent membership and permission changes.
            </p>
            {auditLogs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No events yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {auditLogs.map((entry) => (
                  <li key={entry.id} className="py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {auditLabels[entry.action] ?? entry.action}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {entry.actor
                        ? `${entry.actor.name} (${entry.actor.email})`
                        : "System"}{" "}
                      · {entry.createdAt.toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
