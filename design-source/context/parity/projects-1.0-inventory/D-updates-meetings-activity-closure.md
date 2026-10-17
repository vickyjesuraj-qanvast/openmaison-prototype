# D — 1.0 Projects: progress updates, meetings, activity and closure

Read-only inventory of OpenMaison 1.0 (`qanvast-id-tool`, branch `integ/security-non-qanvast` @ `620190192`), read on 2026-10-05. Nothing was run. Files read in full: `src/components/projects/` `progress-updates.tsx` · `post-update-dialog.tsx` · `post-update-sheet.tsx` · `project-fabs.tsx` · `milestone-publish-batch.tsx` · `meeting-summary-card.tsx` · `audio-upload-dialog.tsx` · `chat-highlights.tsx` · `activity-summary.tsx` · `activity-feed.tsx` · `closure-dialog.tsx` · `closure-review-banner.tsx` · `closure-summary-card.tsx` · `confirm-delete-project-dialog.tsx`; `src/lib/` `project-closure.ts` · `project-closure-summary.ts` · `lifecycle/archival.ts` · `lifecycle/transitions.ts` · `audit-trail.ts` · `projects/unpublish-gate.ts`; the API routes `projects/[id]/progress-updates` (+ `[updateId]/unpublish`) · `projects/progress-updates/[updateId]` · `projects/[id]/notify-publish` · `project-aggregates/activity-feed` · `projects/records/[id]/closure` · `projects/[id]/archive` · `unarchive` · `delete` · `copilot/upload` · `copilot/brief/generate` · `copilot/records/briefs` · `homeowner/projects/[id]/updates`; the mounts and handlers in the project page (lines 637–910, 1640–2035, 2503–2590, 2954–2982, 4505–4508, 4761–4856); the hooks in `src/lib/queries/projects.ts` (600–1060) and `project-aggregates.ts` (412–694); the review branches in `src/context/app-context.tsx` (270–660); `resolveProgressUpdateSubmitDecision` in `src/lib/access-control.ts`; the motion in `src/app/globals.css` and the `ui/dialog` · `ui/sheet` primitives; the docs `docs/rules/projects.md`, `docs/prd/09-projects.md`, `docs/features/projects-overhaul/backend-dependencies.md` (the only file in that folder) and the closure part of `docs/demo/project-finance-feature-guide.md`.

**Citation shorthand.** `page.tsx` = `src/app/(main)/projects/[projectId]/page.tsx`. A bare component file name (`progress-updates.tsx`) lives in `src/components/projects/`. Everything else is written from `src/`. Colours are the light-theme tokens from `src/app/globals.css:55-125` (purple `#5500FF` / tint `#EEE5FF`; green `#469E59` / tints `#DAECDE` `#EDF5EE` / text `#387E47`; yellow `#F19E2B` / tints `#FCECD5` `#FEF5EA` / text `#C17E22`; red `#DB382A` / tints `#F8D7D4` `#FBEBEA` / text `#AF2D22`; blue `#4E5BB4` / tint `#EDEEF7`; greys `#1A1A1A` `#666666` `#999999` `#E6E6E6` `#F2F2F2`). Corner radii are given as Tailwind class names: the stylesheet defines the radius scale twice (`app/globals.css:46-52` from `--radius: 0.75rem`, and again at `:177-181` as 4 / 8 / 12 / 16 / 20px); the later block appears to win, which would make `rounded-lg` 16px and both `rounded-xl` and `rounded-2xl` 20px **[inferred]**. Dialog widths: the dialog primitive carries its own `sm:max-w-lg` (512px, `components/ui/dialog.tsx:64`), which a plain `max-w-md` / `max-w-xl` / `max-w-3xl` on a dialog does not replace, so dialogs "written at" another width are most likely 512px wide from 640px up **[inferred]**.

## Bottom line

- **Progress updates are one kind of post in practice** ("Site Update": title, details, optional milestone, attachments), posted by any studio member. A review gate is **on by default**: a non-owner's post is held "Pending review" and reaches the homeowner only when an owner (or a listed approver) approves it on the card; an owner's post is published at once. The card's helper line changes with that.
- **Attachments are half-built.** Photos are saved as base64 text inside the update row; videos and documents save **only their file name** (nothing is uploaded); the phone sheet saves `blob:` addresses that die with the tab. The homeowner gets dead links.
- **The review flow has dead ends.** A rejected update has no chip, no message to its poster and no edit or resubmit. Unpublish turns an update into `draft`, which has no chip and **no way to publish it again**. There is no edit at all.
- **Most roles here are screen-only.** Approve, reject, delete and unpublish an update, and submit, approve and reject a closure, are accepted by the server from any signed-in member of the studio. The handover lock is not checked when an update is posted, and the phone button ignores it. Delete, archive and unarchive of a project are the exception: the server checks owner or admin.
- **The milestone link is broken on the studio side.** The yellow milestone chip never shows (the name is never filled in). "This completes a payment milestone" notifies the homeowner and drafts an invoice but does not complete the milestone, shows nothing on success, and does nothing at all when the dialog is opened from the Gantt.
- **Meeting Summary is a hand-off to the co-pilot.** It shows the latest brief only (date, a "Deal" score, three lines, three actions) and links out to `/tools/copilot-analytics` in a new tab. Briefs live in `meeting_briefs`; no credits are charged at this commit; a designer sees only meetings they ran. A studio with the co-pilot switched off still sees the button.
- **Activity is not a log.** It is rebuilt on every read from the current state of twelve tables, one line per record. A line's words change in place and keep the record's creation time, so history rewrites itself. Many actions leave no line (list in §3.7). Only four of seven kinds can be filtered; there is no paging, only "Show all N events".
- **Activity wording is wrong in places.** Every published update reads "{author} approved progress update"; a rejection is credited to the author; reviewers are the literal words "Owner" and "Team member"; amounts carry no currency; the Overview card prints "System Invoice INV-… created".
- **Closure is a two-step dialog and an owner's sign-off.** Checklist (five checks, some deferrable with a reason) → summary → `pending_review` → the owner approves or rejects on the Overview → stage `Closed`. `closureStatus` is `null · pending_review · approved · rejected`. Unfinished milestones and an under-billed contract cannot be deferred.
- **Closure faults.** Any member can submit from the Management card; an owner can approve their own submission; "Close project" stays live in the ⋯ menu while a closure waits (a second submit overwrites the first and raises a second task); the owner's "Review and approve project closure" task is never completed by approving; the closure notes are saved and never shown; the card's date is the day the summary was generated; there is **no reopen**; "read-only after close" is true only when the handover-lock feature is on.
- **Delete, archive, close are three different things with overlapping words.** Delete (owner / admin) removes a project only when ten finance tables hold nothing for it; otherwise the dialog offers "Archive instead?". Archive hides the project and cancels its open tasks; nothing is frozen. Unarchive is on the listing's Archived chip. There is no direct Archive action, no trash, no undo, no retention rule. The Close menu item and card both describe closing as "archive".
- **The docs lag the code.** The rules doc lists four tabs (no Activity), says Chat Highlights remains (it is unmounted dead code), puts audio in the milestone completion flow and closure under Finance; the overhaul doc describes seven browser queries and "no API routes"; the feature guide promises "a second person signs off" and "the project goes read-only".

---

## 1. Progress Updates

### 1.1 What it is / entry points

- **D-01** A card titled "Progress Updates" in the Overview tab's right column, second of three (Meeting Summary · Progress Updates · Activity). `page.tsx:2503-2581`
- **D-02** Post from the card: the "+ Post Update" button opens the Post Update dialog. `progress-updates.tsx:470-478, 554-562`
- **D-03** Post from the Gantt: a milestone's action menu has "Post Update", which opens the same dialog with that milestone pre-selected. `milestone-action-menu.tsx:170`, `gantt-chart.tsx:3641-3654`
- **D-04** Post from a phone or tablet (<1024px): a floating purple camera button, on every tab of the project, opens a second, simpler composer (`PostUpdateSheet`). `project-fabs.tsx:23-47`, `page.tsx:4850-4855`
- **D-05** Post after completing a milestone: the invoice drawer offers an optional "Post update" box, and the milestone completion dialog has a third step "Post Update"; both save an update titled "Milestone completed: {milestone}" with the typed text as details. These are typed by a person, not generated. `components/finance/invoice-drawer.tsx:164-179, 387-409`, `components/finance/MilestoneCompletionDialog.tsx:399-414, 748-778`
- **D-06** Automatic update 1: publishing milestones whose dates changed since the last publish posts one update per milestone, "Schedule updated: {milestone}" with "Previously {start} → {end}. Now {start} → {end}." and a structured `reschedule` payload. `gantt-chart.tsx:1403-1424, 1465-1480`
- **D-07** Automatic update 2: an extension request posts "Timeline extension requested: {milestone}" / "Extension to {date}. Reason: {reason}" when the studio's proactive-alert setting `autoUpdateOnExtension` is on. `gantt-chart.tsx:1589-1596`
- **D-08** Review happens in two places: inline on a held row of this card, and as a "Progress Review" task in `/tasks`. `progress-updates.tsx:271-298`, `app/(main)/tasks/page.tsx:38-45`
- **D-09** The homeowner reads approved updates in the portal's updates list; the public pay link (`/pay/[token]`) also returns the newest 20 approved updates. `app/api/homeowner/projects/[id]/updates/route.ts:38-43`, `app/api/pay/[token]/route.ts:107-113`

### 1.2 Layout

- **D-10** The Overview is one column below 1024px and a 12-column grid above it; the main column takes 7, this right column 5, with 24px between columns and 20px between the right column's cards. `page.tsx:2003-2005, 2504`
- **D-11** The card: 1px `#E6E6E6` border, small shadow, `rounded-2xl`, 20px padding. Header row = title and helper line on the left, the button on the right, 16px below. `progress-updates.tsx:460-479`
- **D-12** The list shows the three newest updates, 12px apart; a right-aligned text link under it appears only when there are more than three. `progress-updates.tsx:26, 160-161, 484-507`
- **D-13** One update row is its own bordered box (`rounded-xl`, 12px padding): a header line (chips and times on the left, wrapping; actions on the right, not shrinking), then title, details, 80×80 photo thumbs, file chips, "by {author}", and when relevant the reject input, the delete confirm strip, the rejection note. `progress-updates.tsx:236-455`
- **D-14** "View all" is a side sheet from the right: full width on a phone, at most 512px from 640px up; a pinned header (title, count line, search, 1px rule) and a scrolling list with the same rows. `progress-updates.tsx:514-551`
- **D-15** Post Update dialog: 512px max, no outer padding; header 20/20/12px; a body that scrolls at 60% of the viewport height with 16px between fields; a tinted footer with a top rule — Preview on the left, Cancel and Post Update on the right. `post-update-dialog.tsx:195-207, 339-370`
- **D-16** The preview step reuses the frame: a tinted "device" panel (`rounded-2xl`, 16px padding, scrolls at 60vh) holding one white card with chips, title, details and up to six photos in three columns. `post-update-dialog.tsx:413-443`
- **D-17** The phone composer is a centred dialog (max 448px from 640px up), not a bottom sheet despite its name: a dashed photo well, a three-row text box, two equal-width buttons. `post-update-sheet.tsx:94-169`
- **D-18** Photo comparison is a dialog written at 768px (`max-w-3xl`); the single-photo viewer is a hand-made full-screen layer (70% black, 16px padding, picture capped at 85vh, `rounded-xl`). `progress-updates.tsx:565-603`

