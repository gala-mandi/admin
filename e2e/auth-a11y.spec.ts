import { expect, type Locator, type Page, test } from "@playwright/test";
import { authScreens, fontsReady } from "./auth-screens";

/**
 * Ticket 40 (auth screens sign-off): keyboard order and a visible focus ring
 * on the 4.3 super-admin sign in, touch targets of at least 44 px at phone
 * width and no clipped text (the Urdu lines included) on the auth screens.
 */

const PHONE = { width: 390, height: 844 };

/** Outline, ring and border of a control (and of the input group around it). */
async function focusLook(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const boxes = [el, el.closest("[data-slot=input-group]")].filter(
      (x): x is Element => x !== null,
    );
    return boxes
      .map((box) => {
        const s = getComputedStyle(box);
        return [
          s.outlineStyle,
          s.outlineWidth,
          s.outlineColor,
          s.boxShadow,
          s.borderColor,
        ].join(" ");
      })
      .join(" / ");
  });
}

async function tabOrder(page: Page, stops: Locator[]) {
  const unfocused = [];
  for (const stop of stops) unfocused.push(await focusLook(stop));
  for (const [i, stop] of stops.entries()) {
    await page.keyboard.press("Tab");
    await expect(stop).toBeFocused();
    // The ring fades in (150 ms transitions).
    await page.waitForTimeout(250);
    expect(
      await focusLook(stop),
      `focus ring on stop ${i + 1}: ${await stop.evaluate((el) => el.outerHTML.slice(0, 80))}`,
    ).not.toBe(unfocused[i]);
  }
}

test.describe("4.3 sign-in keyboard order", () => {
  test("Tab goes email or phone → password → sign in, each with a visible focus ring", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Super-admin sign in" }),
    ).toBeVisible();
    await tabOrder(page, [
      page.getByLabel("Work email or phone"),
      page.getByLabel("Password"),
      page.getByRole("button", { name: "Sign in securely" }),
    ]);
  });

  test("Enter in the password field submits the form", async ({ page }) => {
    let posted = 0;
    await page.route("http://localhost:4000/auth/login", (route) => {
      if (route.request().method() === "POST") posted += 1;
      return route.fulfill({
        status: 401,
        headers: { "access-control-allow-origin": "http://localhost:3001" },
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 401, message: "Invalid" }),
      });
    });
    await page.goto("/login");
    await page.getByLabel("Work email or phone").fill("admin@gallamandi.pk");
    await page.getByLabel("Password").fill("x-password");
    await page.keyboard.press("Enter");
    await expect.poll(() => posted).toBe(1);
  });
});

/** Visible controls smaller than 44 × 44 px (a checkbox counts with its label). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const controls = document.querySelectorAll<HTMLElement>(
      "button, input:not([type=hidden]), select, textarea, a[data-slot=button]",
    );
    for (const el of controls) {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      let box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (el.getAttribute("aria-hidden") === "true") continue;
      // A button inside a sentence is exempt (WCAG 2.5.8 "inline").
      const parent = el.parentElement;
      if (
        parent &&
        [...parent.childNodes].some(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
        )
      ) {
        continue;
      }
      // A checkbox or radio is hit through its label as well.
      const role = el.getAttribute("role");
      if ((role === "checkbox" || role === "radio") && el.id) {
        const label =
          el.closest("label") ??
          document.querySelector(`label[for="${el.id}"]`);
        if (label) {
          const l = label.getBoundingClientRect();
          box = DOMRect.fromRect({
            x: Math.min(box.x, l.x),
            y: Math.min(box.y, l.y),
            width: Math.max(box.right, l.right) - Math.min(box.x, l.x),
            height: Math.max(box.bottom, l.bottom) - Math.min(box.y, l.y),
          });
        }
      }
      // A text box counts with the input group it fills.
      const group = el.closest("[data-slot=input-group]");
      if (el.tagName === "INPUT" && group) box = group.getBoundingClientRect();
      if (box.height < 43.5 || box.width < 43.5) {
        const name =
          el.getAttribute("aria-label") ||
          el.textContent?.trim() ||
          el.getAttribute("name") ||
          el.tagName;
        out.push(
          `${el.tagName.toLowerCase()} "${name.slice(0, 30)}" ${Math.round(box.width)}×${Math.round(box.height)}`,
        );
      }
    }
    return out;
  });
}

/**
 * Urdu (Arabic-script) text inside a box that cuts its overflow: the tall
 * Nastaliq letters would be clipped.
 */
async function clippedUrdu(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const urdu = /[؀-ۿ]/;
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const text = el.textContent ?? "";
      if (!urdu.test(text) || el.children.length > 0) continue;
      const style = getComputedStyle(el);
      if (style.overflowY === "visible" && style.overflowX === "visible") {
        continue;
      }
      if (style.textOverflow === "ellipsis") continue;
      const box = el.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) continue;
      if (el.scrollHeight - el.clientHeight > 1) {
        out.push(
          `${el.tagName.toLowerCase()} "${text.trim().slice(0, 30)}" ${el.scrollHeight} > ${el.clientHeight}`,
        );
      }
    }
    return out;
  });
}

for (const [size, viewport] of Object.entries({
  desktop: { width: 1440, height: 900 },
  phone: PHONE,
})) {
  test.describe(`auth screens (${size})`, () => {
    test.use({ viewport });
    for (const screen of authScreens) {
      test(`${screen.id} ${screen.title}: targets, no sideways scroll, nothing clipped`, async ({
        page,
        context,
      }) => {
        await screen.open(page, context);
        await fontsReady(page);
        if (size === "phone") expect(await smallTargets(page)).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        expect(await clippedUrdu(page)).toEqual([]);
      });
    }
  });
}
