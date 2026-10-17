# S42E · Outside the studio and Qanvast — the fixes for audit E — outcome (2026-10-14, lane E)

Fixed in lane E (`…/scratchpad/lanes/E`, port 3185) from `s42/audit-E.md` (21 findings) and audit E's calls in `s42/calls-for-vicky.md` (E·1…E·5,
taken **as recommended** — her "build all of them" 2026-10-11; each listed there for her review). Register rows: `steps/reg-S42E.md`
(REG-S42E.1…24). Probe: `design-source/verify/pending-modules/verify-pm2-s42e.cjs` (shots in `pm2-s42e/`). **No migration. Repairs R170 · R171**
(R172…R179 unused).

## Ledger — every finding

| ID | Sev | Answer |
| --- | --- | --- |
| E-05 | Blocker | **fixed by S42B** (lane C) — it owns the PDF quote reader on every path (Create Quote › Upload a quote, the VO upload, the schedule's quote, the public trial's Upload a quote, X-Ray's `readSide`): read by content / by rule, never by the file name. Not touched here (routing in `s42/carried-notes.md`). |
| E-01 | Major | **fixed** — `lib/site/platform.ts` (Meeting Copilot: subcopy, step 2, *Live transcript* → *Notes in, brief out* with its icon, deal score / estimate lines, hub card, matrix, FAQ), `lib/site/changelog.ts` (the speaker-labelled transcription line cut, three lines reworded), `lib/site/blog/{articles,articles-batch-1,articles-batch-5}.ts` (the co-pilot article's listening paragraphs rewritten to typed notes; the tech-stack, AI and Houzz articles), `public/llms.txt`. Every line below. |
| E-02 | Major | **fixed** — "a spreadsheet or a PDF" (Upload a quote page, hub, FAQ, llms.txt); Home › Results "30s quote read — Upload your quote and see every line’s margin."; the Journal's "contractor PDF parsing" / "reads contractor PDFs" → "a contractor's quote read into structured line items". The PDF half rests on S42B's B·4 (below, *For other packages*). |
| E-03 | Major | **fixed** — Maison AI page (subcopy, steps 2–3, *Get work done*), hub card, matrix *AI* ("…does the next step when you say so" — no "think", no "agentic"), What's New's "Ask your studio anything" → "Ask your studio", the FAQ; X-Ray's "AI reads every line" → "Every line read". |
| E-04 | Minor | **fixed** — the Visualizer page (blurb, subcopy "change it in seconds", steps without the sketch, *Quick, life-like renders*), the Space Planner's related card, the Design pillar, the hub card, the Home's render card ("Life-like · in seconds"), What's New, the Houzz table, llms.txt — S36's own words. |
| E-06 | Major | **fixed** — `lib/qanvast-account/model.ts` `reviewerKey` · `reviewedOn`; `queries.ts` `AskPerson.reviewedAt` (finished projects and leads); `request-reviews-dialog.tsx`: "Reviewed 2 Oct ’26" in the row, unticked by default, still pickable; "Every finished project’s client has reviewed you." when nobody is left. Sibling: the Leads list's rows say "Reviewed …" too. |
| E-07 | Minor | **fixed** — `components/qanvast/account/words.ts` `closuresFootSimulated`, `lead-credits.tsx` (while the stand-in answers), the ghost through the shell seed `qanvast.standIn` (`lib/ghost-shapes.server.ts`). |
| E-08 | Polish | **fixed** — `account.module.css` `.charts { align-items: start }`. |
| E-09 | Minor | **fixed** — `components/shell/access-gate.tsx` `SECTIONS` + marketplace · market-insights · meetings · dashboard · tools; the unnamed fallback reads "this page" in the sentence. |
| E-10 | Minor | **fixed** — `components/marketplace/marketplace.module.css`: the featured rule reads the deal as a descendant (the tooltip's `display: contents` anchor broke the child rule); a lone deal wraps to two lines at ≤767. |
| E-11 | Minor | **fixed** (with call E·3) — `lib/leads/briefs.ts` the met-already New brief (`BriefLead.met`, `LOG_MEETING`); `lib/leads/queries.ts` `LastContact.meetingId`; `app/leads/[id]/overview.tsx` (`met`, `logMeeting`), `use-lead-maison.ts` (*Log the meeting*). |
| E-12 | Minor | **fixed** — `components/hangouts/meetings-view.tsx` the why-line (on the day, a member on no shift today who doesn't run the studio). |
| E-13 | Minor | **fixed** — `components/visualizer/trial/trial-tool-ghost.tsx` (new, reads the tool from the address), `trial-ghost.tsx` (the tool's title, line, sample-only line; the sketch's one tile and head), `app/site/try/[tool]/loading.tsx`. |
| E-14 | Minor | **fixed** — `lib/trial/policy.ts` `roomLandedLine`; `lib/visualizer/trial/carry.ts` (the photo carries the line); `components/auth/studio-sign-up.tsx`; `components/visualizer/home/visualizer-home.tsx` (said on the photo's design); `components/om/snackbar.tsx` `carrySnackbar(to, message, action?)`. |
| E-15 | Minor | **fixed** — `lib/links/old-addresses.ts`: portfolio → `/profile#public`, complaints → `/qanvast-ops/reviews/feedback`, promote → `/qanvast-ops/reviews/ranking` (307s, checked). |
| E-16 | Minor | **fixed** — `qanvast-reviews.tsx`: the view chips carry no count; *Waiting for a reply · n* keeps it. |
| E-17 | Polish | **fixed** — `components/market-insights/cards.tsx` `articleWhen` = the house date; `lib/market-insights/demo.ts` prose in curly quotes (chart JSON untouched; R142 rewrites the records on every run, R171 checks them). |
| E-18 | Polish | **fixed** — `components/site/book-demo.tsx` `required` on the four fields; the hub's footnote back to the house `FREE_LINE` (`platform-pages.tsx`), and the site's Offer data (`lib/site/seo.ts`). |
| E-19 | Polish | **fixed** — the chat card's square is the homeowner's initials (`.client` composes the client portal panel's `initials`). |
| E-20 | Polish | **fixed** — `lib/nav.ts` `fromLabel`: every `/qanvast-ops/hangouts…` address is "Hangouts". |
| E-21 | Polish | **fixed** — (a) `qanvast-listing-card.tsx` + `company-ghosts.tsx`: the play half only for Owners and Admins (`LISTING_SIMULATED_READ`, `lib/services/registry.ts`); (b) `components/trial/trial-tools.module.css` `.landing:focus-visible` offset 0. |

**Counts:** Blocker 1 → fixed by S42B · Major 4 → 4 fixed · Minor 10 → 10 fixed · Polish 6 → 6 fixed. Nothing left unfixed in this area.

## Calls fixed as recommended (listed in `s42/calls-for-vicky.md`)

- **E·1 — the website talks about today's 2.0.** Every claim line rewritten to what each feature does (list below); "20+ AI capabilities" → "AI in
  every module"; "think" gone. The Journal keeps its industry commentary (e.g. "a photorealistic render of their living room" in a paragraph about
  the trade's visualisation tools) — only OpenMaison's own claims changed.
- **E·2 — Reviews for Admins.** `seesQanvastReviews` (Owner · Admin) / `seesQanvastCredits` (Owner). Every read, the reply action, ⌘K's two
  Reviews rows (`runners`), Company › Profile's door, Maison AI's answer, the gate's words and the Reviews ghost follow. Lead credits unchanged.
- **E·3 — End offers the stage the outcome implies.** As recommended, with one honest correction: under one stage at a time (Linear, the demo's
  rule and the default) a New lead can't move straight to Met — the Overview would refuse "Complete Contacted first" — so the offer is the stage the
  studio's rule allows (`heldMeetingStep`): Met where it may, else Contacted with the chat as the first contact log. Dropped → Lost, the reason
  mapped onto the studio's Lost reasons. Ticked by default; it opens the lead's own window (nothing moves without its Save).
- **E·4 — the floating "Try it free" pill: not built** (Try now sits at the top and the close of the Visualizer page; one filled button).
- **E·5 — Demo Studio's own logo.** `public/demo-studio/logo.svg` + R170 (only while the kit holds OpenMaison's mark).

## Every changed sentence on the website (for Vicky — E·1)

| Where | Was | Now |
| --- | --- | --- |
| Home › Results | 30s quote upgrade — Upload PDF quote & increase margins. | 30s quote read — Upload your quote and see every line’s margin. |
| Home › Results | 20+ AI capabilities — Responds. Guides. Takes action across business. | AI in every module — Leads, quotes, designs, projects and money. |
| Home hero card | Photorealistic · 14s | Life-like · in seconds |
| Pillar · Design | Create and edit renders from photos or sketches. … | Create and edit renders from your room photos. … |
| Visualizer · menu | Photorealistic renders | Life-like renders |
| Visualizer · subcopy | …Upload a room photo or a sketch and transform it in real time. … | …Upload a room photo and change it in seconds. … |
| Visualizer · steps | Upload photo/sketch. — …or a concept sketch. · …in real time. · Generate photorealistic render… | Upload a photo. — Start with a photo of the actual space. · …in seconds. · Generate a life-like render… |
| Visualizer · card | Photorealistic renders — Life-like quick renders that you can iterate… | Quick, life-like renders — Renders you can iterate… |
| Space Planner · related | Photoreal renders in minutes | Life-like renders in seconds |
| Upload a quote · subcopy | Upload a PDF quote for a line-by-line AI review. … | Upload your quote — a spreadsheet or a PDF — and see every line’s margin. … |
| Upload a quote · step 1 | Upload PDF quote. — Drop your quote or a competitor’s and let AI review every line item. | Upload your quote. — Drop in a spreadsheet or a PDF, and every line comes back ready to edit, with its margin. |
| Upload a quote · card | Turn a PDF quote into structured, editable line items. | Turn a quote — a spreadsheet or a PDF — into structured, editable line items. |
| Meeting Copilot · subcopy | Your AI co-pilot listens, analyses and guides you in real time. It surfaces insights, coaching, estimates & more, while… | Your co-pilot reads your notes as you type — tips, a deal score and a running estimate, while your client never sees a thing. |
| Meeting Copilot · step 2 | Get guided in real time. — Receive live insights, tips via whisper cards on your screen. | Get guided as you go. — Type what’s said, and tips appear on your screen as whisper cards. |
| Meeting Copilot · cards | Live transcript — Focus on your client. Your co-pilot will take notes. (+ 1.0's four pictures) | Notes in, brief out — Type or paste what’s said — your co-pilot turns it into a brief and a follow-up. (every card its icon) |
| Meeting Copilot · cards | Live deal scoring — AI evaluates signals… · Running estimate — Automatically generated, evolves live… | …Your co-pilot weighs signals … as your notes grow. · Built from your notes, it grows as you discuss scope. |
| Maison AI · subcopy | Ask anything about your business in natural language. Behind the scenes, Maison AI analyses your data, answers questions, creates charts and takes action. | Ask about your leads, projects and money in plain English — Maison AI answers from your records, draws the numbers, and offers the next step for you to confirm. |
| Maison AI · steps 2–3 | …responds after analysing your studio data… · AI gets things done. — It can design charts, create tasks… | …answers from your studio’s records… · Say yes to the next step. — It drafts messages, adds tasks and records, and asks you to confirm each one… |
| Maison AI · card | …it creates tasks, drafts messages, designs charts and updates records on request. | …it drafts messages, adds tasks and updates records — each offered for you to confirm. |
| Hub cards | Upload a PDF quote and let AI review it line by line… · Transform photos and sketches into … photorealistic concepts… · …captures discussions… · …Create reports, uncover insights or take actions. | Upload your quote and see every line’s margin… · Transform room photos into editable, life-like concepts… · …reads your notes as you take them… · …Uncover insights, then take the next step when you say so. |
| Hub matrix | AI margin-check, import a PDF quote · AI takes notes and helps in conversion · Agentic AI that can analyse, think and act | Margin check on every line, upload your own quote · Turns your meeting notes into a brief and a next step · Answers your questions and does the next step when you say so |
| Hub closing | Free to start. No credit card required. | Free to start · No card needed. (the house footnote) |
| FAQs (data, not drawn) | …about thirty seconds · It transcribes live… · …it can take actions like… | …as a spreadsheet or a PDF, … in seconds · It reads the notes you type… · …it offers actions … for you to confirm |
| What's New | …from live transcription to a brief… · Real-time streaming transcription…, with each speaker labelled. · A live status bar — connection, deal score… · Live transcription as you talk, with private coaching cards… · Ask your studio anything · …it pulls your data, draws the chart, and can take action. · …raise an invoice. · AI reads every line and sorts it by trade. · …generate a photorealistic render in minutes. · …higher-fidelity renders. | …from the notes you type to a brief… · *(cut)* · The deal score and the running quote estimate, always in view. · Private coaching cards at just the right moment, as you type what’s said. · Ask your studio · …it reads your records, draws the numbers, and offers the next step for you to confirm. · …— once you say yes. · Every line read and sorted by trade. · …see it restyled in seconds. · …sharper renders. |
| Journal · tech stack | The difference is AI: 20+ tools including… · You upload a contractor's PDF, the AI reads it and spits out… · An AI co-pilot listens to your client consultation… | The difference is AI across the studio: … · You upload a contractor's quote, and it comes back as… · An AI co-pilot reads your notes as you take them in a client consultation… |
| Journal · AI transforming | …can listen to the conversation and surface … in real-time. … We're building it at OpenMaison… | …can read the designer's notes as they are taken and surface … as the conversation runs. … We've built one at OpenMaison that works from typed notes… |
| Journal · Houzz comparison | key stat "AI tools in OpenMaison 20+" · …over 20 AI-powered tools, from the Meeting Copilot that listens … in real time, to Upload a quote, which reads contractor PDFs, to the AI Visualizer, which generates photorealistic renders. · table: AI photorealistic renders · real-time transcription, coaching cards, deal scoring · contractor PDF parsing… · OpenMaison has over 20 … transcribes client conversations in real time … parses contractor PDFs… | "Finance reports in OpenMaison 10" · …AI across the studio: the Meeting Copilot, which turns the notes you take … into tips, a deal score and a brief; Upload a quote, which reads a contractor's quote into editable line items; and the AI Visualizer, which restyles a room photo in seconds. · life-like AI renders from a room photo · coaching cards and deal scoring from your meeting notes · a contractor's quote read into structured line items · OpenMaison builds them into every module … reads what the designer types … reads a contractor's quote… |
| Journal · co-pilot article | excerpt "…when an AI listens to your client consultation…" · "It listens to the conversation…" · "The system starts recording audio." · "…reads the recent transcript…" · "Six types of real-time cards" · "…what the AI picks up from the conversation" · "…from the full transcript…" · *Audio quality matters a lot* + *Accents* · *Privacy* (recording, audio transcribed and discarded) · the typed-notes fallback | "…reads your consultation notes as you take them…" · "It reads what the designer types … or a transcript they paste…" · "Then they type what's said as it is said." · "…reads the notes so far…" · "Six types of cards" · "…from the notes" · "…from the full notes…" · *It reads only what is written* (one paragraph) · *Privacy*: notes are personal data, the consent, the notes stay with the lead, a kept recording sits in the lead's files · "…write it up afterwards: paste the notes or a transcript…" |
| llms.txt | A live meeting assistant…: transcription, coaching cards… · Turns a PDF quote into … in about thirty seconds · …generate a photorealistic render. | A meeting assistant…: it reads the notes you type, with coaching cards… · Turns a quote — a spreadsheet or a PDF — into … in seconds · …generate a life-like render in seconds. |

Kept, flagged: Maison AI's *Get work done* picture (`maison-bot/actions.jpg`) shows "Lead moved to Quote Created" — 1.0's stage name inside an image
(2.0 says Quote Sent); a new picture is Vicky's. Story's "lifetime fixed pricing", Privacy / Terms as S35 left them.

## For other packages

- **S42B (lane C) — B·4 / E-05.** The site now says Upload a quote reads "a spreadsheet or a PDF" — in `lib/site/platform.ts` (Upload a quote's
  subcopy, step 1, *Line-item extraction*, the FAQ) and `public/llms.txt`; the hub card, the Home and the Journal are format-free. If B·4 does not
  land, put "your quote spreadsheet" in those five places.
- **Whoever owns S23 (audit C) — the meeting room's "Move to Met" offer.** The same fault E·3 met: `fileHeld` → `'offer-met'` and the room's banner /
  snackbars push `?move=met&meeting=` for a lead still in New, which Linear refuses ("Complete Contacted first"). `heldMeetingStep(lead, mode)` in
  `lib/leads/stage-policy.ts` now answers the right step (Contacted, with the meeting as the first contact log — `resolveMoveHandoff` already derives
  that log from a meeting); `components/meetings/{room/meeting-room,lead-meetings}.tsx` can offer `Move to ${step}` with it. Not changed here.
- **The demo-ageing re-anchor (A-03, lane A):** the Qanvast leads' `created_at` and credit history (carried note in audit E) — not mine.
- **The S27 probe's End dialog (pre-existing, not a finding):** in the shots the DS TextArea's label "What was said" overlaps text filled by
  Playwright's `fill` — a probe artifact of programmatic fill on the DS text area (typing floats the label); worth a look in the DS lane only if a
  person can reproduce it.

## Shared pieces changed

- `components/om/snackbar.tsx` — `carrySnackbar(to, message, action?)`: a carried snackbar may carry one action (`{ label, href }`, pushed with the
  router). Callers without an action are unchanged.
- `components/shell/access-gate.tsx` — `SECTIONS` + five names; the unnamed fallback's sentence.
- `lib/ghost-shapes.server.ts` — the shell seed's `qanvast.standIn`.
- `lib/leads/stage-policy.ts` — new pure `heldMeetingStep`; `lib/leads/move-link.ts` — `moveStageHref(…, { reason })` / `readMoveParams().reason`;
  `app/leads/actions.ts` `resolveMoveHandoff` — a meeting also yields a Contacted log when none is picked; `app/leads/[id]/overview.tsx` — the Lost
  reason from the handoff, `met` on the brief, `logMeeting`; `lib/leads/queries.ts` — `LastContact.meetingId`; `lib/leads/briefs.ts` — the met-already
  New brief; `components/leads/detail/use-lead-maison.ts` — door `logMeeting`. (Lane C — S42B — owns leads and sales documents: merge by hand if it
  touched the same hunks.)
- `lib/nav.ts` `fromLabel` (Hangouts); `lib/links/old-addresses.ts` (three rows); `lib/global-search/model.ts` (two rows `owners` → `runners`);
  `lib/services/registry.ts` (`LISTING_SIMULATED_READ`, outside `SIMULATED_WORDS` so `SimulatedKey` is unchanged).
- Probes updated on purpose (commented with the S42 finding): `verify-pm2-s27.cjs` (End unticks the new offer to stay on the page — E·3),
  `verify-pm2-s41b5.cjs` (the view chip's count → Show chip — E-16; one ticked fewer — E-06; Admin opens Reviews — E·2), `pm2-s41b5-seam.mts`
  (Admin reads and replies — E·2).

## Repairs

- **R170 · Demo Studio's own logo** — `settings.brand` `kit.logo` → `/demo-studio/logo.svg` while it is `/figma-assets/logo.svg`; check "brand kit
  logo is OpenMaison’s mark". Idempotent (second run: "the brand kit already has a logo of the studio’s").
- **R171 · Market Insights' sample words** — read-only: R142 rewrites the demo articles from `lib/market-insights/demo.ts` on every run; R171 says
  whether any article's prose (outside its chart blocks) still has a straight quote; check "Market Insights sample title or first lines with a
  straight quote". The orchestrator's after-step re-baselines (`db:baseline`) so the fixture carries both.

## Probes run (lane E, `next start -p 3185` on a scratch copy of `pbuild/base.db`, migrated + repaired; builds under the lanes' lock)

| Probe | Tally |
| --- | --- |
| **`verify-pm2-s42e.cjs`** (final build) — the website's claims swept on 12 pages + llms.txt, Book a demo, Request reviews (a reviewed and an unreviewed finished project), the view chip, Admin on Reviews (read · reply · ⌘K · Profile door) and on Lead credits (gate), the closures footnote, the charts' heights, the gate's names (Accounting), the Marketplace at 390, End → Contacted (Linear) / Lost (its reason) / Met (Flexible) / unticked, the met-already brief and *Log the meeting*, the crumb, the Manager's why-line, the initials, the sketch loader (held navigation), the trial landing's snackbar → Open Leads, 1.0's three addresses, the article byline and curly prose, the listing line (Designer / Owner), the logo (kit · file · public Hangout page), the trial title's ring, 390 / 320 overflow, page errors | **65 / 65** |
| Steps' probes: `verify-pm2-s27` · `s41b5` (+ its seam harness) · `s24` · `s25` · `s37` · `s35` · `s36` · `s41b3` · `s41b2` · `s23` · `s05` · `s34` (with the cron / WhatsApp secrets) · `s14` · `s31` · `s10` · `s22` · `s16` | 155/155 · 176/176 · 132/132 · 98/98 · 84/84 · 138/138 · 109/109 · 175/175 · 206/206 · 148/148 · 113/113 · 180/180 · 69/69 · 104/104 · 107/107 · 116/116 · 56/56 — all green |
| Regression (`regression/run.cjs`, port 3185, base = the scratch DB migrated + repaired): `ghosts-same` · `ghosts-same-390` · `search` · `view-as` · `ux-p1` · `dane-p6` | 73/73 · 73/73 · 27/27 · 23/23 · 81/81 · 41/41 |
| Repairs on a second run | R170 "already has a logo of the studio’s", R171 "every quote and apostrophe curly", all checks pass |

The step probes ran on the build before the last two small changes (the client initials' ink doubled for load order; the shorter landing
line); the final build re-ran this package's probe and the regression ids. Shots of every visible fix: `design-source/verify/pending-modules/pm2-s42e/`
(1440, and 390 for the Marketplace, the Meeting Copilot page and the chats).

`npx tsc --noEmit -p .` clean · `npx eslint` 0 errors (2 warnings, both in a file this package didn't touch) · `npm run design:lint` — nothing
new breaks a house rule (baseline unchanged).

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins, every exception written down** — no mock covers these surfaces; every new sentence and the logo are in `reg-S42E.md` as invented
   copy, each call taken as recommended and listed for her.
2. **One system, no one-offs** — house pieces only: `Checkbox` + the tick-and-help pair composed from `outside-person.module.css`, the client portal
   panel's initials composed (doubled for load order, REG-422's rule), the house snackbar's carry, `ConfirmDialog`-free flows reuse the Move stage
   window and the Lost dialog; design:lint unchanged.
3. **Plain words** — the site says what each feature does in studio words; "Reviewed 2 Oct ’26", "Move Lim to Contacted", "Only the designers on
   today’s shifts…", the gate names the place.
4. **Nothing is lost** — the End offer only opens the lead's window (Cancel leaves the lead as it was; the Lost dialog keeps its Undo); nothing
   is removed.
5. **Say why** — the reviewed client's row says why it's unticked; the Manager's why-line; the Lost help line says which reason is carried; the
   closures footnote names its rule; the Designer isn't offered a play they can't make.
6. **Back returns where you came from** — End's landing carries `?from=` (the lead's Back reads "Back to Hangouts" / crumb "Hangouts"); 1.0's three
   addresses land where their jobs live.
7. **Every screen is whole** — the trial tool loader draws its page; the credits ghost reads the stand-in's line; the Reviews ghost follows the
   new rule (`role.runs`); the listing ghost says the same line as the card.
8. **Every width is designed** — the Marketplace deal at 390; the probe checks 390 and 320 for sideways scroll on every page touched.
9. **Tables follow the leads listing** — not applicable (no table changed).
10. **Motion with purpose** — no new motion; the charts no longer stretch an empty partner.
11. **Honest data** — the website claims only what 2.0 does; the demo's logo is the studio's own (R170); the sample articles' words on record
    (R142/R171); the brief follows the record (a held meeting is contact).
12. **Reach for everyone** — the trial title's focus ring stays visible without hiding text; the End offer is a labelled checkbox; required fields
    carry `required` / the asterisk; the initials square is `aria-hidden` beside the printed name.

How to add a missing thing: **one home** (End's offer opens the lead's own window, no new page); **shown only when it applies** (the offer once an
outcome is picked and the rule allows a step; the why-line on the day only; the play half only for those who play); **one filled button** (End the
chat stays the dialog's); **defaults need no set-up** (ticked by default, the studio's own stage rule decides the step).
