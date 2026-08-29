'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'motion/react'
import { Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ScrollPagers } from '@/components/om/scroll-pagers'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { STAGES, INACTIVE_STAGES, type Stage } from '@/lib/leads/enums'
import { isOverdue, moneySGD, relativeTime } from '@/lib/format'
import { spring } from '@/lib/motion'
import { highlightMatch } from '@/components/leads/highlight'
import type { LeadRow } from '@/lib/leads/queries'
import styles from './board.module.css'

type Band = { tone: 'green' | 'yellow'; label: string; stages: readonly Stage[] }
const BANDS: Band[] = [
  { tone: 'green', label: 'ACTIVE', stages: STAGES },
  { tone: 'yellow', label: 'INACTIVE', stages: INACTIVE_STAGES },
]

export type PendingDrop = { leadId: string; stage: Stage } | null

const COLUMN_STEP = 328    // column 320 + 8 gap — pagers move by whole columns
const EDGE_ZONE = 72       // px from a scroll edge where auto-scroll kicks in
const MAX_SCROLL_STEP = 18 // px per frame at the very edge

function KanbanCard({
  lead, now, query, onKebabDelete, onAssign, onDragToStage, boardRef, onNameClick, onTaskClick, pendingDrop, canDrop, onDropBlocked,
}: {
  lead: LeadRow
  now: number
  query: string
  onKebabDelete: (lead: LeadRow) => void
  onAssign: (lead: LeadRow, anchor: HTMLElement) => void
  onDragToStage: (lead: LeadRow, stage: Stage) => void
  /** Linear stage movement: columns this lead may not be dropped in are dimmed while it is lifted, and a drop there springs back. */
  canDrop?: (lead: LeadRow, stage: Stage) => boolean
  onDropBlocked?: (lead: LeadRow, stage: Stage) => void
  boardRef: React.RefObject<HTMLDivElement | null>
  onNameClick: (lead: LeadRow) => void
  /** Task box → the tasks popover, anchored to the box (same as the table's TASKS cell). */
  onTaskClick: (lead: LeadRow, anchor: HTMLElement) => void
  /** A drop that is waiting on the move-stage flow: the card stays where it was dropped, dimmed. */
  pendingDrop: PendingDrop
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [lifted, setLifted] = useState(false)   // the card's slot placeholder while its ghost is out
  const cardEl = useRef<HTMLDivElement>(null)
  const firstTask = lead.tasks[0]
  const overdue = lead.tasks.some((t) => isOverdue(t.dueAt, now))
  const extra = lead.tasks.length - 1

  // ---- Drag: a fixed ghost clone follows the pointer (pointer events + capture), the real card stays in
  // flow as a dimmed placeholder. No motion `drag` — its layout projection fought the scrolling board.
  const drag = useRef<{ ghost: HTMLElement; startX: number; startY: number; left: number; top: number; pointerId: number; active: boolean; held: boolean } | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const raf = useRef<number | null>(null)
  const dragged = useRef(false)   // swallow the click that trails a drag
  const isPending = pendingDrop?.leadId === lead.id
  const wasPending = useRef(false)

  const findDropStage = (x: number, y: number): Stage | null => {
    const root = boardRef.current
    if (!root) return null
    for (const col of Array.from(root.querySelectorAll<HTMLElement>('[data-stage]'))) {
      const r = col.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return col.dataset.stage as Stage
    }
    return null
  }
  const highlight = (stage: Stage | null, clear = false) => {
    boardRef.current?.querySelectorAll<HTMLElement>('[data-stage]').forEach((col) => {
      const s = col.dataset.stage as Stage
      const blocked = !clear && s !== lead.stage && !!canDrop && !canDrop(lead, s)
      col.dataset.drop = blocked ? 'blocked' : !clear && s === stage && s !== lead.stage ? 'true' : 'false'
    })
  }
  const placeGhost = (dx: number, dy: number, scale = 1.03) => {
    const d = drag.current
    if (d) d.ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
  }
  const removeGhost = () => {
    drag.current?.ghost.remove()
    drag.current = null
    setLifted(false)
  }
  const stopAutoScroll = () => { if (raf.current !== null) { cancelAnimationFrame(raf.current); raf.current = null } }
  // Auto-scroll the board (horizontal) and the hovered column (vertical) while the pointer sits near an edge.
  const autoScroll = () => {
    const root = boardRef.current
    if (!root || !drag.current) return
    const { x: px, y: py } = pointer.current
    const b = root.getBoundingClientRect()
    const ease = (dist: number) => Math.round(MAX_SCROLL_STEP * Math.min(1, Math.max(0, (EDGE_ZONE - dist) / EDGE_ZONE)))
    if (px > b.right - EDGE_ZONE) root.scrollLeft += ease(b.right - px)
    else if (px < b.left + EDGE_ZONE) root.scrollLeft -= ease(px - b.left)
    const stage = findDropStage(px, py)
    highlight(stage)
    const body = stage ? root.querySelector<HTMLElement>(`[data-stage="${stage}"] [data-col-body]`) : null
    if (body) {
      const r = body.getBoundingClientRect()
      if (py > r.bottom - EDGE_ZONE) body.scrollTop += ease(r.bottom - py)
      else if (py < r.top + EDGE_ZONE) body.scrollTop -= ease(py - r.top)
    }
    raf.current = requestAnimationFrame(autoScroll)
  }
  /** Spring the ghost back onto the real card's slot — measured live, so it is right even after auto-scroll — then remove it. */
  const springBack = () => {
    const d = drag.current, el = cardEl.current
    if (!d) return
    d.active = false
    const from = { x: pointer.current.x - d.startX, y: pointer.current.y - d.startY }
    const to = el ? { x: el.getBoundingClientRect().left - d.left, y: el.getBoundingClientRect().top - d.top } : { x: 0, y: 0 }
    const m = d.ghost.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/)
    if (m) { from.x = parseFloat(m[1] ?? '0'); from.y = parseFloat(m[2] ?? '0') }
    void animate(0, 1, { ...spring.settle, onUpdate: (t) => placeGhost(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 1.03 - 0.03 * t) }).then(removeGhost)
  }
  const endDrag = (cancelled: boolean) => {
    const d = drag.current
    if (!d || !d.active) return
    stopAutoScroll()
    delete document.documentElement.dataset.dragging
    highlight(null, true)
    d.active = false
    const target = cancelled ? null : findDropStage(pointer.current.x, pointer.current.y)
    if (target && target !== lead.stage && canDrop && !canDrop(lead, target)) {
      onDropBlocked?.(lead, target)
      springBack()
    } else if (target && target !== lead.stage) {
      // Valid drop: the ghost holds the drop point, dimmed, while the stage flow captures the outcome.
      d.held = true
      d.ghost.dataset.pending = 'true'
      onDragToStage(lead, target)
    } else springBack()
  }
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || drag.current) return
    const control = (e.target as HTMLElement).closest('button, input, [role="menu"]')
    if (control && !control.hasAttribute('data-drag-ok')) return   // kebab / Assign / menus don't lift the card; the task box does (a still click opens tasks)
    const el = cardEl.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const ghost = el.cloneNode(true) as HTMLElement
    ghost.removeAttribute('id'); ghost.removeAttribute('data-lifted')
    ghost.classList.add(styles.ghost ?? '')
    Object.assign(ghost.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, margin: '0', zIndex: '60', pointerEvents: 'none', display: 'none' })
    document.body.appendChild(ghost)
    drag.current = { ghost, startX: e.clientX, startY: e.clientY, left: r.left, top: r.top, pointerId: e.pointerId, active: false, held: false }
    pointer.current = { x: e.clientX, y: e.clientY }
    // No pointer capture yet: capturing here would re-target a plain click (name / card) to the card element.
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    pointer.current = { x: e.clientX, y: e.clientY }
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return   // click, not a drag
      d.active = true
      cardEl.current?.setPointerCapture(e.pointerId)   // only a real drag captures the pointer
      d.ghost.style.display = ''
      setLifted(true)
      document.documentElement.dataset.dragging = 'true'
      highlight(null)   // dims the columns this lead can't reach yet (linear movement)
      stopAutoScroll(); raf.current = requestAnimationFrame(autoScroll)
    }
    placeGhost(e.clientX - d.startX, e.clientY - d.startY)
    highlight(findDropStage(e.clientX, e.clientY))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    if (!d.active) { removeGhost(); return }   // plain click
    dragged.current = true
    setTimeout(() => { dragged.current = false }, 0)   // the trailing click (if any) fires in this same task
    endDrag(false)
  }
  // Pointer capture is released after every pointerup, so this also fires after a normal drop — a held ghost must survive it.
  const onPointerCancel = () => { const d = drag.current; if (!d) return; if (d.active) endDrag(true); else if (!d.held) removeGhost() }
  // Esc mid-drag cancels; the move-stage flow being dismissed springs the held ghost back; unmount cleans up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && drag.current?.active) { e.preventDefault(); e.stopPropagation(); endDrag(true) } }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); stopAutoScroll(); drag.current?.ghost.remove(); drag.current = null; delete document.documentElement.dataset.dragging }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are stable per card
  }, [])
  useEffect(() => {
    if (wasPending.current && !isPending && drag.current) springBack()
    wasPending.current = isPending
    // eslint-disable-next-line react-hooks/exhaustive-deps -- springBack is stable per card
  }, [isPending])

  return (
    <motion.div
      ref={cardEl}
      layoutId={lead.id}
      className={styles.card}
      data-lifted={lifted || undefined}
      transition={spring.settle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
      onClickCapture={(e) => { if (dragged.current) { dragged.current = false; e.preventDefault(); e.stopPropagation() } }}
    >
      <div className={styles.cardHead}>
        <span className={styles.cardName} role="link" tabIndex={0}
              onClick={() => onNameClick(lead)}
              onKeyDown={(e) => e.key === 'Enter' && onNameClick(lead)}
              style={{ cursor: 'pointer' }}>
          {highlightMatch(lead.name, query)}
        </span>
        <span className={styles.cardMetaRight}>
          <span className={styles.cardAgo}>{relativeTime(lead.updatedAt, new Date(now))}</span>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Tooltip label="More actions" disabled={menuOpen}>
              <button type="button" className={styles.cardKebab} aria-label={`More actions for ${lead.name}`}
                      onClick={() => setMenuOpen((o) => !o)}>
                <Icon name="more_vert" size={20} weight={300} />
              </button>
            </Tooltip>
            <Dropdown open={menuOpen} onClose={() => setMenuOpen(false)} align="right">
              <DropdownItem onSelect={() => { setMenuOpen(false); onKebabDelete(lead) }}>
                <span style={{ color: 'var(--om-color-tertiary-red-default)' }}>Delete</span>
              </DropdownItem>
            </Dropdown>
          </span>
        </span>
      </div>
      <div className={styles.cardMeta}>
        <span>{lead.phone}</span><span>·</span>
        <span>{moneySGD(lead.budgetMinor)}</span><span>·</span>
        <span>{lead.source}</span>
      </div>
      {firstTask ? (
        <button type="button" className={styles.cardTask} aria-label={`Tasks for ${lead.name}`} data-drag-ok
                onClick={(e) => onTaskClick(lead, e.currentTarget)}>
          <span className={styles.cardTaskText}>{firstTask.title}</span>
          {overdue ? <Tag color="red" appearance="outlined">Overdue</Tag> : null}
          {extra > 0 ? <Tag appearance="outlined">{`+${extra}`}</Tag> : null}
        </button>
      ) : null}
      <div className={styles.cardDivider} />
      <div className={styles.cardFoot}>
        {lead.assignees.length === 0 ? (
          <button type="button" className={styles.assignLink} onClick={(e) => onAssign(lead, e.currentTarget)}>
            <Icon name="person_add" size={20} />
            Assign
          </button>
        ) : (
          <>
            {lead.assignees.slice(0, 2).map((m) => (
              <Avatar key={m.id} name={m.name} color={m.color} size={24} />
            ))}
            <Tooltip label="Assign members">
              <IconButton icon="person_add" label={`Assign members to ${lead.name}`} size={24} variant="primary"
                          onClick={(e) => onAssign(lead, e.currentTarget)} />
            </Tooltip>
          </>
        )}
      </div>
    </motion.div>
  )
}

