# S14 · Settings and Company leftovers — outcome (2026-10-12)

Card: `held:settings-company` (recommendation *build*, effort S — "A Review Link for 'Ask for a review', My signature as its own card, and two
naming calls; the roles editor stays held by your call"; its questions "Where does Qanvast Ops live?" and "Move Who sees leads into Studio?"),
minus the profile lines S01 built (a member's name / email / phone / photo, My signature). Carried note taken: **S01** — "Accounting can't set
their own PayNow … add 'Your PayNow' to Your profile". Notes re-checked: S06 (Settings › Finance › Money out's categories — untouched), S08
(Set up your studio still opens the first module — it is called Roles & access now), S11 (`bringCardIntoView` — every new card link lands
through it), S13 (Company › Client portal's Privacy and terms — untouched; the review link is the studio's, not the portal's, so it lives on
Profile). 1.0 read: `src/app/(main)/accounts/page.tsx` (the *Review Link* tab: `review_request_link`, URL-checked, Copy, "sent as a chat message
to selected leads or project clients" from a Reviews & Rankings page that 1.0 never built — `src/components/layout/app-sidebar.tsx` lists it, no
route exists), `src/lib/transformers.ts` (`reviewRequestLink`, read nowhere else), `src/components/accounts/role-editor.tsx` /
`member-override-panel.tsx` (the matrix, held). Register rows: `steps/reg-S14.md` (REG-S14.1…9). Probe:
`design-source/verify/pending-modules/verify-pm2-s14.cjs` (**69 / 69**; it puts back every table it changes — `contracts`, `settings`); shots banked in `design-source/verify/pending-modules/pm2-s14/`.

## Per pending line

| Card line | Result | Where |
| --- | --- | --- |
| Roles & Permissions editor, custom roles — held (Q-40) · keep | **Kept held** — the card's own recommendation ("the roles editor stays held by your call"). 1.0's matrix saved page and action flags its routes barely read; 2.0's *Who may do what* is computed from the rules the app enforces (`lib/settings/permissions.ts`), so an editor first needs every rule to read a role table — the developers' auth work (S30). The table gained one honest row (Set a member's PayNow, below) | — |
| Edit a member's name, email, phone, photo | Built by S01 | — |
| My signature as its own card | Built by S01 | — |
| Invite a member, sign-in, sessions, SSO — stand-ins · developers' lane | **Kept** — invitations built by S09; sign-in is S30; sessions and SSO are the developers' | — |
| **Review Link** — later · revisit: "Ask for a review" sends a WhatsApp with no link | **Built.** Company › Profile › Company details › **Reviews**: the review link, Copy, kept as a web address, refused under its box and by the server when it is none, read-only for all but Owners and Admins; **Ask for a review** (a Won lead's brief, and now a completed project's) carries it in the WhatsApp draft, or — with none — answers where to add it (the door for Owners and Admins) with *Ask without a link* | `lib/company/review-link.ts` (new, pure), `lib/templates/model.ts` (`StudioDetails.reviewLink`), `lib/templates/brand.ts` (parse), `app/company/templates-actions.ts` (`saveBrand` refusal), `components/company/profile-view.tsx` (+ `.subGroup`), `components/company/company-ghosts.tsx`, `app/company/review-actions.ts` (new: `studioReviewLink`), `lib/maison-ai/review-ask.ts` (new), `lib/maison-ai/drafts.ts` (`review(l, link, done)`), `components/leads/detail/use-lead-maison.ts`, `lib/projects/briefs.ts` (`BRIEF_ACTIONS.review`), `components/projects/use-project-maison.ts`, `lib/global-search/model.ts` |
| **Who sees leads** sits in Lead management though it also governs projects, quotes and contracts — revisit | **Built, as recommended — moved.** Its one home is Settings › Roles & access, above Who may do what (a pick shows in the table at once); Lead management keeps a pointer line; an old `?section=leads#lead-visibility` lands on the new place; the table's rows link to it in the page; Projects', Members' and the not-found page's lines and ⌘K point there; its help names everything it decides. Qanvast Ops' list now follows it (it applied none) | `app/settings/settings-view.tsx` (the card, the pointer, `useMovedCards`), `app/settings/studio-settings.tsx` (`visibility` · `readOnly` · `studioHelp`), `lib/settings/types.ts` (`VISIBILITY_HREF` · `VISIBILITY_HELP` · `VISIBILITY_POINTER`), `lib/settings/permissions.ts` (`LEADS_VIS` in-page), `components/company/help-link.tsx` (the `#card` form), `app/settings/projects-settings.tsx`, `components/company/members-view.tsx`, `components/shell/record-not-found.tsx`, `lib/global-search/model.ts`, `lib/leads/qanvast.ts` + `app/qanvast-ops/(leads)/page.tsx` |
| **'Studio'** names both a Settings module and a Company group (N-06) — revisit | **Built, as recommended — the module is renamed "Roles & access"** (what it holds; its address stays `?section=studio`). The Company panel's group keeps "Studio" (REG-484, his own pick); the module's "Studio" was an overnight "as recommended" (REG-645) | `lib/settings/modules.ts`, `app/settings/studio-settings.tsx`, `app/settings/settings-ghost.tsx`, `lib/global-search/model.ts`, `lib/maison-ai/answers/setup.ts` |
| **Qanvast Ops' home** (the studio rail or Company › Integrations) — his open call (REG-1372) | **Decided as recommended — it stays on the rail**: the mock's rail item (REG-77), a workspace of its own (Qanvast leads, returns, Studios; Lead credits · Reviews · Hangouts to come), not a connection setting; Company › Integrations' Qanvast card is its door (already a HelpLink). No change on screen | — |
| Google Calendar "Notify me" — waits for Meetings | **Kept** for S23 (Meetings) | — |
| AI & Copilot settings — held with Meetings (REG-552) | **Kept** for S23 | — |
| Journey mode, per-member overrides, Studio Health, lead categories, AI assignment prompt, quote approval thresholds, quote sharing, sub-categories, the competitor list, personal prefs — skipped · keep | **Kept skipped** (as recommended / his rule "Journey and Archive are out"; 1.0 saved most and read them nowhere; personal prefs are S32) | — |
| **Demo shows a CaseTrust badge and award while the record says not done** — his data call | **Built, as recommended — the record follows what the studio shows** (repair R116): CaseTrust and the HDB listing on record, by Dane, after the studio's last signature; the demo's signing pages now carry the CaseTrust disclosure and its tick. One switch on Company › Profile reverses it | `scripts/repair-demo-data.ts` (R116 + two checks) |
| Branch protection on main — his to switch on (REG-726) | **Kept** — a GitHub setting, not a prototype change; not checked from here | — |
| Studio region, currency, an entity's own tax rate — held (DEF-30) | **Kept** for S33 | — |
| *(S01's note)* Accounting can't set their own PayNow | **Built** — Your profile › **Your PayNow** for every member (Accounting too), the dialog Members opens (one house piece now), the same record and rule (`payNowBlock`), Undo; *Who may do what*: Set a member's PayNow; ⌘K *Your PayNow* | `components/company/paynow-dialog.tsx` (new), `components/company/members-view.tsx`, `lib/company/member-rules.ts` (`payNowBlock`), `app/company/members-actions.ts`, `lib/company/your-profile.ts`, `components/profile/your-profile-view.tsx` · `your-profile-ghost.tsx` · `.module.css`, `lib/settings/permissions.ts`, `lib/global-search/model.ts` |

**Found and fixed on the way (bugs):** (1) Settings' ghost drew no read-only line, so every module moved down on reveal for a Designer, a
Manager or Accounting (REG-S14.8); (2) Your profile's ghost drew the signature card and the Members door for Accounting, whose page has neither
(the ghost now reads the shell's viewer seed); (3) S03's signature consent row on Your profile sat 10px out of its card on a touch phone (the house checkbox-label touch rule caught the whole
row) — fixed in `your-profile.module.css`; (4) a door built with `withFrom('/x#card', …)` puts `?from=` after the hash — my own first cut
of the review door did; the house `withFrom` doesn't split a hash, so `review-ask.ts` adds the hash after it (HelpLink already did).

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **"Move Who sees leads into Studio?" — yes**, into the module now called Roles & access, above the table it changes; Lead management keeps a
  pointer (where people looked), never a copy. Its card's words are unchanged; its help now says everything it decides.
- **The "Studio" naming call: rename the Settings module**, not the Company group — the group's name was his pick (REG-484), the module's an
  overnight recommendation (REG-645). "Roles & access" says what it holds; the address stays, so nothing breaks.
- **"Where does Qanvast Ops live?" — the rail**, as the mock draws it; Integrations keeps its door.
- **The review link lives on Company › Profile** with the studio's other public links (website, socials) — not Settings (it is a record, not a
  rule) and not the client portal (S13's Privacy and terms are the portal's; a review link is asked for in WhatsApp). No demo link is made up.
- **A missing link answers, it doesn't send**: a review ask with nowhere to write the review is the card's complaint, so the press says where to
  add it — *Ask without a link* stays one press away for whoever wants to ask now.
- **Ask for a review on a completed project** too — 1.0 meant to send it to "leads or project clients", and a client who came directly never
  has a Won lead's brief. It is the brief's second button only when nothing waits on the viewer.
- **CaseTrust: the record follows the brand** (badge on the prints, award since 2019), recorded after the last signature so no consent is made up;
  bizSAFE / BCA / ACRA left as they are (the badge says Level 3, not Enterprise; the others are steps).
- **The roles editor stays held** (Q-40) — the card said so.

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Settings opens on **Roles & access** — *Who sees leads* (two cards) above *Who may do what*; pick "Only the leads
  assigned to them" → the snackbar, and *See a lead* reads Their own / Their team's at once; put it back. *See a lead*'s "Who sees leads, above"
  scrolls to the card (focus on the chosen option, no page change). Lead management: the pointer line under its head → Roles & access › Who sees
  leads. `/settings?section=leads#lead-visibility` lands there too. ⌘K "who sees leads", "review", "paynow".
- **Company › Profile › Reviews:** type "not a link" → Save → refused under the box; `g.page/r/demo-studio/review` → Save → kept as https, Copy
  → "Review link copied".
- **Ask for a review:** Benjamin Han's lead (Won) → Maison AI → *Ask for a review* — with no link: "Add your review link first" · Add your review
  link (→ Profile › Reviews, Back to the lead) · Ask without a link; with the link: the draft ends "— you can leave it here: …", Open WhatsApp.
  Shalini Menon's completed project → the brief's *Ask for a review* ("a short review of your renovation").
- **Your profile › Your PayNow** (`/profile#paynow`): Add PayNow → "1234" refused → "9182 7364" → "Your PayNow is saved" · Undo. As **Priya
  (Accounting)** the same — and no signature card, no door to Members (the ghost too). Members › Germaine's PayNow opens the same dialog.
- **Germaine / Michelle (Designers):** Roles & access reads with the house read-only line, the cards at rest; Profile's Reviews box at rest;
  *Ask for a review* with no link says an Owner or an Admin adds it (no button). With "Only the leads assigned to them", Qanvast Ops shows
  Michelle only Muthu Vinay.
- **Signing:** a sent contract's `/sign/<token>` — the CaseTrust box; *Send code* waits for its tick (Company › Profile › Registrations shows
  CaseTrust and HDB done, by Dane, 2 Sep '26).
- **390 / 320:** Roles & access, Lead management, Profile › Reviews, Your profile — no sideways scroll; Your PayNow is a bottom sheet.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate + repair R116) with `next start -p 3160` (the regression ids through
`design-source/verify/regression/run.cjs` with `RUN_DIR`, the rest through `pbuild/run.sh`); :3160 stopped after. `npx tsc --noEmit -p .` clean ·
`npx eslint app components lib` 0 errors (the 16 warnings are older files') · `npm run design:lint` nothing new · `npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s14.cjs`** (this step, 6 sections) | **69 / 69** (twice, on fresh copies; the page error log empty) |
| `settings-parity/verify-st-r1 · r2 · r3` | 57 / 57 · 30 / 30 · 30 / 30 (st-r1's tab names: a deliberate change, commented) |
| `view-as/verify-view-as.cjs` · `view-as/verify-panel-order.cjs` | 23 / 23 · measures (exit 0) |
| `global-search/verify-search.cjs` | 27 / 27 |
| `consistency/verify-overlays.cjs` | 67 / 67 |
| `ghosts/verify-ghosts-same.cjs` 1440 · 390 touch · `-strips` · `-measure` | 51 / 51 · 51 / 51 · captures (exit 0) · Δ 0 on every row |
| `ui-sweep/verify-sw-r2.cjs` (the CaseTrust tick, commented) | 27 / 27 |
| `contracts-parity/verify-ct-r1 · r3 · r4` (r1 · r3: the CaseTrust tick, commented) | 36 / 36 · 28 / 28 · 29 / 29 |
| `x-ray-parity/verify-xr-r4.cjs` (Who sees leads on X-Ray) | 16 / 16 |
| `ai-credits/verify-cr-r1.cjs` (View as, the plan's "Studio") | 59 / 59 |
| `uat-dane-2026-10-01/P2b` (the tab names, *See a lead*'s in-page link — commented) | 56 / 56 |
| `ux-build-2026-09-30/P5` (the bundle's CaseTrust tick) · `P6` (Members' link) · `P7` (⌘K "who sees leads") | 58 / 58 · 57 / 57 · 89 / 89 |
| `pending-modules/verify-pm2-s01 · s02 · s03 · s04 · s05 · s06 · s08 · s09 · s10 · s11 · s13` | 79 / 79 · 105 / 105 · 79 / 79 · 82 / 82 · 113 / 113 · 83 / 83 · 70 / 70 · 79 / 79 · 107 / 107 · 62 / 62 · 65 / 65 |
| `parity-map-build/verify-pm-i` (Accounting) · `pm-f` (signing, already ticked) · `pm-h` (the Navigator's notes) | 54 / 54 · 60 / 60 · 50 / 50 |
| `reports-in-company-2026-10-08/verify-reports.cjs` | 41 / 41 |
| `lead-project-parity/KE/verify-ke.cjs` (Projects' pointer — commented) | 31 / 31 |
| `projects/verify-pj-gap-d.cjs` (CaseTrust on record already) · `verify-pj-gap-i.cjs` (the toggle on bizSAFE — commented) | 65 / 65 · 81 / 81 |
| `simplify-projects-finance/verify-r2e.cjs` (Members' PayNow — the shared dialog) | 25 / 25 |

**pm2-s01 failed once (78 / 79)** — "390: the ghost's cards sit where the page's do": its third card is now Your PayNow, so for the first time it
measured the signature card's bottom, which the ghost drew 45px taller on a touch phone. Two causes, both fixed: the ghost's 140 signature face
was an inline bone on a 5px-taller text line (`.faceBone`), and on the page the house touch rule for a checkbox's label (`label:has(input
[type='checkbox'])`, REG-273: 44 target, −10 margins) caught S03's whole consent row and pulled it 10px out of its card (`.consentRow.consentRow`
under `hover: none` keeps it in place; the switch keeps its own 44). Then 79 / 79, twice. Also checked by hand: a Designer's Settings (Roles &
access and Lead management) and Accounting's Your profile — ghost and page card tops equal at 1440 and 390.

## Migration and repair
- **No migration** — the review link rides in the studio's details (`settings.brand`), PayNow in `members.paynow` (both existed); no new table,
  so the baseline lists are unchanged.
- **Repair R116** — the studio's registrations as its brand shows them (CaseTrust · HDB DRC, `settings.compliance_studio`), idempotent ("already
  in step" on a second run), written only for a row the record doesn't hold and only while the brand still claims it. Two checks: a CaseTrust
  badge or award while CaseTrust is not done; a contract signed online while CaseTrust was on record without the client's tick. Full repair: all
  checks pass. **The orchestrator's `db:baseline` after the step carries it** — until then a restored base has no CaseTrust on record.

## For the next steps
- **The UAT's signing steps** (ch 8.10 · 8.12 · 12.11) now meet the CaseTrust tick after the accept tick — the steps' JSON and the testers' sheet
  are Vicky's to update (or say the word and CaseTrust goes back off: one switch on Company › Profile, then `db:baseline`).
- **Probes that sign** must tick the CaseTrust box when it is there — the helper `caseTrust(page)` in sw-r2 / ct-r1 / ct-r3 / ux-P5 (pm-f and
  gap-d already did); a new signing probe should copy it.
- **S22 (Dashboard):** a review ask after handover could be a Needs you row ("Shalini's home is handed over — ask for a review") — it's a brief
  button today. **S23 (Meetings):** Google Calendar's *Notify me* waits there. **S30 (sign-in):** the roles editor's prerequisite (rules reading a
  role table) belongs with real auth. **S32:** personal prefs. **S33:** region, currency, an entity's own tax rate.
- **HelpLink's `#card` form** (an in-page card link: no navigation, `bringCardIntoView`, focus on the chosen option) is there for any module
  whose rows point at a card above them.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock for any of it; built on the house cards, the Settings card table, the Maison AI sheet;
   every invented line in REG-S14.1…9; Qanvast Ops kept where the mock's rail draws it.
2. **One system, no one-offs** — one PayNow dialog for its two doors (it was inline in Members), the house `HelpLink` (one new in-page form, not
   a new link), `bringCardIntoView`, `useMovedCards`, `cleanLink` for the review link (the quote line's and the portal's rule), the house
   TextField / IconButton / Tooltip / useCopy, the ghost kit; one new CSS rule each in Profile (`.subGroup`) and Your profile (`.paynow`);
   `design:lint` holds.
3. **Plain words** — "Roles & access", "Who sees leads, above", "Add your review link first", "The message would ask Benjamin for a review with
   nowhere to write it", "Your PayNow", "Not set yet".
4. **Nothing is lost** — a PayNow change answers with Undo; the review link is saved with the page's own Save (the leave guard covers it); the
   moved card's old address still lands on it; R116 writes nothing a studio set itself.
5. **Say why** — a bad link is refused under its box with an example; a missing link says what the message would lack; a Designer is told who
   adds it; Roles & access shows the read-only line; Who sees leads' help names what it decides.
6. **Back returns where you came from** — the review door opens Profile with `?from=` (Back to the lead / project); Lead management's pointer and
   Members' line carry the way back; ⌘K lands on the cards; the in-page row link doesn't navigate at all.
7. **Every screen is whole** — no new page; the Settings ghost draws Who sees leads, the pointer line and the read-only line; Profile's ghost
   the Reviews part; Your profile's ghost the PayNow card and Accounting's shape; no page errors in the probe.
8. **Every width is designed** — 1440 · 390 · 320 checked (no sideways scroll against `screen.width`); the PayNow dialog is a bottom sheet on a
   phone; the pointer's "Roles & access" and "X‑Ray" don't break mid-name; the consent row stays inside its card on a touch phone.
9. **Tables follow the leads listing** — not applicable (Who may do what is the Settings card table, unchanged; one row added).
10. **Motion with purpose** — none added; the in-page landing scrolls smoothly unless reduced motion is asked for.
11. **Honest data** — CaseTrust and HDB on record because the studio's badges and award say so, recorded after its last signature (no consent
    made up); no review link made up; every figure the probe asserts is read from the records.
12. **Reach for everyone** — the in-page link moves focus to the card's chosen option; the Copy button and the PayNow press have names; the
    review ask's rows and button are keyboard presses in the house sheet; the dialog is the house Dialog (⌘↵, Esc).
- **How to add a missing thing** — one home (Who sees leads in Roles & access with a pointer where people looked; the review link with the
  studio's links; PayNow on the one record, two doors to one dialog); shown only when it applies (the review door only for Owners and Admins;
  the project's review ask only when nothing waits; the CaseTrust box only while CaseTrust is on record); one filled button (the review answer's
  *Add your review link*, the proposal's *Open WhatsApp*); defaults that need no set-up (no link → the honest answer; the demo works as it is).
