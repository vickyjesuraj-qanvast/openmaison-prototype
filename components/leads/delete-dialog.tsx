'use client'

import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'
import { TextField } from '@/components/om/text-field'
import styles from '@/components/leads/move-stage/wizard.module.css'
import type { LeadRow } from '@/lib/leads/queries'
import { LEAD_HAS_PROJECT } from '@/lib/projects/handover-model'
import { renderLinksLine, useLiveRenderLinks } from './use-render-links'

/**
 * "Delete this lead?" — copy verbatim from frame 779:24663; bulk variant (B1) pluralises.
 * (fix-E, A-09 · E-08 · E-10 · Q-27) It knows up front which leads have a live project: one such lead is refused here, in Q-27's words, with
 * Open project in place of Delete (no reason asked for); in a bulk delete they are named and stay, and only the others are deleted — the
 * server still refuses any batch that holds one (REG-1027), so `onDelete` gets the ids it may take.
 */
export function DeleteLeadDialog({
  leads, onClose, onDelete, reason, setReason, liveLinks = 0, onOpenProject,
}: {
  leads: LeadRow[] | null
  /** (REG-607, parity Q-04) Contracts of these leads whose signing link is still live with the client — 1.0's archive warned about them. */
  liveLinks?: number
  onClose: () => void
  /** The leads to delete — those without a live project. */
  onDelete: (ids: string[]) => void
  reason: string
  setReason: (v: string) => void
  /** (fix-E, E-10) Open project, in place of Delete when every picked lead has one. */
  onOpenProject?: (projectId: string) => void
}) {
  const held = (leads ?? []).filter((l) => l.project)
  const free = (leads ?? []).filter((l) => !l.project)
  const lead = free.length === 1 ? free[0] : null
  const many = free.length > 1 ? free.length : 0
  const refused = !!leads && leads.length > 0 && free.length === 0
  /* (wave E, E8) Deleting a lead closes the client render links shared from its designs (the client's page then says the link ended) —
     the dialog says so first, as it does for signing links. Counted here, so the listing and the lead's page both warn. */
  const renderLine = renderLinksLine(useLiveRenderLinks(leads && !refused ? free.map((l) => l.id) : null), many > 0)
  const heldNames = held.map((l) => l.name)
  const heldLine = held.length === 1 ? `${heldNames[0]} has a project, so it stays — delete the project first.`
    : held.length > 1 ? `${heldNames.slice(0, 3).join(', ')}${held.length > 3 ? ` and ${held.length - 3} more` : ''} have a project, so they stay — delete the projects first.` : null
  if (refused) {
    const one = held.length === 1 ? held[0]! : null
    return (
      <Dialog open onClose={onClose} title={one ? 'This lead can’t be deleted' : 'These leads can’t be deleted'} width={400}
              subtitle={one ? <span className={styles.subtitle}><span>{one.name}</span><span>·</span><span>Project {one.project!.number}</span></span> : undefined}
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>
                {one && onOpenProject ? <Button onPress={() => onOpenProject(one.project!.id)} data-testid="delete-lead-open-project">Open project</Button> : null}
              </>}>
        <span className={styles.helper} data-testid="delete-lead-refused">{one ? LEAD_HAS_PROJECT : heldLine}</span>
      </Dialog>
    )
  }
  return (
    <Dialog open={!!leads && leads.length > 0} onClose={onClose}
            title={many ? `Delete ${many} leads?` : 'Delete this lead?'} width={400}
            subtitle={lead ? (
              <span className={styles.subtitle}>
                <span>{lead.name}</span><span>·</span><span>Current stage: {lead.stage}</span>
              </span>
            ) : many ? (
              <span className={styles.subtitle}><span>{free.map((l) => l.name).slice(0, 3).join(', ')}{many > 3 ? ` +${many - 3} more` : ''}</span></span>
            ) : undefined}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <DangerButton onClick={() => onDelete(free.map((l) => l.id))}>Delete</DangerButton>
            </>}>
      <TextField label="Reason" mode="select" value={reason} onChange={setReason}
                 options={['Spam', 'Duplicate', 'Not a real lead', 'Others']} />
      {heldLine ? <span className={styles.helper} role="alert" data-testid="delete-lead-held">{heldLine}</span> : null}
      {liveLinks > 0 ? (
        <span className={styles.helper} role="alert" data-testid="live-links">
          {liveLinks === 1 ? 'A signing link is still live with the client — deleting voids it.' : `${liveLinks} signing links are still live with clients — deleting voids them.`}
        </span>
      ) : null}
      {renderLine ? <span className={styles.helper} role="alert" data-testid="live-render-links">{renderLine}</span> : null}
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
