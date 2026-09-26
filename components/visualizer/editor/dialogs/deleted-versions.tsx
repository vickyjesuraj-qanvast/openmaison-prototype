'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { displayDate } from '@/lib/format'
import { joinWords } from '@/lib/visualizer/outputs'
import type { VersionView } from '@/lib/visualizer/model'
import type { Badge } from '../versions-strip'
import styles from './dialogs.module.css'

/** (F077) What deleting a version takes with it, as a sentence — its place on the client's link, their favourite, notes and pins. */
export function deleteVersionMessage(n: number, b: Badge | undefined, leadName: string | null): string {
  const first = leadName ? leadName.split(' ')[0]! : null
  const rest = [
    b?.notes ? `${b.notes} ${b.notes === 1 ? 'note' : 'notes'} from the client` : null,
    b?.pins ? `${b.pins} ${b.pins === 1 ? 'pin' : 'pins'}` : null,
  ].filter((x): x is string => !!x)
  const fav = b?.favourite ? `${first ?? 'The client'} picked it as the favourite` : null
  const said = fav && rest.length ? `${fav}, and it has ${joinWords(rest)}.` : fav ? `${fav}.` : rest.length ? `It has ${joinWords(rest)}.` : ''
  const parts = [
    b?.shared ? `V${n} is on ${first ? `${first}’s` : 'the client’s'} link.` : null,
    said || null,
    b?.shared ? 'Deleting it takes it off the link and out of the strip.' : 'Deleting it takes it out of the strip.',
    'You can bring it all back from Deleted versions.',
  ]
  return parts.filter(Boolean).join(' ')
}

/** (F077) The ask before deleting a version the client has seen or answered — named, with the way back. The editor deletes a version
    nobody has seen at once, with Undo (`carriesClientInput` in versions-strip.tsx decides which). */
export function DeleteVersionDialog({ version, badge, leadName, onCancel, onConfirm }: {
  version: Pick<VersionView, 'n'> | null; badge: Badge | undefined; leadName: string | null
  onCancel: () => void; onConfirm: () => void
}) {
  return (
    <ConfirmDialog open={!!version} title={version ? `Delete V${version.n}?` : ''} message={version ? deleteVersionMessage(version.n, badge, leadName) : undefined}
                   confirmLabel="Delete" onCancel={onCancel} onConfirm={onConfirm} />
  )
}

/**
 * Deleted versions (F077; the Deleted sheets' pattern, REG-625): a room's deleted versions with Restore — the way back once the
 * snackbar's Undo has gone. Opened from the strip's head. A restored version comes back with its badges, pins and place on its link.
 */
export function DeletedVersionsDialog({ open, onClose, room, versions, onRestore }: {
  open: boolean; onClose: () => void; room: string
  /** The room's deleted versions. */
  versions: VersionView[]
  /** Resolves true once the version is back (the dialog keeps the row busy until then). The host closes the dialog after the last one and
      says so in its snackbar; while others are left, the dialog says it in place. */
  onRestore: (v: VersionView) => Promise<boolean>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  /* (verify round 1) a restore says so in the dialog while others are left (a snackbar would land over it); the last one closes the
     dialog — the host does that, with its snackbar, since nothing is left to restore (`onRestore`) */
  const [back, setBack] = useState<string | null>(null)
  const [was, setWas] = useState(open)
  if (open !== was) { setWas(open); if (open) setBack(null) }
  /* (surfaces-23) the last restore closes the dialog, and the "n deleted" that opened it has gone from the strip — focus would fall to the
     page. Once the dialog has left, a page still holding focus hands it to the tile of the version that came back. */
  const restored = useRef<string | null>(null)
  useEffect(() => {
    if (open) { restored.current = null; return }
    const key = restored.current
    if (!key) return
    const t = setTimeout(() => {
      const a = document.activeElement
      if (a && a !== document.body && a.isConnected) return
      document.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"] [data-testid="viz-version"]`)?.focus({ preventScroll: true })
    }, 400)
    return () => clearTimeout(t)
  }, [open])
  const restore = async (v: VersionView) => {
    setBusy(v.key)
    try {
      const ok = await onRestore(v)
      if (ok) restored.current = v.key
      if (ok && versions.length > 1) setBack(`V${v.n} is back in the strip.`)
    } finally { setBusy(null) }
  }
  return (
    <Dialog open={open} onClose={onClose} title={`Deleted versions · ${room}`} subtitle="Restore one and it goes back in the strip — with its pins, and on any link it was shared on." size="modal" width={600}
            footer={<Button onPress={onClose}>Done</Button>}>
      <div className={styles.stack}>
      {back ? <span className={styles.hint} role="status" data-testid="viz-deleted-back"><Icon name="check_circle" size={16} weight={300} /> {back}</span> : null}
      {versions.length ? (
        <div className={styles.shared} data-testid="viz-deleted-list">
          {versions.map((v) => (
            <div key={v.key} className={styles.sharedRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.rowThumb} src={v.imageUrl} alt="" loading="lazy" />
              <span className={styles.sharedText}>V{v.n} · {v.descriptor}<span>Made {displayDate(new Date(v.createdAt))}</span></span>
              <span className={styles.rowActions}><Button appearance="text" isDisabled={busy !== null} onPress={() => { void restore(v) }}>{busy === v.key ? 'Restoring…' : 'Restore'}</Button></span>
            </div>
          ))}
        </div>
      ) : <span className={styles.hint}>Nothing deleted in {room}.</span>}
      </div>
    </Dialog>
  )
}
