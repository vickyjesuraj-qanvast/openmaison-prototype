/**
 * Where a page came from (REG-465, owner 2026-09-16: "closed the quote editor and it is not going back to All Quotes").
 * A link that leaves a list for a record carries `?from=<the list's own path>`; the record's Back / close returns exactly
 * there — the Quotes tab, Tools › Quotes, Qanvast Ops › Leads, a folder in Files — and the lead's L2 crumb names that
 * section ("Qanvast Ops / Leads", 931:49680; "Quotes / Leads" by the same rule). Only in-app paths are honoured.
 */
export function readFrom(raw: string | string[] | null | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v) return undefined
  if (v === 'qanvast') return '/qanvast-ops'   // the token REG-193 introduced
  return v.startsWith('/') && !v.startsWith('//') ? v : undefined
}

/** `href` with `from` riding along (nothing when there is no origin to keep). */
export function withFrom(href: string, from: string | undefined): string {
  if (!from) return href
  return `${href}${href.includes('?') ? '&' : '?'}from=${encodeURIComponent(from)}`
}

/** (REG-579) `href` with `apply=<templateId>` riding along: the quote editor asks "Apply defaults · Keep mine" on arrival. */
export function withApply(href: string, templateId: string): string {
  return `${href}${href.includes('?') ? '&' : '?'}apply=${encodeURIComponent(templateId)}`
}

/** The section a `from` path belongs to — what the L2 crumb reads before " / Leads". */
export function fromLabel(from: string | undefined): string | undefined {
  const p = from?.split('?')[0]
  if (!p) return undefined
  if (p.startsWith('/qanvast-ops')) return 'Qanvast Ops'
  if (p.startsWith('/quotes')) return 'Quotes'
  /* (REG-538) The Company pages honour `from` too, so every origin an editor can send names itself. */
  if (p.startsWith('/contracts')) return 'Contracts'
  if (p.startsWith('/tasks')) return 'Tasks'
  if (p.startsWith('/leads/') ) return 'Lead'
  if (p.startsWith('/leads')) return 'Leads'
  if (p.startsWith('/templates/')) return 'Template editor'
  if (p.startsWith('/company')) return 'Company'
  if (p.startsWith('/settings')) return 'Settings'   // (REG-645) Settings' modules link to the Company pages that hold their records
  if (p.startsWith('/quote-x-ray')) return 'Quote X-Ray'
  if (p.startsWith('/visualizer')) return 'AI Visualizer'   // (REG-673) a render's file or quote goes back to its design
  return undefined
}

/**
 * (audit 2026-09-26, F159 · critic 16) What a record's Back says for the `from` it carries — the place itself, not only its section:
 * a lead's photo is "the file", its Files tab "Files", its other pages the lead's name; a quote or a contract "the quote" / "the
 * contract"; Company › Materials "Materials"; a list its section. `fallback` is the label with no `from` (the tool's own home).
 */
export function backLabel(from: string | undefined, o: { leadName?: string | null; fallback: string }): string {
  const p = from?.split('?')[0]
  if (!p) return o.fallback
  if (/^\/leads\/[^/]+\/files\/[^/]+$/.test(p)) return 'Back to the file'
  if (/^\/leads\/[^/]+\/files$/.test(p)) return 'Back to Files'
  if (/^\/leads\/[^/]+(\/.*)?$/.test(p)) return o.leadName ? `Back to ${o.leadName}` : 'Back to the lead'
  if (/^\/quotes\/[^/]+/.test(p)) return 'Back to the quote'
  if (/^\/contracts\/[^/]+/.test(p)) return 'Back to the contract'
  if (p.startsWith('/company/materials')) return 'Back to Materials'
  if (p.startsWith('/company/templates')) return 'Back to Templates'
  if (p.startsWith('/company/price-book')) return 'Back to Price book'
  const section = fromLabel(p)
  return section ? `Back to ${section}` : 'Back to where you were'
}
