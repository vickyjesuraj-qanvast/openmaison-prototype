'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Drawer, DrawerRule } from '@/components/om/drawer'
import { useSnackbar } from '@/components/om/snackbar'
import { displayDate, displayTime } from '@/lib/format'
import { money2, type NamedDiscount } from '@/lib/quotes/math'
import { changeSummary, snapshotState, summaryText, versionState, type ChangeSummary } from '@/lib/quotes/diff'
import { copyText } from '@/lib/clipboard'
import type { QuotePayment, QuoteVersion } from '@/lib/db/schema'
import type { Member, QuoteItem } from '@/lib/db/schema'
import { Tooltip } from '@/components/om/tooltip'
import styles from './version-history.module.css'

/**
 * (REG-565) ⋯ › Version History: the quote's versions, newest first — the current one on top, then every kept version with
 * when it was kept, by whom, what it was and its amount, and Open (the read-only preview at `?version=n`). Revise sits in the
 * drawer's head for a quote past Draft: it keeps this version and starts the next.
 * (S44F — NB-02 (b) · (c), 1.0 `urbanhomedemo` 479480a5e) Under every version past the first, what changed from the one before it in plain
 * words — each line's move, the schedule, the total before → after, the lines untouched — with Copy; and Compare, the version against an
 * earlier one in Preview.
 */
