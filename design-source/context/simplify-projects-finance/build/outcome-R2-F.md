# Package R2-F — Compliance's lists + the checks: outcome (round 2, 2026-10-09)

This is round 2 of her "fix all the pending things". The register rows are staged in `reg-R2-F.md` (REG-R2-F.1 · 2). Checks run: `npx tsc --noEmit -p .`
shows no errors in this package's files (the errors left are in R2-D's `app/{portal,projects}/messages-actions.ts`, still in progress there). `npx eslint
components/projects/compliance scripts/design-anatomy.mjs` is clean. `npm run design:lint` passes with nothing new. `node --check` passes on every probe I changed.
I started no servers and ran no probes, as the brief says.

## 1 · Compliance's item lists follow the house anatomy (REG-R2-F.1)

I took the smaller change: each group's card table gets its head row. Restyling the items as LEAD STAGES rows would have changed the page Vicky
approved in gaps build I.

- `components/projects/compliance/item-row.tsx`
  - New `ItemHead()` (`data-testid="compliance-head"`): one `role="row"` with three `columnheader`s. The first is "Item", shown. The other two sit over
    Mark done and ⋮ as `actionsHead` cells whose names ("Mark done", "More actions") are `srOnly`, so a screen reader reads them and nothing is drawn.
    This is Settings' rule, the same one the handover checklist's head uses.
  - `ItemRow`: a project's row (the one with ⋮) is now `role="row"`, and its item, its Mark done slot, its ⋮ slot and its opened Details are each a
    `role="cell"`.
  - The Navigator's row is unchanged (`role="listitem"`): it has one column, reads only, and has no head.
- `components/projects/compliance/project-compliance.tsx`: each group's `data-card-table` is `role="table" aria-label={category}` and starts with
  `<ItemHead />`. Every `data-testid` (`compliance-group` · `-item` · `-details` · `-detail` · `-done` · `-menu` · `-who` · `-phases` · `-progress`), the
  phase chips, Mark done, ⋮, Details, `?item=` and `data-kb-list` / `data-kb-row` are unchanged. The head carries no `data-kb-row`, so the keyboard's
  list cursor skips it.
- `components/projects/compliance/compliance.module.css`:
  - `.head` composes the card table's `head`, and `.actionsHead` its `actionsHead`.
  - `.srOnly` composes Settings' class, as `ending.module.css` does.
  - The head and the rows share the tracks `minmax(0, 1fr) auto auto`.
  - At ≤767 the head is `display: none`, because the row stacks there (the handover checklist does the same). So the phone page looks exactly as it did.
- `components/projects/compliance/compliance-ghost.tsx`: each ghost table draws the head too (`<Words>Item</Words>` in `.head`), so the loader and
  the reveal match the page (REG-708). The ghost's head is hidden on a phone like the page's.
- `scripts/design-anatomy.mjs`: `compliance` is back in the project views' list (`/projects/<PROJECT>/compliance`), and the note that left it out is
  gone. `checkCardTables` should now find, for each group, a 40px head in 12px/500 uppercase on-surface-secondary, and rows of 56 or more.

**What to check** (Benjamin, P-2026-002, as Dane: `/projects/a3f655a3-c603-42b0-af12-2767a0500138/compliance`):
- **1440:** every category's bordered list opens with a grey 40px head reading ITEM, aligned over the marks as in the handover checklist. Nothing is
  drawn over the Mark done or ⋮ column. The rows, chips, Mark done, ⋮ and Details look as before. Open Details: the panel still spans the row under
  it. Run `?item=HDB_RENO_PERMIT`: it lands, pulses and opens as before.
