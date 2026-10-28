# Triage C: B3's area (projects, portal, issues, messages, invoice, receipt), closing regression of the calm UI build (2026-10-28)

Run dir: `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/fix-C`. Port 3486, on the current 01:28 build (no rebuild).
Probes: pj-gap-d, pj-r1, pj-gap-c, pm-h, rwd-c2, pm2-s26, pm2-s44r, pm2-s45b.

**Result: all 8 green on the current build** (round 2, one `run.cjs` call). pm-h 50/50 · pj-r1 98/98 · pm2-s45b 72/72 · rwd-c2 127/127 · pm2-s44r 82/82 ·
pm2-s26 107/107 · pj-gap-d 65/65 · pj-gap-c 106/106. **No source changed. No defect. Nothing needs a rebuild.**

## Every failing check

| Probe | Check | Class | What I did | Result |
|---|---|---|---|---|
| pm-h | the run stopped: ENOENT `…/public/projects/demo/floor-plan-existing.png` | Pre-existing (harness path) | It fails the same way outside the repo: the path is read from `…/scratchpad/public/…`. The line is unchanged from HEAD. `path.join(__dirname, '..', '..', '..', 'public', …)` is a form `run.cjs` doesn't rewrite, so the lane's copy looked three folders above itself (B3's outcome §5 had the same finding). I wrote the same path as one string, `path.join(__dirname, '../../../public/projects/demo/floor-plan-existing.png')`, which `run.cjs` rewrites to the repo. It still resolves to the repo when the probe runs in place. | green |
| pm-h | one Ask box heads the sheet, "Answers from your records" (seen once the path ran) | Stale (B1 1-19 · W-113: the helper went) | The rule now reads one `maison-ask` box whose field is "Ask Maison AI" (as pm2-s10 restated it). Marked. | green |
| pm-h | 8 · the phone: the `Maison AI` click timed out | Stale (B1 at B3's ask, 3-09 · 1-43: on a phone, a project page starts with the button tucked; it comes back once the page stops at its end) | The probe scrolls to the page's end first, then presses the button. The Ask box is still reachable on a phone. Marked. | green |
| pj-r1 | threw: `locator.click` timeout (New project) | Stale (B2 · T-01: AssigneeField's default label "Assign member" → "Members") | `dlg.getByLabel('Members', { exact: true })`, the same picker, still picks Sarah. Marked. | green (the 4 checks after it pass too) |
| pj-r1 | the sheet's Create group: Task · Note · Contact Log · … then Edit details | Stale (B2 T-13: "Contact log") | Only the word changed. **Every Create row is still there, in the same order**: Task · Note · Contact log · Meeting · Update · Variation order · AI Visualizer · 3D Space Planner, then Edit details at index 8 (screenshot `lanes/pj-r1/shots/project-kebab-390.png`). Marked. | green |
| pj-gap-d | the run stopped: `[data-testid="registration"][data-id="CASETRUST_RENOVATION"]` not found | Stale (B5 5-36: Company › Profile is four tabs; the registrations live on `?tab=registrations`) | `go('/company/profile?tab=registrations')`. Same row, same switch. Marked. | green (the CaseTrust signing checks after it pass) |
| pj-gap-c | its row opens the Dashboard's Review pane on the ask | Stale (the calm build's own restatement read the address; `needs-inbox.tsx` reads `?review=` once, then drops it from the address) | Live check: the bell row lands on `/dashboard?from=/projects` with the Review pane open on "Michelle asks for 1 week more on Carpentry fabrication". The probe now reads the page: on /dashboard, `review-pane` visible, and its text names this ask. Stricter than before. Marked. | green |
| pj-gap-c | the task's panel: who, a supplier, their mobile, not sent yet | Stale (B2 1-23 · W-103: `OUTSIDE_LABEL.supplier` = "Vendor", Finance's word; the stored kind stays `supplier`) | **Nothing is lost.** The panel still shows the name "Jason Lim (Lamitak)", the kind "Vendor", the mobile "9182 7340" and "Not sent yet", plus Send on WhatsApp, Edit and Remove. The probe now reads `Vendor · 9182 7340`. Marked. | green |
| pj-gap-c | the bell rings for Painting 6 days ahead only once the lead time reaches it | Stale (B1 1-20: the bell's due rows fold under "Due · n · Show", `notifications-due-fold`) | A local `openDue()` opens the fold before **both** reads (bell0 and bell1), so "not before" still proves something. Marked. | green ("6 days ahead") |
| pj-gap-c | Rebuild, the lead time, the Tasks page stopped: `task-source` radio "Projects" | Stale (B2/B1 1-26: whose tasks became the scope pill's second group at every width; the same `task-source` handle; "All" reads "Leads and projects") | `pickSource(name)` opens the "All tasks" pill and presses the `menuitemradio` inside `task-source` for Projects, Leads, and Leads and projects. Marked. | green (the 5 checks after it pass) |
| rwd-c2 | 320 /projects: two across where the row holds two (≥ 264) [] | Stale (B3 3-11 · T-15: on a phone, the listing's tiles are one line of doors under the pill, with the same `tile-<scope>` handles and the open value after them; no house tile row) | For `/projects` at phone width, the check now asserts there is no tile row, and that the doors line is drawn: at least one `tile-*` door, each inside the screen, no word broken. The other nine pages keep the two-across rule. Marked. | green |
| rwd-c2 | 390 /projects: the same | Stale (same) | the same | green |
| pm2-s26 | the run stopped: `View Client Info` not found | Stale (B2 W-013: the phone button reads "View details" and opens the "Lead details" / "Project details" sheet; the same sections, now one shared block) | Presses "View details". The sheet still carries `info-team-chat`. Marked. | green (the ghost section after it passes) |
| pm2-s44r | the probe stopped: click timeout | Stale (B4 W-199 · T-13: "New Contract" → "New contract") | `/^New contract/` on the toolbar button, then the same menu row "From the studio agreement". Marked. | green (82; it had stopped at 55) |
| pm2-s45b | the Contractors chip, its count the DB's | Stale (B5 5-27 · 5-43 · W-216, T-07: Finance › Vendors' chips carry no counts) | The chip now reads exactly "Contractors". The DB's count is still asserted by the next check (pressed, the rows = the DB's active contractors). Marked. | green |
| pm2-s45b | a contractor's row says its trades and "works on site" | Stale (B5 5-43 · W-316: the row reads "{trades} · Contractor"; the code and the on-site words are on the vendor's panel, asserted by the following check) | Asserts ` · Contractor` and one of the DB's contractor trades in the first row. Marked. | green |
| pm2-s45b | its line: over capacity, and the starts with no contractor are Needs you's | Stale (B1 1-33 · W-072: "n free this week, 1 overbooked") | `/overbooked/`, with the no-contractor starts still kept off the line. Marked. | green |

Every restated line carries `(the calm UI build 2026-10-27, a deliberate change …)`. The pm-h path fix says it is a harness path.

## Counts

- Stale: 16
- Cascade: 0 (each stop was a single stale step, and everything after it passed on the re-run)
- Defect: 0
- Pre-existing: 1 (pm-h's harness path)

## Defects

None. On each "would that be a loss" point I was asked to watch:
- **pj-r1:** every Create row still exists.
- **pj-gap-c:** the outside person's panel still shows who, the supplier kind (as "Vendor"), their mobile and "Not sent yet".
- **rwd-c2:** the /projects tiles were changed on purpose on a phone (3-11); every fact is still a door with its handle.
- **pm2-s45b:** the contractors count is still the rows the chip lists, and their trades and on-site details are still on the row and panel.

## Requests for other areas

None.

## Register rows

None (no visible fix).

## Checks

- `npx tsc --noEmit -p .`: clean.
- `npx eslint` on the 8 probe files: 0 errors (`design-source/` is on ESLint's ignore list; 8 "file ignored" warnings).
- `npm run design:lint`: "nothing new breaks a house rule".
- `node --check`: passes on all 8 edited probes.
- The guard: pages · server actions · control handles · keyboard shortcuts all report "none gone" (142 new handles).
- Port 3486 stopped.
