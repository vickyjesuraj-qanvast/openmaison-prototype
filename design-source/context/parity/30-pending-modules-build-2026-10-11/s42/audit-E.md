# S42 audit · E · outside the studio and Qanvast — S24 · S25 · S27 · S34 · S35 · S36 · S37 · S41b-3 · S41b-5

Auditor E, 2026-10-14. A read-only walk of lane B's production build (`next start -p 3195`, built from main after S41b-5) on my own copy of
`s42/audit-base-2.db` (`…/scratchpad/s42/E/audit.db`, started with `CRON_SECRET` and `WHATSAPP_WEBHOOK_SECRET` as the brief shows). I used
Playwright at 1440 (mouse), 390 (`isMobile`, `hasTouch`), 768 touch, 1024 and 320. Studio pages were walked as Dane (Owner), Hui Min
(Admin), James (Manager), Germaine (Designer) and Priya (Accounting). The website, the trial, the Hangout booking pages and sign-up were
walked signed out. Shots, walk scripts and their outputs are in
`/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/e5dd05f7-6d12-4054-b5ca-a720d5c0629b/scratchpad/s42/E/`
(`shots/<walk>/…`, `*.cjs`, `sweep-*.out`, the pages' text in `text/`). At the end I ran a sign-up that carried trial work in, then used
Maison AI › Reset prototype to base. That removed the new studio, and the Marketplace, Market Insights, Hangouts and the listing all came
back from the baseline.

## Summary — 21 findings (Blocker 1 · Major 4 · Minor 10 · Polish 6)

**What's solid.** These are the step-by-step checks that came back clean:

- **Page sweep.** I opened all 44 website addresses signed out, and 31 studio addresses plus 8 public ones as Dane. I did this at 1440,
  390 and 320, and a set again at 768 touch and 1024. Nothing scrolled sideways against `screen.width` at any width. There were no page
  errors and no hydration warnings. The only 4xx answers were the 404s I asked for on purpose.
- **Marketplace.** Get deal opens WhatsApp on the press, with a prefilled message, and the ask is recorded. *Add to my vendors* links the
  brand to Finance › Vendors, and the vendor panel's *See it on the Marketplace* comes back. *Add to Price book* goes live for an Owner and
  becomes *Propose it* for a Designer.
- **Hangouts.** Apply and Take back each come with Undo. Start and End a chat writes the lead's meeting and a follow-up task. A homeowner's
  booking made on a phone becomes a Hangout lead held by the rule's designer, and lands on their own page.
- **Lead credits.** The figures add up against the records: 3,000 + 400 − 7 × 200 = 2,000. The chart, the table and the statement agree.
- **Who sees what.** The Owner-only gates say why, for Hui Min, James and Germaine. Accounting meets the house gate everywhere in my area.
- **⌘K.** Search finds brands, articles, *Listed on Qanvast*, *Reviews*, *Request reviews* and *Your public profile*. It hides *Lead
  credits* from a Designer.
- **Listed on Qanvast.** Its whole life works: Update, Send, Undo, *Changes waiting*, and the demo plays.
- **Services, crons and webhooks.** `GET /api/services` answers 401 without the secret and 405 to a POST. With the secret it lists 15
  slots and 43 seams, matching the 43 headings in `services.md`. Every `/api/cron/<job>` fails closed (401) and names its jobs for an
  unknown one. The WhatsApp webhook echoes Meta's challenge. The payments, Qanvast-listing and lead webhooks refuse plainly.
- **Trial claim.** A trial lead and a kept quote moved into a new studio through the studio's own actions, each with its `trial_claimed`
  Activity line. The demo's database stayed untouched.

**What isn't solid.**

- **The website still promises things 2.0 does not do** (E-01…E-04): live meeting transcription, reading any PDF quote, and an AI that
  "can analyse, think and act". The S35 note asked for this check, and it is the biggest gap in the area.
- **Upload a quote "reads" a PDF by its file name** (E-05, Blocker). Any file whose name contains *Stanley*, *Cove*, *Flo*, *Dyel*,
  *Sharon* or *sales contract* becomes the demo's Cove reference quote: 20 lines, S$42,680. This happens on the public trial and in Create
  Quote, and the visitor can keep the result.

## Findings

| ID | Sev | Step | Where (address · role · width) | What happens (steps) | Should (principle # / rule / REG) | Fix (smallest, in 2.0's shape; file:line if known) | Visible? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E-05 | **Blocker** | S41b-3 (+ the studio's Create Quote, S04 / REG-627 — area B's piece) | `/site/try/upload-a-quote` · a visitor, signed out · 1440. Also Create Quote › Upload a quote in the studio. | I dropped an empty, 60-byte PDF named **"Stanley flat quote.pdf"**. The page said *"20 lines read from Cove Interior's quote · S$42,680.00"* and showed a full table: design services, wet works, carpentry and more. It also said "Read in your browser — nothing is kept until you keep it", and *Keep this quote* takes those lines into the visitor's new studio as their quote. The same empty file named "my renovation quote.pdf" was refused correctly ("We couldn't read…"). The cause is `readDocument(file.name)` → `readOtherQuote(fileName)` (`lib/quotes/upload.ts:100`, `lib/xray/reference.ts:102`). It matches the *file name* against the demo's three reference quotes (`flo` · `dyel`/`sharon`/`sales contract` · `cove`/`stanley`) and never opens the file. The trial's dropzone says "XLSX · CSV" but accepts `.pdf,.jpg,.jpeg,.png` (`components/trial/trial-quote.tsx:23`). In the studio, Create Quote charges 5 AI credits for the same read. Shot: `shots/tr/20-fake-pdf-read.png`. | Principle 11 and the brief's rule 5: no fake success, and every figure must be the file's own. A stranger's quote must never be swapped for the demo's. | Match a reference by its **content**: a hash of the bundled sample files in `public/uat-files/` and `public/site/try/samples/`, never the name. Anything else goes to the rule reader (S21's `readQuoteText` for a text PDF, as B·4 recommends) or gets the existing refusal. On the trial, accept only what is read for real, and make the helper line say the same (`trial-quote.tsx:23`). Check X-Ray's `readSide` for the same name shortcut (`lib/xray/reading.ts`). | yes (what a read shows) |
| E-01 | Major | S35 (+ S36's and S41b-3's copy) | `/site/platform/meeting-copilot`, `/site/changelog`, `/site/blog/open-maison-vs-houzz-pro`, `/site/blog/ai-meeting-copilot-design-sales`, `/site/blog/interior-design-studio-tech-stack-2026`, `/site/blog/ai-transforming-interior-design` · signed out · every width | The site says the Meeting Copilot "listens, analyses and guides you in real time", offers a **"Live transcript — Focus on your client. Your co-pilot will take notes."**, and gives "AI evaluates signals…" in real time. What's New says "Real-time streaming transcription that keeps up as you talk, with each speaker labelled." and "Live transcription as you talk". The Houzz comparison has "Yes, real-time transcription", and the Journal says it "transcribes client conversations in real time". 2.0's co-pilot reads the notes the designer types or pastes (`lib/meetings/engine.ts:1-8`). A recording is transcribed only through the `transcription` seam, which is a stand-in and off. Live listening is kept out (S23, S34). | The brief's rule 5 and the S42 note (steps.md › "For S42 — the website's claims"): say only what 2.0 does. Principle 11. | Reword the page in `lib/site/platform.ts:215-228`: "Your co-pilot reads your notes as you type — tips, a deal score and a running estimate, while your client never sees a thing", and the card becomes "Notes in, brief out". Cut "with each speaker labelled" and "Live transcription as you talk" from `lib/site/changelog.ts`, or mark those as 1.0 releases. Edit the three Journal lines in `lib/site/blog/**` the way S35 edited the others. The table under *Claims, line by line* lists each line. | yes |
| E-02 | Major | S35 | `/site` (Results: "30s quote upgrade — **Upload PDF quote** & increase margins"), `/site/platform` ("import a PDF quote", "Upload a PDF quote and let AI review it"), `/site/platform/upload-a-quote` (subcopy, step 1 "Upload PDF quote.", capability "Turn a PDF quote into structured, editable line items"), Journal ×3 ("contractor PDF parsing", "You upload a contractor's PDF, the AI reads it") · signed out | 2.0's Upload a quote reads a spreadsheet (XLSX · CSV — its own chip says so in Create Quote and on the trial). A PDF is read only when it is one of the demo's references, and today only by its name (E-05). S35 kept "Upload a PDF quote" knowingly and flagged it. The S42 note asks for it to be made true. | The S42 note; Principle 11. | Either build B·4, so Upload a quote reads text PDFs by rule with S21's reader, and then these lines hold once E-05 is fixed. Or say "Upload your quote spreadsheet" and "Turn a quote spreadsheet into…" in `components/site/home.tsx:406`, `lib/site/platform.ts:116-127` and the hub matrix. My recommendation is B·4: the site's whole Upload-a-quote story rests on it. | yes |
| E-03 | Major | S35 | `/site/platform` (matrix: "AI — Agentic AI that can analyse, **think** and act"), `/site/platform/maison-ai` ("Ask **anything** about your business in natural language… analyses your data, answers questions, creates charts and takes action", "Your AI business analyst") · signed out | Maison AI answers a fixed set of questions by rule (`lib/maison-ai/intents.ts` · `answer.ts`) and proposes actions you confirm (S10). It doesn't think and doesn't take "anything". The brief names "AI that thinks" as a finding by itself. | The brief's "What counts" (a claim the product can't back); rule 5. | Matrix: "Answers your questions and does the next step when you say so". Maison AI page: "Ask about your leads, projects and money in plain English — Maison AI answers from your records, draws the numbers, and offers the next step for you to confirm." Drop "Ask anything" and "think" (`lib/site/platform.ts:241-252`, the hub's matrix row). | yes |
| E-04 | Minor | S35 × S36 | `/site/platform/visualizer` · signed out · 1440 · 390 | "Upload a room photo **or a sketch** and transform it **in real time**" and "Photorealistic renders — Life-like quick renders". S36 cut "Real renders, not filters" from the trial *because* the prototype's engine repaints the photo. S36 also says Render from sketch works on the sample sketch only, and that 2.0 reads every upload as a photo. The module page next to the trial says the opposite of the trial's own careful lines. | The S42 note; one voice across the site (Principle 2 / 3). | `lib/site/platform.ts:70-83`: "Upload a room photo and change it in seconds", "Quick, life-like renders" (S36's own wording), and the sketch line as S36 wrote it ("Render a hand sketch… on the sample sketch"), or drop "or a sketch". | yes |
| E-06 | Major | S41b-5 | Qanvast Ops › Reviews › **Request reviews** · Dane (Owner) · 1440 · 390 | The dialog opens on *Finished projects · 1* with **Shalini Menon ticked**, and *Next · 1* sends her the write-a-review link. Shalini already reviewed: "Our BTO 4-Room is finally home", 2 Oct, the top card on the page behind the dialog. Nothing in her row says so. Shot: `shots/qo/03-request.png`. | A wrong person by default (the brief's Major), and Principle 5: say why in the row. | In the finished-projects list, untick and mark a client whose review is on record ("Reviewed 2 Oct" as the row's meta, still pickable). The default ticks only those who haven't reviewed. When nobody is left, the tab says so: "Every finished project's client has reviewed you". (`components/qanvast/account/request-reviews-dialog.tsx`; match on the review's project / client as `reviewsOf` already links them.) | yes |
| E-07 | Minor | S41b-5 (the carried note) | Qanvast Ops › Lead credits › Overview, under *Closures in the last six months* · Dane · 1440 | The footnote says "Estimated from Qanvast Guarantee submissions and the dates contracts closed. For a truer rate, ask homeowners to submit the Qanvast Guarantee — or submit it for them." The stand-in that answers counts the studio's **Qanvast leads that reached Won**, by the month of the Won log, with the project's agreed value (`lib/qanvast-account/demo.ts:206-224`). 2.0 has no way to submit a Qanvast Guarantee, so the advice is a dead end. | Principle 11 (said where met), Principle 5; the carried note: "say which rule 2.0 uses". | While the stand-in answers: "Counted from your Qanvast leads that reached Won, and what their projects are worth." Keep 1.0's line for when Qanvast's real figures arrive, through the seam's flag, as the other "Simulated…" lines do. | yes |
| E-09 | Minor | S24 · S25 | `/marketplace`, `/marketplace/<brand>`, `/market-insights`, `/market-insights/<article>` · Priya (Accounting) · 1440 · 390 | The house gate reads **"This page"** as the header and **"You don't have access to This page"**. The shell's `AccessGuard` draws it, using `sectionOfPath`, and its `SECTIONS` list has no `marketplace`, `market-insights` or `meetings` (`components/shell/access-gate.tsx:35-41`), so the pages' own `<AccessGate section="Marketplace">` is never reached. Shot: `shots/mk/21-priya-gate.png`. | Principle 3: plain words that name the place. | Add `marketplace: 'Marketplace'`, `'market-insights': 'Market Insights'`, `meetings: 'Meeting Copilot'` to `SECTIONS`. | yes |
| E-10 | Minor | S24 | `/marketplace` · any role · 390 touch (also 320) | The brand cards' deal ribbons are cut to **"12…", "B…", "Ki…"** beside the *Featured* tag. Their full words show only on hover, which doesn't exist under a finger. Shot: `shots/studio-dane/phone-marketplace.png`. | Principle 8 (each width designed) and 12 (nothing by hover alone). | At ≤767, give the ribbon its own line under the picture, or say "1 deal" / "2 deals" there, as the meta line already does at a desk. Don't truncate to a few letters. | yes |
| E-11 | Minor | S27 | A Hangout lead after its chat is held (Lim Wei Ling, from Marina Bay's Chats › End › Follow-up · Site visit needed → *Open the lead*) · Dane · 1440 | The lead's Maison AI brief still reads **"FRESH LEAD · RESPOND FAST — … Call or WhatsApp within 24h"**, with *Draft intro WhatsApp* · *Auto-schedule first meet*. Beside it, Lead stages shows *Last contact: In person · Meeting held, 14 Oct* and the next follow-up "Arrange a site visit". `briefsFor('New')` drops only "No contact yet" once contacted (`lib/leads/briefs.ts:56-66`). Shot: `shots/hg/07-lead.png`. | REG-343 / Principle 11: the screen contradicts its own records. | Give a New lead that has had a meeting a brief of its own ("Met at {Hangout} — {next step}…", with actions *Open the meeting* · *Move to Met*), or settle it through the S27 flag (End offers Move to Met). | yes |
| E-12 | Minor | S27 | `/qanvast-ops/hangouts/hge-qh-2026-marina?view=meetings` · James (Manager) · 1440 | A Manager sees today's three chats with no *Start*, no *Add a walk-in* and no word about why. An Owner, an Admin or the designer on the plan has the presses. Shot: `shots/k/james-_qanvast_ops_hangouts_hge_qh_2026_marina.png`. | Principle 5: a choice that can't be made says why, in place. | One line under the chips for anyone not on the day's plan who doesn't run the studio: "Only the designers on today's plan, an Owner or an Admin run the chats — an Owner adds you on the Plan." | yes |
| E-13 | Minor | S36 (the carried note) | `/site/try/sketch` loading · a visitor · 1440 · 390 | The tool pages' shared loader draws **three** sample tiles (`<TrialGhost tool />`, `components/visualizer/trial/trial-ghost.tsx:31`). Sketch's page shows **one** (the sample sketch). | REG-708: the loader and the reveal draw the page as it is. | Make the tool ghost read its tool from the address (a client ghost, as `detail-tab-skeleton.tsx` does) and draw one tile for `sketch`. | yes (ghost) |
| E-14 | Minor | S36 × S41b-3 | The trial: a lead (`/site/try/leads`) plus a kept quote, then an own photo in `/site/try` → ⋯ › *Start your studio* → sign-up → new studio · signed out · 1440 | Sign-up says both lines ("Your room photo… comes with you" and "A lead and a quote… come with you"). Everything moves in. The new studio opens in the **AI Visualizer** (the photo's landing) with **no word** that a lead and a quote are now in Leads. S41b-3's note "… from your free trial are in your studio" only shows when the landing is `/leads`. Shot: `shots/tr/14-landed.png`. | Principle 5 / 6: say what happened where the person lands. | When both came, the landing's one snackbar names both: "Your room photo opened here — 1 lead and a quote from your free trial are in Leads", with *Open Leads* (S31's landing note). | yes |
| E-15 | Minor | S41b-5 (the carried note) | `/qanvast-ops/portfolio`, `/qanvast-ops/complaints`, `/qanvast-ops/promote` · Dane | All three answer the app-wide **404** (curl: 404, no redirect). These are 1.0 Qanvast-line addresses that may sit in bookmarks and old messages. | S41b-2's old-address rule: a 1.0 link lands where its job lives. | Add them to `lib/links/old-addresses.ts`: portfolio → *Your public profile* (`/company/members/<you>/profile`, S27); complaints → `/qanvast-ops/reviews/feedback` (what homeowners told Qanvast); promote → `/qanvast-ops/reviews/ranking` (its tips on being seen). | yes (where a link lands) |
| E-16 | Minor | S41b-5 | Qanvast Ops › Reviews · Dane · 1440 · 390 | The view chip reads **"Reviews · 2"** (390: "Reviews · 1" after one reply) while the Overview beside it says **"8 Reviews"**. The count on the chip is the waiting replies, which *Waiting for a reply · 2* already says one row down. | Principle 3 (one number, one meaning); the house view chips. | The view chip has no count, or "Reviews · 8". Keep the waiting count on *Waiting for a reply*. | yes |
| E-08 | Polish | S41b-5 (the carried note) | Lead credits › Overview › *Show the numbers* on one chart · Dane · 1440 | The other chart's card stretches to the same 630 px and becomes a mostly empty box. Both are now the same height, not different heights, but one is empty. Shot: `shots/qo/01-show-numbers.png`. | Polish (motion with purpose, no empty frames). | `align-items: start` on the pair, or one *Show the numbers* that opens both tables. | yes |
| E-17 | Polish | S25 | `/market-insights/<article>` · any role · 1440 | The byline dates "30 September 2026", while the list and ⌘K say "30 Sep '26". The sample articles' bodies use straight quotes and apostrophes (`"how much for my flat?"`, `don't`) where the house uses curly ones. | Principle 2 (one format), Principle 3. | The house date (`displayDate`, `lib/format.ts:10`) in the article byline, and curly quotes in R142's sample text (`lib/market-insights/demo.ts`). | yes |
| E-18 | Polish | S35 | *Book a demo* (every site page) · signed out · 1440 · 390; `/site/platform` closing | All four required fields have no "*". The Contact form marks its own ("Name*"). The hub's closing footnote reads "Free to start. No credit card required." where every other footnote says "Free to start · No card needed." | Principle 2 / 3: one way to mark required, one sentence for one thing. | `required` on the four `TextField`s in `components/site/book-demo.tsx`, and `Footnote line` dropped on the hub (`components/site/platform-pages.tsx:231`). | yes |
| E-19 | Polish | S27 | A Hangout's Chats cards · any role · 1440 · 768 | Each card shows the **designer's** initial avatar ("G", Germaine) beside the **homeowner's** name (Lim Wei Ling), so it reads as Lim's initial. Shot: `shots/tab/tab-qanvast_ops_hangouts_hge_qh_2026_marina.png`. | Principle 3 (no second reading). | The homeowner's own initial in the square, with the designer's small face inside "With Germaine". Or no avatar. | yes |
| E-20 | Polish | S27 | A lead opened from a Hangout's Chats (*Open the lead*) · Dane · 1440 | The crumb reads **"Hangout / Leads / Lim Wei Ling"**: `fromLabel` names `/qanvast-ops/hangouts/<id>` "Hangout". | Principle 6: Back names the place. | `fromLabel` → "Hangouts" (or the event's name, "Marina Bay") for that address (`lib/nav.ts`). | yes |
| E-21 | Polish | S37 · S41b-3 | Company › Profile › Listed on Qanvast · Germaine (Designer); `/site/try/upload-a-quote` after a read · 1440 | (a) A Designer reads "…while it waits you can play Qanvast's answer" but has no plays. (b) After a read, the focus ring on the file's title box covers the line under it ("Read in your browser — nothing is kept…" is clipped at its top). Shot: `shots/tr/20-fake-pdf-read.png`. | Principle 5 (shown only when it applies); Principle 12 (focus visible without hiding text). | (a) The play half of the line only for Owners and Admins (`components/company/qanvast-listing-card.tsx`). (b) The title's focus outline gets the house offset, or the line moves below the ring. | yes |

### Claims, line by line (for E-01…E-04 — what the site says · what 2.0 does · the line I'd put)

| Where | The site says | 2.0 does | Suggested line |
| --- | --- | --- | --- |
| Home › Results | "30s quote upgrade — Upload PDF quote & increase margins." | Reads a spreadsheet at once. A PDF only by rule after B·4, and a fake read today (E-05). | "Quotes read in seconds — upload your quote and see every line's margin." |
| Home › Results | "20+ AI capabilities — Responds. Guides. Takes action across business." | The services registry lists 19 rule-built "AI" seams plus Maison AI's Ask. Nothing calls a model. | A call for Vicky (below); my recommendation is "AI across leads, quotes, design and money", with no count. |
| Hub matrix | "AI margin-check, import a PDF quote" · "AI takes notes and helps in conversion" · "Agentic AI that can analyse, think and act" | Margin check: yes. PDF: as above. Notes: the designer types them. Agentic and thinking: no. | "Margin check on every line" · "Turns your meeting notes into a brief and a next step" · "Answers your questions and does the next step when you say so" |
| Upload a quote page | "Upload a PDF quote for a line-by-line AI review" · step "Upload PDF quote." · "Turn a PDF quote into structured, editable line items." | As above. | "Upload your quote spreadsheet…" (or keep it once B·4 lands) |
| Meeting Copilot page | "Your AI co-pilot listens, analyses and guides you in real time" · "Live transcript" | Reads typed or pasted notes. A recording only through a stand-in seam. | "Your co-pilot reads your notes as you type…" · "Notes in, brief out" |
| Maison AI page | "Ask anything… creates charts and takes action" | A fixed set of questions by rule. Answers with rows and bars. Proposes, then you confirm. | "Ask about your leads, projects and money… offers the next step for you to confirm" |
| Visualizer page | "Upload a room photo or a sketch and transform it in real time" · "Photorealistic renders" | Repaints your photo in seconds. A sketch only on the sample. | S36's words: "in seconds", "quick, life-like renders" |
| What's New | "Real-time streaming transcription… each speaker labelled" · "Live transcription as you talk" | Not in 2.0. | Cut, or mark as 1.0's |
| Journal (open-maison-vs-houzz-pro, ai-meeting-copilot-design-sales, interior-design-studio-tech-stack-2026, ai-transforming-interior-design) | "real-time transcription", "transcribes client conversations in real time", "contractor PDF parsing…", "listens to your client consultation" | As above. | The same edits S35 made for markets and names. |
| Kept (true): | 10+ finance reports (2.0 has 10) · Leads from Qanvast, Houzz and Gmail (Houzz arrives through the email sources, `platformSource`) · Gantt-style schedule you drag (`schedule-timeline.tsx`) · HDB and condo planner templates with overlap checks · e-signature and chat · GST built in | | |

## Carried notes — each S42 note in my area

- **steps.md › "For S42 — the website's claims"** — confirmed → **E-01, E-02, E-03, E-04**, with the line-by-line table above. The "20+ AI
  capabilities" count is a call (below).
- **S36 · the Sketch page's ghost draws three tiles where the page shows one** — confirmed → **E-13**.
- **S41b-3 · the Visualizer landing's floating "Try it free" pill (1.0)** — closed, not built. *Try now* already sits at the top and the
  close of `/site/platform/visualizer`, and the phone's bar raises *Demo*. A floating pill would be a second filled press riding over the
  content, against "one filled button" and Principle 10. Listed in Calls in case she wants 1.0's.
- **S41b-3 · the site's claims check now also covers the three tools** — the trial pages' own words are true ("3 of 3 free leads left",
  "Read in your browser", "1 free comparison"), with one exception, the Upload page's PDF read → **E-05**.
- **S41b-5 (landing) · `/qanvast-ops/portfolio` · `/complaints` · `/promote` unmapped** — confirmed (404) → **E-15**, with where each
  should land.
- **S41b-5 (landing) · Closures in the last six months reads 0 from 7 Qanvast leads; which rule 2.0 uses** — the rule is confirmed and it
  holds when a lead wins. A Qanvast lead counts as a closure in the month of its New→…→Won stage log, and the sum is the project's agreed
  value (`lib/qanvast-account/demo.ts:206-224`); the rate is closures ÷ leads received over the same six months (`closuresOf`,
  `lib/qanvast-account/model.ts:62`). The 0 is consistent: none of the 7 is Won. The footnote still describes 1.0's Guarantee rule → **E-07**.
- **S41b-5 (landing) · the two chart cards grow to different heights** — they now stretch to the same height, but the partner card becomes
  an empty box → **E-08**.
- **S41b-5 (landing) · Owner only — should Admins read or answer reviews** — a call, not a finding (below).
- **S41b-5 · the demo's Qanvast leads (Jul–Aug) age the six-month chart and the 30/60/90-day feedback** — confirmed. This belongs to the
  demo re-anchor in **A-03**. Add the Qanvast leads' `created_at` and their credit transactions to A-03's list of moments to move. The
  Hangouts, deals, banners and articles already move on restore (seen after my Reset: Marina Bay is still today's, the deals' windows are
  live). Without a restore, Marina Bay's three waiting chats become "Waiting" chats of an ended Hangout tomorrow, so A-03's re-anchor should
  take them too.
- **S34 · the bell's "A task is due in 30 minutes" names a "Due tomorrow" row** — not in my walk's surfaces. Auditor A confirmed it →
  **A-09**.
- **S41b-2 · `notFound()` under a loader answers 200** — seen in my area too (`/marketplace/nope`, `/market-insights/nope`,
  `/hangout/nope` → 200 with the right notice) → **A-11**. Nothing extra is needed beyond A-11's per-page decision; a client's unknown
  Hangout link is the likeliest of mine to be shared.
- **S21 · whether Upload a quote / VO / schedule uploads take PDFs by rule** — **B·4** (calls-for-vicky). It decides E-02, and E-05 is the
  reason it can't wait: today the "PDF" path fakes a reading.
- **S24 · S25 · S37** — no S42 notes.

## Calls for Vicky

1. **How the website talks about AI** (E-01…E-04). Should the site describe what 2.0's screens do today (rules; stand-ins until the
   developers plug a model in), or the product once models are plugged? *Recommendation:* today's 2.0, feature by feature, in what each
   one does. Drop "20+ AI capabilities" for a stat a list can back, and never "think". The site is the product's public promise, and the
   demo will be shown beside it.
2. **Reviews for Admins** (S41b-5's flag). *Recommendation:* Admins read reviews, reply and *Request reviews*, because they run the studio
   day to day and the work is the studio's voice. *Lead credits* stays Owner-only (it's money with Qanvast), as 1.0 had it.
3. **A Hangout chat's ending moves the lead** (S27's flag; it would also settle E-11). *Recommendation:* *End the chat* offers the stage the
   outcome implies, as S23's "held before Met" offer does: *Converted / Follow-up* → "Move {name} to Met" (pre-ticked), and *Dropped* →
   "Mark {name}'s lead as lost" with the drop reason carried into the Lost reason. Today a dropped chat leaves a New lead with no task and
   no next step.
4. **1.0's floating "Try it free" pill on the Visualizer page** (S41b-3). *Recommendation:* don't build it. *Try now* already sits at the top
   and the close of the page.
5. **The demo studio's logo is OpenMaison's mark.** The brand kit's logo is `/figma-assets/logo.svg`, so the public Hangout page, the
   portal and the client links read as OpenMaison's brand in a demo, though S27's direction was "the studio's brand, never OpenMaison's".
   *Recommendation:* give *Demo Studio* a logo of its own in the brand kit's seed (R31), as a data change.

## Walked — every surface × role × width

| Surface | Roles | Widths | What I did |
| --- | --- | --- | --- |
| Website `/site` (44 sitemap pages + 4 unknown addresses) | signed out | 1440 · 390 · 320 · 768 (4 pages) | Status, overflow, page errors, full-page shots, the text read for claims. Book a demo (empty submit, errors) at 1440 and 390 (bottom sheet). The Platform mega menu. Contact. |
| `/site/try` + six tool pages + `/site/try/{leads,upload-a-quote,quote-x-ray}` | signed out | 1440 · 390 · 320 · 768 | Visualizer: sample room, one render (V1 · Japandi, the mark, "2 of 3 left") at 390 touch. Leads: Create New Lead. Upload a quote: the sample read and keep, an own PDF (E-05), an unknown PDF refused. Sign-up with the photo, the lead and the quote carried (E-14), then Reset prototype to base. |
| 1.0 trial addresses `/try`, `/try-visualizer`, `/try-visualizer/style` | signed out | — | 307 to the trial (curl). |
| Marketplace (brands, deals, deal dialog, brand page, Add to my vendors → Finance › Vendors and back, Add to Price book, sort, search, "/", Maison AI) | Dane · Germaine (propose) · James · Priya (gate) | 1440 · 390 · 320 · 768 · 1024 | WhatsApp popup URL checked. The deal sheet at 390. |
| Market Insights (list, four articles, unknown article, ⌘K "benchmark") | Dane · Germaine · Priya (gate) | 1440 · 390 · 320 · 768 · 1024 | |
| Qanvast Ops › Hangouts (list, Apply / Undo, Marina Bay Chats: Start, End › Follow-up with notes → the lead; One-North; Suntec How it went) | Dane · Germaine (390) · James · Priya (gate) | 1440 · 390 · 320 · 768 · 1024 | |
| `/hangout/<token>`, a booking's own page, `/hangouts/<old id>`, `/hangout/nope` | signed out | 1440 · 390 · 320 | Booked as a new homeowner on a phone → own page, lead made and held. |
| Qanvast Ops › Leads · Studios | Dane | 1440 · 390 · 320 | |
| Lead credits (Overview, Show the numbers, Transactions, Contracts) | Dane · Hui Min · James · Germaine (gate) · Priya (gate) | 1440 · 390 · 320 · 768 · 1024 | |
| Reviews (Reviews, Ranking, Feedback, Reply with ⌘↵, Request reviews) | Dane · Hui Min (gate) | 1440 · 390 · 320 · 768 · 1024 | |
| Public profiles `/company/members/{germaine,dane}/profile` | Dane · Priya (gate) | 1440 · 390 · 320 · 768 · 1024 | |
| Company › Profile › Listed on Qanvast (`/verify` door, Update your listing, Send, Undo, Changes waiting) | Dane · Germaine (reads) | 1440 · 390 | |
| Company › Integrations, `/profile` | Dane | 1440 · 390 · 320 | |
| ⌘K: oak · qanvast listing · lead credits · hangout · benchmark · reviews · public profile · marketplace · deals · market insights | Dane · Germaine | 1440 | |
| `GET /api/services`; `/api/cron/*` (8 jobs + unknown); `/api/webhooks/{whatsapp,payments,qanvast-listing,leads/<token>}` | — | — | curl, with and without the secrets; ran `feeds` and `anon-sweep` (idempotent answers). |
| Old addresses: `/qanvast-ops/{portfolio,complaints,promote,leads,credits/leads,credits/packages}`, `/tools/market-insights(/…)`, `/verify`, `/marketplace?view=vendors`, unknown Reviews and Credits views | Dane | — | curl. |

**Gaps:** I didn't replay each step's own probe; the builders ran them green, as their outcomes record. I didn't walk Hui Min through the
Marketplace or the Listed on Qanvast plays, or the deal and walk-in dialogs at 320. I checked the ghosts against their pages by reading the
code (E-13), not by catching each loader. The trial's three-renders gate and the X-Ray comparison were covered by their probes; I only
spot-checked them.
