# I — 1.0 Projects: the homeowner's side

Reader I of twelve. Read from the 1.0 working tree `/Users/vicky/Documents/GitHub/qanvast-id-tool`, branch `integ/security-non-qanvast` @ `620190192`, read-only, nothing run. Read in full: the homeowner parts of the studio project page (`src/app/(main)/projects/[projectId]/page.tsx`), `src/components/homeowner/*` (every file, with `layouts/*` and `login-layouts/*`), `src/components/projects/homeowner-preview-dialog.tsx` and `homeowner-response-banner.tsx`, every page under `src/app/my/**` (the 2,472-line project page included), `src/app/pay/**` (the legacy token portal skimmed past its first 560 lines), `src/app/api/homeowner/**`, `src/app/api/homeowner-links/**`, `src/app/api/homeowner-bind`, `src/app/api/portal/**`, `src/app/api/studio/preview-as-homeowner/**`, `src/app/api/studio-setup/portal-slug`, `src/lib/homeowner-*.ts`, `portal-nav.ts`, `portal-presets.ts`, `portal-branding-resolve.ts`, the homeowner parts of `src/lib/session.ts` and `src/proxy.ts`, `src/app/(main)/tools/homeowner-portal/page.tsx` with `src/components/settings/portal-*.tsx`, and the docs `docs/rules/homeowner-portal.md`, `docs/prd/03-homeowner-portal.md`, `docs/features/homeowner-portal/*`, `docs/features/portal-merge-integration/uat-*.md` (portal rows), `docs/features/render-feedback/spec.md`. Anything worked out rather than read is marked **[inferred]**.

**Path aliases used in citations**

| Alias | Path |
|---|---|
| `PP` | `src/app/(main)/projects/[projectId]/page.tsx` |
| `HP` | `src/app/my/projects/[projectId]/page.tsx` |
| `EP` | `src/app/my/engagement/[linkId]/page.tsx` |
| `SL` | `src/app/my/[studioSlug]/layout.tsx` |
| `SLG` | `src/app/my/[studioSlug]/login/page.tsx` |
| `INV` | `src/components/homeowner/invite-dialog.tsx` |
| `INV-API` | `src/app/api/homeowner/invite/route.ts` |
| `HB` | `src/lib/homeowner-binding.ts` |
| `TOOLS` | `src/app/(main)/tools/homeowner-portal/page.tsx` |
| `cmp/…` | `src/components/homeowner/…` |
| `set/…` | `src/components/settings/…` |
| `api/ho/…` | `src/app/api/homeowner/…` |
| `api/ho/p/…` | `src/app/api/homeowner/projects/[id]/…` |

---

## Bottom line

- **The homeowner's project is one page**, `/my/projects/[projectId]`, with five top tabs — **Overview · Design · Finance · Documents · Support** — and pill sub-tabs under Design (Renders · Selections · Floor Plan) and Support (Raise a Support Ticket · Chat) (`HP:103-109`, `HP:81-93`). A homeowner can confirm milestones or ask for a revision, read updates and photos, like / comment / pin renders, pick material options, approve or reject variation orders, read the quote and invoices, pay by bank / PayNow QR and upload proof, download documents, raise tickets and chat.
- **Login is phone + 6-digit OTP on the studio's own branded URL** `/my/{slug}/login`; one session = one studio, 30 days (`api/ho/auth/verify/route.ts:97-112`). The generic `/my/login` is now only a signpost.
- **"Invite to Portal" is not a gate.** A database trigger gives every lead with a phone an active portal link the moment the lead is saved (`supabase/migrations/20260521000001_auto_bind_homeowner_for_leads.sql:98-112`); the dialog only opens WhatsApp with a login link. WhatsApp is the only channel — no SMS, no email — and the header button never shows an invited state (`PP:1708-1715`).
- **There is no revoke.** Nothing in the code sets a link inactive; the only removal is the hard delete of a *family member* on Tools › Homeowner Portal › Project Links (`api/portal/family-members/route.ts:243`).
- **Preview as Homeowner opens the real page read-only for 30 minutes** behind a cookie (`src/app/api/studio/preview-as-homeowner/route.ts:20,66-74`) — but the page's shell asks the *real* homeowner session whether anyone is signed in and sends everyone else to `/my/login`, so the preview works only in a browser that also holds a real homeowner login **[inferred, not run]** (`cmp/portal-shell.tsx:60-78`, `api/ho/auth/me/route.ts:9-18`).
- **The studio's chosen layout (Minimal · Modern · Traditional · Detailed · Premium) does not dress the project page.** The five layouts wrap the home, About, Team and lead-stage pages; the project page always uses the generic `PortalShell` (bar colour, brand colour and fonts only) (`HP:210-214`, `cmp/portal-shell.tsx`). The settings preview shows a ten-tab mock project that the homeowner never sees (`src/app/my/[studioSlug]/preview/[view]/page.tsx:190-201`).
- **Every on/off is studio-wide; nothing is per project.** Fifteen feature switches live in one studio setting, four of them are read by nothing (`milestoneApprovals`, `contractSigning`, `scopeQuestions`, `selectionAutoShare`), and none is enforced on the server — the switches only hide tabs (`set/portal-features-config.tsx:65-81`, `HP:66-72`).
- **Deep links inside the project page do not move the tab.** The tab is read from `?tab=` once; a bell notification or the "View invoice" link pressed while already on the project changes the address and nothing else **[inferred]** (`HP:155`, `HP:1519`, `cmp/notification-bell.tsx:94-116`).
- **The phone bottom bar on the project page has three dead links** — Chat, Projects, Settings point at `/my/chat`, `/my/projects`, `/my/settings`, none of which exist (`cmp/portal-bottom-nav.tsx:6-11`).
- **Approvals are thin.** A milestone answer cannot be seen again or changed once given (the card disappears) (`cmp/milestone-approval.tsx:28-33`); the Overview's "awaiting your approval" count looks for a status nobody writes (`HP:397`); ticket categories Safety / Damage / Cleanliness / Vendor are silently saved as "Other" (`api/ho/p/issues/route.ts:22,146-148`).
- **Security gaps worth carrying into the audit:** the legacy `/pay/[token]` portal returns all data before its "OTP" step and never sends an OTP (`src/app/pay/[token]/page.tsx:154-178`); the homeowner invoice endpoint returns raw line items while the list endpoint strips cost fields (`api/ho/p/invoices/[invoiceId]/route.ts:178` vs `api/ho/p/finance/route.ts:115`); the quote-comment endpoint writes to any line item id (`api/ho/p/quotes/comment/route.ts:55-59`); the "Portal paused" switch does not stop the project page or its APIs.
- **Motion is minimal**: a morphing-shape loader, Radix dialog / popover fade-zoom (200 ms), colour transitions on tabs and chips, one pulsing draft pin. No page transitions, no list animation, no skeletons.

---

## 1. Studio project page — "Invite to Portal"

### (1) What it is / entry points
- **I-01** The studio project page header carries an outline button **"Invite to Portal"** (icon `UserPlus` 14) as the first header action on desktop; the comment beside the tool buttons says they are secondary "so the eye still lands on Invite to Portal". `PP:1708-1716`
- **I-02** Below the `lg` breakpoint the button is hidden and the same action is the first row of a single ⋯ menu (`aria-label="Project actions"`, menu width `w-60`): Invite to Portal · Photo Renders · Plan the Space (3D) · Preview as Homeowner · (owners) Close project · Delete project. `PP:1778-1818`
- **I-03** The same dialog is opened from the lead drawer ("Invite to Portal" button), where it falls back to a lead-stage invite when no project is linked. `src/components/leads/lead-detail-drawer.tsx:1552-1562,3309-3318`
- **I-04** The project page mounts the dialog with `projectId`, `projectName` (or "Project"), `defaultName = project client`, `defaultPhone = customer phone`; it does not pass the project's country code, so the dial code falls back to the studio's country and then SG. `PP:4762-4769`, `INV:68-72`

### (2) Layout
- **I-05** A small centred dialog, `sm:max-w-md`; body is a `space-y-4` stack: name field, phone row, a rounded-xl "Show chat history" row, an error line, a rounded-xl copy-link row, an optional full-width WhatsApp fallback button, then two equal-width buttons. `INV:234-393`
- **I-06** Title row: a 32 px rounded-lg tile in `primary-variant` holding the `UserPlus` icon, then the title in `text-base font-heading`. `INV:236-241`

### (3) UI elements (copy verbatim)
- **I-07** Title **"Invite to Portal"**; description **"Invite a homeowner to track {project name} in their portal."** (project name in medium weight; at the lead stage it reads "their project"). `INV:240-244`, `INV:66`
- **I-08** Field **"Homeowner Name"**, placeholder **"e.g. John Tan"**, 36 px high. `INV:250-258`
- **I-09** Field **"Phone Number"**: a 100 px dial-code select listing each supported country as "{flag} {code}", and a `tel` input with the region's placeholder; helper **"WhatsApp opens with a ready-to-send message containing their portal login link."** `INV:263-293`
- **I-10** Toggle row **"Show chat history"** with an eye / eye-off icon; sub-line **"Homeowner can see messages from before they joined"** when on, **"Homeowner only sees messages after invite"** when off. The switch is hand-rolled (20×36 px pill, white 14 px knob). Default is **on**. `INV:296-329`, `INV:78`
- **I-11** Copy-link row: the login URL in monospace (`select-all`, truncated) and an outline button **"Copy Link"** (icon `Link2`) that becomes **"Copied"** with a green check for 2 s. `INV:337-354`, `INV:133-143`
- **I-12** Buttons: **"Cancel"** (outline) and primary **"Send via WhatsApp"** (icon `MessageCircle`); while the request runs the primary reads **"Preparing…"** with a spinning `Loader2`. `INV:370-392`
- **I-13** Pop-up-blocked fallback: a full-width primary link **"Open WhatsApp"** appears above the buttons. `INV:357-367`

### (4) Interactions
- **I-14** Pressing "Send via WhatsApp" validates, then **opens a blank tab synchronously inside the click** (so the browser does not block it), posts to `/api/homeowner/invite`, and points the tab at `https://wa.me/{digits}?text={message}`; on failure the tab is closed. `INV:151-230`
- **I-15** On success a toast says **"Portal link ready — opening WhatsApp for {name}"**, or **"{name} is already invited — opening WhatsApp to resend the link"** when a live link already existed; the dialog closes. `INV:210-217`
- **I-16** If the tab was blocked: toast **"Pop-up blocked — tap “Open WhatsApp” below to send the invite."** and the fallback link shows; pressing it closes the dialog. `INV:219-222`, `INV:362`
- **I-17** "Copy Link" writes the login URL to the clipboard and toasts **"Portal link copied to clipboard"**; failure toasts **"Failed to copy link"**. Copying does not create or activate anything on the server. `INV:133-143`
- **I-18** Changing the dial code clears the phone field and the error. `INV:267`
- **I-19** The phone input strips non-digits and caps at the country's max digits. `INV:145-149`

### (5) States
- **I-20** Validation errors, in red 12 px text under the toggle: **"Name is required"**; the region validator's message or **"Valid phone number is required"**. `INV:157-166`, `INV:332-334`
- **I-21** Server errors: the route's `error` text or **"Failed to create invite"**; network failure **"Something went wrong. Please try again."** `INV:197-201`, `INV:226`
- **I-22** Route errors a studio can meet: **"name, phone, and one of projectId/leadId are required"** (400), **"Project not found"** / **"Lead not found"** (404), **"Not authenticated"** / **"Invalid session"** (401), **"Internal server error"** (500). `INV-API:13-25,48,211,385`
- **I-23** **There is no invited / pending / accepted state anywhere in the studio UI.** The header button always reads "Invite to Portal"; the project page never shows whether the homeowner has a link, has logged in, or when they last looked. `PP:1708-1715`
- **I-24** The server does record a last-seen stamp (`homeowner_project_links.last_seen_at`) each time a real homeowner opens the project page, "so the studio's 'unpublish if unread' gate knows they've been here" — it is not surfaced on the invite. `api/ho/p/route.ts:80-92`

### (6) Motion
- **I-25** Dialog: Radix fade + zoom (`fade-in-0` / `zoom-in-95`, `duration-200`) over an overlay that fades. `src/components/ui/dialog.tsx:42,64`
- **I-26** The switch slides its knob with `transition-transform` and changes track colour with `transition-colors` (Tailwind default 150 ms). `INV:319-327`
- **I-27** The spinner is `animate-spin` on `Loader2`. `INV:387`

### (7) Rules and logic
- **I-28** Any signed-in studio member may invite; the route checks the session and that the project (or lead) belongs to the session's studio — there is no role check. `INV-API:9-19,198-212`
- **I-29** **Channels: WhatsApp only, sent from the studio member's own WhatsApp.** The route's comment: "We no longer auto-send an SMS — the ID forwards this link from their own WhatsApp". No SMS, no email, no in-app notice to the homeowner. `INV-API:365-369`
- **I-30** Message text for a project, verbatim: **`Hi {name}! {studio name} has invited you to track your project "{project name}" on the mAIson portal. Log in here: {portal URL}`**. `INV-API:374`
- **I-31** Message text at the lead stage: **`Hi {name}! {studio name} has invited you to track your project on the mAIson portal. Log in here: {portal URL}`**. `INV-API:186`
- **I-32** Client-side fallback if the server sends no message: **`Hi {name}! You've been invited to track {project name} on the mAIson portal. Log in here: {url}`**. `INV:205-207`
- **I-33** The link in the message is the studio's branded login `/my/{slug}/login` when the studio has a slug, otherwise `/my/login`; the host is `NEXT_PUBLIC_APP_URL` or `https://openmaison-ai.vercel.app`. It is a login page, not a personal link. `INV-API:370-372`
- **I-34** The route finds or creates the homeowner profile for (studio, phone) and overwrites its name with what the studio typed. `INV-API:222-258`
- **I-35** If an active link to this project exists it is kept and only its chat-history flag is updated (`alreadyInvited: true`); an inactive one is re-activated with a fresh `linked_at`; otherwise a new link is inserted with **role "owner"** and a new `portal_token`. `INV-API:261-316`
- **I-36** "Re-invite" is therefore the same press again: nothing is re-sent by the system, the studio simply gets the WhatsApp draft once more. `INV-API:273-284`
- **I-37** The first invite also creates the project's client conversation (non-internal, group, named "{name} – {project}") if none exists. `INV-API:320-354`
- **I-38** "Show chat history" off hides messages sent before `linked_at` from that homeowner. `api/ho/p/chat/route.ts:74-80`
- **I-39** **Portal access does not depend on the invite.** A database trigger creates a profile and an *active* "primary" link (with a portal token, chat history on) for every lead that has a phone, on insert or update. Its own header says it exists so homeowners do not hit "You haven't been invited yet". `supabase/migrations/20260521000001_auto_bind_homeowner_for_leads.sql:1-19,98-112`
- **I-40** When a lead becomes a project the same link row is patched with the project id (never a second row), so the token and the login keep working: `attachProjectToLeadLink`. `HB:171-188`, `src/app/api/homeowner-links/promote-lead-link/route.ts:41-48`
- **I-41** **Revoke does not exist.** No code path writes `is_active = false` on `homeowner_project_links`; the invite route's "re-activate" branch has nothing that feeds it. The login routes still carry the copy for a revoked homeowner ("You no longer have access to this studio's portal."). `INV-API:285-295`, `api/ho/auth/verify/route.ts:79-84`

### (8) Data
- **I-42** Tables written: `homeowner_profiles` (studio_id, phone E.164, name), `homeowner_project_links` (homeowner_id, project_id, lead_id, studio_id, role, portal_token, chat_history_visible, is_active, linked_at), `conversations`. Read: `projects`, `leads`, `studios` (name, portal_slug). `INV-API:37-42,222-258,298-349,357-361`
- **I-43** The dialog reads the studio's slug from `GET /api/studio-setup/portal-slug`. `INV:89-105`, `src/app/api/studio-setup/portal-slug/route.ts:23-43`

