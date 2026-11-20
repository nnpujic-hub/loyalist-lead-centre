import { applyContactLog, recordActivity, statusChangeSummary, type ContactAction } from "@/lib/contact-log";
import { LeadError } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";
import { appendNote } from "@/lib/lead-view";
import type { Assignee, Lead, LeadAction, LeadPatch, LeadSchema } from "@/lib/types";

const WRITABLE = new Set([
  "Lead Status",
  "Read At",
  "Called At",
  "Messaged At",
  "Emailed At",
  "Estimate Sent At",
  "Follow-up Date",
  "Notes",
  "Activity Log",
  "Assigned To",
  "Last Action",
  "Last Action At",
  "Call Outcome",
  "Non-Qualified Reason",
  "Close Outcome",
  "Estimate Amount",
]);

const READ_ONLY_TYPES = new Set([
  "formula",
  "rollup",
  "count",
  "multipleLookupValues",
  "createdTime",
  "lastModifiedTime",
  "autoNumber",
  "button",
]);

const CALL_OUTCOME_LAST_ACTION: Record<string, string[]> = {
  Answered: ["Called - Answered"],
  "No Answer": ["Called - No Answer"],
  "Left Voicemail": ["Left Voicemail"],
  "Call Back Later": ["Follow-up Scheduled"],
  "Wrong Number": ["Other"],
};

export function canWrite(schema: LeadSchema, name: string): boolean {
  if (!WRITABLE.has(name)) return false;
  if (!schema.loaded) return true;
  const field = schema.fields.get(name);
  if (!field) return false;
  return !READ_ONLY_TYPES.has(field.type);
}

function choose(schema: LeadSchema, field: string, preferences: string[]): string | null {
  if (!canWrite(schema, field)) return null;
  const meta = schema.fields.get(field);
  if (!meta || meta.choices.length === 0) return preferences[0] ?? null;
  for (const preference of preferences) {
    const match = meta.choices.find((choice) => choice.toLowerCase() === preference.toLowerCase());
    if (match) return match;
  }
  return null;
}

function requireChoice(schema: LeadSchema, field: string, preferences: string[], label: string): string {
  const match = choose(schema, field, preferences);
  if (!match) {
    throw new LeadError(`${label} is not available on this Leads table.`);
  }
  return match;
}

function choiceAllowed(schema: LeadSchema, field: string, value: string): boolean {
  const meta = schema.fields.get(field);
  if (schema.loaded && !meta) return false;
  if (!meta || meta.choices.length === 0) return true;
  return meta.choices.includes(value);
}

