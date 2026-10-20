# S37 · Verify for a Qanvast listing — outcome (2026-10-13, lane B)

Cards: `onboarding:qanvast-listing-verification` and `studio:verify-listing` (both "skip" — 1.0's form was a mock that saved nothing; his
"build all of them" 2026-10-11 and the step's brief: build it **in its right form**). 1.0 read in full: `src/app/(main)/verify/page.tsx` (the
form: Studio Name\*, Registration ID\*, Studio Description\*, Differentiator / USP, No. of Projects Delivered, Proof of Delivered Projects,
Proof of Testimonials, "PDF, JPG, PNG up to 10MB"; its three banners — submitted "within 3–5 business days … notified via email and in-app",
verified, rejected "review the feedback below and resubmit"; `handleSubmit` only set the banner), `src/app/admin/verification/page.tsx`
(hard-coded SUBMISSIONS; Pending · Verified · Rejected; Verify / Reject with a "Rejection Note (sent to studio)" — read for its shape only),
`supabase/migrations/20240101000003_studios.sql` (`studios.verification_status` not_submitted · pending · verified · rejected and the table
`studio_verifications` — status, submitted_documents, admin_notes, reviewed_by, submitted_at, reviewed_at — written by nothing),
`supabase/seeds/022_seed_studios.sql` (the demo studio seeded `verified`), `src/lib/access-control.ts` (`verify: ["owner"]`),
`src/context/session-context.tsx` (`isQanvastListed: true` for everyone), `src/app/admin/studios/[id]` (the Platform's badge),
`src/app/api/admin/counts` (the Platform's pending count).

Register rows: `steps/reg-S37.md` (REG-S37.1…9). Probe: `design-source/verify/pending-modules/verify-pm2-s37.cjs` (**89 / 89**); shots banked in
`design-source/verify/pending-modules/pm2-s37/` (14: every state of the card at 1440, the dialog at 1440 and 390, Integrations Not listed, 390).

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| *onboarding:* "A studio's application to be listed on Qanvast, reviewed by staff" | **built** (the application, kept as a record, from the studio's records + its words and proof) · **stand-in** (the staff's review is Qanvast's: its answer arrives through the new seam and webhook; on the prototype an Owner or an Admin plays it, labelled "(demo)", recorded `answered_via = 'demo'`, the card and the bell say so) · the staff's own screen **parked by him** (Platform admin, excluded) | `lib/qanvast-listing/{model,service,queries}.ts`, `app/company/listing-actions.ts`, `components/company/qanvast-listing-{card,dialog}.tsx`, `app/api/webhooks/qanvast-listing/route.ts`, `studio_verifications` |
| *studio:* "Apply to be listed on Qanvast, with documents" | **built** — Company › Profile › Listed on Qanvast: Apply to be listed · Update your listing · Fix and send again; the documents are the records shown (name, UEN, registrations, completed projects counted, About photos / year / awards, review link, website) and the proof files (real bytes, two lists, PDF/JPG/PNG ≤ 8 MB, Undo) | the same + `studio_verification_files`, `app/company/listing-file/[id]/route.ts` |
| *studio:* "A staff queue to verify or reject an application with a note" | **parked by him** — the queue is Qanvast's staff's (Platform admin, excluded by his word); **built on the studio's side**: the queue's two answers (verify · reject with a note) land through `applyListingAnswer` from Qanvast's webhook (`POST /api/webhooks/qanvast-listing`, 1.0's words `verified` · `rejected` + `note`), the note shown on the card, the dashboard and the bell; **stand-in**: the demo's two plays | `lib/qanvast-listing/queries.ts` `applyListingAnswer`, the route, `lib/services/registry.ts` (`qanvast-listing` · `qanvast-listing-webhook`) |

## Found in 1.0, not on a card
- **`studios.verification_status`** (1.0's column, seeded `verified` for its demo, read only by Platform admin) — **built** as the record's
  read (`readListing`): Not applied · Waiting · Needs changes · Listed. **The demo studio is listed** (R145, below) — as 1.0 seeded it, and as
  2.0's demo already behaves (Qanvast leads, Qanvast Ops, Hangouts).
- **`isQanvastListed: true` for every studio** (1.0's session) — 2.0's rail keeps Qanvast Ops for every studio as before (S16's rail, the
  mock's); Company › Integrations' Qanvast card now says *Connected* only when the studio is listed, *Not listed* (with the door) before.
- **Platform admin › Studios › [id]'s verification badge** and **`api/admin/counts`' pending count** — Platform admin (excluded).
- **For S41b:** 1.0's **platform-curated accreditation badges** — `src/app/admin/accreditations` (the catalogue, Platform) and
  `src/components/settings/accreditations-tab.tsx` (a studio switches each catalogue badge on; the quote canvas's *Accreditation strip* prints
  the enabled set). 2.0 keeps the studio's own badge pictures in the brand kit and its registrations on Profile — S41b should confirm the
  strip is covered by the brand kit's badges (the catalogue itself is Platform admin).

## Decisions (as recommended — his "build all of them" 2026-10-11)
1. **One home: Company › Profile**, a card after Registrations & accreditations — the studio's public standing (who vouches for it). Not a
   page (it is one record), not Settings (a record, not a rule), not Qanvast Ops (that is the leads Qanvast sends).
2. **The demo is Listed** — honest data (REG-343): its Qanvast leads, Qanvast Ops and Hangouts all say so, and 1.0 seeded `verified`. The
   record says *Listed before your studio used OpenMaison* (no words invented), dated by its first Qanvast lead. Not applied is a new studio's
   state (S31's sign-up) — and the probe's.
3. **A listed studio's changes wait while the listing stays** (REG-501's rule): *Changes waiting* / *Changes asked* beside *Listed*.
4. **1.0's "rejected" is "Needs changes"** — its banner asked the studio to fix and resubmit; *Close the application* (or *Keep my listing as it
   is*) lets an ask go, with Undo. No "removed from Qanvast" answer (1.0 had none; the seam can grow one).
5. **Owners and Admins apply** (1.0: the owner alone; 2.0's Profile rule). Designers / Managers read; Accounting's gate is unchanged.
6. **Projects delivered are counted, never typed** (the brief): "n completed with OpenMaison" — the proof lists say "from before OpenMaison
   too" for older work.
7. **Proof kept the moment it is added** (as About photos are), removed softly with Undo; an application keeps the ids it sent.
8. **Doors that fit, built; doors that don't, not**: ⌘K, `/verify`, Integrations' Qanvast card, the Dashboard's Needs you (only while
   Qanvast's ask waits), Maison AI, Who may do what. **No Marketplace door** (its brands sell *to* studios; the studio's listing isn't
   there) and **no Set up your studio step** (every step there is something every studio needs; a listing is a choice, and Qanvast's call).
9. **Qanvast's answer tells Owners and Admins** — the bell (`listing_answered`, In app + Email by default), as 1.0 promised.

## What to check in the browser (production build; View as switches roles; 1440 and 390)
- **Dane (Owner), Company › Profile** — after Registrations: *Listed on Qanvast* · LISTED, "Listed before your studio used OpenMaison — what
  Qanvast shows isn't on record here yet.", the Simulated line, *Update your listing*. Press it → *Update your listing on Qanvast*: From your
  records (Demo Studio Pte Ltd · UEN · website · HDB Directory of Renovation Contractors · CaseTrust · "1 completed with OpenMaison" · three
  photos · Est. 2014 and the awards · Review link "None yet" + *Add your review link*), About your studio started from the About story, What
  makes your studio different, Proof (drop a photo and a PDF; take one off → Undo). Send changes to Qanvast → "Your changes are sent…" ·
  Undo. Send again → *Changes waiting* + Withdraw your changes + the demo's two plays → *Simulate Qanvast asking for changes (demo)* → the
  note quoted, *Fix and send again* · *Keep my listing as it is*; the bell; the Dashboard's Needs you row → Fix. Fix and send again → play
  approving → "Listed since 23 Jul ’26 · last updated … — played in the demo." → *What Qanvast has*.
- **Not applied** (a new studio from Studios · demo only, or the probe): *Apply to be listed* → without a UEN Send says why in the Studio row →
  *Add your UEN* → the UEN field takes the focus → Save changes → Apply again (the words kept) → Send to Qanvast → Waiting for Qanvast;
  Integrations' Qanvast reads *Not listed* with "Apply on Company › Profile."
- `/verify` → the card. ⌘K "qanvast listing". Maison AI: "Are we listed on Qanvast?". Settings › Roles & access: *Apply to be listed on
  Qanvast, or change the listing* — Owner · Admin.
- **Hui Min (Admin)** presses; **Germaine (Designer)** reads (no presses, no plays); **Priya (Accounting)**: Company › Profile stays behind
  her gate (as before); Maison AI answers her with no door.
- **390 / 320** — the card wraps, the dialog rises as a bottom sheet, no sideways scroll.
- Developers: `curl -X POST -H 'Authorization: Bearer $QANVAST_WEBHOOK_SECRET' -d '{"application":"<id>","status":"verified"}' /api/webhooks/qanvast-listing`.

## Probes run
Lane B, port 3170, `next start` on fresh copies of `pbuild/base.db` migrated (0107) + repaired (R145); :3170 stopped after. `npx tsc --noEmit -p .`
clean · `npx eslint app components lib` 0 errors (the 16 older warnings; none in this step's files) · `npm run design:lint` nothing new ·
`npx next build` green · `npm run design:anatomy` (87 pages, 270 table heads, 26 dialogs) **all 1717 measures hold**.

| Probe | Tally | Note |
| --- | --- | --- |
| **`pending-modules/verify-pm2-s37.cjs`** (new; server with `QANVAST_WEBHOOK_SECRET`, probe with `S37_SECRET`) | **89 / 89** | six sections — the home and its doors (the card's place, `/verify`, ⌘K, Who may do what, Integrations, Maison AI), the application from the records (facts read back from the DB) and its proof (a PNG and a PDF kept and served back byte for byte, a text file refused, take off + Undo), Send / Undo / Withdraw / Undo, the plays and the bell, Fix and send again, Keep my listing / Close the application + Undo, What Qanvast has, Not applied with the required UEN (the door focuses the field, the words kept), the webhook (401 · 400 · answered as Qanvast's · already · not found), the Dashboard's row and its door, an Admin presses, a Designer reads (and opens What Qanvast has), Accounting's gate, 1440 · 1024 · 768 touch · 390 · 320, the ghost against the card at 1440 and 390; every table put back, stages and stage logs as found, no page errors. Without the secret it asserts the webhook's 503 instead |
| `pending-modules/verify-pm2-s14` (Profile) · `s17` (the Company ghosts) | 69 / 69 · 130 / 130 | run twice — before and after the card left the page's read-only fieldset |
| `pending-modules/verify-pm2-s24` (Marketplace) · `s08` (Set up your studio) | 132 / 132 · 70 / 70 | no door added to either (Decisions 8) — unchanged |
| `pending-modules/verify-pm2-s34` (services) | 162 / 162 plain · **180 / 180** with `CRON_SECRET` + `WHATSAPP_WEBHOOK_SECRET` (its seams half 108 / 108) | the ops report's slot count 10 → 11 (a deliberate change, commented) |
| `pending-modules/verify-pm2-s10` (Maison AI) · `s18` (notifications) · `s22` (Dashboard) · `s31` (a new studio) · `s05` · `s11` | 107 / 107 · 63 / 63 · 116 / 116 · 104 / 104 · 113 / 113 · 62 / 62 | the new intent, the new event, the Needs you row, a new studio's Not listed |
| `parity-map-build/verify-pm-d` · `projects/verify-pj-gap-d` · `gap-h` · `gap-i` | 33 / 33 · 65 / 65 · 80 / 80 · 81 / 81 | Profile's entities, registrations, About, compliance |
| regression `ghosts-same` · `ghosts-same-390` · `ghosts-strips` · `ghosts-measure` | 66 · 66 · captures (exit 0) · Δ 0 on every row | through `regression/run.cjs` on the same base |
| regression `search` · `st-r1` · `st-r2` · `st-r3` · `overlays` · `sw-r4` · `tpl-parity` · `ux-p1` · `ux-p6` · `dane-p2b` · `dane-p6` · `view-as` | 27 · 57 · 30 · 30 · 67 · 35 · 20 · 81 · 57 · 56 · 41 · 23 (all green) | ⌘K, Who may do what, Integrations, the dialogs, Profile |

A server started with `QANVAST_WEBHOOK_SECRET` logs, as it should, "[services] QANVAST_WEBHOOK_SECRET is set, but the qanvast service is still
the prototype's stand-in — plug its adapter in lib/services/install.ts" (S34's start-up warning; `/api/services` says the same).

## Migration · repair
- **Migration `0107_qanvast_listing_s37`** (generated in the lane, then regenerated once so its timestamp follows main's `0107_site_s35`, which
  base.db already carries — drizzle skips a migration older than the last one applied; **regenerate it at land**, it will be 0108 in main):
  tables `studio_verifications` (1.0's name) and `studio_verification_files`, two indexes each side — additive, schema only. Both join
  `BASELINE_TABLES` (lib/db/baseline.ts) and the snapshot's `TABLES`.
- **Repair R145** (lane B's range; R146 next): the demo's listing record as above, the proof files' and one-waiting housekeeping, four checks
  in the closing list. Idempotent ("already on record"). **The orchestrator's `db:baseline` after the step carries it** — until then a Reset to
  base empties the new tables (the old fixture has no rows for them) and the demo reads Not applied with Qanvast leads (the R145 check names it).

## Shared pieces changed
- `lib/services/slots.ts` (the eleventh slot, `qanvast`), `lib/services/registry.ts` (two entries; `SIMULATED_WORDS.listing`), the developers'
  `services.md` (two seams, the address row, the studio-facing line), `.env.example` (`QANVAST_WEBHOOK_SECRET`).
- `components/company/integrations-view.tsx` (the Qanvast card follows the listing; `Simulated` type leaves `listing` out) +
  `app/company/integrations/page.tsx`; `components/company/company-ghosts.tsx` (Profile's listing card, Integrations' Qanvast chip, the
  Registrations rows' 1px fix at 390); `lib/ghost-shapes.server.ts` (`qanvast.*` keys).
- `lib/notifications/{model,personal}.ts` (`listing_answered`), `lib/settings/permissions.ts` (one row), `lib/global-search/model.ts` (one
  Company row), `lib/maison-ai/{intents,answer}.ts` + `answers/setup.ts` (`qanvast_listing` — **lanes: merge intents by hand**),
  `lib/dashboard/queries.ts` (one Needs you row), `components/company/profile-view.tsx` + `app/company/profile/page.tsx`, `app/verify/page.tsx`.
- No `components/om/*`, shell frame or `app/globals.css` change; `design:lint` holds (no baseline raised).
- Probe changed as a deliberate change: `pending-modules/verify-pm2-s34.cjs` (the ops report answers eleven slots, commented).

## For the next steps
- **S41 / S41b:** the accreditation badges catalogue (above). **S42:** none known from this step.
- **UAT (the orchestrator's):** a step for chapter 1 or 8 — "Company › Profile › Listed on Qanvast → Update your listing: check what Qanvast
  reads from your records, add a photo of a finished home, Send changes; play Qanvast asking for changes (demo), fix and send again, play
  approving (demo)" (Dane).
- **The orchestrator / CLAUDE.md's Map:** *Qanvast listing (pending modules S37)* — `lib/qanvast-listing/{model,service,queries}.ts`,
  `app/company/listing-actions.ts`, `app/company/listing-file/[id]`, `app/api/webhooks/qanvast-listing`, `app/verify`,
  `components/company/qanvast-listing-{card,dialog}.tsx` + `.module.css`, tables `studio_verifications` · `studio_verification_files`, R145.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for any of it; built on Profile's own card, the house card table (with its head),
   Dialog, ConfirmDialog, Dropzone / FileTile (the Move stage window's), MetaChip, the house text link and Integrations' "Simulate … (demo)"
   presses; every invented line is listed in `reg-S37.md` (REG-S37.1…7).
2. **One system, no one-offs** — one record and one read (`readListing`) behind the card, Integrations, the Dashboard, Maison AI and the ghosts;
   one place an answer lands (`applyListingAnswer`, the webhook and the demo alike); the registry's slot pattern; `notify`; ⌘K's companyCard;
   Who may do what's row; the Dashboard's DashRow; the new stylesheet holds only its own layout; `design:lint` holds (no baseline raised).
3. **Plain words for studio people** — "Listed on Qanvast", "Waiting for Qanvast", "Needs changes", "Apply to be listed", "Fix and send again",
   "Keep my listing as it is", "1 completed with OpenMaison", "Listed before your studio used OpenMaison — what Qanvast shows isn't on record
   here yet."
4. **Nothing is lost** — every remove answers with one sentence + Undo (take it back after Send, Withdraw, Close the application / Keep my
   listing as it is, a proof file taken off); files are soft-removed and stay readable from an application that sent them; a withdrawn
   application is kept and its words start the next; Cancel with changes asks first; the record doors keep the words.
5. **Say why** — each refusal names its rule (the UEN Qanvast checks, in its row; one waits already; not a PDF, JPG or PNG; over 8 MB; up to
   ten; Owners and Admins); Qanvast's note is quoted on the card, the dialog, the Dashboard and the bell; the outside listing says why nothing
   of it is on record; the stand-in says it is one.
6. **Back returns where you came from** — Integrations', ⌘K's, the Dashboard's and Maison AI's doors carry `?from=` (the card's own Back);
   the dialog's record doors stay on the page and keep the words; 1.0's `/verify` lands on the card.
7. **Every screen is whole** — no new page; Profile's ghost draws the card in the state it lands in (measured against the card at 1440 and
   390), Integrations' ghost follows the Qanvast chip; the proof files' route is behind sign-in (`signedOutResponse`) and answers 404 for none; the page error log is empty.
   Fixed on the way: Profile's Registrations rows in the ghost were 1px taller each at 390 (older).
8. **Every width is designed** — 1440 · 1024 · 768 touch · 390 · 320 probed: the card wraps, the fact rows stack on a phone, the dialog is a
   bottom sheet ≤767, no sideways scroll against `screen.width`.
9. **Tables follow the leads listing** — not applicable: the two short lists in a card are the house card table (REG-727), head included.
10. **Motion with purpose** — none added (the house Dialog's own; a record door scrolls to its card smoothly unless reduced motion is asked).
11. **Honest data** — the demo's listing is the record its Qanvast leads imply (R145), dated by the first one, no words made up; projects
    delivered are counted; the demo's answers are labelled and recorded as played; nothing pretends Qanvast answered.
12. **Reach for everyone** — the tables are `role=table` with column / row headers; every field labelled; the disclosure has
    `aria-expanded`; each dropzone names its list; each tile's remove names its file; a record door moves the focus to the field it opens;
    the dialog's foot takes ⌘↵ (the house Dialog).
- **How to add a missing thing** — one home (Company › Profile), doors elsewhere; shown only when it applies (the demo's plays only while one
  waits and the stand-in answers; a record door only for a missing fact; the Dashboard's row only while Qanvast's ask waits); one filled
  button per state (Apply · Fix and send again; none while waiting or listed — Update is outlined); defaults need no set-up (the demo is
  listed, a new studio starts Not applied, nothing to configure).
