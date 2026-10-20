import type { ModuleSlug } from './platform'

/*
 * (pending modules S35) What's New — 1.0's src/components/landing/v2/changelog-data.ts: the curated record of releases, newest first, grouped by
 * month. 1.0's copy in 2.0's names; a highlight 2.0 doesn't do is out (and the release with nothing left of it — multi-currency reporting; the
 * markets beyond Singapore are his hold, 2026-10-12 — so that release keeps only its lead lines). Each change is listed in steps/outcome-S35.md.
 * (S42E, E-01 · E-03 · E-04 — call E·1 as recommended) The co-pilot's listening lines, Maison AI's "anything" and the Visualizer's
 * "photorealistic" said as 2.0 does them today; each change is listed in steps/outcome-S42E.md.
 * Server-safe data.
 */

export type ReleaseArea = 'quotes' | 'finance' | 'leads' | 'projects' | 'portal' | 'ai' | 'platform' | 'security'
export const AREA_LABEL: Record<ReleaseArea, string> = {
  quotes: 'Quotes', finance: 'Finance', leads: 'Leads & CRM', projects: 'Projects', portal: 'Client Portal', ai: 'AI', platform: 'Platform', security: 'Security',
}
export type Release = {
  id: string
  /** YYYY-MM-DD, for <time>, display and order */
  date: string
  month: string
  status: 'new' | 'improved'
  areas: ReleaseArea[]
  title: string
  summary: string
  highlights: string[]
  /** a landmark release's product picture — the module's own (one release per module) */
  moduleSlug?: ModuleSlug
  featured?: boolean
}

