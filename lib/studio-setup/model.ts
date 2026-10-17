/**
 * (pending modules S08 — the cards `onboarding:studio-setup-wizard` · `onboarding:welcome-and-tips`, her "build all of them" 2026-10-11)
 * **Set up your studio** — 1.0's seven-step wizard (src/app/studio-setup/page.tsx, forced on an owner until finished) built as 2.0's job: one
 * checklist over the pages that already keep each answer. Every step is DONE BY ITS OWN RECORD — a logo in the brand kit, the studio's bank on
 * Company › Profile, a second member, a published quote template, an item in the Price book, a way leads come in — never a tick set by hand;
 * each opens the page that keeps it with `?from=`, so Back returns to the list. 1.0's steps with a default (document numbering, the lead
 * funnel, the approval switches — "Skip, defaults INV / PO / T used") are not steps here: the list's foot says what is already set for you
 * and where to change it. Country stays Singapore (DEF-30, step S33).
 *
 * Its one home is Settings › Studio, the card above Who may do what (1.0's welcome sent "Start Setup" to Accounts, which is 2.0's Settings);
 * the first-visit welcome and ⌘K are its doors. It shows itself to Owners and Admins while a step is open, once more on the visit that finds
 * every step done ("Your studio is set up"), and never again after; a member who hides it hides it for themselves, with Undo. The record is
 * the settings key `studio_setup`. Pure and client-safe — the server reads the facts (lib/studio-setup/queries.ts), the card draws the rows.
 */

export const SETUP_KEY = 'studio_setup'

/** The studio's set-up record: when the list was first seen with a step open, when it was first seen with every step done (after which it never
    shows by itself), and the members who hid it (id → when). */
export type SetupRecord = { seenOpenAt: number | null; doneAt: number | null; hidden: Record<string, number> }
export const EMPTY_SETUP_RECORD: SetupRecord = { seenOpenAt: null, doneAt: null, hidden: {} }

export function parseSetupRecord(v: unknown): SetupRecord {
  const r = (v ?? {}) as Partial<Record<keyof SetupRecord, unknown>>
  const stamp = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : null)
  const hidden: Record<string, number> = {}
  if (r.hidden && typeof r.hidden === 'object') for (const [k, at] of Object.entries(r.hidden as Record<string, unknown>)) { const s = stamp(at); if (s && k) hidden[k] = s }
  return { seenOpenAt: stamp(r.seenOpenAt), doneAt: stamp(r.doneAt), hidden }
}

/** What the steps read — each from the record its page keeps. */
export type SetupFacts = {
  /** Company › Profile's details (the studio's name always has one) */
  details: { address: string; uen: string; phone: string; email: string }
  /** the brand kit's logo */
  logo: boolean
  /** the studio's own issuing entity — its bank and PayNow (Company › Profile) */
  bank: { bankName: string; accountNo: string; payNow: string }
  /** active members, the signed-in one among them */
  members: number
  /** published quote templates, and the default one's name */
  templates: { published: number; defaultName: string | null }
  /** (S42 audit A-01) the studio's plan keeps its own templates for Pro (lib/credits/features.ts `template_editor`) — its quotes print with
      the default, so the step is done by it */
  templatesLocked?: boolean
  /** live items in the Price book (a proposal waiting for review is not one yet) */
  book: number
  /** the ways leads come in by themselves (Company › Integrations) */
  capture: { gmail: boolean; meta: boolean; webhooks: number }
  /** (pending modules S31) a studio of one — signed up as "I work on my own": no team to add */
  solo?: boolean
}

export type SetupGroup = 'print' | 'work'
export const SETUP_GROUPS: { key: SetupGroup; label: string }[] = [
  { key: 'print', label: 'What your documents print' },
  { key: 'work', label: 'How your studio works' },
]

