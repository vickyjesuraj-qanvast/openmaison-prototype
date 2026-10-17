# Package K2a — Settings pages (outcome)

Audit ids: **N-03 · N-06 · N-11 · N-12**. Register rows staged in `reg-K2a.md` (REG-K2a.1…4). No migration, no settings key changed, no demo
data moved — **no repair block needed**. `npx tsc --noEmit -p .` is clean for every file here (the only error in the tree is
`app/company/profile/page.tsx`, another package's work in progress); `npx eslint` clean on every file I touched; `node scripts/design-lint.mjs`
passes ("nothing new breaks a house rule").

## N-03 — Lead capture: Company › Integrations is the one home

**Changed**
- `app/settings/settings-view.tsx` — the Lead management module's *Lead capture* card (`data-testid="lead-capture"`: intake address +
  Copy + Integrations button, the *Ways in* table `ways-in` / `way-in-*`, *Simulate an enquiry arriving (demo)*) removed, with its state
  (address, `useCopy`, `simulateArrival`, `arrivedLine`) and the `leadCapture` / `arrivals` props. The module head's
  *Kept in Company: Integrations · Questionnaire · Members* links were already there and stay.
- `app/settings/page.tsx` — no longer loads `fetchLeadCapture()` or the `imports` arrivals query (and drops `withoutSecrets`, `like`, `or`,
  `imports`): Settings ships no capture data at all.
- `app/settings/settings.module.css` — the card's dead styles removed (`captureRow · captureAddress · captureMeta · captureTable`).
- Ghost: Lead management's ghost never drew the capture card (it draws Stage movement · Untouched leads · Lead sources) — unchanged, in step.

**Verify in the browser**
- `/settings?section=leads` as Dane (Owner) at 1440 and 390: no Lead capture card between *Lost and On Hold reasons* and *Who sees leads*;
  the head reads *Kept in Company: Integrations · Questionnaire · Members*; Integrations opens `/company/integrations` and Company's crumb
  returns to Lead management.
- `/company/integrations`: the Website form by email card still has the address, Copy and Simulate; webhooks / Meta / Gmail unchanged.
- As Sarah (Designer): the module still reads, read-only line, nothing to press.

## N-06 — Settings › Studio keeps *Who may do what*

**Changed**
- `app/settings/studio-settings.tsx` — the *Team* card (`studio-team`, `team-<role>`, `team-deactivated`, *Manage members*) and the
  *Issuing entities* card (`studio-entities`, `studio-entity`, *Manage entities*) removed; `EntityLine` type and the `entities` prop gone.
  The module head keeps *Kept in Company: Members · Profile* (with `from` = Settings › Studio). The role columns still count the active team.
  New help line (invented copy): "What each role in {studio} may do. Its team is on Members; the companies it issues quotes and contracts
  under are on Profile."
- `app/settings/settings-view.tsx` — stops passing `entities`; `app/settings/page.tsx` — the entities' mapping removed.
- `app/settings/settings.module.css` — dead styles removed (`roleList · roleRow · people · person · entityTable`, their tablet/phone lines;
  `roleTable`'s phone stack kept).
- `app/settings/settings-ghost.tsx` — Studio's ghost now draws the *Who may do what* card (title, help, the role table's head and 12 rows on
  `eventTable` + `roleTable`) instead of Team + entities; the head's help in the new words.

**Verify in the browser**
- `/settings` (opens on Studio) at 1440 and 390, as Dane: only *Who may do what* under the head; *Members* and *Profile* in Kept in Company
  open the Company pages and Back returns. 768 touch: the role table fits. Loader and reveal draw the same ghost (`verify-ghosts-strips`).
- ⌘K "Team" / "Issuing entities" land on Company › Members / Profile — **K3's change** (already in `lib/global-search/model.ts`).

## N-11 — Settings › Projects: one place for "where does a schedule start?"

**Changed**
- `components/projects/schedule/schedule-settings.tsx` — the Schedule card's *Where a schedule starts, by project type* now starts with a
  **Studio default** select (the signed quote's stages or any schedule template; `setScheduleDefaults`, the old card's save with Undo and
  refusal, snackbar key `schedule-defaults`), `data-testid="schedule-studio-default"`, then the three project types
  (`schedule-type-defaults`). The *As Schedule defaults says* option is gone: a type with no own pick shows the studio default's answer
  with the helper "Same as the studio default" and follows it when it changes; picking the studio default's answer on a type stores `auto`
  (`setTypeDefault` already deletes the key). New prop `studioTemplate`. The section help merges both old help lines and keeps the
  `schedule-templates-link` to Company › Templates › Schedules. Section anchor `#schedule-start`.
- `components/projects/ending/schedule-defaults-setting.tsx` — **deleted** (its only importer was Settings › Projects).
- `app/settings/projects-settings.tsx` — the Schedule defaults card no longer rendered; `ScheduleSettings` gets `studioTemplate`.
- `lib/projects/schedule-rules.ts` — comment only (what `auto` means now). **Resolution unchanged**: `startPick` and `preselectFor` are
  untouched; stored `auto` / a missing key / a deleted template id still fall to the studio default, exactly as before.

**Verify in the browser**
- `/settings?section=projects` at 1440 and 390, Dane: no *Schedule defaults* card after Payments; the Schedule card reads approvals ·
  Alerts lead time · *Where a schedule starts, by project type* → Studio default (*The signed quote’s stages*), then the three types each
  showing *The signed quote’s stages* with "Same as the studio default".
- Pick *Partial renovation → HDB BTO* → "A partial renovation starts from HDB BTO" + Undo; its helper goes. Pick the studio default's
  answer on it again → "A partial renovation starts from the studio default — the signed quote’s stages" and the helper returns.
