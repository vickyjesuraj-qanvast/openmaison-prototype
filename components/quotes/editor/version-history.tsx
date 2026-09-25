'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Drawer, DrawerRule } from '@/components/om/drawer'
import { displayDate, displayTime } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import type { QuoteVersion } from '@/lib/db/schema'
import type { Member } from '@/lib/db/schema'
import { Tooltip } from '@/components/om/tooltip'
import styles from './version-history.module.css'

/**
 * (REG-565) ⋯ › Version History: the quote's versions, newest first — the current one on top, then every kept version with
 * when it was kept, by whom, what it was and its amount, and Open (the read-only preview at `?version=n`). Revise sits in the
 * drawer's head for a quote past Draft: it keeps this version and starts the next.
 */
export function VersionHistoryDrawer({ open, onClose, current, versions, members, canRevise, reviseHint, onRevise, onOpen, changes, canBringBack = false, onBringBack }: {
  open: boolean
  /** (REG-595) What changed since the last kept version — added · removed · changed. */
  changes?: { added: number; removed: number; changed: number } | null
  onClose: () => void
  current: { version: number; status: string; amountMinor: number; updatedAt: number }
  versions: QuoteVersion[]
  members: Member[]
  canRevise: boolean
  reviseHint: string
  onRevise: () => void
  onOpen: (version: number) => void
  /** (REG-625, parity Q-25) A Draft takes a kept version back; a quote the client has is revised first. */
  canBringBack?: boolean
  onBringBack?: (version: number) => void
}) {
  const who = (id: string | null) => members.find((m) => m.id === id)?.name ?? 'the studio'
  const snapshot = (v: QuoteVersion): { status: string; amountMinor: number } => {
    try { const j = JSON.parse(v.snapshotJson) as { quote?: { status?: string; amountMinor?: number } }; return { status: j.quote?.status ?? '', amountMinor: j.quote?.amountMinor ?? 0 } } catch { return { status: '', amountMinor: 0 } }
  }
  return (
    <Drawer open={open} onClose={onClose} title="Version History" label="Version History" width={420}
            footer={<Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>}>
      <div className={styles.body} data-testid="version-history">
        <div className={styles.head}>
          <p className={styles.help}>Revise keeps the quote as sent and starts the next version under the same number. A kept version opens read-only.</p>
          <Button iconStart={<Icon name="history" size={20} />} onPress={onRevise} isDisabled={!canRevise}>Revise — start version {current.version + 1}</Button>
          {!canRevise ? <span className={styles.hint}>{reviseHint}</span> : null}
        </div>
        <DrawerRule />
        <ol className={styles.list} aria-label="Versions">
          <li className={styles.row} data-current="">
            <span className={styles.dot} aria-hidden />
            <span className={styles.text}>
              <span className={styles.title}>Version {current.version} <span className={styles.tag}>current</span></span>
              <span className={styles.meta}>{current.status} · {money2(current.amountMinor)} · saved {displayDate(new Date(current.updatedAt))}</span>
              {changes && versions.length ? <span className={styles.meta}>Since version {current.version - 1}: {changes.added} added · {changes.removed} removed · {changes.changed} changed — the print shows them struck through and marked</span> : null}
            </span>
          </li>
          {versions.map((v) => {
            const snap = snapshot(v)
            return (
              <li key={v.id} className={styles.row}>
                <span className={styles.dot} aria-hidden />
                <span className={styles.text}>
                  <span className={styles.title}>Version {v.version}</span>
                  <span className={styles.meta}>{snap.status} · {money2(snap.amountMinor)} · kept {displayDate(v.createdAt)} {displayTime(v.createdAt)} by {who(v.createdBy)}{v.note ? ` · ${v.note}` : ''}</span>
                </span>
                <span className={styles.actions}>
                  <Button appearance="text" onPress={() => onOpen(v.version)}>Open</Button>
                  {onBringBack ? (
                    <Tooltip label={canBringBack ? `Put version ${v.version}’s lines back into the draft` : 'Revise first — only a draft takes a version back'}>
                      <span><Button appearance="text" isDisabled={!canBringBack} onPress={() => onBringBack(v.version)}>Bring back</Button></span>
                    </Tooltip>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </Drawer>
  )
}
