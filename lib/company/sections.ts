/**
 * Company (REG-484): no Company page — the rail's item opens a panel of sections beside the rail, and each section is a
 * page with its peers as a tab strip (REG-498). Templates' tabs are the kinds — no "All templates" (owner 2026-09-18: it only
 * repeated the tabs) — and Templates lands on Quotes; every kind is live (REG-485 · 534 · 538). Client-safe.
 */
export type CompanySection = { key: string; icon: string; label: string; help: string; href?: string }
export type CompanyGroup = { title: string; items: CompanySection[] }

export const COMPANY_GROUPS: CompanyGroup[] = [
  { title: 'Studio', items: [
    { key: 'profile', icon: 'store', label: 'Profile', help: 'Company details', href: '/company/profile' },   /* (REG-554) the kit moved to Templates › Brand kit */
    { key: 'members', icon: 'group', label: 'Members', help: 'People, roles and who reports to whom', href: '/company/members' },   /* (REG-601) live */
    { key: 'questionnaire', icon: 'quiz', label: 'Questionnaire', help: 'The questions every lead starts with', href: '/company/questionnaire' },   /* (REG-612) live */
    { key: 'templates', icon: 'style', label: 'Templates', help: 'Brand kit, quotes, contracts and more', href: '/company/templates/quotes' },
    { key: 'price-book', icon: 'list_alt', label: 'Price book', help: 'My Items and My Sections — what quote lines start from', href: '/company/price-book' },   /* (REG-653, Q-18) the quote's Create strip wears list_alt for My Items and menu_book for Brand Catalog (the mock) — one glyph per meaning · (REG-594) */
    { key: 'materials', icon: 'texture', label: 'Materials', help: 'Your own finishes for the AI Visualizer', href: '/company/materials' },   /* (REG-677, AI Visualizer Q-18) 1.0's studio library, now managed */
    { key: 'plan', icon: 'diamond', label: 'Plan & AI credits', help: 'Your plan, the AI credits the team uses, invoices', href: '/company/plan' },   /* (REG-704, AI credits Q-22) 1.0's Usage & credits, on Company's frame */
  ] },
  { title: 'Operations', items: [
    { key: 'finance', icon: 'finance', label: 'Finance', help: 'Invoices, payments and GST' },
    { key: 'reports', icon: 'analytics', label: 'Reports', help: 'Sales, pipeline and team' },
    { key: 'integrations', icon: 'link', label: 'Integrations', help: 'Qanvast, the website form, Meta Lead Ads, webhooks and Gmail', href: '/company/integrations' },   /* (REG-602) live */
  ] },
]

export type TemplateKind = { key: string; icon: string; label: string; title: string; help: string; href: string; live: boolean }
/* (REG-535, owner 2026-09-18) Contracts sits beside Quotes — the two live kinds first. (REG-508) No Notes kind — owner 2026-09-18: a quote's Additional Notes are free text with their own My Templates in the quote editor. */
export const TEMPLATE_KINDS: TemplateKind[] = [
  /* (REG-554, owner 2026-09-23: "inside the template is better") The kit every template starts from is the strip's first tab; Templates still lands on Quotes (REG-500). */
  { key: 'brand', icon: 'palette', label: 'Brand kit', title: 'Brand kit', help: 'The logo, stamp, badges, colours and type every template starts from.', href: '/company/templates/brand', live: true },
  { key: 'quotes', icon: 'request_quote', label: 'Quotes', title: 'Quote templates', help: 'How your quotes look and what they start with.', href: '/company/templates/quotes', live: true },
  { key: 'contracts', icon: 'contract', label: 'Contracts', title: 'Contract templates', help: 'The agreement a signed quote becomes.', href: '/company/templates/contracts', live: true },   /* (REG-534) live */
  { key: 'tasks', icon: 'task', label: 'Tasks', title: 'Task templates', help: 'Checklists the team adds to a lead in one go.', href: '/company/templates/tasks', live: true },   /* (REG-538) live */
  { key: 'terms', icon: 'gavel', label: 'T&Cs & Notes', title: 'Terms and Notes templates', help: 'The clauses and the notes a quote can carry.', href: '/company/templates/terms', live: true },   /* (REG-538) one page, a Terms · Notes segment — the owner kept Notes off the strip (REG-508) */
  { key: 'payments', icon: 'payments', label: 'Payments', title: 'Payment templates', help: 'Milestone splits the studio offers.', href: '/company/templates/payments', live: true },   /* (REG-538) live */
]
export const templateKind = (key: string) => TEMPLATE_KINDS.find((k) => k.key === key)

/** (REG-721) The Company section a path is in — '/company/plan/billing' → 'Plan & AI credits', '/company/templates/brand' → 'Templates'.
    What a Company page's crumb calls the Company page it was opened from, so the crumb never reads "Company / Company". */
export function companySectionOf(path: string): string | undefined {
  const seg = path.split('?')[0]!.split('/')[2]
  if (!seg) return undefined
  for (const g of COMPANY_GROUPS) for (const s of g.items) if (s.href?.split('/')[2] === seg) return s.label
  return undefined
}

/** (REG-594) Company › Price book: the two libraries a quote line can start from, as the section's tab strip. */
export const PRICE_BOOK_TABS = [{ label: 'My Items', href: '/company/price-book' }, { label: 'My Sections', href: '/company/price-book/sections' }] as const
export const PRICE_BOOK_KINDS: Record<'items' | 'sections', TemplateKind> = {
  items: { key: 'items', icon: 'list_alt', label: 'My Items', title: 'My Items', help: 'Every product and service the studio prices, ready to drop into a quote.', href: '/company/price-book', live: true },
  sections: { key: 'sections', icon: 'format_list_bulleted', label: 'My Sections', title: 'My Sections', help: 'Whole sections saved from quotes — a room or a trade with its lines.', href: '/company/price-book/sections', live: true },
}

/** (sweep S4 #26) One ghost bone per tab, as wide as its label reads — the route's loading.tsx (a server component) and CompanyShell's reveal
    draw the same strip. Here, not in the client shell: a server component cannot call a function from a 'use client' module. */
export const tabBones = (labels: string[]) => labels.map((l) => Math.max(32, Math.round(l.length * 7.4)))

/** (REG-704, AI credits Q-22) Company › Plan & AI credits: Usage · Plan & billing. */
export const PLAN_TABS = [{ label: 'Usage', href: '/company/plan' }, { label: 'Plan & billing', href: '/company/plan/billing' }] as const
