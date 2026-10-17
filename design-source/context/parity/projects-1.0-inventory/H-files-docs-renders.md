# H — 1.0 Projects: Files & Docs and Photo Renders

Reader H of twelve. Read in full, in the 1.0 repo `qanvast-id-tool` (working tree, branch `integ/security-non-qanvast` @ `620190192`): the project detail page `src/app/(main)/projects/[projectId]/page.tsx` (regions 1–130 imports, 243–278 render wrapper, 280–434 receipts rail + files model, 637–1308 state and handlers, 1640–1941 header and tabs, 2443–2454 Key Files mount, 4039–4693 render tab, Files & Docs tab, its dialogs and the tool-entry mount); `src/components/projects/file-lightbox.tsx`, `key-files-rail.tsx`, `milestone-related-files.tsx`, `tool-entry-dialog.tsx`, `shared-render-feedback.tsx`, `render-annotator-studio.tsx`, `visualizer-rail.tsx`, `visualizer-mobile-shell.tsx`; `src/lib/file-utils.ts`, `finance-auto-file.ts`, `storage-sign.ts`, `queries/project-files.ts`, `queries/project-renders.ts`, `queries/project-aggregates.ts` (file lines); the routes `api/projects/[id]/files` (+ `[fileId]`), `api/project-files/records` (+ `[id]`), `api/project-files/[id]/signed-url`, `api/projects/rooms` (+ `[roomId]`), `api/renders/jobs`, `api/renders/share`, `api/render` (main), `api/homeowner-links/{share-render,shared-renders,render-annotations,active-link}`, `api/homeowner/projects/[id]/documents`, `api/projects/[id]/contract/list`, the three invoice routes and the two Co-Pilot routes that insert into `project_files`; `src/app/(main)/tools/ai-visualizer/page.tsx` (how a project lands in the tool); migrations `supabase/migrations/20260419000004_project_files.sql` and `scripts/migrations/207_homeowner_visible_files.sql`; keyframes in `src/app/globals.css`. `visualizer.tsx` (5,904 lines) was read only where it meets a project (1270–1602, 1796–1956, 2225–2362, 2436–2460, 2754–2834, 3200–3245, 4040–4084, 4790–5058, 5349–5464, 5547–5904) and skimmed elsewhere; its controls (`auto-furnish-controls`, `relight-controls`, `style-transfer-controls`, `visualizer-material-sheet`, `visualizer-canvas-overlays`) were skimmed for the summary. Nothing was run; nothing in 1.0 was edited.

Short names used in citations: `page.tsx` = `src/app/(main)/projects/[projectId]/page.tsx`; `viz` = `src/components/projects/visualizer.tsx`; other paths are from `src/`.

## Bottom line

- **Files & Docs is a flat list with a folder filter, not a file system.** Eight fixed folders (one of them "All Files"), one `folder` text column on `project_files`, the parent lead's files merged in by filename guesswork. No rename, no move, no search box, no sort, no bulk select, no versions, no trash. Delete is permanent.
- **Custom folders are not saved.** "New Folder" lives in React state only; a reload removes the folder and leaves its files under All Files. A custom name can also collide with a fixed folder id.
- **Auto-filing is narrower than its own type list.** Only three things file themselves: invoices (a row with no file behind it), Visualizer renders, and Co-Pilot renders / moodboards. Quotes, contracts, receipts, credit notes, POs, VOs, progress photos, floor plans and 3D layouts do not. Invoices land in a folder name no folder chip matches, and their Download fails.
- **Folder names disagree across the code**: the setup wizard writes `contract`, the tab's folder is `contracts`, the Key Files rail and the contract picker read `contract`, the Visualizer writes `Renders`, the rail reads `render` / `renders`. Files show in one place and not the other.
- **Loading and failure both look like "No files here yet".** The tab never reads the query's loading or error state. "Modified By" is always "—". "Last Modified" is the upload time.
- **The preview is an image-only full-screen dialog**: no PDF view, no next / previous, no zoom, no keyboard beyond Esc. The richer `FileLightbox` (arrows, thumbnails, PDF iframe) is wired only to the Overview's Renders tile, and that tile can open nothing.
- **Sharing with the homeowner is one boolean per file** (`is_homeowner_visible`, off by default) set from the ⋯ menu. For a Visualizer render it also creates the portal "Renders" card that collects likes, comments and pins; hiding it deletes that feedback. The Visualizer's own "Share to Portal" does not set the flag, so the two disagree.
- **Approve / Reject on files is unreachable**: nothing in the app sets a file to `pending`. "SHARED" and "APPROVAL REQUESTED" pills are never set either.
- **No role or lock checks** on upload, delete, share or approve — client or server beyond "signed in to this studio". The handover lock does not cover files. No size or type limit on the tab's uploads.
- **"Photo Renders" leaves the project.** The header button opens a small dialog whose two choices go to the same address, `/tools/ai-visualizer?projectId=…`; the editor's Back goes to the tool's gallery, not the project, and its crumb reads "Render". The in-page `render` tab still exists but nothing links to it.
- **Renders come back as files and as Activity lines** ("uploaded Render - Room 5 - Classic - v1.png to Renders"), with names that repeat (`v1` is the variant slot, not the version) and size "0 KB". Deleting a render, a room or the file does not clean up the other records.
- **No credits on this branch.** A render costs nothing in-product; the only limit is 10 requests a minute per IP. Homeowner feedback raises no notification to the studio.

---

## A. Files & Docs tab

### A1. What it is / entry points

- **H-01** Files & Docs is the fourth (third when Finance is switched off) tab of the project detail page, value `files-docs`, label "Files & Docs", icon `FolderOpen`; the strip is Overview · Management · Finance · Files & Docs · Activity (`page.tsx:1876-1882`).
- **H-02** The tab is in the address as `?tab=files-docs`; the default tab is omitted from the address, and the tab is restored on reload. The open folder, the view (grid / list) and any preview are not in the address (`page.tsx:894-908`, `page.tsx:933-939`).
- **H-03** Entry from the Overview: the Key Files card's "View all →", its empty tiles ("Upload quote", "Upload contract", "Upload renders") and the lightbox's "Open in Files & Docs" all call `setActiveTab("files-docs")`; none of them pre-selects a folder (`page.tsx:2444-2454`, `components/projects/key-files-rail.tsx:141-147`, `:174`, `:202`, `:213`, `:223`).
- **H-04** The tab shows three stacked blocks: the file browser (folders + files), then "Selection Receipts" (only when there are any), then "Homeowner feedback on shared renders" (always) (`page.tsx:4062`, `page.tsx:4496-4500`).
- **H-05** The file list is one request, `GET /api/projects/{id}/files`, which returns this project's `project_files` rows plus the parent lead's `lead_files` rows, newest first; ids are compound: `pf:<uuid>` or `lf:<uuid>` (`page.tsx:945-979`, `app/api/projects/[id]/files/route.ts:83-146`).

### A2. Layout

- **H-06** Tab wrapper: `flex flex-col gap-4`; inside it the browser is `flex flex-col lg:flex-row gap-4 lg:gap-5 lg:items-start` — folder panel left, content panel right at ≥1024, stacked below (`page.tsx:4062-4064`).
- **H-07** Folder panel (≥1024 only): fixed width 248px, white card, `rounded-2xl`, 1px border, `shadow-sm`; header row `px-4 pt-4 pb-3` with the caption "Folders" (11px, semibold, uppercase, widest tracking, disabled tone) and a 24px "+" button; list `px-2 pb-3 space-y-0.5` (`page.tsx:4104-4117`).
- **H-08** Folder row: `rounded-xl`, 14px `Folder` icon, 13px medium label (truncates), then a 28px right slot holding the count badge (10px semibold, min 18×18, pill). The active row is filled `bg-primary-variant` with primary text; idle rows hover `bg-hover-04p` (`page.tsx:4148-4166`).
- **H-09** Content panel: `flex-1 min-w-0`, white card, `rounded-2xl`, `shadow-sm`; header `px-6 py-4` with a bottom rule: the open folder's name as a 15px semibold heading on the left, the view toggle and the Upload button on the right (`page.tsx:4208-4239`).
- **H-10** List view (≥768): a header row and rows on the same CSS grid `1fr 110px 140px 190px 96px` (Name · Type · Modified By · Last Modified · Actions), `px-5`, header `py-2.5` on a tinted band, rows `py-3` divided by 1px rules (`page.tsx:4353-4376`).
- **H-11** Grid view: `p-5`, one column, two from 640, three from 1024, gap 14px; each card has a 4:3 preview area and a `px-3 py-2.5` footer; a dashed "drop zone" card of min-height 160px always closes the grid (`page.tsx:4256`, `:4278`, `:4319`, `:4337-4348`).
- **H-12** Nothing is sticky inside the tab; the folder panel does not scroll independently, and the list is not paginated or virtualised — every file renders (`page.tsx:4367-4489`).
- **H-13** The preview is a full-viewport dialog: `w-screen h-dvh`, no radius, no border, a `px-4 py-3` header bar with a bottom rule and a centred body on `bg-surface-bg` that scrolls (`page.tsx:4515-4556`).

### A3. UI elements

