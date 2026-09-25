# OpenMaison 1.0 — Accounts Setup inventory · Slice A: Studio (Team Members, Legal Entities, Roles & Permissions, Studio Health)

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25.

Conventions: *Words* are quoted verbatim from code; `{x}` marks an interpolated value; icon glyphs are omitted; a `\*` inside a quote is a literal asterisk in the label. "Owner / admin / designer / accounting member" = a member carrying the `owner` / `admin` / `id` / `accounting` tag. "Hand-off B / C / D / E" = owned by reader B (Lead Management), C (Quotes & Pricing), D (data model, migrations, every route's permission checks in depth, notifications) or E (2.0 today) and only named here. Abbreviations: `ACC` = `src/app/(main)/accounts/page.tsx`; `TS` = `src/components/settings/team-settings.tsx`; `MOP` = `src/components/accounts/member-override-panel.tsx`; `LPE` = `src/components/settings/lead-preference-editor.tsx`; `RE` = `src/components/accounts/role-editor.tsx`; `RDC` = `src/lib/settings/role-display-config.ts`; `AC` = `src/lib/access-control.ts`; `SC` = `src/lib/queries/studio-config.ts`; `SQ` = `src/lib/queries/studio.ts`; `INV` = `src/lib/queries/invitations.ts`; `MEM` = `src/app/api/identity/members/route.ts`; `RADD` = `src/app/api/studio/members/request-add/route.ts`; `MREQ` = `src/app/api/studio/member-requests/route.ts`; `ITOK` = `src/app/api/invitations/[token]/route.ts`; `ROLES` = `src/app/api/studio-config/roles/route.ts`; `ROLEID` = `src/app/api/studio-config/roles/[id]/route.ts`; `RPERM` = `src/app/api/studio-config/role-permissions/route.ts`; `MOVR` = `src/app/api/studio-config/member-overrides/route.ts`; `LET` = `src/app/(main)/accounts/legal-entities-tab.tsx`; `SCQ` = `src/lib/queries/studio-companies.ts`; `SCR` = `src/app/api/studio-companies/records/route.ts`; `SCRID` = `src/app/api/studio-companies/records/[id]/route.ts`; `USG` = `src/app/(main)/accounts/usage/page.tsx`; `SHV` = `src/components/analytics/studio-health-view.tsx`; `SHR` = `src/app/api/usage/studio-health/route.ts`; `SET` = `src/app/(main)/settings/page.tsx`; `EXE` = `src/lib/agents/executors.ts`; `T` = `src/types/app.ts`; `MIG/` = `scripts/migrations/`.

## Vocabulary (where each word is defined)

- **Accounts / Accounts Setup** — the studio configuration page `/accounts` (`ACC`), header *"Accounts Setup"* (`ACC:615`); nine sidebar groups, the first of which is **Studio** (`ACC:75-82`), the subject of this slice. The profile menu says *"Accounts Setup"* (`src/components/layout/topbar.tsx:509`); its coach mark says *"Studio settings"* (`src/components/ui/page-coach-marks.tsx:74`).
- **Settings** — a different, per-person page `/settings` (`SET`), *"Manage your profile, preferences, and billing."* (`SET:260`). A few of its sections hold member or studio data (A-61…A-66).
- **Member / team member** — one `studio_members` row joined to the person's `profiles` row; name, email, phone and photo live on `profiles` (`MEM:41-56`; `T:475-497`).
- **Tag** — the access primitive: `studio_members.tags`, one or more of `owner`, `admin`, `id` (Interior Designer), `accounting`, `manager` (`AC:15`), constrained by the `valid_tags` CHECK (`MIG/016_roles_and_tags.sql`, widened by `MIG/129_widen_valid_tags_for_accounting.sql` and `MIG/296_lead_manager_hierarchy.sql:18-41`). The Team screen calls tags "roles" (*"Roles \*"*, *"Members need at least one role"*) and the tier "Access Level".
- **Role** — a `studio_roles` row: name, slug, colour, *Assignable*, permissions JSON (`MIG/090_studio_customization_engine.sql:38-49`; `T:3809-3843`). A member is linked to a role only by holding a tag equal to its slug, and the resolver only ever looks up the slugs `owner > admin > accounting > id` (**TAG_PRIORITY**, `RPERM:16`).
- **System role / custom role** — `is_system = true` rows (Owner, Admin, Interior Designer, Accounting) carry a *"System"* badge and are locked in the editor (`RE:486, 531`); any other row is a custom role.
- **Manager** — a Dyel-only tag layered on `id`, active only when the studio feature `leadManagerHierarchy` is on (`SC:661-662, 681-682`); explicitly "a TAG, not a role" (`RE:189-211`).
- **Title** — free text per member (`studio_members.title`), shown in place of the role chips (`TS:448-517`).
- **Access Level / Page Access / Data Visibility / Lead Assignment** — the four blocks of a member's *"Edit Permissions"* panel (`TS:598-826`); only Access Level and Lead Assignment write anything.
- **Member overrides** — per-member deltas: `permission_overrides` (partial role permissions) and `workflow_overrides` (partial workflow toggles) (`MIG/114_studio_member_overrides.sql`), edited in the *"Overrides"* dialog (`MOP`).
- **Open to New Leads** — `studio_members.accepting_leads`; **lead preferences** — `studio_members.lead_preferences`, five dimensions each *Must Match* / *Nice to Have* (`LPE`).
- **Member-addition request** — what *"Invite Member"* actually creates: a `studio_member_requests` row plus an email to the OpenMaison team; no account is made (`RADD:1-8`). **Invitation** — the older self-serve `studio_invitations` flow; only its list, resend and cancel remain reachable (A-15, A-16).
- **Remove member** — a deactivation (`is_active = false`), never a row delete (`MEM:129-163`).
- **Legal entity / studio company / issuing entity** — one `studio_companies` row (`MIG/126_studio_companies.sql`); **default entity** — the row with `is_default = true`, used when a document names no entity (`LET:1-18`). Pickers elsewhere say *"Issuing legal entity"* (`src/components/finance/entity-select-field.tsx:37`).
- **Studio Health** — the owner's usage dashboard at `/accounts/usage` (`USG`), built from the nightly `usage_daily_rollup` plus raw `usage_events` (`SHR`).
- **"Team Members" (portal)** — unrelated: the HomeOwner Portal's *Team* section is a free-text list of name / role / bio / photo that never reads `studio_members` (`src/components/settings/team-page-editor.tsx:14-20, 64`; hub `src/components/settings/portal-config-hub.tsx:58, 288-289`). It uses the same heading *"Team Members"*.

---

## The Accounts shell

### A-01 · How Accounts Setup is reached
- Where: `src/components/layout/topbar.tsx:493-511`; `src/components/ui/welcome-modal.tsx:12-16, 38-44, 89-91`; `src/app/studio-setup/page.tsx:700-704`; `src/components/ui/page-coach-marks.tsx:72-78`; `src/components/layout/app-sidebar.tsx:196-204`; `src/components/layout/bottom-nav.tsx:34-58`.
- Entry: owner → profile avatar (top right) → *"Accounts Setup"*; owner's first-login welcome modal → *"Start Setup"*; setup wizard's last step → *"Invite your team"* (`/accounts?tab=team`).
- Does: opens `/accounts`, which lands on Team Members (default tab `team`, `ACC:224`). The desktop rail, the phone bottom nav and the topbar's Tools grid have no Accounts item; there is no keyboard shortcut and search does not index settings.
- Rules: the profile-menu item is owner-only on purpose; its comment says the page "remains reachable for ID + accounting via direct URL / sidebar" (`topbar.tsx:494-501`) — there is no sidebar item, so non-owners arrive only by typed URL or in-app deep link (A-04, A-07). The coach mark on `/accounts` is owner-only (`page-coach-marks.tsx:77`) and promises that *"Leads can only be assigned to active team members."*
- Data: —
- States: —
- Words: *"Accounts Setup"*; *"Start Setup"*; *"Invite your team"*; coach mark *"Studio settings"*, *"Invite your team here. Leads can only be assigned to active team members."*
- Reachable: yes (owner); others by URL or deep link.

### A-02 · Who can open /accounts
- Where: `AC:123-126, 190-195`; `src/app/(main)/layout.tsx:120-146, 187-196`; `src/context/platform-config-context.tsx:46-51`; `src/app/api/config/pages/route.ts:6-51`.
- Entry: any navigation to `/accounts…`.
- Does: the layout guard admits any member tagged owner, admin, id or accounting (`ROUTE_ACCESS.accounts`); owners who have not finished setup are sent to `/studio-setup`; when the platform page key `accounts` is off (global `platform_config.page_visibility`, overridable per studio in `studios.settings.page_visibility`; on when absent) the page shows *"Coming Soon"*.
- Rules: the guard calls `canAccessPage(tags, pathname)` without role permissions, so the Roles & Permissions page matrix never affects it (A-49). The comment at `AC:123-125` says the page "filters tabs to viewable subset" and that the "Roles editor and most other tabs remain owner-only via in-page menu filtering" — the only in-page filter hides Studio Health (`ACC:636-639`); every other tab, Roles & Permissions and Legal Entities included, renders for any member who reaches the URL. `docs/rules/architecture.md:224` marks *Accounts* owner-only (Y / - / - / -), contradicted by `AC:126`. A member with no tags is sent to `/login` (`AC:190-195`).
- Data: `studios.settings.page_visibility`, `platform_config`.
- States: *"Coming Soon"* screen.
- Words: *"Coming Soon"*, *"This feature is not yet available. Check back later!"*
- Reachable: yes.

### A-03 · The page shell and the Studio group
- Where: `ACC:73-158` (menu), `ACC:613-687` (shell), `ACC:1946-1952` (Suspense wrapper).
- Entry: `/accounts`.
- Does: a left card with a search box and nine collapsible groups — *Studio*, *Lead Management*, *Quotes & Pricing*, *Workflow*, *Projects*, *Finance*, *Branding & Comms*, *HomeOwner Portal*, *AI & Copilot* — and a right content card. The Studio group holds *Team Members* (`team`), *Legal Entities* (`legal-entities`), *Roles & Permissions* (`roles`) and *Studio Health* (`usage`, an `href` to `/accounts/usage`, owner-only). An item either swaps the right pane in place or, for Studio Health, `router.push`es to a separate page. Search filters item labels (not group labels), case-insensitively, expands every group while typing and clears on click.
- Rules: `ownerOnly` (Studio Health) is the only per-role filter (`ACC:636-639`). The HomeOwner Portal group hides when platform page `tools/homeowner-portal` is off (`ACC:222, 634`). The group of the active tab is always expanded; the initial expansion is the deep-linked tab's group, else *Studio* (`ACC:252-256, 644-645`). Studio Health's page has no Accounts sidebar (`USG:22-29`), so the way back is browser Back or the profile menu. The other eight groups belong to other readers.
- Data: —
- States: —
- Words: *"Accounts Setup"*, *"Configure your studio's lead pipeline, AI rules, and workspace settings."*, *"Search settings..."*; group *"Studio"*; items *"Team Members"*, *"Legal Entities"*, *"Roles & Permissions"*, *"Studio Health"*.
- Reachable: yes.

### A-04 · Deep links into the Studio group
- Where: `ACC:189-249`; `src/app/(main)/accounts/roles/page.tsx:14-25`; callers named below.
- Entry: `?tab={id}`; `/accounts/roles`; links from other modules.
- Does: `?tab=` picks the pane; a group label (e.g. `?tab=studio`) resolves to its first item; the retired id `assemblies` maps to `quote-templates`; legacy `portal-*` ids open the portal hub with `?section=`. Switching tabs rewrites the URL with `history.replaceState` to `/accounts?tab={id}` (`ACC:246-249`), so Back leaves Accounts instead of stepping through tabs, and other query params (`section`, `pb`, `type`) are dropped. `/accounts/roles` is a stub that `router.replace`s to `/accounts?tab=roles`.
- Rules: an unknown `?tab=` renders an empty content card (no fallback). `?tab=usage` highlights *Studio Health* and renders nothing — that page only opens through its `href`. Links into the group: `/accounts?tab=team` (setup wizard), `/accounts` (welcome modal; notification action URLs such as `src/lib/notifications/resolve-recipients.ts:41` `team: "/accounts"` and `src/app/api/studio/members/route.ts:98`). Broken: `/accounts#expense-categories` (`src/components/finance/ExpenseDialog.tsx:512`) is a hash, not a tab, and lands on Team Members; the email-preview sample links `https://openmaison-ai.vercel.app/accounts/team` (`src/app/api/dev/email-preview/route.ts:145`), a route that does not exist. `docs/rules/architecture.md:243` calls `roles/page.tsx` the "Owner-only Roles & Permissions matrix editor"; it is the redirect stub.
- Data: —
- States: blank pane for unknown and `usage` tabs.
- Words: *"Redirecting to Roles & Permissions…"*
- Reachable: yes.

### A-05 · What the page loads whatever tab is open
- Where: `ACC:258-284, 1447`.
- Entry: opening any Accounts tab.
- Does: one component fetches studio settings, **every lead**, lead categories, custom fields, pipeline stages, funnel, workflow toggles, roles, features, quote categories, three taxonomies and branding on each visit, then the pane's own queries. The lead list only feeds the Lead Funnel pane's per-bucket counts.
- Rules: Team Members therefore waits behind a full leads read on large studios (not measured).
- Data: reads only.
- States: —
- Words: —
- Reachable: yes.

### A-06 · How the Studio group saves
- Where: `TS:178-223, 449-482, 757-768`; `LPE:135-169`; `MOP:85-101, 158-181`; `RE:334-346, 382-454`; `LET:182-256`; `ACC:166-187, 422-431`.
- Entry: —
- Does: Team Members writes **immediately** on each action — tag card, title Enter/blur, *Open to New Leads* switch, dismiss / resend / cancel / remove after an inline confirm strip — with a toast, then refetches. Lead preferences, member overrides, roles and legal entities use an explicit **Save** in a panel, card or dialog. Nothing is optimistic.
- Rules: dirty tracking exists only in the role panel (*"Unsaved changes"*, Save disabled until something changed) and in the overrides dialog (discard confirm). Opening another role, collapsing a role, switching tabs or closing the entity dialog discards edits silently. The page-level `SaveButton` / *"Saved!"* pattern belongs to other groups. Studio-settings writes (used by the Settings switches in A-65) always shallow-merge on the server since 2026-08-21, after a whole-object replace erased a studio's branding (`ACC:422-431`; `src/app/api/identity/studio-settings/route.ts:75-110`). Error toasts are generic and mostly swallow the server's message (a 403 on a role save reads *"Failed to save role"*); Legal Entities shows the raw server or Postgres message (`LET:217-219`).
- Data: —
- States: —
- Words: *"Unsaved changes"*.
- Reachable: yes.

### A-07 · The Studio group as a designer, admin or accounting member sees it
- Where: `ACC:636-639, 1739-1746`; `TS:72, 247, 372, 833, 922`; `LET:158-172`; `USG:14-20`; `AC:126, 192`.
- Entry: typed URL or an in-app deep link (A-04); there is no menu entry for them (A-01).
- Does: *Team Members* — the list, read-only: no *Invite Member*, no ⋮ menus, no pending lists. *Legal Entities* — the full editor, every action live. *Roles & Permissions* — the full editor; every save fails. *Studio Health* — hidden from the sidebar; the URL redirects to `/dashboard`.
- Rules: accounting-only members land on `/finance/pipeline` by default (`AC:192`) but can still open `/accounts`. What the server allows each of them is in A-33, A-41, A-56 and A-57.
- Data: —
- States: —
- Words: —
- Reachable: URL / deep link only.

---

## Team Members — the list

### A-08 · The Team Members pane and a member row
- Where: `TS:53-72, 240-261, 365-445`; mounted at `ACC:1436`.
- Entry: Accounts → Studio → *Team Members* (the default tab).
- Does: header, an owner-only *"Invite Member"* button, then one card per **active** member: initials avatar, full name, badges, email and phone (phone is a `tel:` link), a title pill or the role chips, and — for an owner, on other non-owner rows — a ⋮ menu. Under the list: *Pending requests* and *Pending Invitations* (owner-only).
- Rules: badges — *"You"* (own row); *"Invited"* (`studio_members.invitation_status = 'invited'`, set only by the dead self-serve invite flow, A-16); *"Override"* (the member has any workflow override or any non-empty permission-override entity; the tooltip names which); *"Signature"* (an active saved signature, A-29). A title replaces the role chips entirely, so a titled member's roles are not visible on the row (`TS:486-517`). The list has no sort (`MEM:41-48` sets no order), search, filter or count; removed members never appear and cannot be listed (A-28). Stats loaded with each member (`specialty`, `close_rate`, `projects_last_12_months`, `active_projects_count`) are not shown here (`src/lib/transformers.ts:676-711`).
- Data: `studio_members` + `profiles.full_name, email, avatar_url, phone` via `GET /api/identity/members` (`is_active = true`); `member_signatures` roster.
- States: loading (A-11).
- Words: *"Team Members"*, *"Manage access and permissions for your studio team."*, *"Invite Member"*, *"You"*, *"Invited"*, *"Override"* (title *"Member overrides applied ({workflow + permission})"*), *"Signature"*, *"No email"*, *"No phone"*.
- Reachable: yes.

### A-09 · What a member is, and where each field is edited
- Where: `T:475-497`; `src/types/database.ts:217-243`; `src/lib/transformers.ts:676-711`; `MIG/090_studio_customization_engine.sql:52`; `MIG/078_hangout_id_profiles_and_invites.sql:26`.
- Entry: —
- Does: from `profiles` — full name, email, phone (E.164; also the login identity), avatar. From `studio_members` — tags, title, `is_active`, `joined_at`, `accepting_leads` (default true), `lead_preferences`, `permission_overrides`, `workflow_overrides`, `invitation_status` / `invited_at` / `invited_by`, the legacy `role` enum, `specialty`, `close_rate`, `projects_last_12_months`, `active_projects_count`, and an unused `role_id` foreign key to `studio_roles`.
- Rules: in Team Members an owner can edit only tags, title, *Open to New Leads*, lead preferences and overrides. Name, email, phone and photo change only when the member edits them in Settings › Your Profile (A-62); nobody can correct another member's contact details in the app. `specialty` has no reachable editor (only the dead `POST /api/studio/members` sets it). `role_id` is never read or written by app code (grep). There is no reporting line (A-30).
- Data: as listed.
- States: —
- Words: —
- Reachable: —

### A-10 · The role chips and the resolved role list
- Where: `RDC:46-105`; `TS:74-91, 498-516`.
- Entry: every chip and card in Team Members.
- Does: one list built from the studio's `studio_roles` rows (label = role name in capitals, colour = role colour, description = *"{data scope} · {Listed in / Not in} dropdowns"*), plus every built-in tag those rows do not cover — in practice **Manager**. A studio with no role rows falls back to the five built-in tags. Owner is removed from the editable and invite lists.
- Rules: *Manager* is appended for every studio whether or not its manager hierarchy is on — for everyone but Dyel it is a toggle that does nothing (`RDC:58-63`). Custom roles also become chips and toggles, but can never be stored on a member (A-53). Built-in descriptions contradict the rows: ADMIN *"All data visible, not listed in dropdowns"* against an Admin row whose *Assignable* is on, which does list admins in lead pickers (A-54).
- Data: `studio_roles` via `GET /api/studio-config/roles`.
- States: —
- Words: built-in labels *"OWNER"*, *"ADMIN"*, *"ID"*, *"ACCOUNTING"*, *"MANAGER"*; descriptions *"Full access to everything"*, *"All data visible, not listed in dropdowns"*, *"Interior Designer — listed in assignment dropdowns"*, *"Finance access — PO review, reports, commissions"*, *"Sees only leads routed to them; can assign to designers"*; built descriptions *"All data visible"* / *"Team data visible"* / *"Assigned data only"* joined with *"Listed in dropdowns"* / *"Not in dropdowns"*.
- Reachable: yes.

### A-11 · Loading, empty and error states
- Where: `TS:55, 225-238`; `src/lib/queries/leads.ts:122-140`; `INV:29-73`.
- Entry: —
- Does: while members load, the pane shows *"Loading team members..."*; afterwards it renders whatever came back.
- Rules: a failed members read renders an empty list with no message (the hook's error is never shown); failed invitation and request reads are swallowed to empty lists on purpose (`INV:39-44, 65-68`). No empty state exists for a studio with no other members.
- Data: —
- States: loading only.
- Words: *"Loading team members..."*
- Reachable: yes.

---

## Team Members — adding people

### A-12 · "Invite Member" (a request, not an invite)
- Where: `TS:93-176, 247-258, 263-362`; `INV:164-189`.
- Entry: owner → Team Members → *"Invite Member"* (the button toggles the form; pressing it again clears the form).
- Does: a card *"Invite a new team member"* — Full Name, Phone (country picker, E.164), optional Email, one or more role chips (default *ID*). *"Send Invite"* posts a **member-addition request** (A-13). On success: a toast plus the inline line *"New member addition request sent"*; the form clears and closes after 2 s.
- Rules: client checks — name required; phone digits within the detected country's minimum–maximum (country found by the longest matching dial code, else the studio's country); at least one role. Email is not validated. The chips include custom roles and *Manager* (A-10); Owner cannot be requested here. The button is owner-only (`TS:72, 247`) although the server also admits admins (A-13). The button says *Invite* but nothing reaches the person — no account, login link, SMS or email — until the OpenMaison team provisions them by hand.
- Data: `studio_member_requests` (write, via A-13).
- States: *"Sending…"*; red error line; green success line.
- Words: *"Invite a new team member"*, *"Full Name \*"*, *"e.g. Priya Nair"*, *"Phone \*"*, *"Email (optional)"*, *"colleague@company.com"*, *"If provided, it will be included in the request so we can set up their account."*, *"Roles \*"*, *"Send Invite"*, *"Cancel"*; errors *"Full name is required"*, *"Valid phone number is required ({min}-{max} digits)"*, *"Select at least one role"*, fallback *"Failed to send the request"*; success *"New member addition request sent"*.
- Reachable: yes (owner).

### A-13 · The member-addition request (server)
- Where: `RADD:1-230`; `MIG/205_studio_member_requests.sql`.
- Entry: A-12.
- Does: rate-limits to 10 requests a minute per IP; requires the caller to be owner **or admin**; normalises the phone to E.164 (Singapore rules when no country is sent); stores a `studio_member_requests` row (`status = 'pending'`, requested tags default `{id}`, requester id and name); then emails a table — full name, phone, email, roles requested, studio, requested by — to four fixed OpenMaison staff addresses from *"OpenMaison Notifs <updates@mail.openmaison.ai>"*, reply-to the requester.
- Rules: it succeeds if either the row or the email lands, and returns 502 only when both fail. With no `RESEND_API_KEY` (prod and demo, per the comment at `RADD:183-184`) or an allow-list block, the row is saved and nobody at OpenMaison is emailed — the request just waits in *Pending requests*. Requested tags are not validated: an admin can request `owner` or a custom slug (unknown tags print raw; labels exist only for owner / admin / accounting / id, `RADD:31-36`). No duplicate check — the same phone can be requested again and again. The caller is looked up by `user_id` only with `.single()` (`RADD:70-74`), so a person in two studios gets *"Studio not found"*, and `is_active` is not checked. The recipient list is hard-coded (`RADD:22-27`).
- Data: writes `studio_member_requests` (`studio_id, full_name, phone, email, tags, requested_by, requested_by_name, status`); reads `studios.name`, `profiles.full_name, email`.
- States: 400 / 401 / 403 / 404 / 429 / 500 / 502.
- Words: *"Too many requests. Please try again later."*, *"Only owners and admins can request team members"*, *"Phone and full name are required"*, *"Couldn't submit the request. Please try again."*, *"Studio not found"*; email subject *"New team member request — {studio}"*, heading *"New team member request"*, *"A studio has requested that a new member be added to their workspace."*
- Reachable: yes.

### A-14 · Pending requests
- Where: `TS:832-919`; `MREQ:39-120`; `INV:55-89`.
- Entry: owner → Team Members (shown only while at least one request is pending).
- Does: lists pending requests — initials, name, phone, email, requested role chips, a *Pending* chip — with a count badge and an ✕ that dismisses (`status = 'dismissed'`, `handled_at`). On every read, a request whose phone equals the phone of any member of the studio is marked `handled` and dropped, closing the loop without anyone pressing anything.
- Rules: the auto-resolve matches every `studio_members` row, active or removed (`MREQ:64-67`), so re-requesting a removed person resolves at once and vanishes although nobody reactivated them. The read has a write side effect. Dismiss has no confirm and no undo. The list and dismiss routes check only for a session — any member can read or dismiss requests through the API; only the UI is owner-gated. Chips render only for tags in the resolved role list; unknown tags are skipped (`TS:875-877`).
- Data: `studio_member_requests` (read, update); `studio_members.user_id` and `profiles.phone` (service-role read).
- States: hidden when none.
- Words: *"Pending requests"*, *"Submitted member additions awaiting setup by the OpenMaison team."*, *"Pending"*, title *"Dismiss request"*; toasts *"Request dismissed"*, *"Could not dismiss request"*.
- Reachable: yes (owner).

### A-15 · Pending Invitations (legacy self-serve invites)
- Where: `TS:921-1066`; `INV:29-49, 191-233`; `ITOK:6-268`; `src/app/api/invitations/records/route.ts:39-59`; `MIG/080_studio_invitations.sql`.
- Entry: owner → Team Members (shown only while a `studio_invitations` row is `pending`).
- Does: lists pending invitations with role chips, *Pending* or *Expired* (computed in the browser from `expires_at`), *"Resend"*, and ✕ → confirm strip → *"Yes, Cancel"*. Resend (owner or admin on the server) resets `expires_at` to now + 30 days, re-sends the SMS (Twilio) and, when there is an email, the `team.member_invited` email with a `/login` link. Cancel sets `status = 'cancelled'`. Reading an invitation by token marks it `expired` when past its date.
- Rules: nothing in the app creates invitations any more (A-16), so this section only shows rows left over from before the request flow. An expired row that is still `pending` can be resent. The server's owner/admin lookup is by `user_id` with `.single()` (`ITOK:90-94, 236-240`), so people in two studios fail. Signing in auto-accepts every pending invitation for the phone (`src/app/api/auth/verify/route.ts:57-80`).
- Data: `studio_invitations` (`status` pending / accepted / expired / cancelled, `expires_at` default now + 30 days, `token`, `member_id`, `profile_id`, `hangout_event_id`).
- States: hidden when none.
- Words: *"Pending Invitations"*, *"Pending"*, *"Expired"*, *"Resend"*, *"Cancel invitation for {name}?"*, *"No"*, *"Yes, Cancel"*, *"Cancelling…"*; toasts *"Invitation resent to {name}"*, *"Could not resend invitation"*, *"Invitation cancelled"*, *"Could not cancel invitation"*; SMS *"Reminder: You've been invited to join {studio} on OpenMaison. Login at {url} to get started."* (event variant *"Reminder: You've been invited to {event} by {studio} on OpenMaison. Login at {url} to get started."*); server *"Can only resend pending invitations"*, *"Only owners and admins can resend invitations"*, *"Only owners and admins can cancel invitations"*.
- Reachable: yes, only with legacy rows.

### A-16 · Add-member paths with no caller
- Where: `src/app/api/invitations/send/route.ts:1-234`; `src/app/api/invitations/accept/route.ts`; `src/app/api/studio/members/route.ts:10-113`; `INV:91-158, 235-257`.
- Entry: none (grep finds no UI caller).
- Does: `POST /api/invitations/send` (owner or admin) creates the auth user, profile and member through the RPC `create_invited_member`, a `studio_invitations` row, an SMS and an email — true self-serve invites. It allow-lists tags to owner / admin / id / accounting, forbids non-owners granting `owner`, and refuses a second pending invite for the same phone (`send/route.ts:10, 61-94`). `POST /api/studio/members` (owner-only) adds an existing profile as a member and emails owners `team.member_added`. The hooks `useSendInvitation`, `useAcceptInvitation`, `useInvitationByToken` and `usePendingHangoutInvitations` have no callers.
- Rules: the dead send route's tag rules never reached the live request route (A-13). `docs/user-stories/detailed/accounts-setup.md:26` names an `InviteMemberForm` component that no longer exists (grep). The RPC `create_invited_member` is not defined in this repo's migrations (Uncertain 7).
- Data: `studio_invitations`, `studio_members`, `profiles`, `auth.users`.
- States: —
- Words: —
- Reachable: dead (API only).

### A-17 · Emails and messages the team flows send
- Where: `RADD:131-217`; `ITOK:167-203`; `src/lib/notifications/events.ts:570-592`; `src/lib/notifications/templates/base/team.ts:6-60`; `src/lib/notifications/templates/whatsapp.ts:49-50`.
- Entry: A-13, A-15, A-16.
- Does: (1) a request → one email to the OpenMaison team (A-13); (2) an invitation resend → SMS plus the `team.member_invited` email to the invitee (functional, always sent); (3) the dead add-member route → `team.member_added` to owners (*"{member} has joined {studio}."*, button *"View team"* → `/accounts`). Nothing is sent when an owner changes someone's roles, title or overrides, or removes a member.
- Rules: a removed member is not told; the remaining owner learns only from the removal toast (A-27). Channels and preferences are hand-off D.
- Data: the notifications pipeline (hand-off D).
- States: —
- Words: WhatsApp templates *"Welcome to {{studio_name}}. Get started: {{action_url}}"*, *"{{invited_by}} invited you to {{studio_name}}. Sign in: {{login_url}}"*; event labels *"Team Member Added"*, *"Team Member Invited"*.
- Reachable: (1) yes; (2) legacy rows only; (3) dead.

---

## Team Members — editing people

### A-18 · The member actions menu
- Where: `TS:367-372, 519-567`.
- Entry: owner → Team Members → ⋮ on another non-owner member's row.
- Does: *"Edit Permissions"* / *"Hide Permissions"* (expands the panel, A-20…A-24), *"Overrides"* (A-25), *"Set Title"* / *"Edit Title"* (A-19), *"Remove Member"* (A-27).
- Rules: shown only when the viewer is an owner, the row is not their own and the row is not an owner (`canManage`, `TS:372`). So in the UI nobody can change an owner's tags, overrides or membership, owners cannot edit themselves, and a title can be set on an owner only if one already exists (A-19). Admins see no menu at all, although the server lets them save overrides (A-25) and lets any member write tags, titles and removals (A-33).
- Data: —
- States: —
- Words: *"Edit Permissions"*, *"Hide Permissions"*, *"Overrides"*, *"Set Title"*, *"Edit Title"*, *"Remove Member"*.
- Reachable: yes (owner).

### A-19 · Title
- Where: `TS:103-105, 448-495, 548-554`; `SQ:280-292`; `MEM:85`.
- Entry: owner → ⋮ → *Set Title / Edit Title*; or an owner clicks an existing title pill.
- Does: an inline text input; Enter or blur saves (an unchanged value just closes), Escape cancels; an empty value clears the title (stored `null`).
- Rules: clicking an existing pill works for an owner on **any** row that has a title, their own and other owners' included (`TS:487-488` checks only that the viewer is an owner), while *Set Title* lives only in the menu — so an owner cannot give themselves or another owner a first title. No length limit. The title shows only in Team Members; quote *prepared by* titles come from studio branding, never from the member (`src/lib/quote-prepared-by.ts:12-13`; grep found no other reader).
- Data: `studio_members.title`.
- States: —
- Words: *"Enter title…"*; toasts *"Title updated"*, *"Could not update title"*.
- Reachable: yes (owner).

### A-20 · Edit Permissions › Access Level (a member's tags)
- Where: `TS:178-194, 601-649`; `SQ:263-278, 367-383`; `MEM:64-116`.
- Entry: owner → ⋮ → *Edit Permissions* → *Access Level*.
- Does: one card per entry of the resolved role list except Owner (label + description); pressing a card adds or removes that tag at once.
- Rules: at least one tag must remain — client only (*"Members need at least one role"*); the server accepts an empty array (`MEM:84`). Tags combine freely (e.g. `{admin, id}`). Choosing a custom-role card fails at the database, because `valid_tags` admits only owner / admin / id / accounting / manager (`MIG/296_lead_manager_hierarchy.sql:18-41`), and toasts *"Could not update roles"* (A-53). The Maison bot can also change tags, under stricter rules (A-32).
- Data: `studio_members.tags`.
- States: —
- Words: *"Access Level"*; toasts *"Roles updated"*, *"Could not update roles"*, *"Members need at least one role"*.
- Reachable: yes (owner).

### A-21 · Edit Permissions › Page Access (a read-only grid)
- Where: `TS:38-51, 651-694`.
- Entry: the same panel.
- Does: 12 tiles — *Dashboard, Leads, Chats, Projects, Tasks, Escalations, Finance, Marketplace, Accounts, Verify, Settings, Upgrade* — each ✓ or ✗. It picks the member's role by `owner > admin > accounting > id`, reads that row's `pages` map, and uses the tag route table only when the row has no pages map.
- Rules: display only, and it disagrees with the real guard, which ignores role pages (A-49). Where roles came from the setup wizard (`pages: {}`, `src/app/studio-setup/page.tsx:323`) **every tile shows ✗ for every member**. With migration-109 rows an admin shows *Accounts* ✗ and a designer *Accounts* and *Finance* ✗ although the guard lets both in (`AC:110, 126`), and an accounting member shows *Settings* ✓ although the guard keeps accounting out of `/settings` (`AC:128`). The menu item says *Edit Permissions*; nothing in this grid is editable.
- Data: `studio_roles.permissions.pages`.
- States: —
- Words: *"Page Access"*; tile labels as listed.
- Reachable: yes (owner).

### A-22 · Edit Permissions › Data Visibility (static notes)
- Where: `TS:696-740, 1080-1099`.
- Entry: the same panel.
- Does: three coloured notes chosen purely from tags — designers without `admin` get the assigned-only notes; everyone else gets *"Sees all leads, projects, tasks, and escalations"* plus chat and dropdown notes that depend on the `id` tag.
- Rules: copy, not a reading of any setting, and wrong in places: an accounting-only member is told they see all leads and projects, but the route table gives accounting finance pages only (`AC:64-130`); an admin without `id` is told *"Not listed in assignment dropdowns"*, but pickers list any member whose tag matches an *Assignable* role, and the Admin role is assignable (A-54). *"Can only move leads forward in the pipeline"* was not traced (hand-off B; Uncertain 8).
- Data: —
- States: —
- Words: *"Data Visibility"*; *"Sees only assigned leads, tasks, and escalations"*, *"Sees only participating chats"*, *"Can only move leads forward in the pipeline"*, *"Sees all leads, projects, tasks, and escalations"*, *"Sees all chats"*, *"No access to Chats"*, *"Listed in lead assignment dropdowns"*, *"Not listed in assignment dropdowns"*.
- Reachable: yes (owner).

### A-23 · Lead Assignment › Open to New Leads
- Where: `TS:742-775`; `SQ:326-337`; `SET:394-413`; `src/components/layout/topbar.tsx:84-90, 284-335`; `src/components/leads/lead-detail-drawer.tsx:246-276, 1291`.
- Entry: owner → member panel (members with the `id` tag only); the designer themselves in Settings › Lead Preferences and in the topbar switch.
- Does: flips `accepting_leads`. The lead drawer's recommended designer considers only accepting members (`lead-detail-drawer.tsx:253`); assignee pickers mark accepting members.
- Rules: three places write the same flag; the Settings switch gives no success or error feedback (`SET:404-406`). The "AI" recommendation is a local score — preferences 0–40 plus performance plus specialty — not an AI call (hand-off B).
- Data: `studio_members.accepting_leads` (default true).
- States: switch disabled while saving (Team only).
- Words: *"Lead Assignment"*, *"Open to New Leads"*, *"When off, this ID will not receive AI-recommended leads"*; toasts *"Now open to new leads"*, *"Closed to new leads"*, *"Could not change lead acceptance"*; topbar *"Open"*, *"Closed"*, *"You are open to receiving new lead assignments via AI recommendation"*, *"You are closed to new leads. AI will not recommend you for assignments"*.
- Reachable: yes.

### A-24 · Lead Assignment › Lead Preference Weights
- Where: `TS:777-822`; `LPE:14-320`; `SQ:339-359`; scoring `src/components/leads/lead-detail-drawer.tsx:150-212`.
- Entry: owner → member panel → *"Set"* or *"Override"*; the designer → Settings › Lead Preferences (A-63).
- Does: five dimensions — *Property Type* (region property types), *Budget* (region budget ranges), *Design Style* (region styles without *No preference*), *Area / Location* (region areas), *Scope* (project types) — each *Must Match*, *Nice to Have* or *Don't Care*, with value chips. *"Save Preferences"* stores only dimensions that have at least one value; *"Clear"* stores `null`.
- Rules: a dimension given a priority but no chips is dropped silently on save. *Must Match* is not a filter: it weighs 3 against 1 for *Nice to Have* in a 0–40 score, and no preferences scores a neutral 20 (`lead-detail-drawer.tsx:151-212`). The owner's editor has no Cancel; it stays open until saved or cleared. Chips come from the studio's region lists at render time; a stored value missing from the current list is kept but not shown.
- Data: `studio_members.lead_preferences` `{ property_type, budget, design_style, area, scope: { values[], priority } }`.
- States: read-only bars when set; *"Not configured"* when not.
- Words: *"Lead Preference Weights"*, *"Override"*, *"Not configured"*, *"Set"*, *"Must Match"*, *"Nice to Have"*, *"Don't Care"*, *"Property Type"*, *"Budget"*, *"Design Style"*, *"Area / Location"*, *"Scope"*, *"{n} of 5 categories configured"*, *"Not set"*, *"This category won't affect lead matching. Select a priority to configure."*, *"Save Preferences"*, *"Clear"*; toasts *"Lead preferences saved"*, *"Failed to save preferences"*, *"Lead preferences cleared"*, *"Failed to clear preferences"*.
- Reachable: yes.

### A-25 · Member Overrides (the dialog)
- Where: `MOP:17-326`; `TS:541-547, 1067-1075`; `SC:748-769, 796-817`; `MOVR:17-62`.
- Entry: owner → ⋮ → *"Overrides"*.
- Does: two tabs. *Workflow* — seven switches showing the member's effective value; switching to the studio default removes the override, switching away stores it, *Reset* drops it. *Permissions* — eight switches (*Submit for review, Approve quote, Send quote, Edit / add / remove items, Override schedule on a quote, Override handover lock, Approve expense, Approve task*) against a "role default". *"Save overrides"* writes both blobs (empty → `null`); closing with unsaved changes asks to discard.
- Rules: the "role default" is not the member's role. `useCurrentRolePermissions(studioId, member.userId)` always resolves the **signed-in user's** role (`SC:748-769`; `RPERM:24-51`), so an owner sees their own grants, mostly *Allow*. Where the owner's row allows an action, the owner cannot grant it to a designer: switching it on equals the "default" and clears the override (`MOP:132-135, 297-305`). The server lets owners **and admins** save overrides for any member, themselves included (`MOVR:23-30`). The *Workflow* tab calls `commissionApprovalRequired` *"Commission change approval"*; Workflow Rules calls the same key *"Track commission for projects"* (`ACC:1632`). What the saved overrides change: A-26.
- Data: `studio_members.permission_overrides`, `workflow_overrides`; reads `studios.settings.workflow`.
- States: *"Saving…"*; an *Override* chip per overridden row.
- Words: *"{name} — Member Overrides"*, *"Per-member deltas on top of role grants and studio defaults. Toggle a switch to set a value just for this member; click Reset to fall back to the role/studio default."*, *"Workflow"*, *"Permissions"*, *"Workflow toggles (e.g. quote approval requirement) that apply just to {name}. The switch shows the value this member will see; matching the studio default automatically clears the override."*, *"Overridden for {name} · Studio default: {ON/OFF}"*, *"Inherits studio default ({ON/OFF})"*, *"Individual action permissions just for {name}. The switch shows whether this member can perform the action; matching the role default automatically clears the override."*, *"{entity} · Overridden for {name} · Role default: {Allow/Deny}"*, *"Inherits role default ({Allow/Deny})"*, *"Reset"*, *"Cancel"*, *"Save overrides"*; workflow labels *"Quote approval required"*, *"Timeline approval required"*, *"Progress review required"*, *"Milestone approval required"*, *"Expense approval required"*, *"PO accounts review required"*, *"Commission change approval"*; toasts *"Overrides saved for {name}"*, *"Failed to save overrides"*; confirm *"You have unsaved override changes. Discard them?"*
- Reachable: yes (owner).

### A-26 · What member overrides actually change
- Where: `AC:366-390`; `src/app/(main)/leads/page.tsx:141-153`; `src/app/(main)/finance/operations/page.tsx:179-190`; `src/components/finance/ExpenseList.tsx:57-69`; `src/components/leads/quote-digitizer-dialog.tsx:1118-1130`; `src/app/(main)/projects/[projectId]/page.tsx:803-825`; `src/components/finance/PaymentScheduleEditor.tsx:51-52`; `src/components/accounts/price-book-manager.tsx:60-61`; `src/app/api/quotes/[id]/transition/route.ts:158`; `src/app/api/projects/[id]/progress-updates/route.ts:155`; `src/app/api/finance/expenses/route.ts:88-97`; `src/context/app-context.tsx:1160`.
- Entry: —
- Does: permission overrides are merged by `resolveEffectivePermissions`, which only three browser screens use — the leads page (`leads.create`, which has no switch in the dialog), finance operations and the expense list (`expense.approve`). Workflow overrides are applied by the quote-transition and progress-update APIs and their screens.
- Rules: of the eight permission switches only *Approve expense* has an effect, and only in the browser. The quote digitizer computes the merged permissions and then discards them (`void effectivePerms`, `quote-digitizer-dialog.tsx:1124-1130`); the project page, payment-schedule editor, price book and every server route read the role row without overrides; *Send quote* and *Approve task* are read nowhere. The merge walks only the entities present in the role row (`AC:377-387`), so on setup-wizard roles (`actions: {}`) every permission override is dropped, and on editor-seeded roles (no `expense` entity, A-43) *Approve expense* is dropped too. Of the seven workflow switches only *Quote approval required* and *Progress review required* change anything per member: the expense, PO and milestone gates read the studio setting directly (`expenses/route.ts:88-97`), the commission key is a studio kill-switch, and timeline approval is inert for everyone (`app-context.tsx:1160`). The Manager card tells owners to use these overrides (A-55).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-27 · Remove Member (deactivation)
- Where: `TS:196-223, 571-596`; `SQ:294-324`; `MEM:118-220`.
- Entry: owner → ⋮ → *"Remove Member"* → confirm strip → *"Remove"*.
- Does: sets `is_active = false` (idempotent) and returns how many leads and projects are still assigned to the member — scalar `assigned_to` / `assigned_designer` plus the assignee junctions, de-duplicated. The toast says the member was removed and, when counts are non-zero, that those records need reassigning. The member leaves the list and every picker fed by the members API.
- Rules: nothing is unassigned; commission rules, meeting history and past assignments stay (why a hard delete was abandoned: `MEM:129-156`). The counts include closed, lost and signed records — no status filter (`MEM:189-195`) — so the "keep them moving" toast overstates. No undo and no reactivation (A-28). The server accepts a removal from any member of the studio, the owner and oneself included (A-33).
- Data: `studio_members.is_active`; reads `leads`, `lead_assignees`, `projects`, `project_assignees`.
- States: *"Removing…"*.
- Words: *"Remove {name} from the team?"*, *"Cancel"*, *"Remove"*, *"Removing…"*; toasts *"Member removed"* with *"{n} lead(s) and {m} project(s) still assigned to them — reassign to keep them moving."*, *"Could not remove member"*.
- Reachable: yes (owner).

### A-28 · After a removal
- Where: `src/app/api/auth/verify/route.ts:49-55`; `src/app/api/auth/me/route.ts:45-60, 88-104`; `src/lib/session.ts:202-226`; `src/proxy.ts:461-478`; `src/lib/api-auth.ts:23-33`; `src/lib/api-role-guard.ts:13-26`; `MREQ:63-67`; `EXE:1322-1360`; `src/components/accounts/workflow-approver-selector.tsx:24-41`; `src/app/api/projects/[id]/progress-updates/route.ts:199-201`; `src/components/leads/lead-detail-drawer.tsx:3040-3049`.
- Entry: —
- Does: a removed member can no longer sign in — login looks for an **active** membership.
- Rules: removal does not end sessions already open. The session cookie carries only the user and studio ids with no expiry inside; the proxy checks only its signature; `/api/auth/me` reads the membership without `is_active` and re-issues remember-me cookies for another 30 days on every call; most API routes check only for a session, and the tag checks that exist (`getCallerTags`) ignore `is_active`. A removed member who stays signed in keeps working. Removed members cannot be listed or reactivated in the studio app (the Maison bot can list them read-only); re-adding needs the OpenMaison team, and the owner's re-request auto-resolves (A-14). A removed member stays in any workflow approver list — the selector shows only active members, so they cannot be taken out — and the progress-update review task goes to the first listed approver without checking, while the lead drawer skips inactive ones.
- Data: `studio_members.is_active`; `studios.settings.workflow.approvers`.
- States: —
- Words: —
- Reachable: —

### A-29 · Signatures and the Team badge
- Where: `TS:69-70, 417-421`; `src/lib/queries/member-signatures.ts:8-9, 54-143`; `src/app/api/member-signatures/roster/route.ts:5-28`; `src/app/api/member-signatures/records/route.ts:61-110`; `src/app/api/member-signatures/records/[id]/route.ts:5-23`; `src/components/settings/member-signature-card.tsx:18-149`; `SET:460-471`.
- Entry: Team Members shows the badge; each member manages their own signature in Settings › *My Signature*.
- Does: a *Signature* badge on members with an active `member_signatures` row. In Settings a member draws, or uploads a PNG/JPG up to 1 MB (converted to PNG, longest edge ≤ 1000 px), can turn on *Auto-apply on approval*, or removes it (soft). A new signature replaces the old one and keeps the auto-apply choice and consent time.
- Rules: self-service only — an owner cannot add, see or remove another member's signature (`[id]/route.ts:17`). Removing a member leaves their signature active. How signatures stamp quotes is hand-off C.
- Data: `member_signatures` (`member_user_id, storage_path, style, auto_apply, consent_at, is_active`), bucket `member-signatures` (`MIG/267_member_signatures.sql`, `MIG/268_member_signatures_bucket.sql`).
- States: skeleton while loading.
- Words: *"Signature"*; *"My Signature"*, *"Draw"*, *"Upload"*, *"Save signature"*, *"PNG or JPG, up to 1 MB."*, *"Auto-apply on approval"*, *"Automatically stamp your signature on quotes you prepare when they are approved. Revocable anytime."*, *"{Drawn/Uploaded} · saved {date}"*, *"Remove"*, *"Signature stored"*; toasts *"Signature saved"*, *"Signature removed"*, *"Failed to save signature"*, *"Failed to remove signature"*, *"Failed to update preference"*; error *"Signature too large ({n}KB). Max 1MB."*
- Reachable: yes.

### A-30 · Managers and reporting lines
- Where: `AC:39-45`; `SC:661-662, 681-682`; `RDC:58-64`; `RE:189-235, 660`; `MIG/296_lead_manager_hierarchy.sql:1-17`; `src/app/api/studio-config/features/route.ts:95-115`.
- Entry: Team Members › Access Level (*Manager* card); Roles & Permissions (explainer card).
- Does: the only hierarchy is the `manager` tag. With the studio feature `leadManagerHierarchy` on, a manager (still a designer) sees only leads routed to them and can pass them on to designers; each lead remembers its routing manager in `leads.owning_manager_id`.
- Rules: the flag is Dyel-only, off by default, absent from the Feature Flags screen, and changeable by API only by an owner or admin. There is no "reports to" between members, no teams, and no manager scope over people — the Roles editor's *Team data* has no team behind it (A-50). Routing detail is hand-off B.
- Data: `studio_members.tags` (`manager`), `leads.owning_manager_id`, `studios.settings.features.lead_manager_hierarchy`.
- States: —
- Words: A-55.
- Reachable: yes (the tag card shows for every studio).

### A-31 · Seat limits
- Where: `src/types/database.ts:473`; `src/lib/transformers.ts:735-740`; `src/app/(marketing)/pricing/page-client.tsx:39-55`.
- Entry: —
- Does: nothing counts members against a plan; `plans.max_members` only formats a plan-card line.
- Rules: the pricing page sells *"1 seat"*, *"Up to 5 seats"*, *"Unlimited seats"*; no code enforces a seat count (grep). Provisioning is manual through OpenMaison anyway (A-13).
- Data: `plans.max_members`.
- States: —
- Words: *"{n} team members"*, *"Unlimited members"*.
- Reachable: —

### A-32 · The Maison bot's team tools
- Where: `src/lib/agents/tools.ts:180-210`; `EXE:1322-1500`.
- Entry: mAIson chat, any member.
- Does: `get_team_members` lists members, removed ones on request. `update_member_tags` replaces a named member's tags.
- Rules: stricter than the Team screen's API — owner or admin only; tags limited to owner / admin / id / manager, so it cannot grant `accounting`; only an existing owner can grant or remove `owner`; nobody can raise their own privileges; one owner per studio, counting removed owners; an existing `manager` tag is kept when the new list omits it (`EXE:1392, 1400, 1424, 1436, 1460, 1480`).
- Data: `studio_members.tags`.
- States: —
- Words: *"Only owners and admins can modify team member tags. You don't have permission for this action."*, *"Only an existing studio owner can grant or remove the "owner" tag. As an admin you cannot mint an owner."*, *"You cannot elevate your own privileges with this tool. Ask another owner to change your role."*, *"Cannot assign "owner" tag — {name} is already the studio owner. Only one owner is allowed per studio."*
- Reachable: yes (bot).

### A-33 · Who may do what in Team Members (UI vs server)
- Where: `TS:72, 247, 372, 833, 922`; `MEM:35-220`; `RADD:69-83`; `MREQ:39-120`; `ITOK:89-102, 235-248`; `MOVR:23-30`; `src/app/api/invitations/records/route.ts:39-59`.
- Entry: —
- Does: the UI gives every management action to owners only, and never on owner rows or one's own row.
- Rules: the server is looser. **Any** signed-in member can change any member's tags — adding `owner` to themselves included — title, *Open to New Leads* and lead preferences, and can remove any member, the owner and themselves included, through `/api/identity/members`, which checks only for a session (`MEM:64-220`); only the `valid_tags` CHECK limits which tags can be written. Requests: submit = owner or admin; list and dismiss = any member. Invitations: list = any member; resend and cancel = owner or admin. Overrides = owner or admin. The Roles editor's owner gate (A-56) can therefore be sidestepped by first adding `owner` through the members route. The *Team* switches in Roles & Permissions (*Invite members*, *Edit roles*, *Remove members*) are read nowhere (A-51).
- Data: —
- States: —
- Words: —
- Reachable: API.

---

## Legal Entities

### A-34 · The Legal Entities pane
- Where: `LET:158-370`; mounted at `ACC:1394`; `SCQ:14-30`; `SCR:26-51`.
- Entry: Accounts → Studio → *Legal Entities*.
- Does: lists every entity of the studio, default first and then by name, active or not — name, *Default* / *Inactive* chips, registration number, GST status and number, country · currency, address — with row actions ☆ *Set as default* (active non-default rows), ✎ *Edit*, ⏻ *Deactivate* (active non-default rows); *"Add Entity"* opens the dialog.
- Rules: no role gate anywhere — any member who reaches `/accounts` can add entities, change bank details and the default, or deactivate (A-41). A failed read shows the empty state, which blames the migration and says to contact support.
- Data: `studio_companies` via `GET /api/studio-companies/records`.
- States: *"Loading…"*; empty card.
- Words: *"Legal Entities"*, *"Manage the legal entities your studio operates as. Finance documents (invoices, POs, signed quotes) carry the entity details from whichever row is selected at issue time. The default entity is used when no specific entity is chosen."*, *"Add Entity"*, *"Default"*, *"Inactive"*, *"Reg. No: {no}"*, *"GST registered · {no}"*, titles *"Set as default entity"*, *"Edit"*, *"Deactivate"*; empty *"No entities yet. The migration backfill should have created at least one — if you're seeing this, contact support."*
- Reachable: yes.

### A-35 · Add / edit an entity — the fields
- Where: `LET:49-156, 372-720`.
- Entry: *"Add Entity"* or ✎.
- Does: a dialog. Identity: *Legal name* (required), *Registration / UEN*, *GST / VAT registered*, *GST / VAT registration number* (shown when registered), *Country* (2 characters) and *Currency* (3 characters) with the studio's values as placeholders, *Registered address*. *Branding overrides* (collapsed): *Logo URL* (text, with preview), *PayNow / DuitNow QR* (upload or URL), *Primary colour*, *Tagline*, *Footer text (PDFs + signing page)*. *Bank details* (collapsed): *Bank name*, *Account holder*, *Account number*, *SWIFT / BIC*, *Branch (optional)*. *Contact & tax* (collapsed): *Contact phone* (defaulting to the entity's own country code), *Contact email*, *Website*, *Tax rate (%)*.
- Rules: branding and bank fields are stored sparse — an empty field is left out and inherits the studio-wide value from Branding & Comms. The logo is URL-only while the QR has an upload. Nothing checks UEN or GST formats, country or currency codes (free text, case kept as typed), colour, email or website. Switching GST off keeps any GST number typed earlier and saves it. No limit on how many entities a studio has.
- Data: `studio_companies.name, registration_number, gst_registered, gst_registration_number, country_code, currency_code, address, branding {logoUrl, paynowQrUrl, primaryColor, tagline, footerText, contactPhone, contactEmail, website}, bank_details {bankName, accountHolder, accountNumber, swiftCode, branch}, tax_rate`.
- States: collapsed sections read *"Inherit studio defaults"*.
- Words: *"Add entity"*, *"Edit entity"*, *"Add a legal entity your studio operates as. Finance documents tagged with this entity carry its UEN, GST number, and address — useful when one studio runs multiple companies."*, *"Update this entity's identity, GST status, country, and address. Changes apply to new finance documents tagged with this entity."*, *"Legal name \*"*, *"e.g. Arthaus Studio Pte Ltd"*, *"Registration / UEN"*, *"GST / VAT registered"*, *"Affects tax-invoice rendering for this entity."*, *"GST / VAT registration number"*, *"Country"*, *"Currency"*, *"Leave blank to inherit studio default ({studio country or currency})."*, *"Registered address"*, *"Branding overrides"*, *"Inherit studio defaults"*, *"Empty fields inherit from your studio-wide Branding settings. Filled fields override for documents tagged with this entity."*, *"Logo URL"*, *"PayNow / DuitNow QR"*, *"…or paste an https:// URL"*, *"Shown on quotes issued by this entity. Leave blank to use your studio-wide QR from Branding & Comms."*, *"Primary colour"*, *"Tagline"*, *"Footer text (PDFs + signing page)"*, *"Bank details"*, *"Used on invoice PDFs and the payment portal. Each field falls back to your studio bank settings when empty."*, *"Bank name"*, *"Account holder"*, *"Account number"*, *"SWIFT / BIC"*, *"Branch (optional)"*, *"Contact & tax"*, *"Contact phone"*, *"Contact email"*, *"Website"*, *"Tax rate (%) — overrides region default"*, *"Leave blank to use the region default for this entity's country."*, *"Cancel"*, *"Save"*.
- Reachable: yes.

