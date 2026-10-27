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