type SetupItem = {
  key: string
  group: SetupGroup
  label: string
  /** While open: what it is for, then what happens until it is done (1.0's skip buttons said the default each step fell back to). */
  open: string
  done: (f: SetupFacts) => boolean
  /** Once done: what the page has. */
  doneLine: (f: SetupFacts) => string
  /** The page that keeps it: the button's words ("Open Profile") and the address, with the card it lands on. */
  home: { page: string; href: string; hash?: string }
  /** (pending modules S31) whether the step is this studio's to do at all — shown only when it applies */
  applies?: (f: SetupFacts) => boolean
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const SETUP_ITEMS: readonly SetupItem[] = [
  {
    key: 'details', group: 'print', label: 'Company details',
    open: 'Your address, UEN and a phone or email — every quote, invoice and contract prints them. Until then they print your studio’s name alone.',
    done: (f) => !!f.details.address.trim() && !!f.details.uen.trim() && (!!f.details.phone.trim() || !!f.details.email.trim()),
    doneLine: (f) => [f.details.address.trim(), f.details.uen.trim() ? `UEN ${f.details.uen.trim()}` : ''].filter(Boolean).join(' · '),
    home: { page: 'Profile', href: '/company/profile', hash: 'details' },
  },
  {
    key: 'logo', group: 'print', label: 'Logo',
    open: 'On the letterhead of every document and on your clients’ portal. Until then the letterhead goes without one.',
    done: (f) => f.logo,
    doneLine: () => 'In your brand kit — every template starts from it',
    home: { page: 'brand kit', href: '/company/templates/brand', hash: 'marks' },
  },
  {
    key: 'bank', group: 'print', label: 'Bank details',
    open: 'The account or PayNow your clients pay into — invoices print it. Until then an invoice can’t say how to pay you.',
    done: (f) => (!!f.bank.bankName.trim() && !!f.bank.accountNo.trim()) || !!f.bank.payNow.trim(),
    doneLine: (f) => [f.bank.bankName.trim() && f.bank.accountNo.trim() ? `${f.bank.bankName.trim()} ${f.bank.accountNo.trim()}` : '', f.bank.payNow.trim() ? `PayNow ${f.bank.payNow.trim()}` : ''].filter(Boolean).join(' · '),
    home: { page: 'Profile', href: '/company/profile', hash: 'entities' },
  },
  {
    key: 'team', group: 'work', label: 'Your team', applies: (f) => !f.solo,   // (pending modules S31) a studio of one has no team to add
    open: 'Add the designers and everyone else who works on leads and projects. Until then only you can be put on one.',
    done: (f) => f.members > 1,
    doneLine: (f) => plural(f.members, 'member', 'members'),
    home: { page: 'Members', href: '/company/members' },
  },
  {
    key: 'template', group: 'work', label: 'Quote template',
    open: 'How your quotes look — start from a house style, or recreate a quote you send today. Until then quotes use the plain layout.',
    /* (S42 audit A-01, call A·2 as recommended) on Free the studio's own templates are Pro's (S19), so the step can't be done by a record the
       plan won't let it make: quotes print with the default, and the line says where your own come from */
    done: (f) => f.templates.published > 0 || !!f.templatesLocked,
    doneLine: (f) => (f.templatesLocked ? `Your quotes print with ${f.templates.defaultName ?? 'the studio’s default'} — your own templates come with Pro` : f.templates.defaultName ? `${f.templates.defaultName} is the default` : plural(f.templates.published, 'template published', 'templates published')),
    home: { page: 'Templates', href: '/company/templates/quotes' },
  },
  {
    key: 'book', group: 'work', label: 'Price book',
    open: 'The items and rates you quote most, ready to drop into a quote — add them or import a sheet. Until then every line is typed in.',
    done: (f) => f.book > 0,
    doneLine: (f) => plural(f.book, 'item', 'items'),
    home: { page: 'Price book', href: '/company/price-book' },
  },
  {
    key: 'capture', group: 'work', label: 'Leads that come in by themselves',
    open: 'Connect Gmail, Meta Lead Ads or a webhook, and new enquiries arrive as leads. Until then you add them or import a sheet.',
    done: (f) => f.capture.gmail || f.capture.meta || f.capture.webhooks > 0,
    doneLine: (f) => [f.capture.gmail ? 'Gmail' : '', f.capture.meta ? 'Meta Lead Ads' : '', f.capture.webhooks ? plural(f.capture.webhooks, 'webhook', 'webhooks') : ''].filter(Boolean).join(' · '),
    home: { page: 'Integrations', href: '/company/integrations' },
  },
]

export type SetupRow = { key: string; group: SetupGroup; label: string; line: string; done: boolean; home: { page: string; href: string; hash?: string } }
export const setupRows = (f: SetupFacts): SetupRow[] =>
  SETUP_ITEMS.filter((i) => !i.applies || i.applies(f)).map((i) => { const done = i.done(f); return { key: i.key, group: i.group, label: i.label, line: done ? i.doneLine(f) : i.open, done, home: i.home } })

/** Whether Settings › Studio draws the list for this member, and how: 'open' while a step is open; 'done' once — the visit that finds every step
    done after the list was seen open (1.0's "Your studio is live"); then never by itself. Owners and Admins only. Asked for (⌘K's "Set up your
    studio", `?setup=1`), it shows as it stands whatever was hidden or finished. */
export function setupShows(o: { runs: boolean; record: SetupRecord; me: string; open: number; asked?: boolean }): 'open' | 'done' | null {
  if (!o.runs) return null
  if (o.asked) return o.open > 0 ? 'open' : 'done'
  if (o.record.hidden[o.me] || o.record.doneAt) return null
  if (o.open > 0) return 'open'
  return o.record.seenOpenAt ? 'done' : null
}

/** Settings › Studio's list as the page reads it for the signed-in member (lib/studio-setup/queries.ts `fetchStudioSetup`). */
export type StudioSetupData = {
  mode: 'open' | 'done'
  rows: SetupRow[]
  done: number
  /** opened from ⌘K (`?setup=1`): shown as it stands, whatever was hidden or finished */
  asked: boolean
  /** this member hid it (shown only because they asked) */
  hidden: boolean
  /** the studio finished setting up on an earlier visit */
  finished: boolean
  /** never seen with a step open before — the card records that it was */
  firstSeen: boolean
  /** no lead yet: the done state's one filled button is the first lead (1.0's "Create your first lead") */
  noLeads: boolean
}
/** The list's own refusal — hiding it is each Owner's or Admin's own choice; nobody else sees it. */
export const SETUP_RULE = 'Only Owners and Admins set up the studio'

/* ── The first-visit welcome (1.0's welcome-modal.tsx: "Welcome, {first name}" — an owner's "Let's get your studio set up", an invited
   member's "You've been invited to {studio}") — one short window with at most one filled button, on a member's first visit only. ── */

export type Welcome = { title: string; body: string; action: { label: string; href: string } }

/** (S42 audit A-05) What the app calls a member when it greets them — their name as the studio wrote it ("Hui Min", never "Hui"): the
    welcome and the Dashboard's brief read this one rule. */
export const callName = (name: string | null | undefined): string => (name ?? '').trim().replace(/\s+/g, ' ')

/** Where a welcome's button lands (the Settings › Studio list's own anchor). */
export const SETUP_HREF = '/settings?section=studio#studio-setup'

/** (pending modules S09) `invitedBy`: the member was invited on Company › Members — their welcome opens with who invited them (1.0's invited
    member's "You've been invited to {studio}"); the rest of each body is the same (invented copy). */
export function welcomeFor(o: { name: string; role: string; studio: string; setup: boolean; invitedBy?: string | null; /** (S31) a studio of one: no team */ solo?: boolean; /** (S42 audit A-19) on no lead yet */ noLeads?: boolean }): Welcome {
  const title = `Welcome, ${callName(o.name)}`
  const by = o.invitedBy
  if (o.setup) return {
    title,
    body: by ? `${by} invited you to help get ${o.studio} ready for its first quote — the company details, logo and bank details first, then the team and price book. Each step opens the page that keeps it.`
      : `Let’s get ${o.studio} ready for its first quote — your company details, logo and bank details first, then your ${o.solo ? 'price book' : 'team and price book'}. Each step opens the page that keeps it.`,
    action: { label: 'Set up your studio', href: SETUP_HREF },
  }
  if (o.role === 'Accounting') return {
    title,
    body: `${by ? `${by} invited you to keep ${o.studio}’s books.` : `You keep ${o.studio}’s books.`} Invoices and client payments, purchase orders, bills and expenses wait for you in Company › Finance.`,
    action: { label: 'Open Finance', href: '/company/finance' },
  }
  /* (S44O — call C6) the lead desk's first visit: the pipeline is theirs to hand out, the lead set-up theirs to change *(invented copy)* */
  if (o.role === 'Marketing') return {
    title,
    body: `${by ? `${by} invited you to look after ${o.studio}’s leads.` : `You look after ${o.studio}’s leads.`} New enquiries land in Leads for you to put a member on; where leads come from is in Settings › Lead management and Company › Integrations.`,
    action: { label: 'See the leads', href: '/leads' },
  }
  if (o.role === 'Owner' || o.role === 'Admin') return {
    title,
    body: `${by ? `${by} invited you to ${o.studio}’s team` : `You’re on ${o.studio}’s team`} as ${o.role === 'Owner' ? 'an Owner' : 'an Admin'}: the leads, the projects and the studio’s settings are yours to run. Your photo and signature go in Your profile.`,
    action: { label: 'See the leads', href: '/leads' },
  }
  return {
    title,
    /* (S42 audit A-19) a member just invited is on no lead yet — the welcome says what will come, not what isn't there */
    body: `${by ? `${by} invited you to ${o.studio}’s team.` : `You’re on ${o.studio}’s team.`} ${o.noLeads ? 'Your leads, tasks and the studio’s messages land here as you’re added to them.' : 'Start with the leads you’re on — your tasks and the studio’s messages are beside them.'} Your photo and signature go in Your profile; they print on the quotes you prepare.`,
    action: { label: 'See my leads', href: '/leads' },
  }
}