### (9) Responsive
- **I-44** The header button exists only at `lg` and up; phones and tablets reach it through the ⋯ menu. The dialog is `max-w-[calc(100%-2rem)]` on small screens. `PP:1711,1783`, `src/components/ui/dialog.tsx:64`

### (10) Problems
- **I-45** The button's name promises an invitation, but access already exists for any lead with a phone and nothing is "sent" by the product; a studio cannot tell who has access or withdraw it. `INV-API:365-369`, migration above
- **I-46** The dialog's "reset form when dialog opens" code runs only on Radix's `onOpenChange(true)`, which a parent-controlled dialog never fires — so a reopened dialog keeps the previous name, phone, toggle, error and fallback link. **[inferred]** `INV:113-126,233`
- **I-47** Project-flow links get role **"owner"**, lead-flow links role **"primary"**, family members **"secondary"** — three role words, and several lookups require "primary" (questionnaire, phone sync, promote), so an "owner" link is invisible to them. `INV-API:306`, `api/ho/scope-answers/route.ts:49`, `HB:691`
- **I-48** The message says "mAIson portal" while the portal is meant to be white-label ("the OpenMaison platform logo must NOT appear to the homeowner"). `INV-API:374`, `cmp/portal-header.tsx:57-58`
- **I-49** The route updates the profile name without checking the result, and does not check the result of the chat-flag or re-activate updates either. `INV-API:237-240,281-294`
- **I-50** The phone the studio types is appended to the dial code without the region normaliser the login uses; the login's digit-matching fallback exists to paper over exactly this kind of drift. `INV:177`, `src/lib/homeowner-phone-resolve.ts:1-22`

---

## 2. Studio project page — "Preview as Homeowner"

### (1) What it is / entry points
- **I-51** Header button **"Preview as Homeowner"** (icon `Eye`, outline-secondary), shown only when the studio has the `tools/homeowner-portal` page enabled; tooltip **"Open the homeowner portal in a new tab in read-only preview mode (30-minute session)."** `PP:1758-1775`
- **I-52** It calls `window.open('/api/studio/preview-as-homeowner?projectId=…', '_blank', 'noopener')`; the same row sits in the ⋯ menu below `lg`. `PP:1765,1799-1803`
- **I-53** Three more ways in: **"Open as homeowner"** in the Gantt's Homeowner preview dialog and in its Client-Facing view, and **"Open as homeowner"** on Tools › Homeowner Portal › Project Links. `src/components/projects/homeowner-preview-dialog.tsx:87-98`, `src/components/projects/gantt-chart.tsx:2526-2537`, `TOOLS:503-512`
- **I-54** A lighter, in-app preview also exists: Gantt › settings popover › **"Preview homeowner view"** opens a dialog titled **"Homeowner preview"** / **"This is what your homeowner sees right now."** that renders the portal's own timeline component from the studio's unsaved state, filtered to published, client-visible milestones. `src/components/projects/gantt-chart.tsx:2342-2347,3684-3690`, `src/components/projects/homeowner-preview-dialog.tsx:38-57,77-82`

### (2) Layout
- **I-55** The live preview is the homeowner's project page with one addition: a sticky, full-width amber bar at the very top (`sticky top-0 z-50 bg-tertiary-yellow text-white px-4 py-2 … shadow-md`), content centred. `HP:2456-2470`
- **I-56** The in-app dialog is `max-w-2xl max-h-[80vh] flex flex-col`: a fixed header row (icon tile, title, "Open as homeowner") over a scrolling grey panel holding the timeline. `src/components/projects/homeowner-preview-dialog.tsx:69-116`

### (3) UI elements
- **I-57** Banner text **"🔍 Preview as homeowner · Read-only"** and a translucent white button **"Close preview"** (becomes **"Closing…"**). `HP:2457-2469`
- **I-58** In-app dialog empty state: **"Your homeowner can't see anything yet — no milestones are published."** / **"Publish at least one milestone from the timeline to populate this preview."** `src/components/projects/homeowner-preview-dialog.tsx:102-110`
- **I-59** Client-Facing view heading **"What your homeowner sees"** / **"Read-only preview of the published timeline. Switch to Internal view to make changes."**; empty **"No milestones are visible to your homeowner yet."** / **"Publish at least one milestone to populate the homeowner timeline."** `src/components/projects/gantt-chart.tsx:2519-2546`

### (4) Interactions — what the preview shows
- **I-60** The route checks the studio session and that the project is the studio's, signs a preview token `{studioUserId, studioId, projectId, expiresAt}`, sets it as the `homeowner_preview_session` cookie (httpOnly, lax, 30 min) and answers with a 302 to `/my/projects/{id}?preview=1`. `src/app/api/studio/preview-as-homeowner/route.ts:22-75`
- **I-61** The page reads `?preview=1` to show the banner and switch every write off; the server independently refuses writes from a preview session with **"This action is not available in preview mode"** or **"Preview mode is read-only"** (403). `HP:149,215`, `src/lib/homeowner-route-auth.ts:111-123`, `api/ho/p/issues/route.ts:127-129`
- **I-62** What a previewing studio sees: the same tabs, timeline, milestones to confirm (buttons disabled with **"Read-only preview — the real homeowner will see clickable buttons here."**), finance, quote, variation orders, documents, renders, floor plan (read-only) and tickets — all real data for that project. `cmp/milestone-approval.tsx:160-164`, `HP:292-298`
- **I-63** What it cannot show: the homeowner's to-dos (the route returns an empty list in preview), the notification feed (empty), chat ownership (no message is "mine"), likes marked as mine. `api/ho/p/tasks/route.ts:29-33`, `api/ho/p/notifications/route.ts:34-36`, `api/ho/p/design/route.ts:16`
- **I-64** Preview-mode hints on individual controls: like → toast **"Preview mode — a real homeowner login can react."**; comment → **"Preview mode — a real homeowner login can comment."**; render thread foot **"Preview mode — a real homeowner login can comment here."**; annotate → **"Preview mode — a real homeowner login can annotate."** and **"Preview mode — a real homeowner login can drop pins and comment here."**; ticket reply → **"Preview mode — a real homeowner login would post this reply."**; close ticket → **"Preview mode — a real homeowner login would close the ticket."**; report dialog banner **"Preview mode — submitting won't actually file a ticket. A real homeowner login will."** and toast **"Preview mode — a real homeowner login would file this ticket and notify your team."** `HP:1628,1637,1715,1989,2019,2219,2257`, `cmp/render-annotator.tsx:69,339`

### How it ends
- **I-65** "Close preview" posts to `/api/studio/preview-as-homeowner/end` (clears the cookie), then closes the tab if `window.opener` exists, else goes back in history. `HP:2444-2455`, `src/app/api/studio/preview-as-homeowner/end/route.ts:8-17`
- **I-66** The cookie also lapses by itself after 30 minutes; a preview token for one project is refused on any other project (**"Preview is scoped to a different project"**). `src/app/api/studio/preview-as-homeowner/route.ts:20`, `src/lib/homeowner-route-auth.ts:57-59`
- **I-67** A preview cookie wins over a real homeowner cookie when both are present, so a studio member testing with a stale homeowner login still sees the previewed project. `src/lib/session.ts:82-110`

### (5) States
- **I-68** Route errors are bare JSON in the new tab: **"Not authenticated — log in as a studio admin first"**, **"Invalid studio session"**, **"projectId query param required"**, **"Project not found or not in your studio"**, **"Database error"**, **"Internal server error"**. `src/app/api/studio/preview-as-homeowner/route.ts:26-78`

### (6) Motion
- **I-69** None of its own; the banner is static, the button has `transition-colors`. `HP:2466`

### (7) Rules
- **I-70** Any studio member can mint a preview for any project in their studio; no OTP. `src/app/api/studio/preview-as-homeowner/route.ts:24-52`
- **I-71** The edge proxy lets `/my/*` pages and `/api/homeowner/*` through on either cookie. `src/proxy.ts:259-292`
- **I-72** Previews never write the homeowner's last-seen stamp. `api/ho/p/route.ts:80-83`

### (10) Problems
- **I-73** **The preview needs a real homeowner session to render.** The project page sits inside `PortalShell`, which calls `/api/homeowner/auth/me`; that route reads only the real `homeowner_session` cookie, so with a preview cookie alone the shell finds nobody signed in, renders nothing and replaces the address with `/my/login`. The UAT record that marks preview as passing ran it straight after a real homeowner login in the same browser. **[inferred, not run]** `cmp/portal-shell.tsx:46-78`, `api/ho/auth/me/route.ts:9-18`, `docs/features/portal-merge-integration/uat-findings.md:90-91`
- **I-74** "Close preview" cannot close the tab: every opener uses `noopener`, so `window.opener` is null and the code falls to `history.back()`, which in a fresh tab has nowhere to go. **[inferred]** `PP:1765`, `HP:2453-2454`
- **I-75** The banner follows the address (`?preview=1`), not the session: leaving the project page (Back to Dashboard, the bell) drops the banner while the cookie stays live for the rest of its 30 minutes. `HP:149`
- **I-76** "Back to Dashboard" in preview goes to `/my` or the real homeowner's dashboard — the dashboard API accepts only a real session, so the studio sees either a redirect or another person's home. `HP:144`, `api/ho/dashboard/route.ts:10-20`
- **I-77** In preview some writes are stopped only by the server: "I've Made Payment" opens the proof dialog and the submit fails with the 403 text; "I've paid this invoice" fails silently (only a console error); the Selections board takes no preview flag at all, so Approve / Reject look live. `HP:832,876-882,293`, `HP:676-684`
- **I-78** Four names for one thing: "Preview as Homeowner" (header), "Open as homeowner" (Gantt, Tools), "Preview homeowner view" (Gantt popover), "Homeowner preview" (dialog title); comments still call it "Log in as client". `PP:1768`, `src/components/projects/gantt-chart.tsx:2346,2535,3681`
- **I-79** A second, unused route builds a login URL with the homeowner's phone pre-filled (`/api/studio/preview-login-url`) and the login page still reads `?phone=`; nothing calls the route. `SLG:33-41`, `src/app/api/studio/preview-login-url/route.ts:121`

---

## 3. Studio-side signals and sharing switches that feed the portal

### Homeowner response banner
- **I-80** On the project's Management tab only, above the sub-tabs, a banner reports milestone answers from the homeowner; it renders nothing when there are none. `PP:2596-2600`, `src/components/projects/homeowner-response-banner.tsx:37-58`
- **I-81** Revision state (wins over approvals): red-tinted rounded-2xl card, `AlertCircle`, **"Homeowner requested a revision"** / **"Homeowner requested {n} revisions"**, **"Review the milestone(s) below and respond before continuing."**, then up to three rows (milestone name, the comment in curly quotes clamped to two lines, a chevron) and **"+{n} more — scroll the timeline to see all"**. `src/components/projects/homeowner-response-banner.tsx:79-125`
- **I-82** Approval state: a green strip with `ThumbsUp`, **"Homeowner approved a milestone"** / **"Homeowner approved {n} milestones"** + **" — most recent: {name}"**, and an ✕ that dismisses it; dismissal is kept in `localStorage` under `qanvast:homeowner-approval-banner-dismissed:{project}:{latest timestamp}`, so a newer approval shows it again. `src/components/projects/homeowner-response-banner.tsx:59-75,127-145`
- **I-83** Problem: the revision rows are buttons that call `onMilestoneClick`, but the project page mounts the banner without that prop — pressing a row does nothing. `PP:2598`, `src/components/projects/homeowner-response-banner.tsx:96-100`
- **I-84** The studio is also told by bell: `milestone.homeowner_approved` / `milestone.homeowner_revision_requested`, with the action link `/projects/{id}?tab=management&milestone={id}`. `api/ho/p/milestones/[milestoneId]/approve/route.ts:166-183`

### What decides what a homeowner sees for one project (the real per-project switches)
- **I-85** **Milestones**: only milestones with a *published snapshot* and `clientVisible !== false`; the homeowner sees the snapshot's name, dates and status, never unpublished edits. `api/ho/p/route.ts:255-284`
- **I-86** **Files**: private by default; the file's ⋯ menu has **"Show to homeowner"** / **"Hide from homeowner"**, a shared file carries a small **"HOMEOWNER"** chip, and the help text reads **"Files are private to your studio by default. Use a file's ⋯ menu → “Show to homeowner” to let your client download it from their portal. Internal files like cost sheets and supplier quotes stay hidden unless you share them."** `PP:4311,4362-4363,4395-4396`
- **I-87** Toggling a file toasts **"“{name}” is now visible to the homeowner"** / **"“{name}” hidden from the homeowner"**; a render in the Renders folder with a public URL is also added to the portal's Renders tab — **"“{name}” shared to the homeowner portal — visible in Documents and Renders"** — or, when no homeowner link exists, **"… is now visible to the homeowner"** with **"Invite the homeowner to their portal to also enable render feedback."** `PP:1142-1204`
- **I-88** **Renders**: `POST /api/homeowner-links/share-render` adds one `homeowner_shared_assets` row (idempotent on link + URL); `DELETE` removes it from every link on the project and, as its comment says, **discards any likes and comments** left on it. `src/app/api/homeowner-links/share-render/route.ts:55-72,96-108,135-140`
- **I-89** **Quotes**: only quotes the studio explicitly sent to the portal (ids kept in `leads.quote_metadata.portalSharedQuotes`). `api/ho/p/quotes/route.ts:63-82`
- **I-90** **Progress updates**: only updates whose review status is "approved". `api/ho/p/updates/route.ts:37-43`
- **I-91** **Selections**: every selection that is not a draft. `api/ho/p/selections/route.ts:36-45`
- **I-92** **Variation orders**: client-direction orders in status pending_client, approved or rejected. `api/ho/p/variation-orders/route.ts:19,53-59`
- **I-93** **Tickets**: escalations flagged `is_homeowner_visible`. `api/ho/p/issues/route.ts:75-80`
- **I-94** **Invoices**: everything except drafts and voids. `api/ho/p/finance/route.ts:40-49`
- **I-95** **To-dos**: tasks assigned to that homeowner on that project. `api/ho/p/tasks/route.ts:48-53`

### Render feedback seen by the studio
- **I-96** Files & Docs carries a panel **"Homeowner feedback on shared renders"** — **"Likes, comments, and pinned notes on renders you shared. Drop your own pins to point things out."** — with a card per shared render (pin count badge, ♥ count, comment count) and an annotator. `src/components/projects/shared-render-feedback.tsx:1-9,118-119`
- **I-97** The studio can add a pin, reply on a pin thread, resolve / reopen any pin and delete its own pins through `POST / PATCH / DELETE /api/homeowner-links/render-annotations`; author role and name are stamped from the session, never taken from the browser. `src/app/api/homeowner-links/render-annotations/route.ts:19-28,171-182,212-247,266-271`
- **I-98** Limits and messages: at most 100 pins per render (**"This render has too many pins already"**), 2,000 characters (**"Note is too long"** / **"Reply is too long"**), **"Note cannot be empty"**, **"Reply cannot be empty"**, **"Pin position is out of range"**, **"You can only remove your own pins"**, **"Pin not found"**, **"Render not found"**. `src/app/api/homeowner-links/render-annotations/route.ts:38-40,157-169,209,227-230,269-270`
- **I-99** The flat like / comment thread stays one-way: only homeowners write comments; the studio reads. `api/ho/p/renders/[assetId]/comment/route.ts:63-70`

