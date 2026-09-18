'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { excerptOf } from '@/lib/contracts/tokens'
import type { ContractTemplateOption } from '@/lib/contracts/queries'
import styles from './contract-template-picker.module.css'

/**
 * New Contract › From Template (REG-534): the quote picker's shape (REG-528 — Manage Templates link, cards you pick then Use)
 * on the contract templates: title · the first words · edited when; "Start from the studio agreement" when the library is empty.
 */
export function ContractTemplatePicker({ open, onClose, load, onUse, onStarter }: {
  open: boolean; onClose: () => void
  /** Fetches the live templates when the dialog opens (a server action). */
  load: () => Promise<ContractTemplateOption[]>
  onUse: (templateId: string) => void | Promise<void>
  onStarter: () => void | Promise<void>
}) {
  const [items, setItems] = useState<ContractTemplateOption[] | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setPicked(null); setItems(null) } }   // render-phase reset: the list ghosts until the fetch lands
  useEffect(() => {
    if (!open) return
    let live = true
    void load().then((r) => { if (live) setItems(r) }, () => { if (live) setItems([]) })
    return () => { live = false }
  }, [open, load])
  return (
    <Dialog open={open} onClose={onClose} title="Choose a contract template" size="modal" width={1200} portal
            subtitle={<span className={styles.sub}>Pick a template to start the contract from. <Link href="/company/templates/contracts" className={styles.manage}>Manage Templates</Link></span>}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={() => { void onStarter() }}>Start from the studio agreement</Button>
              <Button isDisabled={!picked} onPress={() => { if (picked) void onUse(picked) }}>Use template</Button>
            </>}>
      {items === null ? (
        <div className={styles.grid} aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className={styles.ghost} />)}</div>
      ) : items.length === 0 ? (
        <div className={styles.empty} role="status">
          <span className={styles.emptyGlyph}><Icon name="contract" size={40} weight={300} /></span>
          <span className={styles.emptyTitle}>No contract templates yet</span>
          <span className={styles.emptyHelp}>Save any contract as a template from its editor, or start from the studio agreement below.</span>
        </div>
      ) : (
        <div className={styles.grid} role="radiogroup" aria-label="Contract templates">
          {items.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={picked === t.id} className={styles.card} data-picked={picked === t.id || undefined} onClick={() => setPicked(t.id)} onDoubleClick={() => { void onUse(t.id) }} data-testid="contract-template-option">
              <span className={styles.thumb}><span className={styles.thumbTitle}>{t.title}</span><span className={styles.thumbText}>{excerptOf(t.body, 260)}</span></span>
              <span className={styles.name}>{t.title}</span>
              <span className={styles.meta}>Edited {t.updatedAt.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  )
}
