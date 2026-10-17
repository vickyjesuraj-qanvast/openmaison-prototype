# S03 · Contracts leftovers — outcome (2026-10-11)

Card: `held:contracts` (Contracts and signing). 1.0 read: `src/app/(main)/accounts/signing-documents-tab.tsx` (the library: PDF uploads and
rich-text documents, per entity, scroll / accept gates), `src/app/api/signing-documents/{route,upload/route}.ts` (5 MB PDFs into storage),
`src/components/leads/signing/signing-document-picker.tsx` (the send's "Documents to include", added per send), `src/components/leads/contract-flow-dialog.tsx`
(the paper upload into the lead's files), `src/app/api/quotes/request-signature/route.ts` (`token = randomUUID()`, `expires_at` now + 7 days,
the regenerate path), `src/app/api/quotes/resend-signature/route.ts` (resend on the same token), `src/app/api/quotes/cancel-signature/route.ts`
(cancelled, the quote back to approved), `src/app/sign/[token]/page.tsx`, `src/components/settings/member-signature-card.tsx` +
`src/app/api/member-signatures/records/route.ts` + `src/lib/quote-signatures/{apply-on-approval,prepared-by-signature}.ts` (auto-apply opt-in,
default off, carried across a new image, consent_at), the frozen `quote_total` on the request.
Register rows: `steps/reg-S03.md` (REG-S03.1…10). Probe: `design-source/verify/pending-modules/verify-pm2-s03.cjs` (**79 / 79**); shots banked in
`design-source/verify/pending-modules/pm2-s03/` (14).

## Per pending line

| Card line | Result | Where |
| --- | --- | --- |
| Standard PDF documents added to every signing (Q-26 held: "2.0 keeps no file bytes") | **Built** — the reason ended with gaps build E. A standard PDF is a contract template of kind `pdf` (Company › Templates › Contracts › New ▾ › Upload a PDF…), its own editor (the PDF, Replace, Before the client signs), From Template lists it, **Send together** offers the library's PDFs under the lead's own (ticked ones become the lead's own copies and go out in the set); the contract editor's Send dialog points to Send together when the library holds any | `app/company/contract-templates-actions.ts` (`createPdfTemplate` · `replacePdfTemplate`, duplicate keeps the bytes), `app/files/contract-template/[templateId]/route.ts`, `components/company/templates/{contract-templates-gallery,upload-pdf-dialog}.tsx` (+ css), `components/contracts/editor/contract-template-editor.tsx`, `components/contracts/contract-template-picker.tsx`, `components/contracts/send-bundle-dialog.tsx` (+ css), `app/contracts/actions.ts` (`sendBundle` `templateIds`, `createContractDoc` from a PDF template, `standard`), `lib/contracts/queries.ts` (`fetchStandardDocs` · `countStandardDocs`, `ContractTemplateOption.kind`), `app/contracts/read-actions.ts` |
| Import from File, Mark as signed and the Won upload keep only a name | **Built** — the PDF itself in the lead's Files › Contract & VOs (`contracts.file_id` · `signed_file_id`); the editor, Preview and the signing pages show it; Download hands over the file; the Signed Copy cell opens it; Files refuses to trash it; Attach the PDF / Replace | `lib/contracts/{files,pdf}.ts`, `components/contracts/read-pdf.ts`, `components/contracts/render/contract-pdf.tsx` (+ css), `components/contracts/import-contract-dialog.tsx`, `components/contracts/editor/{dialogs,contract-editor,contract-banner}.tsx`, `components/contracts/preview/contract-preview.tsx`, `components/contracts/sign/{signing-page,bundle-signing-page}.tsx`, `app/sign/[id]/file/route.ts`, `app/sign/bundle/[id]/file/[contractId]/route.ts`, `lib/contracts/won.ts` (`recordWonUpload(…, picked)` · `splitWonFile`), `app/leads/actions.ts` (`moveStage` · `updateStageDetails`), `components/leads/move-stage/panels.tsx`, `lib/leads/stage-data.ts`, `app/leads/files-actions.ts` (`trashFiles`), `components/contracts/use-signed-copy.ts`, `components/leads/contracts/contracts-table.tsx` |
| Signing link with a token, a 7-day expiry, resend and cancel (Q-28) | **Built** — `/sign/<token>`, the window (Settings › Quotes & pricing › Contracts, 7 days by default), expired page + list line + editor banner, reminders renew it, Stop (back to Draft, a new token) with Undo; 1.0's tokens land through a port column | `lib/contracts/{link,link-server}.ts`, `lib/contracts/{model,policy,status,queries}.ts`, `app/contracts/actions.ts` (`renewSigningLink` · `stopSigningLink` · `reopenSigningLink`), `app/sign/[id]/(sign)/page.tsx`, `app/sign/[id]/quote/page.tsx`, `components/contracts/sign/{link-notice,sign-quote-view}.tsx`, `components/leads/contracts/{lead-contracts,contracts-table}.tsx`, `components/contracts/list/contracts-workspace.tsx`, `lib/portal/{needs,home,notifications}.ts`, `lib/link-cards/queries.ts`, `lib/links/old-links.ts`, `app/settings/{contracts-settings-card.tsx,actions.ts,settings-view.tsx,page.tsx}`, `lib/global-search/model.ts`, `lib/leads/activity.ts` (region S03) |
| SMS code before signing | **Stand-in, kept** — the developers' (her call, REG-534); any six digits, as before. Nothing new claims a code | — |
| Server-rendered PDF and signing packet; the link by SMS / email | **Stand-ins, kept** — the developers'. A PDF contract's Download now hands over the very file kept; a written one still prints from Preview (the browser's print). The link travels on WhatsApp (opened on the press) and Copy link | — |
| A member's signature auto-applied only with their consent | **Built** — Your profile's switch; documents print a signature only on its member's yes; Signature Settings says what Save does; the quote's Signature section and Send's check say when it is off; R105 answers yes for signatures already saved | `lib/quotes/signature.ts` (`appliedSignatureOf` · `consentsToSign` · the words), `lib/contracts/snapshot.ts` (`studioSignatureFor` · `studioSignatureState`), `lib/templates/data.ts`, `app/quotes/signature-actions.ts` (`setSignatureConsent`; Save answers a never-answered member), `lib/company/your-profile.ts`, `components/profile/{your-profile-view,your-profile-ghost}.tsx` (+ css), `components/quotes/editor/signature/signature-section.tsx` (+ css), `components/quotes/editor/quote-editor.tsx`, `lib/contracts/readiness.ts` |
| Contract value moves when a Signed quote is edited | **Built** — the total kept at signing (`quotes.signed_amount_minor`) is what the project's contract stands on; the signed quote's banner says it when an edit moved today's total | `lib/quotes/{sign,contract-value}.ts`, `app/leads/quotes-actions.ts` (`setQuoteStatus`), `app/quotes/actions.ts` (the mark's Undo), `lib/projects/{money-queries,queries}.ts`, `components/quotes/editor/{quote-bars,quote-editor}.tsx` |
| The 'Prepared with OpenMaison' footer stays on contracts | **Removed** — the studio's letterhead alone (REG-963 · REG-1120 · REG-1682) | `components/contracts/render/contract-paper.tsx` (+ css) |
| Coming soon: Create with AI · Contracts Settings · sort on the heads | **Built, as the card recommends** — Create with AI gone; Contracts Settings → Settings › Quotes & pricing › Contracts; Status · Created · Sent · Updated sort (one sort with Filters') | `components/leads/contracts/{contracts-toolbar,contracts-table,contracts-filters-modal,lead-contracts}.tsx` (+ css), `components/contracts/list/contracts-workspace.tsx`, `lib/leads/contract-filters.ts` (`sortByHead` · `nextHeadSort`) |
| (S01's note) a sent / signed contract keeps its preparer's details | **Decided: at signing** (the smallest, most 2.0-like answer) — a signed contract already keeps its text, letterhead and the studio signature it printed (`signed_studio_signature`: the mark and its name); the paper prints no other member detail (the studio chips are the studio's / entity's). While out for signature the client reads the live text, and a change while they read refuses the signature and reloads (Q-06). Consent applies at the snapshot. Quotes' snapshot at send is S04's | `lib/contracts/snapshot.ts` |
| (S02's note) 1.0's `/sign/<token>` | **Built** — the port column is `contracts.sign_token` (or `contract_bundles.sign_token` for a set, landing on `/sign/bundle/<id>`); Viewed still ignores chat fetchers; `linkCard('sign', key)` reads `fetchSigning(token)` and closes on expiry | `app/sign/[id]/(sign)/page.tsx`, `lib/link-cards/queries.ts` |

## Files
New: `lib/contracts/{link,link-server,files,pdf}.ts`, `lib/quotes/contract-value.ts`, `components/contracts/{read-pdf,use-signed-copy}.ts`,
`components/contracts/render/contract-pdf.tsx` (+ css), `components/company/templates/upload-pdf-dialog.tsx`, `app/settings/contracts-settings-card.tsx`,
`app/sign/[id]/file/route.ts`, `app/sign/bundle/[id]/file/[contractId]/route.ts`, `app/files/contract-template/[templateId]/route.ts`,
`drizzle/0087_contracts_s03.sql` (+ meta), the probe and `pm2-s03/` (14 shots). Changed: the files in the table above, plus `lib/db/schema.ts`,
`lib/db/baseline.ts`, `scripts/snapshot-baseline.ts`, `scripts/repair-demo-data.ts` (R105), `components/leads/files/file-viewer.tsx`,
`components/contracts/editor/{esign-panel,contract-skeleton}.tsx`, `components/leads/quotes/quotes-table.module.css`, `app/settings/settings-ghost.tsx`.
For CLAUDE.md's Map (the orchestrator's): Contracts — `/sign/<token>` (`contracts.sign_token`, `lib/contracts/link*.ts`), the window and Stop /
Undo (`renewSigningLink` · `stopSigningLink` · `reopenSigningLink`), a contract's PDF in Files › Contract & VOs (`file_id` · `signed_file_id`,
`ContractPdf`), standard PDFs = contract templates of kind `pdf` (`contract_template_files`), Settings › Quotes & pricing › Contracts
(`contract_rules`); members' `signature_consent` (`appliedSignatureOf`); quotes' `signed_amount_minor` (`contractBaseOf`).

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **The card's two questions: yes and yes** — the signing PDF library comes back, and the contract value freezes at signing.
- **A token for every contract; old ones keep their id as it.** A link already in a client's chat keeps opening; the next Stop gives it a new one.
- **The window is the studio's** (1.0's fixed 7 days as the default, 14 · 30 offered) and lives where the card points Contracts Settings —
  Settings › Quotes & pricing › Contracts. **Every send and every reminder opens it again from that moment** (1.0's resend kept the old day;
  2.0 says "it opens for 7 days from now", so a reminder on day 6 never hands the client one day). A link already out got a window from the
  day of the repair, never dead on arrival.
- **Stop = 1.0's cancel**: back to Draft and a new token (the old address stays dead); a set stops whole; Undo puts the same link back. The status
  pill's Sent → Draft is the same Stop.
- **One home for a contract's PDF: the lead's Files › Contract & VOs** (1.0 filed the paper contract in the lead's files; the project's
  Getting started already files a signed copy there). The contract points at the file; Files keeps it while the contract does.
- **Standard PDFs are contract templates** (one library, one gallery, its folders and rules), added to a signing through Send together; each lead
  gets its own copy, which names no quote. PDFs only, up to 8 MB (Files' cap; 1.0's library took 5).
- **Consent is asked where the member sets their signature** — Your profile's switch (1.0's place), and Signature Settings says what Save does;
  a never-answered member says yes by saving it there; saved signatures before this step count as yes (they printed until now).
- **The contract value is the total as signed**; approved variation orders still add to it; the closing margin's plan still reads the signed
  quote's lines as they stand (a line-level copy at signing would be a revision snapshot — left for the developers' port, see below).
