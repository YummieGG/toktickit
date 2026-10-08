# Lab 4 Visual QA Checklist — Issue #56

Run date: Pre-implementation checklist for Issue #56. Browser: Playwright Chromium. Required viewports: 1280 × 812, 768 × 812, and 375 × 812. This checklist records the visual QA plan for Lab 4 screens; screenshot evidence will be captured and verified during subsequent UI and QA issues.

| Area | Checks | Screenshot evidence |
|---|---|---|
| Requester Dashboard | 4 metric cards, 3 preview lists (max 5 items) at 1280/768/375 px; zero counts, empty lists, keyboard links, error retry | `artifacts/lab-04/screenshots/requester-dashboard/{1280,768,375}.png`, `loading.png`, `empty.png`, `error.png` |
| Staff Dashboard | 7 metric cards, zero-count groups, 3 preview lists at 1280/768/375 px; keyboard links, urgent ticket ordering, accessible badges | `artifacts/lab-04/screenshots/staff-dashboard/{1280,768,375}.png`, `loading.png`, `zero-groups.png`, `error.png` |
| Actions Taken Section | Detail integration, interactive list, create form, validation errors, view/edit mode, assignment, complete, cancel modal | `artifacts/lab-04/screenshots/actions-taken/{1280,768,375}.png`, `create-validation.png`, `conflict-reconcile.png` |
| Actions Taken Drill-down | Paginated assigned actions table/cards at 1280/768/375 px; filter summary chip, pagination controls, ticket link | `artifacts/lab-04/screenshots/actions-taken/drilldown-{1280,768,375}.png` |
| Ticket Workflow | Allowed status options, confirmation dialogs, resolution blocked banner with reasons, atomic cancel notice | `artifacts/lab-04/screenshots/ticket-workflow/{1280,768,375}.png`, `resolution-blocked.png`, `cancel-modal.png` |
| Regression | Login, Change Password, My Tickets, Staff Queue, User Management responsive layouts and read-only Admin checks | `artifacts/lab-04/screenshots/regression/{1280,768,375}.png` |

## Checklist result

- [ ] `document.scrollWidth <= viewport width` at all required viewport checks (no horizontal page scroll).
- [ ] Desktop/tablet use structured tables; mobile uses stacked cards.
- [ ] Action description, result, follow-up note, and attachment notes wrap cleanly without text clipping.
- [ ] Form controls have explicit visible labels, required asterisks, and programmatic error associations.
- [ ] Keyboard focus is retained with visible focus rings across dashboard cards, action controls, and dialogs.
- [ ] Status, role, priority, and action badges include text labels and icons; color is not the sole indicator.
- [ ] Mobile interactive controls are at or above 44 px touch target size.
- [ ] Zen Green token contrast pairs meet WCAG AA 4.5:1 text contrast target.
- [ ] Screenshots are captured and reviewed for zero clipping, overlapping controls, and readable typography.

The Staff tablet layout is designed to remain readable and dense while mobile collapses into stacked cards; automated overflow checks will ensure zero page-level clipping or horizontal scroll.
