'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ScreenBar } from '@/components/quotes/screen/screen-bar'
import { fieldsWord, type ClauseRow } from './template-words'
import styles from './template-screen.module.css'

/** The reading screen's ⋮ (P-10): every desk action on the template — no key hints (a touch sheet has no keys, B-22). */
export type TemplateMenuAction = 'rename' | 'default' | 'handover' | 'duplicate' | 'replace' | 'delete'

/**
 * (Contracts on the move, P-10 · C-09 · C-12 · C-18 — his "please check and built accordingly" 2026-10-22) **A contract template's reading
 * screen**: what `/templates/contracts/<id>` opens on a phone and a touch tablet (≤1024) — read first, fix a word second. The one 56 bar
 * (← back where you came from · the template's name over when it was saved · ⋮). A status row — what the template does, from the record:
 * "Default · used by 5 · fills 10 fields · the client signs ✓" (a template with nowhere for the client to sign says so, with the way to fix
 * it). Then the template as its OUTLINE: one row per heading, its first words at 14 and the fields it fills; a row opens the paper
 * full-screen on that heading (C1's Document frame with C2's tool row — the host mounts it). Then **Signature fields** and **Before the client
 * signs** as rows that open their own screens (C2's panels). A standard PDF keeps its first page with one **Open the PDF** (48) and its
 * rules row. No foot and no filled button: every change saves itself, ← is Done. Nothing here is drawn from 1025 up (the desk editor).
 */
