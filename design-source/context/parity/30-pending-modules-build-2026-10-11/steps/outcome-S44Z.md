# S44Z · the follow-ups the day's packages left — outcome (2026-10-15, lane A)

Vicky's ask (2026-10-15): "fix all the pending things … without any overlaps nor any issues without losing what we have already built … If you
have any questions please go ahead based on your recommendations." Package S44Z = the hand-offs in `steps/outcome-S44O.md`, `outcome-S44P.md`,
`outcome-S44T.md` and `outcome-S44I.md` ("For other packages"). Every call taken **as recommended — his ask 2026-10-15**. Register rows:
`steps/reg-S44Z.md` (REG-S44Z.1…6). Probe: `design-source/verify/pending-modules/verify-pm2-s44z.cjs` (**106 checks**). Shots:
`design-source/verify/pending-modules/pm2-s44z/`. **No migration. No repair** (R130…R139 unused — nothing in the demo needed a record).

## Ledger — every follow-up this package owns

| Item | From | Status |
| --- | --- | --- |
| 1 · Marketing's server gate on Company › Price book | S44O → S44P | **Fixed** — `app/company/price-book/(items)/page.tsx` and `sections/page.tsx` answer `refusesPath(<their address>)` with the house gate before `fetchPriceBookData` runs. |
| 1 · …and every other server page a Marketing member reaches by address | S44O | **Fixed** where it applied, **checked** where S44O had closed it. Gated now (before a record is read; the editors' and a Hangout's `generateMetadata` too, so no record's name reaches a tab): Company › Templates (Quotes · Contracts · Tasks · T&Cs & Notes · Payment schedules · Schedules · Brand kit), the six template editors (`app/(editor)/templates/**`), Materials, Members + a member's Public profile, Plan & AI credits (Usage · Plan & billing), Client portal (Set-up · Clients), Questionnaire, Company › Reports' tabs (`app/company/reports/[tab]` — Marketing's Leads tab still opens), Tools › AI Visualizer (`/visualizer`, `/visualizer/<design>`), Tools › 3D Space Planner (`/planner`, `/planner/<layout>`, its print), Compliance, every Qanvast Ops page (Leads · Lead credits · Hangouts + a Hangout · Reviews · Studios). Two Company-only file addresses behind those pages answer 404 the same way: a contract template's PDF (`/files/contract-template/<id>`) and a Qanvast application's proof (`/company/listing-file/<id>`). **Already gated by S44O (checked, unchanged):** Tools › Quotes, the quote editor + Preview, Tools › Contracts, the contract editor + preview, every project page and paper, Company › Finance (+ its tabs), Company › Profile, Messages, Meetings, Marketplace, Market Insights, Quote X-Ray. Redirect-only addresses (old Finance tabs, `/leads/insights`, `/projects/insights`, `/company`, `/company/templates`, 1.0's old links) read nothing to send; Marketing's own pages (Leads, Tasks, Settings, Integrations, Reports › Leads, Dashboard, Your profile) are untouched. One rule for both refused roles: `refusesPath` reads `opensPath`, so Accounting meets the same server gate on the same pages, in its own words — the shell's net already drew exactly that gate for both, so nothing a member sees changes. |
| 2 · The quote and contract editors' server actions refuse Marketing | S44O (developers) | **Fixed** — `lib/quotes/desk.ts`: `deskRefusal()` (Marketing → `{ error: ON_DESK }`), `offDesk()` (a list read answers nothing), `keepOffDesk()` (a loader's backstop that throws the rule). Every studio action in `app/quotes/{actions,items-actions,payments-actions,files-actions,comment-actions,text-actions,signature-actions,draft-actions,view-link-actions}.ts` and `app/contracts/{actions,read-actions}.ts` answers it first; the shared loaders (`quoteOf` · `itemOf` · `rowOf` · `load` · comments' `me` · `forLead` · `forQuote`) call the backstop, so an action added later is refused before it reads (items-actions' `asRefusal` turns it into `{ error }`). Kept off the rule, on purpose: the client's pages (`confirmQuoteOnline` · `askQuoteChange` read through a new `loadAny`; `signContractOnline` · `signBundleOnline` · `sendSigningCode` through contracts' `loadAny`; `readQuoteViewStamp`, `stampQuoteSeen`, `declineVariationOnline`, `signingCodeIsDemoAction`), the member's own signature and consent (`saveMemberSignature` · `removeMemberSignature` · `setSignatureConsent` — Your profile is Marketing's page too) and Accounting (its Preview and money papers read quotes). The 43 actions whose answer was a record (`Promise<QuoteItem>`, `Promise<string>`, `Promise<void>` …) now answer `… | Refusal`; every caller reads it — the editors' `run()` / `structural()` / `newIdOf` already did, the rest through the house `orThrow` (`lib/company/template-rules.ts`), whose Error keeps the rule for the caller's own "Couldn’t …" line: the quote editor, its Items · Payments · Files · Text · Signature sections, Preview's client-view switches, the Send hook, the contract editor, Tools › Contracts and a lead's Contracts (create), the contract-from-quote picker, the T&Cs template editor and My Templates modal; on the server `draft-actions` · `leads/quotes-actions` (Upload a quote) · `visualizer/actions` (a design's quote) · `projects/ending-actions` (the completion letter) · `sendBundle` · `contractFromTemplate` (now answers the refusal as it is). Invisible: no page a Marketing member opens calls them; for everyone else every answer is as before. Proven by calls made by hand (the build's action ids) — 22 writes refused with nothing written, the reads empty, Dane's calls served, Accounting's read unchanged. |
| 3 · A Marketing member's first visit to a lead past Met: the loader's filled button | S44O (ghost note) | **Fixed** — one rule `headHasPrimary(lead, mode, role)` (`lib/leads/stage-policy.ts`), read by the page (`overview.tsx`, replacing its inline `deskPrimary`) and by the app shell's seed (`lib/ghost-shapes.server.ts`: `lead.<id>.noprimary` for Marketing's leads past what is theirs to move, from the listing's own rows and the studio's stage rule); `useLeadShape` (`tab-ghost-for.tsx`) takes the seed as its stored flag's fallback (`useSeedFlag`), REG-817's pattern. Found on the way and fixed with it: a first visit to a lead **on its live project** drew the full strip and the common header, for every role — the seed now says `lead.<id>.project`, so the loader draws the short strip (Overview · Quotes · Contracts; Overview alone for Marketing) and the header's pair. What the browser remembers once it has seen the lead still wins. |
| 4 · Settings lists say which entry a name matches — Expense categories | S44P | **Fixed** — `categoryProblem` (`lib/finance/expense-categories.ts`) answers `listedAs` ("Already in the list as “Transport”"; the house words when typed exactly as listed) — the add field, the rename dialog and the server (`renameExpenseCategory`) alike; the matching token lights (`data-match`, `expense-categories-settings.tsx`); the rename dialog names the entry (`setTaken(categoryIn(…))`). |
| 4 · — Ticket categories | S44P | **Fixed** — `ticket-categories-setting.tsx`: `taken` = `listedAs`, the lit token, the rename dialog checks before it calls and names the match; `renameTicketCategory` (`app/projects/tickets-actions.ts`) refuses in the same words (and the client reads it case-blind). |
| 4 · — the rest of Settings' lists (found) | — | **Fixed** — Lead sources' and the Lost / On Hold reasons' Enter on a taken name said "{typed} is already a source / a reason" while the field said "Already in the list as “X”" — Enter now says the field's words (`settings-view.tsx`). Settings › Meetings › Competitors (a table, S23's words "You have “X” already") names the competitor in the list's spelling, on the field and from the server (`nameTaken` answers the match: add · rename · Undo of a remove). Units (S44I) and Trades (S44P) already read alike. |
| 5 · "Priced after the contract" on the phone's item cards | S44T | **Already built by S44I** (REG-S44I.23: the cards carry the divider and the section's *Priced after* tag) — verified at 390 (the divider over the gathered sections, the marked section under it) and at 1440 (the grid's divider). The card's tag now says the grid tooltip's words to a screen reader (`aria-label`, as the card's other tags do). |
| design:lint ratchet | S44I | **Lowered** — `components/templates/render/slices.tsx` inline-style 10 → 9 (`npm run design:lint -- --update`); nothing raised. |

