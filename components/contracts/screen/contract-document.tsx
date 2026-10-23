'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import { resolveTokens, type TokenValues } from '@/lib/contracts/tokens'
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import type { SignedLetterhead } from '@/lib/contracts/policy'
import { clausesOf, signsLine } from '@/lib/contracts/clauses'
import { renderSignFields, type ClientSignature, type StudioSignature } from '@/components/contracts/render/contract-paper'
import { ContractPdf } from '@/components/contracts/render/contract-pdf'
import paper from '@/components/contracts/render/contract-paper.module.css'
import doc from '@/components/quotes/screen/document.module.css'
import styles from './contract-screen.module.css'

/**
 * (Contracts on the move, P-01 — 2026-10-22) The contract as a document on the Contract screen: the clauses as reading cards split at the
 * headings (`clausesOf`, the Outline's own numbering) — the first open, the rest folded — each card's words the paper's own reflowed body
 * (contract-paper.module.css, composed — never a copy: the chips resolved, the signature boxes drawn, 16px at 324 wide), the signature boxes
 * read on the last card's head ("Signatures · Studio · Client — placed"). Signed, the copy kept at signing is what the cards read. An
 * uploaded PDF is its card. "As printed" opens the Preview's paper viewer.
 */
export function ContractDocument({ html, values, brand, studio, studioSignature, client, letterhead, uploaded, pdf, pdfHelp, blank, onAsPrinted }: {
  html: string
  values: TokenValues
  brand: BrandKit
  studio: StudioDetails
  studioSignature: StudioSignature
  client: ClientSignature
  letterhead?: SignedLetterhead | null
  uploaded: boolean
  pdf: { name: string; src: string | null; thumb: string | null; /** (C4 — P-12) a photo of the signed paper */ picture?: boolean } | null
  pdfHelp?: string
  blank: boolean
  onAsPrinted: () => void
}) {
  const issuer = letterhead?.name || values['studio.name'] || studio.name
  const split = useMemo(() => {
    if (uploaded || blank) return { lead: '', clauses: [] }
    return clausesOf(renderSignFields(resolveTokens(sanitizeContractHtml(html), values), { studio: studioSignature, client, studioName: issuer }))
  }, [uploaded, blank, html, values, studioSignature, client, issuer])
  const [open, setOpen] = useState<Set<number>>(() => new Set([split.lead ? -1 : split.clauses[0]?.index ?? -1]))
  const toggle = (i: number) => setOpen((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })
  const n = split.clauses.length
  void brand
  const card = (index: number, title: string, body: string, meta: string | null, testId: string) => {
    const on = open.has(index)
    return (
      <section key={index} className={doc.section} data-open={on || undefined} aria-label={title} data-testid={testId}>
        <button type="button" className={doc.head} aria-expanded={on} onClick={() => toggle(index)} data-testid="document-clause">
          <span className={doc.headName}>{title}</span>
          {meta ? <span className={doc.headCount}>{meta}</span> : null}
          <span className={doc.chev} aria-hidden><Icon name="expand_more" size={24} /></span>
        </button>
        {on ? <div className={`${paper.body} ${styles.clause}`} dangerouslySetInnerHTML={{ __html: body }} /> : null}
      </section>
    )
  }
  return (
    <div className={doc.doc} data-testid="contract-document">
      <div className={doc.docHead}>
        <span className={doc.count}>{uploaded ? (pdf?.picture ? 'Photo' : 'PDF') : blank ? 'Empty' : `${n} ${n === 1 ? 'clause' : 'clauses'}`}</span>
        <Button appearance="text" iconStart={<Icon name="description" size={20} />} onPress={onAsPrinted} data-testid="as-printed">As printed</Button>
      </div>
      {uploaded ? (
        <ContractPdf name={pdf?.name ?? 'The PDF'} src={pdf?.src ?? null} thumb={pdf?.thumb ?? null} picture={pdf?.picture} help={pdfHelp ?? (pdf?.picture ? 'The photo of the signed paper — the signed copy.' : pdf ? 'The client reads this PDF on the signing link and signs under it.' : 'Only its name was kept — attach the PDF from Edit › Document so the client can read it.')} />
      ) : blank ? (
        <p className={doc.none}>The document is empty — Edit › Document to write it, or start again from a template.</p>
      ) : (
        <>
          {split.lead ? card(-1, 'Preamble', split.lead, null, 'document-lead') : null}
          {split.clauses.map((c) => card(c.index, c.title, c.html, signsLine(c.signs), 'document-section'))}
        </>
      )}
    </div>
  )
}
