# Lane B — the lead's page and the moments that move it (responsive audit, 2026-10-23)

Server :3014 on the scratch `audit.db`, main at `a6caecb1`. Shared shots in `../shots/` (`m390-03-*`, `m390-04-*`, `m390-05-*`, `m390-07-*` and the
t768 / t1024 twins); lane shots and probe scripts in this folder (`scripts/*.cjs`). Every touch box below is the effective hit box —
`elementFromPoint` walked out from the centre — not the element's rect. To walk the Move stage window I created three test leads (Laneb
Alpha · Beta · Gamma), took Alpha New → Contacted → Met → Quote Sent → Won (project P-2026-006), Beta through On Hold → Resume → Lost →
Resume, and opened Gamma's sheets; afterwards the project and the three leads were **deleted forever** (0 rows left in `leads`, `lead_files`,
`stage_logs`). Named demo leads were only opened and cancelled (Farah, Gerald, Jasmine, Olivia unchanged).

**Severity count: 1 Blocker · 14 Major · 11 Minor (26).**

## 1. Findings

| id | surface | width | severity | what is wrong (what I saw) | evidence | rule it breaks | fix inside today's pattern |
|---|---|---|---|---|---|---|---|
| B-01 | Header primary → Move stage window (New lead with no owner) | all | **Blocker** | On a lead nobody owns, "Move to Contacted" opens the window **at Contacted** (`stageIntent` returns `wizard` for the next stage without the owner gate that `blockedReason` and the stage menu apply). I filled the whole log (Call · date · outcome · a screenshot), pressed Save → Suggested tasks → "Move without tasks": the server refused ("Couldn’t move the lead — assign a member first"), **the window closed and the log was gone** — 0 `lead_notes`, 0 `stage_logs`; the screenshot stayed in Files, once per attempt (two copies after two tries). Every lead an Owner or Admin adds lands like this (only a Designer self-assigns, REG-609). | `m390-w1-01-after-primary.png` · `m390-w2b-10-after-save.png` · `m390-w2b-11-finished.png` · `t1024-tab-03-window-unowned.png` | REG-130 (nothing passes New without an owner — the menu greys Contacted, the primary doesn't); "a dialog closes only once its save lands" (UI sweep, REG-656…660) | `lib/leads/stage-policy.ts` `stageIntent`: an unowned lead's next stage opens the window **at New** (or the primary reads "Assign a member" and opens the Assign sheet with its Suggested member, then carries on to Contacted). The window never closes on a refused move — it keeps the log and shows the refusal in its foot. |
| B-02 | Move stage › New (assign inside the window) | 390 | Major | Only the 44×44 checkbox at the right edge ticks a member; the rest of the 358×64 row — avatar, name, role — does nothing (a tap on "Dane" left it unticked). The foot reads "Save changes" while the lead is still in New, and Save closes the window ("Members updated") instead of carrying on: you press "Move to Contacted" a second time. Nothing in the Contacted step says New still needs someone (the rail's empty circle is the only sign). | `m390-w3-02-new-ticked.png` · `m390-w3-01-new-step.png` | a row is its control's label (brief); one thing at a time, then the next (On the move) | Make the whole row the checkbox's label (the Assign sheet's rows already do this — `m390-mx-a2-assign.png`). On New the foot reads "Save & continue" and goes on to Contacted. Better: the New step *is* the Assign sheet, Suggested member first. |
| B-03 | Identity block: Call · Copy · WhatsApp · email | 390 · 768 · 1024 | Major | The page's two most-used on-site actions are its smallest targets: the tel: number 70×20, Copy 24×24 and WhatsApp 24×24, 8 px apart; email 79×20, Copy email 24×24. **This is a decision** (REG-365: the owner kept the block's 8 px rhythm "below REG-273's 44 floor"). It doesn't serve someone holding the phone in one hand at a client's door. | `../shots/m390-03-overview-farah.png` · `scripts/focus.cjs` output | 44 on touch (REG-312 / REG-307) | Keep the block's rhythm. Add the Quote screen hero's client row (`components/quotes/screen/quote-screen.tsx`: **Call** · **WhatsApp** as real buttons) under the name, at 48. Copy moves to a long-press on the number (`use-long-press.ts`) or to ⋮. |
| B-04 | The Overview's one primary | 390 | Major | The header is static on a phone: after a 600 px scroll the stage pill and "Move to …" sit at y −536, and only the tab strip sticks. The page is 2457–3171 px long (2.9–3.8 screens), so the stage's next step is off-screen everywhere below the brief. | `m390-ov-farah-scrolled600.png` · `ov-measure-m390.json` (afterScroll) | read first, then one sticky foot with the state's one primary (On the move, the Quote / Contract screen) | A sticky 48 foot on ≤1024: **Log ▾** (Call · WhatsApp · Visit · Note) + the stage's one primary ("Move to Met" · "Convert to Project" · "Resume at X"); the bar keeps Stage ▾. The foot lifts the snackbar (`useSheetFootLift`) and the FAB steps aside (REG-2602). |
| B-05 | The Overview cards' type | 390 · 768 · 1024 | Major | The cards keep the desk's 12 px for values and sentences: LEAD STAGES days, "current", "Assign a member first" (12); Last contact's line "Call · Callback requested" (12); Next follow-up's task name and date (12); Response time (12, cut with an ellipsis — "First contact in 28h …"); MY TASKS dates (12); the Questionnaire counts (12); the files tile names (10); the brief's tag (10, uppercase); Invite to Portal's "Not invited" chip (10) and the page address (12). | `ov-measure-m390.json` (text) · `../shots/m390-03-overview-olivia-full.png` | 16 · 14 · 44 — never under 14 for a value, a name or a sentence | Apply the scale in each card's module under the two queries (`stages-card`, `my-work-card`, `quote-card`, `questionnaire-card`, `files-card`, `ai-brief`): meta 14, the stage names and task titles 16, the 12 uppercase eyebrows stay. Let the response-time line wrap instead of clipping. |
| B-06 | QUOTES card's six-step bar | 390 · 768 | Major | The step labels break inside words: "Dra/ft", "Approv/ed", "Confirm/ed", "Signe/d" at 390; "Dr/aft", "Appr/oved", "Confi/rmed", "Sig/ned" at 768 (272 px card). The bar is 128 px tall of 12 px fragments. | `../shots/m390-03-overview-olivia-full.png` · `../shots/t768-03-overview-olivia.png` · `m390-won-benjamin.png` | nothing truncated or broken; 14 minimum | On ≤1024 replace the bar with the quote's status chip and its **Next** line from `lib/quotes/next-step.ts` ("Draft · next: send it to Olivia"), plus the amount at 18–26 — the words the phone card uses already (`quote-card-words.ts`). The desk keeps the bar. |
| B-07 | Overview on a touch tablet | 768 · 1024 | Major | The tablet is the desk squeezed: rail 52 + info column 300 + centre 320 + Create strip 72, so the cards are 272 wide at 768 portrait (hence B-06's breaks and the cut Last contact / Response time lines). LEAD STAGES is the **fourth** card, at y 1806 on 768 and y 1473 on 1024 landscape — two screens down — while the phone puts it right under the identity block (REG-377's canvas order). | `t768-tab-01-stages-card.png` · `../shots/t768-03-overview-farah.png` · `scripts/geo.cjs` output | ≤1024 is designed, not squeezed; a tablet held upright follows the phone (Q-01 of both earlier modules) | 768 portrait = the phone's model (identity block + View Client Info sheet, cards one column at full width in the phone's order). 1024 landscape = info column 300 + one column of cards **in the phone's order** (the `order` rules in `overview.module.css` move from the 767 query to 1024). |
| B-08 | Create strip (quick links) on a tablet | 768 · 1024 | Major | Nine unlabelled 24 px glyphs. Each one's hit box is **28×44**: the `.glyphs` list's `overflow-x: hidden` (2 px padding) clips the `::after { inset: -10px }` that should make it 44×44. The names exist only in tooltips, and a finger gets no tooltip, so the wand (AI Visualizer) and the scan (Quote X-Ray) can't be told apart without pressing them. | `../shots/t768-03-overview-olivia.png` · `tab.cjs` output (Task 28×36, the others 28×44) | 44; a tooltip is a pointer's; nothing explained only by a tooltip (REG-273) | On a touch tablet hide the strip on the Overview, as Quotes / Contracts already do at portrait (K4, `quick-links.module.css`), and serve Create from ⋮'s **Create** group, as the phone does (`QuickLinkItems`). If the strip stays in landscape, stop clipping the `::after` and put a 12 px caption under each glyph. |
| B-09 | Move stage window: a completed step | 390 (and up) | Major | A completed log opens as the **form, greyed** — chips, fields and the attachment at disabled contrast, with Edit in the card head and **Cancel** alone in the foot. You can't read the call back at a glance: the value is inside a disabled input. | `m390-ro-01-contacted-readonly.png` | read first, edit second | On ≤1024 a completed log reads as a summary card: "WhatsApp · 27 Aug, 1:45 PM · Callback requested · 1 screenshot", with notes below and **Edit** at the end of the card. The foot says **Close**. |
| B-10 | Contacted step: logging a call | 390 | Major | Thirteen taps, and a screenshot is mandatory: Call chip (1) · Date & Time (3: the sheet, today, Done — the field opens empty; `defaultNow` only supplies the time once a day is picked) · Outcome (2, an anchored list that opens upward over the chips, not a sheet) · Attach (an "Attach files" sheet whose words are "Drop your file or browse", then the OS picker, then "Attach 1 File" at 36 tall) · Save · Suggested tasks › Save. The window demands the screenshot (REG-543 kept it) **but the same contact log on Notes doesn't** ("Attach screenshots of your call attempts" has no `*` there) — one log, two rules. Auto Fill from an exported chat is fast (5 taps, it filled channel, time, outcome and the next meeting), but only if a file exists. | `m390-w2-02-datepicker.png` · `m390-w2-04-outcome.png` · `m390-w2-07-attach.png` · `m390-clog-01.png` · `m390-w4b-03-filled.png` | one thing at a time; a finger never aims; a photo is a document on site; one rule for one thing | Date & Time opens filled with **now** (a "Now · Earlier · Pick" chip row). Outcome becomes `Chips` (five values, one tap). Attach shows **Take a photo · Choose from photos** first (`components/contracts/photo-or-file.tsx`). Ask him one question: is the screenshot mandatory in both places, or in neither? (Q-B1) |
| B-11 | Quote Sent / Won: the quote upload | 390 · 768 | Major | Both quote uploads take PDF only (`accept=".pdf"`). A photo of a signed paper quote is refused with "Choose a PDF — the quote is kept as one", while the **signed contract on the same Won screen** offers Take a photo · Choose a file (C4 P-12). | `m390-w6-03-photo.png` · `m390-w7-01-won.png` | a photo is a document on site (Contracts on the move) | Give Won's "Attach client signed quote" the same `PhotoOrFile` rows (`touchPick`, already in `AttachTabs`): the photo is kept as the copy and the amount is typed, as for an uploaded PDF. Quote Sent can stay PDF (a sent quote is digital) — his call (Q-B2). |
| B-12 | Won: the payment split | 390 | Major | An uploaded quote zeroes the split (REG-149, a decision). On the phone that means four 48×42 % boxes at 14 px, typed one by one. Save is refused with "Milestones must add up to 100%" until you find **Reset to default**. The "0%" badge is 10 px, and "Total S$70,500" shows while 0 % is assigned. | `m390-w8b-03-y500.png` · `m390-w8b-04a-zero-refused.png` | inputs at 16, targets 44, the right default | On touch, open on the studio's default split with one line "10 · 30 · 30 · 30 — the studio’s usual ›", or a chip row of Company › Templates › Payments. Boxes 48 tall at 16; the total line reads "0 of 100% assigned" until it adds up. |
| B-13 | Lost vs On Hold | 390 | Minor | On Hold is a bottom sheet titled "Put on hold"; Lost is a centred card titled "Move stage". Both carry a reason select and fields (P-10 changed only On Hold). | `m390-w9-01-hold.png` · `m390-w9-07-lost-filled.png` | REG-353 (a form is a sheet on a phone); one look for twins | `LostDialog` takes `size="form"` and a title of its own ("Mark as lost"), the same as `OnHoldDialog`. |
| B-14 | On Hold sheet under a snackbar | 390 | Minor | A stage-menu refusal's snackbar ("Assign a member first") stayed on screen across the Duration chips of the On Hold sheet that opened next (snackbar y 711–759 over chips 675–719): the chips' effective box dropped to 36. The chips' words are 12 px. | `m390-w9-01-hold.png` | nothing covers a foot; a sheet lifts the snackbar | `Dialog`'s phone sheet lifts `--snackbar-bottom` the way `Sheet` does (`useSheetFootLift`); a refusal's snackbar is dismissed when the next surface opens. Chip text 14. |
| B-15 | Stacked snackbars | 390 | Minor | Hold then Resume left two snackbars showing at once, each with its own Undo ("Laneb Beta is on hold · Undo" over "Moved to New · Undo"): 112 px over the page, and the older Undo now undoes a hold that is already over. | `m390-w9-05-lost.png` | one snackbar at a time (the house `key`) | The stage moves share one snackbar `key`, so the newest replaces the last. |
| B-16 | Stage sheet's locked rows | 390 | Major | Locked stages are grey with no reason in the row; you hear why only by tapping (the snackbar). Meanwhile the LEAD STAGES card prints "Assign a member first" under four rows and offers no way to assign. On a phone, Assign is three levels deep: View Client Info › Assign Member › tick › Assign. | `../shots/m390-04-stage-olivia.png` · `m390-mx-b0-stages-card.png` · `m390-mx-a2-assign.png` | a refused choice says why in the row (UI sweep house rule) | Locked rows show their reason as the row's meta, at 14. While New has no owner, the sheet's first row is **Assign a member ›**, opening the Assign sheet with its Suggested member, and the card shows the reason once with an **Assign** link. |
| B-17 | The name, twice | 390 | Minor | "Olivia Martinez" appears in the bar (20/700) and again 40 px lower in the identity block (24/700): about 44 px of the first screen is the same words. Both are drawn (mock 1186:2453, REG-359; canvas 2a). | `../shots/m390-03-overview-olivia.png` | one thing once | Fold into the Lead screen's hero (§2): the bar keeps the name, the hero carries stage · days · Call · WhatsApp. |
| B-18 | Maison AI brief on a phone | 390 | Major | The brief and its Show more take about 360 px (310→671), 43 % of the first screen, between the identity block and LEAD STAGES — and the canvas order (REG-377) puts LEAD STAGES there. Its tag is 10 px. The FAB's sheet repeats the same two buttons. | `../shots/m390-03-overview-farah.png` · `m390-mx-e1-maison.png` | one thing at a time; the canvas order | On ≤1024 the brief is one line under the Next line ("Maison AI · Call or WhatsApp within 24h ›"), and its buttons open in the FAB's sheet, which already holds them. |
| B-19 | Empty cards on a phone | 390 | Minor | On Vivien's page the empty Questionnaire card ("No questions yet", about 330 px) and the empty Files card ("Add your first files" with two buttons, about 330 px) take a quarter of a 2713 px page. | `m390-won-vivien.png` | less on a phone; empty states carry their one action (REG-735) | On ≤1024 an empty card is one 56 px row with its one action ("Files · none yet · Take a photo"). |
| B-20 | The tab strip | 390 | Minor | Nine tabs in a sideways strip: four and a half show (Files is cut at 383); Notes & Logs, Meetings, Questionnaire and Activity are off-screen, with no pager on touch. | `../shots/m390-03-overview-olivia.png` · `geo.cjs` (tabs) | everything reachable is findable | On a phone the Overview is the hub: each tab is a folded row on it (§2), and the strip keeps Overview · Tasks · Quotes · Files · More ▾. Lane C owns the tabs' insides. |
| B-21 | Edit details (`?edit=1`) | 390 | Minor | Seventeen fields in one sheet: 1540 px of scroll in a 602 px view (2.6 screens). Foot Cancel / Save are 36 tall. Labels are 12. The edits a designer makes on site (the phone, the address, the budget, the start date) sit among NRIC, Customer ID and the custom fields. | `../shots/m390-07-edit-details.png` · `m390-edit-2.png` | foot 48; Edit as a short section list | `SectionList` (Quotes K1) with Contact · Property · Budget & timing · Client details · Other, each a `SectionScreen` with one Save at 48. |
| B-22 | Attach files sheet (from a log) | 390 | Minor | Foot "Cancel / Attach 1 File" 36 tall; File Type 36; sort 36×36; the words are the desk's ("Drop your file or browse · Supports: JPEG, PNG, PDF"); no camera. | `m390-w2-07-attach.png` · `m390-w2-08-uploaded.png` | 44 / foot 48; a photo is a document on site | Put `PhotoOrFile`'s two rows on top on touch, make the foot 48, and fold the library list under "Your files (n)". |
| B-23 | The window's and its dialogs' feet | 390 | Minor | The Move stage foot is Cancel / Save at 44, right-aligned. The nested Auto Fill and Suggested tasks cards use 36-tall buttons ("Move without tasks" 164×36). The Auto Fill helper is 12 px. | `m390-w4-02-autofill-dialog.png` · `m390-w4-05-suggested.png` | the foot's buttons 48 | The house touch-foot rule (Quotes K5's `dialog.module.css` B-16) on the wizard's foot and the nested dialogs: 48, the filled button last and widest. |
| B-24 | Header pair at 320 | 320 | Major | "Resume at Contacted" is clipped at **both** ends in its 118 px button ("esume at Contacte"), with no ellipsis; "Stage: On Hold" takes 157. | `m320-meiling.png` | nothing runs off the screen; the 320 gate (REG-306) | At ≤360 the primary takes the whole row and Stage ▾ wraps above it, or the label shortens to "Resume" with the stage named in the confirm. |
| B-25 | Client Info sheet → Assign | 390 | Minor | Assign is a sheet stacked on the Client Info sheet (two scrims, two ✕). The sheet's four sections are all open, so Assign sits under "Collaborators" with Owner "--". | `m390-mx-a1-client-info.png` · `m390-mx-a2-assign.png` | one surface at a time | Put Assign in the hero / Next line (B-16). From the Client Info sheet, Assign replaces the sheet rather than stacking. |
| B-26 | Maison AI FAB at rest | 390 | Minor | At scroll 0 the FAB (326,780,48×48) covers the second LEAD STAGES row's right end — its days or "--" and its chevron. The row can still be pressed to the left. | `../shots/m390-03-overview-olivia.png` | a floating button never sits on a row's control | With the sticky foot (B-04) the FAB lifts above the foot. Until then, keep `--fab-clearance` room at the cards' right edge, or slide the FAB away at rest. |

