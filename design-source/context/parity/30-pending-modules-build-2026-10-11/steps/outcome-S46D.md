# S46D · signing a file, 1.0's file-signing links, Pricing on the website — outcome (2026-10-19, lane E)

His ask (19 Oct): "Please go ahead and fix everything and make sure every pixel, feature and functionality is fixed" — after the findability
audit `design-source/context/parity/31-findability-audit-2026-10-19/` (README · raw P-1 · L-4 · T-2). Package S46D = **D2** (signing a file, and
1.0's file-signing links) and **D4** (Pricing on the website); his open call on D4 taken as recommended (`s46/plan-2026-10-19.md`: the 2.0 site
shows pricing). Built in lane E (port 3185). Register rows: `steps/reg-S46D.md` (REG-S46D.1…13). Probe:
`design-source/verify/pending-modules/verify-pm2-s46d.cjs` (**72 / 72**). Shots: `design-source/verify/pending-modules/pm2-s46d/`.
**No migration. No repair** — nothing in the demo needed a record (the probe puts a PDF on Kevin Ng's Files and takes it away).

1.0 read (git only): qanvast `docs/features/lead-document-signing/spec.md`, `scripts/migrations/426_lead_document_signature_requests.sql`,
`src/app/sign/document/[token]/page.tsx`, `src/app/api/lead-files/signature-requests/route.ts` (the token is a `randomUUID()`),
`src/components/leads/drawer-sections/document-signing-controls.tsx` (per the audit); plg `src/app/(marketing)/pricing/{page,page-client}.tsx`,
`pricing-data.ts`, `src/components/landing/v2/{marketing-nav,module-template,platform-hub}.tsx`, `src/app/(marketing)/page-client.tsx`.

## Ledger — the findings' lines

| Line (the prompt's, word for word) | Status | Where |
|---|---|---|
| D2 (a) "a PDF's ⋮ (the Files tab's row / card menu and the file viewer's ⋮) gains *Send for signature*" | **built** | `FileMenu` (grid tile · list row · phone sheet) and the viewer's ⋮ — `SignItem` in `components/leads/files/files-grid.tsx`; the lead's Files and the project's (one component) |
| "→ Contracts › Import a PDF with that file already in it (no re-upload)" | **built** | `ImportContractDialog kept` (the file's tile, its first page; ✕ offers the upload as before); `createContractDoc` `upload.fromFileId` reads the kept bytes on the server (`contractPdfFromFile`, `lib/contracts/files.ts`) — the very file when it sits in Files › Contract & VOs, else a copy kept there (so "kept in Files › Contract & VOs", said by the editor and the dialog, stays true; the original stays free) |
| "→ the existing Send for digital signature flow" | **built** | Import opens the contract's editor (Close returns to Files, `?from=`); its Send → Send for digital signature → WhatsApp, as for any contract (the quote's *Send for signature* lands the same way, REG-538) |
| "Who may: the contract rules (Marketing refused …; Accounting reads Files only)" | **built** | `LeadFilesData.signs` / `FileViewData.signs` = `opensWorkspace`; the server refuses Accounting (`FILES_READ_RULE`, now one shared constant), a lead the member can't open, a money file they may not see — plus Marketing by `deskRefusal` (S44Z) |
| "1.0 also signed PNG / JPEG: turn a picture into a one-page PDF on import ONLY if a library already in node_modules does it cleanly … otherwise the row shows for pictures with the house refusal reason in its meta" | **built — the refusal** | No library writes a PDF (`pdfjs-dist` reads only; `sharp`'s formats: jpeg · png · webp · tiff · dz · gif · heif · vips · raw, no pdf). A picture's (and a document's) row reads disabled with "Save it as a PDF first" in it (REG-656) — 1.0's own line for an unsignable file was "Convert to PDF to request a signature". Also refused in the row: a PDF a contract keeps ("Already in Contracts as “…”"), a PDF with no bytes kept |
| D2 (b) "`/sign/document/<token>` … redirects to `/sign/<token>` when a contract carries that token" | **built** | `app/sign/document/[token]/page.tsx` (a set of documents' token too — `/sign/<token>` sends it on to the set's page) |
| "the port carries 1.0's request token into `contracts.sign_token` — say so in map 08's row and your outcome" | **built** | `design-source/context/parity/08-contracts-migration-map-2026-09-25.md` §1's new row (statuses, the signed copy, PNG / JPEG); here |
| "else the signing pages' own notice for a link that is no longer active, in the house words" | **built** | `LinkGone` — "This link is no longer active · Please ask {studio} for an updated link." (as `/sign/quote-xray/<token>`); 200, never page not found. **Found on the way:** the notice ran edge to edge on a phone — it keeps the 16px gutter now (REG-S46D.5) |
| "S46A adds its `old-addresses.ts` row as `by: 'route'`" | **theirs** | *For other packages* |
| D4 "Build `/site/pricing` on the site's own pieces … from the ONE price source (`lib/credits/plans.ts` + the credit schedule — never a second table of prices)" | **built** | `app/site/pricing/{page,loading}.tsx`, `components/site/{pricing,pricing-client}.tsx` + `pricing.module.css`, `lib/site/pricing.ts` (reads `plans.ts` · `schedule.ts` · `pricing-data.ts`; `buysFor` and the FAQ's numbers now worked from the price list too) |
| "in plg's content shape (plans, what each includes, top-ups, FAQ)" | **built** | hero + period · three plans (Free · Pro Freelance │ Studio · Max) with seats, AI credits, what they buy, the button, the list · Every tool, from day one · How AI credits work (per action · a month · top-ups) · Compare plans and features · Questions (Plans' five + four a visitor asks) · the closing band. Left out of plg's page: its user count and five countries (no source / markets held), Max's 45-day trial (not 2.0's), the seat stepper on the card (seats are Plans' Review's), per-row info tips (the comparison has no descriptions), analytics |
| "in 2.0's names and saying only what 2.0 does (S35's rule; the Pro features are `lib/credits/features.ts`)" | **built** | AI credits (never tokens), the Meeting Copilot, the client portal; Pro's list = the comparison rows Free lacks (the seven locks). **The shared comparison was wrong for 2.0** (purchase orders, Xero / MYOB / Zoho, webhooks, task templates, invoice paper, "Powered by OpenMaison" held back on plans that have them; Free "1 seat") — corrected at its one source, so Plans inside the app says the same (REG-S46D.9); "Meeting Co-Pilot" → "Meeting Copilot" across the credits area (REG-S46D.10) |
| "*Pricing* in the site header and footer" | **built** | the bar's links (first, plg's order), the footer's Platform column; on a phone the Platform sheet's *See pricing* (the bottom bar has no room) |
| "*See pricing* where plg had it (home, the platform hub, module pages)" | **built** | Home's closing band, the hub's closing band, every module page's hero — the ghost button beside the call, in *Talk to us*'s place (plg's swap) |
| "Each plan's button → `/sign-up?plan=<key>`" | **built** | Free `?plan=free`, Pro `?plan=pro_freelance|pro_studio&period=monthly|yearly`; **Max → Talk to us → the site's Book a demo** (Max is priced with the team; plg sent it to Contact; `/sign-up?plan=max` still works) |
| "sign-up carries the plan so that, once the studio is made, the Plans dialog opens on that plan … Free needs no dialog" | **built** | `lib/credits/plan-intent.ts`; sign-up (Freelance starts on "I work on my own"; the details step says where the plan went) lands with the keys, the front door forwards them, `CreditsHost` opens Plans on the plan / period / seats and tidies the address; the welcome waits until Plans closes |
| "`/upgrade?plan=<key>` honours the plan the same way" | **built** | next.config's redirect keeps the query → Plan & billing → Plans on it (`max`: Talk to us over Plans; `pro`: the plan that fits the team) |
| "Change the `/pricing` and `/site/pricing` rows in `lib/links/old-addresses.ts`" | **built** | `/pricing → /site/pricing`; the `/site/pricing → /site` row removed (it is the page) |
| "SEO: sitemap entry, canonical (`lib/site/seo.ts`), `public/llms.txt`" | **built** | `sitePages` (0.8, monthly), `siteMetadata` canonical + card `pricing` (`lib/site/card.tsx`), BreadcrumbList, `llms.txt` (Key pages + the pricing sentence, no figures so it can't drift) |
| "Note in your register row that S35's 'kept hidden' was read from deployment/qanvast, and plg's live page is the reason" | **built** | REG-S46D.6 |
| GHOSTS "the site has its own loading pattern — follow it" | **built** | `PricingGhost` (`components/site/site-ghosts.tsx`): the hero in its own words, the period switch, the three cards — the probe's slow hop lands the heading within 0 px at 1440 and 390 touch. No studio page's first screen changed (Files gains a menu row; sign-up's first step is the same) |

## Decisions taken (as recommended — his "fix everything" 2026-10-19)

1. **A copy, unless the file is already in Contract & VOs.** The contract's PDF lives where every contract's does (the editor, the import dialog
   and the client portal's kinds all say "Files › Contract & VOs"); the original stays free to move, rename or delete, and the PDF the client
   signs never changes under them. A file already there is used as it is — no duplicate.
2. **Land in the editor, not straight in Send.** The quote's *Send for signature* opens the contract's editor; one door, one landing. Send is
   the editor's filled button.
3. **The PDF a contract keeps refuses a second contract** ("Already in Contracts as …") rather than opening it — the row stays findable, the
   reason names where it is.
4. **Pictures: refused in the row** (the prompt's rule; no library). Videos, folders and money papers get no row.
5. **The comparison is corrected at its one source**, so Plans and the website say the same true thing (B-25's rule).
6. **Max's button is Book a demo**, not sign-up — a visitor talks to the team without making a studio first.
7. **The plan rides in the address** (`?plan=&period=&seats=`), read by the credits host on any studio page — so it works wherever sign-up
   lands (the front door, the leads a trial brought, the AI Visualizer), and 1.0's `/upgrade?plan=` needs nothing of its own.

## Found and fixed on the way

- **The signing pages' notice ran edge to edge on a phone** (alone on a page — a link no longer active, 1.0's old links): it keeps the 16 px
  gutter now (REG-S46D.5).
- **Server-drawn ghosts lost their pictures' shape** — a `Bone`'s `style={{ height: undefined }}` is dropped crossing to the client, so the
  site's module picture, an article's cover and the Visualizer trial's tiles drew 16 px bars; now `height: 'auto'` (REG-S46D.13). Pricing's
  card bones read their height through `--ghost-plan-h` for the same reason.
- **Playfair's old-style 0 read as an "o"** in "S$0" — the price takes lining figures.
- **The shared comparison and Plans said things 2.0 doesn't do** — corrected at the source (REG-S46D.9); the credits area's "Co-Pilot"
  (REG-S46D.10).

## Found in 1.0, not on a card

- 1.0's file-signing chip on each signable file (Awaiting signature · Viewed · Signed · Expired · Cancelled) and its ⋯ (Copy link · Extend 7 days
  · Resend · Cancel · Download signed): in 2.0 the file becomes a contract and those live on its row in Contracts (Copy Link, Send a reminder —
  which opens the window again —, Stop the signing link, Signed copy). Files says which contract keeps a PDF in the ⋮ only — **for Vicky**:
  a status chip on the file's tile would be new UI.
- 1.0's portal "Documents to sign" (a homeowner signing in the portal with no second code): 2.0's portal has no signing of its own — the
  signing link is the one way. **For Vicky / the portal's next round.**
- plg's "Need help choosing? Book a 15-min call" band: folded into the closing band's Book a demo (2.0's Calendly is 30 minutes).

## What to check in the browser

- **Dane (Owner), 1440:** Kevin Ng › Files — put a PDF there (Upload) → its ⋮ → *Send for signature* → Import a contract with the file in it →
  Import → the editor → Send → Send via WhatsApp → Close → back on Files; the copy in Contract & VOs now says "Already in Contracts as …";
  a photo's ⋮ (and the viewer's ⋮) says "Save it as a PDF first". **390 touch:** the same row in the file's sheet; the
  dialog as a sheet.
- **Germaine** on Benjamin Han's project › Files: the row on *Site measurements.pdf*. **Priya** there: Open · Download only. **Nurul**: no row.
- `/sign/document/<any uuid>` → "This link is no longer active" (390: the gutter); a contract's `sign_token` set to a uuid → its signing page.
- **Signed out:** `/pricing` → `/site/pricing`; Monthly / Annual; Freelance / Studio; Compare every feature; the questions; Talk to us →
  Book a demo; the bar's Pricing, the footer's, Home's / the hub's / a module page's *See pricing*; 390 the Platform sheet's *See pricing*
  and the comparison's rows naming their plans; 320 no sideways scroll.
- **Signed out:** Pricing › Pro › Studio › *Start 14-day free trial* → sign-up (the plan line) → a studio → its Dashboard opens Plans on Pro —
  Studio; close it → the welcome. (Studio menu › Demo Studio to come back; Reset clears it.)
- **Dane:** `/upgrade?plan=pro_studio&period=yearly&seats=5` → Plan & billing with Plans on Studio, annual, five seats; `/upgrade?plan=max`
  → Talk to us about Max; Plans › Compare everything — purchase orders and Xero on every plan, the Meeting Copilot, Free "Any number of members".

## Probes run (lane E, :3185, each on a fresh copy of `pbuild/base.db` migrated + repaired)

| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s46d.cjs` (this step) | **72 / 72** — the scratch DB put back as found (every table hashed before and after), no studio left beside it, no page errors |
| `pending-modules/verify-pm2-s35.cjs` (the site; `/pricing` row a deliberate change, commented) · `s36` (the Visualizer trial — its ghost) | **137 / 137** (one pair fewer: `/site/pricing → /site` is gone) · **109 / 109** |
| `pending-modules/verify-pm2-s31.cjs` (sign-up) · `s08` (the first-visit welcome) · `s19` (plans, Plans' table) · `s41b4` (the nudges) · `s41b2` (old addresses) | **104 / 104** · **70 / 70** · **116 / 116** · **82 / 82** · **206 / 206** |
| `pending-modules/verify-pm2-s03.cjs` (signing links, kept PDFs) · `contracts-parity/verify-ct-r1…r4.cjs` (through the regression runner) | **79 / 79** · **36 · 24 · 28 · 29** — all pass |
| Files: `ux-build-2026-09-30/P3/verify-p3.cjs` · `projects/verify-pj-gap-e.cjs` · `folders/verify-folders-files.cjs` · `pending-modules/verify-pm2-s05` · `s06` (Accounting's Files menu is Open · Download) · `s28` (Make a 3D picture) · `s45c` (Marketing's Files menu) | **91** · **55 / 55** · **16** · **114 / 114** · **83 / 83** · **98 / 98** · **120 / 120** — all pass |
| `ai-credits/verify-cr-r1.cjs` (Plans' Compare everything) | **59** — all pass |
| `npm run design:anatomy` (`next start` on a scratch copy) | **89 pages, 315 table heads, 26 dialogs, 41 page menus — all 1,941 measures hold** |
| `tsc --noEmit` · `eslint` (the changed areas) · `design:lint` · `next build` (under the lock, `DATABASE_URL=file:<scratch>`) | clean · 0 errors (the 7 warnings are older lines in the contract editor, preview and signing page) · nothing new breaks a house rule · exit 0 |

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins; every exception written down** — no mock for any of it: the house dialog, menu row and the site's own pieces; every word not
   1.0's is in REG-S46D.1…13 as invented copy.
2. **One system, no one-offs** — `ImportContractDialog` (one prop), `DropdownItem` (help / disabled + reason), `LinkGone`, the site's `Section` ·
   `Container` · `Display` · `ButtonLink` · `ClosingCta` · `Tile` · `Reveal` · ghost kit, the DS `SegmentedButton` Plans uses, `CreditToken`;
   prices from the one source; `design:lint` holds.
3. **Plain words** — "Send for signature", "It goes out as a contract", "Save it as a PDF first", "AI credits per action".
4. **Nothing is lost** — the original file stays; a refused import writes nothing; 1.0's links already in chats land; 1.0's `/pricing` and
   `/upgrade?plan=` land with what they carried.
5. **Say why** — every refused row says why in it; the server's refusals name the rule.
6. **Back returns where you came from** — the editor's Close returns to the Files folder you were in; the plan's Plans closes back onto the
   page it opened over.
7. **Every screen is whole** — Pricing has its ghost (heading lands within 0 px), the old link its notice, the dialog its busy state.
8. **Every width is designed** — 1440 · 1024 · 768 (cards stack ≤1024) · 390 · 320 without sideways scroll; the comparison folds to rows that
   name their plans; the notice keeps the phone gutter.
9. **Tables follow the leads listing** — not applicable (the comparison is the site's presentation matrix, the hub's look, with table roles).
10. **Motion with purpose** — the site's reveals; the questions' chevron turns as an answer opens (no turn with reduced motion).
11. **Honest data** — every figure read from the plans and the price list; the comparison says only what 2.0 enforces; no demo records seeded.
12. **Reach for everyone** — role="table" with column and row headers; ✓ / — read "Included" / "Not included"; the questions are buttons with
    `aria-expanded`; a disabled menu row is `aria-disabled` with its reason in its text.
- **How to add a missing thing:** one home (Contracts keeps the signing — Files is a door; Pricing is the site's, Plans the app's); shown only
  when it applies (no row on videos, folders, money papers; Free needs no Plans); one filled button per card (Pro's); defaults need no set-up.

## Shared pieces changed

- `lib/credits/pricing-data.ts` (COMPARE's rows, the FAQ's numbers from the source, `buysFor` from the price list) — Plans shows it.
- `components/credits/plans-dialog.tsx` (`initial`; "Any number of members"; "Meeting Copilot" ×2), `credits-host.tsx` (`PlanIntentLanding`,
  `openOn`), `credits-client.ts` (`openPlansOn`, `usePlansOpen`, `holdRail` also tells), `lib/credits/schedule.ts` (the Copilot's label),
  `lib/credits/nudge-model.ts` (its word), `components/company/plan/usage-view.tsx` (its word).
- `components/shell/first-visit-welcome.tsx` (waits while Plans opens on a picked plan).
- `app/page.tsx` (the front door forwards the plan keys).
- `components/contracts/import-contract-dialog.tsx` (`kept`, `ImportPick`), `components/contracts/list/contracts-workspace.tsx` and
  `components/leads/contracts/lead-contracts.tsx` (the new pick type), `app/contracts/actions.ts` (`upload.fromFileId`), `lib/contracts/files.ts`.
- `lib/leads/files.ts` (`signs`, `contracts` / `contract`), `lib/leads/file-model.ts` (`FILES_READ_RULE`), `app/leads/files-actions.ts` (reads it).
- `components/contracts/sign/signing-page.module.css` (the notice's phone gutter).
- `components/visualizer/trial/trial-ghost.tsx` (two bones' `height: 'auto'`, REG-S46D.13).
- `components/site/home.tsx` (`ClosingCta primary`, Home's See pricing), `platform-pages.tsx`, `site-shell.tsx` (+ `.module.css`),
  `site-footer.tsx`, `site-ghosts.tsx` (+ `.module.css`), `lib/site/{model,seo,card}.ts`, `public/llms.txt`, `lib/links/old-addresses.ts` (the
  two pricing rows only).
- `design-source/verify/pending-modules/verify-pm2-s35.cjs` — `/pricing → /site/pricing` (a deliberate change of this rule, commented).

## For other packages

- **S46A — `lib/links/old-addresses.ts`:** the `/sign/document/:token` row, `by: 'route'`, lands "the contract's signing page — a token
  nothing carries reads 'no longer active'" (`app/sign/document/[token]`). This lane changed only the two pricing rows and SITE's comment.
- **S46A — `proxy.ts`:** a signed-in browser sent to `/sign-up` (proxy's already-signed-in branch) goes to `/` and drops the query. To carry a
  plan picked on the website, keep `plan · period · seats` on that redirect when the path is `/sign-up` (e.g. `'/' + '?' +` those keys) —
  `app/page.tsx` then forwards them to the front door and Plans opens. Until then a signed-in visitor lands home without Plans opening.
- **S46A — ⌘K:** "pricing", "plans", "upgrade" could find Company › Plan & AI credits (Plans is there); the website's Pricing is the site's.
- **The orchestrator:** FROM-1.0-TO-2.0.md §9 #3 is settled (REG-S46D.1 · .4; map 08 §1's row); §3's Pricing line → `/site/pricing`.
