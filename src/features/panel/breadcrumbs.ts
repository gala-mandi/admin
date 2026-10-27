import { isActivePath } from "@/lib/routes";
import { menuItems } from "./menu";
import { panelText } from "./text";

export interface Crumb {
  label: string;
  /** null for the current page. */
  href: string | null;
}

/**
 * Breadcrumbs from the URL: Dashboard › section. Unknown URLs end in
 * "Page not found". Deeper levels are added by the tickets that build them.
 */
export function breadcrumbsFor(pathname: string): Crumb[] {
  const [home, ...sections] = menuItems;
  if (isActivePath(pathname, home.href)) {
    return [{ label: home.label, href: null }];
  }
  const section = sections.find((m) => isActivePath(pathname, m.href));
  const current = section?.label ?? panelText.notFound.title;
  return [
    { label: home.label, href: home.href },
    { label: current, href: null },
  ];
}
