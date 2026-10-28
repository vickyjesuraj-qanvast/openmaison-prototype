# Outcome — P-C · Books, reports & commission (2026-10-10)

The owner's "build everything that's in 1.0 to 2.0 without losing anything … best user experience, cognitive load, and intuitiveness" (2026-10-10),
package P-C of the brief. Every map row below is built; staged register rows in `reg-P-C.md` (REG-P-C.1 … .12). `npx tsc --noEmit -p .` and
`npx eslint` are clean on every file below; `npm run design:lint` adds nothing from these files (its three new findings are
`components/finance/where-costs-go.module.css` and `components/projects/threads/thread.module.css` — P-B's and P-G's). No build, no server,
no browser, no `local.db` (as the brief says) — the probe is written, not run. A pure sanity run of `buildReport` (every report, two periods, a
scoped input), `commissionsOf` with stages, `expectedOf` and `closingNumbersOf` on synthetic records passed (scratch `pc/t-reports.ts`).

## Files

| File | What |
|---|---|
| NEW `lib/finance/commission-close.ts` | `afterProjectCompleted(projectId, actorId)` — FB-055 (written first, for P-E) |
| NEW `lib/finance/closing-numbers.ts` | `closingNumbers(projectId)` → `ClosingNumbers \| null` — PR-122 · PR-123 (written first, for P-E) |
| NEW `components/finance/books/project-commission-dialog.tsx` | `ProjectCommissionDialog` + `openProjectCommission(projectId)` — FB-042 · FB-043 (written early, for P-E) |
| NEW `app/finance/commission-actions.ts` | `readProjectCommission` · `setProjectCommission` · `undoProjectCommission` (the dialog's server) |
| `lib/finance/commission.ts` | `RuleStage` · `parseRuleStages` · `stageRate` · `stagesWords` · `expectedOf`; `CommissionRuleRecord.stages · endedBy`; `CommissionPayment.stageRef`; `CommissionProject.stages`; `CommissionLine.expectedMinor`; the engine pays a staged rule on its stages only; `ruleWords` names the stages |
| `lib/finance/books.ts` | `ruleRecord` reads `stages_json` · `ended_by`; `commissionFacts` hands each payment its stage and each project its stages; `BookProject.entity · startedAt · budgetMinor`; `BooksData.entities`; `logCommissionEvent` · `dropCommissionEvent` (FB-057) |
| `lib/finance/profit.ts` | `closingNumbersOf` · `ClosingNumbers` · `MARGIN_GAP_PTS` (the pure half of closing-numbers) |
| `lib/finance/reports.ts` | GST and Expenses reports; *Last quarter*; `QUARTER_PERIODS` · `ENTITY_REPORTS`; `scopeReportInput`; `apRowsOf` (You owe's rows, shared with Owed to you's Net); Owed to you's tiles; Cash flow's last-year columns; Profitability's budget bands and days; Commissions' Expected · Variance · Changes; vendor owed from the records |
| `components/finance/books/reports-view.tsx` | the Issued by pill (ScopePill + PortalMenu), GST's This quarter, the scoped input, `?entity=`; the Maison AI "who owes" answer reads overdue from the invoices (the tiles changed) |
| `components/finance/books/books-ghost.tsx` | the report chips' ghost: ten chips |
| `components/finance/books/books-settings.tsx` | a project's own rate › Change opens the project's dialog (keeps its stages); the dialog mounted |
| `components/finance/books/commissions-view.tsx` | a line's ⋮ › *This project's commission*; the dialog mounted (Owners and Admins) |
| `components/finance/books/books.module.css` | `.stagePick` · `.stageList` · `.stageRow` · `.askLine` |
| `app/finance/books-actions.ts` (its commission half) | Activity lines from `setCommissionRule` / `removeCommissionRule` on a project, `askCommissionRate`, `withdrawCommissionAsk`, `answerCommissionAsk`; `RuleUndo.eventId` and `undoCommissionRule` drops the line |
| `lib/leads/activity.ts` region P-C | the commission lines (FB-057) |
| `components/company/reports/reports-workspace.tsx` · `app/company/reports/[tab]/page.tsx` | the Finance tab passes `?entity=` |
| `design-source/verify/projects/verify-pj-gap-f2.cjs` | its cleanup also takes the new `parity_c_commission_…` lines *(parity map, a deliberate change of this rule)* |
| NEW `design-source/verify/parity-map-build/verify-pm-c.cjs` | this package's probe (not run) |

## Per map row

### FB-042 · FB-043 — a project's commission (one dialog), per-stage rates
- **Built.** `ProjectCommissionDialog` — mount it once with the page's `projectId`; `openProjectCommission(projectId)` opens it from anywhere on the
  page (a module-level listener set; a no-op with nothing mounted); `?commission=1` on a page where it is mounted with a `projectId` opens it once
  (a Suspense child reads the address, then drops the parameter). Owners and Admins: *The studio's rule* · *A rate for this project* · *No
  commission*; on a % rate with ≥2 stages, *Pay on chosen payment stages* (a small Switch) → a tick per stage, its own rate optional. Save (only
  when something changed; unchanged = close) → `setProjectCommission` ends the project's own rule and starts the new version from today (or ends
  it, for the studio's rule) → snackbar sentence + Undo. A member's rate on the project is named under it. A Designer on the team: the rule that
  applies to them, its scope, the stages it pays on, their ask (open / answered) and *Ask for a different rate* (the existing `RuleDialog ask` →
  `askCommissionRate`) or *Take it back*. A viewer who may not see the project's money gets the refusal in the body.
- No commission on one project = a project rule of basis `none` (the engine already skips it; it outranks a member's own rate, and a member's
  rate on the project still comes first — the dialog says so).
- Settings › Finance › Commission keeps its list; a project's own rate's *Change* now opens this dialog (so its stages are never dropped by the
  plain rule dialog); a member's rate, a member's rate on a project and the studio's rule keep the old dialog. Finance › Commission › a line's ⋮
  gains *This project's commission*.
- **Check:** Dane (Owner) → Company › Finance › Commission → a Benjamin Han line's ⋮ → *This project's commission* → pick *A rate for this
  project*, 5 %, *Pay on chosen payment stages*, tick Completion at 6 % → Save → the line's rate reads "5% of what the client pays · on 1 payment
  stage"; Undo. Again → *No commission* → Save → Benjamin's lines say No commission except Germaine's (her own rate on the project); Undo.
  Germaine (Designer, View as) on the project's ⋮ › Commission… (once P-E wires it): "Your commission here · 4% of what the client pays · Their
  rate on this project", her approved ask, *Ask for a different rate*. 1440 · 768 · 390 (a sheet on a phone).

### FB-055 — "Set commission for {project}" at completion
- **Built** as `afterProjectCompleted(projectId, actorId)`, server-only, best effort (swallows its errors, returns `{ taskId } | null`). Raises
  ONE task (assigned to every active Owner, due today 18:00, kind General, with a description saying why and where) when: the studio's rule pays
  nothing (none set or *No commission*), the project has no rule naming it, and no team member has a rate that applies today. A studio that pays
  by default never gets it — thought better than 1.0, which nudged whenever the project had no rule of its own. The Owners' bell (`task_assigned`,
  the actor excluded by `notify`) opens `/projects/{id}?commission=1`. Idempotent on an open task with the same title.
