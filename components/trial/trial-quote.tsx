'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips, type ChipOption } from '@/components/om/chips'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone, FieldError } from '@/components/leads/move-stage/fields'
import { UploadReadingView } from '@/components/quotes/upload-reading'
import { keepTrialRead, setTrialReadLead } from '@/app/site/try/tools-actions'
import { UPLOAD_ACCEPT, UPLOAD_KINDS, unreadHelp, type UploadRead } from '@/lib/quotes/upload'
import { readQuoteUpload } from '@/lib/quotes/read-upload'   // (S42 E-05) the one reader — a PDF from its own words, never its name
import { site } from '@/lib/site/model'
import { LEAD_LIMIT, LEADS_WORDS, QUOTE_WORDS, READ_LIMIT, TRIAL_WORDS, TRY_PATH, leftOf, readLeftLine, type TrialToolKey, type TrialWork } from '@/lib/trial/policy'
import { KeepBand, OtherTools, TrialApp, TrialGate, TrialHero } from './trial-frame'
import { useAddTrialLead } from './trial-lead-form'
import x from './trial-tools.module.css'

/** Upload a quote's files (the Create Quote window's): (S42 E-05 · B·4) a spreadsheet, or a PDF read from its own words — what is read for
    real, and nothing else (a photo was accepted only to be refused, or read as the demo's quote by its name). */
const ACCEPT = UPLOAD_ACCEPT
/** a quote of our own to try with (an invented kitchen quote's lines — no studio's, no client's) */
export const SAMPLE_QUOTE = { href: '/site/try/samples/kitchen-quote.xlsx', name: 'Kitchen quote.xlsx' }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** What a press made takes the focus once it is on the page (the press itself is gone with the step it ended) and is scrolled to under the
    site's sticky bar — a keyboard or a screen reader lands on the answer, not on the page's top. */
export function landOn(testId: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
    if (!el) return
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'start' })
  })
}

/** Read a picked file in this browser with Upload a quote's own reader (lib/quotes/read-upload.ts) — nothing is sent while it reads. */
export const readQuoteFile = (file: File): Promise<UploadRead> => readQuoteUpload(file)
export async function sampleFile(href: string, name: string): Promise<File> {
  const res = await fetch(href)
  if (!res.ok) throw new Error('sample')
  return new File([await res.blob()], name)
}

/**
 * (pending modules S41b-3 — 1.0's anonymous Quote Digitizer: "one free quote read, claimed as a lead plus its quote and line items") Upload a
 * quote for a visitor: the file is read in their browser by the Create Quote window's own reader and shown in its own table — free, nothing
 * leaves the browser. Keeping it is the step the studio has: a quote is always a client's (Create Quote starts on a lead), so they pick one
 * of their trial leads or add the client with the studio's own form, and Keep sends the lines (never the file) to their workspace — one kept
 * quote (1.0's one read). When they start their studio it becomes that lead's quote there. A file that can't be read says why and costs
 * nothing.
 */
