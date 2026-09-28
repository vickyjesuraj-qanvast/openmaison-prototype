'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion } from 'motion/react'
import { Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ScrollPagers } from '@/components/om/scroll-pagers'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { menuSideFor } from '@/components/leads/menu-side'
import { STAGES, INACTIVE_STAGES, type Stage } from '@/lib/leads/enums'
import { displayDate, isOverdue, moneySGD, relativeTime } from '@/lib/format'
import { spring } from '@/lib/motion'
import { highlightMatch, highlightPhone } from '@/components/leads/highlight'
import type { LeadRow } from '@/lib/leads/queries'
import { canReturnLead } from '@/lib/leads/stage-policy'
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
/*
 * How many assignee avatars the card foot shows. The mock's card draws one or two, and the second was read as
 * a cap (REG-195) — but nothing on the card enforces it: the foot is the card's content box less the trailing
 * 24px Assign button and its gap, divided by an avatar + gap. The 288px mock card leaves a 256px foot, i.e.
 * seven slots, so the whole team fits and "+n" is left for a foot that genuinely runs out of room.
 */
const AVATAR = 24        // the mock's foot avatar
const AVATAR_GAP = 8     // --om-spacing-2, the mock's gap
const FOOT_SLOTS = 7     // the mock's 288px card: (256 − 24 button − 8 gap) / 32 — and wherever the foot cannot be measured
const avatarSlotsFor = (width: number) => (width <= 0 ? FOOT_SLOTS : Math.max(1, Math.floor((width - AVATAR - AVATAR_GAP) / (AVATAR + AVATAR_GAP))))

