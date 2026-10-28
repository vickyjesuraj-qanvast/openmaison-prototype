'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { SCOPE_LABEL, ruleWords, scopeOf, type CommissionRuleRecord } from '@/lib/finance/commission'
import type { BooksSettings } from '@/lib/finance/books'
import { removeCommissionRule, setCommissionRule, undoCommissionRule } from '@/app/finance/books-actions'
import { RuleDialog, type RuleDraft } from './commission-dialogs'
import { ProjectCommissionDialog, openProjectCommission } from './project-commission-dialog'
import s from '@/app/settings/settings.module.css'
import u from '@/components/projects/updates/update-review-setting.module.css'
import b from './books.module.css'

/**
 * (gaps build F2 — F2-Q4 · Q9) The two book cards, on the Settings modules' grammars. **Commission** (Settings › Finance) — the studio's rule
 * (No commission to start), then a member's own rate, a project's, a member's on a project, on the house event table (the first that fits:
 * member on the project → project → member → studio); each change applies from today, earlier payments keep the rate they earned; Remove
 * answers with Undo. **Credit notes** — how they are numbered, on the PO numbers' grammar (the live example — Discard · Save); (one-home N-12)
 * shown on Settings › Projects beside Invoices, no longer on Settings › Finance. Owners and Admins change them; everyone else reads them in
 * the read-only scope. (simplify S-15) Both on Settings › Finance again — Commission in its group, Credit notes under Money in — and the
 * credit notes' numbers on the module's Document numbers card.
 */
