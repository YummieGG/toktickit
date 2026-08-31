# Lab 2 UI Specification — Zen Green Theme

This document defines the user interface specifications for the TokTickIT Requester Ticketing MVP, structured directly according to the course **Appendix C Checklist**.

---

## 1. Color Tokens and Their Intended Use

| Token | Hex Value | Intended Use / Description |
|---|---|---|
| `primary-green` | `#006B3C` | App header, primary call-to-action buttons, high-emphasis elements |
| `secondary-green` | `#0B7A46` | Active tab highlights, focused field borders, links, hover states |
| `pale-green` | `#EAF6EF` | Selected rows, success message backgrounds, subtle card sections |
| `page-background` | `#F5F7F6` | Main background color for the application shell |
| `surface` | `#FFFFFF` | Form containers, content cards, panels |
| `surface-border` | `#DEE2E0` | Neutral card borders, dividers |
| `text-primary` | `#1A2E1A` | Main body text (dark charcoal-green, avoids pure black) |
| `text-secondary` | `#4A5D4A` | Muted descriptions, helper text, timestamps |
| `error` | `#C62828` | Validation error borders, error message text, destructive buttons |
| `error-bg` | `#FFEBEE` | Background for error alert banners |
| `warning` | `#E65100` | Warning badges, caution indicators (amber, not decorative) |
| `warning-bg` | `#FFF3E0` | Warning callout background |
| `success` | `#2E7D32` | Confirmation alert borders and text |
| `success-bg` | `#E8F5E9` | Success alert background |
| `disabled` | `#B0BDB0` | Disabled controls, inactive buttons |
| `disabled-bg` | `#E8EDE8` | Read-only and disabled field backgrounds |

---

## 2. Typography and Spacing

