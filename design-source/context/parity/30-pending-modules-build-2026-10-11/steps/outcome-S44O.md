# S44O · Money rules, sign-in phones, the email and a Marketing role — outcome (2026-10-15, lane C)

Vicky's ask (2026-10-15): "go through the sheet for the UAT comments from row number 246 and below to identify and fix all the UAT comments
based on our 2.0 experience without any overlaps nor any issues without losing what we have already built … If you have any questions please go
ahead based on your recommendations." Source: the triage `design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md` (area O,
§7 M15 · M18, §10 C3 · C6 · C10, §12.13). Every call taken **as recommended — her UAT ask 2026-10-15**. Register rows: `steps/reg-S44O.md`
(REG-S44O.1…10). Probe: `design-source/verify/pending-modules/verify-pm2-s44o.cjs` (**56 checks, 56 pass**). Shots:
`design-source/verify/pending-modules/pm2-s44o/`. Migration **`s44o_gst_rule`** (one additive column, `quotes.gst_rule`; generated as 0112 in
the lane — the landing renumbers it). Repairs **R163** (GST rule stamps) · **R164** (the demo's Marketing member).

## Ledger — every row and item this package owns

| Row / item | What | Status |
| --- | --- | --- |
| **row 297** (IDL) | Payment terms break when a project is made from a quote with a fixed design fee | **Fixed** — the three side paths and their siblings. *Duplicate project* (`app/projects/actions.ts`) copies the split with `fixedMinor`; the Start card / sheet (`start-schedule.tsx`, `lib/projects/schedule.ts` start.payments + `PaymentOption.fixedMinor`) says "S$3,000 design fee"; *Apply defaults* (`app/leads/quotes-actions.ts`) keeps the quote's fee — with S44T's `fixed_label` — first, the template's shares after. Siblings found and fixed: `replaceQuotePayments` dropped `fixed_label` (a preset, the % · S$ switch's Undo); `toRows` / `PaymentRow` carry it; *Save this split as a template* wrote a "0%" fee row (now the shares after it, said in the snackbar); the milestone payment picker, the timeline chip, the phone row, Money's next payment and the commission stage picker read "0%" (now `payShareWord`). Probe §1. |
| **row 344** (+ §12.13, Dwellings) | Sign-in "User not found"; Members accepts a landline that can't take a code | **Fixed** — `landlineOnlyKey` (`lib/auth/model.ts`): a landline with no email beside it is refused, `MSG.mobile` under Phone on Add member, Edit details and Your profile, and on the server (`addMember`, `saveMemberDetails`, `sendMyContactCode`). Probe §2. |
| **row 360** (Spaces) | VOs paid up front, not adjusted into later milestones | **Built** (triage §10: not a call) — Settings › Finance › Money in › Invoices: *Variation orders are billed: Spread over the stages · On their own, up front* (`InvoiceRules.voBilling`, Spread by default). On their own: `onVariationApproved` drafts the order's own invoice first (`draftVariationInvoice`, `lib/projects/invoices.ts` — now `billVariation`'s writer too); its sentence says so; Undo removes it. Probe §3. |
| **rows 314 · 337** (M15, call C10) | Logo issue / distorted notification emails | **Fixed** (developers' fix; the layout approved as it is) — `lib/notifications/email-logo.ts` (+ `email-logo-model.ts`): a hosted PNG copy of the kit's logo (sharp, twice the drawn size; an upload, an SVG or an address), its size fitted inside 160 × 48 and printed as `width`/`height` attributes (`email-html.ts`), served publicly at `/files/email-logo?v=` (`app/files/email-logo/route.ts`, `PUBLIC_PATHS`). Probe §4. |
| **rows 282 · 283** (M18, call C3) | GST drifts by cents from the studio's paper | **Fixed** — `gstOfLines` (`lib/quotes/math.ts`): once per rate; `QuotePricing.gstRule` / `quotes.gst_rule` stamped at the first send (`syncPreparedSnapshot`); R163 stamps the quotes sent before ('line'); a kept version without the key prints per line (`reviveSnapshot`); `docTotals` / `docDataFromRecords` / the editor's totals / Bring back / Undo revise read the stamp; R23's re-sum reads it too (and learnt S44T's priced-after rule). Probe §5. Demo figures: no stored amount changed (8 sent quotes stamped 'line'; the drafts' figures happen to agree). |
| **row 313** (IDL, call C6) | A marketing person sees only lead things | **Built** — the Marketing role, everywhere listed in REG-S44O.6…9 (`lib/settings/roles.ts` `MARKETING_PATHS` · `runsLeads` · `runsLeadSetup` · `roleGate` · `homeOfRole`, the pages' server gate `refusesPath`, the lead page, the listing, the stage rule `roleStageBlock`, Settings, Integrations, Reports, Dashboard, ⌘K, Maison AI, the bell, Members, Who may do what, the cost card, the phone dock, the welcome), repair R164 (Nurul Huda). Probe §6. |
| **row 315 · 336** (M16) | WhatsApp notices | **Already** (triage) — no change; answer below. |
| **rows 288 · 289 · 333 · 343** | Settings search · theme skins · portal preview · RO-Well | **Already / N/A** (triage) — answers below. |
| **rows 358 · 359 · 361** (C7 · C9 · C8) | Letter of appointment + deposit · completion letter · approving supplier bills | **Not this package** — the triage's calls C7 / C9 / C8 wait for Vicky (her ask names them later work, "after the quote rows"); nothing in my prompt. Flagged under "For other packages". |

### Sheet answers (for the UAT comments tab)

- **297** — Fixed in 2.0: a quote's fixed design fee now comes along everywhere — Duplicate project, the schedule's Start card, Apply defaults and
  every payment list read "S$1,000 design fee", never "0%". (The Won → project path already kept it.)
- **313** — New in 2.0: a **Marketing** role. A marketing person sees every lead, puts any designer on one, reads Company › Reports › Leads and
  changes Settings › Lead management and Company › Integrations (lead capture) — never quotes' money, projects or Finance. Set it on Company ›
  Members.
- **314 / 337** — Fixed in 2.0: the studio's logo goes into every notification email as a properly sized picture (Outlook kept it full size or
  stretched); an uploaded or SVG logo now shows where the email used to print only the studio's name. The email's layout stays as it is.
- **344** — 2.0 signs a member in by their mobile or their email. Company › Members now refuses a landline when it would be the member's only
  way in ("Enter a mobile number (8 or 9 first) — the sign-in code goes there"). For Dwellings: put the main user's mobile (or an email) on
  their member row.
- **360** — New in 2.0: Settings › Finance › Money in › "Variation orders are billed: On their own, up front" — every approved VO gets its own
  invoice at once and the later milestones keep their amounts. (One VO at a time was already possible: the VO's ⋮ › "Bill VO-n on its own".)
- **282 / 283** — Fixed in 2.0: GST is worked out on each rate's subtotal once (as your own paper does), not line by line. A quote already sent or
  signed keeps the figure its client read.
- **315 / 336, 288, 289, 333, 343** — as the triage's §9 answers (no change).

## Calls taken as recommended (her UAT ask 2026-10-15)

- **C3 GST rounding** — once per rate, for quotes not yet sent; the rule stamped at the first send. **REVERSES** the quote maths' per-line
  GST ("GST = Σ line gst% on what is left", owner 2026-09-11 build plan) for every quote not yet with its client. One reading of "as
  `prepared_json` does": the stamp is taken at the same moment, but — unlike the preparer — never cleared by Revise, so a revision keeps the
  rounding its client already read (a cent's drift between versions would read as a change nobody made).
- **C6 Marketing role** — as recommended. One reading to confirm with her: "Leads (all, or assigned ones under Who sees leads)". Marketing is
  never put on a lead (it hands leads out — the recommendation's "assigning any member"), so "the ones assigned to them" would be none; I read
  it as Marketing seeing the whole pipeline under either rule, as Owners and Admins do (`runsLeads` in `canSeeLead` / `visibleLeadIds` /
  `canOpenLead`). If she wants Marketing narrowed under "Only the leads assigned to them", Marketing must become assignable to leads first.
  Also within the call: Marketing moves a lead up to Met and never into Quote Sent or Won (those steps carry the quote's amount and the signed
  split); no Messages, Tools, Qanvast Ops or Members page (not lead set-up) — said on the gate.
- **C10 the email's look** — today's layout approved as it is; only the logo's size and hosting changed.
- **360's setting** — Spread by default (the triage's "not calls").

## Shared pieces changed

- `lib/settings/roles.ts` — `MARKETING`, `isMarketing`, `runsLeads`, `runsLeadSetup`, `homeOfRole`, `roleGate`, `roleScope`, `ON_DESK`,
  `MARKETING_PATHS`; `onLeads` and `opensWorkspace` exclude Marketing. `lib/leads/enums.ts` `ROLES` gains Marketing (before Accounting).
- `lib/leads/assign-policy.ts` (`assignableIds`, `assignHint`, `canSeeLead`), `lib/leads/visibility.ts` (`visibleLeadIds`, `canOpenLead`, new
  `refusesPath`), `lib/leads/stage-policy.ts` (`roleStageBlock`, `blockedReason` / `stageIntent` take an optional role), `lib/projects/policy.ts`
  (`worksOn`, `mayCreateProject`).
- `components/shell/access-gate.tsx` — `AccessGate` words by role (`roleGate`), the provider on both branches, `useSignedInRole`;
  `app-shell.tsx` / `app/(editor)/layout.tsx` (GlobalSearch `marketing`), `mobile-nav.tsx` (Marketing's dock), `view-as-popover.tsx`
  (`homeOfRole`), `global-search.tsx` + `lib/global-search/*` (scopes, Go to, Create, the server's kinds), `app/page.tsx`.
- Page gates switched from `refusesWorkspace` to `refusesPath(<the page's address>)` (same answer for Accounting): chat, leads (list,
  imports, lead, tab, file), projects (list, tickets), market insights, marketplace, meetings; new server gates on the quote editor and Preview,
  contracts (list, editor, preview), Tools › Quotes, X-Ray, Company › Profile and Finance, the project pages and their papers, a project's file.
- `lib/quotes/math.ts` (`GST_RULE_NOW`, `gstRuleOf`, `gstOfLines`, `QuotePricing.gstRule`), `lib/quotes/prepared-server.ts` (the stamp),
  `lib/templates/data.ts` (`DocData.quote.gstRule`), `lib/templates/queries.ts` (`reviveSnapshot`), `lib/db/schema.ts` (`quotes.gstRule`),
  `components/quotes/editor/quote-editor.tsx` (the pricing seed carries `gstRule`), `app/quotes/actions.ts` (Bring back, Undo revise).
- `lib/quotes/payments.ts` (`PaymentRow.fixedLabel`, `toRows`), `app/quotes/payments-actions.ts`, `lib/projects/schedule-model.ts`
  (`PaymentOption.fixedMinor`, `payShareWord`), `lib/projects/invoices.ts` (`draftVariationInvoice`, the VO rule), `lib/projects/invoices-model.ts`
  (`voBilling`), `components/projects/money/invoice-settings.tsx`, `lib/settings/copy.ts` (`VO_BILLING_WORDS`).
- Settings: `app/settings/page.tsx`, `settings-view.tsx` (`onlyLeads`, one pointer, one counts list), `settings-ghost.tsx`, `actions.ts` (the
  lead-setup setters only — `assertRunsLeadSetup`), `studio-settings.module.css` (six role tracks), `cost-visibility-card.tsx`;
  `lib/settings/permissions.ts` (the Marketing column, `lead-setup` row, `lead` reach), `lib/settings/cost-visibility.ts` (`MARKETING_COST_HELP`).
  S44P / S44I edit other cards of the same files (Trades, Units) — mine are the lead management, roles and money-in parts only.
- `lib/notifications/{queries,personal,delivery,email-html}.ts`, new `email-logo*.ts`, `lib/auth/paths.ts` (`/files/email-logo`), `lib/forms.ts`
  (`MSG.mobile`), `lib/auth/model.ts` (`landlineOnlyKey`).
- No `components/om/*` piece and no `app/globals.css` changed.

## For other packages

- **S44I (Items grid)** — `Pricing` in `items-summary.tsx` may name `gstRule` (`QuotePricing.gstRule`): the editor's seed carries it today
  through `Object.assign` in `quote-editor.tsx`, and `items-section.tsx` passes it on untouched (`{ ...pricing, ...patch }`). Keep that spread if
  the pricing state is reshaped, else the totals card counts a sent quote's GST by today's rule.
- **S44P (Price book)** — Marketing's client gate covers Company › Price book, but its pages read the items server-side before the guard
  answers; a `refusesPath('/company/price-book')` at the top of `app/company/price-book/(items)/page.tsx` and `sections/page.tsx` closes it (not
  added here: your files).
- **Developers** — the email logo's copy uses `sharp` (Next's own optional dependency); a production build should list it in `package.json` or
  put the copy in object storage (`emailLogoFor` is the one place). The quote/contract editors' own server actions trust the pages' gate for
  Marketing, as they did for Accounting (a crafted call by a Marketing member is refused only where an action checks the role) — a role check in
  `quoteOf` / `load` would close it for every action.
- **Calls C7 · C8 · C9** (rows 358 · 361 · 359) — untouched; they wait for Vicky.
- **IDL's "every quote opens with a Design Fee"** (1.0 6e7708c4e — payment templates that hold a fixed fee) is beyond row 297: 2.0's templates
  hold shares only (MI-021); a Design Fee row in templates would be a new call.
- **Ghost note** — a Marketing member's first visit to a lead past Met draws the header's filled button in the loader (the remembered shape's
  first-visit default); the reveal and every later visit draw none (`noPrimary` remembered per lead).
- **Landing beside S44F (on main 15:40)** — the client pages' totals now travel as `DocData.sums`, built by `clientSafe`
  (`lib/quotes/client-quote.ts`) through `docTotals({ ...doc, sums: undefined })`. C3 needs no change there: keep main's first line of
  `docTotals` (`if (d.sums) return d.sums.totals`) and add this lane's `gstRule: d.quote.gstRule` to its `quoteTotals` call and to
  `docDataFromRecords`' (`lib/templates/data.ts`), with `DocData.quote.gstRule`; the sums then follow the stamped rule. The section sums
  (`lib/templates/item-sections.ts` `printSums` / `sections()`) are nets before GST and are untouched. Every other server sum on main
  (`money-queries.ts` `ownGstRate` included) spreads a whole `quotes` row (`{ ...q }`), so it carries `gstRule` once the column lands.
- **Orchestrator** — migration `s44o_gst_rule` (schema-only: `ALTER TABLE quotes ADD gst_rule text`); repairs R163 (placed BEFORE R23 in file
  order, and run once more before the checks) and R164 (after R102, before R110); three new checks. Probes updated for the sixth role
  (deliberate, each edit commented "S44O — call C6"): `pm2-s01`, `pm2-s41b1`, `settings-parity/verify-st-r1` · `st-r2`,
  `price-book-parity/verify-pb-r2`, `parity-map-build/verify-pm-i`, `lead-project-parity/KE/verify-ke` (the sixth column / role option);
  `view-as/verify-view-as` (R164's ninth member in the menu and the sheet); `pm2-s09` · `pm2-s19` · `pm2-s42d` (Marketing takes no AI
  seat, as Accounting — the seat takers' count) · `pm2-s26` (Marketing is in no members' room).

## Verification

- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors · `npm run design:lint` holds (no baseline raised) · production build
  under the lock (lane C; the one warning is `lib/db/baseline.ts`'s, as before). ESLint's 17 warnings are all in files this package
  did not touch.
- Probe `verify-pm2-s44o.cjs` on :3175, a scratch copy of `pbuild/base.db` migrated + repaired: **56 / 56**; the DB left as found (row counts,
  settings, payments, invoices, projects compared after).
- Ghosts (`ghosts/verify-ghosts-same.cjs`) as Marketing: 1440 every route ✓ (leads, kanban, insights, the lead's Overview / Tasks / Files /
  Notes, Tasks, Settings › Lead management, Integrations, Dashboard); 390 Settings and Dashboard ✓, the lead's Overview — see the ghost note.
- Existing probes re-run: see the tally below.

## Principles check

1. **The mock wins, every exception written down** — no mock for any of these; each new word and control is in `reg-S44O.md` with invented copy
   flagged; the calls are recorded as recommended, the C3 reversal marked.
2. **One system** — house pieces only: `Chips` for the VO rule, `EmptyState` via the house gate, `TextField` errors from `MSG`, the card table,
   `PortalMenu`/`DropdownItem` rows, the ghost kit; no `components/om/*` change; tokens only (design:lint holds).
3. **Plain words** — "Variation orders are billed: Spread over the stages · On their own, up front"; "Enter a mobile number (8 or 9 first) — the
   sign-in code goes there"; "Marketing looks after the studio’s leads…"; "Quote Sent and Won go with a quote — the lead’s designer moves it there".
4. **Nothing is lost** — the fixed fee and its word survive every replace; Undo of a VO approval takes its own Draft with it; Add member keeps
   what was typed on a refusal; a sent quote's figure never moves.
5. **Say why** — every refused stage, page, action and Maison AI question says its rule in the role's words; the saved-as-template snackbar
   says the fee stayed on the quote.
6. **Back returns where you came from** — the gate's one press goes to the role's own home; View as lands a switched member on theirs
   (`homeOfRole`); Settings names Roles & access rather than linking a dead end.
7. **Every screen is whole** — the gate keeps the shell; ghosts follow Marketing's Settings, lead page (strip, cards, Create strip, header),
   Dashboard tiles, Reports strip and Integrations; the new route serves bytes only.
8. **Every width is designed** — 1440, 768 (the six-column role table re-tracked for a tablet) and 390 / 320: no sideways scroll (probe §6–7,
   Settings › Finance at 320, the role table at 390 / 768).
9. **Tables follow the listing** — the role table keeps the house card table; the listing keeps its model (only its row menu loses Open project
   for Marketing).
10. **Motion with purpose** — none added; every press answers at once (snackbar or the refusal in place).
11. **Honest data** — Nurul Huda is a real member row with her first visit and her bell row (R164, REG-343); R163 stamps by the stored figure;
    no demo amount moved.
12. **Reach for everyone** — the VO chips are a radio group (arrow keys); the disabled stage rows carry their reason in the tooltip and, on touch,
    the snackbar; the gate's button is focusable; the email logo keeps its `alt`.

## Tally — existing probes re-run (lane C, :3175, each on a fresh copy of the repaired base)

All on the final build, each probe on its own fresh copy of the repaired base (`pbuild/base.db` migrated + repaired with this lane's
`s44o_gst_rule`, R163, R164). **Every probe green.**

| Probe | Result | Note |
| --- | --- | --- |
| `pending-modules/verify-pm2-s44o` (new) | 56 / 56 | 1440 · 390 touch · 768 · 320; the DB left as found |
| `settings-parity/verify-st-r1` | 58 / 58 | 57 / 1 on the first build — "768: Who may do what shows every column — 83px clipped"; fixed with a tablet's six tracks (`studio-settings.module.css`), shot `pm2-s44o/roles-768.png` |
| `settings-parity/verify-st-r2` · `st-r3` | 30 / 30 · 30 / 30 | |
| `price-book-parity/verify-pb-r2` | 41 / 41 | |
| `global-search/verify-search` | 27 / 27 | |
| `ui-sweep/verify-sw-r4` · `sw-r5` | 35 / 35 · 33 / 33 | |
| `quote-editor-parity/verify-qe-r1…r5` | 34 · 33 · 21 · 14 · 21, none failed | C3: the editor's totals, Preview, revisions |
| `view-as/verify-view-as` | 23 / 23 | 21 / 2 before the probe learnt R164's ninth member (deliberate) |
| `view-as/verify-panel-order` | measures only | the panels' order as before |
| `contracts-parity/verify-ct-r4` · `x-ray-parity/verify-xr-r1` | 29 / 29 · 27 / 27 | |
| `ghosts/verify-ghosts-same` 1440 · 390 touch | 73 / 73 · 73 / 73 | as Dane; Marketing's own ghosts checked in the S44O probe and by hand (the ghost note above) |
| `pending-modules/verify-pm2-s01` · `s41b1` | 80 / 80 · 110 / 110 | |
| `pending-modules/verify-pm2-s09` | 79 / 79 | 76 / 3 before the seat count learnt Marketing takes no seat (deliberate) |
| `pending-modules/verify-pm2-s19` · `s26` · `s42d` | 116 / 116 · 107 / 107 · 85 / 85 | s42d runs with dev previews off (its D-19); one earlier run stopped at D-16 when the render finished before Stop was pressed — a timing race in the Visualizer, not this package; the rerun passed |
| `pending-modules/verify-pm2-s18` · `s22` · `s43a` · `s44q` · `s44t` | 63 · 116 · 43 · 52 · 69, none failed | the bell, the Dashboard, the S43 / S44 neighbours |
| `pending-modules/verify-pm2-s04` · `s05` · `s10` · `s16` · `s30` | 82 · 114 · 107 · 56 · 108, none failed | quotes, leads, Maison AI, the shell, signing in |
| `parity-map-build/verify-pm-i` · `pm-a` | 54 / 54 · 47 / 47 | Accounting's gate beside Marketing's; money in (C3, 360) |
| `lead-project-parity/KE/verify-ke` | 31 / 31 | |
| `projects/verify-pj-gap-b` · `pj-r5` | 72 / 72 · 91 / 91 | invoices and the VO rule's Spread default; the project's money |
| `reports-in-company-2026-10-08/verify-reports` | 41 / 41 | Reports › Leads for Marketing |
