'use client'

import { contractStatusLabel } from '@/lib/contracts/status-words'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { ProTag } from '@/components/credits/pro-tag'
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { ActivityBody } from '@/components/quotes/editor/activity/activity-section'
import type { HeaderMenuAction } from '@/components/quotes/editor/editor-header'
import type { QuoteEvent } from '@/lib/quotes/activity'
import type { NextPrimary, NextStep } from '@/lib/quotes/next-step'
import { displayDate, phoneDigits, phoneLocal } from '@/lib/format'
import { ScreenBar } from './screen-bar'
import { QuoteDocument, type Reading } from './document'
import styles from './quote-screen.module.css'

/** The Quote screen's ⋮: the desk kebab's actions plus the ones the desk keeps on its cards (the template's). */
export type ScreenMenuAction = HeaderMenuAction | 'changeTemplate' | 'editTemplate' | 'requestChanges'

export type ScreenFolds = {
  /** The schedule as the Payment Schedule holds it — null on a variation order (it has none, F-06). */
  payments: { name: string; description: string | null; share: string; amount: string; due: string | null }[] | null
  /** The split in one word — "10 / 30 / 30 / 30" — the section list's own. */
  scheduleWord: string
  files: { count: number; names: string[] }
  terms: { text: string; visible: boolean }
  notes: { text: string; visible: boolean }
  signature: { member: string; studio: string; client: string; required: boolean }
  comments: number
  activity: QuoteEvent[]
  /** (activity by date 2026-10-24) the server's time, for the trail's "Today" · "Yesterday" */
  activityNow: number
}

/**
 * (Quotes on the move, P-01 · P-09 · Q-07 — his "please go ahead" 2026-10-22) **The Quote screen**: what `/quotes/<id>` opens on a phone
 * and a touch tablet (≤1024) — read first, edit second. The bar: ← · the client's name over the number and title · ⋮. A hero: the status
 * (the editor's own pill, so every rule of a status change holds), the version and the template, the amount, lines · valid until · GST,
 * the client with Call and WhatsApp. One **Next** line that says what this state needs (lib/quotes/next-step.ts). The document as the
 * client reads it (the reading cards, folded by section) with "As printed". Payment schedule · Files · Terms · Notes · Signature ·
 * Comments · Activity as folded rows that read, never edit. A sticky foot with **Edit** and the state's one primary (Q-07's map).
 * Everything else is behind ⋮, grouped Look · Change · Share · Export — a bottom sheet on a phone (REG-353), no key hints on touch.
 * Nothing on this screen edits the quote; Edit opens the section list (P-02).
 */
