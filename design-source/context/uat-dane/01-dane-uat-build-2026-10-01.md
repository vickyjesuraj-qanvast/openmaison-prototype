# Dane's UAT — the build record (2026-10-01)

Dane walked UAT chapters 1–12 (his tab in the tracker, gid 276469951; chapter 13 untested) and annotated Figma *Improvements* › **Fix 1** (1490:5408) and **Fix 2** (1683:2) — the words are native Figma annotations, 36 of them. The triage (91 cards) is the review page https://claude.ai/artifact/UTiPVWghP4uu9hds4q4hbo. Vicky, 2026-10-01: *“fix all of it with your recommendations … nothing breaks or changes rules from the core definitions.”* Built by eight packages in worktrees (P1 template editor · P2a price book & galleries · P2b settings & company · P3 quote editor · P4 contracts, signing & X-Ray · P5a leads & overview · P5b tasks, bell & dates · P6 shell & house pieces), merged and re-verified on one build: **REG-822…906**. Package rows and notes: `reg-P*.md` beside this file; probes and shots: `design-source/verify/uat-dane-2026-10-01/<package>/`.

## For Dane's tab — Our reply and Status, row by row

| Sheet row | Step | Status | Our reply | REG |
|---|---|---|---|---|
| 9 | 1.05 | Fixed – please re-test | The dot is intended (a filter is on). Added a “View all” button beside the pill to get back to All Leads in one press. | REG-881 |
| 15 | 2.01 | Fixed – please re-test | Added a Preview button on the Brand kit that opens every page of the default template large. | REG-845 |
| 16 | 2.02 | Won’t change | Either works — it prints exactly as you type it. The help now shows an example handle. | REG-853 |
| 21 | 2.07 | Fixed – please re-test | Done — no “Optional” labels, and names are capitalised on save. | REG-846 |
| 25 | 2.11 | Fixed – please re-test | Yes — make another member Owner first, then they can change your role. The tip on your own row now says exactly that. | REG-847 |
| 28 | 2.14 | Fixed – please re-test | Done — Studio · Lead management · Projects · Quotes & pricing · Finance · Notifications. | REG-848 |
| 35 | 2.21 | Fixed – please re-test | It’s a reminder shown when marking a lead Lost, not a block. The card is now “Lost and On Hold reasons” and the field “Contacts expected first”, with a line explaining it. | REG-849 |
| 37 | 2.23 | Fixed – please re-test | Each rule in Who may do what now links to where it’s set, and the “Only Owners and Admins change these.” line is now a tinted strip. | REG-850 |
| 39 | 2.25 | Fixed – please re-test | Done — the three switches now sit in their own group under the fields. | REG-851 |
| 55 | 3.03 | Fixed – please re-test | Fixed — a new item, section or template made inside a folder now lands in that folder. | REG-836 |
| 56 | 3.04 | Fixed – please re-test | Done — the line under the name now reads “by Timber Craft · Carpentry”; the price stays on the picture. | REG-837 |
| 59 | 3.07 | Fixed – please re-test | Done — sorting now lists every item across folders, as search does. | REG-838 |
| 62 | 3.10 | Fixed – please re-test | Set markup can lower prices too (it sets the % of cost). History now sits beside the form, and each entry has “Bring back” (with Undo). | REG-839 |
| 63 | 3.11 | Fixed – please re-test | Fixed — Export leaves unapproved items out unless you tick “Include proposed items”; re-importing skips them as “Waiting for approval”, and with nothing new the button says Done. | REG-835 |
| 64 | 3.12 | Fixed – please re-test | Fixed — Export leaves unapproved items out unless you tick “Include proposed items”; re-importing skips them as “Waiting for approval”, and with nothing new the button says Done. | REG-835 |
| 66 | 3.14 | Fixed – please re-test | Done — it now says “It’s on 7 quotes — they keep their lines. New quotes can’t pick it until you restore it from Deleted Items.” | REG-840 |
| 70 | 3.18 | Fixed – please re-test | Done — editable titles show a pencil. | REG-873 |
| 71 | 3.19 | Fixed – please re-test | One name everywhere now: “Insert a field” (T&Cs & Notes, the quote editor and contracts). The fields themselves work as before. | REG-854, REG-865, REG-875 |
| 72 | 3.20 | Fixed – please re-test | Fixed — the Tags dropdown opens at full width; Enter on a new name creates the tag and Manage Tags opens the tags manager. | REG-843 |
| 75 | 3.23 | Fixed – please re-test | Done — leaving an unpublished template now says “Saved as a draft — publish it to use it on quotes”. | REG-834 |
| 82 | 3.30 | Fixed – please re-test | Fixed — the sample page now redraws with the payment schedule, GST, validity and T&Cs / Notes you pick on New quotes. | REG-822 |
| 86 | 3.34 | Fixed – please re-test | Added a Preview button on the Brand kit that opens every page of the default template large. | REG-845 |
| 90 | 3.38 | Fixed – please re-test | Done — questions (and custom fields, section lines) now drag by a handle; the arrows stay for keyboard and touch. | REG-842, REG-852 |
| 94 | 4.03 | Fixed – please re-test | Done — “Open existing lead” opens it in a new tab and keeps your form as it was. | REG-902 |
| 96 | 4.05 | Fixed – please re-test | It’s at the very end of “Additional info” when creating a lead. The step now says so. | REG-906 |
| 98 | 4.07 | Fixed – please re-test | Fixed — the step 3 table ends at its last row and the sideways scroll sits right under it. | REG-877 |
| 113 | 4.22 | Fixed – please re-test | Next follow-up now shows when — day, date and time over “in 2 days” — while Tasks names the task. | REG-892 |
| 114 | 4.23 | Fixed – please re-test | Done — the name underlines when you point at a card. | REG-882 |
| 118 | 5.03 | Won’t change | Kept on purpose: a disabled button can’t tell you why it’s locked; this one does. |  |
| 119 | 5.04 | Fixed – please re-test | “Assign to Sarah” now assigns in one press. | REG-901 |
| 120 | 5.05 | Fixed – please re-test | Done — a task pressed on Overview now opens over Overview (with “Open in Tasks” for the full tab), so you stay on Overview. | REG-888 |
| 121 | 5.06 | Fixed – please re-test | The NRIC is now masked on the lead and in Activity; Owners and Admins can press Show. Export and the printed quote are unchanged until the stakeholders decide. | REG-903 |
| 128 | 5.13 | Fixed – please re-test | Done — dates that look ahead (task due, follow-ups, valid until, on hold till) now read like “Sat, 3 Oct ’26”. | REG-891 |
| 132 | 5.17 | Fixed – please re-test | Done — the answered question now slides to its new place and glows once. | REG-886 |
| 133 | 5.18 | Fixed – please re-test | Fixed on 30 Sep — please pull the latest and re-check (the message now says the questions were sent). | REG-906 |
| 134 | 5.19 | Fixed – please re-test | We keep you on the tab you’re on, but “Moved to Met” now has “View”, which opens Overview and highlights LEAD STAGES. | REG-883 |
| 136 | 5.21 | Won’t change | Intended: the tick means Met is logged; “current” means the lead is in it now. |  |
| 142 | 6.03 | Fixed – please re-test | Renaming doesn’t create anything — the first quote came from “From Scratch”, which now creates a quote straight away. The step is fixed, and the ▾ list is now headed “Sophia Wong’s quotes”. | REG-863 |
| 150 | 6.11 | Fixed – please re-test | Section rows no longer have the photo box, so their names have room; item rows keep it as designed. | REG-856 |
| 154 | 6.15 | Fixed – please re-test | Added Preview to the expanded Items view, and coming back from Preview reopens it expanded. Below-cost lines also show their Unit Price and Total in red. | REG-859 |
| 162 | 6.23 | Fixed – please re-test | Added — Signature now has Upload (PNG, or JPG on white, up to 1 MB), shown everywhere a drawn one is. | REG-857 |
| 165 | 6.26 | Fixed – please re-test | Messages now stay longer (8 s when they have a button or wrap) and pause while you point at, touch or tab into them; Save as Template now says “Saved as a draft in Company › Templates › Quotes”. Warnings that should change a decision show in the window itself (see 9.08). | REG-864, REG-898 |
| 167 | 6.28 | Fixed – please re-test | Messages now stay longer (8 s when they have a button or wrap) and pause while you point at, touch or tab into them; Save as Template now says “Saved as a draft in Company › Templates › Quotes”. Warnings that should change a decision show in the window itself (see 9.08). | REG-864, REG-898 |
| 170 | 6.31 | Fixed – please re-test | The step was unclear — rewritten with where to look. | REG-906 |
| 180 | 6.41 | Fixed – please re-test | Fixed — the Client list has a search box that finds any part of the name (“tan” finds Gerald Tan) and opens first from Tools › Quotes. The same search is on Quote X-Ray’s lead pick. | REG-858 |
| 187 | 7.04 | Fixed – please re-test | Done — “Only in yours” and “Only in theirs” chips are now green and red. | REG-871 |
| 196 | 7.13 | Fixed – please re-test | Fixed — the message keeps “Resume at Quote Sent first” and its button just says “Resume”, on one line. | REG-876 |
| 199 | 8.02 | Fixed – please re-test | Fixed — “Use template” now reads “Creating…” and waits until the contract opens. | REG-868 |
| 200 | 8.03 | Fixed – please re-test | Fixed — Insert a field now puts the chip exactly where your cursor is (links and signature fields too). The menu is renamed “Insert a field”. | REG-867 |
| 202 | 8.05 | Fixed – please re-test | Done — switching on Tick to accept fills in “I have read and agree to this document.”, in a two-line box you can edit. | REG-869 |
| 206 | 8.09 | Fixed – please re-test | Fixed — “view the quote” and the other text links are purple again across the app (a styling change on 29 Sep had turned them black). | REG-896 |
| 208 | 8.11 | Fixed – please re-test | Done — the banners in the contract and quote editors now run full width. | REG-870 |
| 213 | 8.16 | Fixed – please re-test | Done — pointing at a cut task title shows the whole title. | REG-893 |
| 214 | 8.17 | Fixed – please re-test | Intended since 30 Sep: the signed notice opens “Move to Won” so the deal moves with the contract; once the lead is Won it opens the Contracts tab. The step is corrected. | REG-887 |
| 220 | 8.23 | Fixed – please re-test | The dates stay as designed; pointing at one now shows its time. | REG-872 |
| 230 | 9.06 | Fixed – please re-test | Done — pressing the On Hold row now asks “Resume at …?” like the header button. | REG-884 |
| 232 | 9.08 | Fixed – please re-test | It was a grey line in the Lost window, easy to miss. It’s now a warning with “Put On Hold instead”, which switches to On Hold with your date. | REG-885 |
| 234 | 9.10 | Won’t change | Kept optional, as in 1.0 (Qanvast’s rule); the label now says “(optional)”. | REG-904 |
| 236 | 9.12 | Won’t change | It matches the Leads page; if we move it, both move together. |  |
| 248 | 10.08 | Fixed – please re-test | Each rule in Who may do what now links to where it’s set, and the “Only Owners and Admins change these.” line is now a tinted strip. | REG-850 |
| 250 | 10.10 | Fixed – please re-test | Done — members outside the team now look disabled (picture and name too). | REG-900 |
| 254 | 10.14 | Fixed – please re-test | Fixed — only the approval bar carries “Approve and publish”; the top button reads “Awaiting approval”. | REG-825 |
| 259 | 11.02 | Fixed – please re-test | Fixed — a task you just added stays at the top and glows once, so you can carry on editing it. | REG-890 |
| 260 | 11.03 | Fixed – please re-test | Added a search box to Filters › Lead. | REG-894 |
| 263 | 11.06 | Fixed – please re-test | The bell already splits Updates and Due (since 30 Sep); now Due comes first whenever a follow-up is late. | REG-895 |
| 266 | 11.09 | Fixed – please re-test | Insights is studio-wide, so the crumb stays “Leads / Insights”; opened from a lead, its Back now says “Back to <lead>”. | REG-879 |
| 274 | 12.03 | Talk to Dane | On a phone the line sheet now hides Cost and Markup when those columns are off. Could you share phone screenshots of what else felt off in Tasks and Notes? Those layouts are waiting for proper mobile designs. | REG-866 |
| 275 | 12.04 | Fixed – please re-test | Added a back arrow from Company (and View as, AI credits) to More. | REG-899 |
| 278 | 12.07 | Fixed – please re-test | Fixed — each quick filter is now a name with a small help line under it, so nothing overlaps on a phone. | REG-878 |
| 279 | 12.08 | Talk to Dane | On a phone the line sheet now hides Cost and Markup when those columns are off. Could you share phone screenshots of what else felt off in Tasks and Notes? Those layouts are waiting for proper mobile designs. | REG-866 |
| 281 | 12.10 | Fixed – please re-test | Fixed — Copy link now works on a phone opened over the laptop’s address, and the link in the Send window wraps so you can press-and-hold to copy it all. Please re-test 12.10 and 12.11. | REG-897 |
| 282 | 12.11 | Fixed – please re-test | Fixed — Copy link now works on a phone opened over the laptop’s address, and the link in the Send window wraps so you can press-and-hold to copy it all. Please re-test 12.10 and 12.11. | REG-897 |

