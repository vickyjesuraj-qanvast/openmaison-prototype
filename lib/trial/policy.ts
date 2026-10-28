import type { LeadFormData } from '@/lib/leads/lead-input'
import type { UploadGroup } from '@/lib/quotes/upload'
import type { RefLine } from '@/lib/xray/reference'
import type { XrayResult, YourLine } from '@/lib/xray/compare'

/*
 * (pending modules S41b-3 — his "please make sure nothing left behind from 1.0 to 2.0" 2026-10-12; the S41b data sweep's M-01; 1.0's
 * `origin/deployment/plg`: src/lib/anon/{cookie,workspace,quota,registry,surfaces,try-now,claim,claim-on-login}.ts, the materialisers
 * src/lib/anon/materialisers/{leads,quote-digitizer}.ts and the retired quote-xray one, src/app/api/anon/{session,leads,quote-digitizer}/route.ts,
 * src/app/api/cron/{anon-sweep,anon-storage-gc}/route.ts, scripts/migrations/315_anon_workspaces.sql + 316_anon_token_fns.sql, the specs
 * 2026-09-17-anonymous-first-access-design.md · 2026-09-21-gated-platform-acquisition-design.md · 2026-09-22-signup-gating-model-design.md)
 * TRY THE TOOLS WITHOUT AN ACCOUNT, AND KEEP THE WORK AT SIGN-UP — the rules, pure and client-safe: the pages, the server's actions, the claim
 * and the probe read the same figures.
 *
 * Beside S36's AI Visualizer trial (/site/try), three of the studio's own tools open to a website visitor: Leads (the studio's lead form and
 * a listing of their own leads), Upload a quote (the Create Quote window's reader) and Quote X-Ray (its engine, lib/xray/compare.ts). What a
 * visitor makes is kept in ONE anonymous workspace per browser — 1.0's `anon_workspaces` row, named by a signed cookie — never in a studio;
 * when they start their studio (S31's sign-up) every piece moves into it, each with its Activity line. 1.0's numbers, from its code:
 *   · Leads: 3 (1.0's ANON_LEAD_LIMIT as the gated platform shipped it, 2026-09-21 — "a visitor may create 3 leads, the 4th opens the account
 *     gate"; 1.0 lowered it to 1 on 2026-09-30 only because it then mixed five fake "(Demo)" sample leads into the board — 2.0 shows no
 *     made-up records, so the reason for 1 is not there);
 *   · one quote read (ANON_DIGITIZER_LIMIT = 1) and one Quote X-Ray reading (ANON_XRAY_LIMIT = 1) — 1.0 ran both without an account from
 *     2026-09-21 and later gated them at the upload only because each read called a paid model; 2.0's readers are rules in the visitor's
 *     own browser, so the free try 1.0 designed costs nothing here (the decision is written in the outcome, for Vicky);
 *   · the workspace lives 7 days (`expires_at = now() + 7 days`, the cookie's max-age the same), then the sweep deletes it;
 *   · 25 new workspaces a day from one address (1.0's IP_CEILING_MAX), five reads a minute (1.0's anon routes' limiter), the bot check before
 *     the first write (1.0's Turnstile, "before the first spend") — both S36's seams;
 *   · 1.0's token grant (ANON_GRANT = 50, `spent_tokens`) bounds what a workspace spends, at 1.0's price for a quote read (5 — the anonymous
 *     X-Ray borrowed the same key); it is the trial's own allowance, never a studio's AI credits.
 */

/* ── the switch (1.0's line shipped the three together — one workspace, one claim — so one switch; the Visualizer keeps its own) ── */
/** The environment's switch for Leads · Upload a quote · Quote X-Ray without an account — the sibling of S36's `TRIAL_VISUALIZER_ENABLED`. */
export const TOOLS_SWITCH = 'TRIAL_TOOLS_ENABLED'
/** On in this prototype's demo (as S36's trial is); a real build sets it false and the tools are off until the switch says so. */
export const TOOLS_IN_DEMO = true
export function toolsTrialEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env[TOOLS_SWITCH] ?? '').trim().toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return TOOLS_IN_DEMO || env.NODE_ENV !== 'production'
}