- **H-14** Fixed folders, in order, with the labels the user reads: "All Files", "Contract/VO", "Floor Plans", "Renders", "Quotes & BOQ", "Site Photos", "Variation Orders", "From Qanvast"; ids `all`, `contracts`, `floor-plans`, `renders`, `quotes`, `site-photos`, `variation-orders`, `from-qanvast` (`page.tsx:380-389`).
- **H-15** Each fixed folder is declared with its own icon and colour (FileText red, Layers green, Sparkles primary, DollarSign yellow, Camera, AlertTriangle red, Tag green) but the list draws the same grey `Folder` icon for every row, and the phone chips draw no icon (`page.tsx:380-389`, `page.tsx:4154`, `page.tsx:4084`).
- **H-16** Custom folders are appended after the fixed eight, with the `Folder` icon (`page.tsx:4056-4059`).
- **H-17** The "Variation Orders" row carries a red dot (8px in the panel, 6px on the chip) when any file in that folder is awaiting review (`page.tsx:1036-1039`, `page.tsx:4156-4158`, `page.tsx:4085-4087`).
- **H-18** A custom folder's count badge cross-fades on hover to a ⋮ button (24px) whose menu (160px) is "Rename" (Pencil) and, after a separator, "Delete folder" (Trash, red) (`page.tsx:4160-4196`).
- **H-19** View toggle: a 32px-high joined pair with a 1px divider, `LayoutGrid` and `List` icons at 14px, titles "Grid view" and "List view"; the chosen side is `bg-primary-variant` with primary icon. List is the default (`page.tsx:935`, `page.tsx:4216-4226`).
- **H-20** Upload button: primary, 36px high, `Upload` icon 14px + "Upload"; it presses a hidden `<input type="file" multiple>` with no `accept` filter (`page.tsx:4228-4237`).
- **H-21** List header words: "Name", "Type", "Modified By", "Last Modified", "Actions" (11px semibold uppercase); beside "Actions" sits an ⓘ popover, aria-label "How homeowner file visibility works", text: "Files are private to your studio by default. Use a file's ⋯ menu → “Show to homeowner” to let your client download it from their portal. Internal files like cost sheets and supplier quotes stay hidden unless you share them." (`page.tsx:4355-4364`).
- **H-22** List row, Name cell: a 32px rounded-xl tile — the real picture for png / jpg / jpeg / webp when a URL came back, else a tinted tile (PDF red `FileText`, xls / xlsx green `FileSpreadsheet`, image primary `FileImage`, anything else grey `File`) — then the name at 13px medium, cut at 200px (`page.tsx:398-434`, `page.tsx:4379-4382`).
- **H-23** Pills after the name (10px semibold, full radius): "SHARED" (outlined), "APPROVED" (green fill, white text), "APPROVAL REQUESTED" (outlined), "REVIEW" (red tint), "HOMEOWNER" with an Eye icon (primary tint) (`page.tsx:4383-4397`).
- **H-24** Type cell words: "PDF", "Spreadsheet", "Photo", "File" (`page.tsx:391-396`, `page.tsx:4400`).
- **H-25** Last Modified cell: `toLocaleString("en-SG")` of the row's `created_at`, e.g. "5 Oct 2026, 14:30" (24-hour); the locale is fixed, not the studio's region (`page.tsx:956-960`).
- **H-26** Size text: under 1,024 KB "N KB" (rounded), else "N.N MB"; a row with no stored size reads "0 KB" (`page.tsx:954-955`).
- **H-27** List row actions: when a file awaits review, two 32px square buttons, green ✓ (title "Approve") and red ✕ (title "Reject"); always a ⋯ button whose 176px menu is "Preview" (Eye), "Download", "Copy link", "Show to homeowner" (Eye) / "Hide from homeowner" (EyeOff), separator, "Delete" (red) (`page.tsx:4404-4429`).
- **H-28** Grid card: top-left type badge "PDF" / "XLS" / "IMG" / "FILE" (10px bold) and, when awaiting review, a red "Review" badge with a warning icon; preview is the picture (object-cover), a primary gradient with an image icon and the extension, or a 56px type tile; footer shows the name (12px semibold, truncates) and "{size} · {uploadedBy}" (`page.tsx:4266-4293`, `page.tsx:4319-4321`).
- **H-29** Grid card hover bar (bottom, black gradient): "View" and "Download" as white chips, and a ⋯ menu with "Copy link", "Show to homeowner" / "Hide from homeowner", separator, "Delete" — no "Preview" item there, since the card itself opens it (`page.tsx:4295-4316`).
- **H-30** Grid card, when awaiting review: two half-width buttons under the footer, "Approve" (green tint) and "Reject" (red tint) (`page.tsx:4322-4331`).
- **H-31** The grid card has no sign that a file is shown to the homeowner; only list rows carry the "HOMEOWNER" pill (`page.tsx:4266-4332` vs `page.tsx:4395-4397`).
- **H-32** Drop-zone card (grid view only): dashed 2px border, a 40px tile with the Upload icon, "Drop files here" and "or click Upload"; while a drag is over the tab it reads "Drop to upload", turns primary, and the tile fills primary (`page.tsx:4337-4348`).
- **H-33** Preview dialog header: a 32px ✕ on the far left, the 32px type tile, the name (14px semibold), "{size} · {uploadedBy} · {date}" (11px), then on the right "Approve" (green) and "Reject" (red) when review is due, a divider, "Copy link" (outlined) and "Download" (primary) (`page.tsx:4516-4554`).
- **H-34** New Folder dialog (max 384px): a 36px primary-tint tile with `FolderOpen`, title "New Folder", line "Give your folder a name", one input with a folder icon and placeholder "Folder name…", buttons "Cancel" and "Create folder" (`page.tsx:4644-4682`).
- **H-35** Delete file confirm: title "Delete file?", body "“{name}” will be permanently deleted. This action cannot be undone.", buttons "Cancel" and "Delete" (destructive) (`page.tsx:4590-4608`).
- **H-36** Delete folder confirm: title "Delete folder?"; with files inside: "“{label}” will be deleted. The {n} file(s) inside will remain visible under All Files."; empty: "“{label}” will be permanently deleted. This action cannot be undone."; buttons "Cancel" and "Delete folder" (`page.tsx:4611-4641`).

### A4. Interactions

- **H-37** Pressing a folder filters the list to files whose `folder` equals that id; "All Files" shows everything. Counts are per folder over the whole list (`page.tsx:1019-1034`, `page.tsx:4151`).
- **H-38** Pressing a list row, a phone card or a grid card opens the preview dialog for that file (`page.tsx:4263`, `:4374`, `:4434`).
- **H-39** Upload by button: the picked files are sent one after another (not in parallel) as `multipart/form-data` to `POST /api/projects/{id}/files` with the open folder's id; when "All Files" is open the files go to `site-photos`. At the end the list is refetched and one toast reads "{n} file uploaded" / "{n} files uploaded"; each failure toasts "Failed to upload “{name}”" (`page.tsx:1057-1083`).
- **H-40** Upload by drag and drop: `dragover` anywhere over the browser (folder panel included) arms the drop state; dropping uploads the same way to the same target; the toast reads "{n} file added" / "{n} files added" — a different verb from the button's (`page.tsx:4064-4068`, `page.tsx:1236-1260`).
- **H-41** Download: `GET /api/projects/{id}/files/{compoundId}` returns `{ signedUrl }` and the page opens it in a new browser tab; private-bucket files come with the original file name as the download name and a one-hour life (`page.tsx:1043-1055`, `app/api/projects/[id]/files/[fileId]/route.ts:97-109`).
- **H-42** Copy link writes `{origin}/projects/{projectId}/files/{file.id}` to the clipboard and toasts "Link copied to clipboard" (failure: "Failed to copy link") (`page.tsx:1101-1108`).
- **H-43** Show to homeowner / Hide from homeowner: `PATCH …/files/{id}` with `{ isHomeownerVisible }`, then (renders only, see H-82) the portal share is added or removed, then the list refetches. Nothing is optimistic; the pill appears after the refetch (`page.tsx:1180-1204`).
- **H-44** The visibility toasts: shown + portal card made → "“{name}” shared to the homeowner portal — visible in Documents and Renders"; shown but the project has no homeowner link → "“{name}” is now visible to the homeowner" with the description "Invite the homeowner to their portal to also enable render feedback."; otherwise "“{name}” is now visible to the homeowner" or "“{name}” hidden from the homeowner" (`page.tsx:1193-1199`).
- **H-45** Delete: the menu item opens the confirm; "Delete" calls `DELETE …/files/{id}`, closes the confirm, refetches and toasts "“{name}” deleted". There is no Undo (`page.tsx:1085-1099`, `page.tsx:4590-4608`).
- **H-46** Approve / Reject: `PATCH …/files/{id}` with `{ approvalStatus: "approved" | "rejected" }`, closes the preview, refetches, toasts "“{name}” approved" or "“{name}” rejected"; there is no confirm and no note (`page.tsx:1114-1133`, `page.tsx:1205`).
- **H-47** New folder: the "+" (panel header, or the dashed round chip on phones) opens the dialog with the input focused; Enter or "Create folder" adds it (the button is disabled while the name is blank), selects it and toasts "Folder “{name}” created"; Escape or Cancel closes and clears (`page.tsx:4109`, `:4095`, `:4660-4679`, `page.tsx:1207-1216`).
- **H-48** Rename folder (custom folders, ≥1024 only): the row becomes an inline input, focused, with a ✓; Enter, the ✓ or blur saves and toasts "Folder renamed to “{name}”"; Escape cancels; an empty name cancels silently (`page.tsx:4126-4146`, `page.tsx:1218-1224`).
- **H-49** Delete folder (custom, ≥1024 only): confirm, then the folder leaves the list, the view returns to All Files if it was open, and the toast reads "“{label}” deleted — {n} file(s) still visible in All Files" or "“{label}” deleted" (`page.tsx:1226-1234`).
- **H-50** Preview dialog: ✕, Escape or a press outside closes it. An image shows scaled to fit (`object-contain`, 24px vertical padding). Every other type shows a 100px type tile, the name, "Preview unavailable · Download to open" and a "Download file" button (`page.tsx:4514`, `page.tsx:4557-4583`).
- **H-51** There is no rename of a file, no move between folders, no multi-select, no bulk action, no sort control and no column sizing anywhere in the tab (whole region `page.tsx:4055-4503`; handlers `page.tsx:1041-1260`).
- **H-52** Keyboard: only what the browser and Radix give — Tab through controls, Enter / Space on buttons, Escape for dialogs and menus, Enter / Escape in the two folder inputs. List rows and grid cards are `div`s with `onClick`, so they are not focusable and cannot be opened from the keyboard (`page.tsx:4261-4264`, `:4373-4377`).

### A5. States

