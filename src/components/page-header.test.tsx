import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("shows the title as the page heading and the description", () => {
    render(<PageHeader title="Shops" description="Every shop" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Shops" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Every shop")).toBeInTheDocument();
    expect(screen.queryByTestId("page-header-actions")).toBeNull();
  });

  it("shows the actions", () => {
    render(<PageHeader title="Shops" actions={<button>Add shop</button>} />);

    expect(screen.getByTestId("page-header-actions")).toContainElement(
      screen.getByRole("button", { name: "Add shop" }),
    );
  });
});