export function buildPatch(
  lead: Lead,
  action: LeadAction | { type: "markRead" },
  schema: LeadSchema,
  ctx: { now: Date; assignee: Assignee | null },
): { patch: LeadPatch; notices: string[] } {
  const patch: LeadPatch = {};
  const notices: string[] = [];
  const nowIso = ctx.now.toISOString();

  switch (action.type) {
    case "markRead": {
      if (lead.leadStatus !== "Unread") break;
      if (!canWrite(schema, "Lead Status")) {
        notices.push("Lead Status could not be set to Read.");
        break;
      }
      patch.leadStatus = "Read";
      if (canWrite(schema, "Read At") && !lead.readAt) patch.readAt = nowIso;
      recordActivity(lead, patch, ctx.now, statusChangeSummary(lead.leadStatus, "Read"), "Marked Read");
      break;
    }
    case "unread": {
      if (lead.leadStatus === "Unread") break;
      if (!canWrite(schema, "Lead Status")) {
        throw new LeadError("Lead Status is not on the Leads table.");
      }
      patch.leadStatus = "Unread";
      recordActivity(lead, patch, ctx.now, statusChangeSummary(lead.leadStatus, "Unread"), "Marked Unread");
      break;
    }
    case "call":
    case "message":
    case "email": {
      const contact: ContactAction = action.type === "message" ? "facebook" : action.type;
      Object.assign(patch, applyContactLog(lead, contact, ctx.now, null));
      break;
    }
    case "called":
    case "messaged":
    case "emailed":
    case "qualified": {
      const nextStatus =
        action.type === "called" ? "Called" : action.type === "messaged" ? "Messaged" : action.type === "emailed" ? "Emailed" : "Qualified";
      if (!canWrite(schema, "Lead Status")) {
        throw new LeadError("Lead Status is not on the Leads table.");
      }
      if (action.type === "qualified") requireChoice(schema, "Lead Status", ["Qualified"], "Qualified");
      if (lead.leadStatus === nextStatus) break;
      patch.leadStatus = nextStatus;
      recordActivity(lead, patch, ctx.now, statusChangeSummary(lead.leadStatus, nextStatus), "Status changed");
      break;
    }
    case "callOutcome": {
      const outcome = action.outcome.trim();
      if (!outcome) throw new LeadError("Choose a call outcome.");
      if (!choiceAllowed(schema, "Call Outcome", outcome)) {
        throw new LeadError(`${outcome} is not an option for Call Outcome.`);
      }
      if (!canWrite(schema, "Call Outcome")) {
        throw new LeadError("Call Outcome is not on the Leads table.");
      }
      patch.callOutcome = outcome;
      if (canWrite(schema, "Called At") && !lead.calledAt) patch.calledAt = nowIso;
      const matched = choose(schema, "Last Action", [...(CALL_OUTCOME_LAST_ACTION[outcome] ?? []), outcome]);
      recordActivity(lead, patch, ctx.now, `Call outcome: ${outcome}`, matched ?? "Call outcome");
      break;
    }
    case "nonQualified": {
      const reason = action.reason.trim();
      if (!reason) throw new LeadError("Choose a reason for marking this lead non-qualified.");
      const reasonFieldExists = !schema.loaded || schema.fields.has("Non-Qualified Reason");
      if (!reasonFieldExists) {
        notices.push("Non-Qualified Reason is not on the Leads table, so only the status will be saved.");
      } else if (!choiceAllowed(schema, "Non-Qualified Reason", reason)) {
        throw new LeadError("That reason is not available.");
      }
      const nextStatus = requireChoice(schema, "Lead Status", ["Non-Qualified"], "Non-Qualified");
      if (lead.leadStatus === nextStatus && lead.nonQualifiedReason === reason) break;
      patch.leadStatus = nextStatus;
      if (reasonFieldExists && canWrite(schema, "Non-Qualified Reason")) {
        patch.nonQualifiedReason = reason;
      }
      recordActivity(lead, patch, ctx.now, statusChangeSummary(lead.leadStatus, nextStatus, reason), "Status changed");
      break;
    }
    case "closed": {
      const outcome = action.closeOutcome.trim();
      if (!outcome) throw new LeadError("Choose Won or Lost before closing the lead.");
      const outcomeFieldExists = !schema.loaded || schema.fields.has("Close Outcome");
      if (!outcomeFieldExists) {
        notices.push("Close Outcome is not on the Leads table, so only the status will be saved.");
      } else if (!choiceAllowed(schema, "Close Outcome", outcome)) {
        throw new LeadError("That close outcome is not available.");
      }
      const nextStatus = requireChoice(schema, "Lead Status", ["Closed"], "Closed");
      if (lead.leadStatus === nextStatus && lead.closeOutcome === outcome) break;
      patch.leadStatus = nextStatus;
      if (outcomeFieldExists && canWrite(schema, "Close Outcome")) {
        patch.closeOutcome = outcome;
      }
      recordActivity(lead, patch, ctx.now, statusChangeSummary(lead.leadStatus, nextStatus, outcome), "Status changed");
      break;
    }
    case "estimate": {
      if (!canWrite(schema, "Estimate Sent At")) {
        throw new LeadError("Estimate Sent At is not on the Leads table.");
      }
      patch.estimateSentAt = nowIso;
      const amountLabel = action.amount == null ? "" : ` (${formatMoney(action.amount)})`;
      if (action.amount != null) {
        if (canWrite(schema, "Estimate Amount")) patch.estimateAmount = action.amount;
        else notices.push("Estimate Amount is not on the Leads table, so only the sent time was saved.");
      }
      recordActivity(lead, patch, ctx.now, `Estimate sent${amountLabel}`, "Estimate Sent");
      break;
    }
    case "followUp": {
      if (!canWrite(schema, "Follow-up Date")) {
        throw new LeadError("Follow-up Date is not on the Leads table.");
      }
      if (action.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(action.date)) {
        throw new LeadError("Choose a follow-up date.");
      }
      patch.followUpDate = action.date;
      recordActivity(
        lead,
        patch,
        ctx.now,
        action.date ? `Follow-up set to ${formatDate(action.date)}` : "Follow-up cleared",
        action.date ? "Follow-up Scheduled" : "Follow-up cleared",
      );
      break;
    }
    case "assign": {
      if (!canWrite(schema, "Assigned To")) {
        throw new LeadError("Assigned To is not on the Leads table.");
      }
      if (action.assigneeId && !ctx.assignee) {
        throw new LeadError("That teammate is not available to assign.");
      }
      patch.assignedTo = action.assigneeId ? ctx.assignee : null;
      recordActivity(
        lead,
        patch,
        ctx.now,
        action.assigneeId ? `Assigned to ${ctx.assignee?.name || "a teammate"}` : "Assignment cleared",
        action.assigneeId ? "Assigned" : "Assignment cleared",
      );
      break;
    }
    case "note": {
      const text = action.text.trim();
      if (!text) throw new LeadError("Write a note before saving it.");
      if (text.length > 4000) throw new LeadError("Keep the note under 4000 characters.");
      if (!canWrite(schema, "Notes")) throw new LeadError("Notes is not on the Leads table.");
      patch.notes = appendNote(lead.notes, text, ctx.now);
      recordActivity(lead, patch, ctx.now, "Note added", "Note added");
      break;
    }
    default:
      throw new LeadError("That action is not supported.");
  }

  return { patch, notices };
}

