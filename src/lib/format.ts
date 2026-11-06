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

/**
 * Rupees as the server sends them (a decimal string, e.g. `"2500.00"`) →
 * `Rs 2,500.00`. String work only: no float ever touches the amount; more
 * than 2 decimals are cut, never rounded. "" for anything else.
 */
export function formatRs(value: string | null | undefined): string {
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec((value ?? "").trim());
  if (!match) return "";
  const [, sign, rawInt, rawDec = ""] = match;
  const int = rawInt.replace(/^0+(?=\d)/, "");
  const dec = rawDec.padEnd(2, "0").slice(0, 2);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const negative = sign === "-" && /[1-9]/.test(int + dec);
  return `${negative ? "-" : ""}Rs ${grouped}.${dec}`;
}

// en-CA formats a date as YYYY-MM-DD.
const karachiDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in Pakistan as `YYYY-MM-DD` (00:30 PKT is already the new day). */
export function karachiToday(now: Date = new Date()): string {
  return karachiDayFormat.format(now);
}

/** `('2026-11-28', 7)` → `'2026-12-05'`; calendar days, no time zone. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** `('2026-01-31', 1)` → `'2026-02-28'`: same day next month, or its last day. */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last)))
    .toISOString()
    .slice(0, 10);
}

const dayFormat = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** A calendar day `2026-11-20` → `20 Nov 2026` (no time-zone shift). */
export function formatDay(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return "";
  const [, y, m, d] = match.map(Number);
  return dayFormat.format(new Date(Date.UTC(y, m - 1, d)));
}
