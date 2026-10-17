'use client'

import { NoteDialog } from '@/components/templates/editor/review-bar'

/**
 * (REG-951 · fix-C) An update's **Send back** — the Updates tab's note dialog: why it goes back, read by whoever wrote it (or whoever sent the
 * held change); the client never sees it. (simplify round 2, S-20 · P2 §6.7 — the owner's "fix all the pending things" 2026-10-09) One piece
 * for both doors: the update card's band on Updates and the Overview's Needs your OK row, so the dialog, its help and its sentence read the
 * same wherever it opens. The host sends it (`sendBackProjectUpdate`) and says `sentence`.
 */
export function UpdateSendBackDialog({ target, clientFirst, busy, onClose, onSend }: {
  /** The update going back and whoever reads the note — the held change's sender, else who sent it for review, else its author. */
  target: { id: string; by: string | null } | null
  clientFirst: string
  busy: boolean
  onClose: () => void
  onSend: (id: string, note: string, sentence: string) => void
}) {
  return (
    <NoteDialog open={!!target} title="Send back" label="Why does it go back?" action="Send back" required maxLength={300} busy={busy}
                help={`${target?.by ?? 'Whoever wrote it'} reads this on the update; ${clientFirst} never sees it.`}
                onClose={onClose}
                onSubmit={(note) => { if (target) onSend(target.id, note, `Sent back to ${target.by ?? 'its author'}`) }} />
  )
}
