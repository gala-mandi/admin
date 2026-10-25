import { describe, expect, it } from "vitest";
import { can, permissions } from "./can";

describe("can", () => {
  it("lets the super-admin do everything", () => {
    for (const permission of permissions) {
      expect(can("super_admin", permission)).toBe(true);
    }
  });

  it("gives shop roles nothing in the admin panel", () => {
    for (const role of ["owner", "manager", "operator"] as const) {
      expect(can(role, "dashboard:view")).toBe(false);
    }
  });

  it("allows nothing without a role", () => {
    expect(can(null, "dashboard:view")).toBe(false);
  });
});
