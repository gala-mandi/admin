import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelative } from "./format";

describe("format", () => {
  it("shows the date in Asia/Karachi (UTC+5)", () => {
    // 20:30 UTC on the 26th is 01:30 on the 27th in Karachi.
    expect(formatDate("2026-10-26T20:30:00Z")).toBe("27 Oct 2026");
    expect(formatDateTime("2026-10-26T20:30:00Z")).toMatch(
      /^27 Oct 2026,? 1:30\s?am$/i,
    );
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatDate("not a date")).toBe("");
    expect(formatDateTime("")).toBe("");
  });

  it("says how long ago a date was", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(formatRelative("2026-10-30T11:59:40Z", now)).toBe("now");
    expect(formatRelative("2026-10-30T11:15:00Z", now)).toBe("45 minutes ago");
    expect(formatRelative("2026-10-30T09:00:00Z", now)).toBe("3 hours ago");
    expect(formatRelative("2026-10-29T10:00:00Z", now)).toBe("yesterday");
    expect(formatRelative("2026-10-26T20:30:00Z", now)).toBe("3 days ago");
    expect(formatRelative("2026-10-10T12:00:00Z", now)).toBe("2 weeks ago");
    expect(formatRelative("2026-07-01T12:00:00Z", now)).toBe("4 months ago");
    expect(formatRelative("2024-10-01T12:00:00Z", now)).toBe("2 years ago");
    expect(formatRelative("2026-10-30T14:00:00Z", now)).toBe("in 2 hours");
    expect(formatRelative("nope", now)).toBe("");
  });
});