- Change *Studio default* to a template → "The studio default is now {name}"; the following types change with it; Undo puts it back.
- As Sarah: all four selects disabled.
- A project's Schedule tab Start card still preselects as before (`verify-pj-gap-c` covers the type pick).

## N-12 — Credit notes beside Invoices

**Changed**
- `app/settings/projects-settings.tsx` — renders `CreditSettings` (unchanged component, `components/finance/books/books-settings.tsx`)
  after the invoice cards (Invoices · invoice numbers by entity · invoice paper) and before Payments; new prop `credit`.
- `app/settings/settings-view.tsx` — passes `credit={booksSettings?.credit ?? null}` to Settings › Projects (the loader already fetched
  `fetchBooksSettings()`; nothing new loaded).
- `components/finance/finance-settings.tsx` — no longer renders Credit notes; help line (invented copy): "Applies to {studio}’s money out —
  purchase orders to vendors, their bills and the team’s expenses — and to the team’s commission."
- `components/finance/books/books-settings.tsx` — doc comment only.
- `app/settings/settings-ghost.tsx` — Finance's head help in the new words and its two Kept-in-Company links (Vendors · Commissions — the
  ghost drew one); Projects' head help now the module's real line.

**Verify in the browser**
- `/settings?section=projects`: *Credit notes* (Next credit note: CN-2026-…) after the invoice paper card; Save / Discard work; the leave
  guard asks on unsaved numbering. `/settings?section=finance`: Costs · Commission only.

## Also in my files
- `app/settings/page.tsx` drops `fetchCaseTrust` and the `caseTrust` prop (K2b's N-07 note in `settings-view.tsx` asked the page to stop
  passing it; the prop is still optional there, so either order compiles).

## Probe assertions changed (not run)
- `design-source/verify/settings-parity/verify-st-r1.cjs` — step 1: team-by-role / entities assertions → "no Team or Issuing entities copy",
  "Kept in Company: Members · Profile", "the role columns still count the active team (Owner · 1)"; the phone loop checks only the
  *Who may do what* table; header comment.
- `design-source/verify/settings-parity/verify-st-r2.cjs` — "Settings › Studio names her as deactivated" → "counts her nowhere"
  (`Designer · n` from the DB, no `studio-team`).
- `design-source/verify/settings-parity/verify-st-r3.cjs` — "Settings › Studio lists it" → no entity copy in Studio + Company › Profile shows
  `entity-retired`; the lead-capture step reads the ways in and the intake address on Company › Integrations (`int-email · int-meta ·
  webhook-row · int-gmail · intake-address`) and asserts Lead management has no `lead-capture` / `ways-in` / `intake-address`, with its
  Integrations link.
- `design-source/verify/ui-sweep/verify-sw-r4.cjs` — "a retired entity says so in Settings › Studio" → on Company › Profile (`entity-retired`).
- `design-source/verify/projects/verify-pj-r7.cjs` — the module order is now Numbers · Stages and handover · Updates · Invoices · Credit notes
  · Schedule; no `schedule-defaults` card; the Studio default reads the signed quote's stages; no "As Schedule defaults says".
- `design-source/verify/projects/verify-pj-gap-f2.cjs` — only the Credit notes lines: Settings › Finance has no `credit-settings`; the
  `cn-number-example` is read on Settings › Projects.
- Checked, still valid: `verify-pj-gap-c` (Partial renovation → HDB BTO, snackbar "starts from HDB BTO"), `verify-p6` S3 (≥3 Company links
  in Studio — the rows' *Set under* links remain), `verify-pb-r2`, `verify-pj-r5/r6/fix-E` (Who may do what rows), `verify-sw-r4` "Settings
  never ships the webhook token" (now trivially).
- Risk: st-r3 / sw-r4 now read Company › Profile's `profile` / `entity-retired` test ids — if the N-13 package renames them, update there.

## Needs from others
1. **`lib/settings/permissions.ts:77`** (not mine) — *Who may do what*'s `credit-issue` row still says *Set under Finance › Credit notes*
   → `/settings?section=finance#credit-settings`, which no longer exists. Change to
   `{ href: '/settings?section=projects#credit-settings', label: 'Projects › Credit notes' }`.
2. **`components/projects/schedule/start-schedule.tsx:22`** (not mine, visible) — the Start card's reason line
   "Settings › Projects › Schedule defaults starts new schedules here." names a card that's gone. Suggest
   "Settings › Projects’ studio default starts new schedules here." (invented copy — add to REG-K2a.3's list).
3. **K3 (`lib/global-search/*`)** — Team / Issuing entities → Company pages and Lead capture → `/company/integrations#email`: already in the
   tree (`model.ts` lines ~132–140); confirm. No ⌘K row named "Schedule defaults" or "Credit notes" exists, so nothing else to move.
4. Comments only (not visible, optional): "Schedule defaults" in `app/projects/ending-actions.ts:374`, `lib/projects/schedule.ts:191 · 284`,
   `lib/projects/handover-model.ts:27`; "Settings › Finance › Credit notes" in `app/finance/books-actions.ts:28 · 173`, `lib/finance/books.ts:229`.
5. **Vicky's UAT steps** (`design-source/uat/story/*.json`): 2.14 (Projects' cards list "Schedule defaults"), 2.15 (Studio's Team and
   Issuing entities — now Company › Members / Profile), 2.24 (Lead capture under Settings — now Company › Integrations), 18.18 ("scroll to
   Schedule defaults", "New schedules start from …" → the Schedule card's Studio default, "The studio default is now …"), 21.19 (the
   Projects cards' list: … Invoices · Credit notes · Payments · Schedule …).
