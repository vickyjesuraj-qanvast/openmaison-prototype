# Design change verification — 2026-08-27 (rev 3)

Method: all 10 sections re-rendered from Figma and pixel-diffed screen-by-screen
against the previous extraction. Layer metadata cannot verify content edits
(instance overrides keep the master's layer names) — rendered pixels are the
source of truth, and this is the standard method for future "check again" runs.

## Result: 3 of 59 screens changed — all kanban, all the bucket fix

| Screen | Node | Diff | Change |
|---|---|---|---|
| 40 | 779:19733 | 3.8% px | 'Followed Up' column deleted; columns shifted (New · Contacted · Met · Quote Sent visible) |
| 44 | 779:19854 | 14.8% px | same fix in the search state |
| Board | 779:24866 | 0.2% px | bucket header row corrected |

The off-clip IMPORTED band (Gmail/Zapier) is also gone from the fresh renders.

## Unchanged (0.0% diff) — audit items still pending in Figma

#3 Status/STAGE naming · #4 'Full name'/'Lead Name' · #10 milestone 0% ·
#12 date formats · #13 'Value' placeholder · #14 asterisk / Germaine dup /
clipped row action. Build applies the rev-2 resolutions until fixed.

Fresh renders live in `sections/` (overwriting the rev-2 set; rev-2 crops remain
in `screens/` via the session archive and git history).

---

# Round 2 — 2026-08-27 (rev 4)

Method upgraded: full-sensitivity diff (>8/255 per channel, >40px changed) after
round 1's 0.15%-of-frame threshold proved too coarse — it hid small text fixes.
Round 1's "only 3 screens changed" was a threshold artifact; corrected here.

## 25 screens changed vs the original extraction. Verified fixes:

| Audit | Fix confirmed in renders |
|---|---|
| #3 | Table header NAME → **LEAD NAME** everywhere; Customise view list now **Lead Name / Stage** (+ Created On → Created) |
| #4 | Merge panel label → **Lead name** |
| #10 | Payment milestones now consistent: **0 % ↔ S$0** per row |
| #13 | Estimated start date placeholder → **31/8/2026** |
| #14a | Lead source asterisk removed (only name + phone required); labels unified to "Lead name" |
| A3 | Red dot removed from the "All Leads" pill **in the mocks themselves** (no longer a build deviation) |
| — | Import step 2 duplicate source column fixed; step 3 gains a LEAD STAGE column; empty-state pill reads "All Leads" (no count) |

## Still pending in Figma (exact locations)

| Audit | Where to fix |
|---|---|
| #12 | Wizard log dates still `12/3/2025, 3:00PM` / `24/8/2025, 7:00PM` (years 2025 vs '26 elsewhere) — frame **"Stage - contacted / Default view" 781:58292**, Log 1 "When" + "Next step" Date & Time fields |
| #14b | Duplicate "Germaine / Designer" row — frame **"Filter - all assignees" 781:54363**, member list |
| #14c | Inline red action clipped at the sheet edge — frame **"Lead deleted folder modal" 779:26316**, ACTIONS column (widen sheet or shorten the label; bulk bar says "Delete Forever") |
| new | Won upload frame **780:91935**: allocation badge reads **100%** while all rows are 0 % — confirm badge semantics |
| new | Import step 3 **779:26133**: value "Referral" appears under the LEAD STAGE column header — check column/value alignment |

---

# Round 3 — 2026-08-27 (rev 4)

7 screens changed. Verified: #12 'When' → 'Date & Time' + year 2026 across 5
wizard frames (780:89011, 781:58292, 780:89798, 780:89545, 780:90106); Won badge
→ 0 % (780:91935); #14b assignees deduped (781:54363) — canonical team: Dane
(Owner), James, Sarah, Michelle, Germaine, Alex.

DESIGNER RULES captured this round:
- Date policy: numeric d/m/yyyy in INPUT fields; "12 Mar '26" style in display views.
- Fixed-column convention: a 2px right border on a table column = pinned column;
  the table scrolls horizontally past it (applies to leads table, Deleted Leads,
  import preview → #14c and the step-3 right-edge clip are BY-DESIGN).

REMAINING (1): 779:26133 Import step 3 — 4th column header 'LEAD STAGE' sits over
Referral/Direct values (sources); should read LEAD SOURCE. Build renders LEAD SOURCE.
