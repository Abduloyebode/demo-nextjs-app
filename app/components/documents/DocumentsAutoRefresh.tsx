"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Polls the documents page while any job is still pending/processing. */
export function DocumentsAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const id = window.setInterval(() => {
      router.refresh();
    }, 2500);

    return () => window.clearInterval(id);
  }, [active, router]);

  return null;
}
