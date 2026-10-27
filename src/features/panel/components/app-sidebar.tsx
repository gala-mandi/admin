"use client";

import { Wheat } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Role } from "@/features/auth/types";
import { brandText } from "@/features/auth/text";
import { isActivePath, panelRoutes } from "@/lib/routes";
import { menuFor } from "../menu";
import { panelText } from "../text";

/**
 * Role-based main menu. Collapses to icons on desktop and opens as a drawer
 * (Sheet) on mobile, where picking a page closes it.
 */
export function AppSidebar({ role }: { role: Role | null }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const items = menuFor(role);
  const closeDrawer = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={brandText.name}
              className="focus-visible:ring-sidebar-ring"
            >
              <Link
                href={panelRoutes.dashboard}
                aria-label={panelText.homeLabel}
                onClick={closeDrawer}
              >
                <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Wheat aria-hidden className="size-[18px]" />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span
                    className="font-heading truncate text-[15px] font-extrabold"
                    data-testid="app-name"
                  >
                    {brandText.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {panelText.subtitle}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label={panelText.menuLabel}>
              <SidebarMenu className="gap-1">
                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="h-9 font-semibold"
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={closeDrawer}
                        >
                          <Icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
