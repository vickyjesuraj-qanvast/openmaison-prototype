'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ds'
import { Drawer, DrawerAction } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { leaveThen } from '@/components/company/leave-guard'
import { useRouter } from 'next/navigation'
import type { InboxRow } from '@/lib/dashboard/inbox'
import styles from './inbox.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — his P-05 "Review in a pane, without leaving" · lane D2) The record beside the list: the house Drawer
 * (480, the panel that carries its own pictures and answers) at 768 and up, the house sheet on a phone (the Drawer's own ≤767 branch, REG-353).
 * Its facts and pictures, then its two answers — the approval as the pane's ONE filled button (his note: a decision surface may hold one) and
 * the way back (Send back · Decline) outlined beside it, both through the tab's own actions. The list keeps its place behind it; ↑ · ↓ in the
 * head (K · J) step to the previous · next row that has a pane, and an answer that lands moves the pane on by itself (Needs you follows its
 * rows). A kind with no pane never opens one: its Review is its door.
 */
export function ReviewPane({ row, busy, onClose, onApprove, onBack, onStep, canStep }: {
  row: InboxRow | null
  busy: boolean
  onClose: () => void
  onApprove: (row: InboxRow) => void
  onBack: (row: InboxRow) => void
  onStep: (d: 1 | -1) => void
  canStep: { prev: boolean; next: boolean }
}) {
  const router = useRouter()
  const r = row?.review ?? null
  const go = (href: string) => leaveThen(() => router.push(href))
  /* J / K inside the pane step it (the page's own J / K walk the list — the house key layer leaves a dialog's keys to it) */
  const open = !!row && !!r
  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return
      const t = e.target instanceof Element ? e.target : null
      if (!t || t.closest('input, textarea, select, [contenteditable="true"]')) return
      if (!t.closest('[role="dialog"]')?.querySelector('[data-testid="review-pane"]')) return
      if (e.key === 'j' && canStep.next) { e.preventDefault(); onStep(1) }
      else if (e.key === 'k' && canStep.prev) { e.preventDefault(); onStep(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, canStep.next, canStep.prev, onStep])
  const footer = r ? (
    <>
      {r.back ? (
        <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => row && onBack(row)} data-testid="review-back">{r.back.label}</Button>
      ) : null}
      {r.approve ? (
        <Button isDisabled={busy} onPress={() => { if (!row || !r.approve) return; if (r.approve.href) go(r.approve.href); else onApprove(row) }} data-testid="review-approve">{busy ? `${r.approve.label}…` : r.approve.label}</Button>
      ) : null}
    </>
  ) : undefined
  return (
    <Drawer open={!!row && !!r} title={r?.title ?? ''} width="wide" onClose={onClose} label={r ? `Review — ${r.title}` : undefined} footer={footer}
            actions={r ? (
              <>
                {canStep.prev || canStep.next ? (
                  <>
                    <DrawerAction icon="keyboard_arrow_up" label="Previous · K" onClick={() => canStep.prev && onStep(-1)} />
                    <DrawerAction icon="keyboard_arrow_down" label="Next · J" onClick={() => canStep.next && onStep(1)} />
                  </>
                ) : null}
                <DrawerAction icon="open_in_new" label="Open it in its place" onClick={() => go(r.open)} />
              </>
            ) : null}>
      {r ? (
        <div className={styles.pane} data-testid="review-pane" data-review={row?.key}>
          {r.photos?.length ? (
            <div className={styles.panePhotos} data-count={r.photos.length}>
              {r.photos.slice(0, 4).map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.src + i} src={p.src} alt={p.alt} className={i === 0 ? styles.paneLead : styles.paneThumb} loading="lazy" />
              ))}
            </div>
          ) : null}
          <div className={styles.paneHead}>
            <span className={styles.paneGlyph} aria-hidden><Icon name={r.icon} size={20} weight={300} /></span>
            <div className={styles.paneWords}>
              <h3 className={styles.paneTitle}>{r.heading}</h3>
              {r.byline ? <p className={styles.paneBy}>{r.byline}</p> : null}
            </div>
          </div>
          {r.body ? <p className={styles.paneBody}>{r.body}</p> : null}
          {r.facts.length ? (
            <dl className={styles.facts}>
              {r.facts.map((f) => (
                <div key={f.label} className={styles.fact}><dt>{f.label}</dt><dd>{f.value}</dd></div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}
