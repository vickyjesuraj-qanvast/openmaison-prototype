/*
 * (pending modules S34 — card api:message-delivery-providers, "Branded HTML emails (the studio's logo and colours) in place of plain text";
 * 1.0's src/lib/notifications/templates/render.ts `buildBaseEmailWrapper`) The HTML part of every email, in the STUDIO's colours — pure, so
 * the delivery layer, the developers' preview and a test all draw the same page.
 *
 * The record stays the plain text (the outbox's `body`, what Sent messages shows and what the email's text part carries); this is its
 * dressed copy, built only when a real email provider asks for it (`html()` on the message the adapter is handed). It is the studio's page,
 * never OpenMaison's (1.0 put its own wordmark beside the studio's; 2.0's client links say the studio's name only, S02): the studio's logo
 * — or its name, set in its ink — the words as written, a link line in its accent, and its contact lines at the foot. A member's email also
 * says where its notices are chosen (Your profile › Your notifications). Every value is escaped; URLs in the words become links.
 * FOR VICKY: the look is a first cut on the brand kit — 1.0's had a designed page per event family; yours to design (the card's question).
 */

export type EmailBrand = {
  studio: string
  /** An absolute address of the studio's logo — none when it has only a data URL (an email can't carry one; object storage gives it an address).
      (S44O — rows 314 · 337) the brand kit's hosted PNG copy for email (lib/notifications/email-logo.ts). */
  logoUrl: string | null
  /** (S44O — rows 314 · 337, M15) the size to draw it at — its own ratio inside 160 × 48 (`fitLogo`); Outlook keeps only these attributes */
  logoSize?: { width: number; height: number } | null
  ink: string
  grey: string
  accent: string
  /** The foot's lines — the studio's address, phone, email, website (the ones it filled in). */
  contact: string[]
}
export type EmailPage = {
  subject: string
  /** The plain text as written — paragraphs split on blank lines. */
  body: string
  /** The record's own address, absolute — the link line's target (the words' own links stay where they are). */
  link: string | null
  /** A member's email gets the line to their notice settings; a client's none. */
  settingsLink: string | null
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
/** A colour the kit holds, or the fallback — never anything that could break out of a style attribute. */
const hex = (c: string | null | undefined, fallback: string) => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.trim()) ? c.trim() : fallback)
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/g

/** One paragraph's words, escaped, its URLs as links in the accent. */
function words(text: string, accent: string): string {
  let out = ''
  let at = 0
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[).,;:!?]+$/, '')
    const i = m.index ?? 0
    out += esc(text.slice(at, i)) + `<a href="${esc(url)}" style="color:${accent};text-decoration:underline">${esc(url)}</a>`
    at = i + url.length
  }
  return (out + esc(text.slice(at))).replace(/\n/g, '<br>')
}

/** The email's HTML: a single column, 600 wide, tables for every mail app, inline styles only. */
export function emailHtml(page: EmailPage, brand: EmailBrand): string {
  const ink = hex(brand.ink, '#1A1A1A'), grey = hex(brand.grey, '#666666'), accent = hex(brand.accent, '#5500FF')
  const font = `-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`
  /* (S44O — rows 314 · 337) width AND height as attributes, from the logo's own ratio inside 160 × 48 — Outlook ignores the CSS and drew the
     picture at its natural size, stretched where only one side was given */
  const size = brand.logoSize && brand.logoSize.width > 0 && brand.logoSize.height > 0 ? { width: Math.round(Math.min(160, brand.logoSize.width)), height: Math.round(Math.min(48, brand.logoSize.height)) } : null
  const head = brand.logoUrl && size
    ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.studio)}" width="${size.width}" height="${size.height}" style="display:block;width:${size.width}px;height:${size.height}px;max-width:${size.width}px;border:0;outline:none;text-decoration:none">`
    : `<span style="font:600 16px/1.3 ${font};color:${ink}">${esc(brand.studio)}</span>`
  const paras = page.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font:400 15px/1.6 ${font};color:${ink}">${words(p, accent)}</p>`).join('')
  /* the link line — only when the words don't already carry the record's own address */
  const cta = page.link && !page.body.includes(page.link)
    ? `<p style="margin:8px 0 0;font:600 15px/1.6 ${font}"><a href="${esc(page.link)}" style="color:${accent};text-decoration:none">Open it &rarr;</a></p>`
    : ''
  const foot = [esc(brand.studio), ...brand.contact.filter(Boolean).map(esc)].join(' &middot; ')
  const settings = page.settingsLink ? `<p style="margin:8px 0 0;font:400 12px/1.6 ${font};color:${grey}"><a href="${esc(page.settingsLink)}" style="color:${grey};text-decoration:underline">Choose which notices reach you</a></p>` : ''
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(page.subject)}</title></head>
<body style="margin:0;padding:0;background:#F5F5F5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:8px">
<tr><td style="padding:24px 32px;border-bottom:1px solid #E5E5E5">${head}</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 20px;font:600 20px/1.3 ${font};color:${ink}">${esc(page.subject)}</h1>
${paras}${cta}
</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #E5E5E5"><p style="margin:0;font:400 12px/1.6 ${font};color:${grey}">${foot}</p>${settings}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
