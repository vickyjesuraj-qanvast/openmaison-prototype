'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { displayDateTime } from '@/lib/format'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import type { PlanDoc } from '@/lib/planner/model'
import type { LayoutVersionRow } from '@/lib/planner/queries'
import { readLayoutVersions } from '@/app/planner/actions'
import { PlanDrawing } from '../plan-drawing'
import styles from './versions-drawer.module.css'

/** The plan as a version compares it — its rooms, pieces and levels (never where the 3D camera was left). */
const shape = (p: PlanDoc) => JSON.stringify({ r: p.rooms, p: p.pieces, l: p.levels ?? [], n: p.levelName ?? null, w: p.wallsLow })

/**
 * (parity map, TD-087 — 1.0's version history) A layout's kept versions, newest first, in the house side panel: each share keeps one
 * ("Shared with the client" · "Changes shared"), Save a version keeps one by hand with the studio's own words, and a Bring back keeps the
 * layout as it was first ("Before bringing back …"), so going back never loses work. Each row says what changed since the one before it —
 * 1.0's automatic summary ("2 pieces added · 1 moved"). Bring back puts that version on screen as one change (Undo on the snackbar) and the
 * layout saves itself.
 */
export function VersionsDrawer({ open, onClose, layoutId, doc, library, block, onSave, onBringBack, refresh }: {
  open: boolean; onClose: () => void
  layoutId: string
  /** the layout as it is on screen */ doc: PlanDoc
  library: LibraryMaterial[]
  /** why this viewer may not save or bring back (read-only), else null */ block: string | null
  onSave: (note: string) => Promise<boolean>
  onBringBack: (v: LayoutVersionRow) => void
  /** bumped by the host after it keeps a version, so the list reads again */ refresh: number
}) {
  const [rows, setRows] = useState<LayoutVersionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    let live = true
    void readLayoutVersions(layoutId).then((r) => { if (!live) return; if ('error' in r) setError(r.error); else { setRows(r.versions); setError(null) } }, () => { if (live) setError('Couldn’t read the versions — please try again') })
    return () => { live = false }
  }, [open, layoutId, refresh])
  const now = shape(doc)
  const save = async () => {
    if (busy) return
    setBusy(true)
    const ok = await onSave(note.trim()).finally(() => setBusy(false))
    if (ok) setNote('')
  }
  return (
    <Drawer open={open} onClose={onClose} title="Versions" width="wide" label="The layout’s versions">
      <div className={styles.body} data-testid="planner-versions">
        {!block ? (
          <div className={styles.save} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }}>
            <TextField label="Name this version (optional)" value={note} onChange={setNote} maxLength={80} size="s" />
            <Button onPress={() => { void save() }} isDisabled={busy} iconStart={<Icon name="save" size={20} weight={300} />} data-testid="planner-save-version">{busy ? 'Saving…' : 'Save a version'}</Button>
          </div>
        ) : null}
        {error ? <p className={styles.line} role="alert">{error}</p> : !rows ? <p className={styles.line}>Reading the versions…</p> : rows.length ? (
          <ul className={styles.list} aria-label="Versions">
            {rows.map((v, i) => {
              const same = shape(v.plan) === now
              return (
                <li key={v.id} className={styles.row} data-testid="planner-version" data-kind={v.kind}>
                  <span className={styles.thumb} aria-hidden><PlanDrawing plan={{ rooms: v.plan.rooms, pieces: v.plan.pieces }} library={library} labels="none" unit={30} decorative /></span>
                  <span className={styles.text}>
                    <span className={styles.name}>{v.label}</span>
                    <span className={styles.sub}>{[displayDateTime(new Date(v.at)), v.by].filter(Boolean).join(' · ')}</span>
                    <span className={styles.sub}>{i === rows.length - 1 && rows.length > 1 ? `The oldest kept · ${v.summary}` : v.summary}</span>
                  </span>
                  {same ? <span className={styles.now}>As it is now</span> : (
                    <Tooltip label={block ?? 'Put this version on screen — Undo takes it back'}>
                      <span><Button variant="secondary" appearance="outlined" onPress={() => onBringBack(v)} isDisabled={!!block} data-testid="planner-bring-back">Bring back</Button></span>
                    </Tooltip>
                  )}
                </li>
              )
            })}
          </ul>
        ) : <p className={styles.line}>No versions yet — Save a version keeps the layout as it is now, and each share with the client keeps one too.</p>}
      </div>
    </Drawer>
  )
}
