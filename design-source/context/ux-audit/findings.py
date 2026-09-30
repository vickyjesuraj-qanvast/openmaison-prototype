# The UX audit's findings, one record each — the source for the report page (JSON) and the repo's markdown.
# area: L leads · T lead tabs + Tasks · Q quotes · C contracts + signing + X-Ray · S studio setup · V shell + Visualizer
# theme: flow (the deal doesn't move with its documents) · queue (what needs me) · broken · honest (actions that claim more / less)
#        · find (where things live) · client (client-facing pages) · follow (the next step after an action) · field (touch, iPad, meetings)
# sev: blocker · major · minor ; effort: S · M · L

F = []
def f(id, area, theme, sev, title, what, fix, effort, reg='', shot=''):
    F.append(dict(id=id, area=area, theme=theme, sev=sev, title=title, what=what, fix=fix, effort=effort, reg=reg, shot=shot))

# ── Studio setup (S) ───────────────────────────────────────────────────────────────────────────────────────────────
f('S1','S','broken','blocker','A template’s Bank details block prints an internal to-do on the client’s quote',
  'With no bank details on the issuing entity, the printed page reads “Payment details — No bank details for Demo Studio Pte Ltd yet — add them in Company › Profile.” The same renderer draws the client’s confirm and sign pages, and Preview’s readiness list doesn’t catch it.',
  'Print nothing outside the editor (the hint only while editing), and add a readiness line “No bank details for {entity}” with a link to Profile.','S', shot='c5/r-bank-preview.png')
f('S2','S','broken','major','Unsaved edits vanish when you move to another page',
  'Typing bank details on Profile, then pressing the Brand kit card, navigates with no prompt and nothing is saved; the Brand kit’s accent colour is lost the same way. Only closing the tab is guarded.',
  'A route-change guard on the Company and Settings forms: ConfirmDialog “Save · Discard · Keep editing”.','M', shot='c5/h-profile-leave.png')
f('S3','S','find','major','“Where do I change X?” has no answer',
  '⌘K finds nothing for GST, PayNow, validity, quote number, payment schedule, lost reason, signature or who sees leads. Help text names paths (“set under Company › Members”) as plain words, never links. GST alone lives in four places.',
  'Add every Settings and Company card to search’s Go to pages with deep links; turn every “set under …” into a link.','S–M', reg='REG-645 (the split) · REG-709 (search scope)', shot='c5/n-search-gst.png')
f('S4','S','find','major','A new quote’s defaults hide in each template’s third tab',
  'Validity, the default payment split, default T&Cs, GST on and starting sections live only in Template › New quotes. Settings has a card titled “Payment schedule” that only holds the Owner/Admin lock — the obvious place is a decoy.',
  'A read-only “New quotes start with” card in Settings (the default template’s defaults) with “Change in {template} › New quotes”; rename the lock card “Who may change the payment schedule”.','S', reg='REG-578…583', shot='c5/d-set-quotes.png')
f('S5','S','follow','major','Plan & AI credits opens on Usage, which has no way to buy',
  '“Runs out ~date — top up or pick Fast” is plain text; the only button is Export. Buying lives on the other tab or the rail slot.',
  'For the Owner, “Buy 1,000 AI credits · S$20” and “See plans” in the pace tile when the level is low.','S', reg='REG-704', shot='c5/d-plan.png')
f('S6','S','follow','major','Adding a designer ends at a snackbar',
  '“Priya Nair added as a Designer” says nothing about how she gets in; the row lands mid-list unmarked with Reports to: Nobody. Reports to, preferences, Who sees leads and her AI amount are four separate hunts; the email helper reads “what {prepared_by_email} prints”.',
  'Reports to in the dialog for Designers; the helper in plain words; scroll to and pulse the new row; the snackbar offers “Set who they report to”; a link to Who sees leads.','S–M', reg='REG-646', shot='c5/g-member-added-bottom.png')
f('S7','S','follow','major','A price-list import can’t be undone or found',
  '“3 items added” has no Undo (bulk edit and delete have one); the new rows sort in among the old; every row without a Kind became Purchase.',
  'Undo on the snackbar, a “Show them” action, and a default Kind at the mapping step.','M', shot='c5/l-import-3.png')
f('S8','S','field','minor','The Price book opens as picture cards',
  'Each item is mostly an empty 220px well — about five on a screen; a 300-line list is ~60 screens.',
  'Default My Items to the list view (the listing’s table model).','S', shot='c5/d-pb-items.png')
