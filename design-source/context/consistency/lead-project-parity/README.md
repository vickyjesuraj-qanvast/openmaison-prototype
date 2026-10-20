# Lead ↔ Project parity — the audit (2026-10-08)

The owner: "I found a lot of inconsistency from our core design principles between leads overview and projects overview like the way we
show client overview details on the side in the overview tab, lead insights vs project insights, a lot more of similar issues".

Four read-only audits on a production build (1440 · 768 · 390), the lead's mocked pattern as the standard unless the register shows he
chose otherwise: `A-overview.md` (19) · `B-listings.md` (18) · `C-insights.md` (18) · `D-tabs-flows.md` (18) = 73 findings, merged into
**38 fixes (P-01…P-38) and 25 questions (Q-01…Q-25)** on the review page https://claude.ai/artifact/KhVGBxmqWAtdxkrsF7Efgj — each with its
lead / project screenshots and his pick (Build · Discuss · Skip, a note; questions: an option). His picks live in that page's db
(collection `picks`, one document per P-/Q- id) — read them before building. Screenshots (all of them): the session scratchpad
`lpaudit/shots/{A,B,C,D}/`; the page carries the 89 used.

Root cause: REG-931 built the project page on the lead page's frame but deferred the left info column, the Create strip and the AI brief to
"round 1", never revisited — P-01…P-03 follow from it. In three places the project side is the better pattern (Back keeps the listing's view,
the phone's listing search, Maison AI that acts) and the lead takes it (P-16, P-18, P-19, P-33).

## Built (2026-10-08)
His picks: **Build on all 38**, the recommended answer on all 25. Built by seven packages in the main tree (K-A1 project Overview body ·
K-A2 project header, tabs, flows · K-B1 lead page · K-C reports and numbers · K-D1 Leads listing · K-D2 Projects listing, export, /tasks ·
K-E Activity, words, settings, Deleted sheets), merged once: REG-1381…1443 + the merge's own REG-1444; migration 0082; repair R92. Each
package's outcome (files, what to check, probes changed, calls for him) is `build/outcome-K*.md`.
