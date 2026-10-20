# Brief — the 1.0 → 2.0 map of Projects and Finance (read-only)

**Goal.** The owner (Vicky, product designer) wants one exact map from every feature and rule of OpenMaison **1.0**'s Projects and
Finance to where it is in **2.0 today**, so that nothing 1.0 does gets ignored. You map ONE area (your prompt names it). Your rows
become rows of a review page he reads line by line, so each one must be precise, checked against code, and written in plain words.

**Read only. Never edit, create or delete a file in either repo.** Write only your one output file (path in your prompt).

## The two codebases

- **1.0** = `/Users/vicky/Documents/GitHub/qanvast-id-tool` (Next.js; `src/app/(main)/projects/**`, `src/app/(main)/finance/**`,
  `src/app/(main)/accounts/**`, `src/app/(main)/escalations/**`, `src/app/(main)/inbox/**`, `src/app/(main)/tools/**`, `src/app/my/**`,
  `src/app/pay/**`, `src/app/po/**`, `src/app/floor-plan/**`, `src/app/api/**`, `src/components/**`, `src/lib/**`, `supabase/migrations/**`, `docs/**`).
- **2.0** = `/Users/vicky/Documents/GitHub/openmaison-prototype` (the working tree as it is now). Start from `CLAUDE.md` › *Map* (the
  entries "Projects, money in and the client portal", "Projects — the gaps build", "One home per thing", "Lead ↔ Project parity",
  "Projects & Finance, simplified"). Today's shape: a project has **7 tabs** — Overview · Tasks [All tasks · Compliance] · Schedule ·
  Client [Updates · Messages · Tickets · Questionnaire] · Design [Choices · Floor plan · Designs] · Money · Files & notes [Files ·
  Notes & Logs · Activity] (`lib/projects/tabs.ts`); **Finance is Company › Finance** (`/company/finance/<tab>`: To do · Money out ·
  Vendors · Commission · Xero …, `lib/finance/sections.ts`); **every report is Company › Reports** (Leads · Projects · Finance);
  money rules are **Settings › Finance**, project rules **Settings › Projects**; the client portal is `/my/[slug]` and its set-up
  **Company › Client portal**; Xero and lead capture are **Company › Integrations**.

## Sources to start from (an index, NOT the truth — confirm in code)

- 1.0 inventories, by row id: `design-source/context/parity/projects-1.0-inventory/{A…M}-*.md` (A listing · B start · C detail &
  overview · D updates, meetings, activity, closure · E milestones/Gantt · F tasks, materials, floor plan, compliance, 3D · G the
  project's Finance tab · H files, docs, renders · I homeowner side · J data, API, roles, notifications, crons · K UI system · M portal
  set-up). Cite their row ids (e.g. `E-114`) in `v1_refs`.
- What 2.0 was missing on 2026-10-07 and why: `design-source/context/parity/26-projects-missing-from-1.0-2026-10-07/{1…7}-*.md`
  (7-coverage.md lists 1.0 files no inventory read — check whether any fall in your area).
- What was decided and built: `22-projects-1.0-to-2.0-audit-2026-10-05.md` (Q-01…Q-50 + the owner's answers),
  `23-projects-build-2026-10-05.md` (§1 every call incl. Finance F-01…F-20), `24-projects-migration-map-2026-10-05.md`,
  `27-projects-gaps-build-2026-10-07.md` + `projects-gaps-build/{a…j}-outcomes.md` (what each gaps package built or left),
  `design-source/context/consistency/02-one-home-audit-2026-10-08.md`, `design-source/context/consistency/lead-project-parity/README.md`,
  `design-source/context/simplify-projects-finance/README.md` (+ `build/outcome-K*.md`), and `design-source/REGISTER.md` (grep it:
  every decision is a `REG-nnnn` row). Paths are relative to the 2.0 repo.

## What a row is

One row = one thing a **studio member, client, vendor or the system** does or gets in 1.0, at the level a person would recognise and
miss: a screen, a view, an action, a rule, a status, a calculation, a notification or email, a scheduled job, a permission, an
export, a public link, a setting. Not a pixel, a colour, a hover or an animation (K's UI-system rows are out of scope). Split a
feature into several rows when its parts landed differently in 2.0 (e.g. "Gantt: drag a bar" vs "Gantt: dependencies"). Merge rows
that are one job. Aim for complete coverage of your area: typically 50–130 rows. **Before you finish, walk your area's 1.0 routes,
components and API handlers once more and add anything you missed** — the point of the page is that nothing is ignored.

For EVERY row, find the 2.0 counterpart in the 2.0 code (open the file — don't trust a record alone; records predate later moves). If
you cannot find it, grep 2.0 for its words and data before calling it missing. Note where a 1.0 feature now has a different home.

## Status (one per row)

- `kept` — in 2.0, doing the same job (2.0's own words and layout are fine).
- `changed` — in 2.0 but works differently; say how in `how`.
- `moved` — in 2.0 under another home; `v2` names the new home.
- `merged` — folded into another 2.0 feature; `how` names it.
- `partial` — some of it is in 2.0; `how` says exactly what is not.
- `simulated` — present in the prototype as a stand-in that developers must wire for real (Xero sync, the delivery adapter for
  email / WhatsApp, the portal's six-digit code, a payment gateway, AI calls…).
- `held` — the owner decided to build it later (cite: Meetings REG-552, the Dashboard, the Accounting role F2-Q14 …).
- `dropped` — the owner decided not to carry it (cite the REG / Q id).
- `missing` — not in 2.0 and no decision found. These are the gaps the page exists to catch — be sure, and set `severity`.

## Output — a JSON file, exactly this shape

```json
{
  "area": "<your area name>",
  "rows": [
    {
      "id": "<PREFIX>-001",
      "group": "<sub-area, a few words, e.g. 'Gantt' or 'Invoices'>",
      "feature": "<what it is, plain words, ≤ 70 chars>",
      "what": "<what it does in 1.0, one sentence>",
      "who": "studio | client | vendor | system",
      "v1": "<where in 1.0 a user finds it — e.g. 'Project › Management › Milestones'>",
      "v1_code": "<one or two 1.0 file paths, repo-relative>",
      "v1_refs": "<inventory row ids, e.g. 'E-114, E-120' or ''>",
      "status": "kept | changed | moved | merged | partial | simulated | held | dropped | missing",
      "v2": "<where in 2.0 a user finds it today — e.g. 'Project › Schedule › milestone row ⋮ › Move' — or '' when missing/held/dropped>",
      "v2_code": "<one or two 2.0 file paths you opened, repo-relative, or ''>",
      "how": "<for changed/moved/merged/partial/simulated: what differs, one or two sentences; '' for kept>",
      "decision": "<REG-nnnn / Q-nn / F-nn / M-nn ids behind a change, hold or drop, or ''>",
      "severity": "<for missing or partial: high | medium | low; else ''>"
    }
  ],
  "new_in_2": [ { "feature": "<2.0-only addition in your area>", "v2": "<where>", "note": "<one line>" } ],
  "notes": "<anything the owner should know about your area, ≤ 5 sentences: what you could not verify, 1.0 dead code you skipped>"
}
```

Writing rules: plain English, active voice, no jargon a studio owner wouldn't use (say "the client's portal", not "homeowner_lead_links").
Name 2.0 places by what the screen says (tab › view › button). Keep `what` and `how` to the point. Valid JSON only (no comments, no
trailing commas); check it parses with `node -e "JSON.parse(require('fs').readFileSync(process.argv[1]))" <file>` before you finish.

Your final message: the output path, the row count by status, and the `missing` rows' features in one line each.
