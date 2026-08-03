import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { AcceptInvitePanel } from "@/app/components/organisation/AcceptInvitePanel";
import { auth } from "@/lib/auth";
import { getInvitePreview } from "@/lib/organisation-admin";

export const metadata: Metadata = {
  title: "Accept invite",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getInvitePreview(token);
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="font-semibold tracking-tight text-slate-950"
          >
            Northstar Ops
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-14">
        {!preview || preview.status !== "PENDING" || preview.expired ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-slate-950">
              Invite unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              This invite is missing, expired, or already used.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex text-sm font-medium text-teal-700 underline"
            >
              Go to dashboard
            </Link>
          </div>
        ) : (
          <AcceptInvitePanel
            token={token}
            organisationName={preview.organisationName}
            role={preview.role}
            email={preview.email}
            signedIn={Boolean(session)}
            signedInEmail={session?.user.email ?? null}
          />
        )}
      </main>
    </div>
  );
}
