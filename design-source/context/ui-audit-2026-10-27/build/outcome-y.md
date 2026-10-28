# Y — the requests aimed at B2 / B5 files, landed in main (the calm UI build, 2026-10-28)

Every §7 request (B4 fork B: §5; B5: also `parts/*.md` §5) from the six lanes whose target file is owned by **B2** or **B5**
(`ownership.json`, first match wins), applied in main's working tree under the brief's §1 (nothing lost, display only) and §2 (the words).
Plus the orchestrator's two mid-task asks (O-1, O-2). No probe, no file outside B2 / B5, no `lib/quotes` / `lib/contracts` file edited.

**Counts:** 52 rows (50 lane requests + the orchestrator's O-1 · O-2) — **applied 19 · already done 25 · skipped 8.** A row with mixed parts (38 · 45 · 47 · 48 · 50) is counted by its main part; its cell says the rest.

## 1 · Requests

| # | From → target | Request | Status |
|---|---|---|---|
| 1 | B1 → B2 | `components/leads/menus.module.css` `.label`: no capitals | already done (B2, at B3's same ask: sentence case at the house caption) |
| 2 | B1 → B2 | Tasks: "Studio Tasks" → "General tasks" | already done |
| 3 | B1 → B2 | Tasks: drop the Leads · Projects segment | already done (moved into the scope pill's menu, `task-source`) |
| 4 | B1 → B2 | Tasks: "Attach Files" → "Attach files" | already done |
| 5 | B1 → B2 | Tasks ⋮: "Save as a template · Manage templates · Export…" (W-607) | already done — **conflict**: B2's own row W-636 asks "Save as a template · Templates · Export all…" for the same `TasksMoreButton` (it serves /tasks and the lead tab); §2 is silent, so B2's applied and probed words stay. Delete all already left /tasks' ⋮ |
| 6 | B1 → B2 | Tasks: "Add Task" → "New task" | already done |
| 7 | B1 → B2 | The lead's L2 header chips as `MetaChip kind="fact"` (type · source · scope); tab "Notes & logs" | applied — `app/leads/[id]/overview.tsx`: B2 had made type / budget / phone / source a plain line and kept the green Qanvast source chip; that chip is now `kind="fact"` (sentence case, colour and glyph kept). The return state stays a status chip. The tab was already "Notes & logs" |
| 8 | B1 → B2 | Filters modals: no Sort tab (the heads sort) | already done (the table's Filters; the kanban and the phone keep it — no heads there) |
| 9 | B1 → B2 | Qanvast Ops' account cards: the stand-in line → `<DemoNote>` | applied — `components/qanvast/account/account-frame.tsx` (the "?" IconButton → `DemoNote`, testid `qanvast-account-sample` kept on it, same tooltip words) + its ghost `account-ghost.tsx` (the 36 "?" slot → a Demo `GhostChip`) |
| 10 | B1 → B2 | "Add Lead" → "New lead" | already done |
| 11 | B1 → B5 | Company panel: "n approvals" in grey | already done (`.await` is on-surface-secondary) |
| 12 | B1 → B5 | Finance's landing tab "To do" → "Needs your attention" | already done (`lib/finance/sections.ts`) |
| 13 | B1 → B5 | Settings › Notifications titled "Studio notifications" (1-41) | applied — `lib/settings/modules.ts` (the tab label; key `notifications` and `?section=notifications` unchanged) + `app/settings/notifications-settings.tsx` (the module's sr-only title). The tab IS the module's visible title (the module's H2 is screen-reader-only since B5's 5-17). Followers in B2's files: the two meeting-email snackbars (REG-Y.2) |
| 14 | B1 → B5 | Notifications' previews read `sampleFieldsFor(event)` (5-47) | applied — `app/settings/notifications-settings.tsx`: the wording drawer's two previews and the edit dialog's preview |
| 15 | B1 → B5 | `lib/company/member-words.ts`: "WhatsApp notices" → "WhatsApp notifications" | applied (+ the same word in Notifications' channel tooltip, REG-Y.3) |
| 16 | B1 → B5 | Integrations' stand-in lines → `<DemoNote>` (5-16) | applied — `components/company/integrations-view.tsx` and `qanvast-listing-card.tsx`: B5 had drawn its own copy of DemoNote (Tooltip + span + MetaChip); both now use the house piece (testids `int-simulated-*` / `qanvast-simulated`, tooltip and accessible name unchanged); the copies' CSS (`.demo`, `.demoChip`) removed |
| 17 | B1 → B5 | Billing: "Visa ending 4242 · expires 08/28", "Update card", drop the Dodo sentence | already done (the Dodo sentence moved into Update card's tooltip, not dropped — rule 1) |
| 18 | B1 → B5 | Reports › Health: four tiles + Show all figures | already done |
| 19 | B1 → B5 | `lib/finance/todo.ts` commission ask: "Michelle asks for 5% commission on Executive Condo" (W-260) | applied, **without** "on Executive Condo" — the To do row's caption already names the project (`captionOf`), so the title would say it twice (T-04). Now "Michelle asks for 5% commission" (payments basis) · "5% commission on the profit" · "S$500.00 commission" · "no commission" (was "No commission" mid-sentence). ▲ |
| 20 | B1 → B5 | Reports' tiles "Owed to you" → "To collect", "First response" → "First reply to new leads" | already done ("To collect" in `lib/finance/reports.ts`; no "First response" tile exists in B5's files — the Dashboard's is B1's) |
| 21 | B2 → B5 | Settings › Meetings "Objection answers" → "Answers to concerns" (W-578) | applied — `lib/settings/copy.ts` (card and ghost read it); followers in B2's meeting room (REG-Y.1) |
| 22 | B2 → B5 | Reports › Meetings: the tier words + "Won after" | applied — `components/company/reports/meetings-report.tsx`: the score cell's tier and the Deal score check's rows read `TIER_LABEL` ("Very likely · Likely · Maybe · Unlikely"); "Won after" was already done |
| 23 | B2 → B5 | Reports › Leads: MEDIANS_NOTE behind "How these are counted" | already done (`HowCounted`, `insights-foot`) |
| 24 | B2 → B5 | Reports › Health: "Tickets raised" → "Issues raised" | skipped — not a B2/B5 file (`lib/studio-health/model.ts` is B1's); B5 forwarded it to B1 (R-B1-1) |
| 25 | B3 → B2 | `ai-brief.tsx`: no Tag for an empty tag | already done |
| 26 | B3 → B2 | Fold the brief to its first sentence ≤767 (3-09) | skipped — B2 declined on purpose (§1/§7: the second sentence carries the guidance); needs a project-only prop and its own probe |
| 27 | B3 → B2 | `DropdownLabel` sentence case | already done |
| 28 | B3 → B2 | Activity's 14 type chips → one "Show: All ▾" pill (3-08) | skipped — replaces a control on the lead's and the project's Activity and `ux-p3` asserts the six chips; B2 left it for Vicky (§8) |
| 29 | B3 → B2 | The narrow Recent activity card (3-06) | already done (B2's part; the two-line clamp is B1's `timeline.tsx`) |
| 30 | B3 → B2 | `lib/leads/stage-data.ts:79` payment names in sentence case at the source | skipped — a stored value (written into stage logs); shown as "Mid-project" via `clientStageName` |
| 31 | B3 → B2 | The lead ⋮ "Client portal"; the lead-mock words; "Deleted projects" | already done |
| 32 | B3 → B2 | 3-51 one hold chip set (No date yet) | skipped — a rule (the lead's On Hold date is required, REG-453); for Vicky |
| 33 | B3 → B5 | Finance tabs Client payments · Costs · Payments made; Cash in hand; CreditsTable's phone Next step; To do's PO row; Max projects; Checked by; the margin warning; Document numbers' Issues; the Approvals card; "Bill EL-2207 from …" | already done (B5's §7 answers, spot-checked) |
| 34 | B3 → B5 | The portal set-up's Clients card: `agoText` caption | skipped — offered "if wanted"; B5 kept the state only, as B3's chip now does |
| 35 | B4 → B2 | `QuotesTabGhost` widths: "All quotes" + "New quote" | applied — `components/leads/detail/tab-ghosts.tsx`: New quote's slot 122 → 105; the approval to-do chip 241 → 130 ("1 approval", was "Waiting for my approval · n"); and for Tools › Quotes (`studio`) the toolbar's empty title slot and only a phone's create glyph, as `quotes-toolbar.tsx` `createInHeader` draws it (B1's `QuotesListGhost` draws the header's 105) |
| 36 | B4 → B2 | `quote-card.tsx`: `quoteStatusLabel` from `lib/quotes/status-words.ts`; "No quote yet · Make one from a template or upload your own." | applied (the import) / words already done |
| 37 | B4 → B2 | Optionally move the label maps into `lib/leads/quote-filters.ts` and re-export from `lib/quotes` | skipped as asked (touches `lib/quotes`, B4's) — superseded by O-1 below |
| 38 | B4 → B5 | Settings 5-44: "What prints as “Prepared by” on every quote"; "Signing links"; the units card shows the stored units as they are | already done; the default units' one case — skipped (stored values in `lib/quotes/items-model.ts` `UNITS`, B4's) |
| 39 | B4 (fork B) → B5 | `BrandKitGhost` words (4-35) | applied — `components/company/company-ghosts.tsx`: the one-line lead, "PNG, JPG or SVG.", no Colours helper, the print note "When it prints, Default Quote PDF keeps its own Brand ink, Brand grey and Table band colours, and its own fonts." (the ghost draws no Fonts card, so its helper has no twin) |
| 40 | B4 (fork B) → B5 | `lib/company/sections.ts`: "Schedules" → "Project schedules" | already done |
| 41 | B4 (fork B) → B5 | Settings: "Change in Default Quote PDF › New quotes" → "… › Quote settings" (W-274) | applied — `app/settings/settings-view.tsx` (the button and its help line "set on the template’s Quote settings tab"; `?tab=new-quotes` unchanged) |
| 42 | B4 (fork B) → B5 | The Company panel's "n proposed" → "n approvals" | already done |
| 43 | B4 (fork B) → B5 | 4-39: Price book tabs "Items · Sections" where B5's files carry them | already done (`sections.ts` tabs, `folder-libraries.ts` roots). B5's other mentions of "My Items" / "My Sections" (two bell titles and a refusal in `app/company/price-book-actions.ts`, the Pro feature's name, the plans table, a trade's usage line) left as they are — B4's own files still say "My Items" everywhere, so one pass for both ▲ |
| 44 | B5 → (B4) / coordinator | Materials' "New material" as its page's filled button; mirror the Price book ghost in `company-ghosts.tsx` | already done — the filled create landed in `library-gallery.tsx` (B4's) with Materials' `newAction`; `company-ghosts.tsx`' `PriceBookGhost` is mounted nowhere (the loaders draw B4's `price-book-ghost.tsx`, which B4 updated) |
| 45 | B5 → B2 | R-B2-1 `lib/leads/tat.ts`: legs, sheet words; `MEDIANS_NOTE` → "Each time is the usual one — the middle lead’s, so one slow lead doesn’t skew it." | legs and sheet already done; **MEDIANS_NOTE skipped** — the note is shared with Projects › Reports (`project-insights-view.tsx`, B3's), where "the middle lead’s … one slow lead" would be wrong; B2's neutral words stay (T-09) |
| 46 | B5 → B2 | R-B2-2 `lib/leads/sales.ts`: "By member", "Going quiet, by member" | applied |
| 47 | B5 → B2 | R-B2-3 `lib/meetings/report-model.ts`: Won after · Tips used · Is the deal score right? · sheet heads; the evidence "Dane 0% · studio 25%" (W-649); "with Copilot on" (W-144); also B5-S's same ask | Won after / Tips used / the check / heads already done; **evidence applied** ("· best n%" dropped — every member's share is the By member table's Won after on the same page, T-04; the unused `best` removed); **"Copilot" already done as "Meeting Copilot"** — §2 forbids "Copilot alone", so the conflict with W-144 resolves to §2 |
| 48 | B5 internal | finance-settings frame (B5-S a–d); permissions' "monthly limit"; the Finance badge; Profitability's ProjectCell; books-ghost's dead Reports branch | frame / limit / badge already done; ProjectCell skipped (B5's call — the cell is also Export's column); books-ghost skipped (optional — "or leave it dead"; no visible effect) |
| 49 | B6 → B2 | #7 Files: a floor plan's ⋮ "Make a 3D picture" → "Trace a floor-plan photo"; #14 `lib/leads/activity.ts` render(s) → version(s); #17 "Send on WhatsApp" | applied — `files-grid.tsx`, `file-viewer.tsx` (label only; the planner's dialog is B6's); `activity.ts` (14 lines: shared / opened / stopped / renewed / reopened / picked / call back / notes / pins / replies / purged / the folder — "rendered" stays the verb); `ask-client-dialog.tsx` "Send on WhatsApp" (testid `ask-send`); Meetings were already "Send on WhatsApp" |
| 50 | B6 → B5 | #8 `LIBRARY_ROOT.visualizer` → "Designs"; #17 the PO send | #8 already done; #17 applied — `components/finance/use-costs.tsx` "Send on WhatsApp" / "Approve and send on WhatsApp" |

**The orchestrator's two (mid-task)**

| # | Ask | Status |
|---|---|---|
| O-1 | One status map: B2's copies in `lib/leads/quote-filters.ts` / `contract-filters.ts` import and re-export B4's | applied — the words were compared first and are identical (Draft · Waiting for approval · Approved · With client · Confirmed · Signed; Draft · Waiting for signature · Signed; an unknown value shows as stored in both). `QUOTE_STATUS_LABEL` / `quoteStatusLabel` / `CONTRACT_STATUS_LABEL` / `contractStatusLabel` are now `export { … } from '@/lib/quotes/status-words'` / `'@/lib/contracts/status-words'` (those import only a type back — no runtime cycle); the exported names are kept. `quote-card.tsx` and `move-stage/panels.tsx` import B4's module directly. `quoteVisibilityLabel` stays B2's (B4 has no twin) |
| O-2 | The outlined empty state | applied — `components/meetings/lead-meetings.tsx`: `primaryLook={studio ? 'filled' : 'outlined'}` — a lead's and a project's Meetings first run is outlined; Tools › Meeting Copilot (`studio`, its own page's one job) keeps it filled. B2's other record-page empties already outline their own buttons (Files, Questionnaire's Add them, Tasks' `quiet`); Qanvast Ops / Hangouts empties are not record pages |

## 2 · Files touched (28)

B2: `app/leads/[id]/overview.tsx` · `components/leads/detail/{tab-ghosts,quote-card}.tsx` · `components/leads/move-stage/panels.tsx` ·
`components/leads/files/{files-grid,file-viewer}.tsx` · `components/leads/questionnaire/ask-client-dialog.tsx` · `components/meetings/lead-meetings.tsx` ·
`components/meetings/room/{meeting-room,meeting-room-ghost}.tsx` · `components/qanvast/account/{account-frame,account-ghost}.tsx` ·
`lib/leads/{quote-filters,contract-filters,activity,sales}.ts` · `lib/meetings/report-model.ts`.
B5: `app/settings/{notifications-settings,settings-view}.tsx` · `lib/settings/{modules,copy}.ts` · `lib/company/member-words.ts` ·
`components/company/{integrations-view,qanvast-listing-card,company-ghosts}.tsx` · `components/company/{integrations-view,qanvast-listing}.module.css` ·
`components/company/reports/meetings-report.tsx` · `components/finance/use-costs.tsx` · `lib/finance/todo.ts`.

## 3 · Checks

- `npx tsc --noEmit -p .` — clean (exit 0, after the last edit).
- `npx eslint` on the 28 files — no errors, no warnings.
- `npm run design:lint` — "nothing new breaks a house rule" (every rule at or under its baseline; the baseline untouched).
- The guard (`guard-before.json` → `scratchpad/guard-y.json`): ✓ pages none gone · ✓ server actions none gone · ✓ control handles none gone · ✓ keyboard shortcuts none gone (173 pages · 1064 actions · 3905 handles · 120 keys).
- No build, no server, no probe run, no `local.db` write (the lane brief's rules for this pass).

## 4 · Probes to restate (for the other agent — none edited here)

Mark each `(the calm UI build 2026-10-27, a deliberate change)`.

- `design-source/verify/pending-modules/verify-pm2-s28.cjs:159` · `:164` — `.includes('Make a 3D picture')` on a Files ⋮ → `'Trace a floor-plan photo'` (164 is the negative; keep it negative with the new words).
- `verify-pm2-s28.cjs:181` · `:343` · `:408` · `:450` — `getByRole('menuitem', { name: 'Make a 3D picture' })` (Files' ⋮) → `{ name: 'Trace a floor-plan photo' }`. (The dialog's own name, `photoDialog`, is B6's.)
- `design-source/verify/pending-modules/verify-pm2-s45c.cjs:298` — the viewer's ⋮ `/Make a 3D picture/` → `/Trace a floor-plan photo/`; `:304` (Marketing's negative) the same words.
- `design-source/verify/ai-visualizer/verify-viz-client.cjs:57` — `'shared 3 renders with Kevin Ng on WhatsApp'` → `'shared 3 versions with Kevin Ng on WhatsApp'`; `:59` — `'asked for a call back about the renders'` → `'… about the versions'` (`:56` "rendered V2 of “Living room”" unchanged).
- `design-source/verify/pending-modules/verify-pm2-s02.cjs:363` — `!/shared 1 render with Kevin Ng/` → `!/shared 1 (render|version) with Kevin Ng/` (keeps it meaningful).
- `design-source/verify/pending-modules/verify-pm2-s42a.cjs:302` — `labels.indexOf('Notifications')` → `'Studio notifications'`; `:303` `getByRole('tab', { name: 'Notifications' })` → `{ name: 'Studio notifications' }` (substring still matches; exact is cleaner).
- `verify-pm2-s42a.cjs:354` — `/A mobile signs you in and gets WhatsApp notices/` → `/… gets WhatsApp notifications/` (and its message).
- `design-source/verify/pending-modules/verify-pm2-s37.cjs:156` — `/^Demo$/i.test(text(qanvast-simulated))`: the house DemoNote's chip carries an info glyph whose ligature is in innerText → `/^(info\s*)?Demo$/i`, or read the chip's `[class*="text"]` (the aria-label check on the same line holds).
- `design-source/verify/pending-modules/verify-pm2-s42e.cjs:402` · `:408` — `text(sim)` / `text(sim2)` read the chip's words ("Demo"); the sentence is its name → `getAttribute('aria-label')` (`!/play/i` for the Designer, `/play Qanvast’s answer/` for the Owner). Profile is tabbed now (B5): the card is on `?tab=registrations`.
- `design-source/verify/pending-modules/verify-pm2-s34.cjs:297–299` — B5 already listed: read `int-simulated-*`'s `aria-label`, not its text (now "info Demo").
- `design-source/verify/projects/verify-pj-gap-f2.cjs:71` — `/Michelle asks for 5% of what the client pays/` → `/Michelle asks for 5% commission/`.
- `design-source/verify/projects/verify-pj-gap-f1.cjs:114` — `{ name: 'Send via WhatsApp' }` (the PO send) → `'Send on WhatsApp'`; `:154` — `/Approve and send via WhatsApp/` → `/Approve and send on WhatsApp/`.
- Messages only (no failure, words in the message): `verify-pm2-s41b5.cjs:191–193` ("behind its “?”" → "behind its Demo chip"; the hover-and-tooltip read works as is), `parity-map-build/verify-pm-f.cjs:285` ("Send via WhatsApp opens wa.me" — it presses `ask-send`), `responsive-all/verify-rwd-w4.cjs:73` · `:247` ("Change in … › New quotes" → "› Quote settings").

**20 lines to restate in 9 files** (s28 ×6 · s45c ×2 · viz-client ×2 · s02 ×1 · s42a ×3 · s37 ×1 · s42e ×2 · pj-gap-f2 ×1 · pj-gap-f1 ×2), plus s34 :297–299 already on B5's list.

## 5 · Cross-lane follow-ups noticed (not B2/B5 files — for the other agent)

- ⌘K (`lib/global-search/model.ts:230`): the Settings card row "Objection answers" → "Answers to concerns" (keep "objection answers" in its words). The Settings module row's title follows `SETTINGS_MODULES` by itself ("Studio notifications").
- Your profile names the old tab: `components/profile/your-notifications.tsx:94` and `lib/notifications/personal.ts:128 · 151` "Settings › Notifications" → "Settings › Studio notifications".
- B4's `components/company/templates/editors/{text,payment}-template-editor.tsx` still say "a quote template’s New quotes tab" (W-274 renamed the tab "Quote settings").

## 6 · ▲ For Vicky

1. **"Studio notifications" is the Settings tab's own name** (the module's title has been screen-reader-only since 5-17), so the strip grows by one word and ⌘K's row follows. Its key and address are unchanged.
2. **One Demo chip for every stand-in that B1's DemoNote covers.** Integrations, Listed on Qanvast and Qanvast Ops' Lead credits / Reviews now use the house DemoNote. It carries a small info glyph that B5's copy didn't have. The meeting room's listening line and the Hangouts samples keep B2's "?" (not in the request), so stand-ins still have two looks.
3. **Commission asks read "Michelle asks for 5% commission".** The row's caption already names the project, so the title doesn't add "on Executive Condo". A profit-based ask reads "5% commission on the profit".
4. **The Qanvast source chip on a lead's tabs reads "Qanvast" in sentence case.** It is still green and keeps its glyph (a source is a fact, T-06).
5. **The coaching line drops 1.0's "best" share** ("Dane 0% · studio 25%"). Every member's share is in the By member table on the same report.
6. **The Meetings first run is outlined on a lead or a project**, and stays filled on Tools › Meeting Copilot, where planning is the page's one job.
7. **Three word conflicts, settled:**
   - The Tasks ⋮ keeps "Templates · Export all…" (W-636) over W-607's "Manage templates · Export…", because it is one shared component.
   - "Meeting Copilot" stays over W-144's bare "Copilot", per §2.
   - The reports' footnote keeps B2's neutral wording, because Projects reads the same note.
8. **"My Items" / "My Sections" are still the library's name in sentences across the app.** The tabs say Items · Sections, but B4's quote editor, Price book and Create Quote words, and B5's bell titles, refusal, Pro feature name and plans table, all keep "My Items". Renaming them is one pass for both lanes if you want it.
