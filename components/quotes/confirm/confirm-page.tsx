'use client'

import { useEffect, useMemo, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button, Checkbox, TextArea } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/om/dialog'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { QuoteStage } from './quote-stage'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { displayDateLong } from '@/lib/format'
import { docTotals } from '@/lib/templates/data'
import { money2 } from '@/lib/quotes/math'
import type { ClientQuote } from '@/lib/quotes/client-quote'
import { askQuoteChange, confirmQuoteOnline } from '@/app/quotes/actions'
import { stampQuoteSeen } from '@/app/quotes/seen-actions'
import { declineVariationOnline } from '@/app/quotes/decline-actions'
import { DECLINE_NOTE_MAX } from '@/lib/projects/decline'
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
export function ConfirmPage({ token, data, extras }: { /** (pending modules S04) the link's own token — every answer goes through it */ token: string
  /** (S04) the quote as the print reads it — no cost, mark-up, rebate, vendor or record ids */ data: ClientQuote
  /** (REG-626) whether the link is open yet, the optional works to pick, the files shared */ extras: ConfirmExtras }) {
  const { quote, design, brand } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const totals = useMemo(() => docTotals(data.data), [data.data])
  const studioName = data.data.studio.name
  const clientName = data.data.client.name
  const signed = quote.status === 'Signed'
  /* (Projects round 5, F-07) a variation order: approved on this page, it moves the contract — the card says so in its own words */
  const vo = extras.variation ?? null
  const noun = vo ? 'variation order' : 'quote'
  const [confirmed, setConfirmed] = useState<{ by: string; at: Date } | null>(quote.confirmedAt ? { by: quote.confirmedBy ?? clientName, at: new Date(quote.confirmedAt) } : null)
  const [name, setName] = useState(clientName)
  const [busy, setBusy] = useState(false)
  /* (REG-626, parity Q-32) The optional works the client may add — shown only while the quote's client view prints them.
     (S44Q — row 357) Settings decides whether the client ticks them here (`extras.picks`, on as always) or reads them and asks to add one. */
  const optional = data.view.optionalWorks ? extras.optional : []
  const picking = extras.picks
  const [picks, setPicks] = useState<Set<string>>(() => new Set(extras.optional.filter((o) => o.choice === 'want').map((o) => o.id)))
  const pickedMinor = picking ? optional.filter((o) => picks.has(o.id)).reduce((s, o) => s + o.minor, 0) : 0
  const toggle = (id: string, on: boolean) => setPicks((p) => { const n = new Set(p); if (on) n.add(id); else n.delete(id); return n })
  const wanted = extras.optional.filter((o) => o.choice === 'want')

  /* (pending modules S04 — card: "'Viewed' on the quote link … the follow-up cue") The page's first ask from a browser that ran it says the client
     opened the quote — a chat app drawing the link's card runs no script, so it never counts. Only while the quote shows (never "Not ready yet"). */
  const shows = extras.open || !!quote.confirmedAt || quote.status === 'Signed'
  useEffect(() => { if (shows) void stampQuoteSeen({ token, via: 'confirm' }).catch(() => {}) }, [token, shows])
  /* (UX audit Q6) On a phone the lines read as cards; "View as printed" shows the A4 (the stage, shared with the view-only link — S02). */
  const phone = useMediaQuery(MOBILE)
  const [printed, setPrinted] = useState(false)
  const [pages, setPages] = useState(0)
  /* (UX audit Q6) Ask for a change: the client's words to the designer on WhatsApp (opened on the press — a popup blocker eats one opened
     after the round trip, REG-534) and to the studio's bell (`askQuoteChange`). */
  const [askOpen, setAskOpen] = useState(false)
  const [askNote, setAskNote] = useState('')
  const [asked, setAsked] = useState(false)
  const ask = () => {
    const who = name.trim() || clientName
    const note = askNote.trim()
    const digits = extras.designer.phone.replace(/\D/g, '')
    const to = digits.length === 8 ? `65${digits}` : digits
    const text = `Hi ${extras.designer.name.split(' ')[0]}, it’s ${who} about ${noun} ${quote.number}. ${note || `I’d like to ask for a change before I ${vo ? 'approve' : 'confirm'}.`}`   // (REG-1055) a variation order is named as one
    setAskOpen(false)
    if (to) window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    void askQuoteChange(token, { name: who, note }).then((r) => {
      if ('error' in r) { snackbar({ message: `Couldn’t send your request — ${r.error.replace(/^./, (c) => c.toLowerCase())}` }); return }
      setAsked(true); snackbar({ message: `${studioName} has your request — finish your message in WhatsApp` })
    }, () => snackbar({ message: 'Couldn’t send your request — please try again' }))
  }

  /* (gaps build D, item 2 — M-07; 1.0's Reject, I-293) A variation order can be declined on the record, with a reason: the order goes back
     to the studio (Money says so, the team is told) and this card says it was declined. The dialog closes only once the answer lands. */
  const [declined, setDeclined] = useState<{ at: number; note: string | null; by: string | null } | null>(vo?.declined ?? null)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineNote, setDeclineNote] = useState('')
  const [declineTried, setDeclineTried] = useState(false)
  const [declining, setDeclining] = useState(false)
  const decline = async () => {
    const note = declineNote.trim()
    if (!note) { setDeclineTried(true); return }
    if (declining) return
    setDeclining(true)
    try {
      const r = await declineVariationOnline(token, { name: name.trim() || clientName, note })
      if ('error' in r) { snackbar({ message: `Couldn’t send your answer — ${r.error.replace(/^./, (c) => c.toLowerCase())}` }); return }
      setDeclined({ at: r.declinedAt, note, by: r.by }); setDeclineOpen(false)
      snackbar({ message: `${studioName} has your answer — ${extras.designer.name.split(' ')[0]} will be in touch` })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t send your answer — please try again' }) } finally { setDeclining(false) }
  }

  const confirm = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const r = await confirmQuoteOnline(token, name.trim(), picking ? [...picks] : [])
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
        <MetaChip color="green" icon="lock">Private link</MetaChip>   {/* (REG-729) the house tag (r4) — it was a pill */}
      </header>
      <div className={shell.body}>
        {/* (sweep S1) a link opened before the studio sent the quote shows nothing of it — no draft, no prices — only the card's "Not ready yet" */}
        <QuoteStage design={design} brand={brand} data={data.data} view={data.view} totalMinor={totals.totalMinor} show={shows || !!confirmed}
                    printed={printed} onPrinted={setPrinted} onPages={setPages} />
        <aside className={shell.card} aria-label={vo ? 'Approve this variation order' : 'Confirm this quote'} data-state={signed ? 'signed' : confirmed ? 'confirmed' : 'open'}>
          {signed ? (
            <>
              <span className={shell.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={shell.cardTitle}>Signed</h2>
              <p className={shell.cardText}>This quote is signed. {studioName} keeps a copy of the agreement with you.</p>
            </>
          ) : confirmed ? (
            <>
              <span className={shell.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={shell.cardTitle}>{vo ? 'Approved' : 'Confirmed'}</h2>
              {vo ? <p className={shell.cardText} data-testid="vo-approved">Approved by <strong>{confirmed.by}</strong> on {displayDateLong(confirmed.at)}. Your contract with {studioName} is now {money2(vo.after)}.</p>
                : <p className={shell.cardText}>Confirmed by <strong>{confirmed.by}</strong> on {displayDateLong(confirmed.at)}. {studioName} will send the agreement for your signature next.</p>}
              {wanted.length ? <p className={shell.cardText} data-testid="confirm-wanted">You asked for {wanted.map((o) => o.name).join(', ')} as well — {studioName} will add {wanted.length === 1 ? 'it' : 'them'} to the quote.</p> : null}
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => { if (phone && !printed) { setPrinted(true); window.setTimeout(() => printPaper(), 600) } else printPaper() }}>Download a copy</Button>   {/* (UX audit Q6) a phone reading the cards prints the A4 */}
            </>
          ) : vo && declined ? (
            /* (gaps build D, item 2) declined on this page: the answer stays; the studio revises it or sends it again */
            <>
              <span className={styles.declinedMark}><Icon name="cancel" size={40} /></span>
              <h2 className={shell.cardTitle} data-testid="vo-declined-title">Declined</h2>
              <p className={shell.cardText} data-testid="vo-declined">{`${declined.by ?? clientName} declined this variation order on ${displayDateLong(new Date(declined.at))}. Your contract with ${studioName} stays at ${money2(vo.before)}.`}</p>
              {declined.note ? <p className={styles.declinedNote}>{`“${declined.note}”`}</p> : null}
              <p className={shell.fine}>{`${extras.designer.name} will be in touch — a changed order comes to you as a new link.`}</p>
            </>
          ) : !extras.open ? (
            /* (REG-626, parity §8.2 · E-110) A link opened before the studio sent the quote: nothing to confirm yet. */
            <>
              <span className={shell.eyebrow}>{quote.number}</span>
              <h2 className={shell.cardTitle} data-testid="confirm-not-ready">Not ready yet</h2>
              {/* (S42 B-24) a client who had version 1 reads that it is being updated, in the view-only link's words — never "still preparing" */}
              <p className={shell.cardText} data-testid="confirm-not-ready-why">{quote.version > 1 ? `${studioName} is updating this ${noun}. It’ll be back here once it’s ready.` : `${studioName} is still preparing this ${noun}. They will send it to you when it is ready to ${vo ? 'approve' : 'confirm'}.`}</p>
            </>
          ) : (
            <>
              <span className={shell.eyebrow}>{quote.number}{pages > 1 ? ` · ${pages} pages` : ''}</span>
              <h2 className={shell.cardTitle}>{vo ? 'Approve this variation order' : 'Confirm this quote'}</h2>
              {vo ? <p className={shell.cardText} data-testid="vo-confirm">Hi {clientName.split(' ')[0]}, please read the changes. When you’re happy with them, type your name and approve — your contract with {studioName} goes from {money2(vo.before)} to {money2(vo.after)}.</p>
                : <p className={shell.cardText}>Hi {clientName.split(' ')[0]}, please read the quote. When you’re happy to go ahead, type your name and confirm — the agreement and the signature come after.</p>}
              <div className={styles.total}><span>{vo ? 'Change to the contract' : 'Total'}</span><strong>{vo && totals.totalMinor > 0 ? '+' : ''}{money2(totals.totalMinor)}</strong></div>
              {optional.length && !picking ? (
                /* (S44Q — row 357, her UAT ask 2026-10-15) the studio keeps the picking: the works and their prices, read-only, and a press that asks the
                   designer to add one (the Ask for a change dialog, the work named). *(invented copy)* */
                <div className={styles.optional} data-testid="confirm-optional" data-readonly="">
                  <span className={shell.eyebrow}>Optional works</span>
                  <p className={shell.fine}>Not in the total. To add one, ask {extras.designer.name.split(' ')[0]} — they’ll update the quote.</p>
                  <ul className={styles.optionalList}>
                    {optional.map((o) => (
                      <li key={o.id} className={styles.optionalAsk} data-testid="confirm-optional-row">
                        <span className={styles.optionalName}>{o.name}</span>
                        <span className={styles.optionalPrice}>{money2(o.minor)}</span>
                        <span className={styles.optionalAskPress}>
                          <Button appearance="text" onPress={() => { setAskNote(`Please add “${o.name}” to my quote.`); setAskOpen(true) }} data-testid="confirm-optional-ask">{`Ask ${extras.designer.name.split(' ')[0]} to add it`}</Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {optional.length && picking ? (
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
              <p className={shell.fine}>{vo ? `Approving tells ${studioName} you accept these changes to your contract. It is not a signature.` : `Confirming tells ${studioName} you accept this quote as shown. It is not a signature.`}</p>
              <Button isDisabled={!name.trim() || busy} onPress={() => { void confirm() }}>{busy ? (vo ? 'Approving…' : 'Confirming…') : vo ? 'Approve the changes' : 'Confirm quote'}</Button>
              {/* (UX audit Q6) Not ready to confirm? Ask for a change — the designer on WhatsApp, the studio told. */}
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="chat" size={20} />} onPress={() => { setAskNote(''); setAskOpen(true) }} data-testid="ask-change">Ask for a change</Button>
              {asked ? <p className={shell.fine} data-testid="ask-sent">You asked for a change — {extras.designer.name} will get back to you.</p> : null}
              {/* (gaps build D, item 2) a no on the record — the order goes back to the studio with the reason */}
              {vo ? <Button appearance="text" onPress={() => { setDeclineNote(''); setDeclineTried(false); setDeclineOpen(true) }} data-testid="vo-decline">Decline the changes</Button> : null}
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
      <Dialog open={askOpen} onClose={() => setAskOpen(false)} title="Ask for a change" size="form" width={400} closeOnScrim={false}
              subtitle={`Tell ${extras.designer.name} what you’d like changed on ${quote.number}. WhatsApp opens with your message.`}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setAskOpen(false)}>Cancel</Button><Button iconStart={<Icon name="chat" size={20} />} onPress={ask} data-testid="ask-send">Send on WhatsApp</Button></>}>
        <TextArea label="What would you like changed? (optional)" value={askNote} onChange={(v: string) => setAskNote(v)} maxLength={500} />
      </Dialog>
      <Dialog open={declineOpen} onClose={() => { if (!declining) setDeclineOpen(false) }} title="Decline this variation order" size="form" width={400} closeOnScrim={false}
              subtitle={`Tell ${studioName} why. Your contract stays at ${vo ? money2(vo.before) : 'what it is'} — nothing changes until a new order comes to you.`}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setDeclineOpen(false)} isDisabled={declining}>Cancel</Button><DangerButton onClick={() => { void decline() }} disabled={declining}>{declining ? 'Declining…' : 'Decline'}</DangerButton></>}>
        <TextArea label="Why are you declining?" value={declineNote} onChange={(v: string) => setDeclineNote(v)} maxLength={DECLINE_NOTE_MAX} autoFocus
                  isInvalid={declineTried && !declineNote.trim()} errorMessage={declineTried && !declineNote.trim() ? 'Say why, so your designer knows what to change' : undefined} data-testid="vo-decline-note" />
      </Dialog>
    </div>
  )
}
