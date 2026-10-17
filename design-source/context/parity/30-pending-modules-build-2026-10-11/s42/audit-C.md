# S42 audit · C — projects, money and the client — S06 Finance · S07 Projects · S13 Client portal · S23 Meetings · S26 Team and group chats · S39 Studio Health

Auditor C, 2026-10-14. Read-only: server `next start -p 3193` on lane B's built tree, my own copy of `s42/audit-base-2.db`
(`…/e5dd05f7-…/scratchpad/s42/C/audit.db`), View as by `members.is_you`. Shots and scripts are in `…/e5dd05f7-…/scratchpad/s42/C/shots/` and `…/C/js/`
(shot names are given below as `shots/<name>.png`). The page-error log (`…/C/walk.log`) stayed empty apart from one expected 404
(`/my/demo-studio/questions`, the portal's own "This isn't on your page any more" notice). No page scrolled sideways at 390, 768 touch or 320
against `screen.width`.

## Summary — 27 findings (Blocker 0 · Major 3 · Minor 20 · Polish 4)

What's solid: the money rules hold all the way through. A repeating expense logs, stops and comes back with Undo, and its first expense's
removal says what happens. The studio's expense categories rename and remove with Undo, and a taken name is refused under the box.
Recording an overpayment produces a credit note (no GST, its own number, with its receipt, Needs you row and portal line
"Your credit CN-… (S$… left)"). Commission counts the contract money without GST and leaves out the extra. Files' Download opens each money
paper printing, and Back reads "Back to Files", for Dane and for Priya. Accounting's crumb and Back start at Finance. The portal's foot
(Privacy · Contact, only the links set) sits on every page, on the sign-in page and on the unknown-address notice. An unknown address keeps
its own notice and tab title. Company › Client portal's fifth check and the Privacy and terms card refuse a bad address and save with Undo.
The live co-pilot asks for consent and charges 25 credits (balance 11,610 → 11,585). Tips, the checklist, the brief and the receipt all work.
Settings › Meetings and Reports › Meetings gate by role with the right words. In Messages, the room, direct chats, groups, a lead's Team
conversation, Details (Rename · Add people · Take out · Media / Docs / Links) and New message ▾ all work, and C opens New message. Studio
health's figures match Reports › Leads and › Projects on all four ranges, its tiles open the same range, and it is gated for Managers,
Designers and Accounting. Every surface passes the keyboard checks I ran: C opens the page's New ▾, ⌘↵ submits (or shows the errors),
Escape closes. Most findings come from three things: words written for the studio that reach the client, two counts for one thing, and a
few copies of things (a duplicated paper, a premature conversation, a ghost) that drift from what they copy.

## Findings
| ID | Sev | Step | Where (address · role · width) | What happens (steps) | Should (principle # / rule / REG) | Fix (smallest, in 2.0's shape; file:line if known) | Visible? |
|---|---|---|---|---|---|---|---|
| C-01 | Major | S23 | `/meeting/<token>` · the client (signed out) · 1440 / 390 | Kevin Ng › Meetings › New Meeting ▾ › Start a meeting now → tick → Start → type a client line → End → Share the notes → Copy link → open the link. Under "What's next" the client reads the studio's coaching steps: "Ask about the property type & size", "Ask about the decision maker(s)". `shots/s23-client-after-share.png` | S23's rule says the client gets "the summary and the next steps" with nothing private (#11 honest, #3 words for the reader). The steps made from missed checklist items (`brief.ts:81` `Ask about …`) are notes for the designer, not things the client should do | `components/meetings/client/client-notes.ts` `clientNextSteps`: also drop the brief's checklist asks. Better: have `brief.ts` give each action a kind (`ask` · `do`) and keep only `do` for the client | yes |
| C-02 | Major | S23 | Company › Reports › Meetings vs `/meetings` and a lead's Meetings tab · Dane / Hui Min · 1440 | Reports › Meetings, Last 90 days: "MEETINGS HELD 3 · 3 meetings held in range". The meetings list for the same 90 days shows every Met log as a held meeting (Aisha, Gerald, Grace, Vivien, Serena, Harpreet, Rachel, Benjamin, plus Kevin, Kelvin and Nur Aisyah). `shots/s23-reports-meetings-desk.png` · `shots/mtg-dane-desk-_meetings.png` | Two numbers for one thing. S23 decided that "a meeting held IS the Met log", and the lists already count it that way (#11) | `lib/meetings/reports.ts` `fetchMeetingReports`: add each Met log that no meeting holds as a held fact (no score, no co-pilot), using the same rule as `lib/meetings/queries.ts:117`, so "held" means the same thing on both pages. Or, if Vicky prefers (call 1), rename the tile "Meetings written up" | yes |
| C-03 | Major | S07 | a project's Files › Payments · Dane · 1440 / 390 | ⋮ on `INV-2026-003 · Deposit.pdf` › Duplicate → "File duplicated". This makes a second entry with the same name, no bytes and no paper. Opening it shows a blank viewer with a PDF glyph, and `/files/raw/<id>` returns 404. The same ⋮ also offers Move · Rename · Delete on a money paper. Delete warns that it will "remove all project attachments (chat messages, invoices, etc.)". `shots/s07-dup-copy-viewer.png` | A door that goes nowhere: the copy is a dead file (#4, #11). A money paper belongs to its record, the way S03 made Contract & VOs PDFs refuse the trash | For a row with `f.paper` (`lib/leads/file-model.ts`), the ⋮ offers Open · Download · Copy link · Send on WhatsApp · Show to client only (`components/leads/files/lead-files.tsx`). The server's duplicate / rename / trash refuse an entry that `moneyPapersOf` (`lib/leads/files.ts:93`) maps, with `{ error: 'A money paper stays with its invoice — download it instead' }` | yes |
| C-04 | Minor | S23 | `/meetings/<id>` · Dane · 1440 | New Meeting ▾ › Start a meeting now opens the meeting with the chip "ITS TIME HAS PASSED" and offers Send the invitation for a meeting that is starting now. `shots/s23-start-now.png` | The words say the opposite of what just happened (#3). Show only what applies (brief rule 2) | `components/meetings/room/meeting-room.tsx:330`: give a planned meeting an hour's grace (`startsAt + 60 min > now` → "Now"). Hide Send the invitation once its time has come. The table's "Its planned time has passed" (`meetings-table.tsx:53`) gets the same grace | yes |
| C-05 | Minor | S23 | `/meeting/<token>` · the client | The shared summary is the studio's: "Met Kevin in person for a first consultation on Wed, 14 Oct. They talked about the kitchen in their semi-D…" — the client reads about themselves in the third person | Plain words for the reader (#3) | `clientSummary` (`client-notes.ts`): write it for the client ("We met for a first consultation on Wed, 14 Oct. We talked about the kitchen in your semi-D…"). See call 2 | yes |
| C-06 | Minor | S23 | Share the notes dialog · Dane · 1440 | "The mood boards" is ticked and offered for a meeting that has no board. `share_json` stores `boards: true` and the client page draws nothing for it. `shots/s23-share-dialog.png` | Shown only when it applies (brief rule 2) | Offer the tick only when `parseState(m.stateJson).boards.length > 0` | yes |
| C-07 | Minor | S23 | `/meetings`, `/meetings/<id>` · Priya (Accounting) · 1440 / 390 | The gate reads "You don't have access to This page", with "This page" as the page title | Plain words (#3). The gate names the section | `components/shell/access-gate.tsx:34` `SECTIONS`: add `meetings: 'Meetings'` (marketplace and market-insights are missing in the same way — other areas) | yes |
| C-08 | Minor | S06 | Log an expense · Dane · 1440 | Project = BTO 4-Room — Shalini Menon (Completed), Repeats = Every month → Log → "S$120.00 logged — it repeats every month, next on 14 Nov ’26". On that day `raiseDueRepeats` stops it instead (`lib/finance/repeats-server.ts:73`). `shots/s06-shalini-repeat-dialog.png` | A promise the product doesn't keep (#11). Refusals say why (#5) | `app/finance/cost-actions.ts` `saveExpense`: refuse `repeat` when `completedBlock(project.stage, 'money')` ("A handed-over project's costs are closed — log it once"). `expense-dialog` leaves out Repeats for such a project | yes |
| C-09 | Minor | S06 | Settings › Finance › Expense categories › press "Meals" · Dane · 1440 | The note reads "No expense is logged under it yet, and its Xero account." — a broken sentence whenever the count is 0. `shots/s06-cat-rename-dialog.png` | Plain words (#3) | `components/finance/expense-categories-settings.tsx:132`: when the count is 0, "No expense is logged under it yet — a new name carries its Xero account." | yes |
| C-10 | Minor | S06 | Settings › Finance · Germaine (Designer), Priya (Accounting) · 1440 | The categories card's help still says "Press one to rename or move it; a category you remove stays…" to people who can't. The chips keep their pressable border. `shots/s06-cats-germaine-desk.png` | Say what this viewer can do (#5). The read-only look matches the card's other fields | `expense-categories-settings.tsx:110`: show that sentence to managers only, and give readers the read-only chip style | yes |
| C-11 | Minor | S06 | ⌘K · Dane | "expense categories", "categories" and "purchase order paper" find nothing (Trades, Meetings' cards and Privacy and terms are all found) | One home, and doors reach it (brief rule 1). The UX audit's ⌘K covers settings pages | `lib/global-search/model.ts` `PAGES`: add Expense categories (`/settings?section=finance#expense-categories`) and The purchase order paper | yes |
| C-12 | Minor | S06 | Company › Finance › Commission · any runner · 1440 / 390 | The PAID tile says "All time · recorded by an Owner or an Admin". Accounting records payouts too: Priya's To do offers "Pay Germaine" (`payMemberCommission` allows `runsMoney`) | The words match the rule (#3, #11) | `components/finance/books/commissions-view.tsx:227`: "recorded by an Owner, an Admin or Accounting" | yes |
| C-13 | Minor | S26 | `/chat` · Dane · 1440 / 768 / 390 | New message › A member › Hui Min: the composer says "Message Hui", "Write to Hui — only the two of you read it", "Only you and Hui read this". `shots/s26-direct-huimin.png` | A member's name is what the studio calls them. "Hui Min" is one given name (#3) | `components/projects/messages/conversation.tsx:44, 244`: use the member's `name` as stored. Keep `firstOf` for clients | yes |
| C-14 | Minor | S26 | `/chat` · Dane · every width | Pressing New message › A member writes the conversation row at once (`conversations` + `pair_key`). Back out, and an empty "Hui Min · DIRECT · No messages yet" stays at the top of the list, above conversations with new messages. `shots/vp-chat-tab.png` | Lists show what has happened. Nothing half-made is left behind (#4, #11) | `app/chat/actions.ts` `startDirectChat`: open a draft and create the pair on the first send. Or keep a conversation with no line out of the list and sort by its last line | yes |
| C-15 | Minor | S26 (P-G older) | `/chat` · Dane · 1440 / 390 | Opening a conversation keeps the address at `/chat`. After a reload, or Back from Open lead, the page shows "Pick a conversation". A door's `?open=` is consumed, and its `?from=` is kept but no Back uses it | Back returns where you came from (#6) | Keep `?c=<key>` in the address (`router.replace`) when a conversation opens. When `from` is set, the page header draws Back to it | yes |
| C-16 | Minor | S26 (carried) | `/chat` loader · Dane · 1440 | The ghost draws an open conversation (head, three lines, composer). The page shows the "Pick a conversation" card. `shots/g-chat-desk-A-loader.png` vs `shots/chat-dane-desk-_chat.png` | The ghost draws its page (#7, REG-708) | `components/projects/messages/chat-ghost.tsx`: read the address on the client (as `detail-tab-skeleton.tsx` does). With no `open` / `c`, draw the empty card | yes |
| C-17 | Minor | S26 | a group's Details · Germaine (Designer) · 1440 / 390 | Alex's and Michelle's rows offer Take out. Dane's (Owner) row has no action and no reason | Say why in the row (#5) | `conversation-details.tsx`: add a meta line on an Owner's or Admin's row for a Designer: "Only an Owner or an Admin takes out an Owner" | yes |
| C-18 | Minor | S07 / S41b-1 (carried) | `/projects/<Benjamin>/money` loader, fresh browser · Dane · 1440 | The ghost has no Needs you band. The page has three rows and Show 2 more, so it jumps about 250px on reveal. `shots/g-money-desk-A-loader.png` vs `shots/ghost-money-loading.png` | #7, REG-708 / REG-817 | In the remembered-shape ghost, default the band to on (most live projects have one), or remember it per project | yes |
| C-19 | Minor | S23 | lead's Meetings tab, project's Client › Meetings, `/meetings` loaders · Dane · 1440 | Each list ghost draws the Meeting column about 430 wide (the page's is 300), and the lead tab's ghost has no bone for "Briefs to save". In a browser that last saw a planned meeting, the meeting page's ghost draws the Before view, but a held meeting's page is the brief. `shots/g-leadmtg-desk-A-loader.png`, `shots/g-projmtg-desk-A-loader.png`, `shots/g-mtgpage-desk-A-loader.png` vs `…-B-page.png` | #7, REG-708 | Take the ghost's column widths from the table's column defs. Add the second toolbar button bone. Key the meeting ghost's remembered shape by the meeting's status, or default to the brief (most meetings opened are held) | yes |
| C-20 | Minor | S13 / data (carried) | portal home · Benjamin; Reports › Studio health · Dane | Benjamin's floor plan was shown to him on 5 Oct, so the portal's "new for 7 days" row (`NEW_FILE_DAYS`) has expired (this breaks `pj-r4a` and `pj-fix-F`). Studio health's Last 30 days thins as the demo ages (6 of 8 active). `restoreBaseline` (`lib/db/baseline.ts:88–111`) shifts open tasks, planned meetings, deals, articles and share links, but not `lead_files.shown_to_client_at`, update publish times, or the acts Studio health counts | Honest, lasting demo data (#11, REG-341 / REG-343) | In `restoreBaseline`, move the moments recent on the snapshot's day by the same days (`shown_to_client_at`, `project_updates` published / created, …). Add one guarded re-anchor repair (like R111) and keep Activity's times in step | yes (demo data) |
| C-21 | Minor | S39 (+ S39's Members note) | Studio health → press LEADS ADDED · Dane · 1440 | Reports › Leads opens with a back arrow and the crumb "Reports / Company / Reports" — Back names "Reports", not Studio health. S39's note describes the same pattern for "Public profile / Company / Members". `shots/crumb-health-to-leads.png` | Back names where you came from (#6, #3) | `CompanyShell`'s origin crumb (`lib/nav.ts` `fromLabel`): when `from` is a Reports tab, name the tab ("Studio health"). Between sibling Reports tabs, a strip with the remembered range may need no L2 at all (call 3) | yes |
| C-22 | Minor | S07 | portal Money · Benjamin · 390 | The overpayment says "Your credit CN-2026-003 (S$115.06 left)". The older credit note the studio still owes back (CN-2026-002, S$1,090.00 to refund — "Benjamin paid more than INV-2026-004 owes after the credit note" on the studio side) says only "Credit note CN-2026-002". `shots/s13-ben-phone_money.png` | One way of saying "your money, held" (#2, #11) | `components/portal/money/portal-money.tsx`: while a credit note's extra is unrefunded, say "Credit note CN-2026-002 · S$1,090.00 to come back to you" | yes |
| C-23 | Minor | S26 | a lead's info column · Dane · 1440 | Two links read "Messages": Team chat → the Team conversation, and Portal → the client conversation. In the list the same lead appears as "Serena Koh · TEAM" and "Serena Koh · LEAD", and "LEAD" doesn't say it is the client's conversation. `shots/s26-lead-team.png` | Two things need two words (#3) | Label the client one "Client" (the list's chip and the Portal row's link "Client messages"). Keep "Team" | yes |
| C-24 | Polish | S23 | `/meetings/<id>` opened from a lead · Dane · 1440 | The rail lights Tools while the crumb reads "Leads / Kevin Ng /" | One home (a meeting lives on its lead) | Light the rail by `from` (Leads / Projects), with Tools as the fallback | yes |
| C-25 | Polish | S26 | `/chat` empty card · Dane · 1440 | "Its messages open here. A client's reads on their page; a Team, Direct, Group or Studio one is the studio's own — a client never sees it." | Plain words (#3) | "Its messages open here. A client reads theirs on their page; Team, Direct, Group and Studio ones stay in the studio." | yes |
| C-26 | Polish | S26 | group Details · 390 / 1440 | "Add people" is drawn in grey beside the purple "Leave the group" and reads as disabled (it isn't) | One system (#2) | Use the house secondary button's text colour | yes |
| C-27 | Polish | S06 (older piece) | Money out › Expenses loader · Dane · 1440 | The ghost has no bone for the header's "Reports ›" link, and its rows leave the Project and Paid on columns empty | #7, REG-708 | `money-out` ghost: add the header link bone, and draw the expenses kind's columns when `?kind=expenses` | yes |

## Carried notes — each S42 note in my area: confirmed (→ finding ID) or closed (why)
- **S26 — the Messages ghost draws an open conversation** → confirmed, **C-16**.
- **S41b-1 — the project Money ghost's Needs you band in a fresh browser** → confirmed, **C-18**.
- **steps.md (S30's run) — the demo's recent moments age** (Benjamin's floor plan, `NEW_FILE_DAYS`) → confirmed, **C-20**. `shown_to_client_at`
  is 2026-10-05 in the audit base, and `restoreBaseline` doesn't shift it.
- **S39 — Studio health's Last 30 days thins as the demo ages** → confirmed (6 of 8 active on Last 30 days), folded into **C-20** (same
  restore rule).
- **S39 — the Members crumb from a profile ("Public profile / Company / Members")** → confirmed by its twin, **C-21**. I saw "Reports / Company
  / Reports" myself; I didn't reproduce the profile route's crumb (its link took me to Members without a `from`).
- **S07 — the phone header's long label** → closed: REG-1763 holds. The meeting page at 390 / 320 ends "First consultation with Ke…".
- **S13 — the foot on the other client links** → not a finding. It is already an open call for Vicky.
- **S34 — the bell's "due in 30 minutes" row reads "Due tomorrow"** → outside area C (notifications). Not checked.
- **steps.md (S17) — a ghost's tab strip doesn't scroll to the open tab on a phone** → not checked in my area's loaders at 390 (the pages'
  strips do scroll to the open tab: Finance › Money out and Commission at 390).

## Calls for Vicky
1. **What "a meeting held" counts on Reports › Meetings (C-02).** Recommendation: count every Met log as a held meeting (S23's own rule; the
   lists already do), with the co-pilot and score figures reading "n of m with the co-pilot". The other option is to rename the tile "Meetings
   written up".
2. **The client's meeting notes in the client's voice (C-01, C-05).** Recommendation: the link carries only the summary rewritten to "we /
   your" and the steps the studio will do for the client (prepare the quote, send the summary). Never the designer's checklist asks.
3. **Crossing between Reports tabs from Studio health (C-21).** Recommendation: a tile opens the other tab on the same range without an L2
   header (it is the same page's strip), so there is no "Reports / Company / Reports" crumb. Back from there isn't needed because the strip is
   one press.
4. **Money papers in Files (C-03).** Recommendation: a money paper's entry offers Open · Download · Copy link · Send on WhatsApp · Show to
   client only — no Duplicate, Rename, Move or Delete — as S03 did for kept contract PDFs.
5. **Naming a lead's two conversations (C-23).** Recommendation: the client conversation's chip "Client" (not "Lead"), and the
   Portal row's link "Client messages".

## Walked — surfaces × role × width
- **Company › Finance** — To do, Money in, Money out (Purchase orders, Expenses), Vendors, Commission, Xero: Dane 1440; To do / Expenses /
  Commission at 390, To do at 768 touch and 320. Log an expense (validation, ⌘↵, Tab, Escape), a repeating expense (log → Stop repeating →
  Undo → Remove → Undo), the repeat panel ("This repeat"): Dane. Priya: To do ("Waiting for approval", Submit), Money out New ▾ (Purchase order
  offered), Vendors, Commission. Germaine: Money out › Expenses (her own and her projects'). Where costs go (Ryan): Dane.
- **Settings › Finance** (expense categories: add a duplicate → refused, rename dialog, remove → Undo; PO paper acceptance on): Dane 1440 / 390,
  Germaine and Priya 1440 (read-only), 320 spot.
- **A project (Benjamin, P-2026-002)** — every tab and view (Overview · Tasks · Compliance · Schedule · Updates · Messages · Tickets · Meetings ·
  Questionnaire · Choices · Floor plan · Designs · Money · Files · Notes & Logs · Activity): Dane 1440 and 390. Money at 768 / 320. Money:
  Record a payment above what is owed → CN-2026-003, Needs you, receipts. Files › Payments: Download on CN-2026-002 and RCT-2026-004 (Priya
  1440, Dane 390), Duplicate and Delete on a paper (Dane 1440). Priya on Money, Files, Schedule (gate with "Open Money"), the Overview (→
  Money), crumb "Finance /". Loader vs page for Money and Client › Meetings.
- **3D layouts that followed the lead** — Vivien Lee's lead › 3D Space Planner → "Plan the space in 3D" (the lead's own dialog): Dane 1440. I
  didn't start a layout or open the editor (WebGL, kept off this machine). The carry at Won I took from S07's probe.
- **Client portal** `/my/demo-studio` as Benjamin — sign-in, Home, Schedule, Updates, Money (credit line), Choices, Designs, Files, Floor plan,
  Messages, Issues, About / Team: 1440 and 390, Home / Money / Messages / About at 320. Kevin (a lead, invited) at 1440. A number the studio
  never added (refused with the reason). An unknown address (`/my/someone-else`, `/p/abc`, `/team`, `/login`). Company › Client portal's
  Privacy and terms card (bad link refused → saved → "4 of 5 done") as Dane. Team faces: the demo has no member photos, so only the tints were
  seen.
- **Meetings** — Kevin Ng's Meetings tab (Dane 1440 / 390; James, Germaine, Hui Min 1440; Priya → gate). Kelvin Goh's (a Hangout lead in New).
  Benjamin's Client › Meetings (Dane 1440 / 390). Tools › Meeting Copilot `/meetings` (Dane 1440 / 390 / 768 / 320; James, Germaine, Hui Min;
  Priya → C-07). The meeting page: a held one (all roles at 1440, Dane 390 / 768 / 320); one started now (Start without the tick → refused;
  tick → Start → the room, tips, credits → End → brief → Share the notes → Copy link). `/meeting/<token>` signed out at 1440, 390 and 320,
  before and after sharing. Settings › Meetings (Dane / Hui Min edit; James / Germaine read; Priya → Finance). Reports › Meetings (Dane / Hui
  Min; James, Germaine and Priya → gate). C on `/meetings` and the lead tab. ⌘K "first consultation", "objection", "competitor", "meetings
  settings".
- **Messages** `/chat` — Dane 1440 / 768 / 390, Germaine 1440 / 390, Hui Min 1440, Priya → gate. New message ▾ (A member › Hui Min; A new group
  → errors; Escape), the studio room, a direct chat, Site team's Details (Rename, Add people, Take out as Dane and Germaine), Serena Koh's Team
  conversation from the lead's Collaborators › Team chat and Back, the phone's Details sheet and Rename dialog. ⌘K "site team", "Hui Min". The
  loader vs page.
- **Company › Reports › Studio health** — Dane 1440 / 390 / 320 / 768 on all four ranges, figures against Reports › Leads and › Projects, the
  Leads added tile's door (C-21), ⌘K "studio health"; Hui Min sees it; James, Germaine and Priya get the gate.
- **Not walked:** the planner editor (a lead's new layout) and Won's carry, Upload a recording / Write up a meeting, Plan a meeting's invitation
  on WhatsApp, the client's "I'll be there" and the bell, a Designer's repeating expense waiting for approval (time passing), Xero's mapping
  rows for a new category, Use on / Record the refund for the new credit (all were in their steps' probes). Dark mode (parked).
