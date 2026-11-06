"use client";

import { useSyncExternalStore } from "react";

/** Colours and fonts a chart is drawn with, read from the panel's CSS tokens. */
export interface ChartTheme {
  mode: "light" | "dark";
  /** Categorical slots `--chart-1` … `--chart-8`, in fixed order. */
  palette: string[];
  other: string;
  grid: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
  popover: string;
  popoverText: string;
  fontFamily: string;
  /** `prefers-reduced-motion: reduce`: no entry or update animations. */
  reducedMotion: boolean;
  /** Semantic tokens a category or series may ask for (`colorVar`). */
  vars: Record<string, string>;
}

/** Tokens a chart may colour a category or series with, besides the palette. */
export const semanticColorVars = [
  "--primary",
  "--success",
  "--warning",
  "--destructive",
  "--secondary-foreground",
  "--muted-foreground",
  "--chart-other",
] as const;

export const PALETTE_SIZE = 8;

/** Used on the server and in tests when no stylesheet is loaded. */
export const fallbackTheme: ChartTheme = {
  mode: "light",
  palette: [
    "#6d28d9",
    "#eb6834",
    "#1baf7a",
    "#eda100",
    "#e87ba4",
    "#008300",
    "#2a78d6",
    "#e34948",
  ],
  other: "#a19cae",
  grid: "#ece9f2",
  text: "#1e1b2e",
  muted: "#5b5668",
  border: "#dcd8e6",
  surface: "#ffffff",
  popover: "#ffffff",
  popoverText: "#1e1b2e",
  fontFamily: "Inter, system-ui, sans-serif",
  reducedMotion: false,
  vars: {
    "--primary": "#6d28d9",
    "--success": "#047857",
    "--warning": "#b45309",
    "--destructive": "#be123c",
    "--secondary-foreground": "#4c1d95",
    "--muted-foreground": "#5b5668",
    "--chart-other": "#a19cae",
  },
};

/** Reads a CSS custom property off `<html>`; `fallback` when it's unset. */
export function readCssVar(
  name: string,
  fallback: string,
  style: CSSStyleDeclaration = getComputedStyle(document.documentElement),
): string {
  const value = style.getPropertyValue(name).trim();
  return value || fallback;
}

export function readChartTheme(): ChartTheme {
  if (typeof document === "undefined") return fallbackTheme;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    readCssVar(name, fallback, style);
  const font = read("--font-inter", "");
  return {
    mode: document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
    palette: fallbackTheme.palette.map((fallback, i) =>
      read(`--chart-${i + 1}`, fallback),
    ),
    other: read("--chart-other", fallbackTheme.other),
    grid: read("--chart-grid", fallbackTheme.grid),
    text: read("--foreground", fallbackTheme.text),
    muted: read("--muted-foreground", fallbackTheme.muted),
    border: read("--border", fallbackTheme.border),
    surface: read("--card", fallbackTheme.surface),
    popover: read("--popover", fallbackTheme.popover),
    popoverText: read("--popover-foreground", fallbackTheme.popoverText),
    fontFamily: font
      ? `${font}, system-ui, sans-serif`
      : fallbackTheme.fontFamily,
    reducedMotion:
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    vars: Object.fromEntries(
      semanticColorVars.map((name) => [
        name,
        read(name, fallbackTheme.vars[name] ?? ""),
      ]),
    ),
  };
}

/**
 * The theme store: re-reads the tokens when `<html>` changes class or style
 * (the theme toggle sets `.dark`) or reduced motion changes. Snapshots are
 * cached by value so `useSyncExternalStore` sees a stable object.
 */
let cached: ChartTheme = fallbackTheme;
let cachedKey = "";

function snapshot(): ChartTheme {
  const next = readChartTheme();
  const key = JSON.stringify(next);
  if (key !== cachedKey) {
    cached = next;
    cachedKey = key;
  }
  return cached;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
  const motion =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  motion?.addEventListener?.("change", onChange);
  return () => {
    observer.disconnect();
    motion?.removeEventListener?.("change", onChange);
  };
}

/** The chart theme from the panel tokens; follows light/dark switches live. */
export function useChartTheme(): ChartTheme {
  return useSyncExternalStore(subscribe, snapshot, () => fallbackTheme);
}

/** Palette colour of a CSS custom property, else palette slot `index`. */
export function colorFor(
  theme: ChartTheme,
  index: number,
  colorVar?: string,
): string {
  const slot = colorVar?.match(/^--chart-(\d)$/);
  if (slot) return theme.palette[Number(slot[1]) - 1] ?? theme.palette[0]!;
  const value = colorVar ? theme.vars[colorVar] : undefined;
  if (value) return value;
  return theme.palette[index % PALETTE_SIZE] ?? theme.palette[0]!;
}

/** `#6d28d9` + 0.3 → `rgba(109, 40, 217, 0.3)`; other formats pass through. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return color;
  const n = Number.parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
