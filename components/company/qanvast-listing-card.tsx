'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { closeListingAsk, playListingAnswer, undoCloseListingAsk, undoWithdrawListing, withdrawListing } from '@/app/company/listing-actions'
import { LISTING_SIMULATED_READ, SIMULATED_WORDS } from '@/lib/services/registry'
import { displayDate } from '@/lib/format'
import { LISTING_WORDS, registrationName, type ListingApp, type ListingOutcome, type ListingState, type ListingView } from '@/lib/qanvast-listing/model'
import { ListingDialog } from './qanvast-listing-dialog'
import card from './profile-view.module.css'
import styles from './qanvast-listing.module.css'

const CHIP_COLOR: Record<ListingState, 'default' | 'green' | 'yellow' | 'blue'> = { not_applied: 'default', waiting: 'blue', needs_changes: 'yellow', listed: 'green' }
const day = (ms: number) => displayDate(new Date(ms))

/**
 * (pending modules S37 — her "build all of them" 2026-10-11; cards onboarding:qanvast-listing-verification · studio:verify-listing) Company ›
 * Profile › **Listed on Qanvast** — the one home of the studio's listing (1.0's /verify, reached only by typing it, saved nothing). One state,
 * said plainly, and the one press that moves it on:
 *   · Not applied — Apply to be listed (the application, built from the studio's records — `ListingDialog`);
 *   · Waiting for Qanvast — who sent it and when; Withdraw the application (Undo sends it again);
 *   · Needs changes — Qanvast's note; Fix and send again · Close the application (Undo);
 *   · Listed — since when; What Qanvast has; Update your listing (changes wait for review while the listing stays, REG-501's rule) — and its
 *     own waiting changes or Qanvast's ask about them, as above.
 * While the stand-in answers (no Qanvast API is plugged in), the card says so in the stand-in's own line and — only while one waits — lets an
 * Owner or an Admin play Qanvast's answer, labelled "(demo)" (the answer is recorded as played, never as Qanvast's). Owners and Admins press;
 * everyone else reads. Every remove answers with Undo.
 */
