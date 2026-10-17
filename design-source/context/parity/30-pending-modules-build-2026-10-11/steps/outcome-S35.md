# S35 · OpenMaison's website and Book a demo — outcome (2026-10-13, lane A)

Cards: `public:marketing-website` and `onboarding:book-a-demo` (both "skip" in the survey; built on her "build all of them" 2026-10-11, the
card's two questions taken as recommended — *Decisions*). **OpenMaison's own website, ported from 1.0, lives in this app at `/site`** — every
page 1.0 published (its pages, components, art direction, real copy and the Journal's articles), in **2.0's names and with no claim 2.0
doesn't make** (each changed sentence below); open to anyone; the studio app's front door unchanged. **Book a demo** keeps 1.0's form and its
record (`beta_signups`), tells OpenMaison's team through the house outbox, then opens **Calendly — 1.0's real booking page — prefilled**.
The contact form and the footer's newsletter keep 1.0's records. 1.0's SEO layer is whole (titles, structured data, sitemap, robots with the
AI training crawlers blocked, `llms.txt`, the branded link-preview picture through S02's card route). The UAE campaign page stays **held**
(her word, 2026-10-12); staff's Beta sign-ups list is Platform admin (excluded) — the records are kept for it.

1.0 read: `src/app/(marketing)/**` (layout, home, platform hub + `[module]`, story, trust, blog + `[slug]`, changelog, careers, contact,
privacy, terms, cookies, not-found, loading, the hidden pricing page, the about / products / ai-agents redirects, `try`), `src/components/landing/v2/**`
(nav + mega menu + phone bar, footer, intro overlay, primitives, platform data + hub + module template + module visuals, before / after,
trust banner, story / trust / changelog views and data, faq accordion, page skeletons), `src/components/landing/beta-signup-{modal,context}.tsx`,
`src/app/api/{beta-signup,contact,newsletter,og}/route*`, `src/lib/{seo,rate-limit,region-config}.ts`, `src/app/(marketing)/blog/articles*.ts` (the 11 articles),
`src/app/{sitemap,robots,manifest}.ts`, `public/llms.txt`, `messages/en.json` (betaSignup), `docs/marketing/openmaison-marketing-redesign.md`,
`src/app/uae-get-started/**` (held — read only to record it). Register rows: `steps/reg-S35.md` (REG-S35.1…14). Probe:
`design-source/verify/pending-modules/verify-pm2-s35.cjs` (**see *Probes run***); shots in `design-source/verify/pending-modules/pm2-s35/`.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "Home, Platform hub and the 8 module pages, Story, Trust & Security" | **built** — 1.0's pages section by section, in 2.0's names (AI Visualizer · 3D Space Planner · Upload a quote · Finance & Margins · Leads · Projects · Meeting Copilot · Maison AI), 1.0's art direction on the house tokens, the frame (bar + mega panel, phone bottom bar + Platform sheet + raised Demo, footer), a ghost per page, 1.0's first-visit intro on Home | `app/site/**`, `components/site/{home,platform-pages,company-pages,visuals,trust-banner,site-shell,site-footer}.tsx`, `lib/site/{model,platform}.ts`, `app/site/site-tokens.css` |
| "Blog index + 21 articles, What's New changelog, Jobs page" | **built** — the Journal with **1.0's 11 articles** (1.0 holds 11; the card's 21 was a miscount), categories in the address, an article's reading bar · contents · share · related; **What's New: 29 of 1.0's 30 releases** (Multi-currency reporting removed — markets held); **Jobs: 1.0's four roles**, apply by email | `components/site/{blog,changelog-view,company-pages}.tsx`, `lib/site/blog/**`, `lib/site/changelog.ts` |
| "Contact form (saved, and emailed to the team), the footer's newsletter sign-up, 'Book a demo' form → Calendly" | **built · the email a stand-in** — contact → `contact_messages` + the team's email in the outbox (1.0's subject); newsletter → `newsletter_subscribers` (one row an address, no enumeration, no email — 1.0's); Book a demo → `beta_signups` + the team's email + Calendly (1.0's real page, prefilled, in the house dialog; the link as the way round). The outbox records the emails (Sent messages) until the developers plug in a provider (`setDeliveryAdapter`) | `app/site/actions.ts`, `components/site/{book-demo,contact,site-footer}.tsx`, `lib/site/{forms,team-mail}.ts` |
| "Privacy, Terms, Cookies pages" | **built** — Privacy and Terms are 1.0's text verbatim (23 March 2026); **Cookies rewritten to the cookies 2.0 sets** (the probe reads the app's code and checks the policy names every one) | `components/site/legal.tsx` |
| "SEO layer: metadata, structured data, sitemap, robots (blocks AI training crawlers), the branded link-preview picture" | **built** — 1.0's title template, descriptions, canonicals, Open Graph / Twitter; Organization · WebSite · SoftwareApplication · BreadcrumbList · Article JSON-LD; `/sitemap.xml` (the site only, What's New added); `/robots.txt` (the site and what draws it; GPTBot · Google-Extended · Bytespider · CCBot blocked; ChatGPT-User · PerplexityBot allowed on the site); `/llms.txt`; the card at `/card/site/<page>` (S02's route, a `site` branch) | `lib/site/seo.ts`, `lib/site/card.tsx`, `app/{sitemap,robots}.ts`, `public/llms.txt`, `app/card/[kind]/[key]/route.ts` |
| "UAE free-trial landing page /uae-get-started (regions beyond Singapore are held, DEF-30)" | **parked — her hold** (2026-10-12, REG-1854): no page, no redirect; 1.0's address answers the app's own 404 | — |
| "The site's words describe 1.0's modules and names (Quote Digitizer, Meeting Co-pilot, mAIson bot) — they will need updating to 2.0's (Quote X-Ray / Upload a quote, Maison AI) when 2.0 ships" | **built** — every page, the metadata, `llms.txt`, the changelog and the Journal in 2.0's names; claims 2.0 doesn't make taken out (lists below); 1.0's module addresses redirect to 2.0's names | `lib/site/**`, `components/site/**`, `next.config.ts` |
| (book-a-demo) "Book a demo form → beta sign-up list + Calendly" | **built** (the list itself is Platform admin's — excluded; the rows are 1.0's for it) | as above |
| (book-a-demo) "The UAE campaign landing page" | **parked — her hold** | — |
| *(S30's note)* "by proceeding you agree to the terms & conditions" under sign-in — OpenMaison's terms come with the site | **built** — "By continuing you agree to OpenMaison’s Terms of Service and Privacy Policy." closes sign-in's and sign-up's foot (and their ghosts); the mark opens the site | `components/auth/terms-line.tsx`, `studio-sign-{in,up}.tsx` |
| *(S31's note)* the site's "Start free" goes to `/sign-up`; 1.0's feature-pitch screens belong on the site | **built** — every footnote "Free to start · No card needed." carries *Start your studio* → `/sign-up`; 1.0's tour lines are the site's module pages already (lead inbox, chat, quote reading, project tracking) — its "AI Lead Prioritizer (Hot / Warm / Cold)" and "geo check-ins" are not 2.0's and stay out | `components/site/primitives.tsx` (`Footnote`) |
| *(S25's note)* does the pricing page show the latest Market Insights articles? | **kept hidden, so no** — 1.0's pricing page was hidden before launch and redirected home; it stays so (`/pricing`, `/site/pricing` → Home); Market Insights stays the studios' feed in the app, the Journal the site's (one home each) | `lib/site/model.ts` `OLD_SITE_ADDRESSES` |

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
1. **The site lives in this repo, at `/site`** (card question 1): one home that keeps 2.0's names, claims and doors true; the developers may
   publish it at the domain's root (`PUBLISHED_SITE` = `NEXT_PUBLIC_SITE_URL`, default `https://openmaison.ai`, is every canonical address).
2. **Sign-ups land in 1.0's own three tables** (card question 2), and a demo request and a message also reach the team as an email through the
   house outbox (shown in Sent messages). Staff's list is Platform admin's.
3. **Calendly inside the house dialog** (1.0 used Calendly's popup script): nothing reaches Calendly before the visitor asked for a demo; the
   link opens it in a tab when a network blocks the frame.
4. **The art direction is a scoped token sheet on the DS tokens**, never a second design system: the paper, the type, the tiles, the motion
   named once; 1.0's mono font and letter-spacing are not carried (the house type rule).
5. **2.0's names everywhere, and a claim 2.0 doesn't make is cut rather than reworded into something new** — the two exceptions, where a grid
   needed its card: Upload a quote's *Margin check* and *Quote X-Ray* (both 1.0's own words from its changelog / X-Ray release).
6. **Module capability grids draw pictures only when every card has a true one** — Leads and Upload a quote wear icons (1.0's pictures showed
   lead temperatures and add-on picks).
7. **1.0's addresses redirect temporarily (307)** — permanent once the site is published.
8. **The newsletter sends nobody an email** (1.0 sent none); the contact form's and Book a demo's emails go to hello@openmaison.ai only.
9. **Limits as 1.0 set them**: ten demo requests a minute from one address, five messages, five newsletter sign-ups (S30's limiter, now with a
   per-caller figure).

## Every changed sentence (1.0 → the site)

**Names, everywhere** (pages, menus, footer, metadata, `llms.txt`, changelog, Journal): AI Visualiser → AI Visualizer · Space Planner → 3D
Space Planner · Quote Digitizer → Upload a quote · Meeting Co-pilot / mAIson Live → Meeting Copilot · mAIson bot / mAIson Bot → Maison AI ·
client hub / Homeowner Portal / homeowner portal → client portal · "Powered by …" lines in the new names · the Beta tags on Space Planner
and Meeting Co-pilot removed · the menu blurb "All prospects, prioritized by AI" → "Every enquiry in one place" · the module icon `hub` →
`layers`; the pictures' alt texts say what they now show (no score, no upsell).

**Home** — the description "Digitise quotes in 30 seconds … Built for studios in Singapore, Malaysia, UAE & India." → "Read quotes in 30
seconds … Built for studios in Singapore."; the Open Graph line "Digitise quotes in 30s." → "Read quotes in 30s."; the hero's lead card
"Scored on budget fit + intent" (and its AI score) → out; the hero's quote card "+ Smart lighting (suggested upsell)" → out; the proof tile
"4 markets — SG. MY. AE. IN, all with local context." → out (three tiles).

**Platform hub** — Upload a quote's card "…Spot underquoted work, uncover upsell opportunities and improve margins." → "…Spot underquoted work
and improve margins."; Leads' card "…Hot leads are highlighted so you can convert more." → "…so you can respond faster and convert more.";
the matrix "Auto-captured from all sources, AI-prioritised" → "Auto-captured from all sources", "AI margin-check, import any pdf" → "AI
margin-check, import a PDF quote", "Branded client hub for all updates & documents." → "Branded client portal for all updates & documents.",
"AI answers any business question" → "AI answers your business questions".

**Upload a quote** — subcopy "…Spot under-quoted work, uncover upsell opportunities and improve margins in under one minute." → "…Spot
under-quoted work and improve margins in under one minute."; step 2 "Review under-quoted items and upsell opportunities, so…" → "Review
under-quoted items, so…"; capabilities "Turn any PDF quote into…" → "Turn a PDF quote into…", "Margin intelligence (Coming soon) — Spot under-quoted
items using regional benchmarks." → "Margin check — See your margin on every line, with a flag wherever a price looks thin.", "Revenue
opportunities — Get add-on recommendations…" → "Quote X-Ray — Drop in a quote — yours or a competitor’s — and see straight through it."; the held FAQ "It
checks each line against regional benchmarks…" → "It reads each line’s cost and price and flags the ones that sell below cost or on a thin
margin…".

**Finance & Margins** — subcopy "…commissions, variation orders and region-specific taxes built-in." → "…and GST built-in."; the held FAQ
"Eleven, including P&L, GST, AR/AP aging…" → "Ten, including…".

**Leads** — step 2 "See budget, source, location, hot/warm/cold labels and more." → "…days in stage and more."; the capability *Lead
scoring* ("Automatically labels leads as hot, warm or cold…") → out; the held FAQ "What does the AI score mean?" → out.

**Projects · Visualizer · Space Planner** — "…share it straight to your client hub." / "…send to client hub for sign-off." / "Progress updates
flow automatically to your branded client hub." → "client portal" (each).

**Maison AI** — subcopy "Behind the scenes, 20+ AI agents analyse your data…" → "Behind the scenes, Maison AI analyses your data…"; the
capabilities *Twenty specialists. One chat.* and *Transparent reasoning* ("Easily view the steps behind a response…") → out (two cards);
step 2 "mAIson bot responds…" → "Maison AI responds…"; the held FAQs on twenty agents and reasoning steps → out.

**Trust & Security** — "We operate across Singapore, Malaysia, the UAE and India, and we tell you where your data lives in each region." →
"We operate in Singapore, and we tell you where your data lives."; the page description's "regional data residency" → "where your data lives".

**Footer** — 1.0's market flags (four countries, a region picker) → Singapore's ("Available in Singapore").

**What's New** — *Multi-currency reporting* (the whole release: one financial picture across markets, live currency conversion, each entity's currency) → out; *Ready for every market* → title "Never lose a lead", its summary "Run your studio anywhere in the region —
and never lose a lead." → "Assign a whole team to a lead, and reach clients on WhatsApp.", its line "Full support for Singapore,
Malaysia, the UAE, India and Egypt…" → out; *A faster app, and insights for owners* → "A faster app", its summary "…— and owners get a clearer view of how the studio
runs." → "…." and "A new owner dashboard: see how the team uses OpenMaison…" → out (Studio Health is S39's); *Leads that keep themselves on track* — "As you work a lead … it advances to the right
stage on its own." → out, summary "…— automatically." → "…."; *The AI Visualiser gets much sharper* → "…AI Visualizer…", "Protect areas with
masked edits, remove an object…" → "Remove an object…"; *The Homeowner Portal…* → "The client portal…", "Choose from five portal looks to match
your brand." → out; *X-ray any quote* — "Prices are checked against local market rates…" and "Share the analysis with a private link." → out;
*An AI co-pilot in every meeting* — "mAIson Live sits in the meeting" → "the Meeting Copilot sits in the meeting"; *Ask your studio anything* —
"mAIson Bot is a business analyst…" → "Maison AI is…"; *Quote smarter* — "Quote Digitizer 2.0, backed by your own Price Book of managed
rates." → "Upload a quote, backed by your own Price book of managed rates.", "Draft and edit an entire quote just by chatting with an AI
assistant." → "Draft an entire quote by describing the scope to Maison AI.", "…with a pinch-to-zoom preview." → "…with a preview that fits
your screen."; *Approvals, permissions and beautiful emails* — "Set roles and permissions, and route quotes and tasks through approval…" →
"Set each member’s role, and route quotes through approval…", "Fine-tune permissions for individual team members." → out (the roles editor
is her hold); *A faster, richer quote editor* —
"…from your Price Book." → "…from your Price book."; the "Meeting Copilot, rebuilt" release's title (was "mAIson Live, rebuilt").

**Book a demo** — "We’ll send you a confirmation email. No spam, ever." → "Calendly sends your confirmation once you pick a time. No spam,
ever." (1.0 sent none; Calendly does); "{digits}-digit number for this region." → "8-digit Singapore number"; "Pick a Time" → "Pick a time";
1.0's "You’re in! Opening Calendly… If it doesn’t open, click the link below." → the Pick a time dialog itself, its foot "Calendly not
showing? Open it in a new tab"; the errors are the house's (MSG).

**Contact** — "Send Message" → "Send message"; "Tell us how we can help..." (a placeholder) → the house field's label "Message"; "Something
went wrong. Please try again, or email hello@openmaison.ai directly." → "Couldn’t send your message — please try again, or email
hello@openmaison.ai directly."; the newsletter's "Couldn’t subscribe right now. Please try again." → "Couldn’t add you to the list — please
try again".

**Cookies** — rewritten (REG-S35.12): 1.0's rows for its admin panel, homeowner hangouts, HMAC sessions, theme / skin / language and
performance monitoring → 2.0's `om_session` · `om_seen` · `om_portal` · `om_pv_…` · `om_reports_tab` / `om_reports_finance` · `om.*` storage;
"Our authentication cookies expire after 24 hours" → each cookie's own lifetime in the table; Calendly added as a third party; dated 13 October 2026.

**Kept as 1.0 wrote them, flagged:** Privacy (its §5 security specifics describe 1.0's hosting — the developers confirm them for 2.0) and Terms
(its §2 says "quote digitization" — legal text is not reworded here); Story's "Join as an early member to get lifetime fixed pricing." (the
company's offer); Jobs' "Customer Success Lead, SEA · Singapore / KL" (a company role, not a market claim); the Journal's editorial pieces on
Dubai's industry (about the trade, not the product); "Upload a PDF quote" (2.0 reads a spreadsheet for real and a PDF through the developers'
document reader — the app's own chip says XLSX · CSV until then, S04).

**The Journal's 36 edits** (`lib/site/blog/**`, applied by rule — markets, model names, 1.0's internals):

| Article file | 1.0 said | The site says | Why |
| --- | --- | --- | --- |
| `articles.ts` | It's designed for studios in Singapore, Dubai, and other growing markets. The difference is AI: 20+ tools including a meeting co-pilot, quote digitiser, and room visuali… | It's designed for studios in Singapore. The difference is AI: 20+ tools including the Meeting Copilot, Upload a quote and the AI Visualizer, plus a finance module that h… | 2.0's names; markets beyond Singapore are on hold (her word 2026-10-12) |
| `articles-batch-3.ts` | the AI co-pilot and automated lead follow-ups | the Meeting Copilot and automated lead follow-ups | 2.0's name |
| `articles-batch-5.ts` | { label: "OpenMaison markets", value: "SG · MY · AE · IN", source: "openmaison.ai" }, | *(removed)* | markets beyond Singapore on hold |
| `articles-batch-5.ts` | It's a studio operating system built for markets like Singapore, Dubai, and Malaysia. The core difference is AI: the platform includes over 20 AI-powered tools, from a m… | It's a studio operating system built for Singapore's studios. The core difference is AI: the platform includes over 20 AI-powered tools, from the Meeting Copilot that li… | 2.0's names; Singapore only |
| `articles-batch-5.ts` | Yes, 4-bucket kanban with auto follow-up tasks | Yes, a stage-by-stage kanban with auto follow-up tasks | 2.0's seven stages, not four buckets |
| `articles-batch-5.ts` | Singapore GST (9%), Dubai VAT (5%), Malaysia SST (6%) | Singapore GST (9%) | Singapore only |
| `articles-batch-5.ts` | Full PO lifecycle with vendor portal and GRN tracking | Full PO lifecycle with the vendor's own link and delivery tracking | 2.0's PO link and Mark delivered |
| `articles-batch-5.ts` | Yes, React Three Fiber editor with collision detection | Yes, a 3D editor with collision detection | 1.0's library name |
| `articles-batch-5.ts` | Yes, AI photorealistic renders via Gemini | Yes, AI photorealistic renders | no model named — the model is the developers' |
| `articles-batch-5.ts` | No built-in marketplace | Leads from Qanvast; no homeowner marketplace | 2.0 has Qanvast's leads and a brands Marketplace, not a homeowner marketplace |
| `articles-batch-5.ts` | AI quote digitiser | AI quote reading (Upload a quote) | 2.0's name |
| `articles-batch-5.ts` | WhatsApp-style chat with escalation tracking | Client messages with ticket tracking | 2.0's Messages and tickets |
| `articles-batch-5.ts` | SG, MY, AE, IN with region-specific property types and compliance | Singapore, with its property types and compliance | Singapore only |
| `articles-batch-5.ts` | Yes, tag-based (owner/admin/id) with data filtering | Yes, Owner, Admin, Designer and Accounting roles, with who sees which leads | 2.0's roles and Who sees leads |
| `articles-batch-5.ts` | Yes, HDB (Singapore), DDA/Trakhees (Dubai) | Yes, HDB and Singapore's renovation rules | Singapore only |
| `articles-batch-5.ts` | QuickBooks, Xero, Gmail auto-ingest | Xero, Gmail auto-ingest, webhooks | 2.0's integrations (no QuickBooks) |
| `articles-batch-5.ts` | The meeting co-pilot, for instance, uses Gemini 2.5 Flash to transcribe client conversations in real time and surfaces coaching cards only the designer can see. The quot… | The Meeting Copilot, for instance, transcribes client conversations in real time and surfaces coaching cards only the designer can see. Upload a quote parses contractor … | 2.0's names; no model named |
| `articles-batch-5.ts` | Regional fit matters too. OpenMaison handles Singapore's 9% GST, Dubai's 5% VAT, and Malaysia's 6% SST natively. Property types are region-specific: HDB 3-Room, 4-Room, … | Local fit matters too. OpenMaison handles Singapore's 9% GST natively. Property types are Singapore's: HDB 3-Room, 4-Room, 5-Room and Executive, condos and landed homes.… | Singapore only; 2.0's name |
| `articles-batch-5.ts` | Pick OpenMaison if you're based in Singapore, Dubai, Malaysia, or similar markets and want AI tools | Pick OpenMaison if you're based in Singapore and want AI tools | Singapore only |
| `articles-batch-5.ts` | { label: "Audio chunk interval", value: "5 seconds", source: "OpenMaison co-pilot technical spec" }, | *(removed)* | 1.0's implementation detail |
| `articles-batch-5.ts` | In concrete terms, here's what happens during a session on OpenMaison's co-pilot: | In concrete terms, here's what happens during a session on OpenMaison's Meeting Copilot: | 2.0's name |
| `articles-batch-5.ts` | Every five seconds, the audio is captured as a standalone WebM file, converted to base64, and sent to the server. There, Gemini 2.5 Flash transcribes the speech into tex… | *(removed)* | 1.0's implementation (WebM chunks, Gemini) — not 2.0's |
| `articles-batch-5.ts` | Every third audio chunk (roughly every 15 seconds), the context engine runs. It takes the recent transcript, the running conversation context, and the studio's project d… | As the conversation runs, the co-pilot reads the recent transcript, the running conversation context, and the studio's project data, then produces several outputs: | 1.0's timing internals |
| `articles-batch-5.ts` | Each card has a type, a priority score from 1 to 10, and a brief explanation. The system generates at most three cards per cycle to avoid overwhelming the designer. Here… | Each card has a type and a brief explanation. Here's | 1.0's ranking internals |
| `articles-batch-5.ts` | The co-pilot surfaces: "Premium pull-out organiser with soft-close, 65% acceptance rate, ~S$2,800." That acceptance rate comes from aggregated data across the studio's p… | The co-pilot surfaces: "Premium pull-out organiser with soft-close, ~S$2,800." | 2.0 keeps no acceptance rates |
| `articles-batch-5.ts` | The estimate pulls from a lookup table of 30 Singapore market rates, built from averaged Qanvast platform data. | The estimate pulls from a table of Singapore market rates, built from averaged Qanvast platform data. | 2.0's table holds 32 rates |
| `articles-batch-5.ts` | There's a 90-second cooldown between these to prevent them from becoming annoying. | *(removed)* | 1.0's timing internals |
| `articles-batch-5.ts` | Cards are ranked by a composite score: 40% AI-assigned priority, 25% recency, 20% type urgency (alerts rank highest, quote items lowest), and 15% engagement rate (how of… | *(removed)* | 1.0's ranking internals |
| `articles-batch-5.ts` | When the score crosses a tier boundary, the co-pilot generates a whisper card. For a Hot score: "Customer is ready to commit. Suggest next steps such as timeline confirm… | *(removed)* | 1.0's tier-change whispers and their cooldown — not 2.0's |
| `articles-batch-5.ts` | The shadow quote also tracks headroom: if the client stated a budget of $80,000 and the running estimate is at $72,000, the designer can see there's roughly $8,000 of ro… | *(removed)* | 1.0's headroom alert — not 2.0's |
| `articles-batch-5.ts` | When the designer ends the session, the system generates a post-meeting brief within 60 seconds. The brief is built by feeding the full transcript, all AI cards generate… | When the designer ends the session, the co-pilot writes a post-meeting brief within 60 seconds, from the full transcript, the cards raised during the meeting, the shadow… | no model named |
| `articles-batch-5.ts` | The system relies on Gemini's speech-to-text, which works best with clear audio from a single direction. | Speech-to-text works best with clear audio from a single direction. | no model named |
| `articles-batch-5.ts` | We've added an anti-hallucination prompt ("Do NOT invent speech. If silent, return empty array.") but the quality of the AI output is directly tied to the quality of the… | The quality of the AI output is directly tied to the quality of the audio input. | 1.0's prompt |
| `articles-batch-5.ts` | Gemini handles standard English and Mandarin well. Singlish, with its mixed vocabulary and tonal patterns, is less reliable. Arabic accents in our Dubai testing produce … | Speech-to-text handles standard English and Mandarin well. Singlish, with its mixed vocabulary and tonal patterns, is less reliable. | no model named; Dubai on hold |
| `articles-batch-5.ts` | The shadow quote pulls from a static lookup table of 30 Singapore renovation item categories with min/max/typical price ranges. | The shadow quote pulls from a table of Singapore renovation items with min/max/typical price ranges. | 2.0's table holds 32 rates |
| `articles-batch-5.ts` | the co-pilot can run in manual mode. The context engine runs on timer ticks rather than audio chunks, and the designer gets deal scoring and quote tools without transcri… | the co-pilot can run on typed notes: the designer types or pastes what was said, and still gets the tips, deal scoring and the estimate. Less useful, but it's there as a… | 2.0's typed-notes room |

## Found and fixed on the way
- **A server-rendered page swallowed its own 404** — a `notFound()` under a parent's streamed `loading.tsx` answered 200: the site's parent
  pages live in route groups (`(home)` · `platform/(hub)` · `blog/(index)`), as REG-708 does for the app.
- **Hydration errors from reduced motion** read during hydration (the scan line, the counters) — `useReduced()` reads it after (server
  snapshot false).
- **A form's server errors vanished as you typed elsewhere** (spreading `{ email: undefined }`) — `withServer(own, server)` in `lib/forms.ts`.
- **The Terms line made sign-in's foot 8 px taller than its ghost** (the house link's 14/20 type inside 12/16 fine print) — `.fineLink`, the house
  link at the line's own size (S30's ghost check holds again).
- **Two dialogs crossed** (the form fading out over Calendly fading in) — Calendly opens once the form has left.
- **robots blocked what draws the pages** (`/_next/static`, the icon font, the logo the structured data names) — allowed for crawlers.
- **The mega panel opened on hover and shut on the click that came with it** — hover opens after 120 ms; a press toggles.
- **Titles without the brand** — 1.0's template "{page} | OpenMaison" (`brandedTitle`).
- **Calendly's body was an empty white box until it loaded** — "Opening Calendly…" under the clear frame; its fallback link sits in the
  house foot's start slot (`FootStart`).
- **Book a demo was limited at five a minute; 1.0 allowed ten** — `takeTry` takes a caller's figure.
- **The Cookie Policy missed the portal's test-client cookie** (`om_pv_…`) and said "Persistent" for a one-year cookie — the table now matches
  the code (and the probe reads the code to keep it so).
- **Three What's New lines claimed what 2.0 doesn't do** (editing a quote by chat, a pinch-to-zoom preview, per-member permissions) — cut or
  made true.

## Found in 1.0, not on a card
- **1.0's web manifest** (`src/app/manifest.ts`: name, icons, theme colour) — an install surface for the studio app, not the site — **for the
  developers / Vicky** (2.0 has no app icon set yet).
- **1.0's Arabic pages** (`messages/ar.json`, right-to-left) — Languages, parked (S38).
- **The UAE page's own FAQ, AED / VAT pitch and free-trial form** — her hold (with the page).
- **1.0's `/try`** (the Visualizer without an account) — **S36**; the Visualizer page's calls are Book a demo until then.
- **1.0's older landing parts** (hero particles, aurora, the v1 visualizer demo) — unused by 1.0's live site; not ported.
- **The articles' image-generation prompts** (1.0 kept them beside the articles) — not shipped; the covers are converted pictures.
- **1.0's Vercel analytics** — the developers' (the Cookie Policy's analytics paragraph says "may").
- **1.0's contact email set the visitor as reply-to** — the outbox has no reply-to field; the email's body opens with the visitor's name and
  email; **for S34 / the developers** (their provider sets it from the record).

## What to check in the browser
- **Signed out**, 1440: `/site` — the statement, Show me the better way, the hero's rotating word and cards, the pillars, the ledger, the
  integrations, security, the proof tiles, the footer. **Platform ▾** (hover, or press) → the panel's three pillars and eight modules; pick
  one → its page. Story · Resources (the Journal) · an article → Back to Journal returns to your category.
- **Book a demo** → press Book a demo with nothing typed (four "This field is required"), then a bad email and a short number (the house
  messages), then good details → **Pick a time** with Calendly prefilled (a network is needed; *Open it in a new tab* otherwise). Signed in as
  Dane: **Settings › Notifications › Sent messages** → "To the OpenMaison team · A demo request".
- `/site/contact` → send a message ("Message sent!"); the footer's newsletter → "Thanks, you’re on the list."; again with the same address →
  the same answer.
- `/sign-in` → the mark opens the site; the Terms line's two links open the site's Terms and Privacy.
- 1.0's addresses: `/platform/quote-digitizer`, `/about`, `/pricing`, `/blog/<an article>`.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/card/site/home` (the link-preview picture).
- **390 touch:** the bottom bar (Home · Platform sheet · the raised Demo · Resources · Story), Book a demo as a bottom sheet over the bar,
  Pick a time full screen, an article's contents fold; no sideways scroll at 390 / 320.

## Probes run (lane A, :3160, scratch copies of `pbuild/base.db` migrated + repaired)
| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s35.cjs` (this step) | **138 / 138** — the scratch DB put back as found (the four watched tables, leads' stages, stage logs), no page errors |
| `pending-modules/verify-pm2-s30.cjs` (main's copy — S22's front-door assertions) · `verify-pm2-s31.cjs` (main's copy) | **108 / 108** · **104 / 104** (sign-in's and sign-up's ghosts with the Terms line) |
| `pending-modules/verify-pm2-s02.cjs` (the card route) · `verify-pm2-s22.cjs` (the front door) | **105 / 105** · **116 / 116** |
| Sent messages and the outbox: `parity-map-build/verify-pm-g.cjs` · `projects/verify-pj-gap-e.cjs` · `projects/verify-pj-gap-h.cjs` · `pending-modules/verify-pm2-s09.cjs` · `s18` · `s19` | **59 / 59** · **55 / 55** · **80 / 80** · **79 / 79** · **63 / 63** · **116 / 116** |
| `ghosts/verify-ghosts-same.cjs` 1440 · 390 touch | **66 / 66** · **66 / 66** — every loader is its reveal |
| `npm run design:anatomy` | **87 pages, 270 table heads, 26 dialogs, 41 page menus — all 1,717 measures hold** |
| `tsc --noEmit` · `eslint app components lib proxy.ts` · `design:lint` · `next build` (`DATABASE_URL=file:<scratch>`, under the lock) | clean · 0 errors (16 warnings, none in this step's files) · nothing new breaks a house rule · exit 0 |

## Migration and repair
- **Migration `0106_site_s35.sql`** (lane number; main regenerates it after S34's 0106): `beta_signups` (id, name, studio_name, email, phone,
  source_page, created_at; indexes on email and created_at), `contact_messages` (id, name, email, subject, message, source_page, created_at),
  `newsletter_subscribers` (id, email unique, source_page, created_at, unsubscribed_at) — 1.0's three tables and columns, additive. All three
  in `BASELINE_TABLES` and the snapshot's `TABLES`.
- **Repair R122** — nothing to write; five checks (REG-S35.14). Full repair: all checks pass. **Next free in lane A: R123.**

## Shared pieces changed
- `lib/notifications/outbox.ts` · `lib/notifications/delivery.ts` — the event type takes the site's two events (`SiteEvent`); nothing else.
- `app/notifications/outbox-actions.ts` (the filter's events) · `app/settings/sent-messages.tsx` (the two labels, the event filter) — Sent
  messages names the team's emails.
- `lib/forms.ts` — `withServer(own, server)` (server errors merged only where the server named one).
- `lib/auth/limit.ts` — `takeTry(key, now, max = 5)`: a caller may carry its own figure (every existing caller unchanged).
- `lib/auth/paths.ts` — `/site` in `PUBLIC_PATHS`. `next.config.ts` — `redirects()` from `OLD_SITE_ADDRESSES`.
- `app/card/[kind]/[key]/route.ts` — the `site` branch before the link cards (S02's kinds unchanged).
- `components/auth/studio-sign-in.tsx` · `studio-sign-up.tsx` · `sign-in.module.css` — the mark is a link to the site (focus ring), the Terms
  line last in the foot and in the ghosts (`components/auth/terms-line.tsx`, `.fineLink`).
- `lib/db/schema.ts`, `lib/db/baseline.ts`, `scripts/snapshot-baseline.ts`, `scripts/repair-demo-data.ts` (R122).
- New, the site's own: `app/site/**`, `app/{robots,sitemap}.ts`, `components/site/**`, `lib/site/**`, `public/site/**` (≈5.2 MB of 1.0's
  pictures, converted), `public/llms.txt`.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock: 1.0's published site is the reference, ported page by page; every changed and
   invented line is in REG-S35.1…14 and above.
2. **One system, no one-offs** — the site's look is a token sheet on the DS tokens (`design:lint` holds); the house `Dialog` (form, modal,
   `FootStart`), `TextField` (+65 leading, the phone grouped), `Chips`, `ChipRail`, `CompareSlider`, `Sheet`, the snackbar, `couldnt`, the
   ghost kit (`GhostSheet` · `Bone` · `Words`), the outbox, S02's card route, S30's limiter.
3. **Plain words** — 1.0's own words, 2.0's names; the refusals the house's ("This field is required", "Enter a valid email address", "Too many
   tries — wait a minute and try again").
4. **Nothing is lost** — every request is kept before anything else happens; a refused one writes nothing; a newsletter address kept once; the
   form keeps what was typed until it lands; 1.0's old addresses still land.
5. **Say why** — each refusal names the field; the contact form's failure says to write to the team directly; Calendly's frame says it is
   opening and offers the tab.
6. **Back returns where you came from** — an article's Back returns to the Journal's category you came from (`?from=` / `useBack`); Esc closes
   the panel and gives focus back to Platform ▾; the dialog returns focus to its opener.
7. **Every screen is whole** — each page has its loader and ghost (its own heading's words as bars; 0 px on a slow hop at 1440 · 390), a
   real 404 in the site's frame, inline errors, the snackbar host, the skip link.
8. **Every width is designed** — 1440 · 1024 · 768 · 390 · 320 without sideways scroll (against `screen.width`); ≤1024 the bottom bar; the
   form a bottom sheet over it, Calendly full screen on a phone.
9. **Tables follow the leads listing** — not applicable (the site has no data table; the legal tables are prose).
10. **Motion with purpose** — 1.0's reveals, word stagger and intro on `lib/site/motion.ts`; reduced motion keeps only opacity (the house
    `MotionConfig`), never plays the intro, never hides content.
11. **Honest data** — every record is a visitor's own, written as 1.0 wrote it; the stand-ins said plainly (the team's email recorded, not
    sent; Calendly's real page); no claim on a page 2.0 doesn't make; R122 checks the records' shape.
12. **Reach for everyone** — labelled fields with their errors described, a labelled dialog, the mega panel and the sheet keyboard-reachable,
    focus returned, the skip link, `aria-live` on the Calendly line and the newsletter's thanks, alt text on every picture.
- **How to add a missing thing:** one home (the site at `/site`, OpenMaison's own; the app keeps its front door; the Journal apart from Market
  Insights); doors elsewhere (sign-in's mark and Terms line, the footnotes' *Start your studio*); shown only when it applies (the intro once a
  session, never with reduced motion; the Calendly line until it loads); **one filled button** per call (Book a demo); defaults that need no
  set-up (the published address from one setting, 1.0's limits).

## Flags for Vicky
- **No mock** — 1.0's live site is the reference, its art direction on the house tokens (the warm paper, Playfair headings — the only place
  Playfair is used).
- **The site lives in this repo at `/site`** (the card's question; "skip" was the survey's recommendation).
- **1.0's first-visit intro** plays on Home once a session — keep or drop.
- **Calendly in a house dialog** rather than Calendly's popup.
- **Privacy and Terms verbatim; Cookies rewritten** for 2.0.
- **"Start your studio"** after every "Free to start · No card needed." (S31's door), and the Terms line under sign-in / sign-up.
- **Story's "lifetime fixed pricing" offer** and **"Upload a PDF quote"** kept as 1.0 said them.

## For the next steps
- **S36 (Try the Visualizer without an account):** the Visualizer page's two calls (`components/site/platform-pages.tsx`, `ModulePage`) become
  *Try now*; 1.0's `/try` joins `OLD_SITE_ADDRESSES` (and `PUBLIC_PATHS`).
- **S39 (Studio Health):** the What's New line "A new owner dashboard: see how the team uses OpenMaison…" (removed here) can return to its
  release (`lib/site/changelog.ts` `faster-app-analytics`).
- **S41b:** 1.0's web manifest; the module FAQs (data in `lib/site/platform.ts` `MODULE_FAQS`, with `faqJsonLd`) if she wants them drawn.
- **The developers:** publish the site at the root (`NEXT_PUBLIC_SITE_URL`), make the redirects permanent, plug in the email provider
  (`setDeliveryAdapter`; set reply-to from `contact_messages.email`), give the platform its own outbox and the Beta sign-ups list, put a shared
  limiter in front of the forms, confirm Privacy §5's hosting facts.
- **Any new 2.0 module or name:** add it to `lib/site/platform.ts` (`MODULES`), `PILLARS`, the footer (from `MODULES`), the sitemap (from
  `MODULES`), `llms.txt` and the SoftwareApplication `featureList` in `lib/site/seo.ts`.
- **Any new cookie:** the Cookie Policy's table (`components/site/legal.tsx`) — the S35 probe fails until it is named there.
