# One home per thing — the navigation audit (2026-10-08)

The owner found two duplicates by eye on 2026-10-08: a Finance rail item beside Company › Finance (fixed, REG-1360) and Reports in three
places (fixed, REG-1361: Company › Reports › Leads · Projects · Finance). She asked: "check what are the other similar things not identified so
we can fix all of them at once". This is that audit: read-only, every route and every way in (rail, phone More sheet, Company panel, Tools,
Settings modules, tab strips, page buttons, quick links, ⌘K, G-keys), checked against the register. Kinds: **A** one thing, two homes ·
**B** one name, two places · **C** a *Soon* whose function is built elsewhere · **D** the same rules or records edited in two places ·
**E** studio admin in the wrong kind of home · **F** one place, two names. "As recommended" = decided under an overnight "build everything",
not her own pick.

| id | kind | finding | evidence | decided before | recommendation |
|---|---|---|---|---|---|
| N-01 | A B | Finance repeats the reports' figures: **Pipeline** (every project's contract, collected, margin) = the Projects listing's money columns = Reports › Finance › Profitability; Overview's Owed to you / You owe tiles = those reports; Commissions' Earned · Paid · Owed table = the Commissions report; Vendors' Committed · Owed = Vendor spend. "Pipeline" also means the lead pipeline. | `lib/finance/sections.ts`; `components/finance/books/pipeline-view.tsx`; `components/projects/project-columns.tsx:84-86`; `lib/finance/reports.ts:19-24`; `overview-view.tsx`; `commissions-view.tsx` | F2-Q1 · Q10 · Q11, as recommended | Finance = the work only (POs, Bills, Expenses, Payments out, Vendors, commission asks, Accounting). Pipeline goes (→ Reports › Finance › Profitability); Overview keeps Money to verify · Stuck. |
| N-02 | C | The rail's first item **Dashboard** is *Soon*, while what 1.0's dashboard showed is now built in other homes. | `app-rail.tsx:31`; `mobile-nav.tsx:28`; L7 | mock (REG-298); held for L7 | Decide what Dashboard is (a "today" page linking into Reports) — needs her frames. |
| N-03 | A D | **Lead capture twice**: Settings › Lead management › Lead capture and Company › Integrations both show the intake address, Copy, Simulate and the ways in. | `settings-view.tsx:477-506`; `integrations-view.tsx:137-265` | REG-602, REG-647 Q-12, as recommended | Integrations is the one home; Settings keeps Lead sources + its *Kept in Company: Integrations* link. |
| N-04 | C F | The lead page's **3D Space Planner** quick link answers *Coming soon*; the planner is live. Spelt "3D" (elsewhere "3-D"), another glyph. | `quick-links.tsx:59`; `overview.tsx:615`; `tools-popover.tsx:25` | not in the register | Open the planner (the project's layouts once Won, else a new layout for the lead); one spelling, one glyph. |
| N-05 | C A B | **Qanvast Ops**: Add Lead, Insights, Filters answer *Coming soon* though built; its Leads table repeats the Qanvast leads on the listing; its "Credits" tab shares a word with AI credits. | `components/qanvast/qanvast-leads.tsx:44-207` | mock (REG-192/193, before those were built) | Add Lead = the house form with source Qanvast; Insights = Reports › Leads; Filters = the listing's; "Lead credits". Its place (rail or Integrations) is hers. |
| N-06 | A B F | **Settings › Studio copies Company**: Team = Company › Members read-only, Issuing entities = Profile's read-only; ⌘K offers both copies. "Studio" names a Settings module and a Company group. | `studio-settings.tsx:46-105`; `global-search/model.ts:132-154` | REG-645 Q-03 · Q-04, as recommended | Settings › Studio keeps *Who may do what*; Team and entities become *Kept in Company* links; ⌘K points at Company. |
| N-07 | D E | **Accreditations in three places**: CaseTrust is a Settings switch (`casetrust`) and, separately, a Compliance Navigator "Done" (`compliance_studio`); the HDB licence on Profile, the HDB listing in the Navigator; badges in Brand kit. | `lib/contracts/casetrust.ts:7`; `lib/compliance/queries.ts:87`; `profile-view.tsx:33` | gaps D-6 + I-Q12, as recommended | One record of registrations on Company › Profile; the Navigator and the signing pages read it; the Settings switch goes. |
| N-08 | B F E | **Chat vs Messages**: the rail's "Chat" and a project's / the portal's "Messages" are the same conversations; ⌘K "messages" finds Settings › Notifications' *Messages* card; Chat is on the rail, Tickets behind a Projects button. | `app-rail.tsx:41`; `lib/projects/tabs.ts:19-20`; `global-search/model.ts:152` | H-Q11 · H-Q2, as recommended | One word everywhere ("Messages"); the Notifications card becomes "Message wording"; Tickets beside it. |
| N-09 | E C | **Xero connects in Finance › Accounting**; Integrations lists Xero under *Coming*. | `integrations-view.tsx:311-316` | F2-Q13, as recommended | A live Xero card in Integrations (Connect / Disconnect, status); Accounting keeps mapping + sync log. |
| N-10 | A | A **Won lead's** Tasks, Files, Notes, Questionnaire, Activity open both on the lead and on its project; ⌘K sends some to each. | `app/leads/[id]/[tab]/page.tsx:63-65`; `lib/projects/tabs.ts:22-28` | Projects Q-01 "two chapters" | Her call: once Won, the lead's carried tabs redirect to the project's (a direct project's lead already does). |
| N-11 | D | **Settings › Projects asks "where does a schedule start?" twice** (Schedule defaults + by project type with "Auto"). | `schedule-defaults-setting.tsx:49-54`; `schedule-settings.tsx:96-104` | Projects r7 Q-12 + gaps C | One card: by type, with a studio-default row. |
| N-12 | E D | **Money-in paperwork split**: invoice / receipt numbers in Settings › Projects, credit-note numbers in Settings › Finance; invoice paper in Settings while every other document's look is in Templates. | `projects-settings.tsx:88-91`; `books-settings.tsx:135` | F2-Q1 · gaps B-14, as recommended | Credit notes beside Invoices in Settings › Projects; invoice paper a Templates kind. |
| N-13 | D | **The studio's own entity in three places** (GST switch + rate in Settings › Quotes & pricing, GST Reg. No. in Profile details, logo in Brand kit); every other entity in one. | `settings-view.tsx:636`; `profile-view.tsx:33-172` | REG-593 · 645 Q-05 · 618 | The studio is entity 1 on Profile with the same switch; Settings keeps only the rate. |
| N-14 | B | **"Payments" = three pages** (Templates › Payments = payment schedules, Settings › Projects › Payments = client payments, Finance › Payments out); "Schedules" beside "Payments" in Templates; the bell's "Updates" vs a project's Updates tab. | `lib/company/sections.ts:36-37`; `payments-settings.tsx:76` | REG-538 · Projects r6 · UX P7 | "Payment schedules", "Client payments"; the bell group's word is hers. |
| N-15 | F | **One panel, two names**: the lead ⋮ "Invite to Portal" (mock) opens "Client access", which the project ⋮ calls "Client access…". | `overview.tsx:507`; `client-access-panel.tsx:124`; `project-menu.tsx:38` | mock + Projects r4a | One name — hers. |
| N-16 | D | **Vendors twice**: Finance › Vendors is the directory, but Price book and quote lines keep vendor as free text with their own list. | `price-book/item-dialog.tsx:132`; `lib/company/price-book.ts:56` | F1-Q4, as recommended | Their Vendor field picks from (and adds to) Finance › Vendors. |
| N-17 | E | **A member's project capacity** is set on the Workload view, not on Company › Members. | `workload-view.tsx:41,111` | I-Q3, as recommended | A Members field; Set capacity stays as a door to it. |
| N-18 | F | Settings › Finance read *Kept in Finance:* (its ghost *Kept in Company:*). | `finance-settings.tsx:22` | REG-1360 leftover | **Fixed** with REG-1360. |

