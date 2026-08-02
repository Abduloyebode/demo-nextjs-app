"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
          router.refresh();
        },
      },
    });
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className="inline-flex min-h-10 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-[var(--paper)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
