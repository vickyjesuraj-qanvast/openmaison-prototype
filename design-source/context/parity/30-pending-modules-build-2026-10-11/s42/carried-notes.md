# Notes earlier steps left for S42 (collected 2026-10-14)

## From steps.md
  phone's labelled cells, helper lines). No migration, no repair (R117 free). **For S42:** a ghost's tab strip doesn't scroll to the open tab on
  a phone (older); pages whose lower screens are studio data match their first screen only. **Flag for Vicky:** the four-width panel scale and
- **For S42 — the demo's recent moments age (found by S30's run):** `verify-pj-r4a` (72/73) and `verify-pj-fix-F` (43/44) fail because
  Benjamin's floor plan was "shown an hour ago" when its repair ran (5 Oct) and the portal calls a file new for `NEW_FILE_DAYS` = 7
  (`lib/portal/needs.ts`). Restores already move open tasks, live share links and the credits month with the demo day (REG-341, S08b) — the same
  rule is missing for the demo's other *recent* moments (a file shown to a client, a share, an update, anything a "new for n days" rule reads).
  S42: list every such rule, make `restoreBaseline` move the moments that were recent on the snapshot's day by the same shift, bring today's
  base back once (a repair that re-anchors only the demo's own rows, guarded like R111), and keep Activity's lines in step with the moved times.
- **After S30 (lane A):** **signing in** — `/sign-in` (mobile +65 or work email → a 6-digit code, any six digits pass and the page says so;
  failures already handed to S42 (pj-r4a 72/73, pj-fix-F 43/44). Fixed in the run: `verify-pm2-s30` expected `/leads` as home (S22 made it
  `/dashboard` — a deliberate change, assertions updated); `dane-p3` expected Gerald Tan first for "tan" (S27's demo added Chloe Tan — it now
- **For S42 — the website's claims:** the Home's results band still says "20+ AI capabilities" and "30s quote upgrade" (1.0's words) and
  "Upload a PDF quote"; check every number and capability the site states against what 2.0 actually does (Maison AI answers by rule, nothing
  calls a model, Create Quote reads XLSX · CSV) and say only what is true, listing each change for Vicky.
  **For S42's regression:** run those two with the secrets.

## outcome-S34.md
120-- **S41b:** the crons listed above (*Found in 1.0*); 1.0's per-fork central notification log is Platform.
121:- **S42:** the demo's derived reminders — the bell's "A task is due in 30 minutes" event names a row that reads "Due tomorrow: …" (older,
122-  seen in Sent messages after a sweep).
123-- **The orchestrator / CLAUDE.md's Map:** *Real services (pending modules S34)* — `lib/services/{slots,registry,install,sweep,feeds,pdf,

## outcome-S39.md
110-- **S41b:** Studio Health's card is answered (built, three lines kept with his reason); nothing in 1.0's usage folders is left without a home.
111:- **S42:** the demo's ageing moments — Studio health counts what happened *in the range*, so as the demo's history ages, Last 30 days thins
112:  (today 6 of 8 active); the restore's day-shift (S42's note) would move these too if it shifts the demo's recent acts. The Members page's crumb
113-  from a profile ("Public profile / Company / Members") is the house's L2 crumb, unchanged — worth a look in the UX audit.
114-- **S34 (developers):** none — nothing here calls a provider. A real product-analytics stack, if ever wanted, is the developers' and Qanvast

## outcome-S41b3.md
80-### Found in 1.0, not on a card
81:- **The Visualizer landing's floating "Try it free" pill** (3face5604 / 84657961c, 2026-10-08) — S36's page (its Try now sits top and close); for S42 to weigh.
82-- **1.0 later withdrew every anonymous model call** (2026-09-22 "signup comes before any model call"; the Visualizer to zero renders on 2026-09-30) — for its own spend; 2.0's tools are rules in the browser, so the trial keeps 1.0's earlier, fuller design. Said for Vicky.
83-- **TURNSTILE_DISABLED** (1.0: run without the bot check on purpose) — 2.0's stand-in bot check passes everyone already and the tools are off in a real build until set; not read, so not listed (the first builder had added it to `.env.example` and the registry — taken out).
--
217-## For the next steps
218:- **S42**: the Visualizer landing's floating Try it free pill (1.0, above); the site's claims check (steps.md) now also covers the three tools.
219-- **The developers**: plug the platform database's workspace store (`setTrialStore`), Turnstile (`setBotCheck`) and a lasting limit store
220-  (`setLimitStore`), then set `TRIAL_TOOLS_ENABLED=true`; give the claim a timeout with a remote tenancy.

## outcome-S21.md
107-- **S41b:** nothing from X-Ray (every 1.0 file mapped above).
108:- **S42:** whether Upload a quote / VO / schedule uploads should take PDFs by rule (decision 2 — Vicky's call on the credits).
109-
110-## Principles check (DESIGN-PRINCIPLES.md)

## outcome-S22.md
140-  { scope: 'headlines' })`, hourly (1.0's cache); a model behind the Ask box is Maison AI's `readQuestion` (S10).
141:- **S35 (marketing site), S41b, S42:** the Dashboard is a module page in its own right — if a "Today" summary email ever comes, it reads
142-  `fetchDashboard()` rather than its own counts.
143-- **UAT (the orchestrator's):** a step fits the first chapter — "Open OpenMaison: the Dashboard greets you; press the first Needs you row, come

## outcome-S29.md
118-  S11's.
119:- **S42:** the Changes view interleaves a replaced phrase as ~~old~~ new; long contracts past ~2,000 words on both sides show Before / After
120-  only (the marks would cost the browser too much).
121-- **For Vicky:** REG-420's Write with AI now proposes first (REG-S29.2); the phone's contract bar is two lines (REG-S29.9); every new word is

## outcome-S26.md
116-  delivery (the open thread polls every 8 s, as P-G's) → a socket; `/chat/file` and `/files/raw` need a real session.
117:- **S42:** the Messages ghost's right pane still draws an open conversation while the page shows "Pick a conversation" (P-G's, older).
118-- **For CLAUDE.md's Map (the orchestrator's):** *Team and group chats (pending modules S26)* — `lib/projects/studio-chats.ts` (reads: the room,
119-  two people, groups, a lead's Team conversation; `chatInbox` · `leadTeamLines` · `readersOf`), `lib/projects/conversation-access.ts`

## outcome-S30.md
42-  number on one line (`9111 2233` broke at 320).
43:- **Not S30's — for the orchestrator / S42:** `projects/verify-pj-r4a.cjs` ("What needs you first: the floor plan shown an hour ago") and
44-  `verify-pj-fix-F.cjs` (F-06 · F-24, the same "new file" row) fail one check each on today's demo data because of the data's age (nothing this step touches reads it): Benjamin Han's floor plan
45-  was shown on **5 Oct** in the fixture (`lead_files.shown_to_client_at`, written as `NOW - H` by the repair's `INSERT OR IGNORE` once), the

## outcome-S36.md
215-  analytics for the trial are the developers'.
216:- **S42:** the Sketch page's ghost draws three sample tiles where the page shows one (a loader can't know its tool).
217-- **The developers:** plug Turnstile (`setBotCheck`, mount the widget in `#trial-bot-check`, pass its token to `askTrialRender`) and a lasting
218-  store (`setLimitStore`), then set `TRIAL_VISUALIZER_ENABLED=true` for the build and the server; with an image model, render between

## outcome-S41b1.md
157-  `lib/quotes/cost-sight.ts`; a write from such a member goes through `keptCostPatch` / `withKeptCost`.
158:- **S42**: the ghost of a project's Money places its Needs you band by the remembered shape (REG-817) — a fresh browser's ghost draws no band
159-  while the page has one (older than this step; the tile count now follows the role).
160-- **For Vicky**: four switches (Manager its own) rather than 1.0's three; Waste % and Commission kept visible; Order from the quote not

## outcome-S37.md
115-## For the next steps
116:- **S41 / S41b:** the accreditation badges catalogue (above). **S42:** none known from this step.
117-- **UAT (the orchestrator's):** a step for chapter 1 or 8 — "Company › Profile › Listed on Qanvast → Update your listing: check what Qanvast
118-  reads from your records, add a photo of a finished home, Send changes; play Qanvast asking for changes (demo), fix and send again, play

## outcome-S41.md
103-  studio menu** (the probe scans for it).
104:- **S42:** the two proposals above wait for Vicky; nothing else.
105-
106-## Principles check (DESIGN-PRINCIPLES.md)

## outcome-S41b2.md
162-## For the next steps
163:- **S42:** a `notFound()` thrown by a record page under its loader (a lead, a quote, a contract, a reading, a template) still answers 200 —
164-  Next streams it and the browser draws the house's not-found (the page's own words now). Making those 404 means checking each record in a
165-  layout above its loader, as the tab layouts here do — a per-page change, worth it only where an address is likely to be shared or indexed.
166:- **S42 (UX):** the not-found header names the address's part of OpenMaison by `fromLabel` (e.g. "Quote X-Ray", "Finance"); an address
167-  `fromLabel` doesn't know reads "Page not found".
168-- **The developers:** make the 307s permanent (308) once the addresses settle; a real deployment that publishes the site at the domain root

## outcome-S41b4.md
174-## For the next steps
175:- **S42:** a new long-running AI surface that isn't one request per result calls `useBusyWhile(true)` while it runs (as the meeting room does).
176-  A new purchase page joins `PURCHASE_PATHS` (`lib/credits/nudge-model.ts`).
177-- **S34 (real services):** offers stay in the app; a real analytics layer reads `nudge_state.spent` / `answers_json`.


## Added at S41b-5's landing (2026-10-14) — for auditor E
- 1.0's older addresses `/qanvast-ops/portfolio`, `/complaints`, `/promote` are still unmapped (S41b-5's builder) — S41b-2's old-address list
  should take them (portfolio → the member's public profile / Company › Members? complaints + promote were not drawn, REG-1835 — say where they land).
- Lead credits › Overview's "Closures in the last six months" reads 0 contracts / S$0 from 7 Qanvast leads: confirm against the demo's records
  — checked 2026-10-14: none of the 7 Qanvast leads is Won (4 Lost · 1 On Hold · 2 Contacted), so 0 is consistent; still check the rule
  holds when one wins (1.0 counted Qanvast Guarantee submissions — say which rule 2.0 uses).
- Lead credits › Overview: the two chart cards grow to different heights when one shows its numbers (polish).
- Who sees it: Owner only (1.0's code) — the builder asks whether Admins should read / answer reviews; a call for Vicky, not a finding.

## Routing of the fix packages (2026-10-14)
- **The PDF quote reader** (B·4 · E-05 Blocker · D-08 · D·2): ONE owner — **S42B** (lane C) — `components/quotes/upload-reading.tsx` and what it
  calls, on every path (Create Quote › Upload a quote, the VO upload, the schedule's quote, the public trial's Upload a quote). S42D and S42E
  don't touch it.

## Found while landing S42C (2026-10-14) — the orchestrator fixes it after the packages land
- **New project accepts an empty team** (`createDirectProject`, `app/projects/actions.ts`; the dialog's `AssigneeField` when the creator isn't a
  Designer): the owner's own "Dane Testing" (P-2026-006, made on :3000 at 13:05) is a direct project with no member, so local.db's repair fails
  R68 "direct lead … no member" and "lead past New with no member". A Won lead needs a member (REG-334's rule) — the dialog and the server
  must ask for one ("Assign a member first", the house words), as the lead form does past New.
- **From S42B's outcome (for the orchestrator):** apply `isStudioVisit()` (S42B, B-02 — a studio member's own visit never stamps Viewed) to the PO
  link `/po/<token>` and the meeting link `/meeting/<token>` too (S42C had landed); the portal's "Sign the agreement" row could read
  `quoteHoldsSigning`. Fill from a document → calls-for-vicky.md.
- **From S42E's outcome (after S42F):** S23's meeting room offers "Move to Met", which the default Linear stage policy refuses for a New lead —
  the same refusal S42E fixed for a Hangout chat's ending with `heldMeetingStep` (`lib/leads/stage-policy.ts`): offer the stage the policy allows
  (Contacted, the meeting as its contact log), as End the chat now does. Landed with S42E — fix it on top.
- **S42E corrected call E·3:** under the default one-stage-at-a-time rule a New lead can't jump to Met, so End the chat offers Contacted (the
  chat as the first contact log); Dropped offers Lost with the reason.

## For the closing tidy-up (after every package lands)
- **UAT** (`design-source/uat/story/*.json`, then `build_uat.py`): step 4.02 says Fill from a document needs "no file" — it now reads the
  picked file (S42F); every Projects chapter step that creates a project must pick a member (S42F's TEAM_NEEDED). Check the other S42 changes'
  steps too (sign-in / join land on the Dashboard — S42A; End the chat offers Contacted — S42E; signing waits while a quote is revised — S42B).
- **The website's changelog** still claims "AI reads the screenshot" (S42F; S42E rewrote the rest of the site's claims) — say what 2.0 does.
- **Auto Fill** (REG-319, the Move stage window's contact log) is still a scripted stand-in — his call; listed in calls-for-vicky.md.
