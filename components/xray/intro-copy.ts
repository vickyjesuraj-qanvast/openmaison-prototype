/** (REG-529 · pending modules S19 — REG-708) Quote X-Ray's intro words, once: the setup draws them and its ghost sets them as bars, so the
    ghost's intro wraps where the page's does.
    (the calm UI build 2026-10-27, 6-10 · W-139) The page says what it is in one line (`lede`) with "How it works" beside it — the three points
    open in a drawer; the box (`title` + `points`) shows only on a studio's first run (no comparison yet), until it is closed. The note's
    "Always check the numbers" sits beside Compare, where it matters (`check`). */
export const XRAY_INTRO = {
  lede: 'Compare a quote with another studio’s, item by item.',
  how: 'How it works',
  title: 'Compare a quote with another studio’s, item by item.',
  points: [
    ['The real price difference', ' — after counting the work each quote includes or leaves out.'],
    ['Up to three points to tell your client', ' — missing items, prices worth a question, materials and brands.'],
    ['A WhatsApp message ready to send', ' — edit it in your own words and go.'],
  ] as const,
  check: 'Always check the numbers before you send anything to a client.',
}
/** (pending modules S21 — REG-708) the setup's own words its ghost sets as bars, so the ghost's boxes wrap where the page's do */
export const DROP_HELP = 'Drop a file or browse · PDF, PNG, JPG, WebP, CSV or XLSX'
/** (the calm UI build 2026-10-27, 6-14 · W-061 · W-229) the captions over the fields went — the field's label and the box's title carry it; the
    other studio's box reads "Their quote" */
export const SETUP_WORDS = { lead: 'Lead', other: 'Their quote', yours: 'Your quote', question: 'Which quote is the client comparing against?' }
/** (the calm UI build 2026-10-27) Recent comparisons' card head, sentence case (T-06) — the page and its ghost */
export const RECENTS_HEAD = 'Recent comparisons'
/** (the calm UI build 2026-10-27, 6-10) How many comparisons this browser last saw — the setup ghost draws the first-run box only where the
    page will (REG-708); a browser that never saw the page is taken to know some, so the ghost of a studio already using X-Ray draws no box. */
export const XRAY_COUNT_KEY = 'om.xray.compared'
