'use client'

import { useState } from 'react'
import { PageReveal } from '@/components/shell/page-reveal'
import { SettingsSkeleton } from '@/components/shell/skeleton'
import { PageHeader } from '@/components/shell/page-header'
import { MaisonFab } from '@/components/shell/maison-fab'
import { ChoiceCard } from '@/components/om/choice-card'
import { Icon } from '@/components/om/icon'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { QUOTE_APPROVAL_OPTIONS, STAGE_MOVEMENT_OPTIONS, type QuoteApproval, type StageMovement } from '@/lib/settings/types'
import { setQuoteApproval, setStageMovement } from './actions'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './settings.module.css'

/** Modules that will live under Account setup (user 2026-08-29). Only Leads has settings in this build. */
const MODULES = [
  { key: 'leads', icon: 'people_alt', label: 'Leads' },
  { key: 'stages', icon: 'flag', label: 'Stages' },
  { key: 'quotes', icon: 'request_quote', label: 'Quotes' },
  { key: 'projects', icon: 'business_center', label: 'Projects' },
  { key: 'finance', icon: 'account_balance_wallet', label: 'Finance' },
]

export function SettingsView({ stageMovement, quoteApproval }: { stageMovement: StageMovement; quoteApproval: QuoteApproval }) {
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const [mode, setMode] = useState<StageMovement>(stageMovement)
  // The server value changed under us (another tab saved): follow it (render-phase adjust).
  const [seen, setSeen] = useState(stageMovement)
  if (seen !== stageMovement) { setSeen(stageMovement); setMode(stageMovement) }

  const [approval, setApproval] = useState<QuoteApproval>(quoteApproval)
  const [seenApproval, setSeenApproval] = useState(quoteApproval)
  if (seenApproval !== quoteApproval) { setSeenApproval(quoteApproval); setApproval(quoteApproval) }

  const chooseApproval = async (next: QuoteApproval) => {
    if (next === approval) return
    const prev = approval
    setApproval(next)   // optimistic, as Stage movement
    try {
      await setQuoteApproval(next)
      snackbar({ message: `Quote approval set to ${QUOTE_APPROVAL_OPTIONS.find((o) => o.key === next)?.title ?? next}` })
    } catch {
      setApproval(prev)
      snackbar({ message: 'Couldn’t save the setting — please try again' })
    }
  }

  const choose = async (next: StageMovement) => {
    if (next === mode) return
    const prev = mode
    setMode(next)   // optimistic — the cards answer at once, the studio setting follows
    try {
      await setStageMovement(next)
      snackbar({ message: `Stage movement set to ${STAGE_MOVEMENT_OPTIONS.find((o) => o.key === next)?.title ?? next}` })
    } catch {
      setMode(prev)
      snackbar({ message: 'Couldn’t save the setting — please try again' })
    }
  }

  return (
    <PageReveal skeleton={<SettingsSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeader title="Settings" />
        <div className={styles.content}>
          <nav className={styles.nav} aria-label="Settings sections">
            {MODULES.map((m) => (
              <button key={m.key} type="button" className={styles.tab} data-active={m.key === 'leads' || undefined}
                      aria-current={m.key === 'leads' ? 'page' : undefined}
                      onClick={m.key === 'leads' ? undefined : comingSoon}>
                <span className={styles.tabIcon}><Icon name={m.icon} size={20} weight={300} /></span>
                <span>{m.label}</span>
              </button>
            ))}
          </nav>
          <section className={styles.panel} aria-labelledby="settings-leads-title">
            <div className={styles.sectionHead}>
              <h2 id="settings-leads-title" className={styles.sectionTitle}>Leads</h2>
              <p className={styles.sectionHelp}>Applies to every lead in Demo Studio — the table, the kanban board and imports.</p>
            </div>
            <div className={styles.setting}>
              <div className={styles.settingHead}>
                <span className={styles.settingTitle}>Stage movement</span>
                <span className={styles.settingHelp}>How leads move from one stage to the next. On Hold and Lost always ask for a reason.</span>
              </div>
              <div className={styles.choices} role="radiogroup" aria-label="Stage movement">
                {STAGE_MOVEMENT_OPTIONS.map((o) => (
                  <ChoiceCard key={o.key} title={o.title} help={o.help} selected={mode === o.key} onSelect={() => { void choose(o.key) }} />
                ))}
              </div>
            </div>
            {/* Quote approval (user 2026-08-30): studios differ on whether a quote is reviewed internally before it
                reaches the client, so the quote's lifecycle — and every list of quote statuses — follows this. */}
            <div className={styles.setting}>
              <div className={styles.settingHead}>
                <span className={styles.settingTitle}>Quote approval</span>
                <span className={styles.settingHelp}>Whether a quote is reviewed inside the studio before it goes to the client. This sets the stages a quote moves through.</span>
              </div>
              <div className={styles.choices} role="radiogroup" aria-label="Quote approval">
                {QUOTE_APPROVAL_OPTIONS.map((o) => (
                  <ChoiceCard key={o.key} title={o.title} help={o.help} selected={approval === o.key} onSelect={() => { void chooseApproval(o.key) }} />
                ))}
              </div>
            </div>
          </section>
        </div>
        <MaisonFab onPress={comingSoon} />
      </div>
    </PageReveal>
  )
}
