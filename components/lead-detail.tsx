"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { ApiError, api } from "@/lib/api-client";
import { optimisticContact, type ContactAction } from "@/lib/contact-log";
import { formatDateTime, formatDays, formatMoney } from "@/lib/format";
import { isFollowUpDue } from "@/lib/lead-view";
import type { FieldOptions, Lead, LeadAction, LeadResponse } from "@/lib/types";
import { Button } from "@/components/button";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";

const controlClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink";

function hasField(options: FieldOptions | null, name: string): boolean {
  if (!options || options.fields.length === 0) return true;
  return options.fields.includes(name);
}

function statusAvailable(options: FieldOptions | null, name: string): boolean {
  if (!options) return false;
  if (!hasField(options, "Lead Status")) return false;
  if (options.leadStatus.length === 0) return options.fields.length === 0;
  return options.leadStatus.includes(name);
}

function show(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy">{eyebrow}</p>
      <h2 className="mt-1 font-display text-2xl uppercase tracking-wide">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Facts({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{row.label}</dt>
          <dd className="mt-1 break-words text-sm leading-6">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ContactActions({
  lead,
  pending,
  onCall,
  onMessage,
  onEmail,
  className = "",
}: {
  lead: Lead;
  pending: boolean;
  onCall: () => void;
  onMessage: () => void;
  onEmail: () => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      <Button type="button" onClick={onCall} disabled={pending || !lead.callLink}>
        Call
      </Button>
      <Button type="button" variant="navy" onClick={onMessage} disabled={pending || !lead.replyOnFacebook}>
        Facebook
      </Button>
      <Button type="button" variant="ghost" onClick={onEmail} disabled={pending || !lead.emailLink}>
        Email
      </Button>
    </div>
  );
}

export function LeadDetail({ id }: { id: string }) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [options, setOptions] = useState<FieldOptions | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showReasons, setShowReasons] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [amount, setAmount] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const payload = await api<LeadResponse>(`/api/leads/${id}`);
        if (cancelled) return;
        setLead(payload.lead);
        setOptions(payload.options);
        setDemo(payload.demo);
        setAmount(payload.lead.estimateAmount?.toString() ?? "");
        setFollowUp(payload.lead.followUpDate ?? "");
        setError("");
        if (payload.notices.length > 0) setNotice(payload.notices.join(" "));
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) {
          router.push("/login");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Could not open this lead.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function perform(action: LeadAction) {
    setPending(action.type);
    setError("");
    try {
      const payload = await api<LeadResponse>(`/api/leads/${id}/actions`, {
        method: "POST",
        body: JSON.stringify(action),
      });
      setLead(payload.lead);
      setOptions(payload.options);
      setDemo(payload.demo);
      setFollowUp(payload.lead.followUpDate ?? "");
      if (action.type === "estimate") setAmount(payload.lead.estimateAmount?.toString() ?? "");
      if (action.type === "note") setDraft("");
      setNotice(payload.notices.length > 0 ? payload.notices.join(" ") : "Saved.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.push("/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setPending(null);
    }
  }

  function logContact(action: ContactAction) {
    if (!lead) return;
    const current = lead;
    setLead(optimisticContact(current, action));
    const body = JSON.stringify({ action });
    void fetch(`/api/leads/${current.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { error?: string; lead?: Lead; options?: FieldOptions } | null;
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok || !payload || !("lead" in payload) || !payload.lead) {
          setError(payload && "error" in payload && payload.error ? payload.error : "Could not record that action.");
          setLead(current);
          return;
        }
        setLead(payload.lead);
        if (payload.options) setOptions(payload.options);
        setNotice("Saved.");
      })
      .catch(() => {
        setError("Could not record that action.");
        setLead(current);
      });
  }

  function callLead() {
    if (!lead?.callLink) return;
    const href = lead.callLink;
    logContact("call");
    window.location.href = href;
  }

  function messageLead() {
    if (!lead?.replyOnFacebook) return;
    window.open(lead.replyOnFacebook, "_blank", "noopener,noreferrer");
    logContact("facebook");
  }

  function emailLead() {
    if (!lead?.emailLink) return;
    const href = lead.emailLink;
    logContact("email");
    window.location.href = href;
  }

  const busy = pending !== null;

  return (
    <Shell demo={demo}>
      <main id="content" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-28 pt-5 md:pb-10">
        <Link href="/" className="min-h-11 self-start text-sm font-semibold text-navy">
          All leads
        </Link>

        {loading ? <div className="h-40 animate-pulse rounded-2xl bg-white" /> : null}
        {error ? (
          <p role="alert" className="rounded-2xl border border-accent bg-white px-4 py-3 text-sm text-accent-dark">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-navy">
            {notice}
          </p>
        ) : null}

        {lead ? (
          <>
            <header className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={lead.leadStatus} />
                {isFollowUpDue(lead) ? (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">Follow-up due</span>
                ) : null}
              </div>
              <h1 className="mt-3 font-display text-4xl uppercase leading-none tracking-wide sm:text-5xl">
                {lead.name || "Unnamed lead"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-navy">
                {lead.platformName || "Unknown platform"} · {lead.postalCode || "No postal code"} · {formatDays(lead.daysSinceLead)}
              </p>
              <p className="mt-2 text-lg font-semibold">{lead.phone || "No phone number"}</p>
              <ContactActions
                lead={lead}
                pending={busy}
                onCall={callLead}
                onMessage={messageLead}
                onEmail={emailLead}
                className="mt-4 hidden md:grid"
              />
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
              <Section eyebrow="Pipeline" title="Status and owner">
                <Facts
                  rows={[
                    { label: "Lead status", value: show(lead.leadStatus) },
                    { label: "Legacy status", value: show(lead.statusLegacy) },
                    { label: "Assigned to", value: lead.assignedTo?.name || "Unassigned" },
                    { label: "Last action", value: show(lead.lastAction) },
                    { label: "Last action at", value: formatDateTime(lead.lastActionAt) },
                    { label: "Read at", value: formatDateTime(lead.readAt) },
                  ]}
                />
                {hasField(options, "Assigned To") ? (
                  <label className="mt-5 block text-sm font-semibold" htmlFor="assignee">
                    Assign to
                    <select
                      id="assignee"
                      className={`${controlClass} mt-2`}
                      value={lead.assignedTo?.id ?? ""}
                      disabled={busy}
                      onChange={(event) => void perform({ type: "assign", assigneeId: event.target.value || null })}
                    >
                      <option value="">Unassigned</option>
                      {(options?.assignees ?? []).map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {(options?.assignees.length ?? 0) === 0 && hasField(options, "Assigned To") ? (
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Teammates show up here after they are assigned on a lead. Assigned To is an Airtable collaborator field.
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  {statusAvailable(options, "Called") ? (
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => void perform({ type: "called" })}>
                      Called
                    </Button>
                  ) : null}
                  {statusAvailable(options, "Emailed") ? (
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => void perform({ type: "emailed" })}>
                      Emailed
                    </Button>
                  ) : null}
                  {statusAvailable(options, "Qualified") ? (
                    <Button type="button" variant="navy" disabled={busy} onClick={() => void perform({ type: "qualified" })}>
                      Qualified
                    </Button>
                  ) : null}
                  {statusAvailable(options, "Non-Qualified") ? (
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => setShowReasons((open) => !open)}>
                      Non-Qualified
                    </Button>
                  ) : null}
                  {statusAvailable(options, "Closed") ? (
                    <Button type="button" variant="quiet" disabled={busy} onClick={() => setShowClose((open) => !open)}>
                      Closed
                    </Button>
                  ) : null}
                </div>
                {showReasons ? (
                  <fieldset className="mt-4">
                    <legend className="text-sm font-semibold">Why is this lead non-qualified?</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(options?.nonQualifiedReason ?? []).map((item) => (
                        <Button
                          key={item}
                          type="button"
                          variant={reason === item ? "primary" : "ghost"}
                          disabled={busy}
                          onClick={() => setReason(item)}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                    {(options?.nonQualifiedReason.length ?? 0) === 0 ? (
                      <p className="mt-2 text-sm text-muted">Reasons will appear when Airtable sends the field options.</p>
                    ) : (
                      <Button
                        type="button"
                        className="mt-3"
                        disabled={busy || !reason}
                        onClick={() => void perform({ type: "nonQualified", reason })}
                      >
                        Save as non-qualified
                      </Button>
                    )}
                  </fieldset>
                ) : null}
                {showClose ? (
                  <fieldset className="mt-4">
                    <legend className="text-sm font-semibold">How did it close?</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(options?.closeOutcome ?? []).map((item) => (
                        <Button
                          key={item}
                          type="button"
                          variant={item === "Won" ? "navy" : "ghost"}
                          disabled={busy}
                          onClick={() => void perform({ type: "closed", closeOutcome: item })}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                    {(options?.closeOutcome.length ?? 0) === 0 ? (
                      <p className="mt-2 text-sm text-muted">Won and Lost will appear when Airtable sends the field options.</p>
                    ) : null}
                  </fieldset>
                ) : null}
                {hasField(options, "Follow-up Date") ? (
                  <form
                    className="mt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void perform({ type: "followUp", date: followUp || null });
                    }}
                  >
                    <label htmlFor="follow-up" className="text-sm font-semibold">
                      Follow-up date
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        id="follow-up"
                        type="date"
                        value={followUp}
                        onChange={(event) => setFollowUp(event.target.value)}
                        className={controlClass}
                      />
                      <Button type="submit" disabled={busy}>
                        Save date
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || !lead.followUpDate}
                        onClick={() => void perform({ type: "followUp", date: null })}
                      >
                        Clear
                      </Button>
                    </div>
                  </form>
                ) : null}
              </Section>

              <Section eyebrow="Reach them" title="Contact">
                <Facts
                  rows={[
                    { label: "Phone", value: show(lead.phone) },
                    { label: "Email", value: show(lead.email) },
                    { label: "Postal code", value: show(lead.postalCode) },
                    { label: "Source", value: show(lead.source) },
                    { label: "Called at", value: formatDateTime(lead.calledAt) },
                    { label: "Messaged at", value: formatDateTime(lead.messagedAt) },
                    { label: "Emailed at", value: formatDateTime(lead.emailedAt) },
                    { label: "Call outcome", value: show(lead.callOutcome) },
                  ]}
                />
                {hasField(options, "Call Outcome") && (options?.callOutcome.length ?? 0) > 0 ? (
                  <fieldset className="mt-5">
                    <legend className="text-sm font-semibold">How did the call go?</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {options?.callOutcome.map((item) => (
                        <Button
                          key={item}
                          type="button"
                          variant={lead.callOutcome === item ? "primary" : "ghost"}
                          disabled={busy}
                          onClick={() => void perform({ type: "callOutcome", outcome: item })}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-muted">
                    Call outcome buttons appear when that field and its options are available on Leads.
                  </p>
                )}
              </Section>

              <Section eyebrow="The number" title="Estimate and outcome">
                <Facts
                  rows={[
                    { label: "Estimate amount", value: formatMoney(lead.estimateAmount) },
                    { label: "Estimate sent", value: formatDateTime(lead.estimateSentAt) },
                    { label: "Close outcome", value: show(lead.closeOutcome) },
                    { label: "Non-qualified reason", value: show(lead.nonQualifiedReason) },
                  ]}
                />
                {hasField(options, "Estimate Sent At") ? (
                  <form
                    className="mt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const trimmed = amount.trim();
                      void perform({ type: "estimate", amount: trimmed ? Number(trimmed) : null });
                    }}
                  >
                    <label htmlFor="estimate" className="text-sm font-semibold">
                      Estimate amount, optional
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        id="estimate"
                        inputMode="decimal"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="486500"
                        className={controlClass}
                      />
                      <Button type="submit" disabled={busy}>
                        Estimate sent
                      </Button>
                    </div>
                  </form>
                ) : null}
              </Section>

              <Section eyebrow="The record" title="Notes and recordings">
                <h3 className="text-sm font-semibold">What they wrote on the form</h3>
                <blockquote className="mt-2 border-l-4 border-accent bg-paper px-4 py-3 text-sm leading-6">
                  {lead.clientComments || "No comments on the form."}
                </blockquote>
                <h3 className="mt-5 text-sm font-semibold">Activity log</h3>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-paper px-4 py-3 font-sans text-sm leading-6">
                  {lead.activityLog || "No calls, messages, or emails recorded yet."}
                </pre>
                <h3 className="mt-5 text-sm font-semibold">Team notes</h3>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-paper px-4 py-3 font-sans text-sm leading-6">
                  {lead.notes || "No team notes yet."}
                </pre>
                {hasField(options, "Notes") ? (
                  <form
                    className="mt-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void perform({ type: "note", text: draft });
                    }}
                  >
                    <label htmlFor="note" className="text-sm font-semibold">
                      Add a note
                    </label>
                    <textarea
                      id="note"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-base"
                      placeholder="What was said, and what happens next"
                    />
                    <Button type="submit" className="mt-2" disabled={busy || draft.trim().length === 0}>
                      Add note
                    </Button>
                  </form>
                ) : null}
                <h3 className="mt-5 text-sm font-semibold">Plaud transcript</h3>
                {lead.plaudTranscript.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No recording attached.</p>
                ) : (
                  <ul className="mt-2 grid gap-2">
                    {lead.plaudTranscript.map((file) => (
                      <li key={file.id} className="text-sm">
                        {file.url ? (
                          <a href={file.url} className="font-semibold text-navy underline" target="_blank" rel="noopener noreferrer">
                            {file.filename}
                          </a>
                        ) : (
                          <span>{file.filename}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            <Section eyebrow="Where it came from" title="Meta info">
              <Facts
                rows={[
                  { label: "Platform", value: show(lead.platformName || lead.platform) },
                  { label: "Campaign", value: show(lead.campaignName) },
                  { label: "Ad set", value: show(lead.adSetName) },
                  { label: "Ad", value: show(lead.adName) },
                  { label: "Form", value: show(lead.formName) },
                  { label: "Meta lead ID", value: show(lead.metaLeadId) },
                  { label: "Meta record ID", value: show(lead.metaRecordId) },
                  { label: "Meta created", value: formatDateTime(lead.metaCreatedAt) },
                  { label: "Lead created time", value: show(lead.leadCreatedTime) },
                ]}
              />
              {lead.openMetaRecord ? (
                <a
                  href={lead.openMetaRecord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-navy underline"
                >
                  Open the original Meta row
                </a>
              ) : null}
            </Section>
          </>
        ) : null}
      </main>
      {lead ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
          <ContactActions lead={lead} pending={busy} onCall={callLead} onMessage={messageLead} onEmail={emailLead} />
        </div>
      ) : null}
    </Shell>
  );
}