export function KanbanBoard({
  rows, query, now, stageScope = null, filtering = false, onClearSearch, onKebabDelete, onAssign, onDragToStage, onNameClick, onTaskClick, pendingDrop = null, canDrop, onDropBlocked,
}: {
  rows: LeadRow[]
  query: string
  now: number
  /** Pill scope (780:20043): only this stage's column and its band render. */
  stageScope?: Stage | null
  /** Filters modal has active groups: empty columns show the no-results block, not the drop hint. */
  filtering?: boolean
  onClearSearch: () => void
  onKebabDelete: (lead: LeadRow) => void
  onAssign: (lead: LeadRow, anchor: HTMLElement) => void
  onDragToStage: (lead: LeadRow, stage: Stage) => void
  /** Linear stage movement: columns this lead may not be dropped in are dimmed while it is lifted, and a drop there springs back. */
  canDrop?: (lead: LeadRow, stage: Stage) => boolean
  onDropBlocked?: (lead: LeadRow, stage: Stage) => void
  onNameClick: (lead: LeadRow) => void
  onTaskClick: (lead: LeadRow, anchor: HTMLElement) => void
  /** Drop awaiting the move-stage flow (see KanbanCard). */
  pendingDrop?: PendingDrop
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const boardRef = useRef<HTMLDivElement>(null)
  const allByStage = new Map<Stage, LeadRow[]>()
  for (const band of BANDS) for (const s of band.stages) allByStage.set(s, [])
  for (const r of rows) allByStage.get(r.stage as Stage)?.push(r)

  const searching = query.trim().length > 0 || filtering

  return (
    <div className={styles.boardWrap}>
    <motion.div ref={boardRef} className={styles.board} layoutScroll>
      {BANDS.filter((b) => !stageScope || b.stages.includes(stageScope))
        .map((b) => (stageScope ? { ...b, stages: [stageScope] as readonly Stage[] } : b))
        .map((band) => {
        const isCollapsed = !stageScope && !!collapsed[band.label]
        return isCollapsed ? (
          <button key={band.label} type="button" className={styles.rail} data-tone={band.tone}
                  aria-expanded={false}
                  onClick={() => setCollapsed((c) => ({ ...c, [band.label]: false }))}>
            <Icon name="left_panel_open" size={20} weight={300} />
            <span className={styles.railLabel}><span className={styles.railDot} />{band.label}</span>
          </button>
        ) : (
          <div key={band.label} style={{ display: 'flex', gap: 8, minHeight: 0 }}>
            <button type="button" className={styles.rail} data-tone={band.tone}
                    aria-expanded
                    onClick={() => setCollapsed((c) => ({ ...c, [band.label]: true }))}>
              <Icon name="left_panel_close" size={20} weight={300} />
              <span className={styles.railLabel}><span className={styles.railDot} />{band.label}</span>
            </button>
            {band.stages.map((stage, i) => {
              const leads = allByStage.get(stage) ?? []
              const total = rows.filter((r) => r.stage === stage).length
              return (
                <motion.div key={stage} className={styles.column} data-tone={band.tone} data-stage={stage}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { delay: 0.03 * i, duration: 0.18 } }}>
                  <div className={styles.colHead}>
                    <span className={styles.colName}>{stage}</span>
                    <span className={styles.colCount}>{total}</span>
                  </div>
                  <motion.div className={styles.colBody} data-col-body layoutScroll>
                    <AnimatePresence mode="popLayout">
                      {leads.map((lead) => (
                        <KanbanCard key={lead.id} lead={lead} now={now} query={query} boardRef={boardRef}
                                    onKebabDelete={onKebabDelete} onAssign={onAssign}
                                    onDragToStage={onDragToStage} onNameClick={onNameClick} onTaskClick={onTaskClick} pendingDrop={pendingDrop}
                                    canDrop={canDrop} onDropBlocked={onDropBlocked} />
                      ))}
                    </AnimatePresence>
                    {leads.length === 0 ? (
                      searching ? (
                        <div className={styles.noResults}>
                          <span className={styles.noResultsTitle}>No results found</span>
                          <span className={styles.noResultsSub}>{query.trim() ? 'Check your spelling and try again.' : 'No leads match this filter.'}</span>
                          <button type="button" className={styles.clearLink} onClick={onClearSearch}>Clear All</button>
                        </div>
                      ) : (
                        <div className={styles.dropHint}>Drag a lead here</div>
                      )
                    ) : null}
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        )
      })}
    </motion.div>
    {/* Edge pagers (user 2026-08-29): mouse users page the board by whole columns. */}
    <ScrollPagers scrollRef={boardRef} fades={false} step={(w) => Math.max(COLUMN_STEP, Math.floor((w * 0.7) / COLUMN_STEP) * COLUMN_STEP)} labels={['Scroll columns left', 'Scroll columns right']} />
    </div>
  )
}
