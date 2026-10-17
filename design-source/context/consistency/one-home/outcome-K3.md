# Package K3 — names, Qanvast Ops and the search — outcome (2026-10-08)

Checks run: `npx tsc --noEmit -p .` clean; `npx eslint` on every file below clean; `npm run design:lint` — nothing new. ⌘K ranking checked
with `tsx` over `pageHits` (results under ⌘K below). No build, no server, no browser, no DB writes, no migrations, no repair needed.
Staged register rows: `reg-K3.md` (K3.1 … K3.6).

## N-05 — Qanvast Ops

**Files:** `app/qanvast-ops/page.tsx` (also loads `fetchLeadRows` (only the Qanvast leads' rows are passed), `fetchViewer`, `fetchLeadSources`
→ `liveSourceNames`, `fetchCustomFields(true)`), `components/qanvast/qanvast-leads.tsx`.

- **Add Lead** (desk button, phone filled square) → `LeadFormModal` with `prefill: { source: 'Qanvast' }`, the listing's assign rules
  (`assignableIds` / `assignHint` / `selfAssign`), custom fields, picked files uploaded after `createLead` (`uploadPicked`), snackbar
  "Successfully Created", then `router.refresh()`. Desk button carries `data-kb="create"` (C).
- **Insights** → `withFrom('/company/reports/leads', '/qanvast-ops')`; shown only when `runsStudio(viewer.role)` (the listing's rule, REG-611).
- **Filters** → `FiltersModal` (sources = the rows' own, i.e. `['Qanvast']`; team from `fetchLeadRows`) + `applyFilters` over the Qanvast
  leads' `LeadRow`s; house badge (`components/om/tab-toolbar.module.css` `.filterWrap` / `.filterBadge`), `data-kb="filters"`, Tooltip
  `shortcut="filters"`, label "Filters (n active)". Pipeline: scope pill → Filters → search. Clear all clears filters too.
- **Visible consequence to check:** the table's order now follows the Filters' Sort — **newest at the top by default** (it was oldest first:
  Arjun Mehta … Gavin See; now Gavin See first). "Oldest at the top" restores the old order. If the owner wants the old resting order, the
  alternative is to leave the order alone unless a filter is applied — but then the modal's "Newest at the top" would be untrue.
- **Tab:** "Credits" → **"Lead credits"** (still coming soon).

**Verify (browser):** `/qanvast-ops` at 1440 and 390 as Dane (Owner): Add Lead opens the form with *Lead source: Qanvast*; save a lead on a
scratch DB → it appears at the top of the table; Insights → `/company/reports/leads?from=%2Fqanvast-ops`, Back returns; Filters → e.g. Property
type narrows, badge shows 1, Sort "Oldest at the top" reverses; the tab strip reads Leads · Lead credits · Reviews · Hangouts. View as a
Designer: no Insights button; the form's Assign member is locked to them. Press C (desk) → the form; F → Filters.
**Probes:** none assert the Qanvast header, tabs or order (`verify-ghosts-*` only load the route).

## N-08 — "Messages"

**Files:** `components/shell/app-rail.tsx` (item label), `components/shell/mobile-nav.tsx` (the bar glyph's name "Messages (n unread)"),
`app/chat/page.tsx` (metadata title), `app/chat/error.tsx` (`section="Messages"`), `app/chat/layout.tsx` + `loading.tsx` (comments),
`components/projects/messages/chat-inbox.tsx` (PageHeader title), `components/projects/messages/chat-ghost.tsx` (title bone 64 → 96 — the
/chat ghost, named in my brief though the file sits in `components/projects/messages/`), `app/settings/notifications-settings.tsx` (card
title **Message wording**; `data-testid="notification-messages"` kept), `lib/global-search/model.ts` (Messages row + the card row's title).
`lib/keys/registry.ts`: **unchanged** — there is no G-key for Chat/Messages (GO has none), so nothing to rename; adding one is a new key.

**Verify:** rail (collapsed tooltip and expanded label) "Messages" at 1440; phone bar glyph at 390 (screen-reader name); `/chat` title
"Messages", the loader and reveal draw the same ghost; Settings › Notifications shows "Message wording"; ⌘K "messages" → Go to: Messages
(/chat) first, Message wording second.
**Probe changed:** `design-source/verify/projects/verify-pj-gap-h.cjs` — the rail link's label must start "Messages (1 unread)".

## N-14 — Payment schedules · Client payments

**Files:** `lib/company/sections.ts` (`TEMPLATE_KINDS` payments: label **Payment schedules**, title **Payment schedule templates**),
`components/projects/money/payments-settings.tsx` (card title **Client payments**), `lib/global-search/model.ts` (Templates rows also
match their tab label via `words: k.label`), `lib/global-search/queries.ts` (a saved split's line: "Payment schedule template").

**Verify:** Company › Templates tab strip (and its ghost, which reads the same labels) shows "Payment schedules"; Settings › Projects shows
"Client payments"; ⌘K "payment schedules" → Payment schedule templates.
**Probe changed:** `design-source/verify/projects/verify-pj-r6.cjs` — the card must read "Client payments".

## N-15 — "Invite to Portal"

**Files:** `components/portal/client-access-panel.tsx` (Drawer title, loading label, the two open-failure snackbars),
`components/projects/project-menu.tsx` (**Invite to Portal…**), `lib/projects/getting-started.ts` (the invited step's button),
`components/company/portal/portal-clients-view.tsx` (both row menus' item).

**Verify:** a project ⋮ → "Invite to Portal…" opens a panel titled "Invite to Portal"; the lead ⋮ "Invite to Portal" opens the same title;
Getting started's portal step on an invited project offers "Invite to Portal"; Company › Client portal › Clients row ⋮.
**Probes changed:** `verify-pj-r4a.cjs` (menuitem /Invite to Portal/ + two messages), `verify-pj-r4b.cjs`, `verify-pj-r8.cjs`,
`verify-pj-r9.cjs` (menuitem /Invite to Portal/), `uat-dane-2026-10-01/P6/verify-p6.cjs` (dialog name "Invite to Portal").
(`projects/consistency/{walk,after}.cjs` match /Client access|portal/i — still fine.)

## ⌘K for the whole round (`lib/global-search/model.ts`, `queries.ts`)

| id | change |
|---|---|
| N-01 | `finance-pipeline` row → **`finance-profitability`** "Profitability" → `/company/reports/finance?report=profitability` (words keep "pipeline"); Finance overview's line: "money to verify, what is stuck" (no working capital). |
| N-03 | "Lead capture" → Company › Integrations `#email` (the website-form card). |
| N-06 | "Team" → `/company/members#members`; the Settings "Issuing entities" row removed — Profile's "Issuing entities & bank details" row carries its words. |
| N-07 | new "Registrations & accreditations" → `/company/profile#registrations` (the card the N-07 package added); "casetrust" finds it first. |
| N-08 | new "Messages" → `/chat`; the card row is "Message wording". |
| N-09 | new "Xero" → `/company/integrations#xero` (the N-09 package's card); "Accounting · Xero" kept for mapping + sync log. |
| N-10 | `searchStudio`'s carried rewrite (fix-A A-08) now covers `tasks · files · notes · questionnaire · activity` — a note/log of a lead with a live project opens `/projects/<id>/notes?open=…`. |
| N-13 | "GST" stays Settings, its line "Quotes & pricing · the rate". |
| N-14 | as above. N-15: no "Client access" row existed. |

Ranking check (`pageHits`): messages → Messages 170 · Message wording 6; xero → Xero 170 · Accounting · Xero 122; casetrust → Registrations &
accreditations 6 · Compliance Navigator 6 (that order); profitability → Profitability 170; team → Team 170; lead capture → Lead capture 192;
payment schedules → Payment schedule templates 36; gst → GST 170. **Existing probes** (`verify-search.cjs` note opens `/notes?open=` — still
true on the project's tab; `P7/verify-p7.cjs` gst / paynow cases — unchanged homes) need no edit.

**Verify:** ⌘K each query above at 1440 and 390; a note of Ryan's / Benjamin's lead (Won, live project) opens on the project's Notes & Logs
with the note selected; a note of a lead without a project still opens on the lead.

## Needs from others (files I don't own)

1. `components/shell/skeleton.tsx` `QanvastSkeleton` — the tab bones `[41, 49, 54, 65]`: "Lead credits" is wider than "Credits" (≈84 by the
   same ratio — measure); the header's Insights bone (110) is drawn even for a viewer who doesn't get the button (Designer / Manager).
2. `components/leads/lead-form.tsx` — widen `LeadFormOpen.prefill` to `Partial<Pick<LeadFormData, 'phone' | 'name' | 'source'>>` so the type
   says what Qanvast Ops passes (works today: Qanvast passes a `Partial<LeadFormData>` and the form spreads the prefill whole).
3. `lib/company/folder-libraries.ts:13` — `payments: 'Payments'` (the gallery bar's name at the library root) → `'Payment schedules'`.
4. `components/company/templates/editors/payment-template-editor.tsx:75` — crumb `'Payments'` → `'Payment schedules'` (or
   `templateKind('payments')!.label`); its loader `library-editor-ghost.tsx` if it sizes that crumb.
5. Helpers that still say "Company › Templates › Payments": `components/quotes/editor/payments/payments-section.tsx:299`,
   `components/projects/new-project-dialog.tsx:133`, `components/projects/money/invoice-dialogs.tsx:242` → "… › Payment schedules".
6. `lib/settings/permissions.ts:68` — the *Who may do what* link label `'Projects › Payments'` → `'Projects › Client payments'`.
7. `components/projects/schedule/share-dialog.tsx:104` — the withdrawn client's button `'Client access'` (opens this panel) → `'Invite to Portal'`.
8. `components/company/templates/library-gallery.tsx:747` — the Deleted sheet's aria-label becomes "Deleted payment schedules templates" for
   this kind; harmless, but `p.shell ? … : kind.title`-style wording would read better.
