'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { ScreenBar } from '@/components/quotes/screen/screen-bar'
import { Fold } from '@/components/quotes/screen/quote-screen'
import type { ContractMoment, ContractNext, ContractPrimary } from '@/lib/contracts/next-step'
import { displayDate, displayDateTime, phoneDigits, phoneLocal } from '@/lib/format'
import qs from '@/components/quotes/screen/quote-screen.module.css'
import styles from './contract-screen.module.css'

/** The Contract screen's ⋮: every desk action, grouped Look · Change · Share · Export (B-22). */
export type ContractMenuAction = 'preview' | 'record' | 'signedCopy' | 'markSigned' | 'stop' | 'recipient' | 'automation' | 'copy' | 'template' | 'duplicate' | 'pdf' | 'print' | 'archive' | 'delete'
/** The Edit list's sections (P-02). */
export type ContractEditKey = 'details' | 'document' | 'fields' | 'gates' | 'automation' | 'files'

export type ContractFolds = {
  fields: { rows: { label: string; placed: string | null }[]; line: string; uploaded: boolean }
  gates: { scroll: boolean; accept: boolean; words: string | null; uploaded: boolean }
  automation: { reminders: boolean; thankYou: boolean }
  files: { signed: { name: string; href: string } | null; pdf: { name: string; href: string } | null }
  activity: ContractMoment[]
}

/**
 * (Contracts on the move, P-01 · P-13 · Q-07 — his "please check and built accordingly" 2026-10-22; absorbs B-06 B-07 B-08 B-14 B-22 B-23)
 * **The Contract screen**: what `/contracts/<id>` opens on a phone and a touch tablet (≤1024) — read first, edit second. The bar: ← back
 * where you came from · the client's name over the title and the quote it names · ⋮ (grouped, no key hints). A hero: the status (the editor's
 * own pill, so every rule of a change holds) · From template · the contract date as a pressable row · the quote row (number · amount ·
 * status → the quote sheet) · the client with Call, WhatsApp and ✎ Edit recipient; Signed adds who signed and when. One **Next** line
 * (lib/contracts/next-step.ts). The clauses as reading cards (contract-document.tsx), then Signature fields · Before the client signs ·
 * Automation · Files · Activity as folded rows that read, never edit. A sticky foot with **Edit** and the state's one primary — Q-07's map:
 * Draft → Send · Sent → Remind (Send again once the link expired) · Signed → Move to Won while the lead is not Won, else Download signed
 * copy; no Edit on Signed (the copy is kept, REG-631). Everything else is behind ⋮. The Quote screen (components/quotes/screen) is the model
 * and its stylesheet is this screen's; nothing on it edits the contract — Edit opens the section list (P-02).
 */
