# Interaction states — extracted from prototype wiring (verbatim)

Source: 2,394 reactions on page 513:28349, read via Plugin API on 2026-08-26.

## Definitive finding: no screen-to-screen navigation exists
All 158 non-hover reactions are component-state CHANGE_TO (search focus, radio,
switch, filter-row icons). Screen sequence is carried by the screen NUMBERING
inside the labelled flow bands, not by prototype links.

## Hover / active states (from the actual variant components)

| Element | Rest | Hover / Active |
|---|---|---|
| Side-nav item 36px | transparent, radius 8 | bg rgba(0,0,0,.04) |
| Button outlined h36 | border #ccc, radius 4 | + bg rgba(0,0,0,.04); label/icon #1a1a1a |
| Icon button 36 outlined | border #ccc | + bg rgba(0,0,0,.04) |
| Icon button 24 primary | border #5500ff, icon #5500ff | bg rgba(0,0,0,.04), border+icon #4400cc |
| Segmented seg (unselected) | border #ccc | bg rgba(0,0,0,.04) |
| Segmented seg (selected) | bg #eee5ff, icon #4400cc | unchanged on hover |
| Link text | #5500ff, no underline | #4400cc, no underline |
| Link icon 20px | plain | bg rgba(0,0,0,.08), radius 4 |
| Search bar (rest/filled) | border 1px #ccc, radius 4 | — |
| Search bar (focused) | — | border 2px #5500ff |
| Switch on / off | #5500ff / #999999, radius full | sizes 48×24 (Yes/No) and 40×20 |

Micro-interaction destinations (component variants, for reference):
search 70:1979 empty / 70:1981 filled / 70:1982 active · radio 513:44618/44621 ·
switch 513:44552/44554/44556/44558 · filter row icons 513:44593/44598.
