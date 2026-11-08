import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Ticket 40: body text keeps at least 4.5:1 contrast in all six design
 * themes (docs/design/README.md), in dark mode and on the 4.3 super-admin
 * sign in. The colours are read from globals.css itself.
 */

// jsdom gives import.meta.url an http: scheme; tests run from the repo root.
const css = readFileSync(resolve("src/app/globals.css"), "utf8");

const themes = ["violet", "indigo", "blue", "green", "red", "dark"] as const;

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escaped} \\{([^}]*)\\}`, "m").exec(css);
  if (!match) throw new Error(`No ${selector} block in globals.css`);
  const vars: Record<string, string> = {};
  for (const [, name, value] of match[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

const root = block(":root");
const darkMode = { ...root, ...block(".dark") };

function tokens(theme: string): Record<string, string> {
  return { ...root, ...block(`[data-theme="${theme}"]`) };
}

type Rgb = [number, number, number];

/** `#rrggbb`, or `rgb(r g b / a)` laid over `base`. */
function rgb(colour: string, base?: string): Rgb {
  const hex = /^#([0-9a-f]{6})$/i.exec(colour);
  if (hex) {
    return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as Rgb;
  }
  const fn = /^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/.exec(colour);
  if (fn && base) {
    const under = rgb(base);
    const a = Number(fn[4]);
    return [1, 2, 3].map(
      (i, k) => Number(fn[i]) * a + under[k] * (1 - a),
    ) as Rgb;
  }
  throw new Error(`Unsupported colour: ${colour}`);
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [text, background, where it is used]. */
const pairs: [string, string, string][] = [
  ["foreground", "background", "text on the page"],
  ["foreground", "card", "text on a card"],
  ["muted-foreground", "card", "secondary text on a card"],
  ["muted-foreground", "background", "secondary text on the page"],
  ["link", "card", "links on a card"],
  ["link", "background", "links on the page"],
  ["primary-foreground", "primary", "button text (gradient start)"],
  ["primary-foreground", "primary-to", "button text (gradient end)"],
  ["secondary-foreground", "secondary", "text on a tint"],
  ["destructive", "card", "error text"],
  ["success", "card", "success text"],
];

describe.each(themes)("%s theme", (theme) => {
  const t = tokens(theme);
  it.each(pairs)("%s on %s (%s) is at least 4.5:1", (text, bg) => {
    expect(contrast(rgb(t[text]), rgb(t[bg]))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("dark mode (.dark)", () => {
  it.each(pairs)("%s on %s (%s) is at least 4.5:1", (text, bg) => {
    expect(
      contrast(rgb(darkMode[text]), rgb(darkMode[bg])),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("4.3 super-admin sign in (dark screen)", () => {
  const card = rgb(root["admin-card"], root["admin-bg"]);
  it.each([
    ["admin-text", "card title and text"],
    ["admin-label", "field labels"],
    ["admin-muted", "secondary text"],
    ["admin-link", "links and the session-expired icon"],
  ])("%s on the card (%s) is at least 4.5:1", (token) => {
    expect(contrast(rgb(root[token]), card)).toBeGreaterThanOrEqual(4.5);
  });
  it("typed text on the input", () => {
    expect(
      contrast(rgb(root["admin-text"]), rgb(root["admin-input"])),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("theme tokens match the design (docs/design/README.md)", () => {
  const design = {
    violet: ["#6d28d9", "#9333ea", "#4c1d95", "#9333ea"],
    indigo: ["#4338ca", "#7c3aed", "#312e81", "#6d28d9"],
    blue: ["#1d4ed8", "#2563eb", "#1e3a8a", "#2563eb"],
    green: ["#065f46", "#047857", "#064e3b", "#047857"],
    red: ["#be123c", "#e11d48", "#881337", "#e11d48"],
    dark: ["#18181b", "#3f3f46", "#18181b", "#3f3f46"],
  } as const;
  it.each(themes)("%s", (theme) => {
    const t = tokens(theme);
    expect([
      t.primary,
      t["primary-to"],
      t["brand-from"],
      t["brand-to"],
    ]).toEqual(design[theme]);
    expect(t.ring).toBe(t.primary);
    expect(t.link).toBe(t.primary);
  });
  it("shared tokens", () => {
    expect(root).toMatchObject({
      background: "#f6f3ff",
      card: "#ffffff",
      foreground: "#1e1b2e",
      "muted-foreground": "#5b5668",
      border: "#dcd8e6",
      destructive: "#be123c",
      success: "#047857",
    });
    expect(css).toMatch(/--radius-card: 1\.5rem;/);
    expect(css).toMatch(/--radius-field: 0\.75rem;/);
  });
});
