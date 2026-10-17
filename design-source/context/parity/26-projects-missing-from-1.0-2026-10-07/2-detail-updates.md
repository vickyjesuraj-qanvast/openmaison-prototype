# 2 — The project page, Overview, updates, activity and the ending: what 2.0 still lacks from 1.0

Reviewer 2 of 7, 2026-10-07. Read only. Inventories covered: `C-detail-shell-overview.md` (C-01…C-358), `D-updates-meetings-activity-closure.md`
(D-01…D-357), and `K-ui-system-and-motion.md` (K-01…K-358, skimmed for interaction features only). 1.0 = `qanvast-id-tool` @ `620190192`;
2.0 = the `openmaison-prototype` working tree. Calls quoted from `23-projects-build-2026-10-05.md` §1 (Q-nn, F-nn) and REG rows.

## Bottom line

2.0 has nearly all of this area, and much of it works better than 1.0. The project page has its header, stage, number, one main
action, a kebab and real tab addresses. The Overview covers Getting started, Status, Schedule, Money, Key documents, Client and property,
Team, Latest updates and Recent activity. The Client access panel handles the invite and "See it as the client". Updates have real
uploads, edit, review with Send back, Resubmit, Withdraw and Undo. Activity is a real log of who did what. The ending is one Complete
handover with an optional owner's review, Reopen, and soft delete with Restore. The biggest gap is that a **direct project's client
details can't be changed after New project**: the lead page redirects, the project has no edit, and Client access tells you to "fix it on the
lead". Next come **project notes** (direct projects have none at all), a **handover summary** (1.0's figures, timeline against plan and
deferred items), and two **Overview warnings** 1.0 raised: collection behind progress, and an invoice that differs from the schedule. The
remaining gaps are small: named update approvers, a team bell for every post, posting an update from a milestone, a before/after photo
compare, and counts on the tabs. Larger 1.0 pieces were set aside by accepted calls: Meeting Summary (Q-31), profit and margin (Q-20),
money out and the expense button (Q-35), escalations and chat (Q-43), the 3D planner (Q-19), commission (Q-21) and Archive (Q-25, a
permanent no).

## Features

