import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import { fakeAdapter, ok, sessionFor, superAdmin } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { DashboardHome } from "./dashboard-home";

const defaultAdapter = api.defaults.adapter;

describe("DashboardHome", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession(sessionFor(superAdmin));
    api.defaults.adapter = fakeAdapter(async (config) =>
      ok(config, superAdmin),
    ).adapter;
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("welcomes the admin and links to every section and to New shop", async () => {
    render(
      <TestProviders>
        <DashboardHome />
      </TestProviders>,
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome, Platform Admin" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New shop/ })).toHaveAttribute(
      "href",
      "/shops/new",
    );
    const account = screen.getByRole("region", { name: "Your account" });
    expect(account).toHaveTextContent("Super admin");
    expect(account).toHaveTextContent("admin@gallamandi.pk");

    const sections = within(screen.getByRole("region", { name: "Go to" }));
    expect(
      sections.getAllByRole("link").map((a) => a.getAttribute("href")),
    ).toEqual(["/shops", "/plans", "/users", "/audit-logs", "/settings"]);
  });
});