- **Check:** on a scratch DB set the studio's rule to No commission (Settings › Finance › Commission), complete a project's handover (P-E) →
  each Owner has the task on the project's Tasks and, for the other Owners, a bell row that opens the dialog. On the demo data (the studio pays
  3 %) nothing is raised — by design.

### FB-057 — commission on the project's Activity
- **Built.** Kinds `parity_c_commission_rule` (detail `from` · `to` · `removed` · `memberId` · `title`), `parity_c_commission_asked` (`to` ·
  `reason`), `parity_c_commission_answered` (`answer` · `note`), `parity_c_commission_withdrawn`. Written by the dialog, by Settings' project /
  member-on-project rates (set and remove), by Finance › Commission's *Their rate on this project*, and by every ask, answer and withdrawal.
  Undo of a rate change deletes its line. Read in region P-C: a member's line only for that member and Owners and Admins; every line hidden from
  a viewer who does not see the project's money; each line *See commission* → `/projects/{id}?commission=1`; chip group Money.
- **Check:** after the FB-042 steps, Project › Files & notes › Activity reads "You set the project's commission to 5% of what the client pays ·
  on 1 payment stage (was the studio's rule)."; as Michelle, a line about Germaine's rate is not there.

### FB-065 — GST
- **Built** (reverses REG-1307's "Tax filing view" not carried). See REG-P-C.5. Input tax counts unbilled POs (1.0 counted POs from issue; 2.0
  moves the GST to the bill once one is recorded, so nothing counts twice) — the brief named bills and expenses; the PO line keeps 1.0's figure
  honest and is labelled. Invoices are counted by their send day; credit notes by their issue day; void invoices and void credit notes count for
  nothing. A non-registered studio's invoices carry no GST, so its output is nil.
- **Check:** Company › Reports › Finance › GST → "GST · Q4 2026", three tiles, *GST you charged* / *GST you paid* (each line opens Money in /
  Money out on its kind), *Records*; pick P&L on This year, then GST → the period reads This quarter; Export → `gst.csv`.

### FB-075 — Cash flow against last year
- **Built.** `In, same month last year` + `Change` on By month and its total. **Check:** Cash flow on This year.

### FB-076 — Expenses
- **Built.** REG-P-C.7. "Reimbursed" = paid back on member claims (2.0's claims); "Reimbursements" tile likewise, with what is still to pay back.
  **Check:** Expenses on All time → Germaine's Grab claim under Transport (or its category).

### FB-077 — Profitability by budget range, days to complete
- **Built.** REG-P-C.8. The budget is the lead's `budget_minor` (the client's stated budget — 1.0's project budget field has no 2.0 twin); days
  are start (`projects.started_at`) → completed, completed projects only, "--" otherwise. **Satisfaction is not carried: 2.0 never collects a
  rating** (1.0's `satisfactionRating` had no 2.0 source) — said here and in REG-P-C.8, nothing on screen.
- **Check:** Profitability → *By budget range* (bands in order) and *Days to complete* on the three group tables (Shalini Menon's completed BTO
  gives its type and band a figure).

### FB-004 — net position
- **Built.** REG-P-C.9. **Check:** Owed to you → Owed to you · You owe · Net, Net = the first less the second.

### FB-072 · FB-073 — expected vs earned, and the change log
- **Built.** REG-P-C.10. **Check:** Commissions on All time → By project's Expected · Earned · Variance; *Changes* lists Michelle's open ask,
  Germaine's approved one (with "From an ask" on the rule it made) and the studio's rule.

### FB-105 — Issued by on every report
- **Built** on P-B's `lib/finance/entity-scope.ts` (`entityOptions` · `entityOf` · `matchesEntity` · `entityMenu` · `entityPillLabel`). REG-P-C.11.
  **Check:** with one entity (the demo) no pill. Add a second entity on Company › Profile → every report but the statement shows *Issued by: All
  ▾*; pick it → `?entity=<id>`, the head and the export name it; GST lists *By issuing entity* while All is picked.

### PR-122 · PR-123 — the closing numbers (P-E draws them)
- **Built** `closingNumbers(projectId)`: `{ costsMinor, marginPct: number | null, expectedMarginPct: number | null, grade, word, gapPts, warning }`
  or `null` (not an Owner / Admin, or no project). The margin is `null` until `profitGrade` grades it (print "--" + `word`); `expectedMarginPct`
  is `null` when the signed quote (and approved VOs) carry no costs — then no warning. `warning` is the strip's sentence, ready to print
  ("Margin 10% — 40 points under the expected 50%").

## Needs from others
1. **P-E** — mount `<ProjectCommissionDialog projectId={project.id} />` once in the project's frame (e.g. `components/projects/project-frame.tsx`
   or `project-menu.tsx`'s host) and have the ⋮ › **Commission…** call `openProjectCommission(project.id)` (Owners, Admins and the project's
   members — `readProjectCommission` itself refuses anyone who may not see the project's money). Without the mount, the task's bell row and the
   Activity lines' *See commission* (`?commission=1`) land on the project with no dialog.
2. **P-E** — `await afterProjectCompleted(projectId, actorId)` from `@/lib/finance/commission-close` wherever a handover completes (the direct
   complete and the approval of a requested one). It never throws.
3. **P-E** — `closingNumbers(projectId)` from `@/lib/finance/closing-numbers` (server-only) for the Hand over sheet and the Closing summary; note
   `marginPct` / `expectedMarginPct` are nullable and `warning` is the strip's text.
4. **Orchestrator (optional)** — a task has no link column, so the "Set commission for …" task itself opens no dialog (its Owners' bell rows do).
   If wanted: `components/leads/tasks/task-panel.tsx` could show *Open the commission* for a task whose title starts "Set commission for " on a
   project (→ `/projects/{id}?commission=1`).
5. **Orchestrator (optional)** — `lib/projects/money-visibility.ts` `isMoneyEventKind` could include `parity_c_commission_` (region P-C already
   hides those lines from a viewer who does not see the money, so nothing leaks without it).
6. **P-A** — the GST report links its lines to `moneyInHref('invoices')` and `moneyInHref('credits')`; keep those kinds.
7. **Maison AI (P-H)** — `reportAnswer` calls `buildReport` without `entities`, which is right (unscoped); its 'gst' answer already uses the
   `gst` key and `last_quarter` period built here.

## Repair text (for `scripts/repair-demo-data.ts`, then `npm run db:baseline`)
The demo's asks were made before their Activity lines existed. Idempotent (each line names its record in `detail.ask` / `detail.rule`).

```ts
  /* ── R9x · commission on the project's Activity (parity map, FB-057 — her "build everything that's in 1.0" 2026-10-10) ──────────────────
     The demo's asks for another rate (Germaine's approved on Benjamin Han, Michelle's open on Ryan D'Souza) were made before their lines
     existed: each ask gets its `parity_c_commission_asked` line at its own time, an answered one its `parity_c_commission_answered` line at the
     answer's, and a project's own rate (one not made by an ask) its `parity_c_commission_rule` line. detail.ask / detail.rule name the record. */
  {
    console.log('\nR9x Commission — the asks and the project rates on the project’s Activity')
    const { ruleWords, isBasis } = await import('../lib/finance/commission')
    const words = (basis: unknown, rateBp: unknown, fixedMinor: unknown) => ruleWords({ basis: isBasis(basis) ? basis : 'payments', rateBp: Number(rateBp) || 0, fixedMinor: Number(fixedMinor) || 0 })
    const has = async (kind: string, key: 'ask' | 'rule', id: string) => (await client.execute({ sql: `SELECT 1 FROM lead_events WHERE kind = ? AND json_extract(detail, '$.${key}') = ? LIMIT 1`, args: [kind, id] })).rows.length > 0
    let n = 0
    const asks = (await client.execute(`SELECT r.*, p.lead_id AS lead, p.name AS pname, m.name AS mname FROM commission_requests r JOIN projects p ON p.id = r.project_id LEFT JOIN members m ON m.id = r.member_id`)).rows
    for (const a of asks) {
      const id = String(a.id), base = { name: String(a.pname), memberId: String(a.member_id), title: a.mname ? String(a.mname) : null, ask: id }
      if (!(await has('parity_c_commission_asked', 'ask', id))) {
        await client.execute({ sql: `INSERT INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, ?, 'parity_c_commission_asked', ?, ?, ?)`,
          args: [randomUUID(), String(a.lead), String(a.project_id), String(a.member_id), Number(a.created_at), JSON.stringify({ ...base, to: words(a.basis, a.rate_bp, a.fixed_minor), reason: a.reason ?? null })] }); n++
      }
      if ((a.status === 'approved' || a.status === 'declined') && a.answered_at && !(await has('parity_c_commission_answered', 'ask', id))) {
        await client.execute({ sql: `INSERT INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, ?, 'parity_c_commission_answered', ?, ?, ?)`,
          args: [randomUUID(), String(a.lead), String(a.project_id), a.answered_by ? String(a.answered_by) : null, Number(a.answered_at),
            JSON.stringify({ ...base, to: words(a.basis, a.approved_rate_bp ?? a.rate_bp, a.approved_fixed_minor ?? a.fixed_minor), answer: a.status, note: a.answer_note ?? null })] }); n++
      }
    }
    const rules = (await client.execute(`SELECT r.*, p.lead_id AS lead, p.name AS pname, m.name AS mname FROM commission_rules r JOIN projects p ON p.id = r.project_id LEFT JOIN members m ON m.id = r.member_id WHERE r.request_id IS NULL`)).rows
    for (const r of rules) {
      const id = String(r.id)
      if (await has('parity_c_commission_rule', 'rule', id)) continue
      await client.execute({ sql: `INSERT INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, ?, 'parity_c_commission_rule', ?, ?, ?)`,
        args: [randomUUID(), String(r.lead), String(r.project_id), r.created_by ? String(r.created_by) : null, Number(r.created_at),
          JSON.stringify({ name: String(r.pname), memberId: r.member_id ? String(r.member_id) : null, title: r.mname ? String(r.mname) : null, from: null, to: words(r.basis, r.rate_bp, r.fixed_minor), rule: id })] }); n++
    }
    note(`${n} commission line(s) on the projects’ Activity`)
  }
```
Its verification row:
```ts
    ['commission ask without its Activity line (parity map FB-057, R9x)', `SELECT r.id FROM commission_requests r WHERE NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.kind = 'parity_c_commission_asked' AND json_extract(e.detail, '$.ask') = r.id)`],
```
(`lead_events.at`, `commission_requests.created_at / answered_at` and `commission_rules.created_at` are all seconds — the `timestamp` mode.)

