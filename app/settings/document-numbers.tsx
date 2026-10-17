'use client'

import { DOCUMENT_NUMBERS_HELP } from '@/lib/settings/copy'   // (pending modules S17) the words the ghost reads too
import { Fragment, useEffect, useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { LeaveGuard } from '@/components/company/leave-guard'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { DOCS, DOCUMENT_NUMBERS_RULE, TICKET_DOC, cleanPrefix, nextDocNumber, prefixClash, type DocKind, type DocumentNumbering, type DocumentNumbersData, type TicketNumbersData } from '@/lib/settings/document-numbers'
import type { ProjectNumbering } from '@/lib/projects/model'
import { nextTicketNumber } from '@/lib/projects/tickets-model'   // (parity map, UC-058)
import { readTicketNumbering, setDocumentNumbers } from './document-numbers-actions'
import s from './settings.module.css'
import d from './document-numbers.module.css'

/**
 * (simplify S-15 — P3 §6.7 · F1 §6.8, her "build everything" 2026-10-09) Settings › Finance › **Document numbers**: a row per document —
 * Invoices · Receipts · Credit notes · Purchase orders — each with the numbering card's fields (prefix, next number, digits), the year switch
 * and the live "Next:" example, and ONE Discard · Save (the leave guard asks before the page is left with edits). It replaces the four
 * numbering blocks the Invoices, Client payments, Credit notes and Costs cards each carried with their own Save; from a second issuing entity
 * on, each entity's own invoice prefix rides under Invoices (it was a card of its own, gaps build B item 12). Owners and Admins change it;
 * the module's read-only scope shows everyone else the patterns.
 * (parity map 2026-10-10 — UC-058 · FR-084) A fifth row, **Tickets** — the same fields, the same Save; T-{YYYY}-{nnn} by default (today's
 * numbers), its year restarting the count each year. The page may bring its numbers (`data.ticket`); else the card reads them itself.
 */
export function DocumentNumbersSetting({ data, canManage }: { data: DocumentNumbersData; canManage: boolean }) {
  const snackbar = useSnackbar()
  const showEntities = data.entities.length > 1
  const ownOf = (list: DocumentNumbersData['entities']) => Object.fromEntries(list.map((e) => [e.id, e.prefix]))
  const [draft, setDraft] = useState<DocumentNumbering>(data.numbering)
  const [own, setOwn] = useState<Record<string, string>>(() => ownOf(data.entities))
  const [saved, setSaved] = useState({ numbering: data.numbering, own: ownOf(data.entities) })
  const [busy, setBusy] = useState(false)
  const [today] = useState(() => new Date())
  /* (parity map, UC-058) the Tickets row — brought by the page, else read once here */
  const [tickets, setTickets] = useState<TicketNumbersData | null>(data.ticket ?? null)
  const [ticket, setTicket] = useState<ProjectNumbering | null>(data.ticket?.numbering ?? null)
  const [savedTicket, setSavedTicket] = useState<ProjectNumbering | null>(data.ticket?.numbering ?? null)
  useEffect(() => {
    if (data.ticket) return
    let alive = true
    readTicketNumbering().then((t) => { if (alive) { setTickets(t); setTicket(t.numbering); setSavedTicket(t.numbering) } }).catch(() => {})
    return () => { alive = false }
  }, [data.ticket])
  const ticketDirty = !!ticket && JSON.stringify(ticket) !== JSON.stringify(savedTicket)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.numbering) || (showEntities && JSON.stringify(own) !== JSON.stringify(saved.own)) || ticketDirty
  const entityRows = showEntities ? data.entities.map((e) => ({ name: e.name, prefix: own[e.id] ?? '' })) : []
  const ticketRow = ticket ? [{ label: TICKET_DOC.label, prefix: ticket.prefix }] : []
  const clash = prefixClash(draft, entityRows, ticketRow)
  /* a prefix another document (or entity) already has — said on the field itself, where it is fixed */
  const taken = (p: string) => !!p && [...DOCS.map((x) => draft[x.key].prefix), ...entityRows.map((e) => cleanPrefix(e.prefix)), ...ticketRow.map((t) => t.prefix)].filter((x) => x === p).length > 1
  const set = (k: DocKind, patch: Partial<ProjectNumbering>) => setDraft((n) => ({ ...n, [k]: { ...n[k], ...patch } }))
  const setT = (patch: Partial<ProjectNumbering>) => setTicket((t) => (t ? { ...t, ...patch } : t))
  const discard = () => { setDraft(saved.numbering); setOwn(saved.own); setTicket(savedTicket) }

  const save = async (): Promise<boolean> => {
    if (!canManage) { snackbar({ message: DOCUMENT_NUMBERS_RULE }); return false }
    if (clash) { snackbar({ message: couldnt('save the document numbers', clash) }); return false }
    setBusy(true)
    try {
      const r = await setDocumentNumbers({ ...draft, ...(showEntities ? { entities: own } : {}), ...(ticketDirty && ticket ? { ticket } : {}) })
      if ('error' in r) { snackbar({ message: couldnt('save the document numbers', refusalOf(r.error)) }); return false }
      const changed = DOCS.filter((x) => JSON.stringify(saved.numbering[x.key]) !== JSON.stringify(r.numbering[x.key]))
      const nextOwn = r.entities ?? saved.own
      setDraft(r.numbering); setOwn(nextOwn); setSaved({ numbering: r.numbering, own: nextOwn })
      if (r.ticket) { setTicket(r.ticket); setSavedTicket(r.ticket) }
      const next = (k: DocKind) => nextDocNumber(r.numbering[k], data.numbers[k], today)
      const nextTicket = r.ticket ? nextTicketNumber(r.ticket, tickets?.numbers ?? [], today) : null
      const words = [...changed.map((x) => next(x.key)), ...(nextTicket ? [nextTicket] : [])]
      snackbar({ message: words.length === 1 ? `Saved — the next ${changed[0]?.noun ?? TICKET_DOC.noun} will be ${words[0]}`
        : words.length ? `Saved — next: ${words.join(' · ')}`
        : 'Saved — each entity’s next invoice takes its own number' })
      return true
    } catch (e) { snackbar({ message: couldnt('save the document numbers', refusalOf(e)) }); return false } finally { setBusy(false) }
  }

  return (
    <>
      <LeaveGuard dirty={canManage && dirty} what="the document numbers" onSave={save} onDiscard={discard} />
      <div className={s.setting} id="document-numbers" data-testid="document-numbers">
        <div className={s.settingHead}>
          <span className={s.settingTitle}>Document numbers</span>
          <span className={s.settingHelp}>{DOCUMENT_NUMBERS_HELP}</span>
        </div>
        <div className={d.rows}>
          {DOCS.map((x) => {
            const n = draft[x.key]
            return (
              <Fragment key={x.key}>
                <div className={d.row} data-testid={`document-numbers-${x.key}`}>
                  <span className={d.name}><Icon name={x.icon} size={20} weight={300} className={d.icon} /><span><span>{x.label}</span><span className={d.help}>{x.when}</span></span></span>
                  <div className={d.prefix}><TextField label="Prefix" value={n.prefix} maxLength={8} onChange={(v) => set(x.key, { prefix: cleanPrefix(v) })} error={taken(n.prefix) ? 'Another document has this prefix' : undefined} /></div>
                  <div className={d.next}><TextField label="Next number" value={n.next ? String(n.next) : ''} numeric="digits" maxLength={6} onChange={(v) => set(x.key, { next: v ? Number(v) : 0 })} /></div>
                  <div className={d.digits}><TextField label="Digits" value={n.digits ? String(n.digits) : ''} numeric="digits" maxLength={1} onChange={(v) => set(x.key, { digits: v ? Math.min(6, Number(v)) : 0 })} /></div>
                  <label className={`${s.switchRow} ${d.year}`}><Switch size="sm" isSelected={n.year} isDisabled={!canManage} onChange={(v: boolean) => set(x.key, { year: v })} aria-label={`The year, in the ${x.noun} number`} /><span>The year</span></label>
                  <span className={`${s.example} ${d.example}`}><span className={s.settingHelp}>Next:</span> <span className={s.exampleNo} data-testid={x.testId}>{nextDocNumber(n, data.numbers[x.key], today)}</span></span>
                </div>
                {/* (gaps build B, item 12) an issuing entity's own invoice prefix — from a second entity on; blank takes the studio's */}
                {x.key === 'invoice' && showEntities ? (
                  <div data-testid="invoice-entity-numbers">
                    {data.entities.map((e) => {
                      const p = cleanPrefix(own[e.id] ?? '')
                      return (
                        <div key={e.id} className={`${d.row} ${d.entity}`} data-testid="invoice-entity-row">
                          <span className={d.name}><Icon name="store" size={20} weight={300} className={d.icon} /><span><span>{e.name}</span><span className={d.help}>Its invoices — blank takes {n.prefix}</span></span></span>
                          <div className={d.prefix}><TextField label="Prefix" value={own[e.id] ?? ''} maxLength={8} onChange={(v) => setOwn((o) => ({ ...o, [e.id]: cleanPrefix(v) }))} error={taken(p) || (!!p && p === n.prefix) ? 'Another document has this prefix' : undefined} /></div>
                          <span className={d.follow}>Its next number, digits and year follow Invoices</span>
                          <span className={`${s.example} ${d.example}`}><span className={s.settingHelp}>Next:</span> <span className={s.exampleNo}>{nextDocNumber(p ? { ...n, prefix: p, next: 0 } : n, data.numbers.invoice, today)}</span></span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </Fragment>
            )
          })}
          {/* (parity map, UC-058 · FR-084) Tickets — 1.0's ticket prefix, beside the money documents; T-{YYYY}-{nnn} unless changed here */}
          {ticket ? (
            <div className={d.row} data-testid="document-numbers-ticket">
              <span className={d.name}><Icon name={TICKET_DOC.icon} size={20} weight={300} className={d.icon} /><span><span>{TICKET_DOC.label}</span><span className={d.help}>{TICKET_DOC.when}</span></span></span>
              <div className={d.prefix}><TextField label="Prefix" value={ticket.prefix} maxLength={8} onChange={(v) => setT({ prefix: cleanPrefix(v) })} error={taken(ticket.prefix) ? 'Another document has this prefix' : undefined} /></div>
              <div className={d.next}><TextField label="Next number" value={ticket.next ? String(ticket.next) : ''} numeric="digits" maxLength={6} onChange={(v) => setT({ next: v ? Number(v) : 0 })} /></div>
              <div className={d.digits}><TextField label="Digits" value={ticket.digits ? String(ticket.digits) : ''} numeric="digits" maxLength={1} onChange={(v) => setT({ digits: v ? Math.min(6, Number(v)) : 0 })} /></div>
              <label className={`${s.switchRow} ${d.year}`}><Switch size="sm" isSelected={ticket.year} isDisabled={!canManage} onChange={(v: boolean) => setT({ year: v })} aria-label="The year, in the ticket number" /><span>The year</span></label>
              <span className={`${s.example} ${d.example}`}><span className={s.settingHelp}>Next:</span> <span className={s.exampleNo} data-testid={TICKET_DOC.testId}>{nextTicketNumber(ticket, tickets?.numbers ?? [], today)}</span></span>
            </div>
          ) : null}
        </div>
        {canManage ? <div className={s.settingActions}>
          <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
          <Button onPress={() => { void save() }} isDisabled={!dirty || busy || !!clash} data-testid="document-numbers-save">{busy ? 'Saving…' : 'Save the numbers'}</Button>
        </div> : null}
      </div>
    </>
  )
}