| Feature (plain words) | 1.0 rows | Status | What 2.0 lacks (or the call) | Impact | Size | 2.0 evidence |
|---|---|---|---|---|---|---|
| Change the client's details and the property once a project exists | C-273, C-274, C-284–C-294 | Partly | Won-lead projects are edited on the lead's record. A **direct project** offers no way to fix the client's name, phone, email, address, district or property type after New project, because every lead tab redirects to the project and the project has no edit. Client access then says "fix it on the lead first", and there is no lead page to fix it on. No project can change its **project type**. 1.0's room-by-room Scope chips have no counterpart | High | M | `app/projects/actions.ts` (only rename · dates · value · start); `app/leads/[id]/[tab]/page.tsx:64-65` (redirect); `components/portal/client-access-panel.tsx:77`; `components/projects/project-overview.tsx` (`client` card is read-only) |
| Project notes | C-306–C-308, C-310 | Partly | The project page has no notes card or tab. A Won project's notes stay on the lead's Notes tab, behind ⋮ › Open the lead's record. A **direct project can hold no note or call log at all**, because Notes is not a tab the project carries on | Medium | S | `lib/projects/tabs.ts` (`PROJECT_TABS` has no notes); `components/projects/project-menu.tsx:32` |
| A summary of how the project ended | C-141, D-249, D-251, D-265–D-267, D-271, D-279, D-307, D-317, D-329–D-331, D-342 | Partly | 2.0 keeps who completed it and when, the note, the Complete anyway reason with the open items, and "Took n days". It has no **closing summary**: contract against collected, net variation orders, credits, "refund due", **planned against actual days**, delayed milestones, and the client's rating. Neither the reviewing owner nor the record later sees those figures together | Medium | M | `components/projects/ending/handover-dialog.tsx`; `lib/projects/handover-model.ts` (`completedLine`); `project-overview.tsx` (`statusHead`) |
| Money warnings on the Overview | C-164, C-165, C-167, C-175, C-211 | Partly | Overdue payments and late milestones are raised, and ready-to-send drafts show on the Money card's stage rows. Missing: **"Collection is trailing progress by n%"**, an invoice that **differs from the schedule** raised as something to look at (2.0 only asks for a reason when it is edited, F-09), and a list of resolved variances | Medium | S | `lib/projects/attention.ts` (`ATTENTION_REASONS`, no collection or variance reason); `lib/projects/money.ts:130,326` |
| The homeowner questionnaire on the project | C-275–C-281 | Partly | On a Won project it appears only as a "waiting on the client" line that opens the lead's Questionnaire tab. A **direct project gets no questions**: New project copies no question bank and there is no Questionnaire tab. No answer history | Low | S | `lib/projects/queries.ts:294` (`portalWait`); `app/projects/actions.ts:83-120` (`createDirectProject`) |
| Handover checklist: defer an item, refund check | D-247, D-248, D-255–D-260, D-262, D-264, D-276–D-278, D-280, D-288, D-305, D-334–D-336, D-338, D-339 | Partly | Built from the records, and each open item has a button to its fix (better than 1.0). Missing: **defer one item with its own reason** (2.0 has one Complete anyway reason, Owner or Admin only, or a Designer's "ask"), and an **over-collection / refund-due check** (the Money tab shows "S$x to credit" but the checklist ignores it). The PO-payouts check belongs to money out (Q-35) | Low | S | `lib/projects/handover-model.ts` (`handoverChecklist`: milestones · client · money · updates) |
| Getting started steps | C-06, C-144–C-152, C-173, C-174 | Partly | Each step has its own button (Q-02). Missing: a **Contract** step (1.0's "Contract uploaded"). The commission step is held with commission (Q-21) | Low | S | `lib/projects/getting-started.ts` (`GETTING_STARTED`) |
| Who reviews updates | D-76, D-77 | Partly | 1.0 let a studio name approvers beyond its owners, with per-member overrides. 2.0's reviewers are **Owners and Admins only**; Q-17 gives an on/off switch | Low | S | `lib/projects/updates-model.ts` (`mayReviewUpdate`) |
| The team hears about each update | D-80, D-114 | Partly | 1.0 rang owners, admins and designers on every post. 2.0 rings only the reviewers (`update_review`) and the author (`update_approved` / `update_sent_back`); nobody hears when an update goes straight out | Low | S | `lib/notifications/model.ts:18,72-74` |
| The client's update list | D-09, D-81, D-93 | Partly | The portal's Updates tab and the client's bell are built. Missing: the **search** box 1.0 showed past three updates, and the **invoice card** under an update whose milestone has an invoice (the client's Money tab holds it) | Low | S | `components/portal/project/portal-updates.tsx`; `lib/portal/notifications.ts:75` |
| Photos on an update: viewer and before/after compare | D-18, D-29, D-54, D-118–D-120 | Partly | Photos open in the file viewer and the portal's viewer. 1.0's **Compare** (before/after slider) has no counterpart | Low | S | `components/projects/updates/update-card.tsx`; `components/portal/project/photo-viewer.tsx` |
| Post an update straight from a milestone | D-03, D-05, D-107, D-117 | Missing | Neither a milestone's panel nor marking it done offers "Post an update". The composer's milestone picker is the only link between the two | Low | S | `components/projects/schedule/milestone-panel.tsx` (no update action) |
| An update posted when a timeline extension is asked | D-07 | Missing | Nothing in 2.0 posts it, and extension requests themselves belong to the schedule audit | Low | S | — |
| Counts on the tabs | C-62, C-63 | Missing | 1.0 showed "Management (n open tasks)" and "Finance (n unpaid invoices)". 2.0's tab strip has no counts | Low | S | `lib/projects/tabs.ts`; `components/om/tabs.tsx` (no count) |
| A project in another country's currency | C-207, C-220 | Missing | Every figure prints in S$. 2.0 is a Singapore product throughout | Low | L | `lib/format.ts` (`moneySGD`) |
| Profit, cost and margin figures (expected, cash, with commitments, Δ, margin warning) | C-181–C-187, C-189, C-190, C-203–C-205, C-221, C-222, D-263, D-306, D-337 | Left out on purpose (later) | Q-20: "Cost, profit, commission: none in this build (Owner and Admin when they come)" | — | — | — |
| Purchase-order and cost-overrun warnings | C-168–C-171 | Left out on purpose (later) | Q-35: money out and the books later | — | — | — |
| The phone's "Log expense" button | C-330, C-331 | Left out on purpose (later) | Q-35 | — | — | — |
| Activity lines for POs, expenses and commission | D-209, D-213–D-215 | Left out on purpose (later) | Q-35 · Q-21 | — | — | — |
| Commission at close and on the team | D-301, D-332 | Left out on purpose (later) | Q-21: "Commission held for money out" | — | — | — |
| Escalations (tickets) on the project: banner, Activity lines, closure check | C-95, C-96, D-211, D-261 | Left out on purpose (later) | Q-43: "tickets and chat later" (1.0's banner could never show, C-96) | — | — | — |
| "Show chat history" when inviting the client | C-105 | Left out on purpose (later) | Q-43 (chat later) | — | — | — |
| Meeting Summary and the co-pilot from the project | C-311–C-313, D-124–D-176 | Left out on purpose (later) | Q-31: "Meeting Summary and compliance held"; Meetings waits for mocks (REG-552) | — | — | — |
| Plan the Space (3D) | C-56, C-119 | Left out on purpose (later) | Q-19: "Floor-plan mark-up and the 3D planner later, own modules" | — | — | — |
| An accounting-only member's access | C-27 | Left out on purpose (later) | F-16: "An Accounting role — Held" | — | — | — |
| Archive, "Archive instead?", the Archived list, Unarchive | C-74, C-130, C-131, C-134, D-274, D-275, D-285, D-286, D-293, D-294, D-312–D-314, D-346, D-347 | Left out on purpose | Q-25: "No Archive; the listing hides Completed until asked" | — | — | — |
| Project health score | C-39 | Left out on purpose | Q-07: "No health score; the reasons" | — | — | — |
| A Draft project turning Active by itself when viewed | C-18, C-19, C-40 | Left out on purpose | Q-02 + REG-917: Start the project asks for the start date | — | — | — |
| "This completes a payment milestone" on an update | C-316–C-318, D-39, D-86, D-106 | Left out on purpose | F-04: a stage tied to a milestone is *Ready to send* when that milestone is Done | — | — | — |
| Automatic "Schedule updated" posts on publish | D-06, D-94, D-95 | Left out on purpose | Q-15: Share changes with the list of what changes (the share offers "Tell {client} on WhatsApp") | — | — | — |
| The project page, its ways in, and tabs with their own addresses | C-01–C-05, C-15, C-16, C-34, C-35, C-61, C-67, C-70 | Built | — | — | — | `app/projects/[id]/(overview)`, `app/projects/[id]/[tab]/page.tsx`, `lib/projects/tabs.ts` |
| Header: Back to where you came from, crumb, name, number, type chips, phone header | C-43–C-53, C-58, C-80–C-84, C-86, C-90 | Built | — | — | — | `components/projects/project-frame.tsx` (`PageHeaderL2`, `.compactStage`) |
| The stage in the header, one status | C-11, C-12, C-71–C-73, C-85 | Built | — | — | — | `project-frame.tsx` (stage `MetaChip`), Q-03 |
| The project's ⋮ menu | C-59, C-60, C-68, C-87, C-88 | Built | — | — | — | `components/projects/project-menu.tsx` |
| Rename at any stage | C-64–C-66, C-91, C-92 | Built | No duplicate-name rule (the number tells projects apart) | — | — | `app/projects/actions.ts` `renameProject` |
| Invite the client to the portal | C-54, C-75, C-89, C-101–C-104, C-106–C-115 | Built | — | — | — | `components/portal/client-access-panel.tsx` |
| See the project as the client | C-57, C-69, C-124, C-125 | Built | — | — | — | `client-access-panel.tsx` (See it as the client) |
| Photo Renders (open in AI Visualizer) | C-55, C-116–C-118, C-120–C-123 | Built | — | — | — | `project-frame.tsx` `openVisualizer`; `project-menu.tsx` |
| Delete a project (Owner / Admin, soft, Undo, Deleted projects, Restore) | C-126–C-129, C-132, C-133, D-244, D-252, D-273, D-284, D-287, D-292, D-310, D-311, D-315, D-343–D-345, D-348 | Built | — | — | — | `app/projects/ending-actions.ts`; `components/projects/deleted-projects-sheet.tsx`; Q-26 |
| Complete handover: one ending, from the menu, the header and the bar | C-135, D-238–D-242, D-245, D-246, D-253, D-254, D-341 | Built | — | — | — | `components/projects/ending/*`; `lib/projects/next-step.ts`; Q-24 |
| An owner's review of a handover (approve, send back with a note, told) | C-139, C-140, C-142, C-143, D-243, D-250, D-268–D-270, D-272, D-281–D-283, D-289–D-291, D-299, D-300, D-302–D-304, D-321–D-328, D-333, D-340 | Built | — | — | — | `handover-bar.tsx`, `handover-dialog.tsx`, `lib/notifications/model.ts:87-89` |
| Read-only once completed, and Reopen | C-20, C-93, C-97, C-98, D-87, D-308, D-309 | Built | — | — | — | `lib/projects/handover-model.ts` `completedBlock`; `reopenProject` |
| Money card: contract value, invoiced, collected, outstanding; who sees money | C-21, C-153–C-157, C-176–C-180, C-188, C-197–C-202, C-208, C-209, C-218, C-219, C-223, C-225 | Built | — | — | — | `project-overview.tsx` (`money`); `lib/projects/money.ts`; F-02 · F-08 · F-17 |
| Needs attention, worst first, each opening where it's fixed | C-158–C-163, C-166, C-172, C-191–C-196, C-212–C-217, C-224 | Built | — | — | — | `lib/projects/attention.ts`; `project-overview.tsx` (`status`) |
| The project at a glance: progress, value, when it began, the team, next milestones | C-206, C-227–C-235, C-243, C-254–C-256 | Built | — | — | — | `components/projects/schedule/schedule-card.tsx`; `project-overview.tsx` |
| Set the dates and the agreed value | C-236, C-237, C-239–C-242, C-244, C-246, C-249, C-250, C-252, C-253, C-257 | Built | — | — | — | `project-dialogs.tsx`; `setProjectDates` · `setProjectValue` (+ Undo) |
| The team: assign and remove, who can see | C-238, C-245, C-251, C-258–C-268 | Built | (the commission % pill is held, Q-21) | — | — | `project-overview.tsx` (`team`); `AssignPopover` |
| Client and property card | C-269–C-272, C-282, C-283 | Built | — | — | — | `project-overview.tsx` (`client`, with `tel:` / `mailto:`) |
| Key documents: quote, contract, renders | C-295–C-304 | Built | — | — | — | `project-overview.tsx` (`docs`) |
| A quote or contract waiting on the client's signature | C-94 | Built | — | — | — | `lib/projects/queries.ts` `waitingOf` |
| The client's answers on stages raised on the project | C-99, C-100 | Built | — | — | — | `attention.ts` `client_concern`; bell `stage_confirmed` · `stage_changes` |
| Latest updates on the Overview | C-314, C-315, C-319, D-01, D-10–D-13, D-19, D-20, D-33 | Built | — | — | — | `project-overview.tsx` (`latestUpdates`) |
| Post an update with real photos, videos and documents; edit it; a discard guard | D-02, D-15, D-30, D-35–D-37, D-40–D-42, D-46–D-48, D-57, D-101, D-102, D-116, D-122 | Built | — | — | — | `components/projects/updates/update-composer.tsx`; `app/projects/updates-actions.ts` |
| Preview an update as the client sees it | D-16, D-43, D-49, D-115 | Built | — | — | — | `update-composer.tsx` (preview); `project-updates.tsx` ("As the client sees it") |
| Tie an update to a milestone | D-22, D-38, D-88, D-105 | Built | — | — | — | `update-composer.tsx` (milestone select) |
| Review: In review, Approve, Send back with a reason, Resubmit | D-08, D-23, D-25, D-28, D-32, D-50, D-51, D-61–D-63, D-74, D-78, D-79, D-82, D-85, D-108, D-111, D-112 | Built | — | — | — | `updates-actions.ts`; listing's "Needs my review"; Q-17 |
| Withdraw an update and publish it again | D-26, D-52, D-83, D-109, D-110 | Built | — | — | — | `withdrawBlock`, `republishProjectUpdate` |
| Delete an update, with Undo | D-27, D-31, D-53, D-84 | Built | — | — | — | `deleteProjectUpdate` / `restoreProjectUpdate` |
| Every update, searchable, grouped by day | D-14, D-24, D-34, D-55, D-58–D-60 | Built | — | — | — | `components/projects/updates/project-updates.tsx` |
| Post from a phone | C-326–C-329, C-332, D-04, D-17, D-44, D-45, D-56, D-99, D-103, D-104 | Built | — | — | — | the header's filled action at ≤767 (`project-frame.module.css`); composer as a sheet |
| Activity: a real log with who did it, chips, search, links; the Overview card | C-320–C-325, D-178–D-201, D-204–D-208, D-210, D-212, D-216–D-237 | Built | — | — | — | `components/leads/activity/lead-activity.tsx`; `lib/leads/activity.ts`; `PROJECT_ACTIVITY_CHIPS` |
| Who may do what, checked on the server | C-41, C-248, C-341–C-346, D-75, D-113 | Built | — | — | — | `lib/projects/policy.ts`; `forChange` in `app/projects/actions.ts` |
| Maison AI knows the project | C-17 | Built | — | — | — | `project-frame.tsx` `useMaisonAi` |
| Loading ghost and a not-found page | C-22–C-25 | Built | — | — | — | `components/projects/project-ghost.tsx`; `project-gone.tsx` |
| Studio-wide search and keyboard shortcuts (G P, C, /, ⌘K, ?) | K-22–K-25, K-236–K-240 | Built | — | — | — | `lib/global-search/model.ts:32`; `lib/keys/registry.ts:46` (REG-709, REG-711) |
| Bell, Maison AI panel, the rail's Projects count, the accepting-leads switch | K-11, K-12, K-26, K-27, K-35–K-38 | Built | — | — | — | `railBadges`; `notifications-panel.tsx`; `members.accepting_leads` (REG-612) |
| Undo, confirmations, the bulk bar, dragging, deep-link highlight | K-169, K-173, K-195, K-206, K-210–K-214, K-348 | Built | — | — | — | house snackbar Undo; `ConfirmDialog`; tasks' bulk bar; `schedule-timeline.tsx` drag; `pulse()` in `project-updates.tsx` |
| *Not a product feature* — page layout and data plumbing | C-07–C-10, C-13, C-14, C-26, C-31–C-33, C-136–C-138, C-226 | Not a product feature | 1.0's grid, gutters, queries and PATCH whitelist | — | — | — |
| *Not a product feature* — dead code, 1.0 bugs, and the map of other tabs | C-36–C-38, C-42, C-334–C-340, D-177 | Not a product feature | unused helpers, dialogs nothing opens, Chat Highlights; C-334…C-337 map other readers' tabs | — | — | — |
| *Not a product feature* — motion | C-28–C-30, C-76–C-79, C-247, C-305, C-309, C-347–C-358, D-64–D-72, D-202, D-203, D-295–D-298 | Not a product feature | 2.0's own motion by rule | — | — | — |
| *Not a product feature* — responsive layout details | C-210, C-333, D-97, D-98, D-100, D-319, D-320 | Not a product feature | — | — | — | — |
| *Not a product feature* — update kinds, usage events, data and stale comments | D-21, D-73, D-89–D-92, D-96, D-121, D-123, D-316, D-318 | Not a product feature | — | — | — | — |
| *Not a product feature* — the docs disagreeing with the code | D-349–D-357 | Not a product feature | — | — | — | — |
| *Not a product feature* — K: the shell's layout | K-01–K-10, K-13–K-21, K-28–K-34, K-39–K-45 | Not a product feature | — | — | — | — |
| *Not a product feature* — K: tokens, type, skins, dark mode | K-46–K-86 | Not a product feature | 2.0's design system by rule (see Uncertain) | — | — | — |
| *Not a product feature* — K: primitives and composites | K-87–K-126 | Not a product feature | — | — | — | — |
| *Not a product feature* — K: motion, hover, overlays | K-127–K-168, K-170–K-172, K-174–K-194, K-196–K-198 | Not a product feature | — | — | — | — |
| *Not a product feature* — K: loading, toasts, validation patterns | K-199–K-205, K-207–K-209, K-215–K-221 | Not a product feature | — | — | — | — |
| *Not a product feature* — K: responsive system | K-222–K-235 | Not a product feature | — | — | — | — |
| *Not a product feature* — K: keyboard reach and accessibility faults | K-241–K-253 | Not a product feature | — | — | — | — |
| *Not a product feature* — K: consistency audit and problems | K-254–K-347, K-349–K-358 | Not a product feature | — | — | — | — |

## Top gaps

1. **A direct project's client details can't be corrected**: no edit on the project, and the lead page redirects. Client access says "fix it on the lead
   first" with no lead page to fix it on, so a mistyped phone number blocks the portal invite for good. Project type can't change on any project. *(High, M)*
2. **No notes on a project.** A direct project can hold no note or call log at all. A Won project's notes sit on the lead's record, one menu away. *(Medium, S —
   carry the lead's Notes tab on, as Tasks and Files already are)*
3. **No handover summary.** The owner reviewing a handover, and the record afterwards, never see contract against collected, variation orders,
   planned against actual days, or delayed milestones together. *(Medium, M)*
4. **No "collection is behind progress" warning, and no "invoice differs from the schedule" warning,** on the Overview or the listing. 1.0 raised
   both on the Financial Summary. *(Medium, S)*
5. **Direct projects get no questionnaire**, and on Won projects it is reached only through the lead. *(Low, S)*
6. **The handover checklist can't defer one item with its own reason**, and it doesn't check for over-collection or a refund due. *(Low, S)*
7. **Update approvers are fixed to Owners and Admins.** 1.0 let a studio name other approvers. *(Low, S)*
8. **No bell for the team when an update goes straight to the client.** *(Low, S)*
9. **No "Post an update" from a milestone or when marking it done.** *(Low, S)*
10. **Small losses**: the before/after photo compare, counts on the tabs, and search on the client's update list. *(Low, S each)*

## Things the inventory missed

- **The client's satisfaction rating has no screen in 1.0.** `src/app/api/homeowner/projects/[id]/satisfaction/route.ts` takes a 1–5 rating
  and a comment, once only (it answers 409 after that), but nothing in `src/` calls `/satisfaction`. So the "Client Satisfaction" block on
  the closure dialog and the summary card (D-266, D-271) can never fill. A studio loses nothing in practice, but if 2.0 adds a closing
  summary, a client's rating at handover would be new, not a port.
- **1.0's Project Financial Report** (`src/components/projects/project-financial-report.tsx`, mounted at page.tsx:4826) would have drawn
  expected against actual revenue, costs and margin as bars, with a verification breakdown (unverified · ID-verified ·
  management-verified). C-338 lists it as a dialog that never opens, but no row says what it held. It is dead in 1.0, and it is money out
  (Q-20 / Q-35).
- The homeowner's update card in 1.0 carries the **milestone's invoice card** and a **search** past three updates (D-93 mentions both in
  passing). 2.0's portal Updates has neither (logged above as Partly).

## Uncertain

- **K-44 / K-78–K-86** (offline banner, welcome modal, coach marks, skins, dark mode) are app-wide 1.0 features a studio could miss. I
  grouped them under "Not a product feature" (styling and shell, 2.0's design system by rule), but they are not Projects-specific, and
  whether 2.0 wants dark mode or onboarding tours is not settled here.
- Whether anything else lets a **direct project** get questionnaire questions. I found only `createDirectProject`, which copies no bank,
  plus the redirect of every lead tab.
- 1.0's progress % was **weighted by payment share** (C-206). 2.0's Schedule card counts milestones done out of all milestones. I marked it
  Built, but the two numbers differ for the same project.
- Whether **1.0's named update approvers** (`approvers.progressUpdate`, D-76) were used by any real studio. If not, the gap is moot.
- **D-07's** automatic post depends on extension requests, which the schedule reviewer owns. If 2.0 has no extension requests at all,
  this row is part of that larger gap.