- **H-53** Empty (any folder, same words): a glass tile with the `FolderOpen` icon over a faint mascot, title "No files here yet", line "Upload files or drag & drop anywhere" (the words after "Upload files" are hidden under 640), and an outlined "Upload files" button; padding `py-24` (`page.tsx:4242-4253`, `components/ui/empty-state.tsx:15-31`).
- **H-54** Loading: none of its own. While the list request is in flight the tab shows the empty state above, because the page reads only `filesQuery.data || []` (`page.tsx:980`, `page.tsx:4242`).
- **H-55** Load failure: also the empty state; the query throws "Failed to load files" but `isError` is never read and no message or retry is drawn (`page.tsx:949-950`, `page.tsx:980`).
- **H-56** Uploading: no progress bar, spinner, disabled state or placeholder row; the only feedback is the closing toast (`page.tsx:1057-1083`).
- **H-57** Image without a usable URL (signing failed or expired): the list tile falls back to the primary image icon; the grid card shows the gradient with the extension; the preview shows a 384×288 gradient tile with the name and "Preview unavailable · Download to view" (`page.tsx:402-413`, `:4282-4288`, `:4564-4571`).
- **H-58** Disabled: only "Create folder" while the name is blank. Upload, Delete, Approve and the visibility toggle are never disabled, including during their own requests (`page.tsx:4677`).
- **H-59** Permission-denied: there is no such state. The page draws every control for every signed-in member, and the routes answer only 401 "Not authenticated" / "Invalid session" or 404 "Project not found" / "File not found" (`app/api/projects/[id]/files/route.ts:55-81`, `[fileId]/route.ts:32-35`, `:86-88`).
- **H-60** Error toasts: download → "Download failed ({status})", "No download URL" or "Download failed"; delete → the server's message or "Delete failed ({status})"; approval → "Failed to update approval"; visibility → "Failed to update visibility" (`page.tsx:1047-1053`, `:1088-1097`, `:1121-1130`, `:1187-1202`).

### A6. Motion

- **H-61** Every tab body sits in a wrapper keyed by the tab and classed `animate-tab-enter`: keyframes `tabFadeIn`, opacity 0 → 1 and `translateY(4px)` → 0, 0.25s `ease-out`, on each tab change (`page.tsx:1941`, `app/globals.css:1687-1693`).
- **H-62** The Files & Docs root adds `animate-in fade-in duration-200` (tw-animate-css), so the tab fades twice at once: 250ms with a rise and 200ms without (`page.tsx:4062`).
- **H-63** The tab strip's underline slides: `transition-[left,width] duration-300 ease-in-out`; tab labels change colour over 200ms (`components/ui/sliding-tabs.tsx:95-99`, `:117`).
- **H-64** Folder rows: `transition-colors` on the fill; the count badge and the ⋮ swap by `transition-opacity` (default 150ms) on row hover (`page.tsx:4148`, `:4163`, `:4169`).
- **H-65** View toggle buttons: `transition-colors duration-200` and `active:scale-[0.97]` on press (`page.tsx:4218`, `:4223`).
- **H-66** Content panel on drag-over: border turns primary with a 2px 20% ring, `transition-colors duration-200`; the drop-zone card eases border and fill over 200ms (`page.tsx:4208`, `:4338`).
- **H-67** Grid card hover: border tint, `shadow-lg` at 5% black and a 1px lift, `transition-[border-color,box-shadow,transform] duration-150`; the action bar fades in, `transition-opacity duration-150` (`page.tsx:4264`, `:4295`).
- **H-68** List rows: hover fill `bg-hover-04p` with `transition-colors` (`page.tsx:4375`).
- **H-69** Dialogs (preview, New Folder): overlay fades (`fade-in-0` / `fade-out-0`), content fades and zooms from 95%, `duration-200`; the full-screen preview keeps the zoom although it covers the viewport (`components/ui/dialog.tsx:42`, `:64`, `page.tsx:4515`).
- **H-70** Alert dialogs (the two deletes): same fade + 95% zoom, 200ms, over a 50% black overlay at z 60 (`components/ui/alert-dialog.tsx:39`, `:61`).
- **H-71** Menus: fade + zoom 95% + an 8px slide from the trigger side (`components/ui/dropdown-menu.tsx:45`).
- **H-72** New Folder input wrapper: border and 2px ring ease in on focus, `transition-[border-color,box-shadow]` (`page.tsx:4658`).
- **H-73** No list reordering, row entrance, upload or delete animation exists; rows appear and vanish on refetch (`page.tsx:4367-4489`).

### A7. Rules and logic

- **H-74** A file's folder is whatever string is in `project_files.folder`, lower-cased with spaces turned to hyphens on the way out (so the stored "Renders" reads as `renders`) and again on the way in for uploads (`app/api/projects/[id]/files/route.ts:98-103`, `:202-204`).
- **H-75** Lead files have no folder; the server guesses one from the name and type: name contains "contract" or "signed" → `contracts`; "quote" / "quotation" / "boq" → `quotes`; "variation" or the word "vo" → `variation-orders`; an image whose name contains "render" → `renders`; an image whose name contains "floor" or "plan" or starts with "fp" → `floor-plans`; any other image → `site-photos`; anything else → no folder (All Files only) (`app/api/projects/[id]/files/route.ts:27-39`).
- **H-76** Upload limits: the tab's handlers do no size or type check and the route does none either. The app's shared rule — 10 MB except 3D formats, in `validateFileSize` — is imported by the lead screens only (`page.tsx:1057-1083`, `app/api/projects/[id]/files/route.ts:200-208`, `lib/file-utils.ts:6-28`; importers: `app/(main)/leads/new/page.tsx:26`, `components/leads/lead-detail-drawer.tsx:85`, `components/leads/drawer-sections/files-section.tsx:7`).
- **H-77** Stored object key: `{studioId}/{projectId}/{folder}/{uuid}-{safe name}` in bucket `project-files`, `upsert: false`; the display name is kept in `file_name`, so the same name can be uploaded twice and appears twice (`app/api/projects/[id]/files/route.ts:224-237`).
- **H-78** If the metadata insert fails after the object upload, the route removes the object and answers 500 (`app/api/projects/[id]/files/route.ts:261-266`).
- **H-79** Thumbnails: for image rows the server returns a URL per file — a one-hour signed URL for private buckets (signed in one batch per bucket) or the stored public URL as is. It is the full-size original, not a reduced picture (`app/api/projects/[id]/files/route.ts:148-172`, `lib/storage-sign.ts:112-150`).
- **H-80** The client treats png / jpg / jpeg / webp as pictures; the server also counts gif. A gif gets a URL the client never draws, and is typed "File" (`app/api/projects/[id]/files/route.ts:16`, `page.tsx:394`, `:403`).
- **H-81** Homeowner visibility: `is_homeowner_visible`, `NOT NULL DEFAULT FALSE`, on both `project_files` and `lead_files`; the PATCH route sets it for either kind, scoping a lead file to this project's parent lead (`scripts/migrations/207_homeowner_visible_files.sql:15-19`, `app/api/projects/[id]/files/[fileId]/route.ts:142-188`).
- **H-82** For a file in `renders` whose stored URL is public (a Visualizer or Co-Pilot render), showing it also posts to `/api/homeowner-links/share-render` (a `homeowner_shared_assets` row, type `render`, title = the file name) so it appears in the portal's Renders with likes, comments and pins; hiding it deletes that row on every homeowner link of the project. A manually uploaded image is never sent there, because its URL expires in an hour (`page.tsx:1134-1177`).
- **H-83** The share is idempotent on (link, url): re-showing a file returns `alreadyShared` and adds nothing (`app/api/homeowner-links/share-render/route.ts:55-72`).
- **H-84** Hiding discards the homeowner's likes, comments and pins on that render; showing it again starts a fresh card. The code comment records this as accepted (`app/api/homeowner-links/share-render/route.ts:105-108`).
- **H-85** What the homeowner sees: in the portal's Documents tab, every visible `project_files` and `lead_files` row with a one-hour download link, grouped by a category guessed from the file name ("Contracts", "Quotes", "Variation orders", "Renders", "Floor plans", "Site photos", "Other") — not by the studio's folder (`app/api/homeowner/projects/[id]/documents/route.ts:158-220`, `app/my/projects/[projectId]/page.tsx:1259-1266`).
- **H-86** The same Documents tab also lists, with no flag needed: signed quotes, the signed document packet, the contract file, documents shared as assets, selection receipts and payment receipts (`app/api/homeowner/projects/[id]/documents/route.ts:8-25`, `:340-359`).
- **H-87** Approval: `approval_status` is text with values `none` · `pending` · `approved` · `rejected`; uploads and every auto-filed row write `none`; the page marks a file "REVIEW" when it is `pending` and "APPROVED" when `approved`; a rejected file shows no pill (`app/api/projects/[id]/files/[fileId]/route.ts:116`, `app/api/projects/[id]/files/route.ts:256`, `page.tsx:969-972`).
- **H-88** Lead files can be shown or hidden and deleted from here, but not approved: the route answers 400 "Approval is not supported for lead files" (`app/api/projects/[id]/files/[fileId]/route.ts:190-193`).
- **H-89** Delete is hard: the object is removed from the bucket (a storage error is logged and ignored) and the row is deleted. For an `lf:` id this removes the file from the lead as well (`app/api/projects/[id]/files/[fileId]/route.ts:246-322`).
- **H-90** Role checks: the client draws no gate and the three file routes check only the session cookie and that the project (and the file) belongs to the session's studio. `canEditProject` and the handover lock (`projectIsLocked`) are computed on the page but not applied to this tab (`page.tsx:811-815`, uses at `page.tsx:1890-2773` only; `app/api/projects/[id]/files/route.ts:186-222`).
- **H-91** After an upload, delete, approval or visibility change the page also invalidates `floor-plan-import-candidates`, because Management › Floor Plan offers "import from a file already attached" from the same endpoint (`page.tsx:983-991`, `components/floor-plan-collab/floor-plan-section.tsx:95-114`).
- **H-92** No notification, task or activity write is made by the tab itself. Activity derives "{name} uploaded {file_name} to {folder}" from the newest 30 `project_files` rows, with the raw stored folder (so "to Renders", "to site-photos", "to Financial Documents/Invoices"); deletes, shares and approvals leave no line (`lib/queries/project-aggregates.ts:560-573`, `app/api/project-aggregates/activity-feed/route.ts:86-91`).

**What files itself, and where**