f('S9','S','find','minor','The untouched-lead delay lives under Notifications',
  '“Raise an untouched lead after 30 minutes” is a response rule, found below 30 notification rows.',
  'Move it to Lead management, or link it from there.','S', shot='c5/o-notif-followups.png')
f('S10','S','honest','minor','Chips cut names at desktop width',
  '“Default: 1…” (a split whose name is its percentages), “Default Quote P…”. Only phones get the wrap rule.',
  'The same wrap at every width.','S', shot='c5/d-tpl-payments.png')
f('S11','S','find','minor','A designer’s signature is set only inside a quote',
  'Members shows nothing about it; search can’t find it. Preview’s readiness does catch a missing one.',
  'A “Signature: not set” line on the member’s row, linking to where it is set.','S', reg='REG-421', shot='')
f('S12','S','queue','minor','In a full library the status pill outshouts New',
  'New ▾ is still outlined once a library has entries, and the tinted “1 awaiting approval” pill is the loudest thing in the bar. After Connect Gmail the snackbar covers Sync now.',
  'Keep the to-do chip, and weigh whether New stays outlined once REG-735’s first run has passed.','S', shot='c5/d-tpl-quotes.png')

# ── Quotes (Q) ─────────────────────────────────────────────────────────────────────────────────────────────────────
f('Q1','Q','flow','major','Sending or confirming a quote leaves the lead where it was',
  'Found by both the Quotes and the Leads audits. Gerald’s quote went out and the client confirmed it; the lead still says Met and Maison AI still says “send the quote”. Convert to Project answers “Complete Quote Sent first” with no way on. The other way round, moving to Quote Sent with a system quote doesn’t mark that quote sent.',
  'When a quote is sent or confirmed on a lead before Quote Sent, the snackbar offers “Move to Quote Sent” (the Move stage window, quote pre-picked); Convert’s refusal carries the same action; a Quote Sent move stamps its system quote Sent to Client.','M', reg='REG-469 (Convert only)', shot='c3/60-convert-locked.png')
f('Q2','Q','honest','major','Preview’s main button, “Mark as sent”, sends nothing',
  'Preview is where people finish checking. Its filled button only changes the status (a designer’s becomes Sent for Approval under a “Mark as sent” label); no link or WhatsApp goes out — only the tooltip says so.',
  'Preview’s main button is the editor’s Send ▾; “Mark as sent” moves into that menu as “Sent it another way”.','S', reg='REG-657', shot='c3/22-preview.png')
f('Q3','Q','honest','major','A row’s status menu skips approval, sending and the bell',
  'One tap moves a Draft to Sent to Client, Confirmed or Signed — no readiness, no confirm, no Undo; a Designer can pick Sent to Client past approval. Sent for Approval from this menu notifies no approver.',
  'Sent for Approval goes through the real send (approvers told); Sent to Client · Confirmed · Signed ask first (“Nothing reaches the client — mark it anyway?”) and offer Undo; with approval required, non-approvers can’t pick Sent to Client before Approved.','M', reg='REG-176 · REG-590', shot='c3/04-quotes-status-menu.png')
f('Q4','Q','queue','major','Owners have no list of quotes waiting for their approval',
  'The rail counts templates, price-book proposals and credit asks — not quotes. Tools › Quotes has no “waiting for me” view; the bell is the only signal (and Q3 bypasses it).',
  'A to-do chip “Waiting for my approval · n” on the Quotes lists (REG-666’s attention chips) and a count on the Tools rail item.','S–M', shot='c3/42-editor-waiting-approval.png')
f('Q5','Q','queue','major','“Waiting on the client” and “expiring this week” can’t be answered',
  'No Valid until column, filter or sort; Due is a follow-up date nobody set; three quotes expired 9–16 Sep unflagged. The SENT column shows the date it went for approval, not to the client.',
  'A Valid until column and filter; quick filters “Waiting on client” and “Expiring this week”; SENT reads the date it went to the client.','M', shot='c3/43-quotes-filtered-sent.png')
f('Q6','Q','client','major','The client’s confirmation page on a phone: a shrunk A4 and no way to ask for a change',
  'At 390 the quote is an A4 page with ~4px text under a Confirm card — the only action. Change requests go to WhatsApp and never reach the record.',
  'Below 767 the lines as reading cards (REG-597’s phone cards) with “View as printed”; a secondary “Ask for a change” that messages the designer with the quote number and tells the studio.','M', reg='REG-587', shot='c3/29-confirm-page-phone.png')
