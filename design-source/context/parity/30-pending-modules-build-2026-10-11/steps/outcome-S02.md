# S02 · Client links — outcome (2026-10-11)

Cards: `public:client-links-no-login`, `api:link-previews`, `api:portal-loose-ends`. 1.0 read: `src/app/api/og/route.tsx` + `card-assets.ts`
(the 1200×630 card), `src/app/quote-preview/[token]/page.tsx` + `src/app/api/quote-preview/[token]/route.ts` (the live read-only quote),
`src/app/api/quotes/[id]/share-link/route.ts` (one `preview_token` per quote, idempotent, Regenerate rotates it), `src/components/leads/quote-digitizer-dialog.tsx`
(*Share live preview*), `src/app/api/quote/[token]/*` (the OTP link on the same token), `src/app/pay/**`, `src/app/my/[studioSlug]/p/[portalToken]/page.tsx`,
`src/app/my/engagement/[linkId]`, `src/app/api/homeowner-links/share-render/route.ts` + `src/app/(main)/projects/[projectId]/page.tsx:1134–1204`
(Files' *Show to homeowner* on a render), `src/app/api/project-aggregates/quote-line-count/route.ts` + `src/components/projects/financial-summary-card.tsx`
(“From signed quote · n line items”), the token formats (invoice `share_token` 16 hex, quote `preview_token` 48 hex).
Register rows: `steps/reg-S02.md` (REG-S02.1…9). Probe: `design-source/verify/pending-modules/verify-pm2-s02.cjs` (**105 / 105**); shots banked in
`design-source/verify/pending-modules/pm2-s02/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| client-links · old 1.0 links have nowhere to land (D-11) | **Built**, as recommended ("redirect each to its new page"): `/pay/<t>` → the portal; `/pay/inv/<t>` → `/invoice/<t>` (else the portal's Money); `/pay/receipt/<t>` → `/receipt/<t>` (else Money); `/my/<slug>/p/<t>` → the portal; `/my/login` → sign-in; `/my/projects/<id>` · `/my/engagement/<id>` · `/my/<slug>/projects/<id>` → Home; `/my/<slug>/team` → About; `/quote-preview/<t>` → `/quote/<t>`; `/floor-plan/view/<t>` → `/space/<t>`; `/sign/quote-xray/<t>` → the studio's notice | `lib/links/old-links.ts` (the table in its header), `app/pay/**`, `app/my/{login,projects,engagement}/**`, `app/my/[slug]/{p,projects,team}/**`, `app/quote-preview/**`, `app/floor-plan/view/**`, `app/sign/quote-xray/**` |
| client-links · a read-only "have a look" quote link (1.0 `/quote-preview`) | **Built** — ⋮ › Share a view-only link in the quote editor; `/quote/<token>` (live, view only, nothing to confirm); Stop + Undo; the approver's rule; no row on a variation order | `app/quote/**`, `components/quotes/view/quote-view-page.tsx`, `components/quotes/send/view-link.tsx` (+ css), `components/quotes/confirm/quote-stage.tsx` (the stage, now shared with the confirmation page), `lib/quotes/view-link.ts` (pure) · `view-link-queries.ts` (server), `app/quotes/view-link-actions.ts`, `components/quotes/editor/{editor-header,quote-editor}.tsx`, `lib/quotes/activity.ts`, `lib/leads/activity.ts` (region S02) |
| client-links · a real SMS code before a link opens | **Stand-in, kept** — developers' work (the card's own call). Nothing new claims a code: the view-only link opens on its token as 1.0's `/quote-preview` did (1.0's `/quote/<token>` put an OTP in front, but its generator was never mounted); the portal still takes any six digits | — |
| client-links · a picture card when pasted into WhatsApp | **Built** on every client link (next row) | — |
| client-links · the meeting brief `/copilot/share` · the X-Ray link | **Kept** — the brief comes with Meetings (S23, REG-552); X-Ray has no client link (Q-24) — 1.0's old X-Ray address now lands on the studio's notice | `app/sign/quote-xray/[token]/page.tsx` |
| link-previews · a preview card on /sign, /sign/bundle, /confirm, /invoice, /receipt, /po, /my, /space, /f | **Built** — the studio's card (logo · name · what the link holds · for whom), the studio as the site's name, absolute titles (no "· OpenMaison" reaches a client tab), noindex; one image route; the closed and "Not ready yet" cards | `lib/link-cards/{model,queries,meta,origin,bots,html,card-image}.ts(x)` + `fonts/`, `app/card/[kind]/[key]/route.ts`, the generateMetadata of `app/sign/[id]/(sign)` · `sign/[id]/quote` · `sign/bundle/[id]` · `confirm/[quoteId]` · `invoice` · `receipt` · `po` · `space` · `my/[slug]/(home)` · `my/[slug]/login`, `app/f/[token]/route.ts`, `app/renders/[token]/page.tsx` (shares the origin helper) |
| link-previews · 1.0's card said "OpenMaison" | **Fixed in 2.0** — every word on the card and in the tags is the studio's | — |
| (found) a chat's preview fetch stamped Viewed | **Fixed** — WhatsApp draws the card on the sender's phone as the link is pasted; `/sign`, `/sign/bundle` and `/po` stamped Viewed on that fetch. The stamp now waits for a person (`fetchedForPreview`) | `lib/link-cards/bots.ts`, the three pages |
| portal-loose-ends · a render file's Show to client → the portal's Designs (H-82…H-84) | **Built** — idempotent, Stop showing stops the file's own link only, showing again reopens it (the client's marks kept — 1.0 dropped them) | `lib/portal/render-files.ts`, `app/portal/studio-actions.ts` (`setFilesShown` → `{ changed, designs }`), `lib/visualizer/share-build.ts` (one snapshot builder; `createShareLink` reads it too), `components/leads/files/{lead-files,file-viewer}.tsx`, `lib/portal/model.ts` (`shownLine`), `lib/visualizer/queries.ts` (`ShareRow.fromFiles`), `components/visualizer/editor/dialogs/share-dialog.tsx`, `lib/leads/activity.ts` |
| portal-loose-ends · the line count on "From the signed quote" (MI-014) | **Built** — the Overview's Money card and Money's Contract value tile | `lib/projects/money-queries.ts` (`signedQuoteLines`), `lib/projects/money.ts` (`linesWord`), `lib/projects/queries.ts`, `components/projects/overview/money-card.tsx`, `components/projects/money/project-money.tsx` |
| portal-loose-ends · a redirect for 1.0's `/my/[slug]/p/[token]` | **Built** (first row) | — |
| portal-loose-ends · the dead chat-history code | **Removed** — the unmounted Invite to Portal modal (+ css), `invitePortal`, `PortalLink.chatHistoryVisible`, the placeholder `PORTAL_LINK`; the column stays (additive), unwritten | `app/leads/portal-actions.ts`, `lib/leads/portal.ts`, `components/leads/questionnaire/ask-client-dialog.tsx` |
| (found) the confirmation page's "View as printed" ran 72px off a phone; its ghost's card ran 80px right at 1440 | **Fixed** on the shared stage and ghost | `components/quotes/confirm/{confirm-page.module.css,confirm-skeleton.tsx}` |

## Files
New: `lib/link-cards/{model,bots,origin,queries,meta,html}.ts` · `card-image.tsx` · `fonts/{Inter-Regular,Inter-SemiBold}.ttf` + `README.txt`,
`app/card/[kind]/[key]/route.ts`, `lib/quotes/{view-link,view-link-queries}.ts`, `app/quotes/view-link-actions.ts`, `app/quote/{layout.tsx,[token]/page.tsx,[token]/loading.tsx}`,
`components/quotes/view/quote-view-page.tsx`, `components/quotes/send/view-link.tsx`, `components/quotes/confirm/quote-stage.tsx`, `lib/portal/render-files.ts`,
`lib/visualizer/share-build.ts`, `lib/links/old-links.ts`, the old-link pages (`app/pay/**`, `app/my/{login,projects,engagement}/**`, `app/my/[slug]/{p,projects,team}/**`,
`app/quote-preview/**`, `app/floor-plan/view/**`, `app/sign/quote-xray/**`), `drizzle/0086_client_links.sql` (+ meta), the probe and `pm2-s02/` (16 shots).
Changed: `lib/db/schema.ts`, the client pages' metadata (named above), `app/f/[token]/route.ts`, `app/renders/[token]/page.tsx`, `app/po/[token]/page.tsx`,
`components/quotes/confirm/{confirm-page.tsx,confirm-page.module.css,confirm-skeleton.tsx}`, `components/quotes/editor/{editor-header,quote-editor}.tsx`,
`components/quotes/send/quote-send.module.css`, `lib/quotes/activity.ts`, `lib/leads/activity.ts`, `app/portal/studio-actions.ts`, `lib/portal/model.ts`,
`components/leads/files/{lead-files,file-viewer}.tsx`, `app/visualizer/actions.ts`, `lib/visualizer/queries.ts`, `components/visualizer/editor/dialogs/share-dialog.tsx`,
`lib/projects/{money,money-queries,queries}.ts`, `components/projects/{overview/money-card,money/project-money}.tsx`, `app/leads/portal-actions.ts`, `lib/leads/portal.ts`,
`components/leads/questionnaire/ask-client-dialog.tsx`, `scripts/repair-demo-data.ts` (R104). Removed: `components/leads/return/invite-portal-modal.tsx` (+ css).
For CLAUDE.md's Map (the orchestrator's): the `invitePortal` named in *Parity round 3* is gone; the Client access panel's `inviteClient` is the invite.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **The card carries the studio's name and logo** (link-previews' question), the `/renders` way; never the platform's. Drawn in Inter (Latin subset, OFL).
- **A read-only "just look" link is wanted** (client-links' question) — built as 1.0 had it, from the quote editor's ⋮ (the quote's one home), never
  through Send (a look is not a send: the status never moves). Live like 1.0 (an ask every 10 s while the page is in front). Ungated like 1.0's
  `/quote-preview` — the token is the permission, as on every 2.0 client link. **A client sees only an approved quote** (2.0's approval rule, REG-624):
  with quote approval on (the demo's default) no link is made before approval, and a link made earlier reads *Not ready yet* while a revision waits.
- **Through a revision the link stays, the content waits**: Revise starts version n+1 as a Draft; with approval on, the page says *Not ready yet*
  until it is approved again (no unapproved edit reaches the client), then shows it live; a studio that does not review quotes shows the draft
  live, as 1.0's preview did.
- **D-11: each old link to its new page** — the very record when 2.0 holds 1.0's token (the port's job: `share_token`s, `preview_token` → `view_token`,
  the 3-D share token, `portal_token`), else the place that kind of thing lives for the client (the portal, sign-in first).
- **Show to homeowner keeps the client's marks** on a hide and re-show (1.0 dropped them, "accepted") — 2.0's nothing-is-lost.

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** open OM-10007 (Serena Koh) › ⋮ › *Share a view-only link* → the dialog; *Copy link*; *Send via WhatsApp* (WhatsApp
  opens on the press); open the copied `/quote/<token>` in a private window — the quote, *View only*, *Last changed*, *Message Germaine*; edit the
  quote's title in the editor and watch the open page follow within ~10 s; ⋮ › Share again › *Stop the link* → the open page turns into the notice;
  Undo brings it back. A variation order's ⋮ has no such row.
- **Germaine (Designer):** OM-10001 (a Draft) › ⋮ — the row rests: "It needs an approver’s OK first — send it for approval"; as Dane, "Approve it
  first — the client sees a quote once it’s approved". Revise OM-10007 with its link open: the client's page turns to *Not ready yet*.
- **Files:** Kevin Ng › Files › a render (e.g. *Render - Living room - V3.jpg*) › ⋮ › Show to client → "…— it’s on their Designs too"; sign in to
  `/my/demo-studio` as Kevin (9688 2109, any six digits) › Designs. (With the demo, all three renders are already on the Visualizer's share, so the
  sentence says so and nothing new is made — stop that share in the Visualizer first to see a link of its own made.)
- **Money:** P-2026-001 Overview › Money: "From the signed quote · 19 lines"; as Michelle on P-2026-003 › Money: the Contract value tile's line.
- **Cards:** `/card/confirm/<quote id>`, `/card/portal/demo-studio`, `/card/sign/<contract id>` show the pictures; any client link's page source
  carries `og:*` tags with the studio's name. **390:** the view-only link reads as cards with *View as printed*; the share dialog is a bottom sheet.
- **Old links:** `/pay/inv/<an invoice's token>`, `/my/login`, `/quote-preview/<token>`, `/floor-plan/view/<token>`.

## Probes run (each on its own fresh copy of the repaired base — `pbuild/base.db` + migrate + repair — with `next start -p 3160`; stopped after)
| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s02.cjs`** (this step) | **105 / 105** — and the scratch DB left as found (a table-by-table dump before and after: no difference, beyond the app's own lazy "this month's AI credits" bell rows a first page open writes) |
| `ai-visualizer/verify-viz-client.cjs` · `verify-viz-studio.cjs` (the share builder moved into `share-build.ts`) | 30 / 30 · 37 / 37 |
| `contracts-parity/verify-ct-r1…r4.cjs` (the signing pages' Viewed stamp, tags) | 36 / 36 · 24 / 24 · 28 / 28 · 29 / 29 |
| `quote-editor-parity/verify-qe-r2…r4.cjs` (the editor's ⋮, Copy confirmation link, the confirmation page) | 33 / 33 · 21 / 21 · 14 / 14 |
| `ui-sweep/verify-sw-r1.cjs` | 34 / 34 |
| `uat-dane-2026-10-01/P6/verify-p6.cjs` (Copy confirmation link, snackbars) | 41 / 41 |
| `ux-build-2026-09-30/P4/verify-p4.cjs` (the confirmation page's reading cards and View as printed — the shared stage) | 56 / 56 |
| `ux-build-2026-09-30/P7/verify-p7.cjs` (the Visualizer's client notes, Share) | 94 / 94 |
| `projects/verify-pj-r1.cjs` (Money: "From the signed quote") · `verify-pj-r5.cjs` (the Contract value tile, VOs on the confirmation page) | 98 / 98 · 91 / 91 |
| `projects/verify-pj-r4a.cjs` (Show to client, the portal sign-in, the address) · `verify-pj-r9.cjs` (the portal's Designs) | 73 / 73 · 66 / 66 |
| `projects/verify-pj-fix-F.cjs` (the portal's deep links and sign-in) · `verify-pj-gap-d.cjs` (designs kept, the VO decline on its link) | 44 / 44 · 65 / 65 |
| `parity-map-build/verify-pm-f.cjs` (the portal, the renders link's pins, client_signed) | 60 / 60 |

`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 9 warnings are older files') · `npm run design:lint` nothing new · `npx next build` green.

## Migration and repair
- **Migration 0086 `client_links`** (additive): `quotes.view_token` (unique index) · `view_token_at` · `view_token_by`; `render_share_links.file_id`
  (+ index). No new table — the baseline lists are unchanged.
- **Repair R104** — keeps a ported or tester-made copy honest: a view token on a variation order, or without its time, is cleared; a Files-made
  render link live while its file is not shown (or on another lead) is stopped. Two checks in the closing list. On the demo: "every client link
  already in step"; full repair: all checks pass.

## For the next steps
- **S03 (contracts):** 1.0's `/sign/<token>` links land on 2.0's `/sign/<id>` today only when the id is the token — the signing link's own token
  (S03) should accept 1.0's tokens (a port column), and its Viewed stamp already ignores chat fetchers (`fetchedForPreview`). The card for `/sign`
  reads `fetchSigning` — a token there changes `linkCard('sign', key)` only in its loader.
- **S04 (quotes):** the confirmation link still keys on the quote's id (`/confirm/<id>`) — its token (S04) can reuse `isViewToken` / the
  `view_token` shape and `linkCard('confirm', …)`. *Viewed on the quote link*: 1.0 counted views on `/quote/<token>` (`preview_view_count`) — the
  view-only link is that address; a stamp would sit in `readQuoteViewStamp` / the page's first ask, never in a chat fetch. **The confirmation page
  still sends each line's full record to the client's browser** (cost, mark-up, rebate, vendor, the quote's id) — the view-only link sends only the
  print's fields (`clientSafe` in `lib/quotes/view-link-queries.ts`); the same projection fits `/confirm` and `/sign/<id>/quote`. A sent quote's
  snapshot at send (S01's note) applies to the view-only link too — it is live by design (1.0's), it shows the quote as it stands.
- **S13 (portal):** an unknown portal address in an old link falls to the studio's portal (the prototype holds one studio) — a second studio would
  need the slug's own notice there (`lib/links/old-links.ts` `portalOf`).
- **S23 (Meetings):** `/copilot/share/<id>` has no landing yet — add it with the brief (a `linkCard` kind is one switch case + its loader).
- **Developers:** the card route is uncached on our side (`Cache-Control: public, max-age=300`); a real CDN may cache by URL. The preview-fetcher
  list (`lib/link-cards/bots.ts`) names fetchers only.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock for any of it; the view-only page is the confirmation page's shell, the dialog is Send for
   confirmation's, the card is the studio's letterhead; every invented word is in REG-S02.1…9.
2. **One system, no one-offs** — house pieces only (SendContractDialog, LinkGone / LinkNotice, MetaChip, Button, the snackbar with Undo,
   DropdownItem's row rule, ConfirmSkeleton); the stage is now one piece for both quote links (`QuoteStage`), the share snapshot one builder for the
   Visualizer and Files; tokens only in CSS — `design:lint` holds. The card picture is drawn with inline styles in `lib/` (next/og reads nothing
   else) on the studio's brand kit colours — said in its header.
3. **Plain words** — "Share a view-only link", "View only", "Last changed 5 minutes ago", "Stop the link", "it’s on their Designs too".
4. **Nothing is lost** — Stop answers with Undo (the same address back); Stop showing a render keeps the client's marks for the next show; a page
   left open turns into the notice, never an error; old links land somewhere.
5. **Say why** — the refused row says the approver rule in the row; a stopped link says so in the studio's name; the server refuses with
   `{ error }` in the rule's words (Accounting, a variation order, a lead returned).
6. **Back returns where you came from** — client pages have no Back (as every client link); the studio's flows stay in the editor (the dialog).
7. **Every screen is whole** — `/quote/<token>` has its layout (snackbar host), `loading.tsx` (its ghost, card placed as the page's — probe), the
   gone notice, an error falls to the root's RouteError; the card route answers 404 for a kind that is no link.
8. **Every width is designed** — 1440 · 390 · 320 checked: the view page reads as cards on a phone, *View as printed* fits (the confirmation page's
   72px overflow fixed on the same stage), the dialog is a bottom sheet; no sideways scroll against `screen.width`.
9. **Tables follow the leads listing** — not applicable (no table).
10. **Motion with purpose** — none added; the house dialog / sheet / snackbar timings.
11. **Honest data** — every state from its record (`view_token*`, `render_share_links.file_id`, the Activity events); R104 keeps them consistent;
    no seeded link; the SMS code stays an honest stand-in; a chat's fetch never fakes a Viewed.
12. **Reach for everyone** — the kebab row is a menuitem in the arrow walk (a refused one stays focusable with its reason); the page's buttons have
    names; the card picture has alt text in its tags; the "View only" tag and the notice are text, not colour.
- **How to add a missing thing** — one home (the quote's ⋮ for the view link; Files' own Show to client; Money's own lines; the pages' own tags);
  shown only when it applies (no row on a variation order, Stop only while a link lives, the count only with a signed quote); one filled button
  (the dialog's Send via WhatsApp; the client's card has none — nothing to do there); no set-up needed (the demo works as it is; nothing is on
  until someone shares).
