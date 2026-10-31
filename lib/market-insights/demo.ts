/**
 * (pending modules S25) The demo's Market Insights — sample articles in the shape of the editors' feed (lib/market-insights/feed.ts, 1.0's
 * `market_insights` rows), so they reach the pages the way a real feed would: through `rowsFromFeed` and `feedStatements` (repair R142).
 *
 * Honest by construction: every article is marked `is_sample` (its card and its page say it was written for the demo); every figure in a
 * chart is illustrative and its source line says so — no number is presented as a market fact, and no real organisation is named as the
 * source of one (1.0's seed did both: it cited cost guides and annual reports for figures nobody can check). The kinds of article are 1.0's
 * — a featured trend, reports with benchmarks, a case study, industry news — on Singapore's homes, in 1.0's Markdown with ```chart blocks.
 * The case study's studio is invented; the news is the demo's own Marketplace (an invented partner brand). The pictures are the demo's own
 * (public/market-insights, cut from the AI Visualizer's sample rooms by scripts/market-insights/gen-assets.mjs). Dates count back from
 * `today`. One draft is in the feed and never reaches the studio (1.0 listed published articles only). *(invented copy: every article)*
 */
import type { FeedArticle } from './feed'

const DAY = 86_400_000
const pic = (name: string) => `/market-insights/${name}.jpg`
const ILLUSTRATIVE = 'Illustrative figures for the demo'

type Spec = Omit<FeedArticle, 'published_at' | 'created_at' | 'updated_at' | 'is_published' | 'is_sample'> & { daysAgo: number; published?: boolean }

