'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { EmptyState } from '@/components/om/empty-state'
import { useSnackbar } from '@/components/om/snackbar'
import type { TableColumnDef } from '@/components/om/table-columns'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { removeTrialLead, restoreTrialLead } from '@/app/site/try/tools-actions'
import { displayDate, phoneTyped } from '@/lib/format'
import { site } from '@/lib/site/model'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { LEAD_LIMIT, LEADS_WORDS, TRIAL_WORDS, leadsLeftLine, leftOf, type TrialLead, type TrialToolKey, type TrialWork } from '@/lib/trial/policy'
import { KeepBand, OtherTools, TrialApp, TrialGate, TrialHero } from './trial-frame'
import { useAddTrialLead } from './trial-lead-form'
import x from './trial-tools.module.css'

const DEFS: readonly TableColumnDef[] = [
  { key: 'lead', label: 'Lead', track: 'minmax(240px, 260fr)', locked: true },
  { key: 'source', label: 'Source', track: 'minmax(140px, 140fr)' },
  { key: 'type', label: 'Property type', track: 'minmax(180px, 180fr)' },
  { key: 'budget', label: 'Budget', track: 'minmax(130px, 130fr)' },
  { key: 'stage', label: 'Stage', track: 'minmax(110px, 110fr)' },
  { key: 'added', label: 'Added', track: 'minmax(140px, 140fr)' },
]

/**
 * (pending modules S41b-3 — 1.0's anonymous /leads: "the CRM is one of the surfaces you can actually USE without an account") Leads for a
 * visitor: the studio's own Create New Lead form (in its trial mode — no team to assign, no studio to check duplicates in) and their leads on
 * the listing's table model (cards on a phone). Three, then 1.0's gate over the page; each one kept in their workspace until they start their
 * studio, when it becomes a lead there. Remove answers with Undo.
 */
export function TrialLeads({ initial, open }: { initial: TrialWork; open: Partial<Record<TrialToolKey, boolean>> }) {
  const snack = useSnackbar()
  const phone = useMediaQuery(MOBILE)
  const [work, setWork] = useState(initial)
  const [gate, setGate] = useState<string | null>(null)
  const left = leftOf(work.leads.length, LEAD_LIMIT)
  const add = useAddTrialLead({
    onAdded: (lead) => { setWork((w) => ({ ...w, leads: [...w.leads, lead] })); snack({ message: LEADS_WORDS.added(lead.data.name) }) },
    onGate: setGate,
  })
  const create = () => (left <= 0 ? setGate(LEADS_WORDS.gate) : add.open())

  /* Remove: gone at once, back if the server refuses (the house rule), Undo puts it where it was */
  const remove = async (l: TrialLead) => {
    const before = work.leads
    setWork((w) => ({ ...w, leads: w.leads.filter((x) => x.id !== l.id) }))
    try {
      const r = await removeTrialLead({ id: l.id })
      /* a refusal with its rule (the lead holds the kept quote or comparison) says why; anything else, what failed */
      if ('error' in r) { setWork((w) => ({ ...w, leads: before })); snack({ message: r.reason === 'held' ? r.error : TRIAL_WORDS.couldnt('remove the lead') }); return }
      snack({ message: LEADS_WORDS.removed(l.data.name), actionLabel: 'Undo', onAction: () => { void undo(r.lead, r.index) } })
    } catch { setWork((w) => ({ ...w, leads: before })); snack({ message: TRIAL_WORDS.couldnt('remove the lead') }) }
  }
  const undo = async (lead: TrialLead, index: number) => {
    try {
      const r = await restoreTrialLead({ lead, index })
      if ('error' in r) { if (r.reason === 'limit') setGate(r.error); else snack({ message: TRIAL_WORDS.couldnt('undo') }); return }
      setWork((w) => (w.leads.some((x) => x.id === lead.id) ? w : { ...w, leads: [...w.leads.slice(0, index), lead, ...w.leads.slice(index)] }))
    } catch { snack({ message: TRIAL_WORDS.couldnt('undo') }) }
  }

  const cell = (l: TrialLead, key: string) => {
    const d = l.data
    switch (key) {
      case 'lead': return (
        <span className={x.leadCell}>
          <span className={x.leadText}><span className={x.strong}>{d.name}</span><span className={x.muted}>+65 {phoneTyped(d.phone)}</span></span>
          <Tooltip label={LEADS_WORDS.removeLabel(d.name)}><IconButton icon="delete" label={LEADS_WORDS.removeLabel(d.name)} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => { void remove(l) }} data-testid="trial-lead-remove" /></Tooltip>
        </span>
      )
      case 'source': return d.source || 'Others'
      case 'type': return d.propertyType || '—'
      case 'budget': return d.budget ? `S$ ${d.budget}` : '—'
      case 'stage': return <MetaChip>New</MetaChip>
      case 'added': return displayDate(new Date(l.at))
      default: return null
    }
  }

  return (
    <>
      <TrialHero back={{ label: LEADS_WORDS.crumbBack, href: site('/platform/leads') }} here={LEADS_WORDS.crumbHere} allowance={leadsLeftLine(left)} title={LEADS_WORDS.title} lede={LEADS_WORDS.lede} />
      <TrialApp label="Your leads" testId="trial-leads-app">
        <CreditsTable table="trial-leads" title={LEADS_WORDS.listTitle} help={LEADS_WORDS.listHelp} defs={DEFS} rows={work.leads} rowKey={(l) => l.id} cell={cell} testId="trial-leads"
                      rowAttrs={(l) => ({ 'data-lead': l.data.name })}
                      actions={work.leads.length && !phone ? <Button iconStart={<Icon name="add" size={20} />} onPress={create} data-testid="trial-lead-add" data-kb="create">{LEADS_WORDS.add}</Button> : null}
                      empty="" noResults={<EmptyState icon="people_alt" title={LEADS_WORDS.emptyTitle} help={LEADS_WORDS.emptyHelp} primary={{ label: LEADS_WORDS.add, icon: 'add', onPress: create, testId: 'trial-lead-add' }} testId="trial-leads-empty" />} />
        {/* a phone: the head keeps its title and line at full width; the press sits under the cards, at full width */}
        {work.leads.length && phone ? <div className={x.addBelow}><Button iconStart={<Icon name="add" size={20} />} onPress={create} data-testid="trial-lead-add" data-kb="create">{LEADS_WORDS.add}</Button></div> : null}
      </TrialApp>
      <KeepBand work={work} />
      <OtherTools current="leads" open={open} />
      {add.modal}
      <TrialGate text={gate} onClose={() => setGate(null)} />
    </>
  )
}
