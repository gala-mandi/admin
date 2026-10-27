import { describe, expect, it } from "vitest";
import { breadcrumbsFor } from "./breadcrumbs";

const home = { label: "Dashboard", href: "/dashboard" };
const shops = { label: "Shops", href: "/shops" };

describe("breadcrumbsFor", () => {
  it("dashboard is a single crumb", () => {
    expect(breadcrumbsFor("/dashboard")).toEqual([
      { label: "Dashboard", href: null },
    ]);
  });

  it("a section page ends in the section", () => {
    expect(breadcrumbsFor("/shops")).toEqual([
      home,
      { label: "Shops", href: null },
    ]);
  });

  it("new shop", () => {
    expect(breadcrumbsFor("/shops/new")).toEqual([
      home,
      shops,
      { label: "New shop", href: null },
    ]);
  });

  it("shop detail and edit", () => {
    expect(breadcrumbsFor("/shops/t1")).toEqual([
      home,
      shops,
      { label: "Shop details", href: null },
    ]);
    expect(breadcrumbsFor("/shops/t1/edit")).toEqual([
      home,
      shops,
      { label: "Shop details", href: "/shops/t1" },
      { label: "Edit", href: null },
    ]);
  });

  it("unknown URLs end in Page not found", () => {
    expect(breadcrumbsFor("/nope")).toEqual([
      home,
      { label: "Page not found", href: null },
    ]);
    expect(breadcrumbsFor("/shops/t1/nope")).toEqual([
      home,
      shops,
      { label: "Page not found", href: null },
    ]);
    expect(breadcrumbsFor("/plans/x")).toEqual([
      home,
      { label: "Plans", href: "/plans" },
      { label: "Page not found", href: null },
    ]);
  });
});
