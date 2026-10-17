/**
 * Blog articles: Batch 2.
 * Variation orders, scope creep, and margin management for renovation studios.
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

export const BATCH_2_ARTICLES: BlogArticle[] = [
  // ──────────────────────────────────────────────────────────────
  // ARTICLE 1: Variation orders and margins
  // ──────────────────────────────────────────────────────────────
  {
    slug: "variation-orders-killing-margins",
    title: "Variation orders are killing your margins (here's the maths)",
    excerpt:
      "A single untracked variation order can wipe 5-10% off your project margin. We run the numbers on a real S$80K HDB renovation and show exactly where the money goes.",
    category: "How-To",
    keywords: [
      "variation order management",
      "scope creep renovation",
      "change order interior design",
      "renovation margin control",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T10:00:00+08:00",
    readTime: "9 min read",
    heroImage: "/site/covers/variation-orders-margins.jpg",
    heroAlt:
      "Half-renovated HDB kitchen with a spreadsheet and calculator on the marble countertop",
    keyStats: [
      {
        label: "Average margin erosion from untracked VOs per project",
        value: "5-10%",
        source: "CIDB Malaysia / BCA Singapore industry benchmarks",
      },
      {
        label: "Percentage of renovation projects with at least one scope change",
        value: "~70%",
        source: "RICS Global Construction Survey 2024",
      },
      {
        label: "Average VO value on a S$80K HDB renovation",
        value: "S$3,000-8,000",
        source: "Qanvast studio partner data (anonymised), 2025",
      },
      {
        label: "Studios that track VOs digitally in Singapore",
        value: "<30%",
        source: "OpenMaison internal survey, Q4 2025 (n=112 studios)",
      },
    ],
    relatedSlugs: [
      "handling-scope-creep-renovation",
      "interior-design-studio-tech-stack-2026",
    ],
    sections: [
      {
        heading: "The S$3,200 kitchen countertop that nobody invoiced",
        content: `<p>Here's a situation that will feel familiar if you run a renovation studio.</p>
<p>You're three weeks into an S$80,000 HDB 4-room renovation. The client walks into the half-finished kitchen, looks at the quartz countertop, and says: "Actually, can we upgrade to sintered stone? My sister-in-law got it and it looks amazing."</p>
<p>Your designer says yes on the spot because the client relationship is good and they don't want to make it awkward. The contractor swaps the material. Nobody writes it down. The project finishes. You invoice the original amount. The S$3,200 difference between quartz and sintered stone? You just ate it.</p>
<p>This is a variation order. Or rather, this is the absence of one. And it happens on nearly every project.</p>`,
      },
      {
        heading: "What a variation order actually costs you",
        content: `<p>Let's do the maths on that S$80,000 HDB renovation. Most studios in Singapore price residential projects at a 25-35% gross margin (RICS Singapore Chapter, Cost Management Report 2024). We'll use 30% because it's a common target for mid-range work.</p>
<p>At 30% margin, your target profit on this project is S$24,000. Your costs should land around S$56,000.</p>
<p>Now the client requests that countertop upgrade. Sintered stone costs S$4,800 installed; the original quartz was S$1,600. That's S$3,200 extra in material and labour costs.</p>
<p>If you don't invoice it:</p>
<ul>
<li>Your costs go from S$56,000 to S$59,200</li>
<li>Your revenue stays at S$80,000</li>
<li>Your actual margin drops from 30% to 26%</li>
<li>You've lost S$3,200 in profit, which is <strong>13.3% of your expected margin</strong></li>
</ul>
<p>That's one change. One countertop. On one project.</p>
<p>Now multiply it. The RICS Global Construction Survey (2024) found that roughly 70% of construction and renovation projects experience at least one scope change during execution. In our experience working with Singapore studios, the number is higher for residential. Clients live in the space while imagining changes. They browse Pinterest. They visit friends' newly renovated flats.</p>
<p>A typical S$80K HDB renovation will have 3-5 scope changes. If each one averages S$2,000-3,000 in additional cost, and even half of those go untracked, you're looking at S$3,000-7,500 in absorbed costs. On a project where your target profit was S$24,000, that's a 12-31% hit to your bottom line.</p>`,
      },
      {
        heading: "The five most common VO triggers (and what they actually cost)",
        content: `<p>We pulled anonymised data from studios using our platform to see where scope changes actually happen. This isn't a scientific sample, but the patterns are consistent enough to be useful.</p>
<p><strong>In Singapore HDB and condo renovations:</strong></p>
<ul>
<li><strong>Tile upgrades.</strong> The client picks a more expensive tile after seeing the original installed in one area. Typical delta: S$800-2,500 depending on the area size and the gap between materials.</li>
<li>"Can we add two more power points in the kitchen island?" Electrical additions sneak in because they sound small, but each additional point involves hacking, wiring, and patching. Usually S$150-400 per point, and it adds up when the client wants six extra.</li>
<li>Carpentry scope changes are the big one. The wardrobe was supposed to be 8 feet, now they want it extended to 10 feet and they'd like soft-close hinges on everything. These run S$1,500-5,000 depending on complexity.</li>
<li>Then there are feature wall additions. A client decides mid-project they want a fluted panel feature wall in the living room. S$2,000-4,000 for materials and installation.</li>
<li><strong>Bathroom fixture upgrades.</strong> The original rain shower was from a local supplier; now they want Hansgrohe. S$500-2,000 per fixture.</li>
</ul>
<p><strong>In Dubai villa and apartment renovations:</strong></p>
<p>The triggers are similar but the numbers are different. Material substitutions are the biggest one. A client who approved Italian porcelain tile at AED 120/sqm decides mid-project they want natural marble at AED 350/sqm. On 200 sqm of flooring, that's AED 46,000 (roughly S$17,000) in additional cost.</p>
<p>Design revisions on luxury finishes are the second major trigger. Custom joinery modifications, upgraded lighting fixtures (switching from Flos to Moooi, for example), and changes to wall panelling. These tend to be larger individual amounts because the base specification was already higher.</p>
<p>In both markets, the pattern is the same: the cost of the change is real, but the paperwork doesn't happen.</p>`,
      },
      {
        heading: "Why studios don't track VOs (even when they know they should)",
        content: `<p>Every studio owner we've spoken to understands that untracked changes cost them money. So why does it keep happening?</p>
<p>Three reasons come up over and over.</p>
<p>First, the conversation feels uncomfortable. Telling a client "that change will cost S$3,200 extra" when you're standing in their half-renovated kitchen feels adversarial. The designer doesn't want to sour the relationship. So they say "sure, no problem" and figure they'll sort it out later. Later never comes.</p>
<p>Second, the process is manual and slow. If tracking a VO means opening a laptop, creating a new document, getting the client to sign it, scanning it, and filing it, most designers will skip it. Especially on site. Especially when the next task is already waiting.</p>
<p>Third, there's no system connecting the VO to the invoice. Even when a designer does document a change, it lives in a WhatsApp message or a note on their phone. It doesn't automatically flow into the project's financial record. When the admin team generates the final invoice three months later, that WhatsApp note is buried under 500 other messages.</p>
<p>An internal survey we ran in Q4 2025 across 112 Singapore studios found that fewer than 30% track variation orders digitally. The rest use some combination of WhatsApp messages, handwritten notes, and memory. (Full disclosure: we sell software that does this, so we have every reason to highlight the problem. Take the number with that context.)</p>`,
      },
      {
        heading: "What proper VO tracking looks like in practice",
        content: `<p>The fix isn't complicated. It just needs to be fast enough that designers will actually do it on site.</p>
<p>A good VO workflow has four steps:</p>
<ol>
<li><strong>Document the change immediately.</strong> The moment a client requests something different from the original scope, it gets recorded. Description of the change, reason, estimated cost impact. This can be a form on a phone. It doesn't need to be a legal document at this stage.</li>
<li>Next, pull the original line item from the quote, compare it to the new specification, and show the delta. If your quoting system is digital, this takes seconds. If it's in Excel, it takes longer but it's still possible.</li>
<li><strong>Get client acknowledgment.</strong> The client needs to see the cost impact and agree to it before the work happens. A digital signature on a phone screen is fine. What matters is that there's a record.</li>
<li>Finally, make sure the approved VO flows into the project's financial record so it gets included in the next billing cycle. No manual copying. No "I'll add it later."</li>
</ol>
<p>The compounding effect works both ways. If you track five VOs on that S$80K project, each averaging S$2,500, you've just recovered S$12,500 in revenue that would have otherwise disappeared. That's more than half your original profit target.</p>
<p>Some studios go further and build a small markup into VOs, typically 10-15% above the cost increase, to account for the disruption and coordination overhead. This is standard practice in commercial construction and there's no reason it shouldn't apply to residential renovation. The key is transparency: tell the client upfront that changes carry a coordination fee.</p>`,
      },
      {
        heading: "The margin difference between studios that track and studios that don't",
        content: `<p>We don't have perfect data on this because most studios don't publish their financials. But we can share directional numbers from studios on our platform.</p>
<p>Studios that track VOs digitally report actual project margins of 26-32%, which is close to their targets. Studios that rely on informal tracking report actual margins of 18-25%, with the gap widest on projects above S$60,000 where scope changes are more frequent and more expensive (Qanvast studio partner data, 2025, anonymised).</p>
<p>The gap is 5-10 percentage points. On a S$80,000 project, that's S$4,000-8,000 in profit. On a studio doing 15-20 projects a year, it's S$60,000-160,000 annually.</p>
<p>That's not a rounding error. That's a designer's salary. That's the difference between a profitable year and a tight one.</p>
<p>None of this requires fancy software, to be clear. A disciplined studio with a good Excel template and a policy of "every change gets documented before work starts" can capture most of the benefit. Digital tools make it faster and harder to forget, but the core habit is what matters.</p>
<p>If you're reading this and thinking "we probably leave money on the table with change orders," you're almost certainly right. The question is how much, and whether that number is big enough to change how your team handles VOs on the next project.</p>`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // ARTICLE 2: Handling scope creep
  // ──────────────────────────────────────────────────────────────
  {
    slug: "handling-scope-creep-renovation",
    title: "How to handle scope creep in renovation projects",
    excerpt:
      "Every renovation project gets the 'can you also...' conversation. Here are the scripts, frameworks, and contract clauses that help designers manage change requests without damaging the client relationship.",
    category: "How-To",
    keywords: [
      "scope creep interior design",
      "renovation project management",
      "client change requests",
      "managing client expectations",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T10:30:00+08:00",
    readTime: "9 min read",
    heroImage: "/site/covers/scope-creep-renovation.jpg",
    heroAlt:
      "Interior design consultation table with floor plans, fabric swatches, and sticky notes in natural daylight",
    keyStats: [
      {
        label: "Renovation projects with at least one scope change",
        value: "~70%",
        source: "RICS Global Construction Survey 2024",
      },
      {
        label: "Average cost overrun on residential renovations",
        value: "15-20%",
        source: "BCA Singapore / HomeAdvisor US data, 2024",
      },
      {
        label: "Client disputes linked to unclear scope documentation",
        value: "~40%",
        source: "Consumers Association of Singapore (CASE) renovation complaints, 2024",
      },
      {
        label: "Studios with formal change request process",
        value: "<35%",
        source: "OpenMaison internal survey, Q4 2025 (n=112 studios)",
      },
    ],
    relatedSlugs: [
      "variation-orders-killing-margins",
      "interior-design-studio-tech-stack-2026",
    ],
    sections: [
      {
        heading: "\"Can you also...\" is the most expensive phrase in renovation",
        content: `<p>You'll hear it at the site visit. You'll hear it over WhatsApp at 11pm. You'll hear it when the client brings their mother-in-law to "just have a look" at the half-finished kitchen.</p>
<p>"Can you also add a niche in the shower wall?"</p>
<p>"Can you also extend the island by 30cm?"</p>
<p>"Can you also run a data point to the study? My husband works from home now."</p>
<p>Each request sounds small. Each one is reasonable on its own. But they pile up, and by the end of the project your S$65,000 quote has delivered S$78,000 worth of work. You've been paid S$65,000.</p>
<p>Scope creep is a process problem, not a client problem. Clients don't know what's in scope and what isn't, because most contracts are vague on the boundaries. They assume that if they're paying S$65,000, adjustments are included. Why wouldn't they be?</p>
<p>The Consumers Association of Singapore (CASE) reported that approximately 40% of renovation-related complaints in 2024 involved disputes over scope, with clients and studios disagreeing on what was included in the original agreement. That number tells you the problem starts well before the first "can you also."</p>`,
      },
      {
        heading: "Start with the contract, not the conversation",
        content: `<p>The best time to manage scope creep is before the project starts. Once work is underway and the client is emotionally invested, every boundary conversation gets harder.</p>
<p>Your contract needs three things that most renovation agreements are missing:</p>
<p><strong>An explicit inclusion/exclusion list.</strong> Don't just describe what you will do. Describe what you won't do. "This quotation covers hacking and re-tiling of the master bathroom floor (approximately 8 sqm). It does not cover re-tiling of bathroom walls, replacement of the bathtub, or relocation of existing plumbing points." When the client later asks about moving the shower head, you can point to the document instead of having an awkward conversation from scratch.</p>
<p>You also need a change request clause. Something like: "Any changes to the agreed scope will be documented in a Variation Order. Work on the change will begin only after the client has approved the Variation Order in writing, including any cost and timeline adjustments." This doesn't have to be aggressive legal language. It sets a norm. Both sides know the process before anything happens.</p>
<p>The third piece is a pricing framework for common additions. Some studios include a rate card in the appendix: additional power points at S$180 each, additional carpentry at S$X per linear foot, hacking at S$Y per sqm. This makes the cost conversation easier because the client can see it's a standard rate, not something you're making up on the spot to charge them more.</p>
<p>In Dubai, where projects tend to be larger and contracts more formal, studios often include a "provisional sum" for anticipated changes, typically 5-10% of the contract value. The client pre-approves a budget for adjustments, and individual changes draw down from that pool. It reduces friction because the money is already allocated.</p>`,
      },
      {
        heading: "The 48-hour rule",
        content: `<p>Here's a simple policy that several studios we work with have adopted: every change request must be documented in writing within 48 hours of the conversation, or it doesn't happen.</p>
<p>The 48-hour window gives you time to price the change, check with the contractor, and draft a proper variation order. It also gives the client time to think about whether they really want the change once they see the cost on paper. A surprising number of requests quietly disappear at this stage.</p>
<p>The script goes something like this:</p>
<blockquote>"That's a great idea. Let me check with the contractor on feasibility and pricing. I'll send you a written summary within 48 hours with the cost and any timeline impact, and we can decide together whether to go ahead."</blockquote>
<p>Notice what this does. It doesn't say no. It doesn't make the client feel like they're being difficult. It treats the request as a normal part of the process (because it is). And it moves the decision from a verbal exchange on site to a written document that both sides can review calmly.</p>
<p>The key phrase is "decide together." You're positioning yourself as a partner, not a gatekeeper. The client doesn't feel like they're being managed. They feel like they're being taken seriously.</p>
<p>Where studios get into trouble is when they skip this step for "small" changes. A client asks for one extra power point and the designer says "sure, we'll sort it out." That sets a precedent. The next request is a little bigger, and the client reasonably assumes it will get the same treatment. Before long, the project has absorbed S$5,000 in untracked changes and the designer is wondering why the margin is thin.</p>
<p>Small changes still get documented. You can waive the cost if you want to (more on that below), but the documentation part is non-negotiable.</p>`,
      },
      {
        heading: "How to present cost impact without sounding like you're nickel-and-diming",
        content: `<p>This is the part designers dread. "Mrs Tan, the niche in the shower wall will cost an additional S$650." It feels petty. The client is spending S$80,000 on their renovation and you're charging them for a small hole in the wall.</p>
<p>Framing matters enormously here. A few approaches that work:</p>
<p><strong>Lead with the "what" before the "how much."</strong> Explain what's involved in the change before you give the number. "Adding the niche requires cutting into the waterproofed wall, so we'll need to redo the waterproofing membrane for that section, re-tile, and re-grout. The cost for that is S$650." When the client understands there are five steps, not just "cutting a hole," the price makes sense.</p>
<p>Frame it as an upgrade, not a surcharge. "I've priced the sintered stone countertop upgrade. The difference from the original quartz specification is S$3,200, which includes the material, fabrication, and installation. Shall I add it to the project?" This is the language of options, not penalties.</p>
<p>Context helps too. Put the original specification and the new specification side by side, with prices for each. Let the client see the delta in context. A S$3,200 upgrade on a S$80,000 project is 4%. Most clients will look at that ratio and feel it's reasonable. If you just say "S$3,200 extra," it sounds like a lot.</p>
<p><strong>Offer alternatives when possible.</strong> "If you'd like the sintered stone look but want to keep costs closer to the original budget, there's a sintered-stone-effect porcelain that's about S$1,100 more than the quartz. It won't be identical, but it's a good middle ground." Clients appreciate having options. It shows you're working with them, not just billing them.</p>
<p>One thing to avoid: apologising for the cost. "Sorry, but this will be S$650 extra" puts you on the defensive and implies the charge is unreasonable. State it clearly, explain the reasoning, and let the client decide. If they push back, you can discuss alternatives. But don't start from a position of apology.</p>`,
      },
      {
        heading: "When to absorb small changes (and when to hold the line)",
        content: `<p>Not every change needs a variation order. If you document and charge for literally everything, including moving a power point 10cm to the left, you'll annoy the client and make the project feel transactional. There's a goodwill balance to maintain.</p>
<p>A practical threshold that we've heard from several studios: if the change costs less than 1% of the project value, consider absorbing it. On a S$80,000 project, that's S$800. Moving a light switch, swapping a paint colour within the same brand and price range, adjusting a shelf height before carpentry fabrication. These are relationship investments.</p>
<p>But document them anyway. Send a message: "I've adjusted the shelf height as discussed. No additional cost for this change." The client sees that you're being generous and you have a record in case three more "free" changes follow.</p>
<p>Hold the line when:</p>
<ul>
<li>The change involves additional material cost. Materials have real supplier invoices that you can't absorb without reducing your margin.</li>
<li>Will the change affect the timeline? If moving a wall means the tiler can't start on schedule and your contractor charges waiting time, that cost is real and the client should know about it.</li>
<li>Is this the third or fourth "small" request? One free change is goodwill. Four free changes is a pattern, and you need to reset expectations.</li>
<li>The request comes from someone other than the decision-maker. If the client's mother-in-law is making suggestions, politely redirect: "That's an interesting idea. Let me discuss it with [client name] since they'll need to approve any scope changes."</li>
</ul>
<p>Some designers worry that tracking changes so carefully will make them seem rigid. In practice, the opposite happens. Clients respect clarity. The studios that handle scope changes well tend to get more referrals, not fewer, because the client never felt surprised by the final bill.</p>`,
      },
      {
        heading: "Putting it together: a scope management checklist",
        content: `<p>If you take one thing from this article, let it be this: scope creep is not inevitable. It's the result of missing process at specific, predictable moments. Fix those moments and the problem shrinks dramatically.</p>
<p>Before the project starts:</p>
<ul>
<li>Include an explicit inclusion/exclusion list in the contract</li>
<li>Add a change request clause with a clear process (48-hour documentation, written approval)</li>
<li>Consider a rate card appendix for common additions</li>
<li>Walk the client through the change process during the kickoff meeting so it's not a surprise later</li>
</ul>
<p>During the project:</p>
<ul>
<li>Apply the 48-hour rule to every change, regardless of size</li>
<li>Document "free" changes too, with a note that there's no additional cost</li>
<li>Present cost impact with context (what's involved, comparisons, alternatives)</li>
<li>Use the 1% threshold to decide what to absorb and what to charge for</li>
<li>Redirect requests from non-decision-makers to the actual client</li>
</ul>
<p>After the project:</p>
<ul>
<li>Review total VO value against the original contract to calibrate your quoting for the next project</li>
<li>If more than 15% of revenue came from VOs, your original scoping may need work</li>
<li>Track which categories of change come up most often and consider including them as optional line items in future quotes</li>
</ul>
<p>The average cost overrun on residential renovations runs 15-20% (BCA Singapore data and HomeAdvisor US data, 2024). Most of that overrun is absorbed by the studio, not billed to the client. A proper change management process won't eliminate overruns entirely, but it will make sure the right person is paying for them.</p>
<p>And if you're looking at your last few projects thinking "we definitely left money on the table," you're probably right. The good news is that the fix is process, not personality. You don't have to become a hard negotiator. You just need a system that makes the next "can you also" a documented decision instead of an invisible cost.</p>`,
      },
    ],
  },
]
