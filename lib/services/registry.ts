import type { ServiceKey } from './slots'

/*
 * (pending modules S34 — his "build all of them" 2026-10-11; card api:message-delivery-providers, "the adapters' seams and their admin, for
 * the developers") EVERY STAND-IN THE PROTOTYPE HAS, IN ONE LIST. Pure data, client-safe: the developers' document
 * (design-source/context/parity/30-pending-modules-build-2026-10-11/services.md) is written from it, the ops report (GET /api/services) answers
 * from it, Company › Integrations reads its studio-facing words from it, and the probe checks that every seam named here exists where it says.
 *
 * Each entry: what the real service does for the studio · the stand-in that answers today (honestly — never a fake success) · its contract
 * (what goes in, what comes out, how it fails) · THE ONE CALL a developer makes to swap it · 1.0's environment names (kept, so the port is
 * mechanical) · where a studio sees the stand-in said plainly. Kinds:
 *   provider — a real service is needed; a slot holds the stand-in until `set…` plugs the real one in (lib/services/slots.ts);
 *   rule     — 1.0 asked a model; 2.0 answers from the records by rule, honestly said; the swap is the one function named (a model takes its
 *              input and answers its output type — keep the proposal, the Undo and the credits where 1.0 charged);
 *   feed     — OpenMaison's or Qanvast's data, written through one mapper;
 *   route    — an address a provider or a scheduler calls (real, guarded by its own secret);
 *   integration — a connection a studio makes on Company › Integrations.
 */

export type ServiceKind = 'provider' | 'rule' | 'feed' | 'route' | 'integration'
export type ServiceEntry = {
  key: string
  name: string
  kind: ServiceKind
  area: string
  /** What the stand-in does today — in plain words. */
  standIn: string
  contract: { in: string; out: string; fails: string }
  /** The one call (or function) a developer swaps, and the file it lives in — the probe checks the file names it. */
  swap: { call: string; file: string; symbol: string }
  /** The slot that holds it, when it has one (lib/services/slots.ts). */
  slot?: ServiceKey
  /** 1.0's environment variable names for the same service (or the provider's own, where 1.0's repo has none — said in `note`). */
  env: readonly string[]
  /** Where a studio sees that it is a stand-in (null: nobody in a studio meets it). */
  seen: string | null
  /** 1.0's code it replaces. */
  v1: string
  note?: string
}