- **H-93** Invoices: creating an invoice by any of three routes inserts a `project_files` row — folder "Financial Documents/Invoices", name "{invoice number}.pdf", type "document", `storage_path` "auto-filed/invoice/{invoice id}", no size, no object in storage (`app/api/finance/records/invoices/route.ts:207-223`, `app/api/projects/[id]/invoices/milestone/route.ts:327-344`, `app/api/projects/[id]/invoices/adhoc/route.ts:338-355`).
- **H-94** Visualizer renders: each saved variant inserts a row — folder "Renders", name "Render - {room name} - {style or "Style"} - v{variant id}.png", type "document", `storage_path` = the public `renders`-bucket URL, no size (`viz:2805-2818`, `lib/finance-auto-file.ts:30-58`).
- **H-95** Co-Pilot: a render made in the Co-Pilot for a bound project inserts "AI Render — {title}.png", and a moodboard "Moodboard — {title}.png", both in "Renders", type "image", public URL, no size (`app/api/copilot/render/route.ts:233-243`, `app/api/copilot/moodboard/route.ts:243-253`).
- **H-96** The draft-project setup wizard's contract step uploads through the same endpoint with folder `contract` (singular) and writes the name to `projects.contract_file_name` (`components/projects/draft-setup-wizard.tsx:287-297`).
- **H-97** The auto-file helper's type names six more destinations — "Financial Documents/Credit Notes", "…/Purchase Orders", "…/Receipts", "Contracts", "3D Layouts", "Project Updates" — and a deprecated `autoFileFinancialDocument`; no code calls any of them. Quotes, signed contracts, receipts, VOs, POs, progress photos and floor plans are not filed here (`lib/finance-auto-file.ts:12-20`, `:69-82`; only caller `viz:2808-2811`).
- **H-98** Nothing writes to "From Qanvast", "Floor Plans", "Quotes & BOQ" or "Variation Orders"; they fill only by a manual upload while open, or by the lead-file name guess (H-75) (`page.tsx:1060`, `:1241`; the only other `folder` writers are `draft-setup-wizard.tsx:290` and the routes in H-93…H-95).

### A8. Data

- **H-99** `project_files`: `id`, `project_id` (cascade), `studio_id`, `folder` text default 'all', `file_name`, `file_size` bigint null, `file_type` text null, `storage_path` text not null, `uploaded_by` → profiles, `approval_status` text default 'none', `created_at`; plus `is_homeowner_visible` (migration 207). Indexes on (project_id, folder), (studio_id) and a partial one on visible rows (`supabase/migrations/20260419000004_project_files.sql:2-16`, `scripts/migrations/207_homeowner_visible_files.sql:15-26`).
- **H-100** There is no column for a file's updater, update time, version, parent folder, deleted-at, description, tags or milestone (`types/database.ts:2596-2610`).
- **H-101** `lead_files` columns read here: `id`, `file_name`, `file_size`, `mime_type`, `file_url`, `uploaded_by`, `uploaded_at`, `is_homeowner_visible` (`app/api/projects/[id]/files/route.ts:118-123`).
- **H-102** Buckets: `project-files` and `lead-files` are private (signed URLs only, one hour); `renders` is public and holds room photos, render variants and shared copies (`lib/storage-sign.ts:20-37`, `app/api/projects/[id]/files/route.ts:148-156`).
- **H-103** Routes used by the tab: `GET` / `POST /api/projects/[id]/files`; `GET` (signed URL) / `PATCH` (approval or visibility) / `DELETE /api/projects/[id]/files/[fileId]`; `POST` / `DELETE /api/homeowner-links/share-render`; `GET /api/homeowner-links/active-link`; `GET /api/identity/members/me` (`page.tsx:949`, `:1046`, `:1067`, `:1087`, `:1116`, `:1146-1171`).
- **H-104** A second, older API family reads the same table without the lead merge or folder normalising: `GET` / `POST /api/project-files/records`, `DELETE /api/project-files/records/[id]`, `POST /api/project-files/[id]/signed-url`; it feeds the Key Files rail, the tool-entry dialog and the Visualizer's auto-file (`lib/queries/project-files.ts:35-46`, `lib/finance-auto-file.ts:48-58`).
- **H-105** The list's client model drops the uploader: `uploadedBy` is hard-set to "—" ("resolving studio_members names is a separate hop; placeholder"), though the server returns `uploaded_by` (`page.tsx:966`, `app/api/projects/[id]/files/route.ts:104`).

### A9. Responsive

- **H-106** Below 1024 the folder panel is replaced by a single horizontally scrolling row of chips (36px high, full radius, 12px medium, scrollbar hidden): label, the VO red dot, and the count when above zero; active = primary fill with white text and `shadow-sm`; the row ends with a dashed round "+" (36px, aria-label "New folder") (`page.tsx:4069-4101`).
- **H-107** Rename and Delete folder do not exist below 1024 (comment: "rename/delete stay desktop-only") (`page.tsx:4069`).
- **H-108** Below 768 the list's grid is replaced by stacked rows: 32px tile, name + pills (wrapping), one meta line "{Type} · {uploadedBy} · {date}", full-width "Approve" / "Reject" (min 36px) when review is due, and the same ⋯ menu; the column header and its ⓘ are hidden, so the visibility explainer is not reachable on a phone (`page.tsx:4353`, `:4432-4486`).
- **H-109** Grid view collapses to one column under 640 (`page.tsx:4256`).
- **H-110** The empty state hides "or drag & drop anywhere" under 640 (`page.tsx:4246`).
- **H-111** The preview's header keeps all its buttons on one row at every width; with review due that is ✕, tile, title, Approve, Reject, Copy link, Download in a single non-wrapping flex row (`page.tsx:4516-4554`).
- **H-112** The content-panel header keeps `px-6` and the full "Upload" button at every width (`page.tsx:4210-4230`).

### A10. Problems

- **H-113** Custom folders are client state (`extraFolders`) and are never stored: after a reload the folder is gone, while files uploaded into it keep its id in `folder` and are found only under All Files. The create toast says "Folder “{name}” created" (`page.tsx:994`, `:1207-1216`).
- **H-114** A custom folder's id is its lower-cased, hyphenated name with no uniqueness check, so "Renders" or "Site Photos" produces a second row with a fixed folder's id (duplicate React key, both rows highlighted together, shared files) (`page.tsx:1210-1211`, `:4056-4059`).
- **H-115** Loading and failure show "No files here yet" (H-54, H-55), so a slow or failed request reads as an empty project (`page.tsx:980`, `:4242`).
- **H-116** "Modified By" is "—" on every row, and the grid footer and preview read "{size} · —" (`page.tsx:966`, `:4321`, `:4401`, `:4526`).
- **H-117** "Last Modified" shows the upload time; there is no modified time in the table (`page.tsx:956`, `:4358`).
- **H-118** Search is half-built: `filesSearch` filters the list by name but no input sets it. `filesCollapsed` and `MOCK_PROJECT_FILES` are declared and unused; the comment "Inline add-folder input" marks an empty slot (`page.tsx:934`, `:937`, `:378`, `:1022`, `:4203`).
- **H-119** The review flow cannot start: nothing in `src` sets a `project_files` row to `pending`, so "REVIEW", the Approve / Reject buttons and the Variation Orders red dot never appear; `shared` and `"approval-requested"` are never assigned, so "SHARED" and "APPROVAL REQUESTED" never appear either (`page.tsx:367-368`, `:969-972`; every insert writes `approval_status: "none"`).
- **H-120** "Copy link" copies an address with no page behind it: only `page.tsx` and `quotes/` exist under `projects/[projectId]/`, so `/projects/{id}/files/pf:<uuid>` is a 404. The success toast still shows (`page.tsx:1102`; directory listing of `src/app/(main)/projects/[projectId]/`).
- **H-121** Auto-filed invoices are rows with no file: they list under All Files only (folder `financial-documents/invoices` matches no chip), show "0 KB", preview as "Preview unavailable", and Download asks storage to sign a path that does not exist, which the route answers with 500 → toast "Download failed (500)" **[inferred from the route: `storage_path` is not a URL, so it is signed against `project-files`]** (`app/api/projects/[id]/files/route.ts:103`, `[fileId]/route.ts:93-107`, `page.tsx:1047`).
- **H-122** Folder ids disagree: the wizard writes `contract`; the tab's folder is `contracts`; the contract picker and the Key Files rail read `contract`. A contract uploaded in the wizard is absent from "Contract/VO", and one uploaded into "Contract/VO" is absent from the Key Files tile and its picker (`components/projects/draft-setup-wizard.tsx:290`, `page.tsx:382`, `app/api/projects/[id]/contract/list/route.ts:52-57`, `components/projects/key-files-rail.tsx:88-91`).
- **H-123** "Contract/VO" and "Variation Orders" are two folders for one kind of document (`page.tsx:382`, `:387`).
- **H-124** Uploading while "All Files" is open silently files everything under "Site Photos", whatever it is; a user who arrives from "Upload contract" lands on All Files (`page.tsx:1060`, `:1241`, `components/projects/key-files-rail.tsx:202`).
- **H-125** The two upload paths differ: the button reads the server's error text (then discards it for a generic toast), the drop path does not; the success verbs differ ("uploaded" / "added") (`page.tsx:1068-1080`, `:1249-1258`).
- **H-126** `dragover` is not filtered to files, so dragging text or a link over the tab lights the drop state; in list view the only drop cue is the panel's ring (`page.tsx:4065`, `:4208`).
- **H-127** The grid card's View / Download / ⋯ bar exists only on hover (`opacity-0 group-hover:opacity-100`, no touch variant), so on a touch screen in grid view "Show to homeowner" and "Delete" cannot be reached; Download and Copy link remain through the preview **[inferred from the classes]** (`page.tsx:4295`).
- **H-128** Deleting a lead-phase file here deletes it from the lead for good, and the confirm does not say the file belongs to the lead (`app/api/projects/[id]/files/[fileId]/route.ts:246-286`, `page.tsx:4593-4596`).
- **H-129** Deleting an auto-filed render removes only the row: the route asks `project-files` to remove a public `renders` URL (which matches no object there), the image stays in the Visualizer's gallery, and a portal share made for it is not withdrawn **[inferred: the DELETE route never calls share-render]** (`app/api/projects/[id]/files/[fileId]/route.ts:301-320`).
- **H-130** A render shown to the homeowner reaches the portal's Renders tab, but in Documents its row has no download link: that route signs every visible row against `project-files`, which fails for a public URL **[inferred]** (`app/api/homeowner/projects/[id]/documents/route.ts:181-193`).
- **H-131** The portal's category guess treats any name containing the letters "vo" as a variation order ("invoice", "favourite", "voucher"). Its "Renders" test sits inside the image branch, which asks for a type starting with "image/"; auto-filed rows carry the type "document" (Visualizer) or "image" (Co-Pilot), so shared AI renders are grouped under "Other" **[inferred]** (`app/api/homeowner/projects/[id]/documents/route.ts:158-170`, `lib/finance-auto-file.ts:55`, `app/api/copilot/render/route.ts:238`).
- **H-132** No server-side or client-side role rule: any member who can open the project can permanently delete files (lead files included) and expose any file to the homeowner; the handover lock banner says the project is locked while files stay editable (`page.tsx:1890-1895`, H-90).
- **H-133** The full-size original is used as the thumbnail in the 32px tile and in every grid card (H-79), and signed URLs die after an hour without a refetch, so a tab left open falls back to placeholder tiles (`app/api/projects/[id]/files/route.ts:160-161`, `page.tsx:411`).
- **H-134** Two entrance animations run together on the tab (H-61, H-62).
- **H-135** `useUploadProjectFile`, `useDeleteProjectFile` and `useGetFileUrl` have no importer; the older upload path they implement stores objects without the UUID prefix (`lib/queries/project-files.ts:48-158`; repo-wide search finds only their definitions).
- **H-136** Dates use three fixed locales inside one tab: `en-SG` for files, `en-US` for receipts, the browser's for feedback (`page.tsx:957`, `:342`, `components/projects/shared-render-feedback.tsx:26-28`).

