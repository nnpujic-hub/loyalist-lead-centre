import { TORONTO, torontoToday, torontoWallTime } from "@/lib/format";
import { platformLabel } from "@/lib/lead-view";
import type { Lead } from "@/lib/types";

export const REPORT_RANGES = ["7d", "30d", "90d", "all"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export const PIPELINE_STATUSES = [
  "Unread",
  "Read",
  "Called",
  "Emailed",
  "Qualified",
  "Non-Qualified",
  "Closed",
] as const;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type ReportLead = {
  id: string;
  name: string;
  status: string;
  created: number | null;
  firstContact: number | null;
  hoursToContact: number | null;
};

export type ReportModel = {
  range: ReportRange;
  total: number;
  newThisWeek: number;
  newThisMonth: number;
  contacted: number;
  contactedRate: string;
  within1h: number;
  within1hRate: string;
  within24h: number;
  within24hRate: string;
  uncontacted: number;
  overdue: number;
  medianHours: number | null;
  averageHours: number | null;
  medianLabel: string;
  averageLabel: string;
  qualificationRate: string;
  closeRate: string;
  statuses: { label: string; count: number; percent: string }[];
  methods: { label: string; count: number }[];
  weeks: { label: string; count: number }[];
  sources: { label: string; count: number }[];
  platforms: { label: string; count: number }[];
  oldest: { id: string; name: string; status: string; age: string }[];
};

export function parseReportRange(value: string | undefined): ReportRange {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") return value;
  return "30d";
}

function parseInstant(value: string | null | undefined): number | null {
  if (!value || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

/** Meta time, then a parseable Lead Created Time, then the Airtable record createdTime. */
export function leadCreatedAt(lead: Lead): number | null {
  return parseInstant(lead.metaCreatedAt) ?? parseInstant(lead.leadCreatedTime) ?? parseInstant(lead.createdTime);
}

export function firstContactAt(lead: Lead): number | null {
  const times = [lead.calledAt, lead.messagedAt, lead.emailedAt]
    .map((value) => parseInstant(value))
    .filter((value): value is number => value != null);
  if (times.length === 0) return null;
  return Math.min(...times);
}

function torontoYmd(date: Date): string {
  return torontoToday(date);
}

function shiftYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekdayIndex(date: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TORONTO, weekday: "short" }).format(date);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[name] ?? 0;
}

function weekStartYmd(date: Date): string {
  const delta = weekdayIndex(date) === 0 ? -6 : 1 - weekdayIndex(date);
  return shiftYmd(torontoYmd(date), delta);
}

function formatWeekLabel(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

function percent(part: number, total: number): string {
  if (total <= 0) return "n/a";
  const value = Math.round((part / total) * 1000) / 10;
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}

export function formatHours(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "n/a";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) {
    const rounded = Math.round(hours * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} h`;
  }
  const days = Math.round((hours / 24) * 10) / 10;
  return `${Number.isInteger(days) ? days.toFixed(0) : days.toFixed(1)} d`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function methodCounts(leads: Lead[]): { label: string; count: number }[] {
  let calls = 0;
  let facebook = 0;
  let emails = 0;
  let logged = 0;
  for (const lead of leads) {
    const lines = lead.activityLog.split("\n").map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (/· Call(?: ·|$)/.test(line)) {
        calls += 1;
        logged += 1;
      } else if (/· Facebook(?: ·|$)/.test(line)) {
        facebook += 1;
        logged += 1;
      } else if (/· Email(?: ·|$)/.test(line)) {
        emails += 1;
        logged += 1;
      }
    }
  }
  if (logged === 0) {
    for (const lead of leads) {
      if (parseInstant(lead.calledAt) != null) calls += 1;
      if (parseInstant(lead.messagedAt) != null) facebook += 1;
      if (parseInstant(lead.emailedAt) != null) emails += 1;
    }
  }
  return [
    { label: "Calls", count: calls },
    { label: "Facebook", count: facebook },
    { label: "Email", count: emails },
  ];
}

function grouped(leads: Lead[], labelOf: (lead: Lead) => string): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const label = labelOf(lead).trim() || "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function ageLabel(created: number, now: number): string {
  const hours = (now - created) / HOUR;
  return formatHours(hours);
}

export function buildReport(leads: Lead[], range: ReportRange, now = new Date()): ReportModel {
  const windowStart = range === "all" ? null : now.getTime() - Number(range.replace("d", "")) * DAY;
  const weekStart = torontoWallTime(weekStartYmd(now), 0, 0).getTime();
  const monthStart = torontoWallTime(`${torontoYmd(now).slice(0, 8)}01`, 0, 0).getTime();

  const cohort = leads.filter((lead) => {
    const created = leadCreatedAt(lead);
    if (windowStart == null) return true;
    return created != null && created >= windowStart;
  });

  const rows: ReportLead[] = cohort.map((lead) => {
    const created = leadCreatedAt(lead);
    const first = firstContactAt(lead);
    const hours = created != null && first != null ? Math.max(0, (first - created) / HOUR) : null;
    return { id: lead.id, name: lead.name || "Unnamed lead", status: lead.leadStatus || "No status", created, firstContact: first, hoursToContact: hours };
  });

  const total = rows.length;
  const contactedRows = rows.filter((row) => row.hoursToContact != null);
  const within1h = contactedRows.filter((row) => (row.hoursToContact ?? 0) <= 1).length;
  const within24h = contactedRows.filter((row) => (row.hoursToContact ?? 0) <= 24).length;
  const uncontactedRows = rows.filter((row) => row.firstContact == null);
  const overdue = uncontactedRows.filter((row) => row.created != null && now.getTime() - row.created > DAY).length;
  const hours = contactedRows.map((row) => row.hoursToContact).filter((value): value is number => value != null);
  const medianHours = median(hours);
  const averageHours = hours.length === 0 ? null : hours.reduce((sum, value) => sum + value, 0) / hours.length;

  const statusCounts = new Map<string, number>();
  for (const row of rows) statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  const known = new Set<string>(PIPELINE_STATUSES);
  const statuses: { label: string; count: number; percent: string }[] = PIPELINE_STATUSES.map((label) => ({
    label,
    count: statusCounts.get(label) ?? 0,
    percent: percent(statusCounts.get(label) ?? 0, total),
  }));
  const other = [...statusCounts.entries()].filter(([label]) => !known.has(label));
  if (other.length > 0) {
    const count = other.reduce((sum, [, value]) => sum + value, 0);
    statuses.push({ label: "Other", count, percent: percent(count, total) });
  }

  const weekKeys: string[] = [];
  const span = range === "7d" ? 2 : range === "30d" ? 5 : 12;
  let cursor = weekStartYmd(now);
  for (let index = 0; index < span; index += 1) {
    weekKeys.unshift(cursor);
    cursor = shiftYmd(cursor, -7);
  }
  const weekCounts = new Map(weekKeys.map((key) => [key, 0]));
  for (const row of rows) {
    if (row.created == null) continue;
    const key = weekStartYmd(new Date(row.created));
    if (weekCounts.has(key)) weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }

  const oldest = uncontactedRows
    .filter((row) => row.created != null)
    .sort((a, b) => (a.created ?? 0) - (b.created ?? 0))
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      age: ageLabel(row.created ?? now.getTime(), now.getTime()),
    }));

  return {
    range,
    total,
    newThisWeek: rows.filter((row) => row.created != null && row.created >= weekStart).length,
    newThisMonth: rows.filter((row) => row.created != null && row.created >= monthStart).length,
    contacted: contactedRows.length,
    contactedRate: percent(contactedRows.length, total),
    within1h,
    within1hRate: percent(within1h, total),
    within24h,
    within24hRate: percent(within24h, total),
    uncontacted: uncontactedRows.length,
    overdue,
    medianHours,
    averageHours,
    medianLabel: formatHours(medianHours),
    averageLabel: formatHours(averageHours),
    qualificationRate: percent(statusCounts.get("Qualified") ?? 0, total),
    closeRate: percent(statusCounts.get("Closed") ?? 0, total),
    statuses,
    methods: methodCounts(cohort),
    weeks: weekKeys.map((key) => ({ label: formatWeekLabel(key), count: weekCounts.get(key) ?? 0 })),
    sources: grouped(cohort, (lead) => lead.source || "Unknown"),
    platforms: grouped(cohort, (lead) => lead.platformName || platformLabel(lead.platform) || "Unknown"),
    oldest,
  };
}
