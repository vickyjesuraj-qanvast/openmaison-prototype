# Package K1 — Finance and vendors — outcome (2026-10-08)

Checks run: `npx tsc --noEmit -p .` clean; `npx eslint` on every file below clean; `npm run design:lint` — nothing new. No build, no server,
no browser, no DB writes, no migrations. Staged register rows: `reg-K1.md` (K1.1 N-01 · K1.2 N-09 · K1.3 N-16). One optional repair (below).

## N-01 — Finance is the work only

**Files**
- `lib/finance/sections.ts` — the `pipeline` tab removed from `FINANCE_TABS`; `BOOKS_TABS` = overview · commissions · accounting; the
  Overview's (unseen) `help` reads "Money to verify and what is stuck". Overview stays first → still the Owners'/Admins' landing tab.
- `app/company/finance/pipeline/page.tsx` (new) — `redirect(keepQuery('/company/reports/finance?report=profitability', searchParams))`; a
  static segment beside `[tab]` with no `loading.tsx`, so a real 307. `/finance/pipeline` → `/company/finance/pipeline` (REG-1360's
  redirect) → Profitability.
- `components/finance/books/pipeline-view.tsx` — **deleted** (its `STAGE_WORDS` export had no other reader; `lib/finance/reports.ts` keeps
  its own).
