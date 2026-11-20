import { formatTimelineStamp, torontoWallTime } from "@/lib/format";
import type { Lead } from "@/lib/types";

export type TimelineEntry = {
  key: string;
  action: string;
  timeLabel: string;
  at: number;
};

const STORED_LINE = /^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2}) (AM|PM) ET · (.+)$/;

function hour24(hour: number, period: string): number {
  const base = hour % 12;
  return period === "PM" ? base + 12 : base;
}

export function parseStoredActivityLine(line: string): TimelineEntry | null {
  const match = line.trim().match(STORED_LINE);
  if (!match) return null;
  const [, date, hourText, minuteText, period, action] = match;
  const at = torontoWallTime(date, hour24(Number(hourText), period), Number(minuteText));
  return {
    key: line.trim(),
    action: action.trim(),
    timeLabel: formatTimelineStamp(at),
    at: at.getTime(),
  };
}

function fallback(label: string, iso: string | null, key: string): TimelineEntry | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return { key, action: label, timeLabel: formatTimelineStamp(at), at: at.getTime() };
}

export function activityTimeline(lead: Pick<Lead, "activityLog" | "calledAt" | "messagedAt" | "emailedAt">): TimelineEntry[] {
  const parsed = lead.activityLog
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsedLine = parseStoredActivityLine(line);
      if (!parsedLine) return { key: `raw-${index}`, action: line, timeLabel: "", at: Number.MAX_SAFE_INTEGER - index };
      return { ...parsedLine, key: `${index}-${parsedLine.key}` };
    });

  if (parsed.length > 0) return parsed;

  return [fallback("Call", lead.calledAt, "called"), fallback("Facebook", lead.messagedAt, "facebook"), fallback("Email", lead.emailedAt, "email")]
    .filter((entry): entry is TimelineEntry => entry != null)
    .sort((a, b) => b.at - a.at);
}
