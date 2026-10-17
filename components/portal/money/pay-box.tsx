'use client'

import { useEffect, useMemo, useState } from 'react'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useCopy } from '@/components/om/use-copy'
import { payNowPayload, qrMatrix, qrPath } from '@/lib/projects/payments-paynow'
import { money2 } from '@/lib/quotes/math'
import type { PortalPay, PortalPayStage } from '@/lib/projects/payments-portal'
import { payShowsFrom } from '@/lib/projects/payment-methods'
import { PhotoViewer } from '../project/photo-viewer'
import styles from './money.module.css'

/** The QR as an SVG picture (what the page shows until the browser draws its PNG). */
function svgUrl(m: boolean[][]): string {
  const n = m.length + 8
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * 8}" height="${n * 8}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#ffffff"/><path d="${qrPath(m)}" fill="#000000"/></svg>`)}`
}
/** The QR as a PNG — a picture a phone saves to its photos from a long press (an SVG it may not), drawn black on white, crisp. */
function pngUrl(m: boolean[][]): string | null {
  const n = m.length + 8, px = 8
  const c = document.createElement('canvas')
  c.width = n * px; c.height = n * px
  const g = c.getContext('2d')
  if (!g) return null
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#000000'
  m.forEach((row, y) => row.forEach((on, x) => { if (on) g.fillRect((x + 4) * px, (y + 4) * px, px, px) }))
  try { return c.toDataURL('image/png') } catch { return null }
}

/** One value the client types into their banking app, with its Copy — the house copy (useCopy: the snackbar and the button both answer). */
function CopyValue({ text, copyText, label, testId }: { text: string; copyText: string; label: string; testId: string }) {
  /* (parity map, CP-089) the words in a line keep an acronym's capitals — "the SWIFT code", "the PayNow ID" */
  const lower = label.split(' ').map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ')
  const { copied, copy } = useCopy(copyText, { done: `${label} copied`, failed: `Couldn’t copy the ${lower} — please try again` })
  return (
    <span className={styles.payValue}>
      <span className={styles.payLine}>{text}</span>
      <Tooltip label={copied ? 'Copied' : `Copy the ${lower}`}>
        <IconButton icon={copied ? 'check' : 'content_copy'} label={`Copy the ${lower}`} size={36} variant="bare" iconSize={18} iconWeight={300} onClick={() => { void copy() }} data-testid={testId} />
      </Tooltip>
    </span>
  )
}

/**
 * (Projects round 6, board 4 — fix-F, F-08) How to pay one invoice: the studio's PayNow QR with the amount and the invoice number in it, who it
 * goes to, the reference, the bank, the PayNow ID. On the client's phone the QR is on the very phone that would scan it, so it is a picture
 * that saves (a long press keeps it for the banking app's "scan from photos") and opens large on a tap; the PayNow ID, the reference and the
 * amount each carry Copy, so nothing is retyped. An entity with only an uploaded QR shows that picture.
 */
/** (parity map, CP-089 · FB-112) What the page may add to the entity's pay-to: its bank's branch code, and the ways the studio takes money
    today (absent = every way). */
type PayExtras = { branch?: string | null; methods?: string[] | null }

export function PayBox({ pay: given, stage }: { pay: PortalPay & PayExtras; /** (S44R — the signing page's deposit) only what is owed and its reference are read */ stage: Pick<PortalPayStage, 'number' | 'owedMinor'> }) {
  /* (parity map, FB-112) the ways switched off in Settings › Finance › Client payments leave the box: no bank while Bank transfer is off, no
     PayNow (its ID and its QR) while PayNow is off */
  const shows = payShowsFrom(given.methods)
  const pay = { ...given, payNow: shows.payNow ? given.payNow : null, payNowQr: shows.payNow ? given.payNowQr : null }
  const bank = shows.bank && !!given.accountNo
  const inPerson = (given.methods ?? []).filter((m) => m === 'cheque' || m === 'cash')
  const reference = stage.number ?? ''
  const payload = useMemo(() => (pay.payNow ? payNowPayload({ payNow: pay.payNow, amountMinor: stage.owedMinor, reference, merchant: pay.accountName }) : null), [pay.payNow, pay.accountName, stage.owedMinor, reference])
  const matrix = useMemo(() => (payload ? qrMatrix(payload) : null), [payload])
  const [png, setPng] = useState<{ key: string; url: string } | null>(null)
  const [big, setBig] = useState(false)
  /* the PNG is drawn once the page is in the browser; its answer lands in a callback (never a set in the effect's body) */
  useEffect(() => {
    if (!matrix || !payload) return
    let live = true
    void Promise.resolve().then(() => { const url = pngUrl(matrix); if (live && url) setPng({ key: payload, url }) })
    return () => { live = false }
  }, [matrix, payload])
  const src = matrix ? (png?.key === payload ? png.url : svgUrl(matrix)) : pay.payNowQr
  const amount = (stage.owedMinor / 100).toFixed(2)
  return (
    <div className={styles.payBox} data-testid="portal-pay-box">
      {src ? (
        <button type="button" className={styles.qrButton} onClick={() => setBig(true)} aria-label={`Open the PayNow QR for ${reference} larger`} data-testid="portal-qr-open">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.qr} src={src} width={88} height={88} alt={`PayNow QR for ${reference}`} data-testid={matrix ? 'paynow-qr' : 'paynow-qr-uploaded'} data-payload={payload ?? undefined} />
        </button>
      ) : null}
      <span className={styles.payText}>
        <span className={styles.payLabel}>Pay to</span>
        <span className={styles.payName}>{pay.accountName}</span>
        <CopyValue text={`Amount ${money2(stage.owedMinor)}`} copyText={amount} label="Amount" testId="portal-copy-amount" />
        <CopyValue text={`Reference ${reference}`} copyText={reference} label="Reference" testId="portal-copy-reference" />
        {bank ? <span className={styles.payLine}>{[pay.bankName, pay.accountNo].filter(Boolean).join(' · ')}</span> : null}
        {/* (parity map, CP-089 — 1.0's bank-details card) the branch code and the SWIFT, each with Copy, when the entity has them */}
        {bank && given.branch ? <CopyValue text={`Branch code ${given.branch}`} copyText={given.branch} label="Branch code" testId="portal-copy-branch" /> : null}
        {bank && pay.swift ? <CopyValue text={`SWIFT ${pay.swift}`} copyText={pay.swift} label="SWIFT code" testId="portal-copy-swift" /> : null}
        {pay.payNow ? <CopyValue text={`PayNow ${pay.payNow}`} copyText={pay.payNow} label="PayNow ID" testId="portal-copy-paynow" /> : null}
        {/* (parity map, FB-112) only cheques or cash are taken: the box says how, rather than a bank it may not use */}
        {!shows.bank && !shows.payNow && inPerson.length ? <span className={styles.payLine} data-testid="portal-pay-in-person">{`By ${inPerson.join(' or ')} — ${pay.entity} records it when it arrives`}</span> : null}
      </span>
      {src ? <PhotoViewer open={big} title={`PayNow · ${reference}`} photos={[{ id: 'qr', src, name: `PayNow QR ${reference}.png` }]} index={0} onIndex={() => {}} onClose={() => setBig(false)} /> : null}
    </div>
  )
}
