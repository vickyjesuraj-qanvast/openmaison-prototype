'use client'

import { CompanyShell, templateTabs } from '@/components/company/company-shell'
import { ProLocked } from '@/components/credits/pro-tag'
import { ProLockedGhost } from '@/components/credits/pro-locked-ghost'

/**
 * (pending modules S19 — 1.0's plan gating: the template editor is Pro — "a Free studio's template lists show only the built-in templates";
 * authoring and choosing locked) Company › Templates › Quotes on a Free studio: the Templates frame and its tabs as always (Contracts,
 * Tasks, T&Cs & Notes and Payments are every plan's), and in the Quotes tab the lock — the studio's templates are kept, and its quotes
 * keep printing as they do.
 */
export function QuoteTemplatesLocked({ count, from }: { count: number; from?: string }) {
  return (
    <CompanyShell title="Templates" tabs={templateTabs()} from={from} skeleton={<ProLockedGhost feature="template_editor" />}>
      <ProLocked feature="template_editor" kept={count ? `Your ${count} quote ${count === 1 ? 'template is' : 'templates are'} kept and your quotes print as they do` : 'Your quotes print with the studio’s default'} testId="templates-locked" />
    </CompanyShell>
  )
}
