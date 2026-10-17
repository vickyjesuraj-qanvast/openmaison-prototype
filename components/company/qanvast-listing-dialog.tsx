'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone, FileTile } from '@/components/leads/move-stage/fields'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { addListingProof, removeListingProof, restoreListingProof, sendListingApplication } from '@/app/company/listing-actions'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { FILE_UPLOAD_MAX, tooBigLine } from '@/lib/leads/file-model'
import { MSG } from '@/lib/forms'
import {
  DESCRIPTION_MAX, DIFFERENTIATOR_MAX, PROOF_ACCEPT, PROOF_HELPER, PROOF_KINDS, PROOF_MAX_PER_KIND, PROOF_TYPES, draftIsStory, draftOf, registrationName,
  type ListingView, type ProofKind,
} from '@/lib/qanvast-listing/model'
import styles from './qanvast-listing.module.css'

/** Where a fact that isn't on record yet is kept on this page: the card's id, and its field's label. */
export type RecordDoor = { card: string; field?: string }
const sizeOf = (url: string) => { const b64 = url.slice(url.indexOf(',') + 1); return Math.floor((b64.length * 3) / 4) }

/**
 * (pending modules S37 — her "build all of them" 2026-10-11; cards onboarding:qanvast-listing-verification · studio:verify-listing) The
 * application to be listed on Qanvast — 1.0's /verify form in 2.0's shape: **what the studio's records already say is shown, never typed**
 * (its name and UEN, the registrations it recorded, its completed projects counted, its About photos, year and awards, its review link and
 * website — each said with the card that keeps it, and a door to that card where one is missing), and **the studio types only what isn't on
 * record**: the description (1.0's required Studio Description; its first draft is the About story), what makes it different (1.0's USP), and
 * its proof (1.0's two uploads — real files, kept with the studio the moment they are added, taken off with Undo). The same dialog updates a
 * listing and fixes an application Qanvast asked changes on (its note on top). UEN and description are required (1.0's two required fields
 * beside the name, which the studio always has); errors show after the first Send and clear live. The words stay while the page is open —
 * a door to a missing fact keeps them; Cancel with changes asks first.
 */
