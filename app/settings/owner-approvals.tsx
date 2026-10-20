'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import { useState } from 'react'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { HelpLink } from '@/components/company/help-link'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { UpdateReviewRow } from '@/components/projects/updates/update-review-setting'
import { setInvoiceRules } from '@/app/projects/money-actions'
import { setScheduleRules } from '@/app/projects/schedule-actions'
import { setHandoverReview } from '@/app/projects/ending-actions'
import { money2 } from '@/lib/quotes/math'
import { APPROVAL_RULES, COST_APPROVALS_WORDS, OWNER_APPROVALS_HELP } from '@/lib/settings/copy'   // (pending modules S17) the words the ghost reads too
import s from './settings.module.css'
import u from '@/components/projects/updates/update-review-setting.module.css'

type TeamMember = { id: string; name: string; role: string; active: boolean }
export type OwnerApprovalsData = {
  /** (REG-949 · gaps build D, item 10) updates need review, and the members named as reviewers */
  updateReview: boolean; reviewers: string[]; team: TeamMember[]
  /** (Projects round 5, F-05) invoices need approval before they are sent */
  invoiceApproval: boolean
  /** (gaps build, package C — 8) a milestone's Done and a share wait for an Owner or an Admin */
  completionApproval: boolean; shareApproval: boolean
  /** (Projects round 7, Q-24) a handover waits for an owner's review */
  handoverReview: boolean
  /** (gaps build F1) money out's two approvals — set with the costs, in Settings › Finance; read here */
  costs: { poApproval: boolean; expenseApproval: boolean; poLimitMinor: number; /** (S44R, C8) */ billApproval?: boolean } | null
}

/** One rule on the card table: its name and help, who approves, its switch — saved as it is pressed; a refusal puts the switch back and says
    why; with Undo unless switching back cannot undo what the switch did (invoices: turned off, the waiting ones are freed, fix-D D-19). */
