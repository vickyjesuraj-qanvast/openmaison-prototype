'use client'

import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { displayDate } from '@/lib/format'

/**
 * (REG-631, contracts parity Q-04) Moving a studio-marked signature back — the editor's pill and every list's status cell ask the same
 * question: what goes (the signed date, the signed copy, the copy kept at signing) and what stays (the quote it signed).
 */
export function UnsignDialog({ to, signedAt, onCancel, onConfirm }: { to: 'Draft' | 'Sent to Client' | null; signedAt: Date | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ConfirmDialog open={!!to} title={`Move back to ${to ?? 'Draft'}?`} confirmLabel="Move back" tone="danger"
                   message={`It was marked signed${signedAt ? ` on ${displayDate(signedAt)}` : ''}. Moving it back clears the signed date, the signed copy and the copy kept at signing, and the document can change again. The quote it signed stays Signed.`}
                   onCancel={onCancel} onConfirm={onConfirm} />
  )
}
