'use client'

import { Fragment, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { HelpLink } from '@/components/company/help-link'
import { leaveThen } from '@/components/company/leave-guard'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { Row } from '@/components/projects/overview/row'
import { withFrom } from '@/lib/nav'
import { SETUP_GROUPS, type SetupRow, type StudioSetupData } from '@/lib/studio-setup/model'
import type { QuoteApproval, StageMovement } from '@/lib/settings/types'
import { hideStudioSetup, noteSetupSeen, noteStudioSetUp, showStudioSetup } from './setup-actions'
import s from './settings.module.css'
import ov from '@/components/projects/project-overview.module.css'
import own from './studio-setup-card.module.css'

/** What a studio starts with and never has to set (1.0's skip buttons: "defaults INV / PO / T used", "Standard pipeline used", "all approvals
    enabled") — said at the list's foot with where each is changed. */
export type SetForYou = { invoice: string | null; stages: StageMovement; approval: QuoteApproval }

/**
 * (pending modules S08 — 1.0's /studio-setup wizard as 2.0's checklist) Settings › Studio › **Set up your studio**: the steps a studio's
 * documents and its way of working need, each done by its own page's record and opened there with the way back here. The next open step is
 * the current row (LEAD STAGES' grammar — where you left off); each row's one text button names the page it opens. Owners and Admins see it
 * while a step is open (Hide is theirs alone, with Undo), and once more when every step is done ("Your studio is set up" — 1.0's "Your studio
 * is live", with its first next step, a lead, while there is none); ⌘K's "Set up your studio" shows it as it stands.
 */
export function StudioSetupCard({ data, setFor }: { data: StudioSetupData; setFor: SetForYou }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const path = usePathname()
  const q = useSearchParams().toString()
  const here = q ? `${path}?${q}` : path
  const [hidden, setHidden] = useState(data.hidden)
  const [seenHidden, setSeenHidden] = useState(data.hidden)
  if (seenHidden !== data.hidden) { setSeenHidden(data.hidden); setHidden(data.hidden) }
  const [busy, setBusy] = useState(false)
  const total = data.rows.length
  const current = data.rows.find((r) => !r.done)?.key ?? null

  /* the list's own notes — once each, revalidating nothing: seen with a step open; then seen with every step done (it never shows by itself again) */
  useEffect(() => { if (data.firstSeen) void noteSetupSeen().catch(() => {}) }, [data.firstSeen])
  useEffect(() => { if (data.mode === 'done' && !data.finished) void noteStudioSetUp().catch(() => {}) }, [data.mode, data.finished])

  const open = (r: SetupRow) => leaveThen(() => router.push(`${withFrom(r.home.href, here)}${r.home.hash ? `#${r.home.hash}` : ''}`))
  const write = async (hide: boolean, undoing = false) => {
    if (busy) return
    setBusy(true)
    try {
      const r = hide ? await hideStudioSetup() : await showStudioSetup()
      if ('error' in r) { snackbar({ message: couldnt(hide ? 'hide the list' : 'show the list again', refusalOf(r.error)) }); return }
      setHidden(hide)
      if (hide) snackbar({ key: 'studio-setup', message: 'Set up your studio is hidden for you', actionLabel: 'Undo', onAction: () => { void write(false, true) } })
      else snackbar({ key: 'studio-setup', message: undoing ? 'Set up your studio is back' : 'Set up your studio shows here again' })
      router.refresh()
    } catch (e) { snackbar({ message: couldnt(hide ? 'hide the list' : 'show the list again', refusalOf(e)) }) } finally { setBusy(false) }
  }

  if (hidden && !data.asked) return null
  const done = data.mode === 'done'
  const help = done
    ? `Every quote, invoice and contract now prints your details, logo and bank details, and each page keeps its part.${data.asked || data.finished ? '' : ' This list won’t show again.'}`
    : 'What your quotes, invoices and contracts need, and the page that keeps each. A step ticks itself once its page has it.'
  return (
    <div className={s.setting} id="studio-setup" data-testid="studio-setup" data-mode={data.mode}>
      <div className={s.settingHeadRow}>
        <div className={s.settingHead}>
          <span className={s.settingTitle}>{done ? 'Your studio is set up' : 'Set up your studio'}</span>
          <span className={s.settingHelp}>{help}</span>
        </div>
        <span className={own.headEnd}>
          <span className={s.settingHelp} data-testid="studio-setup-count">{`${data.done} of ${total} done`}</span>
          {done
            ? (data.noLeads ? <Button onPress={() => leaveThen(() => router.push('/leads?new=1'))} data-testid="studio-setup-first-lead">Add your first lead</Button> : null)
            : hidden
              ? <Button appearance="text" isDisabled={busy} onPress={() => { void write(false) }} data-testid="studio-setup-show">Show here again</Button>
              : (
                <Tooltip label="Only for you — search “Set up your studio” to bring it back">
                  <Button appearance="text" isDisabled={busy} onPress={() => { void write(true) }} data-testid="studio-setup-hide">Hide</Button>
                </Tooltip>
              )}
        </span>
      </div>
      <div className={`${ov.body} ${own.list}`}>
        {SETUP_GROUPS.map((g) => {
          const rows = data.rows.filter((r) => r.group === g.key)
          return rows.length ? (
            <Fragment key={g.key}>
              <div className={ov.groupLabel} data-testid={`studio-setup-group-${g.key}`}><span className={ov.groupText}><span>{g.label}</span></span></div>
              <div className={ov.group}>
                {rows.map((r) => (
                  <Row key={r.key} two icon={r.done ? 'check_circle' : r.key === current ? 'radio_button_checked' : 'radio_button_unchecked'} iconFill={r.done}
                       state={r.done ? 'done' : r.key === current ? 'current' : 'future'} name={r.label} caption={r.line}
                       action={{ label: `Open ${r.home.page}`, onPress: () => open(r), testId: `studio-setup-open-${r.key}` }} testId={`studio-setup-step-${r.key}`} />
                ))}
              </div>
            </Fragment>
          ) : null
        })}
      </div>
      <p className={`${s.settingHelp} ${own.foot}`} data-testid="studio-setup-set">
        {'Already set for you: '}
        {setFor.invoice ? `invoices are numbered from ${setFor.invoice}, ` : ''}
        {setFor.stages === 'flexible' ? 'leads move to any stage' : 'leads move one stage at a time'}
        {setFor.approval === 'required' ? ' and a Designer’s quote waits for an OK before it goes out. ' : ' and quotes go straight to the client. '}
        {'Change them under '}<HelpLink href="/settings?section=finance#document-numbers">Finance</HelpLink>{', '}
        <HelpLink href="/settings?section=leads#lead-stages">Lead management</HelpLink>{' or '}
        <HelpLink href="/settings?section=quotes#quote-approval">Quotes & pricing</HelpLink>{'.'}
      </p>
    </div>
  )
}
