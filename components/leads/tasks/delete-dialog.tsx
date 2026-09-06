'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'

/**
 * Delete Task (902:27738) / Delete all Tasks (902:27750) — 400×196: Heading 72 p24 (title 20/Bold + close 24),
 * body p0/24 (message 14/Regular, 2 lines = 40), bottom 84 p24 → "No" secondary outlined · "Yes" filled red.
 * The wizard Dialog `size="form"` is the closest shell (72 head with the h3 title, 84 footer, no rules); its body
 * pads 12/24 (784:113420), so the message cancels that 12 to land on the mock's p0/24 and 196 total.
 * ConfirmDialog was not used: its compact shell sets an h4 title and a 12px secondary message.
 * Several-but-not-all selected → "Delete Tasks" / "these tasks" (the Quotes twin's plural, invented — audit 2026-08-30, T4).
 */
export function DeleteTasksDialog({ open, all, count = 1, onNo, onYes }: { open: boolean; all: boolean; count?: number; onNo: () => void; onYes: () => void }) {
  const many = !all && count > 1
  return (
    <Dialog open={open} onClose={onNo} title={all ? 'Delete all Tasks' : many ? 'Delete Tasks' : 'Delete Task'} width={400} size="form" alert
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onNo}>No</Button>
              <DangerButton onClick={onYes}>Yes</DangerButton>
            </>}>
      <span style={{ margin: '-12px 0', font: 'var(--om-type-body-m)', color: 'var(--om-color-on-surface-default)' }}>
        {all
          ? 'Are you sure you want to delete all tasks in this project? This action cannot be undone.'
          : many
            ? 'Are you sure you want to delete these tasks from this project? This action cannot be undone.'
            : 'Are you sure you want to delete this task from this project? This action cannot be undone.'}
      </span>
    </Dialog>
  )
}