/* ── 1.0's numbers ── */
/** The anonymous workspace's cookie (1.0's `om_anon_v1`; 2.0's cookies are `om_…`). httpOnly, the whole site — sign-up reads it to claim. */
export const WORKSPACE_COOKIE = 'om_anon'
/** 1.0's `anon_workspaces.expires_at` — seven days from the workspace's making; the cookie lives as long. */
export const WORKSPACE_DAYS = 7
export const WORKSPACE_MS = WORKSPACE_DAYS * 86_400_000
export const LEAD_LIMIT = 3
export const READ_LIMIT = 1
export const XRAY_LIMIT = 1
/** 1.0's ANON_GRANT — the workspace's own allowance, in AI credits' unit */
export const GRANT = 50
/** 1.0's `quote_digitize` price, which its anonymous quote read and anonymous X-Ray both spent */
export const READ_PRICE = 5
/** 1.0's IP_CEILING_MAX — new workspaces a day from one address (a backstop against scripts, generous for a shared office) */
export const WORKSPACES_PER_DAY = 25
/** 1.0's anonymous read routes — five a minute from one address */
export const READS_PER_MINUTE = 5
/** the most lines one quote or one side of a comparison keeps (the studio's own caps: Quote X-Ray's 500, a paste's 500) */
export const MAX_LINES = 500
export const MAX_GROUPS = 60

/* ── where each tool lives on the website (S35's /site; S36's /site/try is the AI Visualizer's) ── */
export type TrialToolKey = 'visualizer' | 'leads' | 'quote' | 'xray'
export const TRY_PATH: Record<TrialToolKey, string> = { visualizer: '/site/try', leads: '/site/try/leads', quote: '/site/try/upload-a-quote', xray: '/site/try/quote-x-ray' }
/** 1.0's TRY_NOW_DESTINATIONS, in 2.0's site: a module page's Try now opens its tool (the Visualizer's is S36's). */
export const TRY_NOW: Partial<Record<string, TrialToolKey>> = { leads: 'leads', 'upload-a-quote': 'quote' }

/* ── what a workspace holds (1.0's payload, namespaced by surface: `leads` · `quote-digitizer` · `quote-xray`) ── */
/** A lead as the visitor typed it — the studio's form's details, every one of them but the members (a visitor has no team). */
export type TrialLeadData = Omit<LeadFormData, 'assignees'>
export type TrialLead = { id: string; at: number; data: TrialLeadData }
/** The quote the visitor kept — Upload a quote's own reading: the file, where its lines came from, the lines by section — and its client: one
    of their trial leads, as every quote in a studio is a lead's (kept only with one; null only in a workspace kept before that rule). */
export type TrialRead = { id: string; at: number; file: string; source: string; groups: UploadGroup[]; count: number; totalMinor: number; leadId: string | null }
/** The Quote X-Ray reading — both sides' lines as read, the reading the engine made of them, and the lead it is for (if any). */
export type TrialReading = { id: string; at: number; otherFile: string; yourFile: string; otherStudio: string; yours: YourLine[]; theirs: RefLine[]; leadId: string | null; result: XrayResult }
export type TrialPayload = {
  leads?: { leads: TrialLead[] }
  'quote-digitizer'?: { documents: TrialRead[]; /** 1.0's brake: failed claims so far */ claimAttempts?: number; claimLastError?: string }
  'quote-xray'?: { xrays: TrialReading[] }
}
/** Every surface a workspace may hold — each has its way home at sign-up (1.0's rule: "a surface with no materialiser cannot store work"). */
export const SURFACES = ['leads', 'quote-digitizer', 'quote-xray'] as const
export type Surface = (typeof SURFACES)[number]
export const isSurface = (v: unknown): v is Surface => typeof v === 'string' && (SURFACES as readonly string[]).includes(v)
/** 1.0's ANON_DIGITIZER_MAX_CLAIM_ATTEMPTS — a quote that fails to come over three times is let go, so it can't make a lead on every sign-in. */
export const MAX_CLAIM_ATTEMPTS = 3

