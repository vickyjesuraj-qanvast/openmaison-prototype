# B · Every module's daily signals — the inventory (2026-10-26)

Study **B** of the Dashboard redesign (README). Read-only. The question: for every module, what data already exists that a studio
acts on each morning, what the Dashboard shows of it today, what each role wants from it, the door that opens it, and the honest
state. Read at `83d7c1f8` on `main`; line numbers are from that read. Six readers took a family each (Leads · Tasks / Meetings /
Messages / bell · Quotes / Contracts / X-Ray · Projects · Money / Reports / credits · AI tools / team / set-up / Qanvast Ops); the claims the
proposal will rest on were re-read by hand (the bell's overdue clock, Coming up's cap, the rail's Finance count, the "n more" count, the
quote follow-up that never closes, the AR period, compliance's count, the Tickets scopes, `/contracts` taking no parameters).

**Legend.** State: **✓ built and good** · **◐ built but weak** (the data exists; the count, the door, the rule or the surface is missing
or split) · **✗ not built** · **H held / decided out** (with its record). Roles: **O** Owner · **A** Admin · **Mg** Manager · **Ds** Designer ·
**Ac** Accounting · **Mk** Marketing. "D" = the Dashboard (`lib/dashboard/queries.ts` `fetchDashboard`, `components/dashboard/dashboard-view.tsx`).
"from ✓" = the door carries `?from=/dashboard` and its page names the way back.

---

## 0. What the Dashboard reads today

| Card | What it reads (one home each — S22's rule) | Who | Door |
| --- | --- | --- | --- |
| MAISON AI BRIEF | the greeting by the studio's clock (`greetingOf`), "n things need you — first, {top}", "n tasks overdue · n due today · n meetings today" (`dashboardBrief`), two questions by role (`asksFor`), the Ask box (Maison AI's own) | all | the FAB sheet |
| **Needs you** | one row per **place**: each visible project's own Needs you **top row** + "n more" (`projectRow`, `fetchProjectDetail`) · "n things in Finance's To do" (`fetchFinanceTodo` + `todoRows`, minus *waiting*) · the rail's approvals (`railBadges`: quotes, templates, Price book, AI credit asks) · Leads' Overdue follow-ups + Unassigned (`isOverdueLead`, assignees = 0) · my meetings to write up / briefs to save (`standingOf`) · compliance per project (`complianceCountsOf`) · Set up your studio (`fetchStudioSetup`) · Qanvast listing asks (`fetchListingRead`). Order: Needs your OK first, then Q-03's ranks (`orderNeeds`, `rankOfNeed`) | by role | each row's own |
| MY TASKS | the viewer's own open tasks (`myOpenTasks` — the rail badge's rule), Overdue · Due today · Upcoming, tick-done with Undo | all | `/tasks?open=` · `/tasks?scope=mine` |
| Coming up | this week and next: in-progress projects' `comingUp` (milestones, outside people, client meetings), my planned meetings, confirmed Hangouts; Accounting: To do's pay / collect rows due in the window | by role | each row's own |
| Where it stands | tiles by role (`tileLabelsFor`): Leads / My leads · Sales · Response time · Open projects / My projects · Contractors · Tickets · Messages · Owed to you · You owe (Ac) · Profit this month (`seesProfit`). **No tile is coloured** (REG-2007) | by role | each tile's report or listing |
| Workload | `workloadOf` lines (projects vs capacity) + `fetchMemberStats().active` open leads | O · A · Mg | `/projects?view=workload` |
| Site updates | the three newest published in 14 days (`recentSiteUpdates`) | O · A | the update on its project |
| From Market Insights | the featured article, else the newest (`liveArticles`, `featuredOf`) | all but Ac | the article |

Records: REG-2002…2013 (S22), REG-2233…2248 (S42 fixes), REG-2396 (Marketing), REG-2448 (Sales · Response time), REG-2476
(Contractors), REG-2514 (Tickets), REG-2914 (tiles fit at 320). Outcome `design-source/context/parity/30-pending-modules-build-2026-10-11/steps/outcome-S22.md`.