---

## B. Key Files rail (Overview) and the file lightbox

### B1. What it is / entry points

- **H-137** "Key Files" is a card on the project's Overview with three tiles — Quote, Contract, Renders — and a "View all →" link to Files & Docs (`components/projects/key-files-rail.tsx:138-148`, mounted at `page.tsx:2444-2454`).
- **H-138** `FileLightbox` is a dark full-screen viewer used only by this card's Renders tile (`components/projects/key-files-rail.tsx:219-224`; the only importer).

### B2–B3. Layout and UI

- **H-139** Card: `rounded-2xl p-5`; heading "Key Files" (14px semibold) with "View all →" (11px primary) opposite; tiles in a grid, one column under 640 and three from 640, gap 12px (`key-files-rail.tsx:138-150`).
- **H-140** Tile: a button, `rounded-xl p-3.5`, a 36px rounded tile with a 16px icon (FileText / FileSignature / Image), a title (semibold) and one meta line; filled tiles have a solid border and a primary-tint icon; empty tiles are dashed, tinted, with a grey icon and an Upload glyph before the action words (`key-files-rail.tsx:39-74`).
- **H-141** Tile words: Quote — "{n} line item(s)" or "Upload quote"; Contract — the file name, else "Signed", or "Upload contract"; Renders — "{n} image(s)" or "Upload renders". Filled Quote and Contract tiles carry a 12px Download glyph (`key-files-rail.tsx:157-215`).
- **H-142** Lightbox: `fixed inset-0 z-50 bg-black/80`; top bar with the file name, "{i} / {n}", "Open in Files & Docs", "Open in new tab" and a round ✕; body shows the image (`object-contain`, `rounded-xl`) or, for a PDF, an iframe (max 1024px, white); round 40px ‹ › buttons at the left and right edges; a strip of 56px thumbnails at the bottom, the current one ringed white and the rest at 60% (`components/projects/file-lightbox.tsx:58-173`).

### B4. Interactions

