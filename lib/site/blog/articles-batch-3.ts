/**
 * Batch 3 blog articles: scaling & studio economics.
 * Import BlogArticle and related types from the main articles file.
 */

import type { BlogArticle, BlogAuthor } from "./types"

const AUTHORS = {
  editorial: {
    name: "OpenMaison Editorial",
    role: "Product & Industry Research",
    linkedin: "https://www.linkedin.com/company/openmaison",
  } satisfies BlogAuthor,
}

// ─── Articles ───────────────────────────────────────────────────

export const BATCH_3_ARTICLES: BlogArticle[] = [
  // ── Article 1: When to hire your next designer ──────────────
  {
    slug: "when-to-hire-next-designer-7-signals",
    title: "7 signals your studio is ready to hire",
    excerpt:
      "Hiring too early burns cash. Hiring too late burns clients. Here are seven concrete signals that tell you it's time, plus the financial maths behind making the decision.",
    category: "Guide",
    keywords: [
      "hiring interior designer",
      "scaling design studio",
      "when to hire designer",
      "growing interior design business",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T10:00:00+08:00",
    readTime: "9 min read",
    heroImage: "/site/covers/hire-next-designer.jpg",
    heroAlt: "Empty desk in a busy interior design studio waiting for a new hire",
    keyStats: [
      { label: "Junior ID salary range (Singapore)", value: "S$3,500–5,000/mo", source: "MOM Salary Guide 2025" },
      { label: "Junior ID salary range (Dubai)", value: "AED 8,000–15,000/mo", source: "Glassdoor UAE 2025" },
      { label: "Avg revenue per residential project (SG)", value: "S$45,000–80,000", source: "RCMA industry data" },
      { label: "Ideal lead response time", value: "Under 24 hours", source: "HubSpot Sales Research" },
    ],
    relatedSlugs: [
      "real-cost-running-design-studio-overhead",
      "interior-design-studio-tech-stack-2026",
    ],
    sections: [
      {
        heading: "The hire-or-don't question",
        content: `<p>Every studio owner I know has fumbled this decision at least once. You either hire too early and watch your margins evaporate while the new person waits for projects, or you wait too long and lose three leads in a month because you physically cannot respond fast enough.</p>
<p>There is no universal "right time." But there are patterns. After talking to dozens of studio owners in Singapore and Dubai, we kept hearing the same triggers. Seven of them came up over and over.</p>
<p>This is a decision framework, not a pep talk. For each signal below, I'll give you the threshold where it shifts from "keep pushing" to "start interviewing." And at the end, we'll run the numbers on what a junior designer actually costs versus what they need to bring in.</p>`,
      },
      {
        heading: "1. You're turning away projects",
        content: `<p>This is the clearest signal, and also the one owners rationalise away the fastest. "I'm being selective." "It wasn't a good fit." Maybe. But if you've declined or failed to follow up on three or more qualified leads in a single month, you are leaving money on the table.</p>
<p><strong>Hire-now threshold:</strong> You've passed on (or lost because you couldn't respond in time) projects worth more than one junior designer's quarterly salary. In Singapore, that's roughly S$10,500 to S$15,000 in lost revenue. In Dubai, AED 24,000 to AED 45,000.</p>
<p><strong>Not-yet threshold:</strong> You turned away one project, and it was genuinely outside your scope or budget range. That's just good filtering.</p>`,
      },
      {
        heading: "2. Your lead response time has crept past 48 hours",
        content: `<p>HubSpot's sales research consistently shows that responding within the first hour makes you seven times more likely to qualify a lead compared to waiting even two hours. In interior design, where clients often contact three to five studios simultaneously, the studio that replies first usually gets the site visit.</p>
<p>Check your WhatsApp or CRM timestamps. How long does it actually take between a new enquiry arriving and someone sending a substantive reply? Not an auto-response. A real, personalised message.</p>
<p>When should you worry? Your average first response takes more than 48 hours, and you've seen at least two leads go cold in the past month because of slow follow-up.</p>
<p>If response time occasionally hits 24 hours during a busy week but snaps back, you're stretched but not broken. Keep watching.</p>`,
      },
      {
        heading: "3. You're spending time on work below your rate",
        content: `<p>This one is sneaky. You're the principal designer. Your billable rate, even if you don't charge hourly, works out to S$80 to S$150 per hour based on your project fees and time spent. But last Tuesday you spent four hours updating a material schedule in Excel. That's junior-level work, and you just burned S$320 to S$600 of your own time on it.</p>
<p>Start logging your hours for one week. Categorise everything as "only I can do this" or "someone else could do this with training." If more than 40% of your week falls into the second bucket, you need help.</p>
<p><strong>Hire-now threshold:</strong> You're spending 15+ hours per week on tasks that don't require your expertise: procurement follow-ups, site measurements, material sourcing, basic drafting, updating trackers.</p>
<p>If admin creep is real but manageable, say 8 hours a week, and most of it requires extensive training to hand off, you're not there yet. But track it.</p>`,
      },
      {
        heading: "4. Project timelines are stretching without good reason",
        content: `<p>Every renovation has delays. Tiles arrive late. BTO keys get pushed back. That's normal. What isn't normal is when projects consistently take two to four weeks longer than your original estimate, and the reason is always the same: you didn't have time to review the drawings, approve the PO, or coordinate with the contractor.</p>
<p>Timeline stretch caused by your own bandwidth is a direct cost. It delays your next project's start date. It strains the client relationship. It might trigger penalty clauses if your contracts include them.</p>
<p><strong>Hire-now threshold:</strong> Three or more active projects have slipped past their estimated completion date in the last quarter, and in each case the bottleneck was your availability, not external factors.</p>
<p><strong>Not-yet threshold:</strong> One project ran long because you took on a complex commercial job that was genuinely underestimated in scope. Lesson learned, but not a hiring signal.</p>`,
      },
      {
        heading: "5. You haven't taken more than two consecutive days off in months",
        content: `<p>I almost didn't include this one because it sounds like lifestyle advice. It isn't. Burnout is a business risk. When you're the only designer and also the salesperson, project manager, and accountant, there is no redundancy. If you get sick for a week, everything stops. Clients wait. Contractors idle. Leads go unanswered.</p>
<p>A studio with two designers can survive one person being out. A studio with one cannot.</p>
<p>If you genuinely cannot take a week off without projects stalling or clients complaining, and you've been running at this pace for six months or more, that's a hiring signal.</p>
<p><strong>Not-yet threshold:</strong> You're busy, but you managed a four-day weekend last month and nothing caught fire. You're close to the edge but not over it.</p>`,
      },
      {
        heading: "6. Clients are waiting too long for revisions",
        content: `<p>A client sends feedback on the 3D renders. You see the message. You know the changes are straightforward, maybe two hours of work. But you don't get to it for five days because you're on site with another project, and by the time you send the revision, the client's enthusiasm has cooled and they want to "rethink the direction."</p>
<p>Slow revision turnaround erodes trust. It also extends project timelines (see signal #4) and increases the chance of scope creep because clients fill the waiting time by browsing Pinterest and coming back with entirely new ideas.</p>
<p>Start interviewing when your typical revision turnaround exceeds 5 business days, especially if you've received direct feedback from a client about the wait.</p>
<p>If revisions take 2 to 3 days and clients aren't complaining, you're fine. That's a reasonable turnaround.</p>`,
      },
      {
        heading: "7. Your pipeline has three or more months of committed work",
        content: `<p>This is the signal most studio owners ignore, because a full pipeline feels like a good problem. And it is, up to a point. But if you have confirmed projects that will keep you busy for 90+ days, you are simultaneously in the best and worst position to hire.</p>
<p>Best, because you have the revenue certainty to cover a new salary for the first few months. Worst, because if you wait until the pipeline is empty to hire, you'll be interviewing during a cash-flow crunch.</p>
<p><strong>Hire-now threshold:</strong> You have signed contracts (not just verbal commitments) covering at least three months of work, and you're still receiving new enquiries you want to take on.</p>
<p><strong>Not-yet threshold:</strong> Your pipeline is two months deep and enquiry flow is inconsistent. Hiring now would mean gambling on leads that haven't materialised yet.</p>`,
      },
      {
        heading: "The financial maths: what a junior designer actually costs",
        content: `<p>Let's run the numbers for both markets.</p>

<p><strong>Singapore</strong></p>
<p>A junior interior designer in Singapore earns S$3,500 to S$5,000 per month in base salary. On top of that, you owe CPF employer contributions at 17%, which adds S$595 to S$850. Factor in a laptop, software licences, and miscellaneous costs, and you're looking at roughly <strong>S$4,500 to S$6,500 per month all-in</strong>.</p>
<p>If your average residential project brings in S$45,000 to S$80,000 in design fees, and a junior designer can manage two to three projects concurrently with your oversight, they need to contribute to roughly one additional project every two months to cover their cost. That's very achievable if your pipeline supports it.</p>

<p><strong>Dubai</strong></p>
<p>A junior ID in Dubai earns AED 8,000 to AED 15,000 per month. There's no income tax, but you have visa sponsorship costs (AED 5,000 to AED 7,000 one-time), health insurance (AED 3,000 to AED 6,000 per year), and annual leave provisions. All-in monthly cost: roughly <strong>AED 10,000 to AED 18,000</strong>.</p>
<p>Dubai projects typically have higher fee values. A mid-range apartment renovation runs AED 80,000 to AED 200,000 in design fees. The breakeven maths is similar: one incremental project every two to three months covers the hire.</p>

<p>The key calculation is simple. Take the number of qualified leads you've turned away or lost in the past quarter. Estimate what those projects would have been worth. If that number exceeds six months of the new hire's salary, you've already paid for them in lost opportunity. You just didn't write the cheque.</p>`,
      },
      {
        heading: "How to make the decision",
        content: `<p>Count how many of the seven signals apply to you right now. If four or more hit the "hire-now" threshold, stop deliberating. If two or three apply, start the search casually. Talk to recruiters, post on SIDS or design school job boards, let your network know. Good candidates take time to find, and you don't want to be scrambling when the pipeline tips over.</p>
<p>One more thing. Your first hire doesn't have to be a senior designer. A motivated junior with strong CAD skills and a willingness to learn site coordination can take 30% to 40% of your workload within three months. That alone is enough to reclaim your response time, shorten revision cycles, and let you take a proper holiday for the first time in a year.</p>
<p>If you're using OpenMaison to manage your studio (disclosure: we build it), the Meeting Copilot and automated lead follow-ups can bridge part of the gap while you search. But software is not a substitute for another person when the core bottleneck is design capacity. Automate the admin. Hire for the design work.</p>`,
      },
    ],
  },

  // ── Article 2: The real cost of running a design studio ─────
  {
    slug: "real-cost-running-design-studio-overhead",
    title: "The real cost of running a design studio (overhead breakdown)",
    excerpt:
      "Nobody publishes these numbers. Here's what a 3-5 person interior design studio actually spends every month in Singapore and Dubai, from rent to insurance to the expenses nobody warns you about.",
    category: "Guide",
    keywords: [
      "interior design studio costs",
      "design business overhead",
      "starting interior design studio",
      "studio operating costs",
    ],
    author: AUTHORS.editorial,
    publishedAt: "2026-03-23T10:30:00+08:00",
    readTime: "9 min read",
    heroImage: "/site/covers/studio-overhead-costs.jpg",
    heroAlt: "Flat lay of a design studio desk with calculator, invoices, and material samples",
    keyStats: [
      { label: "Monthly overhead for 3-5 person SG studio", value: "S$18,000–32,000", source: "OpenMaison research" },
      { label: "Monthly overhead for 3-5 person Dubai studio", value: "AED 45,000–85,000", source: "OpenMaison research" },
      { label: "CPF employer contribution rate (SG)", value: "17%", source: "CPF Board 2026" },
      { label: "Typical minimum monthly revenue to break even (SG)", value: "S$35,000–55,000", source: "OpenMaison research" },
    ],
    relatedSlugs: [
      "when-to-hire-next-designer-7-signals",
      "interior-design-studio-tech-stack-2026",
    ],
    sections: [
      {
        heading: "Why nobody talks about this",
        content: `<p>When I started researching this article, I looked for a comprehensive breakdown of what it actually costs to run an interior design studio in Singapore or Dubai. Plenty of articles about renovation costs for homeowners. Almost nothing about the business side of the studios doing the renovations.</p>
<p>That's a problem, because the gap between "I can design a beautiful home" and "I can run a profitable business designing beautiful homes" is mostly about understanding your numbers. Every experienced studio owner knows this. Most learned it the hard way.</p>
<p>So here's the breakdown. All figures are monthly, based on a studio of 3 to 5 people (one owner-designer, one to two junior designers, and one to two support staff for admin or coordination). I'm covering both Singapore and Dubai because those are the two markets we know best. Your numbers will vary, but the categories won't.</p>`,
      },
      {
        heading: "Rent and workspace",
        content: `<p>You can run a design studio from your living room. Some very successful designers do. But once you have staff and need to meet clients somewhere that isn't a coffee shop, workspace becomes your single largest fixed cost.</p>

<p><strong>Singapore</strong></p>
<ul>
<li>A small unit in a co-working space like JustCo or WeWork runs S$800 to S$1,200 per desk per month. For 3 to 5 people, that's S$2,400 to S$6,000.</li>
<li>A dedicated studio space, typically in a shophouse, light-industrial building, or commercial HDB unit, costs S$2,500 to S$5,500 for 400 to 800 sq ft. The popular design clusters around Jalan Besar and Bencoolen range from S$4 to S$7 per sq ft.</li>
<li>Budget option: some studios use HDB-licensed home offices for the first year or two. Costs nothing beyond your existing rent, but you can't legally hire employees to work there, and meeting clients in your flat gets awkward fast.</li>
</ul>

<p><strong>Dubai</strong></p>
<ul>
<li>Free zone offices in Dubai Design District (d3) or Dubai Internet City run AED 4,000 to AED 10,000 per month for a small office. These come with trade licence benefits but typically require annual contracts.</li>
<li>Mainland commercial space in areas like Al Quoz or Business Bay costs AED 5,000 to AED 12,000 for a similar-sized unit.</li>
<li>Flexi-desk setups (AED 1,500 to AED 3,000/month) exist, but most municipalities require a physical office for your trade licence.</li>
</ul>

<p><strong>Typical monthly range:</strong> S$3,000 to S$5,500 (Singapore) or AED 5,000 to AED 12,000 (Dubai).</p>`,
      },
      {
        heading: "Staff costs: the number that matters most",
        content: `<p>People are usually 50% to 65% of total overhead. This is where studios either make or break their margins.</p>

<p><strong>Singapore (monthly, per person)</strong></p>
<ul>
<li>Junior interior designer: S$3,500 to S$5,000 base salary</li>
<li>CPF employer contribution (17%): add S$595 to S$850</li>
<li>Admin or project coordinator: S$2,800 to S$3,800 base + CPF</li>
<li>Skills Development Levy (SDL): S$2 to S$11.25 per employee per month (small, but it adds up)</li>
</ul>
<p>For a 4-person team (owner + 2 designers + 1 coordinator), staff costs run roughly <strong>S$11,000 to S$17,000 per month</strong> excluding the owner's draw.</p>

<p><strong>Dubai (monthly, per person)</strong></p>
<ul>
<li>Junior interior designer: AED 8,000 to AED 15,000</li>
<li>Admin or coordinator: AED 5,000 to AED 8,000</li>
<li>No income tax or social contributions (the upside of Dubai)</li>
<li>Health insurance: AED 250 to AED 500 per person per month (mandatory for all employees)</li>
<li>Visa costs: amortise AED 5,000 to AED 7,000 per employee across 24 months, so roughly AED 210 to AED 290 per person per month</li>
</ul>
<p>Same team structure in Dubai: roughly <strong>AED 24,000 to AED 42,000 per month</strong>.</p>

<p>A note on the owner's compensation: most small-studio owners in Singapore pay themselves S$5,000 to S$10,000 per month in the early years. In Dubai, the equivalent is AED 15,000 to AED 30,000. These amounts should be included in your overhead calculation, even if you're tempted to skip your own pay during lean months. If the business can't afford to pay you, it's not yet sustainable.</p>`,
      },
      {
        heading: "Software, insurance, and the mid-size line items",
        content: `<p>Individually small. Collectively, they add S$2,000 to S$4,000 per month that people forget to budget for.</p>

<p><strong>Software subscriptions</strong></p>
<ul>
<li>AutoCAD or SketchUp Pro: S$120 to S$350/month per seat</li>
<li>3D rendering (V-Ray, Enscape, or cloud-based) adds S$50 to S$200/month</li>
<li>Project management tools like Monday, Asana, or Notion run S$30 to S$80/month per user</li>
<li>Accounting (Xero, QuickBooks): S$50 to S$120/month</li>
<li>Do you need a CRM? HubSpot, Pipedrive, or a studio-specific tool will cost S$0 to S$200/month</li>
<li>All-in-one platforms like OpenMaison (disclosure: ours) or Houzz Pro range from S$0 to S$200/month, potentially replacing several of the above</li>
</ul>
<p>Total software: <strong>S$300 to S$1,000 per month</strong> depending on how many seats and whether you consolidate.</p>

<p><strong>Insurance</strong></p>
<ul>
<li>Professional indemnity insurance (PI): S$1,200 to S$3,000 per year, so roughly S$100 to S$250 per month. This covers you if a design decision causes damage or a client sues over a defect. If you skip it, you're betting your personal assets. Most clients with budgets above S$100,000 will ask for proof of PI coverage.</li>
<li>Public liability: S$500 to S$1,500 per year (S$40 to S$125/month). Covers injuries at your studio or on site visits.</li>
<li>In Dubai, PI and general liability combined typically run AED 3,000 to AED 8,000 per year.</li>
</ul>

<p><strong>Accounting and legal</strong></p>
<ul>
<li>Singapore: a bookkeeper or outsourced accounting firm charges S$200 to S$600 per month. Annual corporate tax filing (IRAS) adds S$500 to S$1,500 one-time. GST registration is compulsory if revenue exceeds S$1 million annually.</li>
<li>Dubai: accounting costs AED 500 to AED 1,500 per month. VAT filing (quarterly) is handled by most accounting firms as part of their retainer. Trade licence renewal runs AED 10,000 to AED 25,000 per year depending on your free zone or mainland setup.</li>
</ul>`,
      },
      {
        heading: "Marketing, transport, and the costs that creep",
        content: `<p>These are the categories that balloon when you're not watching.</p>

<p><strong>Marketing and lead generation</strong></p>
<ul>
<li><strong>Qanvast listing (Singapore):</strong> packages range from free to S$2,000+/month for premium placement. Most active studios spend S$500 to S$1,500.</li>
<li>Homereno, Renopedia, and similar listing platforms add S$200 to S$800 each per month.</li>
<li>Google Ads or Meta ads are wildly variable. Studios we've spoken to spend S$500 to S$3,000 per month. Cost per qualified lead through paid ads typically falls between S$50 and S$200 in Singapore.</li>
<li>In Dubai, Property Finder listings and Instagram ads are the main channels. Budget AED 2,000 to AED 8,000 per month for a meaningful presence.</li>
<li>Don't forget portfolio photography: S$300 to S$800 per completed project shoot. If you complete 8 to 12 projects per year, that's S$200 to S$800 amortised monthly.</li>
</ul>
<p>Total marketing: <strong>S$1,000 to S$4,000 per month</strong> (SG) or <strong>AED 3,000 to AED 12,000</strong> (Dubai).</p>

<p><strong>Transport and site visits</strong></p>
<p>In Singapore, expect S$300 to S$800 per month in Grab rides and parking fees if you're visiting sites 3 to 4 times per week. Studios with company vehicles add S$1,000 to S$1,500 for loan repayment, insurance, petrol, and parking. In Dubai, a vehicle is essentially mandatory. Budget AED 2,000 to AED 4,000 per month including Salik tolls, fuel, and insurance.</p>

<p><strong>Samples, materials library, and miscellaneous</strong></p>
<p>New fabric books, tile samples, and material swatches: S$100 to S$400 per month. Client gifts and hampers at handover: S$50 to S$150 per project. Printing (mood boards, presentation decks for client meetings): S$50 to S$200 per month. None of these will bankrupt you individually, but they add up to S$300 to S$700 per month if you don't track them.</p>`,
      },
      {
        heading: "The full picture: what you need to earn to break even",
        content: `<p>Let's add it all up for a Singapore studio with 4 people (owner + 2 designers + 1 coordinator):</p>

<ul>
<li>Rent: S$3,000 to S$5,500</li>
<li>Staff (excl. owner): S$11,000 to S$17,000</li>
<li>Owner's draw: S$5,000 to S$10,000</li>
<li>Software: S$300 to S$1,000</li>
<li>Insurance: S$150 to S$375</li>
<li>Accounting/legal: S$200 to S$600</li>
<li>Marketing: S$1,000 to S$4,000</li>
<li>Transport: S$300 to S$800</li>
<li>Materials and miscellaneous: S$300 to S$700</li>
</ul>

<p><strong>Total monthly overhead: S$21,250 to S$39,975.</strong> Call it S$22,000 to S$40,000 to round.</p>

<p>If your average project margin (design fee minus direct project costs like contractor markup, procurement, and site management) is 35% to 50%, you need monthly revenue of roughly <strong>S$44,000 to S$80,000</strong> to cover overhead and maintain that margin. At an average design fee of S$50,000 per project, that means closing roughly one project per month to sustain a lean operation, or 10 to 15 per year at a comfortable pace.</p>

<p>The same exercise for Dubai:</p>
<ul>
<li>Rent: AED 5,000 to AED 12,000</li>
<li>Staff (excl. owner): AED 24,000 to AED 42,000</li>
<li>Owner's draw: AED 15,000 to AED 30,000</li>
<li>Software: AED 1,000 to AED 3,000</li>
<li>Insurance: AED 500 to AED 1,500</li>
<li>Accounting/legal: AED 1,000 to AED 2,500</li>
<li>Marketing: AED 3,000 to AED 12,000</li>
<li>Transport: AED 2,000 to AED 4,000</li>
<li>Materials and miscellaneous: AED 500 to AED 1,500</li>
</ul>

<p><strong>Total monthly overhead: AED 52,000 to AED 108,500.</strong> Dubai is more expensive across the board, but project values are also higher, so the breakeven in project count is similar.</p>

<blockquote>The mistake most new studio owners make is calculating breakeven based on revenue, not margin. S$50,000 in design fees does not mean S$50,000 in your pocket. After contractor coordination, procurement margins, and site management costs, you might keep 35% to 50% of that. Plan around the number you actually keep.</blockquote>`,
      },
      {
        heading: "Costs people forget until the bill arrives",
        content: `<p>A few items that catch first-time studio owners by surprise:</p>

<p><strong>CPF (Singapore only).</strong> If you've only ever been an employee, you're used to CPF being deducted automatically. As an employer, you pay 17% on top of every employee's salary. For a team of three at an average salary of S$4,000, that's an extra S$2,040 per month you might not have budgeted for. It's mandatory from day one of employment. No grace period.</p>

<p>In Dubai, visa sponsorship catches people off guard. Every non-freelance employee needs a work visa tied to your company. The initial cost is AED 5,000 to AED 7,000 per person, and it takes 4 to 8 weeks to process. If someone quits within the first year, you've spent that money for very little return. Emirates ID renewals, medical testing, and labour card fees add another AED 1,000 to AED 2,000 per person per year.</p>

<p>I mentioned professional indemnity insurance above, but it deserves its own callout. Many new studios skip it because it feels optional. It is optional until a client's S$15,000 marble countertop cracks because of a design specification error, or a built-in cabinet falls off a wall due to incorrect load calculations. One claim without PI coverage can exceed your entire annual profit.</p>

<p><strong>GST registration threshold (Singapore).</strong> Once your annual revenue crosses S$1 million, GST registration becomes compulsory. You then need to charge 9% GST on all invoices and file quarterly returns. The accounting cost goes up, your pricing gets more complex, and you need systems that handle tax properly. Most studios hit this threshold around year 3 to 4.</p>

<p>And then there's cash flow timing, the silent killer. You might be profitable on paper but broke in practice because clients pay in stages (deposit, mid-project, completion) while your rent, salaries, and vendor invoices are due monthly. A studio earning S$600,000 per year can still run out of cash in month 4 if two large projects delay their second payment by 6 weeks.</p>

<p>None of this is meant to discourage anyone from starting a studio. These costs are real but manageable when you plan for them. The studios that struggle are the ones that plan for design fees and forget about everything else. Budget for the boring stuff first. The design will take care of itself.</p>`,
      },
    ],
  },
]
