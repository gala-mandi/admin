import type { Role, TenantStatus } from "@/features/auth/types";
import type { ListResponse } from "@/lib/list-query";

/** Shapes of the platform stats API (`/admin/stats`). Counts only, no money. */

export interface PlatformStats {
  shops: {
    total: number;
    trial: number;
    active: number;
    suspended: number;
    cancelled: number;
  };
  users: {
    /** Shop users, deleted ones left out. */
    total: number;
    /** Not deactivated, in a trial or active shop. */
    active: number;
  };
}

export interface NewShopsMonth {
  /** `YYYY-MM` (Asia/Karachi). */
  month: string;
  count: number;
}

export interface NewShops {
  /** Oldest month first, ending with this month. */
  data: NewShopsMonth[];
}

export interface ActivityItem {
  id: number;
  /** `null` for platform rows that belong to no shop. */
  tenant: { id: string; name: string } | null;
  user: { id: string; name: string; role: Role } | null;
  /** Table name, e.g. `traders`, `tenant_settings`. */
  entity: string;
  entityId: string;
  action: string;
  createdAt: string;
}

export interface ActivityFeed {
  data: ActivityItem[];
}

export interface InactiveShop {
  id: string;
  name: string;
  city: string | null;
  status: TenantStatus;
  lastActivityAt: string;
}

export type InactiveShopPage = ListResponse<InactiveShop>;

export interface InactiveShopsParams {
  page: number;
  limit: number;
}
