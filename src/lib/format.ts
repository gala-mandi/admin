/** Every date and time is shown in Pakistan time, whatever the browser's zone. */
export const APP_TIME_ZONE = "Asia/Karachi";

const dateFormat = new Intl.DateTimeFormat("en-PK", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-PK", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `2026-10-26T20:30:00Z` → `27 Oct 2026` (the date in Karachi). */
export function formatDate(iso: string): string {
  const date = parse(iso);
  return date ? dateFormat.format(date) : "";
}

/** `2026-10-26T20:30:00Z` → `27 Oct 2026, 1:30 am`. */
export function formatDateTime(iso: string): string {
  const date = parse(iso);
  return date ? dateTimeFormat.format(date) : "";
}

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/**
 * `2026-10-26T20:30:00Z` → `3 days ago` (or `in 2 hours`) relative to `now`.
 * Under a minute is `now`; an invalid date is an empty string.
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, size] of relativeUnits) {
    if (Math.abs(seconds) >= size) {
      return relativeFormat.format(Math.trunc(seconds / size), unit);
    }
  }
  return relativeFormat.format(0, "second");
}

const countFormat = new Intl.NumberFormat("en-PK");

/** `1234` → `1,234` (counts, not money: use `formatRs` for rupees). */
export function formatCount(n: number): string {
  return countFormat.format(n);
}
