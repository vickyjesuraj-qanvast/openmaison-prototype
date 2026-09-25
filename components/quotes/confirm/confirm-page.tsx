'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { displayDateLong } from '@/lib/format'
import { mm, PAPER_MM } from '@/lib/templates/model'
import { docTotals } from '@/lib/templates/data'
import { money2 } from '@/lib/quotes/math'
import { fallbackDesignClient } from '@/lib/templates/presets'
import type { QuotePreviewData } from '@/lib/templates/queries'
import { TemplateDocument, type Paginated } from '@/components/templates/render/document'
import { confirmQuoteOnline } from '@/app/quotes/actions'
import type { ConfirmExtras } from '@/lib/quotes/confirm-data'
import shell from '@/components/contracts/sign/signing-page.module.css'
import styles from './confirm-page.module.css'

/**
 * The confirmation page (REG-587; Mavid's flow — "send for confirmation to the customer" before the T&Cs): the client's side of
 * the link the studio shares on WhatsApp. The signing page's shell (REG-534) — the studio's letterhead bar, the quote exactly as
 * the preview prints it (the quote's own client view, no internal marks), and a card: read → type your name → Confirm. Confirming
 * marks the quote Confirmed with the name typed; the agreement and the signature follow on the contract the studio raises from it.
 * Already confirmed (or signed), the card says so.
 */
