import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";
import { tenantSorts, tenantStatuses } from "./types";

/** Shops list state kept in the URL: `?q=&status=&page=&sort=`. */
export const shopListParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(tenantStatuses),
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(tenantSorts).withDefault("-createdAt"),
};

export const SHOPS_PAGE_SIZE = 20;
