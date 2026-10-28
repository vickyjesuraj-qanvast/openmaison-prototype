'use client'

import { useSeedFlag } from '@/lib/ghost-shape'   // (pending modules S41b-1) whether this member sees costs — the help says what they can do
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { UPLOAD_ACCEPT, UPLOAD_KINDS, unreadHelp, type UploadRead } from '@/lib/quotes/upload'
import { readQuoteUpload } from '@/lib/quotes/read-upload'   // (S42 B·4 · D-08 · D·2) the one reader
import { money2 } from '@/lib/quotes/math'
import { createVariationFromUpload } from '@/app/projects/money-actions'
import { chargeAI, refundAIWork } from '@/components/credits/credits-client'
import { costOf } from '@/lib/credits/schedule'
import up from '@/components/quotes/create-quote-modal.module.css'
import styles from './money.module.css'

type Read = { name: string; read: UploadRead | null; id: string; refunded: number }
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16).padStart(8, '0')}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`)

/**
 * (gaps build B, item 16 — 1.0's VO digitizer) New ▾ › Variation order from a contractor's quote: the file is read by Upload a quote's own
 * reader (lib/quotes/read-upload.ts — a sheet for real, (S42 D-08) a PDF from its own words, never by its name), its lines shown as the Create Quote window shows
 * them (its stylesheet, composed), then made into a variation order on the project — additions as read; an omission is a line with a minus
 * quantity, as on every order. Closes once the order is made.
 * (pending modules S19 — card held:ai-credits "one price table") Reading a contractor's quote is a quote read, as Upload a quote's is —
 * 1.0's own project upload goes through the same `quote_digitize` (5 AI credits): the price is on the drop zone before the press, it is taken
 * at the read and keyed by the order it becomes (`quote:<id>`), a refusal opens its moment, and a file that can't be read gives it back.
 */
export function VoUploadDialog({ open, projectId, onClose, onMade }: { open: boolean; projectId: string; onClose: () => void; onMade: (id: string) => void }) {
  const costs = useSeedFlag('role.costs', true)
  const snackbar = useSnackbar()
  const [file, setFile] = useState<Read | null>(null)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setFile(null); setBusy(false) } }
  /* the press again once credits are in (the top-up's `then`) — through a ref, so the read never names itself */
  const again = useRef<(f: File) => void>(() => {})
  const pick = async (f?: File) => {
    if (!f) return
    const id = newId(), ref = `quote:${id}`
    const charged = await chargeAI({ action: 'quote_digitize', ref, what: 'quote', needed: costOf('quote_digitize'), retry: () => again.current(f) })
    if (charged === false) return
    setFile({ name: f.name, read: null, id, refunded: 0 })
    const read: UploadRead = await readQuoteUpload(f)   // (S42 D-08 · D·2) a sheet for real, a PDF from its own words — never its name
    const refunded = !read.ok && charged > 0 ? await refundAIWork(ref) : 0
    setFile((x) => (x && x.id === id ? { ...x, read, refunded } : x))
  }
  useEffect(() => { again.current = (f) => { void pick(f) } })
  const ok = file?.read?.ok ? file.read : null
  const make = async () => {
    if (!ok || busy) return
    setBusy(true)
    try {
      const r = await createVariationFromUpload(projectId, { id: file?.id, source: ok.source, groups: ok.groups.map((g) => ({ name: g.name, lines: g.lines.map((l) => ({ name: l.name, description: l.description ?? null, qty: l.qty ?? 1, unit: l.unit ?? null, costMinor: l.costMinor ?? 0, markupMinor: l.markupMinor ?? 0, category: l.category ?? null, room: l.room ?? null })) })) })
      if ('error' in r) { snackbar({ message: couldnt('make the variation order', refusalOf(r.error)) }); return }
      snackbar({ message: `${r.number} made with ${r.count} ${r.count === 1 ? 'line' : 'lines'} from ${ok.source} — ${money2(r.amountMinor)}` })
      onMade(r.id)
    } catch { snackbar({ message: couldnt('make the variation order') }) } finally { setBusy(false) }
  }
  const rows = ok ? ok.groups.flatMap((g) => g.lines.map((l, i) => ({ g: i === 0 ? g.name : '', l }))).slice(0, 12) : []
  return (
    <Dialog open={open} onClose={onClose} title="Variation order from a contractor’s quote" size="form" width={800} closeOnScrim={false}
            subtitle="Upload the contractor’s quote — a spreadsheet of its lines (XLSX · CSV) or a PDF of it. Its lines become a variation order on this project; you check them in the editor before it goes to the client."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void make() }} isDisabled={!ok || busy} data-testid="vo-upload-make">{busy ? 'Making…' : 'Make the variation order'}</Button></>}>
      <div className={styles.fields} data-testid="vo-upload-dialog">
        {!file ? <Dropzone title={<>Drop the contractor’s quote here or <b>browse</b></>} helper={`${UPLOAD_KINDS} · ${costOf('quote_digitize')} AI credits`} accept={UPLOAD_ACCEPT} label="Upload the contractor’s quote" onPick={(f) => { void pick(f) }} /> : null}
        {file && !file.read ? <p className={up.uploadNote} role="status"><Icon name="upload_file" size={20} weight={300} />Reading {file.name}…</p> : null}
        {ok ? (
          <section className={up.block} aria-label="The lines read" data-testid="vo-upload-read">
            <p className={up.uploadNote} role="status"><Icon name="task_alt" size={20} weight={300} /><span><b>{ok.count} {ok.count === 1 ? 'item' : 'items'}</b> read from {ok.source} · {money2(ok.totalMinor)}</span></p>   {/* (the calm UI build 2026-10-27, T-01) a quote's lines are items, as Upload a quote's */}
            <div className={up.uploadTable} role="table" aria-label="The lines read">
              <div className={up.uploadRow} role="row" data-head=""><span role="columnheader">Section</span><span role="columnheader">Item</span><span role="columnheader">Qty</span><span role="columnheader">Unit</span><span role="columnheader">Amount</span></div>
              {rows.map(({ g, l }, k) => (
                <div key={k} className={up.uploadRow} role="row"><span role="cell">{g ?? '—'}</span><span role="cell">{l.name}</span><span role="cell">{l.qty ?? 1}</span><span role="cell">{l.unit ?? '—'}</span><span role="cell">{money2(Math.round((l.qty ?? 1) * ((l.costMinor ?? 0) + (l.markupMinor ?? 0))))}</span></div>
              ))}
            </div>
            {ok.count > 12 ? <span className={up.uploadMore}>+ {ok.count - 12} more {ok.count - 12 === 1 ? 'item' : 'items'}</span> : null}
            <p className={up.uploadHelp}>{costs ? 'Each amount comes in as the line’s cost with no markup — set your markup in the editor.' : 'Each amount comes in as the line’s price.'} An omission stays a line with a minus quantity.</p>
            <span><Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload_file" size={20} />} onPress={() => setFile(null)} isDisabled={busy}>Choose another file</Button></span>
          </section>
        ) : null}
        {file?.read && !file.read.ok ? (
          <section className={up.block}>
            <p className={up.uploadNote} role="status" data-tone="error"><Icon name="error" size={20} weight={300} /><span>We couldn’t read {file.name}.{file.refunded > 0 ? ` Your ${file.refunded} AI credits are back.` : ''}</span></p>
            <p className={up.uploadHelp}>{unreadHelp(file.read, 'or start a blank variation order')}</p>
            <span><Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload_file" size={20} />} onPress={() => setFile(null)}>Choose another file</Button></span>
          </section>
        ) : null}
      </div>
    </Dialog>
  )
}
