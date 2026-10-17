# S41b · Nothing left behind — every 1.0 API route, timed job and table → its 2.0 home

Her words, 2026-10-12: "please make sure nothing left behind from 1.0 to 2.0". This sweep looks past the 41 cards: it maps **every API route,
every timed job and every table 1.0 has** to 2.0. Read-only, 2026-10-13. Each 2.0 home was confirmed by opening the 2.0 file it names (the
server actions' exports, `lib/db/schema.ts`, `lib/services/registry.ts`, the read functions in `lib/**`), and each decision by the audit or
outcome it cites. Siblings: `ledger.md` (the cards' pending lines) and `sweep-pages.md` (pages and menus).

- **1.0** = `qanvast-id-tool`. **The working tree** `integ/security-non-qanvast` @ `5d177c233` (2026-10-05) — the tree every audit and card
  read: **628 route files** under `src/app/api/**` (no other route handlers, no server actions — `"use server"` appears nowhere in `src/`,
  no Supabase edge functions, no pg_cron), **13 crons** in `vercel.json`, and **175 tables** created in `supabase/migrations/**` (102 files)
  + `scripts/migrations/**` (336 up files), plus 2 the code reads that no migration creates. **The two newer deployment branches** were swept
  too, because 1.0 kept moving after the cards were written: `origin/deployment/plg` @ `64791f115` (2026-10-09, the self-serve line — S19 and
  S21 read it) adds **149 routes**, **5 crons** and **28 tables**; `origin/deployment/qanvast` @ `40f8635e2` (2026-10-08, the Qanvast line) adds
  **15 routes** and **2 tables**. Most of plg's additions are 1.0 porting 2.0's own screens back (library folders, notes, the Visualizer 2.0).
- **2.0** = this repo: `CLAUDE.md` › Map, `lib/db/schema.ts` (158 tables), the 106 `app/**/*actions.ts` files, the 40 route handlers
  (`app/api/**` + the file / picture / card routes), `lib/services/registry.ts` (every stand-in seam), the parity maps `parity/*migration-map*.md`,
  map 28's rows, and the pending-modules steps / outcomes / `services.md` / the surveys.
- **Excluded by her:** Platform admin (staff-only routes and tables). **Parked by her:** dark mode / themes / guided tours, Languages, countries
  beyond Singapore. **Dev / test endpoints** are named where they sit.

**Statuses:** **Built** — 2.0 does the job (its home named) · **Built in another form** — the job is done another way, said in the row ·
**Seam (stand-in)** — a stand-in a developer swaps through `lib/services/registry.ts` (its key named) · **Rule (stand-in)** — 1.0 asked a model,
2.0 answers from the records by rule (a registry `rule` entry) · **Decided** — a recorded call not to port it (cited) · **Dead in 1.0** — nothing
in 1.0 calls or reads it · **Parked by her** · **Excluded** — Platform admin, OpenMaison's own operations, or dev / test · **Card queued** — on
a card whose step is not built yet (S39 Studio Health, S41 the AI sandboxes) · **MISSING** — no 2.0 home, no card, no decision (§3).

## Counts

| Status | Routes · working tree | Routes · newer branches | Tables · working tree | Tables · newer branches |
|---|---:|---:|---:|---:|
| Built | 420 | 130 | 130 | 26 |
| Built in another form | 0 | 11 | 3 | 2 |
| Seam (stand-in) | 35 | 3 | 3 | 0 |
| Rule (stand-in) | 51 | 3 | 0 | 0 |
| Decided | 46 | 0 | 16 | 0 |
| Dead in 1.0 | 16 | 3 | 13 | 0 |
| Parked by her | 2 | 0 | 1 | 0 |
| Excluded | 53 | 3 | 8 | 0 |
| Card queued | 5 | 0 | 3 | 0 |
| MISSING | 0 | 11 | 0 | 2 |
| **Total** | **628** | **164** | **177** | **30** |

Timed jobs: 13 on the working tree + 5 more on plg = **18** (§1.1). Every route file and every table appears exactly once below (the
generator refuses a gap or a double).

**MISSING — 4 items, all from the newer branches no card read** (§3): M-01 try the tools without an account and keep the work at sign-up (plg) ·
M-02 the Free plan's upgrade nudges (plg) · M-03 Cost & Margin Visibility per role (qanvast) · M-04 Qanvast Ops › Lead credits and Reviews
(qanvast — S16 decided "nothing to port" because the working tree lacks the pages; the Qanvast line has them). **Nothing on the working tree is
MISSING**: every one of its 628 routes and 177 tables has a 2.0 home, a stand-in, a recorded decision, or is dead / excluded / parked / queued.

## 1. API routes and timed jobs

### 1.1 Timed jobs (`vercel.json` crons)

2.0 has no scheduler of its own: each timed thing runs where it is read, and `GET|POST /api/cron/<job>` (`app/api/cron/[job]/route.ts`,
`lib/services/sweep.ts` `CRON_ROUTES`, `CRON_SECRET`, fails closed) makes it happen with nobody opening a page (registry `scheduler`).

| 1.0 cron | Branch · schedule | What it does | 2.0 | Status |
|---|---|---|---|---|
| `poll-emails` | all · every minute | Poll Gmail for lead emails | Seam `lead-gmail` (`captureLead('gmail', …)`); Sync now plays one | Seam |
| `invoice-overdue` | all · daily | Mark invoices overdue | Overdue is worked out from the due day on read; the reminder rides job `messages` | Built (REG-1040) |
| `copilot-analytics` | all · weekly | Co-pilot analytics + coaching snapshots | Company › Reports › Meetings, computed on read | Built (S23) |
| `notification-scheduled` | all · every 5 min | Send due scheduled notifications | Job `messages` (held mail, retries, derived reminders, payments due today) | Built (S34) |
| `notification-digest` | all · hourly | Daily digests by each studio's timezone | Job `summaries` (`sendDueSummaries`, 8 AM server time — run with `TZ=Asia/Singapore`) | Built (S18 · S34) |
| `fx-rates` | all · daily | Refresh FX rates | — | Parked by her (countries beyond Singapore) |
| `price-drift` | all · monthly | Flag price-book items ±15 % off market rates | — | Decided — the platform's (price book Q-16) |
| `aggregate-rates` | all · monthly | Aggregate crowd rate signals into market rates | — | Decided — the platform's (Q-16) |
| `usage-rollup` | all · daily | Roll usage events up per studio | — (a studio's own view = card S39) | Excluded (fleet) · Card queued (S39) |
| `fork-analytics-pull` | all · daily | Pull every fork's rollup into prod | — | Excluded — Platform |
| `usage-retention` | all · weekly | Purge old usage events | — | Excluded — Platform |
| `brand-dossier-scan` | all · hourly | Enrich X-Ray's brand dossiers | Brand notes in code (`lib/xray/brands.ts`) | Decided — the platform's (X-Ray Q-23) |
| `accounting-sync` | all · every 5 min | Drain the Xero push queue | Job `accounting` — pushes only once a real Xero is plugged in | Seam `accounting` |
| `billing-lapse` | plg · hourly | Lapse unpaid subscriptions after grace | Job `credits` (trial ends, lapse after grace) | Built (S19) · Seam `payments` |
| `credit-refresh` | plg · daily | Monthly AI-credit refresh | Job `credits` (`ensurePeriod`, compare-and-set) | Built (REG-699…705) |
| `anon-sweep` | plg · daily | Delete expired anonymous workspaces | — | **MISSING** with M-01 |
| `anon-storage-gc` | plg · daily | Reclaim orphaned anonymous files | — | **MISSING** with M-01 |
| `growth-digest` | plg · daily | OpenMaison's growth digest to Slack | — | Excluded — OpenMaison's own operations |

2.0's own jobs with no 1.0 cron: `repeats` (repeating expenses, S06) and `feeds` (OpenMaison's and Qanvast's feeds, once a source is plugged in).

### 1.2 Routes on the working tree (628)

Grouped by the route's first segment; sibling routes with one 2.0 home share a row. Methods after each path. Routes under `/api/` unless said.

#### `accreditations` — accreditations (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `accreditations` GET | OpenMaison's catalogue of 8 Singapore accreditation badges (HDB LRP, bizSAFE Star / L4, CaseTrust, CaseTrust+RCMA, SDIDA, Qanvast Trusted / Supertrust) for quote covers and signing pages | Brand kit › badges = the studio's own uploads (`settings.brand.kit.badges`, `lib/templates/brand.ts`); registrations recorded once on Company › Profile (`compliance_studio`, `lib/compliance/studio-actions.ts`) | Decided — templates Q-15 (a studio's enabled badges' images copy into its kit at the port; the catalogue stays 1.0's). See §4 note 2 |
| `accreditations/studio-state` GET·PATCH | A studio switches catalogue badges on / off (`studios.settings.enabledAccreditationIds`) | Brand kit badges (upload · remove) on Company › Templates › Brand kit (`app/company/templates-actions.ts` `saveBrand`) | Decided — templates Q-15 |

#### `admin` — Platform admin (`admin/*`) (34)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `admin/accreditations` POST | Staff edit the badge catalogue | — | Excluded — Platform admin |
| `admin/analytics/feature-matrix` GET<br>`admin/analytics/funnels` GET<br>`admin/analytics/ingest` POST<br>`admin/analytics/leaderboard` GET<br>`admin/analytics/studios/[studioId]/health` GET<br>`admin/analytics/studios/[studioId]/trend` GET | Cross-studio usage analytics for OpenMaison staff (feature matrix, funnels, the forks' rollup ingest, leaderboard, a studio's health and trend) | — (a studio's own view of its usage is card `studio:studio-health`, step S39) | Excluded — Platform admin |
| `admin/audit-log` GET<br>`admin/counts` GET<br>`admin/me` GET<br>`admin/login` POST<br>`admin/logout` POST<br>`admin/users` GET·POST<br>`admin/users/[id]` DELETE·PATCH<br>`admin/page-visibility` GET·PATCH<br>`admin/platform-settings` GET·PATCH<br>`admin/platform-users` GET | The staff console's own sign-in, users, audit log, KPI counts, page visibility per studio and platform settings (banner, default prompts, sign-ups paused) | — (sign-ups paused = `OPENMAISON_SIGN_UPS_PAUSED`, S31; OpenMaison's per-studio switches = Qanvast Ops › Studios, `app/qanvast-ops/studios/actions.ts`) | Excluded — Platform admin |
| `admin/beta-signups` GET | Staff list of Book a demo sign-ups | — (the sign-ups are written by `app/site/actions.ts` `requestDemo`, S35) | Excluded — Platform admin |
| `admin/brand-dossiers` GET·PATCH | Staff review / prune the AI brand dossiers X-Ray cites | — | Excluded — Platform admin (X-Ray Q-23: the platform's) |
| `admin/complaints` GET<br>`admin/complaints/[id]` PATCH<br>`admin/complaints/[id]/messages` POST | Staff answer studios' complaint tickets | — | Excluded — Platform admin |
| `admin/hangouts/assign-meetings` POST<br>`admin/hangouts/otp` POST<br>`admin/hangouts/register-id` POST | Qanvast staff's Hangout desk: assign meetings, OTP at the desk, register a designer | The studio's side is built (S27): `assignHangoutMeeting` · `addWalkIn` · `setShiftDesigner` in `app/qanvast-ops/hangouts/actions.ts` | Excluded — Platform admin (S27 kept the staff console as Qanvast's) |
| `admin/market-insights` GET·POST | Staff write / publish Market Insights articles | — (reading = S25 `/market-insights`; the feed's one mapper `lib/market-insights/feed.ts`) | Excluded — Platform admin (S25) |
| `admin/notifications` GET<br>`admin/notifications/log-ingest` POST<br>`admin/whatsapp/register-wamid` POST | The fleet's central log of every email / WhatsApp sent, and the wamid registry for the shared WhatsApp number | — (a studio's own log = Settings › Notifications › Sent messages, `notification_outbox`) | Excluded — Platform admin (fleet plumbing; registry `whatsapp-webhook` note) |
| `admin/studios` GET·POST<br>`admin/studios/[id]` GET·PATCH<br>`admin/studios/[id]/members/[memberId]` PATCH<br>`admin/studios/[id]/page-visibility` GET·PATCH<br>`admin/studios/[id]/retag-leads` POST | Staff list / create / edit studios and their members, per-studio page visibility, re-tag leads to a country | Creating a studio = S31 `createStudio` (`lib/studios/create.ts`, seam `setStudioProvisioner`); countries on hold (S33) | Excluded — Platform admin |

#### `auth` — Signing in (6)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `auth/login` POST | Send a sign-in code to a studio member's phone (notes a pending invitation) | `/sign-in` — `app/sign-in/actions.ts` `requestSignInCode`; seam `sign-in` (`lib/auth/provider.ts` `setSignInProvider`) | Built (S30) · Seam |
| `auth/verify` POST | Check the code, open a session, accept an open invitation | `signInWithCode` (`studio_sessions` + httpOnly cookie; a first sign-in accepts the invitation) | Built (S30) |
| `auth/me` GET | Who is signed in (profile + member) | `lib/db/session.ts` `sessionMemberId` · `lib/leads/visibility.ts` `fetchViewer` | Built (S30) |
| `auth/logout` POST | End the session (and close its analytics row) | `signOut` (`app/sign-in/actions.ts`) — the You group's Sign out | Built (S30) |
| `auth/refresh` POST | Refresh the Qanvast line's session token | Seam `sign-in` (`provision?` for the Qanvast line) | Seam |
| `auth/signup-status` GET | Whether new sign-ups are paused | `OPENMAISON_SIGN_UPS_PAUSED` read by `/sign-up` (S31) | Built (S31) |

#### `beta-signup` — beta-signup (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `beta-signup` POST | Book a demo form → `beta_signups` + team email | `app/site/actions.ts` `requestDemo` (`beta_signups` + an outbox email) | Built (S35) |

#### `buddy` — buddy (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `buddy` POST<br>`buddy/chat` POST | mAIson Bot: a language model answers any question with 66 tools and can change records | Maison AI's Ask box — `lib/maison-ai/answer.ts` `readQuestion` (rule, ~45 questions; changes only proposed); history `maison_questions` | Rule (S10; registry `ai-ask`) |

#### `chat` — chat (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `chat/upload` POST | Upload a file into a conversation (10 MB) | `app/projects/messages-actions.ts` `uploadMessageFile` · `/chat/file/[fileId]` | Built (gaps H · S26) |

#### `chats` — chats (5)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `chats/records` GET·POST<br>`chats/records/[id]` PATCH<br>`chats/records/[id]/messages` PATCH·POST<br>`chats/records/[id]/participants` POST<br>`chats/records/[id]/participants/[participantId]` DELETE | The inbox: list / create conversations, rename / pin, send, mark read, add / remove people | Messages — `app/chat/actions.ts` (`startDirectChat` · `createGroupChat` · `renameGroupChat` · `addToGroupChat` · `removeFromGroupChat` · `leaveGroupChat`) + `app/projects/messages-actions.ts` (`sendInConversation` · `markConversationRead` · `setConversationPrefs`) | Built (S26) |

#### `competitors` — competitors (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `competitors/records` GET·POST<br>`competitors/records/[id]` DELETE·PATCH | The studio's competitor list (name, notes) | Settings › Meetings — `app/settings/meetings-actions.ts` `addCompetitor` · `updateCompetitor` · `removeCompetitor` (`studio_competitor_list`) | Built (S23) |

#### `complaints` — complaints (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `complaints/records` GET·POST<br>`complaints/records/[id]/messages` POST | A studio raises a complaint ticket to Qanvast and replies on it (Qanvast Ops › Raise Complaint — the page is gone from every 1.0 branch; the API still answers) | — (Qanvast Ops has Leads · Studios · Lead credits · Reviews · Hangouts; Raise Complaint is not drawn) | Decided — S16 (REG-1835: "Raise Complaint and Promote are not drawn") |

#### `config` — config (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `config/pages` GET | Which pages OpenMaison shows a studio (platform flags merged with the studio's overrides) | — (OpenMaison's switches for a studio = Qanvast Ops › Studios) | Excluded — Platform admin |

#### `contact` — contact (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `contact` POST | Website contact form → `contact_messages` + team email | `app/site/actions.ts` `sendContactMessage` | Built (S35) |

#### `contracts` — contracts (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `contracts/render-pdf` POST | Render a contract body to a PDF | `printPaper()` → seam `pdf` (`lib/services/pdf.ts` `setPdfRenderer`, `/papers/pdf`) | Seam |
| `contracts/send-to-client` POST | Render the contract to PDF, file it in the lead's files and send it to the client | `app/contracts/actions.ts` `sendContract` (signing link on WhatsApp / Copy link; the PDF kept by `keepContractPdf`); email through seam `delivery` | Built (contracts parity · S03) |

#### `copilot` — Meeting Co-Pilot (S23) (34)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `copilot/analytics` GET | Co-pilot analytics + coaching (Owner) | Company › Reports › Meetings (`lib/meetings/reports.ts`, read on demand) | Built (S23) |
| `copilot/analyze` POST<br>`copilot/card/interact` POST<br>`copilot/tag` POST | Model reads the live transcript into tips / cards; a member dismisses a card; style tags in Visual assist | `lib/meetings/engine.ts` `readMeeting` (tips by rule, nothing stored per card); style picks ride the meeting's mood board | Rule (S23; registry `meeting-reading`) |
| `copilot/audio` POST<br>`copilot/post-transcript` POST<br>`copilot/transcript` POST<br>`copilot/upload` POST<br>`copilot/stt-token` POST | Ingest audio / transcript segments; upload a whole recording to transcribe; mint a streaming speech-to-text token | `app/meetings/actions.ts` `saveMeetingNotes` · `writeUpMeeting` (recording kept in Files); seam `transcription` (`lib/meetings/transcribe.ts` `setTranscriber`) | Seam (S23) |
| `copilot/brief/[briefId]` GET·PATCH<br>`copilot/brief/generate` POST<br>`copilot/brief/[briefId]/save-to-lead` POST<br>`copilot/records/briefs` GET | Make / read / edit the meeting brief; save its facts to the lead with tasks | `meetings.brief_json`; `remakeBrief` · `editBrief` · `saveBriefToLead` · `undoSaveBrief`; `lib/meetings/brief.ts` `briefOf` | Built (S23) · Rule |
| `copilot/checklist-items` GET·POST<br>`copilot/checklist-items/[id]` DELETE·PATCH | The studio's meeting checklist | `addChecklistItem` · `updateChecklistItem` · `removeChecklistItem` · `restoreChecklistItem` · `moveChecklistItem` (`studio_checklist_items`) | Built (S23) |
| `copilot/competitor-quote` POST | Parse a competitor's quote during a meeting | *Their quote* opens Quote X-Ray on the lead (`app/quote-x-ray/actions.ts` `runComparison`) | Built (S21 · S23) |
| `copilot/debug-engine` POST | Paste a transcript, see the engine's output (no auth, no DB) | — | Excluded — dev / test |
| `copilot/end` POST<br>`copilot/outcome` POST<br>`copilot/session` POST | Start / end a co-pilot session; record its outcome | `startMeeting` · `endMeeting` · `stopEarly` · `takeMeetingBlock` (`meetings`; a meeting held IS the Met log) | Built (S23) |
| `copilot/export/estimate` POST<br>`copilot/records/create-quote` POST | Turn the meeting's shadow estimate into a real draft quote | `lib/meetings/engine.ts` `estimateOf` + `draftQuoteFromMeeting` | Built (S23) |
| `copilot/moodboard` POST<br>`copilot/moodboard/gallery` GET<br>`copilot/render` POST | AI mood board / room render during a meeting; the gallery of them | Mood board = the Visualizer's style boards kept with the meeting; Render a room = the lead's design in the AI Visualizer; gallery = the brief's *From this meeting* + Tools › AI Visualizer | Built (S23) |
| `copilot/poll` GET | The live session's state for the room | `GET /meetings/[id]/state` (`app/meetings/[id]/state/route.ts`) | Built (S23) |
| `copilot/portfolio` GET | The studio's published portfolio projects for the meeting | *Past projects* — the team's work (`member_portfolio_*`) beside the studio's projects | Built (S23 · S27) |
| `copilot/records/history` GET<br>`copilot/records/sessions` GET<br>`copilot/records/sessions/[id]` GET<br>`copilot/records/sessions/[id]/detail` GET | Meeting history and one meeting's replay bundle | Tools › Meeting Copilot `/meetings` + the meeting page (`lib/meetings/queries.ts` `fetchMeetingRoom`) | Built (S23) |
| `copilot/records/objections` GET | The objection log report | Company › Reports › Meetings › Objections (`copilot_objection_log`) | Built (S23) |
| `copilot/share` POST<br>`copilot/share/[shareId]` GET | Share a brief by a 24-hour public link | `meetingLink` · `shareMeeting` · `stopSharingMeeting`; the client's `/meeting/[token]`; 1.0's `/copilot/share/<id>` redirects | Built (S23) |

#### `cron` — Timed jobs (also §1.1) (13)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `cron/accounting-sync` GET | Drain the Xero push queue (every 5 min) | Job `accounting` (`/api/cron/accounting-sync`, `lib/services/sweep.ts`) — pushes only once a real Xero is plugged in | Built · Seam |
| `cron/notification-scheduled` GET | Send scheduled notifications (every 5 min) | Job `messages` (`/api/cron/notification-scheduled`) | Built (S34) |
| `cron/notification-digest` GET | Daily digests (hourly) | Job `summaries` (`/api/cron/notification-digest`; `sendDueSummaries`) | Built (S18 · S34) |
| `cron/invoice-overdue` GET | Mark invoices overdue (daily) | Derived from the due day on read; the reminder goes with job `messages` | Built (REG-1040) |
| `cron/poll-emails` GET | Poll Gmail for lead emails (every minute) | Seam `lead-gmail` (`captureLead('gmail', …)`) | Seam |
| `cron/copilot-analytics` GET | Weekly co-pilot analytics + coaching snapshots | Company › Reports › Meetings, read on demand | Built (S23) |
| `cron/fx-rates` GET | Refresh FX rates (daily) | — | Parked — countries beyond Singapore |
| `cron/price-drift` GET<br>`cron/aggregate-rates` GET | Price-book drift vs market rates; crowd rate aggregation | — | Decided — the platform's (price book Q-16) |
| `cron/brand-dossier-scan` GET | Enrich brand dossiers for X-Ray (hourly) | Brand notes in code (`lib/xray/brands.ts`) | Decided — the platform's (X-Ray Q-23) |
| `cron/usage-rollup` GET<br>`cron/usage-retention` GET<br>`cron/fork-analytics-pull` GET | Usage rollups, retention purge, the forks' analytics pull | — (a studio's own view = S39) | Excluded — OpenMaison's platform jobs (registry `scheduler` note) · S39 pending |

#### `demo` — The website's Visualizer trial (S36) (7)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `demo/restyle` POST<br>`demo/visualizer/declutter` POST<br>`demo/visualizer/detect` POST<br>`demo/visualizer/photorealistic` POST<br>`demo/visualizer/quota` GET<br>`demo/visualizer/render` POST<br>`demo/visualizer/segment` POST | The anonymous AI Visualizer trial: detect, segment, render, photoreal, declutter, restyle, the per-browser quota | `/site/try` — `app/site/try/actions.ts` `askTrialRender` · `keepTrialRender` (engine in the browser; 3 renders a browser, 10 a minute); seams `trial-bot-check` · `trial-limit-store` | Built (S36) · Rule (registry `image-model`) |

#### `dev` — dev (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `dev/email-gallery` GET<br>`dev/email-preview` GET | Dev-only previews of the notification email templates | 2.0's own `/api/dev/email-preview?id=<outbox id>` (off in production unless `OPENMAISON_DEV_PREVIEWS=1`) | Excluded — dev / test |

#### `document-templates` — document-templates (5)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `document-templates/default` GET<br>`document-templates/records` GET·POST<br>`document-templates/records/[id]` DELETE·PATCH<br>`document-templates/set-default` POST | The studio's document templates (quote PDF · invoice · PO · VO · T&Cs · contract): list, edit, soft-delete, the default per type / entity | Quote templates (`app/company/templates-actions.ts`), contract templates (`app/company/contract-templates-actions.ts`), T&Cs (`app/quotes/text-actions.ts`), invoice paper (`invoice_paper`, `app/projects/paper-actions.ts`) and PO paper (Settings › Finance, `po-paper-settings.tsx`); a VO prints as a quote | Built (templates map 04; parity map FB-101 · FB-102) |
| `document-templates/timeline` GET | Timeline (milestone) templates per project type | Company › Templates › Schedules (`app/company/schedule-templates-actions.ts`) + Settings › Projects › Schedule defaults per type (`project_schedule_type_defaults`) | Built (map 24 §2) |

#### `email` — email (6)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `email/callback` GET<br>`email/connect` POST<br>`email/disconnect` POST<br>`email/status` GET·PATCH<br>`email/sync` POST | Gmail OAuth connect / callback / disconnect, sync log, Sync now | Company › Integrations › Email lead sources — `app/leads/capture-actions.ts` `connectGmail` · `disconnectGmail` · `setEmailPlatforms` · `syncGmail` (`settings.lead_capture.email`); seam `lead-gmail` | Seam (Leads I-10 · Q-36) |
| `email/parse` POST | AI reads an enquiry email into lead fields | `lib/leads/capture.ts` `captureLead('gmail', …)` — the read is the seam's | Seam (`lead-gmail`) |

#### `escalations` — escalations (5)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `escalations` POST<br>`escalations/[id]/comments` GET·POST<br>`escalations/[id]/status` POST<br>`escalations/records` GET<br>`escalations/records/by-ticket/[ticketId]` GET | The studio's side of tickets: create, comment, status, list, open by ticket number | Projects › Tickets + each project's Client › Tickets — `app/projects/tickets-actions.ts` (`createTicket` · `replyTicket` · `resolveTicket` · `reopenTicket` · `assignTicket` · `escalateTicket` · `readTicket`), `project_tickets` · `ticket_replies` | Built (gaps H) |

#### `files` — files (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `files` GET | Serve a lead file's bytes by its row id | `/files/raw/[fileId]` · `/files/thumb/[fileId]` · `/files/img/[fileId]`; a share link `/f/[token]` | Built (gaps E) |

#### `finance` — Finance (55)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `finance/accounting/[provider]/callback` GET<br>`finance/accounting/[provider]/connect` POST<br>`finance/accounting/connections` GET<br>`finance/accounting/connections/[id]` PATCH<br>`finance/accounting/connections/[id]/activity` GET<br>`finance/accounting/connections/[id]/backfill` POST<br>`finance/accounting/connections/[id]/disconnect` POST<br>`finance/accounting/connections/[id]/mappings` GET·PUT<br>`finance/accounting/connections/[id]/select-tenant` GET·POST<br>`finance/accounting/connections/[id]/sync` POST<br>`finance/accounting/queue/[id]/retry` POST | Xero: OAuth, organisation per entity, account / tax mappings, backfill, sync now, activity log, retry | Company › Finance › Xero + Integrations — `app/finance/xero-actions.ts` (`connectXero` · `disconnectXero` · `setXeroOrganisation` · `setXeroMapping` · `autoMapXero` · `setXeroAuto` · `syncXero` · `retryXero`), `xero_links` · `xero_sync_log`; seam `accounting` | Seam (parity map FB-080…090) |
| `finance/bills` POST | Record a reviewed supplier bill (file + read fields) | `app/finance/cost-actions.ts` `recordBill` (`supplier_bills`, file in `cost_documents`); the read = rule `bill-reader` | Built (gaps F1) · Rule |
| `finance/bills/[id]/document` GET | Stream a bill's uploaded file | `/finance/doc/[id]` (`app/finance/doc/[id]/route.ts`) | Built (gaps F1) |
| `finance/commissions/payout` POST | Record a commission payout | `payCommission` · `payMemberCommission` (+ Undo, reverse) | Built (gaps F2 · K) |
| `finance/expenses` POST<br>`finance/expenses/upload-receipt` POST | Create an expense (approval task when it needs one); upload its receipt | `app/finance/cost-actions.ts` `saveExpense` (waits by `expenseWaits`), receipt in `cost_documents` | Built (gaps F1) |
| `finance/export` POST | CSV export: invoices, statement of account, GST report, P&L | Company › Reports › Finance — each report's Export (`lib/finance/reports.ts`: P&L · AR · AP · GST · Client statement …) | Built (REG-1361 · parity map P-C) |
| `finance/generate-invoices` POST | Generate the milestone invoices from the contract (and write double-entry journal lines) | Drafts per payment stage with the project (`lib/projects/invoices*.ts`; `app/projects/money-actions.ts`); no journal is written (see table `journal_entries`) | Built (PR-055) |
| `finance/invoices/[id]/approve` POST<br>`finance/invoices/[id]/reject-approval` POST<br>`finance/invoices/[id]/remind-approver` POST<br>`finance/invoices/[id]/send` POST | Approve / send back / nudge the approver / send an invoice | `submitInvoice` · `sendInvoice` · `sendBackInvoice` · `remindApprovers` · `withdrawInvoiceSubmission` (`app/projects/money-actions.ts`) | Built |
| `finance/invoices/[id]/payment` POST | Record a payment against an invoice (commission accrues) | `app/projects/payment-actions.ts` `recordPayment` (+ Undo, confirm, reverse) | Built |
| `finance/invoices/[id]/pdf` GET<br>`finance/purchase-orders/[id]/pdf` GET | A generated PDF of an invoice / PO | The paper pages' Download PDF → `printPaper()` → seam `pdf` | Seam |
| `finance/invoices/parse` POST<br>`finance/invoices/upload-pdf` POST | Read an uploaded invoice (PDF / image / sheet) into fields; keep the source PDF | Fill from a PDF by rule + `recordExternalInvoice` keeping the file (parity map P-A) | Rule · Built |
| `finance/margin-analysis` POST | Model writes margin insights per project sub-tab | The Money tab's Profit tile and Reports › Profitability (`lib/finance/profit.ts`) | Decided — F2-Q3 · Q-30 (parity map FB-033 · MI-010) |
| `finance/payment-records/[id]/receipt-link` POST | Mint the public receipt link | `/receipt/[token]` (`project_payments.share_token`) | Built (gaps B) |
| `finance/payment-records/[id]/reject` POST<br>`finance/payment-records/[id]/verify` POST<br>`finance/records/payments/[id]/id-verify` POST | Verify / reject a client's payment (three-tier verification) | `confirmPayment` · `markNotReceived` (one confirmation) | Built / Decided — F-11 (MI-076) |
| `finance/payments` GET | Studio-wide list of payments received | Company › Finance › Money in › Payments (`components/finance/money-in/**`, `lib/finance/money-in.ts`) | Built (parity map P-A) |
| `finance/purchase-orders/[id]/send` POST<br>`finance/records/purchase-orders` GET<br>`finance/records/purchase-orders/[id]` GET<br>`finance/records/purchase-orders/[id]/action` POST | POs: list, open, send to the vendor, state moves with activity log, payments and receipts | `app/finance/po-actions.ts` (`savePo` · `submitPo` · `sendPo` · `markPoAccepted` · `cancelPo` · `closePo` · `markPoDelivered` · `poHistory`), `purchase_orders` · `purchase_order_lines` · `payments_out` | Built (gaps F1 · P-B) |
| `finance/records/commission-change-requests` GET·PATCH·POST<br>`finance/records/commission-entries` GET·PATCH<br>`finance/records/commission-rules` DELETE·GET·POST | Commission rules, the ledger of entries, change requests | `setCommissionRule` · `setCommissionShares` · `askCommissionRate` · `answerCommissionAsk` · `payCommission` (`commission_rules` · `commission_shares` · `commission_requests` · `commission_payouts`); `app/finance/commission-actions.ts` | Built (gaps F2 · P-C) |
| `finance/records/expense-categories` GET·POST | The studio's expense categories | Settings › Finance › Money out — `setExpenseCategories` · `renameExpenseCategory` (`expense_categories` key) | Built (S06) |
| `finance/records/expenses` GET<br>`finance/records/expenses/[id]` DELETE·PATCH<br>`finance/records/expenses/[id]/decision` PATCH | List / edit / delete expenses; approve and verify them | `saveExpense` · `removeExpense` · `answerExpense` (+ Undo) | Built (gaps F1) |
| `finance/records/invoices` GET·POST<br>`finance/records/invoices/[id]` GET·PATCH<br>`finance/records/invoices/[id]/payments` GET<br>`finance/records/invoices/auto-milestone` POST | Invoices: list, one invoice, edit, its payments, auto-generate a milestone slice | Project › Money (`fetchMoneyNeeds`, `lib/projects/money-queries.ts`), `setInvoiceAmount` · `setInvoiceDetails` · `createOneOffInvoice`; drafts per stage | Built |
| `finance/records/invoices/[id]/overdue-reminder` POST | Count a reminder; escalate after three | `remindInvoice` (`invoice_reminded`, Call after three reminders) | Built (MI-068 · P-A) |
| `finance/records/payment-schedule-templates` DELETE·GET·POST | Payment schedule templates | Company › Templates › Payments (`app/company/payment-templates-actions.ts`, `payment_templates`) | Built |
| `finance/records/pipeline-financials` GET | Per-project invoice + PO totals for the Pipeline board | Company › Reports › Finance › Profitability (`lib/finance/reports.ts`) | Built (REG-1362) |
| `finance/records/portal-tokens` GET·PATCH·POST | The legacy one-link client portal tokens (`/pay/{token}`) | — (the client portal `/my/[slug]`; `/pay/*` redirects, `lib/links/old-links.ts`) | Decided — Q-14 · Q-37 |
| `finance/records/rebalance` POST | Re-sync a project's milestone invoices to its contract | `rebalanceProject` · `undoRebalance` | Built (MI-024…027) |
| `finance/records/variation-orders` GET·PATCH·POST | Variation orders on a project | `quotes.kind = 'variation'` — `createVariationOrder` · `markVariationApproved` · `billVariation` | Built |
| `finance/reports/[report]` POST | Every finance report | Company › Reports › Finance (`fetchBooks`, `lib/finance/reports.ts`) | Built |

#### `finance-documents` — finance-documents (3)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `finance-documents/credit-notes` GET·POST | List / issue credit notes | `app/finance/books-actions.ts` `issueCreditNote` · `voidCreditNote` · `recordCreditRefund` (`credit_notes`) | Built (gaps F2) |
| `finance-documents/documents` GET·POST<br>`finance-documents/documents/[id]` DELETE | Upload / delete an external finance document on a project (invoice · PO · quote · receipt · other, with ref, amount, date, counterparty) | Recorded invoices (`app/projects/money-actions.ts` `recordExternalInvoice`) and POs made elsewhere (`app/finance/po-actions.ts` `recordExternalPo`), each keeping its file; anything else in the project's Files | Built (parity map P-B · B) |

#### `floor-plans` — 3D Space Planner (26)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `floor-plans/records` GET·POST<br>`floor-plans/records/[id]` DELETE·GET·PATCH<br>`floor-plans/records/[id]/versions` GET·POST | Space-planner layouts and their versions | `app/planner/actions.ts` (`createLayout` · `saveLayout` · `saveLayoutVersion` · `readLayoutVersions` …), `space_layouts` · `space_layout_versions` | Built (gaps J · P-J) |
| `floor-plans/share/[token]` GET | Public read of a shared layout | `/space/[token]` (`readLayoutShare`, `space_layout_shares`) | Built (gaps J) |
| `floor-plans/auto-arrange` POST<br>`floor-plans/auto-arrange-v2` POST<br>`floor-plans/scene-graph` POST | AI auto-arrange (scene graph) | Arrange by rule (P-J) | Decided — J-Q20 (AI inside not built; rule stand-ins kept, S15) |
| `floor-plans/catalogue-to-model` POST<br>`floor-plans/photo-to-model` POST<br>`floor-plans/text-to-model` POST<br>`floor-plans/meshy/available` GET<br>`floor-plans/meshy/create` POST<br>`floor-plans/meshy/status` GET<br>`floor-plans/export-glb` POST | 3D furniture from catalogue photos / a photo / words (Meshy), export a custom piece as GLB | Describe a piece → closest catalogue piece (`lib/planner/describe.ts` `describePiece`) | Rule (registry `describe-piece`) · Decided — J-Q20, S15 (GLB models not ported) |
| `floor-plans/detect-furniture-comparison` POST<br>`floor-plans/detect-issues` POST<br>`floor-plans/extract-boxes` POST<br>`floor-plans/from-room` POST<br>`floor-plans/generate` POST<br>`floor-plans/generate-v2` POST<br>`floor-plans/generate-v3` POST<br>`floor-plans/realign` POST<br>`floor-plans/refine` POST<br>`floor-plans/refine-v2` POST<br>`floor-plans/reposition` POST<br>`floor-plans/reshape` POST | AI from a plan image: extract rooms, generate / refine / realign / reshape a layout, detect issues (the fix wizard), a room photo to a layout | Make a 3D picture from a floor-plan photo by rule (S28: `lib/planner/photo.ts` `roomsForType` · `findPaper`) | Rule (registry `floor-plan-rooms`) · Decided — J-Q20 |

#### `hangouts` — Hangouts (S27) (23)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `hangouts/admin/events` GET·POST<br>`hangouts/admin/events/[eventId]` DELETE·GET·PATCH<br>`hangouts/admin/homeowners` GET·PATCH·POST<br>`hangouts/admin/id-participations` GET·PATCH·POST<br>`hangouts/admin/lead` GET·POST<br>`hangouts/admin/meetings` DELETE·GET·PATCH·POST<br>`hangouts/admin/portfolios` GET·POST<br>`hangouts/admin/preferences` GET·PUT<br>`hangouts/admin/studio-participations` GET·PATCH·POST<br>`hangouts/admin/studio-view` GET<br>`hangouts/admin/vouchers` PATCH | Qanvast staff's Hangout console: events + shifts, homeowners, designers, meetings, portfolios, preferences, vouchers | The studio's side built in Qanvast Ops › Hangouts (`app/qanvast-ops/hangouts/actions.ts`: `applyToHangout` · `setShiftDesigner` · `setDesignerShares` · `setHangoutPreferences` · `assignHangoutMeeting` · `startHangoutMeeting` · `endHangoutMeeting` · `addWalkIn`); events via the feed (`lib/hangouts/feed.ts`); vouchers = Qanvast's rewards | Excluded — Platform admin (S27 kept the console as Qanvast's) |
| `hangouts/event` GET<br>`hangouts/login` POST<br>`hangouts/verify` POST<br>`hangouts/session` DELETE·GET<br>`hangouts/preferences` POST<br>`hangouts/meetings` GET | The homeowner's event page: SMS sign-in, preferences, their meetings | The public booking page `/hangout/[token]` (`app/hangout/actions.ts` `bookHangoutChat`) and their own page (`readyAtTable`) — no SMS sign-in | Built (S27) · Decided (S27 flag: no SMS sign-in) |
| `hangouts/meetings/[meetingId]/start` POST<br>`hangouts/meetings/[meetingId]/end` POST<br>`hangouts/studio/pre-register` POST<br>`hangouts/score` POST | Start / end a Hangout chat; pre-register an invited designer; the 0–100 match score | `startHangoutMeeting` · `endHangoutMeeting` (writes the lead's meeting + a follow-up); `inviteForHangout`; 1.0's six weights (`lib/hangouts/model.ts` `DEFAULT_WEIGHTS`) | Built (S27) |
| `hangouts/transcribe` POST | Model turns a Hangout recording into insights | Typed / pasted notes → `writeUpMeeting`; seam `transcription` | Seam (S27 flag: no AI from audio) |
| `hangouts/version` GET | Deploy-version poll so open pages reload | The Hangout page's 15-second pulse (`hangoutPulse`) | Built (S27) |

#### `homeowner` — The client portal (homeowner side) (49)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `homeowner/auth/login` POST<br>`homeowner/auth/verify` POST<br>`homeowner/auth/me` GET<br>`homeowner/auth/logout` POST | The client's sign-in by phone + OTP | `/my/[slug]/login` — `app/portal/actions.ts` `requestCode` · `verifyCode` · `signOut` (`portal_sessions`); the code = seam `sign-in` | Built · Seam (CP-040) |
| `homeowner/dashboard` GET<br>`homeowner/projects/[id]` GET | The portal home and a project's page | `/my/[slug]` home and project pages (`lib/portal/*`, `portalGate`) | Built (map 24) |
| `homeowner/engagement/[linkId]` GET<br>`homeowner/engagement/[linkId]/document` GET | The lead-stage portal (before a project) and its masked quote PDF | *Before work starts* on the portal home, opening the `/confirm` · `/sign` · `/quote` links (`clientQuoteOf`) | Built (CP-104…108 · S04) |
| `homeowner/invite` POST | Invite a homeowner to the portal (WhatsApp) | Client access panel — `app/portal/studio-actions.ts` `inviteClient` | Built |
| `homeowner/notifications` GET·POST<br>`homeowner/notifications/[notifId]` PATCH<br>`homeowner/projects/[id]/notifications` GET·POST<br>`homeowner/projects/[id]/notifications/[notifId]` PATCH | The client's bell, read / unread | Derived rows + `portal_bell_reads` — `app/portal/bell-actions.ts` `readPortalBell` · `markBellRead` · `markAllBellRead` | Built (map 24 D-12) |
| `homeowner/projects/[id]/chat` GET·POST | The client's chat with the studio | Portal Messages — `app/portal/messages-actions.ts` `sendClientMessage` · `uploadClientMessageFile` · `readClientChats` | Built (gaps H) |
| `homeowner/projects/[id]/design` GET<br>`homeowner/projects/[id]/renders/[assetId]/annotations` POST<br>`homeowner/projects/[id]/renders/[assetId]/annotations/[annotationId]` DELETE·PATCH<br>`homeowner/projects/[id]/renders/[assetId]/annotations/[annotationId]/comments` POST<br>`homeowner/projects/[id]/renders/[assetId]/comment` POST<br>`homeowner/projects/[id]/renders/[assetId]/like` POST | The client's Designs: pins, replies, comments, likes on shared renders | Portal Designs + `/renders/[token]` — `app/renders/actions.ts` (`clientPin` · `clientReply` · `clientPinStatus` · `clientRemovePin` · `leaveNote` · `pickFavourite`) | Built (AI Visualizer D1 · D2) |
| `homeowner/projects/[id]/documents` GET | Documents the client may download | Portal Files (`/my/[slug]/files`, `/my/[slug]/file/[fileId]`, `shown_to_client_at`) | Built |
| `homeowner/projects/[id]/finance` GET<br>`homeowner/projects/[id]/invoices/[invoiceId]` GET<br>`homeowner/projects/[id]/invoices/[invoiceId]/pdf` GET<br>`homeowner/projects/[id]/payment-info` GET | The client's money: invoices, an invoice's page / PDF, how to pay | `/my/[slug]/money` (+ `/money/invoice/[invoiceId]` · `/money/receipt/[paymentId]` · `/money/credit/[creditId]`), PayNow / bank from the issuing entity | Built (CP-142 · Q-44) |
| `homeowner/projects/[id]/floor-plan` GET·POST<br>`homeowner/projects/[id]/floor-plan/annotations` POST<br>`homeowner/projects/[id]/floor-plan/annotations/[annotationId]` DELETE·PATCH<br>`homeowner/projects/[id]/floor-plan/annotations/[annotationId]/comments` POST<br>`homeowner/projects/[id]/floor-plan/plans/[planId]/approve` POST<br>`homeowner/projects/[id]/floor-plan/upload-image` POST | The client's floor plan: upload, marks, comments, approve a layout, comment photos | `app/portal/floor-plan-actions.ts` (`clientAddFloorPlan` · `clientAddFloorPlanMark` · `clientCommentOnFloorPlanMark` · `confirmFloorPlanLayout` …) | Built (gaps G) |
| `homeowner/projects/[id]/issues` GET·POST<br>`homeowner/projects/[id]/issues/[escalationId]` GET<br>`homeowner/projects/[id]/issues/[escalationId]/close` POST<br>`homeowner/projects/[id]/issues/[escalationId]/reply` POST<br>`homeowner/projects/[id]/issues/upload-image` POST | The client's issues: raise, read, reply, close, attach photos | `app/portal/tickets-actions.ts` (`reportIssue` · `replyIssue` · `closeIssue` · `reopenIssue` · `openIssue`) | Built (gaps H) |
| `homeowner/projects/[id]/milestones/[milestoneId]/approve` POST | The client confirms a milestone | `app/portal/project-actions.ts` `answerStage` | Built |
| `homeowner/projects/[id]/payment-notify` POST<br>`homeowner/projects/[id]/payment-submit` POST | The client says they paid (with a screenshot) | `app/portal/payment-actions.ts` `sayPaid` → *payment to confirm* | Built (CP-092…096) |
| `homeowner/projects/[id]/quotes` GET | The client's quotes on the project | Each quote through its own token page (`/quote/[token]` · `/confirm/[token]`, `lib/quotes/client-quote.ts`) | Built (S04) |
| `homeowner/projects/[id]/quotes/comment` POST | The client comments on a quote line (nothing calls it in 1.0) | The confirmation page's *ask for a change* (`askQuoteChange`) | Dead in 1.0 (projects I-412) |
| `homeowner/projects/[id]/satisfaction` POST | The client rates the project 1–5 (nothing calls it in 1.0) | — (Company › Profile › Reviews' review link, S14) | Dead in 1.0 (I-412); the columns → map 24 D-13 |
| `homeowner/projects/[id]/selections` GET<br>`homeowner/projects/[id]/selections/[selectionId]/respond` POST | The client's choices; pick or say no | Portal Choices — `app/portal/choices-actions.ts` `chooseOption` · `answerChoice` | Built |
| `homeowner/projects/[id]/tasks` GET | Tasks the studio assigned to the homeowner | — | Decided — the gaps build's call M-03 (no client to-dos; S13 kept it dropped) |
| `homeowner/projects/[id]/updates` GET | The client's progress updates | Portal Updates (`markUpdatesSeen`) | Built |
| `homeowner/projects/[id]/variation-orders` GET<br>`homeowner/projects/[id]/variation-orders/[voId]/respond` POST | The client reads and approves / declines a VO | `/confirm/[token]` (`confirmQuoteOnline`) · `app/quotes/decline-actions.ts` `declineVariationOnline`; portal Money | Built (gaps D) |
| `homeowner/scope-answers` GET·POST | The client answers the questionnaire | `app/portal/actions.ts` `answerQuestions` (+ `question_answer_history`) | Built |

#### `homeowner-bind` — homeowner-bind (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `homeowner-bind` POST | Server runner that binds a homeowner to a lead / project | One record: `homeowner_lead_links` made by `inviteClient` (`app/portal/studio-actions.ts`) | Built (map 24 §3.8) |

#### `homeowner-links` — homeowner-links (6)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `homeowner-links/active-link` GET<br>`homeowner-links/project-homeowner` GET<br>`homeowner-links/promote-lead-link` PATCH | Resolve a project's homeowner link; promote a lead-only link to a project link | Every project has a lead — the lead's link serves both (`homeowner_lead_links`) | Built / Decided — CP-010 |
| `homeowner-links/render-annotations` DELETE·PATCH·POST<br>`homeowner-links/share-render` DELETE·POST<br>`homeowner-links/shared-renders` GET | Share a Visualizer render to the portal; studio-side pins on it | `render_share_links` (portal Designs) + `app/visualizer/actions.ts` `addPin` · `replyPin` · `setPinStatus` | Built (CP-021 · TD-121 · TD-123) |

#### `id-profile` — id-profile (6)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `id-profile/[memberId]` GET<br>`id-profiles/records` GET·POST<br>`id-profiles/records/images` POST<br>`id-profiles/records/images/[imageId]` DELETE<br>`id-profiles/records/projects` POST<br>`id-profiles/records/projects/[projectId]` DELETE·PATCH | Designer portfolio profiles: years, specialties, portfolio projects + images | Members › Public profile — `app/company/portfolio-actions.ts` (`savePublicCard` · `addWork` · `updateWork` · `removeWork` · `moveWork` · `makeWorkCover` …), `member_portfolio_projects` · `member_portfolio_pictures` · `members.portal_*` | Built (S27) |

#### `identity` — identity (6)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `identity/members` DELETE·GET·PATCH<br>`identity/members/me` GET<br>`identity/members/owner` GET | Studio members: list, update, remove; who am I; who is the Owner | Company › Members (`app/company/members-actions.ts`), `lib/company/members.ts` `fetchMembersData`, `lib/db/session.ts` | Built (REG-646 · S01) |
| `identity/profile` PATCH | A member edits their own name / email / phone / photo | Your profile — `saveMyDetails` · `sendMyContactCode` | Built (S01) |
| `identity/studio-settings` GET·PATCH<br>`identity/studio-settings/payment-schedule` GET | Studio settings (chat identity, region, portal address) and the default payment schedule | Settings › Studio · Company › Client portal (`setPortalAddress`) · Templates › Payments default | Built (Accounts Setup audit) |

#### `invitations` — invitations (5)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `invitations/[token]` DELETE·GET·PATCH<br>`invitations/accept` POST<br>`invitations/records` GET<br>`invitations/send` POST | Invite a member, resend, cancel, accept | `sendMemberInvitation` · `inviteMemberAgain` · `cancelMemberInvitation` (`studio_invitations`); `/join/[token]` (`app/join/actions.ts` `joinStudio`) | Built (S09 · S30) |
| `invitations/hangout` GET | A phone's pending Hangout invitations across studios | `studio_invitations.hangout_event_id` · `inviteForHangout` | Built (S27) |

#### `lead-artifacts` — lead-artifacts (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `lead-artifacts/records` GET·POST<br>`lead-artifacts/records/[id]` DELETE | Evidence artifacts for Journey-mode outreach | — | Decided — Journey mode out (Leads DEF-04) |

#### `lead-config` — lead-config (3)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `lead-config/categories` GET·PUT<br>`lead-config/pipeline-stages` GET·PUT | Lead categories; editable pipeline stages | — (fixed five stages + Settings › Lead management › Lead stages, `lead_stage_rules`) | Dead in 1.0 (leads map: saved, read nowhere) |
| `lead-config/custom-fields` GET·PUT | Lead custom fields | `app/settings/actions.ts` `saveCustomFields` (`lead_custom_fields`) | Built (REG-612) |

#### `lead-files` — lead-files (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `lead-files/records` GET·POST<br>`lead-files/records/[id]` DELETE | A lead's files: list, upload, delete | `app/leads/files-actions.ts` (`uploadFile` · `trashFiles` · `deleteFilesForever` …) | Built |

#### `lead-outreach-attempts` — lead-outreach-attempts (5)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `lead-outreach-attempts/parse-preview` POST<br>`lead-outreach-attempts/records` GET·POST<br>`lead-outreach-attempts/records/[id]` DELETE·PATCH<br>`lead-outreach-attempts/records/[id]/apply-parse-result` POST<br>`lead-outreach-attempts/records/[id]/parse-evidence` POST | Outreach attempts (contact logs) and the AI read of a chat screenshot | Contact logs in Notes & Logs and the Move stage window (`lead_notes` kind contact, `stage_logs`); Auto Fill = the stand-in | Built · Rule (Leads DEF-16 · S-10) |

#### `leads` — Leads (36)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `leads/[id]/assign` POST | Legacy notify-only shim (no first-party caller) | `assignMembers` (notifies) | Dead in 1.0 |
| `leads/[id]/quote-line-items/[itemId]/comments` POST | Comment on a quote line | `app/quotes/comment-actions.ts` `addLineComment` · `editLineComment` · `deleteLineComment` | Built (REG-627) |
| `leads/[id]/quote/download` GET<br>`leads/[id]/quote/list` GET<br>`projects/[id]/quote/download` GET<br>`projects/[id]/quote/list` GET | List / download a lead's quote PDFs (signed, shared, uploaded) | `fetchStageDocuments` + the quote's Preview / Download PDF (seam `pdf`); Files › Contract & VOs | Built · Seam |
| `leads/[id]/scope-answers` GET·POST<br>`leads/[id]/scope-answers/history` GET<br>`projects/[id]/scope-answers` GET·POST<br>`projects/[id]/scope-answers/history` GET | Questionnaire answers on a lead / project and their history | Questionnaire tab — `app/leads/questions-actions.ts` `answerQuestion` (+ `question_answer_history`) | Built (gaps D) |
| `leads/[id]/send-questionnaire` POST<br>`projects/[id]/send-questionnaire` POST | Ask the homeowner to fill the questionnaire | `askClientQuestions` (`app/leads/questions-actions.ts`) | Built |
| `leads/mutations/[id]` PATCH | Whitelisted field update on a lead | `updateLead` (+ `lead_events` field_edited) | Built |
| `leads/mutations/[id]/activity-log` POST | Append activity-log rows | Derived feed `lib/leads/activity.ts` + `lead_events` | Built (leads map R7) |
| `leads/mutations/[id]/archive` POST<br>`leads/mutations/[id]/unarchive` POST<br>`leads/mutations/archived` GET | Archive / revive a lead; the archived list | Soft delete with Deleted Leads (`deleteLead` · `restoreLeads` · `deleteForever`) | Decided — Leads DEF-03 (no Archive) |
| `leads/mutations/[id]/assignee` POST<br>`leads/mutations/bulk-assign` POST | Assign / remove members on one or many leads | `assignMembers` · `addLeadMembers` | Built |
| `leads/mutations/[id]/close` POST<br>`leads/mutations/[id]/engagement` POST<br>`leads/mutations/[id]/status` POST | Close (Lost), hold / engagement state, pipeline status | `moveStage` (On Hold · Lost dialogs, `lead_reasons`) · `quickMoveStage` · `undoStageMove` | Built |
| `leads/mutations/[id]/follow-up` POST | Record an AI follow-up send | Maison AI's stage drafts (`lib/maison-ai/drafts.ts` `stageDraft`) + Follow-up tasks | Rule (registry `ai-drafts`) |
| `leads/mutations/[id]/journey-step` POST | Mark a Journey step | — | Decided — Journey mode out (DEF-04) |
| `leads/mutations/[id]/migrate-entity` POST<br>`leads/mutations/[id]/validate-entity` GET | Switch / read the lead's issuing entity (audited) | The issuing entity is each quote's (*Issued by*); a lead's copied onto its quotes at the port | Decided — quote editor D-101 |
| `leads/mutations/[id]/refund-request` POST | File a return / refund request | `app/leads/return-actions.ts` `returnLead` (`lead_returns`) | Built |
| `leads/mutations/bulk-status` POST | Approve / reject email leads in the review queue (`email_lead_status`) | Review imported leads — `approveImportRows` · `rejectImportRows` (captured leads land there) | Built (Leads R3 · R6) |
| `leads/mutations/create` POST | Create a lead | `createLead` | Built |
| `leads/mutations/dup-check` GET<br>`leads/mutations/merge-duplicate` POST | Duplicate probe; merge a duplicate into its original | `findDuplicateLead` + the duplicate dialog; `mergeImportRow` | Built (REG-609) |
| `leads/parse-document` POST | Read an enquiry document into lead fields (model) | Fill from a document by rule (`DOCUMENT_FILL` in `lead-form.tsx`) | Rule (REG-609) |
| `leads/records` GET<br>`leads/records/[id]` GET<br>`leads/records/[id]/extras` GET | Leads list, one lead, its activity + refund extras | `lib/leads/queries.ts` `fetchLeadRows` · `lib/leads/detail.ts` `fetchLeadDetail` | Built |
| `leads/tat-report` GET | Turnaround-time report (Owner / Admin) | Company › Reports › Leads (`lib/leads/insights.ts` `fetchInsights`, `lib/leads/tat.ts`) | Built (REG-611 · REG-1361) |

#### `market-insights` — market-insights (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `market-insights` GET<br>`market-insights/[id]` GET | Read Market Insights articles | `/market-insights` + `/market-insights/[articleId]` (`lib/market-insights/queries.ts`) | Built (S25) |

#### `material-catalog` — material-catalog (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `material-catalog/records` GET·POST<br>`material-catalog/records/[id]` DELETE·PATCH | The material catalogue (a sandbox in 1.0) | The catalogue as data (`lib/visualizer/data/catalogue.gen.ts`) + Company › Materials | Built (AI Visualizer map 17) |

#### `member-signatures` — member-signatures (3)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `member-signatures/records` GET·PATCH·POST<br>`member-signatures/records/[id]` DELETE<br>`member-signatures/roster` GET | Members' signatures | `app/quotes/signature-actions.ts` `saveMemberSignature` · `removeMemberSignature` · `setSignatureConsent` (`members.signature_*`) | Built (S01 · S03) |

#### `news` — news (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `news` GET | Industry News from RSS feeds for the Dashboard | Market Insights' RSS reader (`lib/market-insights/rss.ts`); seam `feeds` `fetchText` | Seam (S22) |

#### `newsletter` — newsletter (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `newsletter` POST | Newsletter sign-up | `app/site/actions.ts` `subscribeNewsletter` (`newsletter_subscribers`) | Built (S35) |

#### `notifications` — Notifications (9)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `notifications` GET<br>`notifications/[id]` PATCH<br>`notifications/mark-all-read` POST<br>`notifications/unread-count` GET | The bell: list, read one, read all, unread count | `app/notifications/actions.ts` `fetchFeedAction` · `markNotificationRead` · `markAllNotificationsRead`; badge from `railBadges` | Built |
| `notifications/preferences` GET·PUT | Per-event notification preferences (studio + client) | Settings › Notifications — `setNotificationRules` (`notification_rules`) · `setClientChannel` (`client_messages`); a member's own: `setMyMute` · `setMyEmailMode` (S18) | Built |
| `notifications/schedule` DELETE·POST | Schedule a reminder to fire later | Derived reminders (`lib/notifications/queries.ts` `derivedDue`) sent by the `messages` job | Built (S34) |
| `notifications/templates` GET<br>`notifications/templates/[eventType]` DELETE·PUT | Base message templates + the studio's overrides | `setMessageTemplate` · `setClientTemplate` (`message_templates`) | Built |
| `notifications/whatsapp-status` GET | Whether WhatsApp is configured | `GET /api/services` (names and states) + Integrations' simulated words | Seam (S34) |

#### `objections` — objections (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `objections/records` GET·POST<br>`objections/records/[id]` DELETE·PATCH | Objection responses library | `saveObjectionAnswer` · `setObjectionAnswerOn` · `resetObjectionAnswer` · `removeObjectionAnswer` (`studio_objection_responses`) | Built (S23) |

#### `og` — og (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `og` GET | Branded link-preview image | `/card/[kind]/[key]` (`lib/link-cards/*`) | Built (S02) |

#### `pay` — pay (7)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `pay/[token]` GET<br>`pay/[token]/approve-milestone` POST<br>`pay/[token]/raise-issue` POST<br>`pay/[token]/verify` POST | The old one-link project portal: summary, approve a milestone, raise an issue, OTP | The client portal; `/pay/*` redirects (`lib/links/old-links.ts`) | Decided — Q-37 (CP-123 · MI-063) |
| `pay/inv/[token]` GET | Public invoice by token | `/invoice/[token]` (no login) | Built (gaps B) |
| `pay/receipt/[token]` GET<br>`pay/receipt/[token]/pdf` GET | Public receipt by token (+ PDF) | `/receipt/[token]` + Download PDF (seam `pdf`) | Built · Seam |

#### `po` — po (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `po/[token]` GET·POST | The vendor's PO page (view, accept) | `/po/[token]` — `app/po/actions.ts` `answerPo` | Built (gaps F1) |
| `po/quote-compare` POST | AI compares a PO's lines with the signed quote | PO panel › *Against the quote* by rule | Decided — F1-Q7 · Q-30 (MO-016) |

#### `portal` — portal (3)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `portal/family-members` DELETE·GET·POST | Secondary homeowners on a project / lead | Household — `app/portal/household-actions.ts` (`addHouseholdMember` · `inviteHouseholdMember` · `removeHouseholdMember` …) | Built (CP-031…033) |
| `portal/studio-settings` GET | Resolve a studio's portal branding by slug | `lib/portal/queries.ts` `fetchPortalLook` · `resolvePortalSlug` | Built |
| `portal/upload-asset` POST | Upload portal assets (logo, team photos, About images, payment QR) | Brand kit + About (`app/company/about-actions.ts`), team photos (`studio_pictures`) | Built (gaps H) |

#### `price-book` — Price book (12)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `price-book/[id]` DELETE<br>`price-book/[id]/approve` POST<br>`price-book/[id]/reject` POST<br>`price-book/notify-pending` POST | Hard-delete an item; approve / reject a proposed item; notify approvers | `deletePriceBookItemsForever` · `approvePriceBookItem` · `sendBackPriceBookItem`; bell `price_book_proposed` | Built (REG-650) |
| `price-book/export` GET | Export the price book CSV | Price book ⋮ › Export My Items (CSV · XLSX) | Built (REG-652) |
| `price-book/import` POST<br>`quotes/import` POST | Bulk-import price-book rows (with a vendor) | `importPriceBookItems` · `undoPriceBookImport` (Import from a spreadsheet) | Built (REG-652) |
| `price-book/parse` POST | Model reads a vendor document / image into price-book rows | Import takes CSV · XLSX · pasted rows; reading a PDF / image is the platform's | Decided — price book Q-16 |
| `price-book/suggestions/bulk` POST<br>`price-book/suggestions/pending` GET<br>`price-book/suggestions/scan` POST | Suggest adding quote lines that aren't in the price book | "Match N lines" and *Add to My Items* for lines not in the book (`matchQuoteLinesToBook`, `lib/company/price-book-match.ts`) | Rule (S12; registry `book-match`) |
| `price-book/upload-image` POST | An item's photo | The item dialog's photo well (`thumb`) | Built (REG-651) |

#### `project-aggregates` — project-aggregates (6)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `project-aggregates/action-items` GET<br>`project-aggregates/activity-feed` GET<br>`project-aggregates/contract-values` POST<br>`project-aggregates/financial-summary` GET<br>`project-aggregates/overdue-invoices` GET<br>`project-aggregates/quote-line-count` GET | Hub reads: a project's action items, activity, contract values, money summary, overdue invoices, a quote's line count | Derived on read: Needs you (`lib/projects/needs-you.ts`), Activity (`fetchLeadActivity`), `lib/projects/money.ts`, `fetchMoneyNeeds` | Built |

#### `project-files` — project-files (5)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `project-files/[id]/signed-url` POST<br>`project-files/records` GET·POST<br>`project-files/records/[id]` DELETE<br>`projects/[id]/files` GET·POST<br>`projects/[id]/files/[fileId]` DELETE·GET·PATCH | A project's files (merged with the lead's), signed URLs | The lead's Files on the project's address (`lead_files`); `/files/raw/[fileId]` | Built |

#### `project-selections` — project-selections (5)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `project-selections/records` GET·POST<br>`project-selections/records/[id]` DELETE·PATCH<br>`projects/[id]/selections` GET·POST<br>`projects/[id]/selections/[selectionId]` DELETE·PUT<br>`projects/[id]/selections/[selectionId]/share` POST | Selections: list, create, edit, share | Choices — `app/projects/choices-actions.ts` (`saveChoice` · `shareChoice` · `unshareChoice` · `deleteChoice` …) | Built |

#### `project-templates` — project-templates (4)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `project-templates/records` GET·POST<br>`project-templates/records/[id]` DELETE·PATCH<br>`projects/templates` GET·POST<br>`projects/templates/[id]` DELETE·PUT | Whole-project templates (no screen in 1.0) | Schedule templates + task templates; Duplicate project (P-E) | Dead in 1.0 (map 24: not ported) |

#### `projects` — Projects (39)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `projects/[id]/selections/[selectionId]/receipt` GET | A selection's decision receipt PDF | Selection receipts (`project_selections.receipt_file_id`, Files › Selection receipts) | Built (REG-1249) |
| `projects/[id]/archive` POST<br>`projects/[id]/unarchive` POST | Archive / revive a project | Soft delete + Deleted Projects | Decided — Q-25 (PR-025 · PR-127) |
| `projects/[id]/contract` POST<br>`projects/[id]/contract/download` GET<br>`projects/[id]/contract/from-signature` POST<br>`projects/[id]/contract/list` GET | A project's contract: upload, list, download, make one from the signature | `readProjectContracts` · `linkProjectContract` · `contractFolderFor` (`app/projects/actions.ts`); Files › Contract & VOs | Built (REG-1176) |
| `projects/[id]/delete` POST | Delete a project | `app/projects/ending-actions.ts` `deleteProject` (+ Undo, Deleted Projects) | Built (PR-126) |
| `projects/[id]/floor-plan` GET·POST<br>`projects/[id]/floor-plan/annotations` POST<br>`projects/[id]/floor-plan/annotations/[annotationId]` DELETE·PATCH<br>`projects/[id]/floor-plan/annotations/[annotationId]/comments` POST<br>`projects/[id]/floor-plan/annotations/[annotationId]/work` PATCH·POST<br>`projects/[id]/floor-plan/plans/[planId]` PATCH<br>`projects/[id]/floor-plan/request` POST<br>`projects/[id]/floor-plan/upload-image` POST | The studio's floor plan: plans, marks, comments, a mark to work, ask the client for a plan | `app/projects/floor-plan-actions.ts` (`addFloorPlan` · `addFloorPlanMark` · `commentOnFloorPlanMark` · `floorPlanMarkToTask` · `floorPlanMarkToVariation` · `setMainFloorPlan` · `askClientForFloorPlan` …) | Built (gaps G · P-H) |
| `projects/[id]/invoices/[invoiceId]/variance` PATCH | Resolve an invoice's variance | The invoice's *Differs* chip with its reason (`setInvoiceAmount`) | Built / Decided (PR-084 · MI-041) |
| `projects/[id]/invoices/adhoc` POST<br>`projects/[id]/invoices/milestone` POST | An ad-hoc invoice; one invoice for a milestone | `createOneOffInvoice` · billing per stage | Built (MI-036 · MI-105) |
| `projects/[id]/materials` GET | Material lifecycle from quote lines, POs and receipts (no screen uses it) | PO delivery state (`markPoDelivered`, Where costs go) | Dead in 1.0 (projects F-169) |
| `projects/[id]/notify-publish` POST | Tell the client the timeline was published | Schedule › Share changes (`shareSchedule`, `schedule_shared`) | Built |
| `projects/[id]/payment-schedule/rebalance` POST | Retired in 1.0 (spec D8) | `rebalanceProject` | Dead in 1.0 |
| `projects/[id]/progress-updates` GET·POST<br>`projects/[id]/progress-updates/[updateId]/unpublish` POST<br>`projects/progress-updates/[updateId]` DELETE·GET·PATCH | Progress updates: add, read, edit, delete, unpublish | Updates — `app/projects/updates-actions.ts` (`saveProjectUpdate` · `approveProjectUpdate` · `withdrawProjectUpdate` · `deleteProjectUpdate` …) | Built (UC-001…015) |
| `projects/plan` POST<br>`projects/plan/tasks` POST | Model drafts a project plan / its tasks | AI-drafted schedules by rule (`draftTimeline`), milestone task suggestions (`lib/projects/task-suggestions.ts`) | Rule (SC-006 · SC-056 held for a model) |
| `projects/records` GET·POST<br>`projects/records/[id]` GET·PATCH | Projects list; one project | `/projects` + `fetchProjectDetail` | Built |
| `projects/records/[id]/assignees` POST | Project members | The lead's members (`assignMembers`) | Built (PR-103) |
| `projects/records/[id]/closure` PATCH | Closure: submit / approve / reject | `completeHandover` · `approveHandover` · `sendBackHandover` · `withdrawHandover` | Built (PR-119…125) |
| `projects/records/[id]/lead-link` PATCH<br>`projects/records/count-by-lead` GET<br>`projects/records/sync-customer-phone` PATCH | Link a project to a lead; count projects per lead; copy a new phone to projects | One record: every project has one lead (`projects.lead_id` unique); the client's phone lives on the lead | Built (CP-010 · PR-040) |
| `projects/records/[id]/milestone-approvals` GET·PATCH<br>`projects/records/[id]/timeline` PATCH | The homeowner's approval per milestone; save the timeline | `project_milestones` (`confirm_*`) — `app/projects/schedule-actions.ts` | Built |
| `projects/records/clone` POST | Clone a project | `duplicateProject` · `undoDuplicateProject` | Built (P-E) |
| `projects/rooms` GET·POST<br>`projects/rooms/[roomId]` DELETE·PATCH | Visualizer rooms bound to a lead / project | `project_rooms` — `app/visualizer/actions.ts` `addRoom` · `renameRoom` · `deleteRoom` · `setRoomPhoto` | Built |

#### `quote` — quote (5)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `quote/[token]` GET<br>`quote/[token]/pdf` GET<br>`quote/[token]/request-otp` POST<br>`quote/[token]/status` GET<br>`quote/[token]/verify-otp` POST | The quote share link behind an SMS code (+ PDF, poll) | `/quote/[token]` (no code: the token is the key, S04); `/confirm/[token]` · `/sign/[token]/quote` | Built (S02 · S04) |

#### `quote-generation-rules` — quote-generation-rules (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `quote-generation-rules/records` GET·POST<br>`quote-generation-rules/records/[id]` DELETE·PATCH | Quote generation rules (the digitizer's starter quote) | Starter sections + My Sections | Decided — templates Q-07 (held) |

#### `quote-pdf` — quote-pdf (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `quote-pdf/render` POST | HTML → PDF through Chromium | `printPaper()` → seam `pdf` | Seam |

#### `quote-preview` — quote-preview (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `quote-preview/[token]` GET<br>`quotes/preview` POST | A view-only quote link (refuses a dead quote); mint its token | `/quote/[token]` — `app/quotes/view-link-actions.ts` `shareQuoteView` · `stopQuoteView` · `reopenQuoteView` | Built (S02) |

#### `quote-theme-presets` — quote-theme-presets (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `quote-theme-presets/records` GET·POST | System theme presets + the studio's custom slot | House styles in code (`lib/templates/presets.ts`); a custom preset lands as a Draft template | Built (templates DEF-05 · Q-03) |

#### `quote-xrays` — quote-xrays (8)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `quote-xrays/[id]` DELETE·PATCH<br>`quote-xrays/create` POST<br>`quote-xrays/lead-quotes` GET<br>`quote-xrays/parse-file` POST<br>`quote-xrays/records` GET<br>`quote-xrays/records/[id]` GET | Quote X-Ray: run, read, update, un-merge a row, delete; the lead's quotes; parse a file | Tools › Quote X-Ray — `app/quote-x-ray/actions.ts` (`runComparison` · `correctComparison` · `setComparisonOverrides` · `rerunComparison` · `deleteComparison`); the read = rule `quote-pdf-reader` | Built · Rule (X-Ray R1…R4 · S21) |
| `quote-xrays/[id]/share` POST<br>`quote-xrays/share/[token]` GET | A 24-hour share link to an X-Ray for the client | The kept WhatsApp send (`recordComparisonSent`); 1.0's `/sign/quote-xray/*` lands on a notice page | Decided — X-Ray Q-22 · Q-24 |

#### `quotes` — Quotes (35)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `quotes/[id]/download` GET<br>`quotes/signed-quote/[id]` GET | Download any quote / a signed quote's PDF | Preview › Download PDF (seam `pdf`); a signed PDF kept in Files › Contract & VOs | Seam · Built (S03) |
| `quotes/[id]/share-link` POST<br>`quotes/share-link` POST | Mint a live interactive share link (no OTP) | `shareQuoteView` (`quotes.view_token*`) | Built (S02) |
| `quotes/[id]/transition` POST | The quote status state machine | `markQuoteStatus` · `undoQuoteStatus` · `sendQuote` · `approveQuote` · `requestQuoteChanges` | Built (REG-624 · P4) |
| `quotes/assemblies` DELETE·GET·PATCH·POST | Packages (assemblies) | Price book › My Sections (`price_book_sections`) | Built (REG-555 · map 14) |
| `quotes/auto-match` POST | Match lines to the price book | `matchQuoteLinesToBook` (rule) | Rule (S12) |
| `quotes/cancel-signature` POST<br>`quotes/resend-signature` POST<br>`quotes/request-signature` POST<br>`quotes/signature-requests` GET·POST | Request / resend / cancel a signature; read requests | Contracts — `sendContract` · `sendBundle` · `renewSigningLink` · `stopSigningLink` · `reopenSigningLink` | Built (contracts parity · S03) |
| `quotes/categories` PATCH·POST<br>`quotes/categories/resolve` POST | Quote categories; resolve-or-create by name | Settings › Quotes & pricing › Trades — `setTrades` · `addTrades` · `renameTrade` | Built |
| `quotes/chat` POST | The quote assistant chat (model) | The quote editor's Maison AI sheet (`useQuoteMaison`, margin hints by rule) | Rule (S04 · S10) |
| `quotes/extract-layout` POST | Model reads a quote PDF's layout into a template | Recreate from my current quote (`lib/templates/recreate.ts` `readLayout`) | Rule (S11; registry `template-reader`) |
| `quotes/generate-packages` POST | Model makes Good / Better / Best packages (write-only `quote_packages`) | — | Decided — Later / dead (quote editor D-75 · D-155) |
| `quotes/hierarchy` POST | Reparent / rename quote sections | `setQuoteItemParent` · `groupQuoteItems` · `ungroupQuoteItem` | Built (REG-563) |
| `quotes/insights` POST | Model's quote insights against market rates | Margin hints by rule in the editor's Maison AI sheet | Rule (S04) · market rates = the platform's (Q-16) |
| `quotes/line-items` GET·POST<br>`quotes/line-items/count` GET<br>`quotes/line-items/raw-insert` POST | Quote lines: list, save, count, raw insert | `app/quotes/items-actions.ts` (`createQuoteItem(s)` · `updateQuoteItem` · `replaceQuoteItems` · `listQuoteItems` …) | Built |
| `quotes/parse` POST | The Quote Digitizer: model reads an uploaded quote | Create Quote › Upload a quote (`lib/quotes/upload.ts` `readDocument`, sheets by rule; 5 credits, refunded when unreadable) | Rule (registry `quote-digitizer`) |
| `quotes/records` GET·POST<br>`quotes/records/[id]` DELETE·PATCH<br>`quotes/resolve-lead` GET | Quotes: list, create, update, delete; a quote's lead | `createQuote` · `saveQuoteGeneral` · `deleteQuotes` (+ Deleted Quotes); `lib/quotes/list.ts` `fetchStudioQuotes` | Built |
| `quotes/records/[id]/set-primary` POST | Mark a quote the lead's primary | — (a lead's quote state is derived) | Decided — quote editor Q-03 (D-215) |
| `quotes/records/[id]/vo-editor-context` GET | The VO editor's before → change → after panel | `components/quotes/editor/variation-bar.tsx` | Built |
| `quotes/share-to-portal` POST | Send the quote to the homeowner portal | `quotes.visibility` Shared + the portal's Before work starts | Built (REG-625) |
| `quotes/templates` DELETE·GET·POST<br>`quotes/templates/apply-category` POST<br>`quotes/templates/apply-project` POST<br>`quotes/templates/create-from-quote` POST | Content templates: apply a category bundle / a whole-project template; save a quote as a template | My Sections (`insertPriceBookSection`) · Save as template (`saveQuoteAsTemplate`, carries sections + text + split) | Built (REG-583 · REG-540) |
| `quotes/upload-image` POST | A line's photo | The Items table's photo (`quote_items` thumb) | Built |
| `quotes/versions` GET·POST<br>`quotes/versions/restore` POST | Quote versions; restore one | Version History — `reviseQuote` · `restoreQuoteVersion` (`quote_versions`) | Built (REG-565 · REG-625) |

#### `reference` — reference (4)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `reference/fx-rates` GET | FX rates | — (Singapore and S$ only) | Parked — countries beyond Singapore (S33 on hold; REG-1307) |
| `reference/invoices` GET<br>`reference/plans` GET | The studio's subscription invoices; the plans | Company › Plan & AI credits (`lib/credits/queries.ts` `fetchInvoices`, `lib/credits/plans.ts`) | Built (AI credits) |
| `reference/project-types` GET·PUT | Project types with their milestone templates | Three project types (`lib/projects/model.ts`) + a default schedule per type (`project_schedule_type_defaults`) | Built |

#### `render` — AI Visualizer — model passes (19)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `render` POST<br>`render/auto-furnish` POST<br>`render/declutter` POST<br>`render/detect` POST<br>`render/photorealistic` POST<br>`render/relight` POST<br>`render/segment` POST<br>`render/style-analyze` POST<br>`render/style-transfer` POST<br>`render/room-analyze` POST<br>`render/room-scan` POST<br>`render/drift-check` POST<br>`render/drift-fix` POST | The Visualizer's model passes: generate, furnish, empty the room, detect, segment, photoreal, relight, style analyse / transfer, room read, the drift guard | The curated engine in the browser (`lib/visualizer/engine/run.ts` `runPass`), drift guard by rule (S20); credits charged and refunded (`chargeAI` / `refundAIWork`) | Rule (registry `image-model`; AI Visualizer audit · S20) |
| `render/depth` POST<br>`render/orbit-video` POST<br>`render/outpaint` POST<br>`render/reangle` POST | Experimental Spatial View: depth map, orbit video, outpaint, re-angle | — | Dead in 1.0 (sandbox only; Visualizer VO-07 · Q-23) |
| `render/detect-sandbox` POST<br>`render/floorplan-3d-sandbox` POST | Throwaway benchmarking sandboxes | S28 built the floor-plan → 3D picture for real; detect has no sandbox | Card queued (S41 the AI sandboxes) — 1.0's own throwaway dev routes |

#### `renders` — AI Visualizer — renders and client links (6)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `renders/[token]` GET<br>`renders/[token]/consultation` POST | The client's render link; a call-back request | `/renders/[token]` — `app/renders/actions.ts` (`stampShareView` · `askCallBack` → a Follow-up task) | Built |
| `renders/jobs` GET·POST<br>`renders/jobs/[id]` DELETE·PATCH<br>`renders/jobs/by-room/[roomId]` DELETE | Render jobs: list, save, edit variants, delete a room's | `render_jobs` — `saveRender` · `deleteVersion` · `restoreVersion` · `deleteRoom` | Built |
| `renders/share` POST | Share renders by a link | `createShareLink` · `renewShareLink` · `stopShareLink` | Built |

#### `scope-questions` — scope-questions (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `scope-questions/records` GET·POST<br>`scope-questions/records/[id]` DELETE·PATCH | The studio's question bank | Company › Questionnaire — `app/company/scope-questions-actions.ts` | Built (REG-612) |

#### `sign` — Signing (8)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `sign/[token]` GET<br>`sign/[token]/preview-pdf` GET<br>`sign/[token]/request-otp` POST<br>`sign/[token]/submit` POST<br>`sign/[token]/verify-otp` POST | The signing page: read, preview PDF, OTP, sign (single · bundle · variations) | `/sign/[token]` · `/sign/bundle/[id]` — `signContractOnline` · `signBundleOnline` (code = seam `sign-in`) | Built (contracts parity · S03) · Seam |
| `sign/[token]/download` GET<br>`sign/[token]/packet` GET<br>`sign/certificate/[id]` GET | The executed contract PDF, the signed packet, the signature certificate | The signing record (`components/contracts/sign/signing-record.tsx`) + `/sign/[id]/file` · `/sign/bundle/[id]/file/[contractId]`; a rendered packet = seam `pdf` | Built · Seam |

#### `signing-documents` — signing-documents (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `signing-documents` DELETE·GET·PATCH·POST<br>`signing-documents/upload` POST | The signing-document library (rich text + 5 MB PDFs) | Contract templates incl. kind `pdf` (`createPdfTemplate` · `replacePdfTemplate`, `contract_template_files`) | Built (S03) |

#### `storage` — storage (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `storage/remove` POST<br>`storage/upload` POST | Tenant-guarded storage upload / delete | Seam `storage` (`lib/leads/file-store.ts` `setFileStore`) | Seam |

#### `studio` — Studio (members, previews) (8)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `studio/member-requests` GET·PATCH<br>`studio/members/request-add` POST | A studio asks OpenMaison to add a member (fork tenants don't self-provision) | Add member invites directly (S09); a task's ask-to-add → bell `invite_requested` | Built (S09) |
| `studio/members` POST | Add a studio member (+ team.member_added) | `addMember` (Company › Members) | Built |
| `studio/milestone-templates` GET·POST<br>`studio/milestone-templates/[id]` DELETE·PATCH | Saved Gantt templates | Schedule templates library (rename · delete · folders) | Built |
| `studio/preview-as-homeowner` GET<br>`studio/preview-as-homeowner/end` POST | Preview the portal as the client | *See it as {client}* / Open as a test client (`portal_previews`, `/my/[slug]/preview`) | Built (REG-966) |
| `studio/preview-login-url` GET | A one-shot portal login URL (nothing calls it) | — | Dead in 1.0 (I-412) |

#### `studio-assets` — studio-assets (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `studio-assets/records` GET·POST<br>`studio-assets/records/[id]` DELETE | Studio assets: logo, badge, signature, document image, font | Brand kit (`saveBrand`), members' signatures, the studio's own fonts (`app/company/font-actions.ts`, `studio_fonts`) | Built (S11) |

#### `studio-companies` — studio-companies (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `studio-companies/records` GET·POST<br>`studio-companies/records/[id]` PATCH | Legal entities: list, add, set default | Company › Profile › Issuing entities (`settings.brand.details.entities[]`, `lib/company/entities.ts`) | Built (REG-647) |

#### `studio-config` — Studio configuration (27)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `studio-config/branding` GET·PUT | Studio branding | Brand kit (`settings.brand`) | Built |
| `studio-config/custom-field-values` GET·PUT | Custom-field values per lead | `writeCustomValues` in `createLead` / `updateLead` (`lead_custom_field_values`) | Built |
| `studio-config/doc-templates` GET·PUT<br>`studio-config/doc-templates/bump` POST | Quote PDF templates (+ the recently-used strip) | The template picker (`lib/templates/picker.ts`, last used) | Built |
| `studio-config/features` GET·PUT | Per-studio switches: lock quote actions until approved, lock the project at handover, CaseTrust step, Journey mode, Canva editor, duplicate detection, manager hierarchy, fee-first stages, price-book subcategory in quotes | Quote approval (`quote_approval`), `project_handover`, CaseTrust (`contracts.casetrust_at`), the template editor, `findDuplicateLead`, `members.manager_id`, `quote_payments.fixed_minor`; Journey out; subcategory not ported | Built / Decided (DEF-04 · price book Q-08) |
| `studio-config/funnel` GET·PUT<br>`studio-config/workflow` GET·PUT | The lead funnel; workflow rules (approvals) | Settings › Lead management › Lead stages (`lead_stage_rules`, `stage_movement`) · Who may do what | Built (S05 · REG-643) |
| `studio-config/journey` GET·PUT | Journey mode settings (inactivation reasons, overrides) | Reasons → `lead_reasons`; Journey itself out | Decided — DEF-04 (reasons built, REG-607) |
| `studio-config/member-overrides` PATCH<br>`studio-config/role-permissions` GET<br>`studio-config/roles` GET·POST<br>`studio-config/roles/[id]` DELETE·PATCH | Custom roles, role permissions, per-member overrides | Five fixed roles + Who may do what (`lib/settings/permissions.ts`, read-only) | Decided — roles editor held (Leads Q-40; her hold) |
| `studio-config/next-document-suffix` GET<br>`studio-config/numbering` GET | Document numbering per type / entity | Settings › Finance › Document numbers (`app/settings/document-numbers-actions.ts`) | Built (REG-1521) |
| `studio-config/platform-market-rates` GET | OpenMaison's market rates (read-only) | — | Decided — the platform's (price book Q-16) |
| `studio-config/portfolio` GET<br>`studio-config/portfolio/[id]` GET·POST | The studio's portfolio projects (Qanvast Ops › Portfolio; read by the co-pilot) | Members › Public profile › Their work (`member_portfolio_*`) + the studio's own completed projects in Past projects | Built (S16 · S27) |
| `studio-config/price-book` GET·POST<br>`studio-config/price-book-history` GET<br>`studio-config/price-book/[id]` PATCH<br>`studio-config/price-book/reorder` POST<br>`studio-config/price-book/vendor-markup` POST | The price book: paginated list, create, update with approval, history, drag reorder, bulk vendor markup | Company › Price book (`app/company/price-book-actions.ts`: `createPriceBookItem` · `updatePriceBookItem` · `listItemHistory` · `bulkUpdatePriceBookItems` *Set markup*); no drag (the book sorts) | Built (price book R1…R4) |
| `studio-config/pricing-tiers` PUT | Quantity price tiers on an item | — | Decided — price book Q-06 (not built) |
| `studio-config/quote-categories` GET·PUT<br>`studio-config/quote-categories/subcategory` POST | Quote categories and their subcategories | Trades + trade notes; sub-categories become rooms / sub-sections per quote | Built (templates map 04) |
| `studio-config/taxonomies` GET·PUT | The studio's lists (lead sources, property types …) | Settings lists (`lead_sources`, trades, reasons, ticket categories, expense categories) | Built |
| `studio-config/timeline-templates` GET·PUT | Timeline templates | Company › Templates › Schedules | Built |

#### `studio-materials` — studio-materials (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `studio-materials/records` GET·POST<br>`studio-materials/records/[id]` DELETE | Studio materials | Company › Materials (`app/company/materials-actions.ts`) | Built |

#### `studio-setup` — studio-setup (2)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `studio-setup` GET·PATCH<br>`studio-setup/portal-slug` GET | The onboarding wizard's state; the portal slug | Set up your studio (`lib/studio-setup/*`, `studio_setup`); Company › Client portal address | Built (S08) |

#### `tasks` — Tasks (9)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `tasks` POST<br>`tasks/records` GET·POST<br>`tasks/records/[id]` PATCH<br>`tasks/records/[id]/assignees` POST | Tasks: create (+ notify), list, update, assignees | `app/leads/tasks-actions.ts` (`createTask` · `updateTask` · `setTaskAssignees` · `addTaskAssignees`); `/tasks` | Built |
| `tasks/records/[id]/approve` POST<br>`tasks/records/[id]/reject` POST<br>`tasks/records/cancel-quote-approvals` POST | Approval tasks (quote, expense …): approve, reject, cancel | Approvals are states on their records + bell rows (`approveQuote` · `requestQuoteChanges` · `answerExpense` …) | Decided — approvals not tasks (map 24 §2) |
| `tasks/records/cancel-by-lead` POST | Cancel a lead's open tasks when it closes | Lost leaves tasks open | Decided — Leads Q-29 (MM-28) |
| `tasks/upload-image` POST | A task's supporting images | `attachFiles` (`task_attachments`) | Built |

#### `usage` — usage (3)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `usage/event` POST<br>`usage/page-view` POST<br>`usage/studio-health` GET | Usage events / page views; a studio's own health view | — (card `studio:studio-health`) | Card queued (S39 Studio Health — not built when this sweep ran) |

#### `vendors` — vendors (4)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `vendors/records` GET·POST<br>`vendors/records/[id]` PATCH<br>`vendors/records/[id]/merge` GET·POST<br>`vendors/records/[id]/transactions` GET | Vendors: list, create, update, merge, transaction history | Company › Finance › Vendors (`app/finance/vendor-actions.ts` `createVendor` · `updateVendor` · `setVendorActive` · `mergeVendors`; the vendor panel lists POs, bills, expenses, payments) | Built (MO-074 · MO-076) |

#### `visualizer` — AI Visualizer (1)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `visualizer/workspace` GET·PUT | The Visualizer workspace (rooms + jobs) | `lib/visualizer/queries.ts` `fetchVisualizerEditor` | Built |

#### `webhooks` — Webhooks (7)

| 1.0 route · methods | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `webhooks/leads/[token]` POST | Receive a lead by webhook (HMAC, 64 KB, 10 / min) | `POST /api/webhooks/leads/[token]` (`captureLead`) | Built (S34) |
| `webhooks/leads/endpoints` GET·POST<br>`webhooks/leads/endpoints/[endpointId]` DELETE<br>`webhooks/leads/endpoints/[endpointId]/logs` GET<br>`webhooks/leads/endpoints/[endpointId]/regenerate` POST | Webhook endpoints: list, create, revoke, logs, regenerate | `createWebhook` · `revokeWebhook` · `regenerateWebhook` (`settings.lead_capture.webhooks` · `webhookLog`) | Built (REG-612) |
| `webhooks/whatsapp` POST | 360dialog inbound: receipts and replies | `POST /api/webhooks/whatsapp` (receipts on the outbox; replies → `inbound_messages` + Messages) | Built (S34) · Seam `delivery` |
| `webhooks/whatsapp-central` POST | The fleet's shared-number router | — | Excluded — Platform side (registry `whatsapp-webhook` note) |

### 1.3 Routes only on the newer branches (164: plg 149 · qanvast 15)

| 1.0 route · methods (branch) | What 1.0 does | 2.0 home | Status |
|---|---|---|---|
| `admin/leads` GET (plg)<br>`admin/plans-audit` GET·PATCH (plg) | Staff views: every inbound lead from the website forms with its first-touch attribution; the 46-studio plan audit (shadow → real credit enforcement) | — | Excluded — Platform admin |
| `anon/session` GET·POST (plg)<br>`anon/leads` GET·POST (plg)<br>`anon/quote-digitizer` GET·POST (plg)<br>`anon/storage/upload` POST (plg)<br>`anon/workspace/visualizer` PUT (plg)<br>`cron/anon-sweep` GET (plg)<br>`cron/anon-storage-gc` GET (plg) | **Try it without an account ("gated acquisition")**: every module page's *Try now* opens the real tool with no sign-in — a stranger keeps leads in an anonymous workspace, gets one free quote read and works in the Visualizer; on sign-up the workspace is claimed into the new studio (`lib/anon/claim*.ts`, materialisers for leads · quote · visualizer); two crons sweep expired workspaces and their files | Only the Visualizer part exists: `/site/try` (S36 — three renders, the photo carries into the new studio's Visualizer). No anonymous Leads or Quote Digitizer, no workspace claimed at sign-up; the website's module pages offer Book a demo | **MISSING** (M-01) — the AI credits audit §0.2 had scoped "anonymous visitor tools and sign-up gates" out before S35 / S36 built the site and the trial; no card read this branch |
| `billing/checkout` POST (plg)<br>`billing/checkout/[id]` GET (plg)<br>`billing/portal` POST (plg)<br>`billing/seats` POST (plg)<br>`webhooks/dodo` POST (plg)<br>`cron/billing-lapse` GET (plg)<br>`cron/credit-refresh` GET (plg) | Dodo Payments: start a checkout, poll it, the customer portal, change seats; Dodo's webhook (the only grant of credits); the lapse sweep; the monthly credit refresh | `app/credits/actions.ts` (`startPlanCheckout` · `startTopUp` · `completeCheckout` · `updateCard` · `changeSeats`), `POST /api/webhooks/payments`, job `credits` (`lib/services/sweep.ts`); seam `payments` (`lib/credits/payments.ts` `setPaymentProvider`) | Built · Seam (S19) |
| `company/templates/tasks` GET·POST (plg)<br>`company/templates/tasks/[id]` DELETE·GET·PATCH (plg)<br>`company/templates/tasks/[id]/duplicate` POST (plg)<br>`company/templates/tasks/apply-leads` GET (plg)<br>`company/templates/tasks/purge` POST (plg)<br>`company/templates/tasks/restore` POST (plg) | Company › Templates › Tasks (1.0 porting 2.0's library) | `app/company/task-templates-actions.ts` (`createTaskTemplate` · `saveTaskTemplate` · `duplicateTaskTemplate` · `deleteTaskTemplate` · `restoreTaskTemplates` · `deleteTaskTemplatesForever` · `addTaskTemplateToLead`) | Built (REG-538) |
| `contracts/records` GET·POST (plg)<br>`contracts/records/[id]` DELETE·GET·PATCH (plg)<br>`contracts/records/[id]/file` GET (plg)<br>`contracts/restore` POST (plg)<br>`contracts/purge` POST (plg)<br>`contracts/templates` GET (plg) | Contracts (1.0 porting 2.0's): a lead's contracts, one contract, its PDF, restore, delete forever, the From Template list | `app/contracts/actions.ts` · `app/leads/contracts-actions.ts` · `app/contracts/read-actions.ts`; `/sign/[id]/file` | Built (REG-534 · S03) |
| `credits/balance` GET (plg)<br>`credits/caps` PUT (plg)<br>`credits/schedule` GET (plg)<br>`credits/summary` GET (plg)<br>`credits/usage` GET (plg) | AI credits: balance (with the trial counter), a member's monthly cap, the price list, the summary, usage | `app/credits/actions.ts` (`readCredits` · `setMonthlyAmount` · `setDefaultMonthlyAmount`), `lib/credits/queries.ts` (`fetchCreditSummary` · `fetchUsage`), `lib/credits/schedule.ts` | Built (REG-699…705 · S19) |
| `cron/growth-digest` GET (plg) | OpenMaison's daily growth digest to its Slack channel (Mixpanel + GA4) | — | Excluded — OpenMaison's own operations |
| `document-templates/contracts` POST (plg)<br>`document-templates/contracts-library` GET (plg)<br>`document-templates/contracts/[id]` DELETE·PATCH (plg)<br>`document-templates/contracts/[id]/duplicate` POST (plg)<br>`document-templates/contracts/delete-forever` POST (plg)<br>`document-templates/contracts/empty-trash` POST (plg)<br>`document-templates/contracts/restore` POST (plg) | Company › Templates › Contracts library (1.0 porting 2.0's) | `app/company/contract-templates-actions.ts` | Built |
| `document-templates/tnc` POST (plg)<br>`document-templates/tnc-library` GET (plg)<br>`document-templates/tnc/[id]` DELETE·PATCH (plg)<br>`document-templates/tnc/[id]/duplicate` POST (plg)<br>`document-templates/tnc/delete-forever` POST (plg)<br>`document-templates/tnc/empty-trash` POST (plg)<br>`document-templates/tnc/restore` POST (plg) | Company › Templates › T&Cs & Notes library | `app/quotes/text-actions.ts` (`createTextTemplate` · `updateTextTemplate` · `duplicateTextTemplate` · `deleteTextTemplate` · `restoreTextTemplates` · `emptyTextTemplateTrash`) | Built |
| `file-comments/records` GET·POST (plg)<br>`file-comments/records/[id]` DELETE·PATCH (plg) | Comments on a lead file | `app/leads/files-actions.ts` `addFileComment` · `editFileComment` · `deleteFileComment` (`file_comments`) | Built |
| `finance/records/payment-schedule-templates/[id]` PATCH (plg)<br>`finance/records/payment-schedule-templates/[id]/duplicate` POST (plg)<br>`finance/records/payment-schedule-templates/delete-forever` POST (plg)<br>`finance/records/payment-schedule-templates/empty-trash` POST (plg)<br>`finance/records/payment-schedule-templates/library` GET (plg)<br>`finance/records/payment-schedule-templates/restore` POST (plg) | Company › Templates › Payments library | `app/company/payment-templates-actions.ts` | Built |
| `lead-files/move` POST (plg)<br>`lead-files/purge` POST (plg)<br>`lead-files/restore` POST (plg)<br>`lead-files/trash` POST (plg)<br>`lead-files/tree` GET (plg) | The Files tab: move, trash, restore, delete forever, the tree | `app/leads/files-actions.ts` (`moveFiles` · `trashFiles` · `restoreFiles` · `deleteFilesForever` · `emptyFileTrash`), `lib/leads/files.ts` `fetchLeadFiles` | Built |
| `lead-files/signature-requests` GET·POST (qanvast)<br>`lead-files/signature-requests/[id]/cancel` POST (qanvast)<br>`lead-files/signature-requests/[id]/resend` POST (qanvast)<br>`lead-files/signature-requests/[id]/signed` GET (qanvast)<br>`sign/document/[token]` GET (qanvast)<br>`sign/document/[token]/download` GET (qanvast)<br>`sign/document/[token]/request-otp` POST (qanvast)<br>`sign/document/[token]/source` GET (qanvast)<br>`sign/document/[token]/submit` POST (qanvast)<br>`sign/document/[token]/verify-otp` POST (qanvast) | **Sign any lead file** (qanvast line, 2026-09-30): a PDF / PNG / JPEG in the lead's Files goes to the client to sign with an OTP; the signed copy = the original + a certificate page; never moves the lead's stage | Contracts › Import a PDF → Send for digital signature (an uploaded contract: `attachContractPdf` · `sendContract`, the PDF in Files › Contract & VOs; `/sign/[token]`) | Built in another form — no door from Files, images not signable (§4 note 4) |
| `lead-imports/records` GET·POST (plg)<br>`lead-imports/records/[id]/merge` POST (plg)<br>`lead-imports/records/approve` POST (plg)<br>`lead-imports/records/reject` POST (plg) | The CSV import review queue | `approveImportRows` · `rejectImportRows` · `mergeImportRow`; `lib/leads/queries.ts` `fetchReviewRows` | Built |
| `lead-notes/records` GET·POST (plg)<br>`lead-notes/records/[id]` DELETE·PATCH (plg)<br>`lead-notes/records/[id]/attachments` PUT (plg) | Notes & contact logs | `app/leads/notes-actions.ts` (`createNote` · `updateNote` · `deleteNote` · `setNoteAttachments`) | Built |
| `lead-questions/records` GET (plg)<br>`lead-questions/records/[id]` PATCH (plg) | The lead's questionnaire | `app/leads/questions-actions.ts` (`answerQuestion` …) | Built |
| `leads/mutations/[id]/return` POST (plg)<br>`leads/mutations/[id]/return/undo` POST (plg)<br>`leads/records/[id]/return` GET (plg) | Return a Qanvast lead; undo; read the return | `returnLead` · `undoReturn` (`lead_returns`, `return_attachments`) | Built (REG-192 · REG-609) |
| `leads/mutations/[id]/stage-undo` POST (plg) | Undo a stage move | `undoStageMove` | Built (REG-607) |
| `leads/viewer` GET (plg) | How much of the studio's leads the caller sees | `lib/leads/visibility.ts` `fetchViewer` | Built (REG-601) |
| `library-folders` GET·POST (plg)<br>`library-folders/[id]` DELETE·PATCH (plg)<br>`library-folders/move` POST (plg)<br>`library-folders/undo-delete` POST (plg) | Library folders | `app/company/folder-actions.ts` | Built (REG-663) |
| `nudges/evaluate` POST (plg)<br>`nudges/claim` POST (plg) | **PLG upgrade nudges** (spec 2026-09-25): on Free, the server picks at most one upgrade / top-up offer from 17 triggers (first render kept, first quote read, welcome credits ending, a teammate joined, a balance crossing …) and opens it at a safe moment, once ever per trigger (`nudge_state`) | Plan locks with a Pro tag (`requirePlan` · `usePlanLock` · `ProLocked`), the out-of-credits sheets and asks, auto top-up (S19) — nothing offers an upgrade before a wall is hit | **MISSING** (M-02) — no card read this branch's nudges |
| `plan/features` GET (plg) | Which Pro features the studio's plan lacks | `lib/credits/features.ts` `PRO_FEATURES` + `lib/credits/plan-gate.ts` `requirePlan` | Built (S19) |
| `qanvast/[...path]` DELETE·GET·POST·PUT (qanvast) | The Qanvast line's proxy to Qanvast's own API (Qanvast Ops › Credits · Qanvast Leads · Reviews pages on this branch) | Seam `qanvast` (`app/leads/return-actions.ts` `returnLead`); Qanvast Ops' *Lead credits* and *Reviews* stay signposts | **MISSING** (M-04) — the pages it feeds; the proxy itself is seam `qanvast` (S16's premise corrected, §4 note 3) |
| `qanvast/sync-leads` POST (qanvast) | Pull every Qanvast lead into the studio's leads (`leads.qanvast_lead_id`) | Seam `qanvast` — Qanvast leads arrive through `captureLead` / the import | Seam |
| `quotes/[id]/activity` GET (plg) | A quote's activity | `lib/quotes/activity.ts` `deriveQuoteActivity` | Built (REG-421) |
| `quotes/[id]/revise` POST (qanvast) | Create a revision (QT-014 → QT-014-R1) with line-level changes | `reviseQuote` · `undoReviseQuote` (Version History, the changed-row tint) | Built (REG-565) |
| `quotes/bulk-archive` PATCH (plg) | Archive / restore selected quotes | `archiveQuote` · `unarchiveQuotes` | Built (REG-656) |
| `quotes/records/[id]/pricing-context` GET (plg) | The editor's server-only pricing inputs (GST, entity, rules) | `lib/quotes/editor.ts` `fetchQuoteEditor` | Built |
| `quotes/template-usage` GET (plg) | "Used by n quotes" per template | `lib/templates/queries.ts` (`usedBy`) | Built |
| `render/stash/[runId]` DELETE·GET (plg)<br>`render/stash/[runId]/claim` DELETE·POST (plg) | The credit-leak fix: a paid render that finished after its tab closed is kept and claimed once on return | 2.0's renders run in the browser — nothing to strand; with a server model behind `runPass` the developers need the same keep-and-claim | Seam — a note for the developers (registry `image-model`) |
| `renders/[token]/img/[...key]` GET (plg)<br>`renders/[token]/pins` POST (plg)<br>`renders/[token]/pins/[pinId]/replies` POST (plg)<br>`renders/[token]/view` POST (plg) | The client's render link: pictures, pins, replies, the view stamp | `/renders/[token]` — `app/renders/actions.ts` (`clientPin` · `clientReply` · `stampShareView`); `/visualizer/img/[...key]` | Built |
| `search/global` GET (plg) | Studio-wide search | `app/search/actions.ts` `globalSearch` (`lib/global-search/queries.ts`) | Built (REG-709) |
| `studio-config/brand-kit-assets` GET (plg)<br>`studio-config/brand-kit/upload` POST (plg) | The brand kit's pictures | `saveBrand` (`settings.brand`) | Built |
| `studio-config/cost-visibility` GET·PUT (qanvast) | **Cost & Margin Visibility** (qanvast line): the Owner switches cost price, markup and margin off per role (Admin · Designer · Accounting); every route strips cost for hidden members and keeps the stored cost on their saves | 2.0 ties cost figures to the role (`lib/finance/rules.ts` `seesCostFigures` = `seesBooks`); a Designer always sees a quote line's cost and markup; no switch | **MISSING** (M-03) — no card read this branch |
| `studio-config/lead-visibility` PUT (plg) | Who sees leads | `setLeadVisibility` (`lead_visibility`) | Built (REG-601 · S14) |
| `studio-config/price-book/vendor-prices` GET·PUT (qanvast) | Per-vendor cost / sell prices on one price-book item | One `price_book_items` row per vendor (D-158) | Built in another form (price book map 14) |
| `studio-materials/[id]/duplicate` POST (plg)<br>`studio-materials/[id]/usage` GET (plg)<br>`studio-materials/bulk` POST (plg)<br>`studio-materials/empty-trash` POST (plg)<br>`studio-materials/library` GET (plg) | Company › Materials | `app/company/materials-actions.ts`; `lib/visualizer/queries.ts` `fetchStudioMaterials` | Built |
| `studio/seats` GET (plg) | The studio's seat status | Change seats (`changeSeats`), seats mentioned on Members (S09) | Built (S19) |
| `tasks/records/[id]/attachable-files` GET (plg)<br>`tasks/records/[id]/attachments` GET·PUT (plg)<br>`tasks/records/[id]/comments` GET·POST (plg)<br>`tasks/records/[id]/comments/[commentId]` DELETE·PATCH (plg)<br>`tasks/records/[id]/seen` POST (plg)<br>`tasks/records/[id]/tags` GET·PUT (plg)<br>`tasks/tags` GET·POST (plg)<br>`tasks/tags/[id]` DELETE·PATCH (plg)<br>`tasks/templates` GET·POST (plg)<br>`tasks/templates/[id]/apply` POST (plg) | Tasks: attach files, comments, seen, tags, templates (1.0 porting 2.0's) | `app/leads/tasks-actions.ts` (`attachFiles` · `detachFile` · `addComment` · `editComment` · `deleteComment` · `markTaskSeen` · `setTaskTags` · `createTag` · `renameTag` · `deleteTag` · `saveTemplate` · `applyTemplate`), `fetchAttachLibrary` | Built |
| `visualizer/home` GET (plg)<br>`visualizer/designs` POST (plg)<br>`visualizer/designs/[designId]` GET·PATCH (plg)<br>`visualizer/designs/[designId]/duplicate` POST (plg)<br>`visualizer/designs/[designId]/rooms` POST (plg)<br>`visualizer/designs/[designId]/share-links` GET·POST (plg)<br>`visualizer/designs/[designId]/swatches` POST (plg)<br>`visualizer/designs/[designId]/swatches/[swatchId]` DELETE (plg)<br>`visualizer/designs/[designId]/swatches/[swatchId]/restore` POST (plg)<br>`visualizer/designs/bulk` POST (plg)<br>`visualizer/designs/empty-trash` POST (plg)<br>`visualizer/designs/lead/[leadId]` POST (plg) | AI Visualizer 2.0's designs, rooms, swatches, share links (1.0 porting 2.0's) | `app/visualizer/actions.ts` (`createDesign` · `openLeadDesign` · `renameDesign` · `duplicateDesign` · `deleteDesigns` · `restoreDesigns` · `emptyDesignTrash` · `addRoom` · `saveOwnSwatch` · `removeOwnSwatch` · `restoreOwnSwatch` · `createShareLink`); `fetchVisualizerHome` · `fetchVisualizerEditor` | Built (REG-671…698) |
| `visualizer/img/[...key]` GET (plg) | The studio's picture route | `/visualizer/img/[...key]` | Built |
| `visualizer/pins` POST (plg)<br>`visualizer/pins/[pinId]` DELETE·PATCH (plg)<br>`visualizer/pins/[pinId]/replies` POST (plg)<br>`visualizer/pins/[pinId]/restore` POST (plg) | Studio pins on a version | `addPin` · `replyPin` · `setPinStatus` · `deletePin` · `restorePin` | Built |
| `visualizer/render-origins` GET (plg)<br>`visualizer/share-links/[id]` PATCH (plg)<br>`visualizer/share-links/count` GET (plg) | Which render a lead file came from; renew / stop a share link; live links per lead | `lib/visualizer/queries.ts` `renderOrigins`; `recordShareSent` · `renewShareLink` · `stopShareLink` · `unstopShareLink`; `countLeadRenderLinks` | Built |
| `visualizer/rooms/[roomId]` DELETE·PATCH (plg)<br>`visualizer/rooms/[roomId]/assets` POST (plg)<br>`visualizer/rooms/[roomId]/photo` PUT (plg)<br>`visualizer/rooms/[roomId]/photo/undo` POST (plg)<br>`visualizer/rooms/[roomId]/restore` POST (plg)<br>`visualizer/rooms/[roomId]/state` POST (plg) | A room: rename, delete, restore, its photo (+ undo), reference assets, the leaving save | `renameRoom` · `deleteRoom` · `restoreRoom` · `setRoomPhoto` · `undoRoomPhoto` · `saveRoomAsset` · `saveRoomState`; `POST /visualizer/state` | Built |
| `visualizer/rooms/[roomId]/detect` POST (plg)<br>`visualizer/rooms/[roomId]/segment` POST (plg)<br>`visualizer/rooms/[roomId]/render` GET·POST (plg) | Detect, segment and the paid render on the server | The curated engine in the browser (`runPass`), credits via `chargeAI` / `refundAIWork`, `saveRender` | Rule (registry `image-model`) |
| `visualizer/rooms/[roomId]/light` POST (plg) | Retired in 1.0 (2026-09-29: the free "Keep this look") | — | Dead in 1.0 |
| `visualizer/rooms/[roomId]/reframe` POST (plg)<br>`visualizer/sync` POST (plg) | 1.0's own port plumbing: re-frame rooms uploaded before cropping; reconcile 1.0 ↔ 2.0 rooms on open | — (one database in 2.0) | Dead in 1.0 — port plumbing |
| `visualizer/versions/[jobId]/[variantId]` DELETE (plg)<br>`visualizer/versions/[jobId]/[variantId]/download` GET (plg)<br>`visualizer/versions/[jobId]/[variantId]/files` POST (plg)<br>`visualizer/versions/[jobId]/[variantId]/quote` POST (plg)<br>`visualizer/versions/[jobId]/[variantId]/restore` POST (plg) | A version: delete, download, save to Files, add to a quote, restore | `deleteVersion` · `restoreVersion` · `saveVersionToFiles` · `addVersionToQuote`; Download in the editor | Built |

## 2. Tables

### 2.1 Working tree (175 created + 2 read but never created)

| 1.0 table(s) | What it holds | 2.0 home | Status |
|---|---|---|---|
| `accounting_connections`<br>`accounting_mappings`<br>`accounting_remote_links`<br>`accounting_sync_queue` | Xero: the connection and tokens, account / tax mappings, each record's remote id, the push queue | `settings.xero` (organisations, mapping, auto) · `xero_links` (record → remote id, status, attempts) · `xero_sync_log`; tokens = the developers' (seam `accounting`) | Built · Seam (gaps F2) |
| `admin_users`<br>`audit_log`<br>`platform_config`<br>`platform_settings` | The staff console's users, its audit log, platform flags (banner, sign-ups paused, page visibility) | — (sign-ups paused = env `OPENMAISON_SIGN_UPS_PAUSED`; OpenMaison's per-studio switches = settings key `platform`) | Excluded — Platform admin |
| `ai_query_log` | A log of AI queries (query, response, tokens) — no 1.0 code writes it | — | Dead in 1.0 |
| `auth_sessions` | Sign-in sessions (+ analytics close) | `studio_sessions` | Built (S30) |
| `beta_signups`<br>`contact_messages`<br>`newsletter_subscribers` | Website forms (Book a demo, contact, newsletter) | Same three tables (migration 0107) | Built (S35) |
| `brand_dossiers`<br>`web_search_cache`<br>`market_quote_observations` | X-Ray's web-researched brand dossiers + their search cache; competitor quote observations for market data | Brand notes in code (`lib/xray/brands.ts`) | Decided — the platform's (X-Ray Q-23, D-196…201) |
| `chart_of_accounts`<br>`journal_entries`<br>`journal_lines` | A double-entry ledger — written only by generate-invoices (DR receivables / CR revenue) and deleted with a project; **no 1.0 screen reads it** | — (the books' numbers are derived: `lib/finance/books.ts`; Xero holds the ledger, its accounts mapped in `settings.xero`) | Dead in 1.0 — write-only; nothing a studio sees is lost |
| `client_portal_tokens` | The legacy `/pay/{token}` one-link portal | — (the client portal; `/pay/*` redirects) | Decided — Q-14 · Q-37 (map 24) |
| `commission_rules`<br>`commission_entries`<br>`commission_change_requests` | Commission rules, the accrual ledger, rate change requests | `commission_rules` (+ `stages_json`) · `commission_shares` · `commission_payouts` · `commission_requests`; accrual derived (`lib/finance/commission*.ts`) | Built (gaps F2 · P-C) |
| `complaint_tickets`<br>`complaint_messages` | A studio's complaint tickets to Qanvast and their replies | — | Decided — S16 (Raise Complaint not drawn); the tickets are Qanvast's record |
| `conversations`<br>`conversation_participants`<br>`conversation_files`<br>`messages` | Chats: conversations (client and team), people, files, messages | Members' chats `conversations` · `conversation_participants` · `conversation_messages` · `conversation_files` (S26); client threads `project_messages` (channel client · team) · `lead_messages`; `chat_reads` · `conversation_prefs` | Built (gaps H · P-G · S26) |
| `copilot_analytics_snapshots`<br>`copilot_coaching_suggestions` | Weekly analytics snapshots and coaching tips | Company › Reports › Meetings, computed on read (`lib/meetings/reports.ts`) | Built (S23) |
| `copilot_cards`<br>`copilot_shadow_quote_items` | The tips shown during a meeting; the shadow estimate's lines | Derived by rule each time (`readMeeting` · `estimateOf`); the estimate rides the brief | Built (S23) · Rule |
| `copilot_objection_log` | Objections raised in meetings | `copilot_objection_log` (same name) | Built (S23) |
| `copilot_sessions`<br>`copilot_session_state`<br>`copilot_transcript_segments`<br>`copilot_summary_entries`<br>`meeting_briefs` | Co-pilot sessions, their live state, transcript segments, summary entries, the brief (`copilot_summary_entries` has no CREATE in the migrations — only its lock and cascade) | `meetings` (`state_json` · `notes` · `brief_json` · `blocks` · consent …) | Built (S23) |
| `copilot_share_links` | A brief's 24-hour share link | `meetings.client_token` (+ `/meeting/[token]`) | Built (S23) |
| `copilot_visual_assets` | Mood boards and renders made in a meeting | Mood boards kept with the meeting; renders in the lead's design (`render_jobs`) | Built (S23) |
| `credit_notes` | Credit notes | `credit_notes` (+ `kind` overpayment · `payment_id`) | Built (gaps F2 · S07) |
| `crowd_rate_signals`<br>`platform_market_rates`<br>`price_book_suggestions` | Crowd price signals, OpenMaison's market rates, the suggestion queue | — (S12 matches lines to the book by rule, no queue) | Decided — the platform's (price book Q-16) |
| `customer_notification_preferences` | Which informational messages go to clients | `settings.client_messages` (`setClientChannel`) | Built (gaps H) |
| `email_connections`<br>`email_sync_log` | Gmail connections and sync log | `settings.lead_capture.email` (seam `lead-gmail`) | Seam (Leads R6) |
| `escalations`<br>`escalation_comments` | Tickets and their comments | `project_tickets` · `ticket_replies` | Built (gaps H) |
| `expense_categories`<br>`expenses` | Expense categories; expenses | `settings.expense_categories` · `expenses` (+ `repeat_*`) | Built (gaps F1 · S06) |
| `finance_documents` | External finance documents per project (type, ref, amount, date, counterparty, file) | Recorded invoices (`project_invoices.kind`, `external_*`) and external POs keep their file (`lead_files` · `cost_documents`) | Built in another form (parity map P-A · P-B) |
| `floor_plans`<br>`floor_plan_versions` | 3D space-planner layouts and their versions | `space_layouts` · `space_layout_versions` · `space_layout_shares` | Built (gaps J · P-J) |
| `fork_registry`<br>`fork_usage_rollup`<br>`fork_notification_log`<br>`fork_whatsapp_messages` | The fleet: deployments, their usage rollups, every message sent, the shared WhatsApp number's routing | — | Excluded — Platform (fleet plumbing) |
| `fx_rates` | Currency rates | — | Parked — countries beyond Singapore |
| `hangout_events`<br>`hangout_shifts`<br>`hangout_meetings` | Hangout events, their shifts, the meetings | `hangout_events` · `hangout_shifts` (copies through the feed) · `hangout_meetings` | Built (S27) |
| `hangout_homeowners` | Homeowners registered for a Hangout | `hangout_registrations` (each one a lead through `importLeads`) | Built (S27) |
| `hangout_id_participations`<br>`hangout_id_portfolio_projects` | A designer's participation (share of chats); their Hangout portfolio | `hangout_designers` (`share_pct`); `member_portfolio_projects` | Built (S27) |
| `hangout_studio_participations`<br>`hangout_studio_preferences` | A studio's participation and who it wants to meet | `hangout_participations` (+ `preferences_json`) | Built (S27) |
| `hangout_vouchers` | Qanvast's homeowner vouchers (payout paused in 1.0) | — | Decided — S27 (Qanvast's rewards, not the studio's) |
| `homeowner_moodboard_items`<br>`studio_portal_pages` | A homeowner's inspiration pictures; the studio's custom portal pages (About / Team / Portfolio JSON) — nothing in 1.0's code reads either | About / Team are built on `studio_pictures` + `settings.studio_about` | Dead in 1.0 (projects coverage §1) |
| `homeowner_notification_preferences` | The client's own message preferences (dead in 1.0) | — | Dead in 1.0 (J-53) |
| `homeowner_notifications` | The client's bell rows | Derived rows + `portal_bell_reads` | Built (map 24 D-12) |
| `homeowner_profiles` | Homeowners (unique per studio + phone) | `homeowner_profiles` (unique on the 8-digit phone) | Built (map 24) |
| `homeowner_project_links` | A homeowner's links to leads / projects (primary / secondary, portal token) | `homeowner_lead_links` (the primary) + `homeowner_household_links` (everyone else) | Built (map 24 §3.8) |
| `homeowner_scope_responses`<br>`homeowner_scope_response_history` | The client's questionnaire answers and their history | `questions` (`answered_by`) · `question_answer_history` | Built (Leads R6 · gaps D) |
| `homeowner_shared_assets` | Renders shared to the portal with likes / comments / pins | `render_share_links` · `render_annotations` · `render_consultation_requests` | Built (map 17) |
| `id_profiles`<br>`id_portfolio_projects`<br>`id_portfolio_images` | Designers' public profiles and portfolios | `members.portal_*` · `member_portfolio_projects` · `member_portfolio_pictures` | Built (S27) |
| `invoices`<br>`plans`<br>`subscriptions` | OpenMaison's plans, a studio's subscription and its invoices | `plans` · `subscriptions` · `invoices` (same names) | Built (map 21) |
| `lead_activity_log` | The lead's activity log | Derived feed (`lib/leads/activity.ts`) + `lead_events` | Built (Leads R7) |
| `lead_artifacts` | Journey-mode outreach evidence | — | Decided — Journey out (DEF-04) |
| `lead_assignees` | A lead's members | `lead_assignees` (+ `assigned_by`) | Built |
| `lead_categories`<br>`pipeline_stages` | Lead categories; editable stages — saved, read nowhere | — | Dead in 1.0 (map 02) |
| `lead_custom_fields`<br>`lead_custom_field_values` | Custom fields and their values | Same names | Built (REG-612) |
| `lead_files` | A lead's files | `lead_files` (+ folders, trash, `lead_file_images` · `lead_file_thumbs` · `lead_file_renders`) | Built |
| `lead_outreach_attempts` | Outreach attempts (contact logs) | `lead_notes` (kind contact) + the Contacted stage log | Built (Leads R1) |
| `lead_webhook_endpoints`<br>`lead_webhook_log` | Webhook endpoints and their log | `settings.lead_capture.webhooks` · `.webhookLog` | Built (Leads R6) |
| `leads` | Leads — 68 columns (see §2.3) | `leads` (+ `stage_logs`, `lead_events`, `lead_tasks` for follow-ups) | Built (map 02 §2) |
| `market_insights` | Market Insights articles (OpenMaison writes them) | `market_insights` (the studio's copy through the feed) | Built (S25) |
| `member_signatures` | Members' signatures | `members.signature_*` (+ `signature_consent`) | Built (S01 · S03) |
| `milestone_templates`<br>`project_types`<br>`studio_milestone_templates`<br>`studio_timeline_templates` | Milestone / timeline templates (four stores) and project types | `schedule_templates` · `schedule_template_items`; `project_schedule_type_defaults` | Built (map 24 D-15) |
| `notification_preferences`<br>`notification_templates` | The studio's per-event rules; message template overrides | `settings.notification_rules` · `settings.message_templates`; a member's own (`members.notice_*`, S18) | Built |
| `notifications` | In-app notifications | `notifications` (+ derived rows, `notification_outbox` for email / WhatsApp) | Built |
| `otp_rate_limits` | Per-phone OTP request limits | `lib/auth/limit.ts` `takeTry` (memory; a lasting store = seam `trial-limit-store` note) | Seam (S30) |
| `payment_records` | Client payments | `project_payments` | Built (map 24 §3.5) |
| `payment_schedule_templates` | Payment schedule templates | `payment_templates` | Built |
| `platform_accreditation_badges` | OpenMaison's catalogue of 8 accreditation badges | The brand kit's own badges (`settings.brand.kit.badges`); registrations (`compliance_studio`) | Decided — templates Q-15 (§4 note 2) |
| `po_activity_log` | A PO's activity log | `lead_events` rows `project_po_*` (`poHistory`) | Built (gaps F1) |
| `po_payments` | Payments to a vendor against a PO | `payments_out` | Built (gaps F1) |
| `po_receipts` | Goods received (date, note, photos) | `purchase_orders.delivered_at · delivered_by` (Mark delivered) | Built in another form (MO-094; no photos) |
| `price_book_history` | Price-book item history | `price_book_changes` | Built (REG-650) |
| `price_book_pricing_tiers` | Quantity price tiers | — | Decided — price book Q-06 |
| `profiles`<br>`studio_members` | People and their studio memberships (tags, title, specialty, accepting leads, overrides) | `members` (+ `users` · `memberships` provisional sign-in plumbing) | Built (map 12) |
| `progress_updates` | Progress updates | `project_updates` · `project_update_files` | Built |
| `project_assignees` | Project members | The lead's `lead_assignees` | Built |
| `project_files` | Project files | `lead_files` (+ `shown_to_client_at`) | Built |
| `project_floor_plans`<br>`floor_plan_annotations`<br>`floor_plan_annotation_comments`<br>`floor_plan_approvals` | A project's floor plans, marks, comments, the client's approval | `project_floor_plans` · `floor_plan_marks` · `floor_plan_comments` · `floor_plan_confirmations` (+ `floor_plan_pictures` · `floor_plan_seen` · `floor_plan_photos`) | Built (gaps G · S28) |
| `project_invoices` | Client invoices | `project_invoices` (same name) | Built |
| `project_milestones` | The homeowner's milestone answers | `project_milestones` (one row each, + `confirm_*`, `done_ask_json`) | Built |
| `project_rooms` | Visualizer rooms | `project_rooms` (+ `design_id`) | Built (map 17) |
| `project_selections` | Selections | `project_selections` · `project_selection_options` | Built |
| `project_snag_items` | A project's snag list — **no 1.0 code reads or writes it** | — (the handover checklist and tickets carry fixes) | Dead in 1.0 |
| `project_templates` | Whole-project templates (no screen) | — | Dead in 1.0 (map 24: not ported) |
| `projects` | Projects — 62 columns (see §2.3) | `projects` (+ its lead) | Built (map 24 §3.1) |
| `purchase_orders`<br>`vendors` | Purchase orders (+ supplier bills as `source='bill'`); vendors | `purchase_orders` · `purchase_order_lines` · `supplier_bills`; `vendors` | Built (gaps F1) |
| `quote_generation_rules` | Rules for the digitizer's starter quote | Starter sections + My Sections | Decided — templates Q-07 |
| `quote_line_items` | Quote lines | `quote_items` | Built (map 06) |
| `quote_packages` | Good / Better / Best tiers (write-only) | — | Decided — Later / dead (QE D-75) |
| `quote_signature_requests` | Signature requests (one or many documents) | `contracts` · `contract_bundles` | Built (map 08) |
| `quote_status_history` | Every quote status change | The approval record on `quotes` (`submitted_*` · `reviewed_*` · `client_sent_at`) — the last of each, not a log | Built in another form (map 06 R2) |
| `quote_templates` | Legacy items-only content templates ("System 1", no writer) | My Sections; Save as template | Dead in 1.0 (templates C-28) |
| `quote_versions` | Quote versions (per lead) | `quote_versions` (per quote) | Built (map 06 R3) |
| `quote_xrays` | Quote X-Rays | `quote_comparisons` | Built (map 10) |
| `quotes` | Quotes — 33 columns (see §2.3) | `quotes` | Built (map 06) |
| `refund_requests`<br>`refund_reasons` | Lead returns and their reasons | `lead_returns` · `return_attachments`; the seven reasons in code (`lib/leads/return-model.ts`) | Built (Leads R3) |
| `render_consultation_requests`<br>`render_jobs`<br>`render_share_links` | Client call-backs, render jobs, render share links | Same names (richer) | Built (map 17) |
| `studio_assemblies` | Packages | `price_book_sections` | Built (map 04 · 14) |
| `studio_assets` | Logo, badge, signature, document image, font | `settings.brand.kit` · `members.signature_*` · `studio_fonts` | Built (S11) |
| `studio_checklist_items`<br>`studio_competitor_list`<br>`studio_objection_responses`<br>`studio_scope_questions`<br>`studio_materials`<br>`studio_invitations`<br>`studio_verifications` | Co-pilot checklist, competitors, objection answers, the question bank, materials, invitations, the Qanvast listing application | Same names | Built (S23 · REG-612 · map 17 · S09 · S37) |
| `studio_companies` | Legal entities (+ tax rate, numbering) | `settings.brand.details.entities[]` | Built (map 12) |
| `studio_document_templates` | Document templates (quote PDF · invoice · PO · VO · T&Cs · contract · timeline) | `quote_templates` (+ versions) · `contract_templates` · `quote_text_templates` · `settings.invoice_paper` · PO paper (`cost_rules`) · `schedule_templates` | Built (maps 04 · 08 · 24) |
| `studio_last_active`<br>`usage_events`<br>`usage_daily_rollup` | Usage telemetry: events, daily rollups, last active | — (card `studio:studio-health`) | Card queued (S39) · Excluded where it is OpenMaison's fleet view |
| `studio_lead_funnel` | The lead funnel | Fixed stages + `lead_stage_rules` · `stage_movement` | Built (S05) |
| `studio_material_catalog` | The material catalogue (a sandbox) | Catalogue as data (`lib/visualizer/data/catalogue.gen.ts`) | Built (map 17) |
| `studio_member_requests` | Member-add requests to OpenMaison | Invitations (`studio_invitations`); a task's ask → bell `invite_requested` | Built (S09) |
| `studio_portfolio_projects`<br>`studio_portfolio_images` | The studio's portfolio projects (Qanvast Ops › Portfolio; read by the co-pilot) | `member_portfolio_*` + the studio's completed projects (Past projects) | Built (S16 · S23 · S27) |
| `studio_price_book` | The price book | `price_book_items` (one row per vendor) | Built (map 14) |
| `studio_price_book_categories` | Read by `api/price-book/parse` but **created by no migration** (a broken reference) | — | Dead in 1.0 |
| `studio_quote_categories` | Quote categories (+ subcategories, descriptions) | `settings.trades` · `settings.trade_notes` | Built (map 04) |
| `studio_quote_theme_presets` | Theme presets | House styles in code (`lib/templates/presets.ts`) | Built (templates Q-03) |
| `studio_roles` | Custom roles and permissions | Five fixed roles (`members.role`) | Decided — roles editor held (Q-40) |
| `studio_sequences` | Number sequences (project · invoice · receipt · credit note) | Settings keys `project_numbering` · `invoice_numbering` · `receipt_numbering` · `ticket_numbering` (+ `project_numbers_given`) | Built (map 24 §4) |
| `studio_signing_documents` | The signing-document library | `contract_templates` (+ kind `pdf`, `contract_template_files`) | Built (S03) |
| `studio_taxonomies` | The studio's lists (lead sources …) | `settings.lead_sources` and the other settings lists | Built (map 12) |
| `studios` | The studio row — name, owner, plan, portal slug, region, verification status, `settings` JSON (see §2.3) | `settings` keys (`studio` · `brand` · `portal` · …), `portal_addresses`, `studio_verifications` | Built (map 12 · 24) |
| `tasks`<br>`task_assignees` | Tasks and their assignees | `lead_tasks` · `task_assignees` | Built |
| `variation_orders` | Variation orders | `quotes` with `kind = 'variation'` | Built (map 24 §3.6) |

### 2.2 Only on the newer branches (plg 28 · qanvast 2)

| 1.0 table(s) | What it holds | 2.0 home | Status |
|---|---|---|---|
| `anon_workspaces` | (plg 315) An anonymous visitor's workspace (leads · one quote read · visualizer payloads) until claimed at sign-up | — | **MISSING** with the feature (M-01) |
| `billing_checkout_sessions`<br>`billing_webhook_events`<br>`billing_trial_redemptions`<br>`credit_ledger`<br>`studio_credit_balances`<br>`studio_member_credit_caps` | (plg) Checkouts, Dodo's webhook events, one Pro trial per owner phone, the credits ledger, balances, members' caps | `billing_checkout_sessions` · `credit_ledger` · `studio_credit_balances` · `studio_member_credit_caps` (same names); one trial per studio (`lib/credits/checkout.ts` `hadTrial`); webhook events = the platform's | Built (map 21 · S19) |
| `contracts`<br>`contract_templates` | (plg) 1.0's port of 2.0's contracts | Same names | Built |
| `file_comments`<br>`import_rows`<br>`imports`<br>`lead_file_renders`<br>`lead_notes`<br>`note_attachments`<br>`questions`<br>`stage_logs`<br>`tags`<br>`task_attachments`<br>`task_comments`<br>`task_tags`<br>`task_templates`<br>`template_tasks`<br>`library_folders`<br>`render_annotations`<br>`visualizer_designs` | (plg) 1.0's ports of 2.0's own tables | Same names | Built (2.0's originals) |
| `lead_document_signature_requests` | (qanvast 426) A lead file sent to the client to sign | `contracts` (an uploaded contract with its PDF) | Built in another form (§4 note 4) |
| `nudge_state` | (plg 432) Per-member upgrade-nudge state (which once-ever triggers were shown, the last modal, active seconds) | — | **MISSING** with the feature (M-02) |
| `price_book_vendor_prices` | (qanvast 425) Per-vendor prices on one item | One `price_book_items` row per vendor (D-158) | Built in another form |
| `refund_request_attachments` | (plg) A return's evidence files | `return_attachments` | Built |

### 2.3 Notable column groups (the wide tables)

Every column of these tables is mapped in the module's migration map; the groups below are the ones that change shape on the way.

| 1.0 table · column group | 2.0 | Status |
|---|---|---|
| `leads` · contact, property, budget, style, `area` · `area_sqft` · `ic_number` · `customer_id` · `qanvast_lead_id` · `property_address` · `key_collection_date` | `leads` columns of the same meaning (`budget_minor`, `condition`, `key_collection`, `lead_address`); a commercial lead's `company_name` · `company_uen` (S05) | Built (map 02 §2) |
| `leads` · `bucket` · `lead_status_code` · `sub_status_code` · `engagement_state` · `hold_prev_state` · `hold_restart_date` · `closed_reason_*` | `stage` + `stage_logs` (the On Hold log's follow-up, the Lost log's reason / competitor / restart) + `settings.lead_reasons` | Built (map 02 · REG-607) |
| `leads` · `next_follow_up_date / time` | the earliest dated open Follow-up task (`lead_tasks`) | Built (REG-608) |
| `leads` · `first_assigned_at` · `first_outreach_at / by` · `signed_at` | derived (`lib/leads/insights.ts` `factsFrom`) | Built (REG-611) |
| `leads` · `temp` · `temp_reason` · `ai_fit_score` · `ai_intent_score` · `ai_reason` | — | Decided — DEF-09 (no temperature, no scoring) |
| `leads` · `ai_draft_message` · `ai_draft_generated_at` | Maison AI's stage drafts by rule (`lib/maison-ai/drafts.ts`) | Rule (S10) |
| `leads` · `email_lead_status` · `email_source_message_id` · `needs_attention` · `possibly_duplicate` · `duplicate_of_lead_id` | Review imported leads (`imports` · `import_rows`) + `findDuplicateLead` | Built (REG-609) |
| `leads` · `external_lead_id` · `ad_metadata` | Lead capture (`captureLead`, the webhook's idempotency, Meta Lead Ads) | Seam (Q-36) |
| `leads` · `archived_at` · `journey_overrides` | `deleted_at` + `delete_reason`; Journey out | Decided — DEF-03 · DEF-04 |
| `leads` · `company_id` · `quote_data` · `quote_metadata` · `quote_hierarchy_metadata` · `quote_status` · `quote_valid_until` · `signature_request_id` · `contract_*` | each quote's own columns (copied onto every quote at the port, D-101); the lead's quote state derived (Q-03); contracts | Built (maps 06 · 08) |
| `leads` · `owning_manager_id` | `members.manager_id` | Built (REG-601) |
| `projects` · 62 columns (`timeline` JSONB, `closure_*`, `stage`, `budget_*`, `company_id`, `contract_file_*`) | `projects` + its lead + `project_milestones` + `project_schedule_shares`; the ending columns | Built (map 24 §3.1–3.3) |
| `projects` · `satisfaction_*` · `commission_*` · `notes` · `closure_summary` · `ai_plan_metadata` · `country_code` | the port log; notes → one lead note; commission → `commission_rules` / shares (F2); the closing summary (REG-1174) | Decided — map 24 D-13 |
| `quotes` · 33 columns (`is_primary` · `doc_sections` · `preview_token*` · `parsed_doc_metadata` · `rejection_comment`) | `quotes` (+ `view_token*` · `confirm_token` · `review_note` · `prepared_json`); `is_primary` superseded; `parsed_doc_metadata` not ported | Built / Decided (map 06 · Q-03 · D-200) |
| `studios` · `name` · `owner_id` · `plan_id` · `portal_slug` · `logo_url` · `verification_status` · `chat_identity_*` · `lead_sources` · `setup_completed_at` | `settings.studio` · `subscriptions` · `portal_addresses` · `settings.brand` · `studio_verifications` · `settings.lead_sources` · `studio_setup` | Built (maps 12 · 24 · S08 · S37) |
| `studios` · `country_code` · `currency_code` · `locale` · `timezone` · `supported_countries` | — (Singapore, S$, en) | Parked by her (S33 · S38) |
| `studios.settings` · `branding` · `features` · `workflow` · `journey` · `client_portal` / `portal` · `numbering` · `bank_details` · `taxRate` · `aboutUs` · `aboutTeam` · `invoiceApproval` · `poSettings` · `proactiveAlerts` · `notifications_paused` · `page_visibility` · `enabledAccreditationIds` · `quoteDocumentTemplates` · `visualizerWorkspace` · `defaultPaymentSchedule` · `setup_last_step` | `brand` · the switches' homes (row `studio-config/features`) · `stage_movement` / `lead_stage_rules` / `quote_approval` · `lead_reasons` · `portal` / `portal_sections` / `portal_welcome` · numbering keys · entities · `studio.gstPct` · `studio_about` + `studio_pictures` · `project_invoices` · `cost_rules` · REG-1222's lead time (Proactive Alerts' tab itself was dead, H-Q27) · Qanvast Ops › Studios (`platform`) · brand kit badges · `quote_templates` · `visualizer_designs` · `payment_templates` default · `studio_setup` | Built / Decided (page visibility = Platform admin) |
| `studios.settings.cost_visibility` (qanvast) | — | **MISSING** (M-03) |
| `studio_members` · `tags` · `role_id` · `permission_overrides` · `workflow_overrides` | `members.role` (five fixed roles); overrides superseded | Built / Decided — Q-40 |
| `studio_members` · `close_rate` · `active_projects_count` · `projects_last_12_months` | derived (`lib/company/members.ts` `fetchMemberStats`) | Built (REG-612) |
| `studio_members` · `invitation_status` · `invited_at` · `invited_by` | `studio_invitations` | Built (S09) |
| `profiles` · `full_name` · `email` · `phone` · `avatar_url` | `members` (`name` · `email` · `phone` · the photo in `members.color`, S01) | Built (S01) |

## 3. Missing

Four things, every one from 1.0's newer deployment branches, which no card read for these (the 41 cards' surveys read `integ/security-non-qanvast`; S19 and S21 read plg for their own modules only).
Each is in Vicky's lane (it shows on screen): it needs her call before anyone builds it.

### M-01 · Try the tools without an account, and keep the work at sign-up (plg)

- **What it does / holds.** 1.0's "gated acquisition" (`docs/superpowers/specs/2026-09-21-gated-platform-acquisition-design.md`): every module
  page's **Try now** opens the real tool with no sign-in. Open to a stranger: the Dashboard, **Leads** (up to 3 leads — the 4th opens the
  account gate), the **AI Visualizer**, **Quote X-Ray** and the **Quote Digitizer** (one free quote read); Projects, Tasks, Finance, the 3D
  planner, the portal set-up and the co-pilot show a wall. The visitor's work lives in `anon_workspaces` (a signed `om_anon_v1` cookie,
  `payload` namespaced per surface, `spent_tokens`, 7 days), bounded by Turnstile and per-workspace ceilings; **on sign-up the workspace is
  claimed** into the new studio by one materialiser per surface (`src/lib/anon/claim-on-login.ts`, `materialisers/{leads,quote-digitizer,visualizer}.ts`).
  Two crons purge expired workspaces (`anon-sweep`) and their files (`anon-storage-gc`). Routes: `anon/{session,leads,quote-digitizer,storage/upload,workspace/visualizer}`.
- **In 2.0 today.** Only the Visualizer half: `/site/try` (S36) runs the studio's own editor for a visitor (3 renders, the photo carries into the
  new studio's Visualizer). The website's module pages (S35) offer **Book a demo**, not Try now; no anonymous Leads, X-Ray or quote read; nothing
  is claimed at sign-up beyond the trial photo.
- **Its 2.0 home.** The website's module pages' primary (`/site/platform/<module>`); the studio's own Leads / X-Ray / Create Quote pages served
  to a visitor the way S36 serves the editor (one code path, `PUBLIC_PATHS` in `lib/auth/paths.ts`); the claim inside S31's `createStudio`
  (`lib/studios/create.ts`); a visitor table (or the trial's signed cookie, extended) and the two sweeps as `lib/services/sweep.ts` jobs.
- **Would a studio lose anything if it is never ported?** No studio data — it is acquisition (what a visitor did before they had a studio). The
  earlier scoping (AI credits audit §0.2, "the anonymous visitor tools and sign-up gates — excluded", from the Visualizer audit's Q-27) predates
  S35 / S36 building the website and the trial, so it needs her fresh call.
- **Rough size.** L (Leads and X-Ray / quote read for a visitor, the account gate, the claim; the Visualizer part exists).

### M-02 · The Free plan's upgrade nudges (plg)

- **What it does / holds.** 1.0's PLG upgrade triggers (`docs/rules/upgrade-nudges.md`, spec 2026-09-25): on Free, `POST /api/nudges/evaluate`
  (a heartbeat with the member's active seconds) picks **at most one** offer from 17 triggers — e.g. a first render kept, a first quote read
  with lines, welcome credits ending, a teammate joined, the balance crossing a threshold, a second visit to a locked page — and
  `POST /api/nudges/claim` grants it atomically just before a dialog opens at a **safe moment** (no typing, nothing in flight, no other modal,
  never on the purchase pages, never over a held pointer). Once ever per trigger, one modal lane, a kill switch (`UPGRADE_NUDGES_DISABLED`).
  Table `nudge_state` per member (`spent` triggers, `last_modal_at`, `last_proactive_at`, `active_seconds`, a compare-and-set `version`).
- **In 2.0 today.** S19's plan locks (Pro tag, `ProLocked`, `requirePlan`), the out-of-credits sheets and asks, auto top-up, the 14-day trial.
  Nothing offers an upgrade before a wall is hit.
- **Its 2.0 home.** The credits store and host (`components/credits/credits-client.ts`, `credits-host.tsx`, the Plans dialog), triggers read
  from records 2.0 already keeps (`credit_ledger`, `members`, the plan); per-member state as a table or `members` columns.
- **Would a studio lose anything?** No data; it is OpenMaison's conversion work. Her call whether 2.0 should nudge at all.
- **Rough size.** M.

### M-03 · Cost & Margin Visibility per role (qanvast)

- **What it does / holds.** Accounts › Studio › **Cost & Margin Visibility** (`docs/features/cost-visibility/spec.md`, the Qanvast line,
  2026-09-30): the Owner switches cost price, markup % and margin **off per role** (Admin · Interior Designer · Accounting; Owners always see
  them). Every read strips cost for a hidden member — quote lines, versions, packages, templates, the price book and its history, tiers,
  vendors' default markup, the CSV export, the finance P&L / profitability / margin reports, the AI tools — and every save **keeps the stored
  cost** a hidden member never saw. Stored in `studios.settings.cost_visibility` (no table); routes `studio-config/cost-visibility` GET · PUT.
- **In 2.0 today.** Cost figures follow the role: profit, margin and cost totals for Owners, Admins and Accounting (`lib/finance/rules.ts`
  `seesCostFigures` = `seesBooks`), and the Rebate column is owner-only — but **a Designer always sees a quote line's cost and markup** in the
  editor and the price book. No switch.
- **Its 2.0 home.** Settings › Roles & access › *Who may do what* (a row with a switch per role) or Settings › Quotes & pricing; a settings key;
  the projection at each loader (`lib/quotes/editor.ts` `fetchQuoteEditor`, `lib/company/price-book.ts` `fetchPriceBookData`, the exports,
  `lib/finance/*`) with the keep-stored-cost rule on `app/quotes/items-actions.ts` and `app/company/price-book-actions.ts`.
- **Would a studio lose anything?** Yes — a Qanvast-line studio that hid its costs from designers would have them shown after the port: a
  confidentiality regression on its commercial numbers. The setting itself is one JSON key (no rows to lose).
- **Rough size.** M–L (many read paths, each needing the projection and a probe).

### M-04 · Qanvast Ops › Lead credits and Reviews & Rankings (qanvast)

- **What it does / holds.** On `origin/deployment/qanvast`, Qanvast Ops has real pages behind 2.0's two signpost tabs: **Credits** — the
  studio's lead-credit balance, *Leads received vs credits used* by month, its contracts with entitlements (e.g. Photoshoot, Social Media
  Posting), the leads per contract and the month's transactions (`src/app/(main)/qanvast-ops/credits/{page,contracts,leads,transactions}`);
  **Reviews & Rankings** — the studio's Qanvast reviews with ratings, reply to a review, its ranking, *Request reviews* by WhatsApp, and Feedback
  over 30 / 60 / 90 days (`qanvast-ops/reviews/{page,feedback}`, 1,291 + 337 lines). The data is Qanvast's, read through the line's proxy
  `api/qanvast/[...path]` (no 1.0 table).
- **In 2.0 today.** Qanvast Ops' **Lead credits** and **Reviews** tabs answer Coming soon (the mock 931:49232 draws them; REG-193, REG-1372).
  S16 decided "nothing to port — `src/app/(main)/qanvast-ops` is gone from 1.0" (REG-1835): true of the working tree, **not of the Qanvast
  line**, which still ships them.
- **Its 2.0 home.** Those two tabs (`components/qanvast/qanvast-tabs.ts`), fed through the `qanvast` / `feeds` seams (`lib/services/feeds.ts`
  `setFeedSource`); Request reviews beside Company › Profile › Reviews' link (S14).
- **Would a studio lose anything?** A Qanvast-line studio loses the view of its credits and reviews inside OpenMaison; the records stay at
  Qanvast. Needs mocks (or her direction to build on house pieces).
- **Rough size.** L (two pages, a feed contract per page).

## 4. Notes

1. **Nothing missing on the working tree.** Its 628 routes and 177 tables all land somewhere: most in a built 2.0 home; the stand-ins in the
   registry (36 entries in `lib/services/registry.ts`); the rest under a recorded call (Journey and Archive out, roles editor held, price tiers Q-06, market data and brand
   research the platform's, client to-dos (the gaps build's call M-03, not this file's M-03), satisfaction D-13 …), dead in 1.0, excluded as Platform admin / fleet / dev, parked (countries),
   or queued (S39 Studio Health — usage events, rollups, `usage/*`; S41 the two render sandboxes).
2. **S37's question — does the brand kit cover 1.0's accreditation catalogue?** Not as a catalogue. 1.0 ships eight ready badges
   (`platform_accreditation_badges` + `public/badges/*.svg`: HDB LRP, bizSAFE Star, bizSAFE Level 4, CaseTrust, CaseTrust + RCMA, SDIDA,
   Qanvast Trusted, Qanvast Supertrust) that a studio switches on. 2.0's kit badges are the studio's own uploads, and the templates audit's Q-15
   decided the port copies each studio's **enabled** badges' images into its kit (nothing a ported studio shows is lost). A new 2.0 studio
   can't pick from ready badges, and Company › Profile's Registrations list CaseTrust, HDB, bizSAFE Enterprise, BCA and ACRA — not SDIDA,
   CaseTrust + RCMA, bizSAFE Star / L4 or Qanvast's two. Offering the eight as picks in the kit would be a small add (S) if she wants it.
3. **S16's premise.** See M-04 — the Qanvast line keeps Qanvast Ops' Credits, Leads and Reviews pages and the `api/qanvast/*` proxy.
4. **Sign any lead file (qanvast) is covered in another form.** The Qanvast line lets a studio send any PDF / PNG / JPEG in a lead's Files for
   signature (`lead_document_signature_requests`, `/sign/document/<token>`, an appended certificate page, never moving the stage). In 2.0 the
   same job is Contracts › Import a PDF → Send for digital signature (`attachContractPdf`, `sendContract`). Differences for Vicky: no *Send for
   signature* on a file's ⋮, and pictures can't be signed (PDF only).
5. **For the developers (no screen change):** a real image model behind `runPass` needs 1.0's render stash (`render/stash/[runId]` + claim —
   a paid render that finishes after its tab closed is kept and claimed once); the website's three forms record no acquisition data (plg
   migration 454's `acquisition` + `first_touch_source`, read by Platform admin's Leads); 1.0 allows one Pro trial per **owner phone**
   (`billing_trial_redemptions`), 2.0 one per **studio** (`lib/credits/checkout.ts` `hadTrial`).
6. **1.0's own loose ends (nothing to port):** `copilot_summary_entries` is read and locked but created by no migration;
   `api/price-book/parse` reads `studio_price_book_categories`, which no migration creates; the double-entry journal (`chart_of_accounts` ·
   `journal_entries` · `journal_lines`) is written only by `generate-invoices` and read by no screen.
7. **A port should still count rows in the "dead" tables** (`homeowner_moodboard_items`, `studio_portal_pages`, `project_snag_items`,
   `project_templates`, the legacy `quote_templates`, `ai_query_log`, `lead_categories`, `pipeline_stages`, the journal): no 1.0 code reads
   them today, but an older build may have written rows. Any found go to the port log, as map 24 does for `satisfaction_*`.

## How this was checked

- The route list came from the file tree (`find src/app/api -name 'route.*'` → 628; `git ls-tree` on each branch → plg 775, qanvast 636, diffed
  against the tree); methods from each file's exports; a route's purpose from its header comment and code, checked against the module's 1.0
  inventory. A no-screen-caller scan (`/api/<path>` with dynamic segments, outside `src/app/api` and tests) flagged 54 routes without a UI
  caller; those not otherwise explained were opened (the satisfaction / line-comment / preview-login routes match projects I-412).
- The table list came from every `CREATE TABLE` in both migration sets (175 on the tree; plg +28, qanvast +2), plus the code's `.from('…')`
  reads (2 tables no migration creates).
- 2.0 homes were confirmed by opening the files: the exports of all 106 action files, `lib/db/schema.ts`'s 158 tables and their columns, the
  read functions named (`fetchLeadDetail`, `fetchProjectDetail`, `fetchMoneyNeeds`, `fetchMeetingRoom`, `renderOrigins` …), the route
  handlers, `lib/services/registry.ts` + `sweep.ts`, the settings-key constants (`*_KEY`), and the old-link redirects (`app/{pay,quote-preview,
  copilot,floor-plan,hangouts,login,onboarding,verify,sign/quote-xray}`).
- Decisions were taken from the migration maps 02 · 04 · 06 · 08 · 10 · 12 · 14 · 17 · 21 · 24 (+ addendum), map 28's 1,094 rows and
  `built.json`, the Projects coverage review (`26-…/7-coverage.md`), the gaps-build reads / outcomes, and outcomes S01…S37.

