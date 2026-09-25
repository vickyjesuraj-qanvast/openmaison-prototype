# OpenMaison 1.0 — Price book inventory · Slice C: everything around the price book

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25. Nothing was run; git history was read with `git log` / `git show` only; no database, server or login was touched.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader, only named here: **A** = the screens (the manager and its four tabs, the item editor, the CSV / AI import dialog, the history drawer, the pickers inside a quote); **B** = the engine (pricing maths, tiers, the matcher / suggester, the parser helpers, drift maths); **D** = the data model (columns, JSON, migrations); **E** = 2.0 today. Earlier audits cited, not repeated: "AS D-nn" = `../accounts-setup-1.0-inventory/D-data-model.md`; "QE D-nn" = `../quote-editor-1.0-inventory/D-data-model.md`; "XR C-nn" = `../quote-x-ray-1.0-inventory/C-around-the-xray.md`.

Abbreviations: `PB` = `src/app/api/studio-config/price-book/route.ts`; `PBI` = `src/app/api/studio-config/price-book/[id]/route.ts`; `REORDER` = `src/app/api/studio-config/price-book/reorder/route.ts`; `MARKUP` = `src/app/api/studio-config/price-book/vendor-markup/route.ts`; `TIERS` = `src/app/api/studio-config/pricing-tiers/route.ts`; `HIST` = `src/app/api/studio-config/price-book-history/route.ts`; `RATES` = `src/app/api/studio-config/platform-market-rates/route.ts`; `DEL` = `src/app/api/price-book/[id]/route.ts`; `APPROVE` = `src/app/api/price-book/[id]/approve/route.ts`; `REJECT` = `src/app/api/price-book/[id]/reject/route.ts`; `NOTIFY` = `src/app/api/price-book/notify-pending/route.ts`; `IMPORT` = `src/app/api/price-book/import/route.ts`; `QIMPORT` = `src/app/api/quotes/import/route.ts`; `EXPORT` = `src/app/api/price-book/export/route.ts`; `PARSE` = `src/app/api/price-book/parse/route.ts`; `IMG` = `src/app/api/price-book/upload-image/route.ts`; `SPEND` = `src/app/api/price-book/suggestions/pending/route.ts`; `SCAN` = `src/app/api/price-book/suggestions/scan/route.ts`; `BULK` = `src/app/api/price-book/suggestions/bulk/route.ts`; `DRIFT` = `src/app/api/cron/price-drift/route.ts`; `AGG` = `src/app/api/cron/aggregate-rates/route.ts`; `CROWD` = `src/lib/crowd-rate-collector.ts`; `PBM` = `src/components/accounts/price-book-manager.tsx`; `PBE` = `src/components/accounts/price-book-item-editor.tsx`; `PEND` = `src/components/price-book/pending-tab.tsx`; `DTAB` = `src/components/price-book/drift-tab.tsx`; `SC` = `src/lib/queries/studio-config.ts`; `AC` = `src/lib/access-control.ts`; `ACC` = `src/app/(main)/accounts/page.tsx`; `QDD` = `src/components/leads/quote-digitizer-dialog.tsx`; `NIM` = `src/components/leads/new-items-suggestion-modal.tsx`; `TASKS` = `src/app/(main)/tasks/page.tsx`; `EV` = `src/lib/notifications/events.ts`; `DISP` = `src/lib/notifications/dispatch.ts`; `RR` = `src/lib/notifications/resolve-recipients.ts`; `PRICING` = `src/lib/notifications/templates/base/pricing.ts`; `RE` = `src/components/accounts/role-editor.tsx`; `MOP` = `src/components/accounts/member-override-panel.tsx`; `EXE` = `src/lib/quote-agent/executors.ts`; `M226` / `M223` / `M264` etc. = `scripts/migrations/<n>_*.sql`.

## Vocabulary

- **Item** — one `studio_price_book` row (columns: QE D-09). **Tiers** = `price_book_pricing_tiers` (QE D-10); **history** = `price_book_history` (QE D-11); **suggestion** = `price_book_suggestions` (QE D-12).
- **Session** — the `qanvast_session` cookie verified to `{ userId, studioId }` — no role, no expiry in the payload, no membership re-check (AS D-30). **Scoped client** — `scopedSupabase(studioId)`: a server-minted JWT with `role: authenticated` + `studio_id`, filtered by RLS (`src/lib/supabase-scoped.ts:6-38`). **Service role** — `createServerSupabase()`, the `SUPABASE_SERVICE_ROLE_KEY` client that bypasses RLS (`src/lib/supabase-server.ts:9-15`).
- **Edit gate** — `resolveCanPerformAction(role row, tags, "pricebook", "edit")`, the role row picked by `TAG_PRIORITY = owner > admin > accounting > id` (PB:26, 156-166).
- **Trusted actor** — a member whose **tags** include `owner` or `admin` (`isTrustedActor`, PB:28-30; PBI:22-24; BULK:73). Trust decides approved vs pending; it is not the edit gate (C-35).
- **Pending / approved / rejected** — `approval_status` (migration 114; QE D-09). **Approval task** — a `tasks` row with `type = 'PriceBookItemApproval'`, `related_entity_id` = the item id (PB:236-241).
- **Configured approver** — `studios.settings.workflow.approvers.priceBookApproval[0]`, set on Accounts › Workflow Rules (C-41).
- **Market rates** — the platform table `platform_market_rates`; **crowd signals** — `crowd_rate_signals`; **drift** — an active item priced more than ±15 % outside its fuzzy-matched market range (DRIFT:11, 85).
- **Fork** — a separate deployment + Supabase project per tenant (`scripts/fleet/registry.mjs:66`); many forks hold one studio (e.g. Dyel, `scripts/cleanup/002_dyel_purge_test_demo_data.sql:3-4`).

---

## Timeline and surfaces

### C-01 · Timeline, 2026-03-27 → 2026-09-17
- **Where:** `git log` on `M090` (`fde67efc9`, 2026-03-27); `DRIFT`, `CROWD`, `EXPORT`, `IMG` (`8b4dcaf95` "quote_mrc", 2026-04-16); `M109` (`9e5591c17`, 2026-05-01); `M112_seed_pricing_preferences` (`e82055ff7`, 2026-05-01); `M125` (`3b911d813`, 2026-05-07); TC-2.2 (`ac2cb2f50`, 2026-05-07); `M111`–`M115`, `APPROVE`, `SCAN` (`8ab8f8b31`, 2026-05-09); `M135` (`b4982fbe5`, 2026-05-13); the accounts-page merge (`daa49719a`, 2026-05-15); `PARSE` (`4dfb68e6d`, 2026-05-18); tabs, `PEND`, `DEL`, `M160`, drift workspace (`3d7204f76`, `81dcc3687`, `8304558f3`, `b4c5043cc`, `9544f2335`, all 2026-05-20); scoped routes + `M223` (`9fd67bb1e`, 2026-06-22); `M226` (`ae65a3641`, 2026-06-23); the cron edge fix (`497142e90`, 2026-06-30); `M264` (`6d82abf92`, 2026-07-22); `M288` / `M289` (`4149398e7`, 2026-08-21); the pricing triangle (`de4d797e4`, 2026-09-16); vendor management + `M313` (`81a5ac6c3`, `25bf2e00c`, 2026-09-17).
- **Does:** 2026-03-27 — the table, categories and a CSV import route (`QIMPORT`). 2026-04-16 — "Price Book v2/v3": cost, markup, market rates, tiers, crowd signals, the monthly drift and aggregate crons, export, image upload. 2026-05-01 → 05-09 — system roles with `pricebook.{view,edit}`, the pricing notification category, `/accounts` opened to designers and accountants for a read-only price book, the approval workflow (114), suggestions (115), images bucket, SKU. 2026-05-15 — a merge drops the price-book-only filter on `/accounts` (C-37). 2026-05-18 → 05-20 — AI parse, vendor auto-create, the four-tab workspace, Pending, Drift, hard delete, the pinned-approver column (never used, C-41). 2026-06-22 → 06-23 — the browser stops querying the tables; RLS locks (C-29). 2026-06-30 — the drift and aggregate crons had been 401'd at the edge by the deny-by-default guard and are let through again (`src/proxy.ts:431-444`). 2026-07-22 — 264 revokes `authenticated` from `platform_market_rates`; the price book's own benchmark route is denied from then on (C-23). 2026-08-21 — embeddings for the AI Quote Drafter (C-55). 2026-09-17 — shared vendor picker, vendor merge re-points price-book vendors (C-61).
- **Data:** —

### C-02 · Every way in and out
- **Where:** `src/components/layout/topbar.tsx:492-510`; `ACC:100, 1143-1146`; `QDD:6688-6696`; `src/components/leads/price-book-modal.tsx:19-44`; `TASKS:503-515`; `DRIFT:117`; `APPROVE:103`; `REJECT:107`; `NOTIFY:84`; `PBM:498-517, 597-605, 620-631`; `NIM:180-187`; `src/components/copilot/meeting-brief.tsx:400-419, 977`; `PBE:1405-1425`; `ACC:1759-1778`.
- **Does:** **In** — the topbar profile menu's *"Accounts Setup"* (owners only) → Accounts › Quotes & Pricing › *"Price Book"* (`/accounts?tab=catalogue`); a typed URL; the quote editor's book icon, which opens the whole manager in a modal (only for members passing the edit gate); a Tasks row's *"Open in Price Book"* (`/accounts?tab=catalogue&pb=pending`); the drift notification (`/accounts?tab=catalogue&pb=drift`); the approved / rejected notifications (`/accounts`, which opens on the Team tab); the pending notification (`/tasks`). **Writes from outside the manager** — *"New items found — add to your price book?"* after a quote parse, an AI draft or a meeting brief (C-59); *"Also save to price book"* in a quote line's editor; Quote Categories' *"Import Price Book from CSV"*; the AI Quote Drafter reads it (C-56). **Out** — *"Export items"* CSV (C-17); *"Manage →"* opens Quote Categories in a new tab; the monthly drift notification (C-52).
- **Data:** —
- **Words:** *"Accounts Setup"*, *"Price Book"*, *"Open in Price Book"*, *"Edit prices, categories, and vendor mappings. Changes apply to this quote immediately."*, *"Manage →"*.

---

## Routes and their checks

### C-03 · The edge and the session — the only check most routes make
- **Where:** `src/proxy.ts:148-151, 431-444, 461-477`; `src/lib/api-auth.ts:23-34`; `src/lib/session.ts:196-226` (AS D-30); `src/lib/cron-auth.ts` (`isAuthorizedCron`).
- **Does:** every `/api/price-book/*` and `/api/studio-config/*` path needs a signed `qanvast_session` at the edge (401 *"Not authenticated"* / *"Invalid session"*). `/api/cron/price-drift` and `/api/cron/aggregate-rates` pass the edge and check `Authorization: Bearer <CRON_SECRET>` themselves (DRIFT:20-23; AGG:27-30), failing closed in production. The routes re-verify the cookie themselves — some through `requireSession` (scoped routes), some by reading the cookie and calling `verifySession` (the service-role routes, e.g. DEL:31-38, IMPORT:7-12). Nothing re-checks that the member is still active; a removed member's cookie keeps working until it expires (AS D-30).
- **Data:** —
- **Words:** *"Not authenticated"*, *"Invalid session"*, *"Unauthorized"* (the `cookies()`-style routes: IMPORT:11, EXPORT:11, IMG:15, QIMPORT:15).

### C-04 · Route table
- **Where:** the routes below. Confirms and extends AS D-33, which listed nine routes in four rows.
- **Does:** every route that reads or writes price-book data, with its client and the role check it makes. "Session" = C-03 only.

