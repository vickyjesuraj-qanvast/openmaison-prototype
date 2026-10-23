'use client'

import { Button } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import doc from './document.module.css'

/**
 * A Smart Text chip's tap sheet (B-19 · C-15): on touch the chip's "Prints as" was a hover-only tooltip, so a tap said nothing. Now: the chip's
 * name as the title, what it prints on this document (or that it is empty and prints its label in brackets), where it fills in from, and
 * Remove — which answers with Undo. A bottom sheet on a phone, a 400 dialog on a tablet.
 */
export function ChipSheet({ open, onClose, label, prints, note, source, locked = false, onRemove }: {
  open: boolean; onClose: () => void
  label: string
  /** The value it prints here, or null when the record is empty (then `note` says so) or unknown (a template — `source` alone). */
  prints: string | null
  note: string | null
  source: string
  locked?: boolean
  onRemove: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title={label} size="form" width={400} portal
            footer={<>
              <FootStart><Button variant="secondary" appearance="outlined" onPress={onRemove} isDisabled={locked} data-testid="chip-remove">Remove</Button></FootStart>
              <Button onPress={onClose} data-testid="chip-done">Done</Button>
            </>}>
      <div className={doc.prints} data-testid="chip-sheet">
        <div className={doc.printsAs}>Prints as</div>
        {prints ? <div className={doc.printsValue}>{prints}</div> : note ? <div className={doc.printsNote}>{note}</div> : <div className={doc.printsValue}>{`[${label}]`}</div>}
        <div className={doc.printsSource}>{source}</div>
      </div>
    </Dialog>
  )
}
