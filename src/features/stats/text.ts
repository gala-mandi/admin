/**
 * Every user-facing string of the platform dashboard. Kept out of the
 * components so an Urdu version can be added later.
 */

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

export const statsText = {
  loading: "Loading…",
  none: "—",
  retry: "Try again",
  tiles: {
    label: "Platform at a glance",
    error:
      "Couldn’t load the platform counts. Check your internet and try again.",
    totalShops: "Total shops",
    active: "Active",
    trial: "Trial",
    suspended: "Suspended",
    totalUsers: "Total users",
    cancelledHint: (n: string) => `${n} cancelled`,
    shareHint: (part: number, whole: number) =>
      `${percent(part, whole)}% of shops`,
    activeUsersHint: (n: string) => `${n} active`,
  },
  newShops: {
    title: "New shops per month",
    description: (months: number) =>
      `Shops added in the last ${months} months.`,
    error: "Couldn’t load the new shops. Check your internet and try again.",
    empty: (months: number) => `No new shops in the last ${months} months.`,
    tableCaption: "New shops per month",
    month: "Month",
    shops: "Shops",
    tooltip: (n: number) => (n === 1 ? "1 shop" : `${n} shops`),
  },
  activity: {
    title: "Recent activity",
    description: "Latest changes across every shop.",
    error:
      "Couldn’t load the recent activity. Check your internet and try again.",
    empty: "No activity yet.",
    platform: "Platform",
    system: "System",
    actions: {
      create: "created",
      update: "updated",
      delete: "deleted",
      restore: "restored",
      access: "opened",
    } as Record<string, string>,
    entities: {
      tenant: "the shop",
      tenants: "the shop",
      tenant_settings: "shop settings",
      users: "a user",
      invitations: "a staff invite",
      traders: "a trader",
      commodities: "a commodity",
      ledger_entries: "a khata entry",
      number_sequences: "bill numbers",
      daily_rates: "daily rates",
    } as Record<string, string>,
  },
  inactive: {
    title: "Shops with no activity in 14 days",
    description:
      "Trial and active shops where no one has signed in or changed anything for 14 days.",
    caption: "Shops with no activity in 14 days",
    empty: "Every shop has been active in the last 14 days.",
    error:
      "Couldn’t load the inactive shops. Check your internet and try again.",
    columns: {
      shop: "Shop",
      city: "City",
      status: "Status",
      lastActivity: "Last activity",
    },
    count: (n: string) => (n === "1" ? "1 shop" : `${n} shops`),
  },
} as const;

/** "updated", or the raw action for one this panel doesn't know yet. */
export function actionLabel(action: string): string {
  return statsText.activity.actions[action] ?? action;
}

/** "a trader", or the table name in words for one this panel doesn't know. */
export function entityLabel(entity: string): string {
  return statsText.activity.entities[entity] ?? entity.replaceAll("_", " ");
}
