# M4 design-context distillation (extracted 2026-08-27, quota-aware)

Frames: 779:24634 (Create default, modal 600×532 centred), 780:82282 (Create
expanded, modal 600×1032 at top:48 — taller than viewport), 781:53641 (Edit —
identical layout, title 'Edit Lead', primary 'Save'), 780:82576 (Toast —
'Successfully Updated' bottom-left; created lead top-of-table + highlight bar).

Modal: w600, radius-3 (12), overlay rgba(0,0,0,.6). Heading px24 py20 border-b
#E5E5E5: title Inter Bold 20/24; close = Material Symbols OUTLINED 24 #666.
Sections p24 gap24. Fields = FloatingField anatomy (h48, border #ccc r4,
label 12/16 #666 on-border at left 11 px4). Rows of two fields gap24.
Phone: '+65' #666 · 1px #E5E5E5 divider · digits. Area: digits · divider ·
'sq ft' + expand_more 16. Date trailing icon calendar_month 16. Selects
trailing expand_more 16. Additional info toggle: SemiBold 14 + expand_more 20
(collapsed) / keyboard_arrow_up 20 (expanded). Notes: textarea h96 r4 border
#ccc, pt12 px16 pb8, placeholder 'Notes', native resize glyph; helper 12/16
#666 'You can view these notes under the Notes page in Leads Detail.'
Property address helper: 'Client project address.' Footer px24 py16 gap12
border-t; Cancel outlined #ccc/#666; primary h36 #5500FF. Expanded footer
carries a drop shadow (content scrolls beneath) — built as internal body
scroll + pinned footer (REG-38).

Row actions (from tasks-section frame 779:24696): hover reveals Edit
(outlined h36) + kebab (36 outlined) pinned at the visible right edge of the
row; name cell gains a copy glyph after the phone; kebab menu = Delete +
Return Lead (mock draws Return Lead as a detached box — composite artifact,
built as one menu per approved second-pass action).
