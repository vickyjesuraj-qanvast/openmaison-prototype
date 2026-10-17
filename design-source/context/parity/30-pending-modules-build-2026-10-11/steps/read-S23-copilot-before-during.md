# Meeting Co-Pilot (BEFORE + DURING): behavioural inventory

Repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool`. All paths below are relative to `src/`. I read every listed file in full. For the capture and STT libraries I read only enough to summarise them.

## 0. The short version

**What the feature does.** A designer picks a lead and confirms that the client has been told about the AI. They then pick a meeting type and say whether it is in person or a video call. The meeting goes live:
- Audio is transcribed: streaming Deepgram, or Gemini on 20-second chunks as a fallback.
- Every ~25s an LLM pass (Gemini 2.5 Flash) produces:
  - coaching cards
  - deal-score signals
  - quote line items
  - checklist ticks
  - tags
  - summary cards
  - mood-board prompts
  - objection and competitor classification
- Regex "fast-path" rules add instant cards and deal signals, but only from what the client says.
- The browser polls everything every 3s.

At the end, the session is marked ended and a brief is generated from the client side. "Create draft quote" on the brief turns the shadow items into a real draft quote.

**Things a rebuilder must know (verified in code):**
1. **No credits or metering anywhere.** Nothing is charged, reserved or refunded. The only thing recorded is usage-tracking events (`track(...)`) on session start and end. Detail in §17.
2. **The rate tables never price items.** `estimateItemPrice()` (`lib/copilot/quote-estimator.ts:110-147`) is never called. Every line-item price comes from the LLM, which is told to "Use {country} market rates" (`context-engine.ts:486-488`). The tables are used only to scale the default upsell values to the studio's country (`quote-estimator.ts:189-200`).
3. **Checklist keywords do nothing.** `detectionKeywords` (`data/copilot-checklists.ts`) is stored but no code reads it for ticking. Ticks come only from the LLM returning item IDs (`context-engine.ts:516-520`), or from a manual tap.
4. **Studio custom checklist items never reach a live meeting.** They can be created and edited in Settings (`/api/copilot/checklist-items`), but `mergeCustomChecklist` (`copilot-checklists.ts:408`) is never called. The live checklist is the platform defaults only (`copilot-session.tsx:180-183`).
5. **The free-text objective is never captured.** `objective-step.tsx:61` declares `objective` state, but there is no input for it, so `meeting_objective` is always null.
6. **Saved deal weights break the score.** Settings saves weights as whole-number percentages that sum to 100 (`app/(main)/accounts/page.tsx:3729,3812`), e.g. budget 25. `computeDealScore` expects fractions such as 0.25 (`deal-scoring.ts:49-57`) and is fed the custom weights in `analysis-pass.ts:212-215,542`. Any studio that has saved weights will get scores about 100× too high. The fast-path scoring ignores custom weights altogether (`ingest-transcript.ts:81`).
7. **Client budget and headroom never show in a real meeting.** Poll passes `customerBudget = null` (`poll/route.ts:117`). `customer_budget` is only set when a budget signal has an `evidence` string containing "$" (`analysis-pass.ts:633-644`), but `parseDealSignals` drops `evidence` (`context-engine.ts:116-121`). Only demo mode shows a budget.
8. **"Ask Copilot" cannot see the transcript.** It posts to the general `/api/buddy` chatbot with only the customer name, meeting type, earlier Q&A and any competitor-quote summary (`copilot-session.tsx:223-289`). So "Generate Quote from Conversation" and "Suggest Add-ons" answer without the conversation. Buddy also caps answers at 600 tokens and allows 10 requests a minute per IP (`app/api/buddy/route.ts:39-40,98`).
9. **Components that are never mounted:** `copilot-feed.tsx` (only its markdown helpers are used), `tag-overlay.tsx`, `estimate-export.tsx`, `FloorPlanNotesPanel`/`FloorPlanCanvasModal` in `floor-plan-notes.tsx` (only the `DrawElement` type is imported), and the combined `DealScore` toggle. The tier-change whisper cards (`TIER_WHISPERS`, `shouldTriggerScoreCard`, `getWeakestDimension` in `deal-scoring.ts:25-135`) are also unused.
10. **Feature toggles only control the desktop tools strip** and the competitor-upload button. Coaching, the deal score (whose default is OFF) and the checklist always show on desktop. Mobile ignores the features entirely. Details in §2.

---

## 1. BEFORE: entry points and steps

### 1.1 Entry points
- **Meeting Copilot landing page** (`/tools/copilot-analytics`, `components/copilot/meeting-copilot-landing.tsx`). It has three cards:
  - "Start Meeting Copilot". Description: "Live AI co-pilot for in-person meetings. Real-time coaching cards, objection prompts, a live deal score, and an auto-generated brief that syncs to the lead or project." Button: "Start Live Meeting".
  - "Analyze a Recording". Description: "Already recorded the meeting? Upload an audio file…". Button: "Upload Recording".
  - "Meeting Insights". Button: "View Insights".
  - Footer: "Briefs from both live sessions and uploaded recordings appear under the linked lead and project."
  - If the page is turned off for the studio, the toast is "Co-pilot is disabled for your studio." (`:32-38`).
- **Lead drawer** (`components/leads/lead-detail-drawer.tsx`):
  - A Mic icon in the header, aria/title "Start Live Meeting" (`:2389-2398`). This opens the consent dialog directly; the lead is already known.
  - The journey's Site Visit step offers "Start Live Meeting" as its tool (`:1830`).
  - If the page is off, the toast is "This tool is turned off for your studio" with "A studio owner can enable it in the workspace's page settings." (`:303-308`).
- **Project card** (`components/projects/meeting-summary-card.tsx`): a "Log Meeting" dropdown with "Launch Co-pilot" ("Live transcription & insights") and "Upload recording" ("Transcribe an existing audio file"). If the project has no lead, the toast is "This project isn't linked to a lead yet — Upload recording works without one, or open the lead to start a live session." (`:61-68`).
- **Quick Actions menu**: "Start Meeting". This shows the consent dialog and then just navigates to `/leads`. It does not start a session (`layout/quick-action-menu.tsx:18,56-63`).

### 1.2 Lead or Project picker (`lead-or-project-picker-dialog.tsx`, landing flow only)
- Title "Start a live meeting". Description "Pick the lead (or project) this meeting is for. The brief will sync there when the session ends." Submit "Continue". The `requireLead` flag is set (`meeting-copilot-landing.tsx:99-107`).
- A toggle between "Lead" and "Project". Switching resets the selection.
  - Lead tab: "Select a Lead" / "Choose a lead…" / empty "No active leads". Lists leads whose `bucket !== "CLOSED"` (`:49-52`); the sub-label is the lead type.
  - Project tab: "Select a Project" / "Choose a project…" / empty "No active projects". Lists projects whose `stage !== "Closed"` (`:53-56`).
- Choosing a lead also attaches that lead's first non-Closed project, if it has one (`:74`).
- A project with no linked lead shows "This project isn't linked to a lead yet. Live co-pilot requires a lead — pick a lead instead, or upload a recording." and Continue is disabled (`:95-101,181-185`).
- Buttons: "Cancel" and the submit label.
- The landing page also guards this: if there is no leadId, the toast is "Live co-pilot needs a lead. Pick a lead, or analyze a recording instead." (`meeting-copilot-landing.tsx:40-44`).

### 1.3 Consent dialog (`consent-dialog.tsx`)
- Title: "Recording Reminder".
- Body: "Before starting the AI co-pilot{ with <customerName>}, please ensure the customer has been informed about the AI assistant."
- A boxed disclosure (`:23-26`): "I will be using an AI assistant during our meeting to help provide you with the best recommendations. The assistant will listen to our conversation to generate helpful suggestions for me. Your privacy is important — the recording is only used during the session and is not shared with third parties."
- Checkbox: "I have informed the customer about the AI assistant". It is required: "Start Meeting" stays disabled until it is ticked (`:78-83`).
- **On decline** ("Cancel", or closing the dialog): the checkbox resets, `onClose` runs, and nothing is created on the server. The landing page resets its flow; the drawer and card just close the dialog.
- **On confirm**: it returns `{consentAcknowledgedAt, disclosureText}`. The mounting surface keeps only `disclosureText`. The launcher always sends `consentAcknowledged: true` and does not forward the timestamp, so the server uses `now()` (`copilot-session-launcher.tsx:66`, `session/route.ts:107`).

### 1.4 Objective step (`objective-step.tsx`, shown full-screen by the launcher)
- The Prep Card sits at the top in compact form (`copilot-session-launcher.tsx:111`).
- Header: "Meeting with {customerName}" (or "New Meeting"), then "What's this meeting about?".
- **Aim choices** (a 2-column grid; one must be picked to start) (`:45-57`):

  | Value | Label | Description |
  |---|---|---|
  | `first_consultation` | "First Consultation" | "Initial meeting with prospect" |
  | `follow_up` | "Follow-up" | "Continuing a prior discussion" |
  | `site_visit_debrief` | "Site Visit Debrief" | "Reviewing site visit findings" |
  | `quote_presentation` | "Quote Presentation" | "Presenting pricing & scope" |
  | `closing` | "Closing" | "Finalizing the deal" |
  | `other` | "Other" | "General meeting" |

- **Meeting kind** (default "In person") (`:35-43`):
  - "In person": "Everyone in the room, one mic".
  - "Virtual call": "Meet, Teams or any browser call".
  - Choosing Virtual shows two notes (`:133-152`):
    - "You'll be asked to share your meeting tab. Tick **"Also share tab audio"** — that's how the copilot hears your client. Works in Chrome and Edge."
    - "**Use headphones.** On speakers your mic also picks up your client, and the copilot can't tell you apart."
- Buttons:
  - "Start Meeting" (disabled until an aim is chosen).
  - "Skip": starts with no aim. The checklist then has only the universal item, and the prompt gets no objective block.
- The free-text objective is never captured (see §0, item 5).

### 1.5 Launcher (`copilot-session-launcher.tsx`)
- Three phases: objective → creating ("Starting session...") → live.
- Features are resolved silently with `resolveSessionFeatures(userId)` (`lib/copilot/feature-prefs.ts:26-44`): the localStorage key `copilot_feature_prefs_{userId}` if present and valid, otherwise the defaults. The "Customize Your Session" picker was removed (`:48-56`).
- Feature list and defaults (`data/copilot-checklists.ts:43-98`). `auto_notes` is always on and is not in the list.

  | Feature | Label | Default |
  |---|---|---|
  | `live_quote` | "Live Quote Generator" | ON |
  | `checklist` | "Smart Meeting Checklist" | ON |
  | `portfolio_search` | "Portfolio Search" | ON |
  | `coaching` | "Live Tips & Coaching" | ON |
  | `deal_scoring` | "Deal Scoring" | off |
  | `moodboard` | "Mood Board Generation" | off |
  | `competitor_analysis` | "Competitor Quote Analysis" | off |
  | `recommended_addons` | "Recommended Add-ons" | off |
  | `floor_plan_notes` | "Floor Plan Notes" | off |

- It calls POST `/api/copilot/session` with `{leadId, projectId, mode:"audio", consentAcknowledged:true, customerName, disclosureText, meetingObjective, meetingObjectiveType, selectedFeatures}`.
- If creation fails it goes silently back to the objective screen; there is no toast (`:80-84`).

### 1.6 Prep card: what it shows and where each fact comes from (`prep-card.tsx`)
Data sources:
- `lead`: from the app context leads list.
- `lastSession`: the newest *ended* copilot session for this lead (`:65-70`).
- `lastBrief`: the newest meeting brief for the lead (`briefs[0]`), and its `customerProfile`.

Content, top to bottom:
- **Header**: "Meeting Prep — {lead.name}".
  - Right side: "Today" or "{n}d ago", the days since the last ended session's `createdAt`, plus "({last objective type with underscores replaced by spaces})".
- **"Last Meeting Summary"**: `lastBrief.summary`, plus "{n} meetings total" when there is more than one brief.
- **"What We Know"** (the profile wins over the lead record) (`:91-130`):
  - Property = `profile.propertyType || lead.type`, with " · {profile.propertyArea || lead.area}".
  - Budget = `profile.budgetRange` shown as "{sym}min – {sym}max". Otherwise `lead.budget>0` as "{sym}N". Otherwise the `profile.budget` text. Otherwise "Mentioned". The symbol comes from the region config for the passed countryCode.
  - Style = `profile.stylePreferences`, otherwise `lead.stylePreference`.
  - Timeline = `profile.timeline`.
  - Decision makers = `profile.decisionMakers`.
- **"Still Unknown — Ask About"**: a chip for each missing fact. The chips are "Property type & size", "Budget", "Style preferences", "Timeline / key collection" and "Decision maker(s)".
- **"Key Concerns to Address"**: `profile.keyConcerns`.
- **"Competitors Mentioned"**: `profile.competitorsDiscussed`.
- **"Suggested Focus for This Meeting"**: the first 3 of `lastBrief.suggestedActions`, numbered.
- **"Deal Temperature (from last meeting)"**: shown only if `lastBrief.dealScore > 0`.
  - The score, then a tier chip: ≥80 "Hot", ≥60 "Warm", ≥40 "Cool", otherwise "Cold".
  - Then the tier line:
    - "— Ready to close, push for commitment"
    - "— Interested but has reservations to address"
    - "— Still exploring, focus on building trust"
    - "— Early stage, focus on understanding needs"
  - Each dimension gets a bar (≥70% green, ≥40% yellow, otherwise red) and a line: high if ≥60%, otherwise low (`:34-41`).

    | Dimension | High | Low |
    |---|---|---|
    | budget | "Budget aligns with scope" | "Budget not confirmed" |
    | trust | "Good rapport established" | "Trust still building" |
    | decision | "Decision maker engaged" | "Decision maker unclear" |
    | timeline | "Clear timeline" | "No timeline urgency" |
    | style | "Style direction clear" | "Style undecided" |
    | scope | "Scope well-defined" | "Scope unclear" |

- If there is no brief and the card is not compact: "No previous meeting data. This will be enriched after your first copilot session." The launcher uses compact mode, so this note never appears there, and the card always renders as long as the lead exists.

### 1.7 Session creation (POST `/api/copilot/session`, `app/api/copilot/session/route.ts`)
- Required: (`leadId` or `projectId`), `mode`, and `consentAcknowledged`. Otherwise 400.
- If `OPENROUTER_API_KEY` is missing: 503 "AI service not configured. Contact your administrator." (`:45-51`).
- If only a project was given, the lead is resolved from it.
- The caller's `studio_members.id` is resolved from `user_id`. A missing member gives 400 "Studio member not found" (`:84-94`).
- Inserts a **`copilot_sessions`** row (`:98-113`):
  - `lead_id`, `project_id`, `studio_id`
  - `id_user_id` (this holds the member id)
  - `customer_name` (default "Customer"), `mode`, `status:"active"`, `meeting_id`
  - `consent_acknowledged_at`, `consent_acknowledged_by` (member id)
  - `disclosure_text` (default "This meeting is being assisted by an AI tool.")
  - `meeting_objective`, `meeting_objective_type`, `stt_provider`, `selected_features`
  - If the DB reports `stt_provider` or `selected_features` as missing, that column is dropped and the insert retried (`:119-150`).
- Upserts **`copilot_session_state`** with `session_id, studio_id, country_code, currency_code` (taken from `studios`, defaults SG/SGD) and the objective columns (`:159-171`; `lib/copilot/session-state.ts:95-120`).
- Returns `{sessionId, startedAt, sttProvider}`. `sttProvider` is "deepgram" only when `COPILOT_STT_PROVIDER=deepgram` and `DEEPGRAM_API_KEY` are both set. Speechmatics is force-disabled (`lib/copilot/stt/index.ts:15-30`).

---

## 2. DURING: the live session shell (`copilot-session.tsx`)

### Status strip (`status-strip.tsx`)
- Left: a pulsing "LIVE" (audio mode) or "MANUAL"; the elapsed mm:ss; " · {customerName}" (desktop only).
- Middle:
  - A deal-score pill with the number. Its icon depends on tier.
  - "Quote {formatted estimateTotal}" (desktop only, shown once a quote summary exists).
  - A status chip, in this order of precedence (`:75-86`): "⚠️ Mic lost" (any mic error) > "🔄 Reconnecting…" > "🔄 Connecting…" > "🎙 Listening". The fallback chunk mode always reads Listening.
  - "🧠 analyzed {Ns/Nm/Nh} ago", refreshed every 5s.
- Right: a mic toggle (aria "Mute microphone" / "Enable audio") that switches audio and manual, and "End Meeting".

### Mic error banner (`copilot-session.tsx:1344-1397`)
Buttons on every banner: "Retry" (restarts capture) and "Use Manual Mode".

| Error | Title | Message |
|---|---|---|
| denied | "Microphone access denied" | "Please allow microphone access in your browser settings, then tap Retry." |
| not_found | "No microphone detected" | "Connect a microphone to your device, then tap Retry." |
| error | "Microphone error" | "Could not start audio capture. Check your device and try again." |
| tab_audio_lost (virtual) | "Screen share stopped — the client can no longer be heard" | "Your microphone is still recording, but the meeting tab's audio is gone. Tap Retry and re-share the tab with "Also share tab audio" ticked." |
| tab_audio_missing | "Tab audio wasn't shared" | "The client is heard through the meeting tab, not your microphone. Tap Retry, pick the meeting tab, and tick "Also share tab audio" before sharing." |

### End dialog (`:1401-1463`)
- Title "End Meeting?". Body "This will stop the AI co-pilot and generate a post-meeting brief."
- "Meeting outcome (optional)": "Converted", "Follow-up" or "Dropped". Tapping the chosen one again clears it.
- Buttons "Cancel" and "End Meeting".
- Ending: capture stops; `/api/copilot/end` is called with the outcome; brief generation starts from the client, then POST `/api/copilot/post-transcript` (`:732-748,796-830`).
- The ended view shows "ENDED", the timer, "Close", the brief, and a "Meeting Timeline".
  - If the brief fails: "Brief generation failed" / "We couldn't generate the meeting brief. Your transcript and cards are safe — try again." / "Retry brief".

### Leaving safeguards and wake lock
- A `beforeunload` prompt appears while live. On `pagehide` it sends `navigator.sendBeacon('/api/copilot/end', {sessionId})`, which ends the session with no outcome (`:758-794`).
- A screen wake lock is held and re-acquired when the tab becomes visible again (`:666-710`).
- Manual mode only stops capture. There is no manual note entry.

### Desktop layout (screens ≥lg, `copilot-desktop.tsx`)
- A row under the status strip with a "Floor Plan" button (title "Floor Plan Notes") and a badge counting annotations. It is shown regardless of the feature flag (`copilot-session.tsx:1085-1119`).
- **Left 34%: Transcript pane.**
- **Centre 38%: "Coaching" column.**
  - The CardStack.
  - A compact Q&A thread (questions, answers rendered as markdown, competitor cards).
  - Up to 3 suggested-question chips (cut to 50 characters + "..."). The defaults (`copilot-session.tsx:187-191`) are:
    - "How should I respond to their budget concern?"
    - "What's a good closing question for this meeting?"
    - "What items might be missing from the scope?"
  - A competitor-upload icon (title "Upload competitor quote"; image/* or .pdf), shown only with `competitor_analysis`.
  - Input "Ask Copilot anything about this meeting...", with an "Ask" button that shows "..." while busy.
- **Right 28%:**
  - Deal score, with explanations hidden.
  - Smart Checklist (compact).
  - A read-only "Tags" chip row when there are tags.
- **Tools strip** (300px tall). Tabs appear according to `selectedFeatures` (`:79-84`):
  - "Portfolio" (`portfolio_search`), "Mood Board" (`moodboard`), "Quote" (`live_quote`), "Add-ons" (`recommended_addons`).
  - "Assets" appears whenever any of those tabs is on or any asset exists.
  - With the default features the strip is Portfolio, Quote, Assets.
- While the floor plan is open: canvas 70%, coaching column only at 30%.

### Mobile layout (`copilot-mobile.tsx`)
- Compact strip with no name and no quote pill.
- Bottom tabs: "Live", "Quote", "Checklist", "More".
  - **Live**: transcript in the top 55%; card queue in the bottom 45%, at most 2 cards with the second dimmed.
  - **Quote**: the QuoteShadow panel shown inline.
  - **Checklist**: the full Smart Checklist.
  - **More**:
    - A "Visuals & Mood boards" button that opens the Visual Assist sheet. Its sub-line is "{n} asset(s) generated" or "Portfolio, mood boards & renders".
    - The deal pulse.
    - "Tags" (empty state "Tags appear here as the conversation is analyzed.").
    - "Session": "Customer" (or "—") and "Objective" (prettified type, or "General consultation").
- Badges: the Quote tab shows the item count. The Checklist tab shows a red count of unchecked critical items, but only after a closing signal (`:238-241`).
- Mobile has no Ask Copilot, no competitor upload and no floor plan.

### Background timers (client)
- Poll every 3s, using the newest server `createdAt` as a delta watermark (`lib/queries/copilot.ts:100-115`; `copilot-session.tsx:411-428`).
- Analyze every 25s, only if new finals are pending (`:479-483`).
- Portfolio matches every 15s (`queries/copilot.ts:430-441`).

---

## 3. Audio capture, transcription and speaker assignment

### In-person vs virtual
- **In person**: mic only (mono, echo cancellation and noise suppression on). Deepgram runs with `diarize:true`.
- **Virtual**: `startDualCapture` (`lib/copilot/dual-capture.ts`).
  1. Calls `getUserMedia` for the mic.
  2. Calls `getDisplayMedia({video:true, audio:{processing off}})`.
  3. If no audio track comes back it throws `TAB_AUDIO_MISSING`.
  4. Mixes into 2 channels: channel 0 is the mic (designer), channel 1 is the meeting tab (client).
  5. If the share stops, `onTabAudioEnded` raises the "tab_audio_lost" banner.
  - The token is minted with `multichannel:true`, which must be a strict boolean (`app/api/copilot/stt-token/route.ts:39`). Deepgram then uses `multichannel:"true", channels:"2"` instead of diarization.
- **Deepgram parameters for both** (`stt/deepgram-server.ts:19-50`): `model:"nova-3"`, `endpointing:"500"`, `utterance_end_ms:"1000"`, `interim_results`, `smart_format`, `punctuate`, `language:"multi"`. The token lives 60s (`:62`).

### Streaming path (`lib/copilot/stream-capture.ts`)
- The browser opens a WebSocket to Deepgram using the minted token.
- Interim text appears in italics. Finals get an id on the client and are painted immediately, then batched to POST `/api/copilot/transcript` every 3s (batches of up to 10).
- An empty-batch heartbeat goes out after 20s with no finals.
- Reconnects use exponential backoff (1s → 10s cap). After 5 attempts it reports `error` "reconnect_exhausted"; the attempt counter resets after 30s of stable connection.
- A parallel 60s MediaRecorder archives raw audio to `/api/copilot/audio` with `archiveOnly:true` (`:80-87`).
- Utterances are split on speaker change within a final (`stt/split-final.ts`), and one utterance is capped at 60 words (`stt/utterance-buffer.ts:80`).

### Fallback path (`lib/copilot/audio-capture.ts`)
- When no streaming provider is configured, the mic is recorded in 20s stop-and-restart WebM chunks and each chunk is posted as base64 to `/api/copilot/audio`.
- The server transcribes with Gemini 2.5 Flash using a strict prompt (`audio/route.ts:53-70`):
  - Speakers are labelled `"id"`, `"customer"` or `"unknown"` by the model.
  - The prompt includes the last 200 characters of the previous segment ("do NOT re-transcribe").
  - Segments are dropped if under 3 characters, filler words (`uh, um, hmm, hm, ah, oh, eh, mm, mhm, uh-huh, yeah, yes, no, okay, ok`), or confidence below 0.5 (`:174-190`).
  - Timing: `start_ms = chunkNumber × 20000`, with the segments spread evenly across the chunk (`:211-225`).

### Speaker assignment (`lib/copilot/speaker-assign.ts`)
- Segments keep the raw vendor label (`speaker_N` / `channel_N`). The role is looked up through `copilot_session_state.speaker_map` whenever it is shown or analysed.
- Auto-assign rules (`:51-70`):
  - Never overwrite an existing entry.
  - `channel_0` → designer (`"id"`); any other channel → `"customer"`.
  - For `speaker_N`, the first label seen becomes the designer and every later label becomes the client.
  - A virtual meeting starts with `{channel_0:"id", channel_1:"customer"}` (`copilot-session.tsx:148-155`).
- **Correcting a speaker**: the label in the transcript pane is tappable. Labels show as "Me" / "Client" / "Speaker N". A tap flips the role between designer and client (`transcript-pane.tsx:61-79,149-152`). The whole history is relabelled because roles are looked up at render time.
  - The map is persisted with the next transcript POST, sent only when it changed (`stream-capture.ts:359-394` → `transcript/route.ts:161-163`).
  - Literal `"id"`/`"customer"` segments from the fallback path are not tappable.
- Labels in the analysis prompt: "Designer", "Client", "Unknown speaker".
- **Echo suppression** (virtual only, `cross-channel-echo.ts`): a later segment on the *other* channel is dropped if it falls within 12s, both segments have at least 4 words, and at least 70% of the shorter one's words appear in the longer. The earlier copy is kept. If the lookup fails, everything is kept.

### Transcript pane (`transcript-pane.tsx`)
- A "Transcript" / "Summary" toggle (desktop only).
- Runs of the same speaker are grouped under one mm:ss timestamp and label.
- Auto-scroll pauses when the user scrolls more than 80px from the bottom; a "↓ Latest" pill resumes it.
- Empty states:
  - "Listening — the live transcript will appear here."
  - "Listening — the summary will appear as the conversation progresses."
- Summary rows show a timestamp, a topic icon, the text, and chips for key numbers.

---

## 4. Analysis: when it runs and what it does

### Fast path (`lib/copilot/fast-path.ts`)
- Runs synchronously on every transcript batch, in both the audio and transcript routes, through `ingestTranscriptBatch` (`lib/copilot/ingest-transcript.ts`).
- Only segments whose speaker resolves to the **client** are considered (`:216,314`). An unmapped speaker produces nothing.
- At most 2 cards per batch. A pattern's cooldown is recorded only for cards that survive the cap (`:246-250`). Cooldowns persist in `copilot_session_state.fast_path_fired`.
- All fast-path cards have priority 3 (`:179`). Their `reason` is `Client said: "<up to 140 chars around the match>"`.
- **Requesting an immediate deep pass**: `analysisRecommended` is set if a fast-path objection or alert card fired, or `budget_stated` fired (`ingest-transcript.ts:50-52`). The client then runs analyze right away.

### Deep pass (POST `/api/copilot/analyze` → `lib/copilot/analysis-pass.ts`)
- **Silence skip**: it needs at least one segment with `created_at` later than `last_analyzed_at`. Otherwise it returns `{ran:false, reason:"no_new_transcript"}`.
- **Lock**: a compare-and-set lock with a 70s TTL. If it is held, the route returns `ran:false, "locked"` (`analyze/route.ts:41-56`).
- **Window**: segments newer than `last_analyzed_at`. On the first pass it is the last 3 minutes (`:82-100`).
- **First run only**, gated on `lead_snapshot === null` (`:135-226`). It loads:
  - the lead's `name, budget, property_type, area`
  - the studio country and currency
  - upsell acceptance rates from `copilot_analytics_snapshots.upsell_metrics`, read with the service-role client
  - `studios.settings.copilot.dealWeights`
- **Context for the prompt**:
  - previous summaries
  - topics already covered (the set of `topic_category` values seen)
  - the last 5 card titles, for dedup
  - talk ratio, counted through the speaker map
- **Model call**: Gemini 2.5 Flash, JSON mode, max 2048 tokens (`context-engine.ts:552-557`).
- **Watermark**: moves to the newest processed `created_at`, but **only if the model call succeeded** (`:299-301`). A transport failure retries the same window. A reply that cannot be parsed still consumes the window.

### Prompt rules (`context-engine.ts:350-541`)
- **Persona**: a "senior interior design sales consultant with 20 years of experience in the {country} market", "whispering strategic advice into the designer's earpiece".
- CRM data is labelled "treat as secondary".
- **Guidance by aim** (`:303-332`):
  - first_consultation: rapport; no closing or upsells.
  - follow_up: concerns and the next step.
  - quote_presentation: value, per-room breakdown.
  - closing: secure commitment.
  - site_visit_debrief: technical capture.
- **Gap analysis**: lists which of these topics have not been covered yet: budget, scope, design_style, materials, timeline, bathrooms, bedrooms, kitchen, living_room, flooring, lighting, storage, decision_makers, next_steps.
- **Talk-ratio alert**: added when there are more than 5 segments in total and the designer has more than 70% of them.
- **Cards**: "0 or 1, rarely 2". Each has a title of at most 5 words, a 1-sentence body, and a **required** `reason`, which must be a speaker-prefixed quote under 20 words.
  - Priority guidance: 8-10 = act now; 5-7 = useful this minute; 1-4 = mild.
  - "THE WHISPER TEST" lists good and bad examples.
  - "SILENCE IS GOLDEN": return nothing if there is nothing worth saying.
- Other outputs: `dealSignals`, `quoteItems` ("NEVER return 0"), `styleKeywords`, `visualPromptSuggestions` (max 2), `detectedTags` (from the predefined list only), `conversationSummary` (only what is *new*, otherwise null), `topicCategory`, `keyNumbers`, `checklistUpdates`, `closingSignalDetected`, `objectionClassification`.
  - Objection types: price, timeline, trust, scope, competition, quality, commitment, value, process, comparison. The competitor name is included whenever one is mentioned.

### Parsing (`context-engine.ts`)
- Card types are limited to whisper, upsell, objection, alert, quote_item, visual.
- Priority is clamped to 1-10.
- A card is dropped if its title closely matches a recent card title: an exact normalised match, or at least 60% overlap of words longer than 3 letters (`:56-67`).
- At most 2 cards are kept (`:8,105`).

---

## 5. Nudge (whisper) cards: kinds, triggers, ranking

### Card kinds and what triggers each
- **Fast-path, client speech only** (`fast-path.ts:51-158`):

  | id | Card type | Title | Cooldown | Fires on (regex, roughly) | Body (start) |
  |---|---|---|---|---|---|
  | `budget_stated` | whisper | "Budget noted" | 120s | "budget is/of/around/about", "we're thinking around/about", "can spend/afford/do around/about/up to" | "Client stated {first money match}. Use this as your anchor — present options above and below this number." If no number: "Client mentioned budget. Clarify the exact figure and whether it's flexible." |
  | `price_pushback` | objection | "Price pushback — pivot now" | 90s | "more than I/we expected", "that's a lot/expensive/too much/quite a bit", "over/above/beyond our/my budget", "can't afford", "didn't expect it would cost" | "Offer a phased approach or scope reduction. Ask: 'What if we focus on the must-haves first and phase the rest?'…" |
  | `competitor_mention` | alert | "Competitor in play" | 120s | "another/other studio/designer/contractor/company/firm/ID", "comparing/talked to/met with another/other/a few", "they/someone quoted", "getting other/more quotes" | "Don't compete on price — compete on value…" |
  | `decision_deferred` | whisper | "Decision maker absent" | 180s | "need to discuss/check with my husband/wife/spouse/partner", "partner needs to approve", "he/she makes the decision" | "Offer a take-home package: summary + 3D renders + 3 pricing tiers…" |
  | `hesitation` | whisper | "Create urgency gently" | 120s | "need to think/time/consider", "not sure/ready/decided", "let me think/sleep on", "I'll/we'll get back/let you know" | "Acknowledge their need for time, then create a soft deadline…" |
  | `timeline_urgent` | whisper | "Timeline pressure detected" | 180s | "need it done/ready by", "moving in by", "going overseas in" | "Tight timeline = premium pricing opportunity. Fast-track projects justify 10-15% surcharge…" |
  | `visual_reference` | whisper | "Visual reference shared" | 60s | "let me show you", "saw this on pinterest/instagram/houzz", "looks like this" | "Great engagement signal. Ask what specifically they love about it…" |

- **LLM coaching cards** (whisper, upsell, objection, alert): whatever the model whispers. Priority comes from the model; `reason` is the quote.
- **Competitor alert** (`analysis-pass.ts:428-458`):
  - Created when `objectionClassification.competitorName` is set and no recent card title contains that name.
  - type alert, priority 8, title "Competitor: {name}".
  - Body is the objection description, or "Client mentioned {name}. Highlight your studio's unique value — transparency, comprehensive scope, and post-renovation support."
  - reason `Competitor "{name}" mentioned in conversation`.
  - Every classified objection, named or not, also writes a `copilot_objection_log` row.
- **Visual prompt card** (`context-engine.ts:169-190`; `analysis-pass.ts:510-535`):
  - Comes from `visualPromptSuggestions`, at most one batch every 90s.
  - type visual, priority 7, title "Generate: {style} {scope}", body = the prompt.
  - Action "Generate Mood Board" (`generate_moodboard` with `{prompt, style, scope}`); reason "Visual prompt from conversation context".
- **Rolling summary card** (`analysis-pass.ts:344-385`):
  - Created whenever the model returns a new `conversationSummary`.
  - type summary, priority 2, title "mm:ss – mm:ss" (the last 30s window).
  - Body = the summary; reason = key numbers joined with " · ", or "".

### Ranking and display (`card-stack.tsx`)
- Score = `priority×0.4 + recency×10×0.25 + typeUrgency×0.2`.
  - Recency decays linearly to 0 over 2 minutes.
  - Type urgency: alert 6, objection 5, upsell 4, whisper 3, visual 2, quote_item 1, summary 0 (`:10-45`).
- 3 cards are visible on desktop and 2 on mobile. The rest go under "History ({n})".
- Empty state: "Listening for conversation signals...".

### Card behaviour (`whisper-card.tsx`)
- Each card shows its title, body (with inline markdown) and the `reason` line.
- "×" dismisses it (aria "Dismiss").
- The action button shows `action.label` when the action type is not "none".
- After 2 minutes a card stops rendering and logs a `decay` interaction (`:32,46-54`). Its client status stays "shown", so a decayed card can still occupy one of the visible slots while showing nothing.
- Only visual actions do anything:
  - `generate_moodboard` creates a mood board using `[style, ...styleKeywords]` and the prompt.
  - `generate_render`, `show_portfolio` and `show_visual` open Visual Assist, which exists only on mobile.
  - `add_quote_item` does nothing (`card-stack.tsx:50,85-91`; `copilot-session.tsx:834-866`).

---

## 6. Smart checklist

### Items
Each meeting type has its own list plus one universal item (`data/copilot-checklists.ts:102-380`). Categories show as "Must Ask" (critical), "Important" and "Good to Cover" (nice to have).

- **First Consultation**
  - Must Ask: "Budget range discussed"; "Property type & size confirmed"; "Key collection / move-in date"; "Decision maker(s) present".
  - Important: "Style preferences explored"; "Room scope defined (which rooms)"; "Timeline expectations set"; "Previous renovation experience".
  - Good to Cover: "Lifestyle needs (kids, pets, WFH)"; "Material preferences discussed"; "Reference photos / inspiration discussed"; "Competitor quotes discussed".
- **Follow-up**
  - Must Ask: "Address concerns from last meeting"; "Quote reviewed / discussed".
  - Important: "Changes to scope captured"; "Timeline reconfirmed"; "Next steps agreed".
  - Good to Cover: "Additional rooms discussed".
- **Quote Presentation**
  - Must Ask: "Line items walked through"; "Total budget confirmed"; "Payment schedule discussed".
  - Important: "Material substitution options offered"; "Timeline tied to milestones"; "What's included vs excluded clarified".
  - Good to Cover: "Warranty / aftercare mentioned".
- **Closing**
  - Must Ask: "Final price agreed"; "Payment schedule confirmed"; "Contract terms reviewed"; "Start date agreed".
  - Important: "Deposit amount discussed"; "Communication channel agreed".
  - Good to Cover: "Referral program mentioned".
- **Site Visit Debrief**
  - Must Ask: "Site measurements confirmed"; "Existing condition issues noted".
  - Important: "Electrical / plumbing points discussed"; "Hacking scope confirmed".
  - Good to Cover: "Neighbor coordination mentioned".
- **Universal** (all types, and the only item for Other or Skip): "Next meeting / follow-up date set" (Important).

### How an item gets ticked
- **By the AI.** The model gets the item IDs for the current type (`context-engine.ts:336-348`) and returns `{itemId, evidence}`. The server merges these by itemId into `copilot_session_state.checklist_updates` (`analysis-pass.ts:305-315`). The client ticks any unticked matching item with `autoDetected:true` and the evidence (`copilot-session.tsx:380-388`). A sparkle icon marks AI ticks in the non-compact view.
- **By hand.** A tap toggles the item. Manual ticks are client-side only and are never persisted.
- **Not by keywords.** Keyword lists exist, but nothing matches against them.

### Closing signal
- The model sets `closingSignalDetected`. Once true it never resets (`analysis-pass.ts:316-318`).
- After that:
  - The banner reads "Meeting wrapping up — {n} critical item(s) not covered" and pulses.
  - Unticked Must Ask rows pulse yellow with an ×.
  - The mobile Checklist tab gets a red count.
- The header counter reads "{done}/{total}".

---

## 7. Deal score

### Inputs and maths
- Six dimensions, each starting at 0.5.
- Default weights (`deal-scoring.ts:5-12`): budget 0.25, timeline 0.15, style 0.10, trust 0.20, decision 0.20, scope 0.10.
- Score = round(Σ clamp(value, 0, 1) × weight × 100).
- **A new signal replaces the old value**: dimension = signal score / 10 (`:100-113`).

### Where signals come from
- **Fast regex, client speech only.** The first matching pattern per dimension per batch wins (`fast-path.ts:268-295`):

  | Dimension | Pattern | Score |
  |---|---|---|
  | budget | budget stated | 7 |
  | budget | price pushback | 3 |
  | budget | flexible / stretch | 8 |
  | timeline | deadline | 8 |
  | timeline | no rush | 4 |
  | style | "I love/like/want japandi/scandinavian/modern/minimalist" | 9 |
  | style | showed Pinterest/Instagram | 8 |
  | trust | another studio / quoted | 4 |
  | trust | feel good / impressed | 8 |
  | trust | friend referred | 7 |
  | decision | discuss with spouse | 4 |
  | decision | "let's proceed / when can you start" | 9 |
  | decision | site visit | 7 |
  | scope | "also the bathroom…" | 7 |
  | scope | "just the kitchen" | 4 |

- **The LLM's `dealSignals`**, each scored 1-10.

### Tiers and labels
- ≥80 "Hot", ≥60 "Warm", ≥40 "Cool", otherwise "Cold".
- Bars: ≥0.7 green, ≥0.4 yellow, otherwise red.
- Explanations exist for each tier, e.g. budget high "Budget aligns well with the scope discussed" / medium "Budget mentioned but not firmly committed" / low "No budget discussed yet" (`deal-score.tsx:35-66`). Live views pass `showExplanations={false}`, so they are hidden.
- Empty state: "Deal score will appear as the conversation progresses".

### Storage
- Each snapshot `{score, tier, dimensions, timestamp}` is merged by timestamp into `copilot_session_state.deal_score_history` (capped at 200) and mirrored to `copilot_sessions.deal_score_history` and `final_deal_score`.
- Custom weights: see the bug in §0, item 6.

---

## 8. Live estimate ("Quote Shadow") and the path to a draft quote

### How items are built from the talk
- The LLM returns `quoteItems: {description, category, estimatedTotal}` priced in the studio currency at "{country} market rates", preferring prices said in the meeting.
- The server keeps an item only if:
  - `estimatedTotal > 0`, and
  - it is not a fuzzy duplicate. A duplicate is the same category (or no category) with word overlap of at least max(2, 50%) on words longer than 3 letters (`analysis-pass.ts:581-610`).
- Kept items are inserted into **`copilot_shadow_quote_items`**: `id, session_id, description, category, estimated_total, source:"ai_detected", accepted:true`.
- There are no units, quantities, rooms or trade rules. Each item is one lump-sum number.

### Summary and upsells
- Poll computes `computeQuoteSummary(items, null, country)` (`quote-estimator.ts:157-176`): `estimateTotal` = the sum of accepted items, budget and headroom are null, plus upsell suggestions.
- Upsell rules (`:210-253`):
  - Start from 8 defaults (`:60-69`), each with an SGD value and an acceptance rate:

    | Upsell | SGD value | Acceptance |
    |---|---|---|
    | Premium kitchen pull-out organizer | 2800 | .65 |
    | Smart digital lock | 800 | .72 |
    | Under-cabinet LED strip | 600 | .58 |
    | Heated towel rack | 450 | .42 |
    | Ventilated shoe cabinet | 2200 | .55 |
    | False ceiling with cove lighting | 4900 | .60 |
    | Walk-in wardrobe | 5200 | .48 |
    | Frameless shower screen | 2500 | .62 |

  - An upsell is suggested only if its category is already in scope or a keyword appears.
  - It is skipped if a similar item already exists.
  - Its value is multiplied by (country's average typical rate for that category ÷ SG's average).
  - Acceptance rates can be overridden from analytics snapshots (`:77-99`).
  - The acceptance rates are passed into the prompt, but the prompt text never mentions them.

### Rate tables
These are used only for upsell scaling (§0, item 2).
- Country routing (`rates/index.ts:25-44`): AE, SA, KW and QA use AE; EG uses EG; MY uses MY; IN, SG and anything else use SG.
- Each row is `{category, min, max, typical, keywords}` in whole currency units. Categories are Kitchen, Bedroom, Living Room, Bathroom, Common.
- SG examples (`quote-estimator.ts:15-57`): kitchen cabinets 6000–10000 (typical 8200); countertop 3500–6000 (4800); built-in wardrobe 3500–7000 (5400); false ceiling 3000–6000 (4900); bathroom renovation 5000–12000 (8000); vinyl flooring 1500–4500 (3000); painting 2000–4000 (3000); electrical 2000–5000 (3500).
- AE, EG and MY have their own figures in `rates/ae.ts`, `rates/eg.ts` and `rates/my.ts`. For example, AE kitchen cabinets 35000–80000 (55000); EG 150000–600000 (300000); MY 12000–35000 (20000).

### UI
- **Mobile Quote tab** (`quote-shadow.tsx`):
  - "Quote Shadow" / "Live estimate — not a final quote".
  - Categories sorted by total, each showing "{n} items" and expandable. AI items get a sparkle.
  - "Upsell Opportunities" with "+{value}" per row.
  - Footer "ESTIMATE {total}", then "Budget:" / "Headroom: +/-", then "Export & Share Estimate".
  - Empty: "No items detected yet. Items will appear as scope is discussed."
- **Desktop Quote tab** (`panels/quote-shadow-inline.tsx`):
  - "Live Quote", with an "Export" link.
  - "Estimate"; also "Client budget" / "Headroom" if present.
  - Items grouped by category.
  - Empty: "Quote items will appear as scope is discussed", button "Generate Quote from Conversation", note "AI will estimate costs based on everything discussed so far".
  - With items: "Refresh Quote from Conversation".
  - Both buttons send an Ask-Copilot prompt (`copilot-session.tsx:933-935`). The answer is only text; it adds no shadow items.
- **Desktop Add-ons tab** (`panels/recommended-addons-panel.tsx`):
  - Empty: "Start discussing scope to see add-on suggestions", button "Suggest Add-ons from Conversation", note "AI will recommend commonly paired items based on what has been discussed".
  - With items: "Based on {categories} in scope:", button "Find Add-ons for Current Scope". This also goes through Ask Copilot.
- **Export / share**: "Export & Share Estimate" and "Export" both call `handleShare("estimate")`, which creates a share link (§11). The `/api/copilot/export/estimate` route (JSON grouped by category) is not called by the live UI.

### Becoming a draft quote (after the meeting)
- On the brief, the "Create draft quote" card has the sub-line "{n} shadow item(s) · {total} → Quote Designer" and a "Create" button. It is disabled for demo sessions, when there is no leadId, or when there are no items. After success it shows "Draft {quoteNumber} · Reopen" (`meeting-brief.tsx:615-640`).
- POST `/api/copilot/records/create-quote` (`app/api/copilot/records/create-quote/route.ts`):
  - Reads the accepted shadow items. If there are none: 400 "No accepted quote items in this session".
  - Inserts **`quotes`**: `lead_id, studio_id, label:"Meeting draft", quote_number` (next "QT" number, up to 5 retries on a unique clash), `quote_type:"standard", status:"draft", is_primary:false, created_by`.
  - Inserts **`quote_line_items`**, one per item: `quote_id, lead_id, studio_id, name = description, description, category` (or "Others"), `unit_price = total = estimated_total, qty:1, unit:"lot", price_type:"amount", sort_order`.
  - Calls `applyJourneyFloor(..., "quote")`, which raises the lead to ONGOING/QUOTE_CREATED.
  - Each click makes a new draft. Afterwards the client scans the new items against the price book for suggestions.

---

## 9. Tags

- **Predefined tags** (`lib/copilot/tag-config.ts:5-21`); at most 20 per session: "Budget concern", "Likes modern", "Has kids", "BTO owner", "Villa owner", "Condo owner", "Timeline urgent", "Comparing IDs", "Wants kitchen", "Wants bedroom", "Wants bathroom", "Price sensitive", "Premium client", "Spouse absent", "First renovation".
- **Tags feed portfolio matching** (`:39-103`):
  - Likes modern → modern, contemporary, sleek.
  - Has kids → family-friendly, durable, practical.
  - BTO owner and First renovation → property HDB/BTO.
  - Villa owner → luxury, spacious; property Villa/Townhouse.
  - Condo owner → Condo/Apartment.
  - Wants kitchen/bedroom/bathroom → that room word.
  - Premium client → luxury, premium, high-end; Condo/Landed; budget high.
  - Budget concern and Price sensitive → budget low.
  - The budget signal is never actually used in matching.
- **Auto-detection**: the LLM returns `detectedTags`. Only predefined tags are accepted, at most 5 per pass (`context-engine.ts:155-163`). Tags the user has removed are skipped. New ones are appended to `copilot_sessions.tags` and recorded in `state.auto_detected_tags` (`analysis-pass.ts:487-507`).
- **Manual tags**: only on mobile, in the Visual Assist sheet, under "Tags (n)" (`visual-assist.tsx:51-159`):
  - "Active" chips (sparkle if auto-detected, × to remove).
  - "Suggestions" (unused predefined tags).
  - A custom input "Add tag..." (max 100 characters).
- **API** (POST `/api/copilot/tag`): the tag is trimmed and cut to 100 characters.
  - add: rejected with 400 "Maximum 20 tags reached" when full.
  - remove: removes the tag, adds it to `dismissed_tags` and removes it from `auto_detected_tags`, so the AI will not add it again.
- Desktop shows tags read-only.

---

## 10. Portfolio matching

- **AI recommendations**: GET `/api/copilot/portfolio?sessionId`, polled every 15s.
  - Context: the session's accumulated `style_keywords`, the tag style words, and the first tag property hint as property type.
  - Candidates: the studio's `studio_portfolio_projects` with `status="Published"`, each with its first image.
- **Rule** (`lib/copilot/portfolio-matcher.ts`): score = style×0.5 + property×0.3 + budget×0.2, rounded to 0-100.
  - Style: count context keywords that contain or are contained in a project style, divided by the size of the smaller set, capped at 1.
  - Property: 1 if one name contains the other; otherwise the share of context words that overlap.
  - Budget: the gap between midpoints, scored within a 50% tolerance. The client never sends a budget, so this part is always 0.
  - Returns nothing if there are no style keywords. Drops scores of 0, sorts, keeps the top 5.
  - Reasons: "Matching styles: …", "Similar property type: …", "Budget range: …".
- **Search** (`?search=`, debounced 300ms): looks at the studio's `projects` with `stage="Closed"`, matching name, client, property type or project type (ilike, input sanitised), up to 10. Results have score 0, no thumbnail, and up to 3 scope items as "styles".
- **UI**:
  - Mobile carousel: "{n}% match", "Show Customer", and a lightbox with reasons. Empty: "No portfolio matches found yet. Style keywords will be detected from the conversation."
  - Desktop panel: "Search projects..."; empty: "AI-matched projects will appear during conversation" or `No projects found for "{q}"`. Mini cards show 2 reasons; the lightbox has "Show Customer".
- "Show Customer" creates a share link of type "portfolio". No metadata is passed, so the customer page gets empty content.

---

## 11. Mood boards, renders, assets, sharing

### Mood board (POST `/api/copilot/moodboard`)
- Body `{sessionId, styleKeywords[], prompt?}`.
- Model `google/gemini-3-pro-image-preview`, 16:9.
- The prompt asks for a magazine-quality collage in a "Singapore residential context" and **no text in the image** (`:60-100`).
- Title "{first 3 keywords joined ' + '} Mood Board".
- The image is uploaded to the `renders` bucket (path prefixed with the studioId). If generation produced no image, the fallback is "/J-4.jpg".
- Inserts **`copilot_visual_assets`**: `type:"mood_board"`, title, description, `image_urls`, `metadata{styleKeywords, propertyType, prompt}`, `source:"ai_detected"`, `status:"active"`.
- If the session has a project and the upload worked, it also writes **`render_jobs`** (`status "completed"`, `variants_json`, style, `project_id`, `lead_id`) and **`project_files`** (folder "Renders", file name "Moodboard — {title}.png").
- Triggered by:
  - a visual card action;
  - desktop Mood Board tab "Generate" (empty-state text "Click Generate to create a mood board…");
  - mobile "Generate Mood Board" / "Generate New".
- Toasts: "Generating mood board...", "Mood board generated", "Failed to generate mood board".

### Render (POST `/api/copilot/render`)
- Same model. Title "{first 2 styles joined ' + '} Room Render" or "AI Room Render". `type:"ai_render"`.
- The same project mirror applies, with file name "AI Render — {title}.png".
- The UI never sends a photo or style keywords, so the prompt always falls back to "Modern" with no photo. This holds even though mobile says "Capture & Generate Render" / "Take a photo to generate an AI render with detected styles".
- Desktop Assets tab: "Generate Render"; empty "Mood boards and renders will appear here as they are generated"; lightbox "Show Customer".

### Share links (POST `/api/copilot/share`)
- Inserts **`copilot_share_links`**: `session_id, share_type` (visual / mood_board / estimate / portfolio), `content_id`, a 16-character `share_token`, `expires_at` (now + 24h), `metadata`.
- URL: `/copilot/share/{token}`.
- Dialog: "Share {title}", "Show QR Code" (a placeholder only), "Share via WhatsApp", copy link, "Link expires in …".
- The public page returns 404 or 410 (expired) and increments `view_count`.

---

## 12. Competitor-quote reading (POST `/api/copilot/competitor-quote`)

- Desktop only, and only with the `competitor_analysis` feature.
- The image or PDF is read as base64 on the client and posted with `imageType` and `countryCode`. There is no compression, so files over roughly 4.5MB fail.
- Currency: MY→MYR, AE→AED, IN→INR, anything else→SGD.
- Gemini 2.5 Flash, max 8192 tokens. The prompt asks for one JSON object (`:88-115`):
  - `summary` (2-3 sentences), `competitorName`, `totalQuoted`
  - `lineItems` (max 20, at most 10 words each)
  - `missingItems` (3-5), `pricingGaps{item, theirPrice, ourRange, insight}`
  - `talkingPoints` (3-5, "NEVER disparage")
  - `strengths`, `weaknesses`, `hiddenCosts`, `categoryBreakdown`
- If the model returns an array, a second call analyses it. If parsing fails, the raw text comes back as `rawAnalysis`.
- **Nothing is saved to the database.** The analysis lives only in client state and is added to the Ask Copilot context.
- **Compact card**, "Competitor Quote Analysis":
  - "Expand"; stats "Their Total" / "Missing Items" / "Price Gaps"; "Key Talking Points" (2).
  - "Compare pricing" asks "Compare this competitor quote with our typical pricing. Where can we justify a higher price?"
  - "Discuss missing items" asks "What should I say to the customer about the items missing from this competitor quote?"
- **Modal**:
  - "Total Quoted", "Line Items", "Missing Items", "Hidden Costs".
  - Sections "Line Items", "Missing from Their Quote", "Potential Hidden Costs", "Pricing Comparison" (Item / Their Price / Market Range / Insight), "Their Strengths", "Their Weaknesses", "Talking Points for Your Meeting" (each with "Ask Copilot to elaborate →").
- Amounts are always shown with "S$", whatever the region.
- Toasts: "Analyzing competitor quote...", "Competitor quote analyzed", "Quote analysis failed: {status}".
- The feed records a user line "Analyzing competitor quote: {file.name}".

---

## 13. Ask Copilot
Covered in §0, item 8. The context message says "live meeting co-pilot… Customer… Meeting type…", followed by formatting rules (markdown tables, etc.) and up to the last 34 Q&A messages. The reply is drawn as rich markdown. On failure: "I couldn't process that question. Try rephrasing." or "Sorry, I couldn't process that question right now."

---

## 14. Floor-plan notes (desktop, `floor-plan-inline.tsx`)

- Click "Floor Plan" and pick an image file. It is held only in browser memory as a data URL.
- The canvas opens at 70% width.
- Tools, with shortcuts: Select V, Pen P, Highlighter H (30% opacity, 3× width), Arrow A, Line L, Rectangle R, Circle C, Text T, Measure M, Eraser E (20px, cuts out).
  - Measure draws a dashed line labelled "{pixels}px". There is no real-world scale.
- 7 colours; widths 1, 2, 3 (the inline version).
- Undo and redo (Ctrl/Cmd+Z, Shift for redo), Clear.
- "Save" only shows the toast "Floor plan notes saved" and closes. **Nothing is persisted**; annotations are lost when the session view unmounts.
- The fuller modal version (Export PNG, "Save to Files") exists but is not used.

---

## 15. Demo / mock mode (`lib/copilot/mock.ts`)

- It applies only to session IDs starting with `dry-run-`. These are minted only when `DRY_RUN=true` is hardcoded in `session/route.ts:10`; it is false in this repo.
- In a dry-run session:
  - Poll returns a scripted 16-line 4-room BTO conversation, 2 lines per poll.
  - A card from 10 scripted cards is released every 6 segments.
  - 6 quote items (Kitchen cabinets 8200, Quartz countertop 4800, Walk-in wardrobe 5200, Vinyl flooring 3000, False ceiling 4900, Painting 3000).
  - Budget 55000 once 2 or more items exist.
  - A deal score climbing 45 → 72.
  - Visual assets from 8 segments; keywords "Scandinavian, Minimalist, Wood tones".
- analyze, transcript and stt-token refuse or skip. Moodboard, render and portfolio return fixed results. End returns `MOCK_BRIEF` inline.
- The client skips the analyze loop, wake lock and leave guard. "Create draft quote" is disabled ("Demo session").
- Separately, a missing `OPENROUTER_API_KEY` makes moodboard, render, portfolio, export and competitor-quote return mock data. The audio route returns a 3-line mock transcript.

---

## 16. Data written by each API route

| Route | Writes |
|---|---|
| session POST | `copilot_sessions` insert (columns in §1.7); `copilot_session_state` upsert |
| analyze POST | `copilot_session_state` (lock, then patch: `last_analyzed_at, checklist_updates, closing_signal_detected, covered_topics, style_keywords, auto_detected_tags, last_visual_prompt_at, dimensions, deal_score_history, customer_budget, lead_snapshot, country/currency, upsell_rates, deal_weights, meeting_objective*`); `copilot_summary_entries` (`session_id, topic_category, summary, timestamp_ms, chunk_range, key_numbers`); `copilot_cards` (`id, session_id, type, priority, title, body, action, quote_item, signal, reason, status:"shown"`); `copilot_objection_log` (`session_id, studio_id, lead_id, member_id, objection_type, objection_description, competitor_name, card_id`); `copilot_sessions.tags`, `deal_score_history`, `final_deal_score`; `copilot_shadow_quote_items` |
| poll GET | read only (lazy state-create disabled) |
| audio POST | `copilot_transcript_segments` (`session_id, speaker, text, start_ms, end_ms, confidence`); fast-path `copilot_cards`; state (`fast_path_fired, last_transcript_at, dimensions, deal_score_history`); `copilot_sessions` score mirror; storage `copilot-audio/sessions/{id}/chunk-NNNN.webm` (skips chunks under 1KB) and `copilot_sessions.audio_chunk_count` (not in archive mode) |
| transcript POST | `copilot_transcript_segments` upsert (on conflict id do nothing, client-supplied UUID); fast-path cards and scores as above; `state.speaker_map` merge |
| stt-token POST | none (mints a Deepgram grant) |
| card/interact POST | `copilot_cards`: `status` (dismiss→"dismissed", star→"starred", act→"acted", anything else is stored as given, e.g. "decay"), `interacted_at, interaction_type, visible_duration_ms` |
| checklist-items GET/POST | `studio_checklist_items` insert (`studio_id, label, category` default "important", `objective_types, detection_keywords, is_active:true, sort_order`) |
| checklist-items/[id] PATCH/DELETE | update `label/category/detection_keywords/sort_order`; delete |
| tag POST | `copilot_sessions.tags`; on remove, `state.dismissed_tags` and `auto_detected_tags` |
| render / moodboard POST | storage `renders`; `copilot_visual_assets`; optionally `render_jobs` and `project_files` |
| moodboard/gallery GET | read: studio-wide active mood_board and ai_render assets, optional `q` filter |
| portfolio GET | read only |
| competitor-quote POST | none (AI only) |
| end POST | `copilot_sessions` (`status:"ended", ended_at, duration_minutes` (rounded), `deal_score_history, final_deal_score, style_keywords, post_transcript_status:"pending", meeting_outcome`); `copilot_cards.meeting_outcome` filled in for every card of the session |
| outcome POST | `copilot_sessions.meeting_outcome` (must be converted, follow-up or dropped) plus the card backfill |
| post-transcript POST | `copilot_sessions.post_transcript_status` (processing → complete/failed), `intelligent_transcript` (Gemini cleanup prompt: currency digits, remove fillers, fix mishearings); **deletes** the audio chunks in storage |
| debug-engine POST | none; returns 404 in production |
| share POST | `copilot_share_links` |
| records/create-quote POST | `quotes`, `quote_line_items`, lead journey floor |

---

## 17. Credits and metering

- **None.** No route checks, reserves, deducts or refunds credits. Searching for credit/meter/deduct finds nothing in `app/api/copilot` or `lib/copilot`.
- **Usage events only** (`lib/usage/track`): `feature_opened`, `feature_succeeded`, `feature_failed` (feature "copilot") and `copilot_session_started` on session creation; the same plus `copilot_session_ended` (with `duration_ms` and outcome) on end.
- Cost is limited only by structure:
  - the silence skip and the analysis lock;
  - at most 2 cards per pass;
  - the 90s visual-card cooldown;
  - fast-path cooldowns;
  - the client stops sending audio chunks after the meeting ends;
  - Buddy's 10-per-minute IP limit.
- Paid calls in use: Gemini 2.5 Flash (transcription fallback, analysis, competitor quote, Ask Copilot, transcript cleanup), Gemini 3 Pro Image (mood boards and renders), Deepgram nova-3.

---

## 18. Roles and permissions

- **Page access**: `tools/copilot-analytics` is allowed for owner, admin and id (designer) (`lib/access-control.ts:92`).
- **Studio switch**: the studio-level page config decides whether the feature exists at all (`isPageEnabled`; defaults to true when not configured). The lead drawer, project card, quick action and landing page all check it.
- **API**: every route uses `requireSession` (any signed-in studio member). There is no role check on the API, and no edge route matrix for `/api/copilot/*`.
- **Tenant isolation**: a studio-scoped Supabase client (RLS on the `studio_id` claim) plus an explicit ownership check `isCopilotSessionOwned` / `isCopilotCardOwned` (`lib/copilot/session-ownership.ts`). It fails closed, returning 404 "Session not found".
- **Who may start**: any studio member with a `studio_members` row. Without one: 400 "Studio member not found". The starter is recorded as `id_user_id` and `consent_acknowledged_by`.
- **Who sees**:
  - The live session is shown only to the person who started it.
  - History and briefs: owners and admins see every session; everyone else sees only sessions where `id_user_id` is their member id (`lib/copilot/caller-scope.ts:67,76-78`).
  - The Analytics and Objections tabs are for owners and admins only.
  - The prep card's session list comes from `useCopilotSessions`, which uses that same scoping.
- **Checklist settings**: the API allows any member; the screen is the settings component.
- **Debug engine**: disabled in production.
- **Competitor quote**: auth can be bypassed with `BYPASS_AUTH=true` outside production.
