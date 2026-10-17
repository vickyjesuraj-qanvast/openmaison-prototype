'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import {
  approveHandover, completeHandover, deleteProject, reopenProject, sendBackHandover, undoDeleteProject, withdrawHandover,
  undoCompleteHandover, type HandoverUndo,   // (simplify Q-15)
} from '@/app/projects/ending-actions'
import { projectHref } from '@/lib/projects/tabs'
import { unsentWords } from '@/lib/notifications/held'   // (simplify round 2, R2-C) the Undo (or a Reopen inside it) says the held email won't go
import { withFrom } from '@/lib/nav'
import { HandoverDialog, type HandoverMode, type HandoverResult, type HandoverSubmit } from './handover-dialog'
import type { IssuedLetterView } from '@/lib/projects/completion-letter-model'   // (S44R, C9)
import { DeleteProjectDialog } from './delete-project-dialog'
import { DuplicateProjectDialog } from '../project-dialogs'   // (parity map, PR-058)
import { ProjectCommissionDialog } from '@/components/finance/books/project-commission-dialog'   // (parity map, FB-042 · FB-043) P-C's dialog, P-E's door

/* (parity map, PR-058) Duplicate project opens from the project's ⋮ wherever it is drawn — the menu calls this; the hook's host hears it (a
   no-op where none is mounted), as P-C's `openProjectCommission` does for Commission. */
type DuplicateListener = (projectId: string) => void
const duplicateListeners = new Set<DuplicateListener>()
export function openDuplicateProject(projectId: string): void { duplicateListeners.forEach((l) => l(projectId)) }

export type EndingKind = 'complete' | 'review' | 'sendBack' | 'withdraw' | 'reopen' | 'delete'
type Target = { id: string; name: string }

/**
 * (Projects round 7) The ending's dialogs, hosted once by whoever offers them — the project page's header, bar and kebab, the listing's row
 * menu and phone card. `open(kind, project)`; every press answers with a snackbar, a refusal names its rule, Delete offers Undo. `onDeleted`
 * runs once a delete lands (the project page leaves for the listing); `refresh` re-reads the page after anything else.
 */
