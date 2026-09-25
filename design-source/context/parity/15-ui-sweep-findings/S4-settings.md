# S4 · Settings and the Company records — the audit's findings (2026-09-25)

| # | kind | where | what a person sees | fix |
|---|---|---|---|---|
| 1 | bug | members-view.tsx `rows = useState(data.members)` | Add member / Deactivate / Reactivate never show their result until a reload; pressing Deactivate again says "Already deactivated" | re-seed from props |
| 2 | bug | settings.module.css event table · notifications-settings.tsx | 768–880: the WhatsApp column (head + 17 switches) is clipped by `overflow:hidden` | ≤1024 tracks or scroll |
| 3 | bug | members-view.module.css | 768–887: rows spill over the card, "n leads" clipped | two-line row at ≤1024 |
| 4 | bug | settings.module.css `.addTrade`/`.gateField` · Reasons | on a phone the Lost add row's 200px gate field leaves the name box ~20px; at 320 it runs past the card | wrap at ≤767 |
| 5 | bug | custom-fields-card.tsx ≤767 | Required/Active labels via ::before in 56px tracks: the switch lands on the other label, Active clipped | keep the head (the bank's way) |
| 6 | bug | members-actions.ts deactivate | a Manager's team and the backup approver role are released silently; Undo/Reactivate don't restore them | name them in the confirm; restore on Undo/Reactivate |
| 7 | bug | settings actions renameTrade vs add | add / the Trade dialog accept 60 chars, rename allows 40: rename fails forever | one limit, inline error, keep the dialog |
| 8 | bug · copy | notifications-panel · queries | "Mark all as read" says "All caught up" but derived follow-ups stay unread and counted | derived rows not unread / not counted, or say so |
| 9 | bug | settings.module.css Messages · eventWho | at 320–340 the message cards run past the card; the stacked "Owners and Admins" has no label | minmax(min(320px,100%),1fr); data-label Who |
| 10 | bug | notifications-panel.tsx | a failed load shows "Loading…" forever; a failed mark leaves rows read | error state + revert |
| 11 | bug | questionnaire-view.tsx | flag/move/edit/delete optimistic, never rolled back on failure | restore prev |
| 12 | bug · copy | settings-view.tsx numbering snackbar | "Quote numbers will follow OM-0001" while the real next is higher | format with nextSequence |
| 13 | bug | settings page · studio-settings.tsx | a retired entity listed as live in Issuing entities | carry retired, show the chip |
| 14 | bug | questionnaire-view.module.css | 768–795: the Delete icon half hidden | ≤1024 tracks |
| 15 | copy | settings-view.tsx rounding snackbar | "…round to the nearest s$5" | lower-case only the first letter |
| 16 | drift | members / integrations / questionnaire | a Designer gets disabled controls but no read-only line | ReadOnlyNote |
| 17 | bug (security) | integrations page | a read-only member can Copy URL on a webhook, copying its secret token | strip tokens for non-runners |
| 18 | drift | settings-view.tsx Integrations button · studio links | no ?from= — no Back | withFrom |
| 19 | drift | list-entry-dialog 480 · Trade dialog 560 · Add member | off the modal scale; form chrome for multi-field dialogs | size modal 600 / 400 |
| 20 | drift | integrations Lead forms · Quote numbers switches | switch lists drawn as bordered label rows | the event table |
| 21 | drift | notifications-settings field chips | page-local mono pills; always append at the end | Insert field ▾ PortalMenu at the caret |
| 22 | drift | custom-fields-card · questionnaire-view option ✕ | icon-only without Tooltip | Tooltip |
| 23 | drift · copy | members / list-entry / settings / profile validation | messages not from MSG; names unstarred; snackbar refusals | MSG + inline errors |
| 24 | drift | settings / integrations / profile CSS | 13px/12px mono chips; `--om-type-caption-m` undefined (Profile's wells) | type tokens |
| 25 | drift | notifications-panel Mark all · integrations copyText | raw button; copy re-implemented, failure shows the raw secret | IconButton · useCopy |
| 26 | drift | company loading.tsx ×3 | ghosts don't match (4-up grid for one column) | one-column skeleton |
| 27 | drift | profile-view.tsx Phone / Fax / WhatsApp | free text | numeric digits + phoneTyped + isSgPhone |
| 28 | copy | integrations / settings / members / questionnaire | "Failed to …", "Couldn’t save" without what | Couldn’t <what> |
| 29 | copy | profile-view · settings aria | straight apostrophes | ’ |
| 30 | copy | description-dialog · inspector · settings snackbars | "Settings › Quotes" vs the module "Quotes & pricing"; two lock lines; the visibility snackbar wrong for Managers | fix words |
| 31 | copy | notifications model / settings / integrations / members / sections.ts | In app / In-app, dupes / Duplicates, you / You; Integrations help promises calendars | one name each |

Backlog: **U-10 confirmed** (page-local pills; two stylesheets and two dialogs for custom fields and the bank; phone differs; Active vs Enabled). **U-11 partly**: the only role decision from `SESSION_MEMBER_ID` is `createLead` (`const ME = SESSION_MEMBER_ID`, the self-assign) — identity stamps elsewhere (notify's default actor, setFollowUp / due-date task fallbacks, saveMemberSignature, Activity's "You", contract studio signature, created/updated stamps) and `app/notifications/actions.ts`' own `me()`; `createLead` / `updateLead` write assignees with no Manager-reach check.

## What the round did (REG-658, 2026-09-25)

Fixed: #1–#19, #21–#31, U-11, and U-10's words and phone layout. Probe `design-source/verify/ui-sweep/verify-sw-r4.cjs` 35/35, shots `s4-*`.

Left, and why:
- **#20 (Quote numbers)** the two switches under the pattern are Settings' plain switch rows, as Follow-ups' — the bordered rows the finding meant were Integrations' lead forms, now the house switch table.
- **U-10 (pills)** Settings' removable chips keep their own piece: a name that opens its dialog, a count and one of three actions (Restore · Retire · Remove) — the DS Tag holds a label and one icon. Integrations' custom domains are plain removable values, the Tag's job.
- **U-10 (twin tables)** the custom fields card and the question bank now read, size and behave alike (head kept on a phone, *Active*, tooltips, tablet tracks); merging them into one component is for the devs' handover.
