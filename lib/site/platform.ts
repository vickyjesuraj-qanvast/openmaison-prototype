import { site } from './model'

/*
 * (pending modules S35) The Platform registry — 1.0's src/components/landing/v2/platform-data.tsx: the three pillars and the eight module pages, the
 * one source the mega-menu, the home page's pillar blocks, the Platform hub and every module page read. 1.0's copy, in 2.0's names (AI Visualizer,
 * 3D Space Planner, Upload a quote, Meeting Copilot, Maison AI, the client portal), with the claims 2.0 doesn't make taken out — each changed
 * sentence is listed in steps/outcome-S35.md. Icons are 2.0's own for each module (the rail's and Tools' glyphs), drawn on 1.0's glass tiles.
 * (S42E, E-01…E-04 · call E·1 as recommended) Each module says what 2.0 does today, feature by feature: the co-pilot reads the notes the studio
 * types (no listening), Upload a quote reads a quote's spreadsheet or PDF, Maison AI answers from the records and offers the next step for you to
 * confirm, the AI Visualizer restyles a room photo in seconds — every changed line is listed in steps/outcome-S42E.md.
 */

export type PillarId = 'design' | 'margin' | 'operations'
export type ModuleSlug = 'visualizer' | 'space-planner' | 'upload-a-quote' | 'finance' | 'leads' | 'projects' | 'meeting-copilot' | 'maison-ai'

export type Pillar = { id: PillarId; index: string; eyebrow: string; name: string; promise: string; blurb: string }
export type ModuleStep = { title: string; desc: string }
/** A capability card: a picture of it at the card's top (1.0's illustration) — or, when a module's cards don't all have one, its icon on every card. */
export type ModuleCapability = { title: string; desc: string; icon: string; image?: string; tag?: string }
export type RelatedCard = { slug: ModuleSlug; title: string; blurb: string }
export type PlatformModule = {
  slug: ModuleSlug
  href: string
  pillar: PillarId
  name: string
  /** 2.0's glyph for the module (Material Symbols, in the subset). */
  icon: string
  menuBlurb: string
  headline: string
  subcopy: string
  stepsHeading: string
  steps: ModuleStep[]
  capabilitiesHeading: string
  capabilities: ModuleCapability[]
  whyHeading: string
  whyBody: string
  relatedHeading: string
  relatedDescription: string
  relatedCards: RelatedCard[]
  ctaHeading: string
  ctaDescription: string
}

export const PILLARS: Record<PillarId, Pillar> = {
  design: {
    id: 'design', index: '03', eyebrow: 'PILLAR 03 · DESIGN MEETINGS', name: 'Design Meetings',
    promise: 'Show them the home before it exists.',
    blurb: 'Create and edit renders from your room photos. Win clients with your vision and expertise, not just your price.',
  },
  margin: {
    id: 'margin', index: '02', eyebrow: 'PILLAR 02 · FINANCE', name: 'Finance',
    promise: 'Protect your margins, from quote to completion.',
    blurb: 'Upload or create a quote, and OpenMaison flags low-margin items in seconds. Once work begins, finances, commissions, and variation orders stay organised in one place.',
  },
  operations: {
    id: 'operations', index: '01', eyebrow: 'PILLAR 01 · CLIENTS & PROJECTS', name: 'Clients & Projects',
    promise: 'Every client. Every project. One workspace.',
    blurb: 'Leads from every source automatically appear in your workspace. Tasks, chats, and project details stay together, so you never miss a thing.',
  },
}
/** 1.0's order: Clients & Projects, Finance, Design Meetings. */
export const PILLAR_ORDER: PillarId[] = ['operations', 'margin', 'design']

const WHY = { heading: 'Fits into your workflow. Makes it better.', body: 'No lengthy setup or complicated migration. OpenMaison fits the way your studio already works, so your team starts seeing results from day one.' }
const CTA = { heading: 'Grow your studio. Not the admin.', description: 'See how OpenMaison helps your team win more projects, protect profit and deliver a better client experience.' }
const RELATED = 'Complete your workflow'
/* (S43B · F1-03 — his "fix all the pending things" 2026-10-15, as recommended) Every capability picture is now a capture of 2.0's own screens,
   taken from the production build on the demo's records (design-source/verify/pending-modules/capture-site-pictures-s43b.cjs re-takes them) —
   1.0's illustrations showed what 2.0 doesn't do (an "AI suggestion" box, a 6-second plan in weeks, "Lead moved to Quote Created", a "client
   hub", 4K renders). The lines beside them say what each screen does. */
