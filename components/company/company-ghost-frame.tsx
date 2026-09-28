'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { GhostSheet } from '@/components/shell/skeleton'
import { GhostHead, GhostHead2, GhostTabs, type Action } from '@/components/shell/ghost-kit'
import pageStyles from '@/app/leads/leads.module.css'

/**
 * (REG-708) The frame of every Company page's ghost, as CompanyShell draws the page: the L1 header — or, when the page was opened from
 * somewhere (`?from=`, an editor's Manage Templates), the L2 one with its Back — the section's tab strip, then the content. It reads
 * `from` itself, so the route's `loading.tsx` and the page's PageReveal draw the same header and the hand-over between them is invisible.
 */
export function CompanyGhostFrame({ title, actions = [], tabs, label = 'Loading company', children }: {
  /** The title's width. */
  title: number
  actions?: Action[]
  tabs?: readonly string[]
  label?: string
  children: ReactNode
}) {
  const scoped = !!useSearchParams().get('from')
  return (
    /* a level-1 page unless opened from somewhere (the L2 header): the phone's bar and dock stay while it loads (wave E, gallery-5) */
    <GhostSheet label={label} l1={!scoped}>
      {scoped ? <GhostHead2 crumb={112} title={title} actions={actions} /> : <GhostHead title={title} actions={actions} />}
      {tabs ? <GhostTabs labels={tabs} /> : null}
      <div className={pageStyles.content} aria-hidden>{children}</div>
    </GhostSheet>
  )
}
