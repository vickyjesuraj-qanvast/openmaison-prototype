'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { AutoFillDialog, SuggestedTasksDialog } from '@/components/leads/move-stage/dialogs'
import { AttachFilesModal } from '@/components/leads/tasks/attach-files-modal'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { LeadFile } from '@/lib/db/schema'
import { displayDateWeekday, formatInputDateTime } from '@/lib/format'
import { draftFrom, emptyDraft, filterNotes, listSecondary, listTitle, nextStepFor, validateDraft, type NoteDraft, type NoteFilter, type NoteKind } from '@/lib/leads/note-model'
import type { LeadNotesData } from '@/lib/leads/notes'
import { createNote, deleteNote, setNoteAttachments, updateNote } from '@/app/leads/notes-actions'
import { createTask } from '@/app/leads/tasks-actions'
import { NotesList } from './notes-list'
import { NoteEditor } from './note-editor'
import { ContactEditor } from './contact-editor'
import { PaneToolbar } from './pane-toolbar'
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
 * while the save is in flight never stop it from settling — they simply keep the note dirty afterwards.
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
const normalise = (d: NoteDraft): NoteDraft => ({ ...fieldsOf(d), title: d.title.trim(), ...(nextStepFor(d.outcome) ? {} : { nextStepWhen: '', nextStepMode: '' }) })
const without = <T,>(set: Set<T>, ids: T[]) => { const s = new Set(set); ids.forEach((id) => s.delete(id)); return s }
const withId = <T,>(set: Set<T>, id: T) => new Set(set).add(id)

/* Auto Fill (plan › Rules, invented copy logged in the register): what the "uploaded" conversation fills in, and the Add tasks suggestion. */
const AUTO_FILL_BODY = 'Client confirmed the renovation scope over WhatsApp and asked for a site visit next week.'
const AUTO_FILL_DAYS = 3
const AUTO_FILL_HOUR = 19
const SUGGESTIONS = ['Prepare sample designs and floor plan illustrations for the client']

