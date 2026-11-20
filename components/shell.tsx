"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";

export function Shell({ demo = false, children }: { demo?: boolean; children: ReactNode }) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="h-1.5 bg-black" />
        <div className="h-1 bg-accent" />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandMark tone="light" className="h-10 w-auto sm:h-12" />
            <span className="hidden min-w-0 sm:block">
              <span className="block font-display text-xl uppercase leading-none tracking-wide text-ink">
                Lead Centre
              </span>
              <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy">
                Sales desk
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {demo ? (
              <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                Demo
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-navy hover:bg-paper"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs leading-5 text-muted">
        <p>Loyalist Homes &amp; Restoration, a division of Loyalist Homes Group. Times shown in Eastern Time (America/Toronto).</p>
        <p className="mt-1">Calls, messages, and notes stay on the lead so the next person can pick it up.</p>
      </footer>
    </div>
  );
}
