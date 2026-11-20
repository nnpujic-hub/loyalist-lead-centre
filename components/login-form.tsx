"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiError, api } from "@/lib/api-client";
import { safeNextPath } from "@/lib/lead-view";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      window.location.href = safeNextPath(searchParams.get("next"));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not sign in.");
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <section className="flex flex-col bg-black px-6 py-10 text-white lg:px-12 lg:py-16">
        <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-5">
          <BrandMark className="h-auto w-full" />
        </div>
        <div className="mt-10 max-w-md">
          <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-wide sm:text-6xl">Lead Centre</h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/80">
            A clear desk for Meta leads. Call, write it down, and the next person on the team can see exactly where it stands.
          </p>
        </div>
        <p className="mt-10 text-sm text-white/60 lg:mt-auto lg:pt-16">A Loyalist Homes Group company</p>
      </section>
      <section className="flex items-center bg-paper px-6 py-12">
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-3xl uppercase tracking-wide">Team sign in</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This desk is for the Rural Building Solutions sales team. One shared password, on this device only.
          </p>
          <label htmlFor="password" className="mt-6 block text-sm font-semibold">
            Team password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-line px-3 text-base"
          />
          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-accent-dark">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="mt-6 w-full">
            {pending ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </section>
    </div>
  );
}