const IMG = (p: string) => `/site/marketing/${p}`

export const MODULES: PlatformModule[] = [
  /* ── Pillar 03 · Design Meetings ─────────────────────────────────────── */
  {
    slug: 'visualizer', href: site('/platform/visualizer'), pillar: 'design', name: 'AI Visualizer', icon: 'wand_shine', menuBlurb: 'Life-like renders',
    headline: 'Sell the vision, not just the quotation.',
    subcopy: 'For design discussions clients actually understand. Upload a room photo and change it in seconds. Swap materials, experiment with furniture, explore layouts and more.',
    stepsHeading: 'Step 4: Client says yes.',
    steps: [
      { title: 'Upload a photo.', desc: 'Start with a photo of the actual space.' },
      { title: 'Explore possibilities.', desc: 'Change elements or the entire vibe in seconds.' },
      { title: 'Render and share.', desc: 'Generate a life-like render and share it straight to your client portal.' },
    ],
    capabilitiesHeading: '~~Sketch~~ Visualise.',
    capabilities: [
      { title: 'Auto element detection', desc: 'AI identifies walls, floor, surface design & more, so you can start swapping.', icon: 'crop_free', image: IMG('visualiser/auto-detection.jpg') },
      { title: 'Material library', desc: 'Choose from our curated finishes or easily upload your own.', icon: 'palette', image: IMG('visualiser/material-library.jpg') },
      { title: 'Quick, life-like renders', desc: 'Renders you can iterate even during client meetings.', icon: 'image', image: IMG('visualiser/renders.jpg') },
      { title: 'Easy sharing', desc: 'Send concepts to your client’s portal — they pick a favourite and pin a note on anything they’d change.', icon: 'share', image: IMG('visualiser/sharing.jpg') },
    ],
    whyHeading: WHY.heading, whyBody: WHY.body,
    relatedHeading: RELATED, relatedDescription: 'Explore more OpenMaison features built for persuasive design conversations.',
    relatedCards: [{ slug: 'space-planner', title: 'Editable, real floor plans', blurb: 'Powered by 3D Space Planner' }],
    ctaHeading: CTA.heading, ctaDescription: CTA.description,
  },
  {
    slug: 'space-planner', href: site('/platform/space-planner'), pillar: 'design', name: '3D Space Planner', icon: 'space_dashboard', menuBlurb: 'Layout planning simplified',
    headline: 'Drag. Drop. Done.',
    subcopy: 'Create a presentable 3D layout in minutes. Start with our preset HDB or condo floor plans. Then experiment freely while our collision detector keeps layouts realistic.',
    stepsHeading: 'Client-ready 3D layouts',
    steps: [
      { title: 'Pick a template.', desc: 'Real HDB and condo layouts are preloaded for you.' },
      { title: 'Arrange the space.', desc: 'Drag and place furniture from a catalogue. Auto collision detector keeps you real.' },
      { title: 'Present in 3 angles.', desc: 'Easily switch between dollhouse, top view and perspective. Then render to send.' },
    ],
    capabilitiesHeading: 'Designed to feel effortless.',
    capabilities: [
      { title: 'Local templates', desc: 'Get a head start with our library of real HDB and condo floor plans.', icon: 'grid_view', image: IMG('space-planner/templates.jpg') },
      { title: 'Smart placement', desc: 'Furniture snaps to walls and collision detection prevents impossible layouts.', icon: 'chair', image: IMG('space-planner/smart-placement.jpg') },
      { title: 'Three camera views', desc: 'Top, 3D and Walk views for easy planning and presentation.', icon: 'photo_camera', image: IMG('space-planner/camera-views.jpg') },
      { title: 'Render and share', desc: 'Turn the floor plan into a polished visual, then share it to your client’s portal.', icon: 'send', image: IMG('space-planner/render-share.jpg') },
    ],
    whyHeading: WHY.heading, whyBody: WHY.body,
    relatedHeading: RELATED, relatedDescription: 'Explore more OpenMaison features built for persuasive design conversations.',
    relatedCards: [{ slug: 'visualizer', title: 'Life-like renders in seconds', blurb: 'Powered by AI Visualizer' }],
    ctaHeading: CTA.heading, ctaDescription: CTA.description,
  },

  /* ── Pillar 02 · Finance ─────────────────────────────────────────────── */
  {
    slug: 'upload-a-quote', href: site('/platform/upload-a-quote'), pillar: 'margin', name: 'Upload a quote', icon: 'upload_file', menuBlurb: 'Margin check before signing',
    headline: 'Know your margin before you sign.',
    subcopy: 'Upload your quote — a spreadsheet or a PDF — and see every line’s margin. Spot under-quoted work and improve margins in under one minute.',
    stepsHeading: 'Better margins in 60 seconds.',
    steps: [
      { title: 'Upload your quote.', desc: 'Drop in a spreadsheet or a PDF, and every line comes back ready to edit, with its margin.' },
      { title: 'Improve margins.', desc: 'Review under-quoted items, so you never leave money on the table.' },
      { title: 'Get approval and share.', desc: 'Add an optional internal sign-off before the updated quote is shared with your client.' },
    ],
    capabilitiesHeading: 'For quotes loved by designers and finance.',
    /* (S35) Two of 1.0's four pictures named what 2.0 doesn't do (regional benchmarks, add-on picks) — so this grid wears every card's icon */
    capabilities: [
      { title: 'Line-item extraction', desc: 'Turn a quote — a spreadsheet or a PDF — into structured, editable line items.', icon: 'description' },
      { title: 'Margin check', desc: 'See your margin on every line, with a flag wherever a price looks thin.', icon: 'trending_up' },
      { title: 'Quote X-Ray', desc: 'Drop in a quote — yours or a competitor’s — and see straight through it.', icon: 'scan' },
      { title: 'Approval workflow', desc: 'Match your studio’s approval workflow with optional internal sign-offs.', icon: 'approval' },
    ],
    whyHeading: WHY.heading, whyBody: WHY.body,
    relatedHeading: RELATED, relatedDescription: 'Explore more OpenMaison features built for healthier profits.',
    relatedCards: [{ slug: 'finance', title: 'Real-time P&L for projects', blurb: 'Powered by Finance & Margins' }],
    ctaHeading: CTA.heading, ctaDescription: CTA.description,
  },
  {
    slug: 'finance', href: site('/platform/finance'), pillar: 'margin', name: 'Finance & Margins', icon: 'account_balance_wallet', menuBlurb: 'Live per-project P&L',
    headline: 'Always know where your margins stand.',
    subcopy: 'See real-time margins across every project and generate finance-ready reports. Get the complete picture with commissions, variation orders and GST built-in.',
    stepsHeading: 'Project finances, made simple.',
    steps: [
      { title: 'Your data, connected.', desc: 'Quotes, invoices and expenses sync automatically from across your studio.' },
      { title: 'Monitor margins.', desc: 'Per-project margins update in real-time as costs, changes and payments flow in.' },
      { title: 'Close the books with confidence.', desc: 'Generate financial reports, calculate commissions and settle variation orders with ease.' },
    ],
    capabilitiesHeading: 'The numbers that other tools miss.',
    capabilities: [
      { title: 'Live P&L', desc: 'No month-end surprises. See profit and loss in real-time.', icon: 'bar_chart', image: IMG('finance/live-pl.jpg') },
      { title: 'Per-project margins', desc: 'Know exactly which projects are in the green and which need attention.', icon: 'analytics', image: IMG('finance/project-margins.jpg') },
      { title: 'Financial modelling', desc: 'Factor in commissions & variation orders to protect your bottom line.', icon: 'payments', image: IMG('finance/modelling.jpg') },
      { title: 'Finance-ready reports', desc: 'Every report from GST, profitability to AR/AP ageing, at your fingertips.', icon: 'receipt_long', image: IMG('finance/reports.jpg') },
    ],
    whyHeading: WHY.heading, whyBody: WHY.body,
    relatedHeading: RELATED, relatedDescription: 'Explore more OpenMaison features built for healthier profits.',
    relatedCards: [{ slug: 'upload-a-quote', title: 'Check quotes for margin leaks', blurb: 'Powered by Upload a quote' }],
    ctaHeading: CTA.heading, ctaDescription: CTA.description,
  },

  /* ── Pillar 01 · Clients & Projects ──────────────────────────────────── */
  {
    slug: 'leads', href: site('/platform/leads'), pillar: 'operations', name: 'Leads', icon: 'people_alt', menuBlurb: 'Every enquiry in one place',
    headline: 'Never miss a lead.',
    subcopy: 'Leads from Qanvast, Houzz, and your Gmail appear in one workspace, so you can respond faster and convert more.',
    stepsHeading: 'Three steps, no learning curve.',
    steps: [
      { title: 'Leads come to you.', desc: 'Enquiries from all sources automatically flow into one workspace.' },
      { title: 'You intuitively prioritise.', desc: 'See budget, source, location, days in stage and more.' },
      { title: 'You convert with confidence.', desc: 'Track progress in one place, from first contact to getting the e-signature.' },
    ],
    capabilitiesHeading: 'Features built for real studio workflows.',
    /* (S35) 1.0's pipeline picture wore hot / warm / cold labels — 2.0 dropped a lead's temperature (Q-10) — so this grid wears every card's icon */
    capabilities: [
      { title: 'Multi-source lead capture', desc: 'Top lead sources supported: Qanvast, Houzz and Gmail.', icon: 'mail' },
      { title: 'Customisable pipeline view', desc: 'Organise deals by stage, or switch to a simple list view.', icon: 'view_kanban' },
      { title: 'Built-in e-signature & chat', desc: 'Secure e-signing from any device. And entire chat history in one place.', icon: 'signature' },
    ],
    whyHeading: WHY.heading, whyBody: WHY.body,
    relatedHeading: RELATED, relatedDescription: 'Explore other OpenMaison features that turn leads into successful projects.',
    relatedCards: [
      { slug: 'projects', title: 'Automated project schedules', blurb: 'Powered by Projects' },
      { slug: 'meeting-copilot', title: 'AI guidance during meetings', blurb: 'Powered by Meeting Copilot' },
      { slug: 'maison-ai', title: 'Instant answers across your studio', blurb: 'Powered by Maison AI' },
    ],
    ctaHeading: CTA.heading, ctaDescription: CTA.description,
  },
  {
    slug: 'projects', href: site('/platform/projects'), pillar: 'operations', name: 'Projects', icon: 'business_center', menuBlurb: 'Automated project plans',
    headline: 'Project schedules that inspire client confidence.',
    subcopy: 'Turn an approved quote into a Gantt-style plan in seconds. Then give clients their own project view for an organised, professional experience.',
    stepsHeading: 'Plan. Manage. Deliver.',
    steps: [
      { title: 'Project plan, created for you.', desc: 'AI turns your approved quote into a Gantt-style project schedule in seconds.' },
      { title: 'Stay on track, effortlessly.', desc: 'Assign work, update milestones, and your schedule updates automatically.' },
      { title: 'Clients in the loop, always.', desc: 'Progress updates flow automatically to your branded client portal.' },
    ],
    capabilitiesHeading: 'Everything you need for timely project delivery.',
    capabilities: [
      { title: 'One-click project plan', desc: 'Maison AI drafts a schedule with milestones from your signed quote — you check it before it lands.', icon: 'auto_awesome', image: IMG('projects/ai-plan.jpg') },
      { title: 'Gantt-style project management', desc: 'Drag and drop tasks to manage. Dependencies and timelines update automatically.', icon: 'calendar_month', image: IMG('projects/gantt.jpg') },
      { title: 'Branded client portal', desc: 'A polished client experience for quotes, updates and more, all customised to your studio’s branding.', icon: 'share', image: IMG('projects/client-hub.jpg') },
      { title: 'Project health alerts', desc: 'Late milestones, overdue payments and what waits on you rise to the top early, giving your team the time to course-correct.', icon: 'warning', image: IMG('projects/health-alerts.jpg') },
    ],
    whyHeading: WHY.heading, whyBody: WHY.body,
    relatedHeading: RELATED, relatedDescription: 'Explore other OpenMaison features that turn leads into successful projects.',
    relatedCards: [
      { slug: 'leads', title: 'All enquiries in one place', blurb: 'Powered by Leads' },
      { slug: 'meeting-copilot', title: 'AI guidance during meetings', blurb: 'Powered by Meeting Copilot' },
      { slug: 'maison-ai', title: 'Instant answers across your studio', blurb: 'Powered by Maison AI' },
    ],
    ctaHeading: CTA.heading, ctaDescription: CTA.description,
  },
  {
    slug: 'meeting-copilot', href: site('/platform/meeting-copilot'), pillar: 'operations', name: 'Meeting Copilot', icon: 'analytics', menuBlurb: 'Convert better with AI',
    headline: 'Win more meetings with AI by your side.',
    subcopy: 'Your co-pilot reads your notes as you type — tips, a deal score and a running estimate, while your client never sees a thing.',
    stepsHeading: 'Three steps to better meetings.',
    steps: [
      { title: 'Turn on your AI.', desc: 'Launch co-pilot before your client arrives. They never see a thing.' },
      { title: 'Get guided as you go.', desc: 'Type what’s said, and tips appear on your screen as whisper cards.' },
      { title: 'Finish with confidence.', desc: 'The estimate, deal score and notes are ready the moment you wrap up.' },
    ],
    capabilitiesHeading: 'Your meeting toolkit for the AI era.',
    capabilities: [
      /* (S42E, E-01) 1.0's "Live transcript" card (its picture a recording's waveform) — 2.0 reads typed or pasted notes, so the card says that and
         wears its icon; with one card unpictured, the grid wears every card's icon (S35's one look per grid) */
      { title: 'Notes in, brief out', desc: 'Type or paste what’s said — your co-pilot turns it into a brief and a follow-up.', icon: 'notes' },
      { title: 'Coaching whisper cards', desc: 'Private nudges to handle objections, upsell confidently and more.', icon: 'lightbulb' },
      { title: 'Live deal scoring', desc: 'Your co-pilot weighs signals like budget, urgency, trust & more as your notes grow.', icon: 'analytics' },
      { title: 'Running estimate', desc: 'Built from your notes, it grows as you discuss scope.', icon: 'request_quote' },
    ],
    whyHeading: WHY.heading, whyBody: WHY.body,
    relatedHeading: RELATED, relatedDescription: 'Explore other OpenMaison features that turn leads into successful projects.',
    relatedCards: [
      { slug: 'leads', title: 'All enquiries in one place', blurb: 'Powered by Leads' },
      { slug: 'projects', title: 'Automated project schedules', blurb: 'Powered by Projects' },
      { slug: 'maison-ai', title: 'Instant answers across your studio', blurb: 'Powered by Maison AI' },
    ],
    ctaHeading: CTA.heading, ctaDescription: CTA.description,
  },
  {
    slug: 'maison-ai', href: site('/platform/maison-ai'), pillar: 'operations', name: 'Maison AI', icon: 'auto_awesome', menuBlurb: 'Instant answers across studio',
    headline: 'Ask a question. Your AI business analyst answers.',
    subcopy: 'Ask about your leads, projects and money in plain English — Maison AI answers from your records, draws the numbers, and offers the next step for you to confirm.',
    stepsHeading: 'Stop searching. Start asking.',
    steps: [
      { title: 'Ask naturally.', desc: 'Ask questions like “What’s our revenue this quarter?” in plain English.' },
      { title: 'Get the answer.', desc: 'Maison AI answers from your studio’s records across leads, projects and finance.' },
      { title: 'Say yes to the next step.', desc: 'It drafts messages, adds tasks and records, and asks you to confirm each one, all from the same conversation.' },
    ],
    capabilitiesHeading: 'Everything your AI analyst can do.',
    capabilities: [
      { title: 'Cross-team intelligence', desc: 'Can connect the dots between data from leads, projects and finance to answer with full context.', icon: 'layers', image: IMG('maison-bot/cross-intel.jpg') },
      { title: 'Get work done', desc: 'Beyond answers, it drafts messages, adds tasks and updates records — each offered for you to confirm.', icon: 'task_alt', image: IMG('maison-bot/actions.jpg') },
    ],
    whyHeading: WHY.heading, whyBody: WHY.body,
    relatedHeading: RELATED, relatedDescription: 'Explore other OpenMaison features that turn leads into successful projects.',
    relatedCards: [
      { slug: 'leads', title: 'All enquiries in one place', blurb: 'Powered by Leads' },
      { slug: 'projects', title: 'Automated project schedules', blurb: 'Powered by Projects' },
      { slug: 'meeting-copilot', title: 'AI guidance during meetings', blurb: 'Powered by Meeting Copilot' },
    ],
    ctaHeading: CTA.heading, ctaDescription: CTA.description,
  },
]

