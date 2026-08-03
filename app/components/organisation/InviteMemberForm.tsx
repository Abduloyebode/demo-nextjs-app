"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inviteOrganisationMember } from "@/app/dashboard/organisation/actions";

export function InviteMemberForm() {
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInviteUrl(null);
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    startTransition(async () => {
      const result = await inviteOrganisationMember(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInviteUrl(result.inviteUrl ?? null);
      form.reset();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40"
    >
      <h3 className="text-sm font-semibold text-slate-900">Invite a member</h3>
      <p className="mt-1 text-sm text-slate-500">
        No email provider yet — the invite link is logged on the server and shown
        below after you create it.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      {inviteUrl ? (
        <p
          role="status"
          className="mt-3 break-all rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          Invite created. Share this link: {inviteUrl}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="invite-email"
            className="block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
          >
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            placeholder="teammate@company.com"
          />
        </div>
        <div>
          <label
            htmlFor="invite-role"
            className="block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
          >
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="MEMBER"
            className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Create invite"}
        </button>
      </div>
    </form>
  );
}
