'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import { useState } from 'react'
import Link from 'next/link'
import { Switch } from '@/components/ds'
import { ChoiceCard } from '@/components/om/choice-card'
import { useSnackbar } from '@/components/om/snackbar'
import { ReadOnlyNote } from '@/components/company/read-only-note'   // (S42 B-12)
import { ALL_STAGES, type Stage } from '@/lib/leads/enums'
import { stageSlug } from '@/lib/leads/listing-url'
import { withFrom } from '@/lib/nav'
import { STAGE_MOVEMENT_OPTIONS, type LeadStageRules, type StageMovement } from '@/lib/settings/types'
import { setLeadStageRules } from './actions'
import { HOW_LEADS_MOVE_NOTE, LEAD_STAGES_HELP, STAGE_ASK_WORDS, STAGE_RECORDS } from '@/lib/settings/copy'
import styles from './settings.module.css'
import own from './lead-stages-card.module.css'

/* What moving into each stage keeps on the lead, and the two steps' words — (pending modules S17) kept once in lib/settings/copy.ts, which the
   module's ghost reads too. */
const RECORDS = STAGE_RECORDS

/**
 * (pending modules S05 — card held:leads, "Edit the lead funnel (Manage Stages)"; 1.0's Accounts › Pipeline Stages, `funnel-editor.tsx`)
 * Settings › Lead management › **Lead stages** — the listing's stage menu's "Manage Stages ›" opens it (`#lead-stages`). 1.0 let a studio add,
 * rename, recolour and reorder its buckets and set per-status flags; 2.0's stages are one journey every record reads (each stage keeps a
 * step of the sale, Won makes the project, the portal, Activity, Reports and 1.0's port map all speak its words, and nothing moves backwards —
 * REG-111…), so the card shows that journey whole — each stage, what moving into it keeps on the lead, how many leads sit in it now (a press
 * opens the listing on that stage) — and the studio sets what 1.0's flags set: whether Contacted asks for the next call or meeting's date
 * ("Follow-up required") and whether Won asks for the signed contract ("Contract required"), then how leads move (Linear · Flexible, the
 * card it absorbed). Adding, renaming or reordering stages is not built — see the step's outcome. *(invented copy: the card's sentences)*
 */
export function LeadStagesCard({ counts, rules: initial, canManage, from, mode, onMode, locked }: {
  /** Live leads in each stage — the listing's own count. */
  counts: Record<string, number>
  rules: LeadStageRules
  canManage: boolean
  /** Where the listing's Back returns: this page as it was opened. */
  from: string
  mode: StageMovement
  onMode: (m: StageMovement) => void
  /** The refusal a member who may not change it hears. */
  locked: string
}) {
  const snackbar = useSnackbar()
  const [rules, setRules] = useState<LeadStageRules>(initial)
  const [seen, setSeen] = useState(initial)
  if (seen !== initial) { setSeen(initial); setRules(initial) }   // another tab saved (render-phase adjust)
  /* (pending modules S19 — 1.0's plan gating: custom stages are Pro — "editing" locked, the studio's current funnel keeps working) on Free
     what each stage asks keeps applying as set; changing it wears the Pro tag and opens the lock card */
  const stagesLock = usePlanLock('custom_stages')
  const write = async (patch: Partial<LeadStageRules>, done: string) => {
    if (!canManage) { snackbar({ message: locked }); return }
    if (stagesLock.locked) { stagesLock.open(); return }
    const prev = rules
    setRules((r) => ({ ...r, ...patch }))   // optimistic, put back when refused
    try { setRules(await setLeadStageRules(patch)); snackbar({ message: done }) }
    catch { setRules(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
  }
  const asks: Partial<Record<Stage, { label: string; help: string; on: boolean; set: (v: boolean) => void }>> = {
    'Contacted': { ...STAGE_ASK_WORDS['Contacted']!, on: rules.contactNextStep,
      set: (v) => { void write({ contactNextStep: v }, v ? 'Contacted now asks for the next call or meeting' : 'The next call or meeting is optional again') } },
    'Won': { ...STAGE_ASK_WORDS['Won']!, on: rules.wonContract,
      set: (v) => { void write({ wonContract: v }, v ? 'Won now asks for the signed contract' : 'Won no longer asks for a signed contract') } },
  }
  const leadsLine = (n: number) => `${n} ${n === 1 ? 'lead' : 'leads'}`
  return (
    <div className={styles.setting} data-testid="lead-stages" id="lead-stages">
      <div className={styles.settingHead}>
        <span className={styles.settingTitle}>Lead stages</span>
        <span className={styles.settingHelp}>{LEAD_STAGES_HELP}</span>
      </div>
      {/* (S42 B-12) Manage Stages lands here (#lead-stages), past the module's own note: a member who may only read it is told so in the card */}
      {canManage ? null : <ReadOnlyNote text={`${locked}.`} />}
      <div className={`${styles.eventTable} ${own.table}`} role="table" aria-label="Lead stages" data-card-table="">
        <div className={`${styles.eventHead} ${own.row}`} role="row">
          <span role="columnheader">Stage</span><span role="columnheader">What it keeps on the lead</span><span role="columnheader" className={own.countHead}>Leads</span>   {/* (the calm UI build, W-540) */}
        </div>
        {ALL_STAGES.map((s) => {
          const a = asks[s]
          const n = counts[s] ?? 0
          return (
            <div key={s} className={`${styles.eventRow} ${own.row}`} role="row" data-testid={`lead-stage-${stageSlug(s)}`}>
              <span role="cell" className={own.stage}>
                <span className={own.dot} data-tone={s === 'On Hold' || s === 'Lost' ? 'parked' : 'active'} aria-hidden />{s}
              </span>
              <span role="cell" className={own.keeps}>
                <span>{RECORDS[s]}</span>
                {a ? (
                  <label className={`${styles.switchRow} ${own.ask}`}>
                    <Switch size="sm" isSelected={a.on} isDisabled={!canManage} onChange={(v: boolean) => a.set(v)} aria-label={a.label} data-testid={`lead-stage-ask-${stageSlug(s)}`} />
                    <span>{a.label}{stagesLock.locked && canManage ? <> <ProTag /></> : null}<span className={styles.settingHelp}> · {a.help}</span></span>
                  </label>
                ) : null}
              </span>
              <span role="cell" className={own.count} data-label="Leads">
                {n ? <Link className={own.countLink} href={withFrom(`/leads?scope=${stageSlug(s)}`, from)} aria-label={`${leadsLine(n)} in ${s} — open them`}>{leadsLine(n)}</Link> : <span className={own.none}>No leads</span>}
              </span>
            </div>
          )
        })}
      </div>
      <div className={own.movement}>
        <span className={styles.reasonLabel} id="stage-movement-label">How leads move</span>
        <div className={styles.choices} role="radiogroup" aria-label="Stage movement">
          {STAGE_MOVEMENT_OPTIONS.map((o) => (
            <ChoiceCard key={o.key} title={o.title} help={o.help} selected={mode === o.key} onSelect={() => { if (!canManage) { snackbar({ message: locked }); return } onMode(o.key) }} />
          ))}
        </div>
        <span className={styles.settingHelp}>{HOW_LEADS_MOVE_NOTE}</span>
      </div>
    </div>
  )
}