type Adding = { scope: 'member' | 'project' | 'member_project' }
export function CommissionSettings({ data, canManage }: { data: BooksSettings['commission']; canManage: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ rule: CommissionRuleRecord | null; memberId: string | null; projectId: string | null } | null>(null)
  const [adding, setAdding] = useState<Adding | null>(null)
  const [pickMember, setPickMember] = useState('')
  const [pickProject, setPickProject] = useState('')
  const studio = data.rules.find((r) => !r.memberId && !r.projectId) ?? null
  const overrides = data.rules.filter((r) => r.memberId || r.projectId)
  const member = (id: string | null) => data.members.find((m) => m.id === id)?.name ?? 'A member'
  const project = (id: string | null) => { const p = data.projects.find((x) => x.id === id); return p ? `${p.number} · ${p.name}` : 'A project' }
  const subjectOf = (r: CommissionRuleRecord) => (r.memberId && r.projectId ? `${member(r.memberId)} on ${project(r.projectId)}` : r.projectId ? project(r.projectId) : member(r.memberId))
  const save = async (memberId: string | null, projectId: string | null, d: RuleDraft): Promise<boolean> => {
    setBusy(true)
    try {
      const r = await setCommissionRule({ memberId, projectId, basis: d.basis, rateBp: d.rateBp, fixedMinor: d.fixedMinor })
      if ('error' in r) { snackbar({ message: couldnt('save the rate', refusalOf(r.error)) }); return false }
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void undoCommissionRule(r.undo).then(() => { snackbar({ message: 'The rate is as it was' }); router.refresh() }) } })
      router.refresh()
      return true
    } catch (e) { snackbar({ message: couldnt('save the rate', refusalOf(e)) }); return false } finally { setBusy(false) }
  }
  const remove = async (r: CommissionRuleRecord) => {
    setBusy(true)
    try {
      const x = await removeCommissionRule(r.id)
      if ('error' in x) { snackbar({ message: couldnt('remove the rate', refusalOf(x.error)) }); return }
      snackbar({ message: `${subjectOf(r)}: ${x.sentence}`, actionLabel: 'Undo', onAction: () => { void undoCommissionRule(x.undo).then(() => { snackbar({ message: 'The rate is back' }); router.refresh() }) } })
      router.refresh()
    } catch (e) { snackbar({ message: couldnt('remove the rate', refusalOf(e)) }) } finally { setBusy(false) }
  }
  const memberNames = data.members.map((m) => m.name)
  const projectNames = data.projects.map((p) => `${p.number} · ${p.name}`)
  const addMember = data.members.find((m) => m.name === pickMember)?.id ?? null
  const addProject = data.projects.find((p) => `${p.number} · ${p.name}` === pickProject)?.id ?? null
  const addWhy = !adding ? null : adding.scope !== 'project' && !addMember ? 'Pick the member' : adding.scope !== 'member' && !addProject ? 'Pick the project' : null
  return (
    <div className={s.setting} id="commission-settings" data-testid="commission-settings">
      <div className={s.settingHead}>
        <span className={s.settingTitle}>Commission</span>
        <span className={s.settingHelp}>What the team earns on its projects — worked out before GST from the payments that count, shared between a project’s team. A change applies from today; earlier payments keep the rate they earned.</span>
      </div>
      <div className={`${s.eventTable} ${u.table}`} role="table" aria-label="Commission rates" data-card-table="">
        <div className={s.eventHead} role="row"><span role="columnheader">Applies to</span><span role="columnheader">Rate</span><span role="columnheader" className={s.eventCol}>Change</span></div>
        <div className={s.eventRow} role="row" data-testid="commission-studio-rule">
          <span role="cell" className={s.eventName}><Icon name="workspace_premium" size={20} weight={300} /><span><span>The studio’s rule</span><span className={s.eventHelp}>Everyone, on every project — unless a rate below fits</span></span></span>
          <span role="cell" className={s.eventWho} data-label="Rate">{ruleWords(studio)}</span>
          <span role="cell" className={s.eventCol} data-label="Change">{canManage ? <Button appearance="text" onPress={() => setEditing({ rule: studio, memberId: null, projectId: null })} isDisabled={busy} data-testid="commission-studio-change">Change</Button> : null}</span>
        </div>
        {overrides.map((r) => (
          <div key={r.id} className={s.eventRow} role="row" data-testid="commission-override">
            <span role="cell" className={s.eventName}><Icon name={r.projectId ? 'business_center' : 'person'} size={20} weight={300} /><span><span>{subjectOf(r)}</span><span className={s.eventHelp}>{SCOPE_LABEL[scopeOf(r)]}</span></span></span>
            <span role="cell" className={s.eventWho} data-label="Rate">{ruleWords(r)}</span>
            {/* (parity map, FB-042 · FB-043) a project's own rate changes in the project's Commission dialog — the one that keeps its payment stages */}
            <span role="cell" className={s.eventCol} data-label="Change">{canManage ? <span className={b.rowActions}><Button appearance="text" onPress={() => (r.projectId && !r.memberId ? openProjectCommission(r.projectId) : setEditing({ rule: r, memberId: r.memberId, projectId: r.projectId }))} isDisabled={busy}>Change</Button><Button appearance="text" onPress={() => { void remove(r) }} isDisabled={busy}>Remove</Button></span> : null}</span>
          </div>
        ))}
      </div>
      {canManage ? (
        <div className={b.adds}>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => { setPickMember(''); setPickProject(''); setAdding({ scope: 'member' }) }} isDisabled={busy} data-testid="commission-add-member">A member’s rate</Button>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => { setPickMember(''); setPickProject(''); setAdding({ scope: 'project' }) }} isDisabled={busy}>A project’s rate</Button>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => { setPickMember(''); setPickProject(''); setAdding({ scope: 'member_project' }) }} isDisabled={busy}>A member’s rate on a project</Button>
        </div>
      ) : null}
      <ProjectCommissionDialog />
      <RuleDialog open={!!editing} title={editing && !editing.memberId && !editing.projectId ? 'The studio’s commission' : 'Change the rate'}
                  subtitle={editing ? (editing.memberId || editing.projectId ? `${editing.rule ? subjectOf(editing.rule) : ''} — from today.` : 'Everyone, on every project, unless a rate fits them — from today.') : undefined}
                  initial={editing?.rule ? { basis: editing.rule.basis, rateBp: editing.rule.rateBp, fixedMinor: editing.rule.fixedMinor } : null} allowNone={!!editing && !editing.memberId && !editing.projectId}
                  busy={busy} saveLabel="Save" onClose={() => setEditing(null)}
                  onSave={(d) => { const e = editing; if (!e) return; void save(e.memberId, e.projectId, d).then((ok) => { if (ok) setEditing(null) }) }} />
      <RuleDialog open={!!adding} title={adding?.scope === 'member' ? 'A member’s own rate' : adding?.scope === 'project' ? 'A project’s rate' : 'A member’s rate on a project'}
                  subtitle="It applies from today, over the studio’s rule." initial={null} allowNone={false} busy={busy} saveLabel="Add the rate" subjectWhy={addWhy}
                  subject={<>
                    {adding?.scope !== 'project' ? <TextField label="Member" mode="select" options={memberNames} value={pickMember} onChange={setPickMember} required searchable /> : null}
                    {adding?.scope !== 'member' ? <TextField label="Project" mode="select" options={projectNames} value={pickProject} onChange={setPickProject} required searchable /> : null}
                  </>}
                  onClose={() => setAdding(null)}
                  onSave={(d) => { const a = adding; if (!a) return; void save(a.scope === 'project' ? null : addMember, a.scope === 'member' ? null : addProject, d).then((ok) => { if (ok) setAdding(null) }) }} />
    </div>
  )
}

/** (simplify S-15, a deliberate change) Credit notes, back on Settings › Finance › Money in beside Invoices — its numbering went to the module's
    one *Document numbers* card (CN with INV · RCT · PO, one Save), so the card says what a credit note is and where it is numbered. */
export function CreditSettings() {
  return (
    <div className={s.setting} id="credit-settings" data-testid="credit-settings">
      <div className={s.settingHead}>
        <span className={s.settingTitle}>Credit notes</span>
        <span className={s.settingHelp}>A credit note takes money off a sent invoice — its GST at the invoice’s rate — and is numbered when it is issued. Owners and Admins issue them from the project’s Payments tab.</span>
      </div>
      <span className={s.settingHelp} data-testid="credit-numbers-pointer">Credit notes are numbered under Document numbers, above.</span>
    </div>
  )
}
