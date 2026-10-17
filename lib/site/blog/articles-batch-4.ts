/**
 * Batch 4 blog articles.
 * Design proposals + client red flags.
 */

import type { BlogArticle, BlogAuthor } from "./types"

const AUTHORS = {
  editorial: {
    name: "OpenMaison Editorial",
    role: "Product & Industry Research",
    linkedin: "https://www.linkedin.com/company/openmaison",
  } satisfies BlogAuthor,
}

// ─── Articles ──────────────────────────────────────────────────

export const BATCH_4_ARTICLES: BlogArticle[] = [
  // ── Article 1: Design proposals ─────────────────────────────
  {
    slug: "design-proposal-that-closes",
    title: "How to write a design proposal that actually closes",
    excerpt:
      "Most design proposals are too long, too vague, and bury the price on page 12. Here is a structure that wins projects, based on what actually works in Singapore and Dubai studios.",
    category: "How-To",
    keywords: [
      "interior design proposal",
      "design proposal template",
      "how to write renovation proposal",
      "winning design proposals",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T10:00:00+08:00",
    readTime: "9 min read",
    heroImage: "/site/covers/design-proposal-closes.jpg",
    heroAlt:
      "Overhead view of an interior design proposal document on a white desk with fabric swatches and a pen",
    keyStats: [
      {
        label: "Average close rate on proposals with 3 pricing tiers",
        value: "38%",
        source: "Houzz Pro 2025 business benchmarks",
      },
      {
        label: "Proposals read to completion when under 5 pages",
        value: "74%",
        source: "Mydoma Studio user analytics",
      },
      {
        label: "Average uplift when premium tier is included",
        value: "+22% deal size",
        source: "PandaDoc sales report 2025",
      },
    ],
    relatedSlugs: [
      "client-red-flags-interior-designer",
      "interior-design-studio-tech-stack-2026",
    ],
    sections: [
      {
        heading: "The proposal nobody reads",
        content: `<p>You spent two hours on a site visit. You went home, measured everything, sketched some ideas, pulled references, and then sat down to write a proposal. Twelve pages later, you emailed it off with "Please find attached our proposal for your kind review."</p>
<p>The client opened it, scrolled to the price, closed it, and never replied.</p>
<p>This happens constantly, and the design was probably fine. The proposal itself failed as a sales document. That is what a proposal is, a sales document with one job: get the client to say yes.</p>
<p>If you are losing projects at the proposal stage, the problem is almost never your design ability. It is how you are presenting the decision.</p>`,
      },
      {
        heading: "Start with one paragraph that proves you listened",
        content: `<p>The single most effective thing you can put at the top of a proposal is a short summary that reflects the client's own words back to them. Not your design philosophy. Not your company history. Their problem, described in a way that makes them think "okay, this person gets it."</p>
<p>Something like:</p>
<blockquote>"You and your family are moving into a 4-room HDB in Tampines this November. You want an open-concept kitchen that connects to the living area, storage solutions for two young kids, and a master bedroom that feels like a hotel. Your budget is in the $50,000-60,000 range and you need the renovation completed before Chinese New Year."</blockquote>
<p>That is three sentences. It took you 90 seconds to write. And it does more work than two pages of "About Our Studio" ever could, because it tells the client you were paying attention during the consultation.</p>
<p>Most proposals start with the studio's credentials. "Established in 2018, we have completed over 200 projects..." The client does not care about this yet. They will care about your credentials after they trust that you understand their project. Put the "about us" section at the end, or leave it out entirely. Your portfolio link handles that.</p>`,
      },
      {
        heading: "Define the scope like a contract, present it like a story",
        content: `<p>The scope section is where most proposals either bore the client to death or leave too much room for arguments later. You need to thread a needle: specific enough to prevent scope creep, readable enough that a non-designer actually understands what they are getting.</p>
<p>Structure it room by room. For each space, write two or three sentences about what you will do, then list the deliverables. Keep the language plain.</p>
<p>For example:</p>
<ul>
<li><strong>Kitchen.</strong> Full hacking of existing wall between kitchen and living room to create an open-concept layout. New custom carpentry for upper and lower cabinets (approximately 18 linear feet), quartz countertop, and a breakfast bar. Includes plumbing relocation for sink repositioning.</li>
<li><strong>Master bedroom.</strong> Feature wall behind the bed with fluted panelling, new built-in wardrobe with integrated dressing table, and indirect cove lighting throughout.</li>
</ul>
<p>Notice what is not in there: material brands, specific colour codes, or tile model numbers. Those details belong in a separate material schedule that comes after the client says yes. The proposal scope should answer "what will my home look and feel like?" without drowning in specifications.</p>
<p>End the scope section with a clear exclusions list. "This proposal does not include: aircon installation, curtains and blinds, loose furniture, or appliances." Clients appreciate the honesty, and it protects you from the inevitable "I assumed the fridge was included" conversation.</p>`,
      },
      {
        heading: "The three-option pricing trick",
        content: `<p>Never present a single price. Ever.</p>
<p>When you give a client one number, the only decision they can make is yes or no. When you give them three options, the decision shifts to "which one do I want?" That is a fundamentally different conversation.</p>
<p>Here is how it works:</p>
<ol>
<li><strong>Essential.</strong> The minimum scope that solves their core problem. Strip out the nice-to-haves. This is your floor price, and it exists so the client never feels like the project is out of reach.</li>
<li>The middle tier is your honest recommendation, the one that will give them the best result. Call it "Recommended" or "Signature" or whatever fits your brand. This is where you make your margin, and most clients pick it.</li>
<li>Then there is the premium option. Everything in the middle tier, plus the upgrades that would make the project exceptional: upgraded materials, additional custom carpentry, smart home features, whatever makes sense. This tier exists to make the middle option feel reasonable by comparison.</li>
</ol>
<p>Present the prices in a simple table. Three columns. Let the client scan it in ten seconds. Do not bury pricing inside paragraphs of text where they have to hunt for the number.</p>
<p>Data from PandaDoc's 2025 sales report shows that proposals with tiered pricing see an average deal size increase of 22% compared to single-price proposals. The premium tier pulls the anchor upward, and clients who were going to pick the cheapest option often talk themselves into the middle one.</p>
<p>One more thing: put a deadline on the pricing. "These rates are valid for 14 days from the date of this proposal." Without a deadline, proposals sit in email inboxes for months. With one, clients make decisions.</p>`,
      },
      {
        heading: "Keep it to five pages (yes, really)",
        content: `<p>Your proposal is a decision document. Treat it like one.</p>
<p>Here is the structure that consistently works:</p>
<ul>
<li><strong>Page 1:</strong> Executive summary (the "we heard you" paragraph), plus a project snapshot: timeline, budget range, start date.</li>
<li>Pages 2 and 3 cover scope and approach, room by room. Include a simple mood board or two reference images if you have them, but do not turn this into a design presentation.</li>
<li>Page 4 is money. Fee options (the three-tier table), payment schedule, and validity period. Nothing else.</li>
<li><strong>Page 5:</strong> Terms and next steps. Cancellation policy, revision limits, what happens if the timeline slips because the client takes three weeks to choose a tile.</li>
</ul>
<p>That is it. Five pages. A client can read the whole thing during a lunch break.</p>
<p>Mydoma Studio's user analytics show that proposals under five pages are read to completion 74% of the time. Proposals over ten pages? That number drops to 31%. Your beautifully designed 15-page PDF is working against you.</p>
<p>If you absolutely need to include more detail (material schedules, technical drawings, your company profile), put them in an appendix. Separate PDF. Clearly labelled "for reference." The core proposal stays lean.</p>`,
      },
      {
        heading: "Common mistakes that quietly kill proposals",
        content: `<p>Some patterns show up again and again in proposals that lose:</p>
<p><strong>Burying the price.</strong> If the client has to scroll past page 8 to find out what this costs, they are annoyed before they even see the number. Price should be on page 4, maximum. Treat it as information the client is entitled to.</p>
<p>Another killer: ending with "We look forward to hearing from you." That is not a next step. A real next step sounds like this: "To proceed, sign this proposal and transfer the 10% booking deposit of $5,500 to the account below. We will schedule your design presentation within 5 working days of receiving payment." Tell them exactly what to do.</p>
<p>Count the number of times "we" and "our" appear in your proposal versus "you" and "your." If your studio's name shows up more than the client's project details, rewrite the whole thing. The proposal is about their home, not your credentials.</p>
<p><strong>Sending it cold.</strong> Never email a proposal without a conversation first. Walk the client through it on a call or in person, hit the highlights, answer questions in real time, then send the document as a follow-up. The proposal confirms a decision that is already half-made.</p>
<p>And if you send a proposal and then wait? You will wait forever. Schedule a check-in three days after sending. "Hi Sarah, just checking if you had a chance to look through the proposal. Happy to jump on a quick call if anything needs clarifying." One message. Not pushy, not desperate. Just present.</p>
<p>The proposal is the last step before money changes hands. Give it the attention it deserves, and stop treating it like paperwork.</p>`,
      },
    ],
  },

  // ── Article 2: Client red flags ─────────────────────────────
  {
    slug: "client-red-flags-interior-designer",
    title: "Client red flags every designer should know",
    excerpt:
      "Every experienced designer has a horror story. Most of those stories started with a warning sign that got ignored. Here are eight red flags, what they actually mean, and when to walk away.",
    category: "Guide",
    keywords: [
      "interior design client red flags",
      "difficult renovation clients",
      "client warning signs designer",
      "when to walk away from a project",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T10:30:00+08:00",
    readTime: "9 min read",
    heroImage: "/site/covers/client-red-flags-designer.jpg",
    heroAlt:
      "Consultation table with scattered Pinterest printouts of wildly different styles and two coffee cups",
    keyStats: [
      {
        label: "Designers who have terminated a client relationship",
        value: "67%",
        source: "ASID 2024 industry survey",
      },
      {
        label: "Projects that exceed budget due to scope creep",
        value: "43%",
        source: "Houzz renovation trends 2025",
      },
      {
        label: "Disputes involving unsigned or vague contracts",
        value: "72%",
        source: "CASE Singapore renovation complaints 2024",
      },
    ],
    relatedSlugs: [
      "design-proposal-that-closes",
      "interior-design-studio-tech-stack-2026",
    ],
    sections: [
      {
        heading: "Why this article exists",
        content: `<p>Nobody teaches you this in design school. You learn about colour theory, spatial planning, materials, and rendering software. Nobody sits you down and says "here is how to spot a client who will make the next six months of your life miserable."</p>
<p>You learn it the hard way. Usually around your third or fourth project, when a client who seemed perfectly nice during the consultation turns into someone who calls you at 11pm on a Saturday to ask why the grout colour looks different under warm lighting.</p>
<p>Every experienced designer has a list of warning signs they watch for now. This article is that list, compiled from conversations with studio owners in Singapore and Dubai who have collectively seen hundreds of projects go sideways.</p>
<p>Not every red flag means "run." Some just mean "proceed with stronger boundaries." But a few of them? Walk away. Seriously. The money is not worth it.</p>`,
      },
      {
        heading: "1. \"My budget is flexible\"",
        content: `<p>This sounds generous. It is not.</p>
<p>"My budget is flexible" almost always means one of two things. Either they genuinely have no idea what renovations cost (in which case you will spend weeks educating them only to discover their "flexible" budget is $25,000 for a full 5-room HDB gut-and-rebuild), or they have a number in their head but do not want to tell you because they think you will spend every last dollar of it.</p>
<p>Both scenarios waste your time.</p>
<p>What to do: ask directly. "I understand flexibility is nice, but to give you a realistic proposal, I need a working range. Are we talking $40,000-50,000, or $80,000-100,000? Those are very different projects." If they still refuse to give a number, quote your minimum project size. "Our projects typically start at $45,000 for a 4-room HDB. Does that feel comfortable?" Their reaction tells you everything.</p>
<p>This is manageable if you pin down a range early. It becomes a red flag when the client actively resists giving any number through multiple conversations. That usually means they are shopping your quote against five other designers and will pick whoever is cheapest.</p>`,
      },
      {
        heading: "2. They refuse to sign anything before work starts",
        content: `<p>"Can't we just get started and sort out the paperwork later?"</p>
<p>No. Absolutely not.</p>
<p>A client who resists signing a contract is telling you, in advance, that they do not want to be held accountable for anything. When the project hits a bump (and every project hits bumps), you will have no documentation of what was agreed. No scope definition. No payment schedule. No change order process.</p>
<p>CASE Singapore's 2024 renovation complaint data shows that 72% of disputes involve unsigned or vaguely worded contracts. That is not a coincidence.</p>
<p>What to do: this is non-negotiable. Make it a policy, not a personal decision. "We require a signed agreement and booking deposit before any design work begins. This protects both of us." If they push back, let them go. A client who will not sign a contract before the project starts will not pay the final invoice when it ends.</p>`,
      },
      {
        heading: "3. They want you to manage their own contractor",
        content: `<p>"We already have a contractor. Can you just do the design and oversee the works?"</p>
<p>On the surface, this seems fine. Less work for you, right? Wrong. This is one of the most stressful arrangements in the business.</p>
<p>Their contractor answers to them, not to you. When you tell the contractor the tiling layout needs to change, the contractor calls the client. The client calls you. Three phone calls later, nothing has changed and everyone is annoyed.</p>
<p>You have design responsibility without construction authority. If the contractor cuts corners on waterproofing (because the client picked the cheapest quote), guess who the client blames when the bathroom leaks six months later? Not the contractor. You.</p>
<p>What to do: if you take this arrangement, charge more and define your role with painful clarity. "I will issue design drawings and a material schedule. Site coordination, contractor management, and quality control are the homeowner's responsibility. Any design changes requested during construction require a signed variation order." Put it in writing. Bold it. Underline it. They will still call you when something goes wrong, but at least you have documentation.</p>
<p>Better yet, politely decline. "We find projects run much more smoothly when we work with our own trusted contractors. We're happy to provide a full design-and-build package instead."</p>`,
      },
      {
        heading: "4. The Pinterest board with 47 completely different styles",
        content: `<p>You ask the client for references. They send you a Pinterest board. You open it and find: a Scandinavian minimalist living room, a Bali-resort bathroom, an industrial loft kitchen, a French provincial bedroom, a Japanese wabi-sabi entryway, and what appears to be a spaceship.</p>
<p>This is not a client who knows what they want. This is a client who likes everything they see and expects you to somehow combine all of it into one coherent home.</p>
<p>On its own, this is not a dealbreaker. Lots of clients struggle to articulate their taste, and helping them figure it out is part of the job. It becomes a red flag when combined with strong opinions. "I want all of these styles but I also know exactly what I want." That person will reject every concept you present because it does not match the imaginary design that exists only in their head.</p>
<p>What to do: before you start any design work, do a proper style alignment session. Sit down with them, go through the references, and find the common thread. "I notice you are drawn to natural materials and warm tones across all of these. Let's use that as our foundation." Narrow 47 images down to 5. Get them to sign off on a mood board before you touch SketchUp.</p>
<p>If they cannot commit to a direction after two or three sessions? That's your answer. They will change their mind after every design presentation, and you will redo work until your margin disappears.</p>`,
      },
      {
        heading: "5. \"How much discount for cash?\"",
        content: `<p>Let's be blunt: this client is asking you to help them avoid a paper trail. In Singapore, this also means they are probably expecting you to absorb the GST.</p>
<p>Put aside the ethical and legal issues for a moment. The practical problem is that a client who opens the relationship by asking for a discount is telling you how every conversation for the next four months will go. Every material selection will be challenged on price. Every variation order will be an argument. You will spend more time justifying your fees than doing design work.</p>
<p>What to do: "Our pricing is the same regardless of payment method, and all payments go through our company account with proper invoicing." Say it once, clearly, and move on. If they ask again, they are not your client.</p>`,
      },
      {
        heading: "6. They trash-talk their previous designer. A lot.",
        content: `<p>A client who had a bad experience with a previous designer is understandable. Renovations are stressful, things go wrong, and sometimes the designer genuinely did a poor job.</p>
<p>A client who spends 20 minutes of your first consultation telling you how terrible, incompetent, and dishonest their last designer was? That is something else entirely.</p>
<p>Here is the pattern: the previous designer was "unprofessional." The contractor was "useless." The project manager "never returned calls." Every single person involved in their last renovation was the problem. At some point, you have to ask yourself: what is the common factor in all of these bad experiences?</p>
<p>What to do: listen carefully to what specifically went wrong. If the complaints are concrete ("they missed the deadline by two months and never communicated about delays"), that is a real grievance and you can address it with better project management. If the complaints are vague and emotional ("they just didn't care" or "they had no taste"), be cautious. You are probably hearing a preview of what they will say about you to the next designer.</p>
<p>Ask for specifics. "That sounds frustrating. Can you tell me what you wish they had done differently?" If they cannot answer that question clearly, proceed with a very detailed contract and manage expectations relentlessly from day one.</p>`,
      },
      {
        heading: "7. The \"simple renovation\" that keeps growing",
        content: `<p>"It's a very simple project, just some carpentry and painting."</p>
<p>Three meetings later: "Oh, and we want to hack the wall between the kitchen and living room. And retile both bathrooms. And can we look at changing the flooring throughout? Also my wife wants a walk-in wardrobe."</p>
<p>Scope creep is normal. A project that doubles in scope before the contract is signed is not normal. It means the client has not actually decided what they want, and they are using your free consultation time to figure it out.</p>
<p>The danger is that they have anchored on the "simple renovation" price in their head. They expect $25,000 worth of work for what has become a $65,000 project. When you present the real number, they will act shocked and say "but you said it would be simple."</p>
<p>No. They said it would be simple. You just did not correct them early enough.</p>
<p>What to do: after the first consultation, send a brief written scope summary. "Based on our discussion, the project includes: carpentry for living room TV console, kitchen upper and lower cabinets, and repainting throughout. Estimated range: $28,000-35,000." When new items come up in the next meeting, say out loud: "That changes the scope. We are now looking at a different budget range." Do not let the brief grow silently. Every addition gets acknowledged, in writing, with a price impact.</p>`,
      },
      {
        heading: "8. \"My friend's designer charges half that\"",
        content: `<p>Good. Hire them.</p>
<p>That sounds harsh, but this is the single most reliable indicator that you and this client will never have a productive working relationship. They are not comparing apples to apples. They are telling you that they do not see the difference between your service and someone else's, and they expect you to compete on price.</p>
<p>Their friend's designer might be a one-person operation working from home with no overheads. They might not carry insurance. They might not have a proper warranty. They might be quoting a completely different scope. None of that matters, because the client has decided that your price is too high, and everything from here is a negotiation.</p>
<p>What to do: do not justify your pricing by listing all the things that make you more expensive. That sounds defensive and it does not work. Instead, redirect: "Every studio structures their pricing differently and includes different things. I can only speak to what our package includes and the level of service we provide. If your friend's designer is a good fit for your budget and expectations, I genuinely think you should explore that option."</p>
<p>You are not being rude. You are being honest. A client who picks you despite wanting to pay half your rate will resent every invoice for the duration of the project. Let them go and spend your energy on the clients who see the value.</p>`,
      },
      {
        heading: "Trust your gut, but verify with a process",
        content: `<p>The best protection against difficult clients is not a sixth sense. It is a process.</p>
<p>Have a proper discovery call before you visit the site. Ask about budget, timeline, and decision-makers (if one spouse is not present at the consultation, that is a yellow flag on its own). Send a pre-consultation questionnaire. The clients who fill it out thoughtfully are the ones who respect your time.</p>
<p>Require a signed letter of engagement and a booking deposit before you do any design work. Not after the first concept presentation. Before. The deposit does not need to be large. $500-1,000 is enough. Its purpose is not revenue. It is a filter. Clients who are serious about working with you will pay it without hesitation. Clients who are still shopping around will suddenly need "more time to think."</p>
<p>Finally, remember that saying no to a project is not losing money. It is protecting your time, your team's morale, and your reputation. The worst client stories in this industry all start the same way: "I knew something was off, but I took the project anyway because I needed the work."</p>
<p>You will always need the work. You do not always need that work.</p>`,
      },
    ],
  },
]
