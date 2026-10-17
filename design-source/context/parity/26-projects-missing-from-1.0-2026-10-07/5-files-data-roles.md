# Reviewer 5 — Files & Docs, renders, data, roles, notifications and touchpoints (1.0 → 2.0, 2026-10-07)

Inventories: `projects-1.0-inventory/H-files-docs-renders.md` (H-01…H-273, 273 rows) and `J-data-api-roles-touchpoints.md`
(J-01…J-135, J-151…J-166, J-169…J-241, J-251…J-330 — 304 rows; the gaps in J's numbering are the file's own). Every row id is in
exactly one line of the table below. 2.0 = the working tree of `openmaison-prototype` (uncommitted changes included). Read only; nothing
was run.

## Bottom line

2.0 has nearly all of this area, and most of it works better than 1.0. A project's Files are the lead's own Files. Folders are saved
and can be nested. Deletes go to a Trash with Restore. There are search, filters, select-many, move, duplicate, comments and a
signed read-only link for the client. *Show to client* is checked on the server by the portal. Key documents sits on the Overview,
and the AI Visualizer opens from the project and comes back to it. Feedback on shared renders (favourites, notes with replies,
pins, resolve) now rings the studio's bell. 1.0's file approval was dead code and is not missed. Roles are checked on the server,
where 1.0 checked them only in the browser.

**The biggest gap is the Files tab itself.** It keeps the real file only for pictures. A PDF, Word, Excel or CAD file uploaded to
Files keeps no bytes, and Download on it says "Coming soon". A spreadsheet is even stored as a JPEG with a stand-in photo. A client
who opens a shared PDF in the portal gets a glyph. Updates, on the other hand, already keep any file's bytes.

**Studio emails and WhatsApp messages are recorded but never sent.** This is a known stand-in: map §6 leaves it to the developers.

**Smaller real gaps:**
- A task cannot be given to a subcontractor (name and phone) or to the client, so the portal has no to-dos for the client.
- An Owner cannot approve a Designer's request to extend a milestone, and the alert lead time is a fixed 3 days, not a setting.
- A milestone's panel does not list its invoices.
- The file viewer has no arrow keys or thumbnail strip.
- There is no starter folder set, and the Tasks hub cannot group by project.

**Left out on purpose (later):** money out and the books, commission, floor plans, chat and tickets, the Dashboard, the daily
digest and recipients per event, the Accounting role, custom roles, AI-written plans and other countries. The selection-receipt
PDF was replaced by an Activity card (REG-977). Temp mode, filing every render automatically and Send to Chat follow the Visualizer
audit's calls.

## Features

Status counts (lines · rows): **Missing** 1 · 1 — **Partly** 12 · 30 — **Left out on purpose** 20 · 61 — **Built** 42 · 306 —
**Not a product feature** 13 · 179. Total 88 lines · 577 rows (every id once; checked by script).

