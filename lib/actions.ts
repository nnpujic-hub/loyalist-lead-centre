import { LeadError } from "@/lib/errors";
import type { LeadAction } from "@/lib/types";

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function amount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(number) || number < 0 || number > 100_000_000) {
    throw new LeadError("Enter an estimate amount in dollars, or leave it blank.");
  }
  return Math.round(number * 100) / 100;
}

export function parseAction(body: unknown): LeadAction {
  const data = record(body);
  const type = data?.type;
  if (typeof type !== "string") throw new LeadError("Missing action.");

  switch (type) {
    case "call":
    case "message":
    case "email":
    case "qualified":
    case "called":
      return { type };
    case "callOutcome": {
      const outcome = data?.outcome;
      if (typeof outcome !== "string") throw new LeadError("Choose a call outcome.");
      return { type, outcome };
    }
    case "nonQualified": {
      const reason = data?.reason;
      if (typeof reason !== "string") throw new LeadError("Choose a reason for marking this lead non-qualified.");
      return { type, reason };
    }
    case "closed": {
      const closeOutcome = data?.closeOutcome;
      if (typeof closeOutcome !== "string") throw new LeadError("Choose Won or Lost before closing the lead.");
      return { type, closeOutcome };
    }
    case "estimate":
      return { type, amount: amount(data?.amount) };
    case "followUp": {
      const date = data?.date;
      if (date !== null && typeof date !== "string") throw new LeadError("Choose a follow-up date.");
      return { type, date };
    }
    case "assign": {
      const assigneeId = data?.assigneeId;
      if (assigneeId !== null && typeof assigneeId !== "string") {
        throw new LeadError("Choose a teammate.");
      }
      return { type, assigneeId: assigneeId ? assigneeId : null };
    }
    case "note": {
      const text = data?.text;
      if (typeof text !== "string") throw new LeadError("Write a note before saving it.");
      return { type, text };
    }
    default:
      throw new LeadError("That action is not supported.");
  }
}
