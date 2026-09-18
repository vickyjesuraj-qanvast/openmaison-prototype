'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Avatar } from '@/components/om/avatar'
import type { TemplateVersion } from '@/lib/templates/model'
import { ago } from '@/lib/templates/ago'
import styles from './history-drawer.module.css'

/** History (REG-493): every published version, newest first, with Roll back — which publishes that version again as a new one. */
export function HistoryDrawer({ open, onClose, versions, current, now, busy, onRollback }: { open: boolean; onClose: () => void; versions: TemplateVersion[]; current: number; now: number; busy: boolean; onRollback: (version: number) => void }) {
  const [confirm, setConfirm] = useState<number | null>(null)
  return (
    <>
      <Drawer open={open} onClose={onClose} title="History" label="Template history">
        {versions.length === 0 ? <p className={styles.empty}>Nothing published yet. The first publish starts the history.</p> : (
          <ol className={styles.list}>
            {versions.map((v) => (
              <li key={v.version} className={styles.item} data-current={v.version === current || undefined}>
                <div className={styles.itemHead}>
                  <span className={styles.version}>v{v.version}{v.version === current ? <span className={styles.currentTag}>Current</span> : null}</span>
                  <span className={styles.when}>{ago(v.publishedAt, now)}</span>
                </div>
                {v.note ? <span className={styles.note}>{v.note}</span> : null}
                <div className={styles.itemFoot}>
                  {v.publishedBy ? <span className={styles.by}><Avatar name={v.publishedBy.name} color={v.publishedBy.color} size={20} tooltip={false} /> {v.publishedBy.name}</span> : <span />}
                  {v.version !== current ? <Button appearance="text" isDisabled={busy} onPress={() => setConfirm(v.version)}>Roll back</Button> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Drawer>
      <ConfirmDialog open={confirm !== null} title={`Roll back to v${confirm}?`} tone="primary" confirmLabel="Roll back"
                     message={`v${confirm} is published again as v${current + 1}. Quotes already sent keep the version they were sent with; new quotes use the rolled-back design.`}
                     onCancel={() => setConfirm(null)} onConfirm={() => { const v = confirm; setConfirm(null); if (v !== null) onRollback(v) }} />
    </>
  )
}