| Feature (plain words) | 1.0 rows | Status | What 2.0 lacks (or the call) | Impact | Size | 2.0 evidence |
|---|---|---|---|---|---|---|
| Keep and download any file a studio uploads: PDF, Word, Excel, CAD, video. Each file shows its real type | H-22, H-24, H-41, H-76 | Partly | Pictures keep their bytes (up to the 12 MB request cap) and download under their own name. Any other upload keeps **no bytes**. A PDF is stored as `kind: 'pdf'` with a glyph. Word, Excel or CAD is stored as `kind: 'image'` and `mime: 'image/jpeg'`, with the stand-in thumbnail and a made-up 711 KB, so the list says "JPEG". Download on any non-picture says "Coming soon" in the list and the viewer, unless an Update kept its bytes. A client opening a shared PDF in the portal gets the PDF glyph (`serveLeadFile` stand-in). Updates already keep any file's bytes (`uploadUpdateFile`), so the Files tab is behind its own product. Map §6 says object storage replaces the stand-in | High | M | `app/leads/files-actions.ts:78-90` (`uploadFile`: pdf or image only), `components/leads/files/lead-files.tsx:225-230`, `file-viewer.tsx:114-128`, `lib/portal/files.ts` (`serveLeadFile`), cf. `app/projects/updates-actions.ts:88-106` |
| The studio's own emails and WhatsApp messages for project events reach people | J-169, J-173 | Partly | The channels are designed: per event, editable messages, defaults. But email and WhatsApp are **recorded, not sent** (`emit.ts`). There is no WhatsApp template sender and no delivery sweep for derived rows (1.0: `dispatchNotification` + 360dialog templates + the 5-minute sweep). The in-app bell works. This is a known stand-in for the developers (map §6) | High | M | `lib/notifications/emit.ts`, `lib/notifications/model.ts:113-123`, `app/settings/notifications-settings.tsx`; map `24-…` §6 |
| Give a task to someone outside the studio: a subcontractor by name and phone, or the client (who then sees it as a to-do in the portal) | J-27 | Missing | `lead_tasks` has members only. No external assignee and no homeowner assignee (1.0: `external_assignee_name/phone`, `assignee_homeowner_id`, check `tasks_has_assignee`). The portal has no "your to-dos". The milestone's *Waiting on a supplier* is a wait, not a task. Map §2: "Homeowner and external assignees have no home"; §10: "a homeowner's own to-dos" not built | Medium | M | `lib/db/schema.ts:168-191` (`leadTasks`), `components/projects/schedule/milestone-panel.tsx` (waiting_on) |
| Owner-only powers and approvals: approving a Designer's request to extend a milestone; the workload view; a custom commission rate | J-155 | Partly | Built: the listing's money (Owner/Admin, Q-06) and the handover review (Q-24). **Missing:** the extension request. In 1.0 a non-owner asks for a new end date with a reason and the owner approves through a task (the Gantt's `canRequestExtension`). In 2.0 any team member moves a milestone directly, with Undo, and nothing waits for the owner. Later: the workload view (Q-08 "Workload view later, with Insights") and commission (Q-21) | Medium | M | `app/projects/schedule-actions.ts:221` (`moveMilestone`, no approval), `lib/projects/policy.ts` |
| What the client's portal can do on a project: invoices, payment proof, stage answers, choices, VO approval, renders feedback, updates, documents, issues, tasks, floor plan, rating | J-241 | Partly | Built: updates (published only), documents, Money (invoices, PayNow, *I have paid*, receipts), confirming a stage, choices, VO approval through `/confirm`, designs with feedback, the bell, the household. **Absent:** the client's own to-dos (the gap in the row above). Tickets are "later" (Q-43), floor plan is "later" (Q-19). The satisfaction rating was dead in 1.0 (I-412) | Medium | M | `lib/portal/model.ts` `PORTAL_TABS`, `lib/portal/needs.ts`, `app/portal/*` |
| Studio set-up that shapes projects: workflow rules, a handover lock switch, numbering, Proactive Alerts (alert lead time, extension-request rules), project types, timeline templates, payment schedules, legal entities, portal, material catalogue | J-43, J-229 | Partly | Built: Settings › Projects (numbers · stages and handover · update review · invoice approval and terms · payment confirmer · schedule defaults); Company › Templates › Schedules / Payments; Company › Profile entities; Company › Client portal; Company › Materials. The handover lock is always on (map §3.9), and there are no Draft gates (Q-02, Getting started instead). **Missing:** Proactive Alerts' **configurable lead time** (1–30 days, default 7, plus a review task for the owner). 2.0's `milestone_due` rings at a fixed 3 days. Its extension-request switches have nowhere to live (see the row above). Project types stay fixed (Leads Q-34). Per-workflow approver lists: Owners and Admins approve instead (Q-17, map D-14). Commission & Payouts: Q-21 | Low | S | `app/settings/projects-settings.tsx:51-81`, `lib/notifications/queries.ts:80-110` |
| A milestone's own invoices, listed in its panel with their status and a quick look | H-157…H-163 | Partly | The milestone panel can tie a payment stage ("A payment falls due here"), and the Schedule names the next payment and its state ("overdue", "Paid in full"). But the panel lists **no invoices** and opens none (1.0: "Related files", each invoice with a status badge, opening a read-only Invoice Quick View). Neither product attaches a drawing or a photo to a milestone; 2.0 ties Updates to one | Low | S | `components/projects/schedule/milestone-panel.tsx:276-290`, `lib/projects/schedule-model.ts:408-435` |
| What a project's record keeps beyond the lead: scope (rooms), notes, the closing summary (money, days, VO count, deferred items), satisfaction, commission settings, country | J-14, J-44 | Partly | Name, number, type, dates, agreed value, quote, contract, stage and the ending are kept (client and property on the lead). **No home:** the scope's room list. **Notes on a direct project** (a Won project's notes are on its lead, one link away; a direct project's lead page redirects to the project, which has no Notes). A **frozen closing summary**: 2.0 keeps "Took n days", plan against actual and the complete reason (the deferred items) but no stored money snapshot. Commission: Q-21. Country: Leads DEF-30. Satisfaction was never written in 1.0 (I-412) | Low | S | `lib/projects/model.ts`, `lib/projects/handover-model.ts`, `components/projects/project-overview.tsx:207`; map §3.1, §8 D-13 |
| Step through files with ← / → and a thumbnail strip | H-138, H-142, H-146, H-152 | Partly | The viewer has Previous / Next buttons at the edges, zoom, PDF and video. It has **no ← / → keys and no thumbnail strip** (1.0's lightbox had both, plus Esc and backdrop-close) | Low | S | `components/leads/files/file-viewer.tsx:206-242` |
| A starter set of folders on every project (1.0: Contract/VO · Floor Plans · Renders · Quotes & BOQ · Site Photos · Variation Orders · From Qanvast) | H-14, H-15, H-98 | Partly | Folders are the studio's own and are saved. A project makes only its system folders (Payments · Site updates · Choices, plus Renders on the first Save to Files). There is **no ready-made set** to sort into. (In 1.0 these filled only by hand, H-98) | Low | S | `lib/leads/file-model.ts:26-30` (`SYSTEM_FOLDERS`) |
| The Tasks page's project view: All · Leads · Projects, grouped by project with "Go to project" | J-216 | Partly | The Tasks hub names each task's project and has a **Project** filter pane. It has **no grouping by project** (REG-466: view-by bands not built) and no Leads / Projects source switch | Low | S | `lib/leads/tasks.ts:16-17`, `:43-44`, `:112-117` |
| Make a variation order from a contractor's paper (1.0: the Quote Digitizer's project picker) | J-226 | Partly | A variation order is made in the quote editor (`createVariationOrder`). It **cannot be uploaded or digitised**: Upload a quote makes quotes only | Low | S | `app/projects/money-actions.ts:78`, `lib/quotes/upload.ts` |
| Ask the assistant to list, create or update projects, draft a plan, read a project's money, raise milestone invoices, create tasks (1.0's mAIson bot and its role rule) | J-159, J-228 | Partly | Maison AI on project pages offers **scripted suggestions** only and acts on nothing. AI-written plans are held (Q-12). The same is true in every 2.0 module | Low | L | `components/projects/project-frame.tsx:122` (`useMaisonAi`) |
| Selection receipts: a PDF "decision receipt" per answered choice, for the studio and the client | H-164…H-170, J-104 | Left out on purpose | **REG-977** replaced the PDF: "the client's pick … files a small summary card under its line … (1.0 filed a PDF 'Selection Receipt', H-164)". The client keeps the pick on the Choices tab but has no downloadable receipt | — | — | `lib/leads/activity.ts:65-67` (`ActivityEvent.card`), `components/portal/choices/*` |
| Temp mode in the Visualizer ("Save to project" off) | H-219, H-248, H-270 | Left out on purpose | AI Visualizer **Q-10**: "Not built — a personal design is the scratch space." | — | — | audit `16-…` Q-10 |
| Every render filed into the project's Files automatically | H-94, H-224 | Left out on purpose | AI Visualizer **Q-13**: "*Save to Files* on a version → the lead's Files › Renders (made on first save); a share saves what the client saw" | — | — | `app/visualizer/actions.ts:660` (`saveVersionToFiles`) |
| Send a render to the project's chat | H-229, H-269 | Left out on purpose (later) | AI Visualizer **Q-14**: "no chat (2.0 has no chat)"; Projects **Q-43**: "tickets and chat later" | — | — | — |
| Floor plans on a project: upload, mark-up, ask the client for theirs, approvals, notifications, the Floor Plan tool's project filter, importing a plan from Files | H-91, J-36, J-113…J-117, J-184, J-224 | Left out on purpose (later) | **Q-19**: "Floor-plan mark-up and the 3D planner later, own modules" | — | — | — |
| Money out and the books: POs, goods received, bills, expenses, vendors, finance documents, journal, accounting sync, the material lifecycle, credit notes, the Finance rail pages and reports | J-33, J-57, J-108, J-221, J-222 | Left out on purpose (later) | **Q-34 · Q-35**: "money out and the books later"; **F-19** "A studio-wide money list: Not yet (with money out)"; **F-09** "No credit notes in this build". Invoices, payments, receipts and VOs of J-57 are built (see the Money-in row below) | — | — | map `24-…` §10 |
| Commission (payout, splits, change requests, "Set commission" tasks, `commission.paid`) | J-189 | Left out on purpose (later) | **Q-21**: "Commission held for money out" | — | — | — |
| Archive and unarchive a project | J-11, J-82, J-83 | Left out on purpose | **Q-25**: "No Archive; the listing hides Completed until asked" | — | — | `components/projects/scopes.ts:11-15` |
| An ad-hoc or VO-backed invoice outside the payment schedule | J-110 | Left out on purpose | **F-04**: invoices are "One per payment stage"; a VO's approval re-sizes the unsent drafts (F-07 · F-08); map D-5 | — | — | `lib/projects/invoices.ts` |
| Chat on a project, tickets / escalations (and their notifications and replies) | J-188, J-198, J-218, J-219 | Left out on purpose (later) | **Q-43**: "'Message your designer on WhatsApp'; tickets and chat later" | — | — | — |
| Co-Pilot sessions, meeting briefs and Co-Pilot renders / moodboards on a project; compliance checklists | H-95, J-227, J-231 | Left out on purpose (hold) | **Q-31**: "Meeting Summary and compliance held" | — | — | — |
| AI-written project plans and milestone task lists | J-26, J-120, J-121 | Left out on purpose (hold) | **Q-12**: "AI-written timelines held"; **Q-30**: "No metered press in Projects" | — | — | — |
| Dashboard widgets: project counts, recent updates feed, margin and compliance alerts, the "Site Update" chip | J-201, J-202, J-203, J-204, J-206 | Left out on purpose (later) | Audit 22 §6, the joint order: "Then: … Meetings, the Dashboard". Build record: "Not built (later modules): … the Dashboard" | — | — | — |
| Custom roles with their own page / action permissions (`studio_roles`) | J-151 | Left out on purpose (hold) | Leads **Q-40**: "Custom roles / a permissions editor? Hold." | — | — | `lib/settings/permissions.ts` (fixed roles) |
| An Accounting role (verifies payments, approves milestone-completion steps) | J-156 | Left out on purpose (hold) | **F-16**: "Held; Owners and Admins run money". The payment confirmer is a setting (Q-48) | — | — | `app/settings/projects-settings.tsx` (Payments) |
| A studio's own project types (and milestone / payout templates per type) | J-40, J-130 | Left out on purpose | Leads **Q-34**: "Project type stays the Won step's three (Whole-home · Partial · Commercial fit-out)? Yes". Timelines → Company › Templates › Schedules | — | — | `lib/projects/model.ts:19` |
| Choose who hears each event (recipients by role) and a daily email digest | J-56, J-170 | Left out on purpose (hold) | Leads **Q-42**: "A daily digest option … Hold."; **Q-43**: "Recipients editable per event … Hold." Editable messages are built | — | — | `app/settings/notifications-settings.tsx` |
| Automatic email / SMS to the client (1.0 emailed the homeowner on a timeline publish; the studio heard "Timeline published") | J-176 | Left out on purpose (later) | **Q-41**: "A WhatsApp message the studio sends in one press + the portal's bell; automatic SMS / email later". The client's bell has *schedule shared*. The studio's own bell has no "schedule shared" row (its Activity does) | — | — | `lib/portal/notifications-model.ts:75` |
| The old token pay page `/pay/[token]` (`client_portal_tokens`) | J-54 | Left out on purpose | **Q-37**: the portal replaces the single client link; map **D-11**: "Redirect each to the studio's portal sign-in" | — | — | `app/my/[slug]/money` |
| Other countries: currency, tax, phone rules, compliance by country, a project's country lock, Arabic | J-15, J-238, J-239, J-240 | Left out on purpose | Leads **DEF-30**: "Platform. Not ported (one Singapore studio)". Projects is English-only in both products | — | — | — |
| The project's Files tab is the lead's own Files (no folder-guessing merge) | H-01…H-05, H-75 | Built | — | — | — | `app/projects/[id]/[tab]/page.tsx:72`, `components/leads/files/lead-files.tsx:73` (`base`), `lib/projects/tabs.ts` |
| Folders you make: create, rename, move, delete, nested, saved, unique names, crumbs, on a phone too | H-16, H-18, H-34, H-36, H-37, H-47, H-48, H-49, H-107, H-113, H-114 | Built | — | — | — | `app/leads/files-actions.ts:63` (`createFolder`, `folderNameProblem`), `components/om/folders/move-dialog.tsx` |
| List and grid views; Owner · Updated · File type · File size · Attached to · Client columns; column settings; phone cards and sheets | H-19, H-25, H-26, H-28, H-29, H-105, H-106, H-108, H-109, H-110, H-112, H-116, H-117, H-127 | Built | 2.0 shows the real owner and updated time (1.0 showed "—" and the upload time) | — | — | `components/leads/files/files-table.tsx:44-50`, `files-grid.tsx` |
| Upload several files by button or drop (files only), into the open folder, a toast row each with Retry | H-20, H-32, H-39, H-40, H-56, H-124, H-125, H-126 | Built | — | — | — | `components/leads/files/lead-files.tsx:162-214`, `upload-toast.tsx` |
| Open a file: picture / PDF / video, zoom, Previous / Next, comments, information, Download, kebab | H-13, H-33, H-38, H-50, H-52, H-57, H-111 | Built | Arrow keys are in the Partly row above | — | — | `components/leads/files/file-viewer.tsx` |
| Search across folders, filters (Type · Owner · Updated), select many, bulk Move / Duplicate / Delete, rename a file | H-51, H-118 | Built | — | — | — | `lead-files.tsx:115-141`, `:318-326`, `files-filters-modal.tsx` |
| Delete goes to a Trash with Undo; Deleted Files: Restore · Delete forever · Empty | H-35, H-45, H-89 | Built | — | — | — | `app/leads/files-actions.ts:162-198`, `deleted-files-sheet.tsx` |
| Show a file to the client / stop showing; a Client column and a grid mark; what the client sees (Documents: the quotes and agreements sent; the files shown; invoices and receipts on Money) | H-21, H-23, H-27, H-31, H-43, H-44, H-81, H-85, H-86 | Built | Enforced on the server by `PORTAL_FILE_RULES`; Undo on each change. No bulk "Show to client" (1.0 had none either) | — | — | `app/portal/studio-actions.ts:93-110`, `lib/portal/files.ts`, `components/portal/portal-files.tsx` |
| Copy a file's link: a read-only link for the client, or Send on WhatsApp (1.0 copied a 404 address) | H-42, H-120 | Built | — | — | — | `components/leads/files/use-file-share.ts`, `app/f/[token]/route.ts` |
| Files' empty, loading, no-results and failure states, and named error messages | H-53, H-54, H-55, H-58, H-59, H-60, H-115 | Built | 2.0 has its own ghost, so a slow or failed list no longer reads as empty | — | — | `files-empty.tsx`, `components/leads/detail/tab-ghosts.tsx`, `use-run` |
| Activity lines for files: upload, trash, delete, shown / hidden, comments | H-92 | Built | — | — | — | `lib/leads/activity.ts`, `app/leads/files-actions.ts` (`logLeadEvent`) |
| What a project files by itself: receipts → Payments, update media → Site updates, choice pictures → Choices, the Won step's signed quote / contract upload | H-93, H-96 | Built | Invoices live on Money, not as empty file rows | — | — | `lib/leads/file-model.ts:26-30`, `lib/contracts/won.ts` |
| Key documents on the Overview: the signed quote (or its upload), the contract, a direct project's other documents, latest renders, Open in AI Visualizer | H-137, H-139, H-140, H-141, H-143, H-144, H-145, H-147, H-149, H-150, H-151, H-153, H-154, H-155 | Built | Rows open the quote / contract pages (preview, print) instead of a download picker | — | — | `components/projects/project-overview.tsx:247-285` |
| Feedback on shared renders: favourites, notes with studio replies, pins (client and studio), reply, resolve, remove; the studio is told | H-171…H-184, H-186…H-198 | Built | Feedback lives in the Visualizer, the bell (`render_feedback`) and Activity, not as a card on the project's Files | — | — | `app/renders/actions.ts`, `app/visualizer/actions.ts:799-854`, `lib/notifications/model.ts` (`render_feedback`) |
| Open the AI Visualizer from a project (Overview, kebab, listing row); Back returns to the project | H-199…H-207, H-231, H-257, H-260…H-263 | Built | One door, one name ("Open in AI Visualizer"); the lead's design | — | — | `components/projects/project-frame.tsx:89-98`, `project-menu.tsx:38`, `projects-workspace.tsx:168` |
| The Visualizer editor as used for a project: rooms, modes, versions, full view, share link, pins, states, phone layout (AI credits charged by the credits module) | H-208, H-210, H-211, H-212…H-218, H-220…H-223, H-225, H-228, H-230, H-232…H-238, H-243, H-244, H-249, H-250, H-251, H-258, H-259, H-265, H-266, H-268, H-271, H-272, H-273 | Built | Audited separately (`16-…`, `18-…`). 1.0's branch charged no credits; 2.0's Generate does (REG-699…), and Projects adds no metered press (Q-30) | — | — | `components/visualizer/editor/*`, `lib/visualizer/*` |
| Share renders to the client's portal | H-82, H-83, H-84, H-226, H-227, H-267 | Built | A share link, listed on the portal's Designs tab with its feedback kept; Renew / Stop | — | — | `app/visualizer/actions.ts:724-789`, `lib/portal/designs.ts`, `app/my/[slug]/designs` |
| Renders kept in Files with a name, and their Activity line | H-246, H-247, H-264 | Built | — | — | — | `app/visualizer/actions.ts:660`, `lib/leads/activity.ts` (`leadFileRenders`) |
| Who may upload, delete or show a file | H-90, H-132 | Built | Same as 1.0: no role gate. 2.0's *Show to client* checks Who sees leads. Files' other actions (create folder, upload, rename, move, trash, delete forever) check **no** rule on the server. A completed project does not lock Files in either product | — | — | `app/leads/files-actions.ts` (no `canOpenLead`), `app/portal/studio-actions.ts:94-95` |
| Who sees and changes a project, who sees its money, the completed lock, handover approval: all checked on the server | J-152, J-153, J-154, J-157, J-158, J-161, J-162, J-163, J-164, J-166, J-317, J-318, J-319, J-326, J-328 | Built | Rules differ by call: any member may add a direct project (Q-04); Admins may delete (Q-26) | — | — | `lib/projects/policy.ts`, `lib/settings/permissions.ts:149-180`, `lib/leads/visibility.ts`, `lib/projects/handover-model.ts:76` |
| People outside the studio: the client signs in with an invited number, *See it as the client* (read-only), the household | J-48, J-49, J-50, J-165 | Built | Only invited numbers get in (1.0 linked every lead with a phone). The code step is a stand-in: any six digits (Q-38). Vendors' PO links: money out (Q-35) | — | — | `lib/portal/sign-in.ts`, `app/my/[slug]/login`, `app/my/[slug]/preview`, `components/portal/client-access-panel.tsx` |
| Studio bell events for project work: update review, stage answered, choice made, VO approved, invoice approval, payments, questionnaire, tasks; editable messages per channel | J-55, J-171, J-172, J-175, J-177, J-178, J-179, J-180, J-181, J-182, J-183, J-185, J-186 | Built | 2.0 has no reminder to an approver for an invoice still waiting (1.0 `invoice.approval_reminder`). There is no Rejected VO (map D-7); the client's *Ask for a change* is `quote_change_asked` | — | — | `lib/notifications/model.ts:13-108` |
| Approvals reach the approver (1.0 made approval tasks): updates, invoices, handovers, payments to confirm | J-190, J-217 | Built | A state on the record + a bell row + the listing's **Needs my review** scope | — | — | `components/projects/scopes.ts:19` |
| Reminders and time-based alerts: a task due in 30 minutes or overdue, a milestone due (3 days) or late, an invoice overdue; no cron needed | J-187, J-199, J-200 | Built | The lead time is fixed (see the Studio set-up row); the digest is held (Leads Q-42). A completed project's tasks stop reminding, as 1.0's archive did | — | — | `lib/notifications/queries.ts:52-110`, `lib/projects/payments.ts:284` (`derivedPaymentRows`) |
| The client's bell in the portal: an update published, a schedule shared, a stage to confirm, a choice to make, an invoice sent / due / overdue, a payment confirmed / not received | J-52, J-174, J-192, J-193, J-194, J-195, J-196, J-197 | Built | A VO waiting for approval and a newly shared file reach *What needs you*, not the bell | — | — | `lib/portal/notifications-model.ts:17-113` |
| Leads ↔ projects: Won creates it, a direct project, fields carried on, Open the project from the lead, one project per lead, the team and phone are one record | J-18, J-207, J-208, J-209, J-210, J-211 | Built | — | — | — | `lib/projects/create.ts`, `app/leads/[id]/overview.tsx:267-268`, `leads.direct` |
| Quotes, contracts, signing and variation orders on a project; contract value from the signed quote + approved VOs | J-91, J-92, J-93, J-94, J-95, J-212, J-213, J-214, J-215 | Built | The quote's Payment Schedule is the source (Q-13), not a mirror back from the timeline | — | — | `components/projects/project-overview.tsx:250-262`, `lib/projects/money.ts`, `lib/contracts/won.ts` |
| Several people on one task | J-28 | Built | — | — | — | `lib/db/schema.ts` (`taskAssignees`) |
| Schedule and updates as records with server rules: milestones, shares to the client, the client's stage answers, review, withdraw before the client saw it | J-13, J-22, J-23, J-24, J-25, J-29, J-74, J-78, J-96, J-97, J-98, J-99, J-100, J-324 | Built | — | — | — | `app/projects/schedule-actions.ts`, `app/projects/updates-actions.ts`, `project_milestones`, `project_schedule_shares` |
| Choices: create, edit, share, the client's pick, a price difference that drafts a VO | J-32, J-101, J-102, J-103, J-105 | Built | — | — | — | `app/projects/choices-actions.ts`, `app/portal/choices-actions.ts` |
| Ask the project's client to fill the questionnaire | J-106, J-107 | Built | — | — | — | `app/leads/portal-actions.ts` (`askClient`), `question_answered` |
| Files records and their routes (one table, signed client links, a size cap) | J-30, J-31, J-85, J-86, J-87, J-88, J-89, J-90, J-322 | Built | Bytes for non-pictures: the Partly row at the top | — | — | `lib/db/schema.ts:782-802`, `app/leads/files-actions.ts` |
| Visualizer rooms, renders and shared assets on the project (through its lead) | J-35, J-51, J-118, J-119, J-223 | Built | — | — | — | `app/visualizer/actions.ts`, `lib/portal/designs.ts` |
| Schedule templates (one library, Save as template) and payment-split templates | J-38, J-39, J-41, J-230 | Built | Four 1.0 stores collapse into one (map D-15) | — | — | `app/company/templates/(libraries)/schedules`, `app/projects/schedule-actions.ts:654`, `payment_templates` |
| Project, invoice and receipt numbering; calendar days | J-19, J-42, J-232 | Built | — | — | — | `app/settings/projects-settings.tsx`, `lib/projects/model.ts` (`formatProjectNumber`) |
| Money in: one set of numbers, invoices per stage, variance with a reason, the Money tab, the listing's contract value, delete refused while money is recorded | J-58, J-60, J-109, J-111, J-124, J-127 | Built | — | — | — | `lib/projects/money.ts`, `app/projects/money-actions.ts`, `lib/projects/handover-model.ts:173` (`deleteBlock`) |
| Activity and the audit trail: edits, team changes, ending, deletes | J-46, J-47, J-125, J-330 | Built | 1.0 kept no project log | — | — | `lib/projects/events.ts`, `lib/leads/activity.ts` |
| Needs attention (1.0's action items) | J-126 | Built | — | — | — | `lib/projects/attention.ts` |
| Search, the rail / dock badge, G P, ⌘K Create *New project* | J-233, J-234 | Built | — | — | — | `lib/global-search/queries.ts:57-72`, `lib/leads/tasks.ts:139-142`, `lib/keys/registry.ts:46` |
| The Homeowner Portal tool → Company › Client portal (Clients, test client, household) | J-225 | Built | — | — | — | `app/company/portal/`, `components/portal/household-rows.tsx` |
| Stages and the ending: Setting up · In progress · Completed; handover request / review / reject | J-07, J-08, J-09, J-10 | Built | Q-03 (one status), Q-02 (Start the project, no automatic flip), Q-24 | — | — | `lib/projects/model.ts`, `lib/projects/handover-model.ts` |
| Project record actions: list, create, read, change, team (commission split held, Q-21), phone kept on one record, delete | J-34, J-70, J-71, J-72, J-73, J-75, J-76, J-81, J-84 | Built | — | — | — | `app/projects/actions.ts`, `app/projects/ending-actions.ts` |
| 1.0 layout of Files, Key Files and the in-page render tab | H-06…H-12, H-209 | Not a product feature | 1.0's own layout; 2.0 uses its house pieces | — | — | — |
| 1.0 motion (tab fade, hovers, dialog zoom, pulses, sheets) | H-61…H-73, H-134, H-148, H-185, H-239…H-242 | Not a product feature | 1.0 styling / motion | — | — | — |
| 1.0 storage and data plumbing: folder strings, object keys, rollback, full-size thumbnails, gif, tables, buckets, routes, unused hooks, locales, render storage paths | H-74, H-77…H-80, H-99…H-104, H-133, H-135, H-136, H-245, H-252…H-256 | Not a product feature | — | — | — | — |
| Dead in 1.0: file Approve / Reject and its pills and dot, never set; six filing destinations nothing calls | H-17, H-30, H-46, H-87, H-88, H-97, H-119 | Not a product feature | Unreachable in 1.0 (H-119); `approval_status` has no 2.0 home (map §2) | — | — | — |
| 1.0 faults 2.0 does not repeat: empty invoice rows, folder ids that disagree, two VO folders, deleting a lead's file from the project, orphaned render rows, render downloads in Documents, the "vo" guess, the lightbox's missing dialog semantics | H-121, H-122, H-123, H-128, H-129, H-130, H-131, H-156 | Not a product feature | — | — | — | — |
| Schema assembly, enums, legacy status, entity / handover-lock columns, indexes, RLS, triggers, foreign keys | J-01…J-06, J-12, J-16, J-17, J-20, J-21, J-59, J-61, J-62 | Not a product feature | — | — | — | — |
| Docs, TypeScript shapes and the requirements sheet against the code | J-63…J-69, J-160, J-251…J-268 | Not a product feature | The features they name are counted by their own readers (Clone and the draft wizard = B, audio completion and the publish wizard = E) | — | — | — |
| Dead, unreachable or hard-coded in 1.0: `project_templates`, snags, homeowner notification preferences, lead-link, Clone (no button), the entity-lock count, the retired rebalance, the templates twin, unused aggregates, the dashboard's literal KPIs, and the rest of the dead list | J-37, J-45, J-53, J-77, J-79, J-80, J-112, J-122, J-123, J-128, J-205, J-306…J-316 | Not a product feature | — | — | — | — |
| Not the Projects module: whole-quote templates, a designer's portfolio projects, Marketplace / Qanvast Ops | J-131, J-132, J-220 | Not a product feature | — | — | — | — |
| Platform plumbing and analytics: auth styles, error codes, related routes, bulk "don't notify", admin counts, analytics events, the offline queue (no producer), quote line count | J-129, J-133, J-134, J-135, J-191, J-235, J-236, J-237 | Not a product feature | — | — | — | — |
| Port notes for 2.0 | J-269…J-285 | Not a product feature | Taken up by the devs' map `24-…` | — | — | — |
| 1.0 schema drift and likely live defects | J-286…J-305 | Not a product feature | 2.0 carries none of them (one project per lead is a unique index; `updated_at` moves; closure sets the stage) | — | — | — |
| Weak checks that are plumbing: the AI plan route's missing session, signing any storage path, trusted foreign ids, split basis points, service-role filters, the homeowner helpers' demo gate | J-320, J-321, J-323, J-325, J-327, J-329 | Not a product feature | — | — | — | — |

## Top gaps

1. **Files keeps the real file only for pictures.** A studio uploading a drawing PDF, a BOQ spreadsheet or a CAD file cannot get it
   back: Download says "Coming soon". A spreadsheet is stored and labelled as a JPEG with a stand-in photo. A client opening a shared
   PDF in the portal sees a glyph. This is everyday project work and the client notices. Updates already keep any file's bytes, so
   the fix is to reuse that path in Files.
2. **The studio's email and WhatsApp messages are recorded, not sent.** Owners and designers would miss everything that is not
   in the bell. This is the developers' wiring (map §6), but it has to be listed until it is done.
3. **No task for a subcontractor or the client**, so there are no "your to-dos" in the portal. Studios co-ordinate trades and ask
   clients for things (keys, approvals) every week. 1.0 had name + phone assignees and homeowner assignees.
4. **No owner approval of a Designer's deadline extension.** In 1.0 a non-owner's date change on a running or at-risk milestone
   waited for the owner. In 2.0 the move goes straight through, with Undo. Studios that check junior designers' dates lose that
   control.
5. **The milestone alert lead time is not a setting.** 1.0's Proactive Alerts let a studio pick 1–30 days (default 7). 2.0 rings
   at a fixed 3 days.
6. **A milestone's panel does not list its invoices.** The schedule names the next payment, but nothing gives a per-milestone
   "what was billed and its status" with a quick look.
7. **A direct project has nowhere for notes**, and the scope's room list and the closing summary have no home. Some studios keep
   project notes. A Won project's notes are one link away on the lead.
8. **No arrow keys or thumbnail strip in the file viewer.** Paging through site photos is slower than in 1.0's lightbox.
9. **No starter folder set on a new project.** Each studio builds its folders again. This matters little, since 1.0's fixed
   folders were filled by hand.
10. **The Tasks hub cannot group by project**, and there is no Leads / Projects switch. A designer with many projects scans one
    long list.

## Things the inventory missed

- **What 1.0's Proactive Alerts tab contains** (J-229 names only the tab). It has:
  - an Enable switch, on by default;
  - *Alert Lead Time* of 1–30 days (default 7), described as "Auto-create review tasks when milestones approach their due dates";
  - *Extension Request Settings*: "Notify owner on extension request" (creates an approval task) and "Auto-update on extension".

  The project page passes this to the Gantt as `proactiveAlertConfig`. Files: `src/app/(main)/accounts/page.tsx:2755-2880`,
  `src/app/(main)/projects/[projectId]/page.tsx:2816`, and the extension gate in `src/components/projects/gantt-chart.tsx:1876-1880`.
- **1.0's Settings › Notifications screen** (J-56 lists only the table's columns). Per category it has In-app / Email / WhatsApp
  toggles, a **Digest** checkbox shown when email is on, and a **Recipients** popover with role checkboxes (owner · admin · id ·
  accounting). File: `src/components/settings/notification-settings.tsx:116-297`.
