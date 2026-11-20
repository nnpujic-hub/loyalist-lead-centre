import { formatNoteStamp, torontoToday } from "@/lib/format";
import type { Lead } from "@/lib/types";

export function platformLabel(platform: string): string {
  const code = platform.trim().toLowerCase();
  if (code === "fb") return "Facebook";
  if (code === "ig") return "Instagram";
  return platform.trim();
}

export function telLink(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export function daysBetween(iso: string | null): number | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

export function computeFollowUpDue(lead: Pick<Lead, "followUpDate" | "leadStatus">): boolean {
  if (!lead.followUpDate) return false;
  if (lead.leadStatus === "Closed" || lead.leadStatus === "Non-Qualified") return false;
  return lead.followUpDate <= torontoToday();
}

export function isFollowUpDue(lead: Lead): boolean {
  if (typeof lead.followUpDue === "string") {
    return lead.followUpDue.trim().toLowerCase() === "due";
  }
  return computeFollowUpDue(lead);
}

export function presentLead(lead: Lead): Lead {
  const callLink = lead.callLink || telLink(lead.phone);
  const emailLink = lead.emailLink || (lead.email ? `mailto:${lead.email}` : "");
  const replyOnFacebook = lead.replyOnFacebook || lead.metaInboxUrl || "";
  const name = lead.platformName || platformLabel(lead.platform);
  const daysSinceLead = lead.daysSinceLead ?? daysBetween(lead.metaCreatedAt || lead.createdTime);
  const followUpDue =
    lead.followUpDue == null ? (computeFollowUpDue(lead) ? "Due" : "") : lead.followUpDue;

  return {
    ...lead,
    callLink,
    emailLink,
    replyOnFacebook,
    platformName: name,
    daysSinceLead,
    followUpDue,
  };
}

export function appendNote(existing: string, text: string, now = new Date()): string {
  const line = `[${formatNoteStamp(now)}] ${text.trim()}`;
  const prior = existing.trim();
  return prior ? `${prior}\n${line}` : line;
}

export function leadTimestamp(lead: Lead): number {
  const raw = lead.metaCreatedAt || lead.createdTime || "";
  const time = Date.parse(raw);
  return Number.isNaN(time) ? 0 : time;
}

export function campaignLine(lead: Lead): string {
  return [lead.campaignName, lead.adName].filter(Boolean).join(" · ");
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
