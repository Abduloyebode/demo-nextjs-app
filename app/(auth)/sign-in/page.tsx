import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/app/components/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Sign in
      </h1>
      <p className="mt-3 text-slate-600">
        Welcome back. Pick up where you left the week.
      </p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-7">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