export const RELEASES: Release[] = [
  /* ── July 2026 ── */
  {
    id: 'payment-receipts', date: '2026-07-31', month: 'July 2026', status: 'new', areas: ['finance', 'portal'],
    title: 'Receipts, the moment a payment lands',
    summary: 'Record a payment and your client gets a numbered receipt on your letterhead — without you writing the email.',
    highlights: [
      'Every payment you record sends the client a receipt, numbered in your studio’s own sequence.',
      'They open a branded receipt page and download the PDF; it also files itself in their portal next to their quote and contract.',
      'Payments you recorded before today can produce a receipt too — pull one up from the payment history whenever a client asks.',
      'Prefer to send receipts yourself? Turn them off in your notification settings.',
    ],
  },
  {
    /* (S42 closing tidy-up, REG-2278 — S42F's note) 2.0 reads no screenshot: the contact log's Auto Fill is a declared stand-in (REG-319) and
       a chat picture has no words to read by rule, so this release says what logging does — the proof, the next call as a follow-up task, the
       suggested tasks — and no longer wears the AI area. */
    id: 'log-outreach-ai', date: '2026-07-20', month: 'July 2026', status: 'new', areas: ['leads'],
    title: 'Log your outreach — with the proof and the next follow-up',
    summary: 'Every call, message and email you make to a lead, captured with proof — and the next follow-up set as you log it.',
    highlights: [
      'Log any outreach attempt with a file or screenshot as evidence, backdated if you’re catching up.',
      'Set the next call or meeting as you log it — it becomes a follow-up task, and the suggested tasks are a tick away.',
      'Message a client on WhatsApp straight from the lead.',
      'One clean timeline of every attempt and piece of evidence on the lead.',
    ],
  },
  {
    id: 'maison-live-rebuilt', date: '2026-07-19', month: 'July 2026', status: 'new', areas: ['ai'],
    title: 'The Meeting Copilot, rebuilt',
    summary: 'The meeting co-pilot is faster, calmer and far more capable — from the notes you type to a brief that does the after-meeting admin for you.',
    highlights: [
      'A redesigned mission-control view on desktop, and a focused split view on mobile.',
      'The deal score and the running quote estimate, always in view.',
      'A post-meeting brief hub: turn the conversation into a saved lead update, a draft quote for your designer, mood boards for the portal, and a ready-to-send follow-up.',
    ],
    moduleSlug: 'meeting-copilot', featured: true,
  },
  {
    id: 'visualiser-upgrades', date: '2026-07-17', month: 'July 2026', status: 'improved', areas: ['ai'],
    title: 'The AI Visualizer gets much sharper',
    summary: 'More control over exactly what changes in a render — and far less friction getting a photo in.',
    highlights: [
      'Restyle a whole room in one pass, or target only the surfaces you choose.',
      'Upload photos straight from your phone, including iPhone HEIC/HEIF.',
      'Lighting presets and sharper renders.',
      'Remove an object with a tap, and share to the portal in one tap.',
      'A redesigned, tile-based workspace.',
    ],
  },
  {
    id: 'quote-pricing-controls', date: '2026-07-16', month: 'July 2026', status: 'improved', areas: ['quotes'],
    title: 'More ways to price a quote',
    summary: 'Present pricing exactly the way your studio quotes.',
    highlights: [
      'Price a whole category as a single lump sum.',
      'Mark line items as included or free-of-charge (F.O.C.).',
      'Flexible numbering — section letters, per-subsection numbers, or none at all.',
      'Reorder categories with a drag, and the PDF follows.',
    ],
  },
  {
    id: 'leads-on-track', date: '2026-07-16', month: 'July 2026', status: 'new', areas: ['leads'],
    title: 'Leads that keep themselves on track',
    summary: 'The pipeline reflects the work you’re actually doing.',
    highlights: [
      'Put a lead on hold and resume it exactly where it left off.',
      'Every lead tracks how fast it was assigned, first contacted and won.',
      'A new Performance view for owners: median response, outreach and conversion times across the team.',
    ],
  },
  {
    id: 'milestone-invoicing', date: '2026-07-15', month: 'July 2026', status: 'improved', areas: ['finance'],
    title: 'Milestone invoicing you can trust',
    summary: 'Billing that stays right as the project moves.',
    highlights: [
      'Milestone invoices generate from the schedule with no blank lines and no duplicates.',
      'Invoices and milestones stay in sync when scope changes.',
    ],
  },
  {
    id: 'reliable-notifications', date: '2026-07-14', month: 'July 2026', status: 'improved', areas: ['platform'],
    title: 'Notifications you can count on',
    summary: 'Know that the right people heard about it.',
    highlights: [
      'Get notified on every lead stage change, not only when a lead is assigned.',
      'See delivery status for your WhatsApp and email notifications.',
      'More reliable delivery, with automatic retries.',
    ],
  },
  {
    id: 'change-orders-in-builder', date: '2026-07-07', month: 'July 2026', status: 'new', areas: ['finance'],
    title: 'Change orders in the quote builder',
    summary: 'The install date slips, the client adds a feature wall, a wardrobe gets dropped. Change is just how renovation works — so pricing it should feel effortless.',
    highlights: [
      'Price a change in one place: add and remove work in a single variation order, right inside the quote builder you already use.',
      'Watch the revised contract total update live as you edit.',
      'One tidy Variation Orders view across projects and finance.',
    ],
    moduleSlug: 'finance',
  },
  {
    id: 'variation-orders-rebuilt', date: '2026-07-03', month: 'July 2026', status: 'improved', areas: ['finance'],
    title: 'Variation orders, rebuilt',
    summary: 'A cleaner way to price and approve changes to a signed contract.',
    highlights: [
      'Combine added and omitted work in a single variation order.',
      'See exactly how each affected invoice adjusts, before and after.',
      'Owner-final approval on every variation.',
    ],
  },
  {
    id: 'one-quote-pdf', date: '2026-07-02', month: 'July 2026', status: 'improved', areas: ['quotes'],
    title: 'One quote PDF, everywhere',
    summary: 'Your client sees the same, consistent quote wherever they open it.',
    highlights: [
      'Identical document in the editor, on the signing page and in the client portal.',
      'The payment schedule now renders inside the quote PDF.',
      'Faster, more reliable PDF generation.',
    ],
  },

  /* ── June 2026 ── */
  {
    id: 'faster-app-analytics', date: '2026-06-29', month: 'June 2026', status: 'improved', areas: ['platform'],
    title: 'A faster app',
    summary: 'The app feels quicker across the board.',
    highlights: [
      'Creating leads and moving around the app is noticeably snappier.',
    ],
  },
  {
    id: 'data-protection', date: '2026-06-27', month: 'June 2026', status: 'improved', areas: ['security'],
    title: 'Enterprise-grade data protection',
    summary: 'A stronger foundation under everything your studio does.',
    highlights: [
      'Your studio’s data is fully isolated from every other studio’s, encrypted, and private by default.',
      'Sensitive documents open through secure, expiring links instead of public URLs.',
      'Access is controlled by role, right down to the individual.',
    ],
  },
  {
    id: 'tighter-finance', date: '2026-06-25', month: 'June 2026', status: 'improved', areas: ['finance'],
    title: 'Tighter finance, end to end',
    summary: 'The money side of a project stays accurate as things change.',
    highlights: [
      'Simpler, e-signed change orders and vendor purchase orders, with omissions handled as proper credits.',
      'One contract value — inclusive of tax and any discount — shown consistently everywhere.',
      'Commissions accrue automatically as milestones get paid.',
      'Corrected advance-payment calculations on purchase orders.',
    ],
  },
  {
    id: 'customization-live', date: '2026-06-15', month: 'June 2026', status: 'new', areas: ['platform'],
    title: 'Studio customization goes live',
    summary: 'Shape the product around the way your studio actually works.',
    highlights: [
      'Roles, permissions and approval workflows for the whole team.',
      'Run several companies from one studio, each with its own branding, numbering and tax.',
      'Your branding, applied consistently across the product.',
    ],
  },
  {
    id: 'space-planner', date: '2026-06-12', month: 'June 2026', status: 'new', areas: ['projects', 'ai'],
    title: 'Design the space in 3D',
    summary: 'Lay out a room in three dimensions, straight from a real floor plan.',
    highlights: [
      'Start from a real HDB or condo template.',
      'Drag furniture in, with collision detection keeping the layout honest.',
      'Three camera modes, ready to present.',
      'Turn a model into a walkthrough your client can explore.',
    ],
    moduleSlug: 'space-planner',
  },
  {
    id: 'richer-quote-editor', date: '2026-06-06', month: 'June 2026', status: 'new', areas: ['quotes'],
    title: 'A faster, richer quote editor',
    summary: 'Build beautiful, on-brand quotes faster than you could in a spreadsheet.',
    highlights: [
      'A full-screen, spreadsheet-fast grid: paste from Excel, fill a column down, and fly through with the keyboard.',
      'Add explanatory notes, images and section breaks between your pricing.',
      'Show your studio’s accreditations right on the quote.',
      'Add many catalogue items at once from your Price book.',
    ],
    moduleSlug: 'upload-a-quote',
  },
  {
    id: 'faster-leads-board', date: '2026-06-03', month: 'June 2026', status: 'improved', areas: ['leads'],
    title: 'A faster leads board',
    summary: 'The board stays smooth no matter how many leads you have.',
    highlights: [
      'The kanban and mobile lists render instantly, however long your pipeline gets.',
      'A lead’s history and details load the moment you open its card.',
    ],
    moduleSlug: 'leads',
  },

  /* ── May 2026 ── */
  {
    id: 'designable-documents', date: '2026-05-27', month: 'May 2026', status: 'new', areas: ['quotes'],
    title: 'Design your own quotes and documents',
    summary: 'Make everything your client receives unmistakably yours.',
    highlights: [
      'Fully designable quote PDFs: colours, typography, layout and your logo.',
      'Upload custom accreditation badges and designer signatures.',
      'One-click theme presets and a live preview.',
      'Manage every studio document template from one place.',
    ],
  },
  {
    id: 'homeowner-portal', date: '2026-05-14', month: 'May 2026', status: 'new', areas: ['portal', 'projects'],
    title: 'Bring your clients inside',
    summary: 'A branded home for every client to follow their project — and a clearer way for you to run it.',
    highlights: [
      'The client portal: clients sign in to a studio-branded space to see milestones, files, material selections and approvals, and to raise issues.',
      'Projects, reorganised: group by stage and spot at a glance which ones need attention.',
      'Tax handled correctly all the way from quote to invoice.',
    ],
    moduleSlug: 'projects', featured: true,
  },
  {
    id: 'quote-xray', date: '2026-05-14', month: 'May 2026', status: 'new', areas: ['quotes', 'ai'],
    title: 'X-ray any quote in seconds',
    summary: 'Drop in a quote — yours or a competitor’s — and see straight through it.',
    highlights: [
      'Every line read and sorted by trade.',
      'Spot the items a quote quietly leaves out.',
    ],
  },
  {
    id: 'meeting-copilot', date: '2026-05-13', month: 'May 2026', status: 'new', areas: ['ai'],
    title: 'An AI co-pilot in every meeting',
    summary: 'Invisible to your client, invaluable to you — the Meeting Copilot sits in the meeting and helps you close.',
    highlights: [
      'Private coaching cards at just the right moment, as you type what’s said.',
      'A six-dimension deal score that updates through the conversation.',
      'A running quote estimate, built from what’s discussed.',
      'A polished follow-up brief, ready within a minute of ending.',
    ],
  },
  {
    id: 'maison-bot', date: '2026-05-12', month: 'May 2026', status: 'new', areas: ['ai'],
    title: 'Ask your studio',
    summary: 'Maison AI is a business analyst that lives inside your studio — it reads your records, draws the numbers, and offers the next step for you to confirm.',
    highlights: [
      'Ask in plain language: revenue by project, a cash-flow forecast, this month’s P&L.',
      'It answers with the numbers and the chart, not just words.',
      'It can act too — create a lead, draft a follow-up, raise an invoice — once you say yes.',
    ],
    moduleSlug: 'maison-ai',
  },
  {
    id: 'multi-entity', date: '2026-05-07', month: 'May 2026', status: 'new', areas: ['finance'],
    title: 'Multi-entity studios',
    summary: 'Run several legal entities from one studio, each with its own identity.',
    highlights: [
      'Per-entity branding, bank details, numbering and tax.',
      'Choose the issuing entity on invoices, purchase orders, variation orders and expenses.',
      'Per-project-type timeline templates.',
    ],
  },
  {
    id: 'multi-doc-signing', date: '2026-05-06', month: 'May 2026', status: 'new', areas: ['quotes'],
    title: 'Sign everything in one flow',
    summary: 'Terms, contract and quote — reviewed and signed in a single guided session.',
    highlights: [
      'Your client steps through your terms and contract before reaching the quote.',
      'Phone-verified signing on any device — no account required.',
      'A signed PDF is generated and archived to the project automatically.',
    ],
  },
  {
    id: 'approvals-permissions', date: '2026-05-01', month: 'May 2026', status: 'new', areas: ['platform'],
    title: 'Approvals, permissions and beautiful emails',
    summary: 'Control who does what — and how work gets signed off.',
    highlights: [
      'Set each member’s role, and route quotes through approval before they go out.',
      'Every notification email now goes out beautifully co-branded as your studio.',
    ],
  },

  /* ── April 2026 ── */
  {
    id: 'quote-smarter', date: '2026-04-16', month: 'April 2026', status: 'new', areas: ['quotes', 'ai'],
    title: 'Quote smarter',
    summary: 'A rebuilt quoting engine that knows your prices and protects your margins.',
    highlights: [
      'Upload a quote, backed by your own Price book of managed rates.',
      'See your margin on every line, with a flag wherever a price looks thin.',
      'Draft an entire quote by describing the scope to Maison AI.',
      'Complete, reliable results every time, with a preview that fits your screen.',
    ],
  },
  {
    id: 'ai-visualiser-intro', date: '2026-04-14', month: 'April 2026', status: 'new', areas: ['ai'],
    title: 'Meet the AI Visualizer',
    summary: 'Show a client their finished room before a single wall is touched.',
    highlights: [
      'Upload a room photo and see it restyled in seconds.',
      'Automatic surface detection picks out floors, walls and cabinetry to restyle.',
      'Swap materials and finishes, then compare before and after with a slider.',
      'Send the result straight to the client portal.',
    ],
    moduleSlug: 'visualizer',
  },
  {
    id: 'every-market', date: '2026-04-13', month: 'April 2026', status: 'new', areas: ['platform', 'leads'],
    title: 'Never lose a lead',
    summary: 'Assign a whole team to a lead, and reach clients on WhatsApp.',
    highlights: [
      'Assign a whole team to a lead, with commissions split automatically.',
      'Reach clients on WhatsApp, and enjoy a cleaner leads board with an export you can trust.',
    ],
  },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "2026-07-07" → "Jul 7, 2026" (1.0's, parsed by hand — no timezone drift). */
export function releaseDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${MONTHS[Number(m) - 1] ?? ''} ${Number(d)}, ${y}`
}
/** The releases (newest first) in their months. */
export function releasesByMonth(list: Release[] = RELEASES): { month: string; items: Release[] }[] {
  const out: { month: string; items: Release[] }[] = []
  for (const r of list) {
    const last = out[out.length - 1]
    if (last && last.month === r.month) last.items.push(r)
    else out.push({ month: r.month, items: [r] })
  }
  return out
}
