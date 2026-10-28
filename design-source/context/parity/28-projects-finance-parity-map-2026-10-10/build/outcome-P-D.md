# Outcome — P-D · Documents, entities & paying (2026-10-10)

**Probe run (2026-10-10, merged build, :3132 on a copy of base.db): verify-pm-d 33 passed, 0 failed.** The first run's two failures were the probe's
— `innerText` reads the uppercase captions ("PREVIEW · A SAMPLE INVOICE", "NAME · SIGNATURE · DATE"); both regexes are case-insensitive now.
No app change, no rebuild needed. The probe put the three settings rows back unchanged.

Map rows: **MI-065 · FB-101 · FB-102** (the invoice paper), **FB-103** (an issuing entity's details), **FB-112** (how clients pay), **CP-089** (the
client's pay box). Staged register rows: `reg-P-D.md` (REG-P-D.1…8). Probe (not run): `design-source/verify/parity-map-build/verify-pm-d.cjs`.
Checks: `npx tsc --noEmit -p .` — none in my files (the three left are P-F's qanvast-ops page and P-G's conversation.tsx); `npx eslint` on every
file below — clean; `npm run design:lint` — none of mine (the four failing files are P-A's payments-section, P-B's where-costs-go, P-G's thread).

## What was built, per row

### MI-065 · FB-101 · FB-102 — Settings › Finance › Invoice paper
- **Accent colour** (FB-101): house Chips *The brand's colour* (or *{entity}'s colour* when the paper's entity has one) · *A colour of its own*,
  then the brand kit's colour field (swatch + hex). Resolution on every money paper: the paper's own → the issuing entity's (Company › Profile) →
  the brand kit's accent; per paper, so an entity's own paper may carry its own. It colours the title, a tinted rule under the letterhead, the
  table head's rule and the total (`.paper[data-accent]` in `invoice-paper.module.css`, region P-D; `--paper-accent` set by `accentProps`).
- **Acceptance block** (MI-065, 1.0's `showAcceptanceTerms`): a third switch under *On the paper*, off by default; on — *Acceptance heading* and
  *Acceptance words*; invoices end with the heading, the words and Name · Signature · Date lines (`data-testid="invoice-acceptance"`); never on a
  receipt or a void invoice. `variationPaperFor` now hands the VO renderer `acceptance` and `accent` (Needs from others 7 prints them).
- **Live preview** (FB-102): the real `InvoicePaper` on a sample invoice (the studio's own letterhead, the paper's entity's real bank / PayNow / QR,
  a part-paid Mid-project stage of a sample S$80,000 contract), zoomed to 0.41 and sticky beside the form while the card is ≥860 wide (a
  container query, so it adapts to the panel, not the window); every keystroke shows before Save; *Open larger* → the house Dialog at full size.
  Narrower (tablet, phone) the preview hides behind a **Preview** button → the Dialog, a bottom sheet on a phone. A member who may not change the
  paper (the read-only scope disables buttons) sees the preview in the card at every width instead. The studio data comes from
  `invoicePaperSample()` once on mount, or from the page (`sample` prop) when it hands it over.
- Files: `lib/projects/invoices-paper.ts` (layout fields `accent · acceptance · acceptanceTitle · acceptanceText`, parsed with defaults so a saved
  paper reads unchanged; `PaperExtras` · `PaperLetterhead` · `paperExtrasOf` · `extrasIn` · `paperAccent` · `letterheadLine`), NEW
  `lib/projects/invoices-paper-sample.ts` (`PaperSampleBrand` · `sampleLetterhead` — kept in step with `letterheadOf` · `sampleInvoice`),
  `lib/projects/invoices-paper-queries.ts` (`variationPaperFor` + acceptance / accent), `components/projects/money/invoice-paper-settings.tsx` (+ NEW
  `.module.css`), NEW `components/projects/money/accent-field.tsx` (+ css composing the brand kit's swatch from `profile-view.module.css`), NEW
  `app/projects/paper-actions.ts` (`invoicePaperSample`), `components/projects/money/invoice-paper.tsx` (regions P-D: head, accent, acceptance,
  foot — P-A's MI-031 lines sit in their own region P-A), `invoice-paper.module.css` (region P-D at the end).
- `setInvoicePaper` (P-A's money-actions) already saves through `parsePaperSettings`, so the new fields need no action change.

### FB-103 — Company › Profile › Issuing entities › More details
- Each entity gains the house disclosure *More details ▾* (New project's and the PO dialog's): closed, open on load when anything in it is set.
  Another entity: Contact email · Contact phone · Website · Tagline (blank = the studio's) · Accent colour · Bank branch code · Footer text. The
  studio's own entity: a line saying its contacts and tagline are the Company details above, then Accent colour · Bank branch code · Footer text.
  Email and phone check as the Company details do, after the first Save; Save opens the disclosure on the entity that's wrong.
- `IssuingEntity` gains optional `email · phone · website · tagline · accent · footer · branch` (`lib/templates/model.ts`, + `parseEntityExtras`,
  `ENTITY_TEXT_MAX` · `ENTITY_FOOTER_MAX`); the brand record's parser keeps them (`lib/templates/brand.ts`, one line — see *Touched outside the
  list*). Entities saved before read as blank.
- The papers print them (1.0's resolution: the entity's own, else the studio's): the tagline under the name, the contacts and the website in
  the letterhead's line, the footer line at the paper's foot, the branch code in How to pay (`data-testid="invoice-branch"`), the accent as above.
  One head and foot for the three money papers: NEW `components/projects/money/paper-chrome.tsx` (`PaperHead` · `PaperFoot` · `accentProps`) — the
  invoice, the receipt (`payments-receipt.tsx`) and the credit note (`components/finance/books/credit-note-paper.tsx`, header/footer only) now share
  it. The invoice paper reads the extras off its own `entity` until the page hands them over; the receipt and the credit note need Needs from
  others 1.
- **Country and currency stay Singapore and S$ (DEF-30)**; 1.0's per-entity tax-rate override is not built either — 2.0 keeps one GST rate for
  the studio (Settings) and a GST-registered switch per entity (REG-593), which is Singapore's case. Logo, address, UEN, GST, bank, SWIFT, PayNow
  + QR and Retire were already there.
- Ghost: `components/company/company-ghosts.tsx` ProfileGhost draws the closed *More details* press under the entity (REG-708).

### FB-112 — Settings › Finance › Client payments › How clients pay
- A card table (Settings' event table, the Updates card's three tracks) under the trust rule: Bank transfer · PayNow · Cheque · Cash — where the
  client meets it, who records it, an *Offered* switch saved as pressed (a refusal puts it back, says why). The last way on can't go off: its
  switch rests and its help line says "Keep at least one way to pay switched on"; the server refuses it too (`withMethod`).
- **Match bank transfers automatically**: under the table, the words and *Ask OpenMaison to set it up* → the ask is recorded (`bankFeed`: when,
  who) and the row reads "Asked on 10 Oct ’26 by Dane — we'll be in touch to connect the studio's bank." with *Withdraw the ask* (1.0's Cancel
  request); the snackbar's Undo withdraws it as well. Owners and Admins. **A stand-in** — nothing reads a bank feed and nobody is told yet.
- NEW `lib/projects/payment-methods.ts` (pure): `PAYMENT_COLLECTION_KEY` (`payment_collection`), `CollectionRules { off, bankFeed }` (stored as the
  ways switched OFF: no row = every way, a way added later starts on), `parseCollection`, **`liveMethods(rules)`** (what Record a payment offers;
  null rules = all), `isLive`, `clientMethods(rules)` (I have paid's two, may be empty), `methodRefusal(rules, method)` (the server's refusal),
  `payShows(rules)` / `payShowsFrom(liveValues)` (bank? PayNow?), `withMethod`, `METHOD_HELP`, `LAST_METHOD_RULE`. NEW
  `lib/projects/payment-methods-queries.ts` (server: `fetchCollectionRules` · `fetchLiveMethodValues` · `saveCollectionRules`). Actions in NEW
  `app/projects/paper-actions.ts`: `readCollectionRules` · `setPaymentMethod` · `askBankFeed` · `withdrawBankFeedAsk` (refuse with
  `PAYMENT_SETTINGS_RULE`).
- What reads it today: the invoice paper's How to pay (no bank lines while Bank transfer is off, no PayNow ID / QR while PayNow is off; only
  cheques / cash → "By cheque or cash — {studio} records it when it arrives.") and the client's pay box — both through an optional `methods` list
  the pages hand over (Needs from others 2 · 3). Record a payment and I have paid: Needs from others 4 · 6.
- File: `components/projects/money/payments-settings.tsx` (`CollectionMethods`, + NEW `payments-settings.module.css` for the ask's row).

### CP-089 — the client's pay box
- Under the bank line: **SWIFT** and the **branch code**, each with Copy (the house `CopyValue`) when the entity has them; the box follows How
  clients pay (above). `CopyValue`'s words keep an acronym's capitals now ("Copy the SWIFT code", "Copy the paynow ID" — was "paynow id").
- File: `components/portal/money/pay-box.tsx` (reads `pay.branch` · `pay.methods` optionally — Needs from others 3). The demo studio has a SWIFT
  (DBSSSGSG), so Benjamin's pay box shows *SWIFT DBSSSGSG* with Copy at once.

## What to check in the browser
- **Settings › Finance** as Dane (Owner), 1440: Money in › Invoice paper — the preview beside the form (sticky as you scroll the card); type a
  Header note → it shows in the preview at once; Accent colour › *A colour of its own* → the swatch / hex, the preview's title and total change;
  *An acceptance block* → its two fields, the block on the preview; *Open larger*; Save → Benjamin Han's Mid-Project invoice
  (`/projects/<P-2026-002>/invoices/<INV-2026-006>`) prints them. At 1025 the card is just wide enough for both; at 768 and 390 the **Preview**
  button opens the paper (a sheet at 390). With two entities (add one on Profile) the *Paper for* select switches the preview's letterhead too.
- **Client payments**: How clients pay — switch PayNow off → the invoice's How to pay has no PayNow (once 2 lands) and the snackbar says where it
  leaves; switch off three → the last one rests with its reason; back on. *Ask OpenMaison to set it up* → "Asked on …"; *Withdraw the ask*.
- **Read-only**: View as Germaine or Michelle (Designers) — the paper's preview stands in the card, nothing changes; Hui Min (Admin) changes all.
- **Company › Profile**: *More details* on the studio's entity (Accent · Branch code · Footer text) and on an added entity (contacts too); a bad
  email shows its error after Save and opens the disclosure; 390 has no sideways scroll.
- **The client's portal** (Benjamin, 97731968, any six digits), 390: Money › the due stage's pay box — SWIFT with Copy; the branch code once
  Needs from others 3 lands.
- **Invoice / receipt / credit note pages**: once Needs from others 1 lands, every one prints its title and total in the brand's purple (the
  deliberate *the brand's by default* — banked 1440 baselines of these pages will differ) and the website in the letterhead line.

## Probes changed
None — I grepped every probe for the strings, test ids and layouts touched here (the invoice paper's test ids, `payment-settings`,
`portal-pay-box` / `portal-copy-*`, the entity's labels, `getByLabel('Terms'|'Header note')` on Settings): each still holds. Note for gap-b's
step 14: the preview renders a second paper inside the card — `card.getByLabel('Terms', { exact: true })` stays unique only because the terms are
empty when it is filled (the preview's terms section is `aria-label`led by the terms heading once filled).

## Needs from others (the orchestrator wires these)
1. **P-A · `lib/projects/money-queries.ts` `letterheadOf`** — hand every money paper its entity's extras:
   ```ts
   import { paperExtrasOf, type PaperLetterhead } from './invoices-paper'
   // at the end of letterheadOf:
   const extras = paperExtrasOf(entity, studio, list[0] ?? null, brand.kit.colors.accent ?? null)
   return { entity, letterhead: { ...letterhead, extras } }
   ```
   and type `InvoiceDocData['letterhead']` / letterheadOf's return as `PaperLetterhead`. This brings the brand's accent by default, the tagline,
   the entity's contacts and website and the footer line to the invoice, the receipt, the portal's and the no-login papers and the credit note
   (`credit-paper.ts` passes `d.letterhead` through) — no paper code change needed (`extrasIn(h)`).
2. **P-A · the invoice's ways to pay** — `fetchInvoiceDoc` (money-queries), `paperBase` / `fetchPortalInvoice` (payments-portal.ts) and
   payments-public.ts: add `methods: await fetchLiveMethodValues()` (`@/lib/projects/payment-methods-queries`); `components/projects/money/invoice-page.tsx`
   passes `methods: d.methods` in its `<InvoicePaper d={{…}}>` (InvoicePaperData.methods is optional, absent = every way).
3. **P-A · `lib/projects/payments-portal.ts` `payOf`** — add `branch: e.branch ?? ''` and `methods: <live values>` to PortalPay (the pay box reads
   `PortalPay & { branch?; methods? }`). Optional: with only cheques / cash live, return the pay object even with no account so the box says
   "By cheque or cash — {studio} records it when it arrives".
4. **P-A · Record a payment** — `components/projects/money/payments-dialogs.tsx` (~L99): `options={liveMethods(collection)…}` in place of
   `PAYMENT_METHODS`, the default = the first live way; the record action in `app/projects/payment-actions.ts` refuses
   `methodRefusal(await fetchCollectionRules(), o.method)` (`{ error }`). Its data: `fetchCollectionRules()` or `fetchLiveMethodValues()`.
5. **P-B · the PO paper** — `components/finance/po-paper.tsx`: its head and foot through `PaperHead` / `PaperFoot` / `accentProps`
   (`@/components/projects/money/paper-chrome`), with `extras: letterhead.extras` on `PoDoc.studio` in `lib/finance/queries.ts` (after 1). P-B
   already prints `entity.branch`.
6. **P-F · I have paid** — `components/portal/money/i-have-paid.tsx`: `clientMethods(rules)` in place of `CLIENT_METHODS` (the page hands the live
   values over); `app/portal/payment-actions.ts` refuses a way switched off (`methodRefusal`). When `clientMethods` is empty, the press says how to
   pay in person (or hides).
7. **P-E (or the orchestrator) · the VO's acceptance block** — `components/templates/render/slices.tsx` after the VO's terms (~L573):
   `if (vo?.paper?.acceptance) out.push({ ...plain('vo:acceptance', vo.paper.acceptance.title, `${vo.paper.acceptance.text}\n\nName ________   Signature ________   Date ________`), padTop: mm(4) })`,
   and widen the paper type in `lib/templates/data.ts` (×2) and `lib/quotes/editor.ts` with `acceptance?: { title: string; text: string } | null; accent?: string | null`.
8. **Optional · `app/settings/page.tsx` → `settings-view.tsx` → `components/finance/finance-settings.tsx` (P-B)** — pass `sample`
   (`PaperSampleBrand`) to `InvoicePaperSetting` and `collection` to `PaymentSettings`; both cards work without it (they read once on mount).
9. **Optional · P-F's Qanvast Ops › Studios** — list the bank-feed ask (`settings.payment_collection.bankFeed`) so the stand-in reaches an operator.

## Touched outside the list (each the smallest edit, no other package owns them)
- `lib/templates/brand.ts` — the brand record's entity parser keeps the More details (`...parseEntityExtras(e)`); without it Save drops them.
- `components/company/company-ghosts.tsx` — ProfileGhost: one `Line` for the entity's closed *More details* (REG-708: the ghost draws the page).
- `lib/projects/invoices-paper-queries.ts` — the paper's server read, partner of `invoices-paper.ts` (`variationPaperFor` + acceptance / accent).

## Repair text
None — every default needs no set-up: no `payment_collection` row = every way on; a saved paper reads with no accent of its own and no acceptance
block; entities read with no More details. The probe sets what it shows and puts the three settings rows back.

## Stand-ins
- *Match bank transfers automatically* is a recorded ask; nothing reads a bank feed or matches a transfer, and no one at OpenMaison is told yet.
- The preview's invoice is a sample (labelled so); its client, address, project and number are sample words.

## Not finished, and why
- Items 1–7 above live in other packages' files; until they land: the brand's accent (by default) and the entity's extras reach the invoice only
  through its own entity (the receipt and credit note print the head as before), the invoice / pay box show every way to pay, Record a payment
  and I have paid offer every way, the branch code is not yet on the pay box, and the VO prints no acceptance block.
- The PO paper's head/foot (5) is P-B's.
