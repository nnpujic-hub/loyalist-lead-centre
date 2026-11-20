import { LeadError } from "@/lib/errors";
import { formatActivityStamp } from "@/lib/format";
import type { Lead, LeadPatch } from "@/lib/types";

export const CONTACT_ACTIONS = ["call", "facebook", "email"] as const;
export type ContactAction = (typeof CONTACT_ACTIONS)[number];

const LAST_ACTION: Record<ContactAction, string> = {
  call: "Called",
  facebook: "Messaged on Facebook",
  email: "Emailed",
};

const LOG_LABEL: Record<ContactAction, string> = {
  call: "Call",
  facebook: "Facebook",
  email: "Email",
};

export function contactActor(subject: string | null | undefined): string | null {
  if (!subject || subject === "team") return null;
  return subject;
}

export function prependActivity(existing: string, line: string): string {
  const prior = existing.trim();
  return prior ? `${line}\n${prior}` : line;
}

export function activityLine(action: ContactAction, now: Date, actor: string | null): string {
  const who = actor ? ` · ${actor}` : "";
  return `${formatActivityStamp(now)} · ${LOG_LABEL[action]}${who}`;
}

export function summaryLine(summary: string, now: Date): string {
  return `${formatActivityStamp(now)} · ${summary}`;
}

/** Prepend one activity line and refresh Last Action / Last Action At. */
export function recordActivity(lead: Lead, patch: LeadPatch, now: Date, summary: string, lastAction: string): void {
  patch.activityLog = prependActivity(patch.activityLog ?? lead.activityLog ?? "", summaryLine(summary, now));
  patch.lastAction = lastAction;
  patch.lastActionAt = now.toISOString();
}

export function statusChangeSummary(from: string, to: string, detail?: string): string {
  const previous = from.trim() || "No status";
  const extra = detail ? ` (${detail})` : "";
  return `Status changed: ${previous} -> ${to}${extra}`;
}

export function applyContactLog(lead: Lead, action: ContactAction, now: Date, actor: string | null): LeadPatch {
  const nowIso = now.toISOString();
  const patch: LeadPatch = {
    lastAction: LAST_ACTION[action],
    lastActionAt: nowIso,
    activityLog: prependActivity(lead.activityLog, activityLine(action, now, actor)),
  };
  if (action === "call") {
    patch.calledAt = nowIso;
    patch.leadStatus = "Called";
  } else if (action === "facebook") {
    patch.messagedAt = nowIso;
  } else {
    patch.emailedAt = nowIso;
    patch.leadStatus = "Emailed";
  }
  return patch;
}

export function optimisticContact(lead: Lead, action: ContactAction, now = new Date(), actor: string | null = null): Lead {
  return { ...lead, ...applyContactLog(lead, action, now, actor) };
}

export function parseContactAction(body: unknown): ContactAction {
  const action =
    body && typeof body === "object" && "action" in body ? (body as { action?: unknown }).action : undefined;
  if (action === "call" || action === "facebook" || action === "email") return action;
  throw new LeadError("Choose call, facebook, or email.");
}