## 2. On the move

**A lead is a person and a pipeline, not a document.** The Quote and Contract screens read a paper. The lead screen reads a person (who, how to
reach them, where they live) and a position (stage, days in it, what is overdue). Its moments are **captures**: a call, a visit, a photo, a move.
They are not sends. Reuse the frame (`QuoteScreen`'s bar · hero · Next line · folds · sticky foot; `ScreenBar`; `SectionList` / `SectionScreen`;
the `next-step.ts` pattern; `PhotoOrFile`; `useSheetFootLift`; `Chips`; `use-long-press`). What differs is the hero's contents, a Next line
built from **stage + the earliest open follow-up task**, and a foot whose second button is usually a capture ("Log ▾").

### The lead's page (Overview) — phone, and a tablet held upright
- **Jobs on site:** call or WhatsApp the client back · see what is overdue and what's next · log the call or the visit at once · move the stage
  after the visit · snap the site photos · assign a colleague · get to the client's address.
- **Today:** the call is a 70×20 link next to two 24 px glyphs (B-03). What's next is the Next follow-up row, 1.3 screens down, at 12 px (B-05).
  The primary scrolls away (B-04). The brief takes 43 % of the first screen (B-18). Photos are three taps into the Files tab. Assign is three
  levels deep (B-16 / B-25).