export const SERVICES: readonly ServiceEntry[] = [
  /* ── messages ── */
  {
    key: 'delivery', name: 'Email and WhatsApp messages', kind: 'provider', area: 'Messages', slot: 'delivery',
    standIn: 'The outbox records every message as it would go and sends nothing; Sent messages lists them and says they are simulated.',
    contract: { in: 'One message — channel, event, recipient, subject, plain text, link, the address its channel needs, and html() for an email in the studio’s colours.', out: '{ status: sent | failed, error?, providerRef? } — providerRef (a wamid, an email id) lets the receipts find the row.', fails: 'A throw or failed is retried three times (5 min · 30 min · 2 h), then Owners and Admins hear message_failed (an invitation tells its inviter).' },
    swap: { call: 'setDeliveryAdapter({ name, send, readWebhook? })', file: 'lib/notifications/delivery.ts', symbol: 'setDeliveryAdapter' },
    env: ['RESEND_API_KEY', 'D360_API_KEY', 'D360_API_BASE', 'D360_DEFAULT_TEMPLATE', 'D360_DEFAULT_TEMPLATE_LANG', 'NOTIFY_ALLOWLIST'],
    seen: 'Settings › Notifications › Sent messages', v1: 'src/lib/notifications/channels/{email,whatsapp}.ts · src/lib/360dialog.ts · retry.ts · recipient-allowlist.ts',
    note: 'The layer keeps every rule: keys (never twice), Who hears, daily summaries, not_in_plan (WhatsApp on Free is never handed over), OpenMaison’s pause, large sends for the Owner, NOTIFY_ALLOWLIST (blocked).',
  },
  {
    key: 'email-html', name: 'The branded email page', kind: 'provider', area: 'Messages',
    standIn: 'Built only when a real email adapter asks (html()) — the studio’s logo or name, its colours, its contact lines; the record stays plain text.',
    contract: { in: 'The message’s subject, words and link; the brand kit.', out: 'One HTML page, 600 wide, inline styles, every value escaped.', fails: 'Never — a logo an email can’t carry falls back to the studio’s name.' },
    swap: { call: 'emailHtml(page, brand)', file: 'lib/notifications/email-html.ts', symbol: 'emailHtml' },
    env: [], seen: null, v1: 'src/lib/notifications/templates/render.ts · base/*', note: 'A first cut for Vicky to design (the card’s question). Developers preview a sent email at /api/dev/email-preview?id=<outbox id> (off in production unless OPENMAISON_DEV_PREVIEWS=1).',
  },
  {
    key: 'whatsapp-webhook', name: 'WhatsApp receipts and replies', kind: 'route', area: 'Messages',
    standIn: 'Real and guarded; nothing calls it on the prototype (the outbox reports nothing back).',
    contract: { in: 'POST /api/webhooks/whatsapp?token=<WHATSAPP_WEBHOOK_SECRET> — Meta’s envelope (360dialog forwards it), or the adapter’s own via readWebhook.', out: 'Delivered / Read / failed on the outbox row (by providerRef); a client’s reply filed in their conversation in Messages (inbound_messages keeps every one).', fails: '503 with no secret set, 401 for a wrong one; a body that isn’t JSON answers 200 (no day of retries).' },
    swap: { call: 'applyReceipts(receipts) · fileInbound(replies)', file: 'app/api/webhooks/whatsapp/route.ts', symbol: 'POST' },
    env: ['WHATSAPP_WEBHOOK_SECRET', 'WHATSAPP_CENTRAL_WEBHOOK_SECRET'], seen: 'Sent messages (Delivered · Read) · Messages (the reply)', v1: 'src/app/api/webhooks/whatsapp{,-central}/route.ts',
    note: 'One shared number across studios: 1.0’s central router forwards each callback to its studio’s deployment by the wamid — Platform side, not built.',
  },
  /* ── signing in and studios ── */
  {
    key: 'sign-in', name: 'Sign-in codes by SMS and email', kind: 'provider', area: 'Signing in', slot: 'sign-in',
    standIn: 'Sends no code; any six digits pass — the studio’s sign-in and the client portal’s code step both say so.',
    contract: { in: 'A contact (mobile or email); then the contact and the code typed.', out: 'sendCode → { ok } | { error } · checkCode → true | false · provision?(contact) → a member (and a studio) for the Qanvast line.', fails: 'A refused send reads “Couldn’t send the code”; with a real provider 1.0’s limits hold — five tries a minute per contact and per visitor address.' },
    swap: { call: 'setSignInProvider({ name, sendCode, checkCode, provision? })', file: 'lib/auth/provider.ts', symbol: 'setSignInProvider' },
    env: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID', 'TWILIO_PHONE_NUMBER', 'QANVAST_API_URL'], seen: '/sign-in · /sign-up · /join · Your profile · the client portal’s code step', v1: 'src/lib/twilio.ts · src/lib/bypass-otp.ts · the Qanvast line’s auth routes',
    note: 'Sessions are real records (studio_sessions); the cookies turn Secure once NEXT_PUBLIC_APP_URL is https; the visitor’s address is X-Forwarded-For’s first hop — the proxy in front must set it.',
  },
  {
    key: 'studios', name: 'A new studio’s tenancy', kind: 'provider', area: 'Signing in', slot: 'studios',
    standIn: 'Each studio that signs up gets a database file of its own beside the demo’s.',
    contract: { in: 'The new studio (its name, the Owner’s name, phone, email, kind) and how it came (sign-up · qanvast).', out: '{ key, ownerId } — or { error }.', fails: 'Nothing is half made: a failure takes the studio away and sign-up says it couldn’t.' },
    swap: { call: 'setStudioProvisioner({ name, create })', file: 'lib/studios/create.ts', symbol: 'setStudioProvisioner' },
    env: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENMAISON_SIGN_UPS_PAUSED'], seen: null, v1: 'src/app/api/admin/studios (POST) · seedDefaultStudioTaxonomies · autoProvisionUser',
  },
  /* ── money ── */
  {
    key: 'payments', name: 'Paying OpenMaison — plans, AI credits, seats', kind: 'provider', area: 'Plan & AI credits', slot: 'payments',
    standIn: 'The demo checkout: the Pay step completes inside the dialog and no card is taken (the dialogs say so); auto top-ups and added seats charge nothing.',
    contract: { in: 'checkout(a pending session: kind, amount in cents, what for, trial, the Owner, where to come back) · charge(ref, amount, what for) · readWebhook(raw call) · billingPortal()', out: 'checkout → { url } (the Owner goes there) · charge → { ok } · readWebhook → { paid: [sessions], failed: [sessions] } | null (refused).', fails: 'A checkout that doesn’t open says why; a refused charge changes nothing (the auto top-up waits for the next crossing; seats stay as they were).' },
    swap: { call: 'setPaymentProvider({ name, checkout, charge, readWebhook, billingPortal? })', file: 'lib/credits/payments.ts', symbol: 'setPaymentProvider' },
    env: ['DODO_PAYMENTS_API_KEY', 'DODO_PAYMENTS_WEBHOOK_KEY'], seen: 'Plans · Buy AI credits · Manage billing · Change seats · Auto top-up', v1: 'Dodo Payments’ overlay, webhook and customer portal (integration Q-14 · B-20 · B-29)',
    note: '1.0’s repository carries no Dodo code — the env names are Dodo’s own. Once plugged, completeCheckout refuses (only POST /api/webhooks/payments says a checkout was paid) and Manage billing’s changes open the provider’s page.',
  },
  {
    key: 'accounting', name: 'Xero', kind: 'integration', area: 'Finance', slot: 'accounting',
    standIn: 'Connect, the organisations, the mapping and every push are simulated — nothing is sent to Xero; Company › Integrations says so.',
    contract: { in: 'push(one record due — client, vendor, invoice, credit note, payment, bill, expense, payout — its link so far, the settings, the account rows)', out: '{ outcome: created | updated | failed | skip, message, remoteId? } — the link, the log, the retries and the bell stay the app’s.', fails: 'A throw or failed is the record’s line in the sync log and the bell’s “A push to Xero failed”, tried again on Retry or the next sync.' },
    swap: { call: 'setAccountingProvider({ name, push })', file: 'lib/finance/xero-server.ts', symbol: 'setAccountingProvider' },
    env: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_REDIRECT_URI'], seen: 'Company › Integrations › Xero', v1: 'src/lib/accounting/** · src/app/api/cron/accounting-sync',
    note: 'The OAuth that connectXero simulates is the developers’ with the provider; the scheduler’s accounting job pushes only once a real provider is plugged in.',
  },
  /* ── files and papers ── */
  {
    key: 'storage', name: 'File storage', kind: 'provider', area: 'Files', slot: 'storage',
    standIn: 'Every file keeps its bytes in the database (lead_file_images · lead_file_thumbs, data URLs).',
    contract: { in: 'put({ fileId, part: bytes | thumb, dataUrl }) · get(ref) · remove?(ref)', out: 'put → the store’s reference (the table keeps store:<ref>) · get → the data URL, or null.', fails: 'A throw fails the upload that asked (its own refusal); rows written before the swap keep reading as they are.' },
    swap: { call: 'setFileStore({ name, put, get, remove? })', file: 'lib/leads/file-store.ts', symbol: 'setFileStore' },
    env: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], seen: null, v1: 'src/app/api/storage/{upload,remove} · Supabase Storage',
    note: 'The lead’s files are one store (files, contract PDFs, thread photos, update media, payment proofs, filed renders). The others keep their own write and read: studio_fonts (app/company/font-actions.ts → /files/font), render_images (lib/visualizer/images.ts), project_rooms assets (app/visualizer/actions.ts), studio_materials, studio_pictures (lib/company/member-photo-store.ts · lib/portal/about.ts), member_portfolio_pictures (lib/portfolio/queries.ts), floor_plan_pictures · floor_plan_photos (lib/projects/floor-plan.ts), cost_documents (lib/finance/server.ts keepDoc → /finance/doc), conversation_files (lib/projects/thread-photos.ts → /chat/file), contract_template_files (/files/contract-template), the brand kit’s pictures (settings.brand).',
  },
  {
    key: 'pdf', name: 'PDF files of the papers', kind: 'provider', area: 'Files', slot: 'pdf',
    standIn: 'Every Download PDF opens the browser’s print (Print › Save as PDF), laid out by the page’s print styles.',
    contract: { in: 'render({ url: this app’s paper page, cookie: the visitor’s, fileName })', out: 'The PDF’s bytes — GET /papers/pdf?path=<page> answers them as a download.', fails: 'A throw answers 502 and the person prints from the page; a path that isn’t a paper page answers 400.' },
    swap: { call: 'setPdfRenderer({ name, render }) + build with NEXT_PUBLIC_PDF_DOWNLOADS=1', file: 'lib/services/pdf.ts', symbol: 'setPdfRenderer' },
    env: ['INTERNAL_RENDER_ORIGIN', 'CHROMIUM_BINARY_URL', 'NEXT_PUBLIC_PDF_DOWNLOADS'], seen: null, v1: 'src/app/api/quote-pdf/render · src/lib/quote-html-to-pdf.ts · invoice-pdf.ts · po-pdf.ts',
    note: 'Every paper page’s press calls printPaper() (lib/paper-print.ts) — the one place that switches.',
  },
  /* ── meetings ── */
  {
    key: 'calendar', name: 'The studio’s own calendar', kind: 'integration', area: 'Meetings', slot: 'calendar',
    standIn: 'None to connect: a client’s invitation carries the .ics file and Google’s own event page (real); the studio’s calendar isn’t synced, and Integrations says it comes later.',
    contract: { in: 'sync(leadId, every meeting of the lead as the calendar should hold it — title, times, place, members with emails)', out: 'Nothing — the calendar matches the list (adds, moves, takes away its own events not in it).', fails: 'Best-effort: logged; the meeting stays the record. Queued after every meeting write’s response (never slows a press).' },
    swap: { call: 'setCalendarSync({ name, sync })', file: 'lib/meetings/calendar-sync.ts', symbol: 'setCalendarSync' },
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'], seen: 'Company › Integrations › Calendar invites', v1: '1.0’s unmerged feat/google-calendar-meetings',
  },
  {
    key: 'transcription', name: 'A recording into words', kind: 'provider', area: 'Meetings', slot: 'transcription',
    standIn: 'Turns nothing into words — the write-up dialog says so; the recording is kept in Files and the transcript or notes are pasted.',
    contract: { in: 'transcribe({ name, dataUrl }) — an audio file up to 8 MB', out: '{ text } — speakers as “Name: …” lines when the service tells them apart.', fails: '{ error } — writeUpMeeting says the recording couldn’t be turned into words and asks for the transcript.' },
    swap: { call: 'setTranscriber({ name, transcribe }) + build with NEXT_PUBLIC_TRANSCRIPTION=1', file: 'lib/meetings/transcribe.ts', symbol: 'setTranscriber' },
    env: ['COPILOT_STT_PROVIDER', 'DEEPGRAM_API_KEY', 'SPEECHMATICS_API_KEY', 'NEXT_PUBLIC_TRANSCRIPTION'], seen: 'The write-up dialog · the meeting room (Listening isn’t connected)', v1: 'src/app/api/copilot/** (Deepgram, Speechmatics)',
    note: 'The live co-pilot’s listening is a stream, not a file — the room keeps typed notes until a streaming service comes.',
  },
  /* ── feeds ── */
  {
    key: 'feeds', name: 'OpenMaison’s and Qanvast’s feeds', kind: 'feed', area: 'Marketplace · Market Insights · Hangouts', slot: 'feeds',
    standIn: 'Nothing is fetched; the demo’s copies are sample rows, each marked as one.',
    contract: { in: 'marketplace() · insights() · fetchText(url) for Industry News’ RSS · hangouts() — each answering 1.0’s API shape (typed in each feed file).', out: 'The studio’s copy written through the feed’s one mapper (rowsFromFeed → feedStatements).', fails: 'A failed feed leaves the copy as it was; the next hour tries again.' },
    swap: { call: 'setFeedSource({ name, marketplace?, insights?, fetchText?, hangouts? })', file: 'lib/services/feeds.ts', symbol: 'setFeedSource' },
    env: ['QANVAST_API_URL'], seen: 'Market Insights’ sample notes · Hangouts’ sample line', v1: 'Qanvast’s brand API · Platform admin’s market_insights · src/app/api/news · Qanvast’s Hangouts tables',
  },
  /* ── the scheduler ── */
  {
    key: 'scheduler', name: 'The timed jobs', kind: 'route', area: 'Everything timed',
    standIn: 'No scheduler: each job runs where it is read (the bell, Sent messages, Money out, the credits) — the scheduler only makes them happen with nobody opening a page.',
    contract: { in: 'GET or POST /api/cron/<run · notification-scheduled · notification-digest · accounting-sync · repeats · feeds · anon-sweep · anon-storage-gc> with Authorization: Bearer <CRON_SECRET>', out: 'What each job did (counts only).', fails: '401 without the secret (fails closed in production); one job’s failure is its own line.' },
    swap: { call: 'runJobs(keys, now)', file: 'lib/services/sweep.ts', symbol: 'runJobs' },
    env: ['CRON_SECRET'], seen: null, v1: 'vercel.json crons · src/app/api/cron/*',
    note: 'One run serves the studio whose database the server has open — with the developers’ tenancy, run it per tenant. The daily summaries go from 8 AM the server’s own time — run it with TZ=Asia/Singapore (1.0 read each studio’s timezone). (pending modules S41b-3) 1.0’s anon-sweep (06:00) and anon-storage-gc (08:00) keep their addresses: the website’s no-account workspaces past their 7 days go, then the room they left is given back (trial-workspaces). 1.0’s other crons: invoice-overdue is a derived reminder here (the messages job sends it); copilot-analytics is read on demand (Company › Reports › Meetings); poll-emails is Gmail’s (lead-gmail); fx-rates waits with the countries (on hold); price-drift · aggregate-rates · brand-dossier-scan · usage-rollup · usage-retention · fork-analytics-pull are OpenMaison’s platform jobs (Platform admin, out of this build).',
  },
  /* ── lead capture ── */
  {
    key: 'lead-webhooks', name: 'Lead webhooks', kind: 'route', area: 'Lead capture',
    standIn: 'Real: POST /api/webhooks/leads/<token> makes the lead (Simulate a POST plays one through the same record).',
    contract: { in: 'JSON or form fields — name, phone, email, budget, property type, notes (1.0’s aliases); Google Ads’ Lead Form with its google_key.', out: '{ status: created | duplicate | test } — the lead in the listing (or Review imported leads), the endpoint’s counters and log.', fails: '404 an unknown or revoked token · 401 a wrong Google key, or a keyed endpoint’s missing X-Signature (1.0’s HMAC) · 429 past ten a minute · 413 over 64 KB · 400 no name, or no phone or email.' },
    swap: { call: 'captureLead(channel, arrival, form?, via?)', file: 'lib/leads/capture.ts', symbol: 'captureLead' },
    env: ['NEXT_PUBLIC_INTAKE_URL'], seen: null, v1: 'src/app/api/webhooks/leads/[token] · src/lib/webhook-lead-parser.ts',
    note: 'The page shows OpenMaison’s intake host (lib/settings/types.ts webhookUrl) — point it at this route.',
  },
  {
    key: 'lead-email', name: 'Website form by email', kind: 'integration', area: 'Lead capture',
    standIn: 'The intake address receives nothing; Simulate an enquiry plays one through captureLead(\'email\').',
    contract: { in: 'An inbound email service’s POST of one enquiry', out: 'captureLead(\'email\', arrival)', fails: 'A message it can’t read is the service’s to keep.' },
    swap: { call: 'captureLead(\'email\', arrival)', file: 'lib/leads/capture.ts', symbol: 'captureLead' },
    env: [], seen: 'Company › Integrations › Website form by email', v1: '—',
  },
  {
    key: 'lead-meta', name: 'Meta Lead Ads', kind: 'integration', area: 'Lead capture',
    standIn: 'Connect makes a stand-in page; Simulate a form submission plays one.',
    contract: { in: 'Meta’s leadgen webhook (the form’s answers)', out: 'captureLead(\'meta\', arrival, formName)', fails: 'A form switched off sends nothing.' },
    swap: { call: 'captureLead(\'meta\', arrival, formName)', file: 'lib/leads/capture.ts', symbol: 'captureLead' },
    env: [], seen: 'Company › Integrations › Meta Lead Ads', v1: '— (1.0 bridged Meta through webhooks)',
  },
  {
    key: 'lead-gmail', name: 'Email lead sources (Gmail)', kind: 'integration', area: 'Lead capture',
    standIn: 'Connect makes a stand-in inbox; Sync now plays one enquiry from a monitored platform.',
    contract: { in: 'Gmail’s messages from the monitored domains, read every minute (1.0’s poll-emails)', out: 'captureLead(\'gmail\', arrival, undefined, domain)', fails: 'A message that can’t be read counts as a parse fail.' },
    swap: { call: 'captureLead(\'gmail\', arrival, undefined, domain)', file: 'lib/leads/capture.ts', symbol: 'captureLead' },
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'EMAIL_TOKEN_SECRET'], seen: 'Company › Integrations › Email lead sources', v1: 'src/app/api/cron/poll-emails · src/lib/gmail.ts · src/lib/email-parser.ts',
  },
  {
    key: 'qanvast', name: 'Qanvast leads and returns', kind: 'integration', area: 'Lead capture',
    standIn: 'The demo’s Qanvast leads are sample records; a returned lead is recorded here and sent nowhere.',
    contract: { in: 'Qanvast’s lead feed; Return Lead’s reason and evidence', out: 'A lead with the source Qanvast (captureLead or the import); the return’s answer from Qanvast on lead_returns.', fails: '—' },
    swap: { call: 'returnLead(leadId, input)', file: 'app/leads/return-actions.ts', symbol: 'returnLead' },
    env: ['QANVAST_API_URL', 'NEXT_PUBLIC_QANVAST_COMPANY_ID'], seen: 'Company › Integrations › Qanvast', v1: 'Qanvast’s own APIs',
  },
  /* ── (pending modules S37) the studio's listing on Qanvast ── */
  {
    key: 'qanvast-listing', name: 'Applying to be listed on Qanvast', kind: 'provider', area: 'Company › Profile', slot: 'qanvast',
    standIn: 'The application is kept as the studio’s record and sent nowhere; the card says so, and an Owner or an Admin may play Qanvast’s answer there, labelled “(demo)”.',
    contract: { in: 'submit(ListingPayload — the studio’s words, its records that day: name, UEN, registrations, completed projects, About photos, awards, review link, website; its proof files with read()) · withdraw?(ref) · readWebhook?(raw)', out: 'submit → { ref } (Qanvast’s id for it) · withdraw → { ok } · readWebhook → ListingAnswer[] — { applicationId | providerRef, outcome: verified | rejected, note?, at? } — or null (refused).', fails: 'A refused send leaves no application (the press says why); a refused withdraw keeps it waiting; the demo play is refused once a real service is plugged in.' },
    swap: { call: 'setQanvastListingService({ name, submit, withdraw?, readWebhook? })', file: 'lib/qanvast-listing/service.ts', symbol: 'setQanvastListingService' },
    env: ['QANVAST_API_URL', 'QANVAST_WEBHOOK_SECRET'], seen: 'Company › Profile › Listed on Qanvast', v1: 'src/app/(main)/verify/page.tsx (saved nothing) · src/app/admin/verification/page.tsx (hard-coded samples) · studios.verification_status · studio_verifications',
    note: 'Verifying a studio is Qanvast’s staff’s work (1.0’s Platform admin › Verification — out of this build). 1.0 had no API for it; QANVAST_WEBHOOK_SECRET is 2.0’s own name. The proof files’ bytes live in studio_verification_files (data URLs), like the studio’s other pictures.',
  },
  {
    key: 'qanvast-listing-webhook', name: 'Qanvast’s answer to a listing application', kind: 'route', area: 'Company › Profile',
    standIn: 'Real and guarded; nothing calls it on the prototype (the demo’s answers are played on the card).',
    contract: { in: 'POST /api/webhooks/qanvast-listing with Authorization: Bearer <QANVAST_WEBHOOK_SECRET> (or ?token=) — the adapter’s envelope via readWebhook, else { application | ref, status: verified | rejected (listed | changes), note?, reviewed_at? } or { answers: [...] }', out: 'Each answer once (applyListingAnswer): the application Listed, or Needs changes with Qanvast’s note; the studio’s Owners and Admins hear listing_answered.', fails: '503 with no secret set, 401 for a wrong one, 400 for a body that isn’t an answer, 413 over 64 KB; a second answer is “already”, a withdrawn one “not_waiting”.' },
    swap: { call: 'applyListingAnswer(answer, via)', file: 'app/api/webhooks/qanvast-listing/route.ts', symbol: 'POST' },
    env: ['QANVAST_WEBHOOK_SECRET'], seen: 'Company › Profile › Listed on Qanvast · the bell', v1: '— (1.0’s staff page answered nothing)',
  },
  /* ── (pending modules S41b-5) the studio's account at Qanvast — 1.0's Qanvast line read it live through its proxy api/qanvast/[...path] ── */
  {
    key: 'qanvast-account', name: 'The studio’s Qanvast account — lead credits, reviews and rank', kind: 'provider', area: 'Qanvast Ops › Lead credits · Reviews', slot: 'qanvast-account',
    standIn: 'Answers from the demo’s own records: the credits taken are its Qanvast leads (200 each), a refund is a return Qanvast approved and credited, the reviews are its completed projects’ clients and its designers’ published work; the contract, the rank, page views, board pins and Singapore’s averages are samples. A reply is kept here, not posted. The pages say so.',
    contract: { in: 'creditStatistics() · contracts() · transactions({ month, year }) · earliestTransaction() · leadCredits(qanvastLeadIds) · reviews({ page, perPage }) · reply({ reviewId, text }) · businessStatistics() · feedbackStatistics(1 | 2 | 3) · links()', out: '1.0’s JSON, field for field (lib/qanvast-account/api.ts): ApiLeadsCreditsPeriod[] · ApiContract[] · ApiTransaction[] (the previous month’s last transaction first) · ApiReviewListingResponse · ApiBusinessStatistics · ApiFeedbackStatistics · { ok } | { error } · QanvastLinks — read by one mapper (lib/qanvast-account/model.ts).', fails: 'A throw is caught per call (askQanvast): the page says “Qanvast didn’t answer — please try again” with Try again; a QanvastSessionExpired (Qanvast’s 401, 1.0’s rule) says “Your Qanvast session expired” with Sign in again (S30’s signInHref with the reason qanvast and the way back); a refused reply says Qanvast’s words; the Leads tab’s Credits column reads “—”. Nothing is made up, nothing is half-written.' },
    swap: { call: 'setQanvastAccountService({ name, creditStatistics, contracts, transactions, earliestTransaction, leadCredits, reviews, reply, businessStatistics, feedbackStatistics, links })', file: 'lib/qanvast-account/service.ts', symbol: 'setQanvastAccountService' },
    env: ['QANVAST_API_URL', 'NEXT_PUBLIC_QANVAST_COMPANY_ID'], seen: 'Qanvast Ops › Lead credits · Reviews', v1: 'deployment/qanvast: src/app/api/qanvast/[...path]/route.ts (the proxy, the qanvast-bearer cookie) · src/lib/qanvast-fetch.ts · src/app/(main)/qanvast-ops/{credits,reviews}/_api.ts · src/types/credits-api.ts',
    note: '1.0 kept no table for any of it — each page asks when it opens, as 2.0 does (no copy, no sync). The studio’s Qanvast bearer token (1.0’s qanvast-bearer cookie, signed with its COOKIE_SECRET, refreshed through /api/auth/refresh, a 401 sending the member to sign in again) belongs inside the adapter: the sign-in seam (lib/auth/provider.ts) is where a Qanvast-line studio’s session would hand it over. Owners only (1.0’s rule) — lib/qanvast-account/policy.ts.',
  },
  /* ── the website's AI Visualizer trial (pending modules S36) — 1.0's own unfinished production step: "flip on once Turnstile + a durable
     rate-limit store exist" (its spec §4) ── */
  {
    key: 'trial-bot-check', name: 'Bot protection on the AI Visualizer trial (Cloudflare Turnstile)', kind: 'provider', area: 'Website', slot: 'bot-check',
    standIn: 'Every visitor is let through — no widget shows; the trial’s own limits still hold (3 renders a browser, 10 a minute from one address).',
    contract: { in: 'verify(token from the widget, the visitor’s address) — once per page, on the first render’s ask; siteKey (public) for the page to mount the widget.', out: 'true | false', fails: 'false (or a throw) refuses the render: “We couldn’t check this browser — reload the page and try again.” Nothing counts.' },
    swap: { call: 'setBotCheck({ name, siteKey, verify })', file: 'lib/visualizer/trial/server.ts', symbol: 'setBotCheck' },
    env: ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'], seen: null, v1: 'docs/superpowers/specs/2026-08-21-public-visualizer-trial-design.md §4 (never wired in 1.0)',
    note: 'The page passes siteKey as botSiteKey (components/visualizer/trial/trial-visualizer.tsx) and holds #trial-bot-check for the widget; send its token as askTrialRender({ botToken }). The names are Cloudflare’s — 1.0 had none. The trial itself opens with 1.0’s TRIAL_VISUALIZER_ENABLED=true (lib/visualizer/trial/policy.ts trialEnabled; the prototype’s demo shows it while TRIAL_IN_DEMO) — 1.0 meant it to be switched on only once this and trial-limit-store are plugged in.',
  },
  /* (pending modules S41b-3 — 1.0's deployment/plg anonymous workspace) */
  {
    key: 'trial-workspaces', name: 'The website’s no-account workspaces (Leads · Upload a quote · Quote X-Ray)', kind: 'provider', area: 'Website', slot: 'trial',
    standIn: 'A database file of its own beside the demo’s (<the demo’s file>.trial.db, made on first use) keeps each visitor’s workspace — 1.0’s anon_workspaces table — for 7 days; never a studio’s database. With a remote database there is no folder beside it, and the three tools answer the site’s 404 until a store is plugged in.',
    contract: { in: 'TrialStore — create · get (an expired row is gone) · write (a compare-and-set on the payload) · spend / refund (one conditional update against the 50-token grant) · remove · expired(now, limit) · reclaim · clear · count.', out: 'The workspace (id · payload by surface: leads · quote-digitizer · quote-xray · spent_tokens · created_at · expires_at).', fails: 'A store that throws: the tool says “Couldn’t save it — please try again”; a claim that fails keeps the workspace for the next sign-in.' },
    swap: { call: 'setTrialStore({ name, ready, create, get, write, spend, refund, remove, expired, reclaim, clear, count })', file: 'lib/trial/store.ts', symbol: 'setTrialStore' },
    env: ['TRIAL_TOOLS_ENABLED'], seen: null, v1: 'scripts/migrations/315_anon_workspaces.sql · 316_anon_token_fns.sql · src/lib/anon/{workspace,cookie,quota,claim,claim-on-login}.ts · src/app/api/anon/** · src/app/api/cron/{anon-sweep,anon-storage-gc}',
    note: 'The platform database keeps 1.0’s table with no key into any studio (1.0: “disposable by construction”); the cookie om_anon names a row, signed with AUTH_SECRET. TRIAL_TOOLS_ENABLED is 2.0’s switch, the sibling of TRIAL_VISUALIZER_ENABLED (1.0 shipped the three on its PLG line); the bot check (trial-bot-check — 1.0’s Turnstile) runs before a workspace’s first save, and the 25-a-day ceiling per address rides trial-limit-store. The claim (lib/trial/claim.ts claimTrialWork) runs once a studio is open and its member signed in — sign-up and sign-in — through the studio’s own actions, and never throws (a piece that fails stays for the next sign-in); 1.0 raced its claim against 15 seconds — with a remote tenancy, give the claim your own timeout there. The sweeps are /api/cron/anon-sweep and /api/cron/anon-storage-gc.',
  },
  {
    key: 'trial-limit-store', name: 'A lasting store for the trial’s per-address limit', kind: 'provider', area: 'Website', slot: 'limit-store',
    standIn: 'One server’s memory counts each address’s tries (1.0’s in-memory limiter): a restart, or a second server, starts the count again.',
    contract: { in: 'take(key, max, windowMs) — the key is trial:<ask | keep>:<the visitor’s address>.', out: 'true while under max in the window; false once it is one too many.', fails: 'A throw lets the try through (the signed cookie still holds the browser to 3).' },
    swap: { call: 'setLimitStore({ name, take })', file: 'lib/visualizer/trial/server.ts', symbol: 'setLimitStore' },
    env: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'], seen: null, v1: 'src/lib/rate-limit.ts checkRateLimit · checkDurableRateLimit',
    note: 'The names are Vercel KV’s (Upstash: UPSTASH_REDIS_REST_URL · UPSTASH_REDIS_REST_TOKEN) — 1.0 had none for this. Sign-in’s, sign-up’s and the website’s forms count in lib/auth/limit.ts takeTry: move them onto the same store.',
  },
  /* (REG-2800) Tools › Floorplan to 3D Isometric — 1.0's module, its own page again */
  {
    key: 'floorplan-3d', name: 'A floor plan drawn in 3D (Floorplan to 3D Isometric)', kind: 'provider', area: 'Tools › Floorplan to 3D Isometric', slot: 'floorplan-3d',
    standIn: 'A studio’s own plan is straightened and cleaned in the browser for real; its rooms aren’t read and it isn’t drawn — the page says so and offers the sample plans that have views made ahead with 1.0’s model and prompts (public/floorplan-3d/samples/: the HDB 4-Room in Dollhouse, two takes; scripts/floorplan-3d/sample-inputs.mts makes what to send for the others).',
    contract: { in: 'readRooms({ scan }) — the straightened plan as a data URL · render({ scan, rooms, look: dollhouse | top }) — rooms as the studio confirmed them, or null.', out: 'PlaceRoom[] | null · { image (a URL or a data URL), fidelity: { matched, total } | null }', fails: 'A throw: the page says 1.0’s “The 3D render didn’t come through. This is usually temporary — try again.” with Try again; a fidelity short of the plan shows 1.0’s soft note under the render.' },
    swap: { call: 'setFloorplanRenderer({ name, readRooms, render })', file: 'lib/floorplan-3d/service.ts', symbol: 'setFloorplanRenderer' },
    env: ['OPENROUTER_API_KEY'], seen: 'Floorplan to 3D Isometric (“This is the prototype, so your own plan isn’t read or drawn in 3D…”)', v1: 'src/app/(main)/tools/floorplan-3d-isometric/page.tsx · src/lib/render/floorplan-pipeline.ts (detectInventory · generateWithGate · LOCKED_ISO_PROMPT · PHOTO_TOPDOWN_PROMPT) · floorplan-inventory.ts · src/app/api/render/floorplan-3d-sandbox/route.ts · docs/features/floorplan-3d/spec.md',
    note: '1.0’s models: google/gemini-3-flash-preview reads the rooms, google/gemini-3.1-flash-image draws (about US$0.07 a render, US$0.15 with the retry); 1.0 charged no AI credits and 2.0 keeps that. The browser’s half (deskew, paper finder, clean, crop) is 2.0’s own already (lib/planner/straighten*.ts, REG-1929); the page sends the straightened plan.',
  },
  /* ── answered by rule where 1.0 asked a model ── */
  { key: 'ai-ask', name: 'Maison AI’s answers', kind: 'rule', area: 'Maison AI', standIn: 'About 45 questions answered from the records by rule; changes are only proposed.', contract: { in: 'The question and the page it was asked on', out: 'An intent and its parameters (Match)', fails: 'No match: the sheet offers questions it can answer.' }, swap: { call: 'readQuestion(question, ctx)', file: 'lib/maison-ai/answer.ts', symbol: 'readQuestion' }, env: ['OPENROUTER_API_KEY'], seen: 'Maison AI’s sheet (“Answers from your records”)', v1: 'src/app/api/buddy/**' },
  { key: 'ai-drafts', name: 'Maison AI’s drafted messages', kind: 'rule', area: 'Maison AI', standIn: 'Each stage’s message drafted from the lead by rule.', contract: { in: 'The lead and who writes', out: '{ what, text }', fails: '—' }, swap: { call: 'stageDraft(lead, me)', file: 'lib/maison-ai/drafts.ts', symbol: 'stageDraft' }, env: ['OPENROUTER_API_KEY'], seen: null, v1: 'draft_client_message' },
  { key: 'meeting-reading', name: 'The meeting co-pilot’s reading and brief', kind: 'rule', area: 'Meetings', standIn: 'The notes read by rule as they’re typed; the brief made from them by rule.', contract: { in: 'readMeeting(notes, aim, the studio’s answers) · briefOf(the reading)', out: 'Reading · MeetingBrief', fails: '—' }, swap: { call: 'readMeeting(input) · briefOf(input)', file: 'lib/meetings/engine.ts', symbol: 'readMeeting' }, env: ['OPENROUTER_API_KEY'], seen: 'The meeting room (“by rule”)', v1: 'src/app/api/copilot/**' },
  { key: 'quote-draft', name: 'Draft a quote with Maison AI', kind: 'rule', area: 'Quotes', standIn: 'A first cut from the Price book — its sections first, then its items by trade; anything unpriced at S$0.', contract: { in: 'The brief, the property type, the book', out: 'DraftPlan', fails: 'Nothing matched: an empty plan, said.' }, swap: { call: 'draftPlan(brief, o)', file: 'lib/quotes/draft.ts', symbol: 'draftPlan' }, env: ['OPENROUTER_API_KEY', 'TAVILY_API_KEY'], seen: 'Create Quote › Draft with Maison AI', v1: 'the AI Quote Drafter' },
  { key: 'writing', name: 'Writing help', kind: 'rule', area: 'Quotes · Contracts', standIn: 'Improve · Shorten · Expand · Rewrite · Plain English by rule, always proposed first.', contract: { in: 'WritingInput — the words, the place, client-safe sources', out: 'Proposal — the new HTML and plain lines', fails: 'Nothing to change: said.' }, swap: { call: 'proposeWriting(input)', file: 'lib/writing/propose.ts', symbol: 'proposeWriting' }, env: ['OPENROUTER_API_KEY'], seen: 'Writing help (“Worked out from your records”)', v1: 'src/app/api/quotes/**/ai-*' },
  { key: 'quote-pdf-reader', name: 'Reading another studio’s quote', kind: 'rule', area: 'Quote X-Ray', standIn: 'A text PDF read by rule; a scan or a photo is refused, said.', contract: { in: 'The PDF’s text lines', out: 'QuoteText — trades, rooms, lines, totals', fails: 'No words: “a photo or a scan”.' }, swap: { call: 'readQuoteText(lines)', file: 'lib/quotes/pdf-quote.ts', symbol: 'readQuoteText' }, env: ['OPENROUTER_API_KEY'], seen: 'Quote X-Ray’s file tile', v1: 'src/app/api/quote-xrays/**' },
  { key: 'template-reader', name: 'Recreate a template from my quote', kind: 'rule', area: 'Quote templates', standIn: 'A PDF’s layout read by rule; a photo matched by its name.', contract: { in: 'Lines, pages, size, the file’s name', out: 'Match — the house style it is closest to', fails: '—' }, swap: { call: 'readLayout(input)', file: 'lib/templates/recreate.ts', symbol: 'readLayout' }, env: ['OPENROUTER_API_KEY'], seen: 'Recreate from my current quote', v1: 'the template recreator' },
  { key: 'quote-digitizer', name: 'Upload a quote (the digitizer)', kind: 'rule', area: 'Quotes', standIn: 'Sheets read by rule; a PDF read from its own words by rule (S21’s reader, S42 B·4) — a reference quote recognised by its words, never its name; a photo or a scan refused, said, and its credits given back.', contract: { in: 'The file (sheets: its rows; a PDF: its text lines)', out: 'UploadRead', fails: 'unreadable · empty · scan · currency — the 5 AI credits come back.' }, swap: { call: 'readQuoteUpload(file)', file: 'lib/quotes/read-upload.ts', symbol: 'readQuoteUpload' }, env: ['OPENROUTER_API_KEY'], seen: 'Create Quote › Upload a quote', v1: 'the Quote Digitizer' },
  { key: 'book-match', name: 'Matching lines to the price book', kind: 'rule', area: 'Price book', standIn: 'Word matching by rule; below-cost never applied on its own.', contract: { in: 'Lines and the book', out: 'LineMatch[]', fails: '—' }, swap: { call: 'matchLines(lines, book)', file: 'lib/company/price-book-match.ts', symbol: 'matchLines' }, env: [], seen: null, v1: '—' },
  { key: 'bill-reader', name: 'Reading a supplier bill', kind: 'rule', area: 'Finance', standIn: 'A bill’s PDF text read by rule; the fields to check.', contract: { in: 'The text lines and the vendors', out: 'BillRead', fails: '—' }, swap: { call: 'readBill(lines, vendors)', file: 'lib/finance/bill-reader.ts', symbol: 'readBill' }, env: ['OPENROUTER_API_KEY'], seen: 'The bill dialog (“Read from the file — check it”)', v1: 'the bill reader' },
  { key: 'floor-plan-rooms', name: 'A floor-plan photo’s rooms', kind: 'rule', area: '3D Space Planner', standIn: 'The rooms from the flat type on record; the paper found by rule (no perspective correction).', contract: { in: 'roomsForType(property type) · findPaper(raster)', out: 'Rooms to place · four corners', fails: 'No paper found: the whole photo.' }, swap: { call: 'roomsForType(type) · findPaper(raster)', file: 'lib/planner/photo.ts', symbol: 'roomsForType' }, env: ['OPENROUTER_API_KEY', 'ROBOFLOW_API_KEY'], seen: 'Make a 3D picture (“Started from … the flat type on record”)', v1: 'the floorplan-3d tools' },
  { key: 'describe-piece', name: 'Describe a piece of furniture', kind: 'rule', area: '3D Space Planner', standIn: 'The closest catalogue piece to the words.', contract: { in: 'The words', out: 'Described | null', fails: 'None close: said.' }, swap: { call: 'describePiece(words)', file: 'lib/planner/describe.ts', symbol: 'describePiece' }, env: ['MESHY_API_KEY'], seen: 'The planner (“Closest piece to your words”)', v1: 'the planner’s 3D generator' },
  { key: 'image-model', name: 'The AI Visualizer’s pictures', kind: 'rule', area: 'AI Visualizer', standIn: 'The curated engine recolours, tiles and removes in the browser; Replace can’t draw a new piece and says so; the drift guard checks framing by rule.', contract: { in: 'runPass(PassInput) · guardRender(photo, render)', out: 'PassOutput · a DriftReport and maybe a repaired picture', fails: 'A pass that fails is refunded (its credits come back).' }, swap: { call: 'runPass(input) · setImageIO(io)', file: 'lib/visualizer/engine/run.ts', symbol: 'runPass' }, env: ['OPENROUTER_API_KEY', 'FAL_KEY'], seen: 'The Visualizer’s furniture panel (“This is the prototype…”)', v1: 'src/app/api/render/** · src/app/api/visualizer/** · src/app/api/demo/visualizer/**', note: 'A model’s fault report goes through coerceDriftReport (lib/visualizer/drift.ts). (pending modules S36) The website’s no-account trial (/site/try) runs the same engine in the visitor’s browser; with a model it renders on the server between askTrialRender and keepTrialRender (app/site/try/actions.ts — 1.0’s /api/demo/visualizer/*: Fast, one version) and stamps the mark there (lib/visualizer/trial/watermark.ts markBox — 1.0’s watermarkTrialImage geometry). (pending modules S41) Furnish with the studio’s own products pinned — 1.0’s auto-furnish sandbox sent `catalogue` picks ({ id, name, category, vendor, priceCents, slot, image }, a few at most) — is a model’s to draw: plug it into the furnish pass; the prototype’s Replace already says it can’t draw a new piece in.' },
  /* (pending modules S41 — card studio:ai-sandboxes) what 1.0's seven sandboxes tried with a model, answered by rule — the four Spatial View
     experiments run on the developers' bench (/dev/ai-bench, off in production unless OPENMAISON_DEV_PREVIEWS=1); no studio screen shows them */
  { key: 'room-reading', name: 'Reading a room photo’s surfaces and pieces', kind: 'rule', area: 'AI Visualizer', standIn: 'The three sample rooms carry curated readings (traced outlines, every piece); any other photo is read as Walls · Floor · Ceiling by rule (colour, edges and seeds), and the studio adds or draws the rest.', contract: { in: 'The photo’s pixels (an Img)', out: 'fallbackDots → fallbackDetection: a Detection (surfaces with seeds and how each grows; a model would add outlines and furniture — 1.0’s shape: label, point [y, x] or box_2d 0–1000, category)', fails: 'Nothing read: the dots fall back to 1.0’s three places; a Floor the photo doesn’t show is left out (said in the surfaces list).' }, swap: { call: 'fallbackDots(img) → fallbackDetection(dots)', file: 'lib/visualizer/engine/fallback.ts', symbol: 'fallbackDots' }, env: ['OPENROUTER_API_KEY'], seen: 'The AI Visualizer’s surfaces list (a photo nobody traced reads Walls · Floor · Ceiling)', v1: 'src/app/api/render/{detect,segment} · detect-core · the /tools/detect-sandbox bench (four models, centre point or bounding box)', note: 'The developers’ bench draws a reading over its photo (Depth › What it read); scripts/viz/regions.mts and fallback-test.mts check them in Node.' },
  { key: 'depth', name: 'A photo’s depth', kind: 'rule', area: 'AI Visualizer · developers’ bench', standIn: 'Every pixel’s distance read from the room’s shape by rule — the floor and ceiling planes from the camera the walls give, an upright where it meets the floor, a piece where its foot does; never painted by a model.', contract: { in: 'depthOf(photo, key, reading) — the photo, a key for its regions, its Detection', out: 'DepthMap — metres per pixel, what each pixel was read as, near · far, the camera (traced or default), each layer’s near and far', fails: 'A photo nobody traced takes the default camera (the horizon at 45 %) and says so; a gap takes its nearest neighbour.' }, swap: { call: 'depthOf(photo, key, reading)', file: 'lib/visualizer/spatial/depth.ts', symbol: 'depthOf' }, env: ['OPENROUTER_API_KEY'], seen: null, v1: 'src/app/api/render/depth (an image model asked for a grey map, near white) · src/components/tools/depth-parallax-viewer.tsx', note: 'Only on the developers’ bench (/dev/ai-bench). 1.0’s route named its upgrade: a monocular depth model (Depth-Anything V2 through onnxruntime) answering the same map — depthPicture gives 1.0’s grey picture of it.' },
  { key: 'reangle', name: 'The same room from another camera', kind: 'rule', area: 'AI Visualizer · developers’ bench', standIn: 'Six camera moves (1.0’s: orbit left · right, step in · back, raise · lower) drawn from the photo’s own pixels pushed back by their depth (three.js) — the camera moves, the room doesn’t; what the photo never saw is stretched from its edge, or cut away with Trim edges.', contract: { in: '{ photo, its DepthMap, a CameraMove (yaw · pitch degrees, metres right · up · back) } — poseFor(move, pivot) places the camera', out: 'One picture of the photo’s size per move', fails: 'A big move opens gaps behind the pieces — the bench says so under the picture.' }, swap: { call: 'CAMERA_MOVES · poseFor(move, pivot)', file: 'lib/visualizer/spatial/moves.ts', symbol: 'poseFor' }, env: ['OPENROUTER_API_KEY'], seen: null, v1: 'src/app/api/render/reangle (single move, a free move, or one 3 × 2 montage sliced into six) · spatial-view-experiment.tsx “Angles”', note: 'Only on the developers’ bench. A model that invents the hidden room answers the same picture per move.' },
  { key: 'outpaint', name: 'More room around a photo', kind: 'rule', area: 'AI Visualizer · developers’ bench', standIn: 'The photo’s own edges mirrored outward and fading into a soft blur — or 1.0’s padded canvas itself (the blur with the photo on top); nothing new is painted.', contract: { in: 'extendRoom(img, factor 1.2–1.6, mode mirror | cover)', out: 'Extended — the bigger picture and where the photo sits in it (inner x, y, w, h)', fails: 'Never — the margin is always filled.' }, swap: { call: 'extendRoom(img, factor, mode)', file: 'lib/visualizer/spatial/extend.ts', symbol: 'extendRoom' }, env: ['OPENROUTER_API_KEY'], seen: null, v1: 'src/app/api/render/outpaint · src/lib/spatial/pad-for-outpaint.ts (the canvas it sent the model)', note: 'Only on the developers’ bench (its Extend view, and Look around’s Fill the edges). A model paints a sharp continuation of the room into the same margin.' },
  { key: 'orbit-video', name: 'An orbit clip', kind: 'rule', area: 'AI Visualizer · 3D Space Planner · developers’ bench', standIn: 'A clip recorded in the browser from 2.0’s own 3D views (MediaRecorder): the photo’s room turning gently side to side (±8° over 6 s), or a 3D layout on a turntable — WebM, MP4 on Safari; nothing invented.', contract: { in: 'recordCanvas(canvas, seconds, frame(t)) — the view moved each frame (orbitYaw for the photo; the planner’s own turn for a layout)', out: 'Clip — { url, type, bytes, seconds }', fails: 'A browser that can’t record says so; an empty clip asks to try again.' }, swap: { call: 'recordCanvas(canvas, seconds, frame)', file: 'lib/visualizer/spatial/clip.ts', symbol: 'recordCanvas' }, env: ['FAL_KEY', 'FAL_API_KEY'], seen: null, v1: 'src/app/api/render/orbit-video (fal.ai image-to-video, Kling by default) · the “AI frames” engine (six reangles played as a ping-pong)', note: 'Only on the developers’ bench. Proposed for the planner’s 3D picture (Download a turning clip) in outcome-S41 — not on a studio screen until Vicky says.' },
  { key: 'suggestions', name: 'Suggestions by rule', kind: 'rule', area: 'Projects · Leads', standIn: 'Suggested replies, a milestone’s tasks, the briefs, the suggested member, the drafted schedule and Refine — all by rule, none charged.', contract: { in: 'The record each reads', out: 'Its suggestions', fails: '—' }, swap: { call: 'suggestReplies · suggestForMilestone · projectBriefs · briefsFor · suggestMember · draftTimeline · refineNoteHtml', file: 'lib/projects/suggested-replies.ts', symbol: 'suggestReplies' }, env: [], seen: null, v1: '1.0’s AI suggestions' },
]