function KanbanCard({
  lead, now, query, unseen = false, onKebabDelete, onKebabReturn, onAssign, onDragToStage, boardRef, onNameClick, onTaskClick, pendingDrop, canDrop, onDropBlocked, canDelete = true,
}: {
  lead: LeadRow
  /** (REG-607, parity Q-41) Only Owners and Admins delete: the card menu drops the item for everyone else. */
  canDelete?: boolean
  now: number
  query: string
  /** A new lead nobody has seen yet (REG-131): the table row's 4px primary band on the card's left edge (parity sweep, REG-194). */
  unseen?: boolean
  onKebabDelete: (lead: LeadRow) => void
  onKebabReturn: (lead: LeadRow) => void
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
  const [menuSide, setMenuSide] = useState<'down' | 'up'>('down')   // measured on open: the column body clips a menu below its bottom edge
  const [lifted, setLifted] = useState(false)   // the card's slot placeholder while its ghost is out
  const cardEl = useRef<HTMLDivElement>(null)
  const footEl = useRef<HTMLDivElement>(null)
  const [avatarSlots, setAvatarSlots] = useState(FOOT_SLOTS)
  const firstTask = lead.tasks[0]
  const overdue = lead.tasks.some((t) => isOverdue(t.dueAt, now))
  const extra = lead.tasks.length - 1
  /* (REG-275) A card carries fewer fields than a table row, so a hit that lands off the name is the hardest to
     explain here: emphasise it in the meta line (phone · budget · source) and the task line too. Guarded on a
     non-empty query — with the box empty the card renders the plain strings it always did. */
  const q = query.trim()
  const hit = (text: string): ReactNode => (q ? highlightMatch(text, q) : text)
  /** Phones match digits-to-digits (lib/search.ts), so they need the digit-aware pass. */
  const hitPhone = (text: string): ReactNode => (q ? highlightPhone(text, q) : text)

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
  useEffect(() => {
    const el = footEl.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // Measured in the observer, never in render — the foot re-slots when the column takes up board slack.
    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? 0
      if (w > 0) setAvatarSlots(avatarSlotsFor(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Everything the foot fits, or the last slot becomes the "+n" box (same rule as the overview FILES card).
  const shownAssignees = lead.assignees.length <= avatarSlots ? lead.assignees : lead.assignees.slice(0, Math.max(1, avatarSlots - 1))
  const restAssignees = lead.assignees.length - shownAssignees.length

  return (
    <motion.div
      ref={cardEl}
      layoutId={lead.id}
      className={styles.card}
      data-kb-row data-kb-id={lead.id} data-kb-href={`/leads/${lead.id}`}
      data-lifted={lifted || undefined}
      data-unseen={unseen || undefined}
      transition={spring.settle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
      onClickCapture={(e) => { if (dragged.current) { dragged.current = false; e.preventDefault(); e.stopPropagation() } }}
    >
      <div className={styles.cardData}>
      <div className={styles.cardHead}>
        <span className={styles.cardName} role="link" tabIndex={0} data-kb-open
              onClick={() => onNameClick(lead)}
              onKeyDown={(e) => e.key === 'Enter' && onNameClick(lead)}
              style={{ cursor: 'pointer' }}>
          {hit(lead.name)}
        </span>
        <span className={styles.cardMetaRight}>
          <span className={styles.cardAgo}>{relativeTime(lead.updatedAt, new Date(now))}</span>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Tooltip label="More actions" disabled={menuOpen}>
              <button type="button" className={styles.cardKebab} aria-label={`More actions for ${lead.name}`}
                      aria-haspopup="menu" aria-expanded={menuOpen}
                      onClick={(e) => {
                        // (REG-286) The ONE shared rule (components/leads/menu-side.ts), as every row kebab now uses:
                        // flip above the trigger only when the scrolling column body would clip this 1- or 2-item menu
                        // below AND there is room for it above. Was a local copy with a worst-case 100px constant.
                        setMenuSide(menuSideFor(e.currentTarget, (canDelete ? 1 : 0) + (canReturnLead(lead) ? 1 : 0)))
                        setMenuOpen((o) => !o)
                      }}>
                <Icon name="more_vert" size={20} weight={300} />
              </button>
            </Tooltip>
            <Dropdown open={menuOpen} onClose={() => setMenuOpen(false)} align="right" side={menuSide} sheetTitle={lead.name}>
              {canDelete ? <DropdownItem tone="danger" onSelect={() => { setMenuOpen(false); onKebabDelete(lead) }}>Delete</DropdownItem> : null}
              {canReturnLead(lead) ? (
                /* Same rule as the table row menu (REG-139): Return Lead only for Qanvast-sourced leads with no return processing / approved */
                <DropdownItem onSelect={() => { setMenuOpen(false); onKebabReturn(lead) }}>Return Lead</DropdownItem>
              ) : null}
            </Dropdown>
          </span>
        </span>
      </div>
      <div className={styles.cardMeta}>
        <span>{hitPhone(lead.phone)}</span><span>·</span>
        <span>{hit(moneySGD(lead.budgetMinor))}</span><span>·</span>
        <span>{hit(lead.source)}</span>
        {lead.stage === 'On Hold' && lead.onHoldFollowUp ? <><span>·</span><span>On hold till: {hit(displayDate(new Date(lead.onHoldFollowUp)))}</span></> : null}
      </div>
      </div>
      {firstTask ? (
        <button type="button" className={styles.cardTask} aria-label={`Tasks for ${lead.name}`} data-drag-ok
                onClick={(e) => onTaskClick(lead, e.currentTarget)}>
          <span className={styles.cardTaskText}>{hit(firstTask.title)}</span>
          {overdue ? <Tag color="red" appearance="outlined">Overdue</Tag> : null}
          {extra > 0 ? <Tag appearance="outlined">{`+${extra}`}</Tag> : null}
        </button>
      ) : (
        /* Same affordance as the table's TASKS cell (REG-44 → REG-90): a task-less lead can still receive tasks from the board */
        <button type="button" className={styles.assignLink} aria-label={`Add a task for ${lead.name}`}
                onClick={(e) => onTaskClick(lead, e.currentTarget)}>
          <Icon name="add" size={20} />
          Add task
        </button>
      )}
      <div className={styles.cardDivider} />
      <div className={styles.cardFoot} ref={footEl}>
        {lead.assignees.length === 0 ? (
          <button type="button" className={styles.assignLink} onClick={(e) => onAssign(lead, e.currentTarget)}>
            <Icon name="person_add" size={20} />
            Assign
          </button>
        ) : (
          <>
            {shownAssignees.map((m) => (
              <Avatar key={m.id} name={m.name} color={m.color} size={24} />
            ))}
            {/* Assignees the measured foot cannot hold: the table's "+n" box (table.tsx / REG-195). */}
            {restAssignees > 0 ? <span className={styles.plusBox}>+{restAssignees}</span> : null}
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
  rows, query, now, unseenIds, stageScope = null, filtering = false, onClearSearch, onKebabDelete, onKebabReturn, onAssign, onDragToStage, onNameClick, onTaskClick, pendingDrop = null, canDrop, onDropBlocked, canDelete = true,
}: {
  rows: LeadRow[]
  /** (REG-607) */
  canDelete?: boolean
  query: string
  now: number
  /** Leads nobody has opened or clicked yet — their cards carry the primary band (REG-131, REG-194). */
  unseenIds?: Set<string>
  /** Pill scope (780:20043): only this stage's column and its band render. */
  stageScope?: Stage | null
  /** Filters modal has active groups: empty columns show the no-results block, not the drop hint. */
  filtering?: boolean
  onClearSearch: () => void
  onKebabDelete: (lead: LeadRow) => void
  onKebabReturn: (lead: LeadRow) => void
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
    <motion.div ref={boardRef} className={styles.board} layoutScroll data-kb-list="lead">   {/* (REG-713) J / K walk the cards column by column */}
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
          /* flex '1 0 auto': the band passes any board slack down to its columns (a scoped board, or the other
             band collapsed) and never shrinks, so the full 7-column board keeps its drawn width and scrolls. */
          <div key={band.label} style={{ display: 'flex', gap: 8, minHeight: 0, flex: '1 0 auto' }}>
            <button type="button" className={styles.rail} data-tone={band.tone}
                    aria-expanded
                    onClick={() => setCollapsed((c) => ({ ...c, [band.label]: true }))}>
              <Icon name="left_panel_close" size={20} weight={300} />
              <span className={styles.railLabel}><span className={styles.railDot} />{band.label}</span>
            </button>
            {band.stages.map((stage, i) => {
              // (REG-286) `allByStage` already buckets every row by stage just above, and the column renders that
              // bucket — the head count re-scanned the whole `rows` array once PER COLUMN for the same number
              // (7 columns × every lead, on every board render). The bucket's own length is that number.
              const leads = allByStage.get(stage) ?? []
              const total = leads.length
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
                        <KanbanCard key={lead.id} lead={lead} now={now} query={query} boardRef={boardRef} unseen={unseenIds?.has(lead.id)}
                                    onKebabDelete={onKebabDelete} onKebabReturn={onKebabReturn} onAssign={onAssign}
                                    onDragToStage={onDragToStage} onNameClick={onNameClick} onTaskClick={onTaskClick} pendingDrop={pendingDrop}
                                    canDrop={canDrop} onDropBlocked={onDropBlocked} canDelete={canDelete} />
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
    {/* Edge pagers (user 2026-08-29): mouse users page the board by whole columns. The wrapper generates no box
        (display: contents) — it is the handle mobile uses to drop them for the swipe board (REG-269). */}
    <div className={styles.pagers}>
      <ScrollPagers scrollRef={boardRef} fades={false} step={(w) => Math.max(COLUMN_STEP, Math.floor((w * 0.7) / COLUMN_STEP) * COLUMN_STEP)} labels={['Scroll columns left', 'Scroll columns right']} />
    </div>
    </div>
  )
}