export function QanvastListingCard({ data, canRun }: { data: ListingView; canRun: boolean }) {
  const snackbar = useSnackbar()
  const { read, standIn } = data
  const [dialog, setDialog] = useState(false)
  const [what, setWhat] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const { state, listed, pending, asked } = read

  /** Run a press: its refusal said in the house line, the page read again on success. */
  const press = async (key: string, what: string, fn: () => Promise<{ ok: true } | { error: string }>, done?: { message: string; undo?: () => Promise<{ ok: true } | { error: string }>; undone?: string }) => {
    if (busy) return
    setBusy(key)
    try {
      const r = await fn()
      if ('error' in r) { snackbar({ message: couldnt(what, refusalOf(r.error)) }); return }
      /* every listing action revalidates this page (touchListing): its answer brings the card's new props — no second render (PERF-04) */
      if (done) snackbar({ key: 'qanvast-listing', message: done.message, ...(done.undo ? { actionLabel: 'Undo', onAction: () => { void done.undo!().then((u) => { if ('error' in u) snackbar({ message: couldnt('put it back', refusalOf(u.error)) }); else if (done.undone) snackbar({ key: 'qanvast-listing', message: done.undone }) }).catch(() => snackbar({ message: couldnt('put it back') })) } } : {}) })
    } catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }) }
    finally { setBusy(null) }
  }
  const withdraw = (app: ListingApp) => press('withdraw', app.kind === 'update' ? 'withdraw your changes' : 'withdraw the application', () => withdrawListing(app.id), {
    message: app.kind === 'update' ? 'Your changes are withdrawn — your listing stays as it is' : 'Your application is withdrawn',
    undo: () => undoWithdrawListing(app.id), undone: app.kind === 'update' ? 'Your changes are waiting for Qanvast again' : 'Your application is waiting for Qanvast again',
  })
  const closeAsk = (app: ListingApp) => press('close', listed ? 'keep your listing as it is' : 'close the application', () => closeListingAsk(app.id), {
    message: listed ? 'Your listing stays as it is' : 'Application closed — apply again whenever you’re ready', undo: () => undoCloseListingAsk(app.id),
  })
  const play = (app: ListingApp, outcome: ListingOutcome) => press(`play-${outcome}`, 'play Qanvast’s answer', () => playListingAnswer({ id: app.id, outcome }), {
    message: outcome === 'verified' ? (app.kind === 'update' ? 'Played: Qanvast approved your changes (demo)' : 'Played: Qanvast listed your studio (demo)') : 'Played: Qanvast asks for changes (demo)',
  })
  const demoNote = (a: ListingApp | null) => (a?.via === 'demo' ? ' — played in the demo' : '')

  return (
    <section id="qanvast" className={card.card} aria-labelledby="profile-qanvast" data-testid="qanvast-listing" data-state={state}>
      <div className={card.cardHead}>
        <div className={styles.titleRow}>
          <h2 id="profile-qanvast" className={card.cardTitle}>{LISTING_WORDS.title}</h2>
          <span className={styles.chips}>
            <MetaChip color={CHIP_COLOR[state]}>{LISTING_WORDS.chip[state]}</MetaChip>
            {listed && pending ? <MetaChip color="blue">Changes waiting</MetaChip> : null}
            {listed && asked ? <MetaChip color="yellow">Changes asked</MetaChip> : null}
          </span>
        </div>
        <p className={card.cardHelp}>{listed ? LISTING_WORDS.helpListed : LISTING_WORDS.helpNot}</p>
        {standIn ? <span className={styles.hint} data-testid="qanvast-simulated">{canRun ? SIMULATED_WORDS.listing : LISTING_SIMULATED_READ}</span> : null}   {/* (S42E, E-21) the plays' half only for those who play */}
      </div>

      {/* where it stands — said from the record */}
      {listed ? (
        <p className={styles.state} data-testid="qanvast-since">
          {listed.kind === 'outside' ? LISTING_WORDS.outside
            : `Listed since ${day(read.since ?? listed.reviewedAt ?? listed.submittedAt)}${listed.kind === 'update' ? ` · last updated ${day(listed.reviewedAt ?? listed.submittedAt)}` : ''}${demoNote(listed)}.`}
        </p>
      ) : null}
      {pending ? (
        <p className={listed ? styles.stateQuiet : styles.state} data-testid="qanvast-pending">
          {listed ? `Your changes of ${day(pending.submittedAt)} wait for Qanvast’s review — your listing stays as it is meanwhile.`
            : `Sent on ${day(pending.submittedAt)}${pending.submittedBy ? ` by ${pending.submittedBy}` : ''}. Qanvast usually answers within 3–5 working days — Owners and Admins hear it in the bell.`}
        </p>
      ) : null}
      {asked ? (
        <div className={styles.ask} data-testid="qanvast-ask">
          <span className={styles.askIcon}><Icon name="info" size={20} weight={300} /></span>
          <span className={styles.askText}>
            <span className={styles.askLead}>{`Qanvast asked for changes${asked.kind === 'update' ? ' to your update' : ''} on ${day(asked.reviewedAt ?? asked.submittedAt)}${demoNote(asked)}:`}</span>
            <span className={styles.askNote}>{asked.note ? `“${asked.note}”` : 'Open your application to see what to change.'}</span>
          </span>
        </div>
      ) : null}

      {/* what Qanvast has — the application it approved, as it was sent (nothing for a listing made before OpenMaison) */}
      {listed && listed.kind !== 'outside' ? (
        <div className={styles.more}>
          <span className={styles.morePress}><Button appearance="text" iconEnd={<Icon name={what ? 'keyboard_arrow_up' : 'expand_more'} size={20} />} onPress={() => setWhat((x) => !x)} aria-expanded={what} data-testid="qanvast-what">{LISTING_WORDS.what}</Button></span>
          {what ? <SentTable app={listed} files={data.files} /> : null}
        </div>
      ) : null}

      {canRun ? (
        <div className={styles.actions} data-testid="qanvast-actions">
          {state === 'not_applied' ? <Button onPress={() => setDialog(true)} data-testid="qanvast-apply">{LISTING_WORDS.apply}</Button> : null}
          {asked ? <Button onPress={() => setDialog(true)} data-testid="qanvast-fix">{LISTING_WORDS.fix}</Button> : null}
          {asked ? <span data-text-press=""><Button appearance="text" variant="secondary" isDisabled={!!busy} onPress={() => { void closeAsk(asked) }} data-testid="qanvast-close-ask">{listed ? LISTING_WORDS.keepListing : LISTING_WORDS.closeAsk}</Button></span> : null}
          {listed && !pending && !asked ? <Button variant="secondary" appearance="outlined" onPress={() => setDialog(true)} data-testid="qanvast-update">{LISTING_WORDS.update}</Button> : null}
          {pending ? <span data-text-press=""><Button appearance="text" variant="secondary" isDisabled={!!busy} onPress={() => { void withdraw(pending) }} data-testid="qanvast-withdraw">{listed ? LISTING_WORDS.withdrawChanges : LISTING_WORDS.withdraw}</Button></span> : null}
        </div>
      ) : null}

      {/* (demo only) Qanvast's answer, played — only while one waits, only while the stand-in answers, only for those who apply */}
      {canRun && standIn && pending ? (
        <div className={styles.demo} data-testid="qanvast-demo">
          <span className={styles.hint}>{LISTING_WORDS.demoLead}</span>
          <span className={styles.demoPresses}>
            <Button appearance="text" iconStart={<Icon name="verified" size={18} />} isDisabled={!!busy} onPress={() => { void play(pending, 'verified') }} data-testid="qanvast-play-listed">{busy === 'play-verified' ? 'Playing…' : listed ? LISTING_WORDS.playApproved : LISTING_WORDS.playListed}</Button>
            <Button appearance="text" iconStart={<Icon name="edit" size={18} />} isDisabled={!!busy} onPress={() => { void play(pending, 'rejected') }} data-testid="qanvast-play-changes">{busy === 'play-rejected' ? 'Playing…' : LISTING_WORDS.playChanges}</Button>
          </span>
        </div>
      ) : null}

      {canRun ? <ListingDialog open={dialog} onClose={() => setDialog(false)} data={data} onSent={(r) => {
        setDialog(false)
        snackbar({ key: 'qanvast-listing', message: r.kind === 'update' ? 'Your changes are sent to Qanvast — your listing stays as it is until it answers' : 'Sent to Qanvast — it usually answers within 3–5 working days',
          actionLabel: 'Undo', onAction: () => { void withdrawListing(r.id).then((u) => { if ('error' in u) snackbar({ message: couldnt('take it back', refusalOf(u.error)) }); else snackbar({ key: 'qanvast-listing', message: r.kind === 'update' ? 'Your changes are taken back' : 'Your application is taken back' }) }).catch(() => snackbar({ message: couldnt('take it back') })) } })
      }} onRecord={(to) => {
        /* a fact that isn't on record yet: the dialog closes (its words stay for the next open), the page lands on the card that keeps it and
           its field takes the focus — the UEN's, by its label */
        setDialog(false)
        window.setTimeout(() => {
          const el = document.getElementById(to.card)
          if (!el) return
          el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
          const label = to.field ? [...el.querySelectorAll('label')].find((l) => (l.textContent ?? '').startsWith(to.field!)) : null
          const field = (label?.htmlFor ? document.getElementById(label.htmlFor) : null) ?? el.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled)')
          field?.focus({ preventScroll: true })
        }, 260)
      }} /> : null}
    </section>
  )
}

