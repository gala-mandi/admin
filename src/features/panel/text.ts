import type { Role } from "@/features/auth/types";
import type { PanelSection } from "@/lib/routes";

/**
 * Every user-facing string of the panel shell and its placeholder pages. Kept
 * out of the components so an Urdu version can be added later.
 */

/** `<title>` of a panel page. */
export const pageTitle = (title: string) => `${title} — Galla Mandi`;

const comingSoon = "This page is coming in a later ticket.";

export const panelText = {
  subtitle: "Platform admin",
  menuLabel: "Main menu",
  homeLabel: "Galla Mandi home",
  breadcrumbLabel: "Breadcrumb",
  toggleSidebar: "Toggle menu",
  theme: {
    toDark: "Switch to dark theme",
    toLight: "Switch to light theme",
  },
  userMenu: {
    label: "Account menu",
    logout: "Log out",
    logoutAll: "Log out of all devices",
    logoutAllFailed: "Couldn’t log out of all devices. Try again.",
  },
  roles: {
    super_admin: "Super admin",
    owner: "Owner",
    manager: "Manager",
    operator: "Operator",
  } satisfies Record<Role, string>,
  sections: {
    dashboard: {
      label: "Dashboard",
      description: "Platform overview at a glance.",
    },
    shops: {
      label: "Shops",
      description: "Every mandi shop (tenant) on the platform.",
    },
    plans: {
      label: "Plans",
      description: "Subscription plans and their limits.",
    },
    users: {
      label: "Users",
      description: "Platform admins and shop accounts.",
    },
    auditLogs: {
      label: "Audit logs",
      description: "Who changed what, and when.",
    },
    settings: {
      label: "Settings",
      description: "Platform-wide settings.",
    },
  } satisfies Record<PanelSection, { label: string; description: string }>,
  comingSoon: {
    title: "Nothing here yet",
    body: comingSoon,
  },
  dashboard: {
    welcome: (name: string) => `Welcome, ${name}`,
    body: "Shops, plans and platform activity will show here.",
    loading: "Loading…",
    error: "Couldn’t load your account. Check your internet and try again.",
    retry: "Try again",
  },
  loading: "Loading page…",
  notFound: {
    metaTitle: "Page not found",
    code: "404",
    title: "Page not found",
    body: "The page you opened doesn’t exist or has moved. Check the address or use the menu.",
    back: "Back to dashboard",
  },
  forbidden: {
    code: "403",
    title: "You don’t have access",
    body: "Your account can’t open this page. Ask another platform admin if you need it.",
    back: "Back to dashboard",
  },
  error: {
    title: "Something went wrong",
    body: "This page couldn’t load. Check your internet and try again.",
    retry: "Try again",
    reference: (digest: string) => `Reference: ${digest}`,
  },
} as const;
