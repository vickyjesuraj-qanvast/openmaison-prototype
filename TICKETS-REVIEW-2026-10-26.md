# Tickets review — Dane, 2026-10-26

Dane's review of the Tickets module (the rail's Tickets `/tickets` and a project's Client › Tickets). Every change below is visible, so
each waits for Vicky's approval before it merges. Branch `uat-dane-2026-10-01`.

## Changes made

1. **Toolbar layout and chip order** — the scope chips hold the left, search + Filters sit on the right; the chips read
   All · Open · Resolved and closed (Open stays the page's default pick). The order is shared, so a project's Tickets tab follows.
   Files: `components/projects/tickets/project-tickets.tsx` (`scopeChips`), `tickets.module.css` (`.chips`), the two ghosts.
2. **The ticket drawer's details table** — Project and Looked after by were DS text buttons whose padding pushed them off their label's
   line and out of the value column. They are now the house text link (`components/om/text-link.module.css`) at the rows' size,
   semibold. Files: `ticket-parts.tsx`, `tickets.module.css` (`.factLink`).
   - For Vicky: on touch the two links' hit area is now the text only, under the 44px touch target.
3. **Phone: the scope as a dropdown** — ≤767 the three chips become the Leads listing's scope pill ("Open (3) ▾") over the house
   Dropdown (a bottom sheet titled "Ticket status", counts as meta), with the applied dot off Open. Same on a project's Tickets tab;
   tablet and desk keep the chips. Files: `project-tickets.tsx` (`TicketScopeControl`), `studio-tickets.tsx`, the ghosts.
4. **The ticket drawer slides out on close** — it used to vanish; the hosts kept the panel mounted only while open, so the house
   Drawer's exit never played. The last ticket now stays mounted until the slide ends. Files: `ticket-parts.tsx` (`open` prop),
   `studio-tickets.tsx`, `project-tickets.tsx`.
5. **Room under the thread's last message** — the last reply sat tight against the composer's shadow. The ticket's body now adds 24
   under it, on top of the Drawer body's own 24 (48 in all, desk and phone). File: `tickets.module.css` (`.drawerBody`).
6. **No foot shadow at the thread's end** — the composer's shadow stays while there is more below and leaves once the thread is
   scrolled to its end (desk and phone); the top rule stays. House rule REG-322 shows the shadow whenever the body overflows, wherever
   it is scrolled, so this is an **opt-in** on the house pieces, used only by the ticket drawer: `useOverflow({ untilEnd })`
   (`components/om/use-overflow.ts`) and `Drawer footShadowUntilEnd` (`components/om/drawer.tsx`); every other dialog and drawer is
   unchanged. File: `ticket-parts.tsx`.
7. **New ticket is one form** (the rail's Tickets) — "Which project is this ticket for?" (the house `PickOneDialog`) then New ticket
   were two dialogs; Project is now the form's first field, a required searchable select ("Name · P-number"). Once picked, the
   subtitle names its client and Looked after by puts its team first; `?new=1&project=<id>` opens the form with it filled. A project's
   own tab is unchanged (the project is known, no field). Files: `ticket-dialogs.tsx` (`NewTicketDialog project`), `studio-tickets.tsx`.
   - For Vicky: **invented copy** — the subtitle before a project is picked: "The project’s client sees it on their page and can
     answer there."
   - For Vicky: the picker listed projects this member can't raise on, greyed with the rule ("only the project's team, their
     Managers, Owners and Admins…"); the select can't grey an option, so those projects are left out of the list.
   - For Vicky: the probe `design-source/verify/pending-modules/verify-pm2-s46b.cjs` (M1) still walks the old picker — it needs
     updating to the one form (not edited here: `design-source/**` is his).
8. **New ticket: the Subject's help line** reads "A short line — e.g. Water stain under the kitchen sink" (was "A short line —
   “Water stain under the kitchen sink”") and shows only while the field is focused. The form is shared, so a project's tab follows.
   File: `ticket-dialogs.tsx`.
9. **"Looked after by" → "Assigned to"**, everywhere in Tickets: the New ticket form's field, the drawer's details row and its menu's
   sheet title, Filters' section ("Looks after" → "Assigned to"). "Nobody yet" → **"Unassigned"** (the form's first option, the list
   card, the drawer — "Unassigned — pick someone" —, the menu's clear row "Nobody", the Filters row). Dane's pick of three (Assigned to ·
   Handled by · Person in charge); "Owner" was ruled out — it is a role. Files: `ticket-dialogs.tsx`, `ticket-parts.tsx`,
   `tickets-filters-modal.tsx`.
   - For Vicky: **invented copy** (replaces his "Looked after by", itself invented copy).
   - For Vicky: probes `verify-pm-g.cjs` and `verify-pm2-s44o.cjs` look for the old words and need updating.
10. **The New ticket sheet on a phone: room under the last field, no foot shadow at the end** — as changes 5 and 6 for the drawer:
   ≤767 the form adds 24 under the Assigned to help line; the foot's shadow leaves once the sheet is scrolled to its end
   (the same opt-in, now on the house `Dialog`: `footShadowUntilEnd`, `components/om/dialog.tsx`; every other dialog unchanged).
   Files: `ticket-dialogs.tsx`, `tickets.module.css` (`.newForm`), `components/om/dialog.tsx`.
11. **New ticket: the Assigned to help line** reads "Optional — the assigned person will be notified" (was "Optional — they hear it
   on the bell"). Dane's wording. File: `ticket-dialogs.tsx`.
   - For Vicky: **invented copy**.
12. **A ticket you can't answer says why** — first a stopgap, kept after change 13. Where the reply box would be, a member who may not
   act on the ticket (`mayChange` false) now reads the house read-only line (`ReadOnlyNote`, the lock): "Only the project’s team, their
   Managers, Owners and Admins can work on this ticket." It used to be an empty foot. Shows for anyone without the right, assigned or not.
   File: `ticket-parts.tsx`.
   - For Vicky: **invented copy**. Still needed after change 13: it is what anyone off the project reads (a Designer on another
     team who opens the ticket), not only an assignee.
13. **Assigned to offers only who can work on the project — Vicky's decision** (Dane, 2026-10-27, option 1 of two). Found by Dane:
   a ticket assigned to James (a Manager of Sarah and Michelle, on a project neither is on) reached him on the bell, but he couldn't
   answer it — who may act on a ticket is who may change the project (its team, their Managers, Owners and Admins — `worksOn`), while
   Assigned to offered anyone in the studio. Now:
   - the New ticket form (rail and project tab) and the drawer's reassign menu offer only those people (`mayTakeTicket` in
     `lib/projects/policy.ts`, pure; `TicketTeamMember.reports` from `lib/projects/tickets.ts`); on the rail's form, before a project is
     picked, that is Owners and Admins; switching to a project the picked person can't work on puts the field back to Unassigned;
   - the server refuses anyone else on `createTicket` and `assignTicket` (`assigneeOf` in `app/projects/tickets-actions.ts`):
     "{name} can’t work on this project — add them to its team first".
   - Not done (option 2, rejected): letting an assignee act on a ticket off their project.
   - Tickets already assigned to someone who can't act keep their name; the menu no longer offers that person.
   - For Vicky: **invented copy** — the server's refusal above (shown in the snackbar only if a stale screen sends it).

## Notes for Vicky (out of this review's scope)

- **Other side panels may close the same abrupt way.** Any page that renders a house `Drawer` only while something is open
  (`{x ? <Drawer open …/> : null}`) unmounts it before its exit animation can play. Only Tickets was fixed here; the rest of the app
  was not checked.
- **The foot shadow at the end of a scroll, app-wide.** Change 6 drops the footer shadow once the body is scrolled to its end, for the
  ticket drawer and the New ticket form only (changes 6 and 10). If Vicky wants it everywhere, it is REG-322's rule to amend: make `untilEnd` the default in `useOverflow` and drop
  the opt-in.