export const getModule = (slug: string): PlatformModule | undefined => MODULES.find((m) => m.slug === slug)
export const modulesByPillar = (pillar: PillarId): PlatformModule[] => MODULES.filter((m) => m.pillar === pillar)
/** (S35) A module's capability grid draws pictures only when every card has one (one look per grid) — else every card's icon. */
export const showsPictures = (m: PlatformModule) => m.capabilities.every((c) => !!c.image)

/* ── The Platform hub's own copy (1.0's platform-hub.tsx) ────────────────────────────────────────────────────────────────────────── */
export const HUB_PILLAR_ORDER: PillarId[] = ['margin', 'design', 'operations']
export const HUB_PILLAR_COPY: Record<PillarId, { eyebrow: string; headline: string; blurb: string }> = {
  margin: { eyebrow: 'Finance', headline: 'AI that protects your margins.', blurb: 'Keep every project profitable, track it from quote to completion.' },
  design: { eyebrow: 'Design meetings', headline: 'Visualise ideas at the speed of conversation.', blurb: 'Finally, clients can understand your vision and say ‘yes’ faster.' },
  operations: { eyebrow: 'Clients & projects', headline: 'Connected client journey, from lead to delivery.', blurb: 'Spend less time coordinating and more time delighting clients.' },
}
export const HUB_CARD_COPY: Record<ModuleSlug, string> = {
  'upload-a-quote': 'Upload your quote and see every line’s margin. Spot underquoted work and improve margins.',
  finance: 'Track margins, commissions, variation orders and taxes in real time, with finance-ready reports always a click away.',
  visualizer: 'Transform room photos into editable, life-like concepts in seconds. Swap materials, furniture, lighting and more.',
  'space-planner': 'Create presentation-ready layouts in minutes using real, local floor plans.',
  leads: 'Enquiries from all sources automatically appear in one place, so you can respond faster and convert more.',
  'meeting-copilot': 'Your AI meeting companion reads your notes as you take them and shares conversion tips, without interrupting the conversation.',
  projects: 'Turn approved quotes into a project schedule in seconds. Then give clients a branded, automated view of their project’s progress.',
  'maison-ai': 'Ask questions in plain English and get instant answers from across your business. Uncover insights, then take the next step when you say so.',
}
export const HUB_MATRIX: { dim: string; stack: string; us: string }[] = [
  { dim: 'Leads', stack: 'Inbox + Spreadsheet', us: 'Auto-captured from all sources' },
  { dim: 'Quotes', stack: 'Manually created & checked', us: 'Margin check on every line, upload your own quote' },
  { dim: 'Design', stack: 'Separate render and layouting tool', us: 'Built-in visualiser and 3D planner' },
  { dim: 'Projects', stack: 'Trello + Spreadsheet', us: 'Built-in project management. Convert quote to plan with a click.' },
  { dim: 'Customer updates', stack: 'Whatsapp, email, spreadsheet', us: 'Branded client portal for all updates & documents.' },
  { dim: 'Finance', stack: 'Xero, Reconciliation post project', us: 'Real-time P&L and finance-ready reports' },
  { dim: 'Meetings', stack: 'Memory + Written notes', us: 'Turns your meeting notes into a brief and a next step' },
  { dim: 'Analytics', stack: 'Ask finance, managers', us: 'AI answers your business questions' },
  { dim: 'AI', stack: 'A chatbot, maybe', us: 'Answers your questions and does the next step when you say so' },
]
export const HUB_INTEGRATIONS: { icon: string; label: string }[] = [
  { icon: 'mail', label: 'Gmail lead capture' },
  { icon: 'link', label: 'Qanvast · Homereno · Houzz' },
  { icon: 'account_balance', label: 'Accounting export' },
  { icon: 'signature', label: 'E-signature' },
]
export const HUB_SUPPORT: { icon: string; title: string; body: string }[] = [
  { icon: 'group', title: 'Real people, not bots.', body: 'Friendly experts who help you on WhatsApp/email/in-person, with clear updates and honest timelines.' },
  { icon: 'menu_book', title: 'Personalised onboarding.', body: 'We get your team set up with in-person or online onboarding, tailored to your workflow.' },
  { icon: 'lightbulb', title: 'We build with our customers.', body: 'Your feedback shapes the product. The best ideas make it into OpenMaison.' },
]

