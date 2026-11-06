import { parseAsStringLiteral } from "nuqs";

/** Plans list state in the URL: `?q=&status=&page=&sort=&view=`. */
export const planListFilters = {
  status: parseAsStringLiteral(["active", "inactive"] as const),
};

/** Fields `GET /admin/plans` sorts by. */
export const planSortFields = ["priceMonthly", "name", "createdAt"] as const;

export const PLANS_PAGE_SIZE = 20;

/** Column visibility and chart type are remembered under this id. */
export const PLANS_TABLE_ID = "plans";

export const planListView = parseAsStringLiteral(["table", "chart"] as const)
  .withDefault("table")
  .withOptions({ history: "replace" });
