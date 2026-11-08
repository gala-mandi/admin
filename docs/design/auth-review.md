# Auth screens — design review (ticket 40)

Built admin pages compared with the design files in `docs/design/auth/` at 1440×900 and 390×844.
Pictures (design | built) are in `review-shots/`, one per screen and size. To make them again:
build and start the app on port 3001, then
`DESIGN_REVIEW=1 npx playwright test e2e/design-review.spec.ts --workers=1`
(full-size shots land in `test-results/design-review/`; the committed pictures were
palette-compressed to stay small).

Checked by tests on every run (`e2e/auth-a11y.spec.ts`, `src/app/theme-contrast.test.ts`):
keyboard order and focus ring on 4.3, buttons/inputs at least 44 px at phone width, no sideways
scroll, no clipped Urdu lines, 4.5:1 contrast for body text in all six themes, dark mode and the
dark 4.3 screen.

| Screen | Built route | Result | Differences | Fixed or left |
|---|---|---|---|---|
| 4.3 Super-admin sign in | `/login` | Matches (layout, dark card over the wheat-field photo, copy, restricted-area note) | 1. No **Authenticator code** field. 2. No **Go to shop sign in** link under the card. 3. Label says "Work email or phone" (design: "Work email"). 4. Focus ring was the accent at 20%. | 4 fixed (22%, as in the design). 1 left: the server has no two-factor sign-in yet (needs a server ticket). 2 left: the shop panel's address is not configured in admin; add it with an env var when the owner wants the link. 3 left on purpose: the API accepts email or phone. |
| 4.3 wrong password | `/login` (401) | Matches the pattern of 1.2 (error notice with attempts left, Caps Lock hint on the password) | Design has no separate admin error state; built uses the 1.2 pattern on the dark card | Left (consistent with 1.2) |
| 1.3 Too many attempts | `/login` (429) | Matches 1.3 (ring timer, masked identifier, note, disabled retry) | Shown on the dark admin page instead of beside the brand panel; no "Reset password" link (super-admins have no phone-OTP reset in admin) | Left on purpose |
| 3.3 Session expired | `/login?reason=session-expired` | Different form | Design is a modal over the panel that keeps the unsaved work and asks only for the password; built sends the admin to the sign-in page with a "Your session has ended" notice | Left: re-signing in a modal over the page is a new flow (follow-up ticket) |
| 3.2 First login — change password | `/change-password` | Matches (greeting, temporary/new/confirm password, strength, Save and continue, Sign out) | — | — |
| 4.2 Account disabled | `/account-disabled` | Matches | "Back to sign in" was a text link; design shows an outlined full-width button. Built text names "another platform admin" (design: shop owner, which is the shop-panel wording) | Button fixed. Wording left (correct for admin). |
| 5.1 / 5.2 Mobile | — | app — not built yet | — | — |
| Other screens (1.1, 1.2, 2.x, 3.1, 4.1) | — | Built in web, not in admin | — | See web's review |

Placeholders: none left in the admin auth pages. The brand panel's "Today's mandi rates" card shows
sample rates with a **Sample** badge, as in the design (the sign-in page has no shop, so there are
no real rates to show); the owner decides whether to keep it.