/** What the visitor has in the trial, as every page reads it. */
export type TrialWork = { leads: TrialLead[]; read: TrialRead | null; reading: TrialReading | null; expiresAt: number | null }
export const NO_WORK: TrialWork = { leads: [], read: null, reading: null, expiresAt: null }
export const workOf = (payload: TrialPayload | null | undefined, expiresAt: number | null = null): TrialWork => ({
  leads: Array.isArray(payload?.leads?.leads) ? payload!.leads!.leads.slice(0, LEAD_LIMIT) : [],
  read: payload?.['quote-digitizer']?.documents?.[0] ?? null,
  reading: payload?.['quote-xray']?.xrays?.[0] ?? null,
  expiresAt,
})
export const hasWork = (w: TrialWork) => w.leads.length > 0 || !!w.read || !!w.reading
/** The counts sign-up and the landing say ("2 leads, a quote and a Quote X-Ray reading"). */
export type WorkCount = { leads: number; quote: boolean; reading: boolean }
export const countOf = (w: TrialWork): WorkCount => ({ leads: w.leads.length, quote: !!w.read, reading: !!w.reading })
export const anyWork = (c: WorkCount | null | undefined) => !!c && (c.leads > 0 || c.quote || c.reading)

/* ── the words (invented copy — REG-S41b3; 1.0's where they are 1.0's) ── */
const list = (parts: string[]) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`)
/** "2 leads, a quote and a Quote X-Ray reading" */
export function workWords(c: WorkCount): string {
  const parts: string[] = []
  if (c.leads) parts.push(c.leads === 1 ? 'a lead' : `${c.leads} leads`)
  if (c.quote) parts.push('a quote')
  if (c.reading) parts.push('a Quote X-Ray reading')
  return list(parts)
}
const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s)
/** sign-up's line while the browser holds trial work */
export const carriedLine = (c: WorkCount) => `${cap(workWords(c))} from the free trial ${c.leads + (c.quote ? 1 : 0) + (c.reading ? 1 : 0) === 1 ? 'comes' : 'come'} with you — they move into your studio.`
/** the snackbar on the studio's first page once they came over */
export const landedLine = (c: WorkCount) => `${cap(workWords(c))} from your free trial ${c.leads + (c.quote ? 1 : 0) + (c.reading ? 1 : 0) === 1 ? 'is' : 'are'} in your studio`
/** (S42E, E-14) …when a room photo came too, the studio opens on its AI Visualizer with the photo on screen — the one snackbar there names the
    rest and where it is, with the way there ("A lead and a quote from your free trial are in Leads · Open Leads"). *(invented copy)* */
export function roomLandedLine(c: WorkCount): { message: string; action: { label: string; href: string } } {
  const where = c.leads || c.quote ? 'Leads' : 'Quote X-Ray'
  return { message: `${cap(workWords(c))} from your free trial ${c.leads + (c.quote ? 1 : 0) + (c.reading ? 1 : 0) === 1 ? 'is' : 'are'} in ${where}`, action: { label: `Open ${where}`, href: where === 'Leads' ? '/leads' : '/quote-x-ray' } }
}

/** The eyebrow's allowance, in S36's wording ("3 of 3 free renders left"). */
export const leadsLeftLine = (left: number) => (left <= 0 ? 'No free leads left' : `${left} of ${LEAD_LIMIT} free leads left`)
export const readLeftLine = (left: number) => (left <= 0 ? 'Your free quote is kept' : '1 free quote to keep')
export const xrayLeftLine = (left: number) => (left <= 0 ? 'Your free comparison is used' : '1 free comparison')
export const leftOf = (used: number, limit: number) => Math.max(0, limit - used)

export const TRIAL_WORDS = {
  eyebrow: 'Free · no sign-up',
  keepTitle: 'Keep what you make',
  keepBody: 'Start your studio and everything you make here moves in with it — your leads, your quote and your Quote X-Ray reading. It’s kept in this browser for 7 days until then.',
  keepNone: 'Start your studio to keep what you make here — it’s kept in this browser for 7 days until then.',
  keepFine: 'You start on Free: 150 AI credits to try the tools, then 30 a month.',
  start: 'Start your studio',
  bookDemo: 'Book a demo',
  others: 'More to try without an account',
  /** 1.0's gate: "Create an account to keep going" — in 2.0's door words (S31) */
  gateTitle: 'Start your studio to keep going',
  notNow: 'Not now',
  tooFast: 'You’re going a little fast — give it a moment and try again.',   // S36's (1.0's) words
  check: 'We couldn’t check this browser — reload the page and try again.',   // S36's
  tooMany: 'Too many free trials from this address today — please try again tomorrow, or start your studio.',
  off: 'This trial isn’t available right now — please check back later.',   // S36's (1.0's)
  couldnt: (what: string) => `Couldn’t ${what} — please try again`,
} as const

export const LEADS_WORDS = {
  crumbBack: 'Leads',
  crumbHere: 'Try it',
  title: 'Add a lead, the way your studio will.',
  lede: 'The same Leads your studio works in. Add up to three of your own enquiries — when you start your studio, they come with you.',
  add: 'Create New Lead',
  listTitle: 'Your leads',
  listHelp: 'Kept in this browser for 7 days — they move into your studio when you start it.',
  emptyTitle: 'No leads yet',
  emptyHelp: 'Add one of your own enquiries to see it the way your studio will.',
  gate: `You’ve added ${LEAD_LIMIT} leads — the free trial’s limit. They’re kept, and they move into your studio when you start it.`,
  added: (name: string) => `${name} added — it comes with you when you start your studio`,
  removed: (name: string) => `${name} removed`,
  removeLabel: (name: string) => `Remove ${name}`,
  /** a lead the kept quote or the comparison is on stays (the refusal's rule) */
  held: (name: string, quote: boolean, reading: boolean) => `${name} stays — ${quote && reading ? 'your kept quote and your comparison are' : quote ? 'your kept quote is' : 'your comparison is'} theirs`,
} as const

export const QUOTE_WORDS = {
  crumbBack: 'Upload a quote',
  crumbHere: 'Try it',
  title: 'See a quote read into lines.',
  lede: 'Drop in a quote — a spreadsheet or a PDF — and we read every line, quantity and price, the way Create Quote does in your studio. Keep it as a client’s quote, and it starts there as their quote.',   // (S42 B·4 · E-05) a PDF is read from its own words now
  upload: 'Upload a quote',
  sample: 'No quote handy? Try ours',
  sampleName: 'Sample kitchen quote (XLSX)',
  fine: 'XLSX, CSV or PDF — read in your browser; the file itself never leaves it.',
  reading: (name: string) => `Reading ${name}…`,
  /** a read not kept yet — nothing has left the browser */
  preview: 'Read in your browser — nothing is kept until you keep it',
  forLead: 'Whose quote is it?',
  forLeadHelp: 'A quote is always a client’s. Pick one of your leads, or add the client — it comes into your studio as their quote.',
  forLeadNone: 'A quote is always a client’s. Add the client it’s for — it comes into your studio as their quote.',
  forLeadFull: 'A quote is always a client’s. Pick one of your leads — it comes into your studio as their quote.',
  addClient: 'Add the client',
  keep: 'Keep this quote',
  keeping: 'Keeping…',
  pickFirst: 'Pick whose quote it is first.',
  needClient: 'Say whose quote it is — a quote is always one of your leads’.',
  gate: 'You’ve kept your free quote — it starts as a quote in your studio when you start it. There, every quote you upload is read the same way.',
  xray: 'Compare it with another studio’s quote',
  kept: (name: string) => `Kept — it starts as ${name}’s quote in your studio when you start it`,
  keptSnack: (name: string) => `Kept as ${name}’s quote — it comes with you when you start your studio`,
  keptHelp: 'It comes into your studio on this lead.',
  /** Add the client made the lead, but the keep after it was refused — the lead is there, picked; one press keeps the quote */
  addedNotKept: (name: string) => `${name} added — the quote isn’t kept yet: press Keep this quote`,
  readAnother: 'Read another quote',
} as const

export const XRAY_WORDS = {
  crumbBack: 'Upload a quote',
  crumbHere: 'Try Quote X-Ray',
  title: 'See where your quote wins.',
  lede: 'Put another studio’s quote beside yours — Quote X-Ray matches them line by line and tells you what to say to the client. The same Quote X-Ray studios use.',
  theirs: 'Their quote',
  yours: 'Your quote',
  fromRead: (n: number) => `Use the quote you read (${n} ${n === 1 ? 'item' : 'items'})`,   // (the calm UI build 2026-10-27, T-01 · 6-14) as the note beside it
  samples: 'No quotes handy? Compare two of ours',
  forLead: 'Which lead is it for? (optional)',
  noLead: 'None',
  compare: 'Compare',
  copy: 'Copy the message',
  copied: 'Copied — paste it into WhatsApp',
  gate: 'You’ve had your free comparison. It’s kept, and it waits in your studio’s Quote X-Ray when you start it.',
  pro: 'Quote X-Ray is part of Pro: in your studio the reading is kept and opens with Pro, which starts with 14 days free.',
  needBoth: 'Add both quotes to compare them.',
  same: 'These are the same quote — add the other studio’s.',
  unreadable: 'We couldn’t compare these two quotes — check that each one has priced lines.',
} as const