f('Q7','Q','find','minor','Price book picks land outside the template’s sections; three names for one modal',
  'Ticked items land at the end, outside the template’s six trade sections; the editor keeps S$0 empty sections. Create ▾ › “From My Items” focuses the type-ahead, while “My Items” and “Price book” open the modal.',
  'Place each pick in the section of its category (or “Add into: [section ▾]” in the modal’s foot); one name, Price book, everywhere.','M', reg='REG-662', shot='c3/17-after-price-book-add.png')
f('Q8','Q','honest','minor','Template tiles show lines the new quote doesn’t get',
  'The 4-Room BTO tile shows 13 priced lines; the quote it makes starts at Items (0), S$0.00.',
  'Put the Template card’s “Starts with Hacking · Masonry…” line on the tile.','S', reg='REG-485 · REG-489', shot='c3/11-create-quote-template.png')
f('Q9','Q','follow','minor','“Send for signature” opens a picker with nothing picked',
  'Two folders, no template, a disabled Use template; the quick way (the studio agreement) is the outlined button.',
  'Open on the studio’s default template, pre-selected, beside the folders.','S', reg='REG-663', shot='c3/40-send-for-signature.png')
f('Q10','Q','follow','minor','A revision doesn’t record what the client asked for',
  'Revise has no reason field (the action accepts one); Version History says “2 changed” but the Items table marks nothing; the resend’s message is the same as v1’s.',
  'An optional “Client’s request” in Revise; tint the changed rows; the message says “revised quote (version 2)”.','S', shot='c3/30-revise-dialog.png')
f('Q11','Q','follow','minor','Sending a quote sets no follow-up',
  'Due stays empty and no task is raised, although Maison AI prescribes “check in on day 3”.',
  'A “Follow up in [3 days ▾]” chip in the send dialog — it sets Due, which already raises the follow-up task (REG-470).','S', shot='c3/23-send-confirmation-dialog.png')
f('Q12','Q','honest','minor','“From Scratch” and “From Template” open the same modal',
  'Both buttons on the Quotes tab’s empty card open Create Quote.',
  'From Scratch makes a blank quote at once.','S', reg='REG-412', shot='c3/10-lead-quotes-empty.png')

# ── Contracts, signing, X-Ray (C) ──────────────────────────────────────────────────────────────────────────────────
f('C1','C','flow','major','A signed contract leaves the deal where it was',
  'Harpreet signed; her quote became Signed but the lead stayed in Quote Sent with Maison AI saying “check in on day 3”. The signed contract keeps a greyed Send as its main button; the bell only opens the Contracts tab. A bundle was signed on a lead still in New.',
  'A “Move to Won” button on the signed banner and the signed notification (the Move stage window at Won, this contract picked, REG-469’s path); the dead Send becomes “Download signed copy”.','M', reg='REG-469 (Won stays a person’s move)', shot='c4/21-lead-overview-after-signed.png')
f('C2','C','flow','major','A contract can get a Draft quote signed that nobody approved',
  'Olivia’s OM-10001 was a Draft; her contract named it, went out and was signed — and the quote became Signed. The send checks never look at the quote’s status.',
  'A readiness issue “OM-10001 is still a Draft — approve and send it first”, shown in Before it goes (and blocking under required approval); the quote’s status in the meta row.','S', reg='REG-624', shot='c4/14-after-send.png')
f('C3','C','client','major','Send together on a phone: nothing to press at the end of a document',
  'At each document’s foot there is no next step; Continue sits ~4,000px up and swaps documents without a cue. The single signing page fixed exactly this (REG-660); the bundle page didn’t get it.',
  'Reuse the signing page’s sticky next bar: “Document 1 of 2 read · Next document”, then “Continue to sign”.','S', shot='c4/53-bundle-bottom.png')
f('C4','C','broken','major','The studio’s own Variation Order template can’t be sent',
  'It carries a Client initial but no Client signature; Send refuses “There’s no Client signature field”. Send together is greyed with “needs two documents ready to go” without naming the one that isn’t.',
  'Repair the seed (a Client signature); the template editor warns when there is nowhere to sign; the greyed row names the blocker.','S', shot='c4/39-variation-send-blocked.png')
