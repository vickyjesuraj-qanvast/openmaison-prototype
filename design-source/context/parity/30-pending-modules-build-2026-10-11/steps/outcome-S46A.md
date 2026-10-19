# S46A · what a 1.0 user can't find — search, old addresses, keys and the Quote Digitizer's door — outcome (2026-10-19, lane A)

Her ask (19 Oct): "Please go ahead and fix everything and make sure every pixel, feature and functionality is fixed", after the findability
audit `design-source/context/parity/31-findability-audit-2026-10-19/` (README + `raw/1…4`). The plan `s46/plan-2026-10-19.md` gave this
package S1 · D1 · D3 · H1 · M4 · M9 (the word) and the ⌘K pieces of M1 · M2 · M3 · M5. Built in lane A (port 3160). Register rows:
`steps/reg-S46A.md` (REG-S46A.1…12). Probe: `design-source/verify/pending-modules/verify-pm2-s46a.cjs` (118 checks) + its pure half
`pm2-s46a-pure.mts` (181 checks, counted as one). Shots: `design-source/verify/pending-modules/pm2-s46a/` (15). **No migration. No repair.**

## Pending lines ledger — every finding of this package

| Finding | Status | Where |
|---|---|---|
| **S1** ⌘K knows 1.0's names — every word the four raw reports list (N-4 · L-5 · P-2 · P-3 · T-1 · T-7, the inventories' "⌘K finds nothing" notes) | **Built** | `lib/global-search/model.ts`: words on the existing rows; `COMPANY_WORDS` · `TEMPLATE_WORDS` · `MODULE_WORDS` for the rows built from the Company panel, the Templates strip and the Settings modules. Run offline on every 1.0 label the reports name (≈190 words × roles): 0 finding nothing or the wrong page. REG-S46A.1 |
| S1 · a **Tickets** page (escalations · issues · defects · complaints · support ticket) | **Built** | `PAGES` `tickets` → `/projects/tickets` (Accounting / Marketing never offered it — the page's own gate). REG-S46A.2 |
| S1 · **Deleted Projects** (1.0's archived / deleted projects) | **Built** | `deleted-projects` (the listing, whose ⋮ holds the sheet) + `completed-projects` (`/projects?scope=completed` — FROM P5: "archived projects map to Completed"); for leads `lost-leads` (`/leads?scope=lost`, where S46C lands 1.0's archived leads) + `deleted-leads`. REG-S46A.2 |
| S1 · the Settings cards ⌘K couldn't find by their own titles (REG-812; raw L-5 lists eight) | **Built** | Untouched leads · New quotes start with · Messages to clients · Sent messages · Project numbers · Stages and handover · Schedule (with Alerts lead time / Proactive Alerts) · Ticket categories — each lands on its card (`#untouched-leads` · `#new-quote-defaults` · `client-messages` · `#sent-messages` · `project-numbering` · `#handover-settings` · `#schedule-settings` · `#ticket-categories`). REG-S46A.2 |
| S1 · "usage" → Plan & AI credits › Usage | **Built** | a `co-usage` row titled *Usage* (the tab's own title) — first for "usage", "usage & credits", "usage and credits"; Studio health second. REG-S46A.2 |
| S1 · "my settings / settings" → Your profile | **Built** | Your profile's words. "settings" alone now shows Your profile first, then the Settings modules (1.0's "Settings" was every role's own page — even an Owner's). REG-S46A.1 |
| S1 · "approve / approvals" → the Dashboard | **Built** | the Dashboard's words — first for "approvals" (Owner, Designer, Marketing). REG-S46A.1 |
| S1 · "invoice(s)" shows Money in for roles that see the books (P-2) | **Built** | graded other-line matches + the books' pages before the Company panel / Settings / Plan on a tie: "invoices" → Invoices (card) · **Money in** · Plan & AI credits · Set up your studio for an Owner; Accounting the same. REG-S46A.4 |
| S1 · drop one-letter terms ("upload a quote" → Your signature) | **Built** | `termsOf` lets go a single letter, a bare mark and *and* / *the* while another word is left; "upload a quote" leads with Create › Upload a quote. REG-S46A.4 |
| S1 · keep the role filters (Accounting / Marketing / members) | **Kept** | `accountingPage` · `marketingPage` · `runners` · `owners` unchanged; every new row passes through them (pure + browser checks per role). |
| **M4** Create Quote opens straight on Upload a quote | **Built** | `components/quotes/create-quote-modal.tsx` `opensOn="upload"` (a `choose` mode: the row's sentence, the house `Dropzone`, Back to every way). Openers: `components/quotes/list/quotes-workspace.tsx` (`?upload=1`, read each time it asks, then dropped) and `components/leads/quotes/lead-quotes.tsx`. REG-S46A.5 |
| M4 · ⌘K Create "Upload a quote" | **Built** | `CREATE` `create-upload-quote` → `/quotes?upload=1`. REG-S46A.3 |
| M4 · the empty Quotes list offers Upload a quote (one filled button) | **Built** | `components/leads/quotes/quotes-empty.tsx` (`onUpload` — a text button after From Scratch · From Template; both a lead's tab and Tools › Quotes); the first-run ghost draws the three (`components/leads/detail/tab-ghosts.tsx`). REG-S46A.6 |
| M4 · Tools › Quotes' tile makes the upload findable (no second tile) | **Built** | `components/shell/tools-popover.tsx`: each tile's `help` as the house tooltip — Quotes: "Every quote in the studio — create one, or upload an existing quote". REG-S46A.7 |
| **D1** plg / UHD addresses (N-2 · L-3 · P-4 · T-5) | **Built** | `lib/links/old-addresses.ts`: the ten fixed rows; plg's personal `?section=` (`OLD_PERSONAL_SECTIONS`, in `oldQueryTarget`); `OLD_ACCOUNTS_TABS['cost-visibility']`; `/sign/document/:token` `by: 'route'`; `/escalations/new` → `/projects/tickets?new=1`. The header comment says where each kind is answered. REG-S46A.8 |
| D1 · leave the `/pricing` rows to S46D | **Kept** (S46D's) | untouched. |
| **D3** signed-out visitors from plg's ads | **Built** | `proxy.ts` + `oldToolTarget` / `OLD_OPEN_TOOLS`; the three rows are `by: 'proxy'` now (next.config's redirects run before the proxy). REG-S46A.9 |
| D3 · plg's other open surfaces (`/leads`, `/dashboard`) | **Decided — kept the studio's** | the raw report (T-3) recommends the three tools only; `/leads` and `/dashboard` are every member's bookmark, so a signed-out visit signs in as before. REG-S46A.9 |
| **H1** G then I → Messages, G then E → Projects › Tickets, unlisted | **Built** | `lib/keys/registry.ts` `GO_ALIASES` · `goFor`; `components/shell/shortcuts/shortcuts-layer.tsx` reads `goFor`. REG-S46A.10 |
| **M9** "homeowner portal" (+ "homeowner") on Company › Client portal | **Built** | `COMPANY_WORDS.portal`. REG-S46A.1 |
| ⌘K pieces of **M1** — Tickets page + Create "New ticket" | **Built** | `tickets` · `create-ticket` (→ `/projects/tickets?new=1`, S46B serves it). REG-S46A.2 · .3 |
| ⌘K pieces of **M5** — Create "Start a meeting" (+ insights words) | **Built** | `create-meeting` → `/meetings`, pressing New Meeting ▾ › *Start a meeting now* (the route has no landing param; ⌘K's pick mechanism presses it); Meeting reports' words *insights · meeting insights · copilot analytics*. REG-S46A.3 · .1 |
| ⌘K pieces of **M2** (Your profile "settings") and **M3** (Dashboard "approve approvals") | **Built** | above. |
| M6 / M7 ⌘K words (not asked, found on the way) | **Built** | *close project · closure* → a "Complete handover" row naming the project's ⋮ / Stage ▾; *preview as homeowner · see it as* → Clients with portal access (each client's ⋮ holds See it as). REG-S46A.1 · .2 |

## Decisions taken (as recommended — "fix everything" left them to me)
- **"settings" puts Your profile first.** In 1.0 every role's avatar › Settings was the member's own page (an Owner's too; the studio's was
  Accounts Setup), so a 1.0 hand typing "settings" means Your profile; the four Settings modules follow in the same four rows.
- **"Digitizer" is answered by Create › Upload a quote alone** — the Quotes list keeps *upload · import · existing · pdf · excel*, but the
  tool's own name opens the tool, so ↵ does what a 1.0 user meant.
- **A visitor (D3) = a browser that never signed in here, or one that signed out** (`om_seen` absent or `out`); a browser whose session lapsed
  (`om_seen=in`) is a member's and signs in. In the demo a fresh browser is the standing session (a member), so D3 shows on a signed-out
  browser; in production (no standing session) every stranger from an ad is a visitor.
- **plg's `/settings?section=notifications`** stays 2.0's own Settings › Notifications (the same name — 2.0's links use it), whose first card
  links to Your notifications; every other plg section id lands on its 2.0 card.
- **The Overview's QUOTES card keeps two buttons** (mock 858:24272; a summary card whose tab — with Upload a quote — is one press away).
- **Tools tiles: the help is a tooltip on every tile** (one system), not a second line (the 92×96 tile has no room; the mock draws none).

## Files
`lib/global-search/model.ts` (words maps, rows, Create rows, `termsOf` fillers, graded `rankOf`, the books' pages moved before the Company rows) ·
`components/shell/global-search.module.css` (the phone sheet's chip band, REG-S46A.11) · `lib/links/old-addresses.ts` · `proxy.ts` ·
`lib/keys/registry.ts` · `components/shell/shortcuts/shortcuts-layer.tsx` · `components/quotes/create-quote-modal.tsx` ·
`components/quotes/list/quotes-workspace.tsx` · `components/leads/quotes/lead-quotes.tsx` · `components/leads/quotes/quotes-empty.tsx` ·
`components/shell/tools-popover.tsx` · `components/shell/skeleton.tsx` + `skeleton.module.css` (`EmptyCardGhost stack`) ·
`components/leads/detail/tab-ghosts.tsx` (`FIRST.quotes` three bones; quotes · contracts stack on a phone) · probes `verify-pm2-s46a.cjs`,
`pm2-s46a-pure.mts`, `verify-pm2-s41b2.cjs` (one deliberate expectation).

## What to check in the browser (View as; 1440 and 390 touch)
- **Dane (Owner)**, ⌘K: "escalations" → Tickets; "quote digitizer" → Create › Upload a quote (↵ opens Tools › Quotes on Upload a quote, the
  address dropping `?upload=1`; press the drop box with no client → "Choose a client first"); "invoices" → Money in second; "usage" → Usage
  first; "accounts setup" → Roles & access; "operations" → Finance; "close project" → Complete handover; "new ticket" → Projects › Tickets;
  "start a meeting" → Meetings with the lead picker open. Tools ▸ hover Quotes → its help. G then I → Messages; G then E → Tickets; the G hint
  and the ? panel list neither.
- **Germaine (Designer)**: "settings" → Your profile first; "upload a quote" / "log ticket" / "new meeting" → their Create rows.
- **Priya (Accounting)**: "invoices" / "receipts" → Money in; no Tickets / Upload a quote / Start a meeting / Complete handover rows; old
  `/contractors` · `/settings/usage` · `/tools/quotes` land on their 2.0 page and its Accounting gate.
- **Nurul (Marketing)**: "archived leads" → Lost leads; "approvals" → Dashboard; no project / quote / plan rows.
- A lead with no quote (Cheryl Lim): Quotes tab — From Scratch · From Template · **Upload a quote** (text) → Create Quote on Upload; 390: the
  three stacked.
- Old addresses: `/settings/usage`, `/tools/quotes`, `/company/settings[/quotes]`, `/leads/settings`, `/company/profile/brand-kit`,
  `/company/templates/tasks/<id>`, `/visualizer/materials`, `/billing/return`, `/contractors`, `/settings?section=email` (Gmail card in view),
  `/accounts?tab=cost-visibility` (the card in view). Signed out (Sign out first): `/tools/ai-visualizer` → `/site/try`.

## Probes run (lane A, production build, scratch copies of `pbuild/base.db`; every one put back what it changed)
`verify-pm2-s46a` **118 / 0** (pure half 181 / 0) · harness `search` 27 / 0 · `kb-r1` 35 / 0 · `kb-r2` 29 / 0 · `ux-p7` 89 / 0 · `dane-p2b`
56 / 0 · `qe-r5` 21 / 0 · `cr-r3` 40 / 0 · `first-run-ghosts` 15 / 0 · `first-run-empty` 89 / 0 · `first-run-noleads` 5 / 0 · `first-run-full`
6 / 0 · `ghosts-same-390` 74 / 0 · `verify-pm2-s41b2` 206 / 0 · `verify-pm2-s36` 109 / 109 · `verify-pm2-s41b3` 175 / 175 · `verify-pm2-s42a`
89 / 0 · `verify-pm2-s01` 80 / 0 · `verify-pm2-s24` 132 / 132 · `verify-pm2-s42b` 66 / 0 · `verify-pm2-s12` 72 / 0. `tsc` clean · `eslint app
components lib` 0 errors (no new warning) · `design:lint` holds (no count raised). Page error log empty; no sideways scroll at 390 / 320
(against `screen.width`) on the search sheet, Create Quote's sheet and the empty list.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — met: no mocked screen changed; the empty card adds a third way as the house empty-state
   rule allows (REG-735), the Overview's mocked card is left as drawn; every invented line is in the register.
2. **One system, no one-offs** — met: the house `Dropzone`, `Tooltip`, `EmptyCardGhost`, ⌘K's own Create/landing mechanisms (`pick`,
   `?param`), the one old-address list; tooltips on every Tools tile, not one.
3. **Plain words for studio people** — met: rows named by the page's own title; subs say where a thing lives ("a project's ⋮, or Stage ▾ ›
   Completed"); 1.0's words found but never shown.
4. **Nothing is lost** — met: every 1.0 address in the reports lands; no row removed; the roles' filters kept.
5. **Say why** — met: a press on Upload without a client says "Choose a client first"; a gated landing shows its gate's sentence.
6. **Back returns where you came from** — met: Create Quote's Back leads to every way to start; landings keep `?from=` where the old address
   carried one; the record pages are unchanged.
7. **Every screen is whole** — met: the first-run ghost draws the three buttons (and stacks on a phone, Contracts' too).
8. **Every width is designed** — met: 1440 · 390 · 320 checked (sheets, stacked buttons, no sideways scroll); the search sheet's chip band
   fixed at 390.
9. **Tables follow the leads listing** — not applicable (no table touched).
10. **Motion with purpose** — not applicable (the house sheet / modal / tooltip motion only).
11. **Honest data** — met: no record seeded; D3's visitor rule reads the browser's real sign-in state; the trial switches are honoured.
12. **Reach for everyone** — met: the Tools help shows on keyboard focus too; the drop box is a button ("Upload a quote") with Enter; G I / G E
   for keyboard hands; screen readers hear the same row titles.
- *How to add a missing thing*: one home each (no new page, no rail item — Tickets stays the Projects ⋮'s, found by ⌘K); shown only when it
  applies (Create rows wait for a typed word; role filters); one filled button (the empty card); defaults need no set-up.

## For other packages
- **S46B**: `/projects/tickets?new=1` is where ⌘K's Create › *New ticket* and 1.0's `/escalations/new` land — please open New ticket on it
  (my probe asserts only the pathname + the page). ⌘K's *Complete handover* row says "Projects · a project’s ⋮, or Stage ▾ › Completed — once its
  checklist is met" — if your ⋮ row is named differently, change the sub in `lib/global-search/model.ts` (`project-handover`). If *See it as
  {client}* gets its own ⋮ row (M7), its ⌘K words today sit on *Clients with portal access* (`co-portal-clients`). M5's Insights door: Meeting
  reports' ⌘K words are in.
- **S46C**: 1.0's archived leads → Lost ("Archived in 1.0"): ⌘K *Lost leads* (`/leads?scope=lost`) carries *archived · archived leads*. M2's
  Settings head line and M3's Tasks line: ⌘K's *Your profile* carries *settings · my settings*, the Dashboard *approve · approvals*. *Deleted
  Leads*' ⌘K sub says only "restore a deleted lead" — true whatever the trash's sentence becomes.
- **S46D**: `/sign/document/:token` is listed `by: 'route'` — build `app/sign/document/[token]`; `/sign` is already in `PUBLIC_PATHS` (a segment
  match covers it); my probe accepts 200 or 404 there until you land. The `/pricing` rows are untouched.
- **Orchestrator**: FROM-1.0-TO-2.0.md §3 ("every old address lands" — now true for plg and UHD too, and plg's open tools by who opens them);
  a new REGISTER row for REG-1830 (G I / G E now quiet aliases) and REG-1315's "Tickets button" note; CLAUDE.md's ⌘K (REG-709) and keys
  (REG-711…717) Map entries can name `GO_ALIASES`, the words maps and `opensOn`.

## Shared pieces changed
- `components/shell/shortcuts/shortcuts-layer.tsx` — one line: `goTo` reads `goFor(c)` (the listed keys first, then the aliases).
- `components/shell/skeleton.tsx` + `skeleton.module.css` — `EmptyCardGhost` gains `stack` (bones stack full-width ≤767, the kit's
  `!important` pattern); used only by the first-run Quotes and Contracts ghosts.
- `components/leads/detail/tab-ghosts.tsx` — `FIRST.quotes` three bones; `quotes` · `contracts` `stack: true`.
- `components/shell/global-search.module.css` — `.sheetInner .scopes { flex-grow: 0 }`.

## Found on the way
- The phone search sheet's scope band grew with a short answer (fixed, REG-S46A.11).
- The first-run Quotes / Contracts ghosts drew their buttons in a row on a phone while the cards stack them (fixed with `stack`).
- A production build without `DATABASE_URL` writes an empty `local.db` into the lane's root (`.env.local` says `file:./local.db`) and its
  static pages log failed reads — I built with `DATABASE_URL=file:<scratch>` and removed the stray file; the main tree's recipe should keep
  the DB on the build's command line too.

## Found in 1.0, not on a card
- plg's `/billing/return` was open to a browser with no session (`src/lib/anon/surfaces.ts`: Dodo's return can land signed out). 2.0 sends it to
  Plan & billing, which asks a signed-out browser to sign in and brings it back — honest while payments are a stand-in; the developers' payment
  seam should keep the provider's query on the way back (it rides along today).