export function useProjectEnding({ origin, onDeleted }: { origin?: string; onDeleted?: () => void } = {}) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [handover, setHandover] = useState<(Target & { mode: HandoverMode }) | null>(null)
  const [sendBack, setSendBack] = useState<Target | null>(null)
  const [reopen, setReopen] = useState<Target | null>(null)
  const [del, setDel] = useState<Target | null>(null)
  const [busy, setBusy] = useState(false)
  /* (parity map, PR-058) the project being duplicated; (FB-042) the project page's own id — its Commission dialog reads `?commission=1` itself */
  const [dupFor, setDupFor] = useState<string | null>(null)
  useEffect(() => { const l: DuplicateListener = (id) => setDupFor(id); duplicateListeners.add(l); return () => { duplicateListeners.delete(l) } }, [])
  const pathname = usePathname()
  const params = useParams<{ id?: string | string[] }>()
  const pageProjectId = pathname?.startsWith('/projects/') && typeof params?.id === 'string' ? params.id : undefined

  const act = async (what: string, fn: () => Promise<unknown>, done: Parameters<typeof snackbar>[0] | null, o: { refresh?: boolean } = {}): Promise<boolean> => {
    setBusy(true)
    try {
      const r = await fn()
      if (r && typeof r === 'object' && 'error' in r && typeof (r as { error: unknown }).error === 'string') { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return false }
      if (done) snackbar(done)
      if (o.refresh !== false) router.refresh()
      return true
    } catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }); return false }
    finally { setBusy(false) }
  }

  const open = (kind: EndingKind, t: Target) => {
    if (kind === 'complete' || kind === 'review') setHandover({ ...t, mode: kind })
    else if (kind === 'sendBack') setSendBack(t)
    else if (kind === 'reopen') setReopen(t)
    else if (kind === 'delete') setDel(t)
    else if (kind === 'withdraw') void act('take the request back', () => withdrawHandover(t.id), { message: 'Handover request taken back' })
  }

  const submit = async (sub: HandoverSubmit): Promise<HandoverResult> => {
    const t = handover
    if (!t) return false
    if (sub.kind === 'sendBack') { setHandover(null); setSendBack(t); return true }
    if (sub.kind === 'withdraw') return act('take the request back', () => withdrawHandover(t.id), { message: 'Handover request taken back' })
    /* (simplify Q-15, the owner's pick 2026-10-09) a completion answers with Undo for the snackbar's life — then Reopen (an Owner or an
       Admin) as today; the server holds the Undo to its few minutes and to whoever completed it */
    /* (S44R — UAT row 359, call C9) the completion letter that went with it is said in the same sentence — and its Undo takes it back too */
    const completed = (undo: HandoverUndo | null, letter: IssuedLetterView | null) => snackbar({ key: 'project-completed', message: `${t.name} is completed${letter ? ` — “${letter.title}” went to the client${letter.toRead ? ' to read and keep' : ' to sign'}` : ''}`,
      ...(undo ? { actionLabel: 'Undo', onAction: () => {
        /* (simplify round 2, R2-C) the client's "handed over" email waits out this Undo — taken back with it, and the sentence says so */
        void act('undo the handover', async () => {
          const r = await undoCompleteHandover(undo)
          if (!('error' in r)) snackbar({ message: `${t.name} is in progress again${unsentWords(r.unsent)}${letter ? ` — “${letter.title}” is in Deleted Contracts and its link no longer opens` : ''}` })
          return r
        }, null)
      } } : {}) })
    if (sub.kind === 'approve') {
      let undo: HandoverUndo | null = null
      let letter: IssuedLetterView | null = null
      const ok = await act('approve the handover', async () => { const r = await approveHandover(t.id, { reason: sub.reason, deferred: sub.deferred, letter: sub.letter ?? null }); if (!('error' in r)) { undo = r.undo ?? null; letter = r.letter ?? null } return r }, null)
      if (ok) completed(undo, letter)
      return { ok, letter }
    }
    let state: string | null = null
    let undo: HandoverUndo | null = null
    let letter: IssuedLetterView | null = null
    const ok = await act('complete the handover', async () => { const r = await completeHandover(t.id, { note: sub.note, reason: sub.reason, deferred: sub.deferred, letter: sub.letter ?? null }); if (!('error' in r)) { state = r.state; undo = r.undo ?? null; letter = r.letter ?? null } return r }, null)
    if (ok) { if (state === 'requested') snackbar({ message: 'Handover sent for review — an Owner or an Admin approves it' }); else completed(undo, letter) }
    return { ok, letter }
  }

  const remove = async () => {
    const t = del
    if (!t) return
    setDel(null)
    let eventId: string | null = null
    const ok = await act('delete the project', async () => { const r = await deleteProject(t.id); if (!('error' in r)) eventId = r.eventId; return r }, null, { refresh: !onDeleted })
    if (!ok) return
    snackbar({
      message: `${t.name} deleted`, actionLabel: 'Undo',
      onAction: () => { const id = eventId; void act('restore the project', () => undoDeleteProject(t.id, { eventId: id ?? '' }), { message: `${t.name} restored` }) },
    })
    onDeleted?.()
  }

  const node = (
    <>
      <HandoverDialog projectId={handover?.id ?? null} mode={handover?.mode ?? 'complete'} open={!!handover} origin={origin} onClose={() => setHandover(null)} onSubmit={submit} />
      <NoteDialog open={!!sendBack} title="Send back" label="What does the handover still need?" action="Send back" required maxLength={300} busy={busy}
                  help="Whoever asked reads this on the project; the client never sees it."
                  onClose={() => setSendBack(null)}
                  onSubmit={(note) => { const t = sendBack; if (!t) return; void act('send the handover back', () => sendBackHandover(t.id, { note }), { message: 'Handover sent back' }).then((ok) => { if (ok) setSendBack(null) }) }} />
      <NoteDialog open={!!reopen} title="Reopen project" label="Why is it reopened?" action="Reopen" required maxLength={300} busy={busy}
                  help="It goes back to In progress; its schedule, choices and money open again. The reason stays in Activity."
                  onClose={() => setReopen(null)}
                  onSubmit={(reason) => { const t = reopen; if (!t) return; void act('reopen the project', async () => {
                    const r = await reopenProject(t.id, { reason })
                    if (!('error' in r)) snackbar({ message: `${t.name} is in progress again${unsentWords(r.unsent)}` })   // (simplify round 2, R2-C)
                    return r
                  }, null).then((ok) => { if (ok) setReopen(null) }) }} />
      <DeleteProjectDialog projectId={del?.id ?? null} open={!!del} onClose={() => setDel(null)} onDelete={() => { void remove() }}
                           onOpenMoney={() => { const t = del; setDel(null); if (t) router.push(origin ? withFrom(projectHref(t.id, 'money'), origin) : projectHref(t.id, 'money')) }} />
      {/* (parity map, PR-058) Duplicate project · (FB-042 · FB-043) the project's Commission — both opened from the ⋮ */}
      <DuplicateProjectDialog open={!!dupFor} projectId={dupFor} onClose={() => setDupFor(null)} />
      <ProjectCommissionDialog projectId={pageProjectId} />
    </>
  )
  return { open, node }
}