| Method | Path | Client | Role / permission check | UI caller | Row |
|---|---|---|---|---|---|
| GET | `/api/studio-config/price-book` | scoped | session | `usePriceBook` (SC:224-234) — manager, pickers, digitizer | C-05 |
| POST | `/api/studio-config/price-book` | scoped | **`pricebook.edit`** (PB:156-166); trust by tag | editor Add, CSV / AI import, Seed from market rates, Quote Categories CSV, "Also save to price book" | C-06 |
| PATCH | `/api/studio-config/price-book/[id]` | scoped | **`pricebook.edit`** (PBI:68-78); trust by tag | editor Save, Archive / Restore, bulk archive / move | C-07 |
| POST | `/api/studio-config/price-book/reorder` | scoped | **none** | row drag (every role) | C-08 |
| POST | `/api/studio-config/price-book/vendor-markup` | scoped | **none** | *"Vendor markup config"* (hidden without edit) | C-09 |
| PUT | `/api/studio-config/pricing-tiers` | scoped | **none** | editor Save, after the PATCH | C-10 |
| GET | `/api/studio-config/price-book-history?itemId=` | scoped | session | *"View history"* (every role) | C-11 |
| GET | `/api/studio-config/platform-market-rates?countryCode=` | scoped | session — **denied by the database since 264** | manager, Drift tab, drift badge | C-23 |
| DELETE | `/api/price-book/[id]` | service role | **owner or admin tag** (DEL:42-55) | *"Delete permanently"* (shown to anyone passing the edit gate) | C-12 |
| POST | `/api/price-book/[id]/approve` | service role | **owner or admin tag** (APPROVE:29-39) | Pending tab, Tasks | C-13 |
| POST | `/api/price-book/[id]/reject` | service role | **owner or admin tag** (REJECT:39-48) | Pending tab, Tasks | C-14 |
| POST | `/api/price-book/notify-pending` | service role | session; item must be the studio's and pending | server-to-server from PB / PBI | C-15 |
| POST | `/api/price-book/import` | service role | **none** | **none** | C-16 |
| POST | `/api/quotes/import` | service role | **none** | **none** | C-16 |
| GET | `/api/price-book/export` | service role | **none** | *"Export CSV"* / *"Export items"* (every role) | C-17 |
| POST | `/api/price-book/parse` | service role | **none** | CSV dialog for non-CSV files and pasted text | C-18 |
| POST | `/api/price-book/upload-image` | service role | **none** | the item editor's image button (every role who opens it) | C-19 |
| GET | `/api/price-book/suggestions/pending[?quoteLineItemIds=]` | scoped | session | manager's *"Review N new items"*, digitizer | C-20 |
| POST | `/api/price-book/suggestions/scan` | service role | session | after a parse, an AI draft, a meeting brief | C-21 |
| POST | `/api/price-book/suggestions/bulk` | service role | **none** (trust by tag) | *"Add N to price book"* / *"Dismiss N"* | C-22 |
| POST | `/api/quotes/categories/resolve` · `/api/quotes/categories` | scoped | none | the item editor's virtual categories; the digitizer's Add category | C-24 |
| GET | `/api/cron/price-drift` | service role | `CRON_SECRET` | Vercel cron `0 10 1 * *` (`vercel.json:41-42`) | C-52 |
| GET | `/api/cron/aggregate-rates` | service role | `CRON_SECRET` | Vercel cron `0 12 15 * *` (`vercel.json:45-46`) | C-51 |
| PUT | `/api/studio-config/workflow` (approver list) | scoped | **none** (`src/app/api/studio-config/workflow/route.ts:57-98`) | Workflow Rules › *"Price book approvers"* | C-41 |
| PUT | `/api/studio-config/features` (`priceBookSubcategoryInQuote`) | scoped | none for this key (`src/app/api/studio-config/features/route.ts:100-119, 141`) | Feature Flags | C-65 |

- **Corrections to AS D-33:** (1) `vendor-markup` does not re-price: it writes `markup_percent` only, on active items whose **scalar** `vendor_id` matches, and leaves `unit_price` as it was (C-09). (2) `import` has no UI caller at HEAD and has an older twin, `/api/quotes/import`, with the same missing gate (C-16). (3) "The screen hides editing from `id` and `accounting`" holds for the add, edit, delete, import and markup buttons, not for drag reorder, the bulk bar, the item editor or its image upload (C-40). (4) Sixteen more routes touch the book: history, market rates, export, parse, image upload, notify-pending, the three suggestion routes, `/api/quotes/import`, the two category routes, the two crons, and the workflow and features settings routes (table above).
- **Data:** as per row.

### C-05 · `GET /api/studio-config/price-book` — the list
- **Where:** PB:54-136; SC:224-234 (`staleTime` 30 s).
- **Does:** reads every row of the studio (active, archived, pending, rejected) in 1,000-row pages "(PostgREST caps a single response at 1000)", ordered by `order_index` then newest; joins category name and creator name; loads tiers and vendor names in 200-id chunks; maps through `transformStudioPriceBookItem`. Every member gets the full book with cost price, markup, waste, vendors, approval state and creator.
- **Data:** `studio_price_book` (`select("*")`, which also drags the 1,536-float `embedding` column server-side per row since 288 — the transformer drops it before the response), `price_book_pricing_tiers`, `vendors`, `studio_quote_categories`, `profiles`.
- **Words:** *"Internal server error"*.

### C-06 · `POST /api/studio-config/price-book` — add
- **Where:** PB:145-285; callers SC:236-252 from `PBM:404-425` (seed), `PBM:1168-1223` (CSV / AI import), `PBE:463-500` (Add), `PBE:565-597` (quote mode, *"Also save to price book"*), `ACC:1768-1778` (Quote Categories CSV).
- **Does:** (1) edit gate → 403. (2) trust by tag: owner / admin rows land `approved` with `approved_by` / `approved_at`; everyone else `pending`. (3) fills missing SKUs with `PB-NNN` from the current maximum (C-27). (4) inserts with `created_by` = session user and `source` = the body's value or `'manual'`. (5) for pending rows: one approval task per row, assigned to the **first owner, else first admin** (`resolveApproverUserId`, PB:39-46 — the configured approver is ignored here), titled *"Approve price book item: <name or description>"*, then one server-to-server `POST /api/price-book/notify-pending` per row with the caller's cookie (PB:246-252). (6) embeddings via `after()`, five at a time (PB:258-279).
- **Data:** `studio_price_book` insert; `tasks` insert; notifications via C-15; `embedding` update. No `price_book_history` row (the *"Created"* entry type is never written, C-47).
- **Words:** *"You don't have permission to edit the price book."* (PB:165); *"Approve price book item: …"*; *"Internal server error"*.

### C-07 · `PATCH /api/studio-config/price-book/[id]` — edit, archive, and the approval state machine
- **Where:** PBI:52-201; callers SC:275-302 from `PBE:501-547` (Save), `PBM:434-456` (Archive / Restore), `PBM:323-384` (bulk archive / move category).
- **Does:** body `{ changes, previousValues }`. Edit gate → 403. Then: an **archive-only** change (`changes` = `{ is_active }`) skips approval entirely (PBI:81-82). Otherwise, by tag: a trusted member editing a **pending** item approves it silently (tasks closed, no notification to the adder, PBI:92-96, 149-158); a non-trusted member editing a **non-pending** item flips it to pending, raises *"Re-approve price book item: …"* for the first owner / admin and calls notify-pending with `action: "edited"` (PBI:97-100, 128-148). A trusted edit of a **rejected** item leaves it rejected. Re-embeds when `description` is in `changes` — the editor always sends it, so every Save re-embeds, fire-and-forget without `after()` (PBI:120-125; `PBE:508-509`). Writes one history row (C-47). Emits a crowd signal when `unit_price > 0` and `description` are both in `changes` — again every editor Save of a priced item (PBI:185-194; C-51).
- **Data:** `studio_price_book` update; `tasks` insert / update; `price_book_history` insert; `crowd_rate_signals` insert.
- **Words:** *"You don't have permission to edit the price book."*; *"Re-approve price book item: …"*; editor toasts *"Item saved"*, *"Failed to save item"* (the 403 message is replaced, `PBE:541-545`).

### C-08 · `POST /api/studio-config/price-book/reorder` — drag order and category moves, ungated
- **Where:** REORDER:13-43; SC:257-271; `PBM:112-140, 783-809`.
- **Does:** writes `order_index` for every id in `ordered` and `category_id` for every entry of `categoryChanges`, in parallel. The manager sends the **whole book** on every drop (`reordered.map(...)`, one UPDATE per item) and a cross-category drop moves the item into the target's category. No gate: every row is `draggable` for every role, so a read-only designer or accountant can reorder and re-categorise. No approval flip, no history.
- **Data:** `studio_price_book.order_index`, `category_id`.
- **Words:** *"Reorder failed"*; toast *"Could not save new order"*.

### C-09 · `POST /api/studio-config/price-book/vendor-markup` — ungated bulk markup
- **Where:** MARKUP:13-38; SC:367-383; `src/components/accounts/vendor-markup-dialog.tsx:25-44, 60-120`; `PBM:605-617`.
- **Does:** sets `markup_percent` on every active item whose **scalar** `vendor_id` is the vendor (MARKUP:27) — items where the vendor is only in `vendor_ids[1…]` are not touched; `unit_price` is not recomputed (hand-off B). The dialog counts on the same scalar (`p.vendorId`). The button is hidden without the edit gate; the route has none. No approval flip, no history, no notification.
- **Data:** `studio_price_book.markup_percent`, `updated_at`.
- **Words:** *"Apply Vendor Default Markup"*, *"Use vendor default (<n>%)"*, *"This will update <n> active price book items linked to <vendor> to <m>% markup."*, *"Apply to <n> Items"*, *"vendorId and markupPercent are required"*.

### C-10 · `PUT /api/studio-config/pricing-tiers` — ungated tier replace
- **Where:** TIERS:15-52; SC:349-363; `PBE:535-540`.
- **Does:** deletes every tier of the item, inserts the sent set. The editor calls it only after the PATCH succeeded, so the UI never saves tiers for a member who fails the edit gate — but the route itself only needs a session. RLS keeps it inside the studio (C-29). No history, no approval flip.
- **Data:** `price_book_pricing_tiers`.
- **Words:** *"itemId is required"*.

### C-11 · `GET /api/studio-config/price-book-history`
- **Where:** HIST:35-65; SC:332-345; `src/components/accounts/price-book-history-drawer.tsx:23-26, 60, 100-160`; `PBM:976-982`.
- **Does:** the item's newest 50 history rows with the changer's name. *"View history"* is in every row's menu for every role.
- **Data:** `price_book_history`, `profiles`.
- **Words:** *"Price History"*, *"Created"*, *"Updated"*, *"Archived"*, *"Restored"*, *"by <name>"*, *"Sell:"*, *"Cost:"*, *"Markup:"*, *"itemId query param is required"*.

### C-12 · `DELETE /api/price-book/[id]` — hard delete, by tag
- **Where:** DEL:1-90; SC:312-327; `PBM:1003-1015, 1270-1291`.
- **Does:** refuses anyone whose tags lack owner / admin; hard-deletes the item. Cascades drop its tiers **and its history** (DEL:9-11), so the item's only audit trail goes with it. The menu shows *"Delete permanently"* to anyone passing the edit gate, so a member granted `pricebook.edit` sees it and gets a 403. Nothing closes the item's open approval task: approving that task afterwards answers *"Item not found"* (C-42). Packages, quote-generation rules, suggestions and quote lines keep the dead id (C-62). No notification, no history.
- **Data:** `studio_price_book` delete (+ cascades).
- **Words:** *"Delete this price book item?"*, *"“<label>” will be permanently removed, along with its history and pricing tiers. Existing quotes that referenced it keep their cached price (the link just disappears). This can't be undone — use Archive if you might want it back."*, *"Delete permanently"*, *"Only admins or owners can delete price book items. Use Archive instead."*, *"Item not found"*.

### C-13 · `POST /api/price-book/[id]/approve`
- **Where:** APPROVE:1-119; callers `PEND:88-105`, `TASKS:743-766`, `TASKS:825-848` (bulk).
- **Does:** owner / admin **tag** only — not the edit gate, not the configured approver (a member picked as approver who is neither gets a 403, C-41). Loads the item by `(id, studio_id)`; an already-approved item answers `{ ok, alreadyApproved }` before any task is touched (APPROVE:54-56). Otherwise sets `approved`, `approved_by`, `approved_at` **and `is_active = true`** (an archived pending item is un-archived), closes every pending approval task of the item, and notifies the adder unless the approver is the adder (C-43). No status check beyond "not approved": a rejected item can be approved back.
- **Data:** `studio_price_book`; `tasks`; `profiles` read; notification.
- **Words:** *"Only admins or owners can approve price book items"*, *"Item not found"*; Pending tab toast *"Approved "<label>""*; Tasks toast *"Item approved"*.

### C-14 · `POST /api/price-book/[id]/reject`
- **Where:** REJECT:1-124; callers `PEND:109-133`, `TASKS:768-803`.
- **Does:** needs a non-empty `comment`; owner / admin tag only. Sets `rejected`, **`is_active = false`**, and stamps the rejecter into `approved_by` / `approved_at`; closes pending approval tasks with `approval_comment`; notifies the adder with the comment. There is no "must be pending" check: an approved item can be rejected (and archived) by a direct call; the UI offers Reject on pending items only.
- **Data:** `studio_price_book`; `tasks.approval_comment`; notification.
- **Words:** *"comment is required"*, *"Only admins or owners can reject price book items"*; *"Why are you rejecting this?"*, *"Confirm reject"*, *"Reject comment is required so the submitter knows what to change"* (PEND:112, 215, 242); Tasks toast *"Item rejected and archived"*.

