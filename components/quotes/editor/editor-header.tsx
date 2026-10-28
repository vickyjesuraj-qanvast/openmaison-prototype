'use client'

import { ProTag } from '@/components/credits/pro-tag'
import { usePlanLock } from '@/components/credits/credits-client'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { PROJECT_TABS } from '@/lib/projects/tabs'
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { useSheetLayout } from '@/components/om/sheet'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import type { EditorLead, QuoteContract, QuoteSibling, QuoteVariation } from '@/lib/quotes/editor'
import { SendButton, type SendKind, type SendMode } from '@/components/quotes/send/send-button'
import styles from './editor-header.module.css'
import { contractStatusLabel } from '@/lib/contracts/status-words'

export type HeaderMenuAction = 'rename' | 'duplicate' | 'revise' | 'template' | 'editTemplate' | 'xray' | 'contract' | 'pdf' | 'export' | 'print' | 'history' | 'delete' | 'preview' | 'comments' | 'confirmLink' | 'viewLink'
export type { SendKind, SendMode }

/**
 * Page Header / Quotes (1201:33834 · 1260:31143 · the page's instance 1273:29264): back → the lead's Quotes tab ·
 * "Leads / {lead} / Quotes" over [{quote title} ▾] (the lead's other quotes) · OM-number · VERSION n · status chips ·
 * "Saved 2 mins ago" · [{status} ▾] · Send (primary) · Preview · comment · kebab (1271:41512) · rule · close. The title
 * is the QUOTE's (the lead's name lives in the crumb — audit 2026-09-15); the status pill is the host's (REG-404).
 * Send, the quote switch, Preview, PDF / Print, Save as template, Revise and Version History (REG-565) are live; the comment button answers coming soon.
 */
/** (fix-C, C-13) A variation order's last crumb: the project tab it was opened from (Choices, Money…), else Money — X / Back already return there. */
function voCrumb(projectId: string, from: string | undefined): { label: string; href: string } {
  const m = from ? new RegExp(`^/projects/${projectId}/([a-z]+)`).exec(from) : null
  const tab = m?.[1] ? PROJECT_TABS.find((t) => t.slug === m[1]) : undefined
  return tab && from ? { label: tab.label, href: from } : { label: 'Money', href: `/projects/${projectId}/money` }
}

