/** (REG-529 · pending modules S19 — REG-708) Quote X-Ray's intro card words, once: the setup draws them and its ghost sets them as bars, so the
    ghost's intro wraps where the page's does. */
export const XRAY_INTRO = {
  title: 'Client comparing your quote with another studio’s? Upload theirs — we check it against yours, item by item.',
  points: [
    ['The real price difference', ' — after counting the work each quote includes or leaves out.'],
    ['Up to three points to tell your client', ' — missing items, prices worth a question, materials and brands.'],
    ['A WhatsApp message ready to send', ' — edit it in your own words and go.'],
  ] as const,
  note: 'Takes a moment. Always check the numbers before you send anything to a client.',
}
/** (pending modules S21 — REG-708) the setup's own words its ghost sets as bars, so the ghost's boxes wrap where the page's do */
export const DROP_HELP = 'Drop a file or browse · PDF, PNG, JPG, WebP, CSV or XLSX'
export const SETUP_WORDS = { lead: 'Lead', other: 'The other studio’s quote', question: 'Which quote is the client comparing against?' }