- **768:** same as 1440.
- **390:** no head, and the stacked rows are exactly as before.
- **Reload:** the ghost shows the head in each table, and on a phone it doesn't.
- **Navigator:** `/compliance?tab=rules` (the Navigator's Rules by home) is unchanged.
- **Anatomy:** the orchestrator's run of `node scripts/design-anatomy.mjs` against :3011 on a scratch DB should report the compliance card tables
  holding (72 pages with this one).

## 2 · Probe robustness (REG-R2-F.2)

- **`design-source/verify/projects/verify-pj-gap-e.cjs`, step 5 › Sent messages** (around line 224). Marked `(simplify round 2, a deliberate change
  of this rule)`.
  - The step reads the Event pill's `menuitemradio` labels. It picks *A client responds to shared renders* when the menu offers it, otherwise the
    first label that isn't "All events", and asserts that the menu offers at least one.
  - It then asserts the filter on that event: rows > 0, one `data-event` across them (`render_feedback` when that was the pick), and the first row
    shows the picked label.
  - Status: with render_feedback picked, it keeps the old "No mobile number · Sent" check. Otherwise every row's Status cell must say something in
    words, and a `sent` row must read "Sent". That tolerates R2-C's new `held` status.
  - Detail: with render_feedback picked, it keeps the old "Kevin Ng responded to the renders" check. Otherwise the opened message must contain the
    row's first 24 characters, and the facts must still start with *To*.
  - For reference, the baseline outbox holds `schedule_ask`, `variation_declined`, `update_review`, `choice_declined`, `update_sent_back` and
    `client_issue_answered`, all email and all Sent. The probe's own `file_comment` rows join them during the run, so the menu is never empty.
- **Needs you's "Show n more".** `components/projects/overview/needs-card.tsx` shows `NEEDS_SHOWN` = 6 rows, and the rest fold under
  `needs-more`. Six more probes read a specific row that can sit past the sixth. Each now gets r3 / gap-d's unfold line just before the read, with
  the comment `(simplify round 2) …`:
  - `verify-pj-r1.cjs`: `need-setup-schedule` on Marcus after Start. Set-up rows come last, after the money rows.
  - `verify-pj-r4a.cjs`: `need-setup-portal` on Aisha while she is on hold. The hold row, approvals, money and tickets come before set-up.
  - `verify-pj-r6.cjs`: `need-money-confirm` on Ryan, after his approvals.
  - `verify-pj-fix-B.cjs`: `need-share` on Aisha once she is running. The telling-the-client row comes after approvals, money, the client and late
    work.
  - `verify-pj-fix-D.cjs`: the completed project's card text and the page text read for INV-2026-007 (`ov`).
  - `verify-pj-gap-c.cjs`: `need-approve-more-time` on Ryan. It is an approval row, so it is early, but the unfold is a guard.
- **Left unchanged:**
  - `r1:157`, `r2:246` and `gap-a:222/232` read Before work starts, where the set-up rows and Start lead the list (three set-up keys at most before
    Start).
  - `gap-a:110/118` read the hold row, which is always first.
  - `r1:209` and `r7:152` only count rows.
  - `r3:287` reads an approval row that sits before the existing unfold.
- `money-needs-more` (the Money tab's own fold) was already handled in gap-b, gap-f1, gap-f2, r5 and r6.

## Needs from others

- **R2-B** owns `components/projects/overview/**`. The unfolds rely on `data-testid="needs-more"` and its "Show n more" text, as r3 and gap-d already
  do. If round 2 renames either, the eight probes' unfold lines need the same change.
- **Orchestrator:**
  - The README's "Left for Vicky / the developers" line about Compliance ("draws its item lists with the card table's rows and no head row …
    Vicky's call whether its lists take a head") is now closed by REG-R2-F.1, which needs her look at 1440.
  - The anatomy count becomes 72 pages.
- **Open, not built (outside my files):** the Compliance Navigator's *Rules by home* (`components/compliance/navigator.tsx:135`) draws the same rows
  in a `data-card-table` with no head. It isn't on the anatomy list because `/compliance` isn't a route there. Its rows have one column and no
  actions, so they read as a list (`role="list"`), and I left them alone. If `/compliance` ever joins the anatomy routes, that list either drops
  `data-card-table` or takes `<ItemHead />` without the two action columns. That is Vicky's call.

## Repair text

None. No data changes.