export function EditorHeader({
  lead, quoteId, title, number, version, status, siblings, savedLabel, canSend, sendHint, statusSlot,
  onSwitch, onSend, onMenu, onClose, clientViewOn = false, onClientView, sendKind = 'approval', contract = null, contractHref, deleteBlock = null, variation = null, from, viewLink = null, editTemplate = false,
}: {
  /** (the calm UI build, 4-10) the quote prints through a template of its own that still exists — the ⋮ offers Edit template */
  editTemplate?: boolean
  /** (pending modules S02) The kebab's *Share a view-only link* — offered on a quote (not a variation order); `block` greys it with the rule in the row. */
  viewLink?: { block: string | null } | null
  /** (fix-C, C-13) Where the editor was opened from — a variation order's crumb names that tab of its project (Choices, Money). */
  from?: string
  /** (Projects round 5, F-06) A variation order: the crumb is its project's Money tab, the header says what it is, and the kebab keeps what a
      change to the contract does (no contract, template, X-Ray or duplicate of its own). */
  variation?: QuoteVariation | null
  /** (sweep S1) why the viewer may not delete this quote — the kebab's Delete greys with the rule, as the lists' do */
  deleteBlock?: string | null
  /** (REG-632, contracts parity Q-09) The contract raised from this quote, as a chip that opens it. */
  contract?: QuoteContract | null
  contractHref?: string
  lead: EditorLead
  quoteId: string
  /** The quote's title as General Info holds it (live); the number stands in while it is empty. */
  title: string
  number: string
  version: number
  status: string
  siblings: QuoteSibling[]
  savedLabel: string
  canSend: boolean
  /** Why Send is inert (tooltip) — the quote is already past the sending steps. */
  sendHint: string
  /** The "{status} ▾" pill (1271:41470), first in the action row (REG-404). */
  statusSlot?: ReactNode
  onSwitch: (quoteId: string) => void
  onSend: (mode: SendMode) => void
  /** (REG-587) See `SendKind`; `canSend` still gates the button. */
  sendKind?: SendKind
  onMenu: (action: HeaderMenuAction) => void
  onClose: () => void
  /** (REG-497) The live client view toggle, beside Preview. */
  clientViewOn?: boolean
  onClientView?: () => void
}) {
  const xrayLocked = usePlanLock('quote_xray').locked   // (pending modules S19) Quote X-Ray is Pro
  const tplLocked = usePlanLock('template_editor').locked   // (pending modules S19) the template editor is Pro
  const [menu, setMenu] = useState<'switch' | 'more' | null>(null)
  const folded = useMediaQuery(TABLET_DOWN)   // ≤1024 Preview and Comments live in the kebab (editor-header.module.css)
  const sheet = useSheetLayout()   // ≤767 the switch list is a bottom sheet with its own heading
  /* (Dane UAT 6.03, t-6.03) The ▾ lists the lead's OTHER quotes — beside the "Version 1" chip, a list with no heading read as versions (renaming
     changes only the title). It says whose quotes they are on every width: the sheet's heading on a phone, the house group title elsewhere. */
  const switchHeading = variation ? `${variation.projectName}’s variation orders` : `${lead.name}’s quotes`
  const pick = (fn: () => void) => () => { setMenu(null); fn() }
  return (
    <header className={styles.header}>
      {/* (REG-455, owner 2026-09-16) The mock's arrow_back is gone: the header opens on the crumb, and the close X is the way out. */}
      <div className={styles.titleBlock}>
        <Crumbs className={styles.crumb} items={variation ? [{ label: 'Projects', href: '/projects' }, { label: variation.projectName, href: `/projects/${variation.projectId}` }, voCrumb(variation.projectId, from)]
          : [{ label: 'Leads', href: '/leads' }, { label: lead.name, href: `/leads/${lead.id}` }, { label: 'Quotes', href: `/leads/${lead.id}/quotes` }]} />   {/* (REG-536 · Projects round 5) */}
        <div className={styles.titleRow}>
          <span className={styles.anchor}>
            <button type="button" className={styles.switch} aria-haspopup="menu" aria-expanded={menu === 'switch'}
                    aria-label={`${title || number} — switch quote`} onClick={() => setMenu((m) => (m === 'switch' ? null : 'switch'))}>
              <h1 className={styles.title}>{title || number}</h1>
              <span className={styles.chev} data-open={menu === 'switch' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
            </button>
            {/* The lead's quotes, newest last (the Quotes tab's order): one 36px row each — title · number — the open one
                marked "current" like the tab's status menu (910:36673). (REG-728) The editor switchers' width: rows with a description. */}
            <Dropdown open={menu === 'switch'} onClose={() => setMenu(null)} align="left" width={MENU_WIDTH.detail} sheetTitle={switchHeading}>
              {sheet ? null : <DropdownLabel>{switchHeading}</DropdownLabel>}
              {siblings.map((s) => (
                <DropdownItem key={s.id} role="menuitemradio" checked={s.id === quoteId} onSelect={pick(() => { if (s.id !== quoteId) onSwitch(s.id) })}>
                  <span className={styles.menuTitle}>{s.title || s.number}</span>
                  <span className={styles.menuSub}>{s.number}</span>
                  {s.id === quoteId ? <span className={styles.menuCurrent}>current</span> : null}
                </DropdownItem>
              ))}
            </Dropdown>
          </span>
          {/* (the calm UI build 2026-10-27, the UI audit's 4-03 · 4-11 · W-423) The status lives in its pill alone; the number and version are the title's
              grey subtitle ("OM-10001 · v1"), a variation order says what it is there; the contract is one sentence-case link, not a capital tag. */}
          <div className={styles.chips}>
            <span className={styles.sub} data-testid="quote-header-sub">{variation ? 'Variation order · ' : ''}{number} · v{version}</span>
            {contract && contractHref ? (
              <Tooltip label={`Open ${contract.title}`}>
                <Link href={contractHref} className={styles.contractLink} data-testid="quote-contract-chip"><Icon name="contract" size={16} weight={300} />Contract: {contractStatusLabel(contract.status)}<Icon name="chevron_right" size={16} weight={300} /></Link>
              </Tooltip>
            ) : null}
          </div>
          <span className={styles.saved} role="status">
            <span className={styles.savedIcon} aria-hidden><Icon name="check_circle" size={20} /></span>
            {savedLabel}
          </span>
        </div>
      </div>
      {/* The status pill and Send lead the action row (1271:41470 · 1201:33817); their own slot so ≤767 they take the header's second line. */}
      <span className={styles.send}>
        {statusSlot}
        <span className={`${styles.sendBtn} ${styles.anchor}`}>
          {/* (UX audit Q2) The quote's one Send (components/quotes/send/send-button.tsx) — Preview's bar carries the same. */}
          <SendButton kind={sendKind} canSend={canSend} hint={sendHint} status={status} onSend={onSend} variation={!!variation} />
        </span>
      </span>
      <div className={styles.actions}>
        {/* (the calm UI build 2026-10-27, 4-03) Preview, the ⋮ and the close; the Client view pane and Comments are the ⋮'s first rows at every width */}
        <span className={styles.foldable}>
          <Tooltip label="Preview" shortcut="preview"><Button variant="secondary" appearance="outlined" onPress={() => onMenu('preview')} data-kb="preview">Preview</Button></Tooltip>
        </span>
        <span className={styles.anchor}>
          <Tooltip label="More options" disabled={menu === 'more'}>
            <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={menu === 'more'}
                        onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))} />
          </Tooltip>
          {/* Dropdown Menu / Leads 1271:41512 — ≤1024 Preview and Comments fold in here (responsive.md). (REG-728) 240 — the scale's width for
              rows with a second line (a locked Delete says why in its row, a key hint): "Compare with another quote" wrapped at 200 (REG-531). */}
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} sheetTitle={number}>
            {folded ? <DropdownItem onSelect={pick(() => onMenu('preview'))} shortcut="preview">Preview</DropdownItem> : null}   {/* (REG-728) its key, as the contract kebab's */}
            {onClientView ? <DropdownItem onSelect={pick(onClientView)} help={clientViewOn ? undefined : 'The quote as your client will see it, beside the editor'}>{clientViewOn ? 'Hide client view' : 'Client view'}</DropdownItem> : null}
            <DropdownItem onSelect={pick(() => onMenu('comments'))}>Comments</DropdownItem>
            <DropdownDivider />
            <DropdownItem onSelect={pick(() => onMenu('rename'))}>{variation ? 'Rename' : 'Rename quote'}</DropdownItem>
            {variation ? null : <DropdownItem onSelect={pick(() => onMenu('duplicate'))}>Duplicate and edit</DropdownItem>}
            <DropdownItem onSelect={pick(() => onMenu('revise'))}>Revise — new version</DropdownItem>   {/* (REG-565) keeps this version, starts the next under the same number */}
            {variation ? null : (
              <>
                {/* (the calm UI build 2026-10-27, 4-10 · W-352) the Template card's Edit template and Save as template, named once, here */}
                {editTemplate ? <DropdownItem meta={tplLocked ? <ProTag /> : undefined} onSelect={pick(() => onMenu('editTemplate'))}>Edit template</DropdownItem> : null}
                <DropdownItem meta={tplLocked ? <ProTag /> : undefined} onSelect={pick(() => onMenu('template'))}>Save as template</DropdownItem>
                <DropdownItem meta={xrayLocked ? <ProTag /> : undefined} onSelect={pick(() => onMenu('xray'))}>Compare with another quote</DropdownItem>   {/* (pending modules S19) Pro on Free — the press opens the lock */}
                <DropdownItem onSelect={pick(() => onMenu('contract'))}>Create contract from this quote</DropdownItem>   {/* (REG-534) */}
              </>
            )}
            <DropdownItem onSelect={pick(() => onMenu('confirmLink'))}>Copy confirmation link</DropdownItem>   {/* (REG-587) */}
            {viewLink ? <DropdownItem disabled={!!viewLink.block} title={viewLink.block ?? undefined} onSelect={pick(() => onMenu('viewLink'))}>Share a view-only link</DropdownItem> : null}   {/* (pending modules S02 — 1.0's live preview link) */}
            <DropdownDivider />
            <DropdownItem onSelect={pick(() => onMenu('pdf'))}>Download as PDF</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('export'))}>Export</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('print'))}>Print</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('history'))}>Version history</DropdownItem>
            <DropdownDivider />
            <DropdownItem tone="danger" disabled={!!deleteBlock} title={deleteBlock ?? undefined} onSelect={pick(() => onMenu('delete'))}>Delete</DropdownItem>
          </Dropdown>
        </span>
        <span className={`${styles.rule} ${styles.foldable}`} aria-hidden />
        <Tooltip label="Close">
          <IconButton icon="close" label="Close" onClick={onClose} />
        </Tooltip>
      </div>
    </header>
  )
}
