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
  if (p.startsWith('/dashboard')) return 'Dashboard'   // (pending modules S22) every row and tile on the Dashboard opens its home with the way back
  if (p.startsWith('/qanvast-ops/hangouts')) return 'Hangouts'   // (pending modules S27) a chat's lead, a designer's public card, opened from a Hangout — (S42E, E-20) its section's name, as every crumb, never "Hangout"
  if (p.startsWith('/qanvast-ops/credits')) return 'Lead credits'   // (pending modules S41b-5) a lead opened from its line on the statement
  if (p.startsWith('/qanvast-ops/reviews')) return 'Reviews'   // (pending modules S41b-5) Your public profile, opened from Ranking's tip
  if (p.startsWith('/qanvast-ops')) return 'Qanvast Ops'
  if (p.startsWith('/quotes')) return 'Quotes'
  /* (REG-538) The Company pages honour `from` too, so every origin an editor can send names itself. */
  if (p.startsWith('/contracts')) return 'Contracts'
  if (p.startsWith('/tasks')) return 'Tasks'
  if (p.startsWith('/leads/insights')) return 'Insights'   // (REG-730) a Leads page, not a lead
  if (p.startsWith('/leads/imports')) return 'Import History'
  if (p.startsWith('/projects/')) return 'Project'   // (REG-931) a project's page
  if (p.startsWith('/projects')) return 'Projects'
  if (p.startsWith('/leads/') ) return 'Lead'
  if (p.startsWith('/leads')) return 'Leads'
  if (p.startsWith('/templates/')) return 'Template editor'
  if (p.startsWith('/company/finance')) return 'Finance'   // (REG-1360) a Company section a record is opened from
  if (p.startsWith('/company/reports')) return 'Reports'   // (REG-1361) the one home for reports
  if (/^\/company\/members\/[^/]+\/profile/.test(p)) return 'Public profile'   // (pending modules S27) a member's card, opened from their Public profile
  if (p.startsWith('/company')) return 'Company'
  if (p.startsWith('/settings')) return 'Settings'   // (REG-645) Settings' modules link to the Company pages that hold their records
  if (p.startsWith('/quote-x-ray')) return 'Quote X-Ray'
  if (p.startsWith('/visualizer')) return 'AI Visualizer'   // (REG-673) a render's file or quote goes back to its design
  if (p.startsWith('/planner')) return '3D Space Planner'   // (gaps build J) a layout's Back to the planner's gallery
  if (p.startsWith('/profile')) return 'Your profile'   // (pending modules S01) Your profile's way to the member's row on Members
  if (p.startsWith('/marketplace')) return 'Marketplace'   // (pending modules S24) a brand's page opens Finance › Vendors and the Price book with the way back
  if (p.startsWith('/market-insights')) return 'Market Insights'   // (pending modules S25) an article's link into the Marketplace or the Price book goes back to it
  return undefined
}

/**
 * (S42 audit A-14) The app-wide "page not found" header: the part of OpenMaison the address names (`fromLabel`) only where the address can be
 * that part's — up to two levels under a section's own address (`/company/nope` is in Company, `/company/finance/nope` in Finance, a dead quote's
 * `/quotes/<id>/preview` in Quotes), one level under a record's (`/leads/<id>/<tab>` is a lead's) — and "Page not found" for anything deeper
 * (`/leads/x/y/z` was headed "Lead", as if it were one). A part's own address is the shortest start of the address that names it.
 */
const RECORD_LABELS = new Set(['Lead', 'Project', 'Hangout', 'Public profile', 'Template editor'])
export function notFoundSection(pathname: string): string | undefined {
  const seg = pathname.split('?')[0]!.split('/').filter(Boolean)
  const label = fromLabel(pathname)
  if (!label) return undefined
  let root = seg.length
  for (let i = 1; i <= seg.length; i++) if (fromLabel(`/${seg.slice(0, i).join('/')}`) === label) { root = i; break }
  return seg.length <= root + (RECORD_LABELS.has(label) ? 1 : 2) ? label : undefined
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
  if (/^\/leads\/(?!insights(?:\/|$)|imports(?:\/|$))[^/]+(\/.*)?$/.test(p)) return o.leadName ? `Back to ${o.leadName}` : 'Back to the lead'   // (parity P-16) Insights and Import History are Leads pages, not a lead
  /* (REG-931) a project's own pages */
  if (/^\/projects\/[^/]+\/files\/[^/]+$/.test(p)) return 'Back to the file'
  if (/^\/projects\/[^/]+\/files$/.test(p)) return 'Back to Files'
  if (/^\/projects\/[^/]+(\/.*)?$/.test(p)) return 'Back to the project'
  if (/^\/quotes\/[^/]+/.test(p)) return 'Back to the quote'
  if (/^\/contracts\/[^/]+/.test(p)) return 'Back to the contract'
  if (p.startsWith('/company/materials')) return 'Back to Materials'
  if (p.startsWith('/company/templates')) return 'Back to Templates'
  if (p.startsWith('/company/price-book')) return 'Back to Price book'
  const section = fromLabel(p)
  return section ? `Back to ${section}` : 'Back to where you were'
}

/** (pending modules S07) A money paper's Back (an invoice, a receipt, a credit note, a PO, a selection receipt): "Back to Money" (or `home`)
    when it returns to its own tab, else the place it was opened from — Files, Finance, the file — by `backLabel`'s words. */
export function paperBackLabel(from: string | undefined, home: string): string {
  const p = from?.split('?')[0]?.split('#')[0]
  if (!p || p.endsWith(`/${home.toLowerCase()}`)) return `Back to ${home}`
  return backLabel(from, { fallback: `Back to ${home}` })
}

/** (fix-A, A-08) A redirect keeps the address's own query — `open`, `from`, `folder`, `panel` — so a link that lands on another address lands
    as it was meant to. `searchParams` as a page receives it. */
export function withQuery(href: string, sp: Record<string, string | string[] | undefined>): string {
  const pairs = Object.entries(sp).flatMap(([k, v]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x] as [string, string])))
  if (!pairs.length) return href
  return `${href}${href.includes('?') ? '&' : '?'}${new URLSearchParams(pairs).toString()}`
}

/** (fix-G, G-14) A redirect that keeps the query it was given — `?open=`, `?panel=`, `?from=` — so a moved address still opens the record
    and still returns where it came from. `sp` is a page's `searchParams`; the target's own query wins on a clash. */
export function keepQuery(target: string, sp: Record<string, string | string[] | undefined>): string {
  const [path = '', own = ''] = target.split('?')
  const q = new URLSearchParams(own)
  for (const [k, v] of Object.entries(sp)) {
    if (q.has(k) || v === undefined) continue
    for (const one of Array.isArray(v) ? v : [v]) q.append(k, one)
  }
  const s = q.toString()
  return s ? `${path}?${s}` : path
}