export function TemplateReadingScreen({ title, subtitle, status, onFixSigning, pdf, clauses, signatures, gates, onBack, backLabel, onOpenClause, onOpenFields, onOpenGates, menu, onMenu, inert = false }: {
  title: string
  subtitle: string
  status: { text: string; warn: boolean }
  /** The status row's way to fix a template with nowhere for the client to sign: the Signature fields screen. */
  onFixSigning: () => void
  /** A standard PDF: its address, its first page, the words under it. */
  pdf: { src: string; thumb: string | null; name: string; help: string } | null
  clauses: ClauseRow[]
  /** Signature fields' one line ("Studio · Client — placed under Signatures"); null for a PDF (it has no fields). */
  signatures: string | null
  /** Before the client signs, in one line. */
  gates: string
  onBack: () => void
  backLabel: string
  onOpenClause: (row: ClauseRow) => void
  onOpenFields: () => void
  onOpenGates: () => void
  menu: { isDefault: boolean; useAtHandover: boolean; pdf: boolean; changeBlock: string | null; defaultBlock: string | null }
  onMenu: (a: TemplateMenuAction) => void
  /** While a section screen covers it: nothing of it is read or reached, its scroll kept. */
  inert?: boolean
}) {
  const [more, setMore] = useState(false)
  const [thumbOk, setThumbOk] = useState(true)   // a PDF whose first page was never drawn shows its glyph, not a broken picture
  const pick = (a: TemplateMenuAction) => () => { setMore(false); onMenu(a) }
  const defaultWhy = menu.defaultBlock ?? (menu.isDefault ? 'Already the default' : undefined)
  const handoverWhy = menu.defaultBlock ?? (!menu.useAtHandover && menu.pdf ? 'A standard PDF can’t be filled from the project' : undefined)
  return (
    <div className={styles.screen} data-testid="template-reading-screen" inert={inert}>
      <ScreenBar title={title} subtitle={subtitle}
                 leading={<Tooltip label={backLabel}><IconButton icon="arrow_back" label={backLabel} variant="bare" iconSize={24} iconWeight={300} onClick={onBack} data-kb="back" data-testid="template-back" /></Tooltip>}
                 trailing={(
                   <span className={styles.anchor}>
                     <Tooltip label="More options" disabled={more}>
                       <IconButton icon="more_vert" label="More options" variant="bare" aria-haspopup="menu" aria-expanded={more} onClick={() => setMore((o) => !o)} data-testid="template-more" />
                     </Tooltip>
                     <Dropdown open={more} onClose={() => setMore(false)} align="right" width={MENU_WIDTH.wide} sheetTitle={title}>
                       <DropdownItem onSelect={pick('rename')} disabled={!!menu.changeBlock} title={menu.changeBlock ?? undefined}>Rename</DropdownItem>
                       <DropdownItem onSelect={pick('default')} disabled={!!defaultWhy} title={defaultWhy}>Set as default</DropdownItem>
                       <DropdownItem onSelect={pick('handover')} disabled={!!handoverWhy} title={handoverWhy}>{menu.useAtHandover ? 'Stop using at handover' : 'Use at handover'}</DropdownItem>
                       <DropdownItem onSelect={pick('duplicate')}>Duplicate</DropdownItem>
                       {menu.pdf ? <DropdownItem onSelect={pick('replace')} disabled={!!menu.changeBlock} title={menu.changeBlock ?? undefined}>Replace the PDF…</DropdownItem> : null}
                       <DropdownDivider />
                       <DropdownItem tone={menu.changeBlock ? undefined : 'danger'} disabled={!!menu.changeBlock} title={menu.changeBlock ?? undefined} onSelect={pick('delete')}>Delete</DropdownItem>
                     </Dropdown>
                   </span>
                 )} />
      <div className={styles.body}>
        <section className={styles.status} data-tone={status.warn ? 'warn' : undefined} role="status" data-testid="template-status-row">
          <span className={styles.statusIcon} aria-hidden><Icon name={status.warn ? 'warning' : pdf ? 'picture_as_pdf' : 'check_circle'} size={20} weight={300} /></span>
          <span className={styles.statusText}>
            {status.text}
            {status.warn ? <> — nowhere for the client to sign yet, so a contract started from it can’t be sent.<span className={styles.statusFix}><Button variant="secondary" appearance="text" onPress={onFixSigning} data-testid="template-fix-signing">Add a Client signature</Button></span></> : null}
          </span>
        </section>
        {pdf ? (
          /* (C-18) its first page, readable, and one way to open it — the name is the bar's */
          <section className={styles.pdf} aria-label="The PDF" data-testid="template-pdf">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {pdf.thumb && thumbOk ? <img className={styles.pdfPicture} src={pdf.thumb} alt={`The first page of ${pdf.name}`} onError={() => setThumbOk(false)} /> : <span className={styles.pdfNone} aria-hidden><Icon name="picture_as_pdf" size={40} fill /></span>}
            <span className={styles.pdfOpen}><Button variant="secondary" appearance="outlined" size="lg" iconStart={<Icon name="open_in_new" size={20} />} onPress={() => { window.open(pdf.src, '_blank', 'noopener') }} aria-label={`Open the PDF — ${pdf.name}`} data-testid="template-open-pdf">Open the PDF</Button></span>
            <p className={styles.pdfHelp}>{pdf.help}</p>
          </section>
        ) : (
          /* (C-12) the template as its outline: a row per heading, its first words and the fields it fills — a row opens the paper there */
          <ul className={styles.rows} aria-label="Clauses" data-kb-list="clause">
            {clauses.map((c) => (
              <li key={c.index ?? 'lead'} className={styles.item}>
                <button type="button" className={styles.row} onClick={() => onOpenClause(c)} data-kb-row="" data-kb-open="" data-testid="template-clause-row" data-index={c.index ?? ''}>
                  <span className={styles.text}>
                    <span className={styles.title}>{c.title}{c.fields ? <span className={styles.count}> · {fieldsWord(c.fields)}</span> : null}</span>
                    <span className={styles.summary}>{c.words}</span>
                  </span>
                  <span className={styles.chev} aria-hidden><Icon name="chevron_right" size={24} /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <ul className={styles.rows} aria-label="Signing">
          {signatures !== null ? (
            <li className={styles.item}>
              <button type="button" className={styles.row} onClick={onOpenFields} data-testid="template-signatures-row">
                <span className={styles.text}><span className={styles.title}>Signature fields</span><span className={styles.summary}>{signatures}</span></span>
                <span className={styles.chev} aria-hidden><Icon name="chevron_right" size={24} /></span>
              </button>
            </li>
          ) : null}
          <li className={styles.item}>
            <button type="button" className={styles.row} onClick={onOpenGates} data-testid="template-gates-row">
              <span className={styles.text}><span className={styles.title}>Before the client signs</span><span className={styles.summary}>{gates}</span></span>
              <span className={styles.chev} aria-hidden><Icon name="chevron_right" size={24} /></span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
