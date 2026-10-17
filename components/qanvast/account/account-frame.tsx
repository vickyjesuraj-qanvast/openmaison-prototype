'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import pageStyles from '@/app/leads/leads.module.css'
import leadsStyles from '@/components/qanvast/qanvast-leads.module.css'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
import { EmptyState } from '@/components/om/empty-state'
import { Tabs } from '@/components/om/tabs'
import { PageHeader } from '@/components/shell/page-header'
import { PageReveal } from '@/components/shell/page-reveal'
import { QANVAST_LEADS_HREF, QANVAST_TAB_ITEMS } from '@/components/qanvast/qanvast-tabs'
import { GATE_WORDS } from '@/lib/qanvast-account/policy'
import { SIGN_IN_NOTICE } from '@/lib/auth/model'
import { signInHref } from '@/lib/auth/paths'
import { SIMULATED_WORDS } from '@/lib/services/registry'
import styles from './account.module.css'

/**
 * (pending modules S41b-5 — 1.0's `deployment/qanvast` Qanvast Ops › Credits and Reviews & Rankings, the S41b sweep's M-04) The frame both tabs
 * share: Qanvast Ops' own header and tab strip (the Leads, Studios and Hangouts pages'), then the tab's views as the house Chips in the title's
 * place — each view its own address (1.0's: …/credits/transactions · …/credits/contracts · …/reviews/feedback; Ranking was a tab inside
 * Reviews) — and the view's tools at the right. Who may not see the studio's Qanvast account (1.0: the Owner only) meets the tab's gate in the
 * body, the strip still there; a Qanvast that doesn't answer is said, with Try again; the stand-in says it is one under the view.
 */
export function AccountFrame({ tab, views, view, tools, actions, ghost, state, children, testId }: {
  tab: 'credits' | 'reviews'
  views: readonly { value: string; label: string; href: string }[]
  view: string
  /** the view's own tools, at the bar's right */
  tools?: ReactNode
  /** the header's actions (Reviews' Request reviews) */
  actions?: ReactNode
  ghost: ReactNode
  state: { gate: true } | { gate: false; error?: string; standIn: boolean; /** Qanvast answered 401 (1.0: sign in again) */ expired?: boolean }
  children?: ReactNode
  testId: string
}) {
  const router = useRouter()
  const path = usePathname()
  /* the press shows at once; the address follows (and a view from the address wins once it lands) — the projects' view switch's rule */
  const [picked, setPicked] = useState(view)
  const [was, setWas] = useState(view)
  if (was !== view) { setWas(view); setPicked(view) }
  const tabHref = tab === 'credits' ? QANVAST_TAB_ITEMS[2]!.href : QANVAST_TAB_ITEMS[3]!.href
  const gate = state.gate ? GATE_WORDS[tab] : null
  const error = !state.gate ? state.error ?? null : null
  const expired = !state.gate && !!state.expired
  return (
    <PageReveal skeleton={ghost}>
      <div className={pageStyles.body} style={{ position: 'relative' }} data-testid={testId} data-view={view}>
        <PageHeader title="Qanvast Ops" scrollShadow={false} actions={gate || error ? undefined : actions} />
        <div className={leadsStyles.tabsHost}>
          <Tabs items={QANVAST_TAB_ITEMS} activeHref={tabHref} aria-label="Qanvast Ops sections" className={leadsStyles.stickyTabs} />
        </div>
        <div className={pageStyles.content}>
          {gate ? (
            <EmptyState icon="lock" tone="plain" testId="qanvast-account-gate" title={gate.title} help={gate.help} kb={false}
                        primary={{ label: 'Open Qanvast leads', onPress: () => router.push(QANVAST_LEADS_HREF), testId: 'qanvast-account-gate-leads' }} />
          ) : expired ? (
            /* 1.0's 401 → its login page with "Your Qanvast session expired"; here the one press, S30's sign-in with the reason and the way back */
            <EmptyState icon="lock" tone="plain" testId="qanvast-account-expired" title={SIGN_IN_NOTICE.qanvast.title} help={SIGN_IN_NOTICE.qanvast.line ?? ''} kb={false}
                        primary={{ label: 'Sign in again', onPress: () => router.push(signInHref({ reason: 'qanvast', next: path })), testId: 'qanvast-account-sign-in' }} />
          ) : error ? (
            <EmptyState icon="error" tone="plain" testId="qanvast-account-error" title={error} kb={false}
                        help="The studio’s credits and reviews are Qanvast’s — this page reads them from Qanvast each time it opens."
                        primary={{ label: 'Try again', onPress: () => router.refresh(), testId: 'qanvast-account-retry' }} />
          ) : (
            <>
              <div className={styles.bar} data-testid="qanvast-account-bar">
                <div className={styles.views}>
                  <ChipRail label={`${tab === 'credits' ? 'Lead credits' : 'Reviews'} views`} className={styles.rail}>
                    <Chips label={`${tab === 'credits' ? 'Lead credits' : 'Reviews'} views`} testId="qanvast-account-views" value={picked}
                           options={views.map((v) => ({ value: v.value, label: v.label }))}
                           onChange={(v) => { if (v === picked) return; setPicked(v); router.push(views.find((x) => x.value === v)!.href) }} />
                  </ChipRail>
                </div>
                {tools ? <div className={styles.tools}>{tools}</div> : null}
              </div>
              {children}
              {!state.gate && state.standIn ? <p className={styles.source} data-testid="qanvast-account-sample">{SIMULATED_WORDS.qanvastAccount}</p> : null}
            </>
          )}
        </div>
      </div>
    </PageReveal>
  )
}
