/**
 * Batch 5 blog articles.
 * Topics: OpenMaison vs Houzz Pro comparison, AI meeting co-pilot deep dive.
 */

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

export const BATCH_5_ARTICLES: BlogArticle[] = [
  // ━━━ Article 1: OpenMaison vs Houzz Pro ━━━━━━━━━━━━━━━━━━━━━
  {
    slug: "open-maison-vs-houzz-pro",
    title: "OpenMaison vs Houzz Pro compared",
    excerpt:
      "An honest comparison of two interior design studio platforms. One is the incumbent with deep US roots. The other is the newcomer built for Asia-Pacific with AI at its core. We build one of them, and we'll tell you upfront where the other one wins.",
    category: "Comparison",
    keywords: [
      "OpenMaison vs Houzz Pro",
      "Houzz Pro alternative",
      "best interior design studio software",
      "Houzz Pro review 2026",
      "interior design CRM Singapore",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T10:00:00+08:00",
    readTime: "9 min read",
    heroImage: "/site/covers/open-maison-vs-houzz-pro.jpg",
    heroAlt: "Two laptops on a designer's desk showing different studio management platforms",
    keyStats: [
      { label: "Houzz Pro monthly cost", value: "$99–159/mo", source: "Houzz.com pricing page, March 2026" },
      { label: "Houzz Pro listed businesses (US)", value: "2.7 million+", source: "Houzz 2024 annual report" },
      { label: "Finance reports in OpenMaison", value: "10", source: "OpenMaison product documentation" },
    ],
    relatedSlugs: ["interior-design-studio-tech-stack-2026", "ai-meeting-copilot-design-sales"],
    sections: [
      {
        heading: "A disclosure before we start",
        content: `<p>We build OpenMaison. We have every incentive to make it look good in this comparison. You should read this article knowing that, and weigh our claims accordingly.</p>
<p>What we've tried to do is be genuinely fair. Houzz Pro is a mature product that has earned its user base. There are scenarios where it's clearly the better pick. We'll say so when that's the case, and we'll point out where OpenMaison falls short too.</p>
<p>If you want a truly neutral take, the best approach is to trial both. Houzz Pro offers a free trial. OpenMaison is free to start. You can form your own opinion without committing.</p>`,
      },
      {
        heading: "What each platform actually is",
        content: `<p>Houzz Pro launched in 2020 as an extension of Houzz, the home design marketplace that had already built a massive consumer audience in the US. The platform bundles project management, invoicing, 3D floor plans, a client-facing website builder, and access to the Houzz marketplace where homeowners browse and find designers. It's priced at $99 per month for the Essential plan and $159 per month for the Ultimate plan.</p>
<p>OpenMaison launched in 2025. It's a studio operating system built for Singapore's studios. The core difference is AI across the studio: the Meeting Copilot, which turns the notes you take in a client consultation into tips, a deal score and a brief; Upload a quote, which reads a contractor's quote into editable line items; and the AI Visualizer, which restyles a room photo in seconds. It's free to start, with paid plans for growing teams.</p>
<p>They share some DNA. Both try to replace the WhatsApp-plus-Excel approach that most studios still rely on. Both offer project management, invoicing, and some form of design visualisation. The differences are in where they invest their engineering effort, which markets they optimise for, and how much they cost.</p>`,
      },
      {
        heading: "The feature comparison",
        content: `<p>Here's a side-by-side breakdown of what each platform covers. This table reflects publicly available information as of March 2026.</p>
<table>
<thead>
<tr><th>Feature</th><th>Houzz Pro ($99–159/mo)</th><th>OpenMaison</th></tr>
</thead>
<tbody>
<tr><td>CRM / lead management</td><td>Yes, with lead tracking and pipeline</td><td>Yes, a stage-by-stage kanban with auto follow-up tasks</td></tr>
<tr><td>Project management</td><td>Yes, task lists and scheduling</td><td>Yes, interactive Gantt chart with drag-to-edit milestones</td></tr>
<tr><td>Invoicing</td><td>Yes, with payment processing</td><td>Yes, with milestone-based auto-generation</td></tr>
<tr><td>Tax handling</td><td>US-centric (sales tax)</td><td>Singapore GST (9%)</td></tr>
<tr><td>Purchase orders</td><td>Limited</td><td>Full PO lifecycle with the vendor's own link and delivery tracking</td></tr>
<tr><td>Variation orders</td><td>No</td><td>Yes, with margin impact simulation</td></tr>
<tr><td>Commission tracking</td><td>No</td><td>Yes, per-member rules with payout recording</td></tr>
<tr><td>3D floor plans</td><td>Yes, built-in floor planner</td><td>Yes, a 3D editor with collision detection</td></tr>
<tr><td>Room visualisation / renders</td><td>Yes, mood boards and basic renders</td><td>Yes, life-like AI renders from a room photo</td></tr>
<tr><td>Marketing website builder</td><td>Yes (a genuine strength)</td><td>No</td></tr>
<tr><td>Marketplace / lead source</td><td>Yes, Houzz marketplace (huge in the US)</td><td>Leads from Qanvast; no homeowner marketplace</td></tr>
<tr><td>AI meeting co-pilot</td><td>No</td><td>Yes, coaching cards and deal scoring from your meeting notes</td></tr>
<tr><td>AI quote reading (Upload a quote)</td><td>No</td><td>Yes, a contractor's quote read into structured line items</td></tr>
<tr><td>AI project planner</td><td>No</td><td>Yes, generates timelines from quote data</td></tr>
<tr><td>Quote e-signing</td><td>Yes</td><td>Yes, token-based client signing flow</td></tr>
<tr><td>Chat / messaging</td><td>Built-in client messaging</td><td>Client messages with ticket tracking</td></tr>
<tr><td>Multi-region support</td><td>US-focused, some international</td><td>Singapore, with its property types and compliance</td></tr>
<tr><td>Team roles and permissions</td><td>Yes</td><td>Yes, Owner, Admin, Designer and Accounting roles, with who sees which leads</td></tr>
<tr><td>Compliance checklists</td><td>No</td><td>Yes, HDB and Singapore's renovation rules</td></tr>
<tr><td>API / integrations</td><td>QuickBooks, some third-party</td><td>Xero, Gmail auto-ingest, webhooks</td></tr>
</tbody>
</table>`,
      },
      {
        heading: "Where Houzz Pro wins",
        content: `<p>If your studio is based in the US, Houzz Pro is hard to beat. The platform sits on top of the Houzz marketplace, which has over 2.7 million listed home professionals and a massive consumer audience. That marketplace is a lead source by itself. You're not just getting software; you're getting distribution.</p>
<p>Houzz Pro's website builder is also a genuine differentiator. You can create a professional-looking portfolio site that connects directly to your Houzz profile and funnels enquiries into your CRM. OpenMaison doesn't have anything equivalent. If generating inbound leads from a marketing website matters to you, and you don't already have a site you're happy with, that's a real gap.</p>
<p>Maturity counts for something too. Houzz Pro has been in market since 2020. The product is stable, the documentation is extensive, and there's a large community of users sharing tips. OpenMaison shipped its first version in 2025. We iterate fast, but we haven't had six years of user feedback shaping the product.</p>
<p>Client collaboration is another area where Houzz Pro is polished. The client portal lets homeowners view mood boards, approve selections, track project progress, and make payments. It's a smooth experience that looks professional.</p>`,
      },
      {
        heading: "Where OpenMaison wins",
        content: `<p>The AI gap is the most obvious difference. Houzz Pro has no AI features. OpenMaison builds them into every module, and they're not gimmicks bolted on for marketing purposes. The Meeting Copilot, for instance, reads what the designer types during a client conversation and surfaces coaching cards only the designer can see. Upload a quote reads a contractor's quote into editable line items with margin percentages. The project planner generates Gantt timelines from quote data. These tools save measurable hours per week.</p>
<p>Pricing is also different. Houzz Pro's Essential plan costs $99 per month, and the Ultimate plan costs $159 per month. OpenMaison is free to start, so you can put the AI tools to work before you commit to a plan.</p>
<p>Local fit matters too. OpenMaison handles Singapore's 9% GST natively. Property types are Singapore's: HDB 3-Room, 4-Room, 5-Room and Executive, condos and landed homes. The Compliance Navigator knows about HDB renovation permits. Houzz Pro is built for the American market. It works internationally, but you'll notice the seams.</p>
<p>The finance module goes deeper than most competitors. Full purchase order lifecycle with vendor acknowledgment portal, variation orders with margin impact simulation, expense tracking with approval workflows, and commission management with per-member rules. For studios that struggle with the money side of running a business (which is most of them), this matters.</p>`,
      },
      {
        heading: "Who should pick which",
        content: `<p>Pick Houzz Pro if you're a US-based studio that values marketplace exposure and client-facing marketing tools. The Houzz ecosystem gives you lead generation that no standalone software can match in the American market. If you need a portfolio website and don't want to manage one separately, the built-in website builder saves you from dealing with Squarespace or WordPress. And if you prefer a product that's been field-tested for six years with a large user community, the stability is reassuring.</p>
<p>Pick OpenMaison if you're based in Singapore and want AI tools that actually reduce admin hours. If your team spends significant time digitising quotes manually, writing follow-up messages, or losing details from client meetings, the AI features address those problems directly. Starting free makes it easy to evaluate before committing. And if your finance headaches involve GST, vendor POs, and variation orders rather than US sales tax, the regional fit is meaningful.</p>
<p>There's also a middle ground: some studios use Houzz Pro for its marketplace and lead generation while running their operations on a different platform. The tools don't integrate natively, but if the Houzz marketplace is your primary lead source, it might be worth the cost of running both.</p>`,
      },
      {
        heading: "The honest bottom line",
        content: `<p>Houzz Pro is a good product. It's been around longer, it's more polished in some areas, and the marketplace integration is something we can't replicate. If you're in the US and the Houzz ecosystem is important to your business, it's probably the right choice.</p>
<p>OpenMaison is a younger product with a different bet: that AI will do more for studio productivity than marketplace access, and that Asia-Pacific studios deserve software built for their tax codes, property types, and compliance requirements. We think that bet is right, but we would say that.</p>
<p>Try both. Houzz Pro has a free trial. OpenMaison is free to start. Make your own call.</p>`,
      },
    ],
  },

  // ━━━ Article 2: AI meeting co-pilot ━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: "ai-meeting-copilot-design-sales",
    title: "The AI meeting co-pilot: a new category for design sales",
    excerpt:
      "What happens when an AI reads your consultation notes as you take them and feeds you coaching prompts, deal signals, and a running cost estimate, all invisible to the client? We built one. Here's what it does and where it still falls short.",
    category: "Product",
    keywords: [
      "AI meeting assistant interior design",
      "design consultation AI",
      "AI sales assistant",
      "meeting co-pilot designer",
      "meeting notes intelligence",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T10:30:00+08:00",
    readTime: "8 min read",
    heroImage: "/site/covers/ai-meeting-copilot-design-sales.jpg",
    heroAlt: "Designer and client at a consultation table with a tablet showing data visualisations",
    keyStats: [
      { label: "Average design consultation length", value: "45–60 min", source: "OpenMaison internal data, 200+ sessions" },
      { label: "Deal score dimensions tracked", value: "6", source: "OpenMaison co-pilot documentation" },
      { label: "Post-meeting brief generation time", value: "Under 60 seconds", source: "OpenMaison co-pilot documentation" },
    ],
    relatedSlugs: ["open-maison-vs-houzz-pro", "interior-design-studio-tech-stack-2026"],
    sections: [
      {
        heading: "The problem with design consultations",
        content: `<p>A typical first meeting between an interior designer and a prospective client runs 45 to 60 minutes. During that time, the client describes their home, their budget (sometimes vaguely), their style preferences (often contradictory), their timeline, which rooms matter most, and a dozen smaller details about flooring preferences and whether they want a kitchen island.</p>
<p>The designer is doing three jobs simultaneously: building rapport, gathering requirements, and mentally estimating whether the project is financially viable. Most of the time, they're scribbling notes on a pad or into their phone, hoping they'll remember what "the client liked but maybe not in that colour" actually referred to.</p>
<p>After the meeting, they sit down and try to reconstruct what happened. They write a follow-up email. They put together a rough quote. They decide whether the lead is worth pursuing or if the budget doesn't match the wishlist. This post-meeting admin often takes 30 to 45 minutes on top of the meeting itself.</p>
<p>The result is that every consultation generates roughly 90 minutes of total time, and a lot of what the client said gets lost or simplified in the handoff from memory to notes to spreadsheet.</p>`,
      },
      {
        heading: "What a meeting co-pilot actually does",
        content: `<p>A meeting co-pilot is software that runs on the designer's phone or laptop during a client meeting. It reads what the designer types as the conversation runs, or a transcript they paste. It processes what's being said. And it surfaces information, prompts, and estimates to the designer as the notes grow. The client doesn't see any of it.</p>
<p>Think of it as a knowledgeable colleague sitting next to you, one who's read every quote your studio has ever sent, knows Singapore market rates for every renovation item, and can whisper suggestions in your ear without the client noticing.</p>
<p>In concrete terms, here's what happens during a session on OpenMaison's Meeting Copilot:</p>
<p>The designer opens the co-pilot and acknowledges a consent prompt (the client should be informed that meeting notes are being taken, though the AI cards are only visible to the designer). Then they type what's said as it is said.</p>
<p>As the conversation runs, the co-pilot reads the notes so far, the running conversation context, and the studio's project data, then produces several outputs: AI coaching cards, deal signal updates, quote item estimates, and style keyword detections. Each of these feeds a different part of the designer's display.</p>`,
      },
      {
        heading: "Six types of cards",
        content: `<p>The co-pilot surfaces information as cards. Each card has a type and a brief explanation. Here's what each type looks like in practice:</p>
<ul>
<li><strong>Whisper cards</strong> are coaching prompts. If the client mentions a tight timeline, the card might say: "Timeline concern detected. Consider mentioning your express renovation package." These are the most common card type.</li>
<li>When the conversation touches a scope area that has common add-ons, an upsell card appears. Say the client wants new kitchen cabinets. The co-pilot surfaces: "Premium pull-out organiser with soft-close, ~S$2,800."</li>
<li>Objection cards trigger on negative sentiment. When a client says something like "that sounds expensive" or "I'm not sure about the timeline," the card suggests a response strategy. These tend to be short and direct, a reframe, not a script.</li>
<li><strong>Alert cards</strong> are the highest-priority type. Budget mismatch is the most common trigger: the client describes a full-home renovation but mentions a budget that would barely cover the kitchen.</li>
<li>Every time the client describes a new scope item, a quote update card appears with a cost estimate. "Kitchen island mentioned, estimated S$3,000–S$5,000." The estimate pulls from a table of Singapore market rates, built from averaged Qanvast platform data.</li>
<li>Finally, visual cards suggest showing the client a portfolio piece or generating a mood board when style keywords appear. "Client mentioned Scandinavian and warm wood tones. Show portfolio match?"</li>
</ul>`,
      },
      {
        heading: "Deal scoring and the shadow quote",
        content: `<p>Behind the cards, two other systems run continuously.</p>
<p>The deal scorer tracks six dimensions of how likely the lead is to convert: Budget (weighted at 25%), Trust (20%), Decision-making authority (20%), Timeline (15%), Style alignment (10%), and Scope clarity (10%). Each dimension is scored from 0 to 1 based on what the co-pilot picks up from the notes. The weighted total maps to a 0-100 score and a tier: Hot (80+), Warm (60-79), Cool (40-59), or Cold (below 40).</p>
<p>The shadow quote is a running cost estimate built from everything the client mentions. As the client describes each room and each item, the system matches keywords against Singapore market rates and adds line items to an invisible quote. By the end of the meeting, the designer has a rough estimate, grouped by category (Kitchen, Bedroom, Living Room, Bathroom, Common), without having opened a spreadsheet.</p>`,
      },
      {
        heading: "What happens after the meeting",
        content: `<p>When the designer ends the session, the co-pilot writes a post-meeting brief within 60 seconds, from the full notes, the cards raised during the meeting, the shadow quote items, the deal score history and the customer context.</p>
<p>The output includes:</p>
<ul>
<li>A narrative summary of what was discussed</li>
<li>A customer profile (budget, preferences, decision factors)</li>
<li>The final deal score with a breakdown across all six dimensions</li>
<li>A quote estimate with per-category subtotals</li>
<li>Suggested next actions (specific to what came up in the meeting)</li>
<li>A drafted follow-up message ready to send</li>
<li>Identified upsell opportunities with estimated values</li>
</ul>
<p>The designer can save the brief to the lead record with one tap. That action updates the lead's details, attaches the quote estimate, and creates a follow-up task with the suggested timeline. The entire post-meeting admin, which used to take 30-45 minutes, collapses to a few seconds of review.</p>`,
      },
      {
        heading: "Limitations and honest caveats",
        content: `<p>The co-pilot works well in a specific context, and we should be clear about where it doesn't.</p>
<p><strong>It reads only what is written.</strong> The co-pilot works from the notes typed or pasted during the meeting. It doesn't listen to the conversation itself, so a point that never reaches the notes never reaches a card. The quality of the cards is directly tied to the notes: a designer who types the client's own words, budget and dates gets the most out of it.</p>
<p>What about the cost estimates? They are approximations. The shadow quote pulls from a table of Singapore renovation items with min/max/typical price ranges. These are averaged from Qanvast platform data, useful as ballpark figures during a conversation, but they are not a substitute for a proper quote.</p>
<p><strong>Privacy requires care.</strong> Notes about a client are personal data. Our implementation asks the designer to confirm the client knows notes are being taken before starting, and the notes stay with the lead. A recording, if the studio keeps one, sits in the lead's files like any other file. But the ethical responsibility for how this tool is used sits with the studio, not with us.</p>
<p>If typing during the meeting doesn't suit, the designer can write it up afterwards: paste the notes or a transcript, and the same brief, deal score and estimate come from them.</p>
<p>We built this tool because we think the interior design consultation is one of the highest-value moments in the entire project lifecycle, and it's also the moment with the least software support. Designers are expected to sell, listen, estimate, and remember, all at once. The co-pilot makes the designer's own judgment better-informed.</p>`,
      },
    ],
  },
]
