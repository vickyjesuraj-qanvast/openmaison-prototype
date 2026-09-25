# S3 · Quote X-Ray — the audit's findings (2026-09-25, read-only reader, verified in code)

| # | kind | where | what a person sees | fix |
|---|---|---|---|---|
| 1 | bug | xray-result.tsx rowActions · pick-one-dialog.tsx | *Same item as…* options read name · price only; two identical labels both look selected and picking the second pairs the first (`options.indexOf`) | room in each option; PickOneDialog picks by id |
| 2 | bug | xray-table.tsx (kebab in the Status cell) | hiding Status hides every correction; at ≤1024 the kebab sits off-screen in the last column | the listing's parked actions |
| 3 | bug | xray-table.module.css ≤767 | the card row is `1fr auto`: a long studio name squeezes Yours until its figure draws over "Yours ·" | two equal halves, label above figure |
| 4 | bug | send-dialog.tsx · use-copy.ts | Copy records the send even when the clipboard write failed | record only after the copy succeeds |
| 5 | bug | xray-workspace.tsx Recent search | deleting down to 8 hides the search box but the query still filters | clear the query when the box goes |
| 6 | bug | xray-workspace.tsx compare · actions.ts | a deleted/archived picked quote answers "Nothing to compare yet — pick a quote first" | say the quote changed, refresh, clear the pick |
| 7 | bug | xray-result.tsx runAgain | no pending state or guard: a double press makes two readings | busy guard + pending label |
| 8 | bug | xray-workspace.tsx compare | leave the page mid-run and ~3 s later you are pulled to the record | alive ref, skip the push |
| 9 | bug | xray-table.module.css `.qty` | `--om-type-caption` is undefined: the quantity prints as large as the amount | caption-s |
| 10 | bug | xray-result.tsx asQuestion | the question toggles are keyed by point number and land on another point after a correction | reset on a new result |
| 11 | bug | xray-result.tsx · page-header-l2 ≤1024 | "Sent {date}" is only a header chip, hidden on tablet and phone | say it in the body |
| 12 | bug | Recent delete · icon-button.module.css | a disabled trash looks and hovers live; its tooltip may not show | disabled ink + pointer-events |
| 13 | copy | xray-workspace / xray-result crumbs | Back goes to /quotes but the crumb says Leads / lead; from Activity it names Quote X-Ray | crumbs from `from` (`fromLabel`) |
| 14 | drift | send-dialog.tsx | ✕ / Esc / scrim drop an edited message without asking | ConfirmDialog nested |
| 15 | copy | pick-one-dialog placeholder | "Choose a your line", "No your line yet" | explicit placeholder / empty |
| 16 | copy | xray-result.tsx · queries.ts | an archived quote reads "the quote was deleted" | say which |
| 17 | copy | reading.ts · workspace unreadable() | ".xls" refused as "we can read … Excel"; any other PDF told "try a PDF from the client" | name the real formats; reword |
| 18 | copy | xray-table.tsx · legend · status | a 0-priced line is "FOC / Inclusive", "No price given" and "no price" | one name |
| 19 | copy | xray-result.tsx chip | "1 items compared" | plural |
| 20 | copy | xray-result.tsx | "Run again" vs "Read again", "reading" vs "comparison" | one verb, one noun |
| 21 | copy | xray-result.tsx · send-dialog.tsx | refusals off the pattern; a failed keep is swallowed | Couldn’t … pattern |
| 22 | copy | lib/xray/policy.ts | "Its maker, an Owner or an Admin can delete it" vs quotes'/contracts' wording | "Only its creator, an Owner or an Admin deletes a comparison" |
| 23 | copy | lib/xray/compare.ts · materials.ts | straight apostrophes in Say this / key points / the draft | ’ |
| 24 | copy | xray-table.tsx | the column is "Theirs" in Column settings but the studio's name in the head | one name |
| 25 | bug | xray-workspace.tsx error | one error for both sides: picking your file wipes the other side's message | per-side errors |
| 26 | bug | xray-workspace.tsx Lead select | a viewer who sees no leads gets an empty menu and "Choose a lead." forever | empty state |
| 27 | drift | xray-result.tsx impact · swatch | page-local impact pill, a grey chip on a green card, a 2px radius | MetaChip red/yellow/green, radius token |
| 28 | drift | loading.tsx · xray-skeletons.tsx | the ghost switches L1 → L2 and draws a dismissed intro | pass introHidden |
| 29 | drift | xray-workspace.tsx Recent head | on a lead's page Recent lists only its readings under the same head | name the scope |
| 30 | drift | xray-workspace.tsx Lead select | gates Compare but no star (REG-451) | required |
| 31 | drift | quote ChoiceCards | radios in a plain div | role radiogroup + label |
| 32 | drift | Dropzone | both dropzones announce "Upload file" | a label prop |
| 33 | drift | Recent search | doesn't answer the rail search tile or "/" | useSearchTarget |
| 34 | drift | xray-result.tsx kebab | in `actions`, so at ≤767 it drops to the action line (REG-355) | titleActions |
| 35 | check | xray-table row menu | U-01 / U-09 don't occur (PortalMenu) | — |