function RuleRow({ id, testId, icon, label, help, on, canManage, write, words, snackKey, undo = true }: {
  id: string; testId: string; icon: string; label: string; help: string; on: boolean; canManage: boolean
  write: (next: boolean) => Promise<unknown>; words: [onWords: string, offWords: string]; snackKey: string; undo?: boolean
}) {
  const snackbar = useSnackbar()
  const [value, setValue] = useState(on)
  const [seen, setSeen] = useState(on)
  if (seen !== on) { setSeen(on); setValue(on) }
  const [busy, setBusy] = useState(false)
  const approvalsLock = usePlanLock('internal_approvals')   // (pending modules S19) approvals are Pro: off on Free, a change opens the lock
  const toggle = async (next: boolean, undoing = false) => {
    if (busy) return
    if (approvalsLock.locked) { approvalsLock.open(); return }
    setValue(next); setBusy(true)
    try {
      const r = await write(next)
      if (r && typeof r === 'object' && 'error' in r) { setValue(!next); snackbar({ message: couldnt('change the rule', refusalOf(r)) }); return }
      const message = next ? words[0] : words[1]
      if (!undoing) snackbar(undo ? { key: snackKey, message, actionLabel: 'Undo', onAction: () => { void toggle(!next, true) } } : { key: snackKey, message })
    } catch (e) { setValue(!next); snackbar({ message: couldnt('change the rule', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  return (
    <div className={s.eventRow} role="row" id={id} data-testid={testId}>
      <span role="cell" className={s.eventName}><Icon name={icon} size={20} weight={300} /><span><span>{label}</span><span className={s.eventHelp}>{help}</span></span></span>
      <span role="cell" className={s.eventWho} data-label="Who approves">Owners and Admins</span>
      <span role="cell" className={s.eventCol} data-label="On">
        <Switch size="sm" isSelected={value} isDisabled={!canManage || busy} onChange={(v: boolean) => { void toggle(v) }} aria-label={label} />
      </span>
    </div>
  )
}

/**
 * (simplify S-20 — P2 §6.7, his "build everything" 2026-10-09) Settings › Projects › **What waits for an Owner or an Admin** — one card at the
 * top of the module with every approval a project can wait for, together: updates (and who reviews them), invoices, a milestone's Done,
 * schedule changes, the handover — and a link to Finance's PO and expense rules, which stay with the costs' limit and terms. Each switch
 * writes the setting it wrote on its own card (`setUpdateReview` · `setInvoiceRules` · `setScheduleRules` · `setHandoverReview`), in the
 * words it said there; the cards they sat on keep their other fields, and a switch is set in one place only. Each row keeps its old test id
 * and lands on its own anchor (Who may do what's links: #update-settings · #invoice-approval · #done-approval · #share-approval ·
 * #handover-review). Owners and Admins change it; the module's read-only scope shows everyone else the rules.
 */
export function OwnerApprovals({ data, canManage }: { data: OwnerApprovalsData; canManage: boolean }) {
  const c = data.costs
  const locked = usePlanLock('internal_approvals').locked   // (pending modules S19) on Free nothing waits — the rules read off, kept for Pro
  /* (S44R, C8) three rules now: all on reads On, none Off, else the ones that are on */
  const costOn = !c ? [] : [c.poApproval ? 'POs' : null, c.expenseApproval ? 'expenses' : null, c.billApproval ? 'bills' : null].filter((x): x is string => !!x)
  const costState = !c ? null : costOn.length === 3 ? 'On' : !costOn.length ? 'Off' : costOn.length === 1 ? `${costOn[0]!.charAt(0).toUpperCase()}${costOn[0]!.slice(1)} only` : `${costOn[0]!.charAt(0).toUpperCase()}${costOn[0]!.slice(1)} and ${costOn[1]}`
  return (
    <div className={s.setting} id="owner-approvals" data-testid="owner-approvals">
      <div className={s.settingHead}>
        <span className={s.settingTitle}>What waits for an Owner or an Admin{locked ? <> <ProTag /></> : null}</span>
        <span className={s.settingHelp}>{OWNER_APPROVALS_HELP}</span>
      </div>
      <div className={`${s.eventTable} ${u.table}`} role="table" aria-label="What waits for an Owner or an Admin" data-card-table="">
        <div className={s.eventHead} role="row">
          <span role="columnheader">Rule</span><span role="columnheader">Who approves</span><span role="columnheader" className={s.eventCol}>On</span>
        </div>
        <UpdateReviewRow on={data.updateReview} canManage={canManage} reviewers={data.reviewers} team={data.team} />
        <RuleRow id="invoice-approval" testId="invoice-approval-row" {...APPROVAL_RULES.invoice} on={data.invoiceApproval} canManage={canManage}
                 write={(v) => setInvoiceRules({ rules: { approval: v } })} snackKey="invoice-approval" undo={false}
                 words={['A Designer’s or a Manager’s invoice now waits for an Owner or an Admin', 'The project’s team now sends its invoices']} />
        <RuleRow id="done-approval" testId="schedule-rule-completionApproval" {...APPROVAL_RULES.done} on={data.completionApproval} canManage={canManage}
                 write={(v) => setScheduleRules({ completionApproval: v })} snackKey="schedule-rules"
                 words={['A Designer’s or a Manager’s Done now waits for an Owner or an Admin', 'Anyone on the team now marks a milestone done']} />
        <RuleRow id="share-approval" testId="schedule-rule-shareApproval" {...APPROVAL_RULES.share} on={data.shareApproval} canManage={canManage}
                 write={(v) => setScheduleRules({ shareApproval: v })} snackKey="schedule-rules"
                 words={['A Designer’s or a Manager’s schedule changes now wait for an Owner or an Admin', 'The team now shares schedule changes at once']} />
        <RuleRow id="handover-review" testId="handover-review-row" {...APPROVAL_RULES.handover} on={data.handoverReview} canManage={canManage}
                 write={(v) => setHandoverReview({ on: v })} snackKey="handover-review"
                 words={['A Designer’s or a Manager’s handover now waits for an Owner or an Admin', 'The project’s team now completes its own handover']} />
        {c ? (
          /* money out's two approvals stay with the PO limit and when vendors are paid (Settings › Finance › Costs) — named here, set there */
          <div className={s.eventRow} role="row" id="cost-approvals" data-testid="cost-approvals-row">
            <span role="cell" className={s.eventName}><Icon name={COST_APPROVALS_WORDS.icon} size={20} weight={300} />
              <span><span>{COST_APPROVALS_WORDS.label}</span>
                <span className={s.eventHelp}>{COST_APPROVALS_WORDS.lead(money2(c.poLimitMinor))}<HelpLink href="/settings?section=finance#cost-settings" testId="cost-approvals-link">{COST_APPROVALS_WORDS.link}</HelpLink>{COST_APPROVALS_WORDS.end}</span></span>
            </span>
            <span role="cell" className={s.eventWho} data-label="Who approves">Owners and Admins</span>
            <span role="cell" className={`${s.eventCol} ${s.eventWho}`} data-label="On" data-testid="cost-approvals-state">{costState}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