export function QuoteScreen({
  number, title, version, status, variation, client, statusSlot, templateName, contract, amountText, lineCount, validUntil, gst,
  next, onPrimary, primarySlot, onEdit, onBack, backLabel, onMenu, menu, reading, onAsPrinted, folds, onComments, totalMinor, inert = false,
}: {
  number: string; title: string; version: number; status: string
  variation: { projectName: string } | null
  client: { name: string; phone: string; company?: string | null; first: string }
  /** The editor's status pill (REG-404 · REG-423): "{status} ▾" with every rule of a change. */
  statusSlot: ReactNode
  templateName: string | null
  contract: { href: string; title: string; status: string } | null
  amountText: string
  lineCount: number
  validUntil: Date | null
  gst: { on: boolean; pct: number }
  next: NextStep
  onPrimary: (p: NextPrimary) => void
  /** The quote's one Send (components/quotes/send/send-button.tsx) for the states whose primary is a send. */
  primarySlot?: ReactNode
  onEdit: () => void
  onBack: () => void
  backLabel: string
  onMenu: (a: ScreenMenuAction) => void
  menu: { canApprove: boolean; waitingApproval: boolean; deleteBlock: string | null; viewLink: { block: string | null } | null; tplLocked: boolean; xrayLocked: boolean; hasTemplate: boolean; templateDeleted: boolean }
  reading: Reading | null
  onAsPrinted: () => void
  folds: ScreenFolds
  onComments: () => void
  totalMinor: number
  /** While the section list or a section screen covers it (P-02). */
  inert?: boolean
}) {
  const [more, setMore] = useState(false)
  const [nextOpen, setNextOpen] = useState(false)
  const pick = (a: ScreenMenuAction) => () => { setMore(false); onMenu(a) }
  const digits = phoneDigits(client.phone)
  const initials = client.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
  const meta = [`${lineCount} ${lineCount === 1 ? 'item' : 'items'}`, validUntil ? `valid until ${displayDate(validUntil)}` : 'no valid-until date', gst.on ? `GST ${gst.pct}% included` : 'no GST'].join(' · ')
  const primary = next.primary === 'send' || next.primary === 'signature'
    ? primarySlot
    : next.primary ? <Button variant="primary" size="lg" onPress={() => onPrimary(next.primary!)} data-testid="quote-primary">{next.label}</Button> : null
  const noun = variation ? 'variation order' : 'quote'
  return (
    <div className={styles.screen} data-testid="quote-screen" data-status={status} inert={inert}>
      <ScreenBar title={client.name} subtitle={`${number} · ${title || noun}`}
                 leading={<Tooltip label={backLabel}><IconButton icon="arrow_back" label={backLabel} variant="bare" iconSize={24} iconWeight={300} onClick={onBack} data-kb="back" data-testid="quote-back" /></Tooltip>}
                 trailing={(
                   <span className={styles.anchor}>
                     <Tooltip label="More options" disabled={more}>
                       <IconButton icon="more_vert" label="More options" variant="bare" aria-haspopup="menu" aria-expanded={more} onClick={() => setMore((o) => !o)} data-testid="quote-more" />
                     </Tooltip>
                     {/* (B-09) grouped — Look · Change · Share · Export — and no key hints: a touch sheet (REG-353) has no keys to show */}
                     <Dropdown open={more} onClose={() => setMore(false)} align="right" width={MENU_WIDTH.wide} sheetTitle={number}>
                       <DropdownLabel>Look</DropdownLabel>
                       <DropdownItem onSelect={pick('preview')}>Preview</DropdownItem>
                       <DropdownItem onSelect={pick('history')}>Version history</DropdownItem>
                       <DropdownDivider />
                       <DropdownLabel>Change</DropdownLabel>
                       <DropdownItem onSelect={pick('rename')}>{variation ? 'Rename' : 'Rename quote'}</DropdownItem>
                       <DropdownItem onSelect={pick('revise')}>Revise — new version</DropdownItem>
                       {menu.waitingApproval && menu.canApprove ? <DropdownItem onSelect={pick('requestChanges')}>Request changes</DropdownItem> : null}
                       {variation ? null : <DropdownItem onSelect={pick('duplicate')}>Duplicate and edit</DropdownItem>}
                       {variation ? null : <DropdownItem meta={menu.tplLocked ? <ProTag /> : undefined} onSelect={pick('changeTemplate')}>{menu.hasTemplate ? 'Change template' : 'Choose a template'}</DropdownItem>}
                       {variation || !menu.hasTemplate || menu.templateDeleted ? null : <DropdownItem meta={menu.tplLocked ? <ProTag /> : undefined} onSelect={pick('editTemplate')}>Edit template</DropdownItem>}
                       {variation ? null : <DropdownItem meta={menu.tplLocked ? <ProTag /> : undefined} onSelect={pick('template')}>Save as template</DropdownItem>}
                       <DropdownDivider />
                       <DropdownLabel>Share</DropdownLabel>
                       <DropdownItem onSelect={pick('confirmLink')}>Copy confirmation link</DropdownItem>
                       {menu.viewLink ? <DropdownItem disabled={!!menu.viewLink.block} title={menu.viewLink.block ?? undefined} onSelect={pick('viewLink')}>Share a view-only link</DropdownItem> : null}
                       {variation ? null : <DropdownItem onSelect={pick('contract')}>Create contract from this quote</DropdownItem>}
                       {variation ? null : <DropdownItem meta={menu.xrayLocked ? <ProTag /> : undefined} onSelect={pick('xray')}>Compare with another quote</DropdownItem>}
                       <DropdownDivider />
                       <DropdownLabel>Export</DropdownLabel>
                       <DropdownItem onSelect={pick('pdf')}>Download as PDF</DropdownItem>
                       <DropdownItem onSelect={pick('export')}>Export</DropdownItem>
                       <DropdownItem onSelect={pick('print')}>Print</DropdownItem>
                       <DropdownDivider />
                       <DropdownItem tone="danger" disabled={!!menu.deleteBlock} title={menu.deleteBlock ?? undefined} onSelect={pick('delete')}>Delete</DropdownItem>
                     </Dropdown>
                   </span>
                 )} />
      <div className={styles.body}>
        {/* the hero: the state, the version and template, the amount, the figures, the client */}
        <section className={styles.hero} aria-label="Quote summary" data-testid="quote-hero">
          <div className={styles.heroTop}>
            {statusSlot}
            <span className={styles.heroMeta}>v{version} · {templateName ?? 'Studio default'}</span>
            {variation ? <MetaChip icon="request_quote" color="yellow">Variation order</MetaChip> : null}
          </div>
          <div className={styles.amount} data-testid="quote-amount">{amountText}</div>
          <div className={styles.heroLine}>{meta}</div>
          <div className={styles.client}>
            <span className={styles.avatar} aria-hidden>{initials}</span>
            <span className={styles.clientText}>
              <span className={styles.clientName}>{client.name}{client.company ? <span className={styles.clientCompany}> · {client.company}</span> : null}</span>
              {digits ? <span className={styles.clientPhone}>{phoneLocal(client.phone)}</span> : null}
            </span>
            {digits ? (
              <span className={styles.clientActs}>
                <Tooltip label={`Call ${phoneLocal(client.phone)}`}><a className={styles.iconLink} data-size="36" href={`tel:+65${digits}`} aria-label={`Call ${client.name}`} data-testid="quote-call"><Icon name="call" size={20} /></a></Tooltip>
                <Tooltip label="Open WhatsApp"><a className={styles.iconLink} data-size="36" href={`https://wa.me/65${digits}`} target="_blank" rel="noopener" aria-label={`WhatsApp ${client.name}`} data-testid="quote-whatsapp"><Icon name="chat" size={20} /></a></Tooltip>
              </span>
            ) : null}
          </div>
          {/* (Contracts on the move, C4 — P-11 · C-21) the contract raised from this quote, as a 44 row under the client — "Contract · Sent to Client ›"
              opens it; it was a 10px chip with a 20px touch box in the hero's top line */}
          {contract ? (
            <Link href={contract.href} className={styles.heroRow} data-testid="screen-contract-row" aria-label={`Open ${contract.title} — ${contractStatusLabel(contract.status)}`}>
              <span className={styles.heroRowIcon} aria-hidden><Icon name="contract" size={20} weight={300} /></span>
              <span className={styles.heroRowText}><span className={styles.heroRowLabel}>Contract</span><span className={styles.heroRowValue}>{contractStatusLabel(contract.status)}</span></span>
              <span className={styles.heroRowChev} aria-hidden><Icon name="chevron_right" size={24} /></span>
            </Link>
          ) : null}
        </section>
        {/* one line: what this state needs (Q-07), its longer words one tap further */}
        <section className={styles.next} role="status" data-testid="quote-next" data-primary={next.primary ?? 'none'}>
          <span className={styles.nextIcon} aria-hidden><Icon name={next.icon} size={20} weight={300} /></span>
          <span className={styles.nextText}>{next.lead ? <b>{next.lead}: </b> : null}{next.text}{next.more && nextOpen ? <span className={styles.nextMore}>{next.more}</span> : null}</span>
          {next.more ? (
            <Tooltip label={nextOpen ? 'Less' : 'More'}>
              <IconButton icon="expand_more" label={nextOpen ? 'Less about this state' : 'More about this state'} size={24} variant="bare" iconSize={20} className={styles.nextChev} aria-expanded={nextOpen} data-open={nextOpen || undefined} onClick={() => setNextOpen((o) => !o)} data-testid="quote-next-more" />
            </Tooltip>
          ) : null}
        </section>
        <QuoteDocument reading={reading} totalMinor={totalMinor} lineCount={lineCount} onAsPrinted={onAsPrinted} />
        {/* the rest of the record, folded: it reads here; Edit changes it */}
        <div className={styles.folds} data-testid="quote-folds">
          {folds.payments ? (
            <Fold title="Payment schedule" meta={folds.scheduleWord} testId="fold-payments">
              <ul className={styles.payList}>
                {folds.payments.map((p, i) => (
                  <li key={i} className={styles.payRow}>
                    <span className={styles.payWords}><span className={styles.payName}>{p.name}</span>{p.description ? <span className={styles.payDesc}>{p.description}</span> : null}{p.due ? <span className={styles.payDesc}>{p.due}</span> : null}</span>
                    <span className={styles.payShare}>{p.share}</span>
                    <span className={styles.payAmount}>{p.amount}</span>
                  </li>
                ))}
              </ul>
            </Fold>
          ) : null}
          <Fold title="Files" count={folds.files.count} meta={folds.files.count ? (folds.files.names[0] ?? '') + (folds.files.count > 1 ? ` + ${folds.files.count - 1} more` : '') : 'None attached'} testId="fold-files">
            {folds.files.names.length ? <ul className={styles.plainList}>{folds.files.names.map((n, i) => <li key={i}>{n}</li>)}</ul> : <p className={styles.plain}>No files on this {noun} yet — Edit › Files attaches them.</p>}
          </Fold>
          <Fold title="Terms and conditions" meta={folds.terms.text ? (folds.terms.visible ? 'shown on the print' : 'not printed') : 'Empty'} testId="fold-terms">
            {folds.terms.text ? <p className={styles.plainText}>{folds.terms.text}</p> : <p className={styles.plain}>No terms yet.</p>}
          </Fold>
          <Fold title="Additional notes" meta={folds.notes.text ? (folds.notes.visible ? 'shown on the print' : 'not printed') : 'Empty'} testId="fold-notes">
            {folds.notes.text ? <p className={styles.plainText}>{folds.notes.text}</p> : <p className={styles.plain}>No notes yet.</p>}
          </Fold>
          <Fold title="Signature" meta={folds.signature.required ? 'client signs online' : 'no client signature'} testId="fold-signature">
            <p className={styles.plain}>{folds.signature.member} signs for {folds.signature.studio}. {folds.signature.required ? `${folds.signature.client} signs online on the agreement.` : 'The print carries no client signature.'}</p>
          </Fold>
          <button type="button" className={styles.foldHead} onClick={onComments} data-testid="fold-comments">
            <span className={styles.foldText}><span className={styles.foldTitle}>Comments{folds.comments ? <span className={styles.foldCount}> {folds.comments}</span> : null}</span><span className={styles.foldMeta}>{folds.comments ? 'the team’s notes on the lines' : 'none yet'}</span></span>
            <span className={styles.foldChev} aria-hidden><Icon name="chevron_right" size={24} /></span>
          </button>
          <Fold title="Activity" meta={folds.activity[0]?.text ?? 'nothing yet'} testId="fold-activity">
            <div className={styles.activity}><ActivityBody events={folds.activity} now={folds.activityNow} /></div>
          </Fold>
        </div>
      </div>
      {/* the sticky foot: Edit, and the one filled button this state needs (Q-07) */}
      <div className={styles.foot} data-testid="quote-foot">
        <Button variant="secondary" appearance="outlined" size="lg" onPress={onEdit} data-kb="edit" data-testid="quote-edit">Edit</Button>
        {primary ? <span className={`${styles.anchor} ${styles.primary}`}>{primary}</span> : null}
      </div>
    </div>
  )
}

/** A row of the record that opens in place — title · count · one line of meta · a chevron; 56 tall. (Contracts on the move, P-01) Exported:
    the Contract screen's folded rows are this one — never a copy. */
export function Fold({ title, count, meta, children, testId }: { title: string; count?: number; meta: string; children: ReactNode; testId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <section className={styles.fold} data-open={open || undefined} aria-label={title}>
      <button type="button" className={styles.foldHead} aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid={testId}>
        <span className={styles.foldText}><span className={styles.foldTitle}>{title}{count != null && count > 0 ? <span className={styles.foldCount}> {count}</span> : null}</span><span className={styles.foldMeta}>{meta}</span></span>
        <span className={styles.foldChev} aria-hidden><Icon name="expand_more" size={24} /></span>
      </button>
      {open ? <div className={styles.foldBody}>{children}</div> : null}
    </section>
  )
}
