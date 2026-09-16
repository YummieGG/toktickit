# Lab 3 Visual QA Checklist — Issue #43

Run date: 2026-09-16. Browser: Playwright Chromium. Required viewports:
1280 × 812, 768 × 812, and 375 × 812.

| Area | Checks | Screenshot evidence |
|---|---|---|
| Authentication | Login idle and mandatory Change Password states; labels and safe feedback | `artifacts/lab-03/screenshots/authentication/login-idle.png`, `change-password.png` |
| Requester | Create success, My Tickets, Ticket Detail after resolution, responsive layout | `artifacts/lab-03/screenshots/requester/create-ticket-*.png`, `my-tickets-*.png`, `ticket-detail-resolved.png` |
| Staff Queue | Desktop/tablet table, mobile cards, search focus, text status/priority indicators, no overflow | `artifacts/lab-03/screenshots/staff-queue/{1280,768,375}.png` |
| Staff Ticket Detail | Editable Staff workflow, read-only data, comments/notes separation, responsive labels and targets | `artifacts/lab-03/screenshots/staff-ticket-detail/{1280,768,375}.png`, `desktop-success.png` |
| User Management | Initial, success, validation error, desktop/tablet/mobile representations, self/last-admin warning | `artifacts/lab-03/screenshots/user-management/*.png` |

## Checklist result

- [x] `document.scrollWidth <= viewport width` at all required viewport checks.
- [x] Desktop/tablet use the Staff Queue table; mobile uses stacked cards.
- [x] Desktop/tablet use the User Management table; mobile uses cards.
- [x] Form controls have explicit labels in requester and Staff detail checks.
- [x] Keyboard focus is retained on the focused requester, Staff queue, and
  Administrator search controls with a visible focus style.
- [x] Status, role, priority, success, warning, and error states include text
  labels; color is not the only indicator.
- [x] Mobile interactive controls checked at or above 44 px where applicable.
- [x] Zen Green token contrast pairs are checked by
  `client/tests/lab-03/visual-style.test.tsx`; warning and orange badge colors
  were adjusted to meet the 4.5:1 text contrast target.
- [x] Screenshots were reviewed for clipping, overlap, and unreadable content.

The Staff tablet table is intentionally dense because `ui-spec.md` requires a
responsive table at tablet width; the automated overflow and screenshot checks
pass without clipping or horizontal page scroll.
