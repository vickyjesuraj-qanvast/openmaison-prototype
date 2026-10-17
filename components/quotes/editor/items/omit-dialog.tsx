'use client'

import { useState, type MouseEvent } from 'react'
import { Button, Checkbox, SearchBar } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { money2 } from '@/lib/quotes/math'
import type { ContractLine } from '@/app/projects/money-actions'
import styles from './omit-dialog.module.css'

/**
 * (gaps build B, item 7 — 1.0 G-151 "Omit from contract") A variation order's picker of the signed quote's lines, under the contract's own
 * sections, ticked: each becomes an editable credit on the order (a line with a minus quantity at its signed price). A line the order omits
 * already is greyed and says so. The Price book modal's list and rows (its stylesheet, composed). Closes once the lines land.
 */
export function OmitDialog({ open, contract, lines, loading, busy, onClose, onOmit }: {
  open: boolean; contract: string | null; lines: ContractLine[]; loading: boolean; busy: boolean
  onClose: () => void; onOmit: (ids: string[]) => void
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setPicked([]); setQuery('') } }
  const q = query.trim().toLowerCase()
  const shown = lines.filter((l) => !q || l.name.toLowerCase().includes(q) || l.group.toLowerCase().includes(q))
  const groups = [...new Set(shown.map((l) => l.group))]
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const onRow = (l: ContractLine) => (e: MouseEvent) => { if (l.omitted || (e.target as HTMLElement).closest('label, input, button, a')) return; toggle(l.id) }
  const n = picked.length
  return (
    <Dialog open={open} onClose={onClose} title="Omit from the contract" size="modal" width={800} height={640} portal
            subtitle={`Tick the lines being taken out of ${contract ? `the signed quote ${contract}` : 'the signed quote'}. Each becomes a credit on this variation order — a line with a minus quantity you can still change.`}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => onOmit(picked)} isDisabled={busy || !n} data-testid="omit-add">{busy ? 'Adding…' : n ? `Add ${n} omission${n === 1 ? '' : 's'}` : 'Add omissions'}</Button></>}>
      <div className={styles.body} data-testid="omit-dialog">
        <div className={styles.toolbar}>
          <span className={styles.search}><SearchBar appearance="outlined" size="md" placeholder="Search the contract’s lines" aria-label="Search the contract’s lines" value={query} onChange={setQuery} /></span>
        </div>
        {loading ? <p className={styles.meta} role="status">Reading the signed quote…</p>
          : !lines.length ? (
            <div className={styles.empty} role="status"><span className={styles.emptyGlyph} aria-hidden><Icon name="request_quote" size={40} weight={300} /></span><span className={styles.emptyTitle}>No signed quote lines</span><span className={styles.emptyHelp}>This project’s contract has no lines of its own to omit — write the omission as a line with a minus quantity.</span></div>
          ) : !shown.length ? (
            <div className={styles.empty} role="status"><span className={styles.emptyGlyph} aria-hidden><Icon name="search" size={40} weight={300} /></span><span className={styles.emptyTitle}>No matching contract lines</span></div>
          ) : (
            <div className={styles.list} role="list" aria-label="The contract’s lines">
              {groups.map((g) => (
                <div key={g} role="presentation">
                  <div className={styles.groupHead} role="presentation">{g}</div>
                  {shown.filter((l) => l.group === g).map((l) => {
                    const on = picked.includes(l.id)
                    return (
                      <div key={l.id} className={styles.row} role="listitem" data-selected={on || undefined} data-omitted={l.omitted || undefined} data-testid="omit-line" onClick={onRow(l)}>
                        <Checkbox isSelected={on || l.omitted} isDisabled={l.omitted} onChange={() => toggle(l.id)} aria-label={`Omit ${l.name}`} />
                        <span className={styles.text}>
                          <span className={styles.name}>{l.name}{l.omitted ? <MetaChip>Omitted</MetaChip> : null}</span>
                          <span className={styles.meta}>{l.qty}{l.unit ? ` ${l.unit}` : ''}</span>
                        </span>
                        <span className={styles.price}>{money2(l.amountMinor)}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
      </div>
    </Dialog>
  )
}
