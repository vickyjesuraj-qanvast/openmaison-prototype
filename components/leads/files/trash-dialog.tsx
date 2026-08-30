'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'

/**
 * Move to Trash Folder? (931:39207, frame 105) — 400×216: Heading 72 p24 (title 20/Bold + close 24), body p0/24
 * (message 14/Regular #1a1a1a, 3 lines = 60), bottom 84 p24 → "No" secondary outlined · "Yes" filled #db382a.
 * Spec: design-source/context/lead-files/04-dialogs-move-deleted.txt. Shell = the wizard Dialog `size="form"`
 * (the tasks / quotes Delete dialogs); its body pads 12/24, so the message cancels that 12 to land on p0/24.
 * Copy verbatim for one item (the item's name in quotes — file or folder alike); several items are not mocked →
 * "these n items" replaces the quoted name (invented, logged in the build plan).
 */
export function TrashDialog({ open, names, onNo, onYes }: { open: boolean; names: string[]; onNo: () => void; onYes: () => void }) {
  const subject = names.length === 1 ? `"${names[0]}"` : `these ${names.length} items`
  return (
    <Dialog open={open} onClose={onNo} title="Move to Trash Folder?" width={400} size="form"
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onNo}>No</Button>
              <DangerButton onClick={onYes}>Yes</DangerButton>
            </>}>
      <span style={{ margin: '-12px 0', font: 'var(--om-type-body-m)', color: 'var(--om-color-on-surface-default)' }}>
        You sure you want to move {subject} to the Trash Folder and remove all project attachments (chat messages, invoices, etc.)?
      </span>
    </Dialog>
  )
}
