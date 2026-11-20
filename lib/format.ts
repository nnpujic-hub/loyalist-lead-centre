export const TORONTO = "America/Toronto";

export function torontoToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TORONTO,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }
  return formatDateTime(value);
}

export function formatNoteStamp(date = new Date()): string {
  return `${formatDateTime(date.toISOString())} ET`;
}

/** `2026-11-19 8:55 PM ET` in America/Toronto. */
export function formatActivityStamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TORONTO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const period = get("dayPeriod").replace(/\./g, "").toUpperCase().startsWith("A") ? "AM" : "PM";
  const hour = String(Number(get("hour")));
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")} ${period} ET`;
}

/** `Nov 20, 2026, 7:10 AM EST` in America/Toronto. */
export function formatTimelineStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TORONTO,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const period = get("dayPeriod").replace(/\./g, "").toUpperCase().startsWith("A") ? "AM" : "PM";
  const zone = get("timeZoneName") || "ET";
  return `${get("month")} ${get("day")}, ${get("year")}, ${Number(get("hour"))}:${get("minute")} ${period} ${zone}`;
}

export function formatDays(days: number | null): string {
  if (days == null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function formatMoney(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

export function shiftTorontoDate(days: number, now = new Date()): string {
  const [year, month, day] = torontoToday(now).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/** Convert a Toronto wall-clock time to a UTC Date. */
export function torontoWallTime(date: string, hours: number, minutes: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TORONTO,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(utcGuess.getTime() - (asUtc - utcGuess.getTime()));
}
