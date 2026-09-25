'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { Dropdown, DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import type { EditorLead, QuoteContract, QuoteSibling } from '@/lib/quotes/editor'
import styles from './editor-header.module.css'

export type HeaderMenuAction = 'rename' | 'duplicate' | 'revise' | 'template' | 'xray' | 'contract' | 'pdf' | 'export' | 'print' | 'history' | 'delete' | 'preview' | 'comments' | 'confirmLink'
/**
 * (REG-587) What the Send button does at this status: `approval` = plain Send (for approval) · `client` = Send ▾ with
 * "Send for confirmation" and "Send for signature" · `confirmed` = "Send for signature" (the contract with the T&Cs) ·
 * `done` = inert with `sendHint`.
 */
export type SendKind = 'approval' | 'client' | 'confirmed' | 'done'
export type SendMode = 'next' | 'confirmation' | 'signature'

/**
 * Page Header / Quotes (1201:33834 · 1260:31143 · the page's instance 1273:29264): back → the lead's Quotes tab ·
 * "Leads / {lead} / Quotes" over [{quote title} ▾] (the lead's other quotes) · OM-number · VERSION n · status chips ·
 * "Saved 2 mins ago" · [{status} ▾] · Send (primary) · Preview · comment · kebab (1271:41512) · rule · close. The title
 * is the QUOTE's (the lead's name lives in the crumb — audit 2026-09-15); the status pill is the host's (REG-404).
 * Send, the quote switch, Preview, PDF / Print, Save as template, Revise and Version History (REG-565) are live; the comment button answers coming soon.
 */