/*
 * 1.0's per-module FAQs (MODULE_FAQS) — kept as 1.0 kept them: data for the on-page FAQ and its FAQPage schema, neither drawn ("removed from
 * feature pages for now per team review — restoring is a render-side change only"). In 2.0's words; the answers 2.0 can't give are out.
 */
export const MODULE_FAQS: Record<ModuleSlug, { q: string; a: string }[]> = {
  visualizer: [
    { q: 'Do I need to model the room first?', a: 'No. You upload a photo of the actual space and the Visualizer detects the surfaces on its own. There’s no 3D modelling step.' },
    { q: 'Can clients see the renders?', a: 'Yes. Push any render to the client portal and the homeowner can view, react and keep it on file.' },
    { q: 'What can I change in a render?', a: 'Flooring, wall finishes, paint, cabinetry and other surfaces. Pick from the built-in library or load your own samples.' },
  ],
  'space-planner': [
    { q: 'Does it have real HDB and condo layouts?', a: 'Yes. You start from templates that match how homes here are actually built, instead of a blank grid.' },
    { q: 'Will it stop me placing furniture that doesn’t fit?', a: 'Collision detection keeps pieces from overlapping and snaps them to walls, so the plan stays buildable.' },
    { q: 'Can I present the plan to a client?', a: 'Switch between dollhouse, top-down and room views, then render the plan into a clean visual to share.' },
  ],
  'upload-a-quote': [
    { q: 'How fast is it?', a: 'A typical quote, as a spreadsheet or a PDF, comes back as structured line items in seconds.' },
    { q: 'How does it know a line is under-priced?', a: 'It reads each line’s cost and price and flags the ones that sell below cost or on a thin margin before you send the quote.' },
    { q: 'Can someone review it before it goes out?', a: 'Yes. Quotes route through an approval step, so nothing leaves the studio under-priced by accident.' },
  ],
  finance: [
    { q: 'Is the profit figure live?', a: 'Yes. Per-project margin and studio P&L update as quotes, invoices and expenses come in, so you don’t wait for month-end.' },
    { q: 'Does it handle commissions and variation orders?', a: 'Both. You can model a payout or a change order and see the margin impact before you commit to it.' },
    { q: 'What reports does it produce?', a: 'Ten, including P&L, GST, AR/AP aging and per-project profitability, the ones your accountant tends to ask for.' },
  ],
  leads: [
    { q: 'Where do the leads come from?', a: 'Qanvast, Houzz and your own inbox feed in automatically, so you’re not copying enquiries by hand.' },
    { q: 'Can clients sign on their phone?', a: 'Yes. Send a quote for e-signature and the client reviews and signs from their phone; it stays attached to the lead.' },
  ],
  projects: [
    { q: 'Where does the plan come from?', a: 'An approved quote turns into a milestone timeline automatically, so you’re not rebuilding the schedule from scratch.' },
    { q: 'Do clients get updates?', a: 'Progress updates flow to the client portal on their own, so you stop fielding ‘any update?’ messages.' },
    { q: 'What happens when a timeline slips?', a: 'The system flags slipping milestones and unhappy signals early, before they turn into a real problem.' },
  ],
  'meeting-copilot': [
    { q: 'Can the client see it?', a: 'No. The co-pilot is visible only to you during the meeting; the client sees a normal conversation.' },
    { q: 'What does it actually do mid-meeting?', a: 'It reads the notes you type, surfaces coaching cards at the right moment, scores the deal across six dimensions and builds a running quote estimate.' },
    { q: 'What do I leave the meeting with?', a: 'A shadow quote estimate and a deal score, ready the moment you wrap up.' },
  ],
  'maison-ai': [
    { q: 'Is this just a chatbot?', a: 'No. It reads across your leads, projects and finances to answer with real data, and it offers actions like creating a task or drafting a follow-up for you to confirm.' },
  ],
}
