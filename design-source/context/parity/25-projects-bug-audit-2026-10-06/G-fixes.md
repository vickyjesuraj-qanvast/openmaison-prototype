# G — the portal's studio side and what Projects touched elsewhere: outcomes (fix package `fix-G`, 2026-10-06)

Findings file: `G-portal-studio-and-crossmodule.md` (46). Register rows: `design-source/context/parity/projects-build/reg-fix-G.md`.
Repair: R71b (portal) · R61b (the Visualizer's demo). Probe: `design-source/verify/projects/verify-pj-fix-G.cjs`. Port :3127.
Worktree re-synced after package D merged (its `lib/projects/money-visibility.ts`, D-08 / D-12 / D-24 in the base).

**Status: in progress** — rows marked *pending* are not done yet.

| ID | Outcome | What changed (file) |
|---|---|---|
| G-01 | Fixed (Client access + preview; D owns Activity / Files / Overview / listing) | `portalSeesMoney` (`lib/portal/access.ts`, wraps D's `seesLeadMoney`): no Money row and no payment waiting for a viewer refused money; the preview route requires `worksOn` (the panel's own rule) and stores `money` on the preview — Money is then withheld as a switched-off section (`portalGate`); Set-up's sample is one the viewer may look as |
| G-02 | Fixed | `movePortalSignIn` (`lib/portal/sign-in.ts`) from `updateLead`: the link moves to the new number's profile (made if none), the old number's sessions end; the edit's Activity line adds "{client} now signs in to the portal with …"; the panel shows the profile's phone |
| G-03 | Fixed | previews ride in their own address `/my/<slug>~<id>/…` with their own cookie `om_pv_<id>` (new table `portal_previews`; `startPreview` reuses a live one per member · client · person · kind, so the Set-up frame writes no row per view); `portalGate` / `readVisitor(preview)`; the shared `om_portal` cookie opens client sessions only |
| G-04 | Fixed — a nested dialog inside a panel owns Esc (`components/om/surface.ts` `isTopmostSurface`, NESTED_LAYER); the household dialog is `nested` | orchestrator, after the stall |
| G-05 | Fixed | `isSgMobile` + `SG_MOBILE_MSG` (`lib/format.ts`) in the household dialog, `addHouseholdMember`, `inviteHouseholdMember`, `inviteClient`; the panel says a landline before WhatsApp opens |
| G-06 | Fixed | `addHouseholdMember` answers `{ confirm: 'other-client', name }`; a nested ConfirmDialog names whose number it is and adds them under their own name on a yes; WhatsApp opens on the press as a pending tab that is pointed only once the add lands, else closed (`components/portal/wa-window.ts`) |
| G-07 | Fixed | Open Profile → `/company/profile?from=…#entities` |
| G-08 | Fixed | `inviteClient` / `inviteHouseholdMember` keep the first `invited_at` / `invited_by`; the panel reads the latest later `invite_sent` / `household_invited` as "· sent again {day}" |
| G-09 | Fixed | the documents row counts quotes (kind quote), agreements and variation orders separately |
| G-10 | Fixed | the Quotes kind filters `kind = 'quote'`; a variation order is a project-side hit ("VO-1 · title" — "Variation order · client · −S$545.00" via `signedMoney`) |
| G-11 | Fixed | `listArchivedQuotes` / `listDeletedQuotes` / `emptyQuoteTrash` take `kind` (default quote); Money's Variation orders table gains "Deleted variation orders" (the Deleted sheet with `variation`); the editor's delete snackbar names where a VO went |
| G-12 | Owned by D (fixed with D-08) | — |
| G-13 | Fixed (with D-24) | D-24 renamed Title / Valid until; here: the Items note says "printed variation order", the band reads "confirmed version 1 on 9 Sep ’26" |
| G-14 | Fixed | `keepQuery` (`lib/nav.ts`) on the three direct-lead redirects |
| G-15 | Fixed — with fix-A A-20: the Tasks page names the project and opens its Tasks; direct projects appear in the hub's filter (`projectLeads`) | merged |
| G-16 | Fixed | `fetchMembersData`: `leads.direct = false` on both lead counts, `quotes.kind = 'quote'` on the open-quote count |
| G-17 | Fixed | the Set-up frame opens `&frame=1` (no studio strip; the paused notice while paused), is re-keyed on Paused, and scrolls (pointer events back on — writes are refused in any preview) |
| G-18 | Fixed | one stable sample: the first project client invited (else the first invited, else the first project client) among those the viewer may look as; the button and the step read "See it as {first name}" *(invented copy)* |
| G-19 | Fixed | row menus follow `c.mayAct`; the note: "Only Owners and Admins change the portal’s set-up. A client’s team invites them and withdraws their access." *(invented copy)* |
| G-20 | Fixed | Pause, Change address, the Clients tab's Withdraw and the household's Take off: every Undo answers ("… again" / `couldnt`) |
| G-21 | Fixed | at ≤400 a person's row is a grid — the chip steps under the name; `overflow-wrap: break-word` (no break inside a word) |
| G-22 | Fixed | the client's row carries the household's ⋮ (Send the link · See it as · Withdraw {name}'s access): one chip column |
| G-23 | Fixed | the foot's hand-rolled red Withdraw is gone; "Withdraw {name}'s access" is a `DropdownItem tone="danger"` in the client's row menu |
| G-24 | Fixed | the title reads `d.projectId`, not the host's prop |
| G-25 | Fixed | one order: `PORTAL_SECTIONS` and the panel (`ACCESS_ORDER`) follow `PORTAL_TABS` — Schedule · Updates · Money · Choices · Designs · Files (the panel's documents and questionnaire first, as Home) |
| G-26 | Fixed — Client access shows "Quotes and agreements" as Off for every client while Files is off (`lib/portal/access.ts`) | orchestrator |
| G-27 | Fixed | `payTitle(stage, late)`: "…is overdue · was due 2 Oct"; Remind links the item itself (`w.href`); the message keeps the title's case |
| G-28 | Owned by D (fixed: "C's note" — the derived overdue row comes due at its due day) | — |
| G-29 | Fixed — the stale "raised once the portal lands" help line is gone | verified in the merged code |
| G-30 | Fixed | a direct project's documents row links to its Money tab |
| G-31 | Fixed — invoices and receipts by number (fix-D, D-12); someone from the household by name or number finds the project (`searchableProjects` household, `lib/global-search/queries.ts`) | orchestrator |
| G-32 | Fixed | a matching household row keeps its client row; the household sub-line names "{client}’s household" |
| G-33 | Fixed | a preview builds its visitor from the lead / household row as it stands — no profile, link or session written (G-03's table) |
| G-34 | Fixed | a send, a remind or a household add while paused asks "The portal is paused — … Send anyway?" (the panel and the Clients tab) *(invented copy)* |
| G-35 | Fixed | the address dialog is a form (Enter saves); a no-change Save says "The address stays …"; Undo (`undoPortalAddress`) deletes an address made minutes ago instead of keeping it in the history |
| G-36 | Fixed | `a.row:focus-visible` outline inside the box (`outline-offset: -2px`) |
| G-37 | Fixed — the Money tab stays in the strip and selected while its refusal shows (`project-frame.tsx` tabItems) | verified in the merged code |
| G-38 | Fixed — `app/projects/[id]/not-found.tsx` (RecordNotFound, Back to Projects) | merged |
| G-39 | Fixed — R77b reopened Kevin Ng's link; a reset now moves a live demo share link's expiry with the calendar (`lib/db/baseline.ts`, as open tasks' dues) | orchestrator |
| G-40 | Owned by D — D-12: a receipt's entry opens the receipt page | merged |
| G-41 | Fixed — the Tools approval badge, the Visualizer's quote list, template "used by" counts and the Quotes ghost read `kind = 'quote'` | verified in the merged code |
| G-42 | Fixed | the Quote Sent step's quote, when the portal doesn't list it, reads "1 quote sent outside the portal" *(invented copy)* |
| G-43 | Fixed | Close preview (and an ended preview's address) returns to the client's project, else their lead |
| G-44 | Fixed | helper "Wife, son, co-owner… — n of 40"; Activity keeps the phrase as typed |
| G-45 | Fixed | the Set-up ghost draws Pause only for whoever runs the portal (remembered per browser, told by the reveal); its Clients card draws 4 rows |
| G-46 | Fixed | the table core's row rule (`.row::after`) is off on the CreditsTable phone card (house-wide); the household card names whose household |
