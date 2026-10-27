import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DARK_QUERY,
  resolveTheme,
  type Theme,
  type ThemePreference,
  UI_STORAGE_KEY,
} from "@/lib/theme";

interface UiState {
  theme: ThemePreference;
  /** Desktop sidebar expanded (true) or collapsed to icons (false). */
  sidebarOpen: boolean;
  /** True once the saved preferences were read from localStorage. */
  hydrated: boolean;
  setTheme: (theme: ThemePreference) => void;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * UI preferences only (client state). Persisted to localStorage, which is fine
 * for preferences; tokens never go there (see `stores/session.ts`).
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarOpen: true,
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, sidebarOpen }) => ({ theme, sidebarOpen }),
      // Read after mount (`UiPreferences`), so server and client HTML match.
      skipHydration: true,
      onRehydrateStorage: () => () => useUiStore.setState({ hydrated: true }),
    },
  ),
);

/** The theme in use: the saved choice, or the OS preference. */
export function useResolvedTheme(): Theme {
  const preference = useUiStore((s) => s.theme);
  return resolveTheme(preference, useSystemPrefersDark());
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the OS asks for dark mode; updates live. */
export function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
}