- **H-143** Quote and Contract tiles are wrapped in a download picker: a press fetches the list of PDFs; none → toast "No downloadable files yet."; one → opens it in a new tab; two or more → a menu headed "Choose a file to download" with a badge per entry ("Signed", "Draft", "Upload") (`key-files-rail.tsx:152-195`, `components/ui/download-picker.tsx:62-140`).
- **H-144** Empty tiles and "View all →" switch to the Files & Docs tab (the empty Quote tile's own target, Finance › Contracts, is overridden by its upload action) (`key-files-rail.tsx:43`, `:174-175`, `page.tsx:2446-2453`).
- **H-145** The Renders tile opens the lightbox with the photo attachments of the project's progress updates (`key-files-rail.tsx:101-128`).
- **H-146** Lightbox keys: Escape closes; ← and → step and wrap when there is more than one file; a press on the dark backdrop closes; a press on a thumbnail jumps (`file-lightbox.tsx:41-50`, `:61`, `:158`).

### B5–B6. States and motion

- **H-147** An empty tile with no action would be disabled at 60% opacity, but all three empty tiles have an action, so none is ever disabled and the labels "No quote yet", "No contract yet", "No renders yet" are never drawn (`key-files-rail.tsx:44`, `:60-64`).
- **H-148** Tile hover: border turns primary, a 2px lift and `shadow-sm`, but the class is `transition-colors`, so the lift and shadow snap; lightbox buttons and thumbnails use `transition-colors`; the lightbox itself opens and closes with no animation (`key-files-rail.tsx:46-50`, `file-lightbox.tsx:59-60`).

### B7–B8. Rules and data

- **H-149** "Has a quote" = the project's `quoteStatus` is set and not "none" and it has line items; "has a contract" = a `project_files` row in folder `contract`, or `contractFileName`, or a client-signed quote (`key-files-rail.tsx:81-92`).
- **H-150** The render count = `project_files` rows whose stored folder is exactly `render` or `renders`, plus every photo attached to a progress update (`key-files-rail.tsx:97-119`).
- **H-151** Data: `GET /api/project-files/records?projectId=`, the progress-updates query, `/api/projects/{id}/quote/list|download` and `/api/projects/{id}/contract/list|download` (`key-files-rail.tsx:77-78`, `:154-155`, `:182-183`).

### B9. Responsive

- **H-152** Tiles stack in one column under 640; the lightbox's bar does not wrap, so the name truncates beside three controls on a phone (`key-files-rail.tsx:150`, `file-lightbox.tsx:64-103`).

### B10. Problems

- **H-153** The Renders tile counts render files but the lightbox is given only progress-update photos; when the count comes from files alone the lightbox receives an empty list, returns nothing, and the press does nothing (`key-files-rail.tsx:118-128`, `file-lightbox.tsx:52`).
- **H-154** Site progress photos are counted and shown as "Renders" (`key-files-rail.tsx:101-112`).
- **H-155** Visualizer and Co-Pilot renders are stored with folder "Renders" (capital R) and this card compares the raw value to lower-case `renders`, so AI renders are not counted here, while the tool-entry dialog's count (case-insensitive) includes them (`key-files-rail.tsx:98`, `lib/queries/project-renders.ts:15-17`, `viz:2811`).
- **H-156** The lightbox is a plain `div`: no focus trap, no scroll lock, no `role="dialog"`, no swipe, no zoom **[inferred from the markup]** (`file-lightbox.tsx:58-62`).

---

## C. Milestone drawer › "Related files"

- **H-157** What it is: a block inside the milestone drawer (Management › Milestones) captioned "Related files"; it lists the invoices tied to that milestone, newest first. It is not a list of `project_files` and has no link to the Files & Docs tab (`components/projects/milestone-related-files.tsx:20-48`, mounted at `components/projects/milestone-action-menu.tsx:472-478`).
- **H-158** Layout and UI: a caption (uppercase, tracked, disabled tone) over a bordered `rounded-xl` list with 1px dividers; each row is a full-width button `px-4 py-3`: a 14px FileText, the invoice number (medium), a 9px status badge, the amount beneath, and a 12px Eye at the right (`milestone-related-files.tsx:54-109`).
- **H-159** Status badge words and tones: "Pending Approval" (yellow), "Rejected" (red), "Draft" (grey), "Sent" (primary), "Partial" (yellow), "Paid" (green), "Overdue" (red), "Void" (grey, disabled text); approval state overrides the invoice status (`milestone-related-files.tsx:112-138`).
- **H-160** Interaction: a press opens the read-only `InvoiceQuickView` for that invoice; row hover `bg-hover-04p` with `transition-colors` (`milestone-related-files.tsx:69-74`, `:97`).
- **H-161** States: with no invoices the whole block is absent — no caption, no empty line (`milestone-related-files.tsx:48`).
- **H-162** Rule: POs are left out "for v1" because they carry no milestone link; files cannot be attached to a milestone at all (`milestone-related-files.tsx:21-23`, H-100).
- **H-163** Problem: the caption promises files and delivers invoices only; a studio cannot link a drawing, photo or sign-off to a milestone anywhere in 1.0 (`milestone-related-files.tsx:55-57`).

---

## D. Selection Receipts ("decision receipts")

- **H-164** What it is: a card under the file browser listing every material / finish selection the homeowner has answered; each entry opens a PDF "decision receipt" made on request. It is hidden when no selection has a response (`page.tsx:280-291`).
- **H-165** Layout: card `rounded-2xl`, header `px-4 pt-3 pb-2`; a horizontally scrolling, snap-aligned row of 260px tiles (`rounded-xl`, `px-3 py-2.5`) (`page.tsx:307-328`).
- **H-166** UI: header = Receipt icon, caption "Selection Receipts" (11px semibold uppercase), a count pill, and at ≥640 the note "PDF generated on download"; tile = a 32px red-tint PDF tile, the selection title (13px medium, truncates), a status chip "Approved" (green) / "Rejected" (red) / "Change requested" (yellow), the response date as "Oct 5", and a 12px Download glyph that turns primary on hover (`page.tsx:293-350`).
- **H-167** Interaction: each tile is a link to `/api/projects/{id}/selections/{selectionId}/receipt`, opened in a new tab; hover tints the border and adds `shadow-sm` (`transition-[border-color,box-shadow]`) (`page.tsx:323-328`).
- **H-168** Rules: the PDF is generated on each request and never stored; the route accepts a studio session or the homeowner's (or a preview) session; a selection not yet answered returns 409 (`app/api/projects/[id]/selections/[selectionId]/receipt/route.ts:1-14`, `:40-55`).
- **H-169** The homeowner gets the same receipts in the portal's Documents tab (`app/api/homeowner/projects/[id]/documents/route.ts:112-134`).
- **H-170** Problems: the list is cut at twelve with no "show all", and the count pill shows the cut number, so a project with twenty answers reads "12"; receipts are not files — they cannot be found by folder, shared, or deleted, and they sit outside the browser they are described as part of (`page.tsx:287-290`, `:314-316`).

---

## E. Homeowner feedback on shared renders, and the annotator

### E1. What it is / entry points

- **H-171** A card at the bottom of Files & Docs titled "Homeowner feedback on shared renders", listing every asset of type render, mood board or photo that the studio shared to this project's homeowner portal, with the homeowner's likes, comments and pins (`components/projects/shared-render-feedback.tsx:19`, `:107-145`, mounted at `page.tsx:4500`).
- **H-172** The annotator ("{title} — annotate") opens from each card's button here, and from the Visualizer's full-view header once the viewed render has been shared (`shared-render-feedback.tsx:81-102`, `viz:5631-5643`, `viz:5892-5901`).

### E2–E3. Layout and UI

- **H-173** Card: `rounded-xl p-4`; a 28px primary-tint tile with an image icon, the title (14px semibold) and the line "Likes, comments, and pinned notes on renders you shared. Drop your own pins to point things out."; below, a grid of feedback cards, one column under 640 and two from 640 (`shared-render-feedback.tsx:112-143`).
- **H-174** Feedback card: a 4:3 picture that links to the image in a new tab (hover dims it 10% and shows an external-link glyph); a top-left primary pill with a pin icon and the pin count when there are pins; then the title, three counters (heart — filled red when liked — comments, pins), "Liked by {names}", the homeowner's comments in full ("{author} · {date · time}" over the text), and a full-width outlined button (`shared-render-feedback.tsx:37-91`).
- **H-175** Button words: "Annotate render" when there are no pins, otherwise "Review {n} pin(s)" followed by "· {m} open" (`shared-render-feedback.tsx:86-89`).
- **H-176** Annotator dialog: max 896px, 95vw, no padding; header title "{title} — annotate" and "Tap the render to drop a pin the homeowner can see and reply to."; body max 80vh, image side 60% on a tinted ground and thread side 40% with a left rule (stacked under 768) (`components/projects/render-annotator-studio.tsx:127-136`, `:179`).
- **H-177** Pins: 24px numbered circles with a 2px white border and shadow, placed by percentage; studio pins are primary, homeowner pins `tertiary-blue`; a resolved pin has a green ring; the selected pin is 10% larger (`render-annotator-studio.tsx:42-45`, `:151-166`).
- **H-178** New pin box: "New pin — point something out to the homeowner", a three-row textarea (placeholder "e.g. Proposing a warmer wood tone for this cabinet — thoughts?", max 2,000), "Cancel" and "Add pin" (`render-annotator-studio.tsx:181-207`).
- **H-179** Thread card per pin: number chip, "You (Studio)" or the homeowner's name, date · time, "· Resolved" in green when resolved, the note, indented replies, a reply input (placeholder "Reply to the homeowner…") with a 28px send button, then "Mark resolved" / "Reopen" and, on the studio's own pins, "Remove" (`render-annotator-studio.tsx:216-296`).

### E4. Interactions

- **H-180** A press on the picture places a draft pin there (cursor is a crosshair) and opens the new-pin box with the textarea focused; "Add pin" saves it; a press on an existing pin or its card selects it (`render-annotator-studio.tsx:77-98`, `:158`, `:223`).
- **H-181** Enter in the reply input sends (Shift+Enter does not); the studio can resolve or reopen any pin and remove only its own (`render-annotator-studio.tsx:260`, `:276-293`).
- **H-182** Saves are not optimistic: each mutation invalidates the shared-renders query and the thread redraws from the server (`lib/queries/projects.ts:1134-1136`, `:1157-1159`, `:1193-1195`, `:1216-1218`).

### E5. States

- **H-183** Card states: loading = a centred 18px spinner; error = a red warning icon, "Couldn't load shared renders." and "Try again"; empty = "No renders shared to the homeowner portal yet. Use “Share to Portal” in Photo Renders to share one." (`shared-render-feedback.tsx:123-136`).
- **H-184** Annotator empty: an info icon, "No pins yet." and "Tap the render to point something out, or wait for the homeowner's feedback."; "Add pin" and send are disabled while blank or pending; failures toast "Couldn't add pin", "Couldn't send reply", "Couldn't update pin", "Couldn't remove pin" or the server's message (`render-annotator-studio.tsx:209-214`, `:95`, `:106`, `:113`, `:121`, `:200`, `:268`).

### E6. Motion

- **H-185** The draft pin pulses (`animate-pulse`); pins scale to 110% on hover with `transition-transform`; thread cards and the card button use `transition-colors`; the dialog uses the standard fade + 95% zoom, 200ms (`render-annotator-studio.tsx:160`, `:170`, `:224`).

### E7. Rules and logic

- **H-186** Server limits: at most 100 pins per render (409 "This render has too many pins already"); note and reply at most 2,000 characters ("Note is too long" / "Reply is too long"); position must be 0…1 ("Pin position is out of range"); removing a homeowner's pin answers 403 "You can only remove your own pins" (`app/api/homeowner-links/render-annotations/route.ts:38-40`, `:157-169`, `:226-230`, `:268-271`).
- **H-187** Identity is stamped by the server: role "studio", the member's profile name (fallback "Studio"), never from the request (`app/api/homeowner-links/render-annotations/route.ts:171-182`, `:115-131`).
- **H-188** Pins are numbered by their position in the stored array, so removing one renumbers those after it (`render-annotator-studio.tsx:151-163`).
- **H-189** No role check beyond the studio session; any member can pin, reply, resolve and remove studio pins (`app/api/homeowner-links/render-annotations/route.ts:145-147`).

### E8. Data

- **H-190** `homeowner_shared_assets` (by `project_link_id` over the project's `homeowner_project_links`): `asset_type`, `title`, `url`, `thumbnail_url`, `shared_by`, `shared_at`, `likes`, `comments`, and `metadata.annotations` (a JSON array of pins with `x`, `y`, `body`, `status`, `authorRole`, `authorName`, `createdAt`, `comments[]`) (`app/api/homeowner-links/shared-renders/route.ts:39-55`, `render-annotations/route.ts:86-107`, `:171-182`).
- **H-191** Routes: `GET /api/homeowner-links/shared-renders?projectId=`; `POST` / `PATCH` (`action: "reply" | "status"`) / `DELETE /api/homeowner-links/render-annotations` (`render-annotations/route.ts:23-26`).

### E9. Responsive

- **H-192** Feedback cards are one column under 640; the annotator stacks picture over thread under 768 with the thread scrolling inside `max-h-[80vh]` (`shared-render-feedback.tsx:138`, `render-annotator-studio.tsx:136-180`).

### E10. Problems

- **H-193** The card is drawn whether or not the studio has the homeowner portal switched on; the page checks `isPageEnabled("tools/homeowner-portal")` for the header's preview button but not here (`page.tsx:1758`, `page.tsx:4500`).
- **H-194** The homeowner's routes for like, comment and pin contain no notification or activity write, and the studio's query has no polling; feedback is seen only when someone opens this tab **[inferred: a search of `api/homeowner/projects/[id]/renders/**` for notify / notification / activity finds nothing]** (`lib/queries/projects.ts:1068-1090`).
- **H-195** The studio can reply to a pin but not to a plain comment; comments are read-only here (`shared-render-feedback.tsx:69-80`).
- **H-196** Pin writes are read-modify-write on one JSON column with no version check, so a homeowner and a designer saving at the same moment can overwrite each other **[inferred]** (`app/api/homeowner-links/render-annotations/route.ts:94-108`).
- **H-197** Feedback lives at the bottom of Files & Docs, away from the Visualizer where the render was made and from the "Renders" folder where its file sits; the empty line names a tool ("Photo Renders") the tab does not link to (`page.tsx:4496-4500`, `shared-render-feedback.tsx:135`).
- **H-198** The feedback list has no order control, no "unresolved first", no count on the tab label and no link back to the file or the room (`shared-render-feedback.tsx:138-142`).

---

## F. Photo Renders (the Visualizer from a project)

### F1. What it is / entry points

- **H-199** "Photo Renders" is a header action on the project page, not a tab: an outlined-secondary small button with a primary Sparkles icon, shown at ≥1024, aria-label "Open Photo Renders for this project", tooltip (200ms delay, below, max 240px) "Generate before/after photo renders to show the client what the space will look like." (`page.tsx:1717-1733`).
- **H-200** Below 1024 it is the second item of the header's ⋯ menu ("Invite to Portal", "Photo Renders", "Plan the Space (3D)", "Preview as Homeowner", …) (`page.tsx:1778-1803`).
- **H-201** Both open the tool-entry dialog (`setToolEntry("renders")`), shared with "Plan the Space (3D)" (`page.tsx:669`, `:1724`, `:4685-4693`).
- **H-202** The dialog (max 512px): title "Photo Renders" beside a 28px primary-tint Sparkles tile; description "Generate before/after renders to show the client what their space will look like." when the project has none, else "Pick up where you left off — {n} existing render(s) on this project — or start fresh." (`components/projects/tool-entry-dialog.tsx:37-43`, `:96-109`).
- **H-203** Dialog rows: while counting, a spinner line "Checking for existing renders…"; when there are any, a bordered row "Open Visualizer with {n} past render(s)" / "Filed in Renders on this project"; always a dashed row with a filled "+" tile, "Generate a new render" / "Project context is pre-filled — no need to pick it again."; footer "Cancel" (`tool-entry-dialog.tsx:112-116`, `:138-159`, `:161-192`).
- **H-204** Both rows close the dialog and go to the same address, `/tools/ai-visualizer?projectId={id}&leadId={leadId}`; the code comment says past renders are not re-opened individually (`tool-entry-dialog.tsx:65-90`).
- **H-205** "{n}" counts `project_files` rows whose folder starts with "render" in any case — files, not rooms or versions; it includes Co-Pilot renders, moodboards and anything uploaded by hand into Renders (`lib/queries/project-renders.ts:13-19`).
- **H-206** On arrival the tool page opens the editor at once for that project (`active = { projectId, name: "Render" }`); the `leadId` in the address is ignored because the project wins (`app/(main)/tools/ai-visualizer/page.tsx:82-85`).
- **H-207** A second, in-page route still exists: `?tab=render` on the project address draws the same editor under the project header, edge to edge, with `projectId` and `leadId` and no Back. No tab, button or link sets it; it is reachable only by typing the address, and no tab in the strip is lit while it shows **[the unlit strip is inferred: `render` is not among the strip's values]** (`page.tsx:850`, `page.tsx:4039-4044`, `page.tsx:1876-1882`; a search of `src` for `tab=render` finds nothing).

### F2. Layout

- **H-208** From the tool page the editor fills the viewport under the app's top bar (`h-full`, `h-dvh` below 1024, where the app's top bar and bottom nav are hidden in "focus mode") (`app/(main)/tools/ai-visualizer/page.tsx:111-118`, `:209-220`).
- **H-209** In the hidden in-page tab a wrapper cancels the page padding (`-mx-4 sm:-mx-6 md:-mx-8 -mt-6 -mb-6`) and sets its height to the distance from its top to the bottom of `<main>` (re-measured on resize); below 1024 it is `calc(100dvh - 3.5rem)`; the first paint uses `calc(100dvh - 10rem)` (`page.tsx:244-278`).
- **H-210** Desktop frame (≥1024): a left column — top bar 44px (Back in a 40px cell, room tabs, "Upload new room"), a dark canvas (`#1E1E2E`) with a floating vertical tool panel at its left edge, and a collapsible "Gallery" strip at the bottom — beside a 380px controls rail that runs the full height (`viz:4790-4800`, `viz:4832-4850`, `viz:4937-4967`, `components/projects/visualizer-rail.tsx:48`, `:150`).
- **H-211** Phone / tablet frame (<1024): a 56px top bar (Back · room switcher pill · versions pill · ⋯), the canvas, a tray for the active mode, a five-item dock and a persistent Generate bar; the rail's content opens as a bottom sheet (44dvh "peek" or 88dvh "full") (`components/projects/visualizer-mobile-shell.tsx:15-27`, `:99`, `viz:5473-5477`).

### F3. UI elements — a faithful summary of the editor

- **H-212** Rooms: pill tabs in the top bar (active = primary tint); the active tab has a ⋯ with "Rename room" and "Delete room"; a dashed "Upload new room" pill (title "Pick a photo — a new room is created automatically") sits outside the scroller. On phones the room pill opens a "Rooms" sheet with cover, name, "{n} render(s)", a ⋯ per room, and "Upload photo" / "Take photo" (`viz:4851-4916`, `visualizer-mobile-shell.tsx:459-524`).
- **H-213** Canvas tools (desktop, left panel): "Zoom in", "Zoom out", "Fit to screen", then once a photo is loaded "Download the current image", "Full view", (project only) "Share the current image to the homeowner portal", "Selection tool — draw a box to detect missed items", "Change photo" (`viz:4967-5039`).
- **H-214** Controls rail: a "Show surface markers" switch; a single-open accordion of "Style", "Surfaces & Materials" ("{n} set"), "Furniture" ("{n} changed"), "Lighting" (preset name or "Off"); pill tools "Style Transfer", "Auto Furnish", "Defurnish" that open as drawers over the accordion; a collapsible "Prompt" box; a "Fast" | "High quality" switch; one primary button (`viz:5398-5464`, `visualizer-rail.tsx:52-131`).
- **H-215** The primary button renames itself to the pass it will run: "Generate" (or "Generate · {n}"), "Generate from prompt", "Relight", "Style Transfer", "Auto Furnish", "Defurnish", "Render from sketch"; busy labels include "Generating…", "Checking placement…", "Defurnishing…", "Reading the room…", "Furnishing…", "Rendering…" (`viz:3880-3899`).
- **H-216** Modes in one line each: Style = named design styles or None; Style Transfer = up to three reference images with strength (Subtle · Balanced · Full), what transfers, geometry (Locked · Structural · Flexible) and an editable brief; Surfaces & Materials = detected surfaces (dots on the photo) each given a catalogue, library or uploaded material; Furniture = per item Remove · Replace · Recolour; Lighting = six presets (Daylight, Golden Hour, Warm Cozy Home, Blue Hour, Overcast, Directional Spotlight), four sliders and four fixtures, with a live no-render tweak panel after a relight; Auto Furnish = room type, "How much furniture", Quality, "Leave out", "Extra direction"; Defurnish = "Keep built-ins" or "Strip to shell"; Sketch = a detected sketch is first rendered to a photo (`components/projects/style-transfer-controls.tsx:31`, `:122-130`; `relight-controls.tsx:15-38`; `auto-furnish-controls.tsx:121-178`; `viz:366-369`; `visualizer-mobile-shell.tsx:261-263`).
- **H-217** Versions: per room, a stable "Original" plus "V1", "V2"… labelled with what made them; the desktop "Gallery" strip shows "{n} render(s)", 128×80 thumbs with hover "Compare" and a red ✕; an in-flight render is a "Rendering…" tile with "Cancel". Phones use a "Versions" sheet ("Tap to edit · compare any two") (`viz:5351-5392`, `visualizer-rail.tsx:137-220`, `visualizer-mobile-shell.tsx:528-579`).
- **H-218** Full view: a full-screen dialog with Back, the room name, a "Changes from V{n}" popover listing "{surface} → {material}", "Download", "Share", (project only) "Share to Portal", (once shared) "Annotate" / "Annotate ({n})", "Send to Chat", "Close"; a before / after slider; a bottom "Gallery · select 2 versions to compare" (`viz:5548-5761`).
- **H-219** "Save to project" switch, inside the Surfaces & Materials section: on = "Renders persist to this project."; off = "Temp mode — closing wipes the render." plus a yellow strip "Temp mode — close this and your render is gone."; it locks once a render has started (title "Locked once render starts") (`viz:4061-4084`, `viz:1711-1714`).

### F4. Interactions specific to a project

- **H-220** Rooms load from `GET /api/projects/rooms?entityType=project&entityId={projectId}` and finished renders from `GET /api/renders/jobs?entityType=project&entityId=…&status=completed`; the first room (or the one asked for) becomes active (`viz:1494-1592`).
- **H-221** "Upload new room" creates a `project_rooms` row named "Room {n}" with the project's id, uploads the cropped photo, runs detection, and resets Style to None (`viz:2283-2287`, `viz:2226-2248`, `viz:2380-2386`).
- **H-222** Rename room saves through `PATCH /api/projects/rooms/{id}`, optimistically, reverting with the toast "Couldn't rename the room" on failure (`viz:2258-2279`).
- **H-223** Delete room asks with the browser's own `confirm("Delete this room and all its renders?")`, then removes the room's images from the `renders` bucket, its `render_jobs` and the `project_rooms` row (`viz:2289-2322`).
- **H-224** Every result — generate, prompt, style transfer, auto furnish, defurnish, sketch render, relight — is saved at once: variants upload to `renders`, a `render_jobs` row is posted with `projectId`, and, for a project, one Files & Docs row per variant is filed (`viz:2754-2818`; call sites `viz:2871`, `:2930`, `:2969`, `:3443`, `:3640`, `:3770`, `:3846`).
- **H-225** "Share" (any context) makes a public link `/renders/{token}` that lasts seven days and carries the studio's branding; a dialog titled "{room} — AI Render" shows it with "7 days" (`viz:1856-1881`, `viz:5871-5878`, `app/api/renders/share/route.ts:49-75`).
- **H-226** "Share to Portal" (project + portal enabled only; in the canvas panel, the full view, the phone ⋯ menu and the relight panel) finds the project's active homeowner link, uploads a data-URL image to `renders/…/shared/{uuid}.png` first, inserts a `homeowner_shared_assets` row titled "{room} - {style or "Render"}", and toasts "Shared to homeowner portal" (`viz:1894-1956`, `viz:4818-4820`, `:5011-5020`, `:5616-5626`, `:5855`).
- **H-227** Its failures: "No homeowner linked to this project", "Failed to share to portal", "Failed to share" (`viz:1914`, `:1919`, `:1946`, `:1952`).
- **H-228** "Annotate" appears in the full view only when the viewed image's URL equals a shared asset's URL, and opens the same annotator as section E (`viz:1417-1421`, `viz:5631-5643`).
- **H-229** "Send to Chat" posts "AI Render - {room}\n{image url}" to the chat linked to the project and turns green "Sent" for two seconds (`viz:1844-1851`, `viz:5644-5657`).
- **H-230** Delete a version: optimistic, patches or deletes the `render_jobs` row, toasts "Render deleted" (`viz:3203-3245`).
- **H-231** Back in the editor returns to the Visualizer tool's own gallery (`setActive(null)`), not to the project; the page crumb reads "Render" (`app/(main)/tools/ai-visualizer/page.tsx:84`, `:102-109`, `:217`).

### F5. States

- **H-232** Loading the tool chunk: a centred shape loader, 32px, in a 256px-high box, on the tool page and in the in-page tab alike (`app/(main)/tools/ai-visualizer/page.tsx:34-37`, `page.tsx:79-82`).
- **H-233** Loading rooms: a 20px spinner on the dark canvas (`viz:5041-5042`).
- **H-234** No room yet: "Start with a room photo" / "Upload a photo of the room you want to visualise — we'll detect the surfaces and furniture automatically." with "Upload new room" and, on touch devices, "Take photo" (`viz:5043-5058`).
- **H-235** A room fetch that fails is treated as "no rooms" (the fetch falls back to an empty list), so a failure also shows the upload prompt (`viz:1551-1554`).
- **H-236** Photo rules: over 10 MB → "File too large" / "Maximum size is 10MB."; undecodable → "Unsupported image" / "Please try a JPG, PNG, or WebP."; HEIC is converted first (`viz:2364-2379`).
- **H-237** Gallery strip: empty text "No renders yet. Configure settings and generate."; disabled in temp mode with the title "Save to project to browse history." (`viz:5355-5357`).
- **H-238** A render error shows as red text under the primary button; there is no permission-denied or out-of-credits state (`visualizer-rail.tsx:128`, `viz:1383`).

### F6. Motion

- **H-239** Tool-entry dialog: standard fade + 95% zoom, 200ms; its rows ease border and fill with `transition-colors`; the counting line's icon spins (`tool-entry-dialog.tsx:96`, `:114`, `:142`, `:165`).
- **H-240** Rail drawers (Style Transfer / Auto Furnish / Defurnish) enter with `animate-in fade-in-0 slide-in-from-bottom-1 duration-150` (`visualizer-rail.tsx:76`).
- **H-241** The phone controls sheet changes height with `transition-[height] duration-200` between peek and full; the gallery and prompt chevrons rotate with `transition-transform`; gallery thumb overlays fade in on hover and are always visible on touch (`viz:5476`, `visualizer-rail.tsx:110`, `:162`, `:192-197`).
- **H-242** Canvas: cursor is "grab" and "grabbing" while panning; pan, wheel / pinch zoom and double-tap fit come from one pointer-events hook (`viz:1319-1325`, `viz:4939`).

### F7. Rules and logic specific to a project

- **H-243** A room belongs to a project through `project_rooms.project_id`; when opened from the tool page only that column is set, when opened through the hidden in-page tab both `project_id` and `lead_id` are (`viz:2232-2240`, `app/api/projects/rooms/route.ts:91-98`, `page.tsx:4042`).
- **H-244** The project's editor lists rooms by `project_id` only; rooms made for the lead before it became a project carry `lead_id` alone, and no code copies them over **[inferred: no writer of `project_rooms.project_id` exists outside the rooms route]** (`viz:1499`, `viz:1540-1544`).
- **H-245** Storage paths in the public `renders` bucket: `{studioId}/{projectId}/rooms/{roomId}/original.{jpg|png}`, `…/rooms/{roomId}/jobs/{jobId}/variant-{n}.png`, `{studioId}/{projectId}/shared/{uuid}.png` (`viz:2446-2449`, `viz:2775-2776`, `viz:1902-1903`).
- **H-246** The Files & Docs name of a render is "Render - {active room's name} - {job style} - v{variant id}.png"; the job style is the design style, or a pass label such as "Defurnished · Strip to shell", "Sketch render · {style}", "Relit · edited", or the word "Style" when blank (`viz:2810`, `viz:2870`, `viz:2929`, `viz:5860-5861`).
- **H-247** That row is what Activity reports: "{member} uploaded Render - Room 5 - Classic - v1.png to Renders" (`lib/queries/project-aggregates.ts:560-573`).
- **H-248** With "Save to project" off nothing is stored: no room row, no upload, no `render_jobs`, no file; the single result replaces the last one in memory (`viz:2227`, `viz:2249-2253`, `viz:2767`, `viz:2825-2827`).
- **H-249** Portal controls are shown only when the editor has a `projectId` and the studio's "tools/homeowner-portal" page is enabled (`viz:1278`, `viz:4818`, `:5011`, `:5616`).
- **H-250** Credits: this branch has none. `POST /api/render` checks the session, allows 10 requests a minute per IP (429 "Too many requests") and records usage events; the editor has no price, balance, or refusal for lack of credits. The word "credits" appears only in code comments about model cost (`app/api/render/route.ts:22-35`, `viz:1380`, `viz:2866`, `viz:2926`; a search of `src`, `scripts` and `supabase` for `credit_ledger` / `studio_credit_balances` finds nothing).
- **H-251** Role checks: none in the dialog or the editor; the rooms, jobs and share routes require only a studio session (`app/api/projects/rooms/route.ts:72-74`, `app/api/renders/jobs/route.ts:74-76`, `app/api/homeowner-links/share-render/route.ts:19-21`).

### F8. Data

- **H-252** `project_rooms`: `id`, `studio_id`, `name`, `project_id`, `lead_id`, `original_image_url`, `created_at` (as selected and written) (`app/api/projects/rooms/route.ts:49-56`, `:91-98`, `app/api/visualizer/workspace/route.ts:61-62`).
- **H-253** `render_jobs`: `id` (client-made UUID), `studio_id`, `room_id`, `model`, `status`, `variants_json` (`[{ id, imageUrl, materials[] }]`), `style`, `completed_at`, `project_id`, `lead_id` (`app/api/renders/jobs/route.ts:95-108`).
- **H-254** `render_share_links`: `studio_id`, `token` (16 hex), `snapshot` (images, room, style, materials, branding), `expires_at` (+7 days), `created_by` (`app/api/renders/share/route.ts:49-76`).
- **H-255** Also written from a project: `project_files` (H-94), `homeowner_shared_assets` (H-226), a chat message (H-229) (`viz:2811`, `viz:1932-1943`, `viz:1848`).
- **H-256** Routes: `GET` / `POST /api/projects/rooms`, `PATCH` / `DELETE /api/projects/rooms/[roomId]`, `GET` / `POST /api/renders/jobs`, `PATCH` / `DELETE /api/renders/jobs/[id]`, `DELETE /api/renders/jobs/by-room/[roomId]`, `POST /api/renders/share`, `POST /api/project-files/records`, the `homeowner-links` routes of section E, and the `api/render/*` generation routes (`viz:1542-1547`, `viz:2232`, `:2267`, `:2319-2321`, `:2784`, `:3231`).

### F9. Responsive

- **H-257** The header button is hidden below 1024 and the action moves into the ⋯ menu (H-200); the tool-entry dialog is the same at every width (`page.tsx:1723`, `:1783`).
- **H-258** Below 1024 the editor is the "camera-app" layout (H-211): dock "Surfaces · Furniture · Style · Lighting · Tools", a Generate bar with a "{n}×" variants menu (1–3), and sheets for Rooms, Versions, materials and controls; "Take photo" appears only on touch devices (`visualizer-mobile-shell.tsx:367-373`, `:404-453`, `viz:5053`).
- **H-259** On phones the full view's actions fold to icons plus a ⋯ holding "Share to Portal", "Annotate" and "Send to Chat"; "Changes" opens a bottom sheet (`viz:5668-5707`, `viz:5827-5843`).

### F10. Problems

- **H-260** The dialog offers two choices that do the same thing (H-204); "Open Visualizer with {n} past renders" does not open those renders, and {n} counts files, not what the editor will show (`tool-entry-dialog.tsx:84-90`, `lib/queries/project-renders.ts:13-19`).
- **H-261** One feature has four names: "Photo Renders" (button, dialog, feedback card), "Visualizer" (dialog row), "AI Visualizer" (the tool, the nav), "Render" (the crumb) (`page.tsx:1727`, `tool-entry-dialog.tsx:150`, `components/layout/app-sidebar.tsx:22`, `app/(main)/tools/ai-visualizer/page.tsx:84`).
- **H-262** The user is taken out of the project: Back leads to the tool's gallery and the crumb drops the project's name (H-231); the in-page tab that would keep them in the project is orphaned (H-207).
- **H-263** The button is not guarded by the tool's on / off switch; the lead drawer wraps the same link in `guardedToolOpen("tools/ai-visualizer", …)`, the project page does not (`page.tsx:1724`, `components/leads/lead-detail-drawer.tsx:1832`).
- **H-264** File names repeat: `v{variant id}` is the slot within one run (1–3), not the gallery's V-number, so every single-variant render of a room in a style is "… - v1.png"; all show "0 KB" and type "document" (`viz:2810`, `lib/finance-auto-file.ts:55`).
- **H-265** The name uses the active room at the moment the save finishes, so switching rooms during a render files it under the other room's name **[inferred from `activeRoom` being read inside the async tail]** (`viz:2810`).
- **H-266** Deleting a version or a room in the editor leaves its Files & Docs rows (and any portal share) behind; after a room delete the stored images are gone, so those rows have broken thumbnails and downloads **[inferred: neither path touches `project_files` or `homeowner_shared_assets`]** (`viz:2289-2322`, `viz:3203-3245`).
- **H-267** "Share to Portal" does not set `is_homeowner_visible`, so the file shows no "HOMEOWNER" pill and its menu still offers "Show to homeowner"; choosing "Hide from homeowner" later removes the share and its feedback (`viz:1932-1943`, `page.tsx:1142-1151`).
- **H-268** Re-sharing an already shared image toasts "Shared to homeowner portal" again, though nothing was added (`app/api/homeowner-links/share-render/route.ts:70-72`, `viz:1949`).
- **H-269** "Send to Chat" falls back to the studio's first chat when none is linked to the project, so a client's render can be posted into an unrelated conversation (`viz:1797-1799`).
- **H-270** "Save to project" is the only persistence control and sits inside the Surfaces & Materials section; its words say "project" for leads and standalone designs too (`viz:4059-4079`).
- **H-271** Room delete uses the browser's `confirm`, unlike every other delete in the product (`viz:2290`).
- **H-272** Room photos and renders of a client's home sit in a public bucket and are addressed by URL (`lib/storage-sign.ts:20-37` — `renders` is not in the private list; `viz:2776`).
- **H-273** A failed room load looks like a project with no rooms and invites a fresh upload (H-235).

---

## Uncertain / not verified

- Nothing was run; every "what the user sees" above is read from the code and its Tailwind classes. Rows marked **[inferred]** are worked out from the code path rather than stated by it.
- **Credits.** 2.0's own audit of 1.0's AI credits (`parity/19-…`) describes plans, a ledger and metered presses. This working tree has no such tables, routes or UI (H-250). That audit was either read from another branch or from a later state; the synthesis should decide which 1.0 is the reference before describing a render's cost inside a project.
- Whether `/tools/ai-visualizer` refuses to open when the studio's "tools/ai-visualizer" page is disabled (the project button does not check; a layout-level guard may exist) — not traced.
- Whether a database trigger or a one-off script moves a lead's `project_rooms` / `render_jobs` to the project at conversion; no application code does (H-244).
- Exact storage behaviour for H-121, H-129 and H-130 (signing or removing a path that is not an object in `project-files`) is inferred from the routes; the precise status code and message were not observed.
- Upload size ceilings imposed by the host (Next.js / Vercel request-body limits) on `POST /api/projects/[id]/files` — the route sets none; the platform's limit was not checked.
- The `Dialog` / `AlertDialog` timings come from the shared components' classes (`duration-200`); tw-animate-css defaults were not opened.
- `visualizer.tsx` was not read end to end (by instruction); the editor summary in F3 is faithful to the regions read and to the satellites' copy, but individual control states inside the panels were not inventoried here — see the earlier Visualizer audit (`parity/16-…`, `ai-visualizer-1.0-inventory/`).
- The homeowner portal's own Renders and Documents screens were read only as far as needed to say what a shared file becomes (`app/api/homeowner/projects/[id]/documents/route.ts`, the first 100 lines of `…/design/route.ts`, `app/my/projects/[projectId]/page.tsx:1245-1300`).