- **What it should be:**
  1. **Bar 56:** ← · name (16 bold) over "Contacted · 57 days" · ⋮ (Create group · Edit details · Invite to Portal · Return Lead · Copy link · Delete).
  2. **Hero card:** the stage chip + days in stage; "HDB 4-Room · S$68K · Instagram"; the client row = avatar · phone · **Call** · **WhatsApp** (48
     each). The address row opens Directions. Long-press the number to copy it.
  3. **One Next line** (`lib/leads/next-step.ts`, pure, one primary per state):
     - New, no owner → "Assign a member — Alex has room" [Assign]
     - New → "Call or WhatsApp Olivia — new 2 days ago" [Log a contact]
     - Contacted → "Book the meeting · follow-up Thu 10:00 is overdue" [Log the meeting]
     - Met → "Send the quote within 5 days" [Create quote]
     - Quote Sent → "Sent 4 days ago · not opened yet" [Remind]
     - On Hold → "Follow up on 22 Nov" [Resume at X]
     - Lost → "Lost · went with another firm" [Resume at X]
     - Won → [Open project]
     
     Maison AI's advice is one line under it.
  4. **Due now:** at most three overdue or due-today tasks, each with its 44 complete ring.
  5. **Folded rows (56):** Stages (five dots · days in pipeline · response time) · Quotes (n · the latest chip + amount) · Contracts · Files (n ·
     **Take a photo**) · Notes & Logs (the last contact's line) · Meetings · Questionnaire (7 / 11) · Activity. Each one opens its tab. An empty
     one is a single line with its action (B-19).
  6. **Sticky foot 48:** **Log ▾** (Call · WhatsApp · Visit · Note) + the state's primary (Move to Met / Convert to Project / Resume at X). Stage ▾
     stays in the bar for the other stages.
- **Tablet landscape (1024):** two panes. Left (360): the hero, Next, Due now and the folds. Right: the open fold or tab. No Create strip; Create
  lives in ⋮. Desk ≥1025 unchanged.

### Logging a call or a visit (the Contacted / Met steps, and Notes' contact log)
- **Jobs:** "I just called Farah, she wants a callback Thursday" in 10 seconds, one-handed. After the visit: where, when, the photos, the next step.
- **Today:** 13 taps and a mandatory screenshot for a first call (B-10). Ten taps for a visit with one photo. The date is never "now" unless you
  pick it. Completed logs read as greyed forms (B-09). An unowned lead loses the whole log (B-01).
- **What it should be:**
  - A press on **Call** or **WhatsApp** in the hero remembers it. On return to the page (`visibilitychange`), a short sheet asks "How did the
    call with Farah go?" — channel already set, **Now** already set, the five outcomes as chips. "Callback requested" or "Meeting scheduled"
    reveals the date row. **Save log** is the one button: 3 taps. On a lead in New, Save logs it **and** moves the lead to Contacted (the L2
    hand-off `?move=contacted&log=` already exists). The screenshot rule follows his answer to Q-B1, with **Take a photo** first.
  - **Visit** from Log ▾ = Where as chips (In person · Video call · Showroom), Now, **Take photos** (several), a notes box, then **Save & move to
    Met**.
  - Auto Fill stays as the second way ("Fill from a chat or an email"). Inside the window a completed log is a summary card with Edit.

### Moving the stage (the Move stage window)
- **Jobs:** move after the visit; mark On Hold or Lost in a car; convert to a project at the client's table with the signed papers.
- **Today:** a full-screen form with a sideways rail (533 px of tabs in 390, Won off-screen). New assigns only through its checkbox and then
  closes (B-02). The quote upload refuses photos (B-11). Won's split starts at zero (B-12). Lost and On Hold differ in shape (B-13). The feet are
  44 / 36 (B-23).
- **What it should be:** each step is one `SectionScreen`.
  - **Bar:** ← · "Move to Met" · "step 3 of 5" with dots (no tab rail; the completed steps are reached from the Lead screen's Stages fold, as
    summary cards).
  - **Body:** only that step's fields, in the order a finger fills them.
  - **Foot:** one filled **Save & move** at 48. A refusal stays in the foot and nothing is lost.
  - **Won** reads as a checklist:
    - Signed quote: the From-system row "OM-10008 · S$68,176 ✓", or **Take a photo · Choose a file**
    - Signed contract: the same rows
    - Payments: "10 · 30 · 30 · 30 — the studio’s usual ›"
    - Project type as chips
    
    The foot says **Create project**, and the project's page opens with "Project P-… created" (that last part works today: `m390-w8b-04-after.png`).
  - **On Hold / Lost:** the same sheet shape — the reason as chips (the studio's list), the duration chips or the competitor, then **Save & move**
    with Undo.
  - **Tablet:** 768 follows the phone. At 1024 the window stays the centred modal it is today (720–800 wide), which works.

### The dialogs and sheets around the lead (Assign · follow-up · ⋮ · Edit details · Invite to Portal · Maison AI)
- **Assign** is the house sheet with a Suggested member, and that works. Bring it to the surface (Next line, stage sheet) instead of three levels
  down (B-16).
- **Set a follow-up** is a fitting sheet (When + Task). Give it presets ("Tomorrow 10:00 · In 3 days · Next week"), so the date sheet is the
  fallback rather than the only way.
- **⋮** is a 14-row sheet (a Create group of 9, then Edit · Invite · Copy · Delete). Keep the rows at 44, put Create first, and fold "AI Visualizer ·
  Quote X-Ray · 3D Space Planner" under "More tools ›" on a phone.
- **Edit details:** a section list, not one 2.6-screen form (B-21).
- **Invite to Portal:** the Client access panel works as a sheet. Lift its 10–12 px chips and lines to 14 (B-05).
- **Maison AI:** one line on the page, one sheet behind the FAB. The FAB lifts above the sticky foot (B-18 / B-26).

## 3. Measurements (390×844 touch unless said)

- **Page heights (Overview, 390):**
  - Olivia (New) 2457 · Farah (Contacted) 2843 · Gerald (Met) 2926 · Vivien (Quote Sent) 2713
  - Mei Ling (On Hold) 3130 · Muthu (Lost) 3171 · Kelvin 2811 · Benjamin (Won → project) 1681
  - 768: 2081–3375 · 1024: 1840–2730
  - Sideways overflow: none at 390 / 768 / 1024 / 320.
- **First screen at 390 (Farah):** bar + Stage row 0–100 · tabs 100–148 · identity block 148–310 · brief 310–671 · LEAD STAGES from 671 · Next
  follow-up at y ≈ 1054 · MY TASKS 1196 · QUOTES 1532.
- **LEAD STAGES' position:** 390 → y 671 (first screen) · 768 → y 1806 (fourth card) · 1024 → y 1473 (fourth card).
- **Centre width:** 768 → 320 (cards 272) · 1024 → 576 (cards 528) · 390 → cards 358.
- **Type:**
  - Bar name 20/700 · identity name 24/700 · body of the brief 14/400
  - LEAD STAGES stage names 14/500, their meta 12/500 · Last contact / Next follow-up / Response time lines 12
  - Quote stepper 12 · brief tag 10 uppercase · file tile names 10 · Hold chips 12
  - Inputs 14 in Chromium. iOS lifts them to 16 at ≤767 only (`globals.css`, REG-306), so on an iPad at 768–1024 they stay 14.
- **Touch boxes (effective):**
  - Identity block: Call 70×20 · Copy phone 24×24 · WhatsApp 24×24 · email 79×20 · Copy email 24×24 · Open questionnaire 42×44.
  - Every other Overview control ≥ 44 (43 controls walked).
  - Tablet Create strip: 28×44 each (Task 28×36).
  - New step: the member's checkbox 44×44, the rest of its 358×64 row dead.
  - Hold chips 44 tall (36 under the snackbar).
  - Won % boxes 48×42.
  - Feet: Move stage 44 · Edit Lead 36 · Attach files 36 · Suggested tasks 36 · Auto Fill 36.
  - Stage sheet rows 44 · the Assign sheet's rows 64.
- **The window:**
  - Full screen at 390 (390×844), foot at 767–844.
  - Rail 52 tall, 533 px of tabs in 390 (scrolled to the active one).
  - 768 → a 720×681 modal with a 200 rail · 1024 → 800×672.
- **Taps to finish a job (390, measured on the build):**

  | Job | Taps |
  |---|---|
  | First contact, lead owned, manual | 13 (with a screenshot) |
  | First contact with Auto Fill from a chat | 5 |
  | First contact, lead unowned | 13 + the lost log (B-01), or 4 more to assign first |
  | Met with one photo | 10 |
  | Quote Sent with an uploaded PDF + amount | 6 |
  | Won on uploads, signed quote PDF + contract photo + split reset | 9 + typing, one refused Save |
  | On Hold | 5 |
  | Lost | 5 |
  | Resume | 2 |
  | Assign from the Overview | 4 |
  | Call the client | 1 tap on a 70×20 link |

## Questions for Vicky
- **Q-B1** — Is a contact log's screenshot mandatory (the Move stage window today) or optional (Notes today)? *Recommended: optional in both,
  with Take a photo offered first; the log is what matters on the move.*
- **Q-B2** — May a signed quote be a photo at Won, as the signed contract already is? *Recommended: yes, kept as the copy, amount typed.*
- **Q-B3** — Should the phone's lead page become the Lead screen of §2 (hero · Next · Due now · folds · sticky Log + primary), with the tabs
  behind its folds? *Recommended: yes; a tablet held upright follows it, landscape gets the two panes.*
