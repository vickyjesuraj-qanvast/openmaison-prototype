'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useMediaQuery } from '@/lib/breakpoint'
import styles from './topbar.module.css'

/** (F004) At 1280 and below the bar's two wide buttons fold to their icons, so the rooms keep the room they need. */
const SNUG = '(max-width: 1280px)'

/**
 * The editor's top bar (REG-673; the template editor's bar, REG-542, with 1.0's room tabs, B-28): back · the design's name and whose it
 * is · the rooms as chips (the active one's ⋯ renames, changes the photo, deletes) and Add room · the save stamp · undo / redo · Share
 * with client · the design's ⋯. (audit 2026-09-26) The room on screen is always scrolled into view (F004 · F149); a long name reads in
 * full on its tooltip (F013); ≤1280 Add room is its icon (F004) and Share a filled "Share" (UX audit V4); compact, the title takes the free
 * width (F148).
 * (the calm UI build 2026-10-27, 6-04 · 6-08 · 6-19) Generate is the screen's one filled button, so Share is the house's outlined secondary at
 * every width (a link to send is the next step, never a state); the "LEAD · MET" chip beside the name goes — a chip is for a status, and
 * whose design it is the name (a lead's design is named after the lead) and Back ("Back to Kevin Ng") already say.
 */
export function EditorTopbar({ backLabel, onBack, title, chip = null, rooms, roomId, onRoom, onRoomMenu, roomMenuOpen, onAddRoom, saving, savedLabel, savedTone = 'ok', canUndo, canRedo, onUndo, onRedo, onShare, shareDisabled, onMenu, menuOpen, compact, short = false, credits = null }: {
  backLabel: string; onBack: () => void
  /** What the design is ("Lead · Met", "Project · P-2026-001", "Studio’s own"). (6-08) No longer a chip beside the name — it rides the name's
      tooltip, so the project's number is still one hover away in the editor. */
  title: string; chip?: string | null
  rooms: { id: string; name: string }[]; roomId: string | null; onRoom: (id: string) => void
  /** (REG-719) a room's ⋯, inside its chip — the menu is that room's */
  onRoomMenu: (id: string, el: HTMLElement) => void; roomMenuOpen: boolean
  onAddRoom: () => void
  saving: boolean; savedLabel: string | null
  /** `warn` — the label says the work isn't saved (retrying, or changed elsewhere). */
  savedTone?: 'ok' | 'warn'
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void
  onShare: () => void; shareDisabled: string | null
  onMenu: (el: HTMLElement) => void; menuOpen: boolean
  compact: boolean
  /** (wave E, E3) a phone on its side: the same bar, 44 tall — the photo gets the height. */
  short?: boolean
  /** (REG-701, Q-09) The balance chip — the editor has no rail, and this is where most credits go. */
  credits?: ReactNode
}) {
  const snug = useMediaQuery(SNUG)
  const suffix = / \(\d+\)$/.exec(title)?.[0] ?? null
  const roomsRef = useRoomInView(roomId)
  const saved = saving ? <><Icon name="progress_activity" size={16} weight={300} className={styles.spin} /> Saving…</>
    : savedLabel ? <><Icon name={savedTone === 'warn' ? 'error' : 'check_circle'} size={16} weight={300} className={savedTone === 'warn' ? styles.warnIcon : styles.savedIcon} /> {savedLabel}</> : null
  return (
    <header className={styles.bar} data-compact={compact || undefined} data-short={short || undefined} data-testid="viz-topbar">
      <Tooltip label={backLabel}><IconButton icon="arrow_back" label={backLabel} size={36} variant="bare" iconSize={24} iconWeight={300} onClick={onBack} data-testid="viz-back" /></Tooltip>
      <div className={styles.titles}>
        {/* (phone-5) a name made unique by its number ("Design · 26 Sep (2)") keeps the number when the bar cuts it — the stem gives way */}
        <Tooltip label={chip ? `${title} · ${chip}` : title}><h1 className={styles.title} data-split={suffix ? '' : undefined}>{suffix ? <><span className={styles.titleStem}>{title.slice(0, -suffix.length)}</span><span className={styles.titleTail}>{suffix}</span></> : title}</h1></Tooltip>
      </div>
      {!compact ? (
        <div className={styles.rooms}>
          {rooms.length ? (
            <div ref={roomsRef} className={styles.railWrap}>
              <ChipRail label="Rooms" className={styles.rail}>
                <Chips className={styles.roomChips} label="Rooms" options={rooms.map((r) => ({ value: r.id, label: r.name }))} value={roomId} onChange={onRoom} testId="viz-rooms"
                       trail={(id, on) => <RoomMore name={rooms.find((r) => r.id === id)?.name ?? ''} on={on} open={on && roomMenuOpen} className={styles.roomMore} onPress={(el) => onRoomMenu(id, el)} />} />
              </ChipRail>
            </div>
          ) : null}
          {snug ? <Tooltip label="Add room"><IconButton icon="add_photo_alternate" label="Add room" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onAddRoom} data-testid="viz-add-room" /></Tooltip>
            : <Button variant="secondary" appearance="outlined" onPress={onAddRoom} iconStart={<Icon name="add_photo_alternate" size={20} weight={300} />} data-testid="viz-add-room">Add room</Button>}
        </div>
      ) : null}
      <div className={styles.end}>
        <span className={styles.saved} data-tone={savedTone} aria-live="polite" data-testid="viz-saved">{saved}</span>
        {!compact ? (
          <>
            <Tooltip label="Undo" keys="mod+z"><IconButton icon="undo" label="Undo" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!canUndo} onClick={onUndo} /></Tooltip>
            <Tooltip label="Redo" keys="mod+shift+z"><IconButton icon="redo" label="Redo" size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!canRedo} onClick={onRedo} /></Tooltip>
            <span className={styles.rule} />
          </>
        ) : null}
        {credits}
        {/* (UX audit V4, supersedes F004's icon) the step that ends the meeting stays a labelled button — "Share" where the bar is tight
            (≤1280, the tablet and the phone), never a grey glyph that reads as disabled. (the calm UI build 2026-10-27, 6-04) outlined: Generate
            is the one filled button on the screen */}
        <Tooltip label={shareDisabled ?? 'Send the client a link to these versions'}>
          <span>{compact || snug ? <Button variant="secondary" appearance="outlined" onPress={onShare} isDisabled={!!shareDisabled} iconStart={<Icon name="send" size={20} weight={300} />} aria-label="Share with client" className={styles.share} data-testid="viz-share">Share</Button>
            : <Button variant="secondary" appearance="outlined" onPress={onShare} isDisabled={!!shareDisabled} iconStart={<Icon name="send" size={20} weight={300} />} data-testid="viz-share">Share with client</Button>}</span>
        </Tooltip>
        <Tooltip label="More options" disabled={menuOpen}><IconButton icon="more_vert" label="Design options" size={36} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => onMenu(e.currentTarget)} data-testid="viz-design-menu" /></Tooltip>
      </div>
    </header>
  )
}

