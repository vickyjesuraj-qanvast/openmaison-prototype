'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'

/**
 * Delete Contract / Delete Contracts — no Contracts dialog mock (931-38609 has only the empty state and the listing),
 * so this is the Quotes tab's delete dialog (components/leads/quotes/delete-dialog.tsx, itself the Tasks Delete Task
 * dialog 902:27738) with "contract" substituted for "quote" in the title and the message (REG-178).
 * Shell: 400×196 — Heading 72 p24 (title 20/Bold + close 24), body p0/24 (message 14/Regular),
 * bottom 84 p24 → "No" secondary outlined · "Yes" filled red. The wizard Dialog `size="form"` body pads 12/24,
 * so the message cancels that 12 to land on p0/24.
 */
export function DeleteContractsDialog({ open, count, onNo, onYes }: { open: boolean; count: number; onNo: () => void; onYes: () => void }) {
  const many = count > 1
  return (
    <Dialog open={open} onClose={onNo} title={many ? 'Delete Contracts' : 'Delete Contract'} width={400} size="form" alert
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onNo}>No</Button>
              <DangerButton onClick={onYes}>Yes</DangerButton>
            </>}>
      <span style={{ margin: '-12px 0', font: 'var(--om-type-body-m)', color: 'var(--om-color-on-surface-default)' }}>
        {/* (REG-631, contracts parity E-115) Deleting is soft: the editor's dialog and this one say the same thing. */}
        {many
          ? 'Are you sure you want to delete these contracts? You can restore them from Deleted Contracts.'
          : 'Are you sure you want to delete this contract? You can restore it from Deleted Contracts.'}
      </span>
    </Dialog>
  )
}