const ARTICLES: Spec[] = [
  {
    id: 'demo-resale-brief', category: 'trends', is_featured: true, daysAgo: 2, read_time_minutes: 5, cover_image_url: pic('resale-living'),
    title: 'Resale flats are reshaping the renovation brief',
    excerpt: 'When more of a studio’s enquiries name a resale flat, the job changes: hacking, rewiring and re-tiling that a new flat rarely needs. What that changes in the first call, the site visit and the quote.',
    tags: ['Singapore', 'HDB', 'Resale', 'Site visit'],
    content: `## Why resale changes the job

A new flat arrives as the developer left it: a studio plans around fresh walls, new wiring and tiles that can often be overlaid. A resale flat arrives with twenty or thirty years of someone else’s choices. Before anything new goes in, something old usually comes out.

For a studio, the shift shows in its own enquiries: a growing share of them name a resale flat. Here is how that can look for one sample studio.

\`\`\`chart
{
  "type": "area",
  "title": "Share of enquiries naming a resale flat",
  "subtitle": "A sample studio's enquiries by year",
  "source": "${ILLUSTRATIVE}",
  "xKey": "year",
  "valueSuffix": "%",
  "data": [
    {"year": "2021", "share": 38},
    {"year": "2022", "share": 41},
    {"year": "2023", "share": 45},
    {"year": "2024", "share": 49},
    {"year": "2025", "share": 52},
    {"year": "2026", "share": 55}
  ],
  "series": [{"key": "share", "label": "Resale enquiries"}]
}
\`\`\`

## What the extra work is

- **Hacking and disposal** — old built-ins, a kitchen, sometimes a wall the new layout doesn’t need.
- **Rewiring** — older flats often need new points, a new distribution board, or both.
- **Plumbing** — moving a sink or a washer point is common once the kitchen opens up.
- **Re-tiling** — an overlay is not always possible on old, uneven tiles.
- **Windows and grilles** — often replaced at the same time.

![An emptied living room, ready for the site visit — where the hacking and the rewiring are measured.](${pic('resale-empty')})

## In the first call

1. Ask how old the flat is and whether it was renovated before.
2. Ask what the homeowner wants to keep — it is usually less than they first say.
3. Book the site visit before you quote. A resale quote written from a floor plan alone is the one that changes most later.

> **Designer tip:** keep a resale section in your quote — hacking, disposal, rewiring and re-tiling as their own lines — so a homeowner comparing quotes sees what a cheaper quote has left out.

## On the quote

Studios that do both kinds of job keep two starting points: one for a new flat, one for resale. In OpenMaison, save the resale lines once as a section in the [Price book](/company/price-book/sections) and add them to any quote in one step.`,
  },
  {
    id: 'demo-budget-benchmark', category: 'reports', daysAgo: 14, read_time_minutes: 6, cover_image_url: pic('benchmark-kitchen'),
    title: 'Renovation budgets by flat type: how to read a benchmark',
    excerpt: 'How a mid-range renovation budget steps up from a 3-room flat to an executive flat, and where a resale flat adds to it — a worked example of a benchmark, with illustrative figures.',
    tags: ['Singapore', 'HDB', 'Budgets', 'Pricing'],
    content: `## What a benchmark is for

A homeowner’s first question is nearly always “how much for my flat?”. A benchmark answers it with a range before anyone has measured anything — and tells the studio when a brief and a budget don’t match.

The ranges below are a **worked example**: a mid-range scope — paint, full carpentry for the kitchen, wardrobes and TV console, one or two bathrooms refreshed, a quartz worktop — with the figures made up to show how a benchmark reads.

\`\`\`chart
{
  "type": "bar",
  "title": "Mid-range budget by flat type (S$)",
  "subtitle": "New flat and resale, the same scope",
  "source": "${ILLUSTRATIVE}",
  "xKey": "flat",
  "valuePrefix": "S$",
  "data": [
    {"flat": "3-room", "new": 30000, "resale": 39000},
    {"flat": "4-room", "new": 42000, "resale": 55000},
    {"flat": "5-room", "new": 52000, "resale": 67000},
    {"flat": "Executive", "new": 58000, "resale": 78000}
  ],
  "series": [
    {"key": "new", "label": "New flat"},
    {"key": "resale", "label": "Resale flat"}
  ]
}
\`\`\`

## Why resale costs more for the same scope

| Work | New flat | Resale flat |
|---|---|---|
| Hacking and disposal | Little or none | Often a full day’s crew |
| Rewiring | Rarely | Often the whole flat |
| Plumbing | Minimal | Moving points is common |
| Tiles | An overlay is often possible | A full re-tile is common |
| Windows and grilles | Not needed | Often replaced |

## What moves a budget up

A premium scope adds on top of the mid-range one. The order matters more than the figures — stone and a full smart home move a budget most.

\`\`\`chart
{
  "type": "bar",
  "title": "Adding to a mid-range scope (S$)",
  "subtitle": "One 4-room flat, each upgrade on its own",
  "source": "${ILLUSTRATIVE}",
  "xKey": "upgrade",
  "valuePrefix": "+S$",
  "data": [
    {"upgrade": "Stone worktops and vanity", "cost": 8000},
    {"upgrade": "Smart home, whole flat", "cost": 6000},
    {"upgrade": "Feature walls in three rooms", "cost": 5000},
    {"upgrade": "Designer fittings", "cost": 4000},
    {"upgrade": "Custom door hardware", "cost": 2500}
  ],
  "series": [{"key": "cost", "label": "Adds"}]
}
\`\`\`

## Using a range with a client

1. **Lead with the range, then the scope.** “A 4-room resale at mid-range is usually in this band — where would you like to be?”
2. **Show what moves it.** The upgrades above are the conversation, not the small lines.
3. **Know your floor.** A quote far below your own range usually means scope has gone missing.`,
  },
  {
    id: 'demo-same-day-calls', category: 'case-studies', daysAgo: 9, read_time_minutes: 4, cover_image_url: pic('studio-japandi'),
    title: 'Sample case study: a studio that calls every enquiry the same day',
    excerpt: 'An invented three-designer studio shows what changes when every new enquiry gets a call the day it arrives — from the first call to the site visit and the signed quote.',
    tags: ['Leads', 'Response time', 'Site visit'],
    content: `## The studio

A three-designer studio in Tai Seng — invented for this sample — took most of its work from referrals and a listing site. Enquiries waited: a designer on site in the morning called back in the evening, or the next day.

## What they changed

1. **One owner for every enquiry** — the owner of the studio assigns each new lead within the hour.
2. **A call the same day** — before the end of the working day, from whoever owns it.
3. **Every call logged** — what was said and the next step, so a second designer can pick it up.
4. **The site visit booked on the call** — not “we’ll send some dates”.

\`\`\`chart
{
  "type": "line",
  "title": "Days from enquiry to first call",
  "subtitle": "The sample studio, month by month",
  "source": "${ILLUSTRATIVE}",
  "xKey": "month",
  "valueSuffix": " days",
  "data": [
    {"month": "Jan", "days": 3.1},
    {"month": "Feb", "days": 2.4},
    {"month": "Mar", "days": 1.6},
    {"month": "Apr", "days": 1.0},
    {"month": "May", "days": 0.6},
    {"month": "Jun", "days": 0.4}
  ],
  "series": [{"key": "days", "label": "Days to first call"}]
}
\`\`\`

## What it changed

More enquiries reached a site visit, and the visits were better prepared — the call had already covered the flat, the budget and the timing.

\`\`\`chart
{
  "type": "bar",
  "title": "Enquiries that reached a site visit",
  "subtitle": "The sample studio, before and after the change",
  "source": "${ILLUSTRATIVE}",
  "xKey": "period",
  "valueSuffix": "%",
  "data": [
    {"period": "Jan – Mar", "share": 32},
    {"period": "Apr – Jun", "share": 51}
  ],
  "series": [{"key": "share", "label": "Reached a site visit"}]
}
\`\`\`

> **Owner tip:** in OpenMaison, each lead’s Response time sits on its Lead stages card, and Company › Reports › Leads shows it for the whole team.`,
  },
  {
    id: 'demo-lumen-lane', category: 'industry-news', daysAgo: 5, read_time_minutes: 3, cover_image_url: pic('lumen-lighting'),
    title: 'Lumen Lane opens a lighting room in Kaki Bukit',
    excerpt: 'The Marketplace’s lighting partner now has a room where clients can see pendants and floor lamps lit as they would be at home — and studios can book it for a client visit.',
    tags: ['Lighting', 'Marketplace', 'Showroom'],
    content: `## What’s new

[Lumen Lane](/marketplace/mkb-4103), one of the partner brands on the demo’s Marketplace, has opened a lighting room beside its Kaki Bukit showroom. The room is kept dim, so a client sees each pendant and lamp as it lights a real corner, not under shop lights.

## For studios

- **Book the room for a client visit** on WhatsApp — Lumen Lane holds an hour for a studio and its client.
- **The free lighting plan** for projects above S$3,000 now starts in the room: the brand marks what the client liked.
- **Its pendant deal** runs as before — buy three, the fourth is free — on the [Marketplace’s Deals](/marketplace?view=deals).

> This is the demo’s own news: Lumen Lane is an invented brand on the demo’s Marketplace.`,
  },
  {
    id: 'demo-materials-check', category: 'trends', daysAgo: 21, read_time_minutes: 4, cover_image_url: pic('materials-kitchen'),
    title: 'Materials: what to check before you renew a quote',
    excerpt: 'A quote written months ago can carry last season’s prices. A simple index shows how far worktops, laminate and tile can drift — and the four lines to re-check before you send a revision.',
    tags: ['Materials', 'Pricing', 'Price book'],
    content: `## Prices drift between a quote and a signature

A homeowner who takes three months to decide signs a quote whose prices were set three months ago. For most lines the difference is small; for a few it isn’t.

\`\`\`chart
{
  "type": "line",
  "title": "Material prices, indexed to 2023",
  "subtitle": "2023 = 100",
  "source": "${ILLUSTRATIVE}",
  "xKey": "year",
  "data": [
    {"year": "2023", "worktops": 100, "laminate": 100, "tile": 100},
    {"year": "2024", "worktops": 104, "laminate": 103, "tile": 99},
    {"year": "2025", "worktops": 109, "laminate": 105, "tile": 101},
    {"year": "2026", "worktops": 113, "laminate": 106, "tile": 102}
  ],
  "series": [
    {"key": "worktops", "label": "Quartz worktops"},
    {"key": "laminate", "label": "Laminate"},
    {"key": "tile", "label": "Imported tile"}
  ]
}
\`\`\`

## Re-check these four lines

1. **Worktops** — stone and quartz move most, and they are large lines.
2. **Carpentry finishes** — laminate and veneer ranges change with each new season.
3. **Tiles you import** — shipping, not the tile, is what moves.
4. **Appliances the studio supplies** — a model can be discontinued between quote and order.

![Stone and tile — the lines that move most between a quote and a signature.](${pic('materials-stone')})

## Where the Price book helps

When a cost changes, change it once in the [Price book](/company/price-book) — every new quote takes the new cost, and a revision can take it line by line.`,
  },
  {
    id: 'demo-where-budget-goes', category: 'reports', daysAgo: 33, read_time_minutes: 5, cover_image_url: pic('budget-bedroom'),
    title: 'Where a renovation budget goes',
    excerpt: 'A worked example of how a mid-range 4-room budget splits across the trades — carpentry, wet works, electrical and the rest — with illustrative figures, and how the split shifts for a resale flat.',
    tags: ['Budgets', 'Trades', 'HDB'],
    content: `## One budget, split by trade

Carpentry is usually the largest share of a mid-range renovation: the kitchen, the wardrobes, the TV console and the storage a homeowner asks for first.

\`\`\`chart
{
  "type": "donut",
  "title": "A 4-room budget by trade",
  "subtitle": "A mid-range scope",
  "source": "${ILLUSTRATIVE}",
  "xKey": "trade",
  "valuePrefix": "S$",
  "data": [
    {"trade": "Carpentry", "amount": 22000},
    {"trade": "Wet works", "amount": 12500},
    {"trade": "Electrical", "amount": 7000},
    {"trade": "Plumbing", "amount": 5000},
    {"trade": "Painting", "amount": 4500},
    {"trade": "Air-conditioning", "amount": 4500}
  ],
  "series": [{"key": "amount", "label": "Budget"}]
}
\`\`\`

## How resale shifts the split

The same scope in a resale flat spends more before carpentry starts — hacking, rewiring and re-tiling — so the other trades take a larger share of a larger budget.

\`\`\`chart
{
  "type": "stacked-bar",
  "title": "The same scope, new and resale (S$)",
  "subtitle": "A 4-room flat",
  "source": "${ILLUSTRATIVE}",
  "xKey": "flat",
  "valuePrefix": "S$",
  "data": [
    {"flat": "New flat", "carpentry": 22000, "wet": 9000, "electrical": 4500, "other": 6500},
    {"flat": "Resale flat", "carpentry": 22000, "wet": 14500, "electrical": 9000, "other": 9500}
  ],
  "series": [
    {"key": "carpentry", "label": "Carpentry"},
    {"key": "wet", "label": "Wet works"},
    {"key": "electrical", "label": "Electrical"},
    {"key": "other", "label": "Everything else"}
  ]
}
\`\`\`

## Reading it with a client

- **Show the split, not only the total.** A homeowner who sees that carpentry is the largest share knows where a saving can come from.
- **Name what a resale flat adds** before the quote, so the larger total is no surprise.`,
  },
  {
    /* a draft in the editors' CMS — never reaches the studio (1.0's list was published articles only) */
    id: 'demo-kitchen-draft', category: 'trends', daysAgo: 1, published: false, cover_image_url: pic('materials-kitchen'),
    title: 'Draft: kitchens for next year', excerpt: 'Not published yet.', tags: ['Kitchens'], content: '## To write',
  },
]

/** The demo's feed on `today`: each article published `daysAgo` before it (at ten in the morning), the draft unpublished. */
export function demoFeed(today: Date): FeedArticle[] {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10).getTime()
  return ARTICLES.map(({ daysAgo, published = true, ...a }) => {
    const iso = new Date(day - daysAgo * DAY).toISOString()
    return { ...a, author: 'OpenMaison Editors', is_published: published, published_at: published ? iso : null, created_at: iso, updated_at: iso, is_sample: true }
  })
}

/** The pictures the demo's articles name (repair R142 checks each is the app's own file). */
export const demoPictures = () => [...new Set(ARTICLES.flatMap((a) => [a.cover_image_url, ...[...(a.content ?? '').matchAll(/\]\((\/market-insights\/[^)\s]+)\)/g)].map((m) => m[1])]).filter((x): x is string => !!x))]