### Small studio-side routes in this slice
- **I-100** `GET /api/homeowner-links/active-link?projectId=` → `{ linkId | null }` (first active link, used to key a shared render). `src/app/api/homeowner-links/active-link/route.ts:22-45`
- **I-101** `GET /api/homeowner-links/project-homeowner?projectId=` → `{ homeowner: { id, name, phone, linkId } | null }` (earliest active link). `src/app/api/homeowner-links/project-homeowner/route.ts:31-54`
- **I-102** `GET /api/homeowner-links/shared-renders?projectId=` → every shared asset across the project's links with likes, comments and pins. `src/app/api/homeowner-links/shared-renders/route.ts:37-55`
- **I-103** `POST /api/homeowner-bind` runs one of six server helpers with the studio forced from the session: ensureHomeownerForLead, attachProjectToLeadLink, notifyMilestoneStatusChange, notifyInvoiceSent, notifyHomeownerProgressUpdate, syncPrimaryHomeownerPhone. `src/app/api/homeowner-bind/route.ts:13-48`, `src/lib/homeowner-bind-client.ts:16-21`

### Notifications the studio's actions raise for the homeowner (bell only)
- **I-104** Milestone status: **"Milestone complete: {name}"** / **"Your studio has marked this milestone as complete."**, otherwise **"Milestone update: {name}"** / **"Status: {status}"**; opens `?tab=overview`. `HB:199-226`
- **I-105** Invoice sent: **"Invoice {number} sent"** / **"Total {amount}. Open Finance to view + pay."**; opens `?tab=finance`. `HB:255-280`
- **I-106** Variation pending: **"Variation {number} needs your approval"** / **"{title} — {±amount}. Open your portal to review and approve."** or, for a quote-backed variation, **"… Open the signing link your designer sent to review and e-sign."** `HB:298-332`
- **I-107** Payment verified: **"Payment for {invoice} confirmed"** / **"Your studio confirmed your {amount} payment. Thanks!"** `HB:347-372`
- **I-108** Receipt: **"Receipt {receipt no} for {invoice}"** / **"Your receipt for {amount} is ready."** `HB:385-410`
- **I-109** Ticket reply: **"New reply on {ticket}"** / **"{author}: {excerpt}"**; resolved: **"Ticket resolved: {ticket}"** / **"Your studio marked "{subject}" as resolved."**; both open `?tab=messages&issue={ticket}`. `HB:425-486`
- **I-110** Quote shared: **"A new quote was shared"** / **"Your studio shared a quote for you to review."** (opens Finance, or the engagement page for a lead-only link). `HB:502-528`
- **I-111** Signature requested: **"Ready for your signature"** / **"Your studio sent a quote for you to review and sign."** (always opens `/my/engagement/{link}`). `HB:544-566`
- **I-112** Progress update (only once approved): **"New project update"** / the update's title or **"Your studio posted a project update."** `HB:595-646`
- **I-113** All of these fan out to every active link on the project and are best-effort: a failure is logged and never blocks the studio's action. `HB:206-246`
- **I-114** There is no homeowner SMS, WhatsApp or email for any of them — the bell inside the portal is the only channel, so a homeowner who is not looking at the portal is not told. `HB` (whole file inserts into `homeowner_notifications` only)

---

## 4. Family members and "Project Links" (Tools › Homeowner Portal, second tab)

### (1) What it is
- **I-115** Tools › **"HomeOwner Portal"** has two tabs, **Configuration** and **Project Links**; Project Links is a directory of every project and every lead not yet a project, for managing who can open the portal. `TOOLS:142-181,235-270`
- **I-116** Intro: **"Manage portal access per homeowner — every lead in your CRM and every project shows up here. Look up by name, phone, or email, then update contact details or invite family members. Each homeowner logs in with their own phone, so the same project can be shared securely with multiple people."** `TOOLS:169-171`

### (2) Layout
- **I-117** `grid grid-cols-1 lg:grid-cols-12 gap-6`: a 4-column card "Select Homeowner" (search + list, `max-h-[480px]` scroll) and an 8-column detail column of three cards. `TOOLS:286-362`

### (3) UI elements
- **I-118** List rows: name, a **"Project"** (green) or **"Lead"** (purple) badge, phone or email or **"No contact info"**, and the project name. Search placeholder **"Search by name, phone, email, or project"**. Empty: **"No homeowners yet"** / **"No homeowners match your search"**. `TOOLS:292-336`
- **I-119** Nothing selected: icon `Users`, **"Select a homeowner"**, **"Choose a homeowner from the left to manage their portal access."** `TOOLS:351-359`
- **I-120** Card 1: name, badge, "{project} · #{seq}" or "Lead · {bucket}", and **"Open as homeowner"** (projects) or **"Open portal link"** (leads; disabled without a slug). `TOOLS:477-526`
- **I-121** Card 2 **"Portal Users"** with **"Add Family Member"**: a **"Primary"** row (name, phone, email or "No contact info") built from the project / lead record, then one row per family member with a **"Family"** badge, phone and a bin icon (title "Remove family member"); foot note **"Family members can be added to view the same portal. Each member logs in with their own phone number."** `TOOLS:528-605`
- **I-122** Card 3 **"Update Contact Details"** — **"Updating the primary phone number syncs to the lead record and any related projects so they all stay aligned."** — a phone input and **"Update"**. `TOOLS:607-633`
- **I-123** Dialog **"Add Family Member"**: **"Full Name"** (placeholder "E.g., Sarah Tan"), **"Phone"** with helper **"They'll log in with this number on the homeowner portal."**, **"Email (optional)"** (placeholder "sarah@email.com"); buttons **"Cancel"** / **"Add Member"**. `TOOLS:683-729`

### (4) Interactions and (7) rules
- **I-124** Adding finds or creates the profile for (studio, phone) and inserts a link with role "secondary" scoped to the project, or to the lead when there is no project; toast **"Family member added"**; validation toast **"Name and phone are required"**. `TOOLS:661-680`, `api/portal/family-members/route.ts:157-221`
- **I-125** Removing is one press with no confirmation and **hard-deletes** the link row. `TOOLS:589-597`, `api/portal/family-members/route.ts:232-248`
- **I-126** Updating the phone writes the lead, every project from that lead, and the primary homeowner profile (the number the OTP is sent to); toast **"Contact updated"**, conflict toast **"Another homeowner in this studio already uses this phone"** / **"Phone already in use by another homeowner"**, failure **"Failed to update contact"**. `TOOLS:390-472`, `HB:667-711`
- **I-127** A designer sees only projects and leads assigned to them; owners see all. `TOOLS:242,258`
- **I-128** Family members see the same project as the primary; shared renders and documents are gathered across every link on the project so a co-owner sees what was shared through the other's link. `src/lib/homeowner-route-auth.ts:84-107`
- **I-129** Each family member has their own likes, comments and pins (entries carry the homeowner id). `api/ho/p/renders/[assetId]/like/route.ts:49-53`

### (10) Problems
- **I-130** No message goes to a family member when they are added — no WhatsApp draft, no link — the studio must tell them the address itself. `api/portal/family-members/route.ts:121-221`
- **I-131** Re-adding a phone that already has a link in that scope sets its role to "secondary" — adding the primary's own number demotes the primary, which breaks the lookups that need "primary". `api/portal/family-members/route.ts:193-198`
- **I-132** The "Primary" row is the project's client record, not a link: it shows even when that person has no portal access, and people invited from the project header (role "owner") never appear in the list, which filters on "secondary". `TOOLS:541-573`
- **I-133** The delete endpoint accepts any link id of the studio — including a primary link — and nothing warns that the homeowner's shared renders hang off the link. `api/portal/family-members/route.ts:232-243`
- **I-134** The page comment says per-homeowner invitations here are a "future feature". `TOOLS:104-106`

---

## 5. Portal login and session

### (1) What it is / entry points
- **I-135** `/my/{studioSlug}/login` — the studio-branded phone + OTP login, public. `SLG:27-31`, `src/proxy.ts:237-253`
- **I-136** `/my/login` — no form any more; a signpost page for people who followed an old link. `src/app/my/login/page.tsx:3-16`
- **I-137** `/my/{studioSlug}/p/{portalToken}` — a durable personal link that routes to the right place *after* login; it is not a way round the OTP. `src/app/my/[studioSlug]/p/[portalToken]/page.tsx:1-28,72-74`

### (2) Layout
- **I-138** The login form is one white card (`rounded-2xl shadow-sm border px-6 py-8`) placed by one of six login layouts; the portal chrome is deliberately not drawn around it. `SLG:221,307`, `SL:161-163`
- **I-139** **Centered** (default): full-height centred column `max-w-sm` on a soft wash (the surface tint, or 5 % of the brand colour on white); logo, title and subtitle above the card. `cmp/login-layouts/centered-login-layout.tsx:29-63`, `SLG:201-218`
- **I-140** **Split**: `grid-cols-1 lg:grid-cols-2`; left panel in the brand colour or the background photo with a colour overlay, logo / studio name / tagline / welcome message bottom-left; form right. On phones the image is a 180 px strip on top. `cmp/login-layouts/split-login-layout.tsx:30-95`
- **I-141** **Split Reverse**: the mirror on desktop (form left), identical to Split on phones. `cmp/login-layouts/split-reverse-login-layout.tsx:26-83`
- **I-142** **Full Bleed**: the photo (or a 135° brand gradient) fills the screen; white text and logo above a frosted card (`bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl`), column `max-w-md`. `cmp/login-layouts/fullbleed-login-layout.tsx:20-87`
- **I-143** **Hero Top**: a banner at least 50 vh tall, then the card overlapping its lower edge by 24–32 px (`-mt-6 sm:-mt-8`). `cmp/login-layouts/hero-top-login-layout.tsx:27-81`
- **I-144** **Framed**: a brand-coloured "letterhead" card (logo, name, tagline, welcome) stacked 12 px above the form card on an 8 % brand wash; needs no photo. `cmp/login-layouts/framed-login-layout.tsx:18-57`

