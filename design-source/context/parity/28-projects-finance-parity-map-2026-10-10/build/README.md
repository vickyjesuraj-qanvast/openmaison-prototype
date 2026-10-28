# The parity-map build (2026-10-10)

Her words, on the map (https://claude.ai/artifact/J1zvjyePHCQsg5xuNYvfLr): "let's build everything that's in 1.0 to 2.0 without losing anything.
Make sure you think better when adding the missing items in 2.0 keeping the best user experience, cognitive load, and intuitiveness."

**Built** (REG-1560…1671):
- All 33 unique gaps, and the partial rows completed: 84 of the 86 gap rows carry their REG on the map. The two left wait on her "Singapore
  only" call (DEF-30): SC-010, other countries' timelines, and UC-119, the FX job for multi-currency.
- Rows she had dropped where 2.0 lost the job: the GST report (REG-1307 reversed) and revenue year-on-year.
- Rows held by build-package calls: the planner extras, search in a conversation, suggested tasks (rule-based), a PO line's milestone, and the
  Accounting role (REG-1310 reversed).
- Her own holds stay held: the Dashboard, Meetings (REG-552), the roles editor (Leads Q-40), the daily digest (Q-42), who hears each notice
  (Q-43), and regions (DEF-30).

**How it ran:**
- Contract first, written by the orchestrator: migration 0085, 8 bell events, 4 client messages, and regions in the shared files (`brief.md`).
- Nine packages in parallel, P-A…P-H and P-J, then P-I (the Accounting role, `brief-P-I.md`) alone.
- Outcomes and staged rows: `outcome-P-*.md` · `reg-P-*.md` (with their REG numbers). The merge's own wirings are REG-1561.
- Demo data: repairs R97…R102. The baseline was re-taken (demoDay 2026-10-10; +Priya Tan · Accounting, two layout versions, a studio template,
  a two-storey layout, Serena's conversation, Benjamin's team chat, VO days, Ryan's restart day, commission lines). `local.db` received the
  same records through `db:repair`; leads' stages and stage logs are unchanged.

**Verified** (production build; every probe on copies of the re-taken base):
- The 10 package probes `design-source/verify/parity-map-build/verify-pm-{a…j}.cjs`: 47 · 47 · 36 · 33 · 58 · 60 · 59 · 50 · 54 · 53, all green.
- The simplification probes: r3 13 · ks 29 · r2e 25.
- All 26 Projects probes.
- The cross-module regression: 72 of 73. cr-r4 fails on the calendar, not the build — see below.
- At 390: 29 studio screens and 10 portal pages fit, measured against `screen.width`.

**Found, left for her:**
- **The demo's AI-credits month ended 2026-10-10 09:50 UTC.** The restore shifts only open tasks' due dates, so from today every restore rolls
  the credits month on the first page view. That writes two "credits renewed" bell rows, leaves "this month" empty, and fails cr-r4's
  this-month checks. Options:
  - shift the credits period and ledger with the demo day on restore, as task due dates are; or
  - accept the roll.
- Accounting, as she said "go ahead" to: approvals stay with Owners and Admins (1.0's Accounting approved), and no AI seat.