## Calls taken as recommended (his ask 2026-10-15)

- **Item 1's reach** — every studio page outside the role's list, not only the ones the prompt named; and the server gate for Accounting too, since
  it reads the same list (the shell already drew that gate for them — the server now agrees before reading). Route handlers: the two Company-only
  file addresses gated; the Visualizer's pictures (`/visualizer/img`) and a lead's files (`/files/*`) keep Who sees leads, which already admits
  Marketing to every lead.
- **Item 2's shape** — "once in the shared loaders" read as: the rule lives once (`lib/quotes/desk.ts`); every action answers it as its first line
  (a loader that throws can only answer `{ error }` where the action catches, and most don't), and the loaders keep a backstop for any action added
  later. Reads answer nothing (the precedent of `listQuoteItems` under Who sees leads — a picker that loads nothing shows nothing). Marketing only
  (S44O's ask): Accounting's quote reads are its Preview's; the template libraries' own actions (Company › Templates) are left as they are — see
  below.
- **Item 3** — the `onProject` half of the seed is for every role (the same mismatch, the same fix, REG-817's pattern).
- **Item 4** — Competitors keep S23's words ("You have “X” already") with the list's spelling, rather than taking the token lists' sentence: it is a
  table of studios with notes, not a list of chips, and its words were the brief's.
- **Item 5** — nothing to rebuild; only the screen-reader words.

## For other packages / the orchestrator

- **Developers — the same hand-off for the other studio action families.** The Company libraries' own actions (`app/company/{templates,task-templates,
  payment-templates,contract-templates,price-book,folder,schedule-templates}-actions.ts`, `app/company/members-actions.ts`), the Visualizer's
  (`app/visualizer/actions.ts`, `/visualizer/state`), the Planner's (`app/planner/actions.ts`) and Meetings' (`app/meetings/actions.ts`,
  `/meetings/<id>/state`) still trust their pages' gate for Marketing (and Accounting) the way the editors' did — their own role rules (template
  authorship, the price book's proposals, Who sees leads) refuse what those rules cover, not the role. The pattern is ready: a `deskRefusal()`-like
  first line (or one in each family's shared loader). The lead's Quotes / Contracts tab actions (`app/leads/{quotes,contracts}-actions.ts`) are the
  same; mind `fetchStageDocuments`, which the Move stage window reads for every role.
- **Landing** — files this package changed that the day's other packages also touched: `app/settings/settings-view.tsx` (two lines in
  `addSource` / `addReason`), `components/quotes/editor/items/items-section.tsx` (call sites wrapped in `orThrow`, one import), `item-cards.tsx`
  (one attribute), `app/quotes/items-actions.ts` (imports, the two loaders, `asRefusal`'s list, a first line per action, twelve return types,
  `addQuoteItems`' inner call), `lib/ghost-shapes.server.ts` (imports + one block after the money seeds), `design-lint.baseline.json` (one line).
  Every hunk is small and additive; merge them over whatever lane B changes there.
- **Probes changed on purpose** (commented "S44Z"): `pending-modules/verify-pm2-s06.cjs` — a case variant names the entry it matches (this
  package's rule), and its *Who may do what* check reads Accounting one column on (S44O's sixth role, which S44O's probe list missed).
- No migration, no repair, no `components/om/*`, no shell piece, no `app/globals.css`, no token.

## Shared pieces changed

- **New:** `lib/quotes/desk.ts` (server-only: `deskRefusal` · `offDesk` · `keepOffDesk`).
- `lib/leads/stage-policy.ts` — new `headHasPrimary` (pure).
- `lib/ghost-shapes.server.ts` — seeds `lead.<id>.project` (every role) and `lead.<id>.noprimary` (Marketing).
- `components/leads/detail/tab-ghost-for.tsx` — `useLeadShape` reads the seeds as the stored flags' fallback.
- `lib/finance/expense-categories.ts` (`categoryProblem` names the match) · `lib/settings/trades.ts` read by Finance and Projects now.
- The 43 widened action signatures listed in the ledger (`| Refusal`) — a caller that reads a record from one of them now needs `orThrow` or a
  `'error' in r` check (tsc says so).

## Verification

- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` **0 errors** (18 warnings, none in a line this package wrote) ·
  `npm run design:lint` holds (baseline lowered once, never raised) · production build under the lock, twice (the second after the last change),
  exit 0, `DATABASE_URL` a scratch copy.
- Scratch DB: `pbuild/base.db` copied → migrated → repaired (all checks pass); every probe on its own fresh copy, `DATABASE_URL` on the command.
- **`verify-pm2-s44z.cjs` 106 / 106** on :3160 (1440 · 390 touch; the DB as found after — rows, quotes, contracts, settings, the signed-in member),
  twice on the final build. Shots banked in `design-source/verify/pending-modules/pm2-s44z/` (9).
- Existing probes — **every one green**, each on its own fresh copy of the repaired base, on the final build, :3160:

| Probe | Result | Note |
| --- | --- | --- |
| pending-modules `pm2-s44o` (dev previews on) | 56 / 56 | Marketing's role, its gates and words |
| `pm2-s44p` · `pm2-s44i` · `pm2-s44r` · `pm2-s44t` | 65 · 110 · 81 · 69 | the day's neighbours |
| `pm2-s06` | 83 / 83 | 81 / 2 on the first run: its *Who may do what* check read Accounting at column 4, and S44O's sixth role (Marketing) stands before it — updated on purpose (commented); plus S44Z's deliberate "Already in the list as “Rent”" |
| `projects/verify-pj-gap-h` (tickets) | 80 / 80 | |
| `pm2-s23` (Meetings, Competitors) · `pm2-s03` (contracts) · `pm2-s04` (quotes) | 147 · 79 · 82 | |
| `pm2-s07` · `pm2-s42g` (the lead header's primary) | 89 · 40 | |
| regression `view-as` · `st-r1` · `st-r2` · `st-r3` | 23 · 58 · 30 · 30 | |
| `ghosts-same` 1440 · 390 touch · `first-run-ghosts` | 73 · 73 · 15 | `ghosts-strips` drew every route (it measures, no asserts) |
| `qe-r1…r5` · `ct-r1…r4` | 34 · 33 · 21 · 14 · 21 · 36 · 24 · 28 · 29 | the editors' actions for Owners and Designers, unchanged |
| `pb-r1…r4` · `pb-modal` · `tpl-parity` · `folders-galleries` · `folders-pickers` | 18 · 41 · 30 · 32 · 18 · 20 · 44 · 15 | |
| `sw-r4` · `sw-r5` · `dane-p1` · `dane-p3` · `dane-p5a` · `ux-p1` · `ux-p4` · `ux-p5` · `viz-studio` | 35 · 33 · 47 · 71 · 59 · 81 · 56 · 58 · 37 | |

- :3160 stopped by its port at the end; the build lock released each time; `local.db`, main and `A.base` untouched.

## What to check in the browser

1. **View as › Nurul Huda (Marketing), 1440:** type `/company/price-book`, `/company/templates/quotes`, `/visualizer`, `/planner`, `/qanvast-ops` —
   the gate in Marketing's words, Go to Leads. Open a lead at Met (Gerald Tan) in a fresh window: the loader and the page both without a filled
   button; Farah Ahmad (Contacted): both with "Move to Met".
2. **Dane, 1440:** Settings › Finance › Expense categories — type "transport" (Transport lights, "Already in the list as “Transport”"); press Meals,
   rename to "office". Settings › Projects › Ticket categories — "site cleanliness". Settings › Lead management › Lead sources — "QANVAST" + Enter.
3. **Dane, 390:** a quote with a section's ⋮ › Price after the contract — the cards' divider over it.

## Principles check

1. **The mock wins, every exception written down** — no new UI, no new words; each change has its REG-S44Z row, and the one visible change (the
   loader on a first visit) is the REG-708 rule applied.
2. **One system, no one-offs** — one rule each: `refusesPath` (S44O's) on every page, `lib/quotes/desk.ts` for every editor action, the house
   `orThrow` for every caller, `headHasPrimary` for the page and its seed, `listedAs` / `listedMatch` and the token's `data-match` for every list.
3. **Plain words** — the gate's and ON_DESK's words (S44O's), "Already in the list as “X”" (S44P's), "You have “X” already" (S23's).
4. **Nothing is lost** — nothing is deleted or moved; a refused write writes nothing (asserted against the rows); the Settings refusals keep what
   was typed and save nothing.
5. **Say why** — every refusal names its rule: the gate, `{ error: ON_DESK }`, the list's match on the field, Enter's snackbar in the field's words.
6. **Back returns where you came from** — no navigation changed; the gate's one press is the role's home (S44O's).
7. **Every screen is whole** — the gate keeps the shell; the lead's loader now draws the page it reveals on a first visit (Marketing's header,
   a project lead's strip); no page error in the probe.
8. **Every width is designed** — 1440 and 390 touch: the gates, the lead's loader and page, Settings › Finance, the phone's item cards — no
   sideways scroll.
9. **Tables follow the leads listing** — no table changed.
10. **Motion with purpose** — none added; the lit token keeps the house toggle time.
11. **Honest data** — no demo state seeded; the seeds are the records' own answers (the listing's rows, the stage rule); the probe puts back what
    it changes.
12. **Reach for everyone** — the priced-after tag says why to a screen reader; the refused rename stays a labelled field with its message; the gate
    is a focusable house button.
