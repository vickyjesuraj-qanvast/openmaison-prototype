# Package R2-B — the Overview's doors: outcome (round 2, 2026-10-09)

This round closes K-N's three "Not finished" items, K-F's Designs leftover and P1 §6.4's phone height (her "fix all the pending things"). There is
no schema change and nothing is written to local.db. No build, no server and no browser were run.

Checks:

- `npx tsc --noEmit -p .` is clean for the whole tree.
- `npx eslint` is clean on every file below.
- `npm run design:lint` reports "nothing new breaks a house rule".

Register rows are in `reg-R2-B.md` (REG-R2-B.1…5).

## Files

**New**

- `components/projects/updates/update-send-back.tsx`: `UpdateSendBackDialog`, the Updates tab's Send back note dialog (`NoteDialog`) with its
  help and sentence. Updates and the Overview both import it.
- `components/projects/overview/answer-dialogs.tsx`: `NeedAnswerDialogs`, the in-place Send back / Decline. It draws three dialogs:
  - the update's `UpdateSendBackDialog`;
  - the Schedule panel's exported `AskDialog` for "Send {m} back?";
  - the same `AskDialog` for "Decline more time on {m}?".

  Each one calls the tab's own action with the tab's sentence and Undo.

**Edited**

- `lib/projects/needs-you.ts`:
  - `NeedRow.ask?: NeedAsk` (`{ who, title, end? }`) is an optional addition to contract B. The update, Done and more-time approval rows carry
    it: who asked, the raw title, and for more time the milestone's end now.
  - New constants `NEEDS_SHOWN_PHONE = 4` and `COMING_UP_SHOWN_PHONE = 3`.
  - The weekly-update row's action is `{ label: 'Draft it', href: updates?draft=week }` (it was `run: 'update'`).
- `components/projects/updates/project-updates.tsx` (its landings):
  - `?draft=<id>` / `?draft=week`, as described in REG-R2-B.1.
  - A module-level `editOf(u)` that the card's Edit and the landing share.
  - The address drop also removes `draft`.
  - The Send back dialog is now `UpdateSendBackDialog`.
- `components/projects/overview/use-need-actions.ts`:
  - The week-update intercept is gone (the row is an address).
  - `sendBack(row)` opens the dialog here (`answering` / `closeAnswer`), or for a PO, an expense or an invoice opens Money with
    `&do=sendback`.
  - A Done approved from the row has the Undo `undoMarkDone` with R2-C's "{m} is back as it was" + `unsentWords`, and the tab's
    `offerTell` (key `tell-client`).
  - Exports `backLabelOf`.
  - The `draftWeek` option was removed.
- `components/projects/overview/needs-card.tsx`:
  - `NeedHandlers.sendBack`.
  - An approval row's second button is *Send back* / *Decline* (`need-send-back`) instead of its old secondary.
  - An approval's words link the record itself: `recordOf` drops `&do=…` / `&send=1`.
  - Four rows on a phone (`useSheetLayout`).
- `components/projects/overview/coming-up-card.tsx`: three rows on a phone plus "Show n more" (`coming-up-more`).
- `components/projects/project-overview.tsx`: passes `sendBack`, renders `<NeedAnswerDialogs>`, and no longer passes `draftWeek`.
- `components/projects/project-overview.module.css`, at ≤767:
  - a two-line row pads 8 vertically (min-height 44 stays);
  - With {client}'s rows don't wrap: name and caption take one line each with an ellipsis, and the button sits beside them.
- `lib/projects/designs.ts`: `ProjectDesignsData.reach: DesignsReach`. The reason is worked out in this order:
  1. `fetchPortalLook().hidden` includes `designs` → `off`;
  2. the lead's `homeowner_lead_links` stamps (`accessState`) → `none` / `withdrawn`;
  3. `fetchPortalSettings().paused` → `paused`.

  `mayInvite` = `worksOn(viewer, the lead's members)`, the panel's rule.
- `components/projects/designs/project-designs.tsx`:
  - `ReachLine` under the toolbar (`designs-reach`, `data-why`; doors `designs-reach-portal` · `designs-reach-invite`);
  - `ClientAccessPanel` for Invite to Portal (closing it refreshes);
  - `useRememberShape('lead.{id}.designs.reach')`.
- `designs.module.css`: `.reach` composes the panel's `.note`; `.reachLink` composes the house text link.
- `designs-ghost.tsx` (now `'use client'`): reads the remembered reach flag (`useFlagPref(shapeKey(…))`) and draws a 44px bone.

## What to check

Dane is the Owner, Germaine and Michelle are Designers, Hui Min is an Admin.

### 1. Draft it

On Ryan (P-2026-001), as Dane at 1440:

- Overview › Needs you › *Tell Ryan about this week* · **Draft it** → Updates; as the page reveals, the composer opens on "This week at your home — …".
- The snackbar says "Draft update saved — it isn’t sent", and the address carries no `draft=`.
- Close the composer: the draft card is in the feed.
- With that row at the top of Needs you, the header's filled button does the same. If the row isn't the top one, open `/projects/<ryan>/updates?draft=week`.
- `/projects/<ryan>/updates?draft=<that draft's id>` opens it in the composer.
- `?draft=<a published id>` pulses its card.
- `?draft=nonsense` says "This update is not there any more".
- At 390, the composer is a bottom sheet.