f('C5','C','queue','major','“Waiting for signature” takes five presses and says nothing of how long',
  'Tools › Contracts → Filters → Status → Sent to Client → Done. Rows don’t say whether the client opened it (viewed_at exists) or how long it has waited; no reminder action.',
  'A to-do chip “Awaiting signature (n)”; “Sent 3d ago · not opened” under the status; “Send a reminder” in the row menu, reusing the Send dialog.','M', shot='c4/30-contracts-sent-filtered.png')
f('C6','C','follow','minor','Contract from a quote: the picker opens on folders with nothing picked',
  '“Send ▾ › Send for signature” and “Create contract from this quote” open the same picker: two folders, no templates, Use template off. The Quotes tab’s row menu has no contract action.',
  'Pre-select the only (or last-used) agreement and list templates first, folders after; “Create contract” in the quote row menu; the empty state names the quote it will use.','S–M', reg='REG-632', shot='c4/06-contract-picker.png')
f('C7','C','honest','minor','The editor shows placeholders, not values',
  'Chips read Client name, Property address, Quote total; hovering shows nothing. The values appear only in Preview.',
  'A tooltip on each chip with its “Prints as” value, or a Show values toggle.','S', shot='c4/08-contract-editor.png')
f('C8','C','honest','minor','The copy-link icon quietly sends a Draft',
  'Copying the signing link on a Draft flips it to Sent to Client and tells Owners, Admins and the lead’s members — even when the copy itself failed.',
  'The tooltip says “Copy link — marks it Sent”; the status moves only when the copy succeeds.','S', reg='REG-631', shot='c4/27-copy-link-draft.png')
f('C9','C','find','minor','“Mark as signed” hides in the status pill',
  'The only way in is Draft ▾ → Signed (a good dialog). Neither kebab offers it; Import › already signed does something else (a second contract).',
  '“Mark as signed…” in the editor and row kebabs, and “Signed in person? Mark as signed” in the Send dialog’s foot.','S', shot='c4/24-mark-signed-dialog.png')
f('C10','C','client','minor','The client sees names that don’t match',
  'A lead’s first variation is titled “Variation Order 2”; seeded contracts are “General Contract Agreement” while the paper reads “Interior Design Service Agreement”.',
  'Number against the same base title only; repair the seeded titles.','S', shot='c4/51-bundle-phone-top.png')
f('C11','C','honest','minor','X-Ray’s “Yours” figure disagrees with the quote',
  'Setup shows OM-10007 at S$88,704.75; the result’s YOURS tile reads S$81.4K (line totals before GST and discounts) — only the fine print says so.',
  'A caption on the tile: “line totals, before GST”.','S', shot='c4/44-xray-result.png')
f('C12','C','honest','minor','Two WhatsApp dialogs, two behaviours',
  'The contract dialog shows and edits the client’s name and phone; X-Ray’s shows no recipient yet opens a number, says “copy it into your WhatsApp chat”, and offers no follow-up after. “Reset to draft” reads like returning the contract to Draft.',
  'X-Ray takes the contract dialog’s recipient fields; a snackbar “Add a follow-up” after; rename the link “Reset message”.','S', shot='c4/46-xray-send-dialog.png')

# ── A lead's tabs + Tasks (T) ──────────────────────────────────────────────────────────────────────────────────────
f('T1','T','broken','blocker','Attaching a photo to a contact log or a task fails',
  'In Attach files the picked photo shows a stand-in tile, unticked. Once attached, the contact log’s Save fails every time (“Couldn’t save the contact log”) and a task answers “Couldn’t attach the files”; the photo never reaches Files. The upload handler in both tabs is still REG-149’s empty stand-in.',
  'Send the file through the Files tab’s upload (REG-684), hand back its real id, tick it; show attachments in the draft.','M', shot='c2/n11-after-save.png')
f('T2','T','field','major','Files upload one at a time',
  'The Files picker and the attach modal take one file; nothing can be dropped on the grid. Twenty site photos are twenty picks.',
  'Several files per pick and drops on the grid (the toast already reads “Uploading n files”).','M', shot='c2/n08-attach-modal.png')
f('T3','T','follow','major','A site visit has no home, and saving a log leads nowhere',
  'The Met stage’s meeting log never shows under All Notes & Logs; an in-person visit still asks for “screenshots of your call attempts”. After Save only “Contact log saved” — Add tasks appears only with a schedule, offering one canned suggestion.',
  'Show Met’s meeting logs read-only beside Contacted’s; word the attach label by channel; “Add tasks” on the save snackbar, opening the Tasks add row with the lead’s members.','M', reg='REG-265 · REG-337', shot='c2/n18-add-tasks-dialog.png')