export function ContractScreen({
  title, recipient, status, statusSlot, metaWords, signedLine, contractDate, quote, quoteSheet, onQuoteRow, onDate, onEditRecipient,
  next, onPrimary, onEdit, onBack, backLabel, onMenu, menu, document, folds, onEditSection, signed, inert = false,
}: {
  title: string
  recipient: { name: string; phone: string; first: string }
  status: string
  /** The editor's status pill (REG-404 · REG-423's pattern): "{status} ▾" with every rule of a change. */
  statusSlot: ReactNode
  /** From template · Uploaded PDF · Sent together — the header's chips as words. */
  metaWords: string[]
  /** "Signed 31 Jul ’26 · by Ryan D’Souza online" — Signed only. */
  signedLine: string | null
  contractDate: number
  quote: { number: string; amountText: string; status: string; gone: 'archived' | 'deleted' | null } | null
  /** The quote sheet (the editor's Dropdown — a sheet on a phone, anchored on a tablet), drawn under the quote row. */
  quoteSheet: ReactNode
  onQuoteRow: () => void
  onDate: () => void
  onEditRecipient: () => void
  next: ContractNext
  onPrimary: (p: ContractPrimary) => void
  onEdit: () => void
  onBack: () => void
  backLabel: string
  onMenu: (a: ContractMenuAction) => void
  menu: { canDelete: boolean; deleteRule: string; uploaded: boolean; hasRecord: boolean; hasSignedCopy: boolean }
  document: ReactNode
  folds: ContractFolds
  onEditSection: (k: ContractEditKey) => void
  signed: boolean
  /** While the section list or a section screen covers it (P-02). */
  inert?: boolean
}) {
  const [more, setMore] = useState(false)
  const [nextOpen, setNextOpen] = useState(false)
  const pick = (a: ContractMenuAction) => () => { setMore(false); onMenu(a) }
  const digits = phoneDigits(recipient.phone)
  const initials = recipient.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
  const primary = next.primary ? <Button variant="primary" size="lg" onPress={() => onPrimary(next.primary!)} data-testid="contract-primary">{next.label}</Button> : null
  const editLink = (k: ContractEditKey, label: string) => (signed ? null : <span className={styles.foldLink}><Button appearance="text" onPress={() => onEditSection(k)} data-testid={`fold-edit-${k}`}>{label}</Button></span>)
  return (
    <div className={qs.screen} data-testid="contract-screen" data-status={status} inert={inert}>
      <ScreenBar title={recipient.name} subtitle={quote ? `${title} · from ${quote.number}` : title}
                 leading={<Tooltip label={backLabel}><IconButton icon="arrow_back" label={backLabel} variant="bare" iconSize={24} iconWeight={300} onClick={onBack} data-kb="back" data-testid="contract-back" /></Tooltip>}
                 trailing={(
                   <span className={qs.anchor}>
                     <Tooltip label="More options" disabled={more}>
                       <IconButton icon="more_vert" label="More options" variant="bare" aria-haspopup="menu" aria-expanded={more} onClick={() => setMore((o) => !o)} data-testid="contract-more" />
                     </Tooltip>
                     {/* (B-22) grouped — Look · Change · Share · Export — and no key hints: a touch sheet (REG-353) has no keys to show */}
                     <Dropdown open={more} onClose={() => setMore(false)} align="right" width={MENU_WIDTH.wide} sheetTitle={title}>
                       <DropdownLabel>Look</DropdownLabel>
                       <DropdownItem onSelect={pick('preview')}>Preview</DropdownItem>
                       {menu.hasRecord ? <DropdownItem onSelect={pick('record')}>Signing record</DropdownItem> : null}
                       {menu.hasSignedCopy ? <DropdownItem onSelect={pick('signedCopy')}>Signed copy</DropdownItem> : null}
                       <DropdownDivider />
                       <DropdownLabel>Change</DropdownLabel>
                       <DropdownItem onSelect={pick('markSigned')} disabled={signed} title={signed ? 'It is signed' : undefined}>Mark as signed…</DropdownItem>
                       {status === 'Sent to Client' ? <DropdownItem onSelect={pick('stop')} help="Back to Draft — the client’s link stops opening">Stop the signing link</DropdownItem> : null}
                       {signed ? null : <DropdownItem onSelect={pick('recipient')}>Edit recipient</DropdownItem>}
                       <DropdownItem onSelect={pick('automation')}>Automation</DropdownItem>
                       <DropdownDivider />
                       <DropdownLabel>Share</DropdownLabel>
                       <DropdownItem onSelect={pick('copy')} help={status === 'Draft' ? 'Marks it Sent to Client' : undefined}>Copy signing link</DropdownItem>
                       <DropdownItem onSelect={pick('template')} disabled={menu.uploaded} title={menu.uploaded ? 'An uploaded PDF has no document to save' : undefined}>Save as Template</DropdownItem>
                       <DropdownItem onSelect={pick('duplicate')}>Duplicate and Edit</DropdownItem>
                       <DropdownDivider />
                       <DropdownLabel>Export</DropdownLabel>
                       <DropdownItem onSelect={pick('pdf')}>Download as PDF</DropdownItem>
                       <DropdownItem onSelect={pick('print')}>Print</DropdownItem>
                       <DropdownDivider />
                       <DropdownItem onSelect={pick('archive')}>Archive</DropdownItem>
                       <DropdownItem tone={menu.canDelete ? 'danger' : undefined} disabled={!menu.canDelete} title={menu.canDelete ? undefined : menu.deleteRule} onSelect={pick('delete')}>Delete</DropdownItem>
                     </Dropdown>
                   </span>
                 )} />
      <div className={qs.body}>
        {/* the hero: the state, its marks, the date and the quote as rows, the client */}
        <section className={qs.hero} aria-label="Contract summary" data-testid="contract-hero">
          <div className={qs.heroTop}>
            {statusSlot}
            {metaWords.length ? <span className={qs.heroMeta}>{metaWords.join(' · ')}</span> : null}
          </div>
          {signedLine ? <div className={styles.signedLine} data-testid="hero-signed">{signedLine}</div> : null}
          <div className={styles.rows}>
            <button type="button" className={styles.row} onClick={onDate} aria-label={`Contract date ${displayDate(new Date(contractDate))}${signed ? '' : ' — change it in Details'}`} data-testid="hero-date">
              <span className={styles.rowIcon}><Icon name="event" size={20} weight={300} /></span>
              <span className={styles.rowText}><span className={styles.rowLabel}>Contract date</span><span className={styles.rowValue}>{displayDate(new Date(contractDate))}</span></span>
              {signed ? null : <span className={styles.rowChev} aria-hidden><Icon name="chevron_right" size={24} /></span>}
            </button>
            <span className={qs.anchor} style={{ display: 'flex' }}>
              <button type="button" className={styles.row} style={{ flex: 1 }} onClick={onQuoteRow} aria-haspopup={signed ? undefined : 'menu'} data-testid="hero-quote"
                      aria-label={quote ? `Quote ${quote.number} · ${quote.amountText} · ${quote.status}${quote.gone ? ` — the quote was ${quote.gone}` : ''}` : 'No quote named'}>
                <span className={styles.rowIcon}><Icon name="request_quote" size={20} weight={300} /></span>
                <span className={styles.rowText}>
                  {quote ? <>
                    <span className={styles.rowValue}>{quote.number} · {quote.amountText}</span>
                    <MetaChip color={quote.status === 'Signed' ? 'green' : quote.status === 'Draft' || quote.status === 'Sent for Approval' ? 'yellow' : 'default'}>{quote.status}</MetaChip>
                    {quote.gone ? <span className={styles.rowWarn} title={`The quote was ${quote.gone}`}><Icon name="warning" size={16} /></span> : null}
                  </> : <span className={styles.rowLabel}>No quote named</span>}
                </span>
                <span className={styles.rowChev} aria-hidden><Icon name="chevron_right" size={24} /></span>
              </button>
              {quoteSheet}
            </span>
          </div>
          <div className={qs.client}>
            <span className={qs.avatar} aria-hidden>{initials}</span>
            <span className={qs.clientText}>
              <span className={qs.clientName}>{recipient.name}</span>
              {digits ? <span className={qs.clientPhone}>{phoneLocal(recipient.phone)}</span> : null}
            </span>
            <span className={qs.clientActs}>
              {digits ? <>
                <Tooltip label={`Call ${phoneLocal(recipient.phone)}`}><a className={qs.iconLink} data-size="36" href={`tel:+65${digits}`} aria-label={`Call ${recipient.name}`} data-testid="contract-call"><Icon name="call" size={20} /></a></Tooltip>
                <Tooltip label="Open WhatsApp"><a className={qs.iconLink} data-size="36" href={`https://wa.me/65${digits}`} target="_blank" rel="noopener" aria-label={`WhatsApp ${recipient.name}`} data-testid="contract-whatsapp"><Icon name="chat" size={20} /></a></Tooltip>
              </> : null}
              {signed ? null : <Tooltip label="Edit recipient"><IconButton icon="edit" label="Edit recipient" variant="bare" iconSize={20} iconWeight={300} className={styles.clientEdit} onClick={onEditRecipient} data-testid="contract-edit-recipient" /></Tooltip>}
            </span>
          </div>
        </section>
        {/* one line: where it stands and what it needs (Q-07), its longer words one tap further */}
        <section className={qs.next} role="status" data-testid="contract-next" data-primary={next.primary ?? 'none'}>
          <span className={qs.nextIcon} aria-hidden><Icon name={next.icon} size={20} weight={300} /></span>
          <span className={qs.nextText}>{next.lead ? <b>{next.lead}: </b> : null}{next.text}{next.more && nextOpen ? <span className={qs.nextMore}>{next.more}</span> : null}</span>
          {next.more ? (
            <Tooltip label={nextOpen ? 'Less' : 'More'}>
              <IconButton icon="expand_more" label={nextOpen ? 'Less about this state' : 'More about this state'} size={24} variant="bare" iconSize={20} className={qs.nextChev} aria-expanded={nextOpen} data-open={nextOpen || undefined} onClick={() => setNextOpen((o) => !o)} data-testid="contract-next-more" />
            </Tooltip>
          ) : null}
        </section>
        {document}
        {/* the rest of the record, folded: it reads here; Edit changes it */}
        <div className={qs.folds} data-testid="contract-folds">
          <Fold title="Signature fields" meta={folds.fields.line} testId="fold-fields">
            {folds.fields.uploaded ? <p className={qs.plain}>A PDF is signed on the page itself — the client ticks your words, then signs under it.</p> : (
              <ul className={styles.foldRows}>{folds.fields.rows.map((r) => <li key={r.label} className={styles.foldRow}><span>{r.label}</span><span className={styles.foldRowMeta} data-on={r.placed ? '' : undefined}>{r.placed ? `under ${r.placed}` : 'not placed'}</span></li>)}</ul>
            )}
            {folds.fields.uploaded ? null : editLink('fields', 'Edit signature fields')}
          </Fold>
          <Fold title="Before the client signs" meta={[folds.gates.scroll && !folds.gates.uploaded ? 'Read to the end' : null, folds.gates.accept ? 'Tick to accept' : null].filter(Boolean).join(' · ') || 'No rules before signing'} testId="fold-gates">
            <ul className={styles.foldRows}>
              <li className={styles.foldRow}><span>Read to the end</span><span className={styles.foldRowMeta} data-on={folds.gates.scroll && !folds.gates.uploaded ? '' : undefined}>{folds.gates.uploaded ? 'not for a PDF' : folds.gates.scroll ? 'on' : 'off'}</span></li>
              <li className={styles.foldRow}><span>Tick to accept</span><span className={styles.foldRowMeta} data-on={folds.gates.accept ? '' : undefined}>{folds.gates.accept ? 'on' : 'off'}</span></li>
              {folds.gates.accept && folds.gates.words ? <li className={styles.foldWords}>“{folds.gates.words}”</li> : null}
            </ul>
            {editLink('gates', 'Edit the rules')}
          </Fold>
          <Fold title="Automation" meta={[folds.automation.reminders ? 'Follow-up task 3 days after sending' : null, folds.automation.thankYou ? 'Thank-you task when signed' : null].filter(Boolean).join(' · ') || 'Off'} testId="fold-automation">
            <ul className={styles.foldRows}>
              <li className={styles.foldRow}><span>Remind me to follow up</span><span className={styles.foldRowMeta} data-on={folds.automation.reminders ? '' : undefined}>{folds.automation.reminders ? 'on' : 'off'}</span></li>
              <li className={styles.foldRow}><span>Remind me to thank the client</span><span className={styles.foldRowMeta} data-on={folds.automation.thankYou ? '' : undefined}>{folds.automation.thankYou ? 'on' : 'off'}</span></li>
            </ul>
            <span className={styles.foldLink}><Button appearance="text" onPress={() => (signed ? onMenu('automation') : onEditSection('automation'))} data-testid="fold-edit-automation">Change</Button></span>
          </Fold>
          <Fold title={signed ? 'Signed copy' : 'Files'} meta={folds.files.signed ? folds.files.signed.name : folds.files.pdf ? folds.files.pdf.name : signed ? 'Kept as the page the client signed' : 'Nothing kept yet'} testId="fold-files">
            {folds.files.signed || folds.files.pdf ? (
              <ul className={styles.foldRows}>
                {folds.files.signed ? <li><Link className={styles.fileLink} href={folds.files.signed.href} data-testid="fold-signed-copy"><span>{folds.files.signed.name}</span><span className={styles.foldRowMeta}>Signed copy · open in Files</span></Link></li> : null}
                {folds.files.pdf ? <li><Link className={styles.fileLink} href={folds.files.pdf.href} data-testid="fold-pdf"><span>{folds.files.pdf.name}</span><span className={styles.foldRowMeta}>The PDF · open in Files</span></Link></li> : null}
              </ul>
            ) : <p className={qs.plain}>{signed ? 'The signed page is the copy — Download signed copy prints it; a scanned copy attached on Mark as signed would show here.' : 'The signed copy is kept here in Files › Contract & VOs once it comes back signed.'}</p>}
            {signed || folds.files.pdf || !menu.uploaded ? null : editLink('files', 'Attach the PDF')}
          </Fold>
          <Fold title="Activity" meta={folds.activity[0]?.text ?? 'nothing yet'} testId="fold-activity">
            {folds.activity.length ? <ul className={styles.foldRows}>{folds.activity.map((m, i) => <li key={i} className={styles.moment}><span>{m.text}</span><span className={styles.when}>{displayDateTime(new Date(m.at))}</span></li>)}</ul> : <p className={qs.plain}>Nothing yet.</p>}
          </Fold>
        </div>
      </div>
      {/* the sticky foot: Edit (not on a signed copy), and the one filled button this state needs (Q-07) */}
      <div className={qs.foot} data-testid="contract-foot">
        {signed ? null : <Button variant="secondary" appearance="outlined" size="lg" onPress={onEdit} data-kb="edit" data-testid="contract-edit">Edit</Button>}
        {primary ? <span className={`${qs.anchor} ${qs.primary}`}>{primary}</span> : null}
      </div>
    </div>
  )
}