### C-15 · `POST /api/price-book/notify-pending`
- **Where:** NOTIFY:1-101; callers PB:246-252, PBI:141-145 (server-to-server `fetch(new URL(..., request.nextUrl.origin))` forwarding the cookie).
- **Does:** re-reads the item (service role, studio match), skips unless still pending (`{ skipped: true }`), picks the recipient as **configured approver[0] → first owner → first admin** and dispatches `price_book.item_pending_approval` with the caller's name as `member_name`. Any member can call it for any pending item of the studio and the notification names *them* as the submitter; the only brake is the dispatcher's 2-minute duplicate window (`src/lib/notifications/dedupe.ts:40`).
- **Data:** reads `studio_price_book`, `profiles`, `studio_quote_categories`, `studio_members`, `studios.settings`; notification.
- **Words:** *"itemId is required"*, *"Item not found"*.

### C-16 · `POST /api/price-book/import` and `POST /api/quotes/import` — two writers with no caller, no gate and no approval
- **Where:** IMPORT:6-157; QIMPORT:1-99; `src/__tests__/price-book-parser.test.ts:288-330` (reads IMPORT's source); `git show fde67efc9 --stat` (QIMPORT added 2026-03-27).
- **Does:** both take a session only and write with the service role. IMPORT: creates missing categories by name (blank → *"General"*), finds or creates a vendor by case-insensitive name, inserts rows with `unit` default `'lot'`, `vendor_ids` only (no scalar `vendor_id`, so vendor markup never reaches them, C-09), no `created_by`, no `item_id`, no `approval_status` (DB default `approved`), no embedding, no history. QIMPORT (2026-03-27, "Bulk-import price book items from parsed CSV data"): upserts categories and inserts `description / category / unit_price / unit / source 'csv_import'` the same way. Nothing in `src`, `scripts` or `docs` calls either at HEAD apart from a test that reads IMPORT's source (grep); the manager's import goes through C-06. A direct call is the only way a non-owner / non-admin can land **approved** items (AS D-33 named IMPORT; QIMPORT is its older twin).
- **Data:** `studio_price_book`, `studio_quote_categories`, `vendors` inserts.
- **Words:** *"Unauthorized"*, *"Invalid request body"*, *"No items to import"*, *"Failed to insert items"*, *"Import failed"*, *"No items provided"*, *"Failed to import items"*.

### C-17 · `GET /api/price-book/export`
- **Where:** EXPORT:6-73; `PBM:597-605, 1149-1161` (`window.open("/api/price-book/export")`).
- **Does:** one CSV of the studio's rows with columns *"Description, Category, Sell Price, Unit Cost, Unit, Markup %, Cost Type, Waste %, Vendor, Tags, Notes, Active"*, newest first; formula-injection guard on text cells. No role check and the button is shown to every role, so any member downloads cost prices and markups. Unpaginated — capped at the PostgREST page (C-26). The *"Vendor"* column is the scalar `vendor_id`'s name only; name, SKU, sub-category, approval state, images, spec links and tiers are not exported. Archived rows are included (*"Active"* = No), though the tile says *"every active item"*.
- **Data:** `studio_price_book`, `studio_quote_categories`, `vendors` (service role).
- **Words:** *"Export items"*, *"Download every active item as a CSV. Useful for back-office reconciliation."*, file `price-book-export.csv`, *"Failed to fetch price book"*, *"Export failed"*.

### C-18 · `POST /api/price-book/parse`
- **Where:** PARSE:1-332; caller `src/components/accounts/price-book-csv-dialog.tsx:175`; helpers `src/lib/price-book-parser.ts` (hand-off B).
- **Does:** multipart `file` (PDF, image, CSV, TXT, XLSX, XLS; ≤10 MB) or pasted `text`; one Gemini 2.5 Flash call (token retry 32k → 64k, 60 s abort) with the studio's category names in the prompt; post-processing maps categories, canonicalises units, flags duplicates against up to 5,000 active descriptions, detects GST wording. Session only, no role check, no rate limit, nothing stored. The category list is read from **`studio_price_book_categories`** (PARSE:183-187), a table no migration, type or other code declares (grep) — the categories live in `studio_quote_categories` — so the prompt's *"The studio's existing categories: […]"* line and the *new categories* banner depend on a table that does not appear to exist (Uncertain). Without `OPENROUTER_API_KEY` it returns seven fixed rows from *"Acme Renovation Supplies"* as a normal 200 (PARSE:42-50, 199-208), which the dialog lets the user import as real items.
- **Data:** reads `studio_price_book`; nothing written.
- **Words:** *"Not authenticated"*, *"Invalid request body"*, *"Provide a file or paste text"*, *"File too large. Maximum is 10 MB."*, *"Unsupported file type "<mime>". Upload PDF, image, CSV or Excel."*, *"No content to parse"*, *"Could not read the document. Try again, upload a clearer copy, or use CSV."*, *"No items detected. Try a clearer file or fall back to CSV."*, *"Could not parse document. Try again or upload as CSV."*

### C-19 · `POST /api/price-book/upload-image`
- **Where:** IMG:1-88; caller `PBE:394-421`; `PBE:1384`.
- **Does:** JPEG / PNG / WebP / GIF ≤5 MB for an existing item of the studio; uploads to the public bucket `price-book-images` at `<studioId>/<itemId>-<timestamp>.<ext>` and writes `image_url` at once — on file pick, before the editor's Save. No role check: *"Edit item"* opens the editor for every role (`PBM:966-975`), so a read-only member can replace an item's image even though their Save is refused. The previous file is never removed. No history, no approval flip.
- **Data:** storage `price-book-images`; `studio_price_book.image_url`.
- **Words:** *"No file provided"*, *"No itemId provided"*, *"File too large (max 5MB)"*, *"Invalid file type. Allowed: JPEG, PNG, WebP, GIF"*, *"Item not found"*, *"Failed to upload image"*, *"Failed to update item"*, *"Upload failed"*; toasts *"Image uploaded"*, *"Failed to upload image"*.

### C-20 · `GET /api/price-book/suggestions/pending`
- **Where:** SPEND:20-68; `src/lib/queries/price-book-suggestions.ts:117-164`; `PBM:86-87, 620-631`.
- **Does:** every pending suggestion of the studio, newest first, or those of given quote lines. Scoped client. The manager's *"Review N new items"* button is shown to every role, and lists suggestions raised from any member's quotes (C-32).
- **Data:** `price_book_suggestions`.
- **Words:** *"Review <n> new item(s)"*, *"Review items detected from quotes that aren't in your price book yet"*.

### C-21 · `POST /api/price-book/suggestions/scan`
- **Where:** SCAN:1-173; callers `QDD:891-913` (`"ai_generation"` at `QDD:954`, `"pdf_parse"` at `QDD:3376`), `src/components/copilot/meeting-brief.tsx:400-419` (`"copilot"`).
- **Does:** for the given quote lines of the studio that have no price-book link, runs the matcher over the studio's active items (hand-off B): high / suggested matches are **auto-linked** (writes `quote_line_items.price_book_item_id`, no confirmation), the rest become pending suggestions. Session only, service role. `source` must be one of five values; `submit_review` and `manual` are accepted but no caller sends them. The suggestion insert is one multi-row statement and a line may hold one suggestion in its lifetime (M115:49-53): when any line in the batch already has one, the whole insert fails with 23505, which is swallowed (SCAN:146-152), so the batch's new lines get no suggestion. The book read is unpaginated (C-26).
- **Data:** `quote_line_items.price_book_item_id`; `price_book_suggestions` insert.
- **Words:** *"source is required and must be one of: pdf_parse, ai_generation, copilot, submit_review, manual"*, *"Failed to fetch line items"*.

### C-22 · `POST /api/price-book/suggestions/bulk` — the ungated add path
- **Where:** BULK:1-323; `src/lib/queries/price-book-suggestions.ts:82-115`; `NIM:1-13, 100-160, 290-303`.
- **Does:** dismisses (`dismissed_by`) and adds. Each add inserts an item with trust by tag, `PB-NNN` SKU, `source 'manual'`, `created_by`; for non-trusted members an approval task to **configured approver[0] → first owner → first admin** and a pending notification with an empty category; marks the suggestion `added` and links the quote line. **No edit gate**: any member — a designer, an accountant who opened the manager's *"Review N new items"* — adds items (pending, but usable at once, C-43). A suggestion id that does not exist still inserts the item (BULK:152-191), so a direct call adds arbitrary items this way. No embedding (the AI Quote Drafter's semantic search cannot see these rows until a backfill, C-55), no vendor, no cost type, no markup, no history.
- **Data:** `price_book_suggestions`, `studio_price_book`, `tasks`, `quote_line_items`; notification.
- **Words:** *"New items found — add to your price book?"*, *"We found <n> item(s) on this quote that aren't in your catalogue yet. Review, edit, and add the ones you want to keep."*, *"Add <n> to price book"*, *"Dismiss <n>"*, toasts *"Added <n> item(s) to your price book"*, *"Couldn't add to price book: <reason>"*, *"Dismissed <n> item(s)"*; errors *"Already <status>"*, *"insert failed"*.

### C-23 · `GET /api/studio-config/platform-market-rates` — denied by the database since 2026-07-22
- **Where:** RATES:1-51 (header 5-8: *"GLOBAL reference table … it is NOT locked"*; scoped client 26-33); M264:4-27, 47-62, 73-74; `src/app/api/quote-xrays/create/route.ts:332-335`; M278:4; SC:403-417; `PBM:62-63, 518-523, 524-538, 637-641, 646-652, 676-680`; `src/lib/queries/price-book.ts:44-68`; DTAB:105-114.
- **Does:** the price book's only read of the regional benchmarks goes through the **scoped** client (`authenticated`). Migration 264 revoked every privilege on `platform_market_rates` from `anon` and `authenticated` and turned RLS on with no policy ("these platform tables are not tenant-scoped so authenticated has no legitimate access either"); the X-Ray route says the same in code and reads it with the service role instead. Read as code, the route has answered with a 500 since 264, the hook's `data` falls back to `[]`, and every surface fed by it goes quiet: the *"<n> <CC> benchmarks"* count, the per-row drift chips and the *"<n> priced outside market range"* pill, the Drift tab (which then shows *"No market rates available"*), the Drift badge, `PriceDriftSummary`, and both *"Seed from <CC>"* buttons (they need rates). The monthly cron still finds drift with the service role and still sends the notification that deep-links to this empty tab (C-52). No test covers the route. Not observed live (Uncertain).
- **Data:** `platform_market_rates` (read).
- **Words:** *"countryCode query param is required"*; *"No market rates available"*, *"Drift detection needs platform market rates for your region (<CC>). Check back later or contact support."*; *"No market rates available for your region"* (seed toast, `PBM:406`).

### C-24 · Category writes from price-book surfaces
- **Where:** `src/app/api/quotes/categories/resolve/route.ts:1-51`; `PBE:439-462`; `src/app/api/quotes/categories/route.ts:17-50`; `QDD:1432-1473`; IMPORT:50-82; QIMPORT:32-66; `PBM:498-517`; AS D-14.
- **Does:** the item editor turns a fallback *"virtual:<name>"* category into a real one through `/resolve`, an upsert on `(studio_id, name)` that also sets `is_active = true` — picking a switched-off category's name in the editor silently switches it back on. The digitizer's Add category upserts through `/api/quotes/categories`. Both imports create categories by name. None has a role check. Categories are the quote trades (`studio_quote_categories`), shared with quotes; renaming one on Quote Categories orphans items' `category_id` (AS D-14). The manager's *"Manage →"* opens Quote Categories in a new tab for members passing the edit gate.
- **Data:** `studio_quote_categories`.
- **Words:** *"Manage →"*, *"Open category management in the Quote Categories tab (new tab)"*; *"Category added locally, but couldn't save to price book"*, *"Category "<name>" added (this quote only)"* (`QDD:1451, 1463`); *"name is required"*.

### C-25 · Four add paths, four behaviours
- **Where:** PB:145-285; BULK:43-323; IMPORT:6-157; QIMPORT:11-99.
- **Does:** the same act — "add an item to the price book" — runs four different implementations. `BULK`'s header says it mirrors the POST (BULK:6-9) and `NIM:8-10` says promotion "goes through the existing useAddPriceBookItems flow"; neither holds.

