# The steps, in order (one at a time)

Each step = one report card (sometimes two that belong together). "Survey keys" are the entries in
`design-source/context/parity/29-pending-modules-2026-10-11/surveys/<file>.json` (`<file>:<key>`). Decisions: take the card's recommendation.

## The recommended order (no mocks needed)
1. **S01 · Your own profile** — survey `onboarding:my-profile`, `api:my-account-profile`, the profile lines of `held:settings-company` (edit a
   member's name / email / phone / photo; My signature as its own card) and `held:shell` (the phone avatar answers Coming soon). One home: the
   rail's studio block and the phone's avatar open **Your profile**; an Owner / Admin also edits a member on Company › Members.
2. **S02 · Client links** — `public:client-links-no-login`, `api:link-previews`, `api:portal-loose-ends`: link preview cards on every client
   link (never OpenMaison's name), a read-only quote link (1.0 `/quote-preview`), a render file's Show to client, MI-014's quote line count, the
   dead chat-history code in invite-portal, and 1.0's old links redirecting (D-11, as recommended: redirect each to its new page).
3. **S03 · Contracts leftovers** — `held:contracts` (the signing PDF library back, imported / signed / Won-upload PDFs kept, a token + 7-day
   expiry + resend / cancel on the signing link, consent before a member's signature is auto-applied, contract value frozen at signing, the
   Coming soon presses, the 'Prepared with OpenMaison' footer — as recommended).
4. **S04 · Quotes leftovers** — `held:quotes` (Viewed on the quote link, a token on the client's link, an honest Upload chip, margin hints by rule
   in the editor's AI sheet, Draft with Maison AI as a rule-built first cut, the dead SKU / Add column / Upload logo / Brand Catalog presses
   defined or removed, Quote Files download, Quotes table sort, a line's status record decided).
5. **S05 · Leads leftovers** — `held:leads` (Manage Stages, testers L-2…L-5, Maison AI acting on a lead, the Won upload keeping its bytes, export
   columns, return Appeal, the Coming soon presses whose target exists, table-head sort, the Attach files dialog, Files › New › From Company
   Files, Notes › Refine, the On Hold phone line).
6. **S06 · Finance leftovers** — `held:finance` (recurring expenses, editable expense categories, the PO acceptance default, the Accounting role's
   open questions as recommended, the category palette, the rest per card).
7. **S07 · Projects leftovers** — `held:projects` (an overpayment to a credit note, a lead's 3-D layout following it to its project, Files'
   invoice / receipt Download, the rest per card).
8. **S08 · Setting up a new studio** — `onboarding:studio-setup-wizard`, `onboarding:welcome-and-tips` (a Set up your studio checklist over the
   pages that exist + a first-visit welcome).
9. **S09 · Inviting your team** — `onboarding:team-invitations` (Add member invites through the house outbox, an Invited state, the first
   visit's welcome).
10. **S10 · The mAIson assistant** — `studio:maison-assistant`, `api:maison-bot-assistant`, `held:maison-ai` (every words-only suggestion acts, the
    eight empty editor sheets filled, a chat home that shows and confirms any change before it happens; answers by rule; the model is the
    developers').
11. **S11 · Quote templates leftovers** — `held:quote-templates`.
12. **S12 · Price book leftovers** — `held:price-book`.
13. **S13 · Client portal leftovers** — `held:client-portal`.
14. **S14 · Settings and Company leftovers** — `held:settings-company` (minus S01's profile lines).
15. **S15 · 3-D Space Planner leftovers** — `held:space-planner`.
16. **S16 · Rail, Tools and the phone bar** — `held:shell` + `studio:studio-navigation` (after the modules that fill its Soon items exist, the
    rest; Log out's place comes with S30).
17. **S17 · Consistency leftovers** — `held:consistency-leftovers`.

## Then the others
18. **S18 · Notifications** — `held:notifications` (the daily digest and a personal mute — Q-42 / Q-43 opened as recommended).
19. **S19 · AI credits and plans** — `held:ai-credits` (plan locks enforced or the table softened, auto top-up, one price for digitizing; the
    demo credits month riding the demo day was done early in S08b).
20. **S20 · AI Visualizer** — `held:ai-visualizer` (HEIC, Replace as she answered, the drift guard, the dead Maison AI suggestions; the model
    stays the developers').
21. **S21 · Quote X-Ray** — `held:quote-x-ray`.
22. **S22 · Dashboard** — `studio:dashboard`, `held:dashboard`, `api:industry-news`, `public:industry-news-feed` (the hold lifted; a first cut on
    house pieces from Needs you, Reports, tasks, the team's load).
23. **S23 · Meetings and the Meeting Co-Pilot** — `studio:meetings-copilot`, `held:meetings`, `api:copilot-objections-competitors` (the hold
    lifted; built on house pieces as Projects was; recording and transcription honest stand-ins).
24. **S24 · Marketplace** — `studio:marketplace`.
25. **S25 · Market Insights** — `studio:market-insights`.
26. **S26 · Team and group chats** — `studio:team-chats`, `api:messages-free-chats`.
27. **S27 · Hangouts** — `public:hangouts` (+ `api:designer-portfolio-profiles`, which come back with it).
28. **S28 · Floor-plan photo to a 3D picture** — `studio:floorplan-isometric-ai`.
29. **S29 · AI writing help on quote text** — `api:ai-writing-help-quotes`.
30. **S30 · Signing in** — `onboarding:studio-sign-in` (+ Log out's place).
31. **S31 · A new studio joins** — `onboarding:studio-sign-up`.
32. ~~**S32 · Dark mode, guided tours, theme skins**~~ — `studio:personal-settings` — **PARKED WHOLE**, her words 2026-10-12: "ignore the dark
    and languages completely for now" and then "no do work on any themes and guided tours for now, since we will be building a lot more things
    later so that there is no repeat work later". Nothing of S32 is built. Skip it.
33. ~~**S33 · Countries beyond Singapore**~~ — **ON HOLD**, her words 2026-10-12: "holdon to countries beyond singapore for now." Nothing of
    S33 is built (DEF-30 stands); skip it.
34. **S34 · Real services behind the stand-ins** — `api:message-delivery-providers` (the adapters' seams and their admin, for the developers).
35. **S35…S41 · The cards I'd have skipped** — the marketing site and Book a demo · Try the Visualizer without an account · Verify for a Qanvast
    listing · ~~Languages~~ (**PARKED**, her word 2026-10-12) · Studio Health · Designer portfolio profiles (if not in S27) · the AI sandboxes — each built in its right form or, where
    1.0's is dead code, recorded as such.

41b. **S41b · Nothing left behind** — her words 2026-10-12: "please make sure nothing left behind from 1.0 to 2.0". Before S42: (1) a
    ledger of every `pending` line on all 41 cards (`29-…/surveys/*.json`) against the steps' outcomes — each line built / kept with its reason /
    stand-in / parked by her — any line with no answer gets built; (2) a sweep of 1.0 itself beyond the cards: every route under `src/app/**`,
    every API route, every table in `supabase/migrations/**`, every menu entry — each mapped to its 2.0 home or to a card; anything no card
    covered (and not Platform admin, which she excluded) is built in its right form, or recorded with why. The ledger is published for her.
42. **S42 · Bugs, intuitiveness, world-class UX** — her words 2026-10-12: "it will be good to build rest of the things like, bug fixes,
    intuitiveness, world-class ux." After S41: a read-only audit of everything this programme built (S01…S41) against DESIGN-PRINCIPLES.md and
    the brief's "How to add a missing thing", walked as each role at 1440 and 390 (bugs, dead ends, a second home, unclear words, more than one
    filled button, missing Undo, ghosts that don't match), then the fixes, then the full regression.

## Two lanes from S18 (her "two lanes sounds good", 2026-10-12)
Each lane is a full copy of the repo (`scratchpad/lanes/A` · `B`, re-synced from the main tree after each merge); builds take one lock; the
orchestrator merges each finished step into the main tree (3-way against the lane's base, migration regenerated in main), runs after-step, builds
main and re-runs the step's probe, then re-syncs the lane. Connected steps share a lane; the Dashboard comes last in its lane.
- **Lane A** (port 3160, repairs R117…R139): S18 Notifications → S19 AI credits → S20 AI Visualizer → S28 Floor-plan photo → 3D → S21 Quote
  X-Ray → S29 AI writing help → S30 Signing in → S31 A new studio joins.
- **Lane B** (port 3170, repairs R140…R159): S23 Meetings → S24 Marketplace → S25 Market Insights → S26 Team and group chats → S27 Hangouts
  (+ portfolios) → S22 Dashboard.
- **Then in order, one builder:** ~~S33~~ (on hold) → S34 Real services → S35…S41 (Languages parked) → S42 Bugs, intuitiveness,
  world-class UX. (S32 parked whole.)

## Notes carried between steps (read the ones before yours)
- **After S01:** members now edit their own name, email, phone, photo (`photo:<id>|<tint>` inside `members.color`) and signature on `/profile`;
  quotes read the preparer's name, email and signature live, so a rename or a removed signature reaches quotes already sent — **S03 / S04 decide a
  snapshot at send** (as signed contracts keep theirs). Changing a phone sends no confirmation code until sign-in exists (S30). Accounting can't
  set their own PayNow (S14). Repair R103 is the last R number used.
- **After S02:** every client link draws the studio's own preview card (`app/card/[kind]/[key]`, `lib/link-cards/*`; a new kind = one switch
  case + its loader; chat fetchers are named in `lib/link-cards/bots.ts` and never stamp Viewed — `fetchedForPreview`). The view-only quote link
  `/quote/<token>` (`quotes.view_token*`, `lib/quotes/view-link-queries.ts` `clientSafe` = the print's fields only) and its ⋮ row in the quote
  editor; a client only sees an approved quote. 1.0's old links redirect (`lib/links/old-links.ts`). Files › Show to client also lands a render on
  the portal's Designs (`render_share_links.file_id`). `invitePortal` is gone (CLAUDE.md's Map still named it — fixed by the orchestrator).
  Migration 0086, repair R104 (last R used). **For S03:** the signing link's token should accept 1.0's `/sign/<token>` (a port column);
  `linkCard('sign', key)` reads `fetchSigning`. **For S04:** `/confirm/<id>` still keys on the quote id and **still sends each line's full record
  (cost, mark-up, rebate, vendor) to the client's browser** — project it through `clientSafe` there and on `/sign/<id>/quote`; Viewed on the
  view link belongs in the page's first ask, never a chat fetch.
- **After S03:** signing links are `/sign/<token>` (`contracts.sign_token`, older contracts keep their id as token; 1.0's tokens via the port
  column; bundles keep their id) with a window (`sign_expires_at`, Settings › Quotes & pricing › Contracts 7 / 14 / 30; Stop the signing link =
  Draft + fresh token, Undo); imported / marked-signed / Won-upload PDFs are kept in the lead's Files › Contract & VOs (`keepContractPdf`) and
  Files refuses to trash them; PDF templates (`contract_templates` kind `pdf` + `contract_template_files`); the preparer's signature is
  consent-gated (`members.signature_consent`, Your profile's switch; `appliedSignatureOf` in `lib/templates/data.ts`); the contract value is
  frozen at signing (`quotes.signed_amount_minor`). Migration 0087, repair R105 (last R used). **For S04:** a sent quote's snapshot at send
  (preparer's name / email / signature) is still yours; `/confirm/<id>` still keys on the quote id and, with `/sign/<token>/quote`, still sends
  each line's full record (cost, mark-up, rebate, vendor) — project both through `clientSafe` (`lib/quotes/view-link-queries.ts`).
- **After S04:** every client quote page (`/confirm/<token>`, `/sign/<token>/quote`, `/quote/<token>`) reads through one projection
  (`clientQuoteOf` / `clientSafe` in `lib/quotes/client-quote.ts`) — never send a quote line's record to a client page any other way. The
  confirmation link is `/confirm/<token>` (`quotes.confirm_token`, the route is `app/confirm/[token]`; older quotes keep their id). Viewed on
  client links = the page's first browser ask (`client_view_*`). A quote keeps its preparer from the first send (`quotes.prepared_json`).
  Draft with Maison AI is rule-built (`lib/quotes/draft.ts` `draftPlan` — the seam for a model later); the editor's Maison AI sheet has margin
  hints (`useQuoteMaison`). Line status dropped (R106). Migration 0088, repair R106 (last R used). **Open for Vicky:** Accounting does not
  approve quotes (1.0's owner-only rule) — say if it should.
- **After S05:** Settings › Lead management has a **Lead stages** card (each stage, what it keeps, live counts, 1.0's two flags as switches —
  Contacted asks for the next call, Won asks for the signed contract — `lead_stage_rules`; Linear / Flexible moved into it); the stage menu's
  *Manage Stages ›* opens it (a door, flagged for Vicky: the card had said hide the row). Commercial leads carry company + UEN
  (`client_company` · `client_uen`, also template fields and contract chips); a lead's second client rides to new quotes and Client access.
  Maison AI adds / moves / edits a lead by rule through the form / Move stage window (`add_lead` · `move_lead` · `edit_lead`; landings
  `/leads?new=1&client=…`, `/leads/<id>?edit=<field>` · `?move=<step>`). Uploads in the Quote Sent / Won steps keep their bytes
  (`components/leads/files/use-file-upload.tsx` = the shared upload hook). Return appeals (`lead_returns.appeal_of`). Head sort on Tasks and
  Files. Notes › Refine by rule with Undo. Migration 0089, repair R107 (last R used). L-2 (move after Won) and L-5 (kanban density) kept.
  **For S07:** Files' Download on invoice / receipt entries with no stored copy. **For S10:** the Overview's AI brief suggestions are still
  words-only.
- **After S06:** expenses repeat (`expenses.repeat_*`, Repeats = week · month · 3 months · year; `raiseDueRepeats(now)` raises the next one
  lazily on Money out's read, idempotent, single retried statements — never a transaction; Stop repeating with Undo; a handed-over project stops
  its repeats). Expense categories are the studio's list in Settings › Finance › Money out (`CATEGORIES_RULE`; rename carries expenses + Xero
  account `xero.accounts['exp:<name>']`). The PO paper prints the acceptance block by default. Where costs go has a house palette (four DS hues
  + grey; a DS chart palette is Vicky's call). Accounting raises POs (over the limit → approval), reads a project's Files only, sees Settings ›
  Finance alone. Migration 0090, repair R108 (last R used). **For S07:** an Accounting member opening a project directly gets "Projects /" crumb
  and Back to the house gate — make the crumb / Back land somewhere they may go.
- **After S07:** an overpayment is held as a credit note (`credit_notes.kind = 'overpayment'` · `payment_id`; `holdOverpayment`, numbered
  through `insertNumberedCredit`), used on another invoice (`applyCredit` → a payment with method `credit`, `project_payments.credit_note_id`)
  or refunded — one filled step in Needs you; Files' Download on a money paper opens it with `?print=1`; a lead's 3-D layouts belong to the lead
  until Won and move to the project (R88's old rule replaced); Accounting's crumb / Back on a project starts at Finance. Migration 0091, repair
  R109 (last R used). The phone header's long label now ends in "…" (REG-1763, fixed after the step). **For S10:** "use the credit on the next
  invoice" can act through `applyCredit`. **For S34:** a real PDF renderer plugs into `lead-files.tsx` `download` for `f.paper`.
- **After S08:** Settings › Studio opens on **Set up your studio** (`lib/studio-setup/*`, settings key `studio_setup`; seven steps, each ticked
  by its own record; Owners / Admins; hide per member with Undo; ⌘K door; `fetchStudioSetup()` / `setupRows(fetchSetupFacts())`) and a
  member's first visit gets one welcome (`members.welcome_due` · `welcomed_at`, `welcomeFor` in `lib/studio-setup/model.ts`; Add member owes
  it). Migration 0092, repair R110 (last R used). **For S09:** "Invited — hasn't signed in yet" can read `welcomed_at` null; an invited
  member's welcome words go in `welcomeFor`. **For S31:** a new studio starts with an EMPTY `brand` row (else it reads as set up) and its owner
  with `welcome_due = 1`. **For S32:** Restart tours re-owes the welcome. **Probe habit (all steps):** open one page and wait before the
  probe's DB snapshot; never hold a POST in a ghost check (a page's own write colliding with the probe's sqlite3 can leave the server holding
  the file's lock — fixed in S08b).
- **S08b (inserted, the orchestrator's call):** S19's "demo credits month rides the demo day" moved forward + the server-side lock leak, so
  every later probe starts on a current credits month and no write collision leaves :3160 locked.
- **After S08b:** the demo's credits month rides the demo day — `restoreBaseline` shifts the whole credits story by `creditShiftDays`
  (`lib/credits/demo-month.ts`), and repair R111 re-anchors the demo's own month (R63's plan id only) when it has ended; base.db's month is now
  23 Sep → 23 Oct, cr-r4 is green, and no probe's first page rolls the month. **The lock leak is fixed at the root**: `lib/db/local-file.ts`
  (used by `lib/db/index.ts`) gives every local connection a 5 s busy wait, commits / rolls back through `executeMultiple`, and replaces a
  connection after a busy failure; migrate / repair / snapshot scripts wait too. No migration; repair R111 (last R used). **For S19 / S20:** the
  charges move with the demo day but renders keep their own day (REG-341), so Usage › Activity can date a charge after the version it paid for.
- **After S09:** Add member invites (`studio_invitations`, 1.0's table; `/join/<token>` open 30 days; WhatsApp + email through the house outbox,
  Sent messages "To a new member"); Members shows Invited / Invitation expired with Send again · Copy link · Cancel invitation (deactivates, frees
  the seat, Undo); `/join/<token>` joins through View as until S30 (`joinStudio`; S30 must call `acceptInvitationOf` on first sign-in and
  replace both); bell `member_joined` → `/company/members?open=<id>`; seats are mentioned, never refused. Migration 0093, repair R112 (last R
  used). **For S10:** ⌘K's People results could open `/company/members?open=<id>`. **For S34:** a finally-failed invitation doesn't ring the
  inviter's bell yet.
- **After S10:** one Maison AI everywhere — `MaisonAiSheet` (`components/shell/maison-ai.tsx`) in the shell and all ten editors; the Ask box
  answers ~45 questions by rule (`lib/maison-ai/answer.ts`, the model seam is `readQuestion`; drafts `lib/maison-ai/drafts.ts`); changes are
  only proposed (Not now + one button running the house action, or the house form filled); Recent is a record (`maison_questions`,
  `fetchAskHistory()`); no words-only "Coming soon" suggestion left. Migration 0094, repair R113 (last R used). **The base rolled to 12 Oct**
  (`after-step.sh` now restores the fixture into base.db after the migrate when the calendar day changed). **For S20:** applying a sheet pick
  in the Visualizer behind the editor's Undo. **For S22:** the Dashboard's chat box = `answerQuestion` + Recent. **For S29:** writing help sits
  behind `lib/maison-ai/drafts.ts`.
- **After S11:** the document faces are self-hosted (`public/fonts/doc/`, OFL; Outfit added; documents re-measure on font load); a studio's own
  fonts (Brand kit › Fonts › Your own fonts, `studio_fonts`, `/files/font/<id>`, licence tick = honest stand-in, Owners / Admins); a quote under
  another issuing entity prints that entity's contact lines and accent (`{studio_footer}`); 1.0's five cover looks under the cover's More
  options; Upload my existing quote reads a PDF by rule (`readLayout` = the model seam); invoice / PO paper stays in Settings › Finance with a
  door from the Brand kit. Migration 0095; no repair (R114 still free). **Flag for Vicky:** Showflat Presentation's headings now print in
  Fraunces (they fell back to Georgia before). (The builder pre-numbered its rows; the orchestrator appended them by hand — REG-1794…1800.)
- **After S12:** lines are matched to the price book by rule (`lib/company/price-book-match.ts`; the word rules shared with the X-Ray in
  `lib/quotes/line-words.ts`): after an upload sure matches take the item's cost, the editor's "Match N lines" opens a review (below-cost never
  applied on its own; lines not in My Items yet can be added), Undo takes it all back, Maison AI opens the same review. Waste % on a purchase item
  (`price_book_items.waste_pct`) rides into Order from the quote / a PO's Add from the quote, never the quote. Bulk Set vendor and the import pick
  from Finance › Vendors. The phone pick-list wraps long names (four dialogs share it). Migration 0096, repair R114 (last R used). **Open for
  Vicky:** should the quote's estimated cost (margin) include waste?
- **After S13:** the portal's foot carries the studio's Privacy · Terms · Contact links (`settings.portal_links`, Company › Client portal ›
  Privacy and terms; Getting it live's fifth check *Privacy notice*; only set links show; none on the demo); team photos reach the client
  through `/my/<address>/face/<id>` (members on that visitor's homes only); an unknown portal address gets its own notice; the sign-in ghost's
  foot matches. No migration; repair R115 (last R used). **Open for Vicky:** should the foot appear on the other client links (/confirm, /sign,
  /quote, /invoice) too? (1.0 had it on the portal only.)
- **After S14:** Settings' first module is **Roles & access** (address stays `?section=studio`; the Company group keeps "Studio", REG-484) and
  holds **Who sees leads** above Who may do what (Lead management keeps a pointer; old `#lead-visibility` links land there); Qanvast Ops'
  Leads now honour Who sees leads; Company › Profile › Reviews holds the review link (Ask for a review carries it); **Your PayNow** on Your
  profile for every member (one PayNow dialog shared with Members); repair R116 puts the demo's CaseTrust + HDB listing on record (the badges
  claimed them) — every demo signing page now asks the CaseTrust tick; signing probes tick it with `caseTrust(page)`. No migration; repair R116
  (last R used). The UAT steps 8.10 · 8.12 · 12.11 now include the CaseTrust tick (the orchestrator updated the JSON and rebuilt the xlsx; the
  testers' Google Sheet tabs are Vicky's to update by hand).
- **After S15:** wall elevations draw 1.0's usual heights as dashed lines (`referenceLinesOf` in `lib/planner/elevation.ts`; *Show the usual
  heights* on by default; Download PNG saves what's on screen); the panel opens on the wall the room's built-ins stand against (`firstWallOf`,
  REG-1654's longest wall is the fallback); the list names doors and windows. **The house touch rule (REG-273, `app/globals.css`) now matches a
  control's own label only** — rows that wrap a DS Switch in their own label were centred and pulled 10px out of their card on touch (about 20
  surfaces); the ghost kit's switch is 40px wide. No migration, no repair (R117 still free). **For S17:** at 390 touch the ghosts of Settings ›
  Notifications, Company › Members, Company › Profile and Settings › Lead management don't match their phone pages (older than S15).
- **After S16:** the rail / dock / More are unchanged; the Soon signposts stay until their steps make them live — Dashboard (S22), Meeting
  Copilot (S23), Marketplace (S24), Market Insights (S25); Hangouts comes with S27, Log out with S30. New key G then M → Messages. Every in-app
  navigation (G keys, J/K, Maison AI's, See usage) now asks the unsaved-edits guard first. Shell badges cap at "99+". **Open to new leads** is in
  the studio block's menu and the phone's You sheet (`setMyAccepting`, the signed-in member only; flagged for Vicky: a second control for the
  Members switch). No migration, no repair (R117 still free). **For S22…S25:** flip the Soon signpost to live in the rail / Tools / More when the
  module lands (outcome-S16 names the places).
- **After S17:** one side-panel width scale (`components/om/drawer.tsx`: narrow 360 · standard 400 · wide 480 · widest 560 — a Drawer names its
  step); one tall xl dialog height (the mock's 928, `--om-modal-xl-height`, `Dialog height="xl"`); custom fields and the Question bank share
  `components/om/definition-list.tsx`; "3D" everywhere; all 34 Settings / Company ghosts draw their page at 390 touch · 768 touch · 1440 (page
  and ghost read the same words: `lib/settings/copy.ts`, `lib/company/copy.ts`, `MODULE_LINKS`; the ghost kit gained text buttons, chips, a
  phone's labelled cells, helper lines). No migration, no repair (R117 free). **For S42:** a ghost's tab strip doesn't scroll to the open tab on
  a phone (older); pages whose lower screens are studio data match their first screen only. **Flag for Vicky:** the four-width panel scale and
  the 928 height.
- **After S18 (lane A):** a member's own notices on Your profile › **Your notifications** (`components/profile/your-notifications.tsx`,
  `lib/notifications/personal.ts`): emails As they happen · A daily summary (8 AM, from the bell's own rows, critical events still at once;
  `sendDueSummaries()` is the seam a real scheduler calls — today the first page read after 8 AM sends it) and *Choose what reaches you* (a
  per-member mute: no bell row, no email, no WhatsApp; studio-off notices read "Off for the whole studio"); the bell's Notification settings
  opens it; the bell's "Updates" group is now **"Notices"** (N-14, flagged for Vicky); an invitation that finally fails tells its inviter; Maison
  AI's `missed` intent. Migration 0097 (`members.notice_email · notice_email_at · notice_muted`), repair R117. UAT 11.07 updated by the
  orchestrator. **Lanes:** Maison AI's `lib/maison-ai/{intents,answer}.ts` changed here — merge other lanes' intents by hand.
- **After S23 (lane B):** **Meetings are built** (REG-552's hold lifted): the lead's Meetings tab (between Notes & Logs and Questionnaire;
  `DETAIL_TABS` has nine), the project's Client › Meetings, Tools › Meeting Copilot `/meetings` (the Tasks-in-the-rail pattern), the Meeting
  quick link; a meeting held IS the Met log (`stage_logs` payload `meetingId`), a planned one rides its reminder task (`lead_tasks.meeting_id`);
  the meeting page Before · During · After by rule (`lib/meetings/engine.ts` `readMeeting`, `brief.ts` `briefOf` — the model seam), recording /
  transcription honest stand-ins; the client's `/meeting/<token>` (.ics, "I'll be there", shared notes); 1.0's `/copilot/share/<id>` redirects;
  Settings › **Meetings** module; Company › Reports › Meetings; Integrations › Calendar invites; the co-pilot is metered at her Q-45 price (25 per
  10 minutes, check-in per block, refund if not started, Free gets 3 blocks once — **flag for Vicky: 1.0 published that price but never charged
  in code**). Migration 0098 (regenerated at land; five tables + `lead_tasks.meeting_id`), repair R140 (lane B's range; R141 next). Joined at land:
  `meeting_answered` placed in the personal mute list (Leads). **For S26:** a meeting could post its brief to the Team conversation. **For S34:**
  a transcriber plugs into the notes box / `writeUpMeeting`, Google Calendar two-way beside `lib/meetings/calendar.ts`.
- **After S19 (lane A):** **plan locks** — 1.0's seven Pro features (`lib/credits/features.ts` `PRO_FEATURES`: quote_xray · template_editor ·
  package_creation · custom_stages · internal_approvals · whatsapp_notifications · expense_management) refused by the server on Free
  (`requirePlan(f)`), openers keep a Pro tag (`usePlanLock` + `ProTag`), pages show `ProLocked` in place (loader `ProLockedGhost`); approvals
  read as off but stay stored; WhatsApp copies `not_in_plan`, never sent; `PLAN_GATING_DISABLED=1` turns it off. Top-ups on 1.0's grid (100…5,000
  in 50s, S$2 per 100); **auto top-up** for the Owner (once per crossing, a monthly ceiling, off by default, no card charged); Change seats; every
  quote read costs 5 (VO quote, schedule upload, Create Quote); the paid work rides with its charges (R118, `PAID_WORK_TIMES`). Migration 0099
  (regenerated at land), repair R118 (lane A; R119 next). Joined at land (REG-1897): co-pilot charges in Usage. **Any new Pro surface** uses
  `requirePlan` / `usePlanLock` / `ProLocked`. **Note for Vicky:** her own local.db is on the Free plan (View as › Studio plan) — her :3000 now
  shows the Pro locks; View as › Pro — Studio puts them away.
- **After S24 (lane B):** **the Marketplace** (`/marketplace`, the rail's / More's item now live; Accounting doesn't see it): brands directory
  (categories, search, 1.0's three sorts, Show more), Deals + the deal dialog (Get deal = the brand's own way, the ask recorded, nothing bought),
  the brand page (pictures · About · Contact · Web links · Services · Deals · Products · Questions · WhatsApp), banners (no auto-rotate). A brand →
  Finance › Vendors ("Add to my vendors", linked not doubled — `vendors.marketplace_brand_id`); a product → Price book › My Items under its rules
  (`price_book_items.marketplace_product_id`), reaching quotes and Choices from there. The feed's one mapper `lib/marketplace/feed.ts`; the demo
  catalogue `lib/marketplace/demo.ts` (14 invented brands on `.example` addresses — demo addresses say so, REG-1910). Migration 0100 (regenerated
  at land), repair R141 (R142 next in lane B). **Flags for Vicky:** no mock; banners don't rotate; every studio sees it (1.0's flag was off).
- **After S20 (lane A):** HEIC photos open everywhere (`lib/heic.ts`, 1.0's converter `heic-to` 1.5.2 pinned, LGPL-3.0, loaded only when a HEIC
  lands and the browser can't draw it; a HEIC in Files keeps its bytes and gains a preview); Replace keeps its picker and says the prototype
  can't draw a new piece in — "Recolour it to match" turns the pick into a Customize with Undo (her Q-21; flag: she may prefer the old silent
  recolour); the drift guard ("Checking the room's shape", one corrective pass kept only if it reads better; `render_repair` = 2 credits, never
  counted as a render; `scripts/viz/drift-test.mts`); Maison AI's "Suggest {style} finishes" applies as one step with Undo. No migration, no
  repair (R119 free). **The orchestrator** copied `node_modules/heic-to` into main and lane B (`package-lock.json` carries it; a fresh clone's
  `npm run dev` installs it). UAT 13.07 updated.
- **After S25 (lane B):** **Market Insights** is 1.0's reading room of articles OpenMaison staff write (not market data): Tools › Market
  Insights `/market-insights` + `/market-insights/[articleId]` (every Tools tile is now live), category chips with counts, search, featured, 24
  at a time; the article page renders Markdown (no raw HTML) with 1.0's five chart types in the house palette (crosshair readout, "Show the
  numbers"); the feed's one mapper `lib/market-insights/feed.ts`, table `market_insights` (dates ride the demo day); six **sample** articles
  written for the demo, each flagged "A sample article written for the demo. Its figures are illustrative — not market data." (1.0's seed
  credited unverifiable numbers to HDB / BCA / CASE — not ported). Writing / publishing = platform admin (excluded by her). Migration 0101,
  repair R142 (R143 next in lane B). **For S22:** a Dashboard news card links into Market Insights, never a second reader.
- **After S28 (lane A):** **Make a 3D picture** from a floor-plan photo, no model: step 1 straightens the photo in the browser (1.0's deskew
  maths; `findPaper` a rule stand-in for 1.0's ML finder; JPG · PNG · WebP · HEIC · PDF), step 2 lists rooms (`roomsForType`, the model seam) and
  the home's size; *Place the rooms* opens a planner layout over the photo, each dragged rectangle the next room; the picture = Dollhouse /
  Top-down from the planner's isometric (bare rooms furnished by rule, Undo), Download PNG · Save to Files › Renders · Render in AI Visualizer.
  One record: a project's Floor plan (G's writer) or a lead's Files › Floor plans + `floor_plan_photos` (carried at Won, same id and
  `/planner/plan-picture/<id>`). Doors: Tools tile (`/planner?view=iso&photo=1`), planner New ▾, Files ⋮, Floor plan ⋮, ⌘K Create, Maison AI.
  No credits (1.0's tool charged none; `render_photorealistic` stays unused — flag for Vicky). Migration 0102 (regenerated), repair R119 (R120 next
  in lane A). Fixed: the planner's top bar at 768.
- **After S26 (lane B):** members' own conversations inside the one Messages list and composer — a studio room (Accounting in none), one-to-
  one chats, named groups (Details: Add people · Take out · Leave · Rename, Undo; a Designer can't take out an Owner / Admin), and a Team
  conversation on every lead before Won (door: Collaborators' Team chat row on the lead, the project, the phone's Client Info; after Won the
  project's Team shows it first). New message ▾ (A member › · A new group · A client; C / ⌘K Create); filters All · Unread · Clients · Team;
  Details' Docs · Media · Links; links open; "Seen by…"; reply suggestions by rule; `member_message` notice; ⌘K finds them; the meeting room's
  Share with the team (S23's note). **Privacy:** these live in `conversations` · `conversation_participants` · `conversation_messages` ·
  `conversation_files` — tables no client page reads (proven in the probe). Migration 0103 (regenerated), repair R143 (R144 next in lane B).
  **Flags for Vicky:** a Team conversation's unread count goes only to its members and its writers; read rows 4px taller; links open in every
  thread incl. tickets and the client's page.
- **After S21 (lane A):** any text PDF is read by rule (`lib/quotes/pdf-quote.ts` `readQuoteText` — trades, rooms, wrapped lines, qty, unit,
  rate, amount, FOC / Inclusive, lump sums; totals and payment rows left out; the studio's name found; a scan / photo refused — the developers'
  reader plugs in there); 1.0's arithmetic check ("Their numbers don’t add up", "S$X at their rate"), the file tile says whether the lines add up
  to the quote's own total; another currency refused; the shared sheet reader fixed (an Amount-only sheet, a "Total" row); the Meeting
  Co-Pilot's *Their quote* wears the Pro tag on Free. X-Ray stays free of credits (1.0 never charged). No migration, no repair (R120 free).
  Sample `public/uat-files/urban-nest-competitor-quote.pdf` (23 lines, S$40,210); UAT 7.14 added. **Flag for Vicky:** Create Quote / VO /
  schedule uploads still say "XLSX · CSV" — using the PDF reader there would charge 5 credits for a rule read (her call).
- **After S29 (lane A):** **writing help by rule** — Improve · Shorten · Expand · Rewrite · Plain English, always a proposal first (Changes ·
  Before · After, Not now · Use these words, Undo after), free (1.0 never charged), one shared piece `components/writing/writing-help.tsx`
  (rules `lib/writing/*`, never cost or mark-up; the model seam `proposeWriting`), on the quote's Terms / Notes (REG-420's Write with AI now
  proposes first — one more press, flagged for Vicky), a line's Description / Section note, the contract editor (selection · the clause · the
  whole; chips and signature fields untouched; none on a signed contract), contract templates, every send dialog's WhatsApp message, T&Cs &
  Notes templates, a Price book item, a quote template's prose; Maison AI's `writing` intent. Fixed: the contract editor's sideways scroll at 768
  touch and its toolbar at 320. No migration, no repair (R120 free). UAT 6.21 updated.
- **After S27 (lane B):** **Hangouts** — Qanvast Ops › Hangouts (live; Qanvast's events through `lib/hangouts/feed.ts`, three sample events;
  Apply / Take back with Undo), each Hangout's page Plan · Chats · How it went (tables per shift, who to meet by 1.0's six weights, Send the plan,
  Invite someone new with `studio_invitations.hangout_event_id`; Start / End a chat writes the lead's S23 meeting + a follow-up task; walk-ins;
  live refresh), the public booking page `/hangout/[token]` in the studio's brand (a booking → a lead through `importLeads`, source Hangout, the
  rule's designer; the homeowner's page "I'm at the table"); 1.0's `/hangouts/<id>` redirects. **Public profiles** `/company/members/[id]/profile`
  (years, Known for, photo, their work) replace the About-page dialog and feed the Hangout pages, the portal's Our team and the meeting room.
  **One contact rule:** `lastContactOf` counts a held meeting, shared with the bell's untouched notice (`fetchContactedLeadIds`). One ghost per
  page on all eight new routes. Migration 0104, repair R144 (four Hangout-booked leads — Rahul Menon, Chloe Tan, Lim Wei Ling, Kelvin Goh — and
  Nur Aisyah's Hangout story; New 10 → 14 in local.db as in the base). R145 next in lane B. **Flags for Vicky:** the About dialog became a page;
  a Hangout lead stays at its stage after its chat; no SMS sign-in / vouchers / AI from audio.
- **For S42 — the demo's recent moments age (found by S30's run):** `verify-pj-r4a` (72/73) and `verify-pj-fix-F` (43/44) fail because
  Benjamin's floor plan was "shown an hour ago" when its repair ran (5 Oct) and the portal calls a file new for `NEW_FILE_DAYS` = 7
  (`lib/portal/needs.ts`). Restores already move open tasks, live share links and the credits month with the demo day (REG-341, S08b) — the same
  rule is missing for the demo's other *recent* moments (a file shown to a client, a share, an update, anything a "new for n days" rule reads).
  S42: list every such rule, make `restoreBaseline` move the moments that were recent on the snapshot's day by the same shift, bring today's
  base back once (a repair that re-anchors only the demo's own rows, guarded like R111), and keep Activity's lines in step with the moved times.
- **After S30 (lane A):** **signing in** — `/sign-in` (mobile +65 or work email → a 6-digit code, any six digits pass and the page says so;
  30-second resend, paste, "Keep me signed in for 30 days"; 1.0's `/login` redirects); sessions `studio_sessions` + an httpOnly cookie; `proxy.ts`
  + the shell send a signed-out browser to sign-in with `?next=`; studio file / picture routes answer 401; client links stay open
  (`PUBLIC_PATHS` in `lib/auth/paths.ts` — **every new public client address must be added there**; S27's `/hangout` · `/hangouts` added at
  land, REG-2001). **The demo keeps working:** a browser that never signed in or out is the demo's standing session as View as's member
  (`DEMO_STANDING_SESSION`, false in a real build); signing in moves `members.is_you`. Refusals: no account, a landline, deactivated, an expired
  invitation, five tries a minute. **Sign out** = the last row of the You group (studio block menu, phone You sheet; "Sign out", 1.0's word). A
  first sign-in accepts an open invitation; Your profile asks the code before a new sign-in number / email. `CodeBoxes` (house piece, shared with
  the portal); icon `logout` added to the subset. The seam: `setSignInProvider` in `lib/auth/provider.ts`. Migration 0105 (regenerated), repair
  R120 (R121 next in lane A). UAT 1.10 added.
- **After S22 (lane B):** **the Dashboard** `/dashboard` — `/` opens it for Owners, Admins, Managers and Designers (as 1.0); Accounting still lands
  on Finance › To do and has the Dashboard first in its rail; G then D; the logo still expands the rail (the mock 795:22541 beats 1.0). What needs
  me: the brief card with Maison AI's own Ask box (answers land in Recent), Needs you = one row per place that waits (each project's top row ·
  Finance › To do · the rail's approvals · the listing's Unassigned / Overdue follow-ups · meetings to write up · compliance · Set up your studio),
  each opening its home with `?from=/dashboard`; My tasks (Undo on done). What's next / where it stands: Coming up (this week and next), number
  tiles = the listings', the rail's and Reports' own figures (none red), Workload, Site updates, one Market Insights article; per role. New
  landings `?run=` (a project's step), `?todo=` (Tools › Quotes), `?show=unread` (Messages). Industry News: 1.0's RSS reader feeds Market
  Insights (`lib/market-insights/rss.ts`, stand-in: nothing fetches). No migration, no repair (R145 free in lane B). **Flags for Vicky:** no mock;
  the front door moved from Leads to the Dashboard; the demo's Profit this month is negative (−S$3,005.50, as Reports shows).
- **The last cards, still two lanes (orchestrator's plan, 2026-10-13):** lane A after S31 → S35 Marketing site + Book a demo → S36 Try the
  Visualizer without an account → S39 Studio Health (+ S40: check portfolio profiles are whole after S27); lane B after the regression → S34 Real
  services' seams → S37 Verify for a Qanvast listing → S41 the AI sandboxes. (S38 Languages parked.) Then S41b · Nothing left behind, then S42 ·
  Bugs, intuitiveness, world-class UX (incl. the demo's ageing moments), then the final full regression.
- **The regression after S22 (2026-10-13):** 73 regression ids + 68 step / Projects probes on one build — green but the two demo-ageing
  failures already handed to S42 (pj-r4a 72/73, pj-fix-F 43/44). Fixed in the run: `verify-pm2-s30` expected `/leads` as home (S22 made it
  `/dashboard` — a deliberate change, assertions updated); `dane-p3` expected Gerald Tan first for "tan" (S27's demo added Chloe Tan — it now
  checks the first listed match); `ux-p3` crashed on its own sqlite3 lock (passes 91/91 alone).
- **After S31 (lane A):** **a new studio joins** — `/sign-up` (how you work · the details · the code; doors: sign-in's "Start your studio",
  1.0's `/onboarding`); self-serve on Free (150 welcome credits, 30 a month); a freelancer = a studio of one; "I work in a studio" → the Owner's
  invitation. `createStudio` (`lib/studios/create.ts`; the tenancy seam `setStudioProvisioner`) makes the Owner (owed the welcome), an EMPTY
  brand kit, the plan, the feeds' copies, `studio_origin`. **The stand-in:** each new studio is its own database file beside the demo's
  (`<db>.studios/`, git-ignored), one studio open at a time (`lib/db/index.ts`'s switch — unchanged while none is started), a "Studios · demo
  only" group in the studio menu, Reset to base removes them; the demo's database is never written (the probe checks every table). Pause
  sign-ups = `OPENMAISON_SIGN_UPS_PAUSED=1` (Platform admin excluded). No migration; repair R121 (checks only). UAT 1.11 added.
- **After S34 (lane B):** **every stand-in plug-ready in one place** — `lib/services/registry.ts` (32 seams: what, stand-in, contract, the one
  swap call, 1.0's env names), `lib/services/slots.ts` (10 slots on `globalThis` — the old module-variable adapters wouldn't reach every
  bundle), `lib/services/install.ts` via `instrumentation.ts` (warns when a key is set but its service is still a stand-in), `GET /api/services`
  (CRON_SECRET, names and states only), the developers' map `30-…/services.md` (generated, checked by the probe), `.env.example` with 1.0's names.
  The sweep `/api/cron/<run|notification-scheduled|notification-digest|accounting-sync|repeats|feeds>` (CRON_SECRET, fails closed, idempotent);
  `POST /api/webhooks/whatsapp` (receipts in Sent messages; a client's reply filed in Messages — `inbound_messages`), `/api/webhooks/payments`,
  `/api/webhooks/leads/<token>` (1.0's HMAC); payments, lead file storage, PDF (`printPaper()` + `/papers/pdf`), calendar, transcription, feeds,
  Xero, sign-in and tenancy slots. The portal's code step now says "Demo only — no text is sent". Integrations' five cards + Sent messages say
  "Simulated on this prototype — …" (flag for Vicky: shows in client demos). Migration 0106, no repair (R145 free in lane B).
- **After S35 (lane A):** **OpenMaison's website** at `/site` (open signed out; Home, Platform + 8 module pages, Story, Trust, Blog — 1.0 has
  11 articles, What's New — 29 of 1.0's 30 releases, Jobs, Contact, Privacy · Terms · Cookies, a 404), 1.0's look on the house tokens, every page
  its own ghost; words in 2.0's names, claims 2.0 doesn't make taken out (every changed sentence in the outcome); Book a demo → 1.0's
  `beta_signups` + an outbox email to hello@openmaison.ai, then 1.0's real Calendly in a house dialog; contact form `contact_messages`, newsletter
  `newsletter_subscribers`; SEO (titles, structured data, sitemap, robots blocking AI training crawlers, `llms.txt`, `/card/site/<page>`); 1.0's
  old addresses redirect; sign-in / sign-up's logo links to the site. UAE page held; staff's Beta sign-ups list = Platform admin (excluded).
  Migration 0107 (regenerated), repair R122 (checks only). **Flags for Vicky:** no mock; the Home intro animation, Calendly in our dialog, the
  rewritten Cookie Policy; "Upload a PDF quote" kept as 1.0 wrote it though Create Quote reads XLSX · CSV; Story's lifetime pricing offer.
- **For S42 — the website's claims:** the Home's results band still says "20+ AI capabilities" and "30s quote upgrade" (1.0's words) and
  "Upload a PDF quote"; check every number and capability the site states against what 2.0 actually does (Maison AI answers by rule, nothing
  calls a model, Create Quote reads XLSX · CSV) and say only what is true, listing each change for Vicky.
- **After S37 (lane B):** **Listed on Qanvast** on Company › Profile (after Registrations): Not applied · Waiting for Qanvast · Needs changes
  (Qanvast's note) · Listed, one press each; the application `studio_verifications` (+ `studio_verification_files`, real bytes, 8 MB) shows what
  is on record and asks only the description, what makes the studio different, and proof; Withdraw with Undo; Qanvast's answer through the
  `qanvast` slot (`setQanvastListingService`) and `POST /api/webhooks/qanvast-listing`, or an Owner / Admin's labelled "(demo)" answer
  (`answered_via='demo'`); bell `listing_answered`; doors: 1.0's `/verify`, ⌘K, Integrations' Qanvast card, a Dashboard row, Maison AI. Repair
  R145 marks the demo studio listed (dated by its first Qanvast lead). Migration 0108 (regenerated). **For S41b:** check the brand kit covers 1.0's
  catalogue of accreditation badges.
- **After S36 (lane A):** **the AI Visualizer trial** at `/site/try` + six tool pages — the studio editor's own room logic, now shared
  (`components/visualizer/editor/room-session.ts` · `picture-reader.ts`); 1.0's limit 3 renders a browser (a signed cookie, counted when kept) +
  10 a minute per address; 1.0's OpenMaison mark on every trial picture (screen, download, the live lighting preview — a picture that can't be
  marked isn't shown or counted); after the third, 1.0's gate (Start your studio · Book a demo); an uploaded photo carries into the new studio's
  Visualizer; the photo never leaves the browser (no table changes); on in this demo, off in a real build until `TRIAL_VISUALIZER_ENABLED=true`
  (off = a real 404); Turnstile + a lasting limit store = seams (`setBotCheck` · `setLimitStore`). Joined at land: 13 service slots (S37's
  `qanvast` + S36's two), the developers' map keeps both lanes' seams. No migration, no repair. **Flags for Vicky:** in the demo a never-signed-
  out browser is Dane, so Start your studio lands on the Dashboard; a sample restyle counts as one of three; the photo carry is new.
- **S41b · Nothing left behind — what the three sweeps found (2026-10-13; `s41b/ledger.md` · `sweep-pages.md` · `sweep-data.md`):** the ledger
  answers all 314 card lines (206 built · 47 kept · 34 stand-in · 22 parked by her · 5 in progress (S39 · S41) · **0 not answered**; ~120 "built"
  claims spot-checked, none failed). The sweeps found what no card named — built as S41b packages, in the two lanes as they free up:
  - **S41b-1 · Cost and margin visibility per role** (1.0's `deployment/qanvast` branch, `settings.cost_visibility`, `studio-config/cost-visibility`):
    the Owner hides cost · mark-up · margin from Admin / Designer / Accounting — today a Designer always sees them (a confidentiality gap).
  - **S41b-2 · Old addresses and an app-wide not found:** 1.0's studio addresses that 404 in 2.0 (`/inbox`, `/escalations`, `/accounts/*`,
    `/settings/notifications`, `/upgrade`, `/studio-setup`, `/leads/new`, `/projects/new`, the ten `/tools/*`, `/finance/operations` (a redirect
    into a missing tab), the finance print previews, `/my/<slug>/preview/<view>`, `/leads?leadId=`) — links already sent in emails, WhatsApp and
    bell rows; one old-address list + small record lookups; and one app-wide `not-found` page on the house pieces (invented copy, for Vicky).
    Plus the ledger's small open items: the web manifest + favicon, 1.0's `/tools/market-insights` bookmark.
  - **S41b-3 · Try the tools without an account, kept at sign-up** (1.0's `deployment/plg`: Leads up to 3, Quote X-Ray, the quote reader beside
    S36's Visualizer; `anon_workspaces`, claimed into the new studio at sign-up; the sweep crons).
  - **S41b-4 · The Free plan's upgrade nudges** (plg: 17 triggers, at most one offer at a safe moment; `nudge_state`).
  - **S41b-5 · Qanvast Ops › Lead credits and Reviews & Rankings** (qanvast branch, fed by Qanvast's API → a feed stand-in like S24 / S27).
  Kept, with reasons in the sweeps: the Project Types editor (Leads Q-34: three fixed types), 1.0's eight ready badges (Platform admin's catalogue;
  the brand kit takes any badge), `/settings#…` anchors (no server redirect), the platform crons (admin / the developers').
- **After S41 (lane B):** 1.0's seven AI sandboxes are accounted for, each mapped to where 2.0 does its job (Auto-furnish → the Visualizer's
  Furnish / the planner's; Detect → the room reading; Floorplan-3D → S28; Quote Template → the template editor + `printPaper`; Relight / Style
  Transfer → the Visualizer; v2 → the Visualizer); the four experiments that only lived there are on a developers' bench `/dev/ai-bench`
  (linked from no studio menu; 404 in production unless `OPENMAISON_DEV_PREVIEWS=1`, one gate `lib/services/dev-previews.ts` shared with the
  email preview): Depth (`lib/visualizer/spatial/depth.ts`), Reangle + Look around (three.js), Orbit video (recorded in the browser; `ThreeView
  spin`), Outpaint (the photo's edges mirrored, nothing painted); 1.0's corner editor = "Plan corners" (`lib/planner/corners.ts`). Five seams
  added to the registry. No migration, no repair. The probe runs open by default and shut with `BENCH=off`. **Ideas for Vicky:** the planner's 3D
  picture could offer "Download a turning clip"; Make a 3D picture could offer "Square it by its corners".
- **After S39 + S40 (lane A):** **Studio Health** = Company › Reports › Health (`/company/reports/health`, Owners / Admins; the others see the
  tab's lock): Your team · New work · Work done · Your clients (fifteen tiles), Over time, By team member (Column settings, phone cards), Export,
  Maison AI; every number reads its own page's records (the probe checks each against SQL on all four ranges; tiles with a page open it on the
  same range); no new tracking (page views, top pages, funnels, minutes, the nightly rollup — her Q-16 No; the footnote says why). Repair R123
  gives the demo's past the sign-ins its activity implies (194 members, 7 portal; none open). Reports tabs open on `?range=`. **S40:** S27
  covered the profiles; added: a member opens their own "Known for" (lead preferences on Members) from Your profile. Fixed on every Reports tab:
  Export off-screen on a phone, a stray line on phone cards. No migration (R124 next in lane A).
- **After S41b-1 (lane B):** **Who sees costs and margins** on Settings › Roles & access (Owners always; a switch each for Admins, Managers,
  Designers, Accounting; all on by default = no change; Owner-only, refused on the server, Undo; settings `cost_visibility`, 1.0's `id` key →
  Designer + Manager). `fetchViewer` sets `Viewer.costs`; `lib/quotes/cost-sight.ts` sends a switched-off member every line / book item /
  saved section / kept version / document with the cost folded into the price (cost 0, mark-up = the price); rebates Owners only; the books
  drop profit and margin (`withoutProfit`); writes keep the stored cost (`kept_line_costs`, 30 days, for Undo). Gone from their screens: the
  Cost · Markup · Margin columns, Below cost, Set a value's cost fields, export / copy / paste of costs, Maison AI's margin hints, Preview's
  Internal copy, the price book's costs, Order from the quote (refused on the server); for Admins / Accounting also the P&L and Profitability
  reports, Profit tiles, the Projects Margin column, closing margins. Kept (1.0's rules): PO · bill · vendor amounts, waste %, commission.
  Migration 0109 (`kept_line_costs`). **Flags for Vicky:** four switches (Manager is its own role in 2.0); Order from the quote hidden for them.
- **After S41b-3 (lane B; resumed 2026-10-14 after the 13 Oct usage-limit stop):** **Try the tools without an account** — Leads (up to 3),
  Upload a quote and Quote X-Ray join S36's Visualizer in one trial home (`/site/try/leads` · `/upload-a-quote` · `/quote-x-ray`), each on the
  studio's own pieces (the lead form's trial mode, the listing's table model, Create Quote's reader, X-Ray's readers / engine / record cards —
  `lib/leads/lead-input.ts`, `components/quotes/upload-reading.tsx`, `components/xray/xray-reading.tsx` moved out unchanged). One workspace per
  browser (1.0's `anon_workspaces` columns) in a store beside the demo's database (`<db>.trial.db`, seam `setTrialStore`), a signed httpOnly
  `om_anon` cookie for 7 days; 1.0's limits (50-token grant at 5 a read, 25 new workspaces a day and 5 reads a minute per address, S36's bot
  check before the first save). The claim at sign-up **and sign-in** (1.0's claim-on-login) moves everything in through the studio's own
  actions with a `trial_claimed` Activity line, never into the demo (the probe hashes every demo table), no credits spent. Sweeps
  `/api/cron/anon-sweep` · `anon-storage-gc` (CRON_SECRET, idempotent; slot `trial`, 14 slots). One switch `TRIAL_TOOLS_ENABLED` (on in the
  demo, off in a real build). Calls as recommended: Leads cap 3 (1.0's later 1 only because it mixed sample leads in); one free comparison +
  one kept quote; a kept quote asks "Whose quote is it?" first (no phoneless lead). Fixed on S35/S36's pages: every built site page 404'd after
  any whole-app revalidation (`dynamicParams = false` → each `[slug]` layout now 404s an unknown slug itself; S41b-2 made the same fix — main kept
  S41b-2's identical layouts). No migration; R146 checks only (R147 next in lane B). REG-2125…2134. **Flags for Vicky:** no mock; 2.0 offers more
  than 1.0's final plg branch (cap 3, free comparison + kept quote); the quote asks its client before keeping.
  **Verified on main 2026-10-14:** pm2-s41b3 175/175 and pm2-s34 180/180 need the server started with `CRON_SECRET=probe-cron
  WHATSAPP_WEBHOOK_SECRET=probe-wa` and the probes given `CRON=probe-cron S34_CRON=probe-cron S34_WA=probe-wa` (`pbuild/run.sh` passes no env —
  without it s41b3 fails its one sweep check and s34 skips its cron checks); s36 109 · s31 104 · s30 108 · s35 138 · s21 40 · s41b2 206 green.
  **For S42's regression:** run those two with the secrets.
- **After S41b-4 (lane A; relaunched 2026-10-14 after the 13 Oct usage-limit stop):** **the Free plan's upgrade nudges** — 1.0's 17 plg
  triggers: nine built as offers with their own record (T2 · T3 · T4 · T9 · T10 · T11 · T12 proactive, once ever, one a day; T7 · T8 lifecycle),
  seven answered by moments 2.0 already has (T6 · T17 S19's lock card; T13…T16 the out-of-credits sheet; T5 dropped by 1.0 itself), T1 (five
  active minutes) not built — counting minutes is the telemetry her Q-16 declined. An offer = one quiet row in the **Owner's** bell (one way on:
  See plans / Buy AI credits; Not now with Undo); never a dialog, never on a client page, never over a dialog / menu / typing / a live meeting.
  1.0's rules kept: Free only (a paid plan or trial withdraws every live offer), spent when shown, one proactive a day, a 10-minute gap (the lock
  card and the out-of-credits sheet restart it), one at a time, 1.0's priority order, kill switch `UPGRADE_NUDGES_DISABLED=1`; the sheet says
  "Welcome AI credits used up" once. 1.0's `nudge_state` (+ three columns for the live offer), migration 0110 `s41b4_nudges`, repair R124 (checks),
  both baseline lists. Settings › Notifications: "An offer to move to Pro" (Owner, in app only, off-able; mutable on Your profile). Fixed on the
  way: Your profile's ghost drew the cards below the signature 5px low (s18 63/63). REG-2135…2142. Verified on main: s41b4 82 · s19 116 · s18 63
  · s22 116 · s16 56. **Flags for Vicky:** whether 2.0 should nudge at all; T1 not built; her local.db is on Free (since 9 Oct 13:13) so her :3000
  shows the offers; all words invented (REG-2135…2142).
- **After S41b-5 (lane B):** **Qanvast Ops › Lead credits and Reviews** live at 1.0's own addresses — `/qanvast-ops/credits` (Overview ·
  Transactions `?month=` · Contracts) and `/qanvast-ops/reviews` (Reviews · Ranking · Feedback `?days=`), on the house pieces (StatTiles, Chips
  views, the table model with Column settings + phone cards, the house chart, Dialogs, one ghost per view; an unknown view is a real 404). Seam
  `qanvast-account` (`setQanvastAccountService`, the 15th slot) reads live like 1.0's proxy, no table, 1.0's JSON through one mapper; "Qanvast
  didn't answer" / S30's "Your Qanvast session expired · Sign in again". The demo's figures come from its records (credits left 2,000 = 3,000 +
  400 − 200 × 7 Qanvast leads; Farah Isa's approved return = "200 on the way back"; reviews from Shalini Menon's handover and the designers'
  published work; feedback by rule) — contract, rank, page views and Singapore's averages are samples and say so; Qanvast Ops › Leads' Credits
  column reads the same seam. Reply · Edit (5,000 characters, Writing help, discard prompt, ⌘↵); Request reviews (finished projects' clients or
  searched leads, WhatsApp on the press, "Opened"); doors: the header, the Overview card, Ranking's tip, ⌘K (Owner), Company › Profile › Reviews
  (Owner). Owner only (1.0's code); others see the tab's gate. 1.0's `/qanvast-ops/leads` · `/credits/leads` · `/credits/packages` redirect.
  Maison AI suggests on every view and answers "lead credits" / "reviews on Qanvast". Fixed 1.0's "Sum of Contracts" (it summed lead budgets).
  No migration, no repair (R147…R159 unused). REG-2143…2153. **Flags for Vicky:** Admins read / answer reviews? (1.0: Owner only); Request
  reviews opens on finished projects, all ticked; no in-app top-up; the Reviews actions are links. Older 1.0 addresses `/qanvast-ops/portfolio` ·
  `/complaints` · `/promote` still unmapped → S42 (carried notes).
- **S42 · Bugs, intuitiveness, world-class UX — DONE (2026-10-14 → 15).** A read-only audit of everything S01…S41b-5 built, in five areas,
  each walked as every role at 1440 and 390 touch on its own server (`s42/audit-brief.md`; findings `s42/audit-{A…E}.md` — 110: 2 Blockers,
  15 Majors), then seven fix packages (`s42/fix-brief.md`; outcomes `steps/outcome-S42{A…G}.md`): **S42A** front door, people and settings
  (REG-2230…2248, R125 — every demo moment moves with the day of a restore, `lib/db/demo-day.ts` · `time-columns.ts`) · **S42B** leads and
  sales documents (REG-2178…2205, R160 — `quoteHoldsSigning` on every signing path, one PDF quote reader `lib/quotes/read-upload.ts`,
  `isStudioVisit`) · **S42C** projects, money and the client (REG-2154…2177) · **S42D** AI and design tools (REG-2258…2277 — S41's two
  proposals built, the demo plan switch restores Pro exactly, "3D" everywhere) · **S42E** outside the studio and Qanvast (REG-2206…2229,
  R170 · R171 — the website says what 2.0 does, Demo Studio's own logo) · **S42F** the leftovers (REG-2250…2257, R161 — a project always
  has a member; Fill from a document reads the file) · **S42G** a held meeting moves its lead as the stage policy allows (REG-2279…2283);
  REG-2249 the Cookie Policy's `om_studio`; REG-2278 the site changelog. Her calls, all built as recommended (three couldn't be — said so):
  `s42/calls-for-vicky.md`. **The closing regression:** `reg-s42/go.sh` — 160 probes (the 73 harness ids + 87 pm2 / pm / ks / pj), all
  green after six checks were brought to the deliberate S42 rules. **For the next regression:** `pbuild/run-env.sh` gives every server the
  CRON / WhatsApp secrets; `verify-pm2-s41` also needs `OPENMAISON_DEV_PREVIEWS=1` on its server + `BENCH=on` (or `BENCH=off` on a plain
  server). **UAT:** 125 steps + 161 checklist rows rewritten to today's app (`s42/uat-changed.md` — mirror them into the shared sheet by hand).
- **After S43A (lane A, 2026-10-15) — one signed-in member per browser (S42 call A·1, as recommended):** `lib/db/session.ts`
  `sessionMemberId()` reads this browser's live code session first (`browserSession()`), else the standing flag (`standingMemberId()`),
  cached per request; `sessionMemberSql` is GONE — every write stamp is `await sessionMemberId()` read before any transaction (107 sites, 30
  files); the schema property is `members.standingYou` (column `is_you`); `Member.isYou` is set per request by `withYou`. Code sign-in / Join
  no longer move the flag; Sign out ends one browser; View as moves the prototype + the pressing browser; Reset returns Dane and ends every code
  session. REG-2284…2289 (REG-S42A.18 superseded). No migration, no repair. Probe pm2-s43a 43/43.
- **After S43B (lane B, 2026-10-15) — honest reads and true demo data (ledger F1 minus F1-05):** Auto Fill reads the picked file by rule
  (`lib/leads/contact-fill.ts` — WhatsApp exports, emails, call notes; only empty fields fill; a picture attaches and says it can't be read
  yet) in the Move stage window and the Notes tab; Recreate never matches by file name (`unreadMatch`); the website's 18 capability pictures
  are captures of 2.0's own screens; R147 gives the demo month a real paid invoice (Aisha Rahman's flooring upgrade) so the month never reads
  a loss; a Hangout's End offers Resume at Met; the server checks a stage's fields with the window's rules (`stageRefusal`); a real client's
  portal carries no studio preview address; credits stamps held at "now" (`clampCreditBookkeeping`, R111). REG-2290…2297. No migration;
  repair R147. Probe pm2-s43b 70/70. `verify-pj-r6.cjs`'s two literal due days loosened (the base moves a day with each re-take).
- **After S44Q (lane E, 2026-10-15) — the quote editor, sending and the client's pages (UAT rows 246+, area Q + triage §12):** **one HTML
  allowlist** `lib/rich-html.ts` (`cleanRichHtml`, the contracts' rules) on every save AND every render of rich text — quote line / section
  descriptions, Terms and Notes, the T&Cs & Notes library, template Text blocks, Price book words, formatted lead notes; the client's `/quote`,
  `/confirm`, `/sign/…/quote` pages, Preview, the editor; a filled-in client name lands as words, never markup; R172 cleans older rows.
  Optional works off no longer records "Client said no"; a Blank Quote pins the default template's version (R173 pinned the older ones); an
  approver's send of an agreement over a Draft quote approves it (said in Send first; `lib/contracts/approve-named.ts`), refusals in the rule's
  words; the printed T&Cs keep lists / numbering / alignment / blank lines; `{gst_rate}` = the quote's own rate; a T&Cs template's [Studio
  Name] lands as the live field; Preview keeps a quote's view; Settings › Quotes & pricing "Clients may pick optional items on the
  confirmation link"; the client view pane shows the second client as typed (§12.8). REG-2298…2308. No migration; repairs R172 · R173. Probe
  pm2-s44q 52/52; ct-r1 · ct-r4 · sw-r2 · ux-p5 now assert the Draft hold for a Designer; pm2-s29 expects `{studio_name}`; pm2-s42d no longer
  needs an unpinned blank quote.
- **After S44T (lane A, 2026-10-15) — the template editor and the printed quote (UAT rows 246+, area T):** M1 spacing inside the Items
  block + the section band's own height (all 0 = today's print); M2 a Sub-totals text style, Totals and the payment schedule print money as
  their Currency says; C4 a section's mark in the # column with its name where line names start (moves the band's words on every print whose
  # column prints — before / after of the three house styles in `verify/pending-modules/pm2-s44t/c4-*`); M5 bold label / value per Details
  row, Lines none · under · boxed, a Remarks box in General Info → `{remarks}`; M6 + C5 (a)(b)(c) marks, the % before the words / in its own
  column / not printed, a fixed fee's own word in the editor's % cell, the Total row's cells, the phone cards end with the schedule, a PayNow
  QR beside the schedule; rows 270 · 329 · 309 · 324 · 331 · 363 · 284 · 294 · 293; **C1 "Priced after the contract"** on a top section's ⋮
  (its lines leave the total, the split and the margin; the print gives them their own part with an Estimated total); **C2's print side**
  (`quote_items.name_html`, kit colours only — `lib/templates/kit-html.ts`, `span[data-kit]` in the allowlist). Migration 0111 (`priced_after`
  · `name_html` · `quote_payments.fixed_label` · `quotes.remarks`); repair R126 (mends + checks, seeds nothing); R37 touches only the three
  seeded templates (M11). REG-2309…2330. Probe pm2-s44t 69/69; dane-p1 (the C4 band) and tpl-parity (milestone marks as a select) follow the
  new rules. C1's grid divider, C2's editor side and M3's storage half → S44I (merged into lane E at ~10:30 from `s42/…/s44t-into-E.txt`).
- **After S43C (lane C, 2026-10-15) — the AI Visualizer's sample rooms are the owner's new photos (ledger F1-05):** the living room,
  bedroom, kitchen and kitchen sketch are 1.0's `4a51f3522` byte for byte; each room re-traced, one file each in
  `lib/visualizer/sample-rooms/*` (living 7 surfaces · 14 pieces, bedroom 5 · 13, kitchen 11 · 15, windows + downlights); the five looks per
  room and the bedroom's golden hour made by the engine (`scripts/viz/sample-looks.mts`), the living room's empty plate from its own photo
  (`scripts/viz/plate/plate.py`, `plateLight: 'photo'`); the demo edit, swatches, the welcome's after (REG-819) and the trial's afters
  redrawn. A style on a sample room is now the engine's restyle (lists its finishes, quotable, keeps the outlines) — one hint reworded
  (invented copy). `pieceKind` no longer cuts a word at an accent ("Sofa taken out"). Repair R162 brings Kevin Ng's design up to date; R61
  writes the same for a fresh demo. No migration. REG-2331…2340. Probe pm2-s43c 42/42; cr-r3 · cr-r5 · viz-sheets · viz-studio · s20 · s36 ·
  P7 follow the new names; UAT ch13 updated (rebuild its tab). Asks her (REG-S43C.8): a demo moment for the drift guard's repair.
- **After S43D (lane B, 2026-10-15) — ledger F2:** Finance › Commission's ghost draws the *Asks for another rate* band when the page will
  (`lib/ghost-shapes.server.ts` seed, `FinanceFrame` / `FinanceGhost` `asks`); the Chips note ('' is no pick); Fill from a document's comments.
  **The sweep of 1.0's six newer branches** (`s42/sweep-newer-branches-2026-10-15.md`, read through git only): two bugs from `quotes/port`
  fixed — *Apply defaults* keeps GST off under an entity that isn't registered; every bill splits out the GST its own quote holds
  (`lib/projects/money.ts` `billGstRate` — the one rule; any new bill calls it); rows NB-01…NB-08 routed (NB-05…07 → S44I, NB-01…04 → S44F,
  NB-08 → S44G); UHD's three dashboards held for her (their exclusivity ask); crm-client-link-sarthak · billing-app excluded (Platform admin).
  F2-05 / F2-06: 1.0's quote document editor and per-knob locks compared — nothing to build but NB-08 (1.0's lock guarded overrides nothing
  ever wrote; Q-02 stands). REG-2341…2345. No migration, no repair. Probe pm2-s43d 35/35. `verify-pj-gap-a.cjs`'s four literal hold dates
  loosened to a window (the base moves a day with each re-take).
- **After S44P (lane A, 2026-10-15) — the Price book and Trades (UAT rows 246+, area P):** M8 the item dialog takes Cost · Markup · Unit
  price in the grid's order and rules (S$0 allowed; a markup below zero says "Below cost by S$…", never under S$0); 319 "New category…" at the
  foot of the item dialog's and bulk Set category's list (Owners / Admins; a Designer sees the rule) — `TextField` `action` (additive);
  264 "Already in the list as “X”" + the entry lights up (`listedAs`; Trades, Lead sources, Lost / On Hold reasons); 340 renaming a trade onto
  another asks "Merge A into B?" and moves items, quote lines, saved-section lines and its note, with Undo (reverses UI-sweep S4 #23 for trades
  only); 341 the Category filter collapses case variants; the list-size cap says when a list is full; Price book saves through `cleanRichHtml`.
  `lib/settings/trades.ts`, `app/settings/trades-actions.ts`, `components/company/price-book/new-category-dialog.tsx`. REG-2346…2352. No
  migration, no repair. Probe pm2-s44p 65/65; pb-r1 reads the Unit price box, sw-r4 expects the merge question.
  S44P on main: pm2-s44p 65/65, s12 72/72, s44q 52/52; pb-r1…r4 · pb-modal · st-r1 · sw-r4 all green on the curated base (the harness's own
  `prepare.cjs` copies the owner's live `local.db`, whose state differs — run the regression on `pbuild/base.db` as `reg-s42/go.sh` does).
- **After S44F (lane B, 2026-10-15) — the quote follow-ups from 1.0's newer branches (sweep NB-01…NB-04):** **NB-03 privacy** — a
  client's page no longer receives line prices the client view doesn't print (`/confirm`, `/quote`, `/sign/…/quote`, the portal's quote; the
  bundle walk carries no quote line): `clientSafe` sends the server's totals and section sums (`DocData.sums`, cost and margin zeroed); the
  print's `sections()` moved to the pure `lib/templates/item-sections.ts` (edit section logic there); page totals print only when every line
  shows a price (REG-S44F.2). NB-04 a hand-confirmed quote records `confirmed_via = 'marked'` + who, Undo puts both back, "Marked confirmed
  by …" on the banner / trail / Activity. NB-01 Changes: *Since the last version* (default) · *Every version* (a kit colour per version + a
  key, earlier removals struck; `diffChain` in `lib/quotes/diff.ts`). NB-02 the schedule's changes print on a revision; Version History says
  what changed in words with Copy (and in the revised quote's WhatsApp draft); Compare with any kept version (`?against=m`). Two adjacent
  removed lines kept their order wrong on the print — fixed. REG-2353…2361. No migration, no repair. Probe pm2-s44f 101/101.
- **After S44I (lane E, 2026-10-15) — the Items table: the team's sections prototype + UAT area I:** the delta's B1…B12 with its calls
  C1…C5 as recommended — places for adds + `moveQuoteItems` + New sub-section + the group rules; Collapse All / Expand All; a foot at the end
  of each section (an "Add to {section}" sheet on a phone); drag before / into / after a section and several ticked lines at once; ⋮ › Add Item
  › Several… (2–50) · From Price book · Paste lines at the row's place; the bulk bar's Group into section / sub-section · Move to section ·
  Out of the section · Highlight; Enter adds another on a just-added line; **the tree guides replace the children's tint and 4px bar
  (REVERSES REG-457 / REG-440's child half)**. Area I: M3 descriptions keep paragraphs / blank lines / alignment; **M9 Settings › Quotes &
  pricing › Units** feeding every unit picker (type-ahead; "New unit…" through `TextField` `action`; S44P's `listedAs`, lit entry, 60 cap);
  M14 a label in another case becomes the quote's own; **M17 Print as on a section** (print side in `lib/templates/item-sections.ts`); rows
  290 · 308 · 316 · 335 · 352; §12 items 6 · 14; **C2's editor side** — "Words on this line" (name + description, brand-kit colours only,
  through `cleanRichHtml`; REVERSES REG-557's "no colour inside text"); C1's "Priced after the contract" divider; NB-05 (Undo only its own
  step), NB-06 (a project's base quote keeps its issuing entity), NB-07 (a)(b) (pictures in section notes, an "Own rate" mark) — NB-07 (c)
  series fill kept out (needs a two-cell selection). REG-2362…2388. No migration, no repair. Landed by taking the lane's copies (it carried
  S44T / S44P / S44F, each checked to hold main's lines) and keeping main's repair script. Probe pm2-s44i 110/110 (+ logic 33/33).
- **After S44O (lane C, 2026-10-15) — money rules, sign-in phones, the email and a Marketing role (UAT rows 246+, area O):** 297 a quote's
  fixed design fee (+ S44T's `fixed_label`) carries through Duplicate project, the Start card / sheet and Apply defaults, and no fixed stage
  reads "0%" anywhere (presets, Save split as template, the milestone / commission pickers, the timeline, phone rows, Money's next payment);
  344 a member whose only sign-in is a landline is refused (`MSG.mobile`, `landlineOnlyKey` on the server); 360 Settings › Finance › Money in
  "Variation orders are billed: Spread over the stages · On their own, up front" (the second drafts the VO's own invoice on approval, with
  Undo — one writer `draftVariationInvoice` in `lib/projects/invoices.ts`, on S43D's `billGstRate`); 314 / 337 + C10 the email logo is a
  hosted PNG copy (`/files/email-logo`) sized inside 160 × 48, the layout unchanged; **C3 GST rounded once per rate** (REVERSES the
  2026-09-11 per-line rule; stamped on a quote at first send — `quotes.gst_rule`, Revise keeps it; R163 stamps the sent quotes 'line'; the
  editor's `Pricing.gstRule`); **C6 Marketing**, the sixth fixed role (its gates, lead pages, Settings › Lead management, Integrations,
  Dashboard, ⌘K, bell, permission rows; no AI seat, no Messages room, no cost sight; R164 Nurul Huda). Migration 0112 `s44o_gst_rule`;
  repairs R163 · R164. REG-2389…2398. Probe pm2-s44o 56/56. Left for a follow-up: the Price book pages' server gate for Marketing; a
  Marketing member's first visit to a lead past Met shows a ghost button the page doesn't have.
  S44O on main (after the 16:53 reboot, on the rebuilt base): pm2-s44o 56/56 with `OPENMAISON_DEV_PREVIEWS=1` on its server (it reads the
  email through `/api/dev/email-preview`; without the flag its three logo checks read the 404 page). **For the closing regression:** s41 and
  s44o need dev previews ON (s41 also `BENCH=on`); s42d needs them OFF (its D-19).
  S44O verify on main complete (17:10 → 17:40): s44q · s44f · s44i · s44t · s01 · s09 · s19 116 · s22 116 · pm-i 54 · pj-gap-f1 85 · pj-r1 98 (its
  month tile now counts from the data — the demo day moved Ryan's target end into November) and qe-r1 · qe-r2 · qe-r4 · st-r1 · st-r2 ·
  view-as · pb-r2 all green.
- **After S44R (lane A, rebuilt after the reboot, 2026-10-15) — agreements and bills (UAT rows 358 · 359 · 361, calls C7 · C8 · C9 as
  recommended):** **C8** a bill with no PO over the PO approval limit, or more than its PO by over the new tolerance (Settings › Finance ›
  Money out, default 10%), waits for an Owner's / Admin's OK in Finance › To do › To approve (+ a Needs your OK row on the project); the server
  refuses its payment; Approve has Undo; bell + Activity; Accounting sees why; a waiting bill with no PO counts as a cost only once approved
  (costs · profit · You owe · reports · GST input · the vendor's balance · Xero) — **REVERSES F1-Q10**. **C7** Send for digital signature's
  "Ask for the deposit" → the signing page ends on Pay the deposit (the quote's first payment, the issuing entity's PayNow, the portal's
  PayBox); Settings › Projects "A project starts when: the quote is signed (default) · the agreement is signed" → a signature moves the lead
  to Won through the Won step's rules, makes the project and drafts the deposit invoice (`lib/leads/won-on-signing.ts`) — **partly REVERSES
  REG-911**. **C9** contract templates' "Use at handover" → the Hand over sheet offers to send the completion letter filled from the project
  (completion date, defects period) — to sign or just to keep. Migration 0113 `s44r_agreements_bills`; repairs R127 (Letter of Appointment
  template) · R128 (bill EL-2207 waiting) · R129 (Completion & Warranty template). REG-2399…2411. Probe pm2-s44r 81/81; ct-r2 counts four empty
  Quote fields (Deposit). Shared: the PayBox takes a stage's number and amount owed; `notifyStageChange` → `lib/leads/stage-notify.ts`.
- **After S44G (lane E, rebuilt after the reboot, 2026-10-15) — a quote template's Text block takes formatting (sweep NB-08):** the house
  `RichEditor` (a `dense` form, `tools="block"`): Bold · Italic · Underline | Bulleted · Numbered | Text colour (the kit's Ink · Accent ·
  Red · Grey, `span[data-kit]`) | Link — no per-run size, strike or per-paragraph alignment; Insert a field puts the field at the caret
  (`insertField`); an old block opens as its same words and marks, nothing written until edited; every edit is an Undo step; the renderer
  prints lists, kit colours and links (underlined, a new tab; on the editor's page a link only selects its block); the client projection
  shows it, the allowlist strips scripts (`printedLinks` in `lib/rich-html.ts`, `kitTextColors` → `lib/templates/kit-html.ts`). Fixed on the
  way: Insert a field had lost Item count · Subtotal · GST amount · GST rate · Grand total since S44T (a comment ran over them in
  `lib/templates/fields.ts`); the Page list's Text row showed `&amp;`. REG-2412…2418. No migration, no repair. Probe pm2-s44g 82/82.
  S44R + S44G on main (one build, 20:10 → 20:35): pm2-s44r 81 · s44g 82 · s03 79 · s11 62 · s44t 69 · s44i 110 · s44f 101 · pj-gap-f2 84 ·
  pj-r8 67 (its "needed by" day now a window — the demo day moved it) · pj-r7 67 · pm-b 47 · ct-r2 24 · ct-r4 29 · tpl-parity 20 · qe-r3 21 —
  all green.
- **After S43E (lane B, rebuilt after the reboot, 2026-10-15) — ledger F3, the walk of what nobody walked + UAT:** every F3 item walked
  (+ S44I, S44O and Nurul Huda as Marketing), seven roles, 1440 / 390 touch, 768 / 320 spot checks — `s42/walk-F3-2026-10-15.md`; 13
  findings fixed (3 Major: a drop with no file showed a pretend signed contract on the Won step · Money › Billing's help squeezed at 390 · an
  uploaded quote's sections became one "Installation" milestone and Rebuild offered to take off Done stages; 8 Minor: **a refused control says
  its reason on a tap** through the house snackbar (the `Tooltip`, `REFUSED_KEY`), Members' preferences wrap, a meeting's recording plays in
  Files, Walk opens looking down the room, seven loaders' tab strips stand at the open tab (`GhostTabs active`), the Marketplace's brand
  category, Marketing's own words on Your profile, the rail's Tasks hides an empty Projects view from Marketing; 1 Polish). UAT F3-07: 42 new
  steps (chapters 22 Meetings · 23 Messages · 24 Plan it in 3D · 25 Outside the studio, + 2.38, 6.44–6.49, 10.17–10.18, 16.14, 20.24), the
  workbook rebuilt (489 steps), ids in `s42/uat-changed.md`. REG-2419…2431. No migration, no repair. Probe pm2-s43e 45/45. `verify-pj-gap-c.cjs`'s
  two literal "5 Oct" now a day window.
- **After S44Z (lane A, 2026-10-15) — the day's follow-ups:** **Marketing is refused on the server everywhere it can't go** — every page it
  could reach by address (Price book · Templates galleries + Brand kit · the six template editors · Materials · Members · a member's public
  profile · Plan · Client portal · Questionnaire · Reports' other tabs · the Visualizer · the Planner · Compliance · Qanvast Ops) answers
  `refusesPath` before reading a record; every studio action in `app/quotes/*` and `app/contracts/*` refuses first with `{ error: ON_DESK }`
  (`lib/quotes/desk.ts`, + a backstop in the shared loaders); the lead page's ghost and page agree (`headHasPrimary`, the seed's
  `lead.<id>.noprimary` · `.project` — a first visit to a Won lead drew the full tab strip for every role); Expense and Ticket categories say
  "Already in the list as “X”" and light the entry; the phone's Priced-after tag has the grid's words for screen readers; design-lint ratchet
  lowered (`slices.tsx` 10 → 9). REG-2432…2437. No migration, no repair. Probe pm2-s44z 106/106; pm2-s06 reads Marketing's new column. Left
  for the developers: the Company libraries', Visualizer's, Planner's, Meetings' and the lead tab's actions don't check the role themselves yet.
- **The closing regression (2026-10-15 22:01 →, `reg-final/go.sh`) caught two real regressions, both fixed in main (orchestrator):**
  1. **CSS order.** `app/layout.tsx` imported the house `Tooltip` before the stylesheets; since S43E the Tooltip imports the snackbar, which
     pulls house modules in, so their CSS (and the design system's) was emitted AFTER component modules — `om-reset` was no longer the lowest
     layer (dane-p6) and a module's override of a DS style lost (ux-p3: the questionnaire's `.tag { text-transform: none }` lost to the DS
     Tag's capitals — "ASKED · 15 OCT"; the same would hit every module that overrides a DS style). Fix: the two stylesheet imports come before
     every component import in the root layout.
  2. **`lib/db/session.ts` imported `next/navigation` statically** (since S43A), so any plain Node script that asks who is writing (the seam
     probes, a job with no request) threw while loading it (pm2-s41b5's seam). Fix: `next/navigation` loads where it is used (`rethrowNext`,
     the redirect); outside Next there is no request, so the standing member answers as before. The seam: 52/52.
  Re-verify after the run: rebuild, then dane-p6 · ux-p3 · pm2-s41b5 · pm2-s43a · s30 · view-as.
  3. **Accounting got past Tickets' gate** (pm2-s41b2): S44Z moved `/projects/tickets` onto `refusesPath`, and Accounting's open paths match
     `/projects/<anything>` (meant for a project's id) — so `/projects/tickets` opened. Fix: the pattern skips `tickets` / `insights`
     (`lib/settings/roles.ts` `ACCOUNTING_PATHS`).
  4. **The Xero card was hidden from Designers and Managers** (pm2-s34): S44O's C6 hid it from everyone outside the books, a change to what a
     Designer sees that C6 never asked for. Fix: only Marketing is spared the card (`app/company/integrations/page.tsx`).
  The clean run (`reg-final2/`, 22:57 → stopped 10:26 after the Mac slept and woke under load 160): the harness 73/73 green (dane-p6 · ux-p3
  confirm fix 1, s41b5 confirms fix 2); the package / Projects probes re-run one at a time on a base re-anchored to 16 Oct (`base16.db`).
  pj-r2 and pj-r4b fail only on literal dates written for the 14 Oct anchor (S42A moves every demo moment with the restore day).
  **Closing regression — DONE (16 Oct 12:20):** harness 73/73 (dane-p6 41 · ux-p3 91 · view-as 23 · st-r1 58 re-confirmed on the rebuilt main);
  the 101 package / Projects probes all green — 74 in the clean run, the other 27 re-run one at a time on a base re-anchored to 16 Oct
  (`pbuild/base16.db`), with s34 180 · s41b2 206 · s43b 70 · s41b5 176 · s43a 43 · s30 108 · s44z 106 confirmed after the fixes,
  s41 120 and s44o 56 on a dev-previews server, s20 54 alone (its overnight failure was the load), s42d 85 (its Stop press now made the moment
  the button shows — since S43C a sample room's restyle can reach "Keeping the version", where Stop steps away, during a screenshot — and
  the "Stopped" snackbar read as it arrives, under the credits hint). **pj-r2 and pj-r4b hard-code the dates of the 14 Oct demo day**: they
  pass on a base restored to it (87/87 · 75/75 on `pbuild/base14.db`, made with `pbuild/restore-at.ts 2026-10-14T12:00:00+05:30`) and fail
  on any other day — re-anchor them to read their dates from the records (a later probe round). s43b's R147 check now asks "this month",
  not "today" (a morning restore re-dates the invoice to late yesterday). Refunds go to the top-up pool on purpose (A-05) — not a fault.
- **After S45A (lane A, 2026-10-17) — UHD's Sales reports + their Projects columns and Dashboard tiles (H-UHD-1 · H-UHD-3; her "build
  everything" with UHD's dashboards in scope — built for every studio):** Company › Reports › Leads offers two reports by Chips — Response time
  (the default, unchanged) · **Sales** (`?report=sales`, `?range=`): 1.0's six as sections on the listing's table model — By team member ·
  Where leads stop (the funnel, Met included) · By source · Open pipeline · Over time (chart + table) · Going quiet (the listing's Last contact
  rule; On hold left out); Export, Maison AI; Owners and Admins (Marketing keeps Response time), Who sees leads honoured, no cost or margin.
  Money before GST; won value = the signed quote as signed, else the agreed value, VOs left out (`signedNetBy` in
  `lib/projects/money-queries.ts`, shared with the Projects column); a stage's win chance only once it has five closed leads, else "Too few to
  tell". The Dashboard: Sales (Owners / Admins) and Response time (+ Marketing) tiles, the report's own 90-day figures, each a door with
  Back. Projects listing: Source · Signed on · Value before GST (Owners / Admins) in Column settings, off by default. REG-2438…2449. No
  migration, no repair. Probe pm2-s45a 157/157; pm2-s22, s41b1 and ghosts-same follow the new tiles. The Dashboard's Contractors tile → S45B.
- **After S45C (lane C, 2026-10-17) — the leftovers:** (1) **drag-fill continues a series** (sweep NB-07 c): Shift+click / Shift+↓↑ selects a
  run down one column; dragging the run's corner continues numbers by their step (counts back when dragged above), repeats words in turn; one
  cell still copies; ⌘D over a run fills its first cell; one ⌘Z undoes a fill (`lib/quotes/fill-series.ts`; the ? panel's "Select cells down
  · up"; Shift+↓ on a fillable cell grows a run instead of walking — a visible change); (2) **Marketing refused inside every workspace action**
  — `workspaceRefusal()` (`lib/settings/desk.ts`) is the first line of the Company libraries', credits', the Visualizer's, the Planner's,
  Meetings', X-Ray's, the Marketplace's, Finance › Vendors', Qanvast Ops' and Projects' actions (Projects' reads answered a crafted call); the
  lead's Quotes / Contracts tabs answer ON_DESK; lists answer empty; Files no longer offers Marketing "Open in AI Visualizer" / "Make a 3D
  picture"; two refusals had Accounting's words — now Marketing's; all 548 served actions called by hand as Nurul return the rule; (3)
  `sharp` 0.35.4 listed exactly (the version Next installed; the lockfile's only change is its own entries); (4) **pj-r2 · pj-r4b · pj-gap-a ·
  pj-gap-c · pj-r6 · pj-r8 read their dates from the records** — no literal demo day left; (5) 1.0's per-vendor prices → each vendor's own
  Price book entry: the pure mapper `lib/port/price-book-vendor-prices.ts` (25 sample checks) + map 14 §2 / step 2a. REG-2450…2456. No
  migration, no repair. Probe pm2-s45c 120/120. Left for the developers: the same first line for Accounting in those families.
  S45C on main: pm2-s45c 120/120; pj-r2 87 · pj-r4b 75 · pj-gap-a 72 · pj-gap-c 105 · pj-r6 82 · pj-r8 67 (dates now from the records) ·
  pm2-s44z 106 · pm2-s45a 157 — all green on the base anchored to 17 Oct.
- **After S45B (lane B, 2026-10-17) — UHD's Contractors (H-UHD-2; built for every studio on her pick):** Finance › Vendors stays the one
  roster — a vendor gets *Works on site* with its trades (the studio's one trade list), how many sites it runs at once (1–20) and a code; the
  list's Contractors · n chip; a contractor's panel shows On site · This week · Sites; a vendor merge moves its rows, a trade rename follows.
  On a project a contractor goes on a milestone and reads its dates from the schedule (a move moves them), or keeps dates of its own;
  Planned · On site · Done + Leader checked (Owners · Admins · Managers), Undo on every change; the Schedule's Contractors drawer, each
  milestone row's line and the milestone panel; Add a contractor lists those who do the trade, free first. **The contractors' view lives in
  Projects › Workload** (`?view=workload&of=contractors` — one home: staffing is project work; Vendors holds the record): 1.0's four tiles
  (free · free within 7 days · over capacity · no contractor yet), the gaps with Add a contractor, By contractor and By site on the listing's
  model, a Window choice; Designers see it once the studio has a contractor. Gaps are a Needs you row; the Dashboard's Contractors tile
  (Owners · Admins · Managers); six Activity lines, four *Who may do what* rows, a ⌘K page, a Maison AI question; every contractor action
  starts with `workspaceRefusal()`, Accounting refused next. `lib/motion.ts` `bottomSheet` gains `x:0` (also fixes a drawer opened from the
  address on a phone sitting off screen). Migration 0114 `s45b_contractors` (`vendors.is_contractor · trades_json · crew_capacity · code`,
  table `project_contractors`); repair R148 (7 contractors, 21 places following the schedules). REG-2457…2476. Probe pm2-s45b 72/72. Not
  built: 1.0's CSV import and By site Excel export (1.0 deferred both).
- **S45's closing regression (2026-10-17, one main build on a base anchored to the day; `reg-s45/go.sh`):** harness 73/73; package probes
  104 — every one green but pm2-s17, which caught Finance › Vendors' ghost drawing three chips while the page draws four (S45B's *Contractors
  · n*). Fixed as REG-2477: the shell's seed `fin.contractors` (`lib/ghost-shapes.server.ts`) + `?show=contractors`, read by `finance-ghost.tsx`.
  Rebuilt: pm2-s17 130/130 · pm2-s45b 72/72. **A page that gains a chip, a tile or a band gains it in its ghost too** — and a chip that shows only
  while the records hold something needs a seed in `fetchFirstRunShapes`, keyed by the page's own rule.
