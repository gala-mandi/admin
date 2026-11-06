import { parseAsStringLiteral } from "nuqs";
import { tenantStatuses } from "./types";

/**
 * Shops list state kept in the URL: `?q=&status=&page=&sort=`. `q`, `page`,
 * `sort` (and `limit`) come from `useDataTableState`; this adds the filters.
 */
export const shopListFilters = {
  status: parseAsStringLiteral(tenantStatuses),
};

/** Fields `GET /admin/tenants` sorts by. */
export const shopSortFields = ["name", "createdAt"] as const;

export const SHOPS_PAGE_SIZE = 20;

/** Column visibility is remembered under this table id. */
export const SHOPS_TABLE_ID = "shops";

/** `?view=chart` shows the shops as a chart; the table is the default. */
export const shopListView = parseAsStringLiteral(["table", "chart"] as const)
  .withDefault("table")
  .withOptions({ history: "replace" });
