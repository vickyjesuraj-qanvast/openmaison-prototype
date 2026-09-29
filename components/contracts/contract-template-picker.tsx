'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { excerptOf } from '@/lib/contracts/tokens'
import type { ContractPickerData, ContractTemplateOption } from '@/lib/contracts/queries'
import { FolderCard, FolderGroup } from '@/components/om/folders/folder-card'
import { FolderCrumbs } from '@/components/om/folders/folder-crumbs'
import { useFolderBrowse } from '@/components/om/folders/use-folder-browse'
import { displayDate } from '@/lib/format'
import styles from './contract-template-picker.module.css'

/**
 * New Contract › From Template (REG-534): the quote picker's shape (REG-528 — Manage Templates link, cards you pick then Use)
 * on the contract templates: title · the first words · edited when; "Start from the studio agreement" when the library is empty.
 */
export function ContractTemplatePicker({ open, onClose, load, onUse, onStarter }: {
  open: boolean; onClose: () => void
  /** Fetches the live templates — and (REG-664) the library's folders — when the dialog opens (a server action). */
  load: () => Promise<ContractPickerData>
  onUse: (templateId: string) => void | Promise<void>
  onStarter: () => void | Promise<void>
}) {
  const [items, setItems] = useState<ContractTemplateOption[] | null>(null)
  const [folders, setFolders] = useState<ContractPickerData['folders']>([])
  /* (REG-664) Browse Templates › Contracts' folders; the studio default stays pinned at the top wherever it is filed. */
  const browse = useFolderBrowse(folders, items ?? [], { query: '', pinned: (t) => t.isDefault })
  const pathname = usePathname()
  const [picked, setPicked] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setPicked(null); setItems(null); browse.go(null) } }   // render-phase reset: the list ghosts until the fetch lands
  useEffect(() => {
    if (!open) return
    let live = true
    /* (REG-632, parity Q-13) The studio's default arrives picked — Use template starts from it. */
    void load().then((r) => { if (live) { setItems(r.templates); setFolders(r.folders); setPicked((p) => p ?? r.templates.find((t) => t.isDefault)?.id ?? null) } }, () => { if (live) setItems([]) })
    return () => { live = false }
  }, [open, load])
  return (
    <Dialog open={open} onClose={onClose} title="Choose a contract template" size="modal" width={1200} portal
            subtitle={<span className={styles.sub}>Pick a template to start the contract from. <Link href={withFrom('/company/templates/contracts', pathname)} className={styles.manage}>Manage Templates</Link></span>}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={() => { void onStarter() }}>Start from the studio agreement</Button>
              <Button isDisabled={!picked} onPress={() => { if (picked) void onUse(picked) }}>Use template</Button>
            </>}>
      {items === null ? (
        <div className={styles.grid} aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className={styles.ghost} />)}</div>
      ) : items.length === 0 ? (
        <div className={styles.empty} role="status">
          <span className={styles.emptyGlyph} aria-hidden><Icon name="contract" size={40} weight={300} /></span>   {/* (REG-729) in the house empty's 72 well */}
          <span className={styles.emptyTitle}>No contract templates yet</span>
          <span className={styles.emptyHelp}>Save any contract as a template from its editor, or start from the studio agreement below.</span>
        </div>
      ) : (
        <div className={styles.browse}>
        {browse.openAt ? <FolderCrumbs root="All templates" trail={browse.trail} onGo={browse.go} /> : null}
        {browse.hereFolders.length ? (
          <FolderGroup ids={browse.hereFolders.map((f) => f.id)} min={220}>
            {browse.hereFolders.map((f) => <FolderCard key={f.id} name={f.name} count={browse.holds(f, 'template', 'templates')} onOpen={() => browse.go(f.id)} />)}
          </FolderGroup>
        ) : null}
        <div className={styles.grid} role="radiogroup" aria-label="Contract templates">
          {browse.hereEntries.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={picked === t.id} className={styles.card} data-picked={picked === t.id || undefined} onClick={() => setPicked(t.id)} onDoubleClick={() => { void onUse(t.id) }} data-testid="contract-template-option">
              <span className={styles.thumb}><span className={styles.thumbTitle}>{t.title}</span><span className={styles.thumbText}>{excerptOf(t.body, 260)}</span></span>
              <span className={styles.name}>{t.title}</span>
              <span className={styles.meta}>{t.isDefault ? <MetaChip>Default</MetaChip> : null}{browse.where(t) ? `${browse.where(t)} · ` : ''}Edited {displayDate(t.updatedAt)}</span>
            </button>
          ))}
        </div>
        </div>
      )}
    </Dialog>
  )
}