f('T4','T','queue','major','New tasks belong to nobody',
  'Tasks from the add row have no members and no date — most open tasks read “Assign”, Dane’s My Tasks holds 2. A log’s reminder does assign the lead’s members (REG-608), so the two paths differ.',
  'The add row pre-fills the lead’s members (removable); an “Unassigned · n” to-do chip on /tasks.','S', shot='c2/d01-my-tasks.png')
f('T5','T','queue','major','The rail’s red “7” leads nowhere',
  'It counts the studio’s overdue tasks whoever looks; /tasks opens on All Tasks with no Overdue view; the bell lists a different five.',
  'The badge is the viewer’s own overdue count and lands on My Tasks filtered to overdue; “Overdue · n” and “Due today” to-do chips.','S–M', reg='REG-466', shot='c2/p01-scope-menu.png')
f('T6','T','honest','minor','Clicking a task’s title renames it',
  'A designer who wants the details lands in a text field; the panel opens only from the cell’s empty part or the hover Edit.',
  'A title click opens the panel; rename there or on double-click.','S', reg='REG-472', shot='c2/d02-title-click.png')
f('T7','T','follow','minor','Completing a task has no Undo',
  '“Task completed” with no Undo, and the row jumps away; the tick sits beside the selection box.',
  'Undo on the snackbar (useRunUndo).','S', shot='c2/d04-completed.png')
f('T8','T','follow','major','Comments are silent',
  'No notification for a task or file comment, no @mentions; the panel’s comment icon has no count; file comments are one line with no Submit.',
  'Comment events for the task’s members and the lead’s team; a count on the icon; the task composer for file comments.','M', shot='c2/d08-comments-panel.png')
f('T9','T','honest','major','Files: Filters is “Coming soon”, and a file can’t be shared',
  'The Filters button (tooltip, shortcut) answers “Coming soon”. Neither the viewer nor the tile menu offers WhatsApp or Copy link — a drawing goes back to the client by Download and a manual message.',
  'Type · Owner · Updated filters on the Tasks filter panes, or hide the button; a share link modelled on the renders link.','M–L', reg='REG-183', shot='c2/f03-files-filters.png')
f('T10','T','broken','major','Activity credits “You” for other people’s task work',
  'Task lines always read “You completed/updated the task” — tasks don’t record who changed them; there are no filters by person or kind and no studio-wide activity.',
  'Log task events with the actor in lead_events (REG-613’s pattern); Chips above the timeline (All · Tasks · Files · Notes · Stage).','M', reg='REG-191 · REG-245', shot='')
f('T11','T','follow','minor','The Tasks bulk bar can’t assign or complete',
  'Only Save as Template · Duplicate · Delete; the listing’s bulk bar gained Assign (REG-610).',
  'Assign (the Assign popover) and Mark as completed.','S', shot='c2/d10-bulk-bar.png')
f('T12','T','client','minor','Ask Client doesn’t say what it asks',
  'The dialog doesn’t list the 4 unanswered questions; afterwards cards still read “Answer”; “Client asked on 30 Sep” overflows the summary card.',
  'List the questions with ticks; an “Asked · date” chip on each card.','S–M', reg='REG-246', shot='c2/q02-ask-client.png')

# ── Shell + Visualizer (V) ─────────────────────────────────────────────────────────────────────────────────────────
f('V1','V','follow','major','The client’s note can’t be read in the editor',
  'The client’s note shows only in the bell and the lead’s Activity; the bell opens the editor, where the version tile has only a count badge.',
  'A “From the client” list on the version (the pin card’s look, with a reply), opened by the badge and the bell’s deep link.','M', shot='c6/g03-studio-editor-feedback.png')
f('V2','V','flow','major','The welcome’s upload makes a design that can never join a lead',
  '“Upload a room photo” (REG-736) makes a personal design; nothing offers “Link to a lead”, so no Save to Files, no Add to a quote, and client feedback never reaches the lead.',
  '“Link to a lead…” in Design options and the card menu (the lead picker), or ask “For which lead? · Just exploring” when the upload lands.','M', reg='new with REG-736', shot='c6/e20-ipad-design-options.png')