| | POST `/api/studio-config/price-book` | POST `/api/price-book/suggestions/bulk` | POST `/api/price-book/import` | POST `/api/quotes/import` |
|---|---|---|---|---|
| UI callers | editor Add; CSV / AI import; Seed from market rates; Quote Categories CSV; "Also save to price book" | *"Add N to price book"* (manager, digitizer, meeting brief) | none | none |
| Client | scoped | service role | service role | service role |
| `pricebook.edit` | yes | **no** | **no** | **no** |
| Approval | trust by tag → approved / pending | trust by tag | none (DB default `approved`) | none (DB default `approved`) |
| Approval task to | first owner → first admin | configured → owner → admin | — | — |
| Pending notification to | configured → owner → admin (via C-15) | configured → owner → admin | — | — |
| `created_by` | session user | session user | null | null |
| SKU `PB-NNN` | yes | yes | no | no |
| Vendor | `vendor_ids` + scalar mirror | none | `vendor_ids` only; creates the vendor | none |
| Categories | id from the body | id from the body | created by name | upserted by name |
| `source` | body or `manual` | `manual` | body or `csv_import` | `csv_import` |
| Embedding | yes (`after()`) | no | no | no |
| History row | no | no | no | no |

- **Data:** `studio_price_book` and neighbours as listed.

### C-26 · The 1,000-row cap on unpaginated readers
- **Where:** PB:62-80 (the one paginated read, with the comment *"PostgREST caps a single response at 1000"*); EXPORT:16-20; SCAN:66-70; DRIFT:44-49; PB:180-181; BULK:102-106; PARSE:188-193 (`.limit(5000)`); `src/app/api/quotes/auto-match/route.ts:56-61`; `src/app/api/quotes/line-items/route.ts:381-385`; `src/app/api/quotes/chat/route.ts:54`; AGG:39-45; `docs/prd/05-price-book.md:52, 69`; `scripts/cleanup/002_dyel_purge_test_demo_data.sql:14`; `scripts/migrations/elarte-template-align.sql:24-26`.
- **Does:** only the list GET pages through the book. Every other reader takes one response, so on a book above 1,000 rows (Dyel holds 1,609; El Arte 6,338 per the comments cited): the export silently stops at 1,000 rows; suggestion scans, auto-match and the line save's cost match see only part of the book (so a line can be suggested as "new" although the book has it); the monthly drift sweep checks at most 1,000 items per studio; the quote chat's price-book index under-counts; the `PB-NNN` maximum is taken over at most 1,000 codes (C-27); the parse duplicate check reads at most the page size despite `limit(5000)`. PRD 05 says large-studio paging was solved. The cap is the code's own assumption; the deployed `max_rows` was not read (Uncertain).
- **Data:** —

### C-27 · The `PB-NNN` sequence
- **Where:** PB:176-192; BULK:98-114, 193-198; M113:18-20; M159:62-64 (QE D-09).
- **Does:** a new SKU is "highest `PB-<n>` seen + 1", computed in the route from an unpaginated read (C-26) and not reserved. Two concurrent adds — two members importing, or a CSV import racing a suggestion promotion — compute the same code and the partial unique index `(studio_id, item_id)` refuses one: in the POST the **whole batch** fails with the Postgres message as a 500; in the bulk route that one add lands in `failed`. On books with more than 1,000 `PB-` codes the maximum can come from a partial page and collide every time. Rows added by C-16 carry no SKU.
- **Data:** `studio_price_book.item_id`.
- **Words:** (the raw Postgres duplicate-key message, PB:222-223).

### C-28 · Environment fallbacks that drop the approval status
- **Where:** PB:208-220; PBI:108-114; QE D-09 (`subcategory` has no migration at HEAD; `234:14-16` names 215 as applied).
- **Does:** when the insert or update fails on any of `cost_type`, `waste_percent`, `vendor_id`, `image_url`, `spec_url`, `subcategory`, `approval_status`, `approved_by`, `approved_at` (or `42703`), both routes retry with fewer columns. The POST retry drops the approval fields too, so a non-trusted add lands `approved` (DB default) — while the task and notify-pending side effects still run against an item that is not pending (notify-pending then skips; the task stays open and *Approve* answers `alreadyApproved` without closing it, APPROVE:54-56). The PATCH retry drops `approvalChanges`, so a non-trusted edit is not flipped but still raises a *Re-approve* task. The POST retry also drops `vendor_ids`, images, cost type, waste and sub-category. Whether any live environment lacks one of these columns was not checked (Uncertain).
- **Data:** `studio_price_book`, `tasks`.

---

## Tenant isolation

### C-29 · RLS on the price-book tables
- **Where:** M226:32-70 (direct `studio_id = claim` for `price_book_suggestions` line 48, `studio_price_book` and `studio_quote_categories` line 56, `tasks` and `vendors` line 57), M226:103-138 (parent-EXISTS for `price_book_pricing_tiers`, line 122); M223:35-58 (`price_book_history`, scoped policy line 51); M264:47-62 (`platform_market_rates`, `crowd_rate_signals` — service role only); `scripts/security/rls-manifest.json:48-49, 89, 104, 152`; M111, M232, M233:19-22 (storage).
- **Does:** since 2026-06-22 (history) and 2026-06-23 (the rest) every studio price-book table has RLS enabled and **forced**, one `scoped` policy for all commands keyed on the JWT's `studio_id`, DML revoked from `anon` and granted to `authenticated`; tiers are reachable only through an item of the caller's studio. `price_book_history` carries the same studio-scoped policy — not a server-only lock as QE D-11 says. The route headers that still say the price book is "NOT locked here … DEFERRED" (PB:6-8, PBI:6-9, REORDER:5-6, MARKUP:5-6, TIERS:5-8) predate 226 (C-75). The policies separate studios only; nothing narrows by member (C-32). The static manifest lists the tables; RLS itself is verified live by `scripts/security/check-rls-coverage.js`, not by the unit tests.
- **Data:** as listed.

### C-30 · Where the service role is used
- **Where:** DEL, APPROVE, REJECT, NOTIFY, IMPORT, QIMPORT, EXPORT, PARSE, IMG, SCAN, BULK, DRIFT, AGG, CROWD:75-106; `src/app/api/quotes/auto-match/route.ts:48`; `src/app/api/quotes/chat/route.ts:40, 54`; `EXE:355, 491`; `src/lib/quote-agent/fallback.ts:73`.
- **Does:** thirteen price-book routes and the AI paths bypass RLS and rely on their own `.eq("studio_id", session.studioId)`. Each one read here does filter by the session's studio on its reads and stamps it on its inserts; IMG's final update filters by item id only, after a studio-matched lookup (IMG:38-48, 73-76). The scoped routes are the list, add, edit, reorder, markup, tiers, history, market rates and pending suggestions.
- **Data:** —

### C-31 · Ids the body can point at another studio
- **Where:** PB:194-207 (`category_id`, `vendor_id`, `vendor_ids` from the body); BULK:205-221 (`categoryId`); REORDER:26-28 (`categoryId`); PBI:103-107 (`changes`); EXPORT:16-19 (service-role joins).
- **Does:** RLS `WITH CHECK` covers `studio_id` only, and foreign keys are checked without RLS, so a direct call can store another studio's category id (FK to `studio_quote_categories`) or vendor id (FK on the scalar `vendor_id`; `vendor_ids[]` has no FK at all) on an item. Scoped reads then show nothing for the join, but the service-role export joins `studio_quote_categories(name)` and `vendors(name)` without RLS and would print the other studio's names. It needs the foreign uuid; the UI never offers one. Not exercised (Uncertain).
- **Data:** `studio_price_book.category_id`, `vendor_id`, `vendor_ids`.

### C-32 · No member scope
- **Where:** PB:54-136; HIST:35-65; SPEND:20-68; EXPORT:16-20.
- **Does:** every member of a studio reads the whole book with costs and markups, every item's history, every pending suggestion (which carry colleagues' quote-line descriptions and prices from leads the reader may not be assigned to), and can export it all. The role's `dataScope` and `pricebook.view` are never consulted (C-33).
- **Data:** —

---

## Roles and page access

### C-33 · Two permission slugs; one is read
- **Where:** AC:212-230 (`PRICEBOOK_EDIT` 215, `PRICEBOOK_VIEW` 216); AC:249-312 (`resolveCanPerformAction`; accounting may `view` only, 281-285; `id` denied `edit`, 293); M109:32, 65, 96, 126; M125:40-48; RE:92-97, 169; MOP:43; readers PB:164, PBI:76, `QDD:1128`, `PBM:61` (grep for `"pricebook"` over `src`).
- **Does:** the role matrix carries `pricebook.view` and `pricebook.edit`. Seeds and backfills give owner and admin both, designer and accounting `view` only. **`pricebook.edit`** is read by the add and edit routes and by two screens (the manager's edit affordances, the quote editor's book icon). **`pricebook.view`** is read by nothing: switching it off hides the price book from no one — not the manager, the pickers, the export or the API. There is no slug for approve, delete, import, export, vendor markup, tiers or reorder; approve / reject / delete are tag checks (C-35) and the rest are ungated (C-40).
- **Data:** `studio_roles.permissions.actions.pricebook` (AS D-21).
- **Words:** Roles & Permissions: *"Price Book"* · *"View"* · *"Edit / Add / Remove"*.

### C-34 · How a member's `pricebook.edit` resolves
- **Where:** PB:26, 157-163; PBI:20, 69-75; `src/app/api/studio-config/role-permissions/route.ts:16, 35-51`; `src/lib/accounting/permission-gate.ts:10, 27-42`; AS D-05; RE:426, 457, 496-531, 617; M090:235-292 (every seeded row `is_system = true`).
- **Does:** tags → one system slug by `owner > admin > accounting > id` (so `["id","accounting"]` reads the Accounting row; `manager` never counts, `src/__tests__/team-settings-role-display.test.ts:94-128`) → that `studio_roles` row → the `actions.pricebook.edit` value; a missing key falls back to the tag rules (owner / admin yes, accounting and designer no). The browser gets the same row from `role-permissions` (null when no tag matches); the add / edit routes fall back to the `id` row instead (PB:162). Which studios can change the answer in the UI depends on how their role rows were made (AS D-05): rows from 090, 109 and the setup wizard are `is_system` and the Roles screen locks them (*"System role — permissions locked"*); only rows auto-seeded by the Roles screen (`is_system` false) are editable. So on most studios no one can grant a designer `pricebook.edit` from the UI; an owner can through `PATCH /api/studio-config/roles/[id]`, which has no `is_system` guard (AS D-31).
- **Data:** `studio_members.tags`, `studio_roles.permissions`.
- **Words:** *"System role — permissions locked"*.

### C-35 · Trust is a tag, not the permission
- **Where:** PB:28-30, 168-174; PBI:22-24, 83-100; BULK:65-73; DEL:42-55; APPROVE:29-39; REJECT:39-48; `docs/openmaison-v1-feature-requirements.csv:16, 33`.
- **Does:** whether an add is approved or pending, and whether a member may delete, approve or reject, is read from the literal `owner` / `admin` tags. Consequences: a designer granted `pricebook.edit` has every change go pending, sees *"Delete permanently"* and gets a 403; an admin whose role row denies `pricebook.edit` (possible only on editable rows) is refused add / edit but still approves, rejects, hard-deletes, and uses every ungated route; a member who is chosen as the price-book approver but is neither owner nor admin cannot approve (C-41). No check filters `studio_members.is_active` (AS D-30).
- **Data:** `studio_members.tags`.

### C-36 · The member-override switch for the price book is inert
- **Where:** MOP:34-47 (`pricebook` · `edit` at 43); `src/app/api/studio-config/member-overrides/route.ts:34-41`; `QDD:1117-1128` (`effectivePerms` computed then `void`ed at 1125); `PBM:57-61`; PB:157-163; RR:409-439; `src/lib/accounting/permission-gate.ts:62-81`.
- **Does:** Accounts › Team › a member's override panel offers *"Price book · Edit / add / remove items"* and saves it into `studio_members.permission_overrides`. Nothing that decides price-book access reads it: the routes read the role row only, the manager and the quote editor pass the role row to `resolveCanPerformAction` directly (the editor even builds the merged set and discards it). The notification resolver reads overrides only for page opt-outs, and price-book events map to no page (RR:30-54). The shared `memberCanPerform` says it layers "P3 member overrides"; its loader reads tags and the role row only.
- **Data:** `studio_members.permission_overrides` (written, not read here).
- **Words:** *"Price book"*, *"Edit / add / remove items"*.