/** (Company › Integrations) The studio-facing line for each simulated connection — said only while it is one. (invented copy) */
export const SIMULATED_WORDS = {
  qanvast: 'Simulated on this prototype — the Qanvast leads here are sample records, and a returned lead isn’t sent to Qanvast.',
  email: 'Simulated on this prototype — nothing really arrives at this address; Simulate an enquiry plays one.',
  meta: 'Simulated on this prototype — leads from Facebook don’t really arrive; once connected, Simulate a form submission plays one.',
  gmail: 'Simulated on this prototype — no inbox is really read; once connected, Sync now plays one enquiry.',
  xero: 'Simulated on this prototype — nothing is sent to Xero.',
  /* (pending modules S37) Company › Profile › Listed on Qanvast */
  listing: 'Simulated on this prototype — your application is kept here and isn’t sent to Qanvast; while it waits you can play Qanvast’s answer.',
  /* (pending modules S41b-5) Qanvast Ops › Lead credits · Reviews */
  qanvastAccount: 'Simulated on this prototype — the credits follow your Qanvast leads and returns here, the reviews follow your finished projects and published work; the contract, rank, page views and Singapore’s averages are samples, and a reply is kept here, not posted to Qanvast.',
} as const
/** (S42E, E-21) Listed on Qanvast's line for someone who can't play Qanvast's answer (only Owners and Admins apply and play) — the first half alone. */
export const LISTING_SIMULATED_READ = 'Simulated on this prototype — your application is kept here and isn’t sent to Qanvast.'
export type SimulatedKey = keyof typeof SIMULATED_WORDS
