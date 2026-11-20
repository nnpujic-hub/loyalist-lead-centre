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
