"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResolvedTheme, useUiStore } from "@/stores/ui";
import { panelText } from "../text";

/** Switches between light and dark; the choice is remembered. */
export function ThemeToggle() {
  const theme = useResolvedTheme();
  const setTheme = useUiStore((s) => s.setTheme);
  const isDark = theme === "dark";
  const label = isDark ? panelText.theme.toLight : panelText.theme.toDark;

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
