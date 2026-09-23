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
  return undefined
}