f('V3','V','queue','major','On a phone no counts show anywhere',
  'The top bar’s bell has no badge; More has no dot; the More sheet lists Tasks and Company without their counts.',
  'The rail’s badge on the bar’s bell, a dot on More, counts on the sheet rows.','S', shot='c6/i01-phone-leads.png')
f('V4','V','field','major','“Share with client” is a grey unlabelled glyph on iPad and phone',
  'The step that ends the meeting is a bare paper plane at ≤1024 that reads as disabled; after Generate the snackbar offers Compare, never Share.',
  'A filled “Share” label at ≤1024; Share on the fresh version’s menu and after Compare.','S', shot='c6/e17-ipad-generated.png')
f('V5','V','field','major','An upload is marked roughly, and the warning is out of sight on iPad',
  'A real photo gets Walls and Floor only; the walls wash covers the ceiling. On iPad a tap jumps into the surface, so “Marked roughly… draw a surface” never shows; picks vanish from the stage as you move on.',
  'The note inside each surface’s panel with Draw a surface beside it; every waiting pick washed on the stage before Generate.','M', shot='c6/e14-ipad-floor-picked.png')
f('V6','V','honest','major','Dead ends dressed as destinations',
  'Dashboard, Projects, Marketplace and Chat answer “Coming soon”, as do two of the phone dock’s five slots (the first included) and five of Tools’ nine tiles, unmarked. The Company panel marks its “Soon” items — the panels drifted.',
  'The Company panel’s Soon chip on Tools tiles, and “· coming soon” in dead items’ tooltips.','S', reg='REG-298 · REG-422', shot='c6/a02-tools.png')
f('V7','V','find','minor','Nothing on the rail lights up on Tools pages',
  'On /quotes, /contracts, /quote-x-ray and /visualizer no rail item is active — a new member can’t tell where they are.',
  'Light Tools on those routes, as Company lights on /company/*.','S', shot='c6/a05-quotes-rail-expanded.png')
f('V8','V','queue','minor','The bell’s count never clears; overdue tasks counted twice',
  'Overdue rows say only “Due”; after Mark all as read the badge still shows 8; the Tasks badge counts the same tasks.',
  '“Due 28 Sep · 2 days late”; due rows in their own group, out of the unread count.','S', reg='sweep S4 #8', shot='c6/c08-bell-after-markall.png')
f('V9','V','find','minor','Search finds records but can’t create',
  '“new lead” returns nothing; “add lead” returns Task templates; “overdue” nothing.',
  'A Create group under Go to (New lead · Create quote · New task · New design) from the keys registry; titles before blurbs.','M', shot='c6/b05-search-add-lead.png')
f('V10','V','client','minor','The client’s render link names things differently',
  'The client sees “Design 1” where the studio sees V1; the title uses the room’s internal name (“A design idea for your Original”); the favourite snackbar covers the note’s Send.',
  'The studio’s V number beside Design 1; the design or lead name in the title; the snackbar above an open note.','S', shot='c6/f01-client-link.png')
f('V11','V','follow','minor','Bell links stop one click short',
  'A price-book proposal opens the My Items grid, not the item.',
  '?open= on the link (REG-709 supports it).','S', shot='c6/c07-bell-proposal-dest.png')
f('V12','V','honest','minor','Maison AI promises more than it does',
  'The most eye-catching control on every page; every suggestion answers “Coming soon”; in the editor at ≤1024 it covers the versions strip.',
  'Move it clear of the strip in the editor; weigh how loud it should be while it can’t answer.','S', reg='REG-507', shot='c6/k02-ipad-editor-maison-ai.png')

# ── Leads (L) ──────────────────────────────────────────────────────────────────────────────────────────────────────
f('L1','L','broken','blocker','Parking a lead lets it jump straight to Won',
  'Tan Wei Ming went On Hold from Met with only a S$0 Draft quote. Convert to Project lost its lock; it asked “Resume at Won?” and moved the lead to Won at once — no Won step ran, Quote Sent was ticked, the brief said “Signed and won”. Resuming at Quote Sent skips the approved-quote rule the same way, so On Hold is a way round every mandatory field.',
  'After the Resume confirm, a resume to Quote Sent or Won opens the Move stage window at that step; Convert stays locked while the lead is parked.','S', reg='REG-132 (resume anywhere) — skipping the step is not part of it', shot='c1/48-resume-won.png')
