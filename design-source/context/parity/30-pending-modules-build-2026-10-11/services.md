# Real services behind the stand-ins — the developers' map (pending modules S34, 2026-10-13)

OpenMaison 2.0's prototype calls no outside service: no keys, no network. Every place where 1.0 used a real provider (Resend, 360dialog,
Twilio, Dodo Payments, Supabase Storage, Chromium, Deepgram, Xero, Google, Qanvast's APIs) or a model (OpenRouter) is a **stand-in that says
so** — and each is **one seam** you swap. This page lists them all. Its source is `lib/services/registry.ts` (the same list, as data — the
ops report and the probe read it, and the probe fails if a seam named here is missing from its file).

## How to plug a service in

1. Write the adapter to the contract below (its types are exported beside its `set…` call).
2. Call its `set…` in **`lib/services/install.ts`** `installServices()` — `instrumentation.ts` runs it once, when the server starts, before
   it serves a request. The slots live on `globalThis` (`lib/services/slots.ts`), so what you set there is what every route, Server Action
   and page of that server uses (a plain module variable would not be: Next bundles a module once per layer).
3. Two seams also need a build flag, because the browser decides: **`NEXT_PUBLIC_PDF_DOWNLOADS=1`** (every Download PDF fetches
   `/papers/pdf` instead of printing) and **`NEXT_PUBLIC_TRANSCRIPTION=1`** (the write-up dialog takes a recording with no notes).
4. Set **`CRON_SECRET`** and point your scheduler at **`GET /api/cron/run`** every five minutes (`Authorization: Bearer <CRON_SECRET>`) —
   or each job's own address (`lib/services/sweep.ts` `CRON_ROUTES`; 1.0's `notification-scheduled`, `notification-digest`,
   `accounting-sync` keep their names). Every job is idempotent; production refuses every cron call while the secret is unset.
5. Check the deployment: **`GET /api/services`** (same bearer) answers every slot — stand-in or your adapter's name — which of 1.0's env
   names the server holds, and a warning for each key set while its service is still the stand-in (the server logs the same warnings at
   start-up). Names and states only, never a value.

The env names are 1.0's wherever 2.0 reads the same service (`.env.example` lists them), so a 1.0 deployment's settings carry over.

## The addresses providers and schedulers call (all real, each guarded by its own secret, all in `PUBLIC_PATHS`)

