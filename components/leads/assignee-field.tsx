'use client'

import { useRef, useState, type RefObject } from 'react'
import { Tag as TagChip } from '@/components/ds'
import type { Member } from '@/lib/db/schema'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import styles from './assignee-field.module.css'

/**
 * Assign member — a searchable, multi-select member picker for the Lead form (user 2026-08-31, REG-231).
 *
 * No mock draws this field, so nothing here is invented from nothing: the box is the project's `TextField`, the
 * dropdown is `PortalMenu` (the only anchored surface that clears the modal's z 100 and is not clipped by its
 * scrolling body), the rows are the Assign popover's own vocabulary — Avatar 40 · name · role with "(you)" — and the
 * picked members read as the tag picker's outlined chips.
 *
 * Multi-select, because `lead_assignees` is many-to-many and every other assignment surface is: a single-select would
 * silently drop the second assignee of any lead opened and saved here.
 */
export function AssigneeField({ team, value, onChange, error, inputRef }: {
  team: Member[]
  /** Member ids, in pick order. */
  value: string[]
  onChange: (ids: string[]) => void
  error?: string
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  const wrap = useRef<HTMLDivElement | null>(null)
  const ownInput = useRef<HTMLInputElement | null>(null)
  const input = inputRef ?? ownInput

  // Render-phase adjust (never setState in an effect): each opening starts from an empty search.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setQuery('')
  }

  const q = query.trim().toLowerCase()
  const matches = q ? team.filter((m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)) : team
  const picked = team.filter((m) => value.includes(m.id))

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
    input.current?.focus()   // the list stays open for a second pick, as the tag picker does
  }

  return (
    <div className={styles.wrap} data-field="assignees" ref={wrap}>
      <TextField
        label="Assign member"
        value={query}
        onChange={setQuery}
        placeholder="Search members"
        error={error}
        inputRef={input}
        open={open}
        onFocus={() => setOpen(true)}
        trailingIcon={null}
        trailing={<span data-chev><Icon name="expand_more" size={20} weight={300} /></span>}
        /* The picked members live INSIDE the box, under the search row (user 2026-08-31), as the tag picker's do. */
        below={picked.length > 0 ? picked.map((m) => (
          <button key={m.id} type="button" className={styles.chip} aria-label={`Remove ${m.name}`}
                  onClick={() => onChange(value.filter((v) => v !== m.id))}>
            <TagChip appearance="outlined" iconEnd={<Icon name="close" size={12} />}>{m.name}</TagChip>
          </button>
        )) : null}
      />

      {/* Anchored to the WRAPPER, so the list opens below the chips rather than through them. */}
      <PortalMenu open={open} anchor={wrap} onClose={() => setOpen(false)}>
        {matches.length === 0 ? (
          <p className={styles.noMatch}>No members match “{query.trim()}”.</p>
        ) : matches.map((m) => {
          const on = value.includes(m.id)
          return (
            <button key={m.id} type="button" role="option" aria-selected={on} className={styles.row}
                    onClick={() => toggle(m.id)}>
              <Avatar name={m.name} color={m.color} size={40} />
              <span className={styles.rowText}>
                <span className={styles.rowName}>{m.name}</span>
                <span className={styles.rowRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
              </span>
              {/* A glyph, not a DS Checkbox: an option must not nest a second control (the tag picker's rule). */}
              <Icon name={on ? 'check_box' : 'check_box_outline_blank'} size={20} fill={on}
                    className={on ? styles.checkOn : styles.check} />
            </button>
          )
        })}
      </PortalMenu>
    </div>
  )
}
