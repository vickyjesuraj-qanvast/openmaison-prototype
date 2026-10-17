# S34 · Real services behind the stand-ins — outcome (2026-10-13, lane B)

Card: `api:message-delivery-providers` (recommendation "developers' lane"; its three questions taken as recommended — *Decisions*). **Nothing
calls a real provider** — no keys, no network. What the step makes is the other half: every stand-in the programme built is now **plug-ready
in one place and honest where a studio meets it**. One registry (`lib/services/registry.ts`, 32 seams), ten slots on `globalThis`
(`lib/services/slots.ts`), one start-up place (`lib/services/install.ts`, called by `instrumentation.ts`), one scheduler entry
(`/api/cron/<job>`), one ops report (`/api/services`), the providers' webhooks as real routes, and the developers' map
`design-source/context/parity/30-pending-modules-build-2026-10-11/services.md` (written from the registry — the probe fails if they drift).

1.0 read: `src/lib/notifications/**` (dispatch, `channels/{email,whatsapp}.ts`, `templates/render.ts` and `base/*`, `retry.ts`,
`recipient-allowlist.ts`, `log-hub.ts`), `src/lib/360dialog.ts`, `src/app/api/webhooks/{whatsapp,whatsapp-central,leads/[token]}/route.ts`,
`src/lib/webhook-lead-parser.ts`, `src/app/api/cron/*` (all thirteen) + `vercel.json`, `src/lib/cron-auth.ts`, `src/app/api/dev/*`,
`src/app/api/notifications/whatsapp-status`, `src/app/api/quote-pdf/render`, `.env.example`. Register rows: `steps/reg-S34.md`
(REG-S34.1…19). Probe: `design-source/verify/pending-modules/verify-pm2-s34.cjs` (**180 / 180** with the secrets on the server, **162 / 162**
without — its in-process half `pm2-s34-seams.mts` **108 / 108**); shots in `design-source/verify/pending-modules/pm2-s34/`.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "A real email and WhatsApp provider behind setDeliveryAdapter (Resend · 360dialog or another)" | **stand-in — plug-ready.** The adapter is the developers' (no keys here); its whole contract is built: the address its channel needs, `html()` (the branded page, built only when asked), `{ status, error?, providerRef? }` (the provider's id kept on the row for its receipts), an optional `readWebhook` for a provider whose envelope isn't Meta's; the slot is on `globalThis`, so `setDeliveryAdapter` in `installServices()` reaches every bundle (it would not have before — a fix); 1.0's `NOTIFY_ALLOWLIST` (blocked, never handed over) and `not_in_plan` (proved never handed over); 1.0's env names in `.env.example`; a start-up warning when `RESEND_API_KEY` / `D360_API_KEY` is set while the outbox still answers; Sent messages says "Simulated on this prototype" until then | `lib/notifications/{delivery,allowlist}.ts`, `lib/services/*`, `instrumentation.ts`, `.env.example`, `app/settings/sent-messages.tsx` |
| "The production five-minute sweep that runs deliverDerived and releaseHeldMessages for every member; today these run when someone opens the bell" | **built** — `runJobs` (messages: held mail past its Undo, the retries, every active member's derived reminders, the client's payment-due tell · summaries · repeats · credits · feeds · accounting), each idempotent (a second run sends nothing new — probed), behind `GET·POST /api/cron/<run · notification-scheduled · notification-digest · accounting-sync · repeats · feeds>` with 1.0's `CRON_SECRET` guard (fails closed in production). The lazy runs stay, so the demo is unchanged | `lib/services/{sweep,cron-auth}.ts`, `app/api/cron/[job]/route.ts` |
| "Delivered and Read receipts from WhatsApp; 2.0's Sent messages knows only sent, failed, held and no address" | **built** (Q1 as recommended: show them once a provider reports) — `POST /api/webhooks/whatsapp` (1.0's address and token gate; Meta's `hub.challenge`), `readMetaEnvelope`, `applyReceipts` (Delivered · Read on the row; a late failure into the retries and the last-try bells); Sent messages reads Delivered, then Read; also 1.0's `failed` receipt | `app/api/webhooks/whatsapp/route.ts`, `lib/notifications/{webhook-read,delivery,outbox}.ts`, `notification_outbox.provider_ref · delivered_at · read_at` |
| "Branded HTML emails (the studio's logo and colours) in place of plain text" | **built — a first cut for Vicky** (Q3: the look is hers to design) — `emailHtml(page, brand)`: the studio's logo or name, the words with live links, an "Open it →" line, the contact lines, a member's notice-settings link; never OpenMaison's name; the text part stays the record. Developers preview any sent email at `/api/dev/email-preview?id=` (1.0's dev previews; off in production) | `lib/notifications/email-html.ts`, `app/api/dev/email-preview/route.ts` |
| "What happens to a client's WhatsApp reply (1.0 only logged it)" | **built** (Q2 as recommended — it arrives in Messages): kept once in `inbound_messages`, placed by the message it answers or the one live lead the number belongs to, filed as the client's line in the project's Client conversation (or the lead's), the team's bell as for a portal message; a stranger's, a member's or a wordless one kept, filed nowhere | `lib/notifications/inbound.ts`, `lib/portal/client-message-bell.ts`, `inbound_messages` |
| *(S06's note)* `raiseDueRepeats(now)` is the seam a real scheduler calls | **built** — the sweep's `repeats` job (hourly) | `lib/services/sweep.ts` |
| *(S07's note)* Files' Download of a money paper prints the page; a real PDF file needs a server renderer (`lead-files.tsx` `download` for `f.paper`); Xero's overpayment simulated | **plug-ready** — every paper's Download PDF and `?print=1` call `printPaper()` (seventeen pages; still the browser's print); `setPdfRenderer` + `NEXT_PUBLIC_PDF_DOWNLOADS=1` turn them into `/papers/pdf?path=` (the page drawn with the visitor's own cookies, paper pages only; 501 on the stand-in). Files' Download already opens the paper with `?print=1`, so it follows. Xero: behind `setAccountingProvider` | `lib/paper-print.ts`, `lib/services/pdf.ts`, `app/papers/pdf/route.ts`, 17 paper components |
| *(S03's note)* contracts' print | **plug-ready** — the contract preview and the signing pages call `printPaper()` (an uploaded PDF still downloads its own file) | `components/contracts/**` |
| *(S09's note)* an invitation's final failure should tell its inviter; 1.0 limited sends to 10 a minute per IP | **built** — the inviter's bell (S18 built it; proved here with a failing adapter: "The invitation to … could not be sent", opening their row on Members) · ten invitations a minute per visitor once a real delivery provider sends them | `lib/notifications/delivery.ts` `tellFinalFailure`, `lib/auth/visitor.ts` `inviteTry`, `app/company/members-actions.ts` |
| *(S12's note)* the matcher is the seam for a model | **registered** (`book-match`) — `matchLines` stays rule-built | `lib/services/registry.ts` |
| *(S13's notes)* the SMS code's rate limits; client emails / WhatsApp actually sent; the portal's messages through the outbox | **built / stand-in** — the portal's code step now asks the one sign-in provider (`sendCode` · `checkCode`) with 1.0's limits (five a minute per number and per visitor) once it is real, never on the stand-in (S13's reason); it says "Demo only — no text is sent: any six digits open your project." while the stand-in answers (it said "We sent a 6-digit code"); client messages go through the delivery slot | `app/portal/actions.ts`, `components/portal/portal-sign-in.tsx`, `lib/auth/visitor.ts` |
| *(S18's notes)* the sweep runs `sendDueSummaries` with `deliverDerived` / `releaseHeldMessages`; 1.0's `whatsapp-status` warning; its recipient allow-list for non-production deployments; 8 AM in the studio's time | **built** — the sweep's jobs; the warning turned round (`serviceWarnings`, logged at start-up and in `/api/services`); `NOTIFY_ALLOWLIST`. **Kept:** the time is the server's (`TZ=Asia/Singapore`, said in the registry) — one studio per database | `lib/services/{sweep,install}.ts` |
| *(S19's notes)* a real payment provider replaces `completeCheckout` for every kind (topup · plan · auto_topup · seats' invoice); auto top-up charges the card on file; WhatsApp's `not_in_plan` rows must never be sent | **plug-ready / built** — `setPaymentProvider`: checkout pages (`payUrl`), the browser can't complete a checkout once real, `POST /api/webhooks/payments` → `finishCheckout` (claimed once), `charge` for auto top-ups and added seats (a refusal changes nothing), the provider's billing page for Cancel · Keep · Update card; `not_in_plan` proved never handed to an adapter (also on a retry) | `lib/credits/{payments,checkout,ledger}.ts`, `app/credits/actions.ts`, `app/api/webhooks/payments/route.ts`, the two dialogs |
| *(S20's note)* an image model plugs into `runPass` and reports through `coerceDriftReport` | **registered** (`image-model`) — the curated engine stays; `setImageIO` already swaps its pixels | registry |
| *(S21's note)* OCR / a document model at `readQuoteText`; `readSide` | **registered** (`quote-pdf-reader`) | registry |
| *(S22's note)* the Industry News fetch, hourly; a model behind the Ask box (`readQuestion`) | **plug-ready** — `setFeedSource({ fetchText })` and the hourly `feeds` job; `readQuestion` registered (`ai-ask`) | `lib/services/feeds.ts` |
| *(S23's notes)* a transcriber into the notes box / `writeUpMeeting`; a model into `readMeeting` / `briefOf`; Google Calendar two-way beside `calendar.ts`; the client email rides `deliver()` | **plug-ready** — `setTranscriber` (+ `NEXT_PUBLIC_TRANSCRIPTION=1` for the dialog); `setCalendarSync` (the push half, queued after every meeting write); `readMeeting` registered; the client email is the delivery slot's. **Kept:** live listening (a stream) and the calendar's pull half (the adapter's, into `updateMeetingPlan`) | `lib/meetings/{transcribe,calendar-sync}.ts`, `app/meetings/actions.ts`, `components/meetings/write-up-dialog.tsx` |
| *(S24's note)* Qanvast's brand feed; the asks are what the feed would report back | **plug-ready** — `setFeedSource({ marketplace })`. **Kept:** reporting the asks back (no Qanvast API to call) | `lib/services/feeds.ts` |
| *(S25's note)* the editors' feed into `feedStatements(rowsFromFeed(rows), now)`; a real feed never sets `is_sample` | **plug-ready** — `setFeedSource({ insights })`; an empty answer never empties the copy | `lib/services/feeds.ts` |
| *(S26's note)* members' files' bytes → object storage (`keepChatPhotos` · `takeChatFilePiece` · `/chat/file`); live delivery by a socket; `/chat/file` and `/files/raw` need a real session | **registered / kept** — the lead file store is behind `setFileStore` (and six bypasses moved onto it); the chat store, like the other stores of bytes, is listed with its own functions; the socket is kept (polling, as P-G); the sessions are S30's (real records) | `lib/leads/file-store.ts`, registry `storage` |
| *(S27's note)* Qanvast's Hangouts feed | **plug-ready** — `setFeedSource({ hangouts })` | `lib/services/feeds.ts` |
| *(S28's note)* an image model at the room reading and the paper finder | **registered** (`floor-plan-rooms`) | registry |
| *(S29's note)* a model at `proposeWriting` | **registered** (`writing`) | registry |
| *(S30's notes)* `setSignInProvider`, the portal's code step through the same provider and `takeTry`, a durable limiter, Secure cookies, the real visitor address | **built** — the slot; the portal through it; the visitor's address (X-Forwarded-For's first hop) counted with a real provider; Secure on https (`COOKIE_SECURE`). **Kept:** a shared durable limiter (one server's memory, as 1.0's — the developers' with the provider) | `lib/auth/{provider,visitor,limit,paths,session}.ts`, `proxy.ts`, `lib/portal/session.ts` |
| *(S31's note)* `setStudioProvisioner` beside `setSignInProvider`; the paused switch moves to the Platform side | **built** — on its slot. **Kept:** the switch (Platform admin, excluded) | `lib/studios/create.ts` |
| *(S04 · S10 · S11's seams)* `draftPlan`, `readQuestion`, `readLayout` | **registered** (`quote-draft`, `ai-ask`, `template-reader`) | registry |
| *(the step's list)* Xero; a scheduler (`raiseDueRepeats`, `sendDueSummaries`) | **plug-ready / built** — `setAccountingProvider` + the `accounting` job; the sweep | `lib/finance/xero-server.ts`, `lib/services/sweep.ts` |
| *(found while building)* Company › Integrations' Webhooks showed URLs with no address behind them | **built** — `POST /api/webhooks/leads/<token>`, 1.0's rules (aliases, Google's key and test lead, X-Signature HMAC for keyed endpoints, 10 a minute, 64 KB); `captureLead` out of the Server Action file | `app/api/webhooks/leads/[token]/route.ts`, `lib/leads/{capture,webhook-payload}.ts` |

## Found in 1.0, not on a card
- **1.0's other crons** (`vercel.json`): `invoice-overdue` → a derived reminder here (the messages job sends it); `copilot-analytics` → read
  on demand (Company › Reports › Meetings, S23); `poll-emails` → Gmail's (the `lead-gmail` seam); `fx-rates` → waits with the countries (on
  hold, DEF-30); **for S41b:** `price-drift` (price-book items 15% off the platform's market rates, monthly) and `aggregate-rates` (the
  crowd rates behind them), `brand-dossier-scan` (X-Ray's web-grounded brand dossiers; 2.0 keeps curated brand notes), `usage-rollup` ·
  `usage-retention` · `fork-analytics-pull` (OpenMaison's usage analytics — Studio Health is S39).
- `src/app/api/dev/email-gallery` — one preview by outbox row instead (REG-S34.5).
- `src/lib/notifications/log-hub.ts` `pushNotificationLogToHub` — each fork's sends copied to OpenMaison's central log (Platform admin ›
  Notifications log) — Platform, excluded.
- `src/app/api/webhooks/leads/endpoints/**` (create · regenerate · logs) — 2.0's Integrations actions already do these (REG-612).

## Decisions (the card's questions, as recommended — her "build all of them" 2026-10-11)
1. **"Should Sent messages show Delivered / Read for WhatsApp once a real provider reports it?"** — Yes: the row's status reads Delivered,
   then Read; nothing changes until a provider reports.
2. **"Should a client's WhatsApp reply arrive in Messages, or stay outside the app?"** — It arrives in Messages, in the conversation the
   studio already answers that client in (the project's Client conversation, else the lead's), and the team's bell rings as for a portal
   message; anything it can't place surely is kept, filed nowhere (never a guess between two leads).
3. **"Do you want to design the branded email (logo, colours), or keep plain text?"** — A first cut on the brand kit is built so the
   developers' provider has an HTML part on day one; the text part stays the record; the look is flagged for Vicky to design.
4. **The step's "their admin"** — no admin screen (Platform admin is out by her word): the studio-side truth is said where a studio meets
   each stand-in, and the deployment's truth is `/api/services` + the start-up warnings.

## What to check in the browser (production build; Dane Owner unless said)
- **Settings › Notifications › Sent messages** — the help line ends "Simulated on this prototype — each message is recorded here, and none is
  really sent." (1440 · 390). Germaine sees the same line over her own messages.
- **Company › Integrations** — Qanvast, Website form by email, Meta Lead Ads, Email lead sources and Xero each carry their "Simulated on this
  prototype — …" line under the help; Webhooks none; Calendar invites "…comes later". Same for Hui Min (Admin) and Germaine (read-only). The
  loader draws the first three lines (1440 · 390). Generate a webhook URL → its URL ends `/api/webhooks/leads/<48 hex>`.
- **The client portal** `/my/demo-studio` — enter 9773 1968 (Benjamin) → the code step says "Demo only — no text is sent: any six digits
  open your project."; any six digits open it (1440 · 390 · 320).
- **A paper** — an invoice's Download PDF still opens the print dialog (Save as PDF).
- Nothing else a person sees changes: the Plans / top-up dialogs, seats, auto top-up, the write-up dialog and the meeting room read as before.
- Developers: `curl -H 'Authorization: Bearer $CRON_SECRET' /api/cron/run`, `/api/services`; post Meta's envelope to
  `/api/webhooks/whatsapp?token=…` (the probe's section 3 shows one).

## Probes run (lane B, port 3170, `next start` on scratch copies of base.db migrated + repaired; tsc · eslint (0 errors) · design:lint hold)
- `pending-modules/verify-pm2-s34.cjs` — **180 / 180** with the server started with `CRON_SECRET` · `WHATSAPP_WEBHOOK_SECRET` (and the
  probe given `S34_CRON` · `S34_WA`); **162 / 162** on a plain server (it proves the off side: 401 · 503); its in-process half
  `pm2-s34-seams.mts` **108 / 108**; every table put back as found; no page errors. A server started with `RESEND_API_KEY` set logs the
  start-up warning (seen).
- Touched probes, each on a fresh copy with its own server: `projects/verify-pj-gap-e` 55/55 (delivery) · `pm2-s09` 79/79 · `pm2-s18` 63/63
  · `pm2-s19` 116/116 · `pm2-s30` 109/109 · `pm2-s13` 65/65 · `pm2-s17` 130/130 (the Integrations ghost) · `pm2-s23` 148/148 (the write-up
  dialog) · `pm2-s07` 89/89 (the papers' print) · `pm2-s26` 107/107 (the portal's message bell) · `projects/verify-pj-gap-f2` 84/84 (Xero) ·
  `projects/verify-pj-gap-h` 80/80 (client messages) · `projects/verify-pj-r9` 66/66 (the portal sign-in) · `parity-map-build/verify-pm-g`
  59/59 (the outbox) · regression `st-r2` 30/30 · `st-r3` 30/30 · `sw-r4` 35/35 · `ux-p6` 57/57 · `cr-r1` 59/59 · `cr-r3` 40/40 · `cr-r5` 16/16.
- `pm2-s31` **100 / 103** — the three are not this step's (no S34 code is on their path): "someone signed in never sees sign-up — they go
  home" and "the studio opens on the app's front door" expect `/leads`, but S22 (lane B) made `/` the Dashboard; "nothing else" finds a
  `portal_addresses` row — the new studio's own address, made by `currentPortalSlug` the first time a page needs it (Q-44), which S22's front
  door now does. **For the orchestrator:** update S31's two front-door assertions to `/dashboard` and let the new studio's own portal address
  pass (a deliberate change of S22's, not a leak).

## Migration · repair
- **Migration `0106_services_s34`** (generated in the lane; regenerate at land): table `inbound_messages`; `notification_outbox.provider_ref ·
  delivered_at · read_at` (+ index); `billing_checkout_sessions.trial` — all additive, schema only. `inbound_messages` joins `BASELINE_TABLES`
  and the snapshot's `TABLES`.
- **No repair** — nothing to back: the stand-ins report nothing and no demo state changed (R145 still free in lane B).

## Shared pieces changed
- `lib/auth/paths.ts` (`PUBLIC_PATHS` + `/api/cron` · `/api/webhooks` · `/api/services` · `/papers`; `COOKIE_SECURE`), `proxy.ts` (Secure on
  the renewed cookie), `lib/auth/{limit,provider,session}.ts`, `lib/portal/session.ts` (Secure).
- Seventeen paper components: `window.print()` → `printPaper()` (same behaviour) — `components/{quotes,contracts,projects,finance,planner,
  portal}/**` (listed in REG-S34.12).
- `app/portal/messages-actions.ts` — the team's bell moved to `lib/portal/client-message-bell.ts` (same behaviour).
- `lib/leads/file-store.ts` + six writers/readers moved onto it (`lib/projects/{choices,payments}.ts`, `app/projects/{updates,choices}-
  actions.ts`, `app/visualizer/actions.ts`, `app/files/img/[fileId]/route.ts`).
- `components/company/{integrations-view,company-ghosts}.tsx`, `app/settings/sent-messages.tsx`, `components/portal/portal-sign-in.tsx`,
  `components/credits/{plans-dialog,credit-dialogs}.tsx`, `components/meetings/write-up-dialog.tsx`, `lib/notifications/outbox.ts`.
- No `components/om/*`, shell layout or `app/globals.css` change; `design:lint` holds (no baseline raised).

## For the next steps
- **S41b:** the crons listed above (*Found in 1.0*); 1.0's per-fork central notification log is Platform.
- **S42:** the demo's derived reminders — the bell's "A task is due in 30 minutes" event names a row that reads "Due tomorrow: …" (older,
  seen in Sent messages after a sweep).
- **The orchestrator / CLAUDE.md's Map:** *Real services (pending modules S34)* — `lib/services/{slots,registry,install,sweep,feeds,pdf,
  cron-auth}.ts`, `instrumentation.ts`, `app/api/{cron/[job],services,webhooks/{whatsapp,payments,leads/[token]},dev/email-preview}`,
  `app/papers/pdf`, `lib/paper-print.ts`, `lib/notifications/{allowlist,email-html,webhook-read,inbound}.ts`, `lib/credits/{payments,checkout}.ts`,
  `lib/meetings/{calendar-sync,transcribe}.ts`, `lib/leads/{capture,webhook-payload}.ts`, `lib/auth/visitor.ts`; the developers' map
  `30-…/services.md`. **Any new stand-in** gets a registry entry (and a slot when a real service is needed) — the probe checks both.
- **Lane A's merge:** `lib/auth/paths.ts` `PUBLIC_PATHS` gained four prefixes here — S35's marketing site adds its own; keep both.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock; nothing a person sees changes but the honest lines (Sent messages, five
   Integrations lines, the portal's code step), Delivered / Read (only with a real provider) and a reply landing in Messages — each listed as
   invented copy in `reg-S34.md`; the branded email's look and the client-demo visibility of the lines are flagged for Vicky.
2. **One system, no one-offs** — one registry, one slot shape, one start-up place, one scheduler door; the honest lines in the cards' own
   hint type and the words in one table (`SIMULATED_WORDS`); the reply's bell is the portal's own helper; every paper prints through one call.
3. **Plain words for studio people** — "Simulated on this prototype — nothing is sent to Xero."; "Demo only — no text is sent: any six digits
   open your project."; "Delivered", "Read". The technical words live in the developers' document.
4. **Nothing is lost** — a reply is kept even when it can't be placed; an empty feed answer never empties the copy; a refused charge changes
   nothing; every webhook delivered twice does its work once; older rows read through the store as before.
5. **Say why** — every refusal names its rule (a wrong token, no secret set, "this server only sends to its test list", "The card on file
   didn’t go through — …"); the ops report and the start-up warning say which key is set while its stand-in answers.
6. **Back returns where you came from** — no new navigation; the Plans dialog's real checkout returns to Plan & billing (`returnTo`).
7. **Every screen is whole** — no new page; the Integrations ghost draws the new lines (probed at 1440 · 390); the routes answer JSON, never a
   page error.
8. **Every width is designed** — the lines wrap in their cards; no sideways scroll at 390 / 320 on Integrations, Sent messages or the
   portal's code step (probed against `screen.width`).
9. **Tables follow the leads listing** — no new table; Sent messages' status column only reads two more words.
10. **Motion with purpose** — none added.
11. **Honest data** — the heart of the step: no fake success anywhere (the stand-ins say so; a real adapter's results are recorded as it
    answers); no repair needed — no demo state was invented for a provider that never answered.
12. **Reach for everyone** — the honest lines are text in the reading order; the portal's demo line sits under the code boxes before the
    button; nothing new to press without a label.
- **How to add a missing thing** — one home (the registry; the studio-facing lines where each stand-in already shows); shown only when it
  applies (each line goes once its slot is filled); one filled button (none added); defaults need no set-up (every slot answers with its
  stand-in, the demo unchanged).