### C-37 · `/accounts` — open to four tags; the price-book-only filter was lost on 2026-05-15
- **Where:** AC:121-126; `src/app/(main)/layout.tsx:120-146`; ACC:634-639; `git show ac2cb2f50` (2026-05-07, *"fix(rbac): TC-2.2 — open /accounts to ID for read-only price book"*); `git show daa49719a -- "src/app/(main)/accounts/page.tsx"` (2026-05-15, removes `nonOwnerViewable: true` from the Price Book item and the filter that kept only such items for non-owners); `docs/uat/2026-05-07-customization-rollup/findings.md:40-41`; AS D-30, D-35 #3.
- **Does:** `ROUTE_ACCESS.accounts` admits owner, admin, `id` and accounting, enforced by the layout's browser redirect with tags only. Until 2026-05-07 the entry was `accounts: ["owner"]`; the TC-2.2 fix opened it to admin, `id` and accounting **so that they could read the price book**, and filtered every non-owner's menu down to Price Book alone (`nonOwnerViewable`). The merge eight days later overwrote the page and dropped that filter, so since then an admin, designer or accountant who reaches `/accounts` sees every tab of every group (only Studio Health stays owner-only). The comment at AC:123-125 and the UAT findings still describe the Price-Book-only view. The page-visibility key `accounts` — listed in Admin › Settings as *"Accounts Setup"* (`src/app/admin/settings/page.tsx:44-48`) — lets a platform admin switch the whole page, price book included, to *"Coming Soon"* (the mechanism is XR C-24). Admin › Studios › [id]'s access matrix, which says it "mirrors src/lib/access-control.ts ROUTE_ACCESS", still shows *"Accounts Setup"* as owner-only (`src/app/admin/studios/[id]/page.tsx:119, 141`).
- **Data:** `studio_members.tags`; `platform_config` / `studios.settings.page_visibility`.
- **Words:** *"Coming Soon"*, *"Accounts Setup"*.

### C-38 · How each role reaches the price book
- **Where:** `src/components/layout/topbar.tsx:492-510`; `src/components/layout/app-sidebar.tsx:19-46, 197-203` (no Accounts entry); `QDD:6688-6696`; `TASKS:503-515`; AC:70, 94; APPROVE:103; REJECT:107; NOTIFY:84; DRIFT:117.
- **Does:** the only menu entry is the topbar profile menu's *"Accounts Setup"*, **owners only**; its comment says designers and accountants reach the price book "via direct URL / sidebar", but the sidebar has no Accounts item. **Admin** — no menu entry: a typed URL, a Tasks row's *"Open in Price Book"* (if the task is theirs), a notification link, or the book icon inside a quote. **Designer** — a typed URL, or the approved / rejected notification (which lands on Accounts' Team tab); the book icon is hidden (no edit); the pickers inside a quote read the book. **Accountant** — a typed URL only (Tasks and the quote editor exclude accounting, AC:70, 94).
- **Data:** —
- **Words:** *"Accounts Setup"*, *"Open in Price Book"*, *"Open price book"*.

### C-39 · Role × action matrix (as implemented)
- **Where:** C-05 … C-38.
- **Does:** per tag as the code behaves. "Granted" = a designer whose role row allows `pricebook.edit` (C-34). "API only" = no UI offers it; the session is enough.

| Action | Owner | Admin | Designer (`id`) | Accounting | Granted designer |
|---|---|---|---|---|---|
| Reach `/accounts?tab=catalogue` | topbar | typed URL / links | typed URL | typed URL | typed URL |
| Read the book, costs, history, pending suggestions | yes | yes | yes | yes | yes |
| Add / edit an item | approved | approved | 403 | 403 | **pending** |
| Archive / restore | yes | yes | 403 | 403 | yes, no approval (C-07) |
| Hard delete | yes | yes | 403 (hidden) | 403 (hidden) | 403 (shown) |
| Approve / reject | yes | yes | 403 (buttons shown) | 403 (buttons shown) | 403 (buttons shown) |
| Reorder / move category by drag | yes | yes | **yes** | **yes** | yes |
| Replace an item's image | yes | yes | **yes** (via *Edit item*) | **yes** | yes |
| Vendor markup · tiers | yes | yes | API only | API only | yes |
| AI parse a document | yes | yes | API only | API only | yes |
| Import approved rows (C-16) | API only | API only | API only | API only | API only |
| Promote suggestions (C-22) | approved | approved | **pending (UI)** | **pending (UI)** | pending |
| Export the CSV with costs | yes | yes | yes | yes | yes |
| Set the price-book approvers (C-41) | yes | yes | yes (if they open Workflow Rules) | yes | yes |
| Receive "pending approval" | pricing roles (C-44) | pricing roles | if chosen as approver | if chosen as approver | if chosen |

- **Data:** —

### C-40 · What the screen hides — or offers — against what the API allows
- **Where:** `PBM:466-470, 586-617, 620-641, 676-680, 783-809, 966-1015, 1030-1063`; `PEND` (no role prop); `PBE:1405-1425, 1384`; `ACC:1759-1778`; `src/app/api/studio-config/workflow/route.ts:57-98`; C-08 … C-24.
- **Does:** extends AS D-35 #6. **Offered to everyone, refused by the server:** Approve / Reject on the Pending tab (tag check); bulk *Archive* / *Restore* / *Move to category…* (PATCH, 403 → *"<n> of <m> archive operations failed"*, *"Failed to move items"*); *"Edit item"* Save (403 → *"Failed to save item"*); *"Also save to price book"* in a quote line (403 → *"Saved to quote, but price-book sync failed"*); Quote Categories' *"Import Price Book from CSV"* (403); the empty-state *"Seed <n> items from <CC> market rates"* (403; hidden anyway since 264). **Offered to everyone and accepted:** drag reorder and cross-category moves (C-08); image upload from the editor (C-19); promoting suggestions (C-22); export with costs (C-17); *"View history"*. **Hidden but accepted:** vendor markup (C-09), tier replace (C-10), AI parse (C-18), both import routes (C-16), notify-pending (C-15), category upserts (C-24), the approver list (C-41). **Shown and refused to a granted designer:** *"Delete permanently"* (C-12). The read-only banner (*"Read-only — only owners/admins can edit the price book."*) therefore describes add / edit / delete only.
- **Data:** —
- **Words:** as quoted.

### C-41 · "Price book approvers" (Accounts › Workflow Rules)
- **Where:** `ACC:1610, 1700-1730`; `src/components/accounts/workflow-approver-selector.tsx:17-80`; `src/app/api/studio-config/workflow/route.ts:57-98`; readers BULK:116-148 and NOTIFY:51-75 (`[0]` only); PB:39-46, PBI:32-39 (ignore it); APPROVE:29-39; M160:1-31; `src/types/database.ts:2411`.
- **Does:** a multi-select of every studio member (owners shown pre-selected and locked) saved to `settings.workflow.approvers.priceBookApproval` through a PUT with no role check. What it changes: the **first** id receives the bulk route's approval task and the pending notification from both paths. What it does not change: the POST / PATCH approval tasks (still the first owner, else admin); who may approve (owner / admin tag only — a designer or accountant picked here receives tasks and e-mails they cannot act on); any other chosen member (only `[0]` is read, so "share the load" routes nothing to the second and later picks). There is no switch to turn price-book approval off. The pinned-approver column `approver_user_id` (migration 160) — documented as written by the bulk route, read by notify-pending and by a "my review" filter on the Pending tab — has no writer or reader at HEAD (grep).
- **Data:** `studios.settings.workflow.approvers.priceBookApproval`; `studio_price_book.approver_user_id` (unused).
- **Words:** *"Price book approvers"*, *"Who reviews new price book items submitted by team members? Owners are always in the loop; add extra members to share the load."*, *"Approvers (owners are always included; add extra members to route this approval to)"*, *"All owners (default)"*, *"Price book approvers saved"*.

### C-42 · Approval tasks in the Tasks inbox
- **Where:** `TASKS:38, 49, 78, 503-515, 716-726, 743-766, 768-803, 825-848, 1127-1140`; PB:233-244; PBI:131-140; BULK:231-245; `docs/user-stories/tasks.md:62, 98, 100`.
- **Does:** each pending item raises its own task (`planned_date` today, assigned as C-41 describes) — a 200-row import by a non-trusted editor makes 200 tasks and 200 notifications. A task row offers *"Open in Price Book"* (the Pending tab) plus Approve / Reject, which call the price-book routes instead of the generic task approval; selecting several offers *"Approve <n> items"*. A task whose item was hard-deleted cannot be approved (*"Item not found"*) and stays open; one whose item is already approved answers `alreadyApproved` and stays open (C-28).
- **Data:** `tasks` (`type`, `related_entity_id`, `approval_status`, `approval_comment`).
- **Words:** *"Price Book Item"*, *"Open in Price Book"*, *"Approve <n> item(s)"*, *"Approve selected price book items"*, *"Item approved"*, *"Item rejected and archived"*, *"Approved <n> item(s)"*, *"Failed to approve <n> item(s)"*, *"Approved <n>, <m> failed"*.

---

## Notifications, activity and analytics

### C-43 · Four notification events
- **Where:** EV:103-106, 619-661 (category `pricing`, EV:125, 771, 785); NOTIFY:79-94; BULK:246-276; APPROVE:92-112; REJECT:95-117; DRIFT:107-125; DISP:396-399 (title = label + entity label), 401-470 (the body falls to `default` = entity label for all four).
- **Does:**

| Event | Fired by | Fixed recipient | Link | In-app title · body |
|---|---|---|---|---|
| `price_book.item_pending_approval` | notify-pending (after a non-trusted add or edit) and the bulk route | configured approver[0] → first owner → first admin | `/tasks` | *"Price Book Item Pending Approval: Price Book: <label>"* · *"Price Book: <label>"* |
| `price_book.item_approved` | the approve route only | the item's `created_by` (skipped when the approver is the adder) | `/accounts` (opens on Team) | *"Your Price Book Item Was Approved: Price Book: <label>"* |
| `price_book.item_rejected` | the reject route | the item's `created_by` | `/accounts` | *"Your Price Book Item Was Rejected: Price Book: <label>"* |
| `price_book.drift_detected` | the monthly cron | none | `/accounts?tab=catalogue&pb=drift` | *"Price Book Drift Detected: <n> Price Book Items Need Review"* |

- The events' `defaultRecipientRoles` (owner + admin; `id` for the two outcome events) are read by nothing in the dispatcher (grep: only comments and tests mention them).
- **Data:** `notifications` rows, e-mail, WhatsApp (C-44).
- **Words:** as in the table; labels *"Price Book Drift Detected"*, *"Price Book Item Pending Approval"*, *"Your Price Book Item Was Approved"*, *"Your Price Book Item Was Rejected"*.

### C-44 · Who receives them
- **Where:** DISP:131-134 (demo studios skipped), 138-175 (preferences; studio pause), 229-240 (recipients); `src/lib/notifications/preferences.ts:87-105`; `scripts/migrations/112_seed_pricing_preferences.sql:13-26`; RR:30-54, 400-499 (482-484: the triggering user is no longer excluded, since 2026-07-15); `src/lib/notifications/dedupe.ts:40`; BULK:254-257 and NOTIFY:55-59 (comments).
- **Does:** recipients = the members holding a role listed in the studio's `pricing` preference **plus** the fixed ids — the fixed id adds to the role list, it does not replace it, although both price-book call sites say passing it "stops the dispatcher from fanning out to every owner+admin". Migration 112 (committed 2026-05-01) gave the studios that existed when it ran `pricing` rows for in-app and e-mail with roles `{owner, admin}`; nothing seeds rows for studios created later, whose lookup falls back to in-app + e-mail on, roles `['owner']`, WhatsApp off. So every owner (and, on older studios, every admin) receives every pending notice, and every *"Your Price Book Item Was Approved / Rejected"* about other people's items — including the owner who just approved it. A 2-minute duplicate window keys on event, entity, title and body. Settings › Notifications shows the category as *"Pricing"*; saving it is owner-only (AS D-15).
- **Data:** `notification_preferences` (`pricing` × `in_app` / `email` / `whatsapp`), `notifications`.
- **Words:** *"Pricing"*.

### C-45 · E-mail and WhatsApp copy
- **Where:** PRICING:1-56; `src/lib/notifications/templates/render.ts:118-140`; `src/lib/notifications/templates/whatsapp.ts:56-60`; `src/lib/notifications/templates/substitute.ts:254-275`.
- **Does:** one e-mail module for the category. It is the only base template that takes no branding argument (`renderTemplate(vars)`, PRICING:3, 55), so price-book e-mails go out without the studio's logo and colours; and it interpolates the member name, item label, category and rejection comment into HTML without `escapeHtml` (none in the file) while `render.ts:137-139` states base templates escape every variable. WhatsApp has a template for drift only; the other three fall back to *"{{title}} — {{action_url}}"*. Preview samples exist for the three approval events, none for drift.
- **Data:** —
- **Words:** *"<member> has added|edited <item> in the price book and needs your review."*, *"Category: <name>"*, *"The item is already usable in quotes. This is a confirmation so you can review when convenient."*; *"<approver> approved <item>."*; *"<approver> rejected <item> and archived it."*, *"You can edit and re-submit the item from the archived view."*; *"<n> price book item(s) drifted from market rates."*; WhatsApp *"Price book drift detected ({{drift_count}} items). Review: {{action_url}}"*.

### C-46 · What is never notified
- **Where:** PB, PBI, REORDER, MARKUP, TIERS, DEL, IMPORT, QIMPORT, IMG, SCAN, BULK (no dispatch besides C-43); M313:209-230.
- **Does:** no notice for: an owner / admin editing a pending item (which approves it, C-07); trusted adds; archive / restore; price, cost or markup changes; vendor markup applied in bulk; tier changes; a hard delete (the adder of a pending item is not told); imports; new suggestions (the modal is the only signal); a vendor merge re-pointing items; the approver list changing; a failed drift sweep; the market-rate aggregation.
- **Data:** —

### C-47 · `price_book_history` — the only trail, and what it records
- **Where:** PBI:160-183; SC:275-302; `PBE:525-533`; HIST:35-65; `src/components/accounts/price-book-history-drawer.tsx:23-26, 100-166`; M223:35-58; DEL:9-11.
- **Does:** written by the edit route only, one row per PATCH, `changed_by` = session user, `change_type` = `archive` / `restore` from the `is_active` transition, else `update`. `field_changes` lists every key in `changes` whose value differs from `previousValues[key]` — and the browser sends previous values for four fields only (sell, cost, markup, active), so every editor Save logs every other field it sends (description, unit, category id, sub-category, cost type, waste, vendor ids, image, spec, notes, tags, name, SKU) as changed from nothing, and the drawer prints them as *"<field>: — → <value>"*, raw uuids included. The "before" prices are whatever the browser sent. **Never written by:** adds (so *"Created"* never appears), approve, reject, delete (which also cascades the history away), reorder, vendor markup, tiers, images, imports, suggestion promotions, vendor merge, seeds. Read by every role, 50 newest.
- **Data:** `price_book_history`.
- **Words:** C-11.

### C-48 · No other activity or audit
- **Where:** the price-book routes (no `lead_activity_log` or `audit_log` write); `src/app/api/admin/audit-log/route.ts:18` (the only `audit_log` query in `src`, a platform-admin reader).
- **Does:** outside C-47 the trail is the row's own `created_by`, `approved_by` / `approved_at` (also stamped by a **rejection**, REJECT:66-69), `updated_at`, the approval tasks, and the suggestions' `created_by` / `dismissed_by`. Reorder, markup, tier, image and import changes carry no actor at all.
- **Data:** as listed.

### C-49 · No analytics
- **Where:** `src/lib/usage/types.ts:63-77` (feature keys); `src/components/usage/page-view-tracker.tsx:6-22`; grep over `src/app/(main)/accounts/usage`, `src/app/api/usage`, `src/app/api/admin/analytics`, `src/app/api/admin/studios` (no price-book metric); `docs/prd/05-price-book.md:8-13`.
- **Does:** there is no `price_book` feature key and no usage event anywhere in the price-book code; page views store the pathname only (`/accounts`), so time on the Price Book tab cannot be told from any other Accounts tab. Studio Health and Admin › Analytics show nothing about the book, approvals, imports or drift. PRD 05 ticks *"Launch Review — metrics, rollout plan, and dependencies confirmed"* and states no metric.
- **Data:** —

---

## Platform data and cross-studio flows

### C-50 · `platform_market_rates` — seeded, called admin-managed, no admin surface
- **Where:** `supabase/migrations/20260414000003_price_book_v2.sql:40-56` (table, `UNIQUE(country_code, category, item_description)`, `source` default `'platform'`); `supabase/migrations/20260414000004_seed_market_rates.sql:1-2` (32 SG, 30 MY, 24 AE, 25 IN rows by count); AGG:96-109 (`source: "crowd"`); RATES:2-3 (*"admin-managed"*); grep over `src/app/admin`, `src/app/api/admin` (no reader or writer); `src/app/api/quotes/insights/route.ts:346-355`; `EXE:163-240`; DRIFT:54-57.
- **Does:** Qanvast's own benchmark table, per country, with min / typical / max per described item. It is written only by the seed migration (2025 figures) and by the monthly crowd aggregation (C-51); no admin page edits it. Readers: the price book (denied since 264, C-23), the drift cron, Quote Insights and the X-Ray (service role), and the AI Quote Drafter's second tier. The price-book row's own `market_rate_min` / `market_rate_max` columns have no writer (grep; read by `src/components/leads/price-book-combobox.tsx:344-346`).
- **Data:** `platform_market_rates`.

### C-51 · Crowd signals and `aggregate-rates` — fed by one path, inert below five studios
- **Where:** CROWD:1-106 (`collectQuoteSignals` 45-73 has no caller, grep); PBI:185-194; AGG:1-138 (`MIN_STUDIO_THRESHOLD = 5`, line 10); `supabase/migrations/20260416000003_crowd_rate_signals.sql:1-21`; M264:59; `vercel.json:45-46`.
- **Does:** every edit-route save that carries a positive sell price and a description (every editor Save, C-07) inserts a cross-studio signal — country, category hard-coded *"General"*, the raw description, unit, sell and **cost** price, `source_studio_id` — at most one per studio, description and calendar month; fire-and-forget without `after()`. On the 15th the cron groups 90 days of signals by exact `(country, category, description)` and, where at least five distinct studios share one, upserts P10 / P50 / P90 into `platform_market_rates` with `source 'crowd'`. The table's comment says signals come from "quote saves and price book updates"; quote saves never send one. Every such crowd row lands under category *"General"*. On a fork with fewer than five studios the threshold can never be met, so the signals are collected and never used. No consent or opt-out; cost prices of one studio sit in a platform table; the table is service-role only since 264.
- **Data:** `crowd_rate_signals`; `platform_market_rates`.

### C-52 · `GET /api/cron/price-drift` — the monthly sweep
- **Where:** DRIFT:1-134; `vercel.json:41-42`; `src/proxy.ts:431-444`; C-23.
- **Does:** on the 1st at 10:00 UTC, for every studio of the deployment: active priced items (unpaginated, C-26) are fuzzy-matched to the country's market rates at ≥0.3 similarity and flagged when the sell price is more than 15 % below the minimum or above the maximum (unit mismatch not considered — hand-off B; the cron matches on `description` while the manager's row chips match on `name || description`, `PBM:209-215`, so the two counts can differ); a studio with any flagged item gets one `price_book.drift_detected` notification. No `maxDuration`. Per the proxy comment the edge 401'd this cron until 2026-06-30. Since 264 the link it sends opens a Drift tab that cannot load rates and says *"No market rates available"* (C-23), so the number in the notification cannot be seen anywhere.
- **Data:** reads `studios`, `studio_price_book`, `platform_market_rates`; notification.
- **Words:** *"<n> Price Book Items Need Review"*, *"Unauthorized"*, *"Failed to fetch studios"*, *"Cron job failed"*.

