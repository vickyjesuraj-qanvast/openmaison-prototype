'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Button, Radio, RadioGroup } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { excerptOf } from '@/lib/contracts/tokens'
import type { ContractPickerData, ContractTemplateOption } from '@/lib/contracts/queries'
import { FolderCard, FolderGroup } from '@/components/om/folders/folder-card'
import { FolderCrumbs } from '@/components/om/folders/folder-crumbs'
import { FolderPickRow } from '@/components/om/folders/folder-pick-row'
import { useFolderBrowse } from '@/components/om/folders/use-folder-browse'
import { displayDate } from '@/lib/format'
import styles from './contract-template-picker.module.css'

/** (quotes on the move 2026-10-22, B-18) The phone list's first row — the studio agreement, picked by its own value. */
const STARTER = 'starter'

/**
 * New Contract › From Template (REG-534): the quote picker's shape (REG-528 — Manage Templates link, cards you pick then Use)
 * on the contract templates: title · the first words · edited when; "Start from the studio agreement" when the library is empty.
 * (UX audit 2026-09-30, C6 · Q9 — extends REG-632 · REG-663) It opens ready to use: the studio's default template picked, else the only
 * one, else the one used last — shown at the top wherever it is filed — and the templates come before the folders.
 */
/** The template a picker opens on: the default, else the only one, else the one used last (none used yet: nothing picked). */
export function suggestedTemplate(items: ContractTemplateOption[]): { id: string; why: 'default' | 'only' | 'last' } | null {
  const d = items.find((t) => t.isDefault)
  if (d) return { id: d.id, why: 'default' }
  if (items.length === 1) return { id: items[0]!.id, why: 'only' }
  const used = items.filter((t) => t.lastUsedAt).sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())[0]
  return used ? { id: used.id, why: 'last' } : null
}
export function ContractTemplatePicker({ open, onClose, load, onUse, onStarter, busy = false }: {
  open: boolean; onClose: () => void
  /** Fetches the live templates — and (REG-664) the library's folders — when the dialog opens (a server action). */
  load: () => Promise<ContractPickerData>
  onUse: (templateId: string) => void | Promise<void>
  onStarter: () => void | Promise<void>
  /** (Dane UAT 8.02, REG-659) The contract is being made: the button pressed reads "Creating…", both wait, and the host closes the picker
      once the contract exists (the editor opens). A refusal leaves it open to try again. */
  busy?: boolean
}) {
  const [items, setItems] = useState<ContractTemplateOption[] | null>(null)
  const [folders, setFolders] = useState<ContractPickerData['folders']>([])
  /* (REG-664) Browse Templates › Contracts' folders; the studio default — (C6) else the only or the last-used one — stays pinned at the top wherever it is filed. */
  const suggested = suggestedTemplate(items ?? [])
  const browse = useFolderBrowse(folders, items ?? [], { query: '', pinned: (t) => t.id === suggested?.id })
  const pathname = usePathname()
  const [picked, setPicked] = useState<string | null>(null)
  const [pressed, setPressed] = useState<'use' | 'starter'>('use')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setPicked(null); setItems(null); setPressed('use'); browse.go(null) } }   // render-phase reset: the list ghosts until the fetch lands
  const applyTemplate = (id: string) => { if (busy) return; setPressed('use'); void onUse(id) }
  const starter = () => { if (busy) return; setPressed('starter'); void onStarter() }
  useEffect(() => {
    if (!open) return
    let live = true
    /* (REG-632, parity Q-13) The studio's default arrives picked — Use template starts from it. (UX audit C6) Else the only, else the last-used one. */
    void load().then((r) => { if (live) { setItems(r.templates); setFolders(r.folders); setPicked((p) => p ?? suggestedTemplate(r.templates)?.id ?? null) } }, () => { if (live) setItems([]) })
    return () => { live = false }
  }, [open, load])
  /* (quotes on the move 2026-10-22, B-18) ≤767 the cards are a LIST of DS radio rows — "Start from the studio agreement" first, then the
     templates (the suggested one picked, else the starter), then the folders — and ONE button in the foot, named after the pick. At 390 two
     171px cards with 8px previews said nothing, and the foot wrapped to two rows. (Contracts on the move, C4 — P-09 · C-20) The list goes to
     ≤1024: a tablet's 414×328 cards held a 300px grey "paper" with an 8px excerpt — decoration taking 70% of each card. */
  const phone = useMediaQuery(TABLET_DOWN)
  const pick = picked ?? (phone && items && !suggested ? STARTER : null)
  const go = () => { if (!pick) return; if (pick === STARTER) starter(); else applyTemplate(pick) }
  /* (C4 — C-04 · P-13) in the list (≤1024) a template's standing reads as 14 words, never a 10px uppercase chip; the desk's cards keep the chips */
  const metaWords = (t: ContractTemplateOption) => [t.kind === 'pdf' ? 'PDF' : null, t.isDefault ? 'Default' : t.id === suggested?.id && suggested.why === 'last' ? 'Last used' : null, browse.where(t) || null, `Edited ${displayDate(t.updatedAt)}`].filter(Boolean).join(' · ')
  const metaOf = (t: ContractTemplateOption) => (
    <>{t.kind === 'pdf' ? <MetaChip>PDF</MetaChip> : null}{t.isDefault ? <MetaChip>Default</MetaChip> : t.id === suggested?.id && suggested.why === 'last' ? <MetaChip>Last used</MetaChip> : null}{browse.where(t) ? `${browse.where(t)} · ` : ''}Edited {displayDate(t.updatedAt)}</>
  )
  return (
    <Dialog open={open} onClose={onClose} title="Choose a contract template" size="modal" width={phone ? 600 : 1200} portal   /* (C4 — C-20) a list needs no 1200 frame on a tablet */
            subtitle={<span className={styles.sub}>Pick a template to start the contract from. <Link href={withFrom('/company/templates/contracts', pathname)} className={styles.manage}>Manage Templates</Link></span>}
            footer={phone ? (
              <Button isDisabled={!pick || busy} onPress={go} data-testid="contract-template-use">{busy ? 'Creating…' : pick === STARTER ? 'Start from the studio agreement' : 'Use template'}</Button>
            ) : <>
              <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={starter}>{busy && pressed === 'starter' ? 'Creating…' : 'Start from the studio agreement'}</Button>
              <Button isDisabled={!picked || busy} onPress={() => { if (picked) applyTemplate(picked) }} data-testid="contract-template-use">{busy && pressed === 'use' ? 'Creating…' : 'Use template'}</Button>
            </>}>
      {items === null ? (
        <div className={styles.grid} aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className={styles.ghost} />)}</div>
      ) : phone ? (
        <div className={styles.browse}>
          {browse.openAt ? <FolderCrumbs root="All templates" trail={browse.trail} onGo={browse.go} /> : null}
          <RadioGroup aria-label="Contract templates" className={styles.list} value={pick} onChange={(v) => { if (!busy) setPicked(v) }}>
            {browse.openAt ? null : (
              <Radio value={STARTER} className={styles.pick} data-testid="contract-starter-row">
                <span className={styles.pickText}><span className={styles.pickName}>Start from the studio agreement</span><span className={styles.pickMeta}>The studio’s own agreement, not a template</span></span>
              </Radio>
            )}
            {browse.hereEntries.map((t) => (
              <Radio key={t.id} value={t.id} className={styles.pick} data-testid="contract-template-option">
                <span className={styles.pickText}><span className={styles.pickName}>{t.title}</span><span className={styles.pickMeta}>{metaWords(t)}</span></span>
              </Radio>
            ))}
          </RadioGroup>
          {items.length === 0 && !browse.openAt ? <p className={styles.emptyLine} role="status">No contract templates yet — save any contract as a template from its editor.</p> : null}
          {browse.hereFolders.length ? <div className={styles.list}>{browse.hereFolders.map((f) => <FolderPickRow key={f.id} name={f.name} holds={browse.holds(f, 'template', 'templates')} onOpen={() => browse.go(f.id)} />)}</div> : null}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty} role="status">
          <span className={styles.emptyGlyph} aria-hidden><Icon name="contract" size={40} weight={300} /></span>   {/* (REG-729) in the house empty's 72 well */}
          <span className={styles.emptyTitle}>No contract templates yet</span>
          <span className={styles.emptyHelp}>Save any contract as a template from its editor, or start from the studio agreement below.</span>
        </div>
      ) : (
        <div className={styles.browse}>
        {browse.openAt ? <FolderCrumbs root="All templates" trail={browse.trail} onGo={browse.go} /> : null}
        {/* (UX audit C6) the templates first — the one it opens on among them — then the folders */}
        {browse.hereEntries.length ? (
        <div className={styles.grid} data-rows={browse.hereFolders.length ? 'fit' : undefined} role="radiogroup" aria-label="Contract templates">
          {browse.hereEntries.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={picked === t.id} className={styles.card} data-picked={picked === t.id || undefined} onClick={() => { if (!busy) setPicked(t.id) }} onDoubleClick={() => { if (busy) return; setPicked(t.id); applyTemplate(t.id) }} data-testid="contract-template-option">
              <span className={styles.thumb}><span className={styles.thumbTitle}>{t.title}</span><span className={styles.thumbText}>{t.kind === 'pdf' ? `A standard PDF — ${t.fileName ?? t.title}. The lead gets its own copy, read and accepted on the signing link.` : excerptOf(t.body, 260)}</span></span>
              <span className={styles.name}>{t.title}</span>
              <span className={styles.meta}>{metaOf(t)}</span>
            </button>
          ))}
        </div>
        ) : null}
        {browse.hereFolders.length ? (
          <FolderGroup ids={browse.hereFolders.map((f) => f.id)} min={220}>
            {browse.hereFolders.map((f) => <FolderCard key={f.id} name={f.name} count={browse.holds(f, 'template', 'templates')} onOpen={() => browse.go(f.id)} />)}
          </FolderGroup>
        ) : null}
        </div>
      )}
    </Dialog>
  )
}
