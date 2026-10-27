"use client";

import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import type { User } from "@/features/auth/types";
import { panelText } from "../text";
import { PanelBreadcrumbs } from "./panel-breadcrumbs";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/** Top bar: menu toggle, breadcrumbs, theme toggle and the user menu. */
export function PanelHeader({ user }: { user: User | null }) {
  const { toggleSidebar, isMobile, open, openMobile } = useSidebar();

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b px-3 backdrop-blur sm:px-5">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={panelText.toggleSidebar}
        aria-expanded={isMobile ? openMobile : open}
        onClick={toggleSidebar}
        className="aria-expanded:bg-transparent aria-expanded:hover:bg-muted"
      >
        <PanelLeft aria-hidden className="rtl:rotate-180" />
      </Button>
      <Separator
        orientation="vertical"
        className="me-1 data-vertical:h-5 data-vertical:self-center"
      />
      <PanelBreadcrumbs />
      <div className="ms-auto flex items-center gap-1">
        <ThemeToggle />
        {user ? <UserMenu user={user} /> : null}
      </div>
    </header>
  );
}
