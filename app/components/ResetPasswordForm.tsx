"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/lib/auth-validation";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  if (tokenError || !token) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
      >
        This reset link is invalid or has expired.{" "}
        <Link href="/forgot-password" className="font-medium underline underline-offset-4">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          Your password has been reset.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          Sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }

    setPending(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: parsed.data.newPassword,
      token: token as string,
    });
    setPending(false);

    if (resetError) {
      setError(resetError.message || "Could not reset your password.");
      return;
    }

    setSuccess(true);
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

      <div>
        <label
          htmlFor="newPassword"
          className="block text-sm font-medium text-slate-700"
        >
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-slate-700"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
          placeholder="Re-enter your new password"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