### 1.3 UI elements

- **D-19** Title "Progress Updates" (14px semibold, heading face). Helper line, 10px grey: "Posted updates appear immediately on the homeowner portal" — or, when this viewer's posts would be held, "Updates are sent to the owner for review before homeowners see them". `progress-updates.tsx:463-468`
- **D-20** Button: plus icon + "Post Update", 36px high, 12px text, filled primary. On a locked project it is disabled with the tooltip "Project is locked after handover — unlock to post updates." `progress-updates.tsx:470-478`
- **D-21** Kind chip on every row: pin icon + "Site Update", purple text on purple tint with a purple border. It is hard-coded — it does not read the update's type. `progress-updates.tsx:240-243`
- **D-22** Milestone chip: flag icon + milestone name, yellow tint; rendered only when the update carries `milestoneName`. `progress-updates.tsx:244-249`
- **D-23** Status chip, held rows only: clock icon + "Pending review", grey. Tooltip for someone who can approve: "Not yet visible on the homeowner portal — approve it to publish"; for everyone else: "Awaiting owner review — not yet visible on the homeowner portal". `progress-updates.tsx:250-260`
- **D-24** Two timestamps side by side: relative in purple ("Just now" · "{n} min ago" · "{n} hour(s) ago" · "{n} day(s) ago" · then "5 Oct 2026") and absolute in light grey (date + hour:minute, in the project's region locale). `progress-updates.tsx:45-67, 261-268`
- **D-25** Approve: a 28px green pill, check icon + "Approve" ("Saving…" while it runs), tooltip "Approve — publish to the homeowner portal". Reject: a grey outlined pill, × icon + "Reject", turning red on hover, tooltip "Reject — keep it hidden from the homeowner". `progress-updates.tsx:274-298`
- **D-26** Unpublish: an icon-only 32px round button (crossed eye, 12px), tooltip and label "Unpublish from homeowner portal", on approved rows. `progress-updates.tsx:299-309`
- **D-27** Delete: an icon-only 32px round button (bin, 12px), tooltip "Delete update", red on hover. `progress-updates.tsx:310-319`
- **D-28** Reject reason line: a 32px input with placeholder "Why is this going back? (shown to whoever posted it)", a red "Reject" button and a ghost "Cancel". `progress-updates.tsx:325-351`
- **D-29** Photos: 80×80 thumbnails, `rounded-lg`, purple border on hover; a photo with no address draws a grey tile with an image icon and the file name. With two or more photos a purple "Compare" pill follows. `progress-updates.tsx:360-402`
- **D-30** Other attachments: small grey chips with a video or document icon and the file name; the name is a link only when an address was saved. `progress-updates.tsx:405-420`
- **D-31** Delete confirm strip (red tint): "Delete this update? This cannot be undone." · red "Yes, Delete" ("Deleting..." while it runs) · a × to back out. `progress-updates.tsx:425-443`
- **D-32** Rejection note (red tint, speech-bubble icon): the label "Earlier rejection comment" and the reviewer's reason. The code calls it a legacy surface. `progress-updates.tsx:445-454`
- **D-33** Overflow link: "View all {n} updates →". `progress-updates.tsx:499-505`
- **D-34** Sheet: title "Progress updates" (lower-case u, unlike the card); line "{n} update(s) · posted updates are visible on the homeowner portal" or "… · updates appear on the homeowner portal once the owner approves them"; search box "Search updates" with a clear ×. `progress-updates.tsx:517-539`
- **D-35** Post dialog header: "Post Update" and "Posts to {project}. Visible immediately on the homeowner portal." or "Posts to {project}. Sent to the studio owner for review before the homeowner sees it." `post-update-dialog.tsx:199-204`
- **D-36** Field "Title *": placeholder "e.g. Master bathroom tiling completed", 120 characters, a live "{n}/120" counter, focused on open. `post-update-dialog.tsx:209-223`
- **D-37** Field "Details": placeholder "Add context the homeowner will appreciate — what was done, what's next, any decisions needed.", 1,000 characters, no counter, not resizable. `post-update-dialog.tsx:226-235`
- **D-38** Field "Linked milestone (optional)": a select with "None" and each milestone as "{name} ({n}%)" when it carries a payment share; shown only when the project has milestones. `post-update-dialog.tsx:238-256`
- **D-39** When the chosen milestone has a payment share, a green checkbox row appears: "This completes a payment milestone ({n}%)". `post-update-dialog.tsx:257-269`
- **D-40** "Attachments": three icon-only outline buttons with tooltips "Add photo" (camera, any image, several), "Add video" (one video), "Add document" (.pdf .doc .docx .xlsx .xls, several). `post-update-dialog.tsx:274-296`
- **D-41** Picked photos show as a four-column grid of squares with a × that appears on hover; videos and documents as rows (icon, name, ×). `post-update-dialog.tsx:299-334`
- **D-42** Footer: "Preview" (eye icon; only when the studio's homeowner portal is enabled; disabled until there is a title), "Cancel", "Post Update" (send icon → a spinner and "Posting…"). `post-update-dialog.tsx:339-369`
- **D-43** Preview step: title "Homeowner Portal Preview", line "This is what your homeowner will see on the portal once you post."; card with a "Site update" chip, the milestone chip, today's date as "5 Oct", the title (or "Untitled update"), details with line breaks kept, photos; buttons "Back to edit" and "Post Update". `post-update-dialog.tsx:404-459`
- **D-44** Phone composer: "Post Update", "Share progress with {client} on {project}", a well "Add Photos or Videos", the box "Write a message for the homeowner...", "Cancel" and "Post Update" ("Posting..."). `post-update-sheet.tsx:97-166`
- **D-45** The two floating buttons are 48px circles with a shadow, bottom-right, stacked 12px apart: green receipt ("Log expense") above purple camera ("Post update"). `project-fabs.tsx:23-37`

### 1.4 Interactions

- **D-46** Opening the dialog always starts clean (fields, attachments, preview step). Closing it — Cancel, ×, Esc or a press outside — discards what was typed without asking. `post-update-dialog.tsx:99-110, 194`
- **D-47** Post needs only a title. Each photo is read in the browser into a base64 data URL and sent inside the request; a video or a document sends its name and kind only. `post-update-dialog.tsx:141-156`
- **D-48** After a post the toast follows the server's answer, not the prediction: "Update submitted for owner review" or "Update posted — visible to the homeowner"; the dialog closes. A failure toasts "Failed to post update" and keeps the dialog open. `post-update-dialog.tsx:168-186`
- **D-49** Preview swaps the dialog's content in place; "Back to edit" returns with everything kept; Post Update works from either step. `post-update-dialog.tsx:196, 373-383`
- **D-50** Approve is one press. The card looks for the pending Progress Review task tied to that update; with one it approves through the task, without one it writes the update directly. It then toasts "Approved — the homeowner can see this update now." `progress-updates.tsx:133-142, 205-226`
- **D-51** Reject opens the reason line under the row's header (press Reject again to close it). Enter sends when something is typed; Esc closes the line; the red Reject stays disabled while it is empty. Success toasts "Rejected — the update stays hidden from the homeowner."; a failure "Couldn't record the review" or the server's message. `progress-updates.tsx:285-289, 325-351, 215-222`
- **D-52** Unpublish is one press with no confirmation. Success: "Unpublished — the homeowner can no longer see it." A refusal shows the server's sentence as written (D-83). `progress-updates.tsx:189-197`
- **D-53** Delete toggles the red confirm strip on that row; "Yes, Delete" removes the update and toasts "Update deleted"; a failure toasts "Failed to delete update". `progress-updates.tsx:173-184, 312, 425-443`
- **D-54** A photo opens in the full-screen viewer; a press anywhere or on its × closes it. "Compare" opens the first two photos in a before / after slider. `progress-updates.tsx:365, 383-400, 585-603`
- **D-55** "View all" opens the sheet with an empty search. The search filters as typed over title, details, author and milestone name, in the browser. `progress-updates.tsx:162-171, 501`
- **D-56** The phone composer posts when there is a message or at least one photo. It invents the title "Update for {client}", puts the message in the details, toasts "Update posted" and closes. `post-update-sheet.tsx:53-80, 162`
- **D-57** Nothing is optimistic: every change waits for the server and then refetches the list. There is no Undo and no edit of a posted update — no route and no control. `lib/queries/projects.ts:688-690, 709-711, 732-734, 778-782`

### 1.5 States

- **D-58** Empty: a glass tile with a pin icon, "No progress updates yet", "Add your first update to keep the homeowner informed". `progress-updates.tsx:485-491`, `components/ui/empty-state.tsx:15-31`
- **D-59** Loading and error: neither is drawn. While the list loads, and when the read fails, the card shows the empty state. **[inferred]** from `progressQuery.data ?? []` with no loading or error branch. `progress-updates.tsx:93, 485`
- **D-60** Sheet with no match: "No updates match “{q}”."; with nothing at all: "No updates yet." `progress-updates.tsx:542-545`
- **D-61** Locked project: Post Update is disabled; Approve, Reject, Unpublish and Delete are not drawn; the Pending review chip stays. `progress-updates.tsx:274, 299, 310, 474`
- **D-62** By role: someone who cannot approve sees the chip and no buttons; a non-owner never sees Delete; Unpublish is drawn for everyone. There is no "you can't do this" message anywhere. `progress-updates.tsx:274, 299, 310`
- **D-63** Busy: Approve reads "Saving…" and both review pills dim; Unpublish dims on its own row; "Deleting..." shows on whichever confirm strip is open. `progress-updates.tsx:278-283, 302, 432-434`

### 1.6 Motion

- **D-64** Row hover: background to a light grey tint, `transition-colors` (Tailwind's default 150ms). Every pill and icon button changes colour the same way. `progress-updates.tsx:236, 280, 292, 305, 315`
- **D-65** Dialogs (post, compare): fade in with a zoom from 95%, 200ms, over a 40% black scrim that fades; the reverse on close (`animate-in` / `fade-in-0` / `zoom-in-95` from `tw-animate-css`). `components/ui/dialog.tsx:42, 64`
- **D-66** The sheet slides in from the right in 500ms and out in 300ms, ease-in-out, over a 50% black scrim. `components/ui/sheet.tsx:39, 63-65`
- **D-67** Posting spinner: a 12px ring, `animate-spin`; the phone composer uses a spinning loader icon. `post-update-dialog.tsx:362`, `post-update-sheet.tsx:165`
- **D-68** A picked photo's × fades in on hover only (`opacity-0 group-hover:opacity-100`). `post-update-dialog.tsx:309`
- **D-69** The floating buttons shrink to 95% while pressed (`active:scale-95 transition-transform`). `project-fabs.tsx:26, 33`
- **D-70** Switching tabs replays `animate-tab-enter` on the whole tab body: `tabFadeIn`, 0.25s ease-out, opacity 0 → 1 and 4px up. `page.tsx:1941`, `app/globals.css:1687-1693`
- **D-71** The photo viewer has no animation. Toasts are sonner's: top-right, coloured by kind, with a close button, 4 seconds. `progress-updates.tsx:585-603`, `app/layout.tsx:130`
- **D-72** With "reduce motion" on, a global rule cuts every animation and transition to 0.01ms. `app/globals.css:1331-1338`

### 1.7 Rules and logic

- **D-73** Kinds in the type: `check-in · check-out · update · site-update`. The two composers always write `site-update`; the milestone and Gantt paths write `update`; nothing writes check-in or check-out. The homeowner sees the kind as a chip (hyphen turned into a space); the studio card always says "Site Update". `types/app.ts:1624`, `post-update-dialog.tsx:161`, `post-update-sheet.tsx:65`, `app/my/projects/[projectId]/page.tsx:1509`
- **D-74** Review status values: `pending · approved · rejected · draft`. The column defaults to `pending`; the homeowner sees `approved` only. `types/app.ts:1629`, `scripts/migrations/032_progress_updates.sql:11`, `app/api/homeowner/projects/[id]/updates/route.ts:42`
- **D-75** Who may post: any signed-in member of the studio the project belongs to. The server checks nothing else — not role, stage, lock or archive. `app/api/projects/[id]/progress-updates/route.ts:88-129`
- **D-76** The decision at post time, made on the server: review switched off → `approved`; review on and the poster is an approver → `approved`; otherwise `pending` plus a task. Owners are always approvers; other members only when listed in the studio's `approvers.progressUpdate`. `lib/access-control.ts:563-593`, `route.ts:146-159`
- **D-77** Review is on unless the studio turned it off: `progressReviewRequired: true` is the default and is merged under whatever the studio saved; a member's own workflow overrides are applied on top. The switch is Accounts → Workflow Rules → "Progress review required". `lib/queries/studio-config.ts:68-82`, `route.ts:147-158`, `docs/rules/projects.md:86`
- **D-78** A held post creates a task: title `Review progress update: "{title}"`, type Progress Review, not started, approval pending, planned today, assigned to the first listed approver or else the studio's earliest-joined owner. `route.ts:199-234`
- **D-79** Fail-open: if no approver can be found, or the task cannot be saved, the update is approved on the spot so it is never stranded. `route.ts:235-258`
- **D-80** Studio notification on every post, event `project.progress_update_submitted`: by default to owners, admins and designers; for a held post, to the assigned approver only. In-app text: "{title} by {author} — {project}". `route.ts:261-278`, `lib/notifications/events.ts:431-440`, `lib/notifications/dispatch.ts:475-486`
- **D-81** Homeowner notification: one bell row per active portal link — title "New project update", body the update's title, link `?tab=overview` — written when the update is born approved or at the moment it is approved, never while held. `lib/homeowner-binding.ts:595-653`, `route.ts:285`, `context/app-context.tsx:370`
- **D-82** Approve and reject through the task: the task is marked, then the update's status is written (`approved` also stamps the publish time; `rejected` stores the reason), then lists refresh. Allowed for an owner, or a member on the studio-level approver list; the card shows the pills only when both the member-level and studio-level checks pass. `context/app-context.tsx:286-309, 350-376, 566-590`, `progress-updates.tsx:123-127`
- **D-83** Unpublish rule: only an approved update, and only while no linked homeowner has opened the portal since it was published (latest `last_seen_at` earlier than `published_at`). It sets the status to `draft` and clears the publish time. Refusals: "This update isn't published." and "The homeowner has already viewed the portal since this was posted — it can't be unpublished." `app/api/projects/[id]/progress-updates/[updateId]/unpublish/route.ts:52-87`, `lib/projects/unpublish-gate.ts:8-15`
- **D-84** Delete removes the row for good. The screen offers it to owners; the server takes it from any member. `app/api/projects/progress-updates/[updateId]/route.ts:103-126`, `progress-updates.tsx:310`
- **D-85** The server's review write also takes any member, checks no current status and records neither who reviewed nor when (`reviewed_by` / `reviewed_at` exist and stay empty). `app/api/projects/progress-updates/[updateId]/route.ts:54-96`, `scripts/migrations/072_progress_update_approval.sql:9-13`
- **D-86** "This completes a payment milestone", ticked, runs after a successful post from the card: refused with "Financial actions are restricted while the project is in Draft." on a Draft project; "Milestone "{name}" completed but no contract value set." when there is no contract value; otherwise it rings the homeowner's bell for the milestone as completed and creates a draft invoice for that share, due today ("Invoice already exists for "{name}"" / "Failed to auto-generate invoice"). `page.tsx:2516-2574`
- **D-87** The handover lock: on only when the studio feature `lockProjectOnHandover` is on **and** (the project has `handoverLockedAt` or its stage is Closed) **and** the viewer lacks the `project_override.override_lock` permission. It shows a yellow strip under the header: "This project is handover-locked. Contact a studio admin to unlock for edits." `page.tsx:809-813, 1890-1895`
- **D-88** A linked milestone is saved only when its id is a UUID. `route.ts:20, 185`
- **D-89** A usage event `progress_update_posted` is recorded with the kind, the status, whether it was held and whether it had attachments. `route.ts:287-297`

### 1.8 Data

- **D-90** Table `progress_updates`: `id`, `project_id` (deleted with the project), `studio_id`, `type`, `title`, `description`, `author` (name as text), `author_user_id`, `review_status`, `attachments` (JSON), `created_at`; later `review_comment`, `reviewed_by`, `reviewed_at`, `published_at`; the route also writes `metadata` and `milestone_id`. `scripts/migrations/032_progress_updates.sql`, `072_progress_update_approval.sql`, `273_ho_unpublish_support.sql:9-15`, `route.ts:161-186`
- **D-91** Routes: `GET` / `POST /api/projects/[id]/progress-updates`; `GET` / `PATCH` / `DELETE /api/projects/progress-updates/[updateId]`; `POST /api/projects/[id]/progress-updates/[updateId]/unpublish`; the homeowner's `GET /api/homeowner/projects/[id]/updates`.
- **D-92** Also touched: `tasks` (the review task), `homeowner_notifications`, `homeowner_project_links.last_seen_at`, `studios.settings.workflow`, `studio_members.tags` and `workflow_overrides`, `profiles.full_name`.
- **D-93** The homeowner's list: approved updates, newest first, re-read every 10 seconds. Each shows the kind chip, date, title, details, "by {author}", an invoice card when the update's milestone has an invoice, photos in a two- or three-column grid, and file links; a search box appears once there are more than three. `lib/queries/homeowner.ts:324-340`, `app/my/projects/[projectId]/page.tsx:1432-1560`
- **D-94** `POST /api/projects/[id]/notify-publish` does not post an update. It sends the `project.timeline_published` notification (owners and admins, plus an email to the first linked homeowner who has one) after a Gantt publish. `app/api/projects/[id]/notify-publish/route.ts:40-97`, `lib/notifications/events.ts:441-450`
- **D-95** `MilestonePublishBatch` ("Publish to homeowner") only picks which milestones to publish; the updates come from the Gantt's `publishMilestones` it calls (D-06). `milestone-publish-batch.tsx:72-80`, `gantt-chart.tsx:3657-3662`
- **D-96** A second, older source exists: a `progress_updates` JSON column on the project row. The page passes it to the card, and the card prefers it over the table whenever it holds anything. `page.tsx:2512`, `progress-updates.tsx:93`, `lib/transformers.ts:530`

### 1.9 Responsive

- **D-97** Below 1024px the card sits in the single column under Meeting Summary; the row header's chips wrap while its actions do not. `page.tsx:2003`, `progress-updates.tsx:238-239, 270`
- **D-98** The two floating buttons exist only below 1024px, 16px from the right and above the bottom navigation with the phone's safe-area inset added. `project-fabs.tsx:20-23`
- **D-99** The phone composer's file input asks for the rear camera (`capture="environment"`), accepts images and videos, and takes several. `post-update-sheet.tsx:106-113`
- **D-100** Dialogs keep 16px from the screen edges on a phone; the sheet is full width below 640px. `components/ui/dialog.tsx:64`, `progress-updates.tsx:515`

### 1.10 Problems

- **D-101** Videos and documents are never uploaded — only `{ name, type }` is saved — yet they show as attached. On the studio card they are unlinked names; on the homeowner's list they are links to `#`. `post-update-dialog.tsx:153-155`, `progress-updates.tsx:410-416`, `app/my/projects/[projectId]/page.tsx:1559`
- **D-102** Photos travel and are stored as base64 text inside the update's JSON, with no limit on size or count. A few phone photos make a multi-megabyte request and row, and every list read returns them all. **[inferred]** on the size effect. `post-update-dialog.tsx:146-152`
- **D-103** The phone composer saves each photo's `blob:` preview address (its own comment says "In production, this would be uploaded to storage") and the browser's MIME type as the kind. The picture breaks for everyone once that tab closes. `post-update-sheet.tsx:57-61`
- **D-104** The phone composer ignores the handover lock, shows nothing about review, and toasts "Update posted" even when the post was held. `post-update-sheet.tsx:53-80`, `project-fabs.tsx:14-55`
- **D-105** The milestone chip never appears for saved updates: the reader fills `milestoneId` and never `milestoneName`. Searching by milestone name finds nothing for the same reason. `lib/transformers.ts:1415-1438`, `progress-updates.tsx:169, 244`
- **D-106** "This completes a payment milestone" does not mark the milestone complete (nothing writes the timeline), yet the homeowner is told it is. On success the page stores a result for a dialog that is never drawn, so the designer sees nothing. `page.tsx:836, 2537-2568`, `app/api/finance/records/invoices/auto-milestone/route.ts:168`
- **D-107** Opened from the Gantt, the dialog gets no completion handler and no lock flag: the green checkbox still shows and does nothing. `gantt-chart.tsx:3641-3654`
- **D-108** A rejected update has no chip (only pending has one), no notification or task for its poster, and no edit or resubmit; the reason shows under the label "Earlier rejection comment". The reject box promises "(shown to whoever posted it)". `progress-updates.tsx:250, 335, 445-454`, `context/app-context.tsx:566-590`
- **D-109** An unpublished update (`draft`) has no chip and no action that publishes it again — Approve shows for `pending` only, Unpublish for `approved` only. It can only be deleted, by an owner. `progress-updates.tsx:250, 274, 299`
- **D-110** Unpublish is an unlabelled 12px icon with no confirmation, drawn for every member. `progress-updates.tsx:299-309`
- **D-111** Approve and reject through a task return nothing to wait on, so the success toast shows before the server answers, and also when the app-level gate silently refuses. `progress-updates.tsx:209-217`, `context/app-context.tsx:304-309`
- **D-112** Deleting a held update leaves its Progress Review task open; deleting a published one leaves the homeowner's "New project update" bell row pointing at nothing. **[inferred]** — the delete route touches only the update row. `app/api/projects/progress-updates/[updateId]/route.ts:114-119`
- **D-113** No server check on role, lock, stage or archive for post, review, delete or unpublish (D-75, D-84, D-85).
- **D-114** The studio email for a post always carries a "pending" badge and a "Review update" button, even when the update was published at once. `lib/notifications/templates/base/projects.ts:119-135`
- **D-115** The preview says "This is what your homeowner will see on the portal once you post." even when the post will be held; it shows photos only and labels the chip "Site update" while the card says "Site Update" and the portal "site update". `post-update-dialog.tsx:408-410, 418-420`
- **D-116** The success toast says "visible to the homeowner" whether or not anyone has been invited to the portal. `post-update-dialog.tsx:176-180`
- **D-117** The milestone completion step asks to "Share a progress update with the team", but the update goes to the homeowner. Neither milestone path links the update to its milestone. `components/finance/MilestoneCompletionDialog.tsx:752, 402-407`, `components/finance/invoice-drawer.tsx:167-172`
- **D-118** The photo viewer is not a dialog: no Esc, no focus handling. Opened from inside the "View all" sheet it is drawn in the card's layer, behind the sheet. **[inferred]** from both being `z-50` with the sheet in a later portal. `progress-updates.tsx:585-603`
- **D-119** "Compare" always pairs the first two photos, whatever they show. `progress-updates.tsx:386-391`
- **D-120** The picked photo's remove × appears on hover only, so it cannot be reached by touch. `post-update-dialog.tsx:309`
- **D-121** If the legacy JSON column holds anything, the card shows only that and never the table's updates (D-96). **[inferred]** as a live risk — no code in `src` writes the column today.
- **D-122** Two composers with different rules: the dialog needs a title and has milestone, three attachment kinds and a preview; the phone one has no title field, photos or videos only, and no preview.
- **D-123** The page's own comment on the mount still reads "single Post Update CTA, no approval workflow". `page.tsx:2508`

---

## 2. Meeting Summary

### 2.1 What it is / entry points

- **D-124** A card titled "Meeting Summary", first in the Overview's right column. It replaced the old Chat Highlights card and a "Meeting Briefs" accordion. `page.tsx:2505-2506`
- **D-125** It lists nothing itself: it shows the newest AI brief for the project and starts the two ways of making one — a live co-pilot session or an uploaded recording. `meeting-summary-card.tsx:37-49, 95-118`
- **D-126** The same upload dialog is also mounted on the Meeting Co-pilot landing page. `components/copilot/meeting-copilot-landing.tsx:140`

### 2.2 Layout

- **D-127** Card: same shell as its neighbours (`rounded-2xl`, 20px padding). Header: a 32px purple-tint square with a sparkle icon, the title, a "· {n}" count when there are briefs; the menu button on the right. `meeting-summary-card.tsx:81-119`
- **D-128** With a brief: one inner panel (`rounded-xl`, light tint, 12px padding) — date left and score right, a three-line summary, a ruled "Top actions" block, a link; under the panel a centred line about earlier meetings. `meeting-summary-card.tsx:121-177`
- **D-129** Without: a centred column, 24px above and below — a 48px grey circle with a microphone, a heading, one sentence capped at 320px. `meeting-summary-card.tsx:178-188`
- **D-130** Upload dialog: written at 448px (`max-w-md`), capped to the viewport height with a scrolling middle; header, body, right-aligned footer. `audio-upload-dialog.tsx:101-112, 194`

### 2.3 UI elements

- **D-131** Menu button: microphone + "Log Meeting" + a down chevron, 32px high, filled primary. The menu is 240px wide, right-aligned. `meeting-summary-card.tsx:95-101`
- **D-132** Menu row 1: microphone, "Launch Co-pilot" / "Live transcription & insights". Row 2, under a rule: upload icon, "Upload recording" / "Transcribe an existing audio file". `meeting-summary-card.tsx:102-116`
- **D-133** Brief panel: a calendar icon and the brief's date (day, short month, year, in the browser's locale); a badge "Deal {score}" — green at 80 and above, yellow at 60–79, grey below. `meeting-summary-card.tsx:29-35, 124-137`
- **D-134** The summary, clamped to three lines; "TOP ACTIONS" (10px capitals) with up to three one-line bullets; the link "Open full brief →". `meeting-summary-card.tsx:139-162`
- **D-135** With more than one brief: "+ {n} earlier meeting(s) — view all". `meeting-summary-card.tsx:164-176`
- **D-136** Empty: "No meetings yet" / "Run a live co-pilot session, or upload a recording, and the brief will land here automatically." `meeting-summary-card.tsx:183-186`
- **D-137** Before a live session, a "Recording Reminder" alert: "Before starting the AI co-pilot with {customer}, please ensure the customer has been informed about the AI assistant.", the disclosure text in a grey box, a checkbox "I have informed the customer about the AI assistant", "Cancel" and "Start Meeting" (disabled until ticked). `components/copilot/consent-dialog.tsx:23-87`
- **D-138** Upload dialog: title "Upload Meeting Recording" (microphone); "Drop in an audio file from a past meeting. We'll transcribe it and generate a brief."; a dashed well "Click to choose an audio file" / "webm, mp3, wav · up to 25MB". `audio-upload-dialog.tsx:103-131`
- **D-139** A chosen file shows as a row: audio icon, name, size, a × ("Remove file"). `audio-upload-dialog.tsx:133-147`
- **D-140** Consent checkbox: "I confirm I have permission from all participants to upload this recording for AI transcription. Audio is processed via Google Gemini and not retained beyond brief generation." `audio-upload-dialog.tsx:150-160`
- **D-141** Footer by phase — choosing: "Cancel", "Upload & transcribe" (disabled until a file and the tick); working: "Close"; done: "Done"; failed: "Cancel", "Try again". `audio-upload-dialog.tsx:194-216`

### 2.4 Interactions

- **D-142** "Launch Co-pilot" → the consent alert → "Start Meeting" → a full-screen layer over the app: choose the meeting's objective (with a prep card for the lead) → "Starting session..." → the live session. Ending it returns to the project. `meeting-summary-card.tsx:56-69, 191-213`, `components/copilot/copilot-session-launcher.tsx:101-141`
- **D-143** "Upload recording" → the dialog → pick one file → tick → "Upload & transcribe". The request stays open while the whole recording is transcribed; the dialog shows "Transcribing…" for that time. `audio-upload-dialog.tsx:60-93`, `app/api/copilot/upload/route.ts:179-210`
- **D-144** On success: the done panel and the toast "Audio uploaded — your brief is being generated and will appear shortly."; four seconds later the card's briefs are re-read once. `audio-upload-dialog.tsx:81-87`
- **D-145** "Open full brief" opens `/tools/copilot-analytics?sessionId={id}` in a new tab; "view all" opens `/tools/copilot-analytics` in a new tab, not narrowed to this project. `meeting-summary-card.tsx:155-173`
- **D-146** Closing the upload dialog at any time resets it; the text says the work carries on: "You can close this dialog — the brief will appear on the project automatically." `audio-upload-dialog.tsx:95-98, 168-171`

### 2.5 States

- **D-147** Co-pilot switched off for the studio (the page `tools/copilot-analytics` disabled): the button and menu still show; either choice toasts "Co-pilot is disabled for your studio." `meeting-summary-card.tsx:38-39, 57-60, 72-75`
- **D-148** A project with no linked lead: "Launch Co-pilot" toasts "This project isn't linked to a lead yet — Upload recording works without one, or open the lead to start a live session."; upload works. `meeting-summary-card.tsx:64-67`
- **D-149** Loading and error: none drawn; the card shows the empty state until briefs arrive, and when the read fails. **[inferred]** from `data: briefs = []`. `meeting-summary-card.tsx:42`
- **D-150** Upload — file over 25MB: toast "File too large — max 25MB."; no tick: toast "Please confirm you have permission to upload this recording."; working: a spinner, "Transcribing…", "This usually takes 30 seconds to 2 minutes depending on the recording length. …"; done: green check, "Recording uploaded", "Your meeting brief is being generated and will land on the project Overview within a minute or two."; failed: a red box "Upload failed" with the server's message. `audio-upload-dialog.tsx:51-65, 164-191`
- **D-151** Server refusals the red box can show: "Missing audio file", "Audio file too large. Max 25MB.", "Project not found", "Lead not found", "Studio member not found", "Failed to create session", "Transcription failed. The audio may be unsupported or too noisy." `app/api/copilot/upload/route.ts:79-111, 126-128, 146-148, 173-176, 204-209`

### 2.6 Motion

- **D-152** The menu fades and zooms in from 95% and slides 8px from its trigger's side. `components/ui/dropdown-menu.tsx:45`
- **D-153** Dialog and alert: fade + zoom from 95%, 200ms. The upload well's border and tint change on hover (`transition-colors`). `components/ui/dialog.tsx:64`, `components/ui/alert-dialog.tsx:61`, `audio-upload-dialog.tsx:126`
- **D-154** "Transcribing…" spinner: `animate-spin`; the launcher's "Starting session..." spinner spins only when motion is allowed (`motion-safe:`). `audio-upload-dialog.tsx:166`, `components/copilot/copilot-session-launcher.tsx:120`
- **D-155** The live session takes the whole screen at once, with no transition. `components/copilot/copilot-session-launcher.tsx:103`

### 2.7 Rules and logic

- **D-156** What a brief holds: a 3–4 sentence summary; a customer profile (property type, area, address, budget and range, styles, timeline, decision makers, concerns, competitors, notes); a deal score with six dimensions; a quote estimate; suggested actions; a follow-up draft; upsells; the transcript's segment count. The card uses the date, score, summary and first three actions. `types/app.ts:3402-3439`, `lib/copilot/brief-generator.ts:97-122`
- **D-157** Where it is stored: one `meeting_briefs` row per brief, keyed to the co-pilot session and carrying `project_id` and `lead_id`. Making a brief writes nothing to the lead, the tasks or the quote. `app/api/copilot/brief/generate/route.ts:143-177`
- **D-158** Which briefs the card gets: those with this `project_id`, newest first; if there are none, those of the project's lead (older briefs made before projects were keyed). `app/api/copilot/records/briefs/route.ts:53-72`, `lib/queries/copilot.ts:309-331`
- **D-159** Who sees them: owners and admins see every meeting; anyone else sees only briefs from sessions they ran. The count and the "latest" can differ per viewer. `app/api/copilot/records/briefs/route.ts:33-51`, `lib/copilot/caller-scope.ts:17-19, 67`
- **D-160** Upload, on the server: checks the project (and lead) belong to the studio; creates a session marked consented by the uploader with the disclosure "Recording uploaded by the studio after the meeting; AI used for transcription and summary."; transcribes the whole file in one call (`google/gemini-2.5-flash`, speakers labelled id / customer / unknown); saves the segments with estimated timings; ends the session; then triggers the brief after the response is sent. `app/api/copilot/upload/route.ts:99-112, 150-176, 184-203, 212-274`, `audio-upload-dialog.tsx:74`
- **D-161** Limits: 25MB, checked in the browser and on the server; one file; the route may run for 300 seconds. `audio-upload-dialog.tsx:27`, `app/api/copilot/upload/route.ts:25, 29`
- **D-162** Credits: none are charged. Neither the upload route, the brief route nor the session route touches a balance or a ledger at this commit; the session route records usage events and nothing else is metered. `app/api/copilot/upload/route.ts`, `app/api/copilot/brief/generate/route.ts`, `app/api/copilot/session/route.ts:17, 173-174`
- **D-163** A live session is created with `projectId` so its brief lands on the project; it needs a lead because the prep card and transcript are keyed to it. `meeting-summary-card.tsx:61-67, 204-213`, `components/copilot/copilot-session-launcher.tsx:57-72`
- **D-164** Without an AI key on the server, transcription returns a canned four-line conversation and the brief route returns a mock brief without saving it. `app/api/copilot/upload/route.ts:48-53, 181-182`, `app/api/copilot/brief/generate/route.ts:14, 28-42`

### 2.8 Data

- **D-165** Tables: `copilot_sessions` (with `project_id`, `lead_id`, mode, status, consent stamps, disclosure text), `copilot_transcript_segments`, `copilot_cards`, `copilot_shadow_quote_items`, `meeting_briefs`. Routes: `POST /api/copilot/upload`, `POST /api/copilot/brief/generate`, `GET /api/copilot/records/briefs`, `POST /api/copilot/session`. `app/api/copilot/upload/route.ts:155-172, 235-248`, `app/api/copilot/brief/generate/route.ts:53-88, 145-165`
- **D-166** The card's read is cached for five minutes under `meetingBriefsForProject`. `lib/queries/copilot.ts:312, 329`

### 2.9 Responsive

- **D-167** The card has no breakpoint rules of its own; below 1024px it leads the single column's right-hand group. The menu and dialogs follow the shared primitives; the live session is full-screen at every width. `page.tsx:2003, 2504`

### 2.10 Problems

- **D-168** Only the newest brief is shown. Earlier ones are a count and a link that leaves the project, opens a new tab and lists the whole studio's meetings. `meeting-summary-card.tsx:49, 164-176`
- **D-169** A "Deal {score}" badge on a project that is already won. For an uploaded recording there is no score history, so the stored score falls back to the session's final score or 0, and the card shows "Deal 0" in grey. **[inferred]** `app/api/copilot/brief/generate/route.ts:118-121`, `meeting-summary-card.tsx:129-136`
- **D-170** With the co-pilot off, the card still invites "Run a live co-pilot session, or upload a recording…" and answers each choice with an error toast (D-147).
- **D-171** The no-lead message ends "or open the lead to start a live session" on a project that has no lead. `meeting-summary-card.tsx:65`
- **D-172** After a **live** session nothing refreshes the card: the brief hooks invalidate `meetingBrief` / `meetingBriefs`, not `meetingBriefsForProject`, and the cache lasts five minutes. "Will land here automatically" then needs a reload. **[inferred]** `lib/queries/copilot.ts:329, 346-347`, `meeting-summary-card.tsx:211`
- **D-173** After an upload the card re-reads once, four seconds later, while the brief is promised "within a minute or two". **[inferred]** that the single re-read usually comes too early. `audio-upload-dialog.tsx:84-87, 180-181`
- **D-174** Closing the dialog while it works resets it, but the request finishes later and sets the done state on the closed dialog, so the next open can start on "Recording uploaded". **[inferred]** `audio-upload-dialog.tsx:81, 95-98`
- **D-175** The well says "Drop in an audio file" but there is no drop handling — it is a click target. It names "webm, mp3, wav" while the picker also accepts ogg, m4a and mp4, which the server then labels as webm. **[inferred]** on the effect of the mislabel. `audio-upload-dialog.tsx:26, 108, 123-131`, `app/api/copilot/upload/route.ts:55-65`
- **D-176** Four names for one thing: the card is "Meeting Summary", the button "Log Meeting", the action "Launch Co-pilot", the result a "brief"; the brief's date uses the browser's locale while the updates card beside it uses the project's region. `meeting-summary-card.tsx:31, 88, 98, 105, 161`
- **D-177** `chat-highlights.tsx` is dead code: mounted nowhere. It drew "Chat Highlights" with an "Open Chat" button to `/inbox`, the last five messages of the project's conversation, three skeleton rows while loading, and "No messages yet" / "Messages will appear here when there's an active conversation". `chat-highlights.tsx:18-98`, `page.tsx:2505`

---

## 3. Activity

### 3.1 What it is / entry points

- **D-178** Two views of one feed: the Overview's "Activity" card (the five newest lines) and the "Activity" tab (everything loaded). "View all →" on the card switches to the tab. `activity-summary.tsx:54-68`, `page.tsx:2577-2581, 4505-4508`
- **D-179** The tab is the last of the page's tabs (Overview · Management · Finance · Files & Docs · Activity), with an eye icon. It is reachable as `?tab=activity`. `page.tsx:850, 894-908, 1876-1882`
- **D-180** There is no activity table for projects. The feed is derived on every read from other records. `src/lib/audit-trail.ts` is unrelated: it hashes quote snapshots and appends signing events to a quote signature request. `lib/lifecycle/transitions.ts:297-299`, `lib/audit-trail.ts:24-66`

### 3.2 Layout

- **D-181** Overview card: standard shell; header = title and the link; a list with 12px between lines. Each line: a 28px avatar with initials and a 14px category dot overlapping its bottom-right corner, then text clamped to two lines and a time under it. `activity-summary.tsx:59-108`
- **D-182** Tab: one card for the whole tab, 20px padding. Header: a 32px purple-tint square with a calendar icon, "Activity", and the count on the far right. `activity-feed.tsx:140-150`
- **D-183** Filter chips: one row that scrolls sideways with no scrollbar, bleeding to the card's edges, its last 24px fading out. `activity-feed.tsx:152-170`
- **D-184** A feed row: a 3px coloured left border, 16px indent, 12px above and below, 2px between rows. Avatar (28px), then one truncated line, an optional second line, an optional details toggle; the time sits at the far right. `activity-feed.tsx:66-123, 187`

### 3.3 UI elements

- **D-185** Card title "Activity"; link "View all →" (11px purple). `activity-summary.tsx:61-68`
- **D-186** Category icon and tone — updates: camera, green; timeline: calendar, purple; tasks: check-square, blue; finance: dollar, yellow; procurement: package, blue; issues: warning triangle, red; chat: speech bubble, grey; files: file, grey. On the tab the tone is the row's left border. `activity-summary.tsx:15-35`, `activity-feed.tsx:14-27`
- **D-187** Card line: "**{actor}** {action}" with the actor in medium weight, and a short time under it — "Just now" · "5m" · "3h" · "2d" · then "Oct 5". `activity-summary.tsx:41-52, 97-103`
- **D-188** Tab line: for a person, a small grey category icon, then "**{actor}** {action}"; for the actor "System", a grey circle with the category icon instead of an avatar, and the action alone. `activity-feed.tsx:59, 73-93`
- **D-189** Second line: the record's label (an update's title, "Invoice INV-…", a file name), hidden when the action already contains it. `activity-feed.tsx:60-63, 96-100`
- **D-190** Details: a 10px purple toggle "Show details" / "Hide details" with a chevron; open, the detail sits in a grey rounded box. `activity-feed.tsx:102-116`
- **D-191** Tab time: "Just now" · "5m ago" · "3h ago" · "2d ago" · then "Oct 5" — a different wording from the card's. `activity-feed.tsx:43-53`
- **D-192** Count: "{n} event(s)", 10px light grey. Chips: All · Updates · Finance · Issues · Timeline — 36px pills, 11px text; the active one filled purple with white text. `activity-feed.tsx:31-37, 147-149, 156-169`
- **D-193** More: a full-width text button "Show all {n} events". `activity-feed.tsx:192-199`

### 3.4 Interactions

- **D-194** A chip filters the loaded lines in the browser. `activity-feed.tsx:132-135, 159`
- **D-195** The tab shows 20 lines, then "Show all {n} events" reveals the rest in one go. There is no way back to 20 and no further paging. `activity-feed.tsx:130, 137, 192-199`
- **D-196** A line is not a link: nothing opens the update, invoice, task or file it names. Only the details toggle responds. `activity-feed.tsx:55-124`
- **D-197** No search, no date range, no person filter, no export.

### 3.5 States

- **D-198** Loading — card: the word "Loading…"; tab: five grey 48px bars that pulse. `activity-summary.tsx:71-72`, `activity-feed.tsx:173-178`
- **D-199** Empty — card: "No activity yet — actions across the project will show up here."; tab: "No activity yet" / "Events will appear here as the project progresses." `activity-summary.tsx:73-76`, `activity-feed.tsx:179-185`
- **D-200** Error: none. A failed read shows the empty state. **[inferred]** from `data: events = []`. `activity-feed.tsx:128`
- **D-201** Every project has a "Project created" line, so the real empty state can only appear on a failed read. **[inferred]** `lib/queries/project-aggregates.ts:656-668`

### 3.6 Motion

- **D-202** Chips change colour over 200ms (`transition-colors duration-200`). The loading bars use `animate-pulse`. `activity-feed.tsx:161, 176`
- **D-203** The tab body enters with `animate-tab-enter` (D-70). Lines do not animate in; details open and close with no transition. `page.tsx:1941`, `activity-feed.tsx:112-116`

### 3.7 Rules and logic — every line the feed can show

- **D-204** One read returns twelve slices, each capped: 50 updates, 30 tasks, 20 invoices, 20 client payments, 20 purchase orders, 20 variation orders, 20 escalations, 30 files, 10 commission rules, 15 commission change requests, the project row, 20 expenses. The browser turns them into lines and sorts newest first. `app/api/project-aggregates/activity-feed/route.ts:29-130`, `lib/queries/project-aggregates.ts:443-693`
- **D-205** Progress update (updates): "{author} approved progress update "{title}"" when its status is approved, "… rejected progress update …" when rejected, "… posted progress update …" otherwise. Actor = the author (else "Team member"); time = when it was posted; details = its description. `lib/queries/project-aggregates.ts:455-472`
- **D-206** Task (tasks): "{assignee} created task "{title}"", or "… completed "{title}"" once completed, or "… approved "{title}"" when completed and approved. Actor = the assignee (else "Team member"); time = when the task was created. `lib/queries/project-aggregates.ts:474-487`
- **D-207** Invoice (finance, System): "Invoice {no} created" → "Invoice {no} sent to client" → "Invoice {no} fully paid" by status; time = creation; details "Total: 1234.00". `lib/queries/project-aggregates.ts:489-504`
- **D-208** Client payment (finance, System): "Payment received for {invoice no}"; time = the payment date; details "Amount: 1234.00". `lib/queries/project-aggregates.ts:506-518`
- **D-209** Purchase order (procurement, System): "PO {no} — {status in words}"; time = last update. `lib/queries/project-aggregates.ts:520-530`
- **D-210** Variation order (finance, System): "VO {no} "{title}" approved", otherwise "VO {no} "{title}" — {status in words}"; time = last update. `lib/queries/project-aggregates.ts:532-544`
- **D-211** Escalation (issues, System): "Escalation "{subject}" opened ({priority})" or "Escalation "{subject}" resolved"; time = last update. `lib/queries/project-aggregates.ts:546-558`
- **D-212** File (files): "{uploader} uploaded {file name} to {folder}"; details = the file type. Project files only. `lib/queries/project-aggregates.ts:560-573`
- **D-213** Commission rule (finance, System): "Commission override set — 5.0% of revenue" or "… — 500.00 fixed"; details "Trigger: {event}". `lib/queries/project-aggregates.ts:575-589`
- **D-214** Commission change request (finance): "{requester} requested commission change — 5.0%" with the reason as details; once reviewed a second line, "Owner approved commission change" / "Owner rejected commission change", at the review time. `lib/queries/project-aggregates.ts:591-619`
- **D-215** Expense (finance): "{recorder} recorded expense "{description}"" (with " — pending approval" while pending) and "Amount: …"; once reviewed a second line "Owner approved expense "…"" / "Owner rejected expense "…"" at the approval time. `lib/queries/project-aggregates.ts:621-652`
- **D-216** Lifecycle (timeline): "Project created" (System, at creation); "Team member submitted project for closure review" (at `closure_submitted_at`); "Owner Project closed" (at `closed_at`) — actor "Owner", action "Project closed". `lib/queries/project-aggregates.ts:654-690`
- **D-217** One record gives one line (two for a reviewed expense or commission request). As the record changes, its line's words change, and for updates, tasks and invoices the time stays the creation time. A task completed today reads "completed" at the day it was created. `lib/queries/project-aggregates.ts:461-468, 476-484, 494-500`
- **D-218** Leaves no line: project created by whom; edits to project name, info, customer, property or notes; team changes; inviting the homeowner or their visits; every milestone action (add, move, start, complete, block, publish, the homeowner's approval or revision request) and the "Schedule updated" publish itself; task edits, reassignment or cancellation as a separate step; update unpublish, delete, and who reviewed it; a closure rejection or resubmission; archive and unarchive; meetings and briefs; renders, the 3D plan, material selections and receipts; floor-plan notes; lead-side files, contract or quote uploads, file deletes; credit notes; payments to vendors; invoice edits or voids as separate steps; messages (the "chat" kind is never produced). `app/api/project-aggregates/activity-feed/route.ts:29-115`, `lib/queries/project-aggregates.ts:432`
- **D-219** The page's one audit write goes to the **lead's** log, not here: "Payment schedule unlocked for editing by {name}". `page.tsx:2776-2791`
- **D-220** Freshness: cached five minutes and re-read on window focus when stale. Only finance changes and expense approvals invalidate it; posting or reviewing an update, uploading a file, a task change and a closure do not. `components/providers.tsx:40-43`, `lib/queries/invalidate-finance.ts:68`, `lib/queries/expenses.ts:153`, `context/app-context.tsx:420, 636`, `lib/queries/projects.ts:688-690, 778-782`

### 3.8 Data

- **D-221** `GET /api/project-aggregates/activity-feed?projectId=` reads, under the studio's row-level rules: `progress_updates` (+ author profile), `tasks`, `project_invoices`, `payment_records` (through their invoice), `purchase_orders`, `variation_orders`, `escalations`, `project_files` (+ uploader), `commission_rules`, `commission_change_requests` (+ requester), `projects` (`created_at`, `closure_submitted_at`, `closed_at`), `expenses` (+ recorder). It writes nothing. `app/api/project-aggregates/activity-feed/route.ts:17-130`
- **D-222** Query key `projectActivityFeed`; both views share one cached result. `lib/queries/project-aggregates.ts:443-446`

### 3.9 Responsive

- **D-223** No breakpoint rules. The chip row scrolls sideways on narrow screens; a row's single line truncates with an ellipsis and has no way to read the rest. `activity-feed.tsx:88, 155`

### 3.10 Problems

- **D-224** It is a snapshot, not a history: a line's wording is overwritten as its record changes and keeps the creation time (D-217); a resubmitted closure moves the one "submitted" line.
- **D-225** Every update published at once reads "{author} approved progress update" — the author approving their own post — and a rejected one reads "{author} rejected progress update", crediting the poster with the reviewer's act. `lib/queries/project-aggregates.ts:457-472`
- **D-226** A task's actor is its assignee, so "{assignee} created task" names the wrong person whenever someone else created it. `lib/queries/project-aggregates.ts:482-485`
- **D-227** Placeholder actors: "Owner" for every review and for closing, "Team member" for a closure submission, "System" for all invoices, payments, POs, VOs, escalations and commission rules, whoever did them. `lib/queries/project-aggregates.ts:499, 609, 641, 670-683`
- **D-228** "**Owner** Project closed" — a noun-first action printed after an actor. `lib/queries/project-aggregates.ts:680-682`, `activity-feed.tsx:91-92`
- **D-229** The Overview card prints the actor on every line, giving "System Invoice INV-0071 created" — the misreading the tab's code was changed to avoid — and an "S" avatar for System. `activity-summary.tsx:84-99`, `activity-feed.tsx:89-92`
- **D-230** Amounts have no currency: "Total: 1234.00", "Amount: 1234.00", "500.00 fixed". `lib/queries/project-aggregates.ts:502, 516, 579`
- **D-231** Three kinds have no chip — Tasks, Procurement, Files — although each has a label; they can only be seen under All. `activity-feed.tsx:19-37`
- **D-232** The empty state under a chip with no lines says "No activity yet / Events will appear here as the project progresses." The count stays the total while a chip is on. "Show all" stays on across chips. `activity-feed.tsx:130, 147-149, 179-185`
- **D-233** Older records drop off without notice because of the per-source caps; the tab's "Show all {n} events" is all of what was loaded, not all that happened. `app/api/project-aggregates/activity-feed/route.ts:48-114`
- **D-234** No year and no clock time anywhere; no day grouping; the card and the tab word the same moment differently ("3h" / "3h ago"). `activity-summary.tsx:41-52`, `activity-feed.tsx:43-53`
- **D-235** The feed parses each update's attachments and never shows them; `entityId` is declared and never set, so lines cannot link anywhere. `lib/queries/project-aggregates.ts:422-425, 470`
- **D-236** The tab's icon is an eye, its card's a calendar; the same word "Timeline" names a chip here that holds only three lifecycle lines, never milestones. `page.tsx:1881`, `activity-feed.tsx:20, 144`
- **D-237** Stale for up to five minutes after the actions it is meant to reflect (D-220): post an update and the Activity card beside it does not change.

---

## 4. Ending a project — close, archive, delete

### 4.1 What it is / entry points

- **D-238** Three separate endings: **Close** (a reviewed hand-over that moves the project to the Closed stage and keeps everything), **Archive** (hide from the lists) and **Delete** (remove for good). `page.tsx:1831-1836, 2954-2982`, `lib/lifecycle/archival.ts:44-47`
- **D-239** Close, entry 1 — desktop ⋯ menu in the page header, drawn only for owners and admins, with "Close project" only while the stage is Active. `page.tsx:1819-1852`
- **D-240** Close, entry 2 — the phone / tablet ⋯ menu (drawn for everyone below 1024px); "Close project" and "Delete project" appear under a rule for owners and admins only. `page.tsx:1778-1818`
- **D-241** Close, entry 3 — a card "Wrap up this project" at the foot of Management › Milestones, for **every** member, while the stage is Active and no closure has been submitted. `page.tsx:2963-2981`
- **D-242** Close, entry 4 — "Resubmit" on the red rejected banner on the Overview, for everyone. `page.tsx:1950-1956`, `closure-review-banner.tsx:55-59`
- **D-243** Review: on the Overview, a banner and a summary card with Approve and Reject for owners. The owner also gets a task "Review and approve project closure". `page.tsx:1946-1992`, `lib/queries/projects.ts:885-898`
- **D-244** Delete: the ⋯ menus only (owners and admins). Archive: only as the fallback inside the delete dialog. Unarchive: the projects listing's "Archived" chip. `page.tsx:1812-1814, 1853-1865, 4771-4779`, `confirm-delete-project-dialog.tsx:83-119`, `app/(main)/projects/page.tsx:375-463`

### 4.2 Layout

- **D-245** Desktop ⋯ menu: 288px wide, no inner padding, two rows — each a title line with an icon and a grey 11px sentence under it — with a rule between; the delete row tints red on hover. `page.tsx:1837-1866`
- **D-246** "Wrap up this project" card: 24px above it, `rounded-xl`, 16px padding; text left and an outline button right from 640px up, stacked below that. `page.tsx:2964-2981`
- **D-247** Close dialog: written at 576px (`max-w-xl`), at most 85% of the viewport height, the whole dialog scrolling; a title, a "{project} — #{number}" line, then one of two steps. `closure-dialog.tsx:111-116`
- **D-248** Step 1 is a stack of check rows (bordered, `rounded-lg`; status icon, label and detail, a control on the right), then warning strips, then right-aligned buttons. `closure-dialog.tsx:119-217`
- **D-249** Step 2: a 2×2 grid of number tiles, then bordered blocks (variations and credits, refund alert, timeline, satisfaction, deferred items), a two-row notes box, and Back left / Submit right. `closure-dialog.tsx:220-345`
- **D-250** Review banner: a tinted strip (`rounded-xl`, 16/12px padding, 16px under it) — icon, a bold line and a small line; the rejected one has a button at the right end. `closure-review-banner.tsx:21-62`
- **D-251** Summary card: `rounded-xl`, 20px padding; a header (32px tinted circle with a status icon, title, date); four tiles, two per row below 1024px and four above; the blocks; and, for an owner on a pending closure, a ruled footer with the two buttons or the reject form. `closure-summary-card.tsx:42-189`
- **D-252** Delete and archive dialogs: the default dialog (512px, 24px padding) — icon and title, a paragraph, an error line when needed, two buttons. `confirm-delete-project-dialog.tsx:89-154`

### 4.3 UI elements

- **D-253** Desktop menu rows: check-square icon (green) "Close project" / "Archive after handover. Records and portal stay intact (read-only)."; bin icon (red) "Delete project" / "Permanently remove the project and its records. Cannot be undone." `page.tsx:1844-1864`
- **D-254** Wrap-up card: "Wrap up this project" / "**Close** keeps the project in your archive — quotes, invoices, finance reports, and homeowner portal access stay intact (read-only). The project moves to the **Closed** stage. Use this after handover and final payment." / "Not the same as **Delete**, which removes the project and its records permanently." Button "Close Project". `page.tsx:2966-2980`
- **D-255** Close dialog: title "Close Project"; step 1 intro "Review the checklist below. All items must pass or be deferred before closure." `closure-dialog.tsx:114-123`
- **D-256** Check row icons: green check-circle (passed), yellow clock (deferred), red ×-circle (failed). A deferred row adds a yellow "Deferred" badge and an italic "Reason: {text}". `closure-dialog.tsx:140-164`
- **D-257** "Defer" is a small outline button on a failed, deferrable row; pressing it swaps in a 144px input "Reason..." and a small check button. `closure-dialog.tsx:167-193`
- **D-258** Check 1 "All milestones completed" — fails with "{n} milestone(s) not complete: {names}"; cannot be deferred. `lib/project-closure.ts:35-48`
- **D-259** Check 2 "All invoices have recorded payments" — fails with "{n} invoice(s) outstanding: {numbers}"; deferrable. `lib/project-closure.ts:50-62`
- **D-260** Check 3 "All POs have recorded payouts" — fails with "{n} PO(s) with outstanding payments"; deferrable. `lib/project-closure.ts:64-75`
- **D-261** Check 4 "No unresolved escalations" — fails with "{n} open escalation(s)"; deferrable. `lib/project-closure.ts:77-89`
- **D-262** Check 5, one of three: "Contract reconciled (billed = contract)" (passed); "Contract fully billed" with "Under-billed by ${x}. Bill a final invoice for the remaining work — or, if the scope was reduced, record an omission VO so the contract matches what was delivered." (not deferrable); "No over-collection (refund due)" with "Over-billed by ${x} — refund due. Issue a credit note against the relevant invoice to reconcile (or defer if you've refunded separately)." (deferrable). `lib/project-closure.ts:97-135`
- **D-263** Warning strip (yellow, triangle icon): "Actual margin differs from expected by more than 25%. Ensure all POs and expenses are recorded." `lib/project-closure.ts:141-154`, `closure-dialog.tsx:199-208`
- **D-264** Step 1 buttons: "Cancel" and "Review Summary →" (disabled until every check passes or is deferred and the contract value has loaded). `closure-dialog.tsx:62, 210-215`
- **D-265** Step 2 tiles: "Contract Value", "Collected", "Total Costs", "Gross Margin" — the margin tile green at 20% or more, red below. `closure-dialog.tsx:223-240`
- **D-266** Step 2 blocks: "Variations ({n})" with a signed amount; "Credits issued" −amount in green; a red alert "Refund due: {amount}" / "Collected exceeds the final contract value. Issue a credit note or refund the difference before closing so the books reconcile."; "Timeline" — "{n} days planned · {n} days actual (+{n} days)" and "{n} milestone(s) delayed · {n} had no baseline (delay unverifiable)"; "Client Satisfaction" stars and quote; "Deferred Items" bullets. `closure-dialog.tsx:244-326`
- **D-267** Step 2 notes box "Additional closure notes (optional)"; buttons "Back" and "Submit for Owner Review" (a spinner while sending). `closure-dialog.tsx:329-343`
- **D-268** Pending banner (yellow, triangle): for an owner "Project closure pending your review" / "Review the summary below and approve or reject."; for others "Closure submitted — awaiting approval" / "The studio owner will review and approve the closure." `closure-review-banner.tsx:21-37`
- **D-269** Rejected banner (red, ×-circle): "Closure rejected", "Reason: {comment}", button "Resubmit". `closure-review-banner.tsx:40-62`
- **D-270** Summary card headers: "Project Closed" (green check), "Closure Pending Review" (yellow clock), "Closure Rejected" (red ×); under each a date such as "5 October 2026". `closure-summary-card.tsx:25-52`
- **D-271** Summary card tiles: "Contract Value", "Collected", "Costs", "Margin" (percent with the amount under it; green at 20%+, red below); then "Timeline" — "{n} days (+{n}d vs plan)"; "Client Satisfaction" with stars and "{n}/5"; "{n} deferred item(s)" with each "{what} — {reason}". `closure-summary-card.tsx:55-136`
- **D-272** Owner's review footer: "Reject" (outline, ×-circle) and "Approve closure" (green, check-circle). Reject swaps in "Why are you rejecting this closure?", a three-row box "Required — the submitter needs to know what to fix.", "Cancel" and a red "Send rejection". `closure-summary-card.tsx:142-187`
- **D-273** Delete dialog: warning triangle + "Delete project?"; "This will permanently delete **{name}**, its milestones, quote data, and files. Conversations, tasks, and escalations linked to it will be kept but unlinked. This action cannot be undone."; "Cancel" and a red "Delete" ("Deleting…"). `confirm-delete-project-dialog.tsx:122-153`
- **D-274** Archive offer: archive-box icon + "Archive instead?"; "**{name}** has financial activity ({counts}) and can't be permanently deleted. Archiving hides it from the active projects list — you can unarchive it later."; "Cancel" and "Archive project" ("Archiving…"). `confirm-delete-project-dialog.tsx:83-118`
- **D-275** Listing: an "Archived" chip with an archive-box icon and a count, dark when on; it swaps the list for a card "Archived projects" whose rows show the name (a link), "{client} · archived {date}" and an outline "Unarchive" button. `app/(main)/projects/page.tsx:375-390, 413-462`

### 4.4 Interactions

- **D-276** Any close entry opens the same dialog on step 1, with the checks computed from the page's current invoices, credit notes, POs, variations and escalations. `page.tsx:4782-4798`
- **D-277** Defer: press Defer, type a reason, press Enter or the check button; an empty reason is ignored. A deferral cannot be removed except by closing the dialog. `closure-dialog.tsx:72-76, 168-193`
- **D-278** "Review Summary" moves to step 2; "Back" returns with deferrals kept. `closure-dialog.tsx:212, 338`
- **D-279** "Submit for Owner Review" saves the summary and deferrals, sets the status to pending, raises the owner's task, toasts "Closure submitted for review" and closes. A failure toasts "Failed to submit closure". `closure-dialog.tsx:78-97`, `lib/queries/projects.ts:831-912`
- **D-280** Cancel, ×, Esc or a press outside closes the dialog and clears the step, the deferrals and the notes without asking. `closure-dialog.tsx:99-105, 111`
- **D-281** "Approve closure" asks with the browser's own confirm box — "Approve this closure? The project will move to the Closed stage." — then toasts "Closure approved" (or the error, or "Failed to approve"). `page.tsx:1975-1983`
- **D-282** "Send rejection" needs a reason, then toasts "Closure rejected — submitter has been notified" and folds the form away. `closure-summary-card.tsx:158-170`, `page.tsx:1984-1991`
- **D-283** "Resubmit" opens the close dialog again. `page.tsx:1955`
- **D-284** "Delete" tries the delete. If the server finds financial records the dialog turns into the archive offer; otherwise the dialog closes and the app goes to `/projects`. No toast either way. `confirm-delete-project-dialog.tsx:41-58`
- **D-285** "Archive project" archives, closes the dialog and goes to `/projects`, with no toast. `confirm-delete-project-dialog.tsx:60-72`
- **D-286** "Unarchive" acts at once — no confirmation, no toast; the row leaves the list when the lists refresh. While one unarchive runs, every row's button is disabled. `app/(main)/projects/page.tsx:449-457`, `lib/queries/projects.ts:1045-1059`
- **D-287** Nothing here is optimistic and nothing can be undone from a toast.

### 4.5 States

- **D-288** Close dialog while the contract value loads: a grey strip with a pulsing clock, "Checking contract reconciliation…", and Review Summary stays disabled. If that read fails: a red strip "Couldn't load the contract reconciliation. Retry before closing." — with no retry control. `closure-dialog.tsx:124-133`
- **D-289** After submission: the wrap-up card is gone; the Overview leads with the yellow banner and the "Closure Pending Review" card. Non-owners see no buttons on it. `page.tsx:1950-1992, 2963`
- **D-290** After rejection: the red banner with the reason and Resubmit, and the card titled "Closure Rejected" with no buttons. `page.tsx:1969-1992`, `closure-review-banner.tsx:40-62`
- **D-291** After approval: stage Closed; the Overview leads with the green "Project Closed" card and no banner. `page.tsx:1967-1968`
- **D-292** Delete and archive errors show as one line of text in the dialog ("Delete failed", "Archive failed", "Owner or admin role required", or the server's message). `confirm-delete-project-dialog.tsx:53-54, 67-68, 103, 136`
- **D-293** Archived list: two skeleton bars while loading; "No archived projects." when empty. `app/(main)/projects/page.tsx:422-430`
- **D-294** An archived project's own page looks like any other: nothing on it says archived and it has no Unarchive. `page.tsx` (no use of `archivedAt`), `app/api/projects/records/[id]/route.ts` (no archive filter)

### 4.6 Motion

- **D-295** Dialogs: fade + zoom from 95%, 200ms (D-65). The ⋯ menu: fade + zoom + an 8px slide (D-152).
- **D-296** The loading clock pulses (`animate-pulse`); the submit spinner spins (`animate-spin`). `closure-dialog.tsx:126, 340`
- **D-297** The step change, the defer input, the reject form and the banner's arrival have no transition; the Overview's cards arrive with the tab's `animate-tab-enter`. `page.tsx:1941`
- **D-298** Listing chips: colour, border, shadow and scale over 200ms, shrinking to 95% while pressed. `app/(main)/projects/page.tsx:377-381`

### 4.7 Rules and logic

- **D-299** Closure status values: empty (never submitted) · `pending_review` · `approved` · `rejected`, enforced by a database check. `supabase/migrations/20260503000016_closure_summary.sql:5-6`, `types/app.ts:328`
- **D-300** Submit writes the summary, the deferred items, `pending_review`, who submitted and when. It then looks up one owner and creates a task "Review and approve project closure" (type Project Closure, due today) for them. `app/api/projects/records/[id]/closure/route.ts:52-69`, `lib/queries/projects.ts:844-904`, `app/api/identity/members/owner/route.ts:25-35`
- **D-301** Approve writes stage `Closed`, `closed_at`, status `approved`, who approved and when; records the usage event `project_closed`; and, when commission applies and the project has no commission rule and no open commission task, raises "Set commission for {project}" for every owner. `app/api/projects/records/[id]/closure/route.ts:71-165`
- **D-302** Reject writes `rejected` and the reason, and raises a general task "Project closure rejected: {project}" for the submitter. That task is the only "notification". `app/api/projects/records/[id]/closure/route.ts:167-196`, `lib/queries/projects.ts:967-990`
- **D-303** Who may do what, on screen: submit — owners and admins from the menus, everyone from the wrap-up card and Resubmit; approve and reject — owners only (admins see the non-owner banner). `page.tsx:655-657, 1804-1811, 1975-1991, 2963`
- **D-304** Who may do what, on the server: the closure route checks only that the caller is signed in to the studio — no role, no check that the project is Active, no check that a closure is pending before approving. `app/api/projects/records/[id]/closure/route.ts:41-71`
- **D-305** Check rules: milestones pass when each is `completed` or `pending-approval`; invoices when each is `paid` or `void`; POs (not cancelled or closed) when paid in full; escalations when each is `resolved` or `closed`; billing when invoices less issued credit notes equal the contract value within 100 cents — the last check runs only when a contract value exists. `lib/project-closure.ts:36-39, 51-53, 65-66, 78-80, 97-108`
- **D-306** The margin warning compares the expected margin (budget less budget used) with the actual (contract less non-cancelled POs) and fires beyond 25 points. `lib/project-closure.ts:141-154`
- **D-307** Summary maths: contract value from the finance summary (else the budget); collected = payments received; costs = non-cancelled POs + approved expenses; margin = contract − costs; planned days = start → the last milestone's end; actual days = start → today; variance = actual − planned; variations = approved client VOs; over-collection = collected − contract when positive. `lib/project-closure-summary.ts:27-92`
- **D-308** What closing locks: the Gantt and the phone milestone list become read-only on a Closed project. Everything else is locked only by the handover lock (D-87) — when that studio feature is off, a Closed project's finance, updates, files and tasks stay editable. `page.tsx:2630, 2772, 809-813`
- **D-309** Reopen: none. No control moves a Closed project back, and nothing writes `handover_locked_at`. The general project-update route does accept `stage` and `closed_at`. `page.tsx` (no reopen), `app/api/projects/records/[id]/route.ts:88-94`
- **D-310** Delete, on the server: the project must be the caller's studio's; the caller must be owner or admin ("Owner or admin role required"); then ten tables are counted for the project — invoices, purchase orders, variation orders, expenses, commission entries, commission rules, finance documents, journal lines, commission change requests, client portal tokens. Any row at all → refused with the counts. `app/api/projects/[id]/delete/route.ts:6-88`
- **D-311** What a delete removes: the project row, and by database cascade its milestones, quotes, files, rooms, progress updates and homeowner links; conversations, escalations, tasks, floor plans and render jobs are kept with their project link cleared. `app/api/projects/[id]/delete/route.ts:90-97`, `scripts/migrations/099_projects_archived_at.sql:3-8`
- **D-312** Archive, on the server: owner or admin; stamps `archived_at`; then cancels the project's open tasks (not started, in progress) and drops their queued reminders. Projects are "hide-only": invoices, payments, receipts and the homeowner portal keep working. `app/api/projects/[id]/archive/route.ts:41-67`, `lib/lifecycle/transitions.ts:114-170, 307-333`, `lib/lifecycle/archival.ts:20-27, 44-47`
- **D-313** Unarchive: owner or admin; clears `archived_at`; the cancelled tasks are not brought back. `app/api/projects/[id]/unarchive/route.ts:29-55`, `lib/lifecycle/transitions.ts:335-357`
- **D-314** Archived projects are left out of the normal projects read and returned alone by the Archived read. Archive is independent of stage and closure — an Active project can be archived. `app/api/projects/records/route.ts:66-82`
- **D-315** Retention: none. A delete is immediate and final; there is no trash, no grace period and no purge of archived projects.

### 4.8 Data

- **D-316** On `projects`: `stage`, `closed_at`, `closure_summary` (JSON), `closure_deferred_items` (JSON), `closure_status`, `closure_submitted_by` / `_at`, `closure_approved_by` / `_at`, `closure_rejection_comment`, `archived_at` (with an index on live rows), `handover_locked_at`. `supabase/migrations/20260503000016_closure_summary.sql`, `scripts/migrations/099_projects_archived_at.sql:13-16`
- **D-317** The saved summary: contract value, collected, credit notes issued, costs, gross margin (amount and percent), over-collection, commission fields, planned / actual / variance days, satisfaction rating and comment, variation count and net, delayed milestones, milestones without a baseline, deferred items, closure notes, generated-at. `types/app.ts:338-371`
- **D-318** Routes: `PATCH /api/projects/records/[id]/closure` (`submit · approve · reject`), `POST /api/projects/[id]/delete`, `POST /api/projects/[id]/archive`, `POST /api/projects/[id]/unarchive`, `GET /api/identity/members/owner`, `POST /api/tasks/records`.

### 4.9 Responsive

- **D-319** Below 1024px every header action folds into one ⋯ menu, which is where Close and Delete live; the desktop ⋯ is hidden. `page.tsx:1778-1788, 1819-1826`
- **D-320** The wrap-up card stacks below 640px. The summary card's tiles are two per row below 1024px. The close dialog's 2×2 tiles and its inline defer input (a 144px box beside the row's text) do not change with width. `page.tsx:2964`, `closure-summary-card.tsx:56`, `closure-dialog.tsx:170-182, 223`

### 4.10 Problems

- **D-321** Roles are screen-only (D-304): any member can call approve; approve works with nothing submitted, leaving a Closed project with no summary card.
- **D-322** The wrap-up card and Resubmit let any member submit, while the menus restrict Close to owners and admins (D-303).
- **D-323** No second person: an owner who submits can approve their own closure in the next breath. The feature guide promises "A second person signs off". `page.tsx:1975`, `docs/demo/project-finance-feature-guide.md:189`
- **D-324** Admins can submit and delete but cannot approve; the banner tells them "The studio owner will review". `page.tsx:655-657, 1954`
- **D-325** "Close project" stays in the ⋯ menus while a closure is pending or rejected (it checks the stage only). A second submit overwrites the first summary and raises another owner task. `page.tsx:1807-1811, 1838-1852`
- **D-326** The owner's task "Review and approve project closure" is not an approval task in `/tasks` (the type is not in its approval list) and nothing completes it when the closure is approved or rejected on the project. `app/(main)/tasks/page.tsx:38`, `app/api/projects/records/[id]/closure/route.ts:71-196`, `context/app-context.tsx:296-301`
- **D-327** If the owner lookup or the task creation fails after the closure is saved, the dialog toasts "Failed to submit closure" although the project is already pending review. `lib/queries/projects.ts:853-904`, `closure-dialog.tsx:91-93`
- **D-328** "Closure rejected — submitter has been notified": the only notice is a general task with the project's name; it carries no reason and no link to the reason. `lib/queries/projects.ts:976-984`
- **D-329** The closure notes are saved inside the summary and shown nowhere afterwards. `closure-dialog.tsx:85-88`, `closure-summary-card.tsx` (no use of `closureNotes`)
- **D-330** The reviewing owner sees less than the submitter did: the card omits variations, credits issued, the refund-due alert, delayed milestones and the notes. `closure-summary-card.tsx:55-136`, `closure-dialog.tsx:244-299`
- **D-331** The date under "Project Closed" is when the summary was generated (submission), fixed to the `en-SG` locale; "actual days" also stops at submission. `closure-summary-card.tsx:49-51`, `lib/project-closure-summary.ts:54, 117`
- **D-332** The commission block on the card can never show: the amount is always left undefined. `lib/project-closure-summary.ts:102-106`, `closure-summary-card.tsx:77`
- **D-333** A rejection stamps the rejector into `closure_approved_by` / `closure_approved_at`. `app/api/projects/records/[id]/closure/route.ts:170-175`
- **D-334** A project with any unfinished milestone can never be closed — that check cannot be deferred — and the dialog offers no way to the fix for any failed check (no link to the milestone, invoice, PO, escalation or the variance wizard). The variance dialog is not used by closure at all. `lib/project-closure.ts:47`, `closure-dialog.tsx:135-196`, `page.tsx:3994-4006`
- **D-335** Check wording against rule: "All invoices have recorded payments" fails a part-paid invoice; "All milestones completed" passes one still awaiting approval; "Planned days" trusts the last milestone in list order, not the latest end date. `lib/project-closure.ts:36-39, 51-53`, `lib/project-closure-summary.ts:55-57`
- **D-336** The under- and over-billed sentences print a bare "$" whatever the project's currency. The margin warning ignores expenses while the margin tile includes them. `lib/project-closure.ts:107, 142-145`, `lib/project-closure-summary.ts:39-43`
- **D-337** The margin tile is only ever green or red, with the line at exactly 20%. `closure-dialog.tsx:236`, `closure-summary-card.tsx:35, 69`
- **D-338** A deferral cannot be undone; closing the dialog throws away typed reasons and notes with no warning (D-280).
- **D-339** After a successful submit the dialog closes without clearing itself, so reopening it in the same visit (Resubmit) starts on step 2 with the old deferrals. Resubmit otherwise starts blank — the earlier reasons are not brought back. **[inferred]** `closure-dialog.tsx:88-90, 99-105`
- **D-340** The approval uses the browser's confirm box; the "Couldn't load…" strip says "Retry" with nothing to press.  `page.tsx:1976`, `closure-dialog.tsx:129-132`
- **D-341** Words collide: the Close menu row says "Archive after handover" and the wrap-up card "keeps the project in your archive", while Archive is a different action with a different result. Both also say "(read-only)", which is true only with the handover lock on (D-308). `page.tsx:1849, 2968`
- **D-342** Label drift between the two summaries: "Total Costs" / "Costs", "Gross Margin" / "Margin", "Close Project" / "Close project". `closure-dialog.tsx:233, 237`, `closure-summary-card.tsx:66, 70`, `page.tsx:1809, 2979`
- **D-343** The delete dialog's colours are tokens that do not exist (`text-tertiary-red-default`, `text-tertiary-yellow-default`), so its warning icon, archive icon and error line take the default text colour. `confirm-delete-project-dialog.tsx:94, 103, 126, 136`, `app/globals.css` (no such token)
- **D-344** The archive offer prints raw table names and never singular forms: "1 purchase orders, 2 client portal tokens, 3 journal lines". `confirm-delete-project-dialog.tsx:84-87`
- **D-345** The delete dialog says tasks "will be kept but unlinked"; a clean delete can still carry the project's updates, milestones, files and homeowner links away with no export, and the stored files themselves are not removed by this route. **[inferred]** on storage — the route deletes the database row only. `app/api/projects/[id]/delete/route.ts:93-97`
- **D-346** There is no direct Archive: a project without financial records can only be deleted, one with them can only be archived. Archiving writes no record of who did it and leaves no Activity line. `lib/lifecycle/transitions.ts:297-299`
- **D-347** The listing's Unarchive button is drawn for every member; a designer's press is refused by the server and nothing is shown. **[inferred]** — the mutation has no error handler. `app/(main)/projects/page.tsx:449-457`, `app/api/projects/[id]/unarchive/route.ts:36-41`
- **D-348** Delete and archive give no toast; the user lands on the list with no word of what happened (D-284, D-285).

---

## 5. Where the docs and the code disagree

- **D-349** `docs/rules/projects.md:24` lists the tabs as "Details / Management / Files / Finance". The page has Overview · Management · Finance (only when finance is enabled) · Files & Docs · Activity. `page.tsx:1876-1882`
- **D-350** `docs/rules/projects.md:26, 93-96` says "Progress Updates + Chat Highlights widgets remain". Chat Highlights is unmounted; Meeting Summary took its place, and the rules doc does not mention Meeting Summary or the Activity card and tab at all. `page.tsx:2505`
- **D-351** `docs/rules/projects.md:40` says "Audio milestone completion: `AudioUploadDialog` integrated into the completion flow". It is mounted only on the Meeting Summary card and the co-pilot landing page.
- **D-352** `docs/rules/projects.md:29` files the closure flow under the Finance tab. It starts from the ⋯ menus and Management › Milestones and is reviewed on the Overview.
- **D-353** `docs/rules/projects.md:35` describes a green signature banner for signed quotes; the page shows the banner only while a signature is pending or viewed. `page.tsx:1897-1923`
- **D-354** `docs/rules/projects.md:86-89` matches the review gate's server logic, but describes only "a muted Pending review chip"; the inline Approve / Reject, Unpublish and the `draft` status are not in the docs.
- **D-355** `docs/features/projects-overhaul/backend-dependencies.md:24, 121-125, 150` describes the activity feed as seven parallel browser queries with "New API routes: Not needed"; it is now twelve sources behind `GET /api/project-aggregates/activity-feed`. It also names `progress_updates.created_by` (`:115`); the column is `author_user_id`.
- **D-356** `docs/prd/09-projects.md:51, 67` states the intent in one line each — "hybrid delete (hard-delete + archive)" and "Run the closure flow, clone a project, or archive instead of hard-deleting" — with no rules for who closes, who approves, what locks or how to reopen.
- **D-357** `docs/demo/project-finance-feature-guide.md:172-193` says the checklist covers "Unresolved VOs" (there is no VO check; there are milestone and escalation checks it does not list), that "a second person signs off" (D-323) and that "the project goes read-only" (D-308).

---

## Uncertain / not verified

- Nothing was run; every state and message above is read from code. Layout sizes come from Tailwind classes, not measurements.
- Whether the legacy `projects.progress_updates` JSON column holds data in any real studio (D-96, D-121).
- Whether `useApp().tasks` contains tasks assigned to other people. If it does not, a second owner's Approve takes the direct path and leaves the first owner's review task open (D-50).
- The exact foreign-key rules behind a delete (D-311): taken from the route's and migration 099's comments, not from each table's definition; storage buckets were not checked.
- Whether a database trigger or an admin tool sets `handover_locked_at`; no code in `src` writes it (D-309).
- Whether any plan or billing layer outside this branch meters the co-pilot; no credit code exists in `src` at this commit (D-162).
- How Radix stacks the photo viewer against the "View all" sheet in practice (D-118), and whether the upload dialog really reopens on its done panel (D-174).
- The request-size ceiling a base64 photo post would hit in production (D-102).
- The Gantt's own handling of the lock before it opens the Post Update dialog; only the mount was read (D-107).
- The homeowner portal's full updates view, the co-pilot's live session and the `/tasks` approval screens were read only as far as these four surfaces need.