- `components/finance/books/books-workspace.tsx` — no Pipeline branch.
- `components/finance/books/overview-view.tsx` — only **Money to verify** and **Stuck** (the Working capital tiles and "What the numbers
  say" removed, with their sums and imports).
- `components/finance/books/books-ghost.tsx` — Overview ghost = the two tables (help lines = the page's own words, for `Words`); the
  Pipeline ghost removed; (N-09) the Accounting ghost's button slot 140 → 220.
- Comments only: `app/company/finance/[tab]/page.tsx`, `lib/finance/books.ts`, `lib/finance/profit.ts`.

**Verify (browser)** — as Dane (Owner), 1440 and 390: `/company/finance` lands on Overview; the tab strip has no Pipeline; Overview shows
Money to verify then Stuck, nothing above; the loader and the reveal draw the same two tables (`verify-ghosts-same` style, the Overview
route). `/company/finance/pipeline?x=1` and `/finance/pipeline` → `/company/reports/finance?report=profitability` (Profitability chip on,
"By project" table). As a Designer (Germaine): `/company/finance` → Purchase orders; `/company/finance/pipeline` → Reports' Finance gate.

**Probe** — `design-source/verify/projects/verify-pj-gap-f2.cjs` (header + §1, §2, §10):
- §1: the working-capital tiles and `books-insights` assertions replaced by "the Overview has no working capital and no 'what the numbers
  say'" (`books-working-capital` / `books-insights` count 0).
- §2 (was Pipeline's tiles / chips / margins): no Pipeline tab in `[aria-label="Finance sections"]`; `/company/finance/pipeline` and
  `/finance/pipeline` answer 307/308; landing on `?report=profitability` with `report-head` "Profitability" and `report-table-projects`
  holding P-2026-001 with a margin in words.
- §10 phone loop: `pipeline` → `/company/reports/finance?report=profitability`; `/company/integrations` added (N-09).

## N-09 — Xero's live card in Company › Integrations

**Files**
- `lib/finance/xero.ts` — `XeroStatus` (connected · connectedAt · by (name) · lastSyncAt), client-safe.
- `lib/finance/xero-server.ts` — `fetchXeroStatus()` (settings `xero` + the connecting member's name).
- `app/company/integrations/page.tsx` — loads `fetchXeroStatus()`, passes `xero`.
- `components/company/integrations-view.tsx` — the **Xero** card (`id="xero"`, `data-testid="int-xero"`, after Email lead sources, before
  Coming): chip Connected / Not connected; Accounting's help paragraph + (Owners/Admins) "The organisations, the accounts and tax codes and
  the sync log are in Finance › Accounting." (HelpLink, `int-xero-open`); connected → `int-xero-line` "Connected {when} by {who} · Last
  sync: …" + **Disconnect** (`int-xero-disconnect`); not connected → "Xero is not connected" + hint + **Connect Xero** (`int-xero-connect`);
  others read "An Owner or an Admin connects Xero." Actions = `connectXero` / `disconnectXero` (they already revalidate
  `/company/integrations`); refusals through `couldnt(refusalOf(…))`. Connect's snackbar: "Xero connected — accounts and tax codes mapped"
  · **Open Accounting**; Disconnect's: "Xero disconnected — the sync log stays" (Accounting's words). Xero's row left *Coming*.
- `components/finance/books/accounting-view.tsx` — no Connect / Disconnect of its own: not connected → hint "Connect it in Company ›
  Integrations; the accounts and tax codes are mapped for you." + **Connect in Integrations** (`xero-connect`, pushes
  `/company/integrations?from=/company/finance/accounting#xero`); connected → the help ends "Its connection is in Company › Integrations."
  (HelpLink `xero-integrations-link`); Sync now, Push automatically, Organisations, mapping, Waiting to push, Sync log unchanged.
- `app/finance/xero-actions.ts` — comment only.
- `IntegrationsGhost` (`components/company/company-ghosts.tsx`) — **unchanged**: it draws the cards to the fold (Qanvast · Website form ·
  Meta · Webhooks) and already leaves out Email lead sources and Coming; the Xero card sits between those two, below the fold at 1440 and 390.

**Verify (browser)** — Dane, 1440 + 390: `/company/integrations` → Xero card "Not connected" + Connect Xero; press → chip Connected, the
line "Connected … by Dane … · Not yet synced", the snackbar's Open Accounting lands on Accounting (mapped, Sync now works); back on
Integrations, Disconnect → Not connected, Accounting keeps its sync log. Coming lists Google Calendar and Zoho Books only.
`/company/finance/accounting` not connected → Connect in Integrations → Integrations scrolled to `#xero`, Back returns to Accounting.
As a Designer (Germaine): Integrations' Xero card is read-only ("An Owner or an Admin connects Xero.", no Finance › Accounting link).
Reset the scratch DB's `settings` key `xero` after.

**Probe** — `verify-pj-gap-f2.cjs` §7: Accounting reads Not connected with no Disconnect; its `xero-connect` door opens
`/company/integrations?from=%2Fcompany%2Ffinance%2Faccounting`; Xero is not in the Coming card; `int-xero-connect` connects ("by Dane");
Accounting reads Connected + `xero-map`; sync as before; `int-xero-disconnect` on Integrations; Accounting still shows `xero-log`.
(Cleanup already deletes `xero_links`, `xero_sync_log` and the `xero` setting.)

## N-16 — one vendor list

**Files**
- `lib/finance/model.ts` — `VendorName`, `vendorNameOf`, `byVendorName`, `findVendor` (by F1's `nameKey`), `vendorMatches` (name or trade),
  `spellVendor` (the directory's spelling, else as typed).
- `app/finance/read-actions.ts` — `vendorDirectory()`: active, unmerged vendors (id · name · trade), by name.
- `components/finance/use-vendor-directory.ts` (new) — loads the directory once `on`; `add(name)` → `createVendor({ name })` (F1-Q4: anyone
  adds; a twin is refused by the server) → the list updated.
- `components/finance/vendor-name-field.tsx` (new) — the house `TextField` (text, combobox) + `PortalMenu` of `DropdownItem`s under the box:
  matches (trade as meta, the current one marked), then **Add {name} as a vendor** for a name the directory lacks; ↓ into the rows, Esc
  closes, a press keeps the caret in the field. Refused → snackbar `Couldn’t add the vendor — {rule}`, the name stays as typed.
- `components/company/price-book/item-dialog.tsx` — the Vendor field is `VendorNameField` (`data-testid="item-vendor"`, same label and
  helper); the directory loads while the dialog is open and not read-only; Save spells the vendor as the directory does (`spellVendor`).
- `components/quotes/editor/items/vendor-menu.tsx` (new) — `VendorDirectoryContext` + `VendorMenu` (the cell's menu: the searchable list's
  search box at its head — `text-field.module.css` `.menuSearch`, Enter takes the first match or adds, ↓ into the rows — the directory with
  trades, the line's own kept-as-typed name marked, **Add {name} as a vendor** / **Add vendor**, Clear; `MENU_WIDTH.detail`, sheet title
  "Vendor/Sub").
- `components/quotes/editor/items/item-row.tsx` — the vendor cell opens `VendorMenu`; `RowHandlers.onAddLabel` takes an optional `name`.
- `components/quotes/editor/items/items-section.tsx` — `useVendorDirectory(true)` + `VendorDirectoryContext.Provider`; `usedLabels.vendors`
  = the directory's names, then the names this quote's lines carry that it lacks (My Items' list and the quote's saved vendor labels no longer
  feed it); `addVendor(name, itemId)` (a known name → its spelling; else onto the line at once, into the directory, refused → kept + why);
  `onAddLabel('vendor', id, name)` and the Add vendor name dialog both go through it.
- `components/quotes/editor/items/item-cards.tsx` — the phone sheet's Vendor/Sub select is `searchable`.
- Not changed: `lib/company/price-book.ts`, `app/company/price-book-actions.ts`, `app/quotes/items-actions.ts` (the spelling is settled in
  the browser; vendors stay words on the rows — no schema change). Renaming / merging a vendor already rewrites exact names
  (`updateVendor` · merge, F1-Q4).

**Verify (browser)** — Dane and Germaine, 1440 + 390:
- Company › Price book › New item (and Edit): focus Vendor → the directory with trades; type "floor" → Floor Xpert Pte Ltd; pick it; type a
  new name → "Add {name} as a vendor" → snackbar "{name} is in the directory", Finance › Vendors lists it; type a name and save without adding
  → kept as typed; type "floor xpert" and save → stored as "Floor Xpert Pte Ltd". A read-only item (Designer on a live item) — no list.
- A quote's Items, Vendor/Sub column on (Column settings): the cell's menu shows the search box and the directory; type → narrows; Enter
  picks; type a new name → Add … as a vendor → on the line and in Vendors; Add vendor → name dialog → same; Clear. 768 touch and the
  phone's line sheet (searchable select, "Add new…"); Set value › Vendor/Sub lists the directory.
- Esc closes the menu only (not the item dialog).

**Probe** — `design-source/verify/quote-editor-parity/verify-qe-r1.cjs` (header + two vendor steps): the menu lists every active, unmerged
vendor in the directory (SQL); typing "Hafary" picks it (if the directory holds it) or *Add Hafary as a vendor*; the line stores Hafary and
the directory holds it; Add vendor → "Kim Hock Builders" lands on the line and in `vendors`, offered on reopening. Later steps (undo keeps
Hafary, Preview prints no vendor, the phone sheet reads Hafary) are unchanged. Price book probes: none type in the item dialog's Vendor
(`verify-pb-r4` uses the Filters' Vendor facet and Set vendor — unchanged).

## Needs from others

- `scripts/design-anatomy.mjs:39` — ROUTES still lists `/company/finance/pipeline` (now a redirect to Reports, measured twice): drop
  `'pipeline'` from that list (orchestrator).
- `lib/settings/permissions.ts:241` — *Who may do what* row "See a project’s profit and margin, and Finance’s overview, pipeline and
  reports": suggest "…and Finance’s overview and Company › Reports" (N-01; the Settings › Studio owner).
- `lib/company/sections.ts:21` — the Company panel's Finance row help "Purchase orders, bills, expenses, commission and reports" names
  reports (REG-1361 leftover): suggest "Purchase orders, bills, expenses, payments out and commission" (the sections.ts owner).
- ⌘K (K3): done by K3 — Profitability row (N-01) and "Xero" → `/company/integrations#xero` (N-09); the card carries `id="xero"`.
- Not in my scope, left as free text: the Price book's **Set vendor** bulk dialog (`components/company/price-book/bulk-edit-dialog.tsx`) and
  the import's "vendor for rows without one" (`import-items-dialog.tsx`) — the audit names only the item dialog and the quote lines; a
  follow-up could give them `VendorNameField`.

## Repair (optional, for the orchestrator) — demo vendors spelt as the directory spells them

Why: R38 named the price book's suppliers as words — "Floor Xpert" (the directory's **Floor Xpert Pte Ltd**, R83), "Hafary", "Soon Bee
Huat" — and R46 copied "Floor Xpert" onto seven quote lines. Under N-16 they still show (kept as typed), but "Floor Xpert" won't follow a
rename or merge of the directory's Floor Xpert Pte Ltd (exact-name match), and the two tile suppliers aren't in the directory the pickers
read. Run after R83. Add `import { nameKey } from '../lib/finance/model'` at the top.

```ts
  /* ── R?? · one vendor list (one-home N-16) ─────────────────────────────────────────────────────────────────────────────────────────────
     The Price book's Vendor and the quote lines' Vendor/Sub pick from Company › Finance › Vendors. The price book's two tile suppliers (R38)
     join the directory by name and trade, as its type-ahead would have added them; then every vendor name on an item or a line that is a
     directory vendor's (the same words — case, spaces and "Pte Ltd" aside, F1's nameKey) takes the directory's spelling, so renaming or
     merging that vendor follows onto it. A name nobody added stays as typed. Idempotent (fixed ids; a spelt name matches exactly). */
  console.log('\nR?? one vendor list — the price book and the quote lines spell the directory’s vendors')
  {
    const has = rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'vendors'`))[0]?.n
    if (has) {
      const live = async () => rows<{ name: string }>(await client.execute(`SELECT name FROM vendors WHERE is_active = 1 AND merged_into IS NULL`))
      let added = 0
      for (const [key, name, trade, itemId] of [['hafary', 'Hafary', 'Tiling', 'pb-tiles-hafary'], ['sbh', 'Soon Bee Huat', 'Tiling', 'pb-tiles-sbh']] as const) {
        const item = rows<{ created_at: number; created_by: string | null }>(await client.execute({ sql: `SELECT created_at, created_by FROM price_book_items WHERE id = ?`, args: [itemId] }))[0]
        if (!item || (await live()).some((v) => nameKey(v.name) === nameKey(name))) continue
        const by = item.created_by ?? 'dane'
        added += (await client.execute({ sql: `INSERT OR IGNORE INTO vendors (id, name, trade, charges_gst, is_active, created_by, created_at, updated_by, updated_at) VALUES (?,?,?,0,1,?,?,?,?)`,
          args: [sid('one-home-n16', `vendor:${key}`), name, trade, by, item.created_at, by, item.created_at] })).rowsAffected
      }
      const dir = await live()
      let spelt = 0
      for (const table of ['price_book_items', 'quote_items'] as const) {
        for (const { vendor } of rows<{ vendor: string }>(await client.execute(`SELECT DISTINCT vendor FROM ${table} WHERE vendor IS NOT NULL`))) {
          const hit = dir.find((v) => nameKey(v.name) === nameKey(vendor))
          if (hit && hit.name !== vendor) spelt += (await client.execute({ sql: `UPDATE ${table} SET vendor = ? WHERE vendor = ?`, args: [hit.name, vendor] })).rowsAffected
        }
      }
      console.log(`  ${added} price book supplier(s) joined the directory · ${spelt} item / line vendor name(s) spelt as the directory spells them`)
    }
  }
```

Check for the verification list (case-blind only — the full rule is `nameKey`):
`['vendor written in another spelling than its directory vendor (one-home N-16)', "SELECT DISTINCT x.vendor FROM (SELECT vendor FROM price_book_items UNION SELECT vendor FROM quote_items) x JOIN vendors v ON lower(trim(v.name)) = lower(trim(x.vendor)) AND v.name <> x.vendor WHERE v.is_active = 1 AND v.merged_into IS NULL"]`

Probes after it: `verify-qe-r1` "Vinyl flooring reads Floor Xpert" uses `includes` (still passes with "Floor Xpert Pte Ltd"); its Hafary step
picks the directory's Hafary instead of adding it; `verify-p2a` 3.04 ("by Hafary · Tiling") unchanged. Then `npm run db:baseline`.
