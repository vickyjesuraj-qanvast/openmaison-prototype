/*
 * (pending modules S35 — his "build all of them" 2026-10-11; cards public:marketing-website · onboarding:book-a-demo; 1.0's src/app/(marketing)/**,
 * src/components/landing/**) OpenMaison's own website — the company's pages, not a studio's. Served by this app under one prefix (`/site`), open to
 * anyone (lib/auth/paths.ts `PUBLIC_PATHS`); the studio app's front door is unchanged (`/` = the Dashboard, else sign-in). Pure: the addresses,
 * the navigation, the company's contact facts and 1.0's old addresses. Every word is 1.0's published copy unless the step's register rows say
 * otherwise (steps/reg-S35.md · outcome-S35.md list each changed sentence).
 *
 * The site is the company's, so OpenMaison's name and brand are right here — unlike a client page, which only ever wears the studio's.
 */

/** Where the site lives inside the app. */
export const SITE_BASE = '/site'
/** An address on the site: `site('/story')` → `/site/story`, `site('/')` → `/site`. */
export const site = (path = '/') => (path === '/' || path === '' ? SITE_BASE : `${SITE_BASE}${path.startsWith('/') ? path : `/${path}`}`)
/** The public address the site is published at — its canonical links, sitemap and structured data (1.0's NEXT_PUBLIC_SITE_URL). */
export const PUBLISHED_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openmaison.ai').replace(/\/$/, '')

/** OpenMaison's own ways in (1.0's contact page and footer). */
export const COMPANY = {
  name: 'OpenMaison',
  legalName: 'Qanvast Pte. Ltd.',
  email: 'hello@openmaison.ai',
  whatsapp: '+65 8035 8955',
  whatsappHref: 'https://wa.me/6580358955',
  office: 'Singapore',
  /** 1.0's footer, Singapore's links (src/lib/region-config.ts) */
  socials: [
    { platform: 'Instagram', url: 'https://www.instagram.com/openmaison.sg/' },
    { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/openmaison/' },
  ],
  linkedin: 'https://www.linkedin.com/company/openmaison',
  foundingDate: '2025',
} as const

/** 1.0's booking page (src/components/landing/beta-signup-modal.tsx `CALENDLY_URL`) — the real address, a 30-minute call with the team. */
export const CALENDLY_URL = 'https://calendly.com/hello-openmaison/30min'
/** Calendly's own page, prefilled with the name and email the visitor gave (1.0 encoded spaces as %20 — Calendly prints a `+` literally). */
export function calendlyHref(o: { name?: string; email?: string } = {}): string {
  const q = new URLSearchParams({ hide_gdpr_banner: '1', hide_event_type_details: '1' })
  if (o.name?.trim()) q.set('name', o.name.trim())
  if (o.email?.trim()) q.set('email', o.email.trim())
  return `${CALENDLY_URL}?${q.toString().replace(/\+/g, '%20')}`
}

/** (S46D — D4) The public Pricing page (components/site/pricing.tsx) — its address, read by the bar, the footer and every "See pricing". */
export const PRICING_PATH = site('/pricing')

/** The studio app's own doors (S30 · S31). */
export const SIGN_IN = '/sign-in'
export const SIGN_UP = '/sign-up'

export type NavLink = { label: string; href: string }

/** The top bar's links beside Platform ▾ (1.0's PRIMARY_LINKS). */
export const PRIMARY_LINKS: readonly NavLink[] = [
  { label: 'Pricing', href: PRICING_PATH },   // (S46D — D4) 1.0's plg bar: Pricing first
  { label: 'Story', href: site('/story') },
  { label: 'Resources', href: site('/blog') },
]

/** The footer's Company and Legal columns (1.0's marketing-footer.tsx; the Platform column is the modules'). */
export const COMPANY_LINKS: readonly NavLink[] = [
  { label: 'Story', href: site('/story') },
  { label: 'Trust & Security', href: site('/trust') },
  { label: 'What’s New', href: site('/changelog') },
  { label: 'Resources', href: site('/blog') },
  { label: 'Careers', href: site('/careers') },
  { label: 'Contact', href: site('/contact') },
]
export const LEGAL_LINKS: readonly NavLink[] = [
  { label: 'Terms of Service', href: site('/terms') },
  { label: 'Privacy Policy', href: site('/privacy') },
  { label: 'Cookie Policy', href: site('/cookies') },
]

/** The footer's line and the security line under the wordmark (1.0's). */
export const FOOTER_LINE = 'One platform for your entire studio, powered by AI.'
export const FOOTER_SECURITY = 'Encrypted by default. Your data stays yours.'
export const FOOTER_BOTTOM = 'Built by the team behind Qanvast.'

/** 1.0's closing footnote under every call to action. (S35) True of 2.0 as it stands: a studio signs itself up on Free (S31). */
export const FREE_LINE = 'Free to start · No card needed.'

/** Where a page of the site sits — the breadcrumb trail its structured data names (1.0's `getBreadcrumbJsonLd`). */
export type Crumb = { name: string; path: string }

/* 1.0's site lived at the domain's root: its addresses (printed, bookmarked, indexed) land on the same page here — (pending modules S41b-2) on
   the one list of every 1.0 address, lib/links/old-addresses.ts (`OLD_SITE_ADDRESSES` is its website part), served by next.config.ts. */
