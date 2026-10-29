'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SearchBar, Switch } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { Keys, usePlatform } from '@/components/om/keys'
import { useFlagPref } from '@/lib/prefs'
import { keysPlain } from '@/lib/keys/spec'
import { closeShortcuts, FIRED, SINGLE_KEYS, TIPS, useKeysVersion, useShortcutsOpen, usedKeys } from '@/lib/keys/store'
import { allGroups, liveGroups, type Group } from './dom'
import styles from './shortcuts.module.css'

/**
 * (REG-711 · Q-01…Q-04 · Q-09 · Q-20) The ? panel — the one home for every key. ? or ⌘/ opens it beside the page (the house non-modal
 * drawer): the page keeps working and its own buttons wear their keys (the layer lights them), so a key can be tried with the list open —
 * its row flashes, and a key you have used keeps a tick. It opens on what this page answers, then Everywhere; "All pages" lists every
 * key by where it applies. The foot holds the two switches, per browser: single-key shortcuts (WCAG 2.1.4) and tips.
 */
export function ShortcutsPanel({ editor }: { editor: boolean }) {
  const open = useShortcutsOpen()
  const version = useKeysVersion()
  const pathname = usePathname()
  const platform = usePlatform()
  const [scope, setScope] = useState<'here' | 'all'>('here')
  const [q, setQ] = useState('')
  const [single, setSingle] = useFlagPref(SINGLE_KEYS, true)
  const [tips, setTips] = useFlagPref(TIPS, true)

  /* the page changes under the open panel (a dialog closes, a tab loads) — read it again, a beat after it settles */
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!open) return
    let t: ReturnType<typeof setTimeout> | undefined
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => setTick((n) => n + 1), 250) })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { clearTimeout(t); mo.disconnect() }
  }, [open])

  /* a key pressed with the panel out lights its row */
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null)
  useEffect(() => {
    if (!open) return
    let t: ReturnType<typeof setTimeout> | undefined
    const on = (e: Event) => { const id = (e as CustomEvent<string>).detail; setFlash((f) => ({ id, n: (f?.n ?? 0) + 1 })); clearTimeout(t); t = setTimeout(() => setFlash(null), 1100) }
    window.addEventListener(FIRED, on)
    return () => { clearTimeout(t); window.removeEventListener(FIRED, on) }
  }, [open])

  const groups = useMemo<Group[]>(() => {
    void version; void tick; void pathname; void single
    return open ? (scope === 'all' ? allGroups() : liveGroups(editor)) : []
  }, [open, scope, editor, version, tick, pathname, single])
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? groups.map((g) => ({ ...g, rows: g.rows.filter((r) => r.label.toLowerCase().includes(needle) || keysPlain(r.keys, platform).toLowerCase().includes(needle)) })).filter((g) => g.rows.length)
    : groups
  const used = usedKeys()
  const here = scope === 'here' ? groups.filter((g) => g.key !== 'layer').flatMap((g) => g.rows) : []   // (Vicky 2026-10-29: brought back) the meter's rows
  const usedHere = here.filter((r) => used.has(r.id)).length

  return (
    <Drawer open={open} title="Keyboard shortcuts" label="Keyboard shortcuts" onClose={closeShortcuts} width="narrow" kbPanel
            actions={<Keys spec="?" className={styles.headKeys} />}
            footer={
              <div className={styles.switches}>
                <div className={styles.switchRow}>
                  <span className={styles.switchText}>
                    {/* (the calm UI build 2026-10-27 — the audit's 1-36, W-053 · W-057) plain words for the two switches */}
                    <span className={styles.switchName}>Use single keys (C, F, J, K…)</span>
                    <span className={styles.switchHelp}>Arrows, Enter, Esc and ⌘ shortcuts always work</span>
                  </span>
                  <Switch size="sm" isSelected={single} onChange={setSingle} aria-label="Use single keys" />
                </div>
                <div className={styles.switchRow}>
                  <span className={styles.switchText}>
                    <span className={styles.switchName}>Show shortcut tips</span>
                    <span className={styles.switchHelp}>After you do the same thing 3 times with the mouse</span>
                  </span>
                  <Switch size="sm" isSelected={tips} onChange={setTips} aria-label="Show shortcut tips" />
                </div>
              </div>
            }>
      <div className={styles.panelBody}>
        <SearchBar appearance="outlined" size="md" placeholder="Find a shortcut" aria-label="Find a shortcut" value={q} onChange={setQ} className={styles.find} />
        <Chips label="Show the keys for" options={[{ value: 'here', label: 'On this page' }, { value: 'all', label: 'All pages' }]} value={scope}
               onChange={(v) => setScope(v === 'all' ? 'all' : 'here')} />
        {/* (the calm UI build 2026-10-27 — the audit's 1-36, W-063, had taken the meter off; Vicky 2026-10-29: brought back) how many of this page's
            keys you use, over the list — the tick on each row you have used stays */}
        {scope === 'here' && here.length && !needle ? (
          <div className={styles.progress} data-testid="shortcuts-meter">
            <span>You use {usedHere} of {here.length} here</span>
            <span className={styles.bar} aria-hidden><i style={{ width: `${Math.round((usedHere / here.length) * 100)}%` }} /></span>
          </div>
        ) : null}
        {shown.length ? shown.map((g) => (
          <section key={g.key} className={styles.group} aria-label={g.title}>
            <h3 className={styles.groupHead}>{g.title}</h3>
            {g.rows.map((r) => (
              <div key={`${g.key}-${r.id}`} className={styles.row} data-used={used.has(r.id) || undefined} data-off={r.off || undefined}
                   data-flash={flash && flash.id === r.id ? flash.n : undefined}>
                <Icon name="check" size={16} className={styles.tick} />
                <span className={styles.label}>{r.label}{r.off ? <span className={styles.off}> · off</span> : null}</span>
                <Keys spec={r.keys} always />   {/* (responsive audit 2026-10-23, W1) the row's keys are what it says — drawn on a touch screen too */}
              </div>
            ))}
          </section>
        )) : <p className={styles.empty}>No shortcut matches “{q.trim()}”.</p>}
      </div>
    </Drawer>
  )
}