export function toAirtableFields(
  patch: LeadPatch,
  schema: LeadSchema,
): { fields: Record<string, unknown>; notices: string[] } {
  const fields: Record<string, unknown> = {};
  const notices: string[] = [];

  const put = (name: string, value: unknown) => {
    if (!canWrite(schema, name)) {
      notices.push(`${name} was not saved because that field is missing or read-only on Leads.`);
      return;
    }
    fields[name] = value;
  };

  if (patch.leadStatus !== undefined) put("Lead Status", patch.leadStatus);
  if (patch.readAt !== undefined) put("Read At", patch.readAt);
  if (patch.calledAt !== undefined) put("Called At", patch.calledAt);
  if (patch.messagedAt !== undefined) put("Messaged At", patch.messagedAt);
  if (patch.emailedAt !== undefined) put("Emailed At", patch.emailedAt);
  if (patch.estimateSentAt !== undefined) put("Estimate Sent At", patch.estimateSentAt);
  if ("followUpDate" in patch) put("Follow-up Date", patch.followUpDate);
  if (patch.notes !== undefined) put("Notes", patch.notes);
  if (patch.activityLog !== undefined) put("Activity Log", patch.activityLog);
  if ("assignedTo" in patch) {
    put("Assigned To", patch.assignedTo ? { id: patch.assignedTo.id } : null);
  }
  if (patch.lastAction !== undefined) put("Last Action", patch.lastAction);
  if (patch.lastActionAt !== undefined) put("Last Action At", patch.lastActionAt);
  if (patch.callOutcome !== undefined) put("Call Outcome", patch.callOutcome);
  if (patch.nonQualifiedReason !== undefined) put("Non-Qualified Reason", patch.nonQualifiedReason);
  if (patch.closeOutcome !== undefined) put("Close Outcome", patch.closeOutcome);
  if ("estimateAmount" in patch) put("Estimate Amount", patch.estimateAmount);

  return { fields, notices };
}

export function isEmptyPatch(patch: LeadPatch): boolean {
  return Object.keys(patch).length === 0;
}
