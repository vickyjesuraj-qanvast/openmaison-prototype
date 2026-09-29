'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Avatar } from '@/components/om/avatar'
import { MetaChip } from '@/components/om/meta-chip'
import type { TemplateVersion } from '@/lib/templates/model'
import { ago } from '@/lib/templates/ago'
import styles from './history-drawer.module.css'

/** History (REG-493): every published version, newest first, with Roll back — which publishes that version again as a new one. */
export function HistoryDrawer({ open, onClose, versions, current, now, busy, onRollback, canRollback = true }: {
  open: boolean; onClose: () => void; versions: TemplateVersion[]; current: number; now: number; busy: boolean; onRollback: (version: number) => void
  /** (REG-501) Roll back publishes — off for a gated Designer and for a deleted template. */
  canRollback?: boolean
}) {
  const [confirm, setConfirm] = useState<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)   // the exit frame keeps its version instead of 'vnull' (render-phase adjust, no ref in render)
  if (confirm !== null && shown !== confirm) setShown(confirm)
  return (
    <>
      <Drawer open={open} onClose={onClose} title="History" label="Template history">
        {versions.length === 0 ? <p className={styles.empty}>Nothing published yet. The first publish starts the history.</p> : (
          <ol className={styles.list}>
            {versions.map((v) => (
              <li key={v.version} className={styles.item} data-current={v.version === current || undefined}>
                <div className={styles.itemHead}>
                  <span className={styles.version}>v{v.version}{v.version === current ? <MetaChip>Current</MetaChip> : null}</span>   {/* (REG-729) the house tag, r4 — it was a pill */}
                  <span className={styles.when}>{ago(v.publishedAt, now)}</span>
                </div>
                {v.note ? <span className={styles.note}>{v.note}</span> : null}
                <div className={styles.itemFoot}>
                  {v.publishedBy ? <span className={styles.by}><Avatar name={v.publishedBy.name} color={v.publishedBy.color} size={20} tooltip={false} /> {v.publishedBy.name}</span> : <span />}
                  {v.version !== current && canRollback ? <Button appearance="text" isDisabled={busy} onPress={() => setConfirm(v.version)}>Roll back</Button> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Drawer>
      <ConfirmDialog open={confirm !== null} title={`Roll back to v${shown}?`} tone="primary" confirmLabel="Roll back"
                     message={`v${shown} is published again as v${current + 1}. Quotes already sent keep the version they were sent with; new quotes use the rolled-back design.`}
                     onCancel={() => setConfirm(null)} onConfirm={() => { const v = confirm; setConfirm(null); if (v !== null) onRollback(v) }} />
    </>
  )
}
