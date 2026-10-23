'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { useSheetLayout } from '@/components/om/sheet'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PaperViewer } from '@/components/quotes/confirm/paper-viewer'   // (K3) the house "As printed" viewer — the client's page's, shared
import { withFrom } from '@/lib/nav'
import { copyText } from '@/lib/clipboard'
import { displayDate } from '@/lib/format'
import { contractLink, firstName, signingLink, signingMessage, tokenOf } from '@/lib/contracts/model'
import { ContractPdf } from '@/components/contracts/render/contract-pdf'
import type { ContractEditorData } from '@/lib/contracts/queries'
import { renewSigningLink, sendContract, shareContractLink } from '@/app/contracts/actions'
import { isBlankDoc } from '@/lib/contracts/tokens'
import { ContractPaper } from '@/components/contracts/render/contract-paper'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { SigningRecord } from '@/components/contracts/sign/signing-record'
import { contractReadiness } from '@/lib/contracts/readiness'
import { DepositAsk } from '@/components/contracts/editor/deposit-ask'   // (S44R, C7)
import { PageReveal } from '@/components/shell/page-reveal'
import { ContractSkeleton } from '@/components/contracts/editor/contract-skeleton'
import header from '@/components/quotes/editor/editor-header.module.css'
import styles from '@/components/quotes/preview/quote-preview.module.css'
import own from './contract-preview.module.css'

/* true once hydrated: the viewer is a portal only the client can mount — `?paper=1` opens it on the first client render, never on the server's */
const noop = () => () => {}
const useMounted = () => useSyncExternalStore(noop, () => true, () => false)
/** The contract paper's own width (A4 at 96 dpi, contract-paper.module.css). */
const PAPER_W = 816

/**
 * Contract preview (REG-534): the document as the client will see it on the signing page — the brand letterhead, the chips
 * resolved, the signature boxes — under the quote preview's bar (its stylesheet reused): Back to edit · Copy link · Download
 * as PDF (print) · Send. `?print=1` prints the page (Download as PDF · Print from the editor and the tab).
 *
 * (Contracts on the move, P-01 — the Preview's B-09 · B-10; his "please check and built accordingly" 2026-10-22) On a phone and a touch tablet
 * (≤1024) the desk's bar gives way to one 56px bar — ← · Preview over the title and status · Download · ⋮ (Copy signing link · Share PDF). A
 * phone reads the reflowed paper (the client's own view, already 16px) with **Paper** as a toggle to the house viewer (K3's pattern: the A4
 * fit to the width, pinch to zoom, Download in its bar; `?paper=1` lands on it — the Contract screen's "As printed") and the state's one
 * primary in a 48 foot: Send (Draft) · Copy signing link (Sent) · Download signed copy (Signed). A tablet draws the paper at 1:1 under the
 * same bar, the primary in it. The desk (≥1025) is as it was.
 */
