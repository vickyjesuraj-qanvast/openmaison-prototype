# Triage B — leads, meetings, Qanvast Ops, Hangouts (2026-10-28)

Probes: dane-p5a · dane-p6 · xr-r3 · pm2-s27 · rwd-c1 · pm2-s43b. I verified on the 01:28 build on :3484, with run dir
`/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/fix-B`
(`summary-run1.txt` is the full run, `summary.txt` the A·J re-run of rwd-c1).

## Results on the current build

| id | before | now |
|---|---|---|
| xr-r3 | 25 · 1 | **28 · 0, green** |
| dane-p5a | 39 · 9 | **59 · 0, green** |
| dane-p6 | 28 · 9 | **41 · 0, green** |
| pm2-s43b | 3 failing | **70 · 0, green** |
| rwd-c1 | 76 · 5 | 151 · 2 on the full run. One was a restated check, now green (re-run of A·J: 77 · 0). The other needs a rebuild (F, below). |
| pm2-s27 | stopped at §6 | 153 · 2. §6 passes now, which lets the probe reach the ghost checks for the first time. Two ghosts drift; both are in E's files (requests below). |

## One row per failing check

| probe · check | class | what I did | result |
|---|---|---|---|
| dane-p5a · b-resume (`[data-testid="convert-locked"] button`) | Stale | B2 2-05 moved the locked Convert into the Stage ▾ menu's Won row, keeping its handle and refusal. An On Hold lead may resume at any stage (blockedReason), so Mei's Won row is open. A Lost lead's Won row is the locked one. The check now runs on Muthu Vinay (lost from Contacted): it opens Stage ▾ and presses `[role="menu"] [data-testid="convert-locked"]`. The refusal still reads "Resume at Contacted first" with the action "Resume", and the action still opens the "Resume at X?" confirm. The step then returns to Mei for g-resumerow. | green |
| dane-p5a · b-doublequote ("From Scratch") | Stale | B2 2-04 replaced the empty QUOTES card's From Scratch / From Template with one outlined "Create a quote", which opens the Create Quote window. The check now presses Create a quote, then fires two clicks on the window's "Blank quote" (`create-quote`). It still proves that a double press makes ONE quote (0 → 1). | green |
| dane-p5a · g-taskback "Mark as Completed" | Stale | 1-23 · W-044 renamed it "Mark as done" in the panel. | green |
| dane-p5a · g-afterstage "Date & Time" | Stale | 2-24 · W-165: the Met log's moment is now labelled "When". | green |
| dane-p5a · g-answered "Answer" | Stale | 2-18: a press on the row opens the answer box; the handle is `question-answer`. | green |
| dane-p5a · g-viewall: the applied dot (REG-295) | Stale | The pill reads "Contacted · n" (T-07), so the probe's `/^Contacted \(/` found no pill. The source is unchanged: ScopePill and AppliedDot have no diff, and `chipScoped` still feeds it. The dot is asserted on the new pill and **is still there**. | green |
| dane-p5a · g-viewall 390 (×3: the pill's row, one row, `Won (`) | Stale | The pill finder used `\(\d+\)`; it now matches ` · \d+` and "Won · n". The later "All leads" first-row check was restated as well (2-11). | green |
| dane-p6 · b-copy "Add an entity" | Stale | 5-36 made Company › Profile four tabs; entities are at `?tab=entities`. Probe only, no source change. | green |
| dane-p6 · g-snackbar `qanvast-request-leads` | Stale | The first press after opening the ⋮ worked. The second press found the ⋮ closed. The probe now opens the ⋮ again before pressing. | green |
| dane-p6 · g-locked (×4) | Cascade | View as James never happened, for two reasons: g-snackbar stopped, and 1-40 put View as under the studio menu's "Demo" fold. I added a local `openDemo` (a `demo-fold` press when closed) to `viewAs` and to g-snackbar's View as. **The locked look is intact in the source**: `assign-popover.module.css` has no diff, and lines 53–57 still hold `data-locked`. In the browser: the avatar is at 0.5, the name is in the disabled ink (rgb 153), and a locked row takes no hover fill while an open row's fill is 0.04. | green |
| dane-p6 · x-suggest "Assign to undefined" | Stale | 2-41 changed the words to "Suggested: Sarah" / "Assign Sarah", and 2-34 changed the snackbar to "Members saved". The name is now read from the new words. One press still assigns the suggested member. | green |
| dane-p6 · g-newtab "Lead phone number" | Stale | 2-49: the field is "Mobile number*". | green |
| dane-p6 · x-nric (View as Sarah) | Cascade | The same Demo fold as g-locked. | green |
| xr-r3 · Lost dialog's competitor (waits for dialog "Move stage") | Stale | 2-29: Lost now opens through Stage ▾ › Lost as the dialog "Mark as lost" (it was titled "Move stage", subtitle "Moving to Lost"). The Competitor field and the "From the Quote X-Ray of …" helper are unchanged. | green |
| rwd-c1 · A B-06 (×4: "undefined" step name) | Stale | 2-25 · T-04: the card says its state once, as a sentence, and the track carries no step names at any width. The new `quoteCard` / `cardRule` check that the sentence is drawn once, holds no step name, and stands on one line with no word broken and nothing clipped, inside the card. The track's N−1 marks must cut its N steps evenly, and the fill must end at the current step's mark (read from the track's own "step n of N" label). This runs at 390 and 768 over six leads, then at 1024 and 1440. **At 768 the card is narrower than at 390**, so "Approved — not sent to Harpreet yet" wraps to two lines. That is the house rule T-12 (wrap rather than cut), so at 768 the check is "wraps only between words, no word broken, nothing clipped, inside the card". 390 keeps one line, as the brief says. | green (A·J re-run 77 · 0) |
| rwd-c1 · J "1280: the six step names drawn" | Stale (it was passing vacuously) | With no names left, `[].every()` passed on an empty list. Restated so it proves something: at 1280 the sentence is on one line, there are 6 steps and 5 marks, and no names. | green |
| rwd-c1 · F W2-13 the Notes composer (×2) | Stale + **Defect** | Stale: 2-46 means the composer opens from New › Note, so the probe now goes to `?new=note`. That moved it on to its 320 checks, which then failed at the second + press. The cause is the Defect below: once the draft autosaved, a "Note" sheet covered the composer. **Fixed in `components/leads/notes/lead-notes.tsx`.** | needs rebuild |
| pm2-s43b · When / call back (`12/10/2026, 8:03 PM`) | Stale | 3-20 · 4-16: a date field now shows the house words ("12 Oct 2026 · 8:03 PM") but still holds d/m/yyyy. The moments match exactly (the log showed both). | green |
| pm2-s43b · "Site visit at the unit" is In person | Stale | The same date-field words: '14 Oct 2026 · 2:00 PM'. The check now prints both values. | green |
| pm2-s43b · the front door: Profit not a loss | Stale | 1-17 · W-043 changed the tile from "Profit · October … invoiced" to "Profit in October … on S$ 50.8K billed". Same figure, same "not a loss" rule. A's source needed no change. | green |
| pm2-s27 · §6 `member-about` | Stale | 5-01 moved Public profile into the member row's ⋮; `member-about` now rides on the menu row. The probe opens `member-more`, then presses the row's menuitem. All of §6 now passes. | green |
| pm2-s27 · the ghost of `/hangout/<page>/<home>` at 390 lands where the page does (designer-card dy16) | **Defect** (E's file) | Newly reached. B5's 5-24 turned the designer card's known-for chips into one line of words. At 390 that line wraps to two lines for all three demo designers ("Known for Landed & penthouse · Luxury finishes"): 32px. The ghost draws one 10px bone in a 16px line. Measured on :3484. | request E-1; needs rebuild |
| pm2-s27 · the ghost of `/company/members/germaine/profile` at 390 (profile-view.card#1 dy −20) | **Defect** (E's file) | Newly reached. 5-51 shortened the profile's "Known for … — set in Lead preferences" line, so at 390 it is now 2 lines (40px). The ghost still draws 3 lines on a phone (60px). At 1440 both are 1 line. | request E-2; needs rebuild |

## Defects (for Vicky)

1. **On a phone, the note composer jumped into a sheet as soon as the user paused.** Since 2-46 the phone composer only opens from New › Note
   (or the Note quick link, `?new=note`). That path ran `startDraft`, which also set `mobilePane = true`. The draft autosaves about 0.9 s after
   typing pauses, and the note it became was then selected. With `mobilePane` still on, that note opened as a "Note" sheet over the composer,
   mid-writing (measured at 320 and 390). This is REG-402's own bug class. Before the build, the docked composer at rest never set the flag;
   only New ▾ did. **Fix (mine):** `startDraft` no longer takes the pane for a NOTE draft on a phone or an upright tablet
   (`setMobilePane(!(kind === 'note' && sheetLayout))`). The composer now writes as the docked one did before the build. A contact log and the
   desk are unchanged. tsc and eslint are clean. **Needs rebuild**, then rwd-c1 F, and rl-l4 §6, which opens the same path.
   - Seen on the way, not changed: after the first autosave, the composer starts a fresh blank draft and the note moves to the list. Reading
     the code, the docked composer at rest did the same before the build. Worth a look if it reads oddly to him.
2. **Two ghosts drifted from their pages at 390** (E's files, requests below). In both, B5's shorter or reflowed words changed how many
   lines the page draws, and the ghosts didn't follow.

## Requests for other areas

- **E-1 · `components/portfolio/designer-card-ghost.tsx`** (B5 5-24). The known-for line wraps to two lines on a phone. Replace
  `<span className={styles.known}><Bone w={200} h={10} /></span>` with
  `<GhostLines className={`${styles.known} ${styles.ghostLines}`} lh={16} h={10} lines={['70%', ['45%', 'phone']]} />`.
  `GhostLines` is already imported. `.known` is body-s, a 16px line, and the page's line measures 32px at 390 and 16px at 1440. Check with
  pm2-s27's ghost row for `/hangout/<page>/<home>` at 390 and 1440.
- **E-2 · `components/portfolio/public-profile-ghost.tsx`** (B5 5-51). The card-known line is now 2 lines on a phone (40px) and 1 at 1440
  (20px). Change `lines={[640, [280, 'phone'], [200, 'phone']]}` to `lines={[640, [280, 'phone']]}` on the `styles.line` GhostLines. Check with
  pm2-s27's `/company/members/germaine/profile` row at 390; pm2-s17's profile rows may move with it.

## Staged register row

- `REG-B.1 | The phone's note composer stays put while it autosaves: New › Note (and the Note quick link) no longer leaves the Notes tab's pane flag on for a note draft on a phone or an upright tablet, so the draft's first autosave no longer opens the note it became as a sheet over the composer | 2-46 made New › Note the only way into the composer, and startDraft's pane flag (meant for the desk's pane and a contact log) then turned every first pause into a "Note" sheet — REG-402's bug class | bug fix`

## Checks

- `npx tsc --noEmit -p .`: clean.
- `npx eslint components/leads/notes/lead-notes.tsx`: clean. The probe files are on eslint's ignore list.
- `npm run design:lint`: nothing new.
- `node --check`: passes on all six probe files.
- Guard: pages, server actions, handles and keys all say "none gone".
- :3484 is stopped.
