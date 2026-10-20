# S42B · Leads and sales documents — the closing audit's fixes (2026-10-14, lane C)

Package S42B: audit B's 24 findings (`s42/audit-B.md`, B-01…B-24) and its calls B·1…B·5, plus — routed here by the coordinator as the one owner
of the quote reader — audit E's Blocker **E-05** and audit D's **D-08** / call **D·2**. Built in lane C (port 3175), repair number **R160**.
Register rows: `steps/reg-S42B.md` (REG-S42B.1…28). Probe: `design-source/verify/pending-modules/verify-pm2-s42b.cjs` (**66 / 66**), shots
`design-source/verify/pending-modules/pm2-s42b/`.

## Ledger — every finding

| ID | Sev | Status | Where · how |
|---|---|---|---|
| **B-01** | Blocker | **fixed** — every signing path checked | One rule, `quoteHoldsSigning` (`lib/contracts/policy.ts`): the quote an agreement names holds its signing while it is being revised (version 2 on, until Sent to Client / Confirmed / Signed) or, for a first version, as Send's own check (Draft / Sent for Approval where approval is required). `namedQuoteHold` (`lib/contracts/queries.ts`) asks it for **the single link** (`fetchSigning` → state `quote-updating`; `signContractOnline` refuses `{ refused: 'quote-updating' }`), **a set's link** (`fetchBundleSigning`; `signBundleOnline`), **/sign/<token>/quote** (no draft — the notice), **the link card** (`lib/link-cards`), **Mark as signed** (`markContractSigned` → `{ error }`, said in the dialog's snackbar) and **a list's Signed** (`applyContractStatus` throws the rule). The confirmation link already refused a Draft (`confirmQuoteOnline`); the Won step lists only signed quotes. The Revise dialog says it first (`quote-editor.tsx`). Probe: a signature pressed after the quote went back to Draft v2 is refused, nothing signed, the page then says "Not ready yet". |
| **B-02** | Major | **fixed** (my side) | `lib/auth/studio-visit.ts` `isStudioVisit()`: a member signed in on the browser, or — the demo's standing session — a browser that has opened a studio page (`proxy.ts` sets `om_studio`, httpOnly, on any studio page). Asked by `stampQuoteSeen` (confirmation + view-only links), `/sign/<token>` and `/sign/bundle/<id>`. The PO page and the meeting link are other areas' (below). |
| **B-03** | Major | **fixed** | The code step goes through the one provider (`sendSigningCode` → `signInProvider().sendCode`; the signature carries `code`, checked by `checkCode`, refused `'code'`; rate limits as the portal's when a real provider answers). While the stand-in answers: the code step's line is S34's words ("Demo only — no text is sent: any six digits sign it."), no "Code sent" snackbar, no Send again, the review line drops "we'll send a code to …"; the record's `verification_method = 'demo_code'` and reads "A one-time code — demo only, no text was sent"; the Send dialogs (`SendContractDialog` default, the editor's, Send together) say it via `signCodeLine` + `useSignCodeDemo`. `components/contracts/sign/{signing-page,bundle-signing-page,signing-record}.tsx`, `app/contracts/actions.ts`, `lib/contracts/model.ts`. |
| **B-04** | Major | **fixed** + siblings | `app/settings/page.tsx`: Lead stages' counts, Lead sources' counts and the Lost / On Hold reasons' counts all count only the viewer's visible leads (`visibleLeadIds`). |
| **B-05** | Minor | **fixed** | `commercialOf` (`lib/leads/enums.ts`) gates `{client_company}` / `{client_uen}` (`lib/templates/data.ts`, both callers pass the lead's property type), the contract chips (`lib/contracts/snapshot.ts`) and the export (`lib/leads/export.ts`). The record keeps the values. |
| **B-06** | Minor | **fixed** | `isUen` (`lib/format.ts`, ACRA's three shapes), `MSG.uen`, `validateLeadForm` (only while commercial — a home's old value never blocks a save), the field's error and focus (`lead-form.tsx`), and the server's `leadInputBlock` in `createLead` / `updateLead` (NRIC there too — the sibling the server never checked). |
| **B-07** | Minor | **fixed** + sibling | The second client's mobile sits in a `nowrap` span (`info-column.tsx` / `.keep`); `printField` groups `phone` and `client2Phone` at log time and Activity's `shownField` groups older lines (the lead's and the direct project client's edit lines). |
| **B-08** | Minor | **fixed** | `undoReturn` logs `kind: 'appeal'`; Activity reads "… took back the appeal to Qanvast." |
| **B-09** | Minor | **fixed** | `TERMS(button)` in `return-lead-wizard.tsx` — "Send appeal" on an appeal. |
| **B-10** | Minor | **fixed** (words) · day-shift → package A | `appealUntil` / `appealWindowPassed` (`lib/leads/return-model.ts`); the LEAD RETURNED card, Return details and the wizard's rules line say "Qanvast’s 7 days ran to {day} — it may still look at an appeal" once passed (B·3). Moving `lead_returns.replied_at` with the demo day is the restore's day-shift — lane A's `lib/db/baseline.ts` (below). |
| **B-11** | Minor | **fixed** | `moveLeadAnswer` (`lib/maison-ai/answer.ts`) asks `stageIntent` / `isCompletedFor` with each lead's members, parked stage and project: a refused move is a row with the rule as its second line (opens the lead), a passed stage says so, and the sentence never promises a window that won't open. |
| **B-12** | Minor | **fixed** | `LeadStagesCard` carries the house `ReadOnlyNote` for a member who can't change it; the settings ghost draws it (`settings-ghost.tsx` `LeadsCards runs`). |
| **B-13** | Minor | **fixed** | `lib/global-search/model.ts`: the row is **Lead stages**, `#lead-stages`, words incl. "manage stages". |
| **B-14** | Minor | **fixed** | `planBookMatches` (`match-book-dialog.tsx`, which Maison AI's hint counts too) drops a match whose item cost already is the line's, and never lists a line under a My Sections group as "Not in My Items yet". |
| **B-15** | Minor | **fixed** (B·5) | `draftPlan` reads "<n> <work>" (`countsIn` · `qtyFor`, `lib/quotes/draft.ts`) — never a count of rooms, never a Lot; `createQuoteItem` takes `qty`; the help line says "unless you gave one". |
| **B-16** | Minor | **fixed** | `defaultQuote` (`lib/contracts/snapshot.ts`): Signed › Confirmed › Sent to Client › Approved, then the newest; the Contracts tab's next-quote line reads the same rule. |
| **B-17** | Minor | **fixed** | `ContractRouteGhost` (`components/contracts/editor/contract-route-ghost.tsx`) for both contract loaders: the shape this browser remembers for the address's id (`om.shape.contract-pdf.<id>`), written by the page on arrival, by Templates › Contracts and the Contracts lists for each PDF row, and by an import / Upload a PDF before it opens. A browser that never met the contract draws the written shape (hard loads correct themselves on hydration). The signed contract's reveal ghost drops the Write with AI bone. |
| **B-18** | Minor | **fixed** | Repair **R160** (guarded, idempotent, a closing check "member whose mobile is also a client’s"): Kelvin Goh → 9336 0518 (lead + Hangout registration), Priya Tan → 9641 7305; R144's and R102's own seed values changed so a fresh base never collides. Mei Ling Han keeps 9182 7364. |
| **B-19** | Polish | **fixed** | No Write with AI on a signed contract (`contract-editor.tsx`); `.tool:disabled` / `.styleBtn:disabled` rest in `--om-color-on-surface-disabled`. |
| **B-20** | Polish | **fixed** | `doneWords` keeps a titled section's capitals: "Added to Additional Notes". |
| **B-21** | Polish | **fixed** | `.uploadRow` item cells wrap at ≤1024 (the draft table, the upload table, the trial's and the VO dialog's — one stylesheet). |
| **B-22** | Polish | **fixed** | `nameFromFile` in `recreate-dialog.tsx` — title case only for an all-lower-case stem. |
| **B-23** | Polish | **fixed** | `shareQuoteView` no longer logs; `noteQuoteViewShared` logs on the first Copy link / Send via WhatsApp; `dropUnsharedQuoteView` takes back a link this open made when the dialog closes before either (`components/quotes/send/view-link.tsx`). |
| **B-24** | Polish | **fixed** + sibling | The confirmation page's not-ready line for `version > 1` uses the view link's words; the confirmation and view links' chat cards say the same (`notReadyCard(..., 'it')`). |
| **E-05** | Blocker (audit E) | **fixed** — studio and trial | One reader, `lib/quotes/read-upload.ts` `readQuoteUpload`: a sheet for real (another currency refused), a PDF from its own words by S21's rule (`textRead(readQuoteText(...))`), a reference quote only when the PDF's words are that quote (`referenceInText` in `lib/xray/reference.ts` — studio named + 60 % of its lines), never a name; a photo / a PDF of pictures → `scan`, said. Create Quote, the trial (`components/trial/trial-quote.tsx`, accept `.xlsx,.csv,.pdf`), the VO dialog and the schedule's uploaded quote all read through it; failures say why (`unreadHelp`) and the 5 credits come back. **X-Ray** (`lib/xray/reading.ts`) recognises references by their words too; `runComparison` takes the recognised key (`otherRef` / `yourRef`), never a file name (stored readings still resolve by their stored name). |
| **D-08** | Minor (audit D) | **fixed** | The VO menu row: "a spreadsheet or a PDF" (`project-money.tsx`); the dialog's subtitle and drop zone say PDF too, and it reads PDFs (above). |

**Counts:** Blocker 2/2 fixed (B-01, E-05) · Major 3/3 fixed · Minor 15/15 fixed (B-05…B-18, D-08) · Polish 6/6 fixed. Nothing left unfixed in my area.

## Calls — fixed as recommended (his "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md for his review)
- **B·1** — both: the server refuses while the quote is revised (the client sees "Not ready yet — … is updating the quote this agreement signs");
  the Revise dialog says so before the press.
- **B·2** — S34's words, word for word, shown only while the SMS stand-in answers (`codeDemo` from `isStandInProvider()`).
- **B·3** — the mock's sentence while the window is open, the day once it has passed; appeals stay display-only.
- **B·4 / D·2** — PDFs read by rule on every Upload a quote door. **The two calls disagree on credits** (B·4: "charge only when a model reads";
  D·2: "the same 5 AI credits, given back when nothing reads"). Taken: **D·2** — the brief's rule 5 ("priced through AI credits if 1.0
  charged") and S19's one price for every quote read; 1.0 charged its Digitize quote. Nothing reads by model in this build, so B·4's way
  would make every read free; **for Vicky:** if he prefers B·4's, the change is one condition at each `chargeAI({ action: 'quote_digitize' … })`
  (Create Quote, the VO dialog, the schedule's picker) and the chips' price.
- **B·5** — "6 downlights" is 6.

## For other packages
- **Lane / package C (projects, money, client):** `app/po/[token]/page.tsx` and the meeting link (`app/meeting/actions.ts`) stamp a vendor's /
  client's open without asking `isStudioVisit()` (`lib/auth/studio-visit.ts`) — B-02's siblings. The portal's "Sign the agreement" row
  (`lib/portal/needs.ts`, `home.ts`) still offers an agreement whose quote is being revised; it could ask `quoteHoldsSigning` (lib/contracts/policy.ts)
  and say it waits — the link itself already says "Not ready yet".
- **Lane / package A (the demo day):** the restore's day-shift should move `lead_returns.replied_at` (Arjun's appeal window, B-10's carried note)
  and the demo quotes' `valid_until`. A·1's standing-session cookie and `om_studio` (B-02) both mark "this browser is the studio's" — one cookie
  may serve both at the merge.
- **Package E (the site):** with B·4 built, the site's "Upload a PDF quote" lines (E-02) hold. The UAT's ch6 note "do NOT put flo / dyel / cove…
  in the file name" is no longer needed. *Recreate from my quote* still matches a **photo** to a house style by its name — S11's declared stand-in,
  it picks a design, never a quote's lines; left.
- **For Vicky (found, not on my list):** the lead form's *Fill from a document* (REG-609) fills the same sample lead whatever file is picked —
  E-05's family; its 1.0 job (reading a lead sheet) exists by rule for imports (`lib/leads/homematch.ts`). His call whether it reads the file.

## Shared pieces changed (the other lane must know)
- `proxy.ts` + `lib/auth/paths.ts` (`STUDIO_VISIT_COOKIE`) — one more cookie set on studio pages; lane A changes sign-in / the standing session.
- `lib/global-search/model.ts` — one settings row (lane A changes ⌘K rows).
- `components/quotes/editor/text/rich-editor.module.css` (`.tool:disabled`), `components/contracts/editor/contract-editor.module.css`
  (`.styleBtn:disabled`), `components/quotes/create-quote-modal.module.css` (item cells wrap ≤1024 — the trial's and the VO dialog's tables too).
- `components/contracts/editor/dialogs.tsx` — `SendContractDialog`'s default subtitle is computed (hosts with their own subtitle unchanged).
- `lib/quotes/upload.ts` — `UploadRead` failures widened (`scan` · `currency`), `readDocument` replaced by `referenceRead` / `textRead`,
  `UPLOAD_ACCEPT` = `.xlsx,.csv,.pdf`, new `UPLOAD_KINDS` · `unreadHelp`; the new `lib/quotes/read-upload.ts`. Callers in projects
  (`vo-upload-dialog.tsx`, `schedule/source-picker.tsx`, `project-money.tsx`) and the trial (`trial-quote.tsx`, `lib/trial/policy.ts`
  QUOTE_WORDS) updated — other areas' files, touched only for the reader.
- `lib/xray/reference.ts` (`referenceInText`, `referenceQuote`), `lib/xray/reading.ts`, `app/quote-x-ray/actions.ts` (`RunInput.otherRef` · `yourRef`).
- `lib/contracts/policy.ts` — `LinkState` gains `quote-updating` (LinkNotice, the signing pages and the link cards handle it).
- `lib/leads/events.ts` · `lib/leads/activity.ts` (phones grouped), `lib/services/registry.ts` (the digitizer's entry), `app/settings/settings-ghost.tsx`.
- `scripts/repair-demo-data.ts` — R160, and R144's / R102's seed phones.

## Probes changed on purpose (each commented with its S42 finding)
`contracts-parity/verify-ct-r3.cjs` (the client opens the link in their own browser — B-02) · `pending-modules/verify-pm2-s02.cjs` (B-23: the
"made" line after the copy; B-24: the view card's words; B-01: its contract's quote approved before the link opens) · `verify-pm2-s04.cjs` / `verify-pm2-s19.cjs` (the chips say PDF — B·4 / D-08) · `verify-pm2-s05.cjs` (the appeal banner's dated words — B-10) · `verify-pm2-s14.cjs` · `ui-sweep/verify-sw-r2.cjs` (their contract's quote approved before it goes out — B-01; sw-r2 and ct-r3 also read `demo_code` — B-03) ·
`verify-pm2-s21.cjs` (a reference is read by its words; +1 check: a file named like one with nothing in it reads nothing) · `verify-pm2-s30.cjs`
(Priya's own number — B-18) · `x-ray-parity/verify-xr-r1/r2/r4.cjs`, `ui-sweep/verify-sw-r3.cjs`, `quote-editor-parity/verify-qe-r5.cjs` (the
reference files they drop now carry the reference's words — `x-ray-parity/fixtures/`, made by `make-reference-pdfs.mts`).

## Checks run
All on lane C's production build (`DATABASE_URL=file:<scratch> npx next build` under the lanes' lock, exit 0), `next start -p 3175` on fresh
copies of `pbuild/base.db` migrated + repaired (`CRON_SECRET=probe-cron WHATSAPP_WEBHOOK_SECRET=probe-wa`).

| Check | Result |
|---|---|
| `tsc --noEmit` · `eslint app components lib proxy.ts` · `npm run design:lint` | clean · 0 errors (16 warnings, all older) · nothing new breaks a house rule |
| `db:migrate` + `db:repair` twice on the scratch copy | R160 mends 3 rows, then "nothing to mend"; every check passes (incl. the new "member whose mobile is also a client’s") |
| **`pending-modules/verify-pm2-s42b.cjs`** (this package) | **66 / 66** — a full `.dump` of the DB before and after is identical |
| Step probes (pending modules) | s02 106/106 · s03 79/79 · s04 82/82 · s05 113/113 · s11 62/62 · s12 72/72 · s14 69/69 · s19 116/116 · s21 41/41 · s29 88/88 · s30 108/108 · s41b3 175/175 |
| Regression (`regression/run.cjs` 3175) | ct-r1 36/36 · ct-r2 24/24 · ct-r3 28/28 · ct-r4 29/29 · xr-r1 27/27 · xr-r2 31/31 · xr-r3 28/28 · xr-r4 16/16 · qe-r5 21/21 · sw-r2 27/27 · sw-r3 13/13 · ux-p4 56/56 · ux-p5 58/58 · search 27/27 |
| Server log | no error; no page error in the probe |
| 390 / 320 / 768 | no sideways scroll on the signing link, the confirmation link, Arjun's lead, the trial and Settings › Lead stages at 390; the phone stays on one line; names wrap at 768 touch |

The first runs caught, and the package fixed: the Mark-as-signed refusal read "oM-10001 …" after the editor lowercases a rule's first
letter (the rule now opens "Its quote OM-…"); the view link's chat card said "still preparing" where its page says "updating" (one sentence
now); the empty-file sentence kept its words; and four older probes set a contract out for signature while its quote was a Draft under
required approval — a state Send itself refuses; they now approve the quote for that step and put it back (each commented).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — the one mock touched (the appeal banner, 858:24095) keeps its sentence while the window is open;
   every new sentence is listed as invented copy in `reg-S42B.md`.
2. **One system, no one-offs** — one signing rule for every path (`quoteHoldsSigning`), one code provider for sign-in, the portal and signing,
   one quote reader for every Upload a quote door, one studio-visit rule for every client link's Viewed, the house `ReadOnlyNote`, `LinkNotice`,
   `MSG.uen`, the remembered-shape pattern (REG-817) for the contract loaders.
3. **Plain words** — "Not ready yet — … is updating the quote this agreement signs", "Demo only — no text is sent: any six digits sign it.",
   "Qanvast’s 7 days ran to 4 Sep ’26", "can’t move to Lost yet · Has project P-2026-001 — it stays Won", "It has no words to read — a photo or a
   scanned page."
4. **Nothing is lost** — a held signature keeps the same link (it opens again); the company and UEN stay on the record; an unshared view link is
   taken back silently (nothing was shared); the 5 credits come back when nothing reads; the probe puts every row back (a full dump before and
   after is identical).
5. **Say why** — Mark as signed, the Maison AI row, the Lead stages card, every unreadable file, the waiting link all say why, in place.
6. **Back returns where you came from** — no navigation changed; the Maison AI refusal row opens the lead with the house `?from=`.
7. **Every screen is whole** — the settings ghost draws the new read-only line; the contract loaders draw the remembered shape; the signed
   contract's reveal ghost matches its bar.
8. **Every width is designed** — item names wrap ≤1024 (touch has no hover); the phone stays whole on one line; 390 / 320 checked for sideways
   scroll on the pages changed.
9. **Tables follow the leads listing** — no table structure changed.
10. **Motion with purpose** — none added; every press answers at once (the code press rests while it sends).
11. **Honest data** — the Blocker (a draft becoming the signed quote) and E-05 (a stranger's file shown as the demo's quote) are closed; Viewed
    names only the client; the code step no longer claims a text; one person per mobile (R160); counts are the viewer's own.
12. **Reach for everyone** — the UEN error takes the focus; the notices are `role="status"`; the read-only line is text, not a grey-out.
