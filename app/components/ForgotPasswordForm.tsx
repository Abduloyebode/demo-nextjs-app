"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/auth-validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setPending(true);
    await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    // Always show the same confirmation, whether or not the email exists,
    // so this can't be used to check which emails have accounts.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
        If an account exists for that email, a reset link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
          placeholder="you@company.com"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-slate-600">
        <Link
          href="/sign-in"
          className="font-medium text-teal-700 underline decoration-teal-200 underline-offset-4 hover:text-teal-800"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
