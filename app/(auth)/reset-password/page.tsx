import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/app/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Choose a new password
      </h1>
      <p className="mt-3 text-slate-600">
        Enter a new password for your account.
      </p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-7">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
