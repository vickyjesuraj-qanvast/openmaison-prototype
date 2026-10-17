'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { DangerButton, Dialog, DialogMessage } from '@/components/om/dialog'
import { readProjectDelete, type DeleteRead } from '@/app/projects/ending-actions'
import wizard from '@/components/leads/move-stage/wizard.module.css'   // (parity P-36) the lead's delete subtitle, its own class

/**
 * (Projects round 7, Q-26) Delete project… — ConfirmDialog's shape (the house head and foot, 400, the 14/20 message, Cancel + the red verb),
 * on `Dialog` because it first reads what keeps a project: money recorded against it refuses the delete, and the dialog says so in the
 * money module's words with Open Money in place of Delete. A direct project's client record goes with it; a Won lead stays Won.
 * (parity P-36, D-10) It reads as the lead's "Delete this lead?" (frame 779:24663): the title "Delete this project?" and, under it, the lead's
 * subtitle — "{name} · Current stage: {stage}" — the stage the read hands back (On hold while held); the retention words stay the project's own
 * (Q-11: until deleted forever).
 */
export function DeleteProjectDialog({ projectId, open, onClose, onDelete, onOpenMoney }: {
  projectId: string | null
  open: boolean
  onClose: () => void
  onDelete: () => void
  onOpenMoney: () => void
}) {
  const [d, setD] = useState<DeleteRead | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setD(null); setFailed(null) } }
  useEffect(() => {
    if (!open || !projectId) return
    let live = true
    void readProjectDelete(projectId).then((r) => { if (live) { if ('error' in r) setFailed(r.error); else setD(r) } }, () => { if (live) setFailed('Couldn’t check the project — please try again') })
    return () => { live = false }
  }, [open, projectId])
  /* the project's stage as its read gives it (`stage`, the words the header's Stage button wears) — before the read carries it, the name alone */
  const stage = (d as (DeleteRead & { stage?: string | null }) | null)?.stage ?? null
  const message = failed ?? (!d ? 'Checking the project…'
    : d.block ? `${d.name} can’t be deleted. ${d.block}`
    : `${d.name} moves to Deleted Projects, where an Owner or an Admin can restore it. ${d.direct ? `${d.client}’s details go with it.` : `${d.client}’s lead stays Won — its page offers Make the project again.`}`)
  return (
    /* (fix-E, E-27) a refusal is not a question: the title says what the body says */
    <Dialog open={open} onClose={onClose} title={d?.block ? 'This project can’t be deleted' : 'Delete this project?'} width={400} alert
            subtitle={d ? <span className={wizard.subtitle} data-testid="delete-project-subtitle"><span>{d.name}</span>{stage ? <><span>·</span><span>Current stage: {stage}</span></> : null}</span> : undefined}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>{d?.block || failed ? 'Close' : 'Cancel'}</Button>
              {d?.block ? <Button onPress={onOpenMoney} data-testid="delete-open-money">Open Money</Button>
                : failed ? null : <DangerButton onClick={onDelete} disabled={!d}>Delete</DangerButton>}
            </>}>
      <span data-testid="delete-project-dialog"><DialogMessage>{message}</DialogMessage></span>
    </Dialog>
  )
}