## Probes
- **Run on the merged build (2026-10-10): 36 passed · 0 failed** (port 3131, a fresh copy of `pbuild/base.db`). The first run's two failures
  were the probe's: the table heads print in capitals (now read case-blind), and its cleanup deleted bell rows the server writes on page loads
  (now it removes only rows absent from the ids it noted at the start, and compares only what it makes — rules, asks, lines, tasks).
- NEW `design-source/verify/parity-map-build/verify-pm-c.cjs` — usage `BASE=http://localhost:3123 NODE_PATH=<repo>/node_modules node verify-pm-c.cjs <scratch.db> [shotDir]`;
  refuses `local.db`; sqlite3 with `-cmd ".timeout 30000"`; puts back the brand record (through a file), the rules and the lines it wrote, and
  checks the counts. Shots `c-01…c-09` (1440, and 390 for GST and the dialog). It reaches the dialog from Finance › Commission (mounted there), so
  it runs before P-E's door exists.
- Changed: `design-source/verify/projects/verify-pj-gap-f2.cjs` — its cleanup deletes the new `parity_c_commission_…` lines its ask and answer now
  write (else its "the database is as it was" fails).
- Grepped for every string, test id and address changed: `report-tiles` / the Owed to you tiles (no probe asserted *Overdue* or *Over 30 days
  late* on that report), `report-chips`, `commission-lines`, `commission-rule-dialog` — nothing else to change. `verify-reports.cjs` still holds.

## Stand-ins
- None call a model. The GST report is the books' own arithmetic — not a GST return (F5) filing; the outcome of a filing is the studio's.
- The expected margin is the signed quote's planned margin (prices less the lines' costs), not 1.0's budget field — 2.0 keeps no project budget.

## Not finished / left
- The "Set commission for …" task opens nothing by itself (no link on a task) — Needs from others 4.
- `afterProjectCompleted` and `closingNumbers` are not called yet — P-E wires them; the probe does not assert them (P-E's handover probe should).
- The FB-042 *at creation* moment (1.0's New Project drawer step) is not added to New project / Won: the dialog is reachable from the project
  from its first day (the ⋮), and the default (the studio's rule) needs no step — fewer steps at creation, nothing lost.
- Country and currency stay Singapore and S$ (DEF-30) — the GST report reads GST only.
