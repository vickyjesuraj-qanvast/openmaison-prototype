# Package K2b — the studio's record in Company · outcome (2026-10-08)

Audit ids: **N-07** (registrations recorded once, on Company › Profile), **N-13** (the studio's own entity with the same GST switch),
**N-17** (a member's project capacity on Company › Members). Register rows staged in `reg-K2b.md`. `tsc` clean, `eslint` clean on every file
below, `npm run design:lint` — nothing new. No migration, no schema change, no write to local.db; no build, no server.

## N-07 — CaseTrust and the studio's registrations, recorded once

**The record**: `settings.compliance_studio` — the key the Navigator's *Done* already wrote (`{ <actionId>: { done, by, at } }`), so the
Navigator's existing data stays where it is. CaseTrust = its `CASETRUST_RENOVATION` entry.

Files:
- `lib/compliance/studio-actions.ts` — the pure half of the record moved here (client-safe): `REGISTRATIONS_KEY`, `CASETRUST_ID`,
  `StudioActionState`, `parseStudioStates`.
- `lib/compliance/queries.ts` — `STUDIO_COMPLIANCE_KEY` = `REGISTRATIONS_KEY` (re-exports kept for its callers); new `fetchRegistrations()`
  (the record with each recorder's name), which `fetchNavigator()` now uses.
- `lib/contracts/casetrust.ts` — `CASETRUST_KEY` now names the registrations record and `parseCaseTrust` reads its CaseTrust entry, so
  `fetchCaseTrust()` (`casetrust-queries.ts`, unchanged) and both signing pages and the sign action read the one record unchanged.
- `app/projects/compliance-actions.ts` — `setStudioAction` / `undoStudioAction` (Owners and Admins, Undo) are the writes; they now revalidate
  `/company/profile`, `/compliance` and `/sign` (layout).
- `components/company/profile-view.tsx` (+ `.module.css`) — the new **Registrations & accreditations** card after Company details
  (`id="registrations"`, `data-testid="registrations"`, rows `data-testid="registration" data-id=<actionId>`), on the card table composed from
  `components/om/card-table.module.css` (`.regTable · .regHead · .regRow · .regCol`, own tracks + phone stack). Each switch writes at once,
  snackbar with Undo (CaseTrust's says what the signing pages now do).
- `app/company/profile/page.tsx` — loads `fetchRegistrations()`.
- `components/compliance/navigator.tsx` — *Your studio* reads the record; *Mark done* / *Back to to do* (and their Undo) are replaced by a door,
  **Record in Company › Profile** (`data-testid="navigator-record"`, Owners and Admins only) → `/company/profile?from=%2Fcompliance#registrations`;
  the intro's Company › Profile link lands on the card too. `navigator-ghost.tsx`: the second button's bone widened to the new label.
- `app/settings/settings-view.tsx` — the Quotes & pricing module no longer renders `CaseTrustSetting`; the unused `caseTrust` prop is gone
  (K2a had already dropped it from `app/settings/page.tsx`).
- `components/company/company-ghosts.tsx` › `ProfileGhost` — the Registrations card's table (5 rows).

Left as they were (on purpose): the **HDB licence** number stays a Company details field (it prints through `{studio_licence}`; moving it into
the registrations card would put a Save-changes field inside a card whose switches save at once — Vicky's call if he wants it moved); the
Brand kit's badges stay pictures in the kit.

## N-13 — the studio's own issuing entity

- `components/company/profile-view.tsx` — the first entity ("· the studio itself") gets the same *GST-registered* switch as every other
  (`data-testid="studio-gst"`), and while it is on, its **GST Reg. No.** (moved out of Company details — same `details.gstReg`, same
  `{studio_gst}`). The switch is part of the form: **Save changes** writes the brand (entity 0's `gstRegistered` kept in step) and, when it
  changed, `setStudioGst({ gstRegistered })` → `settings.studio.gstRegistered` — the key quotes, invoices, POs, the letterhead, the books and
  the credits chrome already read. No reader changed.
- `app/settings/settings-view.tsx` — Settings › Quotes & pricing › GST keeps only **GST rate (%)** + *Save rate* (still disabled while the
  studio isn't registered); the switch is gone and the help points to Company › Profile. `NewQuoteDefaultsCard`'s GST line unchanged.
- `app/settings/actions.ts` — `setStudioGst`'s comment says who writes which half; behaviour unchanged.
- `ProfileGhost` — eight details fields (was nine), the studio entity's switch row and its GST Reg. No. field.
- `app/settings/settings-ghost.tsx` — **no change needed**: the Quotes & pricing ghost draws only the two approval cards, never GST or CaseTrust.

## N-17 — a member's project capacity on Company › Members

- `lib/company/members.ts` — `MembersData.defaultCapacity` (`fetchDefaultCapacity()`, the Settings › Projects › Workload number).
- `app/company/members-actions.ts` — new `setMemberCapacity(memberId, n | null)`: Owners and Admins (`setsCapacity`, Workload's refusal
  words), `clampCapacity`, writes `members.project_capacity`, revalidates Members + `/projects` (layout); answers `before`.
- `components/company/members-view.tsx` (+ `.module.css`) — each active member's second line: **Projects at once** (`data-testid="member-capacity"`,
  a size-s select: *Studio default · n*, 1 project … 20 projects), disabled for anyone but Owners and Admins; optimistic, the value goes back on
  a refusal. CSS: `.capacity` 180px; `.prefRow` wraps from 768 up when the line can't hold it (no change at 1440).
- `components/projects/workload/workload-settings.tsx` — the Workload card's help names Company › Members (a `HelpLink`).
- `components/projects/workload/workload-view.tsx` — comment only: **Set capacity stays and writes the same column** (the brief's "or writes
  the same column"), so `components/projects/projects-workspace.tsx` needed nothing.
- `MembersGhost` — the select's bone after the switch.
- `lib/company/member-rules.ts`, `lib/company/entities.ts` — no change needed.

## What to verify in the browser

Production build on a scratch DB; as Dane (Owner) unless said.
1. **/company/profile** at 1440 and 390: Company details without GST Reg. No.; the new *Registrations & accreditations* card (5 rows, "—" in
   Recorded, switches off); the studio's entity shows *GST-registered* (on) + *GST Reg. No.* (M90371234). Toggle bizSAFE → snackbar
   "“bizSAFE Enterprise Certification” marked done" + Undo; Recorded fills with "Dane … · date". Toggle CaseTrust → "Signing pages now carry
   the CaseTrust disclosure and its tick". Flip the studio GST switch off → page dirty → Save changes → `settings.studio.gstRegistered = false`;
   its GST Reg. No. hides. Ghost (`loading.tsx`) vs page — same shape.
2. **As Sarah (Designer)**: Profile read-only (registration switches and the studio GST switch disabled); /compliance shows no Record button.
3. **/compliance** (Your studio): no Mark done; *Record in Company › Profile* opens Profile on the registrations card with Back to the Navigator;
   a registration done on Profile shows Done with who/when here.
4. **/sign/<a sent contract>**: with CaseTrust done on Profile the disclosure + tick show; off, they don't.
5. **/settings?section=quotes** at 1440/390: GST card = rate only (disabled + Save rate off while not registered), help links to Profile; no
   CaseTrust card; read-only as Sarah.
6. **/company/members** at 1440, 1025 (rail unpinned and pinned), 768 touch, 390: *Projects at once* on each active row (Michelle "2 projects",
   Germaine "3 projects", others "Studio default · 4"); as Dane change one → snackbar, `members.project_capacity` written; **/projects?view=workload**
   shows it; as Sarah the select is disabled. Members ghost vs page.
7. **/settings?section=projects** › Workload: the help's *Company › Members* link opens Members with the way back.

## Probe assertions changed (not run)

- `design-source/verify/projects/verify-pj-gap-i.cjs` §5 — Mark done/Undo on the Navigator → the door (no `navigator-done`, one
  `navigator-record`; it opens `/company/profile?from=/compliance#registrations`), Done on Profile kept on the server with who, Undo back to
  to do, the Navigator reading Done, put back; the Designer check now looks for no `navigator-record` and disabled switches on Profile. Header
  comment updated.
- `design-source/verify/projects/verify-pj-gap-d.cjs` §6 — CaseTrust turned on via Profile's `registration[data-id=CASETRUST_RENOVATION]`
  (asserts `compliance_studio.CASETRUST_RENOVATION.done = 1`), plus "Settings › Quotes & pricing has no CaseTrust switch"; `compliance_studio`
  added to the snapshot it puts back. Header comment updated.
- `design-source/verify/settings-parity/verify-st-r1.cjs` — the GST step: no switch in Settings' GST card; registration off/on through
  Profile's `studio-gst` + Save changes (asserts `studio.gstRegistered` 0 then 1); the rate rests while off; the 8.5 rate as before. Read-only
  step: "the GST rate is shown, disabled" (was the switch).
- Checked and unaffected: `verify-tpl-parity.cjs` (entity 1's letterhead GST Reg. No.), `ux-build/P6/verify-p6.cjs` (entity 0's Bank),
  `verify-st-r2.cjs` / `verify-sw-r4.cjs` Members steps, the Workload *Set capacity* checks in gap-i §1 (the dialog is unchanged).

## Needs from others

- **Orchestrator — delete two dead files**: `components/contracts/sign/casetrust-setting.tsx` (nothing imports it now) and
  `app/contracts/casetrust-actions.ts` (`setCaseTrust`, imported only by that card). Not mine to touch; **important** because `CASETRUST_KEY`
  now names the registrations record, so `setCaseTrust` — if anything ever called it again — would write `{ on }` over the whole record.
- Optional comment-only touch-ups (not mine): `lib/contracts/casetrust-queries.ts`'s doc (it reads the one record now, via `CASETRUST_KEY`);
  `lib/templates/model.ts` `StudioDetails.gstRegistered`'s doc says "Settings › Quotes & pricing › GST" — now Company › Profile.
- **K3 (⌘K)**: the *Registrations & accreditations* row (`/company/profile#registrations`) you added matches the card's id and title. Please
  also let "capacity" / "projects at once" find **Company › Members** (e.g. the Team row's words, or a row "Project capacity — Members · how
  many projects each person runs at once" → `/company/members`); the Workload rows can stay.
- **Vicky's files (for him)**: UAT `design-source/uat/story/ch2.json` (the GST step, "Under "GST" check "Registered for GST" is on") now
  happens on Company › Profile's studio entity. The demo's brand kit carries a CaseTrust badge and its About page a "CaseTrust accredited"
  award while the registrations record has CaseTrust not done — the same as before (the old switch was off too); turning it on would put the
  disclosure on every demo signing page, so it's left for him.

## Repair block (for `scripts/repair-demo-data.ts`; insert after R89, number as the orchestrator likes)

The baseline has neither key, so this is a no-op on the base state; it moves a database where the old Settings switch was turned on.

```ts
  /* ── R9x · one home: the studio's registrations (one-home N-07, owner 2026-10-08) ─────────────────────────────────────────────────────────
     CaseTrust was a Settings › Quotes & pricing switch (settings `casetrust`, `{ on }`) beside the Compliance Navigator's own Done (settings
     `compliance_studio`). It is one record now — `compliance_studio`, recorded on Company › Profile › Registrations & accreditations, read by the
     Navigator and the signing pages. A studio that had the old switch on keeps CaseTrust done there (by its Owner, when the old row was
     written); the old row goes. Idempotent: the record's own CaseTrust entry, when it has one, wins; a second run finds no `casetrust` row. */
  {
    console.log('\nR9x Registrations — CaseTrust into the studio’s one record')
    const old = rows<{ value: string; at: number | null }>(await client.execute(`SELECT value, updated_at AS at FROM settings WHERE key = 'casetrust'`))[0]
    if (old) {
      let on = false
      try { on = (JSON.parse(old.value) as { on?: unknown }).on === true } catch { on = false }
      if (on) {
        const cur = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'compliance_studio'`))[0]
        let record: Record<string, unknown> = {}
        try { const v = cur ? (JSON.parse(cur.value) as unknown) : {}; record = v && typeof v === 'object' ? (v as Record<string, unknown>) : {} } catch { record = {} }
        if (!record.CASETRUST_RENOVATION) {
          const owner = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role = 'Owner' AND is_active = 1 ORDER BY is_you DESC, name LIMIT 1`))[0]?.id ?? null
          const at = typeof old.at === 'number' && old.at > 0 ? (old.at < 1e12 ? old.at * 1000 : old.at) : Date.now()   // settings.updated_at is seconds
          record.CASETRUST_RENOVATION = { done: true, by: owner, at }
          await client.execute({ sql: `INSERT INTO settings (key, value, updated_at) VALUES ('compliance_studio', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, args: [JSON.stringify(record), Math.floor(Date.now() / 1000)] })
        }
      }
      await client.execute(`DELETE FROM settings WHERE key = 'casetrust'`)
      note(on ? 'CaseTrust moved into the studio’s registrations; the old switch’s row removed' : 'the old CaseTrust switch’s row removed (it was off)')
    } else note('no old CaseTrust switch to move')
  }
```

…and one line for the `checks` list:

```ts
    /* (one-home N-07) CaseTrust lives in the studio's one record of registrations — the old switch's row is gone */
    ['the old CaseTrust switch’s row still stored (one-home N-07)', `SELECT key FROM settings WHERE key = 'casetrust'`],
```

No repair for N-13 (the studio's GST keeps its key, `settings.studio`) or N-17 (`members.project_capacity` is the same column).
