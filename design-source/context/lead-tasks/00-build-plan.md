# Lead Details › Tasks — build plan (contract for the implementation)

Mocks: section `902-36216` (frames indexed in `01-listing-table.txt`). Specs measured from Figma: `01…05-*.txt` in this folder — **every number comes from those files; nothing is guessed**. Report: claude.ai artifact 2b6b5217.

## Route & data (done)
- `app/leads/[id]/tasks/page.tsx` renders `LeadOverview` (frame) with the tab body = `LeadTasks` (client). Loader `lib/leads/tasks.ts` → `fetchLeadTasks(leadId)`: `tasks: TaskRow[]` (task + assignees · tags · creator · comments (with author) · attachments (LeadFile[])), `tags`, `files` (the lead's library), `templates` (with their tasks), `team`, `now`.
- Actions `app/leads/tasks-actions.ts`: createTask · updateTask (title / description / dueAt / done / kind) · markTaskSeen · setTaskAssignees · setTaskTags · duplicateTasks · deleteTasks · createTag / renameTag / deleteTag · addComment / editComment / deleteComment · attachFiles / detachFile · saveTemplate · applyTemplate. Schema: `lead_tasks` + creator_id / description / seen_at / updated_at; `tags`, `task_tags`, `task_assignees`, `task_comments`, `task_attachments`, `task_templates`, `template_tasks` (migration 0005; seed `scripts/seed-tasks.ts`).

## Components

| Component | File | Spec | Props |
|---|---|---|---|
| `TasksTable` | `components/leads/tasks/tasks-table.tsx` | 01 · 02 | `{ tasks: TaskRow[]; now: number; selected: Set<string>; onSelect(ids: Set<string>); unseen: Set<string>; adding: boolean; onAddSubmit(title) ; onAddCancel(); renaming: string \| null; onRenameSubmit(id, title); onRenameCancel(); onOpen(task, anchor); onToggleDone(task); onAssign(task, anchor); onDue(task, anchor); onAddTags(task, anchor); onRowMenu(task, action: 'complete'\|'rename'\|'template'\|'duplicate'\|'delete'); onEdit(task) }` |
| `TasksToolbar` | `components/leads/tasks/tasks-toolbar.tsx` | 01 | `{ query; onQuery; onAdd(kind: 'new'\|'template'); onFilter(); filterCount; onMenu(action: 'saveAll'\|'manage'\|'export'\|'deleteAll') }` |
| `TasksBulkBar` | `components/leads/tasks/tasks-bulk-bar.tsx` | 03 (bulk bar) | `{ count; total; onTemplate(); onDuplicate(); onDelete(); onClear() }` — "Delete All" variant when count === total |
| `Drawer` | `components/om/drawer.tsx` | 03 · 04 | `{ open; title; crumb?; onBack?; actions?: ReactNode; footer?: ReactNode; onClose; children; width?: 400 }` — right panel, 64px head (80 with a crumb), scrolling body p24, sticky footer 68 |
| `TaskPanel` | `components/leads/tasks/task-panel.tsx` | 03 | `{ task: TaskRow; team: Member[]; tags: Tag[]; onClose; onComments(); onAttach(); onMenu(action: 'template'\|'delete'); onChange(patch: { title?; description?; dueAt? }); onAssign(anchor); onTags(tagIds: string[]); onManageTags(); onToggleDone(); onDetach(fileId) }` |
| `TagPicker` | `components/leads/tasks/tag-picker.tsx` | 03 (Add Tag dropdown) | `{ open; tags: Tag[]; value: string[]; onChange(ids); onManage(); onClose; anchor }` — search field + checklist + "Manage Tags" |
| `ManageTagsDialog` | `components/leads/tasks/manage-tags-dialog.tsx` | 03 | `{ open; tags; onClose; onRename(id, name); onDelete(id); onCreate(name) }` |
| `CommentsPanel` | `components/leads/tasks/comments-panel.tsx` | 04 | `{ task: TaskRow; me: Member; now; onBack; onClose; onAdd(body); onEdit(id, body); onDelete(id) }` |
| `AttachFilesModal` | `components/leads/tasks/attach-files-modal.tsx` | 04 | `{ open; files: LeadFile[]; attached: string[]; onClose; onAttach(fileIds); onUploadPicked(file?: File) }` — dropzone (REG-149 flow: any file → "Uploading…" toast → the mock's file) + "Your files" grid |
| `TasksFiltersModal` | `components/leads/tasks/tasks-filters-modal.tsx` | 05 | `{ open; team; tags; value: TaskFilters; onApply(v); onClose }` (Sort · Assignees · Creators · Status · Tags · Date) |
| `ChooseTemplateDialog` / `SaveTemplateDialog` | `components/leads/tasks/template-dialogs.tsx` | 05 | choose: `{ open; templates; onSelect(id); onManage(); onClose }` · save: `{ open; templates; onSave({ name?, templateId?, keepMembers, keepDescription }); onClose }` |
| `DeleteTasksDialog` | `components/leads/tasks/delete-dialog.tsx` | 05 | `{ open; all: boolean; onNo; onYes }` |

Reuse: `AssignPopover` (task assignees), `DatePicker` (due cell + panel DateField), `ExportDialog` (retitled "Export Tasks"), `FiltersModal` shell patterns, `Dropdown`, `IconButton`, DS `Button` / `Tag` / `Checkbox` / `Switch`, `TextField` / `DateField`, `Tooltip`, `useComingSoon`, `FileTile`, `Dropzone`.

## Rules
- Row 48 · head 56 · columns 56 · 582 · 160 · 137 · 118 · 191 (fluid = the last columns share the remainder; at 1440 the table is 1244). Title column rule: 1px at rest (REG-144), not the mock's 2px.
- "New" band = `seenAt === null` (REG-131 for tasks); first open marks it seen.
- Overdue = open + due before today → date in tertiary-red; completed tasks stay ink.
- Menus toggle on their own trigger (REG-153); every icon-only control has a Tooltip (REG-75); inert affordances → coming soon (Manage Templates, file-type filter, grid/list toggle, upload retry, "View" links).
- Copy from the mocks verbatim; the panel kebab reads "Save as Template" (mock had "Save to Template" — one phrase, logged).