Rows 67 (3.15), 151 (6.12) and 152 (6.13) were praise — Status *Won’t change* or leave blank. Comment threads on 3.04, 3.23 and 7.06: answered by REG-906 (3.04, 7.06) and the 3.23 reply above.

## Every card

| Card | Where Dane said it | Verdict then | Built | REG |
|---|---|---|---|---|
| b-smart — Smart Text drops its chip at the end of the contract, not where you clicked | Sheet 8.03 · row 200 🟡 | bug | built | REG-867 |
| b-copy — Copy link does nothing on a phone opened over the laptop’s address | Sheet 12.10 · row 281 ❌ · Sheet 12.11 · row 282 ❌ | bug | built | REG-897 |
| b-time — A follow-up’s time is wiped the moment its date is touched, and never shown | Sheet 5.05 · row 120 🟡 | bug | built | REG-889 |
| b-links — Text links lost their purple across the app since 29 Sep | Sheet 8.09 · row 206 🟡 | bug | built | REG-896 |
| b-proposals — Exporting My Items includes unapproved proposals, and importing that file would publish them | Sheet 3.11 · row 63 🟡 · Sheet 3.12 · row 64 🟡 · Figma Fix 2 · 1653:11 | bug | built | REG-835 |
| b-folder — A new item made inside a folder lands outside it | Sheet 3.03 · row 55 🟡 | bug | built | REG-836 |
| b-tags — Task template Tags picker collapses to 78 px | Sheet 3.20 · row 72 ✅ · Figma Fix 2 · 1654:17 | bug | built | REG-843 |
| b-newquotes — The template canvas ignores the New quotes defaults | Sheet 3.30 · row 82 ❌ | bug | built | REG-822 |
| b-brandkit — Brand kit says “Redraws as you edit”, but colour and font edits don’t show | Sheet 2.01 · row 15 ✅ · Figma Fix 2 · 1517:10 | bug | built | REG-844 |
| b-approve — “Approve and publish” appears twice on a submitted template | Sheet 10.14 · row 254 ✅ · Figma Fix 2 · 1681:24 | bug | built | REG-825 |
| b-zebra — “Shade every other row” does nothing | Figma Fix 2 · 1517:72 | bug | built | REG-823 |
| b-fab — The Maison AI button covers the bottom of the template inspector | Figma Fix 2 · 1517:26 | bug | built | REG-824 |
| b-resume — “Resume at Quote Sent first · Resume at Quote Sent” wraps to three lines | Sheet 7.13 · row 196 ✅ · Sheet screenshot | bug | built | REG-876 |
| b-newtask — A task you just added sinks into the list | Sheet 11.02 · row 259 🟡 | bug | built | REG-890 |
| b-import3 — Import step 3: the table frame fills the window, so its scrollbar sits far below the rows | Sheet 4.07 · row 98 ✅ · Figma Fix 2 · 1659:29 | bug | built | REG-877 |
| b-quickfilters — On a phone, Quick filters’ words spill into the next row | Sheet 12.07 · row 278 ✅ | bug | built | REG-878 |
| b-creating — “Use template” closes the picker and nothing shows while the contract is made | Sheet 8.02 · row 199 ✅ | bug | built | REG-868 |
| b-insights — Insights’ Back says “Back to Leads” but returns to the lead | Sheet 11.09 · row 266 🟡 | bug | built | REG-879 |
| b-doublequote — A double press on the Overview’s “From Scratch” makes two quotes | Found while checking 6.03 | bug | built | REG-880 |
| g-snackbar — Snackbars vanish before people read them | Sheet 6.26 · row 165 🟡 · Sheet 6.28 · row 167 🟡 · Sheet 9.08 · row 232 🟡 · Sheet screenshot | gap | built | REG-864, REG-898 |
| g-sections-trade — Your own sections don’t print on a Trade template, and nothing says so | Sheet 6.11 · row 150 🟡 · Figma Fix 2 · 1549:32 | gap | built | REG-855 |
| g-photowell — The empty photo well squeezes item names in the Items table | Sheet 6.11 · row 150 🟡 · Figma Fix 2 · 1672:15 · Figma Fix 1 · 1490:5404 | gap | built | REG-856 |
| g-signature — Upload a signature image (1.0 had it) | Sheet 6.23 · row 162 ✅ | gap | built | REG-857 |
| g-createclient — Create Quote’s Client list doesn’t narrow as you type | Sheet 6.41 · row 180 ✅ | gap | built | REG-858 |
| g-expanded — No Preview from the expanded Items view, and it doesn’t come back expanded | Sheet 6.15 · row 154 ✅ | gap | built | REG-859 |
| g-zero — Clicking an empty price cell leaves “0.00” to delete | Figma Fix 1 · 1490:5389 | gap | built | REG-860 |
| g-categories — Items by category: no add, move or reorder on the category rows | Figma Fix 2 · 1549:32 | gap | built | REG-861 |
| g-jumpto — Find items could list the quote’s sections to jump to | Figma Fix 1 · 1490:5394 | gap | built | REG-862 |
| g-weekday — Show the weekday on due dates | Sheet 5.13 · row 128 ✅ | gap | built | REG-891 |
| g-merge-fields — One name for merge fields: Token, Field or Smart Text | Sheet 3.19 · row 71 🟡 · Figma Fix 2 · 1654:23 | gap | built | REG-854, REG-865, REG-875 |
| g-nooptional — Add member: drop the “Optional” hints and capitalise names | Sheet 2.07 · row 21 ✅ · Figma Fix 2 · 1623:15 · Figma Fix 2 · 1623:16 | gap | built | REG-846 |
| g-ownrole — Your own role’s tip, and handing over ownership | Sheet 2.11 · row 25 🟡 | gap | built | REG-847 |
| g-tabs — Settings tab order | Sheet 2.14 · row 28 ✅ | gap | built | REG-848 |
| g-reasons — “Reasons” and “Needs logged contacts” need plainer words | Sheet 2.21 · row 35 🟡 | gap | built | REG-849 |
| g-whomay — Who may do what: link each row to where it’s set, and make the read-only line louder | Sheet 2.23 · row 37 🟡 · Sheet 10.08 · row 248 ✅ · Sheet screenshot | gap | built | REG-850 |
| g-quotenumbers — Quote number switches look tied to the field above each | Sheet 2.25 · row 39 🟡 · Figma Fix 2 · 1629:7 | gap | built | REG-851 |
| g-pbcard — Price book card repeats the price and unit | Sheet 3.04 · row 56 ✅ · Figma Fix 2 · 1653:5 | gap | built | REG-837 |
| g-sortfolders — Sorting the Price book only sorts the open folder | Sheet 3.07 · row 59 🟡 | gap | built | REG-838 |
| g-markup — Bring back an older price from History; History beside the item | Sheet 3.10 · row 62 🟡 | gap | built | REG-839 |
| g-deletecopy — The delete message for an item that’s on quotes | Sheet 3.14 · row 66 ✅ | gap | built | REG-840 |
| g-dragorder — Drag to reorder questions (and custom fields, section lines) | Sheet 3.38 · row 90 ✅ | gap | built | REG-842, REG-852 |
| g-pencil — Editable titles don’t look editable | Sheet 3.18 · row 70 🟡 | gap | built | REG-873 |
| g-draftnote — Say “Saved as a draft” when leaving an unpublished template | Sheet 3.23 · row 75 ✅ | gap | built | REG-834 |
| g-preview-large — Open the default template large, with all its pages | Sheet 2.01 · row 15 ✅ · Sheet 3.34 · row 86 🟡 · Figma Fix 2 · 1517:10 | gap | built | REG-845 |
| g-watermark — Mark the template canvas as sample data | Figma Fix 2 · 1517:20 · Figma Fix 2 · 1546:25 | gap | built | REG-826 |
| g-sample-content — The sample can’t show Item photos, hidden lines or section notes | Figma Fix 2 · 1517:72 | gap | built | REG-827 |
| g-numbering — “B1” is ambiguous when numbers restart in each room | Figma Fix 2 · 1518:76 | gap | built | REG-828 |
| g-jump-canvas — Picking a block in the Page list doesn’t scroll the canvas to it | Figma Fix 2 · 1546:9 | gap | built | REG-829 |
| g-blank — A Blank template starts without a header and footer | Figma Fix 2 · 1546:25 | gap | built | REG-841 |
| g-trade — “Trade” or “Works”? | Figma Fix 2 · 1517:20 | gap | built | REG-830 |
| g-arrows — Column order arrows point up and down | Figma Fix 2 · 1517:26 | gap | built | REG-831 |
| g-reset-field — Reset a cleared label to its default | Figma Fix 2 · 1517:72 | gap | built | REG-832 |
| g-xray-rows — X-Ray rows: colour the Status chip, not just the edge bar | Sheet 7.04 · row 187 ✅ · Figma Fix 2 · 1680:5 | gap | built | REG-871 |
| g-tickwords — Prefill “The words they tick” | Sheet 8.05 · row 202 ✅ | gap | built | REG-869 |
| g-banner — Full-width editor banners | Sheet 8.11 · row 208 ✅ · Figma Fix 2 · 1681:11 | gap | built | REG-870 |
| g-tasktitle — Hover a cut task title to read it whole | Sheet 8.16 · row 213 ✅ | gap | built | REG-893 |
| g-leadsearch — Search the Lead list in Tasks › Filters | Sheet 11.03 · row 260 🟡 | gap | built | REG-894 |
| g-bell — The bell: Updates and Due as tabs? | Sheet 11.06 · row 263 🟡 | gap | built | REG-895 |
| g-back-more — Back from the Company sheet to More | Sheet 12.04 · row 275 🟡 | gap | built | REG-899 |
| g-viewall — One press back to All Leads | Sheet 1.05 · row 9 ✅ | gap | built | REG-881 |
| g-columns — Tasks and Next follow-up columns show the same task | Sheet 4.22 · row 113 ✅ | gap | built | REG-892 |
| g-kanban — Kanban card: underline the name on hover | Sheet 4.23 · row 114 ✅ | gap | built | REG-882 |
| g-newtab — “Open existing lead” loses the form you were filling | Sheet 4.03 · row 94 ✅ | gap | built | REG-902 |
| g-taskback — A task opened from Overview moves you to the Tasks tab | Sheet 5.05 · row 120 🟡 | gap | built | REG-888 |
| g-answered — An answered question jumps to the bottom without a cue | Sheet 5.17 · row 132 ✅ | gap | built | REG-886 |
| g-afterstage — After a stage move on another tab, offer the way to Overview | Sheet 5.19 · row 134 ✅ | gap | built | REG-883 |
| g-resumerow — Pressing the On Hold row should offer Resume | Sheet 9.06 · row 230 🟡 | gap | built | REG-884 |
| g-holdhint — “Consider On Hold instead” is a grey hint that’s easy to miss | Sheet 9.08 · row 232 🟡 | gap | built | REG-885 |
| g-locked — Members outside a manager’s team still look selectable | Sheet 10.10 · row 250 ✅ | gap | built | REG-900 |
| d-summary — Questionnaire summary card clipped its last line | Sheet 5.18 · row 133 ✅ · Figma Fix 2 · 1671:11 | done | built | REG-906 |
| d-movespace — Room under the last item in the Move stage window | Figma Fix 2 · 1669:5 | done | kept by decision | — |
| d-createtpl — “Create template changed to Publish?” — no, the step is right | Sheet comment on 3.23 | done | kept by decision | — |
| k-signednotice — The “signed” notice opens Move to Won — on purpose since 30 Sep | Sheet 8.17 · row 214 ❌ | decided | built | REG-887 |
| k-instagram — Instagram: handle or full link? | Sheet 2.02 · row 16 🟡 | decided | kept · Either works | REG-853 |
| k-convert — Locked Convert to Project isn’t the DS disabled button | Sheet 5.03 · row 118 ✅ | decided | kept by decision | — |
| k-met — Met ticked and “current” at once | Sheet 5.21 · row 136 🟡 | decided | kept by decision | — |
| k-qexport — Qanvast Ops’ “Export all as…” in the header menu | Sheet 9.12 · row 236 ✅ · Figma Fix 2 · 1681:17 | decided | kept by decision | — |
| k-stack — Stack the inspector over the left panel | Figma Fix 2 · 1546:9 | decided | kept by decision | — |
| k-previewwith — “Preview with” lists real quotes and an Empty quote | Figma Fix 2 · 1546:13 | decided | built | REG-833 |
| k-newquotes-tab — Is “New quotes” understood, and in the right place? | Sheet 3.30 · row 82 ❌ · Figma Fix 2 · 1546:16 | decided | built | — |
| k-closenew — A new split closed without “saving” still appears | Sheet 3.18 · row 70 🟡 | decided | kept by decision | — |
| k-contracttime — Time on the Contracts tab’s dates | Sheet 8.23 · row 220 ✅ | decided | built | REG-872 |
| t-6.03 — Renaming made no second quote — the step’s first press did | Sheet 6.03 · row 142 🟡 · Sheet screenshot | step | built | REG-863 |
| t-6.31 — The expired-validity step doesn’t say where to look | Sheet 6.31 · row 170 🔍 | step | built | REG-906 |
| t-4.05 — “Attach files” is at the end of the collapsed Additional info | Sheet 4.05 · row 96 🔍 | step | built | REG-906 |
| t-7.06 — 7.06 names a row that isn’t always Matched | Sheet comment on 7.06 | step | built | REG-906 |
| t-3.04 — 3.03 doesn’t say the dialog stays open for 3.04 | Sheet comment on 3.04 | step | built | REG-906 |
| x-nric — NRIC on leads and PDPA | Sheet 5.06 · row 121 ✅ | talk | built | REG-903 |
| x-return — Make a screenshot mandatory when returning a Qanvast lead? | Sheet 9.10 · row 234 🟡 | talk | kept · Kept optional, as in 1.0 (Qanvast’s rule); the label now says “(optional)”. | REG-904 |
| x-suggest — The AI suggestion in Assign | Sheet 5.04 · row 119 ✅ | talk | built | REG-901 |
| x-phonetabs — Tasks, Notes and quote Items on a phone “need review” | Sheet 12.03 · row 274 ✅ · Sheet 12.08 · row 279 ✅ | talk | partly built | REG-866 |

## The story changed — patch Oliva's and Swati's tabs too

The steps below changed words in `design-source/uat/story/` (REG-906); their tabs were imported before, so copy the new *How* / *You should see* into the same step rows by hand (or re-import a tab nobody has typed into yet): 2.11 · 2.14 · 2.21 · 2.35 · 3.03 · 3.04 · 3.06 · 3.11 · 3.14 · 3.19 · 3.21 · 3.29 · 3.30 · 3.34 · 4.03 · 4.05 · 4.22 · 5.04 · 5.05 · 5.06 · 5.13 · 5.18 · 6.01 · 6.03 · 6.11 · 6.15 · 6.26 · 6.31 · 6.41 · 7.06 · 7.07 · 8.02 · 8.03 · 8.05 · 8.17 · 8.22 · 9.05 · 9.08 · 11.02 · 11.04 · 12.04.

