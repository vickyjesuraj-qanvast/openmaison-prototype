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
    { key: 'members', icon: 'group', label: 'Members', help: 'People, roles and access' },
    { key: 'templates', icon: 'style', label: 'Templates', help: 'Brand kit, quotes, contracts and more', href: '/company/templates/quotes' },
    { key: 'price-book', icon: 'menu_book', label: 'Price book', help: 'My Items and My Sections — what quote lines start from', href: '/company/price-book' },   /* (REG-594) */
  ] },
  { title: 'Operations', items: [
    { key: 'finance', icon: 'finance', label: 'Finance', help: 'Invoices, payments and GST' },
    { key: 'reports', icon: 'analytics', label: 'Reports', help: 'Sales, pipeline and team' },
    { key: 'integrations', icon: 'link', label: 'Integrations', help: 'Qanvast, calendars and accounting' },
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

/** (REG-594) Company › Price book: the two libraries a quote line can start from, as the section's tab strip. */
export const PRICE_BOOK_TABS = [{ label: 'My Items', href: '/company/price-book' }, { label: 'My Sections', href: '/company/price-book/sections' }] as const
export const PRICE_BOOK_KINDS: Record<'items' | 'sections', TemplateKind> = {
  items: { key: 'items', icon: 'menu_book', label: 'My Items', title: 'My Items', help: 'Every product and service the studio prices, ready to drop into a quote.', href: '/company/price-book', live: true },
  sections: { key: 'sections', icon: 'folder', label: 'My Sections', title: 'My Sections', help: 'Whole sections saved from quotes — a room or a trade with its lines.', href: '/company/price-book/sections', live: true },
}