export function EditorHeader({
  lead, quoteId, title, number, version, status, siblings, savedLabel, canSend, sendHint, statusSlot,
  onSwitch, onSend, onMenu, onClose, clientViewOn = false, onClientView, sendKind = 'approval', contract = null, contractHref, deleteBlock = null,
}: {
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
  const [menu, setMenu] = useState<'switch' | 'more' | 'send' | null>(null)
  const folded = useMediaQuery(TABLET_DOWN)   // ≤1024 Preview and Comments live in the kebab (editor-header.module.css)
  const pick = (fn: () => void) => () => { setMenu(null); fn() }
  return (
    <header className={styles.header}>
      {/* (REG-455, owner 2026-09-16) The mock's arrow_back is gone: the header opens on the crumb, and the close X is the way out. */}
      <div className={styles.titleBlock}>
        <Crumbs className={styles.crumb} items={[{ label: 'Leads', href: '/leads' }, { label: lead.name, href: `/leads/${lead.id}` }, { label: 'Quotes', href: `/leads/${lead.id}/quotes` }]} />   {/* (REG-536) */}
        <div className={styles.titleRow}>
          <span className={styles.anchor}>
            <button type="button" className={styles.switch} aria-haspopup="menu" aria-expanded={menu === 'switch'}
                    aria-label={`${title || number} — switch quote`} onClick={() => setMenu((m) => (m === 'switch' ? null : 'switch'))}>
              <h1 className={styles.title}>{title || number}</h1>
              <span className={styles.chev} data-open={menu === 'switch' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
            </button>
            {/* The lead's quotes, newest last (the Quotes tab's order): one 36px row each — title · number — the open one
                marked "current" like the tab's status menu (910:36673). */}
            <Dropdown open={menu === 'switch'} onClose={() => setMenu(null)} align="left" width={320} sheetTitle="Quotes">
              {siblings.map((s) => (
                <DropdownItem key={s.id} role="menuitemradio" checked={s.id === quoteId} onSelect={pick(() => { if (s.id !== quoteId) onSwitch(s.id) })}>
                  <span className={styles.menuTitle}>{s.title || s.number}</span>
                  <span className={styles.menuSub}>{s.number}</span>
                  {s.id === quoteId ? <span className={styles.menuCurrent}>current</span> : null}
                </DropdownItem>
              ))}
            </Dropdown>
          </span>
          <div className={styles.chips}>
            <MetaChip>{number}</MetaChip>
            <MetaChip>Version {version}</MetaChip>
            <MetaChip>{status}</MetaChip>
            {contract && contractHref ? (
              <Tooltip label={`Open ${contract.title}`}>
                <Link href={contractHref} className={styles.chipLink} data-testid="quote-contract-chip"><MetaChip icon="contract">Contract · {contract.status}</MetaChip></Link>
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
          {canSend && sendKind === 'client' ? (
            <>
              {/* (REG-587) Send ▾: the client can confirm on a link first (Mavid's flow), or get the agreement for signature straight away. */}
              <Button variant="primary" iconEnd={<span className={styles.chev} data-open={menu === 'send' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                      aria-haspopup="menu" aria-expanded={menu === 'send'} onPress={() => setMenu((m) => (m === 'send' ? null : 'send'))}>Send</Button>
              <Dropdown open={menu === 'send'} onClose={() => setMenu(null)} align="left" width={300} sheetTitle="Send">
                <DropdownItem onSelect={pick(() => onSend('confirmation'))}>
                  <span className={styles.menuText}>Send for confirmation<span className={styles.menuHelp}>The client confirms the quote on a link — no signature yet</span></span>
                </DropdownItem>
                <DropdownItem onSelect={pick(() => onSend('signature'))}>
                  <span className={styles.menuText}>Send for signature<span className={styles.menuHelp}>Add the T&Cs and raise the agreement to sign</span></span>
                </DropdownItem>
              </Dropdown>
            </>
          ) : canSend && sendKind === 'confirmed' ? (
            <Tooltip label="Add the T&Cs and send the agreement for signature">
              <span><Button variant="primary" onPress={() => onSend('signature')}>Send for signature</Button></span>
            </Tooltip>
          ) : canSend ? (
            <Button variant="primary" onPress={() => onSend('next')}>Send</Button>
          ) : (
            <Tooltip label={sendHint}>
              <span><Button variant="primary" isDisabled>Send</Button></span>
            </Tooltip>
          )}
        </span>
      </span>
      <div className={styles.actions}>
        {onClientView ? (
          <span className={styles.foldable}>
            <Tooltip label={clientViewOn ? 'Hide the client view' : 'See the quote as your client will'}>
              <IconButton icon="visibility" label="Client view" selected={clientViewOn} aria-pressed={clientViewOn} onClick={onClientView} />
            </Tooltip>
          </span>
        ) : null}
        <span className={styles.foldable}>
          <Button variant="secondary" appearance="outlined" onPress={() => onMenu('preview')}>Preview</Button>
        </span>
        <span className={styles.foldable}>
          <Tooltip label="Comments">
            <IconButton icon="comment" label="Comments" onClick={() => onMenu('comments')} />
          </Tooltip>
        </span>
        <span className={styles.anchor}>
          <Tooltip label="More options" disabled={menu === 'more'}>
            <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={menu === 'more'}
                        onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))} />
          </Tooltip>
          {/* Dropdown Menu / Leads 1271:41512 — ≤1024 Preview and Comments fold in here (responsive.md). 264 wide, as the template menus with long labels (REG-531): "Compare with another quote" wrapped at 200 and its second line was clipped. */}
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" width={264} sheetTitle={number}>
            {folded ? (
              <>
                <DropdownItem onSelect={pick(() => onMenu('preview'))}>Preview</DropdownItem>
                {onClientView ? <DropdownItem onSelect={pick(onClientView)}>{clientViewOn ? 'Hide client view' : 'Client view'}</DropdownItem> : null}
                <DropdownItem onSelect={pick(() => onMenu('comments'))}>Comments</DropdownItem>
                <DropdownDivider />
              </>
            ) : null}
            <DropdownItem onSelect={pick(() => onMenu('rename'))}>Rename Quote</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('duplicate'))}>Duplicate and Edit</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('revise'))}>Revise — new version</DropdownItem>   {/* (REG-565) keeps this version, starts the next under the same number */}
            <DropdownItem onSelect={pick(() => onMenu('template'))}>Save as Template</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('xray'))}>Compare with another quote</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('contract'))}>Create contract from this quote</DropdownItem>   {/* (REG-534) */}
            <DropdownItem onSelect={pick(() => onMenu('confirmLink'))}>Copy confirmation link</DropdownItem>   {/* (REG-587) */}
            <DropdownDivider />
            <DropdownItem onSelect={pick(() => onMenu('pdf'))}>Download as PDF</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('export'))}>Export</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('print'))}>Print</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('history'))}>Version History</DropdownItem>
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
