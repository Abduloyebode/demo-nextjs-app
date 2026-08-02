import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/app/components/SignUpForm";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Create your account
      </h1>
      <p className="mt-3 text-slate-600">
        Start with a clear weekly rhythm — sign up to open your dashboard.
      </p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-7">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  );
}