/**
 * (F004 · F149) Keeps the room on screen in view in its chip rail — after Add room, a room picked from a link, Undo of a delete — not
 * only after a press. The first placement is instant (the page doesn't slide in on open); later ones glide. (round 2) It is a callback
 * ref, so a row that mounts later (the camera model's rooms row, after the layout switch) is placed too, and a row that changes width (a
 * window resized, a phone turned) puts the chip back in view.
 */
export function useRoomInView(roomId: string | null): (el: HTMLElement | null) => void {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const placed = useRef(false)
  useEffect(() => {
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    showActiveChip(el, placed.current && !reduce ? 'smooth' : 'instant')
    placed.current = true
  }, [el, roomId])
  useEffect(() => {
    const box = el?.firstElementChild ?? el
    if (!el || !box) return
    let raf = 0
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => showActiveChip(el, 'instant')) })
    ro.observe(box)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [el])
  return setEl
}

/** Scrolls the rail sideways only (never a folding row's own box, as scrollIntoView would) so the active chip clears the pagers (44). */
function showActiveChip(row: HTMLElement, behavior: ScrollBehavior) {
  const chip = row.querySelector<HTMLElement>('[role=radio][aria-checked="true"]'); if (!chip) return
  let scroller: HTMLElement | null = chip.parentElement
  while (scroller && scroller !== row && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowX)) scroller = scroller.parentElement
  if (!scroller || scroller === row) return
  const pad = 44, c = chip.getBoundingClientRect(), r = scroller.getBoundingClientRect()
  const dx = c.left < r.left + pad ? c.left - r.left - pad : c.right > r.right - pad ? c.right - r.right + pad : 0
  if (Math.abs(dx) >= 1) scroller.scrollTo({ left: scroller.scrollLeft + dx, behavior })
}

/**
 * (REG-719, owner 2026-09-28: "this contextual menu popover is confusing since it's placed outside the each room container … better to move
 * inside the container for each room") A room's ⋯, inside the room's own chip: the menu it opens is that room's (Rename · Change photo ·
 * Delete room); pressing it on another room picks that room first. The picked room's ⋯ is the one Tab stop; the others are reached
 * through their chips.
 */
export function RoomMore({ name, on, open, className, onPress }: { name: string; on: boolean; open: boolean; className?: string; onPress: (el: HTMLElement) => void }) {
  return (
    <Tooltip label="Room options" disabled={open}>
      <IconButton icon="more_horiz" label={`Options for ${name}`} size={24} variant="bare" iconSize={20} className={className}
                  aria-haspopup="menu" aria-expanded={open} tabIndex={on ? 0 : -1} onClick={(e) => onPress(e.currentTarget)} />
    </Tooltip>
  )
}