### A-36 · Saving an entity — rules, and the default-flag reset
- Where: `LET:182-221`; `SCQ:58-103`; `SCR:53-116`; `MIG/126_studio_companies.sql:27-51`.
- Entry: dialog → *"Save"*.
- Does: requires a name and a tax rate between 0 and 100 (stored as a fraction: 9 → 0.09), then upserts the row by id.
- Rules: the pane never sends `isDefault`, `isActive` or `numbering`, and the route fills them in as `is_default = false`, `is_active = true`, `numbering = {}` (`SCR:92-95`). So **editing the default entity silently un-defaults it**: the studio is left with no default, the *Default* chip disappears, and documents without a stamped entity fall back to the alphabetically first active entity (A-40). Editing an inactive entity silently reactivates it, and any per-entity numbering is wiped (no screen writes entity numbering, grep). A newly added entity is never the default. The name must be unique per studio (database); a clash shows the raw Postgres error in the toast. There is no delete.
- Data: `studio_companies` (upsert on `id`).
- States: *"Saving…"*.
- Words: toasts *"Entity name is required"*, *"Tax rate must be between 0 and 100 (percent)"*, *"Entity added"*, *"Entity updated"*, fallback *"Save failed"*; server *"name is required"*.
- Reachable: yes.

### A-37 · Set as default
- Where: `LET:223-239`; `SCQ:105-126`; `SCRID:29-55`; `MIG/126_studio_companies.sql:47-50`; `MIG/226_lock_tenant_tables.sql:36-68`.
- Entry: ☆ on an active non-default row → browser confirm.
- Does: clears the current default, then marks the chosen row default and active.
- Rules: the confirm says *"Existing documents are unaffected"*, but a document that never stamped an entity resolves the default when it is rendered — a signing link with no `company_id` shows whichever entity is default now (`src/app/api/sign/[token]/route.ts:159-179`). The clearing update has no studio filter of its own and relies on row-level security to stay inside the studio (`SCRID:30-35`). The index guarantees at most one default, not exactly one.
- Data: `studio_companies.is_default`, `is_active`.
- States: —
- Words: confirm *"Make {name} the default issuing entity? New invoices, purchase orders, and quote signing links generated from now on will carry this entity's UEN, GST status, bank details, and address by default. Existing documents are unaffected."*; toasts *"{name} is now the default entity"*, *"Failed to update default entity"*.
- Reachable: yes.

