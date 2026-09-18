# Quote X-Ray — build notes (REG-529, 2026-09-18)

Reference: the nine 1.0 screenshots the owner shared (setup For a lead / Upload 2 quotes, uploaded state, progress, the record with Say this · Key points · the full item-by-item list, and the Send to client dialog). No 2.0 Figma — the owner: "design and build by yourself in 2.0 without losing any design consistency, ux, ui, and ds components".

## Answers that shaped it (owner, 2026-09-18)
Curated engine, not a model · an unknown file says "We couldn't read this one — try a PDF from the client." · Upload two quotes = two files (your side is a file too) · Send to client = the 1.0 dialog on our Dialog · Recent comparisons are hard-deleted after an alert · a comparison is named "{Lead} · vs {Studio} · {date}" · progress kept minimal (~3 s).

## Where things live
- `app/quote-x-ray/` page (+ `[id]`), layout in the shell, ghosts (`LeadsSkeleton`, `DetailSkeleton`); `actions.ts` (`runComparison`, `deleteComparison`).
- `components/xray/`: `xray-workspace.tsx` (setup · progress · recents), `xray-result.tsx` (record), `xray-table.tsx` (the listing model, `xray-items` column prefs), `send-dialog.tsx`.
- `lib/xray/`: `reference.ts` (Dyel · Flo · Cove as lines; `readOtherQuote(fileName)`), `brands.ts` (curated notes), `compare.ts` (pure engine: match by tokens, totals, like-for-like, points, brands, rows, the WhatsApp draft), `queries.ts` (server-only).
- Data: `quote_comparisons` (0025), `BASELINE_TABLES`, Activity branch (`lib/leads/activity.ts`), repair R33 (OM-10008 vs Flo Design · OM-10001 vs Cove Interior) + the check "quote comparison whose quote is gone".
- Entry points: `tools-popover.tsx` tile, `overview.tsx` quick link (`onOther('Quote X-Ray')`), `editor-header.tsx` kebab `xray` → `/quote-x-ray?lead=&quote=&from=`.

## Verification
`verify-xray.cjs` (Tools tile, intro, recents, lead → quotes → file, unreadable file, progress, record header / summary / points / brands / table, Send dialog, Column settings, Back, delete, the two entry points, Activity, phone).