**Checked and fine:** Tasks / Tools › Quotes / Tools › Contracts (studio lists over lead records); the Price book modal (REG-662); Brand kit in Templates (REG-554); the rail credits slot (a door into Plan & AI credits); the bell vs Settings › Notifications (feed vs rules); Settings' *Kept in Company* links for sources, reasons, trades, numbering, Templates, Price book; *New quotes start with* (a mirror with a door); a member's signature (one dialog, two doors); Schedules library vs which applies (but N-11); the portal's About us (drawn from Profile + Members); Tickets vs Issues (H-Q1); the Navigator's rules vs a project's Compliance tab; Isometric, Market Insights, Meeting Copilot, Marketplace (*Soon*, nothing built covers them); Company › Questionnaire vs custom fields; Commissions records vs rates; Materials vs pickers; the Visualizer's doors.

**Not settled:** the quote Create strip's *Brand Catalog* (inert) and the rail's Marketplace may be one future thing; Files' New ▾ *From Company Files* names a home that doesn't exist; *Who sees leads* (Settings › Lead management) governs projects, quotes, contracts and more — it may belong in Studio.

## The owner's answers and the build (2026-10-08)

Her answers: 15 → **"Invite to Portal"** · 16 (Dashboard) → **held, built later** · 17 → **yes**: "let the lead data till won be in the leads and
after it's won rest is all under projects" · "Rest is all fine". Built the same day by five packages in the main tree (no worktrees), merged and
verified once; each package's outcome (files, what to check, probes changed) is in `one-home/outcome-K*.md`, its staged rows in `one-home/reg-K*.md`.

| id | built as | package |
|---|---|---|
| N-01 | REG-1362 | K1 |
| N-09 | REG-1363 | K1 |
| N-16 | REG-1364 (+ R91) | K1 |
| N-03 · N-06 · N-11 · N-12 | REG-1365…1368 | K2a |
| N-07 · N-13 · N-17 | REG-1369…1371 (+ R90) | K2b |
| N-05 · N-08 · N-14 · N-15 · ⌘K | REG-1372…1377 | K3 |
| N-10 · N-04 | REG-1378 · 1379 | K4 |
| the merge's own fixes | REG-1380 | — |
| N-02 Dashboard | held (her call) | — |
| N-18 | fixed with REG-1360 | — |

**Verified (2026-10-08, one build of everything):** all 26 Projects probes (gap-e on a local.db copy — it reads renders messages the base
state doesn't hold, a gap in that probe), the 73-probe regression (after the merge's fixes: the import matches vendors by the directory's
rule; three probes' assertions follow REG-1361's Back and the role table's capitals), the Reports probe 27/27, design:anatomy 66 pages / 1,631
measures, design:lint, tsc, eslint. Shots: `design-source/verify/one-home-2026-10-08/` (1440 and 390).
