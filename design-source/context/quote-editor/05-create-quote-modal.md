# Create Quote modal — sources and recommendation

Sources: the 1.0 screenshot (owner, 2026-09-11) and the 2.0 inspiration frame **1209:27023** ("Quote Editor" full page:
"Start a quote for Vicky Lee" · "Template gallery ⇕ · ⋮" · card row Blank(+) · 4-Room BTO · 5-Room BTO · 2-Room BTO (213×192:
thumb 203×140 + name row 42 with kebab) · "Other ways to start" · rows "Upload an existing quote · PDF · XLS · JPG" › and
"Draft with AI · BETA" ˅, 900 wide column).

1.0 layout: title "Start a quote for {name}"; eyebrow "FROM A DESIGN TEMPLATE · 1 SAVED" (primary, with template glyph) +
"View all ›" · "+ New design template" on the right; template card (thumb · "Default Quote PDF" · DEFAULT tag · kebab ·
"Design only · used 2w ago" · Preview · Use This →); eyebrow "START FROM SCRATCH" + row "Blank Quote — Start from an empty table —
add rows, pick a package, or browse items from your price book · Start blank →"; eyebrow "MORE WAYS TO START" + rows
"Upload a quote · PDF · XLS · JPG — Digitize an existing quote — we scan it into editable line items ›" and
"Draft with AI · BETA — Describe the scope — we draft a categorized quote from your 8-item price book ˅".

Owner decisions: l 800; copy verbatim except "Draft with Maison AI" (no BETA); inert paths → coming soon; a price book is seeded.

Recommendation (hybrid, pending the owner's nod): modal header standard "Start a quote for {lead}"; body p24 gap 24:
1. eyebrow row "FROM A DESIGN TEMPLATE · n SAVED" + text buttons "View all" · "New design template";
2. card rail (1209's 213×192 card): **Blank first** (the + tile) then the saved templates (DEFAULT tag on the default one, kebab
   → Preview · Set as default); the whole card is the action (creates the Draft and opens the editor) — the separate
   "START FROM SCRATCH" row is then redundant and the modal fits 1024 tall without scrolling;
3. eyebrow "MORE WAYS TO START" + the two 1.0 rows verbatim (Upload a quote ›, Draft with Maison AI ˅).

## Built (2026-09-11, REG-412 / REG-414) — `components/quotes/create-quote-modal.tsx`
Owner approved the reference's five points (tile = Files tile module · Blank Quote first · kebab Preview / Set as default ·
Tools tile "Quotes" · Quote Digitizer → studio-wide list, phase 7). Shell = attach-files xl (1200, r12, heading 64, body p24,
height to content = 584 at 1440×1024; ≤1024 clamps to 100vw − 48; ≤767 bottom sheet on the 16px gutter). Rail = 276 tiles 16
apart; caption p8 (name subtitle-m · DEFAULT MetaChip · meta body-s secondary "Design only · used 2w ago"); kebab bare 24 at
right 12 / bottom 28. Rows 64 (p12/16 · 36×36 r4 glyph tile · title subheading-m + tag · body-s description · trailing 24).
Data: `quote_templates` (default first, then most recently used; three on the rail); `createQuote(leadId, templateId)` stamps
the template and stores it on the quote. Verify: scratchpad/verify-create-quote.cjs → design-source/verify/quote-editor/create-quote-*.png.