- **No OpenMaison mark on the client's paper** — the footer goes (no mock carried it; REG-963's rule).

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Serena Koh › Contracts › From the studio agreement → Send → the dialog says "The link opens for 7 days…", the link
  is `/sign/<22 characters>`; WhatsApp opens; the banner says "The link is open until …". Open the link in a private window; open
  `/sign/<the contract id>` — "This link is no longer active". ⋮ › Stop the signing link → "…link no longer opens" + Undo. Import from File
  (a PDF) → the editor shows the PDF; send it → the client's page shows it and Download a copy hands it over. Mark as signed with a PDF → the
  Signed Copy cell opens the file; in Files › Contract & VOs try Delete → "…is the signed copy of … — it stays while the contract does".
- **Company › Templates › Contracts › New ▾ › Upload a PDF…** → the standard PDF; Olivia Martinez › Contracts › ⋮ › Send together → "Your
  standard documents" (Olivia's agreement names a Draft quote, so pick the quote off it in the editor first — or use a lead whose quote is sent).
- **Your profile › Your signature** → the switch; off → a contract's Preview prints the studio box blank, Send says why, the quote's
  Signature section offers Turn it on.
- **A signed quote** (P-2026-001's OM-10004): edit a line → the banner says "The client signed for S$77,900.12"; Money's contract value doesn't move.
- **Settings › Quotes & pricing › Contracts · signing links** (Hui Min changes it; Germaine / Michelle read it); Contracts ⋮ › Contracts Settings
  lands there. The table's heads sort; Filters says so.
- **390:** the signing page shows the PDF's first page and Open the PDF; the editor's PDF row wraps; the Contracts cards have no line through
  their titles; Send together and the dialogs are sheets.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0087 + repair R105) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the warnings are older files') · `npm run design:lint` nothing new ·
`npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s03.cjs`** (this step) | **79 / 79** — the page error log empty; the scratch DB left as found (a table-by-table diff before and after: nothing beyond the app's own lazy "this month's AI credits" rows a first page open writes) |
| `contracts-parity/verify-ct-r1…r4.cjs` | 36 / 36 · 24 / 24 · 28 / 28 · 29 / 29 (r1 and r3 after the deliberate changes below; r1 first 35 / 36) |
| `pending-modules/verify-pm2-s01.cjs` · `verify-pm2-s02.cjs` | 79 / 79 · 105 / 105 |
| `ux-build-2026-09-30/P5` (reminders, Send together, Download signed copy) · `P2` (Import from File) · `P6` (Signature Settings) | 58 / 58 · 73 / 73 · 57 / 57 |
| `uat-dane-2026-10-01/P3` (signatures) · `P4` (eSignatures) · `P5a` · `P6` (signing pages) | 71 / 71 (first 70 / 71, a deliberate change) · 37 / 37 · 59 / 59 · 41 / 41 |
| `ui-sweep/verify-sw-r1` · `verify-sw-r2` (sign pages, Mark as signed, Send together) | 34 / 34 · 27 / 27 |
| `quote-editor-parity/verify-qe-r4` (signing through a contract) · `quote-templates-parity/verify-tpl-parity` | 14 / 14 · 20 / 20 |
| `keyboard/verify-kb-r2` ("Moved to Trash Folder") · `consistency/verify-overlays` (every dialog's head and foot) | 29 / 29 · 67 / 67 |
| `global-search/verify-search` · `settings-parity/verify-st-r1` | 27 / 27 · 57 / 57 |
| `first-run-2026-09-30/verify-first-run` (empty · full) · `ghosts/verify-ghosts-strips` (captures, no tally) | 89 / 89 · 6 / 6 · captured |
| `projects/verify-pj-gap-d` (sign links from the portal) · `parity-map-build/verify-pm-f` · `projects/verify-pj-r1` · `verify-pj-r5` (Money's contract value) | 65 / 65 · 60 / 60 · 98 / 98 · 91 / 91 |

**Assertions changed as deliberate changes of their rule** (each commented `(pending modules S03, a deliberate change of this rule)`):
`contracts-parity/verify-ct-r3.cjs` opens the new contract by its token and gives its SQL-made row one; `verify-ct-r1.cjs` gives its SQL-made
row a token and Sarah's SQL-made signature her yes; `ux-build-2026-09-30/P5/verify-p5.cjs` expects the reminder's link to carry the token;
`uat-dane-2026-10-01/P3/verify-p3.cjs` gives the member in its direct `studioSignatureFor` call their yes.

## Migration and repair
- **Migration 0087 `contracts_s03`** (additive): `contracts.sign_token` (unique) · `sign_expires_at` · `file_id` · `signed_file_id`;
  `contract_bundles.sign_expires_at` · `cancelled_at` · `sign_token` (unique); `contract_templates.kind` (default 'document') · `file_name` ·
  `file_size`; the new table `contract_template_files` (in `BASELINE_TABLES` and `TABLES`, after `contract_templates`); `members.signature_consent` ·
  `signature_consent_at`; `quotes.signed_amount_minor`. Settings key `contract_rules` (`{ linkDays }`, default 7) — no row needed.
- **Repair R105** — every contract gets a link key (its id for one made before the step), a contract or set out for signature its window (the
  studio's days from the later of its send and today), a Draft none; a saved signature with no answer → yes; a signed quote's total kept.
  Seven checks in the closing list (the key, the window, a PDF on another lead / in the trash / on a written contract, a PDF without bytes, a
  standard PDF without bytes, an unanswered saved signature, a signed quote without its total). On the demo: "4 link keys · 0 windows · 1
  signature consent · 3 signed totals"; again: "already in step"; full repair: all checks pass.

## For the next steps
- **S04 (quotes):** the quote's own preparer signature is now consent-gated (`appliedSignatureOf` in `lib/templates/data.ts`); a sent quote's
  snapshot at send is still S04's. The confirmation and `/sign/<token>/quote` pages still send each line's full record (S02's note) — the
  `/sign/<token>/quote` address is now token-keyed. `quotes.signed_amount_minor` is the frozen total; a quote revised after signing keeps it
  until it is signed again.
- **Developers:** a real e-sign / PDF service renders the written contract and the packet (today Preview's print); a real SMS sends the code.
  Object storage replaces `lead_file_images` / `contract_template_files` behind `keepContractPdf` · `createPdfTemplate`. The port: 1.0's
  request `token` → `contracts.sign_token` (one document) or `contract_bundles.sign_token` (a set), `expires_at` → `sign_expires_at`,
  `cancelled` → Draft with a fresh token, `studio_signing_documents` PDFs → `contract_templates` kind `pdf` + `contract_template_files`,
  `member_signatures.auto_apply · consent_at` → `members.signature_consent ('yes'|'no') · signature_consent_at`, the request's frozen
  `quote_total` → `quotes.signed_amount_minor`. The closing margin's plan (`lib/finance/closing-numbers.ts`) reads the signed quote's lines as
  they stand; a line-level copy at signing (1.0's snapshot) is the port's to decide.
- A bundle's id stays its link's key (made fresh for each send, never reused); 1.0's set tokens arrive in `contract_bundles.sign_token`.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for any of it; built on the screens that exist (the Send dialog, the banner, the
   row menu, the Files card, the gallery, Your profile's card, Settings' card) and logged in REG-S03.1…10 with every invented line. The Won
   step keeps the mock's file row and its name (REG-149); only the bytes are new.
2. **One system, no one-offs** — house pieces only (SendContractDialog, Dialog, Dropzone / FileTile, Chips, Switch sm, MetaChip, PortalMenu rows,
   LibraryGallery, the snackbar with Undo, the house text link, the table core's head sort, the Visualizer share link's words "Open until ·
   Expired · Renew"); three drifted "uploaded PDF" cards became one `ContractPdf`; the consent row composes the Automation switch row; tokens
   only — `design:lint` holds.
3. **Plain words** — "Stop the signing link", "This link has expired", "Send the link again", "Put it on the quotes and contracts I prepare",
   "The client signed for S$77,900.12", "Your standard documents".
4. **Nothing is lost** — Stop answers with Undo (the same link back); links already in chats keep opening (old ids kept as tokens); links already
   out got a fresh window; a contract's PDF can't be trashed while the contract lives; a replaced standard PDF never reaches a lead's copy; a
   replaced Draft PDF stays in Files; consent defaults keep every saved signature printing; the signed total stays.
5. **Say why** — expired links say so to the client and in the studio's list and banner; a refused trash names the contract; Send's check says why
   the studio box is blank; a refused status / stop says its rule (`{ error }`); a non-PDF is refused under its box.
6. **Back returns where you came from** — Contracts Settings opens Settings with `?from=` (Back to the lead / Tools); the Signed Copy cell opens
   the file viewer with `?from=` the list; the editor's Send together line goes to the lead's Contracts and back the usual way.
7. **Every screen is whole** — no new page; the new routes are file routes (404 when the link doesn't open); the editors' reveal ghost draws a PDF
   contract's own shape (no formatting bar or Outline), Your profile's ghost draws the consent row; the shell, snackbars and errors are the
   pages' own.
8. **Every width is designed** — 1440 · 390 · 320 checked by the probe (no sideways scroll against `screen.width`); a phone shows a PDF's first page
   and Open the PDF; the PDF row wraps; the Contracts and Quotes cards lost the stray line through their titles; dialogs and menus are sheets.
9. **Tables follow the leads listing** — the Contracts heads sort the Projects table's way (A→Z, Z→A, off; `aria-sort`; one sort with Filters'); the
   Signed Copy cell is a link in the Lead column's style; the expired line sits in the status cell's second line.
10. **Motion with purpose** — none added; the house dialog, sheet and snackbar timings; the Settings card lights on arrival (the hash landing).
11. **Honest data** — every state from its record (`sign_token`, `sign_expires_at`, `cancelled_at`, `file_id` / `signed_file_id` + kept bytes,
    `signature_consent*`, `signed_amount_minor`, the trail lines); R105 backfills them and checks seven rules; the code and the PDF packet stay
    honest stand-ins; nothing claims a send it didn't make.
12. **Reach for everyone** — the new presses are buttons and menu items with names (the head sort says its state in its label and `aria-sort`;
    the PDF viewer is labelled; the Open links name the file); the expired line is words, not colour alone; the switch has its label.
- **How to add a missing thing** — one home (a contract's PDF in Files › Contract & VOs; standard PDFs in Templates › Contracts; the window in
  Settings › Quotes & pricing where Contracts Settings points; consent on Your profile); shown only when it applies (Stop only while out, Send
  again only once expired, the standard documents only when the library has one, the signed-total line only when the total moved); one filled
  button (the expired banner's Send again; the dialogs' own primaries); no set-up (7 days by default; saved signatures keep printing; old links
  keep opening).