export function ContractPreview({ data, from, print, paper: paperAsked = false }: { data: ContractEditorData; from?: string; print: boolean; /** `?paper=1`: a phone arrives on the paper viewer */ paper?: boolean }) {
  const { contract, lead, studio, brand, values, signed: kept } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const [status, setStatus] = useState(contract.status)
  const [sendOpen, setSendOpen] = useState(false)
  const [askDeposit, setAskDeposit] = useState(contract.askDeposit)   // (S44R, C7)
  const link = signingLink(tokenOf(contract))   // (pending modules S03) the link's own token
  const { copied, copy } = useCopy(contractLink({ id: contract.id, signToken: contract.signToken, bundleId: contract.bundleId, status }), {   /* (REG-633, E-118) */ done: 'Signing link copied' })
  const editorHref = withFrom(`/contracts/${contract.id}`, from)
  useEffect(() => { if (print && !(contract.source === 'uploaded' && data.pdf)) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print, contract.source, data.pdf])
  /* (REG-631, E-117 · Q-05) The page the client opens, exactly: the studio signature by the signing page's rule (the creator's), the
     masked NRIC under the client's name, and for a Signed contract the copy kept at signing. */
  const studioSignature = kept ? kept.studioSignature : data.studioSignature
  const client = contract.signedAt ? { name: contract.signedBy ?? contract.recipientName ?? lead.name, at: contract.signedAt, nric: contract.signedNric, drawing: contract.signatureKind === 'draw' ? contract.signatureData : null } : null
  const uploaded = contract.source === 'uploaded'
  /* (pending modules S03) Download as PDF: an uploaded contract's kept PDF is the file itself; the signed copy attached on Mark as signed for
     Download signed copy; a written one prints */
  const pdf = data.pdf
  const download = () => { if (uploaded && pdf) window.location.assign(`/files/raw/${pdf.fileId}?download=1`); else printPaper() }
  const downloadSigned = () => { if (data.signedFile) window.location.assign(`/files/raw/${data.signedFile.fileId}?download=1`); else printPaper() }
  useEffect(() => { if (print && uploaded && pdf) { window.location.assign(`/files/raw/${pdf.fileId}?download=1`) } }, [print, uploaded, pdf])
  /* (REG-634, parity Q-22) Preview's Send runs the editor's checks. */
  const issues = contractReadiness({ source: contract.source, body: contract.body, values, hasStudioSignature: !!data.studioSignature, hasQuote: !!data.quote,
    quote: data.quote ? { number: data.quote.number, status: data.quote.status } : null, approvalRequired: data.approvalRequired, approver: data.canApprove })   // (UX audit C2) the named quote · (S44Q — row 334) an approver's send approves it
  const blockIssue = issues.find((i) => i.blocking) ?? null
  /* (REG-631, Q-07) Copying a Draft's link shares it: the contract is Sent to Client from then on. (UX audit C8) Only once the copy worked —
     the checks first, then the copy, then the share; a refusal leaves it a Draft and says why. */
  const shareDraft = (): Promise<boolean> => shareContractLink(contract.id).then((r) => {
    if ('error' in r) { snackbar({ message: `Couldn’t mark it Sent — ${r.error}` }); return false }
    setStatus(r.status); router.refresh(); snackbar({ message: 'Signing link copied — the contract is Sent to Client now' }); return true
  }, () => { snackbar({ message: 'Couldn’t share the link — please try again' }); return false })
  const copyLink = () => {
    if (status === 'Draft' && !uploaded && isBlankDoc(contract.body)) { snackbar({ message: 'Add some content before sharing the link' }); return }
    if (status === 'Draft' && blockIssue) { snackbar({ message: `Before you send: ${blockIssue.label}` }); return }
    /* (pending modules S03) a copy is a send: a link past its window opens again for the studio's days */
    if (status === 'Sent to Client' && contract.signExpiresAt && contract.signExpiresAt.getTime() <= data.now) { void copyText(contractLink({ id: contract.id, signToken: contract.signToken, bundleId: contract.bundleId, status })).then(() => renewSigningLink(contract.id, 'copy')).then((r) => { if ('error' in r) { snackbar({ message: `Couldn’t open the link again — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return } snackbar({ message: `Signing link copied — it opens for ${data.linkDays} days from now` }); router.refresh() }, () => snackbar({ message: 'Couldn’t copy the link — please try again' })); return }
    if (status !== 'Draft') { void copy(); return }
    const write = copyText(contractLink({ id: contract.id, signToken: contract.signToken, bundleId: contract.bundleId, status }))
    void write.then(() => { void shareDraft() }, () => snackbar({ message: 'Couldn’t copy the link — the contract stays a Draft' }))
  }
  const send = () => { if (blockIssue) { snackbar({ message: `Before you send: ${blockIssue.label}`, actionLabel: 'Back to edit', onAction: () => router.push(editorHref) }); return } setSendOpen(true) }

  /* ── (Contracts on the move, P-01) the touch widths ── */
  const tabletDown = useMediaQuery(TABLET_DOWN)
  const sheet = useSheetLayout()
  const phone = sheet && !print
  const touch = tabletDown && !print
  const mounted = useMounted()
  const [more, setMore] = useState(false)
  const [paperOpen, setPaperOpen] = useState(paperAsked)
  const fromCards = useRef(false)   // the viewer opened from the page's own Paper: ← closes back to it; arrived on (`?paper=1`), ← returns to the contract
  const viewerOpen = phone && !uploaded && paperOpen && mounted
  /* "Paper" writes `?paper=1` into the address without a round trip, so a reload lands where the person was (REG-465) */
  const togglePaper = (on: boolean) => {
    setPaperOpen(on)
    const u = new URL(window.location.href)
    if (on) u.searchParams.set('paper', '1'); else u.searchParams.delete('paper')
    window.history.replaceState(window.history.state, '', `${u.pathname}${u.search}`)
  }
  const closeViewer = () => { if (paperAsked && !fromCards.current) { router.push(editorHref); return } togglePaper(false) }
  /* the viewer's fit: the A4 drawn at the body's width times the pinch (K3's contract) — the paper is one page, scaled whole */
  const [fitW, setFitW] = useState(0)
  const onFit = useCallback((w: number) => setFitW(w), [])
  const zoom = fitW ? fitW / PAPER_W : 0.4
  const inner = useRef<HTMLDivElement>(null)
  const [natH, setNatH] = useState(1123)
  useEffect(() => {
    const el = inner.current
    if (!viewerOpen || !el) return
    const ro = new ResizeObserver(() => setNatH(Math.max(1, el.offsetHeight)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewerOpen])

  const paperEl = uploaded ? (
    /* (pending modules S03) the PDF itself — what the client reads on the link */
    <ContractPdf name={pdf?.name ?? contract.fileName ?? contract.title} src={pdf ? `/files/raw/${pdf.fileId}` : null} thumb={pdf?.thumb ? `/files/thumb/${pdf.fileId}` : null} picture={pdf?.picture}
                 help={pdf?.picture ? 'The photo of the signed paper — the signed copy, kept in Files › Contract & VOs.' : pdf ? 'The client reads this PDF on the signing link and signs under it.' : 'Only its name was kept — attach the PDF from the editor so the client can read it.'} />
  ) : (
    <ContractPaper html={kept?.body ?? contract.body ?? ''} values={values} brand={brand} studio={studio} studioSignature={studioSignature} client={client} letterhead={data.letterhead} />
  )
  const record = kept ? <SigningRecord r={{ signedBy: contract.signedBy, signedAt: contract.signedAt, nric: contract.signedNric, signatureKind: contract.signatureKind, phone: contract.signerPhone, method: contract.verificationMethod, device: contract.signerUserAgent, timezone: contract.signerTimezone, viewedAt: contract.viewedAt, acceptedAt: contract.acceptedAt, caseTrustAt: contract.caseTrustAt, hash: kept.hash }} /> : null
  const sendDialog = (
    <SendContractDialog open={sendOpen} onClose={() => setSendOpen(false)} link={link} subtitleShort="Your client reviews and signs in their browser."
                        defaults={{ name: contract.recipientName ?? lead.name, phone: contract.recipientPhone ?? lead.phone }}
                        draft={(name) => signingMessage({ clientFirst: firstName(name), studio: values['studio.name'] ?? studio.name, title: contract.title, link })}
                        onCopy={status === 'Draft' ? shareDraft : undefined}
                        notes={issues.filter((i) => !i.blocking).map((i) => i.label)}
                        extra={status !== 'Signed' ? <DepositAsk contractId={contract.id} option={contract.fromQuoteId ? data.deposits[contract.fromQuoteId] ?? null : null} on={askDeposit} onChange={setAskDeposit} recipient={contract.recipientName ?? lead.name} helpClassName={own.sendHelp} /> : undefined}
                        onSend={async ({ name, phone, message }) => {
                          window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')   // on the press, before the round-trip
                          try {
                            const r = await sendContract(contract.id, { name, phone })
                            if ('error' in r) { snackbar({ message: `Couldn’t send the contract — ${r.error}` }); return }   // (UX audit C2)
                            setStatus(r.status); setSendOpen(false)
                            snackbar({ message: `Sent to ${name} for signature` })
                            router.refresh()
                          } catch { snackbar({ message: 'Couldn’t send the contract — please try again' }) }
                        }} />
  )

  if (touch) {
    /* the state's one primary: the foot's 48 button on a phone, the bar's on a tablet (K3's rule) */
    const primary = status === 'Signed'
      ? <Button variant="primary" size={phone ? 'lg' : undefined} onPress={downloadSigned} data-testid="preview-primary">Download signed copy</Button>
      : status === 'Sent to Client'
        ? <Button variant="primary" size={phone ? 'lg' : undefined} onPress={copyLink} data-testid="preview-primary">{copied ? 'Copied' : 'Copy signing link'}</Button>
        : <Button variant="primary" size={phone ? 'lg' : undefined} onPress={send} data-testid="preview-primary">Send</Button>
    return (
      <PageReveal skeleton={<ContractSkeleton kind="preview" pdf={uploaded} />}>
        <div className={styles.page} data-touch="" data-testid="contract-preview">
          <header className={styles.touchBar} data-testid="preview-bar">
            <Tooltip label="Back to the contract"><IconButton icon="arrow_back" label="Back to the contract" size={36} variant="bare" iconSize={24} iconWeight={300} onClick={() => router.push(editorHref)} data-kb="back" data-testid="preview-back" /></Tooltip>
            <div className={styles.touchTitle}>
              <h1 className={styles.touchH}>Preview</h1>
              <span className={styles.touchSub} data-testid="preview-sub">{contract.title} · {status}{contract.signedAt ? ` · signed ${displayDate(contract.signedAt)}` : ''}</span>
            </div>
            <Tooltip label="Download as PDF"><IconButton icon="download" label="Download as PDF" size={36} variant="bare" iconSize={24} iconWeight={300} onClick={download} data-testid="preview-download" /></Tooltip>
            {!phone ? <span className={`${header.anchor} ${styles.barSend}`}>{primary}</span> : null}
            <span className={header.anchor}>
              <Tooltip label="More options" disabled={more}><IconButton icon="more_vert" label="More options" size={36} variant="bare" iconSize={24} iconWeight={300} aria-haspopup="menu" aria-expanded={more} onClick={() => setMore((o) => !o)} data-testid="preview-more" /></Tooltip>
              <Dropdown open={more} onClose={() => setMore(false)} align="right" width={MENU_WIDTH.wide} sheetTitle="Preview">
                {/* (UX audit C8) on a Draft the copy sends it — said before the press */}
                <DropdownItem onSelect={() => { setMore(false); copyLink() }} help={status === 'Draft' ? 'Marks it Sent to Client' : undefined}>Copy signing link</DropdownItem>
                {/* (K3 — C-20) the file through the system share sheet once a PDF renderer is plugged in (lib/services/pdf.ts, the S34 seam); the print sheet until then */}
                <DropdownItem onSelect={() => { setMore(false); download() }} help="Through WhatsApp, mail or AirDrop">Share PDF</DropdownItem>
              </Dropdown>
            </span>
          </header>
          <div className={styles.body}>
            <div className={styles.column}>
              {phone && !uploaded ? (
                <div className={styles.readHead}>
                  <span className={styles.readCount}>{kept ? 'The copy the client signed' : 'As the client reads it'}</span>
                  <Button appearance="text" iconStart={<Icon name="description" size={20} />} onPress={() => { fromCards.current = true; togglePaper(true) }} data-testid="view-paper">Paper</Button>
                </div>
              ) : null}
              <div className={`${styles.stage} ${phone ? own.phoneStage : own.tabletStage}`} data-testid="preview-stage">
                {paperEl}
                {record}
              </div>
            </div>
          </div>
          {phone ? <div className={styles.foot} data-testid="preview-foot"><span className={header.anchor}>{primary}</span></div> : null}
          {/* (K3's pattern) the house viewer over the reflowed paper: the A4 fit to the width, pinch to zoom, Download in its bar */}
          {phone && !uploaded ? (
            <PaperViewer open={viewerOpen} onClose={closeViewer} title="Paper" subtitle={contract.title} onDownload={download} onFit={onFit}>
              <div className={own.viewerDoc}>
                <div data-page className={own.viewerPage} style={{ width: PAPER_W * zoom, height: natH * zoom }}>
                  <div ref={inner} className={own.viewerInner} style={{ width: PAPER_W, transform: `scale(${zoom})` }}>
                    <ContractPaper html={kept?.body ?? contract.body ?? ''} values={values} brand={brand} studio={studio} studioSignature={studioSignature} client={client} letterhead={data.letterhead} width={PAPER_W} />
                  </div>
                </div>
              </div>
            </PaperViewer>
          ) : null}
          {sendDialog}
        </div>
      </PageReveal>
    )
  }

  /* (contracts on the move — found by the ghosts regression) the desk's Preview holds its own ghost through PageReveal, as the quote's does
     (sweep S1 #27, page-checklist › Load & refresh): the loader now streams with the address's shape, and a page with no reveal showed its
     ghost and then jumped. The frame once loaded is as it was (1440 byte-identical). */
  return (
    <PageReveal skeleton={<ContractSkeleton kind="preview" pdf={uploaded} />}>
    <div className={styles.page} data-testid="contract-preview">
      <div className={`${styles.bar} ${own.noPrint}`}>
        <div className={styles.titleBlock}>
          <Crumbs className={styles.crumb} items={[{ label: 'Leads', href: '/leads' }, { label: lead.name, href: `/leads/${lead.id}` }, { label: 'Contracts', href: `/leads/${lead.id}/contracts` }, { label: 'Preview' }]} />
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{contract.title}</h1>
            <div className={styles.chips}>
              <MetaChip>{status}</MetaChip>
              {contract.signedAt ? <MetaChip>Signed {displayDate(contract.signedAt)}</MetaChip> : null}
              {uploaded ? <MetaChip>{pdf?.picture ? 'Signed on paper' : 'Uploaded PDF'}</MetaChip> : null}
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" appearance="outlined" onPress={() => router.push(editorHref)}>Back to edit</Button>
          <Tooltip label={copied ? 'Copied' : status === 'Draft' ? 'Copy link — marks it Sent' : 'Copy signing link'}><IconButton icon="link" label={status === 'Draft' ? 'Copy link — marks it Sent' : 'Copy signing link'} onClick={copyLink} /></Tooltip>
          <Tooltip label="Download as PDF"><IconButton icon="download" label="Download as PDF" onClick={download} /></Tooltip>
          {/* (UX audit C1) a signed contract's main press is its signed copy — Send was a dead button */}
          {status === 'Signed' ? <Button variant="primary" onPress={downloadSigned}>Download signed copy</Button> : <Button variant="primary" onPress={send}>Send</Button>}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.column}>
          <div className={styles.stage} style={{ flexDirection: 'column', alignItems: 'center' }}>
            {paperEl}
            {record}
          </div>
        </div>
      </div>
      {sendDialog}
    </div>
    </PageReveal>
  )
}
