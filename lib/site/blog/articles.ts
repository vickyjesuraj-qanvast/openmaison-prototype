import type { BlogArticle, BlogAuthor } from "./types"

// ─── Authors ────────────────────────────────────────────────────

const AUTHORS = {
  editorial: {
    name: "OpenMaison Editorial",
    role: "Product & Industry Research",
    linkedin: "https://www.linkedin.com/company/openmaison",
  } satisfies BlogAuthor,
}

// ─── Articles ───────────────────────────────────────────────────

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "interior-design-studio-tech-stack-2026",
    title: "The Interior Design Studio Tech Stack in 2026",
    excerpt:
      "Most studios run on WhatsApp, Excel, and 4 other disconnected apps. We looked at what actually works in 2026, from standalone tools to all-in-one platforms.",
    category: "Guide",
    keywords: [
      "interior design software",
      "best software for interior designers",
      "design studio management software",
      "interior design CRM",
      "studio tech stack 2026",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T08:00:00+08:00",
    readTime: "8 min read",
    heroImage: "/site/covers/tech-stack-2026.jpg",
    heroAlt: "Modern interior design studio workspace with multiple software tools on screen",
    keyStats: [
      { label: "Global ID software market (2025)", value: "$6.63 billion", source: "Business Research Company" },
      { label: "Projected market size (2030)", value: "$11.28 billion", source: "Business Research Company" },
      { label: "Designers using AI regularly", value: "82%", source: "Mattoboard 2025 Report" },
      { label: "AI in interior design market CAGR", value: "26.8%", source: "Research and Markets" },
    ],
    relatedSlugs: ["ai-transforming-interior-design", "hdb-renovation-cost-guide-2026"],
    sections: [
      {
        heading: "The problem: too many tools, not enough glue",
        content: `<p>Walk into most interior design studios in Singapore or Dubai and you'll find the same setup. WhatsApp for client chat. Excel for lead tracking. Google Drive for file sharing. A separate app for invoicing, another for project timelines, and maybe SketchUp or AutoCAD on top of all that.</p>
<p>That's 5-8 disconnected systems. No single view of a project. No way to pull a report without copying data between tabs.</p>
<p>We've talked to studio owners who estimate they spend <strong>12-15 hours per week</strong> on admin work that has nothing to do with design. That's almost two full working days, every week, just moving information from one app to another.</p>
<p>The global interior design software market sits at <strong>$6.63 billion in 2025</strong> and is projected to reach $11.28 billion by 2030 (Business Research Company). Designers don't want more tools. They want fewer tools that actually talk to each other.</p>`,
      },
      {
        heading: "Six things every studio needs software for",
        content: `<p>Whether you're a 3-person outfit or a 20-person firm, the functional needs are roughly the same:</p>
<ol>
<li><strong>CRM and lead management.</strong> Enquiries come from Qanvast, Homereno, Houzz, direct referrals, and your website. Someone needs to track them, follow up, and assign them to designers.</li>
<li><strong>Project management.</strong> Timelines, milestones, task lists, progress photos, client approvals. The stuff that keeps a renovation on track.</li>
<li><strong>Quoting and contracts.</strong> Turning a contractor's messy PDF into a clean proposal, getting the client to sign, tracking revisions when scope changes.</li>
<li><strong>Finance.</strong> Invoicing with the right tax rate (9% GST in Singapore, 5% VAT in Dubai), purchase orders to vendors, expense tracking, and figuring out who gets what commission.</li>
<li><strong>Design tools.</strong> Floor plans, 3D renders, mood boards. The visual work that clients actually see.</li>
<li><strong>Communication.</strong> Client messages and internal team chat, ideally without scrolling through 47 WhatsApp groups.</li>
</ol>
<p>Most studios piece these together from general-purpose apps. It works, until a lead falls through the cracks because nobody saw the WhatsApp message, or a project goes over budget because the invoicing app doesn't know about the variation order in the project app.</p>`,
      },
      {
        heading: "The mix-and-match approach",
        content: `<p>Here's what a typical standalone stack looks like:</p>
<p>For CRM, studios use HubSpot Free, Pipedrive, or (honestly, most often) a shared Google Sheet. Project management is usually Monday.com, Asana, Trello, or Notion. Quoting happens in Excel or Google Docs. Finance goes through Xero, QuickBooks, or Wave. Design tools range from SketchUp and AutoCAD to newer options like Foyr Neo ($29-99/mo) or Planner 5D ($5-99/mo). And communication? WhatsApp Business. Always WhatsApp Business.</p>
<p>Add up the subscriptions and you're looking at <strong>$150-400 per user per month</strong>. But the real cost isn't the subscriptions. It's the hours spent copying lead details from a Google Sheet into an invoicing app, or the moment someone realises a project went 20% over budget because the PO tracker and the project manager don't share data.</p>`,
      },
      {
        heading: "The all-in-one approach",
        content: `<p>A newer category of software bundles all six functions into one platform built specifically for design studios. There are a handful of serious options as of 2026:</p>
<p><strong>Houzz Pro</strong> ($99-159/mo) is the largest. Project management, invoicing, 3D floor plans, and a marketing website builder. It's strongest in the US. No AI features to speak of.</p>
<p><strong>Mydoma Studio</strong> ($49-99/mo) has over 20,000 users, mostly in North America. It's good at client collaboration, mood boards, and 3D rendering.</p>
<p><strong>Studio Designer</strong> leans hard into the financial side: proposals, vendor ordering, invoicing, time billing. If your biggest headache is accounting, this is worth a look.</p>
<p><strong>OpenMaison</strong> is the newest, and the one we build. It's designed for studios in Singapore. The difference is AI across the studio: the Meeting Copilot, Upload a quote and the AI Visualizer, plus a finance module that handles Singapore's GST natively. We're biased, obviously, so take that into account.</p>
<p>The advantage of any all-in-one platform is simple: when a lead converts to a project, the entire history follows. Budget discussions, quoted line items, the WhatsApp conversation about tile preferences. Nothing gets lost in a copy-paste between apps.</p>`,
      },
      {
        heading: "Where AI actually helps (and where it doesn't yet)",
        content: `<p>A 2025 Mattoboard report found that <strong>82% of professional designers now use AI tools regularly</strong>. But dig into what they're actually using it for, and it's mostly visualisation: generating room renders, trying out colour schemes, style explorations. The flashy stuff.</p>
<p>The less glamorous side of AI in studios is where the real time savings are. A few examples that are already working in production:</p>
<p>Quote digitisation. You upload a contractor's quote, and it comes back as a structured table with line items, categories, and unit prices. Beats manual data entry by a wide margin.</p>
<p>Lead scoring. Instead of treating every enquiry the same, the system looks at budget fit, project type, and how engaged the lead is, then surfaces the ones most likely to convert.</p>
<p>Meeting intelligence. This one is newer. An AI co-pilot reads your notes as you take them in a client consultation and surfaces coaching prompts, live deal scores, and rough quote estimates. Only you can see it. The client just sees a designer who's unusually well-prepared.</p>
<p>Compliance checking. Feed in a renovation plan and get back a checklist of what needs HDB approval in Singapore or DDA/Trakhees permits in Dubai. Not exciting. Very useful.</p>
<p>The AI in interior design market is worth <strong>$1.76 billion in 2026</strong>, growing to $4.55 billion by 2030 at 26.8% CAGR (Research and Markets). Most of that growth is in operational AI, not design AI. The money is in saving those 12-15 hours of weekly admin, not in generating prettier renders.</p>`,
      },
      {
        heading: "How to decide what's right for your studio",
        content: `<p>Count your tools first. If you're paying for more than three separate subscriptions, consolidation is probably worth investigating. Add up the subscription costs, then estimate how many hours per week your team spends moving data between them. That's your real cost.</p>
<p>Then figure out where you lose information. If leads go cold because nobody saw the follow-up reminder, your biggest gap is CRM. If projects go over budget because the invoicing system doesn't know about change orders, finance integration is your priority.</p>
<p>Finally, think about your market. A Singapore studio doing HDB renovations with 9% GST needs different software than a Dubai firm managing luxury villa projects with 5% VAT and multi-currency vendor payments. Feature count matters less than whether the tool actually fits how your business works day to day.</p>`,
      },
      {
        heading: "You don't have to change everything at once",
        content: `<p>Plenty of studios run on WhatsApp and Excel and do just fine. This isn't a "modernise or die" argument.</p>
<p>But if you're spending two days a week on admin that a connected system could handle in minutes, or if you've lost a lead because it sat in someone's inbox for a week, it's worth looking at what's out there. Start with the gap that's costing you the most. You can always add more later.</p>`,
      },
    ],
  },
]

