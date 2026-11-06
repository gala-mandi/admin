"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type ChartType, chartTypes } from "./types";

/**
 * The chart type a person picked, per chart, in `localStorage`. Only a UI
 * preference (never data or tokens). Storage can be missing or throw
 * (private mode, blocked site data), so every access is wrapped and the
 * chart falls back to its default type.
 */
export const chartTypeStorageKey = (id: string) => `gm-admin-chart-type:${id}`;

const listeners = new Set<() => void>();

function isChartType(value: unknown): value is ChartType {
  return (
    typeof value === "string" &&
    (chartTypes as readonly string[]).includes(value)
  );
}

export function readChartType(id: string): ChartType | null {
  try {
    const value = window.localStorage.getItem(chartTypeStorageKey(id));
    return isChartType(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeChartType(id: string, type: ChartType): void {
  try {
    window.localStorage.setItem(chartTypeStorageKey(id), type);
  } catch {
    // Not saved; the choice still applies until the page is left.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * `[stored type or null, save]`. `null` on the server and until a type is
 * saved; also when storage can't be read. A choice made while storage is
 * blocked is kept in memory for this page.
 */
export function useStoredChartType(
  id: string,
): [ChartType | null, (type: ChartType) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => memory.get(id) ?? readChartType(id),
    () => null,
  );
  const save = useCallback(
    (type: ChartType) => {
      memory.set(id, type);
      writeChartType(id, type);
    },
    [id],
  );
  return [stored, save];
}

/** This page's choices, for when `localStorage` is unavailable. */
const memory = new Map<string, ChartType>();

/** Tests: forget the in-memory choices. */
export function resetChartTypeMemory(): void {
  memory.clear();
}