export function VersionHistoryDrawer({ open, onClose, current, versions, members, canRevise, reviseHint, onRevise, onOpen, changes, canBringBack = false, onBringBack, live = null, onCompare }: {
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
  /** (S44F — NB-02 (b)) the quote as the editor holds it now — the current version's "what changed" (null while the drawer is shut) */
  live?: { items: QuoteItem[]; payments: QuotePayment[]; pricing: { totalMinor: number; additionalDiscountMode: string; additionalDiscountValue: number; gstEnabled: boolean; discounts: NamedDiscount[] } } | null
  /** (S44F — NB-02 (c)) Compare: the version against the one before it, in Preview */
  onCompare?: (version: number) => void
}) {
  const snackbar = useSnackbar()
  const [shown, setShown] = useState<number | null>(null)   // the version whose changes are open
  const who = (id: string | null) => members.find((m) => m.id === id)?.name ?? 'the studio'
  const snapshot = (v: QuoteVersion): { status: string; amountMinor: number } => {
    try { const j = JSON.parse(v.snapshotJson) as { quote?: { status?: string; amountMinor?: number } }; return { status: j.quote?.status ?? '', amountMinor: j.quote?.amountMinor ?? 0 } } catch { return { status: '', amountMinor: 0 } }
  }
  /* (S44F — NB-02 (b)) each version against the one before it — the kept ones from their snapshots, the current one from the editor */
  const summaries = useMemo(() => {
    const out = new Map<number, ChangeSummary>()
    if (!open) return out
    const states = new Map(versions.flatMap((v) => { const st = snapshotState(v.version, v.snapshotJson); return st ? [[v.version, st] as const] : [] }))
    if (live) states.set(current.version, versionState(current.version, live.items, live.payments, live.pricing))
    for (const [v, st] of states) { const prev = states.get(v - 1); if (prev) out.set(v, changeSummary(prev, st)) }
    return out
  }, [open, versions, live, current.version])
  const copy = (s: ChangeSummary) => { void copyText(summaryText(s)).then(() => snackbar({ message: `What changed in version ${s.to} copied` }), () => snackbar({ message: 'Couldn’t copy — please try again' })) }
  /* what changed, under a version — the row's full width: a line with the count and the total (the current version's count is the line above
     it, REG-595), the words on demand, Copy and Compare */
  const changed = (v: number, current = false) => {
    const s = summaries.get(v)
    if (!s) return null
    const n = s.lines.length
    const isOpen = shown === v
    const total = s.totalBefore !== s.totalAfter ? `total ${money2(s.totalBefore)} → ${money2(s.totalAfter)}` : 'total unchanged'
    const untouched = s.untouched ? ` · ${s.untouched} ${s.untouched === 1 ? 'line' : 'lines'} untouched` : ''
    return (
      <span className={styles.changes} data-testid={`version-changes-${v}`}>
        <span className={styles.meta}>{current ? `${total.replace(/^t/, 'T')}${untouched}` : `${n ? `${n} ${n === 1 ? 'change' : 'changes'} from version ${s.from}` : `No line changed from version ${s.from}`} · ${total}${untouched}`}</span>
        {isOpen && n ? <ul className={styles.changeList} aria-label={`What changed in version ${v}`} data-testid={`version-change-list-${v}`}>{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
        <span className={styles.changeActions}>
          {n ? <Button appearance="text" onPress={() => setShown(isOpen ? null : v)} aria-expanded={isOpen}>{isOpen ? 'Hide what changed' : 'What changed'}</Button> : null}
          <Button appearance="text" iconStart={<Icon name="content_copy" size={18} />} onPress={() => copy(s)} data-testid={`version-copy-${v}`}>Copy</Button>
          {onCompare ? <Tooltip label={`See version ${v} against version ${v - 1}, the changes marked`}><span><Button appearance="text" onPress={() => onCompare(v)} data-testid={`version-compare-${v}`}>Compare</Button></span></Tooltip> : null}
        </span>
      </span>
    )
  }
  return (
    <Drawer open={open} onClose={onClose} title="Version History" label="Version History"
            footer={<Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>}>
      <div className={styles.body} data-testid="version-history">
        <div className={styles.head}>
          <p className={styles.help}>Revise keeps the quote as sent and starts the next version under the same number. A kept version opens read-only.</p>
          <Button iconStart={<Icon name="history" size={20} />} onPress={onRevise} isDisabled={!canRevise}>Revise — start version {current.version + 1}</Button>
          {!canRevise ? <span className={styles.hint}>{reviseHint}</span> : null}
        </div>
        <DrawerRule />
        <ol className={styles.list} aria-label="Versions">
          <li className={styles.row} data-current="" data-changes={summaries.has(current.version) || undefined}>
            <span className={styles.dot} aria-hidden />
            <span className={styles.text}>
              <span className={styles.title}>Version {current.version} <span className={styles.tag}>current</span></span>
              <span className={styles.meta}>{current.status} · {money2(current.amountMinor)} · saved {displayDate(new Date(current.updatedAt))}</span>
              {changes && versions.length ? <span className={styles.meta}>Since version {current.version - 1}: {changes.added} added · {changes.removed} removed · {changes.changed} changed — the print shows them struck through and marked</span> : null}
            </span>
            {changed(current.version, true)}
          </li>
          {versions.map((v) => {
            const snap = snapshot(v)
            return (
              <li key={v.id} className={styles.row} data-changes={summaries.has(v.version) || undefined}>
                <span className={styles.dot} aria-hidden />
                <span className={styles.text}>
                  <span className={styles.title}>Version {v.version}</span>
                  <span className={styles.meta}>{snap.status} · {money2(snap.amountMinor)} · kept {displayDate(v.createdAt)} {displayTime(v.createdAt)} by {who(v.createdBy)}</span>
                  {v.note ? <span className={styles.meta} data-testid="version-request">Client’s request: {v.note}</span> : null}   {/* (UX audit Q10) Revise's own field */}
                </span>
                <span className={styles.actions}>
                  <Button appearance="text" onPress={() => onOpen(v.version)}>Open</Button>
                  {onBringBack ? (
                    <Tooltip label={canBringBack ? `Put version ${v.version}’s lines back into the draft` : 'Revise first — only a draft takes a version back'}>
                      <span><Button appearance="text" isDisabled={!canBringBack} onPress={() => onBringBack(v.version)}>Bring back</Button></span>
                    </Tooltip>
                  ) : null}
                </span>
                {changed(v.version)}
              </li>
            )
          })}
        </ol>
      </div>
    </Drawer>
  )
}
