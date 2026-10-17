/**
 * (REG-645, settings parity Q-01 · Q-02) Settings' modules — 1.0's Accounts groups as 2.0 names them: Studio · Lead management ·
 * Quotes & pricing, with Notifications beside them; Projects and Finance come with their modules. The open module is in the address
 * (`?section=`) and each tab of the strip is a link to it. Client-safe.
 */
/* (Dane UAT 2.14) The modules in the order a studio's work runs — leads, then projects, then quotes and pricing, then finance — with
   Notifications last; Projects and Finance keep their places as inert tabs until their modules come. One list drives the strip, the ghost
   and ⌘K's Go to. */
export const SETTINGS_MODULES = [
  /* (pending modules S14 — card held:settings-company, "'Studio' names both a Settings module and a Company group", one-home N-06; as
     recommended, her "build all of them" 2026-10-11) the module is named for what it holds — who sees which leads and what each role may do
     (and, while a studio is new, Set up your studio). "Studio" stays the Company panel's group (REG-484, her pick) and the plan's name. The
     key and the address stay `studio`, so every link to it keeps working. */
  { key: 'studio', label: 'Roles & access', live: true },
  { key: 'leads', label: 'Lead management', live: true },
  /* (pending modules S23 — Meetings and the Meeting Co-Pilot, her "build all of them" 2026-10-11) the co-pilot's playbook — 1.0's Accounts ›
     AI & Copilot group (Copilot Tuning · Objection Responses · Meeting Checklists · Competitor List) and its session switches — right after the
     leads, whose meetings it runs in */
  { key: 'meetings', label: 'Meetings', live: true },
  { key: 'projects', label: 'Projects', live: true },   // (REG-921, Projects round 1) live with the project numbers; round 7 grows it
  { key: 'quotes', label: 'Quotes & pricing', live: true },
  { key: 'finance', label: 'Finance', live: true },   // (gaps build F1) live with money out: Settings › Finance › Costs · (simplify S-15) every money rule's one home
  { key: 'notifications', label: 'Notifications', live: true },
] as const
export type SettingsModule = 'studio' | 'leads' | 'meetings' | 'projects' | 'quotes' | 'notifications' | 'finance'
export const settingsHref = (key: string) => `/settings?section=${key}`
/** The module a `?section=` opens; Studio when none (1.0's Accounts opened on its Studio group). */
export const parseSettingsModule = (v: string | undefined): SettingsModule => (v === 'leads' || v === 'meetings' || v === 'projects' || v === 'quotes' || v === 'notifications' || v === 'finance' ? v : 'studio')

/**
 * (pending modules S17 — consistency leftovers) Each module's *Kept in Company:* links — the Company pages that hold the module's records
 * (REG-645 Q-08). The module head and its ghost read this one list, so the ghost's buttons are the page's own and can't drift from them.
 */
export type ModuleLink = { label: string; icon: string; path: string; hash?: string }
export const MODULE_LINKS: Record<SettingsModule, readonly ModuleLink[]> = {
  studio: [{ label: 'Members', icon: 'group', path: '/company/members' }, { label: 'Profile', icon: 'store', path: '/company/profile' }],   // (one-home N-06)
  leads: [{ label: 'Integrations', icon: 'link', path: '/company/integrations' }, { label: 'Questionnaire', icon: 'quiz', path: '/company/questionnaire' }, { label: 'Members', icon: 'group', path: '/company/members' }],
  projects: [{ label: 'Templates', icon: 'style', path: '/company/templates/schedules' }, { label: 'Client portal', icon: 'home', path: '/company/portal' }, { label: 'Members', icon: 'group', path: '/company/members' }],
  quotes: [{ label: 'Templates', icon: 'style', path: '/company/templates/quotes' }, { label: 'Price book', icon: 'list_alt', path: '/company/price-book' }],
  /* (REG-1360) Finance is a Company section — its records are kept in Company · (simplify S-15) Profile and Payment schedules join them */
  finance: [{ label: 'Profile', icon: 'store', path: '/company/profile', hash: 'entities' }, { label: 'Payment schedules', icon: 'payments', path: '/company/templates/payments' },
    { label: 'Vendors', icon: 'storefront', path: '/company/finance/vendors' }, { label: 'Commission', icon: 'workspace_premium', path: '/company/finance/commissions' }],
  meetings: [],   // (pending modules S23) its records are the module's own — no Company page holds them
  notifications: [],
}
/** The module's links as the head draws them: each with `from` (the module, so Company's Back returns here) and its anchor. */
export const moduleLinks = (key: SettingsModule, from: string) => MODULE_LINKS[key].map((l) => {
  const href = `${l.path}${l.path.includes('?') ? '&' : '?'}from=${encodeURIComponent(from)}`
  return { label: l.label, icon: l.icon, href: l.hash ? `${href}#${l.hash}` : href }
})
