'use client'

import { useMemo, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { MessageField } from '@/components/contracts/editor/dialogs'
import { displayDate, phoneLocal } from '@/lib/format'
import { waLink } from '@/lib/portal/model'
import { filterByQuery } from '@/lib/search'
import type { AskPerson } from '@/lib/qanvast-account/queries'
import styles from './account.module.css'

/** 1.0's message (Reviews & Rankings' RequestReviewDialog `defaultMessage`), the studio's name and Qanvast's link in it. */
export const reviewAskMessage = (studio: string, link: string) =>
  `Hi! Thank you for choosing ${studio} for your home. We’d love to hear about your experience — it really helps other homeowners find the right fit.\n\nCould you spare a minute to leave us a review? 🙏\n\n${link}`

/**
 * (pending modules S41b-5 — 1.0's `deployment/qanvast` Reviews & Rankings › Request Reviews: Select Leads · All Closed Projects, the review
 * link with Copy, then Send via WhatsApp — the message to edit, one WhatsApp per person, "Opened", Done (n/m)) **Request reviews**, in 2.0's
 * shape on the house Dialog (a bottom sheet on a phone): who to ask — the finished projects' clients (ticked, 1.0's "All Closed Projects") or any
 * lead the viewer sees (search by name or phone, 1.0's "Select Leads") — and Qanvast's review link with Copy; then the message (the house
 * message box: Reset message, Write with AI) and one WhatsApp per person, each opened on its own press (a window opened later is a blocked
 * pop-up), marked Opened. Someone with no mobile on record is listed and says so. Nothing is recorded — 1.0 kept nothing either; WhatsApp is
 * where it is sent. *(invented copy: the chips' words, the empty lines, the no-mobile line, the snackbar)*
 * (S42E, E-06) Someone who has already reviewed the studio on Qanvast says so in their row ("Reviewed 2 Oct ’26") and starts unticked — still
 * pickable — so nobody is asked twice by default; when every finished project's client has reviewed, the list says that. *(invented copy)*
 */
export function RequestReviewsDialog({ open, onClose, studio, link, finished, leads }: {
  open: boolean
  onClose: () => void
  studio: string
  /** Qanvast's write-a-review address for the studio */
  link: string
  finished: AskPerson[]
  leads: AskPerson[]
}) {
  const snackbar = useSnackbar()
  const firstMode = finished.length ? 'finished' : 'leads'
  const [mode, setMode] = useState<'finished' | 'leads'>(firstMode)
  /* the finished projects' clients who haven't reviewed yet — ticked when the dialog opens */
  const fresh = useMemo(() => finished.filter((p) => !p.reviewedAt).map((p) => p.id), [finished])
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(fresh))
  const [query, setQuery] = useState('')
  const [step, setStep] = useState<'pick' | 'send'>('pick')
  const draft = reviewAskMessage(studio, link)
  const [message, setMessage] = useState(draft)
  const [opened, setOpened] = useState<Set<string>>(() => new Set())
  /* every opening starts afresh — the finished projects ticked, as 1.0's "All Closed Projects" */
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setMode(firstMode); setTicked(new Set(fresh)); setQuery(''); setStep('pick'); setMessage(draft); setOpened(new Set()) }
  }
  const { copied, copy } = useCopy(link, { resetOn: open, done: 'Review link copied' })
  const list = mode === 'finished' ? finished : leads
  const shown = useMemo(() => (mode === 'leads' ? filterByQuery(leads, query, (p) => ({ fields: [p.name, p.sub], phones: [p.phone] })) : finished), [mode, leads, finished, query])
  /* the people ticked, one per mobile number (a finished project's client may be a lead too) */
  const people = useMemo(() => {
    const all = [...finished, ...leads].filter((p) => ticked.has(p.id))
    const seen = new Set<string>()
    return all.filter((p) => { const k = p.phone ?? p.id; if (seen.has(k)) return false; seen.add(k); return true })
  }, [finished, leads, ticked])
  const reachable = people.filter((p) => p.phone)
  const toggle = (id: string, on: boolean) => setTicked((t) => { const n = new Set(t); if (on) n.add(id); else n.delete(id); return n })
  const send = (p: AskPerson) => {
    if (!p.phone) return
    window.open(waLink(p.phone, message), '_blank', 'noopener')
    setOpened((o) => new Set(o).add(p.id))
  }
  const done = () => {
    const n = opened.size
    onClose()
    if (n) snackbar({ message: `Asked ${n === 1 ? people.find((p) => opened.has(p.id))?.name ?? '1 person' : `${n} people`} for a review on WhatsApp` })
  }
  const pick = step === 'pick'
  return (
    <Dialog open={open} onClose={onClose} title={pick ? 'Ask for reviews' : 'Send on WhatsApp'} width={600} size="modal" closeOnScrim={false}
            footer={pick ? (
              <>
                <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                <Button onPress={() => setStep('send')} isDisabled={!people.length} data-testid="request-next">{people.length ? `Next · ${people.length}` : 'Next'}</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" appearance="outlined" onPress={() => setStep('pick')} data-testid="request-back">Back</Button>
                <Button onPress={done} data-testid="request-done">{opened.size ? `Done · ${opened.size} of ${reachable.length} opened` : 'Done'}</Button>
              </>
            )}>
      {pick ? (
        <div className={styles.dialogStack} data-testid="request-pick">
          <Chips label="Who to ask" testId="request-mode" value={mode} onChange={(v) => setMode(v as 'finished' | 'leads')}
                 options={[{ value: 'finished', label: `Finished projects · ${finished.length}` }, { value: 'leads', label: `Leads · ${leads.length}` }]} />
          {mode === 'leads' ? <TextField label="Search leads by name or phone" value={query} onChange={setQuery} type="search" trailingIcon="search" /> : null}
          <div className={styles.pickList} role="group" aria-label={mode === 'finished' ? 'Finished projects' : 'Leads'} data-testid="request-list">
            {shown.length ? shown.map((p) => (
              <div key={p.id} className={styles.pickRow} data-testid="request-person">
                <Checkbox isSelected={ticked.has(p.id)} onChange={(on: boolean) => toggle(p.id, on)} aria-label={`Ask ${p.name}`} />
                <span className={styles.pickText}>
                  <span className={styles.pickName}>{p.name}</span>
                  <span className={styles.pickSub}>{[p.phone ? phoneLocal(p.phone) : null, p.sub, p.reviewedAt ? `Reviewed ${displayDate(new Date(p.reviewedAt))}` : null, p.phone ? null : 'no mobile number on record'].filter(Boolean).join(' · ')}</span>
                </span>
              </div>
            )) : (
              <p className={styles.pickEmpty}>{mode === 'finished' ? 'No finished projects yet — a project counts once its handover is complete.' : list.length ? 'No lead matches that.' : 'No leads yet.'}</p>
            )}
          </div>
          <div className={styles.linkBox} data-testid="request-link">
            <span className={styles.linkText}><span className={styles.pickName}>Qanvast review link</span><span className={styles.linkUrl} title={link}>{link.replace(/^https?:\/\//, '')}</span></span>
            <Button variant="primary" appearance="outlined" onPress={copy}>{copied ? 'Copied' : 'Copy'}</Button>
          </div>
          {mode === 'finished' && finished.length && !fresh.length ? <p className={styles.foot} data-testid="request-all-reviewed">Every finished project’s client has reviewed you.</p> : null}
          {!people.length ? <p className={styles.foot}>Tick someone to ask — or copy the link and send it your own way.</p> : null}
        </div>
      ) : (
        <div className={styles.dialogStack} data-testid="request-send">
          <div>
            <MessageField value={message} onChange={setMessage} onReset={() => setMessage(draft)} canReset={message !== draft} label="Message" names={people.map((p) => p.name)} />
            {!message.includes(link) ? <p className={styles.foot} role="note" data-testid="request-no-link">The message no longer has the review link — Reset message puts it back.</p> : null}
          </div>
          <div className={styles.pickList} role="group" aria-label="People to ask" data-testid="request-people">
            {people.map((p) => (
              <div key={p.id} className={styles.pickRow} data-testid="request-send-row">
                <span className={styles.pickText}>
                  <span className={styles.pickName}>{p.name}</span>
                  <span className={styles.pickSub}>{p.phone ? phoneLocal(p.phone) : 'No mobile number on record — copy the link and send it your own way'}</span>
                </span>
                {!p.phone ? null : opened.has(p.id) ? (
                  <span className={styles.opened} data-testid="request-opened"><Icon name="check" size={18} />Opened</span>
                ) : (
                  <Button variant="secondary" appearance="outlined" onPress={() => send(p)} data-testid="request-open-wa">Open WhatsApp</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  )
}
