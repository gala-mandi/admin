import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { owner, sessionFor, superAdmin } from "@/test/fake-api";
import { RequirePermission } from "./require-permission";
import { ErrorState, ForbiddenState, NotFoundState } from "./status-pages";

describe("status pages", () => {
  afterEach(() => useSessionStore.getState().clear());

  it("404 explains the page doesn't exist and links to the dashboard", () => {
    render(<NotFoundState />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("403 says the user has no access and links to the dashboard", () => {
    render(<ForbiddenState />);

    expect(
      screen.getByRole("heading", { level: 1, name: "You don’t have access" }),
    ).toBeInTheDocument();
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("error state retries", () => {
    const retry = vi.fn();
    render(<ErrorState retry={retry} digest="abc123" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Reference: abc123");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("RequirePermission shows the page to a role with the permission", () => {
    useSessionStore.getState().setSession(sessionFor(superAdmin));
    render(
      <RequirePermission permission="shops:manage">shops</RequirePermission>,
    );

    expect(screen.getByText("shops")).toBeInTheDocument();
  });

  it("RequirePermission shows 403 to a role without it", () => {
    useSessionStore.getState().setSession(sessionFor(owner));
    render(
      <RequirePermission permission="shops:manage">shops</RequirePermission>,
    );

    expect(screen.queryByText("shops")).toBeNull();
    expect(screen.getByText("403")).toBeInTheDocument();
  });
});