### C-53 · Platform-authored catalogues
- **Where:** `scripts/seed/seed-default-pricebook.mjs:1-26, 134-188`; `scripts/seed/catalogue-sg-default.mjs:1-15`; `scripts/tenants/flo-design/seed-pricebook.mjs:1-31`; `PBM:404-425`; PARSE:42-50.
- **Does:** there is no shared or platform catalogue that studios browse; every row belongs to one studio (NOT NULL `studio_id`, RLS direct). Qanvast-authored prices reach a studio four ways: (1) an operator script copies a 195-item, 16-category Singapore catalogue ("median 2025 SG market rates", "Derived from Flo Design's hand-curated seed") into SG studios with no items (or into one named SG studio), tagged `source='platform-default'`, service role, landing `approved` by default with no SKU, creator or embedding; re-running it for a studio **hard-deletes** all its `platform-default` rows first, including ones the studio has edited since (edits keep the source), and their history; (2) Flo Design's own seed (`source='flo-seed'`, one fixed studio id); (3) the manager's *"Seed from <CC>"*, which copies the market-rate rows through the add route (`source 'market_seed'`, cost = the rate minimum) — unavailable since 264 (C-23); (4) the parse fixture when no AI key is set (C-18).
- **Data:** `studio_price_book`, `studio_quote_categories`.
- **Words:** *"Seed from <CC>"*, *"Seed <n> items from <CC> market rates"*, *"Seeded <n> items from <CC> market rates"*, *"Failed to seed market rates"*.

### C-54 · Forks and tenant-specific schema
- **Where:** `scripts/fleet/registry.mjs:66`; `scripts/fleet/expected-divergence.json:53-60`; `scripts/cleanup/002_dyel_purge_test_demo_data.sql:3-4, 14, 215`; `scripts/cleanup/003_fleet_purge_demo_data.js:130-145`; `docs/superpowers/specs/2026-09-17-vendor-management-design.md:59-70`.
- **Does:** 1.0 runs as a fleet: each tenant fork has its own database, so most isolation between studios is physical and the crowd threshold rarely applies (C-51). The fleet registry records a per-tenant `studio_price_book.cost_price` migration on Ace Design whose source file is git-ignored ("exists on one laptop and in no repository"); the vendor-management spec warns that the migrations folder is not a complete schema history for price-book-adjacent columns. The Dyel purge keeps the studio's 1,609 price-book rows; the fleet purge counts `studio_price_book` per fork.
- **Data:** —

---

## AI and background jobs

### C-55 · Embeddings — which writes produce one
- **Where:** M288:1-13 (`embedding vector(1536)`, HNSW); M289:1-44 (`match_price_book_items`: active, not rejected — pending included — distance ≤0.35); `src/lib/quote-agent/price-book-embeddings.ts:7-26`; `src/lib/ai.ts:463, 468-493` (`openai/text-embedding-3-small` through OpenRouter); PB:258-279; PBI:120-125; `scripts/quote-agent/backfill-price-book-embeddings.mjs:1-40`; `src/__tests__/price-book-embedding-fanout.test.ts:18-45`.
- **Does:** since 2026-08-21 each item can carry an embedding of its description for the AI Quote Drafter. The add route embeds after the response, five at a time, inside `after()` — its comment explains that an unawaited call "may never actually run to completion" on Vercel. The edit route re-embeds on a description change (every editor Save, C-07) as exactly such an unawaited call. Suggestion promotions, both import routes, the seed scripts and every row older than 2026-08-21 get none until the row is re-saved in the editor or an operator runs the backfill with a project's service-role key. Items without one are invisible to the drafter's first tier, which then prices them from market rates or the web (C-56). Each embedding sends the description to OpenRouter.
- **Data:** `studio_price_book.embedding`.

### C-56 · The AI Quote Drafter reads the book; the fallback draft too
- **Where:** EXE:18-48, 72-97, 163-240, 342-387, 473-570; `src/lib/quote-agent/tools.ts:66, 170`; `src/lib/quote-agent/fallback.ts:60-95`; M290:29.
- **Does:** the quote chat's `search_pricebook` resolves each query in order: the studio's book by embedding (service role, studio id from the session context), platform market rates by token match, a paid web search (at most five per call), else *needs pricing*. A drafted line that cites a price-book id is re-priced from that row before it lands, the model's own figure kept only as a logged discrepancy (EXE:473-570). The deterministic fallback draft takes up to 200 active rows and uses the book when it holds at least ten. Reads only — the drafter never writes the book, and its lines carry `source` values (`ai_drafted`, `market_rate`, `web_estimated`, `needs_pricing`, M290:29) rather than a book link unless the model passes one.
- **Data:** reads `studio_price_book`, `platform_market_rates`.
- **Words:** *"Searching price book…"*; the tool summary *"Searched price book · <n> queries · <r> resolved, <u> unresolved"*.

