'use client'

import { useRef, useState } from 'react'
import { MaisonFab } from '@/components/shell/maison-fab'
import { MaisonAiSheet } from '@/components/shell/maison-ai'
import { openPlans, useCredits } from '@/components/credits/credits-client'
import { comesWithPro, FEATURE_WORDS } from '@/lib/credits/features'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { ProLocked } from '@/components/credits/pro-tag'
import { ProLockedGhost } from '@/components/credits/pro-locked-ghost'
import { fromLabel } from '@/lib/nav'
import { GhostSheet } from '@/components/shell/skeleton'
import { GhostHead2 } from '@/components/shell/ghost-kit'
import pageStyles from '@/app/leads/leads.module.css'
import styles from '@/components/xray/xray-result.module.css'

/**
 * (pending modules S19 — 1.0's plan gating: the template editor is Pro) A quote template opened while the studio is on Free — from ⌘K, a
 * quote's Edit template, Settings › New quotes start with: Back to where it was opened from (REG-465), the template's name, and the lock. The
 * template is kept; the quotes on it keep printing through it.
 */
export function TemplateLocked({ name, from }: { name: string; from: string | null | undefined }) {
  const back = from ?? '/company/templates/quotes'
  const crumb = from ? fromLabel(from) ?? 'Templates' : 'Templates'
  /* (S42 D-17) every editor carries Maison AI — the locked one too, where "what does Pro add?" is the question: answered from the lock's own
     words, with Plans a press away for the Owner, and "Which plan fits us?" asked of the plan record (the Ask box's own answer).
     *(invented copy: the answer's text)* */
  const credits = useCredits(null)
  const may = !!credits?.viewer.canChangePlan
  const owner = credits?.owner.name ?? 'the Owner'
  const [aiOpen, setAiOpen] = useState(false)
  const aiFabRef = useRef<HTMLSpanElement>(null)
  const maison: MaisonSuggestion[] = [
    { label: 'What do our own quote templates add?', answer: () => Promise.resolve({ title: comesWithPro('template_editor'),
      text: `${FEATURE_WORDS.template_editor.what} On Free every quote prints with the studio’s default; this template is kept, and the quotes on it print as they do.${may ? '' : ` Only ${owner} changes the plan.`}`,
      rows: may ? [{ id: 'plans', label: 'See plans', run: openPlans }] : [] }) },
    'Which plan fits us?',
  ]
  return (
    <PageReveal skeleton={<TemplateLockedGhost />}>
      <div className={pageStyles.body}>
        <PageHeaderL2 backHref={back} crumbs={[{ label: crumb, href: back }]} title={name} />
        <div className={styles.column}>
          <div data-testid="template-locked"><ProLocked feature="template_editor" kept="This template is kept and the quotes on it print as they do" testId="template-locked-panel" /></div>
        </div>
      </div>
      <MaisonAiSheet open={aiOpen} suggestions={maison} onClose={() => setAiOpen(false)} anchorRef={aiFabRef} />
      <span ref={aiFabRef} style={{ display: 'contents' }}><MaisonFab onPress={() => setAiOpen((o) => !o)} /></span>
    </PageReveal>
  )
}

/** Its ghost (REG-708): the L2 header — Back, the crumb, the template's name — over the lock. */
export function TemplateLockedGhost() {
  return (
    <GhostSheet label="Loading the template">
      <GhostHead2 crumb={72} title={220} />
      <div className={styles.column}><ProLockedGhost feature="template_editor" kept="This template is kept and the quotes on it print as they do" /></div>
    </GhostSheet>
  )
}