### A-38 · Deactivate — and the missing reactivate and delete
- Where: `LET:241-256, 336-365`; `SCQ:128-151`; `SCRID:57-85`.
- Entry: ⏻ on an active non-default row → browser confirm.
- Does: sets `is_active = false`; the row stays listed, dimmed, with *Inactive*.
- Rules: the default entity cannot be deactivated (client toast and server 409). There is no *Activate* action: the only ways back are *Set as default*, which also activates, or editing the row (the side effect in A-36). There is no delete. Documents already issued by an inactive entity keep printing it (`src/app/api/sign/[token]/route.ts:154-156`).
- Data: `studio_companies.is_active`.
- States: —
- Words: confirm *"Deactivate {name}? It will be hidden from new finance documents."*; toasts *"{name} deactivated"*, *"Promote another entity to default before deactivating this one."*, fallback *"Deactivate failed"*; server *"Cannot deactivate the default company. Promote another company first."*
- Reachable: yes.

### A-39 · Where entities come from
- Where: `MIG/126_studio_companies.sql`; `MIG/127_studio_companies_backfill.sql`; `MIG/130_studio_companies_tax_rate.sql:10-15`; `src/app/api/admin/studios/route.ts:190-240`; grep for `studio_companies` inserts.
- Entry: —
- Does: migration 127 gave every studio that existed then one default entity copied from the studio's name, country, currency, branding address and registration, and bank details.
- Rules: nothing else creates an entity — not OpenMaison's studio creation, not the setup wizard — so a newer studio starts with none, sees the "contact support" empty state, and its first added entity is not the default until someone presses ☆; until an entity exists, documents print studio-wide branding (A-40). Tax resolves entity rate → `studios.settings.taxRate` → the region rate for the entity's (else the studio's) country.
- Data: `studio_companies`.
- States: —
- Words: —
- Reachable: —

### A-40 · Where entities are used downstream
- Where: `src/components/finance/entity-select-field.tsx:37-59`; `src/context/company-filter-context.tsx:1-20, 45`; `src/lib/quote-canva/resolve-entity-paynow-qr.ts:107-114`; `src/lib/entity-branding.ts:1-60`; `src/app/api/sign/[token]/route.ts:142-190`; `src/components/leads/lead-detail-drawer.tsx:576`; `MIG/154_leads_company_id.sql`; `MIG/155_projects_company_id.sql`; `MIG/164_projects_entity_locked_at.sql`; `MIG/165_finance_entity_match_guard.sql`; `MIG/166_doc_templates_per_entity.sql`.
- Entry: —
- Does: (1) an *"Issuing legal entity"* picker in create dialogs — hidden when fewer than two entities are active; preselects the finance filter's entity, else the default, else the first active; locked to a project's entity when one is set. (2) A finance-wide entity filter remembered per studio in the browser (`qanvast.company-filter.{studioId}`). (3) Documents — signed quotes, signing pages, invoices, POs, VOs, payment pages, contracts, receipts — print the entity's name, address, UEN, GST status, bank, QR, logo, colour, footer and contacts, each falling back to studio branding. (4) Leads and projects carry `company_id`; document templates can be per entity; the bot lists entities.
- Rules: "the default" means "the active default, else the first active by name" (`resolve-entity-paynow-qr.ts:112-113`) — which is what A-36's reset exposes. Quote-side use is hand-off C; how leads and projects get and lock an entity is hand-offs B and D.
- Data: `leads.company_id`, `projects.company_id`, finance documents' `company_id`, `quote_signature_requests.company_id`.
- States: —
- Words: *"Issuing legal entity"*.
- Reachable: yes.

### A-41 · Who may manage entities
- Where: `SCR:26-58`; `SCRID:17-23`; `LET:158-172`; `EXE:3319-3350`; `src/lib/agents/tools.ts:631-635`.
- Entry: —
- Does: both entity routes check only that a member is signed in.
- Rules: any owner, admin, designer or accounting member can add entities, change bank details and the default, or deactivate — in the UI if they reach `/accounts`, and by API. The Maison bot's `list_legal_entities` is read-only and tells users to run a migration when none exist.
- Data: —
- States: —
- Words: bot *"No legal entities are configured for this studio. Run migration 127 to backfill the default."*, *"{n} active legal entit{y/ies} — default: {name}"* / *" — no default flagged"*.
- Reachable: yes.

---

## Roles & Permissions

### A-42 · Entry and what renders
- Where: `ACC:79, 268-271, 1739-1746, 1176-1199`; `src/app/(main)/accounts/roles/page.tsx:14-25`.
- Entry: Accounts → Studio → *Roles & Permissions*; `/accounts/roles`; the Quote Approval Rules pane's link under *Default Approver Role*.
- Does: once roles have loaded, renders the editor with the studio's roles and whether the manager hierarchy is on.
- Rules: no role gate in the page or the editor — every member who reaches `/accounts` gets enabled switches and Save buttons; a non-owner's save fails with a generic toast (A-56). If the roles read fails or comes back empty, the editor starts seeding (A-43).
- Data: `studio_roles`, `studios.settings.features`.
- States: nothing rendered while loading.
- Words: *"Roles & Permissions"*, *"Define custom roles with granular page access, data scope, and action permissions."*; approval link *"Pulled from your Roles & Permissions setup."*
- Reachable: yes.

### A-43 · Where a studio's role rows came from (three seeds)
- Where: `MIG/109_seed_default_system_roles.sql`; `MIG/116_backfill_role_submit_for_review.sql`; `MIG/125_backfill_role_permission_keys.sql`; `src/app/studio-setup/page.tsx:301-331`; `RE:243-283`; `AC:249-352`.
- Entry: —
- Does: (1) Migration 109 gave every studio then in the database four `is_system` rows with full page and action maps, named *Studio Owner*, *Admin*, *Interior Designer*, *Accounting*, all *Assignable*; 116 and 125 back-filled keys added later. (2) The setup wizard seeds each new studio with the same four slugs as `is_system` rows whose `pages` and `actions` are **empty** (only a data scope), named *Owner*, *Admin*, *Interior Designer*, *Accounting*, with Owner and Accounting not assignable. (3) The editor seeds when it sees no rows at all — fuller maps, but without `project_override`, `pricebook`, `payment_schedule`, `expense` or `submit_for_review`, and **not** marked system, so the rows stay editable and deletable.
- Rules: the same four roles therefore mean different things per studio, and the code adds two more default tables for a missing row or key — `tagDerivedPermissions` and the legacy branch of `resolveCanPerformAction` — which disagree with each other. An admin approving quotes: 109 allow, editor seed deny, `tagDerivedPermissions` deny, legacy branch allow; an admin inviting members: 109 deny, editor seed allow, `tagDerivedPermissions` allow, legacy branch deny (`AC:275-280, 327-348`). Seeding upserts on `(studio_id, slug)`: if the roles read fails while an owner opens this pane or the wizard, existing rows' names, colours, *Assignable* and permissions are overwritten with the seed (read from code, not exercised). A non-owner's seed attempt fails and toasts.
- Data: `studio_roles`.
- States: —
- Words: *"Couldn't seed {Owner, Admin, Interior Designer, Accounting} — reload to retry"*.
- Reachable: (1) and (2) as data; (3) rarely.

### A-44 · The role list
- Where: `RE:466-492, 656-671`.
- Entry: the pane.
- Does: one expandable card per role, ordered Owner, Admin, Interior Designer, Accounting, then custom roles — colour dot, name, *System* badge, data scope. Pressing a card opens its edit panel inside the card, one at a time; *Add Role* sits below.
- Rules: the data-scope label shows a stored value that nothing reads (A-50). The number of members holding each role is not shown. No limit on how many roles a studio creates.
- Data: `studio_roles`.
- States: —
- Words: *"System"*, *"All data"*, *"Assigned only"*, *"Team data"*, *"Add Role"*, *"Creating new role…"*.
- Reachable: yes.

### A-45 · Editing a role
- Where: `RE:285-317, 334-421, 495-653`.
- Entry: open a role card.
- Does: *Role Name*, *Slug* (typing a name rewrites the slug), colour (8 swatches), *Assignable*, *Data Scope* (three buttons), *Page Access* (four accordion groups with *All / None*), *Action Permissions* (eleven accordion groups with *All / None*), *Delete*, and *"Save Changes"* (enabled only once something changed).
- Rules: on `is_system` rows every control is disabled and *All / None* hidden (*"System role — permissions locked"*), so in studios seeded by migration 109 or the wizard the four roles that actually drive behaviour cannot be edited here. Custom-role slugs can be edited freely; renaming a custom role *Manager* is allowed, because the manager guard only runs on create (`RE:390`); a slug clash on edit fails with *"Failed to save role"*. Unsaved edits vanish when another role is opened.
- Data: `studio_roles.name, slug, color, is_assignable, permissions`.
- States: *"Saving..."*.
- Words: *"Role Name"*, *"Slug"*, *"Color & Options"*, *"Assignable"*, *"System role — permissions locked"*, *"Data Scope"*, *"Page Access"*, *"Action Permissions"*, *"All"*, *"None"*, *"{enabled}/{total}"*, *"Unsaved changes"*, *"Save Changes"*; toasts *"Role saved"*, *"Failed to save role"*.
- Reachable: yes.

### A-46 · Creating a custom role
- Where: `RE:150-175, 319-330, 382-421, 674-716`; `ROLES:54-101`.
- Entry: *"Add Role"*.
- Does: a *New Role* card with name, slug, colour and *Assignable* only — no permission switches. *"Create Role"* saves the role with default permissions: assigned-only scope; Dashboard, Leads, Projects and Tasks pages; create and edit leads, quotes and tasks; edit projects; submit expenses; view the price book. Permissions are edited afterwards by opening the new role.
- Rules: a role named *Manager* is refused. Because saving is an upsert on `(studio_id, slug)`, creating a role whose slug equals a system slug — *Owner*, *Admin*, *Accounting* — creates nothing: it **overwrites that system role's name, colour, *Assignable* and permissions with the defaults above**, leaves it locked, and toasts *"Role created"* (`ROLES:79-91`). Every member who resolves to that role then loses, for example, price-book editing, which the server enforces, until the row is repaired in the database. *Interior Designer* slugifies to `interior-designer`, not `id`, so recreating it makes an inert custom role.
- Data: `studio_roles` (upsert).
- States: *"Creating..."*.
- Words: *"New Role"*, *"e.g. Project Manager"*, *"Color"*, *"Cancel"*, *"Create Role"*; toasts *"Role name is required"*, *"“Manager” is a tag, not a role — turn it on per person in Team Members"*, *"Role created"*, *"Failed to save role"*.
- Reachable: yes.

### A-47 · Deleting a role
- Where: `RE:423-454, 629-642`; `ROLEID:63-95`.
- Entry: open a custom role → *Delete* → *Yes*.
- Does: deletes the row (non-system rows only).
- Rules: the two-step confirm resets after 5 s or when another role is opened. Deleting a system row by API is a silent no-op that still answers OK. Editor-seeded rows (A-43) are not system, so their *Owner* role can be deleted, after which owners resolve to the hard-coded fallback. Deleting a role never touches members (they cannot hold custom tags, A-53).
- Data: `studio_roles`.
- States: —
- Words: *"Delete"*, *"Delete?"*, *"Yes"*, *"No"*; toasts *"Role deleted"*, *"Failed to delete role"*.
- Reachable: yes.

### A-48 · The matrix — what it lists
- Where: `RE:20-148`; `T:3821-3843`.
- Entry: an open role.
- Does: **Page Access** — *Core* (Dashboard, Leads, Inbox, Projects, Tasks, Escalations), *Finance* (Finance (overview), Operations, Pipeline, Commissions, Reports), *Tools & Ops* (Tools, Compliance Navigator, Meeting Copilot, Market Insights, Marketplace, Qanvast Ops, Hangouts), *Admin* (Accounts, Settings, Verification, Upgrade). **Data Scope** — *All data*, *Team data*, *Assigned only*. **Action Permissions** — Leads (Create, Edit, Delete, Assign); Quotes (Create, Edit, Submit for review, Approve, Send); Projects (Create, Edit, Delete); Project lock override (Override handover lock); Price Book (View, Edit / Add / Remove); Payment schedule (Override schedule on a quote (H9 / E3)); Expenses (Submit expense, Approve expense); Tasks (Create, Edit, Approve); Finance (View invoices, Create invoices, Record payments, Manage POs, Manage expenses, Approve expenses, View reports); Team (Invite members, Edit roles, Remove members); Settings (Edit studio, Edit funnel, Edit notifications).
- Rules: the matrix omits pages the guard knows (Portfolio, Quote Digitizer, Quote X-Ray, AI Visualizer, Floor Plan, HomeOwner Portal, Vendors, most Qanvast Ops pages — `AC:64-130`) and permissions the code checks (`vendors.view / create / edit / merge`, `finance.edit`, `leads.view_all`, `team.manage` — `AC:212-230`; `src/lib/accounting/permission-gate.ts:56-58`). Ticket codes leak into the copy (*"(H9 / E3)"*). Team Members' own grid names two of the same pages differently (*Chats*, *Verify*).
- Data: `studio_roles.permissions` `{ pages{}, dataScope, actions{ entity{ action } } }`.
- States: —
- Words: as listed.
- Reachable: yes.

### A-49 · Page Access is not enforced
- Where: `src/app/(main)/layout.tsx:143`; `src/components/layout/app-sidebar.tsx:189-204`; `src/components/layout/bottom-nav.tsx:92-100`; `src/components/layout/topbar.tsx:153`; `AC:134-169, 197-203`.
- Entry: —
- Does: the route guard and every navigation filter call `canAccessPage(tags, path)` without a role, so they read the hard-coded tag table `ROUTE_ACCESS`.
- Rules: no switch under *Page Access* changes where anyone can go; the only reader of a role's `pages` is Team Members' display grid (A-21). `canAccessPage`'s role branch and `filterNavItems`' role parameter have no caller that passes a role.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-50 · Data Scope is not read
- Where: `AC:184-186`; grep of `dataScope` / `getDataScope`.
- Entry: —
- Does: stored and displayed only (role list, Team chip descriptions).
- Rules: `getDataScope` has no caller, and *Team data* has no team concept behind it. What a designer can see is decided by tags elsewhere (hand-off B / D; Uncertain 8).
- Data: `studio_roles.permissions.dataScope`.
- States: —
- Words: *"Can see all studio data"*, *"Can see data for their team"*, *"Can only see data assigned to them"*.
- Reachable: —

### A-51 · Action Permissions — which switches anything reads
- Where: grep of `resolveCanPerformAction` / `memberCanPerform`; `src/app/api/leads/mutations/[id]/archive/route.ts:28-64`; `src/app/api/leads/mutations/[id]/unarchive/route.ts:20-46`; `src/app/api/studio-config/price-book/route.ts:26, 156-166`; `src/app/api/studio-config/price-book/[id]/route.ts:20, 74-76`; `src/app/(main)/leads/page.tsx:141-153`; `src/app/(main)/projects/[projectId]/page.tsx:810-825`; `src/components/leads/quote-digitizer-dialog.tsx:1126-1130`; `src/components/accounts/price-book-manager.tsx:60-61`; `src/components/finance/PaymentScheduleEditor.tsx:51-52`; `src/app/(main)/finance/operations/page.tsx:190`; `src/components/finance/ExpenseList.tsx:69`; `AC:263-269, 441-505`.
- Entry: —
- Does: read somewhere — *Leads › Create* (browser: the Add Lead button); *Leads › Delete* (server: archive and unarchive); *Quotes › Submit for review* and *Approve* (browser: quote digitizer buttons); *Projects › Edit* and *Project lock override* (browser: project page); *Price Book › Edit / Add / Remove* (browser, and server price-book routes); *Payment schedule › Override* (browser: project page, digitizer, schedule editor); *Expenses › Approve expense* (browser: finance lists).
- Rules: read nowhere — *Leads › Edit, Assign*; *Quotes › Create, Edit, Send*; *Projects › Create, Delete*; *Price Book › View*; *Expenses › Submit expense*; all *Tasks*; all *Finance*; all *Team*; all *Settings*. Quote approval on the server follows owners plus the workflow approver list, not the *Approve* switch (`AC:441-505`). A missing key falls back to the tag rules and an explicit false denies (`AC:263-269`). Only the four system slugs are ever looked up and those rows are locked in the editor (A-45), so in most studios the editor cannot change any enforced permission — except through the create collision in A-46.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-52 · How a member's permissions are resolved
- Where: `RPERM:16-56`; `SC:754-769`; `AC:249-313, 366-390`; `src/lib/accounting/permission-gate.ts:10-82`; the priority list is copied at `src/app/api/leads/mutations/[id]/archive/route.ts:28`, `src/app/api/leads/mutations/[id]/unarchive/route.ts:20`, `src/app/api/studio-config/price-book/route.ts:26`, `src/app/api/studio-config/price-book/[id]/route.ts:20`, `src/lib/accounting/permission-gate.ts:10`.
- Entry: —
- Does: the member's tags → the first of `owner, admin, accounting, id` → that `studio_roles` row's permissions → for each check, the row's true / false wins and a missing key falls back to the hard-coded tag rules; no row (`null`) means tag rules throughout. Browser screens that honour overrides merge them on top (A-26).
- Rules: the priority list is copied six times, plus once more in Team Members' page grid (`TS:666`); `manager` and custom slugs are never considered. No server check applies member overrides, although the gate's comments say they do (`permission-gate.ts:52-53, 69-71` against `78-82`). `canPerformAction`, `getDataScope` and `PERMISSION_SLUGS` are unused (grep).
- Data: `studio_members.tags`, `studio_roles.permissions`, `studio_members.permission_overrides`.
- States: —
- Words: —
- Reachable: —

### A-53 · Custom roles are inert
- Where: `MIG/016_roles_and_tags.sql`; `MIG/129_widen_valid_tags_for_accounting.sql`; `MIG/296_lead_manager_hierarchy.sql:18-41`; `RPERM:16, 36`; `RDC:100-105`.
- Entry: —
- Does: a custom role can be created, edited, shown as a card in Team Members and requested in the invite form.
- Rules: nobody can hold it: `studio_members.tags` accepts only owner / admin / id / accounting / manager, so granting it fails with *"Could not update roles"*; and even if it were held, no resolver looks past the four system slugs. The editor still offers full matrices for custom roles with no hint that they do nothing.
- Data: the `valid_tags` CHECK on `studio_members`.
- States: —
- Words: —
- Reachable: yes (UI); no effect.

### A-54 · The *Assignable* flag
- Where: `src/app/(main)/leads/new/page.tsx:43-48`; `src/components/leads/new-lead-drawer.tsx:57-62`; `src/components/leads/lead-detail-drawer.tsx:505-506`; `ACC:1183-1196`; `RDC:79`.
- Entry: the switch on a role.
- Does: lead assignment pickers list members who hold `id` **or** a tag equal to an assignable role's slug.
- Rules: in migration-109 studios all four system roles are assignable, so admins, accounting members and owners appear in lead pickers — against Team Members' *"Not listed in assignment dropdowns"*, the ADMIN chip's *"not listed in dropdowns"* and `docs/rules/architecture.md:207`. In wizard studios Admin is listed and Owner and Accounting are not. The switch is locked on system roles and meaningless on custom ones. It also filters the Quote Approval Rules' *Default Approver Role* list, a setting nothing reads (grep of `approver_role`; hand-off C).
- Data: `studio_roles.is_assignable`.
- States: —
- Words: *"Assignable"*.
- Reachable: yes.

### A-55 · The Manager explainer card
- Where: `RE:189-235, 660`; `ACC:269-271, 1743`.
- Entry: Roles & Permissions, only when the manager hierarchy is on.
- Does: a dashed card after the roles explaining that Manager is a tag on top of Interior Designer and where to switch it on.
- Rules: shown only to hierarchy studios, while the Manager card in Team Members shows for everyone (A-10). Its advice to use "that member's permission overrides" leads to switches that mostly do nothing (A-26).
- Data: —
- States: hidden until features load.
- Words: *"Manager"*, *"Tag"*, *"Routed leads only"*, *"Manager isn't a separate role — it sits on top of Interior Designer. A manager keeps every designer permission and additionally sees only the leads routed to them, and can assign those on to designers."*, *"Turn it on per person in Team Members, next to their other tags. To change what one manager specifically can do, use that member's permission overrides there."*
- Reachable: yes (Dyel).

### A-56 · Who may change roles
- Where: `ROLES:32-67`; `ROLEID:16-31, 38-50, 63-76`; `src/lib/api-role-guard.ts:13-26`.
- Entry: —
- Does: creating, editing and deleting roles is owner-only on the server (403 *"Forbidden: owner-only"*); reading is open to any member.
- Rules: the UI does not know this and lets anyone try (A-42). The owner check reads the caller's tags without `is_active`, and any member can write tags through the members route (A-33), so the gate is only as strong as that route. An edit resets `color` to null and `is_assignable` to true when a caller leaves them out (`ROLEID:40-46`).
- Data: —
- States: —
- Words: *"Forbidden: owner-only"*, *"name, slug and permissions are required"*.
- Reachable: yes.

---

## Studio Health

### A-57 · Entry and gate
- Where: `ACC:80, 636-639, 665-666`; `USG:10-30`; `src/components/settings/usage-dashboard.tsx:13-37`; `SHR:7-9`.
- Entry: owner → Accounts → *Studio Health* (a separate page, `/accounts/usage`).
- Does: non-owners are redirected to `/dashboard`; owners get the page with a *7d / 30d / 90d* switch (default 30d).
- Rules: owner-only in the browser alone — the API checks only for a session, so any member can fetch every member's usage (`SHR:7-9`). Nothing else links to the page (grep). If the API fails the page shows *"Loading…"* forever (`usage-dashboard.tsx:18`).
- Data: —
- States: *"Loading…"*.
- Words: *"Studio Health"*, *"How your team is using OpenMaison"*, *"7d"*, *"30d"*, *"90d"*.
- Reachable: yes (owner).

### A-58 · The tiles and what each counts
- Where: `SHV:20-157`; `SHR:114-259`; `src/lib/usage/rollup.ts:57-77`; `src/lib/usage/funnels.ts:43-47, 73-76`; `src/app/api/cron/usage-rollup/route.ts:83-99`; `src/app/api/cron/usage-retention/route.ts:15-21`.
- Entry: the page.
- Does: four rows of tiles; some carry a change chip against the previous window of the same length. *Engagement*: **Active members** *{active} / {total}* (members with any sessions, page views, feature opens or quotes in the window / all member rows); **Sessions** (sign-ins) with *avg {n} min/session*; **AI runs**; **Page views**. *Business outcomes*: **Leads created** (the larger of the rollup and raw events); **Projects created** with *{n} closed ({p}%)*; **Quotes sent**; **Invoices sent**. *Team productivity*: **Tasks completed** with *{p}% of {n} created*; **Escalations resolved** with *{p}% of {n} opened* (red below 50%); **Progress updates**; **Hangout meetings**. *Homeowner engagement*: **Portal logins**; **Issues reported**.
- Rules: *AI runs* sums every `feature.*.opens`, which includes signature requests and homeowner portal logins — not AI. *Quotes sent* counts signature requests created (`quote_signature_requests`), not quotes sent. *Invoices sent* counts invoices created that day whose status was `sent` when the rollup ran. The *Active members* total includes removed members (`SHR:50-52` has no `is_active` filter). *Leads created* compares a max of two sources with the raw source alone. Session minutes count only sessions that had ended when the nightly rollup ran. Raw events are deleted after 90 days, so the 90d comparison for event-based tiles has nothing to compare with (chip *"new"*).
- Data: `usage_daily_rollup` (studio sentinel rows), `usage_events` (raw; at most 5,000 rows per query), `studio_members`, `profiles`.
- States: a chip is hidden when both windows are zero.
- Words: *"Engagement"*, *"Business outcomes"*, *"Team productivity"*, *"Homeowner engagement"*; tile labels as in bold; *"avg {n} min/session"*, *"{n} closed ({p}%)"*, *"{p}% of {n} created"*, *"{p}% of {n} opened"*; chips *"new"*, *"+{n}%"*.
- Reachable: yes (owner).

### A-59 · Trend, feature usage, top pages, team activity
- Where: `SHV:159-271`; `src/components/admin/analytics/trend-chart.tsx:20-22`; `SHR:196-251`; `src/app/api/cron/usage-rollup/route.ts:116-122`.
- Entry: the page.
- Does: a line chart *"{range} trend"* (DAU, Sessions, AI events per day); *Feature usage* bars per feature (opens and success %); *Top pages viewed* (top 20 routes, IDs normalised); *Team activity*, one row per member (Sessions, Avg mins, Page views, AI runs, Quotes sent), sorted by sessions.
- Rules: a member's *Quotes sent* is the **studio's** daily count copied to every member active that day ("can't filter by user — leave at studio scope", `usage-rollup/route.ts:118`). Top pages come from at most 2,000 raw rows. Rows are not clickable here; the same component is OpenMaison's cross-studio admin drill-in, which passes a click handler (hand-off: admin).
- Data: as A-58.
- States: *"No feature usage yet."*, *"No page views recorded in this window."*, *"No team members yet."*
- Words: *"Feature usage"*, *"{n} opens · {p}% success"*, *"Top pages viewed"*, *"Paths normalized (IDs replaced with :id) to reduce cardinality. Top 20 shown."*, *"Team activity"*, *"Member"*, *"Sessions"*, *"Avg mins"*, *"Page views"*, *"AI runs"*, *"Quotes sent"*; chart series *"DAU"*, *"Sessions"*, *"AI events"*.
- Reachable: yes (owner).

### A-60 · Where the numbers come from
- Where: `src/app/api/cron/usage-rollup/route.ts:9-137`; `src/lib/usage/rollup.ts:1-88`; `src/app/api/auth/verify/route.ts:151`; `src/app/api/auth/logout/route.ts:25-55`; `src/app/api/cron/usage-retention/route.ts:15-36`.
- Entry: —
- Does: a nightly job (03:00 UTC) computes "yesterday" for each studio in its own time zone from raw events, sign-in sessions and the leads, projects, signature requests and invoices created that day, and writes one studio row plus one row per active user; the page adds live counts from raw events for tiles the rollup does not carry.
- Rules: today's activity never appears. A session ends only on sign-out or when a 24-hour clean-up closes it. What emits each event is hand-off D.
- Data: `usage_events`, `auth_sessions`, `usage_daily_rollup`.
- States: —
- Words: —
- Reachable: —

---

## Studio items in Settings

### A-61 · The Settings page and who reaches it
- Where: `SET:34-68, 258-284`; `AC:128`.
- Entry: profile menu → *"Settings"* (every member).
- Does: one scrolling page with a section index — *Your Profile*, *Lead Preferences* (members with the `id` tag), *Studio Region*, *My Signature*, *Ads & Promotions*, *ID Buddy AI*, *Home Screen*, *Appearance*, *Theme Skins*, *Notifications*, *Email Lead Sources*, *Guided Tours*.
- Rules: the route guard admits owners, admins and designers but **not accounting** (`AC:128`), so accounting-only members cannot edit their own profile or signature. Migration 109's Accounting row sets `settings: true`, and `docs/rules/architecture.md:225` says Settings is open to all four — both contradicted by the guard. The header promises billing; there is no billing section.
- Data: —
- States: skeleton while the session loads.
- Words: *"Settings"*, *"Manage your profile, preferences, and billing."*; section names as listed.
- Reachable: yes.

### A-62 · Your Profile (a member's identity)
- Where: `SET:112-134, 197-256, 286-384`; `SQ:104-128`; `src/app/api/identity/profile/route.ts:28-92`.
- Entry: Settings → *Your Profile*.
- Does: photo, full name, email and phone; *"Save changes"* uploads a new photo (image, under 2 MB) and then updates the profile. This is the only place a member's name, email and phone — the values Team Members shows — can change.
- Rules: a name and an email containing "@" are required; email and phone must be unique across every profile in every studio (409). The phone is the sign-in number, so changing it changes how the member signs in. The save sends no country, so the server normalises the phone with Singapore rules (`profile/route.ts:41-42`). *Studio Name* is shown disabled. The line under the photo says *"(Preview only — not saved)"*, but the save does upload and store the photo (`SET:227-245`).
- Data: `profiles.full_name, email, phone, avatar_url`; storage `studio-assets/{studio}/avatars/{user}/profile.{ext}`.
- States: *"Saving..."*; *"Profile saved"* for 2.5 s.
- Words: *"Your Profile"*, *"Change photo"*, *"(Preview only — not saved)"*, *"Full Name"*, *"Studio Name"*, *"Email"*, *"Phone"*, *"Save changes"*, *"Profile saved"*; toasts *"Display name is required"*, *"A valid email is required"*, *"Image must be under 2MB"*, *"Please upload an image file"*, *"Failed to upload photo — profile saved without it"*, *"Profile saved successfully"*; server *"This email is already used by another team member."*, *"This phone number is already used by another team member."*
- Reachable: yes (not accounting).

### A-63 · Lead Preferences (self-service)
- Where: `SET:57-68, 386-435`; `src/app/api/admin/studios/route.ts:219-228`.
- Entry: Settings → *Lead Preferences* (members with `id`).
- Does: the designer's own *Open to New Leads* switch and the same preference editor as A-24.
- Rules: the switch saves silently, with no toast either way. Owners holding `id` — the default for owners of studios created by OpenMaison, whose tags are `{owner, admin, id}` — see it too.
- Data: `studio_members.accepting_leads`, `lead_preferences`.
- States: —
- Words: *"Lead Preferences"*, *"Open to New Leads"*, *"When off, you will not receive AI-recommended lead assignments"*, *"How it works"*, *"Select the types of leads you prefer for each category, then set how important each one is. Must Match means you strongly prefer those leads. Nice to Have gives a soft boost. Leave any category as Don't Care to skip it. This is optional — if not set, the AI considers all factors equally."*
- Reachable: yes.

### A-64 · Studio Region
- Where: `SET:121, 437-458`; `src/lib/supabase.ts:47-49`.
- Entry: Settings → *Studio Region*.
- Does: a read-only card with the studio's country code and name, currency symbol and dialling code.
- Rules: not editable anywhere in the studio app (*"Contact support…"*); it drives currency, phone format, tax and compliance (hand-off D). The Legal Entities placeholders use the same value (A-35).
- Data: `studios.country_code` (via the session).
- States: —
- Words: *"Studio Region"*, *"Your studio region determines currency, phone format, tax rules, and compliance checklists. Contact support to change your region."*
- Reachable: yes.

### A-65 · Ads & Promotions and ID Buddy AI (studio-wide switches on a personal page)
- Where: `SET:70-74, 136-143, 473-519`; `src/lib/transformers.ts:1473-1590`; `src/app/api/identity/studio-settings/route.ts:49-110`.
- Entry: Settings → *Ads & Promotions* / *ID Buddy AI*.
- Does: each switch writes a key into the **studio's** settings (`ads_enabled`, `id_buddy_enabled`).
- Rules: any owner, admin or designer flips it for the whole studio; the settings route has no role check. The page reads camelCase keys the settings transformer never returns, so both switches always open ON whatever was saved (`SET:140-141`). Nothing else reads either key (grep) — both switches do nothing. The *PRO only* lock is hard-coded off (`isPro = true`, `SET:74`).
- Data: `studios.settings.ads_enabled`, `id_buddy_enabled`.
- States: —
- Words: *"Show Ads / Promotions"*, *"Display promotional content and partner ads."*, *"PRO only"*, *"ID Buddy AI Recommendations"*, *"Receive proactive AI insights and suggestions throughout the app."*
- Reachable: yes; no effect.

### A-66 · Other Settings sections (named only)
- Where: `SET:460-471, 521-673, 681-963`; `src/app/(main)/settings/notifications/page.tsx`.
- Entry: —
- Does: *My Signature* — A-29. *Email Lead Sources* — Gmail connection, monitored sender domains and sync stats (hand-off B). *Notifications* → `/settings/notifications` (hand-off D). *Home Screen*, *Appearance*, *Theme Skins*, *Guided Tours* — per-browser preferences (local storage and theme), not studio data.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Tests

### A-67 · The slice's tests
- Where: `src/__tests__/team-settings-role-display.test.ts`; `src/__tests__/role-editor-manager-tag.test.tsx`; `src/__tests__/access-control-manager-tag.test.ts`; `src/__tests__/identity-scoped-api.test.ts`; `src/__tests__/invitations-scoped-api.test.ts`; `src/__tests__/studio-config-scoped-api.test.ts:179-241`; `src/__tests__/studio-companies-scoped-api.test.ts`; `src/__tests__/agents-update-member-tags-privesc.test.ts`; `src/__tests__/usage-rollup.test.ts`; `src/__tests__/usage-rollup-date-label.test.ts`; `e2e/accounts-exhaustive-walk.spec.ts`; `e2e/accounts-role-based-walk.spec.ts`.
- Entry: —
- Does: pin the Manager chip merge and the Manager card; session-only auth and studio scoping of the members, invitations, requests and entity routes; deactivate-not-delete and the assignment counts; owner-only role writes; the bot's tag guards; rollup date labels. The two e2e walks open every Accounts tab — as the owner, and as an admin + designer — and fail only on console errors.
- Rules: no test expects a non-owner to be refused on the members, entity, request or Studio Health routes (they are not refused); none covers the entity edit clearing the default, the create collision on system slugs, custom-role tag writes, or the overrides dialog's role default. The e2e tab lists still include ids the page no longer has (`quote-doc-template`, the retired `assemblies`).
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Uncertain / not verified

1. **Custom-role tag writes** (A-20, A-53): the failure is read from the `valid_tags` CHECK in migrations 016 / 129 / 296 (296's own note says the constraint was hit on Dyel on 2026-08-28); not exercised against a live database. Where a database lacks the constraint, the tag would save and still do nothing.
2. **Which seed each studio's roles came from** (A-21, A-26, A-43): migration 109 shapes, setup-wizard empty maps or editor-seeded non-system rows — needs a data query per environment (hand-off D). The "every Page Access tile ✗" and "permission overrides dropped" findings apply only to the wizard-seeded studios.
3. **The create collision on system slugs** (A-46) and **the re-seed on a failed roles read** (A-43): read from the upserts on `(studio_id, slug)`; neither was exercised.
4. **Open sessions after removal** (A-28): read from the session, proxy, `/api/auth/me` and route code; no client-side sign-out on deactivation was found by grep; not exercised.
5. **Row-level security on `studio_companies`** (A-37): migration 226 enables the scoped policy the set-default clear relies on; whether 226 is applied on every environment (prod, demo, forks) was not checked.
6. **Entity country and currency codes typed in lower case** (A-35): their effect on region look-ups downstream was not traced.
7. **`create_invited_member` and legacy invitations** (A-15, A-16): the RPC is not defined in this repo's migrations, so what it wrote (e.g. `invitation_status`) is unverified; whether production still has `pending` `studio_invitations` rows was not checked.
8. **Designer visibility** (A-22, A-50): where assigned-only visibility is enforced (client filter or server query) and Team Members' *"Can only move leads forward in the pipeline"* were not traced (hand-off B / D).
9. **Studio Health accuracy** (A-58…A-60): the session-minute, per-member *Quotes sent* and 90-day comparison effects are read from code, not observed on real data; whether `usage_daily_rollup` is ever purged was not checked.
10. **Profile phone normalisation outside Singapore** (A-62): `normalizePhoneToE164` with Singapore rules on another country's E.164 number was not run.
11. **Request emails in production** (A-13): the code comment says prod and demo have no `RESEND_API_KEY`; the actual environment configuration and allow-list were not checked.
12. **Request fulfilment by OpenMaison staff**: how staff create the member after a request (admin routes such as `/api/admin/platform-users`, `/api/admin/studios/[id]`) is outside the studio app and was not inventoried.
13. **The e2e walks** (A-67) were not run.