**What it never reads:** unseen leads (the rail's own Leads badge), anything about quotes but approvals, anything about contracts, X-Ray,
the client's portal, the Visualizer / Planner, AI credits balance, Qanvast lead credits / returns / reviews, invitations, integrations
health, GST, Xero, Studio health, Reports › Projects / Meetings, and anything "since yesterday".

---

## 1. Leads

| Signal | Data that computes it | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| New, nobody has opened it | `countUnseenLeads` `lib/leads/tasks.ts:202` (`seen_at` null, not deleted, not direct, Who sees leads); the listing's own `unseenIds` `app/leads/workspace.tsx:296` | **No** — only the rail's red "new" badge | O · Mk: "3 came in overnight — who has them?"; Ds: the new ones given to me | `/leads?scope=unseen` (rail `BADGE_LANDING`) — no `from` (listing is L1) | ◐ also counts Won / Lost; "seen" is global (one open clears it for all) |
| Overdue follow-ups | `isOverdueLead` `lib/leads/filters.ts:24` (an open task due before today, not On Hold / Lost) | **Yes** — Needs you row, red, rank 5 (O · A · Mg · Mk) | O: by member; Ds: my late calls in order | `/leads?scope=overdue` — no `from` | ◐ counts any task kind; a Won lead with a live project still counts (its tasks are the project's, REG-920) |
| Unassigned | `assignees.length === 0` `filters.ts:37` | **Yes** — row "n leads have no member yet", rank 4, *Assign* | O · Mk: assign now, with the suggestion | `/leads?scope=unassigned` — no `from` | ◐ any stage incl. Won / Lost; under *assigned* visibility a Manager's row is always 0 |
| To call today | `isCallTodayLead` `filters.ts:29`; scope `'today'` `lib/leads/listing-url.ts:22` | No | Ds: the first list of the day; O: the team's call load | `/leads?scope=today` (phone menu only, `stage-filter-dropdown.tsx:12`) | ◐ phone-only door; counts leads not calls |
| Not contacted / untouched | `lastContactOf` `lib/leads/queries.ts:110`; bell `untouched` derived `lib/notifications/queries.ts:37` (New, no contact after 30 min) | No | O · Mk: "new leads not called within the hour" | none (Last contact column, sort) | ◐ four rules (ST-15) |
| Stuck in a stage | `stageSince`, `daysInStage` `lib/leads/row-text.ts:18` | No | O: "Quote Sent for 14+ days: 5" | sort only `col=inStage` | ✗ no threshold, no scope |
| On Hold, due back | the On Hold log's `followUpAt` → `onHoldFollowUp` `queries.ts:149`; bell `hold_due` (derived) | No | O · Ds: "4 holds come back this week" | only `/leads?scope=on-hold` | ◐ no count anywhere; derived bell rows never badge |
| Lost, and why | stage Lost, `parked.reason · competitor` `queries.ts:153` | No | O: lost this week, to whom | `/leads?scope=lost` | ✓ data; no window |
| Leads count + added this week | `applyFilters` `datePreset:'7d'` + the week before (custom range) | **Yes** — Leads tile (O · A · Mk see the week before) | O: the **open** pipeline and its trend | `/leads` — no `from` | ◐ the value is every visible lead in every stage (the "All Leads" pill), not the pipeline |
| Response time | `fetchInsights` `lib/leads/insights.ts:45` → `insightsReport` `lib/leads/tat.ts:78`; `tatGrade` ≤8h good · ≤24h warn | **Yes** — tile (O · A · Mk), uncoloured | O: who is slow; how many assigned leads still wait for a first call (`awaitingOutreach`, `awaitingAssignment` `tat.ts:89`) | `/company/reports/leads?range=90` from ✓ | ◐ the waiting counts never reach D and have no door into the listing |
| Sales (won) · pipeline weighted · going quiet | `salesReport` / `salesTile` `lib/leads/sales.ts:153,334`; Open pipeline weighted `:220`; Going quiet `:239` (`QUIET_DAYS` 30) | **Yes** — Sales tile = won value only (O · A) | O: won, the likely value of what's open, what went quiet | `?report=sales&range=90` from ✓ | ◐ every section covers leads **added** in the range (an old lead gone quiet is missing); no section opens the listing |
| Review imported leads / duplicates | `fetchReviewRows` `lib/leads/queries.ts:273`; capture arrivals with a known phone land here (`lib/leads/capture.ts:28`) | No | O · Mk: "2 arrivals wait in Review" | a sheet on `/leads`, no address | ◐ invisible outside the listing |
| Lead capture health | `LeadCapture` (`lib/settings/types.ts:261`): per-webhook `received · created · duplicates · lastAt`, `webhookLog`, Gmail `lastSyncAt` | No | O · Mk: arrivals per source today; a source gone silent; a broken feed | `/company/integrations` from ✓ | ◐ failures are never recorded (the route's 400 / 401 aren't logged; `stats.failed` never rises); Gmail / Meta simulated |
| Qanvast returns · windows · appeals | `returnWindow` `lib/leads/return-model.ts:39` (display-only, REG-609), `appealUntil`, `returnTags` | No | O: returns still open to file; refusals still open to appeal | `/qanvast-ops` (scope is component state) | ◐ Qanvast's decision has no writer and no bell event |
| Qanvast lead credits | `fetchLeadCredits` `lib/qanvast-account/queries.ts:50` (seam `qanvast-account`) | No | O: balance, refunds on the way | `/qanvast-ops/credits` (O only) | ◐ stand-in; no low-balance event |
| Who can take a lead | `suggestMember` `lib/leads/suggest.ts:49` over `fetchMemberStats`; `members.accepting_leads` | Workload's "n open leads" | O: is anyone open to the unassigned? | `/company/members` | ◐ no "nobody is open to new leads" warning |
| Temperature / hot lead | — | — | — | — | **H** REG-606 (Q-10 "ignore this") |

Bell (`lib/notifications/model.ts`): stored `new_lead` (sent to O · A · Mk — `leadDeskIds`), `assigned`, `stage_changed`, `task_assigned`,
`hangout_registered`; derived and **never badged** `untouched`, `task_due`, `task_due_soon`, `hold_due`. No event for a Qanvast decision, a
capture failure or low lead credits.

## 2. Tasks (the studio's, a lead's, a project's)

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| My open tasks | `myOpenTasks` `lib/dashboard/queries.ts:62`; `MyWorkCard` groups | **Yes** — MY TASKS + the brief's counts | everyone: today's list, tick done | `/tasks?open=` · `?scope=mine` · `?add=1` — no `from` (and /tasks reads none) | ✓ |
| My overdue (rail badge) | `countOverdueTasks` `lib/leads/tasks.ts:148` | rail only | — | `/tasks?scope=mine&due=overdue` | ✓ |
| The team's overdue tasks | `/tasks` All + Overdue chip (`fetchStudioTasks` `tasks.ts:121`); Maison AI `teamAnswer` `lib/maison-ai/answers/work.ts:304` (open / overdue per member) | **No** | O · Mg: **who is behind** — the owner's first morning question | `/tasks?scope=all&due=overdue` (supported) | ✗ on D — REG-2008 kept tasks per member out ("no home") |
| Unassigned tasks | `/tasks?scope=unassigned`; the bell's Due also lists every unassigned task to O · A (`notifications/queries.ts:77`) | No | O: give them out | `/tasks?scope=unassigned` | ◐ e.g. the Qanvast return's "Respond to Qanvast team" (no assignee, `app/leads/return-actions.ts:74`) is on no one's MY TASKS |
| Approvals waiting (line on /tasks) | `countApprovalsWaiting` `tasks.ts:216` = D's *Needs your OK* rows | (it **is** D's count) | — | `/dashboard?from=/tasks` | ◐ a project counts only when its **top** row is an OK |
| Tasks the system raises | Follow-ups from a stage move, `setFollowUp`, a quote's due date (`app/leads/quotes-actions.ts:329`), a planned meeting (`app/meetings/actions.ts:120`), a render call-back (`app/renders/actions.ts:90`), contract automation (`lib/contracts/automation.ts:25`), compliance starter tasks, commission close | via MY TASKS | — | — | ◐ contract-automation and call-back tasks send no `task_assigned`; compliance starter tasks are **undated** (never in Overdue / Today / Upcoming); a quote's follow-up **never closes** when the quote is confirmed or signed (only `quotes-actions.ts:334,485` touch `leadTasks.quoteId`) |
| Outside people | `lead_tasks.external_*`, `lib/leads/outside.ts`; `external_sent_at` | in a project's Coming up | O · Ds: sent, not confirmed; an outside person's task overdue | — | ✗ no signal |

## 3. Quotes (and Quote X-Ray)

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| Waiting for your approval | `countQuotesToApprove` `lib/leads/tasks.ts:229` (approvers, while approval is required); the same rule as Tools › Quotes' chip and the lead tab's count | **Yes** — row, *Review*, rank 1 | O · A · backup approver: oldest first, who sent it | `/quotes?todo=approval` — **no `from`** (the templates / Price book rows have it) | ✓ (no age, no sender) |
| Sent back to me (changes asked) | `requestQuoteChanges` `app/quotes/actions.ts:203`; bell `quote_changes` | No | Ds: "Sent back to you: 2" | the editor's Next line only | ◐ no chip, no row |
| Waiting on the client | `waitingOnClient` `lib/leads/quote-filters.ts:82`; chip "Waiting on client · n" | No | O · Ds: sent 3+ days, no answer | `/quotes?todo=waiting` | ◐ no age |
| The client opened it | `client_viewed_at · client_last_viewed_at · client_view_count` (`stampQuoteSeen` `app/quotes/seen-actions.ts:22`, `isStudioVisit`); `viewedSince` | No | O · Ds: **"opened yesterday, not confirmed"** — the strongest follow-up cue | none (no chip, no filter) | ◐ no bell by design (REG-1703: "the cue sits on the record") |
| Expiring / expired | `expiringThisWeek` `quote-filters.ts:89` (chip); `clientValidityPassed` `:91`; `validityPassed` `lib/quotes/policy.ts:14` | No | Ds: revise or chase | `/quotes?todo=expiring` | ◐ three rules (ST-27) |
| Confirmed → send for signature | `confirmQuoteOnline` `actions.ts:333`; bell `quote_confirmed` | No | O · Ds | the quote's Next line | ◐ |
| The client asked for a change | `askQuoteChange` `actions.ts:404` (`change_asked_at · note`); bell `quote_change_asked` | No | Ds | — | ◐ no quote screen or list reads `changeAskedAt` |
| Drafts unsent · approved, not sent | `quote-card-words.ts:38` ("approved … · not sent") | No | Ds: "Approved, not sent: n" | — | ✗ no chip (Maison AI has a drafts scope) |
| Follow-up from the due date | `setQuoteDue` (REG-470 / REG-776) | via MY TASKS | — | — | ◐ never closes (above) |
| A variation order waiting approval | `money.ts:510` ("Waiting for approval") | only as a project money row | O · A | — | ◐ no count includes a VO in approval |
| The quote's next step | `nextStep` `lib/quotes/next-step.ts:63` (one line, one primary per state) | No | — | the editor | ✓ — never aggregated |
| Line comments | `quote_item_comments` | No | Ds | — | ✗ no notice, no count |
| Client declines a quote | `declineVariationOnline` refuses a normal quote (`decline-actions.ts:29`) | — | — | — | ✗ only VOs can be declined |
| X-Ray readings · stale | `fetchRecents` `lib/xray/queries.ts:38`; `stale` only inside `fetchComparison` `:78`; `sentAt` | No | O: readings this week, sent; Ds: "your reading is stale — run again" | `/quote-x-ray` | ◐ Recent can't flag stale; Pro only |

## 4. Contracts

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| Awaiting signature | chip "Awaiting signature (n)" `components/contracts/list/contracts-workspace.tsx:117`, `lead-contracts.tsx:127` | No | O: out 3+ days, n not opened | `/contracts` — **reads no parameter at all** (`app/contracts/page.tsx`) | ◐ no age, no deep link |
| Opened / not opened | `stampViewed` `lib/contracts/status.ts:51` (first open only, never reset on a resend); `awaitingLine` `lib/contracts/model.ts:26` | No | O · Ds | — | ◐ no bell |
| Signing link expired / closing | `linkState` `lib/contracts/policy.ts:58`, `linkLife` · `linkExpired` `lib/contracts/link.ts:37` | No | Ds: "2 links expired — send again" | — | ◐ |
| Signed, lead not Won yet | `lib/contracts/next-step.ts:83`; `lib/leads/won-on-signing.ts` | No | O | the Next line, the bell's href | ◐ no row |
| Bundles | `contract_bundles`, `sendBundle` · `signBundleOnline` | No | — | — | ✓ record-level |
| Automation (follow-up at +3 days, thank-you) | `afterSent` · `afterSigned` `lib/contracts/automation.ts:35` (both off by default) | via MY TASKS | — | — | ◐ |
| The project's Documents | `components/projects/overview/documents.ts:36` | — | — | with `from` | ✓ |
| Contracts tab count | — | — | — | — | ✗ (the Quotes tab counts approvals only) |

Bell: `contract_sent`, `quote_signed` (the key labels a **contract** signature, `model.ts:66`). Missing: viewed, link expired.

## 5. Projects

The registry is `NEED_PRODUCERS` (`lib/projects/needs-you.ts:122-282`) + the money kinds (`lib/projects/money-needs.ts:33`); red only for
"late, and ours" (REG-1448). D shows **the top row of each project and "n more"** (`projectRow`).

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| Each project's Needs you | ~25 kinds: hold · start · handover · review-handover · review-update · approve-done · approve-more-time · share-ask · message · ticket · mark · concern · choice-declined · milestone-waiting / -start / -done · target-passed · share · week-update · setup-* · vo-days · crew-gap | **Yes — one row per project** | O: every approval and every red row across projects; Mg: their team's red rows; Ds: my late milestones, replies owed | `/projects/<id>?run=…` (lands through the frame, keeps `from`) | ✓ per project · ◐ across projects |
| Approvals inside projects | the *ok* group: review-handover · review-update · approve-done · approve-more-time · share-ask · money-approve · cost-po / expense / bill-approve | only when it is the project's top row | O · A · named reviewers | `?run=review`, `updates?open=`, `schedule?open=` | ◐ an approval under "n more" is invisible from D (and undercounts the /tasks line) |
| Needs attention (listing) | `lib/projects/attention.ts` — 17 weighted reasons (tasks_overdue · setup_stalled · update_gap · milestones_late · waiting · choice_overdue · client_concern · payment_overdue · target_passed · hold_resume · collection_trailing · invoice_ready · schedule_asks · choice_declined · vendor_answer · ticket_escalated · ticket_waiting) | tile line "n need attention" | — | `/projects?scope=attention` | ◐ mixes the client's lateness with ours (ST-10) |
| Stages | Setting up · In progress · Completed + the On hold mark (`lib/projects/hold.ts`); scopes `components/projects/scopes.ts` | Open / My projects tile | O | `/projects?scope=…` | ✓ |
| Late milestones across projects | `isLate` `lib/projects/schedule-model.ts:248`; Reports `projectsReport` `late.now` | only inside one project's top row | O · Mg: "4 late across 3 projects" | Reports › Projects | ◐ |
| Slipping (at risk this week) | — | — | O · Mg | — | ✗ no rule anywhere |
| Share changes · asks · done asks | `share`, `share-ask`, `approve-more-time`, `approve-done`; `project_schedule_shares`, `project_share_requests`, `done_ask_json` | top row only | O · A | `schedule?share=1`, `?done=<id>` | ✓ |
| Weekly update owed | `week-update` (6 days neutral, 14 red); attention `update_gap` 14 days | top row only | O: projects with no update in 14 days | `updates?draft=week` | ◐ two clocks (ST-05) |
| Site updates published | `recentSiteUpdates` `lib/dashboard/updates.ts` | **Yes** — card (O · A, 3 in 14 days) | O | the update | ✓ |
| Updates waiting for review | `review-update`; `fetchUpdateFacts` | top row only | O · reviewers | `updates?open=` | ◐ |
| Drafts sitting unpublished | — | — | Ds | — | ✗ |
| Tickets waiting on the studio | `ticketTally` `lib/projects/tickets.ts:252` (= the rail's `countTicketsToAnswer`) | **Yes** — tile (O · A · Mg · Ds), "n open · n escalated" | O: escalated first | `/tickets` from ✓ — opens **Open**, not "waiting on you" (scopes are Open · Resolved and closed · All, `project-tickets.tsx:22`) | ◐ five counts (ST-13) |
| Client messages waiting a reply | `message` row; `unreadInChat` | top row only | Ds | `messages?compose=1` | ◐ |
| Floor-plan marks to answer | `floorPlanToAnswer` `lib/projects/floor-plan.ts:268` | top row only | Ds | `floor-plan?plan=&mark=` | ✓ |
| Choices declined / overdue | `choice-declined`; attention `choice_overdue` (`choiceFactsFor` `choices.ts:190`) | top row / attention | Ds | `choices?open=` | ◐ an overdue choice is attention only |
| Handover near · the owner's review | `nearHandover` `lib/projects/handover-model.ts:265`; `review-handover` | top row only | O: handovers this week / month | `?run=handover`, `?run=review` | ◐ no "handovers this month" (scope `month` = target end) |
| On hold, resume due | `resumeDue` `hold.ts:37`; bell `project_hold_due` | top row | O | `?run=resume` | ✓ |
| Contractors | `boardOf` `lib/projects/contractors-model.ts:224`; `crew-gap` (`contractors.ts:83`) | **Yes** — tile (O · A · Mg): free this week · over capacity · starting with nobody | O · Mg | `/projects?view=workload&of=contractors` (no `from`); none yet → Finance › Vendors from ✓ | ✓ (counts differ, ST-22) |
| Compliance to do | `complianceCountsOf` `lib/compliance/queries.ts:77` (mandatory, this phase) | **Yes** — a row per project, rank 8 | O | `/projects/<id>/compliance` from ✓ | ◐ the handover phase never reaches D (it starts at Completed, which D skips) |
| Workload | `workloadOf` `lib/projects/workload.ts:52` | **Yes** — card | O · A · Mg | `/projects?view=workload` (no `from`, every row the same door) | ◐ `over` computed, never drawn |
| Coming up | each project's `comingUp` (`lib/projects/queries.ts:641`) | **Yes** — merged | everyone | each row's own | ◐ capped at **6 per project before the merge** (`:649`); the project's "next invoice" row (no day) is dropped by D (`x.day !== null`) |
| Margin at risk, per project | `profitGrade` `lib/finance/profit.ts:82`; `money-insight` (loss · at_risk · tight) | top row only | O | the project's Money | ◐ |
| A VO raised from a client's ask, not sent | `lib/projects/client-asks.ts:81` | No | Ds | — | ✗ (`money-send-vo` covers the client's own picks only) |
| Design feedback (renders, layouts) | `lib/projects/designs.ts`; needs-you `designs: 0` (`:422`) | No | Ds | — | ✗ (see §11) |
| Reports › Projects | `projectsReport` `lib/projects/insights-model.ts:58` (started · completed · durations · late ended / due / now · collection days) | No | O monthly | `/company/reports/projects` | ✓ report · ✗ no on-time % |

## 6. Money in

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| Overdue invoices | `overdueOf` `lib/projects/money.ts:234`; `money-overdue` (Call after 3 reminders, `CALL_AFTER_REMINDERS`) | inside the To do row, a project's top row, the Owed tile's help ("S$… overdue") | O · Ac: **overdue by age** | `/projects/<id>/money?open=&do=remind` from ✓ | ✓ data · ◐ D gives one total |
| Owed to you | `buildReport('ar')` `lib/finance/reports.ts:286` (as of today) | **Yes** — tile (O · A · Ac) | O · Ac | `/company/reports/finance?report=ar` from ✓ | ✓ (D passes `'this_month'`; AR ignores it) |
| The client says they paid | `project_payments` `to_confirm`; `money-confirm` | inside To do; a confirmer's project row | Ac · confirmers | the project's Money | ✓ |
| Due today, and the client won't hear of it | `money-due-today` + `whyClientWontHear` (REG-1557) | a project's top row | Ac · O | — | ✓ |
| Ready to send | `money-ready` (from day 0) vs To do's *To collect* (after 7 days, `todo.ts:287`) | — | Ac | — | ◐ Accounting can't see it for a week |
| Credits to use / refund · overpayment held | `money-to-credit · to-refund · credit-held` | project rows only (never for Ac — D reads no project for them) | Ac | — | ◐ no studio-wide count |
| Cash coming in this week | Cash flow's "next 90 days" only (`buildReport('cashflow')`) | No | O · Ac | — | ✗ |
| Money in register | `fetchMoneyIn` `lib/finance/money-in.ts:66` | No | Ac | `/company/finance/money-in?kind=` | ◐ the Status filter can't be addressed |

Bell: `payment_overdue` (derived; ignores credit notes, ST-25), `invoice_ready`, `invoice_sent`, `invoice_reminded` (the third reminder, to O · A · Ac).

## 7. Money out & Finance

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| Finance › To do | `fetchFinanceTodo` · `todoRows` (`lib/finance/todo.ts`): O · A *approve · pay · collect · stuck*; Ac *pay · collect · stuck · waiting*; Mg · Ds *drafts · sent back · answered · claims* | **Yes** — one row "n things in Finance's To do" + per-group caption (books roles only) | O · Ac | `/company/finance` (no `from` — deliberate, L1) | ✓ O · Ac · ◐ a Designer's sent-back PO, their claims, their drafts never reach D (`fetchFinanceTodo` is skipped for them) |
| To approve | POs · expenses · C8 bills over limit / tolerance (`todo.ts:200`) · invoices · commission asks; rail `countFinanceToApprove` `todo-server.ts:92` | inside the To do row; the rail's Company badge | O · A | — | ◐ the rail's SQL omits C8 bills |
| Bills to pay this week / overdue | To pay group (the only red, `late`); bell `bill_due` (3 days ahead) | Ac only, via Coming up; O has no window | O · Ac | — | ◐ the bell rings for bills still waiting approval |
| PO delivered late | `cost-po-late`; bell `po_delivery_late` | top row only | O | the project's Money | ✓ |
| Repeating expenses | `raiseDueRepeats` | No | — | — | ✓ silent |
| Commission owed / asks | `commissionsOf` `lib/finance/commission.ts:168` | inside To do | Ds · Mg: **owed to me** | `/company/finance/commissions?open=` | ◐ a member's own never on D |
| Xero | `fetchXero` `xero-server.ts:201` (due · failed · lastSyncAt) | Stuck rows inside To do | Ac | `/company/finance/accounting` | ◐ simulated (REG-1308); last sync unseen |
| GST this quarter | `buildReport('gst')` `reports.ts:486` | No (Ac's Maison AI asks "What's the GST this quarter?") | O · Ac: what's due, when | `?report=gst` | ✗ no "return due" signal |
| Profit this month | `buildReport('pl')` tiles 2 · 3 | **Yes** — tile (`seesProfit`), margin in its line | O | `?report=pl&period=this_month` from ✓ | ✓ (two "profits", ST-32) |
| You owe | `buildReport('ar').tiles[1]` / AP | Ac's tile only | O too | `?report=ar` | ◐ |
| Issuing entities | `?entity=` on Reports, To do, Money in | D sums every entity | O with 2+ entities | — | ✓ |

## 8. Reports (Company › Reports — `REPORTS_TABS`, `lib/company/sections.ts:77`)

| Tab | Computes | Readers | Range on open | On D | State |
| --- | --- | --- | --- | --- | --- |
| Leads › Response time | `insightsReport` (legs, members, awaiting), graded `tatGrade` | O · A · Mk | 90 days | tile, ungraded | ✓ |
| Leads › Sales | `salesReport` (tiles, funnel, by source, open pipeline weighted, going quiet), before GST | O · A | 90 days | tile (won value) | ◐ added-in-range only |
| Projects | `projectsReport` | O · A · Mg (team) | range chips | — | ✓ |
| Finance | `buildReport` keys pl · ar · ap · profitability · cashflow · gst · vendors · expenses (Pro) · commissions · statement; grades on margin (20 / 10 %), AR bad at 31+ days late | O · A · Ac (`seesBooks`; pl / profitability need `seesProfit`) | **This year** (GST: this quarter); remembered per browser | Owed · You owe · Profit, ungraded | ✓ |
| Meetings | `tileFigures` `lib/meetings/report-model.ts:244` | O · A | — | — | ✓ |
| Health | `healthReport` `lib/studio-health/model.ts:164` (active members, sign-ins, records per module, idle) | O · A | rolling | — | ✓ (REG-2090) |

## 9. Meetings

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| Write up / save the brief | `standingOf` `lib/meetings/model.ts:41` | **Yes** — rows, **my** meetings only | Ds | `/meetings/<id>` from ✓ | ✓ (the list's chips count every visible lead's, ST-20) |
| Meetings today / ahead | `myMeetings`; Coming up | **Yes** — brief count + Coming up | everyone | — | ◐ one meeting counted three times (ST-20); "today" keeps meetings already over |
| Prepare me for my next | `nextMeetingFor` `lib/meetings/queries.ts:407` | Ds's ask button | Ds | the sheet | ◐ falls back to someone else's meeting under "Your next meeting" |
| The client opened / answered the invite | `client_viewed_at` (`app/meeting/actions.ts:34`); bell `meeting_answered` | No | Ds | — | ◐ bell only; no "not opened" |
| Reports › Meetings | above | No | O | `/company/reports/meetings` | ✓ |

## 10. Messages & the client portal

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| Unread conversations | `countUnreadChats` `lib/projects/messages.ts:390` (muted left out); `inbox()` `:284` (client · team · lead · lead-team · members' chats) | **Yes** — Messages tile (workspace roles) | Ds · O | `/chat?show=unread` (no `from` from the tile; /chat honours one) | ✓ (three unread rules, ST-19) |
| A client waiting a reply on a project | `message` row | top row only | Ds | `messages?compose=1` | ◐ |
| Held / failed messages | `lib/notifications/delivery.ts` (`held_large` → `send_held`; `message_failed` to O · A) | No | O | `/settings?section=notifications#sent-messages` | ◐ bell only; delivery is a stand-in |
| Client signed in / last seen | `homeowner_lead_links.opened_at · last_opened_at` (`stampOpened` `lib/portal/session.ts:216`, bell `portal_opened`) vs `portal_sessions.last_seen_at` (Maison AI only) | No | O · Ds: who came in, who went quiet | the Client access panel | ◐ two sources (ST-33) |
| What waits on the client | portal `needsOf` `lib/portal/needs.ts:164`; studio side `fetchPortalFacts` `lib/portal/waiting.ts:14` | No (inside project attention / `?scope=waiting`) | O | `/projects?scope=waiting` | ◐ no roll-up |
| What the client did since yesterday | bell events: question_answered · choice_made · payment_to_confirm · stage_confirmed / stage_changes · quote_confirmed · quote_change_asked · floor_plan_* · render_feedback · layout_viewed · ticket_* · chat_message · meeting_answered | only through "What did I miss?" | O · Ds | each row's record | ◐ no studio-wide feed |
| Viewed stamps | quotes (last open, count) · contracts and bundles (first open) · render links · layouts · meetings — all behind `isStudioVisit` | No | — | — | ◐ only a layout's first open rings the bell |
| The portal paused by the platform | `lib/platform.ts` `portalOff` · `messagesPaused` | No | O | Company › Client portal | ◐ a paused queue is a real blocker |

## 11. AI tools — Visualizer, Planner, Floorplan to 3D, AI credits & plan

(There is no `render_feedback` table: client feedback lives in `render_consultation_requests.kind` and `render_annotations`, schema :1594 / :1612.)

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| A client's note / pin on a render, unanswered | `pickFavourite` · `leaveNote` · `clientPin` · `clientReply` (`app/renders/actions.ts`); bell `render_feedback`; `replyToNote`, `setPinStatus` | No | Ds: "Mrs Tan pinned 2 notes on Living room V3 → Reply"; O: n waiting | `/visualizer/<id>?room=&v=&pin=` from ✓ | ◐ nothing counts "no studio reply" though the data supports it |
| The client asked to be called back | `askCallBack` `app/renders/actions.ts:77` → a Follow-up task | via MY TASKS | Ds | — | ✓ |
| A render link not opened / expiring | `render_share_links.viewCount · lastViewedAt · expiresAt` | No | Ds | — | ◐ only Maison AI lists them (`designsWaitingAnswer`) |
| A layout opened / changes not shared | `space_layout_shares.firstViewedAt`, bell `layout_viewed`; `rev > sharedRev` | No | Ds | `/planner/<id>` | ✓ record · ◐ daily |
| Floorplan to 3D | `lib/floorplan-3d/service.ts` (`floorplanLive()` false; samples only) | — | — | `/floorplan-3d` | stand-in (REG-2800) — nothing to signal |
| AI credits left · running low | `fetchCreditSummary` `lib/credits/queries.ts:38`; `poolStateOf` · `toneOf` · `levelOf` `lib/credits/model.ts:87-117`; the rail ring | No (the rail ring + the bell) | O: credits left against days in the period | `/company/plan` | ◐ the bell (75 / 90 % used) and the ring (<10 % left, or by pace) disagree (ST-07) |
| Asks for credits | `countCreditAsks` | **Yes** — row (O) | O | `/company/plan?from=` ✓ | ✓ |
| A member's cap reached · payment failed | bells `credit_amount_reached`, `payment_failed` | No | O | — | ◐ payments a stand-in |
| Upgrade offers (Free) | `nudge_state`, bell `upgrade_offer` | No | — | — | **H** bell-only by design (REG-2135) |

## 12. Marketplace & Market Insights

| Signal | Data | On D today | Door | State |
| --- | --- | --- | --- | --- |
| Deals ending (≤3 days) | `endsSoon` `lib/marketplace/model.ts:147` | No | `/marketplace?deal=` from ✓ | **H** — S22 decided "not the studio's work: calm"; sample data (`feeds`) |
| Market Insights article | `liveArticles`, `featuredOf` | **Yes** — card (not Ac) | `/market-insights/<id>` from ✓ | ◐ every demo article is a sample; RSS a stand-in; no "new since you looked" |

## 13. Team

| Signal | Data | On D today | Each morning | Door | State |
| --- | --- | --- | --- | --- | --- |
| Load (projects vs capacity, open leads) | `workloadOf`, `fetchMemberStats().active` | **Yes** — Workload card | O · Mg | `/projects?view=workload` | ◐ "over" never drawn; no `from` |
| Open to new leads | `members.accepting_leads` (the suggestion's gate) | No | O: is anyone open to the unassigned? | `/company/members` | ◐ |
| Invitations waiting / expired / failed | `studio_invitations`, `inviteStateOf` · `inviteLine` `lib/company/invitations.ts:68-82`; bell `member_joined`, `message_failed` | No | O · A | `/company/members?open=` from ✓ | ◐ the row and the bell only |
| Who is in today / last active | `studio_sessions.lastSeenAt` (renewed only for remembered sessions, hourly); Studio health's `lastActive` | No | O | — | ✗ no last-active anywhere on Members (REG-1990) |
| Signature not set · PayNow missing | `fetchYourProfile` `lib/company/your-profile.ts:52` | No | each member | `/profile` | ◐ shown only on the Members row |
| The team's overdue tasks · commission owed to me | §2, §7 | No | O · Mg · Ds | — | ✗ / ◐ |

## 14. Notifications (the bell) and Maison AI

| Signal | Data | On D today | State |
| --- | --- | --- | --- |
| Unread notices | `fetchFeed` · `unreadCount` `lib/notifications/queries.ts:191,317`; ~90 kinds in `EVENTS` (`model.ts:52`) | only through "What did I miss?" (`missedAnswer`) | ✓ |
| Due (derived) | `derivedDue` `queries.ts:35` — untouched leads, task due / soon, milestones, holds, payment overdue, invoice ready, bills, PO late, Xero | never in the badge | ◐ derived rows count nowhere |
| The 8 AM summary | `sendDueSummaries` (S18; `summaryParts`) | No — email | ◐ a second morning list beside D; the sweep is a stand-in |
| Ask, answered by rule | `lib/maison-ai/intents.ts:71` → `answer.ts:377`: missed · overview · my_tasks · team · leads_attention · approvals · late · owed · pnl · next_meeting · portal_opened · issues… | the brief's two buttons + the Ask box | ✓ (the model is the `readQuestion` seam) |

## 15. Studio set-up, Profile, Integrations, Studio health

| Signal | Data | On D today | Door | State |
| --- | --- | --- | --- | --- |
| Set up your studio | `fetchStudioSetup` `lib/studio-setup/queries.ts:57` | **Yes** — row (O · A) | `/settings?section=studio#studio-setup` from ✓ | ✓ (REG-1764) |
| Qanvast listing asks | `fetchListingRead` | **Yes** — row | `/company/profile#qanvast` from ✓ | ✓ (the answer is played, a stand-in) |
| Registrations expiring (CaseTrust, bizSAFE…) | `compliance_studio` = `{done, by, at}` only | — | — | ✗ no expiry date stored (REG-1369) |
| Integrations health | webhook counters; Gmail `lastSyncAt`; Xero `failed`; held / failed messages | only Xero's Stuck rows inside To do | `/company/integrations` | ◐ / ✗ "Gmail disconnected", "last sync 5 days ago", "webhook failing" can't be said |
| Studio health | `fetchStudioHealth` `lib/studio-health/queries.ts:23` | No | `/company/reports/health?range=` from ✓ | ✓ report |

## 16. Hangouts, reviews and Qanvast Ops

| Signal | Data | On D today | Door | State |
| --- | --- | --- | --- | --- |
| Hangouts today / ahead | `fetchHangouts` `lib/hangouts/queries.ts:46` | **Yes** — Coming up (O · A all; Ds on the plan) | `/qanvast-ops/hangouts/<id>` from ✓ | ✓ (sample feed; not marked "Sample", ST-55) |
| A Hangout's follow-ups owed · chats today | `HangoutResults.followUp` `:90` | No | — | ◐ |
| Reviews waiting a reply | `Review.response`, show `'waiting'` (`lib/qanvast-account/model.ts:215`) | No | `/qanvast-ops/reviews` (no `?show=`, no `from`) | **H** "No Dashboard row, no bell" by design (outcome-S41b5) · stand-in |
| Lead credits | §1 | No | `/qanvast-ops/credits` | ◐ |

---

## 17. Stitching problems — the same fact told two ways

Numbered for the proposal to point at. ✔ = re-read by hand.

### A. Clocks and windows
- **ST-01 "Overdue" is two clocks.** ✔ The listing, the rail, MY TASKS and /tasks call a task overdue from the day after its due day
  (`isOverdue`, `lib/format.ts:229`); the bell's `task_due` says "Overdue: …" the moment `due <= now` (`lib/notifications/queries.ts:81`). A
  date-only task due today is red "Overdue" in the bell from midnight while MY TASKS says *Due today* and the rail doesn't count it. Cash
  flow's "Overdue now" is a third (anything due before now, `reports.ts:416`).
- **ST-02 Four windows on one page, unlabelled except in help lines.** Leads: 7 calendar days vs the 7 before · Sales and Response time:
  90 days rolling · Profit: this calendar month · Owed to you: as of today · Reports › Finance opens on *This year* · the credits month is the
  billing period. Maison AI's "7 days" is `now − 7×24h` (`work.ts:177`); a Qanvast return window counts 24-hour blocks
  (`return-model.ts:42`) against the house's calendar days (REG-1131).
- **ST-03 The weekly update has two clocks and two sentences** — Needs you: calendar days, 6 neutral / 14 red, "Tell X about this week";
  attention: elapsed 24h blocks, "No update for n days".
- **ST-04 A ready invoice**: a project row from day 0 (`money-needs.ts:186`), To do only after 7 days (`todo.ts:287`).
- **ST-05 Credits "low"**: the bell at 75 % / 90 % used (`ledger.ts:389`), the rail ring below 10 % left or by pace (`model.ts:89`).

### B. Counts
- **ST-06 Finance.** ✔ The rail's Company badge counts To approve in four SQL counts — POs, expenses, invoices, commission asks
  (`countFinanceToApprove`) — **no C8 bills**; D's row counts the whole To do minus *waiting*; Accounting's badge is 0 while their row says n.
- **ST-07 Projects that need attention.** The rail badge counts completed projects too; the Open projects tile counts non-completed but opens
  `?scope=attention`, which includes completed; the listing's tile is red, D's plain; a Designer's *My projects* includes completed and says
  "n in progress" (the rail-vs-My-projects split was **kept** by his S42 call A·4).
- **ST-08 Attention vs Needs you on whose lateness counts.** Attention raises a project for the client's waits (milestones waiting on the
  client, choice overdue, payment overdue, `waiting`) and for overdue tasks; Needs you keeps these neutral or rowless (REG-1448). The badge,
  the tile and D's rows therefore never add up.
- **ST-09 "n more".** ✔ A project row's "n more" counts the money rows D dropped because To do lists them (`queries.ts:94-96`).
- **ST-10 Approvals, four counts.** The /tasks line = D's OK rows (a project only when its top row is an OK) · Maison AI `approvals` = quotes +
  Finance (`work.ts:490`) · the bell's in-row asks (`ASK_KINDS`) · Maison AI's overview counts quotes without Who sees leads (`work.ts:371`).
- **ST-11 Tickets, five counts and three names.** Tile / rail: studio's turn, any age · the project tab: this project · Needs you: studio's
  turn or escalated, mayChange only · attention: waiting > 2 days or escalated. Words: *Tickets* (studio) · *Issues reported* (Studio health,
  `studio-health/model.ts:89`) · *issue* (the client) · `/escalations/<id>` (1.0's redirect).
- **ST-12 "No member yet", three ways** — D: any stage, any age · Reports' *awaiting assignment*: open leads in 90 days (`tat.ts:89`) ·
  Maison AI: leaves out Won (`work.ts:195`).
- **ST-13 "Not contacted", four ways** — `lastContactOf` counts a held meeting; Response time's first outreach doesn't (`insights.ts:27`), so a
  lead met at a Hangout has a Last contact yet "awaits outreach"; Sales' `neverContacted`; the bell's `untouched` (New only, and misses
  `direct = false`).
- **ST-14 "Needs attention" means four things** — the leads menu group is now *To do* (`stage-filter-dropdown.tsx:58`); D's caption says
  "Leads · Overdue follow-ups"; Maison AI's "Which leads need attention?" has its own rule (drops leads with a project, adds due today and
  New-not-contacted, `work.ts:186`); the rail's Projects badge also "needs attention".
- **ST-15 "Overdue follow-up" = any overdue task** (`filters.ts:24`), while `TASK_KINDS` has its own *Follow-up*; and the table / kanban tag
  On Hold / Lost leads *Overdue* (`table.tsx:372`, `board.tsx:90`) though the rule leaves them out (only the phone card follows it).
- **ST-16 Unread, three rules.** Rail / tile: conversations, muted left out · the inbox's "Show the unread (n)": muted included · a project's
  tab: messages, mute ignored; and the bell's `chat_message` rows stay unread after the chat is read — one message, two badges.
- **ST-17 One meeting, three times.** In Coming up, in "1 meeting today", and as its reminder task "Meet X — …" in MY TASKS and "1 task due
  today"; a meeting already over still counts as today's while it is also a *Write up* row. The write-up rows are mine on D, every visible
  lead's on the list's chips and in Maison AI.
- **ST-18 Compliance.** D: mandatory items (`complianceCountsOf`) · the view: "n items to do this phase", all open items.
- **ST-19 Crew gaps.** The tile counts Setting-up sites; the `crew-gap` row In progress only (`contractors-model.ts:105` vs `needs-you.ts:277`).
- **ST-20 Late milestones, three scopes.** Reports `late.now` includes On hold · attention pauses On hold but counts Setting up · Needs you
  In progress and mayChange only; `target_passed` fires for Setting up in attention, not in Needs you.
- **ST-21 Owed, three amounts.** AR *Owed to you* = every sent invoice's balance, due or not (`reports.ts:289`) · To do's "To collect … owed"
  = overdue net of payments to confirm + payments to confirm + ready-but-unsent after 7 days (`todo.ts:347`) · the Money tab's *To collect* =
  `outstandingMinor`; AR's overdue is gross, the Money tab's net.
- **ST-22 You owe vs To pay.** AP leaves commission out (`reports.ts:202`); To pay includes it (`todo.ts:259`).
- **ST-23 The bell on money.** `derivedPaymentRows` ignores credit notes (a credited invoice can still ring Overdue, `payments.ts:396`);
  `derivedBillRows` rings for bills waiting approval that To do and AP hold back (`bell.ts:31`).
- **ST-24 Quotes "waiting on client".** The chip: Sent to Client or approved-and-sent, any age · Maison AI: Sent to Client, 3+ days
  (`work.ts:269`) · the Next line for an approved quote says "send it" while the list says it waits on the client.
- **ST-25 Expiring / expired.** Chip: 7 days, drafts and quotes in approval included · card words: 14 days, client-held only · Maison AI: 14
  days, past dates included; *Expired* by `clientValidityPassed` (incl. approved-and-sent) vs `validityPassed` (Sent to Client only) — the
  list can say Expired where the editor offers no Revise.
- **ST-26 Awaiting signature** counts without letters to read; the press filters Sent to Client, which includes them.
- **ST-27 "Quote sent"**: Sales counts leads; Studio health counts quotes by `client_sent_at`.
- **ST-28 Capacity, three measures.** Workload: projects vs capacity (green / yellow / red chips) · the Assign suggestion: ≤3 active leads
  ("Currently has capacity") · Members: a "Projects at once" select with no load; the project-team suggestion reuses the lead suggestion and
  ignores project capacity. Lead counts: Members "{n} leads" (all, Won / Lost included) vs D "{n} open leads".
- **ST-29 "Active".** `members.is_active` = not deactivated; Studio health's *Active members* = acted in the range; Invited members count as
  team (the set-up step, Workload's "Room for 4 more", the suggestion).
- **ST-30 Two "Profits", two GSTs.** D's *Profit this month* = P&L, invoiced, before GST; a project's Money and Profitability = contract minus
  committed, with GST. Sales and P&L are before GST; Owed, You owe, To collect, To pay include it.
- **ST-31 The portal's "opened".** Maison AI reads `portal_sessions`; the lead page and Company › Client portal read `last_opened_at`.
- **ST-32 Favourites.** Designs takes the latest per link; Maison AI counts every favourite row, moved picks included.
- **ST-33 Two "waiting on client" lists.** The listing's `waitingOn` vs the Overview's *With {client}* (portal `needsOf`); "Floor plan asked"
  is only in the second.

### C. Words
- **ST-34 Unseen** — the rail says *new* in red; the listing says *Unseen* with a primary band; D says nothing.
- **ST-35 Viewed / Opened** — quotes: "Viewed {date}" (desk), "opened {date}" (card), "opened twice (last 2d ago)" (Next line); contracts:
  "Opened 2d ago" / "Not opened in 3d" (REG-1703 says the list reads "Viewed {date}"); quotes stamp the last open, contracts the first.
- **ST-36 A contract out** — Awaiting signature · Sent to client · With {first} for signature · went out for signature · Sent {date} · not
  signed yet · the raw status "Sent to Client".
- **ST-37 Approval** — Sent for Approval · "Quotes · Sent for approval" · "Waiting for my approval" · "n quotes wait for your approval".
- **ST-38 Messages** — *Messages* on the rail and tile, "conversations" in the tile's line, *Chat* in code and the address `/chat`.
- **ST-39 A late payment** — Payment overdue · Overdue · past due · Late by · n days late.
- **ST-40 Meeting notes** — "Write up the meeting with X" · "Notes to write up" · "To write up" · "Its notes aren't in yet".
- **ST-41 Nobody on a project** — "No one yet" (D) · "Assign someone" + "n with no one on the team" (Workload).
- **ST-42 Lead availability** — "Open to new leads" · "Closed to new leads" · `accepting_leads`; Workload and D never show it.
- **ST-43 Won** — Hangouts say *Converted* (reason *Signed*); Sales says *Won*.
- **ST-44 Next follow-up** — the On Hold tooltip "Next follow up: {hold date}" vs the *Next follow-up* column (the earliest task).
- **ST-45 Settings copy vs code** — `new_lead` "Owners and Admins" goes to Marketing too; `quote_confirmed` reaches more than "the lead's
  members"; `quote_signed` is a contract's signature; the Reviews page comment says Owners, the policy O · A.
- **ST-55 "Sample"** — the Market Insights card marks a demo article *Sample*; a Hangout in Coming up and the Marketplace's deals come from
  sample feeds too and say nothing.

### D. Colours
- **ST-46 Graded there, plain here.** D's tiles are uncoloured by decision (REG-2007, S-05) while Reports grade the same figures (Response
  time, margin tiers, AR bad at 31+ days); the Projects listing's *Needs attention* tile is red, D's line plain; Workload's *over* is red on
  its view, plain on D; contractors over capacity likewise.
- **ST-47 The client's lateness painted red** on a project's Money tab (*To collect* turns red) and in the Money in register
  (`INVOICE_STATE_TONE.overdue = 'red'`), against S-05 kept by To do, money-needs and D.
- **ST-48 Due today** amber in the tasks popover, primary on the task card, red in the bell.
- **ST-49 Yellow** = Expired on quote / contract cards, "Waiting for approval" on VO tags.
- **ST-50 Margin at risk** = danger in Money insights, a neutral Needs you row.
- **ST-51 A hold date** turns red on the phone card once passed; the table's "Till" never does.

### E. Doors and the way back
- **ST-52 `?from=/dashboard` is missing on**: ✔ the quotes approval row, the Leads rows, the Leads / Projects / Messages tiles, Workload's ↗
  and rows, the Contractors tile (when contractors exist), MY TASKS' doors; the Finance row has none **on purpose** (To do is L1). Present on
  the project rows, templates, Price book, credits, meetings, compliance, set-up, Qanvast listing, Sales, Response time, Tickets, Owed,
  Profit, site updates, the article.
- **ST-53 Doors that can't land on what they name**: Tickets has no "waiting on you" scope (the tile opens Open) ✔; `/contracts` reads no
  parameter ✔ (Awaiting signature can't be addressed); Money in's Status and To do's group chips are local state; Qanvast Ops › Leads' scope,
  Reviews' *waiting* and Review imported leads have no address; *to call today* is missing from the desk's menu; the Tools popover's Quotes
  tile opens plain `/quotes` even with a count; the phone dock shows no Tools count; Accounting's Coming up money-out rows open
  `/company/finance` with no `?open=` though To do takes one; Insights' "Which projects have overdue milestones?" opens a 17-reason scope.

### F. Hidden under one row
- **ST-54 One row per project.** ✔ Approvals, margin slipping, client waits and late milestones below a project's top row can't be seen from
  D; each project's Coming up is cut to six **before** D merges them ✔; the project's next-invoice line (no day) is dropped.

---

## 18. The signals, ranked for an owner's daily screen

Ranked inside each band by what an Owner acts on first. "D" says whether today's Dashboard shows it (✓ fully · ◐ partly or hidden · — not at
all). Admins match Owners except the plan and buying credits.

### ① What needs me now (mine, today)
| # | Signal | Source | D |
| --- | --- | --- | --- |
| 1 | **Every approval waiting on me**, across modules — quotes, templates, Price book, credit asks, To do's To approve (incl. C8 bills), and the projects' OK rows (handover review, update review, done / more-time / share asks, money approvals) | `railBadges`, `todoRows` *approve*, needs-you *ok* group | ◐ the project ones only when they top their project |
| 2 | **Late and ours** — my overdue tasks; milestones past their end; target ends passed; tickets escalated or waiting > 2 days; the 14-day update; a hold past its resume day; bills overdue | `myOpenTasks`, needs-you *late* tones, To pay `late` | ◐ tasks yes; the rest one per project |
| 3 | **A client waiting on us** — messages unanswered, floor-plan marks, render notes / pins unanswered, "asked for a change" on a quote, a confirmed quote to send for signature, a declined choice, a payment to confirm | needs-you *client* group, `quote_change_asked`, `quote_confirmed`, render feedback | ◐ project rows only; quotes and renders — |
| 4 | **New leads to own** — unseen, unassigned, not called within the hour | `countUnseenLeads`, assignees = 0, `untouched` | ◐ unassigned only |
| 5 | **Money to move today** — payments to confirm, invoices ready, due today the client won't hear of, bills due today | To do *collect* / *pay*, `money-due-today` | ◐ one To do row |
| 6 | Meetings to write up, briefs to save | `standingOf` | ✓ |

### ② What's at risk (late soon, or the client's lateness)
| # | Signal | Source | D |
| --- | --- | --- | --- |
| 1 | Overdue invoices **by age** (the client's — neutral) | AR buckets, `overdueOf` | ◐ one total in a help line |
| 2 | Quotes opened but not confirmed · waiting 3+ days · expiring this week; contracts out 3+ days or not opened; signing links closing / expired | `client_view_*`, `waitingOnClient`, `expiringThisWeek`, `awaitingLine`, `linkLife` | — |
| 3 | Work starting with no contractor; contractors over capacity; milestones slipping | `crew-gap`, `boardOf`; slipping ✗ | ◐ tile only |
| 4 | Margin slipping on a project (loss · at risk · tight) | `money-insight`, `profitGrade` | ◐ |
| 5 | Leads going quiet (30 days), stuck in a stage, holds due back this week | Sales `QUIET_DAYS`, `daysInStage`, `hold_due` | — |
| 6 | The team over capacity; nobody open to new leads; overdue tasks by member | `workloadOf`, `accepting_leads`, /tasks | ◐ load uncoloured; the rest — |
| 7 | AI credits running out before the period ends; Qanvast lead credits low | `poolStateOf`, `fetchLeadCredits` | — |
| 8 | Something broken — a capture source silent, Xero pushes failed, a message held or failed, the portal paused | capture stats, `fetchXero`, delivery, `lib/platform.ts` | ◐ Xero inside To do |

### ③ How the business is doing (glance)
| # | Signal | Source | D |
| --- | --- | --- | --- |
| 1 | Won this period + the open pipeline's likely value | `salesReport` | ◐ won only |
| 2 | Cash: owed to you (+ overdue), you owe, cash due in over the next 30 days | `buildReport('ar' / 'cashflow')` | ◐ Owed only (You owe for Ac) |
| 3 | Profit and margin this month (named apart from a project's profit) | `buildReport('pl')` | ✓ |
| 4 | Response time, graded | `insightsReport`, `tatGrade` | ◐ ungraded |
| 5 | Projects running; finished on time vs late | `projectsReport` | ◐ count only |
| 6 | Leads added this week vs last, by source | `applyFilters`, Sales *By source* | ◐ count only, every stage |
| 7 | GST this quarter (O · Ac) | `buildReport('gst')` | — |
| 8 | Studio health (monthly: who is active, who is idle) | `healthReport` | — |

### ④ What changed since yesterday
| # | Signal | Source | D |
| --- | --- | --- | --- |
| 1 | What clients did: opened a quote, confirmed, signed, paid / said they paid, answered, picked, marked the plan, left render feedback, opened the portal | bell events (stored), `client_view_*`, `viewed_at` | ◐ only via "What did I miss?" |
| 2 | Leads that arrived (by source), won, lost | `stage_logs`, `lead_events`, capture stats | — |
| 3 | Money that came in | To do › Recently (`recentRows`, `recentMoneyIn`) | — |
| 4 | Site updates published, tickets raised | `recentSiteUpdates`, tickets | ◐ updates card |
| — | **Not built:** a "since your last visit" mark per member (no `dashboard_seen_at` or the like); a studio-wide activity feed (Activity is per lead / project, `lib/leads/activity.ts`) | | ✗ |

### ⑤ What's coming
| # | Signal | Source | D |
| --- | --- | --- | --- |
| 1 | Milestones starting / ending, outside people, client meetings, my meetings, Hangouts (this week and next) | `comingUp`, `myMeetings`, `fetchHangouts` | ✓ (capped per project) |
| 2 | Money falling due (in and out) | To do rows with `due` | ◐ Accounting only |
| 3 | Handovers near; holds due back; quotes expiring; signing links closing; the GST quarter's end; the credits period renewing | `nearHandover`, `resumeDue`, `expiringThisWeek`, `linkLife`, `ensurePeriod` | — |
| 4 | My upcoming tasks | MY TASKS *Upcoming* | ✓ |

### By role — what changes
- **Admin:** the Owner's page; no plan buying or credit asks (Owner only).
- **Manager:** their team's scope (Who sees leads, `worksOn`); the team's overdue tasks and red rows; Workload over their team; no money.
- **Designer:** mine — today's calls (*to call today*), my late milestones, clients waiting on **me** (messages, marks, render notes, a
  quote opened / asked for a change), quotes sent back to me, approved-not-sent, links to resend, my meeting to prepare, commission owed to
  me, my Finance drafts / sent-backs / claims (all missing from D today but the meetings).
- **Accounting:** To do by group, cash in and out this week, overdue by age, bills (incl. those waiting approval), GST this quarter, Xero
  health, credits to use or refund. D reads **no project** for them, so every project money row is lost.
- **Marketing:** the lead desk — unseen, unassigned, not called within the hour, Response time (graded), arrivals by source, capture health,
  the Review queue. Today: Unassigned · Overdue follow-ups · Leads · Response time.

---

## 19. Missing, not built, held — across the app

### Not built — no rule or record exists
- A studio-wide **"since your last visit"** and an activity feed across records.
- **Slipping** milestones (at risk before they are late); projects' **on-time %**; **handovers this month**.
- **Cash in this week** outside Cash flow; a **GST return due** signal.
- **Registrations expiring** (no expiry date stored, REG-1369).
- **Last active** per member (REG-1990's sessions aren't shown); the **team's overdue tasks by member** on any summary (REG-2008).
- A **lead score / likelihood to close** (S22: "no lead score"); **win rate** as a function.
- A client **declining** a normal quote; **drafts / approved-not-sent** as a signal; **line comments** notices.
- A **failed-webhook** log; Qanvast **return decisions** (writer + bell); **low lead credits** event.
- Studio-side counts of **render feedback** and **unopened render links**; **outside people** confirmations; a VO from a client's ask
  waiting to send; site update **drafts** left unpublished.

### Built but invisible from the front door — the data is there, no count or door
Unseen leads · to call today (desk) · stuck in stage · holds due back · Review imported leads · capture health · Response time's waiting
counts · Sales' going quiet and weighted pipeline · quotes sent back / waiting / opened / expiring / change asked / confirmed · contracts
awaiting / not opened / links expiring / signed-not-Won · X-Ray stale · approvals below a project's top row · late milestones across
projects · margin slipping · credits to use / refund · You owe (for Owners) · GST · Xero last sync · the portal's last seen and what waits on
clients · render feedback · AI credits level · invitations · open-to-new-leads · held / failed messages · Studio health · Reports › Projects ·
Reports › Meetings · a Designer's Finance drafts and commission.

### Held or decided out (respect these unless he reopens them)
| What | Record |
| --- | --- |
| Lead temperature / hot | REG-606 (Q-10 "ignore this") |
| A month calendar, a sparkline, a donut, 1.0's Classic sample figures | REG-2006 · REG-2007 (S22: "the lists and the counts say it") |
| Tasks per member on the Workload card | REG-2008 ("a number with no home") |
| A Marketplace "deals ending" tile; a "lines not from My Items" row; an "ask for a review" row | S22 decisions; REG-2004 |
| Reviews: no Dashboard row, no bell | outcome-S41b5 |
| Upgrade offers in the bell only, Free only, one at a time | REG-2135 |
| Coloured tiles (red only for late-and-ours) | REG-2007, S-05 / REG-1448 |
| A Home Screen setting (chat-first vs widgets) | REG-2003 (both on one page); *Home Screen choice* also in the S41b kept ledger (P-26) |
| The Dashboard's page tip (guided tours), dark mode, languages, countries beyond Singapore | his 2026-10-15 exclusions (REG-1836 · REG-1837) |
| The roles editor, voice input | S41b kept ledger (`s42/pending-ledger.md` P-26) |
| A record with tabs stays one page | REG-2734 |

### Stand-ins — the data is honest but not live in the demo
RSS headlines (Market Insights) · Marketplace deals and brands · Hangouts feed · Qanvast account (lead credits, reviews, listing answers) ·
Xero (REG-1308) · Gmail / Meta capture · message delivery (WhatsApp / email) and the 8 AM summary sweep · the plan's payments · Floorplan to 3D
renders · the Visualizer's image models · Maison AI's model (`readQuestion`). Registry: `lib/services/registry.ts`.

---

## 20. What is good — the patterns the redesign should reuse

1. **One home, doors elsewhere** (REG-1360…1380, S22): every D row and tile is its home's own figure through its home's own function —
   never a second count. Keep it; fix the doors that don't land (ST-52, ST-53) rather than adding copies.
2. **Needs you's grammar** (`lib/projects/needs-you.ts`, `NeedsCard`): one row per thing, its words open the place, one named button does the
   step, *Needs your OK* first, Q-03's order. The richest daily registry in the app — the redesign's problem is that D shows only its top row.
3. **Red only for "late, and ours"** (S-05, REG-1448): money owed by a client is neutral; it is the reason D's tiles are calm. Reuse it — and
   fix the two places that paint the client's lateness red (ST-47).
4. **`?run=` / `?done=` / `?todo=` / `?show=unread` / `?open=` landings** (REG-2013): a door that opens the step, not just the page. Extend the
   family to the doors that lack one (tickets waiting on you, contracts awaiting signature, To do's groups, Money in's status).
5. **Approve only after reading** (S-20): D's *Review* opens the record; it never approves unread.
6. **The listings' own to-do scopes** as the single source for lead counts (`inAttention`, `QUICK_FILTERS`), and the rail's `railBadges`
   read once per request (`cache`) — D and the shell share one number.
7. **Role-shaped by rule, not by setting**: `tileLabelsFor`, `asksFor`, `seesTeam`, `seesBooks`, `seesProfit`, Who sees leads — one rule
   decides what each role's page holds, and the ghost reads the same rule (`shapeFor`, `dashboardShape`).
8. **Maison AI answers by rule from the records** (`lib/maison-ai/intents.ts`): "What did I miss?", "How is the studio doing?", "Who owes the
   studio money?", "Which leads need attention?" are already answered with rows that open records — the docked composer has real content on
   day one.
9. **Honest emptiness**: "Nothing waits on you", "You're up to date", "None added in the last 7 days", a card that hides when it has no line
   (REG-2236), a part that can't be read leaves its card out (the rail's soft counts).
10. **Undo on the front door** (MY TASKS' tick → "Task completed · Undo") — the same answer as the Tasks tab.
11. **The house tiles** (`StatTile` / `StatTiles`, REG-2914: two across to 320, a long figure set to fit) and **Coming up's window rule**
    (this week and next, else the next three).
12. **The derived clocks** that already exist and only need surfacing: `whyClientWontHear`, `nearHandover`, `linkLife`, `expiringThisWeek`,
    `viewedSince`, `poolStateOf`, `inviteLine`, `returnWindow` — each a sentence the studio can act on.
