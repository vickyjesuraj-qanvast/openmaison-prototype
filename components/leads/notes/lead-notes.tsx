'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Link } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { AutoFillDialog, SuggestedTasksDialog } from '@/components/leads/move-stage/dialogs'
import { LinkButton } from '@/components/leads/move-stage/fields'
import { AttachFilesModal, type UploadAnswer } from '@/components/leads/tasks/attach-files-modal'
import { refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { uploadPicked as uploadPickedFile } from '@/components/leads/files/upload-picture'
import { moveStageHref } from '@/lib/leads/move-link'
import { withFrom } from '@/lib/nav'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { LeadFile } from '@/lib/db/schema'
import { displayDateTimeDot, formatInputDateTime, parseInputDateTime } from '@/lib/format'
import { bodyText, draftFrom, emptyDraft, filterNotes, listSecondary, listTitle, validateDraft, type NoteDraft, type NoteFilter, type NoteKind } from '@/lib/leads/note-model'
import type { LeadNotesData, NoteRow } from '@/lib/leads/notes'
import { filterByQuery } from '@/lib/search'
import { reminderTaskTitle } from '@/lib/leads/enums'
import { createNote, deleteNote, setNoteAttachments, updateNote } from '@/app/leads/notes-actions'
import { createTask } from '@/app/leads/tasks-actions'
import { NotesList } from './notes-list'
import { NoteEditor } from './note-editor'
import { ContactEditor } from './contact-editor'
import { PaneHeader, PaneToolbar } from './pane-toolbar'
import { NotesToolbar } from './notes-toolbar'
import { AttachmentsColumn } from './attachments-column'
import { DeleteNoteDialog } from './delete-dialog'
import styles from './lead-notes.module.css'

/**
 * Lead Details › Notes (931-44865): the tab's state — the 1244×844 card (list column 360 + pane 884, spec 01), selection,
 * the unsaved draft, per-note edits, the filter chips, New ▾, the list kebab (Edit · Delete), Auto Fill → Add tasks,
 * attachments and delete. Actions run through the tabs' shared `useRun` (notes-actions revalidates this route, so the
 * saved data arrives with the action's own response); the `?new=` landing param and the `om:notes:new` event through
 * `useCreateIntent`. Specs: design-source/context/lead-notes/00-build-plan.md · 01-layout-list-editor.txt ·
 * 02-contact-log-dialogs.txt.
 *
 * State model (plan › Rules): notes come from the loader in creation order; one `draft` (unsaved New › Note / Contact Log)
 * sits last in the list and is selected; `edits[id]` holds a saved note's live changes (dirty = differs from `draftFrom(note)`;
 * an edit equal to the note is never stored); contact logs open in view and switch to editing via Edit / kebab Edit
 * (`contactEditing`); validation shows after the first Save (`showErrors`). A saved draft / edit stays on screen until the
 * revalidated data carries it (`savedDraftId` / `pending`, retired in the render-phase adjust) so nothing flashes back.
 * `pending[id]` is the snapshot that went to the server (normalised = what the row will read back), so keystrokes typed
 * while the save is in flight never stop it from settling — they simply keep the note dirty afterwards. The create path
 * has the same answer since REG-286: the draft's keystrokes are carried onto the new row as its edit (adjust 1) and the
 * editor keeps the draft's key across the handover, so nothing is remounted and nothing is typed into a dying draft.
 */

const DRAFT_ID = 'draft'
/** The unsaved item: the draft fields + its attachments + the per-item state a saved note keeps in the sets below. */
type DraftItem = NoteDraft & { id: typeof DRAFT_ID; fileIds: string[]; createdAt: number; editing: boolean; showErrors: boolean }
const freshDraft = (kind: NoteKind, at: number): DraftItem => ({ ...emptyDraft(kind), id: DRAFT_ID, fileIds: [], createdAt: at, editing: kind === 'contact', showErrors: false })
const fieldsOf = (d: NoteDraft): NoteDraft => ({ kind: d.kind, title: d.title, body: d.body, channel: d.channel, when: d.when, outcome: d.outcome, nextStepWhen: d.nextStepWhen, nextStepMode: d.nextStepMode })
const same = (a: NoteDraft, b: NoteDraft) => JSON.stringify(fieldsOf(a)) === JSON.stringify(fieldsOf(b))
const draftDirty = (d: DraftItem) => d.fileIds.length > 0 || !same(d, emptyDraft(d.kind))
/** What gets persisted — the exact shape the row reads back after the refresh: the title trimmed (notes-actions `columns`
 *  trims it too, so the stored edit equals the saved row) and the next-step fields only with an outcome that has a next step. */
const normalise = (d: NoteDraft): NoteDraft => ({ ...fieldsOf(d), title: d.title.trim() })   // (REG-319) the schedule pair stays whatever the outcome
const without = <T,>(set: Set<T>, ids: T[]) => { const s = new Set(set); ids.forEach((id) => s.delete(id)); return s }
const withId = <T,>(set: Set<T>, id: T) => new Set(set).add(id)

/* Auto Fill (plan › Rules, invented copy logged in the register): what the "uploaded" conversation fills in, and the Add tasks suggestion. */
const AUTO_FILL_BODY = 'Client confirmed the renovation scope over WhatsApp and asked for a site visit next week.'
const AUTO_FILL_DAYS = 3
const AUTO_FILL_HOUR = 19
const SUGGESTIONS = ['Prepare sample designs and floor plan illustrations for the client']

/* (UX audit 2026-09-30, T3) A Met-stage meeting log reads as what it is — "Meeting log", its remarks or where it happened. */
const isMeetingRow = (n: NoteRow | undefined) => n?.stageKind === 'Met'
const titleOf = (n: NoteRow, cur: NoteDraft) => (isMeetingRow(n) ? 'Meeting log' : listTitle(cur))
const secondaryOf = (n: NoteRow, cur: NoteDraft) => {
  if (!isMeetingRow(n)) return listSecondary(cur)
  return bodyText(cur.body).split('\n').map((l) => l.trim()).find(Boolean) ?? cur.channel ?? 'No notes yet'
}

/** `stage` (UX audit 2026-09-30, L2): the lead's stage — a contact log saved on a New lead offers the move to Contacted. */
export function LeadNotes({ leadId, data, stage = null }: { leadId: string; data: LeadNotesData; stage?: string | null }) {
  const { notes, files, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()

  /* ── items ── */
  // A lead with no notes opens on a blank note draft (frame 79); `now` is the loader's clock — no clock read in render.
  const [draft, setDraft] = useState<DraftItem | null>(() => (notes.length ? null : freshDraft('note', now)))
  /* (REG-709) `?open=<id>` — a note or a log the global search found — opens on it; otherwise the top item, newest first (REG-262) */
  const opening = useSearchParams().get('open')
  const [selectedId, setSelectedId] = useState<string | null>(() => (opening && notes.some((n) => n.id === opening) ? opening : notes.length ? notes[0]!.id : DRAFT_ID))
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [query, setQuery] = useState('')   // the list's search (REG-275) — matched against what an item shows, below
  const [edits, setEdits] = useState<Record<string, NoteDraft>>({})
  const [contactEditing, setContactEditing] = useState<Set<string>>(() => new Set())
  const [showErrors, setShowErrors] = useState<Set<string>>(() => new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null)   // createNote's id — the draft retires once the data carries it
  const [pending, setPending] = useState<Record<string, NoteDraft>>({})   // updateNote'd ids → the saved snapshot; the edit retires once the data carries it
  /* (REG-286) The row a draft just became, with the key the editor wore while it was that draft — see `editorKey`. */
  const [carried, setCarried] = useState<{ id: string; key: string } | null>(null)
  /* Mobile master-detail push (REG-269): ≤767 the list is the screen; selecting shows the pane full-width with
     a back affordance. Back never clears selectedId — the CSS just swaps which half shows; inert ≥768. */
  const [mobilePane, setMobilePane] = useState(() => !!opening && notes.some((n) => n.id === opening))   // (REG-709) a found note shows at once
  /* (REG-380, canvas 3e) ≤767 a CONTACT LOG opens as a bottom sheet, not the master-detail push: the pane put its
     Cancel / Save far below the fold. Notes keep the push (they autosave and have no footer). False at ≥768 by
     construction — the primitive's own query is (max-width: 767px) — so the desktop pane is untouched. */
  const sheetLayout = useSheetLayout()
  /* (REG-294, user 2026-09-02: "when i start typing within search bar ... it moves to note editor automatically")
     Whether the editor about to mount may take the caret. The editor is keyed on the item, so a new selection
     REMOUNTS it and its first field's autoFocus fires. That is right when the user chose the item (clicked a row,
     pressed New) and wrong when the selection moved on its own — which is what searching does: the query narrows
     the list, the selected row drops out, the fallback below picks another, and the caret was stolen out of the
     search box mid-word. So intent, not mounting, decides. */
  const [mayFocusEditor, setMayFocusEditor] = useState(true)

  /* ── overlays ── */
  const [deleting, setDeleting] = useState<{ id: string; kind: NoteKind } | null>(null)
  const [attachFor, setAttachFor] = useState<string | null>(null)
  const [autoFillFor, setAutoFillFor] = useState<string | null>(null)
  const [tasksFor, setTasksFor] = useState<{ id: string; autoAdded: string; /** (REG-608) the schedule's moment, the reminder's due date */ when: string; picked: Set<string> } | null>(null)

  const byId = new Map(notes.map((n) => [n.id, n]))
  const fileById = new Map(files.map((f) => [f.id, f]))
  /** Derived from the Contacted stage's logs (REG-265): view-only here — edited in the Move stage window, never deleted. */
  const isStage = (id: string | null): boolean => !!id && id !== DRAFT_ID && byId.get(id)?.origin === 'stage'
  const isMeeting = (id: string | null): boolean => !!id && id !== DRAFT_ID && isMeetingRow(byId.get(id))
  /** The item's live fields: the draft, the note's edit, or the note as saved. */
  const currentOf = (id: string): NoteDraft | null => {
    if (id === DRAFT_ID) return draft ? fieldsOf(draft) : null
    const n = byId.get(id); if (!n) return null
    return edits[id] ?? draftFrom(n)
  }

  /** (REG-286) The editor's key while a draft is open — per draft SESSION, so the next draft still remounts it. */
  const draftKey = draft ? `draft-${draft.createdAt}` : DRAFT_ID

  /* ── render-phase adjusts (no setState in effects) ── */
  // 1. The saved draft arrived with the revalidated data: retire the draft and select the real note.
  if (savedDraftId && byId.has(savedDraftId)) {
    const row = byId.get(savedDraftId)!
    setSavedDraftId(null)
    /* (REG-286, audit "the create path has no equivalent of `pending`"): anything typed while createNote was in
       flight lives in the draft alone, and retiring the draft used to throw it away. The update path parks such
       keystrokes in `edits` and lets the autosave commit them — so the create path parks them there too. */
    if (draft && !same(normalise(fieldsOf(draft)), draftFrom(row))) { const typed = fieldsOf(draft); setEdits((e) => ({ ...e, [savedDraftId]: typed })) }
    setDraft(null)
    /* (REG-286) Take the selection only while the draft is still what is on screen: a save flushed on the way
       out (the autosave block below) must not yank the user back off the item they had moved to. */
    if (selectedId === DRAFT_ID) { setSelectedId(savedDraftId); setCarried({ id: savedDraftId, key: draftKey }) }
  }
  // 2. Saved edits arrived (the row now reads as the snapshot that was sent, or the note went): the save has settled.
  //    The edit is dropped — and editing left — only where it still equals the row; anything typed meanwhile stays dirty.
  const settled = Object.keys(pending).filter((id) => { const n = byId.get(id); const snap = pending[id]; return !n || !snap || same(snap, draftFrom(n)) })
  const retired = settled.filter((id) => { const n = byId.get(id); const e = edits[id]; return !n || !e || same(e, draftFrom(n)) })
  if (settled.length) {
    setPending((p) => { const c = { ...p }; settled.forEach((id) => delete c[id]); return c })
    setEdits((e) => { const c = { ...e }; retired.forEach((id) => delete c[id]); return c })
    setContactEditing((s) => without(s, retired))
    setShowErrors((s) => without(s, retired))
  }
  // 3. Nothing left at all → the blank note draft again (frame 79).
  if (!draft && !savedDraftId && (notes.length === 0 || sheetLayout)) setDraft(freshDraft('note', now))

  /* Search (REG-275, lib/search.ts): a row matches what it SHOWS — its title, its secondary line and the date the
     list prints (`displayDateTimeDot`, the list's own formatter, never the raw timestamp) — plus the note's BODY as
     plain text: the secondary line IS the body's first line, so a body hit is what the row summarises. `bodyText`
     strips the rich markup (REG-252) so "div" matches nothing. Rows carry their live fields (an unsaved edit
     included) so the search reads the same words the item shows. No phone column here — notes hold no numbers. */
  const rows = filterNotes(notes, filter).map((n) => ({ note: n, cur: edits[n.id] ?? draftFrom(n) }))
  const matched = filterByQuery(rows, query, ({ note, cur }) => ({
    fields: [titleOf(note, cur), secondaryOf(note, cur), bodyText(cur.body), displayDateTimeDot(note.createdAt)],
  }))
  // The list, newest first (REG-262): the draft on top — it is the item being written, the newest of all, and it is
  // never filtered out (no chip and no query hides the thing you are typing) — then the matched notes (created desc).
  const items = [
    /* (REG-402) …except on a phone, where a NOTE draft is the docked composer at the foot of the screen (995:23383)
       and not a row: an untitled row above the notes you already have is noise, and the thing being typed is
       already on screen. A contact-log draft still takes a row — it opens as a sheet, not in the composer. */
    ...(draft && !(sheetLayout && draft.kind === 'note') ? [{ id: DRAFT_ID, kind: draft.kind, title: listTitle(draft), secondary: listSecondary(draft), createdAt: new Date(draft.createdAt), draft: true }] : []),
    ...matched.map(({ note, cur }) => ({ id: note.id, kind: cur.kind, title: titleOf(note, cur), secondary: secondaryOf(note, cur), createdAt: note.createdAt, locked: note.origin === 'stage', meeting: isMeetingRow(note) })),
  ]
  // 4. Selection follows the visible list: default = the draft, else the top item — the newest.
  if (!(selectedId && items.some((i) => i.id === selectedId))) {
    const fallback = draft ? DRAFT_ID : (items[0]?.id ?? null)
    if (fallback !== selectedId) { setSelectedId(fallback); setMayFocusEditor(false) }   // (REG-294) nobody asked for this one
  }
  // 5. (REG-286) The key a note carried over from its draft lasts only while that note stays selected.
  if (carried && carried.id !== selectedId) setCarried(null)

  /** New ▾ › Note / Contact Log, the Overview quick link and `?new=`: one draft at a time — a dirty draft is kept (and selected) rather than replaced. */
  const startDraft = useCallback((kind: NoteKind) => {
    const at = Date.now()
    setDraft((prev) => (prev && draftDirty(prev) ? prev : freshDraft(kind, at)))
    setSelectedId(DRAFT_ID)
    setMobilePane(true)   // (REG-347) ≤767 the pane takes the screen, as select() does — without it New ▾ looked inert
    setMayFocusEditor(true)   // New ▾ exists to start typing (REG-294)
  }, [])

  // Create quick links › Note lands here with ?new=note|contact (one draft, then the param is dropped — as lead-quotes.tsx);
  // on this tab the quick link raises `om:notes:new` with { kind }.
  useCreateIntent<NoteKind>({
    event: CREATE_EVENTS.notes,
    landing: { href: `/leads/${leadId}/notes`, values: ['note', 'contact'] },
    onIntent: (value, detail) => { const kind = value ?? (detail as { kind?: NoteKind } | undefined)?.kind; startDraft(kind === 'contact' ? 'contact' : 'note') },
  })

  /* ── per-item handlers ── */
  const select = (id: string) => {
    /* (REG-286) Autosave's safety net (`flushLeft`, the autosave block below): the item being left commits now
       instead of losing the debounce it was waiting on. Contact logs are never armed — their Cancel / Save stands. */
    flushLeft(id)
    setSelectedId(id)
    setMayFocusEditor(true)   // the user picked this item — the caret belongs in it (REG-294)
    setMobilePane(true)   // ≤767 the pane takes the screen (REG-269); inert at every wider width
    /* Leaving a pristine draft drops it (nothing typed, nothing lost); a dirty draft keeps its row (plan › Rules).
       (REG-402) Not on a phone: there the pristine draft is the empty composer, which stays where it is drawn —
       dropping it would only make the render-phase adjust above mint another one on the very next render. */
    if (id !== DRAFT_ID && notes.length && !sheetLayout) setDraft((prev) => (prev && !draftDirty(prev) ? null : prev))
  }
  const change = (id: string, patch: Partial<NoteDraft>) => {
    if (id === DRAFT_ID) { setDraft((prev) => (prev ? { ...prev, ...patch } : prev)); return }
    const n = byId.get(id); if (!n) return
    const next = { ...(edits[id] ?? draftFrom(n)), ...patch }
    setEdits((e) => { const c = { ...e }; if (same(next, draftFrom(n))) delete c[id]; else c[id] = next; return c })
  }
  const clearEdit = (id: string) => {
    setEdits((e) => { const c = { ...e }; delete c[id]; return c })
    setContactEditing((s) => without(s, [id]))
    setShowErrors((s) => without(s, [id]))
  }
  const edit = (id: string) => {
    if (isStage(id)) return   // the stage's record — edited in the Move stage window (REG-265)
    select(id)
    if (id === DRAFT_ID) setDraft((prev) => (prev ? { ...prev, editing: true } : prev))
    else if (byId.get(id)?.kind === 'contact') setContactEditing((s) => withId(s, id))
  }
  const cancel = (id: string) => {
    if (id === DRAFT_ID) setDraft(null)   // adjust 3 brings a blank draft back when the lead has no notes
    else clearEdit(id)
  }
  /* (REG-286) One save in flight per item. The debounce and a flush can fire for the same item inside one tick
     (leaving the tab flushes exactly what the timer was about to send), and `savingId` cannot stop the second —
     it is state the flush's closure has not seen yet. The ref is read in handlers and effect cleanups only. */
  const inflight = useRef<Set<string>>(new Set())
  /* (REG-319, mock 781:58313: "If you wish to be reminded, a task will be created.") A contact log saved with a schedule
     opens Add tasks with the reminder auto-added — the Move stage window's own journey — so the helper's promise holds
     here too. Cancel there adds nothing; the log is already saved. */
  const offerReminder = (id: string, d: NoteDraft) => {
    if (d.kind !== 'contact' || !d.nextStepWhen) return
    setTasksFor({ id, autoAdded: reminderTaskTitle(d.nextStepWhen, d.nextStepMode), when: d.nextStepWhen, picked: new Set() })
  }
  const save = async (id: string) => {
    if (inflight.current.has(id)) return
    const cur = currentOf(id); if (!cur) return
    const d = normalise(cur)
    if (Object.keys(validateDraft(d)).length) {
      if (id === DRAFT_ID) setDraft((prev) => (prev ? { ...prev, showErrors: true } : prev)); else setShowErrors((s) => withId(s, id))
      return
    }
    const noun = d.kind === 'contact' ? 'contact log' : 'note'
    /* A note saves ITSELF (REG-263, autosave) — announcing every pause would be noise, so only the contact
       log's explicit Save gets the toast — and (UX audit 2026-09-30, L2 · T3) its next step as the action. */
    const contact = d.kind === 'contact'
    if (id === DRAFT_ID) {
      /* One draft creates ONE note (REG-285). `savingId` clears the moment createNote resolves, while the draft
         is still mounted and still dirty — so the autosave key went live again and, if the revalidated data did
         not yet carry the new row (a read replica behind the write, split read/write services, a dropped
         revalidation), the 900ms debounce fired createNote again, and again. `savedDraftId` is set for the rest
         of the draft's life, so it is the durable guard the in-flight flag cannot be. */
      if (savedDraftId) return
      const fileIds = draft?.fileIds ?? []
      inflight.current.add(id); setSavingId(id)
      try { const newId = await createNote(leadId, d, fileIds); setSavedDraftId(newId); if (contact) snackbar(logSaved(newId)); offerReminder(id, d) }
      catch { fail(`save the ${noun}`) }
      finally { inflight.current.delete(id); setSavingId(null) }
      return
    }
    const n = byId.get(id); if (!n) return
    if (same(d, draftFrom(n))) { clearEdit(id); return }   // nothing changed — just leave editing
    inflight.current.add(id); setSavingId(id)
    try { await updateNote(id, d); setEdits((e) => ({ ...e, [id]: d })); setPending((p) => ({ ...p, [id]: d })); if (contact) snackbar(logSaved(id)); offerReminder(id, d) }
    catch { fail(`save the ${noun}`) }
    finally { inflight.current.delete(id); setSavingId(null) }
  }

  const itemMenu = (id: string, action: 'edit' | 'delete') => {
    if (isStage(id)) return   // both items render disabled for a stage log (REG-265); this is the backstop
    if (action === 'edit') { edit(id); return }
    if (id === DRAFT_ID) {
      // A draft with something typed confirms like everything else (REG-264); a pristine one just drops.
      if (draft && draftDirty(draft)) setDeleting({ id: DRAFT_ID, kind: draft.kind })
      else setDraft(null)
      return
    }
    const n = byId.get(id); if (n) setDeleting({ id, kind: n.kind === 'contact' ? 'contact' : 'note' })
  }

  /* (UX audit 2026-09-30, L2 · T3) What a saved contact log leads to, on the save's own snackbar: on a New lead the move to Contacted
     (the Move stage window with this log filled in); otherwise Add tasks (the Tasks tab's add row). `?from=` rides along (REG-465). */
  const origin = useSearchParams().get('from')
  const keepFrom = (href: string) => (origin ? withFrom(href, origin) : href)
  const logSaved = (id: string) => (stage === 'New'
    ? { message: 'Contact log saved', actionLabel: 'Move to Contacted', onAction: () => router.push(keepFrom(moveStageHref(leadId, 'contacted', { log: id }))) }
    : { message: 'Contact log saved', actionLabel: 'Add tasks', onAction: () => router.push(keepFrom(`/leads/${leadId}/tasks?add=1`)) })
  /* (UX audit 2026-09-30, T1 — supersedes REG-149's stand-in here) Attach files › a picked file goes through the Files tab's own upload
     (`uploadFile`, REG-684: an image keeps its picture) and hands its real id back, so the modal ticks it and the log / note saves with a
     file that exists. A refused upload says so and the modal's row reads Failed. */
  /* (UX audit 2026-09-30, T1) The Files tab's own upload (uploadPicked, shared with the Tasks tab): the modal lists and ticks the file it hands
     back; a refusal reads Failed with Retry and says why. */
  const uploadPicked = async (file?: File): Promise<UploadAnswer> => {
    if (!file) return null
    try {
      const r = await uploadPickedFile(leadId, file)
      if (r && 'error' in r) fail(`upload ${file.name}`, r.error)
      else router.refresh()
      return r
    } catch (e) { fail(`upload ${file.name}`, refusalOf(e)); return null }
  }

  /* ── attachments ── */
  const attachedIds = (id: string): string[] => (id === DRAFT_ID ? (draft?.fileIds ?? []) : (byId.get(id)?.attachments.map((f) => f.id) ?? []))
  const setAttached = (id: string, fileIds: string[], what: string, done?: string) => {
    if (id === DRAFT_ID) { setDraft((prev) => (prev ? { ...prev, fileIds } : prev)); if (done) snackbar({ message: done }); return }
    void run(what, () => setNoteAttachments(id, fileIds), done)
  }

  /* ── Auto Fill → Add tasks (plan › Rules) ── */
  const autoFill = () => {
    const id = autoFillFor; setAutoFillFor(null); if (!id) return
    const at = new Date()   // the clock is read in the handler, never in render
    const next = new Date(at); next.setDate(next.getDate() + AUTO_FILL_DAYS); next.setHours(AUTO_FILL_HOUR, 0, 0, 0)
    change(id, { channel: 'WhatsApp', when: formatInputDateTime(at), outcome: 'Connected', nextStepWhen: formatInputDateTime(next), nextStepMode: 'In person', body: AUTO_FILL_BODY })
    setTasksFor({ id, autoAdded: reminderTaskTitle(formatInputDateTime(next), 'In person'), when: formatInputDateTime(next), picked: new Set() })   // (REG-319) the same reminder title everywhere
  }
  const addTasks = () => {
    const t = tasksFor; setTasksFor(null); if (!t) return
    const picked = SUGGESTIONS.filter((s) => t.picked.has(s))
    const n = picked.length + (t.autoAdded ? 1 : 0)
    /* (REG-608) The reminder is a dated Follow-up for the lead's members — 1.0's follow-up task; the suggestions stay plain. */
    void run('add the tasks', async () => {
      if (t.autoAdded) await createTask(leadId, t.autoAdded, { kind: 'Follow-up', dueAt: parseInputDateTime(t.when), assignLeadMembers: true })
      for (const title of picked) await createTask(leadId, title)
    }, n === 1 ? '1 task added' : `${n} tasks added`)
  }

  /* ── the selected item ── */
  const selected = selectedId ? currentOf(selectedId) : null
  const selectedNote = selectedId && selectedId !== DRAFT_ID ? byId.get(selectedId) ?? null : null
  const attachments: LeadFile[] = selectedId === DRAFT_ID
    ? (draft?.fileIds ?? []).map((id) => fileById.get(id)).filter((f): f is LeadFile => !!f)
    : (selectedNote?.attachments ?? [])
  /* (REG-286, audit "the draft → saved handover remounts the editor") The editor's identity. Normally the item's
     id — moving to another item must tear the editor down (fresh autoFocus, fresh body). The exception is the
     draft becoming its own saved row: the SAME item under a new id, so it keeps the key it wore as a draft and
     the editor is never remounted mid-save — the caret stays where the user is typing instead of being thrown
     back to Title, which is what `key={selectedId}` did the moment DRAFT_ID turned into the real id. */
  const editorKey = selectedId === DRAFT_ID ? draftKey : carried?.id === selectedId ? carried.key : selectedId
  const isDirty = (id: string) => (id === DRAFT_ID ? (draft ? draftDirty(draft) : false) : !!edits[id] && !pending[id])
  const isEditing = (id: string) => (id === DRAFT_ID ? !!draft?.editing : contactEditing.has(id))
  const errorsFor = (id: string, d: NoteDraft) => ((id === DRAFT_ID ? !!draft?.showErrors : showErrors.has(id)) ? validateDraft(d) : {})

  /* ── Notes autosave (REG-263, user 2026-09-01: "it can be auto saved like apple notes … why do we need a
     button") ── a NOTE commits itself ~900ms after typing pauses; the timer re-arms on every change (the key
     serialises the current draft), and a new note's first pause CREATES its row. Contact logs keep the
     explicit Edit → Save — structured fields need a validation commit point. */
  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save })
  /** Every item that owes the DB a save of its own: the dirty draft and any dirty NOTE edit, minus whatever is
   *  already in flight. Contact logs are never here — they commit through their explicit Save (validation needs
   *  a commit point), and a stage-derived log is not editable at all (REG-265). */
  const autosaveIds = [
    /* `!savedDraftId` (REG-285): once the draft has been created, it is waiting to be replaced by its real
       row — scheduling another save for it would create a second note. */
    ...(draft && draft.kind === 'note' && !savedDraftId ? [DRAFT_ID] : []),
    ...Object.entries(edits).filter(([, e]) => e.kind === 'note').map(([id]) => id),
  ].filter((id) => isDirty(id) && savingId !== id && !isStage(id) && (id === DRAFT_ID || byId.has(id)))
  const autosaveId = selectedId && autosaveIds.includes(selectedId) ? selectedId : null
  const autosaveKey = autosaveId && selected ? `${autosaveId} ${JSON.stringify(fieldsOf(selected))}` : null
  useEffect(() => {
    if (!autosaveId || !autosaveKey) return
    const t = setTimeout(() => { void saveRef.current(autosaveId) }, 900)
    return () => clearTimeout(t)
  }, [autosaveId, autosaveKey])

  /* (REG-286, audit "typing is lost when you leave the tab inside the debounce" + "only the selected note ever
     autosaves") — the debounce is the common case; the two below are the safety net, at the moments the timer
     would otherwise be thrown away with the text still in memory and nowhere else:
       · LEAVING THE ITEM — `flushLeft` runs from the handlers that move the selection (`select`, and New ▾ in
         the list below), so what is being left commits at once. It is also the answer to the second finding:
         a note left dirty while another is selected can no longer sit unsaved forever. Flushing on the switch,
         rather than running a debounce per dirty note, keeps ONE timer and makes the moment that ends the edit
         the moment that ends the save. A handler runs after the commit, so it sees the state on screen —
         nothing here can resurrect a draft that was deleted in the same breath.
       · LEAVING THE TAB — the unmount cleanup commits EVERYTHING still owed. It covers the selection moving on
         its own (a filter hiding the note being edited leaves a dirty edit nobody is watching) and a flush that
         failed. `owedRef` is written after each commit, and unmount is always a later tick than the state it
         reads, so it cannot resurrect anything either. `save`'s in-flight guard makes an overlap a no-op. */
  const flushLeft = (staying: string | null) => { if (autosaveId && autosaveId !== staying) void save(autosaveId) }
  const owedRef = useRef<string[]>([])
  useEffect(() => { owedRef.current = autosaveIds })
  useEffect(() => () => { owedRef.current.forEach((id) => { void saveRef.current(id) }) }, [])

  /* The selected item's id when it is a contact log — the pane header's actions all act on that one id
     (and it narrows `selectedId` for them, which `selected.kind` alone cannot). */
  const contactId = selectedId && selected?.kind === 'contact' ? selectedId : null
  /* The contact log lives in the sheet only on a phone; everywhere else it stays in the pane. */
  const logInSheet = sheetLayout && contactId !== null
  /* (REG-381 → REG-402, mock 995:23383) The phone's composer writes a NEW note and nothing else: it is bound to
     the draft, it is always there at the foot of the list, and it never loads a saved note. Tapping a note that
     already exists opens it in a sheet instead (below) — the composer used to take it, which put the note's text
     in a 190px strip while the row it came from sat above it, unchanged. That is the "opens the details in a
     weird way" the owner hit (2026-09-08). */
  const composerDraft = sheetLayout && draft?.kind === 'note' ? draft : null
  /* An EXISTING note, opened as a sheet — the contact log's treatment (REG-380), for the same reason. */
  const noteInSheet = sheetLayout && selectedId !== null && selectedId !== DRAFT_ID && selected?.kind === 'note' && mobilePane
  const noteSheetId = noteInSheet ? selectedId : null

  /* (REG-381) The docked composer shares the phone's bottom-right corner with the Maison AI FAB, so it
     publishes its presence and measured height the way the bulk bar does (REG-358) and the FAB steps over it. */
  const composerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = composerRef.current
    if (composerDraft === null || !el) return
    document.documentElement.style.setProperty('--app-note-composer-height', `${Math.round(el.getBoundingClientRect().height)}px`)
    document.body.setAttribute('data-om-note-composer', '')
    return () => {
      document.body.removeAttribute('data-om-note-composer')
      document.documentElement.style.removeProperty('--app-note-composer-height')
    }
  }, [composerDraft, selectedId])

  return (
    /* data-pane drives the ≤767 master-detail push (REG-269): the list is the screen until an item is
       chosen, then the pane is. Both halves stay mounted — CSS swaps which one shows — so nothing
       remounts and the editor keeps its state. */
    <div className={styles.tab}>
      {/* (REG-293) The tab's own row, as every sibling has: the "All Notes & Logs (n) ▾" scope pill (the kind chips'
          successor) and the search on the left, New ▾ on the right — the lead listing's bar over one list. */}
      <NotesToolbar
        query={query} onQuery={setQuery}
        /* (REG-286) New ▾ leaves the current item without going through `select` — flush what it owes first. */
        onNew={(kind) => { flushLeft(DRAFT_ID); startDraft(kind) }}
      />
      <div className={styles.card} data-pane={(mobilePane && !logInSheet && !noteInSheet) || undefined} data-composer={(composerDraft !== null) || undefined}>
      <div className={styles.list}>
        <NotesList
          items={items}
          searching={query.trim() !== ''}
          /* (REG-275) Clear All = the sibling tabs' — the query goes and the scope goes back to All Notes & Logs. */
          onClearAll={() => { setQuery(''); setFilter('all') }}
          selectedId={selectedId} onSelect={select}
          onItemMenu={itemMenu}
          filter={filter} onFilter={setFilter}
          onNew={startDraft}   /* (REG-546) */
        />
      </div>
      <div className={styles.pane}>
        {/* Mobile-only back affordance, above the pane's own content (hidden ≥768 by CSS). */}
        <button type="button" className={styles.back} onClick={() => setMobilePane(false)}>
          <Icon name="arrow_back" size={24} weight={300} />
          Notes & Logs
        </button>

        {/* The pane toolbar, back at the TOP (REG-277, owner 2026-09-01: REG-254 had docked it to the foot and
            "it doesn't look good"). This is the mock's own placement again (931:44905, 68px with a bottom rule).
            Formatting runs on whichever rich body holds the selection — execCommand is deprecated but universal,
            the right size for the prototype (REG-252) — and shows disabled while nothing is editable. */}
        {/* (REG-291, user 2026-09-02) Not for a contact log: it is all fields, so there is no rich text to
            format and nothing for Maison AI to refine — the bar and its rule would only be dead weight above
            a form. Notes keep it, and so does an empty pane (nothing selected), where it shows disabled. */}
        {logInSheet ? null : contactId ? (
          /* (REG-292) The contact log's own header: the kind on the left, the actions that used to sit inline
             with the block title (REG-256 Edit · Auto Fill · the REG-268 lock hint) on the right. It has to be
             a child of the pane, not of the editor, so the rule spans the pane and the fields scroll under it. */
          <PaneHeader title={isMeeting(contactId) ? 'Meeting log' : 'Contact log'}>
            {isEditing(contactId)
              // eslint-disable-next-line @next/next/no-img-element
              ? <LinkButton leading={<img src="/figma-assets/brief-sparkle.svg" alt="" />} onClick={() => setAutoFillFor(contactId)}>Auto Fill</LinkButton>
              : isStage(contactId) ? (
                <span className={styles.lockHint}>
                  <Icon name="lock" size={14} />
                  Added during stage movement — view only
                </span>
              ) : <Link variant="primary" onPress={() => edit(contactId)}>Edit</Link>}
          </PaneHeader>
        ) : (
          <PaneToolbar
            title={selected ? 'Note' : undefined}
            onAttach={() => { if (selectedId) setAttachFor(selectedId) }}
            onRefine={comingSoon}
            onFormat={(cmd) => document.execCommand(cmd)}
            formattingDisabled={!selectedId || !selected}
          />
        )}
        <div className={styles.body}>
          <div className={styles.editor}>
            {selectedId && selected ? (
              selected.kind === 'contact' ? (
                logInSheet ? null : <ContactEditor
                  key={editorKey}
                  meeting={isMeeting(selectedId)}
                  draft={selected}
                  onChange={(patch) => change(selectedId, patch)}
                  onAttach={() => { if (selectedId) setAttachFor(selectedId) }}
                  errors={errorsFor(selectedId, selected)}
                  editing={isEditing(selectedId)}
                  autoFocus={mayFocusEditor}
                  today={new Date(now)}
                />
              ) : sheetLayout ? null : (
                <NoteEditor
                  key={editorKey}
                  draft={selected}
                  onChange={(patch) => change(selectedId, patch)}
                  autoFocus={mayFocusEditor}
                />
              )
            ) : null}
          </div>
          {selectedId && attachments.length > 0 ? (
            <AttachmentsColumn
              files={attachments}
              onRemove={(fileId: string) => setAttached(selectedId, attachedIds(selectedId).filter((id) => id !== fileId), 'remove the file')}
              onOpen={(file: LeadFile) => router.push(`/leads/${leadId}/files/${file.id}`)}
            />
          ) : null}
        </div>

        {/* Cancel · Save return to a footer at the pane's foot (REG-277) — the frame-80 row the editors carried
            before REG-254 moved them into the bar. Still the CONTACT LOG's commit point alone: notes autosave
            (REG-263), so a selected note shows no footer at all. */}
        {selectedId && selected && selected.kind === 'contact' && isEditing(selectedId) && !logInSheet ? (
          <div className={styles.footer}>
            <Button variant="secondary" appearance="outlined" onPress={() => cancel(selectedId)} isDisabled={savingId === selectedId}>Cancel</Button>
            <Button onPress={() => { void save(selectedId) }} isDisabled={savingId === selectedId}>Save</Button>
          </div>
        ) : null}
      </div>

      {/* (REG-381, canvas 3d "Lead details - notes") The phone writes a note in a composer docked under the
          list — title, body, then a bar of the two list tools + attach with Save on the right — instead of
          pushing a whole pane over the notes it is being written beside. Notes still autosave (REG-263):
          Save is the canvas' way out of the composer, not a second commit path. Mounted only while
          `sheetLayout`, so ≥768 keeps the pane exactly as it was. */}
      {composerDraft ? (
        <div className={styles.composer} ref={composerRef}>
          <div className={styles.composerFields}>
            <NoteEditor
              key={draftKey}
              draft={composerDraft}
              onChange={(patch) => change(DRAFT_ID, patch)}
              /* The composer is always on screen; it must not grab the caret on arrival, only when tapped
                 (REG-294's rule, and the reason New ▾ still focuses it — `startDraft` sets the intent). */
              autoFocus={mayFocusEditor && selectedId === DRAFT_ID}
            />
          </div>
          <div className={styles.composerBar}>
            <Tooltip label="Bulleted list">
              <button type="button" className={styles.composerTool} onClick={() => document.execCommand('insertUnorderedList')} aria-label="Bulleted list">
                <Icon name="format_list_bulleted" size={20} weight={300} />
              </button>
            </Tooltip>
            <Tooltip label="Numbered list">
              <button type="button" className={styles.composerTool} onClick={() => document.execCommand('insertOrderedList')} aria-label="Numbered list">
                <Icon name="format_list_numbered" size={20} weight={300} />
              </button>
            </Tooltip>
            <Tooltip label="Attach file">
              <button type="button" className={styles.composerTool} onClick={() => setAttachFor(DRAFT_ID)} aria-label="Attach file">
                <Icon name="attach_file_add" size={20} weight={300} />
              </button>
            </Tooltip>
            {/* The mock's hairline between the tools and Save (995:23429), drawn by the gap itself. */}
            <span className={styles.composerRule} aria-hidden />
            <Button onPress={() => { void save(DRAFT_ID) }} isDisabled={savingId === DRAFT_ID || !draftDirty(composerDraft)}>Save</Button>
          </div>
        </div>
      ) : null}
      </div>

      {/* (REG-402) An EXISTING note, opened from the list: a sheet, like the contact log next to it. It carries the
          note's own title, its body, whatever is attached, and Cancel · Save — instead of loading itself into the
          composer, which duplicated the row it came from and had no way out but Save. */}
      {noteInSheet && noteSheetId && selected ? (
        <Sheet
          open={mobilePane}
          onClose={() => { flushLeft(noteSheetId); setMobilePane(false) }}
          /* The KIND, as the contact log's sheet is titled: the note's own title is the first field inside and
             printing it twice, 40px apart, read as a bug. */
          title="Note"
          headActions={isStage(noteSheetId) ? (
            <span className={styles.lockHint}>
              <Icon name="lock" size={14} />
              View only
            </span>
          ) : undefined}
          footer={
            <>
              <Button variant="secondary" appearance="outlined" onPress={() => { clearEdit(noteSheetId); setMobilePane(false) }} isDisabled={savingId === noteSheetId}>Cancel</Button>
              <Button onPress={() => { void save(noteSheetId); setMobilePane(false) }} isDisabled={savingId === noteSheetId}>Save</Button>
            </>
          }
        >
          <div className={styles.sheetEditor}>
            <NoteEditor
              key={editorKey}
              draft={selected}
              onChange={(patch) => change(noteSheetId, patch)}
              autoFocus={false}
            />
            {attachments.length > 0 ? (
              <AttachmentsColumn
                files={attachments}
                onRemove={(fileId: string) => setAttached(noteSheetId, attachedIds(noteSheetId).filter((id) => id !== fileId), 'remove the file')}
                onOpen={(file: LeadFile) => router.push(`/leads/${leadId}/files/${file.id}`)}
              />
            ) : null}
          </div>
        </Sheet>
      ) : null}

      {/* (REG-380, canvas 3e) The phone's contact log: the same editor, in a bottom sheet whose head carries Auto
          Fill / Edit / the stage-lock hint and whose footer pins Cancel · Save — where the pane left them ~278px
          below the fold. Rendered ONLY when `sheetLayout` is true, so ≥768 never mounts it. */}
      {logInSheet && contactId && selected ? (
        <Sheet
          open={mobilePane}
          onClose={() => { cancel(contactId); setMobilePane(false) }}
          title={isMeeting(contactId) ? 'Meeting log' : 'Contact log'}
          headActions={isEditing(contactId)
            // eslint-disable-next-line @next/next/no-img-element
            ? <LinkButton leading={<img src="/figma-assets/brief-sparkle.svg" alt="" />} onClick={() => setAutoFillFor(contactId)}>Auto Fill</LinkButton>
            : isStage(contactId) ? (
              <span className={styles.lockHint}>
                <Icon name="lock" size={14} />
                View only
              </span>
            ) : <Link variant="primary" onPress={() => edit(contactId)}>Edit</Link>}
          footer={isEditing(contactId) ? (
            <>
              {/* (REG-402) Cancelling a NEW log closes the sheet: dropping the draft hands the selection to the
                  first row in the list, and with the sheet still open that was the existing log appearing in
                  place of the one just abandoned. Cancelling an EDIT of a saved log keeps the sheet, in view
                  mode, which is where cancelling an edit should leave you. */}
              <Button variant="secondary" appearance="outlined"
                      onPress={() => { cancel(contactId); if (contactId === DRAFT_ID) setMobilePane(false) }}
                      isDisabled={savingId === contactId}>Cancel</Button>
              <Button onPress={() => { void save(contactId) }} isDisabled={savingId === contactId}>Save</Button>
            </>
          ) : undefined}
        >
          <div className={styles.sheetEditor}>
            <ContactEditor
              key={editorKey}
              meeting={isMeeting(contactId)}
              draft={selected}
              onChange={(patch) => change(contactId, patch)}
              onAttach={() => setAttachFor(contactId)}
              errors={errorsFor(contactId, selected)}
              editing={isEditing(contactId)}
              autoFocus={mayFocusEditor}
              today={new Date(now)}
            />
            {attachments.length > 0 ? (
              <AttachmentsColumn
                files={attachments}
                onRemove={(fileId: string) => setAttached(contactId, attachedIds(contactId).filter((id) => id !== fileId), 'remove the file')}
                onOpen={(file: LeadFile) => router.push(`/leads/${leadId}/files/${file.id}`)}
              />
            ) : null}
          </div>
        </Sheet>
      ) : null}

      <AttachFilesModal
        open={!!attachFor}
        files={files}
        attached={attachFor ? attachedIds(attachFor) : []}
        onClose={() => setAttachFor(null)}
        onAttach={(fileIds) => {
          const id = attachFor; setAttachFor(null); if (!id) return
          const have = attachedIds(id)
          const fresh = fileIds.filter((f) => !have.includes(f))
          setAttached(id, [...have, ...fresh], 'attach the files', `${fresh.length === 1 ? '1 file' : `${fresh.length} files`} attached`)
        }}
        onUploadPicked={uploadPicked}   /* (UX audit 2026-09-30, T1) the real upload; the modal ticks the file it hands back */
      />
      {/* AutoFillDialog / SuggestedTasksDialog = the Move stage window's, in their Notes variant (164 · 166, spec 02): 600 wide,
          the 64px modal header (20/Bold + rule, 779:26016), body p24; Add tasks with 14/Semi Bold group labels, leading boxes and the rule. */}
      <AutoFillDialog open={!!autoFillFor} title="Auto Fill" width={600} variant="notes" onClose={() => setAutoFillFor(null)} onUpload={autoFill} />
      <SuggestedTasksDialog
        open={!!tasksFor} title="Add tasks" width={600} variant="notes"
        autoAdded={tasksFor?.autoAdded ?? ''}
        suggestions={SUGGESTIONS}
        picked={tasksFor?.picked ?? new Set<string>()}
        onToggle={(s) => setTasksFor((t) => { if (!t) return t; const picked = new Set(t.picked); if (picked.has(s)) picked.delete(s); else picked.add(s); return { ...t, picked } })}
        onClose={() => setTasksFor(null)}
        onSave={addTasks}
      />
      <DeleteNoteDialog
        open={!!deleting} kind={deleting?.kind ?? 'note'}
        onNo={() => setDeleting(null)}
        onYes={() => {
          const d = deleting; setDeleting(null); if (!d) return
          if (d.id === DRAFT_ID) { setDraft(null); return }   // a confirmed dirty draft is dropped, no row exists yet (REG-264)
          clearEdit(d.id)
          void run('delete', () => deleteNote(d.id), d.kind === 'contact' ? 'Contact log deleted' : 'Note deleted')
        }}
      />
    </div>
  )
}