export function LeadNotes({ leadId, data }: { leadId: string; data: LeadNotesData }) {
  const { notes, files, now } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail } = useRun()

  /* ── items ── */
  // A lead with no notes opens on a blank note draft (frame 79); `now` is the loader's clock — no clock read in render.
  const [draft, setDraft] = useState<DraftItem | null>(() => (notes.length ? null : freshDraft('note', now)))
  const [selectedId, setSelectedId] = useState<string | null>(() => (notes.length ? notes[notes.length - 1]!.id : DRAFT_ID))
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [edits, setEdits] = useState<Record<string, NoteDraft>>({})
  const [contactEditing, setContactEditing] = useState<Set<string>>(() => new Set())
  const [showErrors, setShowErrors] = useState<Set<string>>(() => new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null)   // createNote's id — the draft retires once the data carries it
  const [pending, setPending] = useState<Record<string, NoteDraft>>({})   // updateNote'd ids → the saved snapshot; the edit retires once the data carries it

  /* ── overlays ── */
  const [deleting, setDeleting] = useState<{ id: string; kind: NoteKind } | null>(null)
  const [attachFor, setAttachFor] = useState<string | null>(null)
  const [autoFillFor, setAutoFillFor] = useState<string | null>(null)
  const [tasksFor, setTasksFor] = useState<{ id: string; autoAdded: string; picked: Set<string> } | null>(null)

  const byId = new Map(notes.map((n) => [n.id, n]))
  const fileById = new Map(files.map((f) => [f.id, f]))
  /** The item's live fields: the draft, the note's edit, or the note as saved. */
  const currentOf = (id: string): NoteDraft | null => {
    if (id === DRAFT_ID) return draft ? fieldsOf(draft) : null
    const n = byId.get(id); if (!n) return null
    return edits[id] ?? draftFrom(n)
  }

  /* ── render-phase adjusts (no setState in effects) ── */
  // 1. The saved draft arrived with the revalidated data: retire the draft and select the real note.
  if (savedDraftId && byId.has(savedDraftId)) { setSavedDraftId(null); setDraft(null); setSelectedId(savedDraftId) }
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
  if (!draft && notes.length === 0 && !savedDraftId) setDraft(freshDraft('note', now))

  // The list: the filter's notes in creation order, then the draft (always shown — it is the item being written).
  const items = [
    ...filterNotes(notes, filter).map((n) => { const cur = edits[n.id] ?? draftFrom(n); return { id: n.id, kind: cur.kind, title: listTitle(cur), secondary: listSecondary(cur), createdAt: n.createdAt } }),
    ...(draft ? [{ id: DRAFT_ID, kind: draft.kind, title: listTitle(draft), secondary: listSecondary(draft), createdAt: new Date(draft.createdAt), draft: true }] : []),
  ]
  // 4. Selection follows the visible list: default = the draft, else the last item.
  if (!(selectedId && items.some((i) => i.id === selectedId))) {
    const fallback = draft ? DRAFT_ID : (items[items.length - 1]?.id ?? null)
    if (fallback !== selectedId) setSelectedId(fallback)
  }

  /** New ▾ › Note / Contact Log, the Overview quick link and `?new=`: one draft at a time — a dirty draft is kept (and selected) rather than replaced. */
  const startDraft = useCallback((kind: NoteKind) => {
    const at = Date.now()
    setDraft((prev) => (prev && draftDirty(prev) ? prev : freshDraft(kind, at)))
    setSelectedId(DRAFT_ID)
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
    setSelectedId(id)
    // Leaving a pristine draft drops it (nothing typed, nothing lost); a dirty draft keeps its row (plan › Rules).
    if (id !== DRAFT_ID && notes.length) setDraft((prev) => (prev && !draftDirty(prev) ? null : prev))
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
    select(id)
    if (id === DRAFT_ID) setDraft((prev) => (prev ? { ...prev, editing: true } : prev))
    else if (byId.get(id)?.kind === 'contact') setContactEditing((s) => withId(s, id))
  }
  const cancel = (id: string) => {
    if (id === DRAFT_ID) setDraft(null)   // adjust 3 brings a blank draft back when the lead has no notes
    else clearEdit(id)
  }
  const save = async (id: string) => {
    const cur = currentOf(id); if (!cur) return
    const d = normalise(cur)
    if (Object.keys(validateDraft(d)).length) {
      if (id === DRAFT_ID) setDraft((prev) => (prev ? { ...prev, showErrors: true } : prev)); else setShowErrors((s) => withId(s, id))
      return
    }
    const noun = d.kind === 'contact' ? 'contact log' : 'note'
    const done = d.kind === 'contact' ? 'Contact log saved' : 'Note saved'
    if (id === DRAFT_ID) {
      const fileIds = draft?.fileIds ?? []
      setSavingId(id)
      try { const newId = await createNote(leadId, d, fileIds); setSavedDraftId(newId); snackbar({ message: done }) }
      catch { fail(`save the ${noun}`) }
      finally { setSavingId(null) }
      return
    }
    const n = byId.get(id); if (!n) return
    if (same(d, draftFrom(n))) { clearEdit(id); return }   // nothing changed — just leave editing
    setSavingId(id)
    try { await updateNote(id, d); setEdits((e) => ({ ...e, [id]: d })); setPending((p) => ({ ...p, [id]: d })); snackbar({ message: done }) }
    catch { fail(`save the ${noun}`) }
    finally { setSavingId(null) }
  }
  const itemMenu = (id: string, action: 'edit' | 'delete') => {
    if (action === 'edit') { edit(id); return }
    if (id === DRAFT_ID) { setDraft(null); return }   // an unsaved draft is simply dropped
    const n = byId.get(id); if (n) setDeleting({ id, kind: n.kind === 'contact' ? 'contact' : 'note' })
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
    setTasksFor({ id, autoAdded: `Schedule a meeting with the client for ${displayDateWeekday(next)} at 7PM`, picked: new Set() })
  }
  const addTasks = () => {
    const t = tasksFor; setTasksFor(null); if (!t) return
    const titles = [t.autoAdded, ...SUGGESTIONS.filter((s) => t.picked.has(s))]
    void run('add the tasks', async () => { for (const title of titles) await createTask(leadId, title) }, titles.length === 1 ? '1 task added' : `${titles.length} tasks added`)
  }

  /* ── the selected item ── */
  const selected = selectedId ? currentOf(selectedId) : null
  const selectedNote = selectedId && selectedId !== DRAFT_ID ? byId.get(selectedId) ?? null : null
  const attachments: LeadFile[] = selectedId === DRAFT_ID
    ? (draft?.fileIds ?? []).map((id) => fileById.get(id)).filter((f): f is LeadFile => !!f)
    : (selectedNote?.attachments ?? [])
  const isDirty = (id: string) => (id === DRAFT_ID ? (draft ? draftDirty(draft) : false) : !!edits[id] && !pending[id])
  const isEditing = (id: string) => (id === DRAFT_ID ? !!draft?.editing : contactEditing.has(id))
  const errorsFor = (id: string, d: NoteDraft) => ((id === DRAFT_ID ? !!draft?.showErrors : showErrors.has(id)) ? validateDraft(d) : {})

  return (
    <div className={styles.card}>
      <div className={styles.list}>
        <NotesList
          items={items}
          filter={filter} onFilter={setFilter}
          selectedId={selectedId} onSelect={select}
          onNew={startDraft}
          onItemMenu={itemMenu}
        />
      </div>
      <div className={styles.pane}>
        <PaneToolbar onAttach={() => { if (selectedId) setAttachFor(selectedId) }} onRefine={comingSoon} />
        <div className={styles.body}>
          <div className={styles.editor}>
            {selectedId && selected ? (
              selected.kind === 'contact' ? (
                <ContactEditor
                  key={selectedId}
                  draft={selected}
                  onChange={(patch) => change(selectedId, patch)}
                  errors={errorsFor(selectedId, selected)}
                  editing={isEditing(selectedId)}
                  onEdit={() => edit(selectedId)}
                  onAutoFill={() => setAutoFillFor(selectedId)}
                  onCancel={() => cancel(selectedId)}
                  onSave={() => { void save(selectedId) }}
                  today={new Date(now)}
                  saving={savingId === selectedId}
                />
              ) : (
                <NoteEditor
                  key={selectedId}
                  draft={selected}
                  onChange={(patch) => change(selectedId, patch)}
                  dirty={isDirty(selectedId)}
                  onCancel={() => cancel(selectedId)}
                  onSave={() => { void save(selectedId) }}
                  saving={savingId === selectedId}
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
      </div>

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
        onUploadPicked={() => { /* REG-149: the picked file becomes the mock's file — the modal shows the upload toast and lists it in "Your files" */ }}
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
          clearEdit(d.id)
          void run('delete', () => deleteNote(d.id), d.kind === 'contact' ? 'Contact log deleted' : 'Note deleted')
        }}
      />
    </div>
  )
}
