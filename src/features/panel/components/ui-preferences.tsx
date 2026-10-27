"use client";

import { useEffect } from "react";
import { applyTheme } from "@/lib/theme";
import { useResolvedTheme, useUiStore } from "@/stores/ui";

/**
 * Loads the saved UI preferences after mount and keeps the `dark` class on
 * `<html>` in sync with the store. The first paint is handled by
 * `themeScript`, so nothing changes here until the saved state is read.
 */
export function UiPreferences() {
  const hydrated = useUiStore((s) => s.hydrated);
  const theme = useResolvedTheme();

  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (hydrated) applyTheme(theme);
  }, [hydrated, theme]);

  return null;
}