type Preview = { file: string; read: Extract<UploadRead, { ok: true }> }
export function TrialQuote({ initial, open }: { initial: TrialWork; open: Partial<Record<TrialToolKey, boolean>> }) {
  const snack = useSnackbar()
  const [work, setWork] = useState(initial)
  const [reading, setReading] = useState<string | null>(null)
  const [failed, setFailed] = useState<{ name: string; reason: Extract<UploadRead, { ok: false }>['reason']; currency?: string } | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [client, setClient] = useState<string | null>(null)
  const [keeping, setKeeping] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const [gate, setGate] = useState<string | null>(null)
  const read = work.read
  const left = leftOf(read ? 1 : 0, READ_LIMIT)
  const leadsLeft = leftOf(work.leads.length, LEAD_LIMIT)
  const nameOf = (id: string | null) => work.leads.find((l) => l.id === id)?.data.name ?? null

  const take = async (file: File | undefined) => {
    if (!file || reading) return
    if (read) { setGate(QUOTE_WORDS.gate); return }
    setFailed(null); setPreview(null); setPickError(null); setReading(file.name)
    const started = Date.now()
    try {
      const r = await readQuoteFile(file)
      const wait = 700 - (Date.now() - started)   // "Reading…" stays long enough to be read (the window's)
      if (wait > 0) await sleep(wait)
      if (!r.ok) { setFailed({ name: file.name, reason: r.reason, currency: r.currency }); return }
      setPreview({ file: file.name, read: r })
      /* the right default: their only lead, else none picked (two leads — they say which) */
      setClient(work.leads.length === 1 ? work.leads[0]!.id : null)
      landOn('trial-quote-read-title')
    } catch { snack({ message: TRIAL_WORDS.couldnt('read the quote') }) }
    finally { setReading(null) }
  }
  const trySample = async () => { try { await take(await sampleFile(SAMPLE_QUOTE.href, SAMPLE_QUOTE.name)) } catch { snack({ message: TRIAL_WORDS.couldnt('open the sample') }) } }

  /* Keep: the lines go to their workspace as this lead's quote; the press stays busy until the server answers. `justAdded` — the lead was
     made a moment ago by Add the client (a refusal then says the lead is there and the quote isn't kept). */
  const keepOn = async (leadId: string, name: string, p: Preview, justAdded = false) => {
    setKeeping(true); setPickError(null)
    try {
      const r = await keepTrialRead({ file: p.file, source: p.read.source, groups: p.read.groups, leadId })
      if ('error' in r) {
        if (r.reason === 'limit') setGate(r.error)
        else if (justAdded) snack({ message: QUOTE_WORDS.addedNotKept(name) })
        else if (r.reason === 'invalid') setPickError(r.error)
        else snack({ message: r.error })
        return
      }
      setWork((w) => ({ ...w, read: r.read }))
      setPreview(null)
      snack({ message: QUOTE_WORDS.keptSnack(name) })
      landOn('trial-quote-read-title')
    } catch { snack({ message: TRIAL_WORDS.couldnt('keep the quote') }) }
    finally { setKeeping(false) }
  }
  const keep = () => {
    const name = nameOf(client)
    if (!preview) return
    if (!client || !name) { setPickError(QUOTE_WORDS.pickFirst); return }
    void keepOn(client, name, preview)
  }
  /* Add the client: the studio's form; the lead it makes is the quote's client, and the quote is kept on them in the same go */
  const pending = useRef<Preview | null>(null)
  const addClient = useAddTrialLead({
    onAdded: async (lead) => {
      setWork((w) => ({ ...w, leads: [...w.leads, lead] }))
      setClient(lead.id)
      const p = pending.current; pending.current = null
      if (p) await keepOn(lead.id, lead.data.name, p, true)
    },
    onGate: setGate,
  })
  const openClient = () => { if (leadsLeft <= 0) { setGate(LEADS_WORDS.gate); return } pending.current = preview; addClient.open() }

  /* whose the kept quote is — another of their leads; back as it was if the server refuses */
  const moveTo = async (leadId: string) => {
    if (!read || leadId === read.leadId) return
    const was = read.leadId
    setWork((w) => (w.read ? { ...w, read: { ...w.read, leadId } } : w))
    try {
      const r = await setTrialReadLead({ leadId })
      if ('error' in r) { setWork((w) => (w.read ? { ...w, read: { ...w.read, leadId: was } } : w)); snack({ message: TRIAL_WORDS.couldnt('change whose quote it is') }) }
    } catch { setWork((w) => (w.read ? { ...w, read: { ...w.read, leadId: was } } : w)); snack({ message: TRIAL_WORDS.couldnt('change whose quote it is') }) }
  }
  const leadOptions: ChipOption[] = work.leads.map((l) => ({ value: l.id, label: l.data.name }))

  return (
    <>
      <TrialHero back={{ label: QUOTE_WORDS.crumbBack, href: site('/platform/upload-a-quote') }} here={QUOTE_WORDS.crumbHere} allowance={readLeftLine(left)} title={QUOTE_WORDS.title} lede={QUOTE_WORDS.lede} />
      <TrialApp label="Upload a quote" testId="trial-quote-app">
        {read ? (
          <section className={x.block} aria-label="The quote you kept" data-testid="trial-quote-read" data-kept="">
            <div className={x.blockHead}>
              <div className={x.blockTitles}>
                <h2 className={`${x.blockTitle} ${x.landing}`} tabIndex={-1} data-testid="trial-quote-read-title">{read.file}</h2>
                <span className={x.kept} data-testid="trial-quote-kept"><Icon name="task_alt" size={18} weight={300} />{read.leadId && nameOf(read.leadId) ? QUOTE_WORDS.kept(nameOf(read.leadId)!) : QUOTE_WORDS.needClient}</span>
              </div>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload_file" size={20} />} onPress={() => setGate(QUOTE_WORDS.gate)} data-testid="trial-quote-another">{QUOTE_WORDS.readAnother}</Button>
            </div>
            <UploadReadingView read={{ ok: true, source: read.source, groups: read.groups, count: read.count, totalMinor: read.totalMinor }} max={500} />
            {work.leads.length > 1 ? (
              <div className={x.field} data-testid="trial-quote-lead">
                <span className={x.fieldLabel}>{QUOTE_WORDS.forLead}</span>
                <Chips label={QUOTE_WORDS.forLead} options={leadOptions} value={read.leadId} onChange={(v: string) => { void moveTo(v) }} />
                <span className={x.fine}>{QUOTE_WORDS.keptHelp}</span>
              </div>
            ) : null}
            {open.xray ? <p className={x.fine}><Link href={TRY_PATH.xray} className={x.textLink} data-testid="trial-quote-to-xray">{QUOTE_WORDS.xray}<Icon name="arrow_forward" size={16} /></Link></p> : null}
          </section>
        ) : preview ? (
          <section className={x.block} aria-label="The quote read" data-testid="trial-quote-read">
            <div className={x.blockHead}>
              <div className={x.blockTitles}>
                <h2 className={`${x.blockTitle} ${x.landing}`} tabIndex={-1} data-testid="trial-quote-read-title">{preview.file}</h2>
                <span className={x.blockHelp} data-testid="trial-quote-preview">{QUOTE_WORDS.preview}</span>
              </div>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload_file" size={20} />} isDisabled={keeping} onPress={() => { setPreview(null); setPickError(null) }} data-testid="trial-quote-another">{QUOTE_WORDS.readAnother}</Button>
            </div>
            <UploadReadingView read={preview.read} max={500} />
            <div className={x.field} data-testid="trial-quote-lead">
              <span className={x.fieldLabel} id="trial-quote-client">{QUOTE_WORDS.forLead}</span>
              {work.leads.length ? <Chips label={QUOTE_WORDS.forLead} options={leadOptions} value={client} onChange={(v: string) => { setClient(v); setPickError(null) }} /> : null}
              <span className={x.fine}>{!work.leads.length ? QUOTE_WORDS.forLeadNone : leadsLeft > 0 ? QUOTE_WORDS.forLeadHelp : QUOTE_WORDS.forLeadFull}</span>
              {pickError ? <FieldError message={pickError} /> : null}
            </div>
            <div className={x.actions}>
              {/* one filled press: Keep once there is a client to keep it on, else Add the client (which keeps it in the same go) */}
              {work.leads.length ? (
                <>
                  <Button iconStart={<Icon name="task_alt" size={20} />} isDisabled={keeping} onPress={keep} data-testid="trial-quote-keep">{keeping ? QUOTE_WORDS.keeping : QUOTE_WORDS.keep}</Button>
                  {leadsLeft > 0 ? <Button variant="secondary" appearance="outlined" iconStart={<Icon name="person_add" size={20} />} isDisabled={keeping} onPress={openClient} data-testid="trial-quote-add-client">{QUOTE_WORDS.addClient}</Button> : null}
                </>
              ) : (
                <Button iconStart={<Icon name="person_add" size={20} />} isDisabled={keeping} onPress={openClient} data-testid="trial-quote-add-client">{keeping ? QUOTE_WORDS.keeping : QUOTE_WORDS.addClient}</Button>
              )}
            </div>
          </section>
        ) : (
          <section className={x.block} aria-label="Upload a quote" data-testid="trial-quote-pick">
            <div className={x.blockTitles}><h2 className={x.blockTitle}>{QUOTE_WORDS.upload}</h2><p className={x.blockHelp}>{QUOTE_WORDS.fine}</p></div>
            {reading ? <p className={x.note} role="status" data-testid="trial-quote-reading"><Icon name="upload_file" size={20} weight={300} />{QUOTE_WORDS.reading(reading)}</p>
              : <Dropzone title={<>Drop the quote here or <b>browse</b></>} helper={UPLOAD_KINDS} accept={ACCEPT} label={QUOTE_WORDS.upload} onPick={(f) => { void take(f) }} />}
            {failed ? (
              <>
                <p className={x.note} role="status" data-tone="error" data-testid="trial-quote-failed"><Icon name="error" size={20} weight={300} /><span>We couldn’t read {failed.name}.</span></p>
                <p className={x.fine} data-testid="trial-quote-failed-why">{unreadHelp(failed, '')}</p>
              </>
            ) : null}
            <div className={x.samples}>
              <span className={x.samplesHead}>{QUOTE_WORDS.sample}</span>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="table_chart" size={20} />} isDisabled={!!reading} onPress={() => { void trySample() }} data-testid="trial-quote-sample">{QUOTE_WORDS.sampleName}</Button>
            </div>
          </section>
        )}
      </TrialApp>
      <KeepBand work={work} />
      <OtherTools current="quote" open={open} />
      {addClient.modal}
      <TrialGate text={gate} onClose={() => setGate(null)} />
    </>
  )
}
