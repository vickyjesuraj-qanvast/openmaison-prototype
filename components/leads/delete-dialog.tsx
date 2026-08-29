'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'
import { TextField } from '@/components/om/text-field'
import styles from '@/components/leads/move-stage/wizard.module.css'
import type { LeadRow } from '@/lib/leads/queries'

/** "Delete this lead?" — copy verbatim from frame 779:24663; bulk variant (B1) pluralises. */
export function DeleteLeadDialog({
  leads, onClose, onDelete, reason, setReason,
}: {
  leads: LeadRow[] | null
  onClose: () => void
  onDelete: () => void
  reason: string
  setReason: (v: string) => void
}) {
  const lead = leads && leads.length === 1 ? leads[0] : null
  const many = leads && leads.length > 1 ? leads.length : 0
  return (
    <Dialog open={!!leads && leads.length > 0} onClose={onClose}
            title={many ? `Delete ${many} leads?` : 'Delete this lead?'} width={400}
            subtitle={lead ? (
              <span className={styles.subtitle}>
                <span>{lead.name}</span><span>·</span><span>Current stage: {lead.stage}</span>
              </span>
            ) : leads && many ? (
              <span className={styles.subtitle}><span>{leads.map((l) => l.name).slice(0, 3).join(', ')}{many > 3 ? ` +${many - 3} more` : ''}</span></span>
            ) : undefined}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <DangerButton onClick={onDelete}>Delete</DangerButton>
            </>}>
      <TextField label="Reason" mode="select" value={reason} onChange={setReason}
                 options={['Spam', 'Duplicate', 'Not a real lead', 'Others']} />
      {lead ? (
        <span className={styles.helper}>
          “{lead.name}” will be permanently deleted in 30 days. Until then, collaborators can view it in the deleted folder.
        </span>
      ) : many ? (
        <span className={styles.helper}>
          These {many} leads will be permanently deleted in 30 days. Until then, collaborators can view them in the deleted folder.
        </span>
      ) : null}
    </Dialog>
  )
}
