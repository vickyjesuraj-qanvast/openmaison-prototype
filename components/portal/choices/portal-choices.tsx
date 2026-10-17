'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal, GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { refusalOf } from '@/components/leads/tasks/use-run'
import { answerChoice, chooseOption } from '@/app/portal/choices-actions'
import type { ChoiceAnswer } from '@/lib/projects/decline'
import type { PortalData } from '@/lib/portal/home'
import type { PortalChoicesHome } from '@/lib/projects/choices'
import { PortalFrame } from '../portal-frame'
import { couldntSay, usePortalSay } from '../use-portal-say'
import { PortalChoicesGhost } from '../portal-ghosts'
import { ChoiceBoard } from './choice-board'
import portal from '../portal.module.css'
import styles from './choices.module.css'

/** Brings a choice into view and pulses it once — the one What needs you opened (`?open=`). */
function pulse(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-choice-id="${CSS.escape(id)}"]`)
  if (!el) return
  el.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  el.removeAttribute('data-fresh'); void el.offsetWidth; el.setAttribute('data-fresh', '')
  window.setTimeout(() => el.removeAttribute('data-fresh'), 1500)
}

/**
 * (Projects round 8) The portal's **Choices** (the portal's tabs list, Home · … · Choices · Files): what the studio put to the client — what
 * waits for them first (the order of their needed-by days), then what was chosen. One card per choice (choice-board.tsx); a pick saves on
 * the server through `chooseOption`, refused there when the choice was taken back, is chosen already, or the portal is paused — and in the
 * studio's preview, which records nothing. One block per home when the client has more than one project.
 */
export function PortalChoicesView({ data, homes }: { data: PortalData; homes: PortalChoicesHome[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snack = useSnackbar()
  const say = usePortalSay(data.slug)
  const { visitor } = data
  const all = homes.flatMap((h) => h.choices)
  const open = params.get('open')
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => pulse(open), GHOST_MIN_MS + 150)
    router.replace(pathname, { scroll: false })
    return () => window.clearTimeout(t)
  }, [open, pathname, router])
  const confirm = async (selectionId: string, optionId: string, note: string) => {
    try {
      const r = await chooseOption(data.slug, { selectionId, optionId, note })
      if ('error' in r) {
        /* the studio's name keeps its capital ("Couldn’t save your choice — Demo Studio’s portal is paused") */
        const why = refusalOf(r.error)
        say(couldntSay('save your choice', why, data.look.studio), r.error)
        router.refresh(); return false
      }
      snack({ message: `Thank you — ${data.look.studio} has your choice: ${r.chosen}` })
      router.refresh()
      return true
    } catch {
      snack({ message: 'Couldn’t save your choice — please try again' })
      return false
    }
  }
  /* (gaps build D, item 2 — M-07) the client's no: their answer and why, refused on the server as a pick is */
  const answer = async (selectionId: string, kind: ChoiceAnswer, note: string) => {
    try {
      const r = await answerChoice(data.slug, { selectionId, kind, note })
      if ('error' in r) { say(couldntSay('send your answer', refusalOf(r.error), data.look.studio), r.error); router.refresh(); return false }
      snack({ message: `Thank you — ${data.look.studio} has your answer` })
      router.refresh()
      return true
    } catch {
      snack({ message: 'Couldn’t send your answer — please try again' })
      return false
    }
  }
  const homeLabel = (h: PortalChoicesHome) => { const home = data.homes.find((x) => x.id === h.homeId); return home ? (home.place ? `Your home at ${home.place}` : home.title) : '' }
  const waiting = all.filter((c) => c.status === 'shared').length
  return (
    <PageReveal skeleton={<PortalChoicesGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="choices" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={portal.hello}>
          {/* (fix-F, F-30 · F-31) the tab's own word, as Schedule · Updates · Money head; no lede over an empty page, and "Pick" — a desk taps nothing */}
          <h1 className={portal.h1}>Choices</h1>
          {all.length ? <p className={portal.lede}>{waiting ? `${waiting === 1 ? 'One choice waits' : `${waiting} choices wait`} for you. Pick the one you like, then confirm.` : all.some((c) => c.status === 'chosen') ? `What you chose with ${data.look.studio}.` : `${data.look.studio} has your answers.`}</p> : null}   {/* (gaps build D, item 2) only a no on the page: no "you chose" */}
        </div>
        {!all.length ? (
          <EmptyState icon="palette" tone="plain" title="Nothing to choose yet" testId="portal-choices-empty"
                      help="When your designer puts options to you — paint colours, a countertop, the tiles — you choose them here." />
        ) : homes.filter((h) => h.choices.length).map((h) => {
          const open = h.choices.filter((c) => c.status === 'shared'), done = h.choices.filter((c) => c.status === 'chosen'), back = h.choices.filter((c) => c.status === 'declined')
          return (
            <div key={h.homeId} className={styles.list} data-testid="portal-choices">
              {homes.filter((x) => x.choices.length).length > 1 ? <h2 className={portal.h2}>{homeLabel(h)}</h2> : null}
              {open.length ? <h2 className={styles.sectionHead}>Waiting for you</h2> : null}
              {open.map((c) => <ChoiceBoard key={c.id} choice={c} mode={visitor.preview ? 'preview' : 'client'} now={data.now} onConfirm={(o, n) => confirm(c.id, o, n)} onAnswer={(k, n) => answer(c.id, k, n)} />)}
              {back.length ? <h2 className={styles.sectionHead}>With your designer</h2> : null}
              {back.map((c) => <ChoiceBoard key={c.id} choice={c} mode={visitor.preview ? 'preview' : 'client'} now={data.now} contact={data.contact} clientName={visitor.first} />)}
              {done.length ? <h2 className={styles.sectionHead}>Chosen</h2> : null}
              {done.map((c) => <ChoiceBoard key={c.id} choice={c} mode={visitor.preview ? 'preview' : 'client'} now={data.now} contact={data.contact} clientName={visitor.first} />)}
            </div>
          )
        })}
      </PortalFrame>
    </PageReveal>
  )
}
