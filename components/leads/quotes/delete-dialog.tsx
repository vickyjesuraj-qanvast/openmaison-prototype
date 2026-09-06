'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'

/**
 * Delete Quote / Delete Quotes — no quotes dialog mock (910-36240 has none), so this is the Tasks tab's Delete Task
 * dialog (902:27738, components/leads/tasks/delete-dialog.tsx) with "quote" substituted for "task" in the title
 * and the message. Shell: 400×196 — Heading 72 p24 (title 20/Bold + close 24), body p0/24 (message 14/Regular),
 * bottom 84 p24 → "No" secondary outlined · "Yes" filled red. The wizard Dialog `size="form"` body pads 12/24,
 * so the message cancels that 12 to land on p0/24.
 */
export function DeleteQuotesDialog({ open, count, onNo, onYes }: { open: boolean; count: number; onNo: () => void; onYes: () => void }) {
  const many = count > 1
  return (
    <Dialog open={open} onClose={onNo} title={many ? 'Delete Quotes' : 'Delete Quote'} width={400} size="form" alert
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onNo}>No</Button>
              <DangerButton onClick={onYes}>Yes</DangerButton>
            </>}>
      <span style={{ margin: '-12px 0', font: 'var(--om-type-body-m)', color: 'var(--om-color-on-surface-default)' }}>
        {many
          ? 'Are you sure you want to delete these quotes from this project? This action cannot be undone.'
          : 'Are you sure you want to delete this quote from this project? This action cannot be undone.'}
      </span>
    </Dialog>
  )
}