### Typography
- **Font Stack:** Standard system sans-serif (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`).
- **Headings:**
  - Page Titles (`h1` / `h2`): 1.75rem (28px), Semi-Bold (600), `text-primary`.
  - Section Titles (`h3` / `h4`): 1.25rem (20px), Semi-Bold (600), `text-primary`.
- **Body:** 1rem (16px), Regular (400), line-height 1.5, `text-primary`.
- **Form Labels:** 0.875rem (14px), Medium (500), `text-primary`.
- **Small / Helper Text:** 0.75rem (12px), Regular (400), `text-secondary`.

### Spacing System (Bootstrap-aligned)
- **Base Unit:** 4px / 8px grid.
- **Form Field Margin:** `mb-3` (16px bottom margin).
- **Card Padding:** `p-4` (24px padding on desktop), `p-3` (16px padding on mobile).
- **Component Gap:** `gap-3` (16px) between buttons and related controls.

---

## 3. Editable, Read-only, Invalid, Disabled, and Focused Controls

| Control State | Visual Presentation | Interaction Rules |
|---|---|---|
| **Editable (Default)** | Pure white background (`#FFFFFF`), 1px solid neutral border (`#DEE2E0`), dark text | Accepts user keyboard and mouse input |
| **Focused** | 1px solid `#0B7A46` border with 0.2rem green glow shadow (`rgba(11, 122, 70, 0.25)`) | Active keyboard focus |
| **Invalid** | 1px solid `#C62828` border with red indicator icon | Fails validation; error message visible below |
| **Read-only** | Soft gray-green background (`#F0F4F0`), neutral border, cursor text | Selectable text, cannot be edited or cleared |
| **Disabled** | Muted background (`#E8EDE8`), muted border, cursor `not-allowed`, text `#B0BDB0` | Cannot receive focus or click events |

---

## 4. Required-Field Marker and Validation-Message Placement

- **Required Marker:** A distinct red asterisk (`*`, color: `#C62828`) placed immediately following the field label text (e.g., `Summary *`).
- **Accessibility:** Mandatory inputs include `aria-required="true"`.
- **Message Placement:** Validation errors **must appear directly beneath the invalid input control**, never grouped solely as an ambiguous alert at the top of the screen.
- **Error Styling:** Small text (12px), `#C62828`, with an error alert icon.

---

## 5. Button Hierarchy and Busy State

| Hierarchy | Background | Text / Border | Hover State | Intended Use |
|---|---|---|---|---|
| **Primary** | `#006B3C` | White text, no border | Darkened green (`#00542F`) | Main page actions (Submit Ticket, Continue) |
| **Secondary** | Transparent | `#006B3C` text & 1px border | Pale green bg (`#EAF6EF`) | Alternate actions (Cancel, Clear Filters, Download) |
| **Tertiary** | Transparent | `#0B7A46` text, no border | Underline text | Subtle navigation (Change Requester, Back) |
| **Destructive** | `#C62828` | White text, no border | Darker red (`#A72020`) | Irreversible actions (Remove Attachment) |
| **Disabled** | `#E8EDE8` | `#B0BDB0` text, disabled border | No change, `cursor: not-allowed` | Unavailable actions |
| **Busy State** | `#006B3C` (opacity 0.75) | White text + inline spinner | No hover; `pointer-events: none` | While submitting request (prevents double submit) |

---

## 6. Attachment Selection and Error Presentation

- **Selection Control:** File input with custom drag-and-drop or Browse button labeled `"Choose File"`.
- **Format / Size Constraint Display:** Caption underneath specifies: `"Supported formats: JPG, PNG, WEBP, PDF. Max size: 5 MB per file."`
- **Error Presentation:**
  - If invalid extension or oversized file is selected, the file is rejected immediately before upload.
  - An inline danger alert appears adjacent to the file picker detailing the violation (e.g., *"File exceeds the 5 MB limit"* or *"File type .exe is not permitted"*).

---

## 7. Initial, Loading, Validation, Submitting, Success, and Failure States

1. **Initial State:** Empty form fields, dropdowns populated with reference data, Submit button active.
2. **Loading State:** Centered spinner with `"Loading..."` text; controls temporarily disabled during data fetch.
3. **Validation State:** Red borders on failing inputs with descriptive error text immediately below.
4. **Submitting State:** Primary button switches to busy state with spinning indicator and text `"Submitting..."`; all inputs locked.
5. **Success State:** Form replaced or overlaid with a green confirmation banner clearly displaying the official Ticket Number (e.g., `TK-0001`) and actions: `"View My Tickets"` or `"Create Another Ticket"`.
6. **Failure State:** A clear danger banner at the top of the form with error details. **Form input data is strictly preserved** so the user does not lose their progress.

---

## 8. Desktop, Tablet, and Mobile Layout Rules

| Breakpoint | Viewport Width | Layout Behavior |
|---|---|---|
| **Desktop** | $\ge 992\text{ px}$ | Two-column grid for standard form fields. Data table for My Tickets. Centered container (max-width 1140px). |
| **Tablet** | $768\text{ px} - 991\text{ px}$ | Two-column layout where practical; Summary and Description take full width. Responsive table. |
| **Mobile** | $< 768\text{ px}$ | Single-column vertical stack for all fields. Full-width touch-friendly buttons ($\ge 44\text{ px}$ height). My Tickets switches from table to stacked cards. |
| **All Viewports** | Any | **Zero horizontal page overflow.** No text clipping or overlapping elements. |

---

## 9. Accessibility Labels, Keyboard Focus, and Non-Color Indicators

- **Labels:** Every `<input>`, `<select>`, and `<textarea>` has an explicit `<label for="...">`.
- **Keyboard Focus:** Every interactive control displays an unmistakable focus ring (`#0B7A46`) upon Tab navigation.
- **Non-Color Indicators:**
  - Status badges contain explicit text (not just color dots).
  - Validation messages contain warning icons in addition to red text.
  - Required fields feature visible asterisks and `aria-required`.
  - Icon-only buttons include `aria-label` and visual tooltips.

---

## 10. Visual Inspection Checklist and Screenshot Paths

### Visual Inspection Checklist
- [ ] Primary green `#006B3C` used consistently on header and primary buttons.
- [ ] Read-only fields have distinct muted styling compared to editable fields.
- [ ] Red asterisk appears on all mandatory field labels.
- [ ] Error messages display immediately beneath the corresponding field.
- [ ] No horizontal scrolling or clipped labels on mobile ($375\text{ px}$).
- [ ] Buttons meet minimum touch target height on mobile ($44\text{ px}$).
- [ ] Priority and Status badges use correct color schemes with readable text.

---

## 11. Application Shell and Active Navigation

- **Header Bar:** Solid primary green background (`#006B3C`), white brand title **TokTickIT**.
- **Navigation Links:**
  - `My Tickets`
  - `Create Ticket`
- **Active Navigation State:** Indicated by bold text, a lighter secondary green background pill (`#0B7A46`), or an underline accent.
- **Requester Identity Box:** Located at top-right of shell showing current user (e.g., `Logged in as: Somchai Prasert`) and a clickable `"Change Requester"` link.
- **Mobile Menu:** Collapsible hamburger menu on viewports $< 768\text{ px}$.

---

## 12. Ticket-List Columns and Mobile Representation

### Desktop Columns ($\ge 768\text{ px}$)
1. **Ticket Number:** Monospace link (e.g., `TK-0001`), primary green text.
2. **Summary:** Truncated if exceeding column width, readable tooltip.
3. **Category:** Plain text category name.
4. **Requested Priority:** Color-coded badge.
5. **Status:** Status badge (`NEW`).
6. **Date Created:** Date format `YYYY-MM-DD HH:mm`.

### Mobile Representation ($< 768\text{ px}$)
- Displayed as **Card Units** instead of a wide table.
- Card Header: `Ticket Number` on left, `Status Badge` on right.
- Card Body: `Summary` (prominent bold text), `Category` & `Priority Badge`.
- Card Footer: `Date Created` in small muted font. Tapping the card opens Ticket Detail.

---

## 13. Search, Filters, Sort, Clear-Filters, and Pagination Controls

- **Search Bar:** Real-time or submit-on-enter search input with magnifying icon, placeholder: `"Search by ticket #, summary, or description..."`.
- **Filters:**
  - Category dropdown filter (All Categories, Hardware, Software, etc.).
  - Status dropdown filter.
  - Priority dropdown filter.
- **Clear Filters:** Tertiary button `"Clear Filters"`, visible whenever any filter/search is active.
- **Sorting:** Clickable column headers on desktop (toggle ascending/descending with arrow icon); dropdown sort selector on mobile.
- **Pagination Controls:**
  - Page navigation (`Previous`, `Next`, Page numbers).
  - Page size dropdown selector (`5`, `10`, `20` per page).
  - Total record summary: `"Showing 1-10 of 25 tickets"`.

---

## 14. Priority and Status Badge Rules

Badges use rounded pill styling (`badge rounded-pill`), with clear text contrast:

| Badge | Background | Text Color | Border / Accent |
|---|---|---|---|
| **Priority: LOW** | `#E3F2FD` (pale blue) | `#0D47A1` (dark blue) | None |
| **Priority: MEDIUM** | `#FFF9C4` (pale yellow) | `#F57F17` (dark amber) | None |
| **Priority: HIGH** | `#FFE0B2` (pale orange) | `#E65100` (dark orange) | None |
| **Priority: CRITICAL** | `#FFCDD2` (pale red) | `#B71C1C` (dark red) | None |
| **Status: NEW** | `#E8F5E9` (pale green) | `#1B5E20` (dark green) | 1px solid `#A5D6A7` |

---

## 15. Empty-List versus No-Results Presentation

- **Empty-List State (Requester has zero tickets created):**
  - Friendly clipboard illustration or icon.
  - Heading: `"No Tickets Submitted Yet"`.
  - Description: `"You have not created any IT support requests under this account."`.
  - Action Button: Prominent primary `"Create Ticket"` button.
- **No-Results State (Search or filter matches zero records):**
  - Search/magnifying glass icon.
  - Heading: `"No Matching Tickets Found"`.
  - Description: `"We couldn't find any tickets matching your search criteria."`.
  - Action Button: Secondary `"Clear All Filters"` button.

---

## 16. Requester Ticket Detail Read-Only Layout

- **Header Section:** Ticket Number (`TK-XXXX`), Status badge, Priority badge, Creation Date.
- **Classification Section:** Grouped display of `Category` and `Related System` with read-only badges/boxes.
- **Content Section:**
  - `Summary`: Large read-only text.
  - `Description`: Multiline container preserving original whitespace and line-breaks; non-editable background.
- **Requester Section:** Displays Requester Name and Email in read-only format.
- **Navigation:** Prominent `"← Back to My Tickets"` link at the top.

---

## 17. Active, Uploading, Invalid, Removed, and Unavailable Attachment States

| Attachment State | Visual Appearance | Available Actions |
|---|---|---|
| **Active** | File icon, original file name, size in KB/MB, upload date | `Download` button, `Remove` button |
| **Uploading** | File name, indeterminate animated progress bar | None (actions disabled) |
| **Invalid** | Warning/danger border, violation notice text (e.g., > 5 MB) | `Dismiss` button; no upload occurs |
| **Removed** | Muted gray text, strike-through name, `"Removed"` badge, removal reason & timestamp displayed | Download blocked; no interaction |
| **Unavailable** | Muted item, `"File not found on server"` callout | Removal metadata only |

---

## 18. Desktop Table and Mobile Card or Responsive-Table Behavior

- **Desktop View ($\ge 768\text{ px}$):**
  - Clean table layout with borders between rows (`table table-hover`).
  - Hovering over a row highlights it with Pale Green (`#EAF6EF`).
  - Clicking any row navigates directly to Ticket Detail.
- **Mobile View ($< 768\text{ px}$):**
  - Table is hidden via CSS media query (`d-none d-md-table`).
  - Cards container is displayed (`d-block d-md-none`).
  - Individual cards feature subtle shadow (`box-shadow: 0 1px 3px rgba(0,0,0,0.1)`) and border-radius 8px.

---

## 19. Screenshot Paths for Create Ticket, My Tickets, and Ticket Detail

The automated Playwright test suite and manual verification will output screenshots to the exact paths below:

### Create Ticket
- `artifacts/lab-02/screenshots/create-ticket/desktop-initial.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-validation-error.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-submitting.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-success.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-api-error.png`
- `artifacts/lab-02/screenshots/create-ticket/tablet-layout.png`
- `artifacts/lab-02/screenshots/create-ticket/mobile-layout.png`

### My Tickets
- `artifacts/lab-02/screenshots/my-tickets/desktop-list.png`
- `artifacts/lab-02/screenshots/my-tickets/desktop-search-results.png`
- `artifacts/lab-02/screenshots/my-tickets/desktop-empty.png`
- `artifacts/lab-02/screenshots/my-tickets/desktop-no-results.png`
- `artifacts/lab-02/screenshots/my-tickets/tablet-layout.png`
- `artifacts/lab-02/screenshots/my-tickets/mobile-cards.png`

### Ticket Detail & Attachments
- `artifacts/lab-02/screenshots/ticket-detail/desktop-detail.png`
- `artifacts/lab-02/screenshots/ticket-detail/desktop-attachments.png`
- `artifacts/lab-02/screenshots/ticket-detail/desktop-removed-attachment.png`
- `artifacts/lab-02/screenshots/ticket-detail/tablet-layout.png`
- `artifacts/lab-02/screenshots/ticket-detail/mobile-layout.png`
