import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tenantDetail } from "../test-data";
import { CreateShopNextSteps, EditShopSummary } from "./shop-form-aside";

describe("CreateShopNextSteps", () => {
  it("lists what creating a shop sets up, in order", () => {
    render(<CreateShopNextSteps />);

    const aside = screen.getByRole("complementary", {
      name: "What happens next",
    });
    const steps = within(aside).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("temporary password");
    expect(steps[1]).toHaveTextContent("default settings");
    expect(steps[2]).toHaveTextContent("first sign-in");
  });
});

describe("EditShopSummary", () => {
  it("shows the shop's status and when it was created", () => {
    render(<EditShopSummary tenant={tenantDetail({ status: "suspended" })} />);

    const aside = screen.getByRole("complementary", { name: "Summary" });
    expect(aside).toHaveTextContent("Al-Madina Traders");
    expect(aside).toHaveTextContent("al-madina-traders");
    expect(aside).toHaveTextContent("Suspended");
    expect(aside).toHaveTextContent("27 Oct 2026");
    expect(aside).toHaveTextContent("Suspend or activate the shop");
  });
});
