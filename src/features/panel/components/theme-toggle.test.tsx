import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { themeScript } from "@/lib/theme";
import { useUiStore } from "@/stores/ui";
import { media } from "@/test/media";
import { resetStores } from "@/test/render-panel";
import { ThemeToggle } from "./theme-toggle";
import { UiPreferences } from "./ui-preferences";

const html = document.documentElement;

function renderToggle() {
  return render(
    <>
      <UiPreferences />
      <ThemeToggle />
    </>,
  );
}

describe("ThemeToggle", () => {
  afterEach(resetStores);

  it("follows the OS (light) by default and switches to dark", () => {
    renderToggle();

    expect(html).not.toHaveClass("dark");
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );

    expect(html).toHaveClass("dark");
    expect(useUiStore.getState().theme).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
  });

  it("switches back to light", () => {
    renderToggle();
    const toggle = screen.getByRole("button", { name: "Switch to dark theme" });

    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(html).not.toHaveClass("dark");
    expect(useUiStore.getState().theme).toBe("light");
  });

  it("starts dark when the OS prefers dark", () => {
    media.prefersDark = true;
    renderToggle();

    expect(html).toHaveClass("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
  });

  it("restores the saved theme from localStorage (and only UI prefs)", async () => {
    localStorage.setItem(
      "gm-admin-ui",
      JSON.stringify({
        state: { theme: "dark", sidebarOpen: false },
        version: 0,
      }),
    );
    renderToggle();

    await act(async () => {});
    expect(html).toHaveClass("dark");
    expect(useUiStore.getState().sidebarOpen).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    );
    expect(JSON.parse(localStorage.getItem("gm-admin-ui")!).state).toEqual({
      theme: "light",
      sidebarOpen: false,
    });
  });
});

describe("themeScript (runs before paint)", () => {
  afterEach(resetStores);

  const run = () => new Function(themeScript)();

  it("adds the dark class from the saved theme", () => {
    localStorage.setItem(
      "gm-admin-ui",
      JSON.stringify({ state: { theme: "dark" } }),
    );
    run();
    expect(html).toHaveClass("dark");
  });

  it("uses prefers-color-scheme when nothing is saved", () => {
    media.prefersDark = true;
    run();
    expect(html).toHaveClass("dark");
  });

  it("keeps light when saved light, even if the OS prefers dark", () => {
    media.prefersDark = true;
    localStorage.setItem(
      "gm-admin-ui",
      JSON.stringify({ state: { theme: "light" } }),
    );
    run();
    expect(html).not.toHaveClass("dark");
  });

  it("ignores broken saved data", () => {
    localStorage.setItem("gm-admin-ui", "{not json");
    expect(run).not.toThrow();
    expect(html).not.toHaveClass("dark");
  });
});
