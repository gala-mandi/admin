export type Theme = "light" | "dark";
/** `system` follows `prefers-color-scheme` (the default). */
export type ThemePreference = Theme | "system";

/** localStorage key of the UI preferences (theme, sidebar). Never tokens. */
export const UI_STORAGE_KEY = "gm-admin-ui";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): Theme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

/** Sets the `dark` class (and native `color-scheme`) on `<html>`. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Runs in `<head>` before the page paints, so a dark page never flashes
 * light. Reads the persisted Zustand state (`{ state: { theme } }`).
 */
export const themeScript = `(function(){try{var t=(JSON.parse(localStorage.getItem(${JSON.stringify(
  UI_STORAGE_KEY,
)})||"null")||{state:{}}).state.theme;var d=t==="dark"||(t!=="light"&&window.matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
