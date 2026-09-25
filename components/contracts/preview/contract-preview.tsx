'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { contractLink, firstName, signingLink, signingMessage } from '@/lib/contracts/model'
import type { ContractEditorData } from '@/lib/contracts/queries'
import { sendContract, shareContractLink } from '@/app/contracts/actions'
import { isBlankDoc } from '@/lib/contracts/tokens'
import { ContractPaper } from '@/components/contracts/render/contract-paper'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { SigningRecord } from '@/components/contracts/sign/signing-record'
import { contractReadiness } from '@/lib/contracts/readiness'
import styles from '@/components/quotes/preview/quote-preview.module.css'
import own from './contract-preview.module.css'

/**
 * Contract preview (REG-534): the document as the client will see it on the signing page — the brand letterhead, the chips
 * resolved, the signature boxes — under the quote preview's bar (its stylesheet reused): Back to edit · Copy link · Download
 * as PDF (print) · Send. `?print=1` prints the page (Download as PDF · Print from the editor and the tab).
 */
export function ContractPreview({ data, from, print }: { data: ContractEditorData; from?: string; print: boolean }) {
  const { contract, lead, studio, brand, values, signed: kept } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const [status, setStatus] = useState(contract.status)
  const [sendOpen, setSendOpen] = useState(false)
  const link = signingLink(contract.id)
  const { copied, copy } = useCopy(contractLink({ id: contract.id, bundleId: contract.bundleId, status }), {   /* (REG-633, E-118) */ done: status === 'Draft' ? 'Signing link copied — the contract is Sent to Client now' : 'Signing link copied' })
  const editorHref = withFrom(`/contracts/${contract.id}`, from)
  useEffect(() => { if (print) { const t = setTimeout(() => window.print(), 600); return () => clearTimeout(t) } }, [print])
  /* (REG-631, E-117 · Q-05) The page the client opens, exactly: the studio signature by the signing page's rule (the creator's), the
     masked NRIC under the client's name, and for a Signed contract the copy kept at signing. */
  const studioSignature = kept ? kept.studioSignature : data.studioSignature
  const client = contract.signedAt ? { name: contract.signedBy ?? contract.recipientName ?? lead.name, at: contract.signedAt, nric: contract.signedNric, drawing: contract.signatureKind === 'draw' ? contract.signatureData : null } : null
  const uploaded = contract.source === 'uploaded'
  /* (REG-634, parity Q-22) Preview's Send runs the editor's checks. */
  const issues = contractReadiness({ source: contract.source, body: contract.body, values, hasStudioSignature: !!data.studioSignature, hasQuote: !!data.quote })
  const blockIssue = issues.find((i) => i.blocking) ?? null
  /* (REG-631, Q-07) Copying a Draft's link shares it: the contract is Sent to Client from then on. */
  const copyLink = () => {
    if (status === 'Draft' && !uploaded && isBlankDoc(contract.body)) { snackbar({ message: 'Add some content before sharing the link' }); return }
    if (status === 'Draft' && blockIssue) { snackbar({ message: `Before you send: ${blockIssue.label}` }); return }
    /* (sweep S2 #2) a Draft is shared first, copied once the server has it */
    if (status !== 'Draft') { void copy(); return }
    void shareContractLink(contract.id).then((r) => { setStatus(r.status); router.refresh(); void copy() }, () => snackbar({ message: 'Couldn’t share the link — please try again' }))
  }
  return (
    <div className={styles.page} data-testid="contract-preview">
      <div className={`${styles.bar} ${own.noPrint}`}>
        <div className={styles.titleBlock}>
          <Crumbs className={styles.crumb} items={[{ label: 'Leads', href: '/leads' }, { label: lead.name, href: `/leads/${lead.id}` }, { label: 'Contracts', href: `/leads/${lead.id}/contracts` }, { label: 'Preview' }]} />
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{contract.title}</h1>
            <div className={styles.chips}>
              <MetaChip>{status}</MetaChip>
              {contract.signedAt ? <MetaChip>Signed {displayDate(contract.signedAt)}</MetaChip> : null}
              {uploaded ? <MetaChip>Uploaded PDF</MetaChip> : null}
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" appearance="outlined" onPress={() => router.push(editorHref)}>Back to edit</Button>
          <Tooltip label={copied ? 'Copied' : 'Copy signing link'}><IconButton icon="link" label="Copy signing link" onClick={copyLink} /></Tooltip>
          <Tooltip label="Download as PDF"><IconButton icon="download" label="Download as PDF" onClick={() => window.print()} /></Tooltip>
          {status === 'Signed' ? (
            <Tooltip label="Contract is signed"><span><Button variant="primary" isDisabled>Send</Button></span></Tooltip>
          ) : <Button variant="primary" onPress={() => { if (blockIssue) { snackbar({ message: `Before you send: ${blockIssue.label}`, actionLabel: 'Back to edit', onAction: () => router.push(editorHref) }); return } setSendOpen(true) }}>Send</Button>}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.column}>
          <div className={styles.stage} style={{ flexDirection: 'column', alignItems: 'center' }}>
            {uploaded ? (
              <div className={own.uploaded}>
                <span className={own.uploadedGlyph}><Icon name="description" size={32} /></span>
                <span className={own.uploadedName}>{contract.fileName ?? contract.title}</span>
                <span className={own.uploadedHelp}>An uploaded PDF. The signing link names this file for the client to sign — the file itself stays with the studio for now.</span>
              </div>
            ) : (
              <ContractPaper html={kept?.body ?? contract.body ?? ''} values={values} brand={brand} studio={studio} studioSignature={studioSignature} client={client} letterhead={data.letterhead} />
            )}
            {kept ? <SigningRecord r={{ signedBy: contract.signedBy, signedAt: contract.signedAt, nric: contract.signedNric, signatureKind: contract.signatureKind, phone: contract.signerPhone, device: contract.signerUserAgent, timezone: contract.signerTimezone, viewedAt: contract.viewedAt, acceptedAt: contract.acceptedAt, hash: kept.hash }} /> : null}
          </div>
        </div>
      </div>
      <SendContractDialog open={sendOpen} onClose={() => setSendOpen(false)} link={link}
                          defaults={{ name: contract.recipientName ?? lead.name, phone: contract.recipientPhone ?? lead.phone }}
                          draft={(name) => signingMessage({ clientFirst: firstName(name), studio: values['studio.name'] ?? studio.name, title: contract.title, link })}
                          onCopy={status === 'Draft' ? () => shareContractLink(contract.id).then((r) => { setStatus(r.status); router.refresh(); return true }, () => { snackbar({ message: 'Couldn’t share the link — please try again' }); return false }) : undefined}
                          notes={issues.filter((i) => !i.blocking).map((i) => i.label)}
                          onSend={async ({ name, phone, message }) => {
                            window.open(`https://wa.me/65${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')   // on the press, before the round-trip
                            try {
                              const r = await sendContract(contract.id, { name, phone })
                              setStatus(r.status); setSendOpen(false)
                              snackbar({ message: `Sent to ${name} for signature` })
                              router.refresh()
                            } catch { snackbar({ message: 'Couldn’t send the contract — please try again' }) }
                          }} />
    </div>
  )
}