- **Project-tied notification events missing from J's table:** `po.sent_to_vendor`, `po.vendor_acknowledged`, `po.vendor_rejected`,
  `expense.submitted` and `accounting.connection_expired` (all money out, so later under Q-35), plus `contract.composed_sent`,
  `quote.signature_requested` and `quote.signed_by_client` (2.0 has `contract_sent` and `quote_signed`). File:
  `src/lib/notifications/events.ts`.
- **A correction to J-14.** It says `satisfaction_rating` is "written by the homeowner route", but no screen calls
  `POST /api/homeowner/projects/[id]/satisfaction` (reader I-412 agrees). The rating only appears, when present, on the closure
  summary card and dialog and in Finance's comparative analytics. In practice it is dead. Files:
  `src/components/projects/closure-summary-card.tsx:105-116`, `src/components/finance/comparative-analytics.tsx:76`.

## Uncertain

- **Files bytes.** I counted the "pictures only" storage as a gap. Map §6 treats storage as the developers' stand-in, so Vicky may
  read it as wiring rather than design. But the Files tab is behind Updates in the same prototype: a spreadsheet shows as a JPEG on
  screen, and that is visible.
- **The extension-request flow.** I read only the Gantt's gate and the Proactive Alerts editor. I did not trace the request → task →
  approve → auto-update path end to end. Reader E owns the Gantt side and may grade it differently.
- **Who may change files.** 2.0's file actions (`createFolder`, `uploadFile`, `renameFile`, `moveFiles`, `trashFiles`,
  `deleteFilesForever`) check no Who-sees-leads rule on the server; the pages do, and so does `setFilesShown`. 1.0 had no check
  either, so I graded this Built (parity). It goes against 2.0's own rule that "every project read and action checks it on the
  server" (map, conventions).
- **The Tasks hub.** I took the Project filter pane as covering most of 1.0's source filter (All · Leads · Projects). I did not
  open the hub's screen to confirm there is no Leads / Projects switch.
- **Ad-hoc invoices.** I filed "an ad-hoc invoice outside the schedule" under F-04. F-04 says only "one per payment stage", and the
  explicit exclusion is map D-5, a port decision. Reader G may find that a studio needs a one-off charge.
- **The Visualizer editor rows.** I marked the editor's own rows (H-208…H-273) Built on the strength of the separate AI Visualizer
  audit (`16-…`, `18-…`). I did not re-check each control.
