'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { anchoredSurface } from '@/lib/motion'
import menuStyles from '../menus.module.css'
import styles from './fields.module.css'

/** Anchored menu rendered through a body portal so scroll containers (modal
 *  bodies, wizard panels) cannot clip it. Flips upward when the viewport has
 *  no room below. Esc is CONSUMED (preventDefault) so overlay hosts that
 *  check e.defaultPrevented leave their surface open. */
export function PortalMenu({
  open, anchor, onClose, align = 'left', width, children, role = 'listbox',
}: {
  open: boolean
  anchor: RefObject<HTMLElement | null>
  onClose: () => void
  align?: 'left' | 'right'
  width?: number
  children: ReactNode
  role?: string
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Position via callback ref (runs before paint) — measured-DOM styling
  // without a state round-trip.
  const place = useCallback((el: HTMLDivElement | null) => {
    menuRef.current = el
    if (!el || !anchor.current) return
    const r = anchor.current.getBoundingClientRect()
    const w = width ?? r.width
    const left = align === 'right' ? r.right - w : r.left
    const spaceBelow = window.innerHeight - r.bottom
    el.style.left = `${left}px`
    el.style.width = `${w}px`
    if (spaceBelow < 340 && r.top > spaceBelow) {
      el.style.bottom = `${window.innerHeight - r.top + 4}px`
      el.style.top = 'auto'
      el.style.transformOrigin = 'bottom left'
    } else {
      el.style.top = `${r.bottom + 4}px`
      el.style.bottom = 'auto'
      el.style.transformOrigin = 'top left'
    }
  }, [anchor, align, width])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchor.current?.contains(t) || menuRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    const onScroll = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return
      onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [open, onClose, anchor])

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={place}
          className={menuStyles.menu}
          role={role}
          variants={anchoredSurface} initial="initial" animate="animate" exit="exit"
          style={{ position: 'fixed', zIndex: 130, maxHeight: 320, overflowY: 'auto' }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

/** Floating-label field (h-48) — text input or select trigger. */
export function FloatingField({
  label,
  value,
  placeholder,
  onChange,
  trailingIcon = 'expand_more',
  options,
  onInputClick,
  readOnly,
  error,
}: {
  label: string
  value: string
  placeholder?: string
  onChange?: (v: string) => void
  /** Pass null to render no trailing icon (plain text fields). */
  trailingIcon?: string | null
  /** When provided, the field behaves as a select with this option menu. */
  options?: string[]
  onInputClick?: () => void
  readOnly?: boolean
  error?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isSelect = !!options
  return (
    <div className={`${styles.field} ${styles.select}`} ref={ref}>
      <div
        className={styles.box}
        data-error={error || undefined}
        data-open={(isSelect && open) || undefined}
        onClick={() => { if (isSelect) setOpen((o) => !o); onInputClick?.() }}
        role={isSelect ? 'button' : undefined}
        aria-expanded={isSelect ? open : undefined}
      >
        <span className={styles.label}>{label}</span>
        {isSelect || readOnly ? (
          <span className={styles.value} style={!value ? { color: 'var(--om-color-on-surface-secondary)' } : undefined}>
            {value || placeholder || ' '}
          </span>
        ) : (
          <input
            className={styles.value}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
          />
        )}
        {trailingIcon ? <span className={styles.trail}><Icon name={trailingIcon} size={16} /></span> : null}
      </div>
      {isSelect ? (
        <PortalMenu open={open} anchor={ref} onClose={() => setOpen(false)}>
          {options.map((o) => (
            <button key={o} type="button" role="option" aria-selected={o === value}
                    className={menuStyles.item}
                    onClick={() => { onChange?.(o); setOpen(false) }}>
              {o}
            </button>
          ))}
        </PortalMenu>
      ) : null}
    </div>
  )
}

export function ChoiceChips({
  options, value, onChange, label,
}: { options: readonly string[]; value: string | null; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <span className={styles.mutedLabel}>{label}</span>
      <div className={styles.chips} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={o === value}
                  className={styles.chip} data-selected={o === value || undefined}
                  onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SectionRow({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className={styles.rowBetween}>
      <span className={styles.sectionLabel}>{label}</span>
      {action}
    </div>
  )
}

export function LinkButton({ icon, children, onClick }: { icon?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={styles.link} onClick={onClick}>
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  )
}

export function Divider() {
  return <div className={styles.divider} />
}

export function FileTile({ name, image, onDelete }: { name: string; image?: boolean; onDelete: () => void }) {
  return (
    <div className={styles.tile}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.tileImg} src="/figma-assets/chat-screenshot-thumb.png" alt="" />
      ) : null}
      <div className={styles.tileRow}>
        <span className={styles.tilePdf}><Icon name="picture_as_pdf" size={20} /></span>
        <span className={styles.tileName}>{name}</span>
        <button type="button" className={styles.tileDel} aria-label={`Remove ${name}`} onClick={onDelete}>
          <Icon name="delete" size={24} weight={300} />
        </button>
      </div>
    </div>
  )
}

export function NotesArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      className={styles.notes}
      placeholder="Enter your notes"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Notes"
    />
  )
}

export function Dropzone({ title, helper, onPick }: { title: ReactNode; helper: string; onPick: () => void }) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={styles.dropzone}
      data-over={over || undefined}
      onClick={onPick}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onPick() }}
      role="button"
      aria-label="Upload file"
    >
      <span className={styles.dropTitle}>{title}</span>
      <span className={styles.dropHelper}>{helper}</span>
    </div>
  )
}
