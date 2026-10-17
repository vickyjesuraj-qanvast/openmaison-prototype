'use client'

import { useRef, useState } from 'react'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import type { AskLinks } from '@/lib/projects/client-asks-model'
import styles from './thread.module.css'

/**
 * (simplify S-22, her "build everything" 2026-10-09) The client asks — one piece for every client message, ticket and floor-plan mark: a ⋮
 * (the house menu, a bottom sheet on a phone) with **Reply** · **Make a task** · **Raise a variation order**. Made once, a row opens what it
 * made: *Open the task* · *Open VO-n*. The caller does the work (the client's words carried over, the source linked back — lib/projects/
 * client-asks.ts; the mark's own actions); a handler left out drops its row, and Raise a variation order is offered only to who sees the
 * project's money (`money`) — an order already raised stays one press away for whoever may open it.
 */
export function AskMenu({ label, links, money = false, busy = false, onReply, onTask, onVariation, ids = {}, testId = 'ask-menu' }: {
  /** whose ask, for the button's name: "Benjamin’s message", "T-2026-004", "the mark" */
  label: string
  links: AskLinks
  money?: boolean
  busy?: boolean
  onReply?: () => void
  onTask?: () => void
  onVariation?: () => void
  /** the rows' test ids (the floor plan keeps its own: plan-mark-task · plan-mark-vo) */
  ids?: { reply?: string; task?: string; vo?: string }
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const go = (fn?: () => void) => { setOpen(false); fn?.() }
  const showVo = !!onVariation && (!!links.vo || money)
  if (!onReply && !onTask && !showVo) return null
  return (
    <span ref={anchor} className={styles.kebabWrap}>
      <Tooltip label={`Actions for ${label}`} disabled={open}>
        <IconButton icon="more_vert" label={`Actions for ${label}`} size={24} variant="bare" iconSize={24} className={styles.kebabBtn}
                    aria-haspopup="menu" aria-expanded={open} disabled={busy} onClick={() => setOpen((o) => !o)} data-testid={testId} />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={label}>
        {onReply ? <DropdownItem onSelect={() => go(onReply)}><span data-testid={ids.reply ?? 'ask-reply'}>Reply</span></DropdownItem> : null}
        {onTask ? <DropdownItem onSelect={() => go(onTask)}><span data-testid={ids.task ?? 'ask-task'}>{links.task ? 'Open the task' : 'Make a task'}</span></DropdownItem> : null}
        {showVo ? <DropdownItem onSelect={() => go(onVariation)}><span data-testid={ids.vo ?? 'ask-vo'}>{links.vo ? `Open ${links.vo.number}` : 'Raise a variation order'}</span></DropdownItem> : null}
      </PortalMenu>
    </span>
  )
}
