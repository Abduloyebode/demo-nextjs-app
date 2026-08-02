"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/auth-validation";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const inviteEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }

    const nextPath = inviteToken ? `/invite/${inviteToken}` : "/dashboard";

    setPending(true);
    const { error: signInError } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: nextPath,
    });
    setPending(false);

    if (signInError) {
      setError(signInError.message || "Invalid email or password.");
      return;
    }

    router.push(nextPath);
    router.refresh();
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

      {inviteToken ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          Sign in with the invited email to join the organisation.
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

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
          placeholder="Your password"
        />
        <p className="mt-1.5 text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-teal-700 underline decoration-teal-200 underline-offset-4 hover:text-teal-800"
          >
            Forgot password?
          </Link>
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-600">
        New here?{" "}
        <Link
          href={
            inviteToken
              ? `/sign-up?invite=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(email)}`
              : "/sign-up"
          }
          className="font-medium text-teal-700 underline decoration-teal-200 underline-offset-4 hover:text-teal-800"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
