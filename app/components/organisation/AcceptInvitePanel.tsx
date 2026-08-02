"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptOrganisationInvite } from "@/app/dashboard/organisation/actions";
import { membershipRoleLabels } from "@/lib/organisation-shared";
import type { MembershipRole } from "@prisma/client";

export function AcceptInvitePanel({
  token,
  organisationName,
  role,
  email,
  signedIn,
  signedInEmail,
}: {
  token: string;
  organisationName: string;
  role: MembershipRole;
  email: string;
  signedIn: boolean;
  signedInEmail: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptOrganisationInvite(token);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  const emailMatches =
    signedInEmail !== null &&
    signedInEmail.trim().toLowerCase() === email.trim().toLowerCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
      <p className="text-sm font-bold tracking-[0.16em] text-teal-700 uppercase">
        Organisation invite
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        Join {organisationName}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        You&apos;ve been invited as{" "}
        <span className="font-medium text-slate-800">
          {membershipRoleLabels[role]}
        </span>{" "}
        for <span className="font-medium text-slate-800">{email}</span>.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      {!signedIn ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/sign-up?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600"
          >
            Create account to accept
          </Link>
          <Link
            href={`/sign-in?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sign in to accept
          </Link>
        </div>
      ) : !emailMatches ? (
        <p className="mt-6 text-sm text-amber-800">
          You&apos;re signed in as {signedInEmail}. Sign out and use {email} to
          accept this invite.
        </p>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={onAccept}
          className="mt-6 inline-flex min-h-10 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-60"
        >
          {isPending ? "Joining…" : "Accept invite"}
        </button>
      )}
    </div>
  );
}