// ─── The other articles ────────────────────────────────────────
export { BATCH_1_ARTICLES } from "./articles-batch-1"
export { BATCH_2_ARTICLES } from "./articles-batch-2"
export { BATCH_3_ARTICLES } from "./articles-batch-3"
export { BATCH_4_ARTICLES } from "./articles-batch-4"
export { BATCH_5_ARTICLES } from "./articles-batch-5"

// Re-export combined for convenience
import { BATCH_1_ARTICLES } from "./articles-batch-1"
import { BATCH_2_ARTICLES } from "./articles-batch-2"
import { BATCH_3_ARTICLES } from "./articles-batch-3"
import { BATCH_4_ARTICLES } from "./articles-batch-4"
import { BATCH_5_ARTICLES } from "./articles-batch-5"

export const ALL_BLOG_ARTICLES: BlogArticle[] = [
  ...BLOG_ARTICLES,
  ...BATCH_1_ARTICLES,
  ...BATCH_2_ARTICLES,
  ...BATCH_3_ARTICLES,
  ...BATCH_4_ARTICLES,
  ...BATCH_5_ARTICLES,
]

/** One article by its address, or none. */
export const articleOf = (slug: string): BlogArticle | undefined => ALL_BLOG_ARTICLES.find((a) => a.slug === slug)
