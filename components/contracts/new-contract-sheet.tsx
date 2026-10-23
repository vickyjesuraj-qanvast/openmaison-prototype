'use client'

import { useMemo, useState } from 'react'
import { SearchBar } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import styles from './new-contract-sheet.module.css'

export type NewContractKind = 'blank' | 'template' | 'import'

/**
 * (Contracts on the move, C4 — P-09 · A-10; his "please check and built accordingly" 2026-10-22) New contract on a phone, studio-wide: the Create
 * Quote phone step (REG-2570, components/quotes/create-quote-modal.tsx — its rows composed, never copied). **Who is it for?** — the leads with
 * the newest contract activity first, then everyone by name, a search over both — then the kind as 56 rows: From the studio agreement · From
 * a template (the picker's list, the suggested one picked) · Import from file. A bottom sheet (the house Dialog's form size); its Back returns
 * to the list. `whoOnly`: the first step alone (the templates gallery's "New contract from this template" asks only who).
 */
export function NewContractSheet({ open, onClose, leads, recent = [], busy = false, whoOnly = false, onStart }: {
  open: boolean; onClose: () => void
  leads: { id: string; name: string }[]
  /** Lead ids with the newest contract activity, newest first. */
  recent?: string[]
  /** The contract is being made: the rows wait and the head says so. */
  busy?: boolean
  whoOnly?: boolean
  onStart: (leadId: string, kind: NewContractKind) => void
}) {
  const [leadId, setLeadId] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setLeadId(null) }   // every opening starts afresh (render-phase adjust)
  const lead = leads.find((l) => l.id === leadId) ?? null
  const pick = (id: string) => { if (whoOnly) { onStart(id, 'blank'); return } setLeadId(id) }
  const step: 'who' | 'kind' = lead && !whoOnly ? 'kind' : 'who'
  return (
    <Dialog open={open} onClose={onClose} size="form" width={400} portal
            title={busy ? 'Creating…' : step === 'who' ? 'Who is it for?' : `Start a contract for ${lead?.name ?? ''}`}
            leading={step === 'kind' ? <Tooltip label="Back"><IconButton icon="arrow_back" label="Back to who it is for" size={24} variant="bare" iconSize={24} iconWeight={300} onClick={() => setLeadId(null)} /></Tooltip> : undefined}>
      {step === 'who' ? (
        <LeadWhoList leads={leads} recent={recent} onPick={pick} disabled={busy} />
      ) : (
        /* the kind as rows — the New Contract menu's three, said in full (sweep S2 #20: what each makes) */
        <section className={styles.block} aria-label="How to start" data-testid="new-contract-kinds">
          <div className={styles.list}>
            <KindRow icon="contract" title="From the studio agreement" desc="The full agreement, filled in from the lead and its quote" busy={busy} onPick={() => onStart(lead!.id, 'blank')} testId="new-contract-blank" />
            <KindRow icon="description" title="From a template" desc="Your templates — the default picked for you" busy={busy} onPick={() => onStart(lead!.id, 'template')} testId="new-contract-template" />
            <KindRow icon="upload_file" title="Import from file" desc="A PDF you already have, or a photo of a signed page" busy={busy} onPick={() => onStart(lead!.id, 'import')} testId="new-contract-import" />
          </div>
        </section>
      )}
    </Dialog>
  )
}

/**
 * (C4 — P-09 · A-10) **Who is it for?** — the leads with the newest contract activity first ("Recent"), then everyone else by name, a search
 * over both (the DS SearchBar, REG-2600 made it take a tap); a tap on a row picks. The New contract sheet's first step, and on a phone the
 * contract hosts' lead question (`PickLeadDialog whoList`: Import / a template / Send together from Tools, where no lead is in context).
 */
export function LeadWhoList({ leads, recent = [], onPick, disabled = false }: { leads: { id: string; name: string }[]; recent?: string[]; onPick: (leadId: string) => void; disabled?: boolean }) {
  const [query, setQuery] = useState('')
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (l: { name: string }) => !q || l.name.toLowerCase().includes(q)
    const byId = new Map(leads.map((l) => [l.id, l]))
    const recentRows = recent.map((id) => byId.get(id)).filter((l): l is { id: string; name: string } => !!l && match(l))
    const seen = new Set(recentRows.map((l) => l.id))
    return { recent: recentRows, rest: leads.filter((l) => !seen.has(l.id) && match(l)).sort((a, b) => a.name.localeCompare(b.name)) }
  }, [leads, recent, query])
  return (
    <section className={styles.block} aria-label="Who is it for?" data-testid="new-contract-who">
      <SearchBar appearance="outlined" size="md" placeholder="Search leads" aria-label="Search leads" value={query} onChange={setQuery} className={styles.search} />
      {rows.recent.length ? <span className={styles.eyebrow}>Recent</span> : null}
      {rows.recent.length ? <div className={styles.list}>{rows.recent.map((l) => <WhoRow key={l.id} name={l.name} disabled={disabled} onPick={() => onPick(l.id)} />)}</div> : null}
      {rows.rest.length ? <span className={styles.eyebrow}>{rows.recent.length ? 'Everyone else' : 'Leads'}</span> : null}
      {rows.rest.length ? <div className={styles.list}>{rows.rest.map((l) => <WhoRow key={l.id} name={l.name} disabled={disabled} onPick={() => onPick(l.id)} />)}</div> : null}
      {!rows.recent.length && !rows.rest.length ? <p className={styles.help} role="status">{query ? `No lead matches “${query}”.` : 'No leads yet — add one on Leads first.'}</p> : null}
    </section>
  )
}

/** A lead in the "Who is it for?" list: a 56px row, the name at 16, a chevron. */
function WhoRow({ name, onPick, disabled = false }: { name: string; onPick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={styles.whoRow} onClick={onPick} disabled={disabled} data-testid="new-contract-lead">
      <span className={styles.whoName}>{name}</span>
      <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
    </button>
  )
}
function KindRow({ icon, title, desc, busy, onPick, testId }: { icon: string; title: string; desc: string; busy: boolean; onPick: () => void; testId: string }) {
  return (
    <div className={styles.phoneRow}>
      <button type="button" className={styles.phoneMain} onClick={onPick} disabled={busy} data-testid={testId}>
        <span className={styles.glyph}><Icon name={icon} size={20} weight={300} /></span>
        <span className={styles.rowText}><span className={styles.rowTitle}>{title}</span><span className={styles.rowDesc}>{desc}</span></span>
        <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
      </button>
    </div>
  )
}