/** What an application sent, as Qanvast has it — the house card table, one fact a row. */
export function SentTable({ app, files }: { app: ListingApp; files: { id: string; name: string; href: string }[] }) {
  const s = app.sent
  const linkOf = (id: string) => files.find((f) => f.id === id)?.href ?? `/company/listing-file/${id}`
  const rows: { k: string; label: string; value: React.ReactNode; missing?: boolean }[] = [
    { k: 'name', label: 'Studio', value: [app.studioName, app.uen ? `UEN ${app.uen}` : null].filter(Boolean).join(' · ') },
    { k: 'description', label: 'About your studio', value: app.description ?? '—', missing: !app.description },
    { k: 'different', label: 'What makes you different', value: app.differentiator ?? '—', missing: !app.differentiator },
    { k: 'projects', label: 'Projects delivered', value: `${app.projectsDelivered ?? 0} completed with OpenMaison` },
    { k: 'registrations', label: 'Registrations', value: s.registrations.length ? s.registrations.map(registrationName).join(' · ') : 'None recorded', missing: !s.registrations.length },
    { k: 'photos', label: 'Studio photos', value: s.photos.length ? `${s.photos.length} from About the studio` : 'None', missing: !s.photos.length },
    { k: 'proof', label: 'Proof', value: s.files.length ? <span className={styles.fileLinks}>{s.files.map((f) => <a key={f.id} className={styles.fileLink} href={linkOf(f.id)} target="_blank" rel="noreferrer">{f.name}</a>)}</span> : 'None', missing: !s.files.length },
    { k: 'review', label: 'Review link', value: s.reviewLink ?? 'None', missing: !s.reviewLink },
    { k: 'sent', label: 'Sent', value: `${day(app.submittedAt)}${app.submittedBy ? ` by ${app.submittedBy}` : ''}` },
  ]
  return (
    <div className={styles.factTable} role="table" aria-label="What Qanvast has" data-card-table="" data-testid="qanvast-sent">
      <div className={styles.factHead} role="row"><span role="columnheader">Part</span><span role="columnheader">As sent</span></div>
      {rows.map((r) => (
        <div key={r.k} className={styles.factRow} role="row" data-fact={r.k}>
          <span role="rowheader" className={styles.factLabel}>{r.label}</span>
          <span role="cell" className={styles.factValue} data-missing={r.missing ? '' : undefined}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}