export function ListingDialog({ open, onClose, data, onSent, onRecord }: {
  open: boolean; onClose: () => void; data: ListingView
  onSent: (r: { id: string; kind: 'apply' | 'update' }) => void
  onRecord: (to: RecordDoor) => void
}) {
  const snackbar = useSnackbar()
  const { read, facts, files } = data
  const [draft, setDraft] = useState(() => draftOf(read, facts))
  const [touched, setTouched] = useState(false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [uploading, setUploading] = useState<ProofKind | null>(null)
  /* each open starts from the record unless the words were touched (a door to a missing fact keeps them) */
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open && !touched) { setDraft(draftOf(read, facts)); setTried(false) } }
  const set = (patch: Partial<typeof draft>) => { setDraft((d) => ({ ...d, ...patch })); setTouched(true) }
  const base = draftOf(read, facts)
  const dirty = touched && (draft.description !== base.description || draft.differentiator !== base.differentiator)

  const update = !!read.listed
  const title = read.asked ? (update ? 'Fix your listing update' : 'Fix your application') : update ? 'Update your listing on Qanvast' : 'Apply to be listed on Qanvast'
  const sendLabel = read.asked ? 'Send again' : update ? 'Send changes to Qanvast' : 'Send to Qanvast'
  const errors = {
    uen: facts.uen ? undefined : 'Qanvast checks your UEN — add it in Company details first',
    description: draft.description.trim() ? undefined : MSG.required,
  }
  const reset = () => { setDraft(draftOf(read, facts)); setTouched(false); setTried(false) }
  const close = () => { if (busy) return; if (dirty) setAsking(true); else { reset(); onClose() } }
  const door = (to: RecordDoor) => { if (!busy) onRecord(to) }

  const send = async () => {
    setTried(true)
    if (errors.uen || errors.description) {
      /* the first thing to fix comes into view (the records' UEN, else the description) */
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="qanvast-dialog"] [data-error]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
      return
    }
    setBusy(true)
    try {
      const r = await sendListingApplication({ description: draft.description, differentiator: draft.differentiator })
      if ('error' in r) { snackbar({ message: couldnt(update ? 'send your changes' : 'send the application', refusalOf(r.error)) }); return }
      setTouched(false); setTried(false)
      onSent(r)
    } catch (e) { snackbar({ message: couldnt(update ? 'send your changes' : 'send the application', refusalOf(e)) }) }
    finally { setBusy(false) }
  }

  const addFiles = async (kind: ProofKind, list: File[]) => {
    const room = PROOF_MAX_PER_KIND - files.filter((f) => f.kind === kind).length
    if (!list.length) return
    if (room <= 0) { snackbar({ message: `Up to ${PROOF_MAX_PER_KIND} files here — take one off first` }); return }
    setUploading(kind)
    try {
      for (const f of list.slice(0, room)) {
        if (!PROOF_TYPES.test(f.type)) { snackbar({ message: `${f.name} isn’t a PDF, JPG or PNG` }); continue }
        if (f.type === 'application/pdf' && f.size > FILE_UPLOAD_MAX) { snackbar({ message: tooBigLine(f.name) }); continue }
        const url = await readFileAsDataUrl(f, 2000).catch(() => null)   // a picture is shrunk to 2000 px on its long side; a PDF goes as it is
        if (!url) { snackbar({ message: couldnt(`add ${f.name}`, 'That file didn’t read — pick a PDF, JPG or PNG') }); continue }
        if (sizeOf(url) > FILE_UPLOAD_MAX) { snackbar({ message: tooBigLine(f.name) }); continue }
        const r = await addListingProof({ kind, name: f.name, dataUrl: url }).catch(() => ({ error: '' }))
        if ('error' in r) { snackbar({ message: couldnt(`add ${f.name}`, refusalOf(r.error)) }); break }
      }
      if (list.length > room) snackbar({ message: `Up to ${PROOF_MAX_PER_KIND} files here — ${room} added` })
    } finally { setUploading(null) }
  }
  const removeFile = async (id: string) => {
    const r = await removeListingProof(id).catch(() => ({ error: '' }))
    if ('error' in r) { snackbar({ message: couldnt('take the file off', refusalOf(r.error)) }); return }
    snackbar({ key: 'qanvast-proof', message: `${r.name} taken off`, actionLabel: 'Undo', onAction: () => { void restoreListingProof(id).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the file back', refusalOf(u.error)) }) }).catch(() => snackbar({ message: couldnt('put the file back') })) } })
  }

  /* one row per place the studio keeps it — a missing fact says so and opens its card; the UEN, which Qanvast checks, is required */
  const lines = (...xs: (string | null | false | undefined)[]) => xs.filter(Boolean).join('\n')
  const facts_: { k: string; label: string; from: string; value: ReactNode; missing?: boolean; error?: string; press?: { label: string; to: RecordDoor } }[] = [
    { k: 'studio', label: 'Studio', from: 'Company details', value: lines(facts.studioName || '—', facts.uen ? `UEN ${facts.uen}` : null, facts.website),
      error: tried && errors.uen ? lines(facts.studioName || '—', errors.uen) : undefined,
      press: facts.uen ? undefined : { label: 'Add your UEN', to: { card: 'details', field: 'UEN' } } },
    { k: 'registrations', label: 'Registrations', from: 'Registrations & accreditations', value: facts.registrations.length ? facts.registrations.map(registrationName).join(' · ') : 'None recorded yet', missing: !facts.registrations.length, press: facts.registrations.length ? undefined : { label: 'Record them', to: { card: 'registrations' } } },
    { k: 'projects', label: 'Projects delivered', from: 'Counted from your completed projects', value: `${facts.projectsDelivered} completed with OpenMaison` },
    { k: 'about', label: 'Photos and story', from: 'About the studio, for clients', missing: !facts.photos.length && !facts.founded && !facts.awards.length,
      value: facts.photos.length || facts.founded || facts.awards.length ? (
        <>
          {facts.photos.length ? (
            <span className={styles.thumbs}>
              {facts.photos.slice(0, 6).map((p) => (
                <span key={p.id} className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" loading="lazy" />
                </span>
              ))}
            </span>
          ) : null}
          {facts.founded || facts.awards.length ? <span>{lines(facts.founded ? `Est. ${facts.founded}` : null, ...facts.awards)}</span> : null}
        </>
      ) : 'No photos yet',
      press: facts.photos.length ? undefined : { label: 'Add photos', to: { card: 'about' } } },
    { k: 'review', label: 'Review link', from: 'Company details › Reviews', value: facts.reviewLink ?? 'None yet', missing: !facts.reviewLink, press: facts.reviewLink ? undefined : { label: 'Add your review link', to: { card: 'reviews', field: 'Review link' } } },
  ]

  return (
    <>
      <Dialog open={open} onClose={close} title={title} size="form" width={800} closeOnScrim={false} portal
              subtitle="Qanvast reads your studio’s records as they are, with your own words and proof below — it usually answers within 3–5 working days."
              footer={<><Button variant="secondary" appearance="outlined" onPress={close} isDisabled={busy}>Cancel</Button><Button onPress={() => { void send() }} isDisabled={busy || !!uploading} data-testid="qanvast-send">{busy ? 'Sending…' : sendLabel}</Button></>}>
        <div className={styles.dialogBody} data-testid="qanvast-dialog">
          {read.asked ? (
            <div className={styles.ask} data-testid="qanvast-dialog-ask">
              <span className={styles.askText}>
                <span className={styles.askLead}>Qanvast asked:</span>
                <span className={styles.askNote}>{read.asked.note ? `“${read.asked.note}”` : 'See what to change and send it again.'}</span>
              </span>
            </div>
          ) : null}

          <section className={styles.part} aria-labelledby="qanvast-records">
            <div className={styles.partHead}>
              <h3 id="qanvast-records" className={styles.partTitle}>From your records</h3>
              <p className={styles.partHelp}>Sent as your studio keeps them today. To change one, change it where it is kept on this page — what you write below stays.</p>
            </div>
            <div className={styles.factTable} role="table" aria-label="From your records" data-card-table="" data-testid="qanvast-facts">
              <div className={styles.factHead} role="row"><span role="columnheader">Record</span><span role="columnheader">What Qanvast reads</span></div>
              {facts_.map((r) => (
                <div key={r.k} className={styles.factRow} role="row" data-fact={r.k}>
                  <span role="rowheader" className={styles.factLabel}>{r.label}<span className={styles.factFrom}>{r.from}</span></span>
                  <span role="cell" className={styles.factValue} data-missing={r.missing && !r.error ? '' : undefined} data-error={r.error ? '' : undefined}>
                    {r.error ?? r.value}
                    {r.press ? <span className={styles.factPress}><Button appearance="text" onPress={() => door(r.press!.to)} data-testid={`qanvast-door-${r.k}`}>{r.press.label}</Button></span> : null}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.part} aria-labelledby="qanvast-words">
            <div className={styles.partHead}>
              <h3 id="qanvast-words" className={styles.partTitle}>In your words</h3>
              <p className={styles.partHelp}>What homeowners read about you on Qanvast.</p>
            </div>
            <TextField label="About your studio" value={draft.description} onChange={(v) => set({ description: v.slice(0, DESCRIPTION_MAX) })} multiline={5} maxLength={DESCRIPTION_MAX} required
                       error={tried ? errors.description : undefined} helper={base.description && draftIsStory(read) && draft.description === base.description ? 'Started from your About story — make it yours for Qanvast' : 'How you work, what you specialise in, your experience'} />
            <TextField label="What makes your studio different" value={draft.differentiator} onChange={(v) => set({ differentiator: v.slice(0, DIFFERENTIATOR_MAX) })} multiline={3} maxLength={DIFFERENTIATOR_MAX}
                       helper="Optional — e.g. HDB resale specialists, award-winning designs, a one-year warranty" />
          </section>

          <section className={styles.part} aria-labelledby="qanvast-proof">
            <div className={styles.partHead}>
              <h3 id="qanvast-proof" className={styles.partTitle}>Proof</h3>
              <p className={styles.partHelp}>{facts.reviewLink ? 'Optional — your review link goes with it.' : 'Optional, but it helps Qanvast check your studio sooner.'}</p>
            </div>
            {PROOF_KINDS.map((k) => {
              const mine = files.filter((f) => f.kind === k.key)
              return (
                <div key={k.key} className={styles.proof} data-testid={`qanvast-proof-${k.key}`}>
                  <span className={styles.proofLabel}>{k.label}</span>
                  <span className={styles.partHelp}>{k.help}</span>
                  {mine.length ? (
                    <div className={styles.tiles}>
                      {mine.map((f) => <FileTile key={f.id} name={f.name} kind={f.mime === 'application/pdf' ? 'pdf' : 'image'} thumb={f.mime === 'application/pdf' ? null : f.href} onDelete={() => { void removeFile(f.id) }} />)}
                    </div>
                  ) : null}
                  {mine.length < PROOF_MAX_PER_KIND ? (
                    <Dropzone variant="compact" title={uploading === k.key ? 'Uploading…' : <>Drop files here or <b>browse</b></>} helper={PROOF_HELPER} accept={PROOF_ACCEPT}
                              uploading={uploading === k.key} label={`Add ${k.label.toLowerCase()}`} onPick={() => {}} onPickMany={(list) => { void addFiles(k.key, list) }} />
                  ) : <span className={styles.partHelp}>{`Up to ${PROOF_MAX_PER_KIND} files here — take one off to add another.`}</span>}
                </div>
              )
            })}
          </section>
        </div>
      </Dialog>
      <ConfirmDialog open={asking} nested title="Discard what you wrote?" message="Your words for Qanvast aren’t sent. Files you added stay with your studio." confirmLabel="Discard" cancelLabel="Keep editing"
                     onConfirm={() => { setAsking(false); reset(); onClose() }} onCancel={() => setAsking(false)} />
    </>
  )
}
