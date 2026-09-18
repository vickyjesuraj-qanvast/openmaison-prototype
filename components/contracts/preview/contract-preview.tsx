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
import { firstName, signingLink, signingMessage } from '@/lib/contracts/model'
import type { ContractEditorData } from '@/lib/contracts/queries'
import { sendContract } from '@/app/contracts/actions'
import { ContractPaper } from '@/components/contracts/render/contract-paper'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import styles from '@/components/quotes/preview/quote-preview.module.css'
import own from './contract-preview.module.css'

/**
 * Contract preview (REG-534): the document as the client will see it on the signing page — the brand letterhead, the chips
 * resolved, the signature boxes — under the quote preview's bar (its stylesheet reused): Back to edit · Copy link · Download
 * as PDF (print) · Send. `?print=1` prints the page (Download as PDF · Print from the editor and the tab).
 */
export function ContractPreview({ data, from, print }: { data: ContractEditorData; from?: string; print: boolean }) {
  const { contract, lead, studio, brand, values, me } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const [status, setStatus] = useState(contract.status)
  const [sendOpen, setSendOpen] = useState(false)
  const link = signingLink(contract.id)
  const { copied, copy } = useCopy(link, { done: 'Signing link copied' })
  const editorHref = withFrom(`/contracts/${contract.id}`, from)
  useEffect(() => { if (print) { const t = setTimeout(() => window.print(), 600); return () => clearTimeout(t) } }, [print])
  const studioSignature = me && (me.signatureKind === 'draw' || me.signatureKind === 'type') ? { kind: me.signatureKind === 'draw' ? 'draw' as const : 'type' as const, name: me.signatureName ?? me.name, data: me.signatureData } : null
  const client = contract.signedAt ? { name: contract.signedBy ?? contract.recipientName ?? lead.name, at: contract.signedAt } : null
  const uploaded = contract.source === 'uploaded'
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
          <Tooltip label={copied ? 'Copied' : 'Copy signing link'}><IconButton icon="link" label="Copy signing link" onClick={() => { void copy() }} /></Tooltip>
          <Tooltip label="Download as PDF"><IconButton icon="download" label="Download as PDF" onClick={() => window.print()} /></Tooltip>
          {status === 'Signed' ? (
            <Tooltip label="Contract is signed"><span><Button variant="primary" isDisabled>Send</Button></span></Tooltip>
          ) : <Button variant="primary" onPress={() => setSendOpen(true)}>Send</Button>}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.column}>
          <div className={styles.stage}>
            {uploaded ? (
              <div className={own.uploaded}>
                <span className={own.uploadedGlyph}><Icon name="description" size={32} /></span>
                <span className={own.uploadedName}>{contract.fileName ?? contract.title}</span>
                <span className={own.uploadedHelp}>An uploaded PDF. The client receives this file through the signing link.</span>
              </div>
            ) : (
              <ContractPaper html={contract.body ?? ''} values={values} brand={brand} studio={studio} studioSignature={studioSignature} client={client} />
            )}
          </div>
        </div>
      </div>
      <SendContractDialog open={sendOpen} onClose={() => setSendOpen(false)} link={link}
                          defaults={{ name: contract.recipientName ?? lead.name, phone: contract.recipientPhone ?? lead.phone }}
                          draft={(name) => signingMessage({ clientFirst: firstName(name), studio: values['studio.name'] ?? studio.name, title: contract.title, link })}
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
