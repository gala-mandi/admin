# Super-admin screens — design record (ticket 42)

Every super-admin screen **as built**, in the same style as the admin auth screens (ticket 40).
The design canvas is private, so these pictures are the record the owner approves; a frontend
change to a screen should keep its picture true (or update it).

- Each `<screen>-desktop.png` / `-phone.png` shows the **light | dark** theme side by side at
  1440×900 (scaled to half) and 390×844 (full size, long pages cut at 2,400 px). The admin panel
  is English only (no Urdu), so the second picture is the dark theme instead.
- Each `<screen>-states-desktop.png` / `-phone.png` shows the list's **empty | loading | error**
  states.
- Data is a realistic fake platform (12 shops across Punjab, Friday 6 Nov 2026); every API call is
  mocked (`e2e/screens/admin-server.ts`).

**Make them again:** `npm run build && npm run start` (port 3001), then
`DESIGN_REVIEW=1 npx playwright test e2e/screen-gallery.spec.ts --workers=1`
(full-size shots land in `test-results/screens/`; the committed ones are palette-compressed).
The list of screens is `e2e/screens/catalog.ts`.

**Checked on every test run** (`e2e/forms-a11y.spec.ts`, `src/app/theme-contrast.test.ts`): on each
form (create shop, edit shop, new plan, edit plan) Tab follows the reading order, every stop shows
a focus ring, focus is never stuck (a dialog keeps focus until Escape and then gives it back),
fields are 50 px, and at 390 px nothing scrolls sideways or is clipped; theme contrast 4.5:1.

## Index

| # | Task (ticket 42) | Route(s) | Pictures | States | Issues found → fixed / left | Built in | Approved |
|---|---|---|---|---|---|---|---|
| 1 | Super-admin layout (context for every screen) | every admin page; `/no-such-page` | [shell-desktop](layout/shell-desktop.png) · [phone](layout/shell-phone.png)<br>[not-found-404-desktop](layout/not-found-404-desktop.png) · [phone](layout/not-found-404-phone.png) | 404; menu as drawer on phones | none | Ticket 6 (admin PR #6) | ☐ |
| 2 | Super-admin: platform dashboard | `/dashboard` | [platform-dashboard-desktop](dashboard/platform-dashboard-desktop.png) · [phone](dashboard/platform-dashboard-phone.png) · [states-desktop](dashboard/platform-dashboard-states-desktop.png) · [states-phone](dashboard/platform-dashboard-states-phone.png) | empty (new platform), loading, error per card and chart | none | Ticket 33 (admin PRs #13, #15) | ☐ |
| 3 | Super-admin: shops list | `/shops` | [shops-list-desktop](shops/shops-list-desktop.png) · [phone](shops/shops-list-phone.png) · [states-desktop](shops/shops-list-states-desktop.png) · [states-phone](shops/shops-list-states-phone.png) | empty, loading, error | **Fixed:** the shared table centred its empty/error message across every column, so on a 390 px phone it sat off screen; it now stays in view. | Ticket 8 (admin PR #8), DataTable ticket 12 (admin PR #10) | ☐ |
| 4 | Super-admin: shop detail (and create / edit shop) | `/shops/:id`, `/shops/new`, `/shops/:id/edit` | [shop-detail-desktop](shops/shop-detail-desktop.png) · [phone](shops/shop-detail-phone.png) · [states-desktop](shops/shop-detail-states-desktop.png) · [states-phone](shops/shop-detail-states-phone.png)<br>[shop-create-desktop](shops/shop-create-desktop.png) · [phone](shops/shop-create-phone.png)<br>[shop-edit-desktop](shops/shop-edit-desktop.png) · [phone](shops/shop-edit-phone.png) | detail: loading, error | **Fixed:** shop form and subscription-dialog fields 44 → 50 px (auth pattern); the subscription dialog now gives focus back to its button on close. | Ticket 8 (admin PR #8), plans ticket 34 (admin PR #17) | ☐ |
| 5 | Super-admin: plans | `/plans` (+ New / Edit plan dialog) | [plans-list-desktop](plans/plans-list-desktop.png) · [phone](plans/plans-list-phone.png) · [states-desktop](plans/plans-list-states-desktop.png) · [states-phone](plans/plans-list-states-phone.png)<br>[plan-new-desktop](plans/plan-new-desktop.png) · [phone](plans/plan-new-phone.png)<br>[plan-edit-desktop](plans/plan-edit-desktop.png) · [phone](plans/plan-edit-phone.png) | empty, loading, error | **Fixed:** plan fields 44 → 50 px; closing the dialog left focus on the page body → back on New plan / the row menu. | Ticket 34 (admin PR #17) | ☐ |
| 6 | Empty, loading and error states for every list | all lists above | the `*-states-*.png` pictures | empty, loading, error | see 3 | Ticket 12 (admin PR #10) | ☐ |
| — | Users, Audit logs, Settings pages | `/users`, `/audit-logs`, `/settings` | not pictured | — | **Left:** still "Nothing here yet" placeholders; no ticket builds them yet, and ticket 42 does not list them. | — | — |

## Ready to paste into each frontend ticket ("Design & references")

Links point at `main` once this branch is merged.

- **Ticket 6 — Super-admin layout:** `Screens: docs/design/screens/layout/ (admin) — https://github.com/gala-mandi/admin/tree/main/docs/design/screens/layout`
- **Ticket 8 — Shop management:** `Screens: docs/design/screens/shops/ (admin) — https://github.com/gala-mandi/admin/tree/main/docs/design/screens/shops`
- **Ticket 12 — DataTable (admin side):** `Screens: the *-states-*.png pictures in docs/design/screens/ (admin) — https://github.com/gala-mandi/admin/blob/main/docs/design/screens/README.md`
- **Ticket 33 — Platform dashboard:** `Screens: docs/design/screens/dashboard/ (admin) — https://github.com/gala-mandi/admin/tree/main/docs/design/screens/dashboard`
- **Ticket 34 — Plans & subscription status (admin side):** `Screens: docs/design/screens/plans/ and shops/shop-detail-* (admin) — https://github.com/gala-mandi/admin/tree/main/docs/design/screens/plans`

Ticket numbers are the board order in `.github/tickets/tickets.json`; "admin PR #" is the pull
request that built the module. The shop-panel screens are in the **web** repo's
`docs/design/screens/README.md`.
