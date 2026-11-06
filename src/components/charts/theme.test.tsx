import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fallbackTheme, readChartTheme, useChartTheme } from "./theme";

function Probe() {
  const theme = useChartTheme();
  return (
    <p data-testid="probe">
      {theme.mode} {theme.palette[0]} {theme.vars["--success"]}
    </p>
  );
}

describe("chart theme", () => {
  afterEach(() => {
    document.documentElement.className = "";
    document.documentElement.removeAttribute("style");
  });

  it("reads the palette and surfaces from the panel's CSS tokens", () => {
    const root = document.documentElement;
    root.style.setProperty("--chart-1", "#123456");
    root.style.setProperty("--card", "#fafafa");
    root.style.setProperty("--success", "#047857");
    const theme = readChartTheme();
    expect(theme.palette[0]).toBe("#123456");
    // Unset tokens fall back to the defaults.
    expect(theme.palette[1]).toBe(fallbackTheme.palette[1]);
    expect(theme.surface).toBe("#fafafa");
    expect(theme.vars["--success"]).toBe("#047857");
    expect(theme.mode).toBe("light");
  });

  it("follows a switch to dark mode", async () => {
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent(/^light/);

    await act(async () => {
      document.documentElement.style.setProperty("--chart-1", "#9f67fa");
      document.documentElement.classList.add("dark");
      // MutationObserver callbacks run as a microtask.
      await Promise.resolve();
    });
    expect(screen.getByTestId("probe")).toHaveTextContent("dark #9f67fa");
  });
});
