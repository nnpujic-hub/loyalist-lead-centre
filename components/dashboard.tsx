"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, api } from "@/lib/api-client";
import { formatDate, formatDateTime, formatDays } from "@/lib/format";
import { campaignLine, isFollowUpDue } from "@/lib/lead-view";
import type { Lead, LeadListResponse } from "@/lib/types";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";

const FILTERS = [
  { id: "Unread", label: "Unread" },
  { id: "Read", label: "Read" },
  { id: "Called", label: "Called" },
  { id: "Messaged", label: "Messaged" },
  { id: "Emailed", label: "Emailed" },
  { id: "Qualified", label: "Qualified" },
  { id: "Non-Qualified", label: "Non-Qualified" },
  { id: "Closed", label: "Closed" },
  { id: "followUp", label: "Follow-ups Due" },
  { id: "", label: "Total" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function matchesQuery(lead: Lead, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const haystack = [lead.name, lead.phone, lead.email, lead.postalCode].join(" ").toLowerCase();
  if (haystack.includes(trimmed)) return true;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 3 && lead.phone.replace(/\D/g, "").includes(digits)) return true;
  const compactPostal = lead.postalCode.toLowerCase().replace(/\s+/g, "");
  return compactPostal.includes(trimmed.replace(/\s+/g, ""));
}

function scopedLeads(leads: Lead[], assignee: string): Lead[] {
  if (!assignee) return leads;
  if (assignee === "unassigned") return leads.filter((lead) => !lead.assignedTo);
  return leads.filter((lead) => lead.assignedTo?.id === assignee);
}

export function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<LeadListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("");
  const [assignee, setAssignee] = useState("");
  const [query, setQuery] = useState("");
  const [banner, setBanner] = useState("");
  const unreadCount = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api<LeadListResponse>("/api/leads");
      const unread = next.leads.filter((lead) => lead.leadStatus === "Unread").length;
      if (unreadCount.current != null && unread > unreadCount.current) {
        setBanner("A new lead just arrived.");
      }
      unreadCount.current = unread;
      setData(next);
      setError("");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.push("/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const initial = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const leads = data?.leads ?? [];
  const mine = scopedLeads(leads, assignee);
  const counts = {
    Unread: mine.filter((lead) => lead.leadStatus === "Unread").length,
    Read: mine.filter((lead) => lead.leadStatus === "Read").length,
    Called: mine.filter((lead) => lead.leadStatus === "Called").length,
    Messaged: mine.filter((lead) => lead.leadStatus === "Messaged").length,
    Emailed: mine.filter((lead) => lead.leadStatus === "Emailed").length,
    Qualified: mine.filter((lead) => lead.leadStatus === "Qualified").length,
    "Non-Qualified": mine.filter((lead) => lead.leadStatus === "Non-Qualified").length,
    Closed: mine.filter((lead) => lead.leadStatus === "Closed").length,
    followUp: mine.filter((lead) => isFollowUpDue(lead)).length,
    "": mine.length,
  };

  const visible = mine.filter((lead) => {
    if (!matchesQuery(lead, query)) return false;
    if (filter === "followUp") return isFollowUpDue(lead);
    if (filter) return lead.leadStatus === filter;
    return true;
  });

  return (
    <Shell demo={data?.demo ?? false}>
      <main id="content" className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl uppercase tracking-wide sm:text-5xl">Leads</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Meta leads for the sales team, newest first. The list checks for new leads every minute.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted" aria-live="polite">
              {data ? `Updated ${formatDateTime(data.generatedAt)} ET` : "Loading leads"}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-navy hover:bg-white"
            >
              Refresh
            </button>
          </div>
        </div>

        {data?.demo ? (
          <p className="rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-navy">
            Demo data is on. These are sample leads, and nothing is written to Airtable.
          </p>
        ) : null}
        {banner ? (
          <p role="status" className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white">
            {banner}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-2xl border border-accent bg-white px-4 py-3 text-sm text-accent-dark">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.label}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(active && item.id !== "" ? "" : item.id)}
                className={`rounded-2xl border bg-white p-3 text-left shadow-sm ${active ? "border-accent ring-1 ring-accent" : "border-line"}`}
              >
                <span className="block min-h-8 text-[11px] font-semibold uppercase tracking-wide text-muted">{item.label}</span>
                <span className="mt-2 block font-display text-3xl leading-none">{loading ? "–" : count}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_16rem] sm:p-4">
          <div>
            <label htmlFor="lead-search" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Search
            </label>
            <input
              id="lead-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, phone, email, or postal code"
              className="mt-2 min-h-11 w-full rounded-xl border border-line px-3 text-base"
            />
          </div>
          <div>
            <label htmlFor="assignee-filter" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Assigned to
            </label>
            <select
              id="assignee-filter"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base"
            >
              <option value="">Everyone</option>
              <option value="unassigned">Unassigned</option>
              {(data?.options.assignees ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-muted">
          Showing {visible.length} of {mine.length}
        </p>

        {loading ? (
          <div className="grid gap-3">
            <div className="h-28 animate-pulse rounded-2xl bg-white" />
            <div className="h-28 animate-pulse rounded-2xl bg-white" />
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">
            No leads match this view.
          </p>
        ) : (
          <ul className="grid gap-3">
            {visible.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="block rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:border-navy"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={lead.leadStatus} />
                        {isFollowUpDue(lead) ? (
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">Follow-up due</span>
                        ) : null}
                      </div>
                      <h2 className="mt-2 truncate font-display text-2xl uppercase tracking-wide">{lead.name || "Unnamed lead"}</h2>
                      <p className="mt-1 text-sm text-navy">{lead.platformName || "Unknown platform"}</p>
                      <p className="mt-1 text-sm text-ink">{campaignLine(lead) || "No campaign on file"}</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-semibold text-muted">{formatDays(lead.daysSinceLead)}</p>
                  </div>
                  <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                    <div>
                      <dt className="sr-only">Postal code</dt>
                      <dd>{lead.postalCode || "No postal code"}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Follow-up date</dt>
                      <dd>{lead.followUpDate ? `Follow-up ${formatDate(lead.followUpDate)}` : "No follow-up date"}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Assigned to</dt>
                      <dd>{lead.assignedTo?.name || "Unassigned"}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Shell>
  );
}
