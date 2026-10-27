import { shopPagesText } from "@/features/tenants/text";
import { isActivePath, type PanelSection, shopRoutes } from "@/lib/routes";
import { menuItems } from "./menu";
import { panelText } from "./text";

export interface Crumb {
  label: string;
  /** null for the current page. */
  href: string | null;
}

type SubCrumbs = (segments: string[]) => Crumb[] | null;

/** Levels below a section, from the URL segments after it. */
const subCrumbs: Partial<Record<PanelSection, SubCrumbs>> = {
  shops: ([id, action, ...rest]) => {
    if (!id || rest.length > 0) return null;
    if (id === "new") {
      return action
        ? null
        : [{ label: shopPagesText.newShop.title, href: null }];
    }
    if (!action) return [{ label: shopPagesText.detailCrumb, href: null }];
    if (action !== "edit") return null;
    return [
      {
        label: shopPagesText.detailCrumb,
        href: shopRoutes.detail(decodeURIComponent(id)),
      },
      { label: shopPagesText.editCrumb, href: null },
    ];
  },
};

/**
 * Breadcrumbs from the URL: Dashboard › section › deeper levels. Unknown URLs
 * end in "Page not found".
 */
export function breadcrumbsFor(pathname: string): Crumb[] {
  const [home, ...sections] = menuItems;
  if (isActivePath(pathname, home.href)) {
    return [{ label: home.label, href: null }];
  }
  const section = sections.find((m) => isActivePath(pathname, m.href));
  if (!section) {
    return [
      { label: home.label, href: home.href },
      { label: panelText.notFound.title, href: null },
    ];
  }
  const segments = pathname
    .slice(section.href.length)
    .split("/")
    .filter(Boolean);
  if (segments.length === 0) {
    return [
      { label: home.label, href: home.href },
      { label: section.label, href: null },
    ];
  }
  const deeper = subCrumbs[section.key]?.(segments) ?? [
    { label: panelText.notFound.title, href: null },
  ];
  return [
    { label: home.label, href: home.href },
    { label: section.label, href: section.href },
    ...deeper,
  ];
}