| Address | Who calls it | Guard |
|---|---|---|
| `GET·POST /api/cron/<run · notification-scheduled · notification-digest · accounting-sync · repeats · feeds · anon-sweep · anon-storage-gc>` | your scheduler (pending modules S41b-3: 1.0’s two daily jobs for the website’s no-account workspaces keep their names and hours, 06:00 · 08:00) | `Authorization: Bearer <CRON_SECRET>` (fails closed in production) |
| `POST /api/webhooks/whatsapp?token=…` (+ `GET` for Meta's `hub.challenge`) | 360dialog / the WhatsApp Cloud API | `WHATSAPP_WEBHOOK_SECRET` (unset = 503) or the adapter's `readWebhook` (a signature) |
| `POST /api/webhooks/payments` | the payment provider | the adapter's `readWebhook` verifies; 404 while the demo checkout answers |
| `POST /api/webhooks/leads/<token>` | Zapier, Make, Typeform, Google Ads' Lead Form… | the endpoint's token (+ Google's `google_key`); 10 a minute per endpoint |
| `POST /api/webhooks/qanvast-listing` | Qanvast, with its answer to a studio’s listing application (pending modules S37) | `Authorization: Bearer <QANVAST_WEBHOOK_SECRET>` or `?token=` (unset = 503) — or the adapter’s `readWebhook` |
| `GET /papers/pdf?path=<a paper page>` | the studio's and the client's own Download PDF | the page's own permission (rendered with the visitor's cookies); 501 on the stand-in |
| `GET /api/services` | your deploy checks | `Authorization: Bearer <CRON_SECRET>` |
| `GET /api/dev/email-preview?id=<outbox id>` | you, wiring an email provider | off in production unless `OPENMAISON_DEV_PREVIEWS=1`; Owners / Admins |
| `GET /dev/ai-bench` (pending modules S41) | you — 1.0's seven AI sandboxes mapped, the four experiments that only lived there built by rule (depth · look around · camera moves · orbit clips · extend), 1.0's floor-plan corner editor, and these seams | off in production unless `OPENMAISON_DEV_PREVIEWS=1` (a real 404 before anything streams); no studio menu links it |

## What a studio sees of the stand-ins

Each says so where a studio meets it, in one plain line, and the line goes once your adapter is plugged in:
Settings › Notifications › Sent messages ("Simulated on this prototype — each message is recorded here, and none is really sent"); Company ›
Integrations — Qanvast, Website form by email, Meta Lead Ads, Email lead sources and Xero each "Simulated on this prototype — …" (the words are
`SIMULATED_WORDS` in the registry), Qanvast Ops › Lead credits and Reviews under every view (pending modules S41b-5), Calendar invites "Syncing your studio's own Google Calendar both ways comes later"; Company › Profile › Listed on Qanvast ("Simulated on this prototype — your application is kept here and isn’t sent to Qanvast…", with its "(demo)" plays of Qanvast's answer while one waits — pending modules S37); sign-in, sign-up,
joining and the client portal's code step ("Demo only — no text is sent: any six digits …"); the Plans, top-up, seats and auto top-up
dialogs ("This is the prototype, so no card is taken"); the meeting room and the write-up dialog (listening and transcription aren't
connected); Maison AI, writing help, the X-Ray, the bill reader and the planner ("by rule", "from your records"). No admin screen was added
(Platform admin is out of this build): `/api/services` is the deployment's own report.

## Rules every adapter keeps (they live in the app, not in the adapter)

- **Never twice.** Every outbox row has a key; every checkout session, credit charge, auto top-up and feed write is claimed by
  compare-and-set or upsert. Retry freely.
- **Refusals, not throws, where a person waits.** An adapter's throw is caught and becomes the row's or the press's own words.
- **The stand-in's honesty stays until the real thing is there.** Don't hide a "Simulated" line by hand — plug the adapter in and it goes.
- **WhatsApp on Free is never handed to an adapter** (`not_in_plan`); OpenMaison's pause and a large send for the Owner hold messages
  before any adapter sees them; `NOTIFY_ALLOWLIST` on a staging deployment blocks everyone off its list.
- **A client page only ever reads client-safe projections** (`clientQuoteOf` · `clientSafe`) — a renderer or a feed adds nothing to them.
- **One studio per database.** With your tenancy, a webhook's token or a wamid names the studio (1.0's central WhatsApp router forwarded
  each receipt to its studio's deployment by the wamid — Platform side, not built here).

## Every seam

### `delivery` — Email and WhatsApp messages
*Messages · a real service, behind a slot · slot `delivery`*

- **Today (the stand-in):** The outbox records every message as it would go and sends nothing; Sent messages lists them and says they are simulated.
- **In:** One message — channel, event, recipient, subject, plain text, link, the address its channel needs, and html() for an email in the studio’s colours.
- **Out:** { status: sent | failed, error?, providerRef? } — providerRef (a wamid, an email id) lets the receipts find the row.
- **When it fails:** A throw or failed is retried three times (5 min · 30 min · 2 h), then Owners and Admins hear message_failed (an invitation tells its inviter).
- **Swap:** `setDeliveryAdapter({ name, send, readWebhook? })` — `lib/notifications/delivery.ts`
- **1.0's env:** `RESEND_API_KEY` · `D360_API_KEY` · `D360_API_BASE` · `D360_DEFAULT_TEMPLATE` · `D360_DEFAULT_TEMPLATE_LANG` · `NOTIFY_ALLOWLIST`
- **A studio sees it:** Settings › Notifications › Sent messages
- **Replaces 1.0's:** src/lib/notifications/channels/{email,whatsapp}.ts · src/lib/360dialog.ts · retry.ts · recipient-allowlist.ts
- **Note:** The layer keeps every rule: keys (never twice), Who hears, daily summaries, not_in_plan (WhatsApp on Free is never handed over), OpenMaison’s pause, large sends for the Owner, NOTIFY_ALLOWLIST (blocked).

### `email-html` — The branded email page
*Messages · a real service, behind a slot*

- **Today (the stand-in):** Built only when a real email adapter asks (html()) — the studio’s logo or name, its colours, its contact lines; the record stays plain text.
- **In:** The message’s subject, words and link; the brand kit.
- **Out:** One HTML page, 600 wide, inline styles, every value escaped.
- **When it fails:** Never — a logo an email can’t carry falls back to the studio’s name.
- **Swap:** `emailHtml(page, brand)` — `lib/notifications/email-html.ts`
- **1.0's env:** —
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** src/lib/notifications/templates/render.ts · base/*
- **Note:** A first cut for Vicky to design (the card’s question). Developers preview a sent email at /api/dev/email-preview?id=<outbox id> (off in production unless OPENMAISON_DEV_PREVIEWS=1).

### `whatsapp-webhook` — WhatsApp receipts and replies
*Messages · an address that is called*

- **Today (the stand-in):** Real and guarded; nothing calls it on the prototype (the outbox reports nothing back).
- **In:** POST /api/webhooks/whatsapp?token=<WHATSAPP_WEBHOOK_SECRET> — Meta’s envelope (360dialog forwards it), or the adapter’s own via readWebhook.
- **Out:** Delivered / Read / failed on the outbox row (by providerRef); a client’s reply filed in their conversation in Messages (inbound_messages keeps every one).
- **When it fails:** 503 with no secret set, 401 for a wrong one; a body that isn’t JSON answers 200 (no day of retries).
- **Swap:** `applyReceipts(receipts) · fileInbound(replies)` — `app/api/webhooks/whatsapp/route.ts`
- **1.0's env:** `WHATSAPP_WEBHOOK_SECRET` · `WHATSAPP_CENTRAL_WEBHOOK_SECRET`
- **A studio sees it:** Sent messages (Delivered · Read) · Messages (the reply)
- **Replaces 1.0's:** src/app/api/webhooks/whatsapp{,-central}/route.ts
- **Note:** One shared number across studios: 1.0’s central router forwards each callback to its studio’s deployment by the wamid — Platform side, not built.

### `sign-in` — Sign-in codes by SMS and email
*Signing in · a real service, behind a slot · slot `sign-in`*

- **Today (the stand-in):** Sends no code; any six digits pass — the studio’s sign-in and the client portal’s code step both say so.
- **In:** A contact (mobile or email); then the contact and the code typed.
- **Out:** sendCode → { ok } | { error } · checkCode → true | false · provision?(contact) → a member (and a studio) for the Qanvast line.
- **When it fails:** A refused send reads “Couldn’t send the code”; with a real provider 1.0’s limits hold — five tries a minute per contact and per visitor address.
- **Swap:** `setSignInProvider({ name, sendCode, checkCode, provision? })` — `lib/auth/provider.ts`
- **1.0's env:** `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `TWILIO_VERIFY_SERVICE_SID` · `TWILIO_PHONE_NUMBER` · `QANVAST_API_URL`
- **A studio sees it:** /sign-in · /sign-up · /join · Your profile · the client portal’s code step
- **Replaces 1.0's:** src/lib/twilio.ts · src/lib/bypass-otp.ts · the Qanvast line’s auth routes
- **Note:** Sessions are real records (studio_sessions); the cookies turn Secure once NEXT_PUBLIC_APP_URL is https; the visitor’s address is X-Forwarded-For’s first hop — the proxy in front must set it.

### `studios` — A new studio’s tenancy
*Signing in · a real service, behind a slot · slot `studios`*

- **Today (the stand-in):** Each studio that signs up gets a database file of its own beside the demo’s.
- **In:** The new studio (its name, the Owner’s name, phone, email, kind) and how it came (sign-up · qanvast).
- **Out:** { key, ownerId } — or { error }.
- **When it fails:** Nothing is half made: a failure takes the studio away and sign-up says it couldn’t.
- **Swap:** `setStudioProvisioner({ name, create })` — `lib/studios/create.ts`
- **1.0's env:** `NEXT_PUBLIC_SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `OPENMAISON_SIGN_UPS_PAUSED`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** src/app/api/admin/studios (POST) · seedDefaultStudioTaxonomies · autoProvisionUser

### `payments` — Paying OpenMaison — plans, AI credits, seats
*Plan & AI credits · a real service, behind a slot · slot `payments`*

- **Today (the stand-in):** The demo checkout: the Pay step completes inside the dialog and no card is taken (the dialogs say so); auto top-ups and added seats charge nothing.
- **In:** checkout(a pending session: kind, amount in cents, what for, trial, the Owner, where to come back) · charge(ref, amount, what for) · readWebhook(raw call) · billingPortal()
- **Out:** checkout → { url } (the Owner goes there) · charge → { ok } · readWebhook → { paid: [sessions], failed: [sessions] } | null (refused).
- **When it fails:** A checkout that doesn’t open says why; a refused charge changes nothing (the auto top-up waits for the next crossing; seats stay as they were).
- **Swap:** `setPaymentProvider({ name, checkout, charge, readWebhook, billingPortal? })` — `lib/credits/payments.ts`
- **1.0's env:** `DODO_PAYMENTS_API_KEY` · `DODO_PAYMENTS_WEBHOOK_KEY`
- **A studio sees it:** Plans · Buy AI credits · Manage billing · Change seats · Auto top-up
- **Replaces 1.0's:** Dodo Payments’ overlay, webhook and customer portal (integration Q-14 · B-20 · B-29)
- **Note:** 1.0’s repository carries no Dodo code — the env names are Dodo’s own. Once plugged, completeCheckout refuses (only POST /api/webhooks/payments says a checkout was paid) and Manage billing’s changes open the provider’s page.

### `accounting` — Xero
*Finance · a studio’s connection · slot `accounting`*

- **Today (the stand-in):** Connect, the organisations, the mapping and every push are simulated — nothing is sent to Xero; Company › Integrations says so.
- **In:** push(one record due — client, vendor, invoice, credit note, payment, bill, expense, payout — its link so far, the settings, the account rows)
- **Out:** { outcome: created | updated | failed | skip, message, remoteId? } — the link, the log, the retries and the bell stay the app’s.
- **When it fails:** A throw or failed is the record’s line in the sync log and the bell’s “A push to Xero failed”, tried again on Retry or the next sync.
- **Swap:** `setAccountingProvider({ name, push })` — `lib/finance/xero-server.ts`
- **1.0's env:** `XERO_CLIENT_ID` · `XERO_CLIENT_SECRET` · `XERO_REDIRECT_URI`
- **A studio sees it:** Company › Integrations › Xero
- **Replaces 1.0's:** src/lib/accounting/** · src/app/api/cron/accounting-sync
- **Note:** The OAuth that connectXero simulates is the developers’ with the provider; the scheduler’s accounting job pushes only once a real provider is plugged in.

### `storage` — File storage
*Files · a real service, behind a slot · slot `storage`*

- **Today (the stand-in):** Every file keeps its bytes in the database (lead_file_images · lead_file_thumbs, data URLs).
- **In:** put({ fileId, part: bytes | thumb, dataUrl }) · get(ref) · remove?(ref)
- **Out:** put → the store’s reference (the table keeps store:<ref>) · get → the data URL, or null.
- **When it fails:** A throw fails the upload that asked (its own refusal); rows written before the swap keep reading as they are.
- **Swap:** `setFileStore({ name, put, get, remove? })` — `lib/leads/file-store.ts`
- **1.0's env:** `NEXT_PUBLIC_SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** src/app/api/storage/{upload,remove} · Supabase Storage
- **Note:** The lead’s files are one store (files, contract PDFs, thread photos, update media, payment proofs, filed renders). The others keep their own write and read: studio_fonts (app/company/font-actions.ts → /files/font), render_images (lib/visualizer/images.ts), project_rooms assets (app/visualizer/actions.ts), studio_materials, studio_pictures (lib/company/member-photo-store.ts · lib/portal/about.ts), member_portfolio_pictures (lib/portfolio/queries.ts), floor_plan_pictures · floor_plan_photos (lib/projects/floor-plan.ts), cost_documents (lib/finance/server.ts keepDoc → /finance/doc), conversation_files (lib/projects/thread-photos.ts → /chat/file), contract_template_files (/files/contract-template), the brand kit’s pictures (settings.brand).

### `pdf` — PDF files of the papers
*Files · a real service, behind a slot · slot `pdf`*

- **Today (the stand-in):** Every Download PDF opens the browser’s print (Print › Save as PDF), laid out by the page’s print styles.
- **In:** render({ url: this app’s paper page, cookie: the visitor’s, fileName })
- **Out:** The PDF’s bytes — GET /papers/pdf?path=<page> answers them as a download.
- **When it fails:** A throw answers 502 and the person prints from the page; a path that isn’t a paper page answers 400.
- **Swap:** `setPdfRenderer({ name, render }) + build with NEXT_PUBLIC_PDF_DOWNLOADS=1` — `lib/services/pdf.ts`
- **1.0's env:** `INTERNAL_RENDER_ORIGIN` · `CHROMIUM_BINARY_URL` · `NEXT_PUBLIC_PDF_DOWNLOADS`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** src/app/api/quote-pdf/render · src/lib/quote-html-to-pdf.ts · invoice-pdf.ts · po-pdf.ts
- **Note:** Every paper page’s press calls printPaper() (lib/paper-print.ts) — the one place that switches.

### `calendar` — The studio’s own calendar
*Meetings · a studio’s connection · slot `calendar`*

- **Today (the stand-in):** None to connect: a client’s invitation carries the .ics file and Google’s own event page (real); the studio’s calendar isn’t synced, and Integrations says it comes later.
- **In:** sync(leadId, every meeting of the lead as the calendar should hold it — title, times, place, members with emails)
- **Out:** Nothing — the calendar matches the list (adds, moves, takes away its own events not in it).
- **When it fails:** Best-effort: logged; the meeting stays the record. Queued after every meeting write’s response (never slows a press).
- **Swap:** `setCalendarSync({ name, sync })` — `lib/meetings/calendar-sync.ts`
- **1.0's env:** `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REDIRECT_URI`
- **A studio sees it:** Company › Integrations › Calendar invites
- **Replaces 1.0's:** 1.0’s unmerged feat/google-calendar-meetings

### `transcription` — A recording into words
*Meetings · a real service, behind a slot · slot `transcription`*

- **Today (the stand-in):** Turns nothing into words — the write-up dialog says so; the recording is kept in Files and the transcript or notes are pasted.
- **In:** transcribe({ name, dataUrl }) — an audio file up to 8 MB
- **Out:** { text } — speakers as “Name: …” lines when the service tells them apart.
- **When it fails:** { error } — writeUpMeeting says the recording couldn’t be turned into words and asks for the transcript.
- **Swap:** `setTranscriber({ name, transcribe }) + build with NEXT_PUBLIC_TRANSCRIPTION=1` — `lib/meetings/transcribe.ts`
- **1.0's env:** `COPILOT_STT_PROVIDER` · `DEEPGRAM_API_KEY` · `SPEECHMATICS_API_KEY` · `NEXT_PUBLIC_TRANSCRIPTION`
- **A studio sees it:** The write-up dialog · the meeting room (Listening isn’t connected)
- **Replaces 1.0's:** src/app/api/copilot/** (Deepgram, Speechmatics)
- **Note:** The live co-pilot’s listening is a stream, not a file — the room keeps typed notes until a streaming service comes.

### `feeds` — OpenMaison’s and Qanvast’s feeds
*Marketplace · Market Insights · Hangouts · a feed · slot `feeds`*

- **Today (the stand-in):** Nothing is fetched; the demo’s copies are sample rows, each marked as one.
- **In:** marketplace() · insights() · fetchText(url) for Industry News’ RSS · hangouts() — each answering 1.0’s API shape (typed in each feed file).
- **Out:** The studio’s copy written through the feed’s one mapper (rowsFromFeed → feedStatements).
- **When it fails:** A failed feed leaves the copy as it was; the next hour tries again.
- **Swap:** `setFeedSource({ name, marketplace?, insights?, fetchText?, hangouts? })` — `lib/services/feeds.ts`
- **1.0's env:** `QANVAST_API_URL`
- **A studio sees it:** Market Insights’ sample notes · Hangouts’ sample line
- **Replaces 1.0's:** Qanvast’s brand API · Platform admin’s market_insights · src/app/api/news · Qanvast’s Hangouts tables

### `scheduler` — The timed jobs
*Everything timed · an address that is called*

- **Today (the stand-in):** No scheduler: each job runs where it is read (the bell, Sent messages, Money out, the credits) — the scheduler only makes them happen with nobody opening a page.
- **In:** GET or POST /api/cron/<run · notification-scheduled · notification-digest · accounting-sync · repeats · feeds · anon-sweep · anon-storage-gc> with Authorization: Bearer <CRON_SECRET>
- **Out:** What each job did (counts only).
- **When it fails:** 401 without the secret (fails closed in production); one job’s failure is its own line.
- **Swap:** `runJobs(keys, now)` — `lib/services/sweep.ts`
- **1.0's env:** `CRON_SECRET`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** vercel.json crons · src/app/api/cron/*
- **Note:** One run serves the studio whose database the server has open — with the developers’ tenancy, run it per tenant. The daily summaries go from 8 AM the server’s own time — run it with TZ=Asia/Singapore (1.0 read each studio’s timezone). (pending modules S41b-3) 1.0’s anon-sweep (06:00) and anon-storage-gc (08:00) keep their addresses: the website’s no-account workspaces past their 7 days go, then the room they left is given back (trial-workspaces). 1.0’s other crons: invoice-overdue is a derived reminder here (the messages job sends it); copilot-analytics is read on demand (Company › Reports › Meetings); poll-emails is Gmail’s (lead-gmail); fx-rates waits with the countries (on hold); price-drift · aggregate-rates · brand-dossier-scan · usage-rollup · usage-retention · fork-analytics-pull are OpenMaison’s platform jobs (Platform admin, out of this build).

### `lead-webhooks` — Lead webhooks
*Lead capture · an address that is called*

- **Today (the stand-in):** Real: POST /api/webhooks/leads/<token> makes the lead (Simulate a POST plays one through the same record).
- **In:** JSON or form fields — name, phone, email, budget, property type, notes (1.0’s aliases); Google Ads’ Lead Form with its google_key.
- **Out:** { status: created | duplicate | test } — the lead in the listing (or Review imported leads), the endpoint’s counters and log.
- **When it fails:** 404 an unknown or revoked token · 401 a wrong Google key, or a keyed endpoint’s missing X-Signature (1.0’s HMAC) · 429 past ten a minute · 413 over 64 KB · 400 no name, or no phone or email.
- **Swap:** `captureLead(channel, arrival, form?, via?)` — `lib/leads/capture.ts`
- **1.0's env:** `NEXT_PUBLIC_INTAKE_URL`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** src/app/api/webhooks/leads/[token] · src/lib/webhook-lead-parser.ts
- **Note:** The page shows OpenMaison’s intake host (lib/settings/types.ts webhookUrl) — point it at this route.

### `lead-email` — Website form by email
*Lead capture · a studio’s connection*

- **Today (the stand-in):** The intake address receives nothing; Simulate an enquiry plays one through captureLead('email').
- **In:** An inbound email service’s POST of one enquiry
- **Out:** captureLead('email', arrival)
- **When it fails:** A message it can’t read is the service’s to keep.
- **Swap:** `captureLead('email', arrival)` — `lib/leads/capture.ts`
- **1.0's env:** —
- **A studio sees it:** Company › Integrations › Website form by email
- **Replaces 1.0's:** —

### `lead-meta` — Meta Lead Ads
*Lead capture · a studio’s connection*

- **Today (the stand-in):** Connect makes a stand-in page; Simulate a form submission plays one.
- **In:** Meta’s leadgen webhook (the form’s answers)
- **Out:** captureLead('meta', arrival, formName)
- **When it fails:** A form switched off sends nothing.
- **Swap:** `captureLead('meta', arrival, formName)` — `lib/leads/capture.ts`
- **1.0's env:** —
- **A studio sees it:** Company › Integrations › Meta Lead Ads
- **Replaces 1.0's:** — (1.0 bridged Meta through webhooks)

### `lead-gmail` — Email lead sources (Gmail)
*Lead capture · a studio’s connection*

- **Today (the stand-in):** Connect makes a stand-in inbox; Sync now plays one enquiry from a monitored platform.
- **In:** Gmail’s messages from the monitored domains, read every minute (1.0’s poll-emails)
- **Out:** captureLead('gmail', arrival, undefined, domain)
- **When it fails:** A message that can’t be read counts as a parse fail.
- **Swap:** `captureLead('gmail', arrival, undefined, domain)` — `lib/leads/capture.ts`
- **1.0's env:** `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REDIRECT_URI` · `EMAIL_TOKEN_SECRET`
- **A studio sees it:** Company › Integrations › Email lead sources
- **Replaces 1.0's:** src/app/api/cron/poll-emails · src/lib/gmail.ts · src/lib/email-parser.ts

### `qanvast` — Qanvast leads and returns
*Lead capture · a studio’s connection*

- **Today (the stand-in):** The demo’s Qanvast leads are sample records; a returned lead is recorded here and sent nowhere.
- **In:** Qanvast’s lead feed; Return Lead’s reason and evidence
- **Out:** A lead with the source Qanvast (captureLead or the import); the return’s answer from Qanvast on lead_returns.
- **When it fails:** —
- **Swap:** `returnLead(leadId, input)` — `app/leads/return-actions.ts`
- **1.0's env:** `QANVAST_API_URL` · `NEXT_PUBLIC_QANVAST_COMPANY_ID`
- **A studio sees it:** Company › Integrations › Qanvast
- **Replaces 1.0's:** Qanvast’s own APIs

### `qanvast-listing` — Applying to be listed on Qanvast
*Company › Profile · a real service, behind a slot · slot `qanvast`*

- **Today (the stand-in):** The application is kept as the studio’s record and sent nowhere; the card says so, and an Owner or an Admin may play Qanvast’s answer there, labelled “(demo)”.
- **In:** submit(ListingPayload — the studio’s words, its records that day: name, UEN, registrations, completed projects, About photos, awards, review link, website; its proof files with read()) · withdraw?(ref) · readWebhook?(raw)
- **Out:** submit → { ref } (Qanvast’s id for it) · withdraw → { ok } · readWebhook → ListingAnswer[] — { applicationId | providerRef, outcome: verified | rejected, note?, at? } — or null (refused).
- **When it fails:** A refused send leaves no application (the press says why); a refused withdraw keeps it waiting; the demo play is refused once a real service is plugged in.
- **Swap:** `setQanvastListingService({ name, submit, withdraw?, readWebhook? })` — `lib/qanvast-listing/service.ts`
- **1.0's env:** `QANVAST_API_URL` · `QANVAST_WEBHOOK_SECRET`
- **A studio sees it:** Company › Profile › Listed on Qanvast
- **Replaces 1.0's:** src/app/(main)/verify/page.tsx (saved nothing) · src/app/admin/verification/page.tsx (hard-coded samples) · studios.verification_status · studio_verifications
- **Note:** Verifying a studio is Qanvast’s staff’s work (1.0’s Platform admin › Verification — out of this build). 1.0 had no API for it; QANVAST_WEBHOOK_SECRET is 2.0’s own name. The proof files’ bytes live in studio_verification_files (data URLs), like the studio’s other pictures.

### `qanvast-listing-webhook` — Qanvast’s answer to a listing application
*Company › Profile · an address that is called*

- **Today (the stand-in):** Real and guarded; nothing calls it on the prototype (the demo’s answers are played on the card).
- **In:** POST /api/webhooks/qanvast-listing with Authorization: Bearer <QANVAST_WEBHOOK_SECRET> (or ?token=) — the adapter’s envelope via readWebhook, else { application | ref, status: verified | rejected (listed | changes), note?, reviewed_at? } or { answers: [...] }
- **Out:** Each answer once (applyListingAnswer): the application Listed, or Needs changes with Qanvast’s note; the studio’s Owners and Admins hear listing_answered.
- **When it fails:** 503 with no secret set, 401 for a wrong one, 400 for a body that isn’t an answer, 413 over 64 KB; a second answer is “already”, a withdrawn one “not_waiting”.
- **Swap:** `applyListingAnswer(answer, via)` — `app/api/webhooks/qanvast-listing/route.ts`
- **1.0's env:** `QANVAST_WEBHOOK_SECRET`
- **A studio sees it:** Company › Profile › Listed on Qanvast · the bell
- **Replaces 1.0's:** — (1.0’s staff page answered nothing)
### `qanvast-account` — The studio’s Qanvast account — lead credits, reviews and rank
*Qanvast Ops › Lead credits · Reviews · a real service, behind a slot · slot `qanvast-account`* (pending modules S41b-5)

- **Today (the stand-in):** Answers from the demo’s own records: the credits taken are its Qanvast leads (200 each), a refund is a return Qanvast approved and credited, the reviews are its completed projects’ clients and its designers’ published work; the contract, the rank, page views, board pins and Singapore’s averages are samples. A reply is kept here, not posted. The pages say so.
- **In:** creditStatistics() · contracts() · transactions({ month, year }) · earliestTransaction() · leadCredits(qanvastLeadIds) · reviews({ page, perPage }) · reply({ reviewId, text }) · businessStatistics() · feedbackStatistics(1 | 2 | 3) · links()
- **Out:** 1.0’s JSON, field for field (`lib/qanvast-account/api.ts`): ApiLeadsCreditsPeriod[] · ApiContract[] · ApiTransaction[] (the previous month’s last transaction first) · ApiReviewListingResponse · ApiBusinessStatistics · ApiFeedbackStatistics · { ok } | { error } · QanvastLinks — read by one mapper (`lib/qanvast-account/model.ts`).
- **When it fails:** A throw is caught per call (`askQanvast`): the page says “Qanvast didn’t answer — please try again” with Try again; a `QanvastSessionExpired` (Qanvast’s 401, 1.0’s rule) says “Your Qanvast session expired” with Sign in again (S30’s `signInHref({ reason: 'qanvast', next })`); a refused reply says Qanvast’s words; the Leads tab’s Credits column reads “—”. Nothing is made up, nothing is half-written.
- **Swap:** `setQanvastAccountService({ name, creditStatistics, contracts, transactions, earliestTransaction, leadCredits, reviews, reply, businessStatistics, feedbackStatistics, links })` — `lib/qanvast-account/service.ts`
- **1.0's env:** `QANVAST_API_URL` · `NEXT_PUBLIC_QANVAST_COMPANY_ID`
- **A studio sees it:** Qanvast Ops › Lead credits · Reviews (“Simulated on this prototype — …” under each view)
- **Replaces 1.0's:** deployment/qanvast: src/app/api/qanvast/[...path]/route.ts (the proxy, the qanvast-bearer cookie) · src/lib/qanvast-fetch.ts · src/app/(main)/qanvast-ops/{credits,reviews}/_api.ts · src/types/credits-api.ts
- **Note:** 1.0 kept no table for any of it — each page asks when it opens, as 2.0 does (no copy, no sync). The studio’s Qanvast bearer token (1.0’s qanvast-bearer cookie, signed with its COOKIE_SECRET, refreshed through /api/auth/refresh, a 401 sending the member to sign in again) belongs inside the adapter: the sign-in seam (`lib/auth/provider.ts`) is where a Qanvast-line studio’s session would hand it over. Owners only (1.0’s rule) — `lib/qanvast-account/policy.ts`. The 1.0 calls behind each method are listed at the top of `lib/qanvast-account/service.ts`.

### `trial-bot-check` — Bot protection on the AI Visualizer trial (Cloudflare Turnstile)
*Website · a real service, behind a slot · slot `bot-check`*

- **Today (the stand-in):** Every visitor is let through — no widget shows; the trial’s own limits still hold (3 renders a browser, 10 a minute from one address).
- **In:** verify(token from the widget, the visitor’s address) — once per page, on the first render’s ask; siteKey (public) for the page to mount the widget.
- **Out:** true | false
- **When it fails:** false (or a throw) refuses the render: “We couldn’t check this browser — reload the page and try again.” Nothing counts.
- **Swap:** `setBotCheck({ name, siteKey, verify })` — `lib/visualizer/trial/server.ts`
- **1.0's env:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` · `TURNSTILE_SECRET_KEY`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** docs/superpowers/specs/2026-08-21-public-visualizer-trial-design.md §4 (never wired in 1.0)
- **Note:** The page passes siteKey as botSiteKey (components/visualizer/trial/trial-visualizer.tsx) and holds #trial-bot-check for the widget; send its token as askTrialRender({ botToken }). The names are Cloudflare’s — 1.0 had none. The trial itself opens with 1.0’s TRIAL_VISUALIZER_ENABLED=true (lib/visualizer/trial/policy.ts trialEnabled; the prototype’s demo shows it while TRIAL_IN_DEMO) — 1.0 meant it to be switched on only once this and trial-limit-store are plugged in.

### `trial-workspaces` — The website’s no-account workspaces (Leads · Upload a quote · Quote X-Ray)
*Website · a real service, behind a slot · slot `trial`*

- **Today (the stand-in):** A database file of its own beside the demo’s (<the demo’s file>.trial.db, made on first use) keeps each visitor’s workspace — 1.0’s anon_workspaces table — for 7 days; never a studio’s database. With a remote database there is no folder beside it, and the three tools answer the site’s 404 until a store is plugged in.
- **In:** TrialStore — create · get (an expired row is gone) · write (a compare-and-set on the payload) · spend / refund (one conditional update against the 50-token grant) · remove · expired(now, limit) · reclaim · clear · count.
- **Out:** The workspace (id · payload by surface: leads · quote-digitizer · quote-xray · spent_tokens · created_at · expires_at).
- **When it fails:** A store that throws: the tool says “Couldn’t save it — please try again”; a claim that fails keeps the workspace for the next sign-in.
- **Swap:** `setTrialStore({ name, ready, create, get, write, spend, refund, remove, expired, reclaim, clear, count })` — `lib/trial/store.ts`
- **1.0's env:** `TRIAL_TOOLS_ENABLED`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** scripts/migrations/315_anon_workspaces.sql · 316_anon_token_fns.sql · src/lib/anon/{workspace,cookie,quota,claim,claim-on-login}.ts · src/app/api/anon/** · src/app/api/cron/{anon-sweep,anon-storage-gc}
- **Note:** The platform database keeps 1.0’s table with no key into any studio (1.0: “disposable by construction”); the cookie om_anon names a row, signed with AUTH_SECRET. TRIAL_TOOLS_ENABLED is 2.0’s switch, the sibling of TRIAL_VISUALIZER_ENABLED (1.0 shipped the three on its PLG line); the bot check (trial-bot-check — 1.0’s Turnstile) runs before a workspace’s first save, and the 25-a-day ceiling per address rides trial-limit-store. The claim (lib/trial/claim.ts claimTrialWork) runs once a studio is open and its member signed in — sign-up and sign-in — through the studio’s own actions, and never throws (a piece that fails stays for the next sign-in); 1.0 raced its claim against 15 seconds — with a remote tenancy, give the claim your own timeout there. The sweeps are /api/cron/anon-sweep and /api/cron/anon-storage-gc.

### `trial-limit-store` — A lasting store for the trial’s per-address limit
*Website · a real service, behind a slot · slot `limit-store`*

- **Today (the stand-in):** One server’s memory counts each address’s tries (1.0’s in-memory limiter): a restart, or a second server, starts the count again.
- **In:** take(key, max, windowMs) — the key is trial:<ask | keep>:<the visitor’s address>.
- **Out:** true while under max in the window; false once it is one too many.
- **When it fails:** A throw lets the try through (the signed cookie still holds the browser to 3).
- **Swap:** `setLimitStore({ name, take })` — `lib/visualizer/trial/server.ts`
- **1.0's env:** `KV_REST_API_URL` · `KV_REST_API_TOKEN`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** src/lib/rate-limit.ts checkRateLimit · checkDurableRateLimit
- **Note:** The names are Vercel KV’s (Upstash: UPSTASH_REDIS_REST_URL · UPSTASH_REDIS_REST_TOKEN) — 1.0 had none for this. Sign-in’s, sign-up’s and the website’s forms count in lib/auth/limit.ts takeTry: move them onto the same store.

### `ai-ask` — Maison AI’s answers
*Maison AI · by rule where 1.0 asked a model*

- **Today (the stand-in):** About 45 questions answered from the records by rule; changes are only proposed.
- **In:** The question and the page it was asked on
- **Out:** An intent and its parameters (Match)
- **When it fails:** No match: the sheet offers questions it can answer.
- **Swap:** `readQuestion(question, ctx)` — `lib/maison-ai/answer.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** Maison AI’s sheet (“Answers from your records”)
- **Replaces 1.0's:** src/app/api/buddy/**

### `ai-drafts` — Maison AI’s drafted messages
*Maison AI · by rule where 1.0 asked a model*

- **Today (the stand-in):** Each stage’s message drafted from the lead by rule.
- **In:** The lead and who writes
- **Out:** { what, text }
- **When it fails:** —
- **Swap:** `stageDraft(lead, me)` — `lib/maison-ai/drafts.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** draft_client_message

### `meeting-reading` — The meeting co-pilot’s reading and brief
*Meetings · by rule where 1.0 asked a model*

- **Today (the stand-in):** The notes read by rule as they’re typed; the brief made from them by rule.
- **In:** readMeeting(notes, aim, the studio’s answers) · briefOf(the reading)
- **Out:** Reading · MeetingBrief
- **When it fails:** —
- **Swap:** `readMeeting(input) · briefOf(input)` — `lib/meetings/engine.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** The meeting room (“by rule”)
- **Replaces 1.0's:** src/app/api/copilot/**

### `quote-draft` — Draft a quote with Maison AI
*Quotes · by rule where 1.0 asked a model*

- **Today (the stand-in):** A first cut from the price book — My Sections first, then My Items by trade; anything unpriced at S$0.
- **In:** The brief, the property type, the book
- **Out:** DraftPlan
- **When it fails:** Nothing matched: an empty plan, said.
- **Swap:** `draftPlan(brief, o)` — `lib/quotes/draft.ts`
- **1.0's env:** `OPENROUTER_API_KEY` · `TAVILY_API_KEY`
- **A studio sees it:** Create Quote › Draft with Maison AI
- **Replaces 1.0's:** the AI Quote Drafter

### `writing` — Writing help
*Quotes · Contracts · by rule where 1.0 asked a model*

- **Today (the stand-in):** Improve · Shorten · Expand · Rewrite · Plain English by rule, always proposed first.
- **In:** WritingInput — the words, the place, client-safe sources
- **Out:** Proposal — the new HTML and plain lines
- **When it fails:** Nothing to change: said.
- **Swap:** `proposeWriting(input)` — `lib/writing/propose.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** Writing help (“Worked out from your records”)
- **Replaces 1.0's:** src/app/api/quotes/**/ai-*

### `quote-pdf-reader` — Reading another studio’s quote
*Quote X-Ray · by rule where 1.0 asked a model*

- **Today (the stand-in):** A text PDF read by rule; a scan or a photo is refused, said.
- **In:** The PDF’s text lines
- **Out:** QuoteText — trades, rooms, lines, totals
- **When it fails:** No words: “a photo or a scan”.
- **Swap:** `readQuoteText(lines)` — `lib/quotes/pdf-quote.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** Quote X-Ray’s file tile
- **Replaces 1.0's:** src/app/api/quote-xrays/**

### `template-reader` — Recreate a template from my quote
*Quote templates · by rule where 1.0 asked a model*

- **Today (the stand-in):** A PDF’s layout read by rule; a photo matched by its name.
- **In:** Lines, pages, size, the file’s name
- **Out:** Match — the house style it is closest to
- **When it fails:** —
- **Swap:** `readLayout(input)` — `lib/templates/recreate.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** Recreate from my current quote
- **Replaces 1.0's:** the template recreator

### `quote-digitizer` — Upload a quote (the digitizer)
*Quotes · by rule where 1.0 asked a model*

- **Today (the stand-in):** Sheets read by rule; the three reference quotes by name; anything else refused and its credits given back.
- **In:** The file’s name (sheets: its rows)
- **Out:** UploadRead
- **When it fails:** unreadable — the 5 AI credits come back.
- **Swap:** `readDocument(fileName)` — `lib/quotes/upload.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** Create Quote › Upload a quote
- **Replaces 1.0's:** the Quote Digitizer

### `book-match` — Matching lines to the price book
*Price book · by rule where 1.0 asked a model*

- **Today (the stand-in):** Word matching by rule; below-cost never applied on its own.
- **In:** Lines and the book
- **Out:** LineMatch[]
- **When it fails:** —
- **Swap:** `matchLines(lines, book)` — `lib/company/price-book-match.ts`
- **1.0's env:** —
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** —

### `bill-reader` — Reading a supplier bill
*Finance · by rule where 1.0 asked a model*

- **Today (the stand-in):** A bill’s PDF text read by rule; the fields to check.
- **In:** The text lines and the vendors
- **Out:** BillRead
- **When it fails:** —
- **Swap:** `readBill(lines, vendors)` — `lib/finance/bill-reader.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** The bill dialog (“Read from the file — check it”)
- **Replaces 1.0's:** the bill reader

### `floor-plan-rooms` — A floor-plan photo’s rooms
*3D Space Planner · by rule where 1.0 asked a model*

- **Today (the stand-in):** The rooms from the flat type on record; the paper found by rule (no perspective correction).
- **In:** roomsForType(property type) · findPaper(raster)
- **Out:** Rooms to place · four corners
- **When it fails:** No paper found: the whole photo.
- **Swap:** `roomsForType(type) · findPaper(raster)` — `lib/planner/photo.ts`
- **1.0's env:** `OPENROUTER_API_KEY` · `ROBOFLOW_API_KEY`
- **A studio sees it:** Make a 3D picture (“Started from … the flat type on record”)
- **Replaces 1.0's:** the floorplan-3d tools

### `describe-piece` — Describe a piece of furniture
*3D Space Planner · by rule where 1.0 asked a model*

- **Today (the stand-in):** The closest catalogue piece to the words.
- **In:** The words
- **Out:** Described | null
- **When it fails:** None close: said.
- **Swap:** `describePiece(words)` — `lib/planner/describe.ts`
- **1.0's env:** `MESHY_API_KEY`
- **A studio sees it:** The planner (“Closest piece to your words”)
- **Replaces 1.0's:** the planner’s 3D generator

### `image-model` — The AI Visualizer’s pictures
*AI Visualizer · by rule where 1.0 asked a model*

- **Today (the stand-in):** The curated engine recolours, tiles and removes in the browser; Replace can’t draw a new piece and says so; the drift guard checks framing by rule.
- **In:** runPass(PassInput) · guardRender(photo, render)
- **Out:** PassOutput · a DriftReport and maybe a repaired picture
- **When it fails:** A pass that fails is refunded (its credits come back).
- **Swap:** `runPass(input) · setImageIO(io)` — `lib/visualizer/engine/run.ts`
- **1.0's env:** `OPENROUTER_API_KEY` · `FAL_KEY`
- **A studio sees it:** The Visualizer’s furniture panel (“This is the prototype…”)
- **Replaces 1.0's:** src/app/api/render/** · src/app/api/visualizer/** · src/app/api/demo/visualizer/**
- **Note:** A model’s fault report goes through coerceDriftReport (lib/visualizer/drift.ts). (pending modules S36) The website’s no-account trial (/site/try) runs the same engine in the visitor’s browser; with a model it renders on the server between askTrialRender and keepTrialRender (app/site/try/actions.ts — 1.0’s /api/demo/visualizer/*: Fast, one version) and stamps the mark there (lib/visualizer/trial/watermark.ts markBox — 1.0’s watermarkTrialImage geometry).

### `room-reading` — Reading a room photo’s surfaces and pieces
*AI Visualizer · by rule where 1.0 asked a model*

- **Today (the stand-in):** The three sample rooms carry curated readings (traced outlines, every piece); any other photo is read as Walls · Floor · Ceiling by rule (colour, edges and seeds), and the studio adds or draws the rest.
- **In:** The photo’s pixels (an Img)
- **Out:** fallbackDots → fallbackDetection: a Detection (surfaces with seeds and how each grows; a model would add outlines and furniture — 1.0’s shape: label, point [y, x] or box_2d 0–1000, category)
- **When it fails:** Nothing read: the dots fall back to 1.0’s three places; a Floor the photo doesn’t show is left out (said in the surfaces list).
- **Swap:** `fallbackDots(img) → fallbackDetection(dots)` — `lib/visualizer/engine/fallback.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** The AI Visualizer’s surfaces list (a photo nobody traced reads Walls · Floor · Ceiling)
- **Replaces 1.0's:** src/app/api/render/{detect,segment} · detect-core · the /tools/detect-sandbox bench (four models, centre point or bounding box)
- **Note:** The developers’ bench draws a reading over its photo (Depth › What it read); scripts/viz/regions.mts and fallback-test.mts check them in Node.

### `depth` — A photo’s depth
*AI Visualizer · developers’ bench · by rule where 1.0 asked a model*

- **Today (the stand-in):** Every pixel’s distance read from the room’s shape by rule — the floor and ceiling planes from the camera the walls give, an upright where it meets the floor, a piece where its foot does; never painted by a model.
- **In:** depthOf(photo, key, reading) — the photo, a key for its regions, its Detection
- **Out:** DepthMap — metres per pixel, what each pixel was read as, near · far, the camera (traced or default), each layer’s near and far
- **When it fails:** A photo nobody traced takes the default camera (the horizon at 45 %) and says so; a gap takes its nearest neighbour.
- **Swap:** `depthOf(photo, key, reading)` — `lib/visualizer/spatial/depth.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** nowhere in a studio — the developers’ bench only (`/dev/ai-bench`)
- **Replaces 1.0's:** src/app/api/render/depth (an image model asked for a grey map, near white) · src/components/tools/depth-parallax-viewer.tsx
- **Note:** Only on the developers’ bench (/dev/ai-bench). 1.0’s route named its upgrade: a monocular depth model (Depth-Anything V2 through onnxruntime) answering the same map — depthPicture gives 1.0’s grey picture of it.

### `reangle` — The same room from another camera
*AI Visualizer · developers’ bench · by rule where 1.0 asked a model*

- **Today (the stand-in):** Six camera moves (1.0’s: orbit left · right, step in · back, raise · lower) drawn from the photo’s own pixels pushed back by their depth (three.js) — the camera moves, the room doesn’t; what the photo never saw is stretched from its edge, or cut away with Trim edges.
- **In:** { photo, its DepthMap, a CameraMove (yaw · pitch degrees, metres right · up · back) } — poseFor(move, pivot) places the camera
- **Out:** One picture of the photo’s size per move
- **When it fails:** A big move opens gaps behind the pieces — the bench says so under the picture.
- **Swap:** `CAMERA_MOVES · poseFor(move, pivot)` — `lib/visualizer/spatial/moves.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** nowhere in a studio — the developers’ bench only (`/dev/ai-bench`)
- **Replaces 1.0's:** src/app/api/render/reangle (single move, a free move, or one 3 × 2 montage sliced into six) · spatial-view-experiment.tsx “Angles”
- **Note:** Only on the developers’ bench. A model that invents the hidden room answers the same picture per move.

### `outpaint` — More room around a photo
*AI Visualizer · developers’ bench · by rule where 1.0 asked a model*

- **Today (the stand-in):** The photo’s own edges mirrored outward and fading into a soft blur — or 1.0’s padded canvas itself (the blur with the photo on top); nothing new is painted.
- **In:** extendRoom(img, factor 1.2–1.6, mode mirror | cover)
- **Out:** Extended — the bigger picture and where the photo sits in it (inner x, y, w, h)
- **When it fails:** Never — the margin is always filled.
- **Swap:** `extendRoom(img, factor, mode)` — `lib/visualizer/spatial/extend.ts`
- **1.0's env:** `OPENROUTER_API_KEY`
- **A studio sees it:** nowhere in a studio — the developers’ bench only (`/dev/ai-bench`)
- **Replaces 1.0's:** src/app/api/render/outpaint · src/lib/spatial/pad-for-outpaint.ts (the canvas it sent the model)
- **Note:** Only on the developers’ bench (its Extend view, and Look around’s Fill the edges). A model paints a sharp continuation of the room into the same margin.

### `orbit-video` — An orbit clip
*AI Visualizer · 3D Space Planner · developers’ bench · by rule where 1.0 asked a model*

- **Today (the stand-in):** A clip recorded in the browser from 2.0’s own 3D views (MediaRecorder): the photo’s room turning gently side to side (±8° over 6 s), or a 3D layout on a turntable — WebM, MP4 on Safari; nothing invented.
- **In:** recordCanvas(canvas, seconds, frame(t)) — the view moved each frame (orbitYaw for the photo; the planner’s own turn for a layout)
- **Out:** Clip — { url, type, bytes, seconds }
- **When it fails:** A browser that can’t record says so; an empty clip asks to try again.
- **Swap:** `recordCanvas(canvas, seconds, frame)` — `lib/visualizer/spatial/clip.ts`
- **1.0's env:** `FAL_KEY` · `FAL_API_KEY`
- **A studio sees it:** nowhere in a studio — the developers’ bench only (`/dev/ai-bench`)
- **Replaces 1.0's:** src/app/api/render/orbit-video (fal.ai image-to-video, Kling by default) · the “AI frames” engine (six reangles played as a ping-pong)
- **Note:** Only on the developers’ bench. Proposed for the planner’s 3D picture (Download a turning clip) in outcome-S41 — not on a studio screen until Vicky says.

### `suggestions` — Suggestions by rule
*Projects · Leads · by rule where 1.0 asked a model*

- **Today (the stand-in):** Suggested replies, a milestone’s tasks, the briefs, the suggested member, the drafted schedule and Refine — all by rule, none charged.
- **In:** The record each reads
- **Out:** Its suggestions
- **When it fails:** —
- **Swap:** `suggestReplies · suggestForMilestone · projectBriefs · briefsFor · suggestMember · draftTimeline · refineNoteHtml` — `lib/projects/suggested-replies.ts`
- **1.0's env:** —
- **A studio sees it:** nowhere (server-side only)
- **Replaces 1.0's:** 1.0’s AI suggestions

