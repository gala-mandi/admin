import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { avatarTone, ShopAvatar, shopInitials } from "./shop-avatar";

describe("ShopAvatar", () => {
  it("uses the first and last word's initials", () => {
    expect(shopInitials("Al-Madina Traders")).toBe("AT");
    expect(shopInitials("Ghulam Rasool & Sons")).toBe("GS");
    expect(shopInitials("  bismillah  ")).toBe("B");
    expect(shopInitials("")).toBe("?");
  });

  it("picks the same colour for the same id", () => {
    expect(avatarTone("t1")).toBe(avatarTone("t1"));
    const tones = new Set(
      Array.from({ length: 30 }, (_, i) => avatarTone(`t${i}`)),
    );
    expect(tones.size).toBeGreaterThan(1);
    for (const tone of tones) expect(tone).toBeGreaterThanOrEqual(0);
  });

  it("is decorative and uses theme tokens", () => {
    const { container } = render(<ShopAvatar id="t1" name="Okara Grain" />);
    const avatar = container.firstElementChild!;
    expect(avatar).toHaveAttribute("aria-hidden", "true");
    expect(avatar).toHaveTextContent("OG");
    expect(avatar.className).toMatch(
      /bg-avatar-[1-6] text-avatar-[1-6]-foreground/,
    );
  });
});
