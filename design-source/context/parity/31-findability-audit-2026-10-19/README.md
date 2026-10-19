# Findability audit: what a 1.0 user can't find in 2.0 (2026-10-19)

**Why:** Vicky noticed 1.0's sidebar had *Escalations* and 2.0's rail doesn't. It became Projects › Tickets (gaps build H-Q2, my call
under her "build everything as recommended"), but its only door is a row in the Projects listing's ⋮ menu. ⌘K doesn't find it, and
nothing on the rail points there. Her ask: "audit and check if there are any missing items like this".

**How:** four read-only audits, one per area. Each listed every place a 1.0 user can go or press, read through git on
`deployment/qanvast`, `deployment/plg` and `urbanhomedemo` (as last fetched; the fetch on 2026-10-19 failed for lack of
credentials). For each place, the audit checked in 2.0's code:
1. where it lives now;
2. whether a 1.0 user would find it there (a door where they'd look, ⌘K by the 1.0 word, the old address);
3. whether anything gone has a recorded decision.

⌘K was tested by running 2.0's own `pageHits` offline on about 200 of 1.0's words. In all, about 270 places were checked. The raw
reports with their full inventories are in `raw/1…4-*.md`.

**Answer in one line:** nothing else was dropped without a record. Escalations isn't alone, though. 18 findings share its pattern:
- 4 dead ends;
- 1 data risk;
- 9 things moved where a 1.0 user won't look;
- search that doesn't know 1.0's names;
- 4 small lost habits.

Every finding touches what users see or where a flow goes, so each is Vicky's call. Most are size S.

## The findings, worst first

### Dead ends: a 1.0 user or client reaches nothing
| # | Finding | Raw | Recommendation | Size |
| --- | --- | --- | --- | --- |
| D1 | **Old plg and UHD addresses land on "page not found"**: `/settings/usage` (in every credit-alert email and bell row plg already sent, and in Dodo's return URL), `/tools/quotes`, `/company/settings` (+`/quotes`), `/leads/settings`, `/company/profile/brand-kit`, `/company/templates/tasks/<id>`, `/visualizer/materials`, `/billing/return`, UHD's `/contractors`. plg's personal `/settings?section=email` and siblings land on Roles & access; `/accounts?tab=cost-visibility` lands on the module, not its card. The old-address list was built from the Qanvast line only. | N-2 · L-3 · P-4 · T-5 | Add the redirect rows (the landings are in the raw reports) | S |
| D2 | **1.0's file-signing links (`/sign/document/<token>`, Qanvast line) land on "page not found"**, and *Request signature* on a lead's file has no 2.0 door (it became Contracts › Import a PDF). Already open as FROM-1.0-TO-2.0.md §9 #3. | P-1 · L-4 | Land old links on the signing page's notice; add *Send for signature* to a PDF's ⋮ in Files, which opens Import a PDF already filled in | S · M |
| D3 | **plg's open tool addresses now meet a sign-in wall.** `/tools/ai-visualizer` (the paid-campaign landing), `/tools/quote-xray` and `/tools/quote-digitizer` were open to visitors with no account. 2.0 redirects them to studio pages, which ask a stranger to sign in. | T-3 | For a signed-out visitor only, land them on `/site/try`, `/site/try/quote-x-ray` and `/site/try/upload-a-quote` | S |
| D4 | **plg's public Pricing page has no 2.0 home.** It has been live since 22 Sep, with "Pricing", "Try Now" and "See pricing" across the site. 2.0 sends `/pricing` to the site's home, and `/upgrade?plan=` drops the plan. The "kept hidden" record (S35) was read from the Qanvast line. | T-2 | Vicky decides whether the 2.0 site shows pricing | M |

### Data risk
| # | Finding | Raw | Recommendation | Size |
| --- | --- | --- | --- | --- |
| R1 | **Archived leads would arrive as trash that "deletes in 30 days".** 1.0 keeps archived leads "until you revive them", and removed its own 30-day promise because no purge ran. The port maps `archived_at` → `deleted_at`. 2.0's Deleted Leads says "permanently removed after 30 days", and no job does that either. | L-1 | Land 1.0's archived leads somewhere honest (for example Lost, with the reason "Archived in 1.0"), and make the trash's sentence true or remove it | S |

### Moved where a 1.0 user won't look
| # | Finding | Raw | Recommendation | Size |
| --- | --- | --- | --- | --- |
| M1 | **Escalations → Tickets.** The only door is Projects › ⋮ › Tickets. There's no count anywhere (1.0 showed "Escalations (3)" on the rail), no New ticket on the studio list, and no ⌘K page. REG-1315 and REG-1830 still say "a Tickets button", but REG-1425 moved it into ⋮. | N-1 | A ⌘K page *Tickets* (with escalations · issues · defects), plus a door you can see with its open count: a Tickets button on Projects again, or a Dashboard tile. Decide whether New ticket belongs on the studio list | S · M |
| M2 | **"Settings" changed meaning.** 1.0's avatar › Settings was your own settings (profile, signature, notifications, lead preferences). 2.0's rail Settings is the studio's rules, read-only for a Designer. Your profile sits behind the studio block, and nothing in Settings points to it. | N-3 · L-6 | A "Your own settings → Your profile" line at the head of Settings; ⌘K words "my settings" on Your profile | S |
| M3 | **Approvals left Tasks with no pointer.** 1.0 Owners approved from Tasks › Approvals (chip, count, inline Approve / Reject, bulk approve). 2.0 gathers approvals on Dashboard › Needs you; Tasks never mentions them. | L-2 | On Tasks, a line "3 approvals wait for you → Dashboard"; ⌘K words "approve · approvals" on the Dashboard | S |
| M4 | **Quote Digitizer.** The Tools tile says "Quotes", and Upload a quote is three presses in (Create Quote › More ways to start). | T-1 | ⌘K words + a ⌘K Create row "Upload a quote"; name Upload on the empty Quotes list | S |
| M5 | **Meeting Copilot's insights** (Analytics, Objections) moved to Company › Reports › Meetings with no door from the tool, unlike the Leads and Projects listings. There's no ⌘K Create "Start a meeting". | T-4 | An Insights door on Tools › Meeting Copilot, as the listings have; ⌘K words and a Create row | S |
| M6 | **Close project** was in the project's ⋯ beside Delete. 2.0's ⋮ ends only in Delete; closing is Stage ▾ › Completed, and the header button shows only near handover. | P-5 | A *Complete handover* row in ⋮, or a help line under Delete. This partly reverses her P-08 pick | S |
| M7 | **Preview as Homeowner** is now *See it as {client}* inside ⋮ › Invite to Portal. | P-6 | Name it in that row's help line or give it its own row; ⌘K words | S |
| M8 | **AI Visualizer: no "From a project"** start and no Projects kind (1.0 had both). Audit 16 deferred this before Projects existed, and it was never closed. | T-6 | "For a project…" in New ▾ and a Projects kind, as the 3D Space Planner has | S |
| M9 | **Homeowner Portal** left Tools for Company › Client portal, with no signpost in Tools. Low risk: ⌘K and the old address work. | T-8 | ⌘K word "homeowner portal" on the Company section row, or a Tools signpost | S |

### Search doesn't know 1.0's names (one fix, many words)
| # | Finding | Raw | Recommendation | Size |
| --- | --- | --- | --- | --- |
| S1 | **About 50 of 1.0's own labels find nothing or the wrong page in ⌘K**: Escalations, Accounts Setup, Quote Digitizer, Operations, Legal Entities, Packages, Document Templates, Signing Documents, Timeline Templates, Escalation Categories, Lead Preferences, Usage & credits, Reviews & Rankings, Close project, Record payment, Preview as homeowner, Selections, Archived, Meeting insights, "3-D", "visualiser", "xray"… Three more details: "invoices" never shows Money in to an Owner (four page slots, and Money in loses the tie); "upload a quote" finds *Your signature* because "a" counts as a search word; eight Settings cards can't be found by their own titles (REG-812's rule). | N-4 · L-5 · P-2 · P-3 · T-1 · T-7 | Add 1.0's words to each page's `words`, give the missing cards their rows, rank Company › Finance above Plan on a tie, and drop one-letter search terms | S |

### Small habits lost
| # | Finding | Raw | Recommendation | Size |
| --- | --- | --- | --- | --- |
| H1 | G then I (Inbox) and G then E (Escalations) do nothing. REG-1830 records the choice. | N-5 | Accept them as quiet aliases (I → Messages, E → Tickets) | S |
| H2 | The Leads rail item lost its count of new leads. No record of that decision. | N-6 | Decide whether Leads counts the viewer's unseen new leads | S |
| H3 | No way to call the client from a conversation (1.0's chat header had the phone). | P-7 | The client's phone in *People and files*, or record the move | S |
| H4 | On the lead: District isn't searchable, the email isn't a mail link, the phone calls only on touch, and Tasks has no *Upcoming* filter. | L-7 | Decide each | S |

## Also found: records to correct
- `FROM-1.0-TO-2.0.md` §3 says every old 1.0 address lands; D1 shows that's true for the Qanvast line only. Its §8 lists Proactive Alerts as
  left out, but REG-1222 built the alerts lead time and the old tab redirects there. §9 #3 is D2.
- REG-1315, REG-1830 and the comment at `components/projects/tickets/studio-tickets.tsx:30` say "Projects' Tickets button". REG-1425
  moved it into ⋮.
- plg's every-page trial banner (raw 1, row 38) was left unsure; it needs the credits area's eye.

## Not raised as findings (her recorded calls)
Finance, Reports, Contractors and the Client portal each have one home (REG-1360 · 1361 · 2467 · 967) and keep a door. Also: Pipeline's
collection stages (REG-1362), Archive (Q-25), pay by card (F-15), portal to-dos (M-03), Journey (DEF-04), temperature (DEF-09), Platform
admin, languages, countries beyond Singapore.

## Status — all 18 built (S46, 2026-10-19; her "fix everything")
Built by four packages, landed in main, each with its probe green on the main build (outcomes in
`30-pending-modules-build-2026-10-11/steps/outcome-S46{A,B,C,D}.md`, plan + log in `30-…/s46/plan-2026-10-19.md`):
**S46A** REG-2478…2489 (S1 · D1 · D3 · H1 · M4 · M9, ⌘K for every other door) · **S46B** REG-2513…2521 (M1 · M5 · M6 · M7 · M8 · H3) ·
**S46C** REG-2503…2512 (M2 · M3 · H2 · H4 · R1, repair R176) · **S46D** REG-2490…2502 (D2 · D4).

Where a fix differs from the table above, and why:
- **M1** — built first around the Projects ⋮ (her REG-1425): the Dashboard's Tickets tile, ⌘K, G then E, New ticket. Then her call the same
  day: **Tickets is a rail place after Tasks, as 1.0's Escalations was** (REG-2524, `/tickets`, with its count; the ⋮ row is gone).
- **M6** — *Complete handover* in ⋮ is the Stage menu's own Completed row: the Stage menu doesn't refuse a project on hold (finishing ends the
  hold), so the row doesn't either. One rule in `stageRow` if she wants that refusal.
- **D2** — pictures can't be signed (no PDF writer in the dependencies): the row says "Save it as a PDF first".
- **D4** — the shared plan comparison (site and in-app Plans) no longer claims limits 2.0 doesn't enforce; "Meeting Co-Pilot" → "Meeting Copilot".
- **H4** — the phone keeps REG-746 (dials on touch, copies at a desk); *Upcoming* on My Tasks and Unassigned (four chips don't fit All Tasks at 1440).
- **R1** — the trash's 30 days are true (`purgeExpiredLeads`, sweep `deleted-leads`); R176 brought the demo's deleted leads inside them (run on
  her local.db before the code landed).
The records named above are corrected: FROM-1.0-TO-2.0.md (§3, §5, §6, §7, §8, §9 #3, 15 cards), REGISTER rows for REG-1315 / REG-1830.
