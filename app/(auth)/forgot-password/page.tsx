import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/app/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Forgot your password?
      </h1>
      <p className="mt-3 text-slate-600">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-7">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