### 2. Send back / Decline

On Benjamin (P-2026-002), as Dane:

- The "Feature wall panels" row (Needs your OK) has *Approve* · *Send back*. Send back opens "Send back" (Why does it go back?) on the Overview.
  The button waits for a reason. Sending it says "Sent back to Germaine" and the row leaves.
- PO-2026-008's row has *Approve and send* · *Send back*. Send back opens Money with the PO's Send back note (R2-A's landing). Pressing the
  row's words opens the PO's panel, not the approve step.
- The Grab claim works the same way: *Approve* · *Send back* → Money's note.

On Ryan, as Dane:

- More time on Carpentry has *Approve* · *Decline*. Decline opens "Decline more time on Carpentry fabrication?" here. Decline says the tab's
  sentence, and Undo answers "The ask waits again".
- If a Done waits for approval, as when Germaine marks one done with "Milestone completion needs approval" on, it has *Approve* · *Send back*.
  - Send back opens "Send {m} back?" and its Undo puts it back.
  - Approve runs the ticks that rode with the ask, then the snackbar offers *Tell {client} on WhatsApp too?*.
  - The approval's Undo says "{m} is back as it was …".

At 390, these dialogs are form sheets.

### 3. Designs

On Benjamin › Design › Designs, as Dane:

- Company › Client portal › switch Designs off → the line "Designs · Off for every client — Benjamin doesn’t see these on their page." with
  *Open Client portal*, which lands there with Back. Switch it back on.
- Marcus (P-2026-004, not invited): "Marcus sees these once invited to the portal." · *Invite to Portal* opens the panel. As a Designer not on
  the project the door is not offered.
- Pause the portal: "The portal is paused — …".
- A loader after a visit with the line draws its bone.
- Check at 1440, 768 and 390: the link wraps under the words on a phone.

### 4. 390

On Benjamin, as Dane at 390 touch:

- Needs you shows four rows and "Show n more".
- With Benjamin's rows are two lines each, with Remind or Post an update beside them.
- Coming up shows three rows and "Show n more" (when there are more than three).
- Measure the page height.

The estimate from the CSS:

| Change | Saving |
| --- | --- |
| Needs you 6 → 4 rows | about −150 |
| Two-line rows' padding (about nine rows × 8) | about −70 |
| With's button lines and second caption lines | about −150 |
| Coming up to three (plus the toggle) | about −60…−120 |

That is about −430…−500px, so roughly **3,200–3,300px**, not 2,900. The rest of the gap is in cards I didn't fold:

- Progress, six 44px rows;
- the mocked MY TASKS;
- Money's figures.

Each could fold behind a "▾" on a phone. That is a design call for Vicky, so it was not done.

At 1440 nothing changes apart from items 1–3: six Needs you rows, every Coming up row, and the rows as before.

## Probes changed (not run)

- `projects/verify-pj-r3.cjs`, at the end, adds two checks:
  - Ryan's Draft it lands in the composer on "This week at your home…", with `draft=` gone from the address, and the draft is saved (sql).
  - Benjamin's update row's `need-send-back` opens the "Send back" dialog on the Overview with its help line. It is cancelled, so no state
    changes.
- `projects/verify-pj-gap-c.cjs`, after the Schedule's Decline and its Undo: the row's `need-send-back` on Ryan's Overview opens
  `decline-more-dialog` in place. It then checks Decline with a note (the tab's sentence and the stored note) and the Undo.
- `projects/verify-pj-r9.cjs`, while Designs is off: Benjamin's studio Designs view shows `designs-reach[data-why=off]` "Designs · Off for every
  client" with its `/company/portal` door. Then it goes back to Company › Client portal to switch it on again.
- The other probes that click `needs-more` keep working at 1440, where six rows still show. `need-secondary` no longer exists for approval rows;
  no probe used it for them.

## Needs from others

1. **Orchestrator / whoever owns `components/projects/use-project-maison.ts`** (it is in no round-2 package):
   - `ProjectMaison.draftWeek` has no caller any more. It can go, or point at `updates?draft=week`.
   - The FAB's own *Draft an update about this week* proposal still offers "Open" → `updates?open=<id>`, which lands on the card. For one
     door, it could open `?draft=<id>` (a one-word change).
2. **R2-C**: the Overview's Done approval mirrors `project-schedule.tsx` `asks.approveDone` + `offerTell` (Undo words + `unsentWords`, key
   `tell-client`). If those change again, change `use-need-actions.ts` `approve` / `offerTell` with them.
3. **R2-A**: `&do=sendback` is built per their outcome. The Overview links `/projects/<id>/money?open=<record>&do=sendback` for the three
   approvals, the same address as money-needs' new secondary.

## Repair text

None. No records move.

## Not done / to know

- The 390 target of about 2,900 is not reached by these four tightenings alone (estimate above).
- Approving an update from the row still says "Approved — {client} can see “{title}”". The tab says "Change approved — … the new words" for a
  held change and follows the portal's Updates switch. The row doesn't know whether a review is a held change: that fact is in
  `fetchProjectDetail`, which belongs to no package this round. Left as it was.
- The share ask's row (*Share n schedule changes*, Needs your OK) keeps *Review* only. Its Send back lives in the share dialog it opens; it was
  not in this brief.