f('L2','L','flow','major','Two ways to log a first call, two different rules',
  'Through the stage pill the call-attempt screenshot is required (no asterisk; the error shows below the fold after Save). The Create strip’s Contact Log saves the same log without a file and the lead stays in New — the brief says “No contact yet” while Last contact reads “Call · Connected”.',
  'After a contact log on a New lead, the snackbar offers “Move to Contacted” (the window, this log filled in); mark Attach as required, or let a Call skip it.','M', reg='REG-118 · REG-219', shot='c1/23-after-save.png')
f('L3','L','queue','major','Morning triage has no home',
  'The scope pill lists only stages; Overdue follow-ups, Unassigned and Unseen sit on the Filters modal’s second tab; Next follow-up and Last contact are hidden columns. With a quick filter on, the pill still reads “All Leads (9)” — three of them Lost. Nothing shows how long a lead has sat in its stage; the kanban’s unlabelled date is its last update.',
  'A “Needs attention” group in the scope menu (the three quick filters with counts, plus Mine); a pill that names the filter; parked and lost leads out of Overdue; days-in-stage on the cards.','M', reg='REG-608 (Quick filters pane)', shot='c1/35-overdue-filter.png')
f('L4','L','broken','major','Import quietly changes values, then reports success',
  'An expo sheet’s “S$80k” landed as S$80 and “75k” as S$75; “4rm HDB”, “Condo 3br”, “Landed” all became Others, and every source Others. Review showed the raw values with no warning; the end said “6 of 6 records imported successfully”.',
  'Read k / m amounts; in Review, mark the cells that won’t land as typed (the house error style); one lead source for the whole batch at step 2.','M', shot='c1/54-import-step4.png')
f('L5','L','follow','minor','An import ends at a dead end',
  'Done is the only button; the new leads have nobody assigned, and tapping Contacted says “Assign a member first” with no way to.',
  'The success step offers “Assign these 5” (the bulk Assign, already built) and “Review 1 duplicate”; the snackbar carries Assign.','S', shot='c1/79-m-stage-disabled-tap.png')
f('L6','L','honest','major','The loudest button on a lead is usually locked',
  'Convert to Project is the filled primary on every lead and locked until Quote Sent; at Contacted it says “Complete Met first” though Quote Sent is missing too. The real next step sits in the brief’s outlined buttons or the stage pill.',
  'Until Won is reachable the primary is the next stage (“Move to Met”); or Convert shows outlined while locked, its message naming the whole path.','M', reg='mock 858-24770 · REG-165 · REG-469 — Vicky’s call', shot='c1/30-convert-locked.png')
f('L7','L','honest','minor','“Owner: You” on every lead',
  'On a lead assigned only to Sarah, Owner still reads You — it is always the signed-in member, while the New gate uses “owner” for an assigned member.',
  'Show the first assigned member, or drop the row.','S', reg='mock 858:24806', shot='c1/27-overview-new.png')
f('L8','L','broken','minor','An unknown budget shows as 0',
  'A blank budget is stored as 0: “0” in the table, “S$ 0” in the header chip, “0” in the info column where other blanks show “--”; the brief says “fit it to S$0”.',
  'Store no value and show “--”.','S', shot='c1/16-after-create.png')
f('L9','L','broken','minor','A call’s time silently becomes 10:00 AM',
  'Pick only the day and the log is saved at 10:00 — a 12:21 PM call can land before the lead existed, and Insights times the first outreach from it.',
  'A log defaults to now, or the time is required.','S', reg='REG-119 · REG-125 (the time row)', shot='c1/20-after-date-done.png')
f('L10','L','honest','minor','“Cancel” in Suggested tasks still moves the stage',
  'Someone expecting to go back to the log finds the lead already moved. Lost arrives with “Went with another firm” chosen and On Hold with “Client not ready”, so hurried saves skew the reasons.',
  'Label it “Move without tasks”; no reason chosen until one is picked.','S', reg='REG-148', shot='c1/25-suggested-tasks.png')
f('L11','L','find','minor','A caller-ID number finds nothing, and a phone can’t call it',
  'Searching “+65 9123 4599” says “No results found · Check your spelling” with no way to add; on a phone the number offers copy and WhatsApp but not a call.',
  'Ignore a +65 / 65 prefix; the empty state offers “Add lead with 9123 4599”; the number is tap-to-call on a phone.','S', shot='c1/86-search-plus65.png')