### (3) UI elements
- **I-145** Phone step: **"Enter your mobile number to sign in"**; a dial-code button (bold 24 px code + chevron that rotates when open) opening a list of countries (code, label, a ✓ on the current one); a thin divider; a borderless 24 px bold number input (autofocus, region placeholder); a full-width pill **"Continue"** (**"Checking..."** while loading), black when valid, grey when not; footer **"by proceeding you agree to the terms & conditions"**. `SLG:221-305`
- **I-146** OTP step: a back arrow top-left; **"Enter OTP sent to {+code 1234 5678}"**; six 44×56 px borderless digit boxes with placeholder "0"; **"Resend OTP in {n}s"** then an underlined **"Resend OTP"**; pill **"Verify OTP"** (**"Verifying..."**). `SLG:307-365`
- **I-147** Centered header: logo (scaled by the studio's logo-size setting), **login title** (default "Welcome") and **subtitle** (default "Log in to view your project with {studio}"). `SLG:187-188,201-218`
- **I-148** Optional lines from branding: an italic tagline, a rich-text welcome message (sanitised), and a trust line **"Secure · End-to-end encrypted"** with a lock icon. `cmp/login-layouts/centered-login-layout.tsx:47-60`, `cmp/login-layouts/welcome-message.tsx:11-33`
- **I-149** `/my/login`: the OpenMaison logo, a building icon, **"Use your studio's portal link"**, **"Each interior design studio has its own portal. Your designer should have shared a link with you — it looks like:"**, `openmaison.ai/my/studio-name`, **"Don't have it? Ask your designer to resend."**, and a small form **"Or enter your studio's name"** — `/my/` + input "studio-name" + an arrow button — that goes to `/my/{slug}/login`. `src/app/my/login/page.tsx:34-94`

### (4) Interactions
- **I-150** Continue posts phone, country and slug to `/api/homeowner/auth/login`; Enter submits. On success the OTP step opens with a 30 s resend cooldown. `SLG:66-103,275`
- **I-151** OTP boxes: typing moves to the next box, Backspace on an empty box moves back, paste into the first box fills all six, Enter verifies when six digits are in. `SLG:154-181`
- **I-152** After a good OTP the page does a full reload to `?next=` when that starts with `/my/{slug}/`, else to `/my/{slug}`. `SLG:119-127`
- **I-153** Picking another country clears the number. `SLG:244-249`

### (5) States (copy verbatim)
- **I-154** Not known to this studio: **"You haven't been invited yet. Ask your interior design studio to send you an invite."** (shown in grey, not red). `SLG:89,296`
- **I-155** Known but without an active link: **"You haven't been invited by {studio} yet. If you have an account with another studio, sign in via /my/login."** `SLG:83-87`
- **I-156** OTP could not be sent: toast **"Could not send OTP SMS. Please try again shortly."** — and the OTP step opens anyway; resend failure **"Could not resend OTP SMS. Please try again shortly."** `SLG:93-97,145-147`
- **I-157** Other errors: **"Something went wrong"**, **"Network error. Please try again."**, **"Invalid OTP"**; from the server **"Too many requests. Please try again later."**, **"Phone is required"**, **"Invalid phone number: {reason}"**, **"Studio not found."**, **"Please use the portal link your studio shared with you."**, **"Invalid or expired OTP"**, **"No account found for this studio."**, **"You no longer have access to this studio's portal."**. `SLG:78,99,116`, `api/ho/auth/login/route.ts:12-59`, `api/ho/auth/verify/route.ts:24-84`
- **I-158** Unknown slug: **"Studio not found"** / **"The portal link may be incorrect. Please contact your designer."** `SL:141-149`
- **I-159** Portal switched off by the studio: **"Portal paused"** / **"{studio} has temporarily paused this portal. Please contact your designer for updates."** `SL:151-160`
- **I-160** While studio settings load: the word **"Loading..."** pulsing in the centre. `SL:136-140`
- **I-161** Token link states: **"This link is no longer active"** / **"Ask your studio to share a fresh portal link, or sign in at the studio's portal page."**; and **"This link belongs to a different homeowner"** / **"You're signed in with a different account. Sign out and sign in with the phone number this link was sent to."** with a button **"Sign out and try again"** (**"Signing out…"**). `src/app/my/[studioSlug]/p/[portalToken]/page.tsx:125-152`, `…/sign-out-button.tsx:25-40`

### (6) Motion
- **I-162** Buttons: `transition-[color,background-color,transform]` with `active:scale-[0.98]` and `hover:opacity-90`; the country chevron `transition-transform` to 180°; list rows `transition-colors`. `SLG:234,250,286-290`
- **I-163** "Loading..." uses Tailwind `animate-pulse`. `SL:139`

### (7) Rules
- **I-164** Login is scoped to one studio: the slug resolves the studio, the phone is validated and normalised for the chosen country, and the profile is looked up inside that studio — exact match first, then a digit-equality scan (up to 2,000 profiles) that tolerates spaces and a missing dial code and prefers the profile that holds an active link. `api/ho/auth/login/route.ts:26-70`, `src/lib/homeowner-phone-resolve.ts:85-134`
- **I-165** The OTP is Twilio Verify; both steps are rate-limited per IP (keys `ho-login`, `ho-verify`). `api/ho/auth/login/route.ts:10-17,83-89`, `api/ho/auth/verify/route.ts:12-19,35-39`
- **I-166** The session cookie `homeowner_session` is an HMAC-signed JSON of `{homeownerId, phone, name, studioId, studioSlug}`, httpOnly, lax, 30 days; each good login is tracked as `portal_login`. `api/ho/auth/verify/route.ts:97-123`, `src/lib/session.ts:21-36`
- **I-167** One session, one studio: visiting another studio's `/my/{slug}/…` while signed in elsewhere bounces to that studio's login. `SL:80-99`
- **I-168** Signing out clears the cookie and the query cache and returns to the studio's own login. `src/context/homeowner-session-context.tsx:82-92`
- **I-169** Every `/my/*` page and `/api/homeowner/*` call without a valid cookie is redirected to the login (pages) or answered 401 (APIs); the first path segment is used as the slug unless it is `projects`, `engagement` or `login`. `src/proxy.ts:259-292`
- **I-170** Every project-scoped API re-checks that this homeowner holds an active link to that project (403 **"Access denied"** otherwise) and rejects non-UUID ids. `src/lib/homeowner-route-auth.ts:42-82`

### (9) Responsive
- **I-171** Split layouts stack below `lg`; logos scale with `--portal-logo-scale` (0.5×–2×) with a fixed max width so wide logos letterbox. `cmp/login-layouts/split-login-layout.tsx:30-33,65`

### (10) Problems
- **I-172** The login always starts on **+65 Singapore** whatever the studio's country. `SLG:50`
- **I-173** The login title and subtitle the studio writes show only in the **Centered** layout; the other five never render them, though the settings field sits above all of them. `SLG:201`, `set/portal-branding-config.tsx:258-266`
- **I-174** **"Secure · End-to-end encrypted"** is offered as a "trust badge"; nothing here is end-to-end encrypted. `set/portal-branding-config.tsx:314-315`
- **I-175** **"terms & conditions"** is underlined with a pointer cursor and is not a link. `SLG:301-304`
- **I-176** The not-linked message sends people to `/my/login`, which cannot sign anyone in. `SLG:86`
- **I-177** A failed SMS still advances to the OTP step. `SLG:93-97`
- **I-178** OTP boxes have no `autocomplete="one-time-code"`, and paste works only in the first box. `SLG:320-336`
- **I-179** The cookie payload carries no expiry of its own (only the browser's 30-day max-age), and `/auth/me` does not re-check that the link is still active. **[inferred]** `src/lib/session.ts:32-36`, `api/ho/auth/me/route.ts:15-33`
- **I-180** The durable token link `/my/{slug}/p/{token}` is only ever generated for the questionnaire invite; the invite dialog sends the plain login URL. `src/lib/scope-answers/invite.ts:160-162`, `INV-API:370-372`
- **I-181** A signed-out homeowner who opens a project or engagement address directly (an old tab, a forwarded link) is sent to `/my/login` — the signpost that asks for the studio's name — not to their studio's login, because those addresses carry no slug; and after signing in they land on the home page, not where they were going (`?next=` is honoured only for paths under `/my/{slug}/`). `src/proxy.ts:262-274`, `SLG:123-127`

---

## 6. Portal home (all projects) and the branded chrome

### (1) What it is / entry points
- **I-182** `/my/{studioSlug}` is the homeowner's home: every project and every pre-project engagement they hold with that studio. `src/app/my/[studioSlug]/page.tsx:12-146`
- **I-183** `/my` is deprecated: a signed-in homeowner is replaced straight to `/my/{slug}` behind a loader; only an old cookie with no slug still sees a generic version of the same page. `src/app/my/page.tsx:19-44`
- **I-184** `/my/{slug}/about` and `/my/{slug}/team` are optional studio pages reached from the top navigation. `src/app/my/[studioSlug]/about/page.tsx:14-31`, `…/team/page.tsx:13-20`

### (2) Layout — five layouts, chosen by the studio (default Modern)
- **I-185** The layout wraps home, About, Team and the lead-stage engagement page; `?previewLayout=` overrides it for the settings preview. `SL:116-124,165-201`, `cmp/branded-portal-chrome.tsx:47-75`
- **I-186** **Modern** — slate-50 page; a 4 px accent-colour stripe; a sticky translucent white header (`sticky top-0 z-30 bg-white/90 backdrop-blur border-b shadow-sm px-4 py-3`, inner `max-w-4xl`) with a 36 px rounded-xl logo chip, studio name, a pill nav inside a grey capsule (desktop) and the bell + profile; content in one white card (`max-w-4xl`, radius / shadow / padding from branding); a centred footer; on phones a **floating bottom nav** (`fixed bottom-3 left-3 right-3 rounded-2xl shadow-lg`). `cmp/layouts/modern-layout.tsx:23-123`
- **I-187** **Minimal** — pure white, no bar: studio mark floating top-left (`absolute top-6 left-6`, 11 px uppercase letter-spaced name), bell + a round menu button top-right; a narrow `max-w-xl` column with `pt-24 sm:pt-28`; light-weight type; a full-screen white overlay menu of large light links; an italic 10 px footer. `cmp/layouts/minimal-layout.tsx:26-96`
- **I-188** **Traditional** — slate-100 page; a dark brand-tinted header (`--portal-chrome`) with logo, studio name and the italic serif line **"Client Portal"**; uppercase letter-spaced nav divided by hairlines; a 3 px accent strip; a white bordered card (`max-w-5xl`); a white footer **"© {year} {studio}. All rights reserved."** and **"Confidential · Authorized Access Only"**; a dark bottom nav on phones. `cmp/layouts/traditional-layout.tsx:24-109`
- **I-189** **Premium** — stone-50 page; a centred dark hero header (logo, studio name in spaced uppercase serif, the line **"— Private Residences Concierge —"**); a 2 px accent line; a centred uppercase nav with an accent underline on the active item; a `max-w-3xl` white card; a dark footer **"{studio} — Established Excellence"** and **"Powered by OpenMaison"**. `cmp/layouts/premium-layout.tsx:32-135`
- **I-190** **Detailed** — an app frame: a fixed 240 px dark sidebar on desktop (logo tile, studio name over **"Workspace"**, a **"Search…"** box, a "WORKSPACE" section with nav rows and a 2 px brand marker on the active one, footer links); a white breadcrumb strip "{studio} / {page}" with the bell; a full-width main area in 13 px type; on phones a white header and a white bottom nav. `cmp/layouts/detailed-layout.tsx:27-156`
- **I-191** Shared knobs honoured by the layouts: card style (flat / soft / heavy / borderless), corner radius (sharp `rounded-sm` / soft `rounded-xl` / pill `rounded-3xl`), density (compact / comfortable / spacious paddings), surface tint (mixed 16 % into white), header text, footer text, a faint watermark of the logo bottom-right. `src/lib/portal-presets.ts:330-367`, `cmp/layouts/modern-layout.tsx:84-133`
- **I-192** Theming is by CSS variables on `.portal-root`: heading and body fonts (Google Fonts loaded at run time), `--color-primary-default` and its hover / variant shades mixed from the studio's primary, a dark "chrome" colour mixed from it, and the favicon swapped to the studio's. A too-light primary (luminance > 190) is darkened so white text stays readable. `cmp/layouts/portal-theme-styles.tsx:27-145`
- **I-193** The portal forces light theme by stripping the `dark` class before paint. `src/app/my/layout.tsx:23-25`, `SL:46`

### (3) UI elements
- **I-194** Greeting by tone and hour — friendly: **"Hi" / "Hello" / "Good evening"**; formal: **"Good morning" / "Good afternoon" / "Good evening"**; casual: **"Morning" / "Hey" / "Evening"** — then ", {first name}" (or "there"); below it **"Your projects with {studio}."** and the tagline in italics. `src/app/my/[studioSlug]/page.tsx:19-47,148-164`
- **I-195** A horizontally scrolling strip of count tiles, shown only when a count is above zero: **"Unsigned Quotes"** (`FileSignature`, amber), **"Overdue Invoices"** (`Receipt`, red), **"Pending Milestones"** (`Flag`, brand), **"Unresolved Issues"** (`AlertTriangle`, amber). The tiles are not pressable. `cmp/pending-actions.tsx:12-45`
- **I-196** Section **"Your Projects"** (`FolderKanban`): one full-width card per link — a 32 px avatar with the studio's initial on the brand colour, the project name (**"Untitled Project"**), the studio name, a chevron, and a stage pill. `cmp/project-card.tsx:44-74`
- **I-197** Pre-project (lead-only) cards use the lead's name (or **"Your project"**) and a stage word from the quote status: **"Getting started"**, **"Quote in review"**, **"Quote ready"**, **"Awaiting signature"**, **"Signed"**. `api/ho/dashboard/route.ts:79-118`
- **I-198** Section **"Recent Design Assets"** (only when Material Selections is on): the six latest shared assets as tiles (4:3 image, title or **"Untitled"**, type word). `src/app/my/[studioSlug]/page.tsx:97-135`, `api/ho/dashboard/route.ts:135-141`
- **I-199** If the studio published an About page its text also appears under the list as **"About {studio}"**. `src/app/my/[studioSlug]/page.tsx:25-32,139-143`
- **I-200** Top navigation: **Home**, **About** (when the About page is published, or a tagline or any profile fact exists), **Team** (published and at least one visible member); labels can be renamed by the studio; with only Home the navigation is not shown. `src/lib/portal-nav.ts:20-46`
- **I-201** Header right: the bell and a profile button (initials avatar, name from `sm`, chevron) whose menu shows the name, the word **"Homeowner"** and a red **"Sign out"**. `cmp/profile-menu.tsx:34-83`
- **I-202** About page: **"About {studio}"** rich text (sanitised; YouTube / Vimeo iframes allowed), then a profile card — cover photo with the studio name and tagline overlaid, **"Est. {year} · {studio}"**, **"Awards & Recognition"**, **"Get in touch"** (Phone, WhatsApp, Email, Office → Google Maps), **"Follow us"** (Instagram, Facebook, Pinterest, LinkedIn, TikTok, YouTube, Website). `cmp/about-us-page.tsx:24-75`, `cmp/studio-profile-card.tsx:31-149`
- **I-203** Team page: **"Our Team"**, a 1 / 2 / 3-column grid of cards — square photo (or an initial), name, role, bio clamped to three lines. `cmp/team-page.tsx:21-56`

### (4) Interactions
- **I-204** A project card opens `/my/{slug}/projects/{id}`, which immediately replaces itself with `/my/projects/{id}` (query kept); a lead-only card opens `/my/engagement/{linkId}`. `cmp/project-card.tsx:37-46`, `src/app/my/[studioSlug]/projects/[projectId]/page.tsx:27-33`
- **I-205** The dashboard refetches every 15 s. `src/lib/queries/homeowner.ts:18-24`

### (5) States
- **I-206** Loading: the morphing-shape loader centred (`py-20`). Error: **"Something went wrong loading your dashboard."** with **"Try again"** (reloads the page). Empty: `FolderKanban` icon, **"No projects yet"**, **"Your studio will invite you when your project begins."** `src/app/my/[studioSlug]/page.tsx:50-93`

### (6) Motion
- **I-207** Loader `animate-morph-loader`: a square in the brand colour that morphs diamond → octagon → squircle → star through `clip-path` (keyframes `morph-shape`, 3.2 s linear infinite, each step eased `cubic-bezier(0.45,0,0.55,1)`) while pulsing opacity 1 → 0.75 (`morph-pulse`, 2 s ease-in-out). `src/components/ui/shape-loader.tsx:27-31`, `src/app/globals.css:1274-1314`
- **I-208** Project card: `transition-[border-color,box-shadow]` to `hover:shadow-md` and a brand-tinted border; the chevron changes colour. Asset tiles: `hover:shadow-md` and the image `group-hover:scale-105 transition-transform`. `cmp/project-card.tsx:47,62`, `src/app/my/[studioSlug]/page.tsx:107,115`
- **I-209** Nav pills `transition-all`; Minimal's overlay menu appears without animation. `cmp/layouts/modern-layout.tsx:67`, `cmp/layouts/minimal-layout.tsx:52-56`

### (7) Rules and (8) data
- **I-210** `GET /api/homeowner/dashboard` (real session only): active links of this homeowner in the session's studio, minus studios whose portal is switched off; joins project name / stage and studio branding; adds lead names for lead-only links. `api/ho/dashboard/route.ts:30-119`
- **I-211** Counts: pending milestones = published, client-visible milestones whose status is "pending-approval"; overdue = invoices with status "overdue"; issues = homeowner-visible tickets open or in progress; unsigned quotes = linked leads whose quote status is "sent_for_signature". `api/ho/dashboard/route.ts:161-237`
- **I-212** Studio settings for the chrome come from the public `GET /api/portal/studio-settings?slug=`, which strips bank details and the email signature before answering. `src/app/api/portal/studio-settings/route.ts:24-53`, `src/lib/portal-branding-resolve.ts:183-192`

### (9) Responsive
- **I-213** Every layout swaps its desktop navigation for a phone bottom bar below `lg` (first four items; five in Detailed); content cards go edge-to-edge with 12 px gutters. `cmp/layouts/modern-layout.tsx:59,84,103-123`

### (10) Problems
- **I-214** When the studio has published neither About nor Team the navigation is empty, yet four layouts still draw the fixed phone bottom bar — an empty floating white capsule (Modern) or an empty strip (Traditional, Premium, Detailed) over the page. **[inferred]** `cmp/layouts/modern-layout.tsx:103-123`, `src/lib/portal-nav.ts:44-45`
- **I-215** Detailed's **"Search…"** is a static box with no behaviour, and "Workspace" with a caret implies a switcher that does not exist. `cmp/layouts/detailed-layout.tsx:44-62`
- **I-216** Premium prints **"Powered by OpenMaison"** although the header comment says the platform must not appear to the homeowner. `cmp/layouts/premium-layout.tsx:108`, `cmp/portal-header.tsx:57-58`
- **I-217** The count tiles cannot be pressed and are not governed by the "Action Queue" switch, whose help text says it covers the dashboard. `cmp/pending-actions.tsx:30-33`, `set/portal-features-config.tsx:77`
- **I-218** The dashboard counts a milestone as pending only at "pending-approval"; the project page also asks the homeowner to confirm "completed" ones — the two disagree. `api/ho/dashboard/route.ts:191-192`, `cmp/milestone-approval.tsx:28-31`
- **I-219** The stage pill's colour map knows "Planning", "In Progress", "Construction", "Installation", "Renovation", "Completed", "Cancelled"; the studio's project stages are Draft / Active / Closed, so project pills fall to plain grey. **[inferred]** `cmp/project-card.tsx:14-28`, `src/types/app.ts:285`
- **I-220** Asset tiles on the home page do nothing when pressed. `src/app/my/[studioSlug]/page.tsx:104-131`
- **I-221** Opening a project passes through an empty redirect page (it renders `null`), so there is a blank frame between home and project. `src/app/my/[studioSlug]/projects/[projectId]/page.tsx:27-33`

---

## 7. The project page — `/my/projects/{projectId}`

### 7.0 Shell, header and tabs

#### (1) What it is
- **I-222** The one project view for homeowners and for studio preview; address parameters: `?tab=` (overview · design · finance · documents · messages, plus legacy keys updates · selections · floor-plan · chat · issues mapped onto the new tabs), `?preview=1`, `?issue={ticket id}`. `HP:111-135,149,1789`

#### (2) Layout
- **I-223** `PortalShell`: a full-height column (`flex flex-col h-screen overflow-hidden`) — a 56 px header, a 3 px accent-colour strip, a scrolling main area (`flex-1 overflow-y-auto pb-20 lg:pb-0`), and below `lg` a fixed 64 px bottom bar with safe-area padding. `cmp/portal-shell.tsx:84-103`, `cmp/portal-header.tsx:53-56,146`, `cmp/portal-bottom-nav.tsx:18-19`
- **I-224** Header: left, a button with the studio logo (32 px high, max 160 px wide, or an initial tile) and name that returns to the home page; right, the bell and a profile button with a sign-out menu. Dark-header layouts (Traditional, Detailed, Premium) give this bar the dark brand chrome with white contents. `cmp/portal-header.tsx:59-141`, `cmp/portal-shell.tsx:21-30`
- **I-225** Project head: a white band (`px-4 sm:px-6 py-4`, inner `max-w-3xl`) with **"← Back to Dashboard"**, a 40 px avatar with the studio's initial, the project name (`text-lg font-bold`, truncated) and **"by {studio}"**. `HP:227-246`
- **I-226** Tab strip: a white band that scrolls sideways; tabs are `px-4 py-3 text-sm font-medium border-b-2`, the active one in the brand colour with a brand underline. The Design tab carries a red 16 px count of selections awaiting an answer. `HP:251-263`
- **I-227** Sub-tab bar (Design, Support only): a tinted band with pill buttons 32 px high (`rounded-full text-[12px]`), the active one filled in the brand colour; Selections carries the same count. `HP:266-280,313-340`
- **I-228** Content column: `px-4 sm:px-6 py-6 max-w-3xl mx-auto`; every section is a white `rounded-xl` card with a 1 px border and 16 px padding. `HP:282`

#### (3) Tabs and their switches
- **I-229** **Overview** (always) · **Design** (Material Selections or Floor Plan Collaboration on) · **Finance** (Invoices and Payments on) · **Documents** (Documents on) · **Support** (Chat or Raise a Support Ticket on). `HP:103-109,170-172`
- **I-230** Design sub-tabs: **Renders**, **Selections** (both under Material Selections), **Floor Plan**. Support sub-tabs: **Raise a Support Ticket** (first), **Chat** (off by default). `HP:81-93`
- **I-231** A tab or sub-tab switched off while open falls back to Overview or to the first allowed sub-tab. `HP:183-200`

#### (5) States
- **I-232** Loading: the shape loader. Error: **"Something went wrong loading this project."** + **"Try again"** (page reload). No data: **"Project not found"**. Each tab has its own loader (`py-16`). `HP:216-224,2366`

#### (6) Motion
- **I-233** Tabs and pills change colour with `transition-colors`; switching tabs swaps content with no transition; there are no skeletons. `HP:255,323`

#### (7) Rules
- **I-234** `GET /api/homeowner/projects/{id}` returns the link, project (name, stage, property type, address, start date, contract value, country), studio (name, logo, country, feature switches, merged branding), published milestones with approval state, and stats (`progressPercent` = payment-weighted, half credit for in-progress). It refetches every 15 s. `api/ho/p/route.ts:296-365`, `src/lib/queries/homeowner.ts:97-102`
- **I-235** The page themes itself from that studio's branding (colours, fonts, tint, header darkness) through `PortalShell`, not through the studio's chosen layout. `HP:210-214`, `cmp/portal-shell.tsx:50-58,84-89`

#### (10) Problems
- **I-236** The phone bottom bar offers **Home · Chat · Projects · Settings**; Home works, the other three point at `/my/chat`, `/my/projects`, `/my/settings`, which do not exist and resolve as a studio slug — the homeowner ends on "Studio not found". **[inferred]** `cmp/portal-bottom-nav.tsx:6-11`, `SL:141-149`
- **I-237** The tab is taken from `?tab=` once, when the page mounts; later address changes do not move it. So a bell row pressed while on the project, and the update card's "View" invoice link, change the URL and leave the homeowner where they were. **[inferred]** `HP:154-157`, `HP:1519`
- **I-238** The studio's layout choice, custom navigation labels and density settings do not reach this page; the settings preview nevertheless shows a project in the chosen layout. `HP:210-214`, `src/app/my/[studioSlug]/preview/[view]/page.tsx:203-224`
- **I-239** "Portal paused" is checked only by the `/my/{slug}` layout and the dashboard; `/my/projects/{id}` and every project API keep working while the portal is switched off. `SL:151-160`, `api/ho/p/route.ts` (no check)
- **I-240** Feature switches are applied only in the browser; the APIs behind a hidden tab still answer. `HP:162-178`
- **I-241** Three different default sets exist for the switches — settings UI (Scope on, Floor Plan on), server resolver (both off), this page (Scope off, Floor Plan on). `set/portal-features-config.tsx:42-63`, `src/lib/portal-branding-resolve.ts:81-97`, `HP:66-72`

### 7a. Overview

- **I-242** Order of sections: attention box → Your to-dos → Progress → Milestones to Confirm → Project Details → Timeline → (Contact Studio) → Updates. `HP:406-553`
- **I-243** **Attention box** (Action Queue on, at least one item): an amber card **"{n} item(s) need(s) your attention"** with one row per kind — **"{n} milestone(s) awaiting your approval"**, **"{n} design selection(s) to review"**, **"{n} variation order(s) awaiting your decision"**, **"{n} overdue invoice(s)"** (red), **"{n} to-do(s) from your studio"** — each a pill with an arrow that jumps to the tab. `HP:408-447,2391-2401`
- **I-244** **Your to-dos** (Homeowner Tasks on and tasks exist): rows with a ring (green and ticked when Completed), the title (struck through when done), description, **"Due {date}"** (red when late) and **"{n} image(s)"**. Read-only — the homeowner cannot tick a task; the studio does. `HP:451-487`, `api/ho/p/tasks/route.ts:1-12`
- **I-245** **Progress**: title, the project stage as a pill, an 8 px bar filled to `progressPercent` (`transition-all`), **"{n}% complete"**. `HP:489-500`
- **I-246** **Milestones to Confirm** (clock icon): one inner card per published milestone whose status is "pending-approval" or "completed" and has no answer yet — name, a **"Pending"** pill, the date range, and buttons **"Approve"** (green) and **"Request Revision"** (amber tint). `cmp/milestone-approval.tsx:28-48,74-158`
- **I-247** Request Revision opens a textarea **"Describe the changes needed..."** with **"Submit"** (amber, needs text) and **"Cancel"**. `cmp/milestone-approval.tsx:114-139`
- **I-248** Either answer posts `{action: "approve" | "request_revision", comment}`; the server checks the shown status is pending-approval or completed (**`Cannot respond to milestone with status "{x}"`**), stores status / comment / time on `project_milestones` (creating the row if needed) and notifies the studio. Other errors: **"Milestone not found"**, **"Invalid action. Must be approve or request_revision."** `api/ho/p/milestones/[milestoneId]/approve/route.ts:53-55,82-96,99-149`
- **I-249** After an answer the query refetches and the card leaves the list; there is no optimistic state and no success message. `cmp/milestone-approval.tsx:28-33`, `src/lib/queries/homeowner.ts:729-750`
- **I-250** **Project Details**: **"Property Type"**, **"Address"**, **"Start Date"** rows (label in 10 px uppercase, value 14 px), each shown only when filled. `HP:510-517`
- **I-251** **Timeline** card: filter chips **All · Payments · In progress · Blocked · Upcoming** with counts (a chip with zero is hidden), then a vertical rail of events oldest first: milestones (at their end date), invoices (**"Invoice {number}"**, **"{amount} · Paid | Partially Paid | Overdue | Sent | Cancelled"**) and **"Project Created"**. `cmp/progress-timeline.tsx:174-286,318-358`
- **I-252** Each row: a 12 px dot (green done, brand in progress, amber pending or paused, grey upcoming), an icon, the title, a relative time on the right (**"upcoming"**, **"just now"**, **"{n}m ago"**, **"{n}h ago"**, **"1 day ago"**, **"{n} days ago"**, **"1 week ago"**, **"{n} weeks ago"**, **"1 month ago"**, **"{n} months ago"**), a sub-label (**"Completed"**, **"In progress"**, **"Pending approval"**, **"Paused"**, **"Payment received"**, **"Partially paid"**). `cmp/progress-timeline.tsx:87-143,235-244,398-425`
- **I-253** A payment milestone shows a pill **"Payment {amount} ({pct}%)"**, with **" · Paid"** (green) or **" · Partially Paid"** once its invoice is paid; the amount is the invoice issued for that milestone when one exists, else contract × percent. `cmp/progress-timeline.tsx:199-215,426-435`, `api/ho/p/route.ts:226-265`
- **I-254** A paused milestone shows a box **"Paused — {reason}"** and a second line by how the promised date has aged: **"Resuming around {date}"**, **"Expected to resume {date} — checking back in soon"**, **"Resume date passed ({n} days ago)"** (red). `cmp/progress-timeline.tsx:71-85,436-453`
- **I-255** Exactly one milestone is marked as "you are here": a tinted row, a chevron in the margin, a ring on the dot, bold brand-coloured title and an **"Active"** pill — the in-progress milestone with the earliest start. `cmp/progress-timeline.tsx:288-293,366-417`
- **I-256** Filter with no rows: **"Nothing matches this filter yet."** `cmp/progress-timeline.tsx:360-361`
- **I-257** **Updates** (Progress Updates on): a feed, newest first, in a box capped at 560 px with its own scroll; a **"Search updates"** field appears above it once there are more than three (title, description, author; ✕ to clear). `HP:544-551,1468-1496`
- **I-258** Update card: a type pill (check-in · check-out · update · site-update), the date, title, description, **"by {author}"**; photos as a 2 / 3-column grid of 4:3 thumbnails; other files as download links. `HP:1506-1565`
- **I-259** A photo opens a lightbox: a dark dialog (`max-w-3xl bg-black/95`), the image up to 80 vh, its name below; closes on outside press or ✕. `HP:1573-1583`
- **I-260** An update tied to an invoiced milestone carries a button **"Invoice {number}"** — **"{amount} · Paid"** / **"· Due {date}"** / **"· Due on receipt"** — **"View ›"**. `HP:1516-1537`
- **I-261** Updates states: empty **"No updates yet"** / **"Progress updates from your team will appear here."**; no match **"No updates match “{q}”."** The feed polls every 10 s. `HP:1461,1488-1491`, `src/lib/queries/homeowner.ts:324-333`

#### Problems (Overview)
- **I-262** The attention box counts milestones whose approval status is "pending", a value nothing ever writes (the server stores only approved / revision_requested / null) — the row can never appear, and when pressed it "jumps" to the tab already open. `HP:397,414-418`, `api/ho/p/milestones/[milestoneId]/approve/route.ts:99`
- **I-263** Once answered, a milestone's card is filtered out, so the homeowner can never see what they answered, read back their comment, or change their mind; the "Approved", "Revision Requested" and "Your Comment" parts of the card are unreachable. `cmp/milestone-approval.tsx:28-33,77-109`
- **I-264** The "Milestone Approvals" switch is not consulted — the section shows whatever the studio set. `HP:502`, `set/portal-features-config.tsx:67`
- **I-265** Milestones marked completed with no approval asked still land in "Milestones to Confirm" — every completed milestone asks for a confirmation the studio may not have meant to request. `cmp/milestone-approval.tsx:24-31`
- **I-266** "Contact Studio" (a `tel:` link) can never render: the API always returns `phone: null`. `HP:535-540`, `api/ho/p/route.ts:335`
- **I-267** "Your Team" was removed ("was showing all studio members, not actual project assignees") — the homeowner has no way to see who is on their project. `HP:519-521`
- **I-268** Dates on this page are always formatted `en-SG`, and several amounts fall back to a bare "$" where no country is passed (the invoice chip inside an update, signed-quote totals). `HP:2421-2429,1280,1529`
- **I-269** To-do images are counted but not shown; the "Due" line inside the invoice chip prints the raw ISO date. `HP:475-479,1529`

### 7b. Design

#### Renders
- **I-270** A two-column grid (also on phones) of cards for shared assets of type render, mood board or photo. `HP:1603-1613`
- **I-271** Card: the image at 4:3 linking to the full file in a new tab (a dark veil and an external-link icon fade in on hover); title (or the type word); **"{type} · {shared by}"**; the date; then three text buttons — ♥ **"Like"** / the count (red and filled once liked), **"Comment"** / the count, **"Annotate"** / **"{n} · {m} open"** (title **"Pin feedback on a specific spot"**). `HP:1645-1696`
- **I-272** Comment opens a thread under the card: **"No comments yet. Tell your designer what you think so they can adjust."**, comments as "You" or the author's name · date, an input **"Add a comment…"** (2,000 characters, Enter sends) and a send button. `HP:1699-1737`
- **I-273** Like and comment post, then refetch the gallery — no optimistic change; failures toast **"Couldn't update like"** / **"Couldn't add comment"** or the server's text (**"Comment cannot be empty"**, **"Comment is too long"**, **"Render not found"**). `HP:1627-1642`, `api/ho/p/renders/[assetId]/comment/route.ts:35-40`
- **I-274** **Annotate** opens a wide dialog (`max-w-4xl w-[95vw]`, body `max-h-[80vh]`): header **"{title} — add feedback"** / **"Tap anywhere on the image to drop a pin and leave a note for your designer."**; image on the left three-fifths with a crosshair cursor, thread on the right two-fifths (stacked below `md`). `cmp/render-annotator.tsx:137-201`
- **I-275** Pins are 24 px numbered circles with a white border — the studio's in the brand colour, the homeowner's in blue, a green ring when resolved — placed by percentage so they hold their spot at any size; pressing one selects its thread. `cmp/render-annotator.tsx:164-186`
- **I-276** Pressing the image places a pulsing draft pin and opens a composer: **"New pin — what would you like to change here?"**, placeholder **"e.g. Can we try a warmer wood tone for this cabinet?"**, **"Cancel"** / **"Add pin"**. `cmp/render-annotator.tsx:75-99,188-237`
- **I-277** Each pin's thread: number, author ("You" / name) · time · **"· Resolved"**, the note, replies (studio replies in the brand colour with **"(Studio)"**), a **"Reply…"** input, **"Mark resolved"** / **"Reopen"**, and **"Remove"** on the homeowner's own pins. Empty: **"No pins yet."** / **"Tap the image to point out something you'd like changed."** `cmp/render-annotator.tsx:239-333`
- **I-278** Rules: up to 100 pins a render; notes and replies up to 2,000 characters; a homeowner may resolve or reopen any pin but delete only their own (**"You can only remove your own pins"**). `api/ho/p/renders/[assetId]/annotations/route.ts:17,34-42,69-71`, `…/annotations/[annotationId]/route.ts:101-103`
- **I-279** States: empty **"No renders yet"** / **"Renders, mood boards, and photos shared by your studio will appear here."**; error **"Couldn't load renders."** / **"Check your connection and try again."** / **"Try again"**. `HP:1594-1606,2380-2388`
- **I-280** Motion: the hover veil `transition-colors` and icon `transition-opacity`; pins `transition-transform hover:scale-110`; the draft pin `animate-pulse`; the dialog's Radix fade-zoom. `HP:1650-1651`, `cmp/render-annotator.tsx:178,192`
- **I-281** Problems: the studio is **not notified** of a like, a comment or a pin (no dispatch in any of the three routes); likes / comments / pins are stored as one JSON field rewritten whole, so two people writing at once can lose one entry **[inferred]**; un-sharing a render deletes all its feedback. `api/ho/p/renders/[assetId]/like/route.ts:47-58`, `src/app/api/homeowner-links/share-render/route.ts:105-107`

#### Selections
- **I-282** Two groups, **"Awaiting Your Response"** and **"Responded"**. Card: category overline, title, a status pill (**Pending · Approved · Rejected · Changes Requested**), description, then the options as a 1 / 2-column grid of pickable cards — 16:10 image, name, two-line description, price, vendor, and an amber chip **"+{amount} price impact"** when the option costs extra. `cmp/selection-board.tsx:9-14,47-174`
- **I-283** Picking an option outlines it in the brand colour with a tick. If it carries a price impact a note appears: **"Approving {option} will add {amount} to your project cost. Your designer will issue a Variation Order to confirm."** `cmp/selection-board.tsx:136-189`
- **I-284** Buttons: **"Approve"** (green; disabled until an option is picked — hint **"Select an option above before approving"**), **"Request Changes"** (amber tint), **"Reject"** (red tint). The last two both open the same textarea **"Describe what changes you'd like..."** with **"Submit Request"**, **"Reject"** and **"Cancel"**. `cmp/selection-board.tsx:204-269`
- **I-285** Responded cards are greyed, show the picked option, **"Your Comment"** and **"Responded {date}"**; answers cannot be changed (**`Cannot respond to a selection with status "{x}"`**). `cmp/selection-board.tsx:191-201`, `api/ho/p/selections/[selectionId]/respond/route.ts:75-78`
- **I-286** On an answer the studio is notified (`selection.responded`); approving an option with a price impact also auto-drafts a variation order **"Selection upgrade: {title}"** for the studio to review (`vo.auto_drafted`). `api/ho/p/selections/[selectionId]/respond/route.ts:141-219`
- **I-287** States: empty **"No selections yet"** / **"Material and finish selections from your designer will appear here."**; error **"Couldn't load your selections."** + **"Try again"**. A PDF receipt for every answered selection appears under Documents. `cmp/selection-board.tsx:25-44`, `api/ho/p/documents/route.ts:112-134`
- **I-288** Problems: "Reject" needs two presses and lands in a form titled for changes; the option payload is passed through whole, including the vendor name; the server does not check that an option was picked or that the index exists. `cmp/selection-board.tsx:254-263`, `api/ho/p/selections/route.ts:58`, `…/respond/route.ts:94-97`

#### Floor Plan
- **I-289** The sub-tab mounts the shared floor-plan canvas with `viewerRole="homeowner"` (read-only in preview). From the routes: the homeowner can read the plans, upload a plan of their own (JPEG / PNG / WebP up to 5 MB; it is never made the primary plan), draw / pin / comment, and **approve a layout** — an append-only record made on the strength of the logged-in session, not a fresh OTP. The component itself is outside this reader's files. `HP:294`, `api/ho/p/floor-plan/route.ts:1-32`, `api/ho/p/floor-plan/plans/[planId]/approve/route.ts:1-21`

### 7c. Finance

#### (2) Layout and (3) elements, top to bottom
- **I-290** **Contract value card** (when a quote or any variation order exists): overline **"Contract Value"** (or **"Approved changes"** when quote viewing is off), the figure in 24 px bold, then rows **"Original quote"**, **"Approved variation orders ({n})"** (signed + or green −), **"Pending your approval ({n})"** (amber). `HP:734-765`
- **I-291** **Quote card** (View Quotes on): a collapsed row — chevron, label (**"Quote"**) + **"#{number}"**, a hint (**"Tap to view quote PDF"** / **"{n} line item(s) — tap to view"** / **"Tap to collapse"**) and the total. Expanded: **"Open / download PDF"** and the PDF drawn on canvas in a 70 vh panel; without a PDF, an itemised list (description, category, "{qty} {unit} × {price}", line total) and a totals foot (**Subtotal**, **Discount**, the tax name, **Total**) or **"Estimate · totals indicative"** for legacy data. `HP:1137-1239`
- **I-292** **Variation Orders card** (Variation Orders on): **"Variation Orders ({n})"**; each row collapsed by default — chevron, title + **"#{number}"**, a status pill (**"Pending your approval"** amber, **"Approved"** green, **"Rejected"** grey), **"+{n} days"**, **"{n} item(s)"**, and the signed amount (green when a credit). Expanded: description and line items ("{qty} × {unit price}" and total; credits shown negative) or **"No itemised breakdown for this change."** `HP:961-1038`
- **I-293** A pending order shows **"✓ Approve change"** (green) and **"✗ Reject"**. One that needs a signature shows instead the note **"To approve this change, open the signing link your designer sent and e-sign the variation. You can decline it here."** and **"✗ Decline"**. Reject opens a textarea **"Why are you rejecting this change? (optional)"** with **"Confirm reject"** / **"Cancel"**. `HP:1040-1105`
- **I-294** **Three tiles** (when invoices exist): **"Total Invoiced"**, **"Paid"** (green), **"Outstanding"** (red when above zero) in whole currency units; under them, when credit notes exist, **"Credits issued −{amount}"**. `HP:787-804`
- **I-295** **Payment Details card** (payment details configured and something outstanding): a header with a bank icon; rows **Bank · Account Name · Account Number · Branch Code · SWIFT/BIC**, each with a copy button that turns to a green tick for 2 s; then a QR — the studio's uploaded image (**"Scan to pay"**, **"Amount to enter: {symbol} {amount}"**), or a generated PayNow QR in Singapore (**"Scan to pay with PayNow"**) or DuitNow QR in Malaysia (**"Scan to pay with DuitNow"**) with **"Amount: {symbol} {amount}"**; then a full-width outline button **"I've Made Payment"** and **"Your studio will be notified to verify the payment."** `cmp/bank-details-card.tsx:99-181`, `HP:811-835`
- **I-296** The generated QR encodes the PayNow / DuitNow id, the outstanding amount of the first unpaid invoice and its number as the reference. `cmp/bank-details-card.tsx:81-97`, `HP:824-825`
- **I-297** **Invoice cards**: number (or **"Invoice"**) with a status pill (sent brand, partially paid amber, paid green, overdue red, cancelled grey), description, **"Due {date}"** or **"Issued {date}"**, the total, the payments received (date · method, amount in green), and a foot row with **"View invoice"** / **"Hide invoice"** and — on unpaid invoices other than the first — **"I've paid this invoice"**. `HP:837-897`
- **I-298** "View invoice" expands a 70 vh panel that renders the invoice in the studio's own invoice template as HTML ("Bill To", line items, totals, bank details); if it fails: **"Invoice couldn't load"** / **"Open as PDF instead"**. `cmp/portal-invoice-view.tsx:93-146`

#### (4) Interactions
- **I-299** **"I've Made Payment"** opens the dialog **"Submit payment"** — **"Upload your bank confirmation for {invoice}. Your studio will verify and mark it as paid."** — with **"Amount paid ({symbol}) *"** (pre-filled with the outstanding amount), **"Date paid"** (today), **"Method"** chips (Bank Transfer · PayNow · DuitNow · Other; pre-set to what the studio offers), **"Reference number (optional)"** (placeholder "From your bank's transaction confirmation"), **"Screenshot / receipt *"** (a dashed drop button **"Tap to upload screenshot (PNG, JPG, HEIC, PDF)"**, then the file name with size and ✕; helper **"Max 10MB. Your bank's transfer confirmation or the PayNow/DuitNow receipt."**), **"Note to studio (optional)"** (placeholder "Anything the studio should know"); buttons **"Cancel"** / **"Submit payment"** (**"Submitting..."**). `cmp/payment-proof-dialog.tsx:125-252`
- **I-300** Submit toasts **"Payment submitted — your studio will verify it shortly"**; validation toasts **"Enter a valid amount"**, **"Upload a screenshot of your payment confirmation"**; server refusals **"This invoice is not open for payment"**, **"File must be under 10MB"**, **"Unsupported file type: {type}"**, **"Failed to upload payment proof"**, **"Failed to record payment"**. `cmp/payment-proof-dialog.tsx:84-118`, `api/ho/p/payment-submit/route.ts:69-110,149,178`
- **I-301** **"I've paid this invoice"** only sends the studio a bell (no amount, no proof); the link reads **"Notified!"** for 3 s. `HP:676-684,875-883`, `api/ho/p/payment-notify/route.ts:156-176`
- **I-302** Approve / reject on a variation order posts and refetches orders and finance; errors show under the row (**"Couldn't save your response. Try again."**, **"Variation order is not pending your approval (current status: {x})"**, **"This change must be approved by signing it. Please open the signing link your designer sent to review and e-sign this variation."**). `HP:1054,1085-1111`, `api/ho/p/variation-orders/[voId]/respond/route.ts:81-99`

#### (5) States
- **I-303** Empty: **"No financial info yet"** / **"Your quote, change orders, and invoices will appear here."**; failed load: **"Couldn't load financial information"** / **"Please refresh to try again."**; PDF fallback **"Preview couldn't load here"** / **"Open {title} in a new tab"**. `HP:674,725-727`, `cmp/portal-pdf-preview.tsx:79-93`

#### (6) Motion
- **I-304** Chevrons rotate with `transition-transform` (−90° closed); rows `transition-colors`; the payment dialog's Radix fade-zoom; copy tick swap is instant. Expanding a quote, order or invoice has no height animation. `HP:980,1145`

#### (7) Rules
- **I-305** The headline figure is the server's contract value (signed quote, else primary, else budget, plus approved client variation orders) so it matches the studio's; the "Original quote" is the signed quote, else the primary, never a variation quote. `HP:700-720`, `api/ho/p/route.ts:219-224`
- **I-306** A submitted proof is stored in the private `payment-proofs` bucket and saved as a payment record marked **unverified** — it does not reduce the invoice until the studio verifies it — unless the studio has "trust homeowner submissions" on and the amount does not exceed what is owed, in which case it is saved as verified. `api/ho/p/payment-submit/route.ts:112-171`
- **I-307** The studio's payment approver is told by bell — a named member, the owner, or the project's designer with the owner as fallback: **"Payment uploaded by {name}"** / **"{name} uploaded a payment proof for {invoice} — ${amount}."** `api/ho/p/payment-submit/route.ts:229-281`
- **I-308** A receipt is issued for every submission, verified or not; it then appears under Documents and the homeowner gets the "Receipt … is ready" bell. `api/ho/p/payment-submit/route.ts:283-293`
- **I-309** Variation orders shown: client-direction only, margin never returned, line items reduced to an allow-list of safe fields (description, qty, unit, unit price, totals, percent, trigger). `api/ho/p/variation-orders/route.ts:46-59`, `src/lib/homeowner-line-items.ts:17-52`
- **I-310** A homeowner approval rebalances the project's unsent milestone invoices to the new contract value and notifies the studio (`vo.client_approved` / `vo.client_rejected`, with the reason or "(no reason given)"). The route's own note says most orders no longer wait for the client at all — the studio owner's approval is final — so this path is for older or quote-backed orders. `api/ho/p/variation-orders/[voId]/respond/route.ts:15-26,127-174`
- **I-311** Online payment does not exist in the portal: no card, no gateway; payment is by transfer / QR and proof upload. (The legacy pages show a disabled **"Pay Online · {amount} — Coming soon"**.) `src/app/pay/[token]/page.tsx:663-678`

#### (8) Data
- **I-312** Read: `project_invoices`, `payment_records`, `credit_notes`, `quotes`, `quote_line_items`, `variation_orders`, `studios.settings.payment_details`. Written: `payment_records` (+ file in `payment-proofs`), `variation_orders` (status, audit trail), `notifications`. `api/ho/p/finance/route.ts:40-90`, `api/ho/p/payment-info/route.ts:73-100`

#### (10) Problems
- **I-313** Payments listed under an invoice include unverified proofs, shown in the same green as confirmed money. `api/ho/p/finance/route.ts:61-65`, `HP:853-861`
- **I-314** After a proof is submitted the page does not refetch at once (the dialog is mounted without its `onSubmitted` callback); the new line appears on the next 15 s poll. `HP:912-921`
- **I-315** Two different "I paid" actions sit side by side with different weight — proof upload for the first unpaid invoice, a bare notification for the others — and the second fails silently. `HP:832,875-883,676-684`
- **I-316** The single-invoice endpoint returns the stored line items whole while the list strips them to the safe fields; a voided invoice can still be fetched by id. `api/ho/p/invoices/[invoiceId]/route.ts:34-40,178`
- **I-317** In the project portal the quote PDF is served from a public storage URL, while the lead-stage page hides the same file behind a login-checked proxy. `api/ho/p/quotes/route.ts:118-124`, `api/ho/engagement/[linkId]/route.ts:123-141`
- **I-318** A line-item comment endpoint for homeowners exists (and raises a task for the designer) but no screen calls it, and it accepts any line-item id without checking it belongs to this project. `api/ho/p/quotes/comment/route.ts:25-63,144-152`
- **I-319** Bell and notification texts hard-code "$" for the studio regardless of currency. `api/ho/p/payment-notify/route.ts:170`, `api/ho/p/payment-submit/route.ts:272`
- **I-320** The portal has no page for a homeowner to *sign* from the project: the note under a signature-needing variation says "open the signing link your designer sent", and the signing wizard lives on the lead-stage page. `HP:1046-1050`, `HB:537-542`

### 7d. Documents

- **I-321** Groups, each a white card with a 10 px uppercase heading and rows (file icon, title, sub-line, download icon; the whole row is a link opening in a new tab; rows without a link are dimmed): **"Signed quote(s)"** ("Signed quote · {client name}", "Signed {date} · {amount}", plus **"Signed document packet"** for multi-document signings), **"Contract"** (sub-line **"Click to download"** or **"Stored on file with your studio"**), **"Selection receipts"** ("{Approved | Rejected | Change requested} on {date} · Picked: {option}"), **"Payment receipt(s)"** ("{amount} · {date} · {invoice}"), **"Other documents"** (shared document assets), then one card per file category. `HP:1268-1414`
- **I-322** Files are the project's and the lead's files the studio marked visible, grouped by a guess from the file name: **Contracts**, **Quotes**, **Variation orders**, **Renders**, **Floor plans**, **Site photos**, **Other**; each with **"Uploaded {date}"**. `api/ho/p/documents/route.ts:158-223`, `HP:1372-1388`
- **I-323** Links are one-hour signed URLs re-minted on every poll (15 s); selection receipts and payment receipts are generated on demand. `api/ho/p/documents/route.ts:182-184,132,333`
- **I-324** Empty: **"No documents yet"** / **"Your signed contract, signed quote, selection and payment receipts, and shared documents will appear here."** `HP:1255-1257`
- **I-325** Problems: the folder guess files anything whose name contains "vo" under "Variation orders" — "invoice.pdf" included **[inferred]**; "Click to download" on a touch screen; the signed quote is titled with the client's own name; there is no preview, search or upload for the homeowner. `api/ho/p/documents/route.ts:161-163`, `HP:1295`

### 7e. Support

#### Raise a Support Ticket
- **I-326** Head: **"Raise a Support Ticket"** / **"Report an issue and we'll be in touch. You can reply and close the ticket from here too."** and a primary button **"Report Issue"** (`AlertTriangle`). `HP:1822-1835`
- **I-327** With tickets: three tiles **Total · Open · Resolved**, then a card per ticket — the ticket id in monospace, the category, a status pill (open red, in progress amber, resolved green, closed grey), the subject, a two-line excerpt, **"Reported {date}"** and **"Resolved {date}"**. `HP:1851-1920`
- **I-328** Pressing a card opens its thread in place: the description and photo thumbnails (56 px), then replies — the homeowner's on a brand tint labelled **"You"**, the studio's labelled **"{name} (Studio)"** — or **"No replies yet — your studio will respond here."**; a reply box (**"Type your reply…"** / **"Add a follow-up or close the ticket below"** once resolved), **"Photo"**, **"Close ticket"** (own tickets only), **"Send reply"** (**"Uploading…"** / **"Sending…"**). `HP:2026-2153`
- **I-329** Closing asks a native browser confirm **"Close this ticket? The studio will be notified."** `HP:2022`
- **I-330** **Report an Issue** dialog (a hand-rolled overlay, `bg-black/40`, card `max-w-md`): **"Report an Issue"** / **"Tell your studio what's going on. They'll get notified and respond here."**; **"Category"** (Quality of work · Timeline / scheduling · Communication · Safety concern · Damage or breakage · Site cleanliness · Vendor / supplier · Other), **"Subject *"** (120 characters, placeholder "Short summary of the issue"), **"Describe what happened *"** (placeholder "Include any details that would help your studio understand the issue."), **"Photos (optional, up to 5)"** with 64 px thumbnails and a dashed **"Add"** tile; **"Cancel"** / **"Send to studio"**. `HP:2249-2361,1770-1779`
- **I-331** Photos are held in the browser and uploaded only on submit (compressed to 1920 px, 5 MB each, five at most); if one fails the ticket is not filed. Toasts: **"You can attach up to 5 photos."**, **"Added {n} photo(s) — only images, up to 5 total."**, **"Couldn't upload photos. Please try again."**, success **"Issue reported. Your studio has been notified."** `HP:2191-2243`, `src/lib/upload-homeowner-issue-image.ts:11-19`
- **I-332** A new ticket gets id `T-{year}-{6 digits}`, priority medium, status open, is visible to the homeowner, and the studio is notified (`escalation.created`); replies notify `escalation.replied`, closing `escalation.closed_by_homeowner`. `api/ho/p/issues/route.ts:165-240`
- **I-333** A bell link `?issue={ticket}` opens that thread and scrolls it into view (smooth, offset 96 px). `HP:1797-1811,1894`
- **I-334** Empty: **"Nothing reported yet"** / **"When you report an issue, your studio gets notified and you can track the conversation here."** / **"Report your first issue"**. `HP:1837-1848`
- **I-335** Problems: the server accepts only four category slugs (timeline, material, client, admin), so **Safety concern, Damage or breakage, Site cleanliness and Vendor / supplier are stored as "Other"**; the screen says "Support Ticket", "Issue" and "ticket" for the same thing; the priority is fixed at medium; the close confirm is a browser dialog; the list does not poll. `api/ho/p/issues/route.ts:22,146-148,188`, `HP:1824,1833,2252`

#### Chat (off by default)
- **I-336** One card, `min(500px, 65vh)` high: a grey header with the conversation name (**"Project Chat"**), a scrolling list, and an input row (**"Type a message..."**, a square send button). The homeowner's messages sit right in the brand colour; others left in grey with the sender's name; each has a time. Empty: **"No messages yet"** / **"Send a message to your design team below."**; failure **"Failed to send. Try again."** `HP:585-635`
- **I-337** The thread polls every 5 s and scrolls to the bottom when the count changes; Enter sends; no attachments, no read state, no typing sign. `HP:565-577`, `src/lib/queries/homeowner.ts:200-204`
- **I-338** Problems: the server returns the **oldest** 200 messages (ascending order with a limit), so a long conversation stops showing new ones **[inferred]**; all of a project's client conversations are merged under the first one's name; the studio gets no notification of a homeowner message from this route. `api/ho/p/chat/route.ts:61-66,208-234`

### 7f. Notifications bell

- **I-339** A 36 px round button with a bell and a red count (**"9+"** above nine) in every portal header; on a project page it shows that project's feed, elsewhere all projects'. `cmp/notification-bell.tsx:71-83,121-138`
- **I-340** The popover is 360 px wide: **"Notifications"**, **"Mark all read"**, then up to 50 rows (max height 400 px) — an icon in a circle by type (file, tick, receipt, speech, pen), title (bold when unread), a time (**"just now"**, **"{n}m"**, **"{n}h"**, **"{n}d"**, then a date), a two-line body, and a dot when unread; empty **"You're all caught up."** `cmp/notification-bell.tsx:45-69,139-199`
- **I-341** Opening the popover marks everything read at once (optimistically); pressing a row marks it read and follows its link. It polls every 10 s. `cmp/notification-bell.tsx:85-118`, `src/lib/queries/homeowner.ts:1123-1126,1189-1203`
- **I-342** Problems: because opening marks all read, the "unread" highlight the comment promises never survives the open; the popover's fixed 360 px is wider than a 320 px phone; "variation pending" has no icon of its own. `cmp/notification-bell.tsx:85-92,139,45-56`

---

## 8. Before the project exists — the lead-stage "engagement" page

### (1) What it is / entry points
- **I-343** `/my/engagement/{linkId}` is what a homeowner sees for a lead that is not yet a project: the quote(s) the studio shared, signing, and the studio's questions. It is keyed by the link, not a project. `EP:3-9`, `api/ho/engagement/[linkId]/route.ts:7-17`
- **I-344** Reached from a lead-only card on the home page, from the "quote shared" bell (lead-only links) and from the "Ready for your signature" bell — the last always points here, even after the project exists, because the signing wizard lives only on this page. `cmp/project-card.tsx:37-39`, `HB:525,537-563`
- **I-345** **Lead link vs project link:** it is one row. A lead with a phone gets a "primary" link with `lead_id` only; creating the project fills in `project_id` on the same row. From then on the home card opens the project page; the engagement page stays reachable by its link id. `HB:1-17,171-188`

### (2) Layout
- **I-346** Rendered inside the studio's chosen branded layout (same header, nav, colours as home) when the session knows the slug; otherwise inside the generic shell. Content is a `max-w-3xl` column starting with a **"← Back"** link. `EP:56-70,136-150`

### (3) UI elements
- **I-347** Title: the lead's name; under it **"Your engagement with {studio}."** `EP:80-83`
- **I-348** Status banner — signed: green, **"Contract signed"**, **"Signed on {date}"**, **"Download"**; cannot be signed: amber, **"Signing link unavailable"**, **"This signing request has expired — please ask your studio to send a fresh one."**; ready: amber with a pen, **"Ready for your signature: {quote}"** / **"Only {quote} is being sent for signing. Review it below, then sign at the bottom."** (or **"Ready for your signature"** / **"Review the quote below, then sign at the bottom of this page."**). `EP:173-227`
- **I-349** Quotes: heading **"Your Quote"** / **"Your Quotes"**; with several, a 260 px select listing "{label} · {number}" with the suffix **" — signed"** or **" — for signing"**, and a helper line — **"The quote marked “signed” is the one you agreed to. The others were shared for comparison."** / **"These are shared for your reference. Only the quote marked “for signing” needs your signature."** / **"Multiple quotes were shared for you to compare."** `EP:549-581`
- **I-350** Quote card: label, number and a status pill (**"Approved"** grey, **"Awaiting signature"** amber, **"Signed"** green with a tick and a green border); the studio's PDF drawn on canvas in a 78 vh panel with **"Open / download PDF"**; if no PDF, items grouped by category with **"(optional)"** marks and a **"Total"** foot. `EP:598-672`
- **I-351** No quote yet: **"No quote shared yet"** / **"{studio} will share your quote here once it's ready."** `EP:112-116`
- **I-352** Questions (only while no quote has been shared): heading **"A few questions"**, a card **"Scope Details"** with one input per question (yes / no, number, single select, text…) and **"Save Responses"** (**"Saving..."**); once answered, a read-only list (unanswered rows read **"Not answered"**) with **"Edit responses"**. `EP:123-130`, `cmp/scope-questions-form.tsx:95-150`

### (4) Interactions — the signing wizard
- **I-353** When a signature is waiting, the page becomes a stepped wizard: a header **"Step {n} of {total}"** with the step's title and a 4 px progress bar. Steps: the quote → each studio document (terms, contract) → sign. `EP:262-340`
- **I-354** Step 1 shows the quote and **"Continue to documents"** / **"Continue to sign"**. `EP:343-364`
- **I-355** Each document is one card: **"Document {i} of {n}"** + its title, the text in a scroll area up to 58 vh with a floating dark pill **"↓ Skip to end"**, an acceptance row (a custom tick box and the studio's wording) when the document requires it, and **"Back"** / **"Next document"** / **"Continue to sign"** (disabled until accepted). `EP:370-430`
- **I-356** Sign step: **"Sign: {quote}"** / **"You're signing this quote only. Any other quotes shared with you are for reference."**; in Singapore, when the studio opted in, a **"CaseTrust Deposit Protection"** box with three points and **"I have read and understood the CaseTrust disclosure."**; **"Your full name"**; **"Signature"** — a 160 px drawing canvas with **"Clear"**; an agreement row **"I, {name}, agree to the quotation from {studio} totalling {amount} as set out in the quote. I understand this constitutes my digital agreement to proceed."**; **"Back"** / **"Sign & submit"** (**"Submitting…"**); foot **"Your signature is legally binding under the {Singapore Electronic Transactions Act | Malaysian Electronic Commerce Act 2006 | UAE Federal Decree-Law No. 46 of 2021 on Electronic Transactions | Indian Information Technology Act, 2000}."** `EP:29-34,434-525`, `cmp/signature-pad.tsx:93-106`
- **I-357** Toasts: **"Please draw your signature"**, **"Please enter your name"**, **"Please check the agreement box to proceed"**, **"Please acknowledge the CaseTrust disclosure"**, **"Signed — thank you!"**, **"Could not submit signature"**. `EP:293-320`
- **I-358** Saving answers toasts **"Thanks — your answers are saved"** (failure **"Could not save answers"**) and tells the studio (`homeowner.questionnaire_answered`, "Questionnaire updated: {name}"). `cmp/scope-questions-section.tsx:99-121`, `api/ho/scope-answers/route.ts:130-170`

### (5) States
- **I-359** Loading: the shape loader; failure: **"Something went wrong loading this engagement."** + **"Try again"**; quote preview missing inside the wizard: **"Your quote isn't available to preview here"** / **"You can still review the documents and sign below."** `EP:71-77,352-356`

### (6) Motion
- **I-360** The progress bar animates its width (`transition-all duration-300`); tick boxes and buttons `transition-colors`; steps swap with no transition. `EP:338,164`

### (7) Rules
- **I-361** The API confirms the link is active, belongs to this homeowner and studio and has a lead; studio preview is refused (**"Preview not available for lead-stage"**). `api/ho/engagement/[linkId]/route.ts:41-66`
- **I-362** Only quotes the studio explicitly shared, in status approved, sent for signature or signed, are returned; the PDF is served through a login-checked proxy so the storage path is never exposed. `api/ho/engagement/[linkId]/route.ts:20-21,87-142`
- **I-363** Signing is possible while the latest request is pending or viewed and not expired; it posts name, the drawn signature (PNG), the time zone and the CaseTrust acknowledgement to `/api/sign/{token}/submit` — no OTP, because the homeowner is already signed in. `api/ho/engagement/[linkId]/route.ts:145-197`, `EP:300-309`
- **I-364** The questionnaire disappears once any quote is shared ("the homeowner shifts to reviewing/signing"), and is not shown on the project page at all ("a PRE-project intake step"). `EP:119-130`, `HP:504-508`

### (10) Problems
- **I-365** The ready banner says "sign at the bottom of this page" but signing is the last *step* of a wizard, not the bottom of the page; a code comment says no banner is shown in that state. `EP:198-226`
- **I-366** "Signing link unavailable… has expired" is shown for every state that is neither signed nor signable (a cancelled or declined request too). `EP:201-210`
- **I-367** The heading "A few questions" is drawn even when the studio has no questions or the load failed (the section below it returns nothing), and the "Scope Details" feature switch is not consulted. `EP:123-130`, `cmp/scope-questions-section.tsx:80-92`
- **I-368** The studio's "Ask homeowner" link (`/my/{slug}/p/{token}?action=answer-questions`) lands on the home page for a lead and on the project page for a project — neither shows the questionnaire, so the promised "answer questions" jump goes nowhere. `src/lib/scope-answers/invite.ts:160-162`, `src/app/my/[studioSlug]/p/[portalToken]/page.tsx:113-122`, `src/app/my/[studioSlug]/page.tsx:69-73`
- **I-369** The questionnaire lookup needs a link with role "primary"; homeowners invited from the project header (role "owner") and family members get "Link not found". `api/ho/scope-answers/route.ts:45-57`
- **I-370** "Engagement" is internal vocabulary shown to the homeowner ("Your engagement with…"). `EP:82`
- **I-371** Once a project exists nothing on the project page leads back here; a later signature request is reachable only from the bell. `HB:537-563`

---

## 9. Other client links in this slice

### The durable token link
- **I-372** `/my/{slug}/p/{token}` checks the token, sends a signed-out visitor to the studio's login with `?next=` back to itself, then redirects to the project page (project link) or the home page (lead link), carrying any query along. `src/app/my/[studioSlug]/p/[portalToken]/page.tsx:45-122`

### Legacy "Client Portal" — `/pay/{token}` (deprecated but live)
- **I-373** The studio-side card that created these links (**"Client Portal"** — **"Share a payment and progress link with your client"**, **"Generate Link"**, **"Generate & Copy Link"**, **"Portal link created and copied to clipboard"**, copy / open / revoke icons, **"Portal link revoked"**) is switched off in code with `{false && …}` and the note "DEPRECATED: use HomeOwner Portal (studio-scoped) instead". The page and its APIs still serve existing tokens. `PP:3443-3594`
- **I-374** The page: a verify card (studio logo or initial, **"Verify your phone number to access the portal"**, phone → **"Send OTP"** → **"Enter 6-digit OTP"** → **"Verify & Continue"**), then a sticky header ("Welcome, {client}") and sticky tabs **Overview · Invoices · Progress · Updates · Actions** over a `max-w-2xl` column; tab content fades in (`animate-in fade-in duration-200`), the payment bar grows with `transition-[width] duration-500`. `src/app/pay/[token]/page.tsx:340-440,489-491,569`
- **I-375** It offers milestone approval with a feedback box (**"Share your feedback or concerns..."**), **"Raise an Issue"**, **"Contact Your Studio"**, **"Documents"** — **"Download invoices and statements."**, and on each open invoice a disabled **"Pay Online · {amount} — Coming soon"** with **"Online payments aren't enabled yet — for now please use the bank transfer details on the invoice link."** `src/app/pay/[token]/page.tsx:660-680,792-812,876-959`
- **I-376** **Problem:** the page loads all the data from `GET /api/pay/{token}` *before* the verify step, that route is public, and "Send OTP" calls nothing — it only shows a toast **"OTP sent to your phone"**. The phone check is decoration; tokens beginning `demo_` skip it entirely. `src/app/pay/[token]/page.tsx:131-178`, `src/app/api/pay/[token]/route.ts:6-9,30-42`
- **I-377** `/pay/inv/{token}` is a public single-invoice page (status badge, line items, bank details, the same disabled "Pay Online") and `/pay/receipt/{token}` a public **"Payment Receipt"** page with **"Download PDF"**; a bad token reads **"Invoice not found"** / **"This link may have expired or is no longer valid."** The receipt links are what the Documents tab hands out. `src/app/pay/inv/[token]/page.tsx:102-138,293-306`, `src/app/pay/receipt/[token]/page.tsx:36-41,112,173-178`

---

## 10. Portal settings in the studio app — Tools › "HomeOwner Portal" › Configuration

### (1) What it is
- **I-378** `/tools/homeowner-portal`, listed in the sidebar's Tools group as **"Homeowner Portal"** for owners only. If the platform has the page switched off for the studio: **"Homeowner Portal"** / **"This feature isn't enabled for your studio. Contact OpenMaison support if you'd like to turn it on."** `TOOLS:41-53`
- **I-379** Page intro: **"Give every homeowner a branded space to track progress, view invoices, sign contracts, and stay aligned with your studio. Configure once — every project gets its own scoped view, and homeowners only see what's theirs."** `TOOLS:99-102`
- **I-380** A tinted card shows **"Studio Portal URL · share with all your homeowners — they log in with their own phone"**, the address `/my/{slug}`, **"Copy"** (toast **"Link copied"**) and **"Open"**. `TOOLS:107-139`
- **I-381** Configuration intro: **"Customize what the portal looks like and what every homeowner can access — features, branding, layout, scope questions, team, and your About Us page."** `TOOLS:154-156`

### (2) Layout
- **I-382** One card: a status row (**"{done}/{total} sections configured"**, **"View live portal →"**); a slug row; a wrapping row of eight section buttons (a green tick on finished ones); then a two-column body `lg:grid-cols-[3fr_2fr]` — the editor on the left, a sticky 640 px live preview on the right; below `lg` the preview folds under a **"Live Preview"** toggle. `set/portal-config-hub.tsx:163-346`

### (3) Sections and their controls
- **I-383** Sections: **Features** ("Toggle which sections homeowners see"), **Branding** ("Colors, fonts, logo, login screen"), **Layout** ("Choose the portal layout style"), **Voice** ("Greeting tone and custom navigation labels"), **Profile** ("Studio facts: contact, social, awards"), **Scope** ("Custom questions for homeowners"), **Team** ("People homeowners will work with"), **About Us** ("Studio story and intro"). `set/portal-config-hub.tsx:51-60`
- **I-384** **Portal URL** row: **"Portal URL /my/{slug}"**, **"Lowercase letters, digits, hyphens. Used in the branded login URL + live preview."**, a 32-character input and **"Save"**; toasts **"Portal URL saved"**, **"Slug must be at least 1 character (letters / digits / hyphens)"**, **"Failed to save portal URL"**. `set/portal-config-hub.tsx:77-94,187-214`
- **I-385** **Features** — a master switch **Enabled / Disabled** for the whole portal, then fifteen switches, each a label, a line and an ⓘ tooltip: `set/portal-features-config.tsx:65-81,130-209`
  - **Progress Updates** — "Homeowners see project updates posted by the ID"
  - **Milestone Approvals** — "Homeowners can approve completed milestones"
  - **Invoices and Payments** — "View invoices and payment details"
  - **View Quotes** — "View all quote variations shared by the ID"
  - **Variation Orders** — "Show change orders and their cost impact under the quote"
  - **View and Sign Contracts** — "View and digitally sign contracts"
  - **Material Selections** — "Curated options for tile, fixtures, finishes — homeowner picks one"
  - **Auto-share Selections** — "New selections are visible to the homeowner immediately on save"
  - **Raise a Support Ticket** — "Homeowners can open support tickets from the Support tab"
  - **Documents** — "Signed contract, signed quote, and other downloads"
  - **Floor Plan Collaboration** — "Shared annotated floor-plan canvas"
  - **Action Queue** — "Aggregated to-do widget summarising pending homeowner actions"
  - **Homeowner Tasks** — "Tasks the studio assigns to the homeowner"
  - **Scope Details** — "Homeowners fill in lifestyle and scope questions"
  - **Chat** — "In-app messaging with the studio team"
- **I-386** Switching the portal off toasts **"Portal disabled — homeowners will see a paused page"** (on: **"Portal enabled"**), fades the list and shows **"Portal is paused. Feature toggles below are inactive — turn the master toggle on to manage them."**; every other section is dimmed under a banner **"Portal is paused"** / **"Homeowners see a “Portal paused” page. Re-enable to apply changes."** / **"Enable Portal"**. `set/portal-config-hub.tsx:143-146`, `set/portal-features-config.tsx:157-164`, `set/portal-paused-shell.tsx:23-41`
- **I-387** **Branding** — **"Start from a theme"** ("One click sets colors, fonts and spacing — not your layout. Fine-tune anything after."): twelve presets with three-colour swatches — Minimalist, Heritage, Boutique, Modern, Industrial, Coastal, Botanical, Scandi, Editorial, Terracotta, Blossom, Ocean Studio. `set/theme-preset-picker.tsx:19-62`, `src/lib/portal-presets.ts:107-312`
- **I-388** Branding › **Identity**: Studio Logo, Login Page Logo, Favicon, Cover Photo (image uploads up to 5 MB), **"Recolor logo to white"**, **"Logo size"** (50 %–200 %), **"Studio Tagline"**. **Colors**: nine preset pairs (OpenMaison, Warm Earth, Modern Mono, Botanical, Coastal, Architectural, Boutique Brass, Heritage Navy, Pop Pastel) and pickers for **Primary Color**, **Accent Color**, **Surface Tint (optional)**. **Typography**: heading and body font from fourteen Google fonts. `set/portal-branding-config.tsx:134-227`, `src/lib/portal-presets.ts:21-64`, `src/app/api/portal/upload-asset/route.ts:14-20`
- **I-389** Branding › **Login Screen**: six layout tiles with a drawn thumbnail — **Centered** ("Form on a soft background"), **Split** ("Image left, form right"), **Split Reverse** ("Form left, image right"), **Full Bleed** ("Hero image fills, form floats"), **Hero Top** ("Banner on top, form below"), **Framed** ("Brand-accent card, no photo needed") — then **Login Title**, **Login Subtitle**, **Background Image** ("Used by Split, Hero Top and Full-bleed layouts… Recommended at least 1600×900px"), **Overlay Color** and **Overlay Opacity**, **Welcome Message (optional)** ("HTML allowed"), **Show trust badge**. `set/portal-branding-config.tsx:230-320,432-439`
- **I-390** Branding › **Layout fine-tuning**: **Card Style** (Flat (border only) · Soft shadow · Heavy shadow · Borderless), **Corner Radius** (Sharp · Soft · Pill), **Density** (Compact · Comfortable · Spacious), **Header Text**, **Footer Text**, **Watermark** ("Show a faint studio watermark on portal screens."). `set/portal-branding-config.tsx:323-378`
- **I-391** **Layout** — **"Portal Layout"** / **"Click a layout to apply it — the preview updates instantly"**; five cards with an **"Active"** mark: **Minimal** ("Clean, whitespace-heavy, focus on content"), **Modern** ("Balanced, icon-driven, default choice"), **Traditional** ("Structured, formal, text-based navigation"), **Detailed** ("Information-dense, sidebar navigation"), **Premium** ("Luxury feel, large imagery, serif accents"). `set/portal-layout-picker.tsx:24-59`, `cmp/layouts/index.ts:25-31`
- **I-392** **Voice** — **"Greeting Tone"** (Formal "Welcome, Mr. Tan." · Friendly "Hi Sarah!" · Casual "Hey there!") and **"Navigation Labels"** — "Rename any portal tab…" with inputs for Overview, Updates, Finance, Design, Moodboard, Scope, Issues, Chat, Floor Plan, About. `set/voice-config.tsx:13-23,59-107`
- **I-393** **Profile** (year established, awards, contact, social and footer links), **Scope** (the question builder), **Team** (members with name, role, bio, photo, visible; a Published switch), **About Us** (rich text; a Published switch) — saved as their own slices. `set/portal-config-hub.tsx:287-314`
- **I-394** **Live preview** panel: a view select (**Login screen · Dashboard · Project detail · About Us · Empty state**), for Project detail a second select of ten tabs, desktop / phone buttons, **"Reload"**, **"Open"**; desktop draws the page at a true 1280 px width scaled down inside a browser frame (traffic lights, URL bar), phone inside a 390×820 handset frame with a notch and "9:41"; without a slug: **"Save your portal slug to enable live preview."** `set/portal-live-preview.tsx:43-139,157-250`

### (4) Interactions
- **I-395** Everything autosaves — switches after 200 ms, branding and voice after 1.5 s — with a small indicator (spinner while saving, green tick when saved, red on error) and, for branding, a **"Reset"** link; each save reloads the preview. Failure toast **"Failed to save portal settings"**. `set/portal-features-config.tsx:112-117`, `set/portal-branding-config.tsx:91-96,127`, `set/save-indicator.tsx:17-43`, `TOOLS:82-95`
- **I-396** Picking a layout moves the "Active" mark and the preview at once and saves behind; on failure it snaps back with **"Could not change layout"**. `set/portal-config-hub.tsx:270-284`
- **I-397** A theme changes colours, fonts, card style, radius and density but deliberately leaves the layout and login layout alone. `set/portal-branding-config.tsx:102-113`

### (6) Motion
- **I-398** Section buttons, cards and tiles use `transition-colors`; the features list fades to 50 % (`transition-opacity`) when paused; the save spinner spins. `set/portal-features-config.tsx:167-170`

### (7) Rules
- **I-399** Settings live in `studios.settings.portal` (`enabled`, `features`, `branding`, `aboutTeam`, `aboutUs`, `studioProfile`) plus the `studios.portal_slug` column; only the portal slice is sent on save (an earlier version overwrote unrelated studio settings). `TOOLS:61-95`
- **I-400** Branding shown to homeowners is merged as: platform defaults → the company's general branding → the portal's own choices, where a portal value counts only if it differs from the default; the portal-uploaded logo wins over the chat avatar and the company logo. `src/lib/portal-branding-resolve.ts:149-207`
- **I-401** **What a studio can switch per project: nothing.** Every switch here is studio-wide. Per project the studio controls content one item at a time — publish a milestone, share a quote, approve an update, share a selection, show a file, mark a ticket visible, and (per person) the chat-history choice at invite. `set/portal-features-config.tsx:83-88`, rows I-85…I-95

### (10) Problems
- **I-402** Four switches do nothing: **Milestone Approvals**, **View and Sign Contracts**, **Scope Details** and **Auto-share Selections** are read by no page or route. `set/portal-features-config.tsx:67,71,73,79`; a repository-wide search finds them only in the defaults
- **I-403** Help texts promise what the portal does not have: an "Updates tab" (updates are a section of Overview), a "Scope tab", "homeowners can comment" on quotes, "real-time chat" (it polls), and approvals that "show a banner on their dashboard". `set/portal-features-config.tsx:66-80`
- **I-404** The "Project detail" preview is a hand-written mock with ten tabs (Overview, Updates, Finance, Design, Moodboard, Scope, Issues, Chat, Floor Plan, About), sample figures and the chosen layout's own tab style; the real page has five different tabs and ignores the layout. A studio configuring the portal is shown something its clients will not get. `src/app/my/[studioSlug]/preview/[view]/page.tsx:188-225,286-450`
- **I-405** "Navigation Labels" renames those mock tabs; of the real navigation (Home · About · Team) only About has an input. `set/voice-config.tsx:13-23`, `src/lib/portal-nav.ts:21-41`
- **I-406** The tone examples do not match what is printed: Formal shows "Welcome, Mr. Tan." but produces "Good morning, {first name}". `set/voice-config.tsx:76-78`, `src/app/my/[studioSlug]/page.tsx:150-154`
- **I-407** The progress count is out of eight sections but only six are ever evaluated and Scope is hard-wired to false, so it can never read 8/8. `set/portal-config-hub.tsx:148-161`
- **I-408** "Cover Photo — Hero image used in About / Portfolio sections": there is no Portfolio page in the portal (a component exists, unused). `set/portal-branding-config.tsx:153`, `cmp/portfolio-page.tsx`
- **I-409** Changing the slug changes every homeowner's login address; nothing redirects the old one or warns the studio. **[inferred]** `set/portal-config-hub.tsx:77-94`
- **I-410** The title is spelled "HomeOwner Portal" on the page and "Homeowner Portal" in the disabled state and the sidebar. `TOOLS:48,100`

---

## 11. Dead or orphaned pieces found in the slice

- **I-411** Components nothing mounts: `render-comment.tsx` (posts to a route that does not exist, `/design/comment`), `moodboard-gallery.tsx`, `portfolio-page.tsx`; the five tab-style components in `project-nav.tsx` are used only by the mock preview. `cmp/render-comment.tsx:34`, `cmp/project-nav.tsx:26-155`
- **I-412** Routes nothing calls: the homeowner satisfaction rating (`POST …/satisfaction`, 1–5 with a comment), the quote line-item comment route, `/api/studio/preview-login-url`. `api/ho/p/satisfaction/route.ts:25-30`, `api/ho/p/quotes/comment/route.ts`
- **I-413** The "Client Portal" token card on the project's Finance tab is compiled out but its state, hooks and 150 lines of markup remain. `PP:1309-1315,3443-3594`
- **I-414** The settings page calls hooks after an early return (the "feature isn't enabled" branch), which breaks React's rules of hooks. `TOOLS:44-56`

---

## 12. Where code and docs disagree

- **I-415** `docs/rules/homeowner-portal.md:22` says the preview mint is `POST`; the route is `GET` with a redirect. `src/app/api/studio/preview-as-homeowner/route.ts:22`
- **I-416** The same doc lists `/my/login` as "Generic phone+OTP login" and `/my` as the dashboard; in code `/my/login` has no form and the login API refuses a request without a studio slug, and `/my` redirects. `docs/rules/homeowner-portal.md:34,37`, `api/ho/auth/login/route.ts:52-60`
- **I-417** It calls `/my/[studioSlug]/p/[portalToken]` a "Token-gated portal entry (alt to OTP)"; the page still requires an OTP login first. `docs/rules/homeowner-portal.md:36`, `src/app/my/[studioSlug]/p/[portalToken]/page.tsx:72-74`
- **I-418** It describes the ticket-photo bucket as "public-read"; the routes sign every attachment because the bucket was made private later (migration 233). `docs/rules/homeowner-portal.md:76-77`, `api/ho/p/issues/route.ts:25-43`
- **I-419** It places the config hub as an "owner-only tab in /accounts"; it is mounted at Tools › Homeowner Portal, whose sidebar entry is owner-only (`ownerOnly: true`) while the page itself has no owner check for anyone who types the address. `docs/rules/homeowner-portal.md:98`, `src/components/layout/app-sidebar.tsx:28`, `TOOLS:31-53,157-164`
- **I-420** It says `homeowner_project_links` is "1 row per (homeowner, project)"; a row may now carry a lead and no project. `docs/rules/homeowner-portal.md:126`, `HB:9-13`
- **I-421** The feature spec (`docs/features/homeowner-portal/spec.md`) describes a single cross-studio portal with a Qanvast-branded shell, self-contained `/my/settings` and `/my/quotes/[token]` pages, an **SMS** invite ("Your designer has invited you to track your project. Visit: …") with chat history **off** by default, homeowner SMS for invoices and milestones, and ticket categories Timeline / Material / Workmanship / Communication / Other. The code is studio-scoped and white-label, has neither page, sends no SMS, defaults chat history **on**, and offers eight ticket categories of which four are stored. `docs/features/homeowner-portal/spec.md:56-66,403-409,566-572,597-607,851-853`
- **I-422** The spec says access is "Invitation-only… Do NOT create a profile"; a database trigger now creates the profile and an active link for every lead with a phone. `docs/features/homeowner-portal/spec.md:181-191`, `supabase/migrations/20260521000001_auto_bind_homeowner_for_leads.sql`
- **I-423** The spec lists "Variation order visibility" and "Payment gateway integration" as out of scope; variation orders are in the Finance tab with approve / reject, and payment has QR codes and proof upload (still no gateway). `docs/features/homeowner-portal/spec.md:816-826`
- **I-424** The PRD says the project view comes "across five selectable portal layouts"; the project page does not use the layouts. `docs/prd/03-homeowner-portal.md:49`, `HP:210-214`
- **I-425** The PRD lists online payment as a non-goal and "snags" as part of the project view; the code calls them support tickets / issues. `docs/prd/03-homeowner-portal.md:49,61`
- **I-426** `docs/features/render-feedback/spec.md` says the studio's view is read-only, with "no studio replies in v1", and names migration 195; the code has pin annotations with studio replies, resolve and delete, and its comments cite migrations 184 and 209. "No notifications" is still true. `docs/features/render-feedback/spec.md:8-11,15`, `src/app/api/homeowner-links/render-annotations/route.ts:1-28`
- **I-427** The UAT record marks preview-as-homeowner as passing; it was run in a browser that had just logged in as a real homeowner (NF21 before NF22), which hides the shell's sign-in check. `docs/features/portal-merge-integration/uat-findings.md:90-91`

---

## Uncertain / not verified

- Nothing was run. Every behaviour marked **[inferred]** is a reading of the code: the preview needing a real homeowner session (I-73), "Close preview" not closing the tab (I-74), deep links not moving the tab (I-237), the dead bottom-bar links (I-236), the empty phone bottom bar (I-214), the chat's oldest-200 cut-off (I-338), the invite form not resetting (I-46), the "vo" folder guess (I-325), JSON write races (I-281).
- Whether a homeowner-submitted proof in "trust" mode actually raises the invoice's paid amount: the route sets the record to verified and queues accounting but does not update the invoice itself; a database trigger may. `api/ho/p/payment-submit/route.ts:112-131,152-171`
- What happens to shared renders, likes and comments when a link row is deleted (cascade or orphan) — depends on the foreign key, not read.
- Whether ticket comments can be studio-internal: the homeowner thread route selects all comments of a visible ticket with no internal flag in its query. `api/ho/p/issues/[escalationId]/route.ts:75`
- The floor-plan canvas component (`src/components/floor-plan-collab/*`) and the studio's Gantt publish flow were not read; only their homeowner routes and mount points were.
- `scope-form-builder.tsx`, `studio-profile-config.tsx`, `team-page-editor.tsx`, `about-us-editor.tsx`, `color-preset-row.tsx`, `font-picker.tsx` were not read line by line; their fields are taken from the hub and the data shapes.
- The legacy `/pay/[token]` page was read to line 560 and skimmed beyond; `/pay/inv` and `/pay/receipt` were skimmed.
- Rate-limit numbers for the OTP routes, and the OTP bypass setting the spec mentions, were not read.
- Raw `projects.stage` values in production are not known; the stage-pill mismatch (I-219) assumes the studio's Draft / Active / Closed set.
- Whether the slug is checked for uniqueness on save was not read (the mutation lives in `src/lib/queries/studio.ts`).