export function ConfirmPage({ data, extras }: { data: QuotePreviewData; /** (REG-626) whether the link is open yet, the optional works to pick, the files shared */ extras: ConfirmExtras }) {
  const { quote, template, brand } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const design = useMemo(() => template?.design ?? fallbackDesignClient(), [template])
  const totals = useMemo(() => docTotals(data.data), [data.data])
  const studioName = data.data.studio.name
  const clientName = data.data.client.name
  const signed = quote.status === 'Signed'
  const [confirmed, setConfirmed] = useState<{ by: string; at: Date } | null>(quote.confirmedAt ? { by: quote.confirmedBy ?? clientName, at: new Date(quote.confirmedAt) } : null)
  const [name, setName] = useState(clientName)
  const [busy, setBusy] = useState(false)
  /* (REG-626, parity Q-32) The optional works the client may add — shown only while the quote's client view prints them. */
  const optional = data.view.optionalWorks ? extras.optional : []
  const [picks, setPicks] = useState<Set<string>>(() => new Set(extras.optional.filter((o) => o.choice === 'want').map((o) => o.id)))
  const pickedMinor = optional.filter((o) => picks.has(o.id)).reduce((s, o) => s + o.minor, 0)
  const toggle = (id: string, on: boolean) => setPicks((p) => { const n = new Set(p); if (on) n.add(id); else n.delete(id); return n })
  const wanted = extras.optional.filter((o) => o.choice === 'want')

  /* Fit the page to the stage, never above 1:1 (the preview's rule). */
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(0)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => { for (const e of es) setAreaW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pageW = mm(PAPER_MM[design.page.paper].w)
  const zoom = areaW ? Math.min(1, Math.max(0.3, areaW / pageW)) : 0.9
  const [pages, setPages] = useState(0)
  const onPaginated = useCallback((p: Paginated) => setPages(p.pages), [])

  const confirm = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const r = await confirmQuoteOnline(quote.id, name.trim(), [...picks])
      setConfirmed({ by: r.by, at: new Date(r.confirmedAt) })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t confirm — please try again' }) } finally { setBusy(false) }
  }
  return (
    <div className={shell.page} data-testid="confirm-page">
      <header className={shell.top}>
        <span className={shell.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img className={shell.logo} src={brand.logo} alt="" /> : null}
          <span className={shell.studio}>{studioName}</span>
        </span>
        <span className={shell.secure}><Icon name="lock" size={16} />Private link</span>
      </header>
      <div className={shell.body}>
        <div className={`${shell.stage} ${styles.stage}`} ref={areaRef}>
          {/* (sweep S1) a link opened before the studio sent the quote shows nothing of it — no draft, no prices — only the card's "Not ready yet" */}
          {extras.open || confirmed || signed ? <TemplateDocument design={design} brand={brand} data={data.data} view={data.view} zoom={zoom} onPaginated={onPaginated} /> : null}
        </div>
        <aside className={shell.card} aria-label="Confirm this quote" data-state={signed ? 'signed' : confirmed ? 'confirmed' : 'open'}>
          {signed ? (
            <>
              <span className={shell.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={shell.cardTitle}>Signed</h2>
              <p className={shell.cardText}>This quote is signed. {studioName} keeps a copy of the agreement with you.</p>
            </>
          ) : confirmed ? (
            <>
              <span className={shell.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={shell.cardTitle}>Confirmed</h2>
              <p className={shell.cardText}>Confirmed by <strong>{confirmed.by}</strong> on {displayDateLong(confirmed.at)}. {studioName} will send the agreement for your signature next.</p>
              {wanted.length ? <p className={shell.cardText} data-testid="confirm-wanted">You asked for {wanted.map((o) => o.name).join(', ')} as well — {studioName} will add {wanted.length === 1 ? 'it' : 'them'} to the quote.</p> : null}
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => window.print()}>Download a copy</Button>
            </>
          ) : !extras.open ? (
            /* (REG-626, parity §8.2 · E-110) A link opened before the studio sent the quote: nothing to confirm yet. */
            <>
              <span className={shell.eyebrow}>{quote.number}</span>
              <h2 className={shell.cardTitle} data-testid="confirm-not-ready">Not ready yet</h2>
              <p className={shell.cardText}>{studioName} is still preparing this quote. They will send it to you when it is ready to confirm.</p>
            </>
          ) : (
            <>
              <span className={shell.eyebrow}>{quote.number}{pages > 1 ? ` · ${pages} pages` : ''}</span>
              <h2 className={shell.cardTitle}>Confirm this quote</h2>
              <p className={shell.cardText}>Hi {clientName.split(' ')[0]}, please read the quote. When you’re happy to go ahead, type your name and confirm — the agreement and the signature come after.</p>
              <div className={styles.total}><span>Total</span><strong>{money2(totals.totalMinor)}</strong></div>
              {optional.length ? (
                <div className={styles.optional} data-testid="confirm-optional">
                  <span className={shell.eyebrow}>Optional works</span>
                  <p className={shell.fine}>Tick the ones you’d like added. {studioName} will update the quote with them.</p>
                  <ul className={styles.optionalList}>
                    {optional.map((o) => (
                      <li key={o.id}>
                        <label className={styles.optionalRow}>
                          <Checkbox isSelected={picks.has(o.id)} onChange={(on: boolean) => toggle(o.id, on)} aria-label={`Add ${o.name}`} />
                          <span className={styles.optionalName}>{o.name}</span>
                          <span className={styles.optionalPrice}>{money2(o.minor)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {pickedMinor ? <div className={styles.total} data-testid="confirm-with-picks"><span>With your picks</span><strong>{money2(totals.totalMinor + pickedMinor)}</strong></div> : null}
                </div>
              ) : null}
              <TextField label="Your full name" required value={name} onChange={setName} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void confirm() } }} />
              <p className={shell.fine}>Confirming tells {studioName} you accept this quote as shown. It is not a signature.</p>
              <Button isDisabled={!name.trim() || busy} onPress={() => { void confirm() }}>{busy ? 'Confirming…' : 'Confirm quote'}</Button>
            </>
          )}
          {/* (REG-626, parity §8.2 · E-91) The files the studio shares with the quote — its Files section's "Show in client view". */}
          {extras.files.length && (extras.open || confirmed || signed) ? (
            <div className={styles.files} data-testid="confirm-files">
              <span className={shell.eyebrow}>Files from {studioName}</span>
              <ul className={styles.fileList}>
                {extras.files.map((f) => (
                  <li key={f.id} className={styles.fileRow}>
                    <Icon name={f.kind === 'pdf' ? 'picture_as_pdf' : 'image'} size={20} weight={300} />
                    {f.thumb ? <a href={f.thumb} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>{f.name}</a> : <span className={styles.fileName}>{f.name}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
