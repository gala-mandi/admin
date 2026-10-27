import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./format";

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
});
