"use client";

import { useState, useTransition } from "react";
import type { MembershipRole } from "@prisma/client";
import {
  changeOrganisationMemberRole,
  removeOrganisationMember,
  revokeOrganisationInvite,
} from "@/app/dashboard/organisation/actions";
import { membershipRoleLabels } from "@/lib/organisation-shared";

type MemberRow = {
  id: string;
  role: MembershipRole;
  user: { id: string; name: string; email: string };
};

type InviteRow = {
  id: string;
  email: string;
  role: MembershipRole;
  expiresAt: Date | string;
};

export function MemberList({
  members,
  currentUserId,
  canManage,
}: {
  members: MemberRow[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onRemove(membershipId: string, email: string) {
    if (!window.confirm(`Remove ${email} from this organisation?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await removeOrganisationMember(membershipId);
      if (result.error) setError(result.error);
    });
  }

  function onRoleChange(membershipId: string, role: MembershipRole) {
    setError(null);
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    formData.set("role", role);
    startTransition(async () => {
      const result = await changeOrganisationMemberRole(formData);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <h3 className="text-sm font-semibold text-slate-900">Members</h3>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-slate-100">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {member.user.name}
                {member.user.id === currentUserId ? (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    (you)
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-500">{member.user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManage ? (
                <select
                  aria-label={`Role for ${member.user.email}`}
                  disabled={isPending || member.user.id === currentUserId}
                  value={member.role}
                  onChange={(event) =>
                    onRoleChange(
                      member.id,
                      event.target.value as MembershipRole,
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:opacity-60"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {membershipRoleLabels[member.role]}
                </span>
              )}
              {canManage && member.user.id !== currentUserId ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onRemove(member.id, member.user.email)}
                  className="inline-flex min-h-8 items-center rounded-full border border-rose-200 px-3 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PendingInviteList({
  invites,
  canManage,
}: {
  invites: InviteRow[];
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) return null;

  function onRevoke(inviteId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeOrganisationInvite(inviteId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <h3 className="text-sm font-semibold text-slate-900">Pending invites</h3>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-slate-100">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">{invite.email}</p>
              <p className="text-xs text-slate-500">
                {membershipRoleLabels[invite.role]} · expires{" "}
                {new Date(invite.expiresAt).toLocaleDateString()}
              </p>
            </div>
            {canManage ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => onRevoke(invite.id)}
                className="inline-flex min-h-8 items-center rounded-full border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
