"use client";

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useMe } from "@/features/auth/hooks";
import { useSessionStore } from "@/stores/session";
import { useUiStore } from "@/stores/ui";
import { AppSidebar } from "./app-sidebar";
import { PanelHeader } from "./panel-header";

/** Sidebar + header around every panel page. */
export function PanelShell({ children }: { children: ReactNode }) {
  const sessionUser = useSessionStore((s) => s.user);
  const me = useMe();
  const user = me.data ?? sessionUser;
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar role={user?.role ?? null} />
      <SidebarInset className="min-w-0">
        <PanelHeader user={user} />
        {/* Fluid up to 1680px so wide screens use the space; pages that
            read better narrow (forms, 404) cap themselves. */}
        <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-6 px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8 2xl:px-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