### C-57 · Quote chat's price-book index
- **Where:** `src/app/api/quotes/chat/route.ts:24-26, 51-80`.
- **Does:** each chat request (10 per minute per IP) reads every row of the book — no active or approval filter, one page (C-26) — and builds per-category counts with three sample descriptions for the system prompt, so archived and rejected items are described to the model as part of the catalogue.
- **Data:** reads `studio_price_book`, `studio_quote_categories`.
- **Words:** *"Rate limit exceeded. Try again shortly."*

### C-58 · AI cost, limits and keys
- **Where:** PARSE:13-17, 38-40; `src/lib/ai.ts:463`; EXE:342-347; C-04 (no price-book route imports `src/lib/rate-limit`, grep); no `maxDuration` in any price-book route or cron (grep).
- **Does:** one Gemini 2.5 Flash call per parsed document ("~$0.001–$0.005 per file" by the route's own note), one embedding per added or re-saved item, up to five web searches per drafter call — all on the platform's single OpenRouter key, attributed to no studio or member, with no quota, credit or plan check (the repository has no plan gate, XR C-25). The parse route has a 60 s abort but no declared function duration.
- **Data:** —

### C-59 · Suggestion scans after a parse, a draft or a meeting brief
- **Where:** `QDD:891-913, 954, 3376, 10268-10269`; `src/components/copilot/meeting-brief.tsx:400-419, 977-978`; SCAN; NIM; grep over `src/components/quote-xray`, `src/app/api/quote-xrays`, `src/lib/quote-xray` (no scan).
- **Does:** three moments start a scan: the digitizer after an upload is parsed (`pdf_parse`), after an AI draft is autosaved (`ai_generation`), and the meeting brief after it creates a quote (`copilot`). Matches are linked to book rows without asking; unknown lines open *"New items found — add to your price book?"* for whoever triggered it, whatever their role. The Quote X-Ray never feeds it (the training script says reading a competitor's quote does, C-74).
- **Data:** `quote_line_items.price_book_item_id`; `price_book_suggestions`.

### C-60 · Quote-side readers that match against the book
- **Where:** `src/app/api/quotes/line-items/route.ts:368-400`; `src/app/api/quotes/auto-match/route.ts:48-61, 92`; `src/components/leads/quote-row.tsx:251-258, 576-580`; M289:1-12 (comment).
- **Does:** saving quote lines fills cost, waste, cost type, vendor and the book link on priced lines that have no cost, from active rows (scoped, one page); the auto-match route does the same kind of match with the service role and takes `vendor_ids[0]` as the PO pre-fill vendor. Neither looks at `approval_status`: pending items are used everywhere, which the migration-289 comment calls the intent of 114 ("items stay usable while awaiting approval"). Only the quote row reads it, to show *"Library item rejected"* on lines linked to a rejected item — an item that an archive-only restore has made active again still carries the flag (C-07).
- **Data:** reads `studio_price_book`.
- **Words:** *"Library item rejected"*, *"The linked price-book item was rejected — its prices may be stale. Re-pick from the library."*

---

## Integrations and neighbours

### C-61 · Vendors — shared with finance
- **Where:** `src/app/api/vendors/records/route.ts:1-80`; `src/app/api/vendors/records/[id]/route.ts:50, 74, 121-122`; `src/components/finance/vendor-detail-drawer.tsx:89, 211`; `src/app/api/vendors/records/[id]/merge/route.ts:71-80, 173, 244`; M313:17-19, 176-230, 293; `PBM:1171-1206`; IMPORT:84-120; `src/components/leads/browse-price-book-modal.tsx:83, 233`; AS D-05 note 4.
- **Does:** items name suppliers from Finance's `vendors` directory through `vendor_ids[]` plus the deprecated scalar mirror; the first one becomes a quote line's vendor and then a PO's pre-fill. The AI import auto-creates a vendor as a *supplier* through `POST /api/vendors/records` (session only — bank fields need `vendors.edit` — with a server-side name dedupe, `src/app/api/vendors/records/route.ts:112-170`); IMPORT creates one straight in the table with the service role. A vendor's default markup is edited in Finance › Vendors since 2026-09-17 and offered by the markup dialog. Merging two vendors (`vendors.merge`) re-points both item columns inside one `SECURITY DEFINER` function and writes no price-book history. The manager's vendor list comes from `GET /api/vendors/records`, which checks only the session and strips bank fields without `vendors.edit`.
- **Data:** `vendors`; `studio_price_book.vendor_id`, `vendor_ids`.

### C-62 · Packages, quote rules, project materials — ids a delete leaves behind
- **Where:** `scripts/migrations/305_package_items_pricebook_vendor.sql:5-9, 117-119`; `src/app/api/quote-generation-rules/records/route.ts:24, 43`; `src/app/(main)/accounts/quote-rules-tab.tsx:80-90`; `src/app/api/projects/[id]/materials/route.ts:100-112, 219-220`; DEL:12-18.
- **Does:** four neighbours copy an item's values and keep its id: package items (link + vendor since 2026-09-11), quote-generation rules (id plus a price copied at pick time in cents), quote lines (a soft `price_book_item_id`, used to build a project's materials list) and suggestions (`added_to_price_book_id`). None is re-priced when the book changes; all keep the id after a hard delete. The delete dialog mentions quotes only.
- **Data:** `studio_assemblies.items`, `quote_generation_rules`, `quote_line_items.price_book_item_id`, `price_book_suggestions.added_to_price_book_id`.

### C-63 · The `price-book-images` bucket
- **Where:** M111:1-20; M232:1-40; M233:19-22; IMG:51-70; `docs/security/2026-06-27-residual-findings-followup.md:15-24`.
- **Does:** created by hand in production, formalised by 111 as a **public** bucket; writes have been service-role only since 232 dropped every non-SELECT storage policy; 233 kept it public on purpose. Files sit at a guessable `<studioId>/<itemId>-<ms>.<ext>` and the public URL is stored on the row. The security follow-up lists it as a residual ("internal product images") with the fix "set public=false … createSignedUrl", not done at HEAD. Replaced images are never deleted.
- **Data:** storage `price-book-images`.

### C-64 · What is not there
- **Where:** grep over `src/lib/accounting`, `src/app/api/finance/accounting`, `src/app/api/cron/accounting-sync` (no price-book reference); `docs/openmaison-v1-feature-requirements.csv:58`; grep over `src/app/my`, `src/app/api/homeowner`, `src/app/sign`, `src/app/api/sign`, `src/app/api/portal`, `src/app/pay`, `src/app/api/po` (none); `src/lib/agents/tools.ts:1520-1540, 1674`; `src/data/copilot-checklists.ts:86-90`; `src/components/copilot/panels/recommended-addons-panel.tsx:11-19`; XR C-25.
- **Does:** no supplier feed or supplier API; no accounting "items" sync; no marketplace catalogue (the sheet's *"Your Vendors - MRC"* maps to no code); no homeowner-portal, signing, payment or PO-portal surface reads the book; mAIson has no price-book tool (its `benchmark_quote` compares a quote with market rates); the meeting copilot's *"Recommended Add-ons"* panel — described as *"Scope completion suggestions from your Price Book"* — works from the meeting's shadow quote items; no plan, credit or quota gate; no per-studio switch to turn the price book or its approval off (only the whole Accounts page's visibility key, C-37).
- **Data:** —
- **Words:** *"Recommended Add-ons"*, *"Scope completion suggestions from your Price Book to increase project value"*.

### C-65 · Settings that touch the price book
- **Where:** `src/app/api/studio-config/features/route.ts:36-53, 82, 100-119, 141`; `src/app/(main)/accounts/feature-flags-tab.tsx:116-121`; `docs/rules/leads.md:915-923`; C-41; C-44; `ACC:607`; `src/types/app.ts:622`; DRIFT:11; `PBM:43`; `src/lib/queries/price-book.ts:23`; DTAB:25; `src/components/accounts/price-drift-summary.tsx:28`; PB:189; BULK:197.
- **Does:** `priceBookSubcategoryInQuote` (default on; off stops the Browse picker carrying an item's sub-category onto quote lines) — any member can flip it, the features route gates only the manager-hierarchy key. The approver list (C-41) and the `pricing` notification preferences (C-44). `settings.catalogueFiles`, the El Arte vendor-catalogue store, is read into a variable and never rendered. Not settings, but hard-coded: the ±15 % drift threshold (five copies) and the `PB-` + three-digit SKU pattern.
- **Data:** `studios.settings.features.price_book_subcategory_in_quote`, `workflow.approvers`, `catalogue_files`.
- **Words:** *"Carry price-book subcategories onto quotes"*, *"On by default. When an item is added from the price book, its subcategory becomes a subsection heading on the quote and in the PDF. Turn this off if you use subcategories as room tags — the rooms stay searchable in the price book but stop appearing on the client's quote."*

---

## Tests

### C-66 · What the tests pin, and what they don't
- **Where:** `src/__tests__/customization-p2.test.ts:188-215, 335-350` (`describe.skip`); `src/__tests__/studio-config-scoped-api.test.ts:128-131, 251-266`; `src/__tests__/price-book-suggestions-scoped-api.test.ts:85-120`; `src/__tests__/price-book-parser.test.ts:175-240, 286-330`; `src/__tests__/price-book-embedding-fanout.test.ts:18-45`; `src/__tests__/quote-agent-price-book-embeddings.test.ts:20-40`; `src/__tests__/quote-agent-migration-288.test.ts:4`; `src/__tests__/quote-agent-search-cascade.test.ts:208`; `src/__tests__/quote-agent-price-verification.test.ts:32-71`; `src/__tests__/h2-multi-vendor.test.ts:10-50`; `src/__tests__/unit-cost-label.test.ts:47-80`; `src/__tests__/notifications.test.ts:98-100`; `src/__tests__/team-settings-role-display.test.ts:94-128`; `src/__tests__/vendor-merge-preview.test.ts:170`; `src/__tests__/audit-bug-regression.test.ts:462`; `src/__tests__/migration-305-package-item-keys.test.ts:66`; `e2e/accounts-exhaustive-walk.spec.ts:30`; `e2e/accounts-role-based-walk.spec.ts:1-60`; `e2e/uat/17-csv-import.spec.ts:1-240`; `e2e/quote-subcat-pricebook.spec.ts:38-148`.
- **Does:** **pinned** — by source regex, that the add and edit routes call `resolveCanPerformAction(rp, memberTags, "pricebook", "edit")` and return 403, that the manager and the quote editor test `canEditPriceBook`; history GET's 401 / 400 / list; pending suggestions' 401 and studio scoping; the parse route's *shape* (session, inputs, MIME list, DRY_RUN guard, model, retries, 413, response keys — and, as an expected string, the read of `studio_price_book_categories`); the add route's `after()` fan-out; the embedding helper never throwing; the drafter's tiers and re-pricing; multi-vendor columns and save path; the export's *"Unit Cost"* header; the three approval event names (drift is not in the list); `manager` never changing `pricebook.edit`; vendor-merge counting; package items keeping the book id. The e2e walks load the catalogue tab as an `{admin, id}` member (resolved as admin) — no pure designer or accountant — and ignore 401 console errors.
- **Not covered:** approve, reject, delete and notify-pending behaviour; the edit route's approval state machine, tasks and approver choice; every ungated writer (reorder, markup, tiers, image, both imports, bulk, scan); the export's row cap; parse behaviour beyond its text; the market-rate route and its denial since 264; the drift and aggregate crons; crowd signals; history accuracy; notification recipients and copy; RLS (checked live by `scripts/security/check-rls-coverage.js`, not by tests). Most pins read source text, so they stay green while behaviour moves — the parse test would fail if the missing-table read were fixed.
- **Data:** —

---

## Docs vs code

Docs that describe the price book: `docs/prd/05-price-book.md` (+ `docs/prd/README.md:15`), `docs/prd/02-studio-customization.md`, `docs/features/studio-customization/{requirements.csv,spec-vj.md}`, `docs/openmaison-v1-feature-requirements.csv`, `docs/user-stories/{quotes-module,marketplace,tasks}.md`, `docs/uat/*` (TC-2.2), `docs/superpowers/specs/2026-05-27-elarte-pricebook-onboarding-design.md`, `docs/superpowers/specs/2026-08-21-ai-quote-drafter-grounding-redesign-design.md`, `docs/superpowers/specs/2026-09-17-vendor-management-design.md`, `docs/security/2026-06-27-residual-findings-followup.md`, `docs/rules/{leads,notifications,architecture,database-auth}.md`, `docs/demos/QUOTE-DIGITIZER-TRAINING-SCRIPT.md`. `CLAUDE.md` and `README.md` do not mention it.

### C-67 · PRD 05 (`docs/prd/05-price-book.md`)
- **Where:** `docs/prd/05-price-book.md:1-72`.
- **Does:** the doc says — *Launched*, last updated 2026-06-12; "Admins want to own pricing and stop designers editing it ad hoc"; a four-tab workspace with approval and drift; "Multi-vendor: … per-line vendor picking in the quote editor, and a competitor benchmark per line item"; "Access control: price-book edit gated behind the `pricebook.edit` permission (admin-owned)"; "designers are read-only unless granted `pricebook.edit`"; "Drift review: … admin applies the suggested update"; "paginated fetches and chunked tier/vendor lookups"; "Concurrent edits → time-of-check/time-of-use race handled in the backend"; Launch Review with "metrics … confirmed".
- **Code:** the gate covers add and edit; approve, reject and delete are tag checks; every other writer — reorder, vendor markup, tiers, image upload, both imports, suggestion scan and promotion, the category upserts — checks only the session (C-04, C-40); designers reorder, re-categorise, replace images and add pending items without it, and on most studios nobody can grant it from the UI (C-34); no competitor price per line exists in the price-book or quote-line code (grep "competitor" over `src/components/leads`, `accounts`, `price-book` finds only the lead inactivation dialog); the Drift workspace has had no rates since 264 (C-23); only the list is paginated (C-26); the TOCTOU fix is the `(id, studio_id)` lookup in approve / reject / delete, while the SKU sequence and the read-then-write approval remain racy (C-27, C-07); no metric exists (C-49). Silent on suggestions, AI parse, imports, tasks, notifications, history and crowd signals.

### C-68 · PRD 02 and the customization requirements
- **Where:** `docs/prd/02-studio-customization.md:24, 34, 48`; `docs/features/studio-customization/requirements.csv:10, 16, 32, 34, 50, 67`; `docs/features/studio-customization/spec-vj.md:27-36, 65-79`.
- **Does:** PRD 02 lists "an admin to own the price book" and an action slug gating "price-book edit" — true for add / edit (C-33). Requirement A2 (Ace Designs, *"Pricebook changes have to be done via Admin"*, "id role denied pricebook.edit on studio_price_book") still reads *UAT Pending*, as do E7 / NF6 (images); H2 (multi-vendor) reads *In scope* though migration 135 shipped it. The multi-vendor spec keeps the scalar `vendor_id` "for one cycle, then drop"; it is still written, and vendor markup still filters on it alone (C-09). El Arte's "Help create a price book" is out of scope (service work).

### C-69 · The v1 feature-requirements sheet
- **Where:** `docs/openmaison-v1-feature-requirements.csv:14-16, 31, 33, 58, 69`.
- **Does:** row 16 — approve and trust keyed on the literal tag, and "a granted-but-not-tag-literal Designer sees a Delete button the server will always 403" — holds (C-35); "Accounting · Same view-only access as Designer" — accountants reach the page by URL only and can promote suggestions (C-38, C-22). Row 33 — "drag-reorder, bulk archive/restore, and vendor-markup application are NOT gated … a view-only role can still reorder/bulk-action rows": reorder and markup hold; bulk archive / restore are offered but refused by the edit route (C-40); "full change history with field-level diffs" overstates C-47; "monthly price-drift cron with a review queue" — the queue has been empty since 264. Row 31 — a price-book approver list "with no on/off switch", not role-gated — holds (C-41). Row 58 — the markup endpoint has "NO server-side permission check" — holds (C-09). Row 69 — lists a "price-book search tool" among mAIson's tools; mAIson has none, `search_pricebook` belongs to the quote chat's drafter (C-56, C-64). Rows 14-15 — drafts grounded in the price book with a fallback that prefers book items — hold (C-56).

### C-70 · User stories
- **Where:** `docs/user-stories/quotes-module.md:216-222`; `docs/user-stories/marketplace.md:37-54`; `docs/user-stories/tasks.md:62, 98, 100`.
- **Does:** quotes-module: a designer's promoted item "stays invisible in the live catalogue … until Owner/Admin approves it" — pending items are listed under Items and used by every quote reader and the drafter (C-60), and the approver's e-mail says *"The item is already usable in quotes"*; the read-only banner and hidden book icon hold. marketplace: "no UI anywhere in the app actually writes that [vendor default markup] value today" — Finance › Vendors writes it since 2026-09-17 (the stories date from 2026-07-22); the Drift tab and one-click seed — empty / hidden since 264 (C-23); the monthly alert "to Studio Owner/Admin … Interior Designer/Accounting never receive" — recipients are the studio's `pricing` roles, owners only on studios created after 112 (C-44). tasks: bulk approve "to clear an import queue" — owner / admin imports are approved on insert and raise no task (C-42).

### C-71 · UAT documents (TC-2.2)
- **Where:** `docs/uat/customization-phase-1-uat.md:107-116`; `docs/uat/2026-05-07-customization-rollup/findings.md:40-41, 68, 277`; `docs/uat/customization-engine-phase2.md:240-242`.
- **Does:** TC-2.2 expects a red banner reading *"You don't have permission to edit the price book."* — that sentence is the API's 403; the banner reads *"Read-only — only owners/admins can edit the price book."* The rollup records "Marcus sees /accounts → only Price Book (read-only)" and "`?tab=legal-entities` URL ignored; only Price Book tab shown" — true on 2026-05-07, undone on 2026-05-15 (C-37). The phase-2 plan's CSV import from Quote Categories still lands items (with prices ×100, AS D-14).

### C-72 · The El Arte onboarding spec
- **Where:** `docs/superpowers/specs/2026-05-27-elarte-pricebook-onboarding-design.md:1-60`; `ls scripts/tenants` (only `flo-design`); `ls "src/app/(main)/accounts"`; `ACC:607`.
- **Does:** the spec relies on "The existing `/accounts/price-book` 4-tab interface (Items / Approvals / Drift / Categories)" — there is no such route and the tabs are Items · Pending · Drift · Imports at `/accounts?tab=catalogue`; "Approved rows become draftable" — pending rows are draftable too (C-60); three scripts "under `scripts/tenants/elarte/`" and a `vendor-catalogue` bucket — neither exists in the repository (grep), and `settings.catalogue_files` is never rendered (C-65).

### C-73 · The AI Quote Drafter grounding spec
- **Where:** `docs/superpowers/specs/2026-08-21-ai-quote-drafter-grounding-redesign-design.md:56-60, 66-69, 108-109, 130`; `EXE:88-97, 226-236`; `src/lib/ai.ts:463`.
- **Does:** "Generate an embedding whenever a price-book item is created or edited" — two of six write paths do (C-55); "A failed query-embedding call at search time: retry once" — no retry, it falls through; "default recommendation: Google's embedding model" — `openai/text-embedding-3-small`; market rates "scoped by region + category" and "currently only consumed by Quote Insights/X-Ray" — the executor deliberately drops the category filter, and the price book, its drift cron and the drafter read the table too.

### C-74 · Rules docs, the training script, the copilot checklist, the vendor spec
- **Where:** `docs/rules/notifications.md:3, 24-44, 62`; `docs/rules/architecture.md:224`; `docs/rules/leads.md:915-923`; `docs/demos/QUOTE-DIGITIZER-TRAINING-SCRIPT.md:67-75`; `src/data/copilot-checklists.ts:86-90`; `docs/superpowers/specs/2026-09-17-vendor-management-design.md:280-285`.
- **Does:** the notifications rules say "All 17 event types are wired" and list none of the four `price_book.*` events; they count "9 React Email base templates (one per category)" — there are ten, `pricing.ts` included. The architecture table marks Accounts owner-only (AS D-37). The sub-category flag doc holds (C-65). The training script says "when the AI reads a competitor's quote, it auto-suggests adding those items to your price book" — suggestions come from the studio's own parsed uploads, AI drafts and meeting briefs (C-59). The copilot checklist promises add-ons "from your Price Book" (C-64). The vendor spec says the vendor fallback "mirrors `pricebook`: owner / admin / accounting get all four" — the price-book fallback gives accounting `view` only (AC:281-285).

### C-75 · Comments in code that no longer hold
- **Where:** as cited.
- **Does:** (1) PB:6-8, PBI:6-9, REORDER:5-6, MARKUP:5-6, TIERS:5-8 — the price book "NOT locked … DEFERRED": locked by 226 (C-29). (2) RATES:2-8 — "admin-managed … it is NOT locked": service-role only since 264, the route is denied (C-23). (3) `src/app/api/quotes/categories/resolve/route.ts:10-12` — categories "not yet RLS-locked": M226:56. (4) BULK:6-9 and NIM:8-10 — promotion mirrors / goes through `useAddPriceBookItems` (C-25). (5) BULK:254-257, NOTIFY:55-59 — the approver "owner first", and fixed recipients "stop" the fan-out (C-41, C-44). (6) M160:1-31 — the pinned approver column's writers and readers (C-41). (7) `src/lib/notifications/templates/render.ts:137-139` — base templates escape every variable (C-45). (8) CROWD:4-6 and `supabase/migrations/20260416000003_crowd_rate_signals.sql:2` — signals from "quote saves" (C-51). (9) DEL:20-21 — "IDs can only archive": a designer fails the edit gate and cannot archive either. (10) AC:123-125 — tabs filtered to a viewable subset (C-37). (11) `src/components/layout/topbar.tsx:494-501` — reachable "via direct URL / sidebar" (C-38). (12) `src/components/leads/price-book-modal.tsx:19-21, 36` — "so designers can add/edit items inline" (the icon is hidden from them) and "Changes apply to this quote immediately" (book changes never re-price existing lines, DEL:12-16). (13) PBI:120-121 — "re-embed on description change only" (C-07). (14) PEND:19-22 — the rejected-item warning "lives in Phase 6": it exists (C-60). (15) `src/lib/accounting/permission-gate.ts:66-72` — member overrides in the chain (C-36). (16) `PBM:1075-1078` — pending items "need your review before they show up in the Items library", against PRICING:21 *"already usable in quotes"* and the Items list showing them (C-60). (17) `TASKS:713-715` — bulk approve for "a CSV-import queue" (C-42). (18) `src/components/accounts/vendor-markup-dialog.tsx` (sr-only description) — markup applied "to all price book items linked to a specific vendor": first-vendor items only (C-09). (19) DEL:9-18 — the cascade note omits packages, quote rules and the open approval task (C-62, C-42). (20) `src/app/admin/studios/[id]/page.tsx:119, 141` — the access matrix "mirrors … ROUTE_ACCESS" yet lists Accounts Setup as owner-only (C-37).
- **Data:** —
- **Words:** as quoted.

---

## Uncertain / not verified

1. **The market-rate route's denial** (C-23, C-52): read from migration 264, the route's scoped client and the X-Ray's own comment; not observed on any environment, and 264 skips a table that does not exist on a fork.
2. **`studio_price_book_categories`** (C-18): absent from every migration, type and other file in the repository; whether a live database carries such a table (hand-made) was not checked.
3. **The 1,000-row cap** (C-26, C-27): the figure is the code's own comment (PB:62); each project's PostgREST `max_rows` was not read.
4. **Migration 215 and the insert fallbacks** (C-28): whether any environment lacks `subcategory` or another listed column, which decides whether adds silently land approved, was not checked (QE D-09 records 215 as off-HEAD).
5. **Editable role rows** (C-34): whether any studio's rows came from the Roles screen's auto-seed (`is_system` false) — the only UI route to a "granted designer" — is data, not code.
6. **Notification preference rows** (C-44): which studios hold `pricing` rows, and with which roles, per fork.
7. **Cross-studio ids** (C-31): relies on Postgres checking foreign keys without RLS and on the service-role export join; not exercised.
8. **The suggestion batch failure** (C-21): inferred from a multi-row INSERT being one statement and the lifetime-unique index; not exercised.
9. **Cron execution per fork** (C-51, C-52): whether each fork runs Vercel crons, when the deny-by-default edge began blocking them before the 2026-06-30 fix, and whether a sweep finishes within the default function duration (no `maxDuration`) were not measured.
10. **Embedding coverage** (C-55): how many rows per fork lack an embedding (backfill runs are operator actions) is not visible.
11. **Book sizes** (C-26): Dyel's 1,609 and El Arte's 6,338 rows come from script comments, not queries.
12. **E-mail injection** (C-45): unescaped interpolation read from code; rendering by mail clients not tested.
13. **E2E runs** (C-66): whether the Accounts walks run against a database with 264 (they would log the market-rate 500) is not known.
14. **The Tasks inbox scope**: which members see another member's `PriceBookItemApproval` task was not traced (the approve / reject routes gate by tag regardless).
