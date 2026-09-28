'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useRunUndo, useSnackbar } from '@/components/om/snackbar'
import { Keys, usePlatform } from '@/components/om/keys'
import { openNotifications } from '@/components/shell/notifications-panel'
import { GO, keyDef } from '@/lib/keys/registry'
import { alternatives, keysPlain } from '@/lib/keys/spec'
import { flagOn, markUsed, mouseUse, openShortcuts, runHandler, SINGLE_KEYS, tipShown, toggleShortcuts, useShortcutsOpen } from '@/lib/keys/store'
import { withFrom } from '@/lib/nav'
import {
  currentList, isTyping, isVisible, keepTrail, layerOpen, leadStep, marked, MODAL, outOfReach, ownsArrows, ownsKeys, press, readTrail,
  rowsOf, tabRow, tabsOf, toggle, wordsOf,
} from './dom'
import { ShortcutsPanel } from './shortcuts-panel'
import styles from './shortcuts.module.css'

/**
 * (REG-711…716) The keyboard, once for every page — mounted by `AppShell` and by the editors' layout, never on the client's pages
 * (signing, confirmation, a render link: Q-22). One guard for every key (the reading found each key checking its own way, Q-24):
 *  - never while typing (a field, a text editor, input-method composing) — except ⌘/, ⌘↵, ⌘S, which make sense there;
 *  - an open modal or menu owns the keyboard; a widget that answers its own keys (a grid, a slider, `data-kb-own`) keeps them;
 *  - single-character keys obey the switch in the ? panel (WCAG 2.1.4); arrows, ↵, Esc and ⌘ keys always work.
 * Letters listen first (capture): a focused DS button is a react-aria pressable that can stop a key's travel. Keys a component may
 * answer itself (⌘Z, arrows, ↵, ⌫, Esc) listen last and stand down when it did.
 */
const LETTER: Record<string, string> = { c: 'create', f: 'filters', v: 'view', m: 'move-stage', a: 'assign', e: 'edit', p: 'preview' }
const INTERACTIVE = 'button, a[href], [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="switch"], input, select, textarea, summary'
const isInteractive = (t: EventTarget | null) => t instanceof Element && t !== document.body && !!t.closest(INTERACTIVE)
type Cursor = { id: string | null; index: number }
const noSubscribe = () => () => {}
/** Tips for the keys a control answers — not Esc's back and clear, which are not pressed "on" a control. */
const TIPPABLE = new Set(['create', 'filters', 'view', 'move-stage', 'assign', 'edit', 'preview', 'delete', 'search'])

export function ShortcutsLayer({ editor = false }: { editor?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const snackbar = useSnackbar()
  const runUndo = useRunUndo()
  const open = useShortcutsOpen()
  const platform = usePlatform()
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false)   // overlays are the browser's; the server draws none

  /* the list's cursor — the row J / K / ↑ / ↓ stand on; a new page starts without one (render-phase adjust) */
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [cursorPath, setCursorPath] = useState(pathname)
  if (cursorPath !== pathname) { setCursorPath(pathname); if (cursor) setCursor(null) }
  const cursorRef = useRef<Cursor | null>(null)
  useEffect(() => { cursorRef.current = cursor }, [cursor])

  /* G then … */
  const [chord, setChord] = useState(false)
  const [hint, setHint] = useState(false)
  const chordRef = useRef(false)
  const timers = useRef<{ end?: ReturnType<typeof setTimeout>; hint?: ReturnType<typeof setTimeout> }>({})
  const endChord = useCallback(() => {
    chordRef.current = false; setChord(false); setHint(false)
    clearTimeout(timers.current.end); clearTimeout(timers.current.hint)
  }, [])
  const startChord = useCallback(() => {
    chordRef.current = true; setChord(true)
    timers.current.hint = setTimeout(() => setHint(true), 420)   // a fluent G L never sees the hint
    timers.current.end = setTimeout(() => { chordRef.current = false; setChord(false); setHint(false) }, 1600)
  }, [])

  /* the cursor's row, found again on every read — rows re-render under it */
  const cursorRow = useCallback((): HTMLElement | null => {
    const c = cursorRef.current
    const list = currentList()
    if (!c || !list) return null
    const rows = rowsOf(list)
    return (c.id ? rows.find((r) => r.dataset.kbId === c.id) : undefined) ?? rows[c.index] ?? null
  }, [])

  /* a tip, once the page is free of dialogs and menus (never over one, Q-08) */
  const tip = useCallback((id: string, message: React.ReactNode) => {
    let tries = 0
    const tryShow = () => {
      if (layerOpen() || document.querySelector('[role="dialog"]:not([data-kb-panel])')) { if ((tries += 1) < 150) setTimeout(tryShow, 400); return }
      tipShown(id)
      snackbar({ key: 'kb-tip', message, actionLabel: 'All shortcuts', onAction: openShortcuts })
    }
    setTimeout(tryShow, 600)
  }, [snackbar])

  useEffect(() => {
    const fire = (id: string) => markUsed(id)
    const single = () => flagOn(SINGLE_KEYS)

    const moveCursor = (d: 1 | -1): boolean => {
      const list = currentList()
      if (!list) return false
      const rows = rowsOf(list)
      if (!rows.length) return false
      const now = cursorRow()
      const at = now ? rows.indexOf(now) : -1
      const i = at < 0 ? 0 : Math.min(rows.length - 1, Math.max(0, at + d))
      const r = rows[i]!
      setCursor({ id: r.dataset.kbId ?? null, index: i })
      r.scrollIntoView({ block: 'nearest' })
      /* focus left on a toolbar button would take the ↵ meant for the row */
      const a = document.activeElement
      if (a instanceof HTMLElement && a !== document.body && !list.contains(a) && !a.closest('[data-kb-panel]')) a.blur()
      return true
    }
    const step = (d: 1 | -1, arrow: boolean): boolean => {
      if (moveCursor(d)) { fire(d > 0 ? 'list.next' : 'list.prev'); return true }
      if (arrow) return false
      const href = leadStep(d)
      if (href) {
        const from = new URLSearchParams(location.search).get('from') ?? readTrail()?.from
        fire(d > 0 ? 'lead.next' : 'lead.prev')
        router.push(from ? withFrom(href, from) : href)
        return true
      }
      if (/^\/leads\/[^/]+/.test(location.pathname) && readTrail()) {
        snackbar({ key: 'kb-end', message: d > 0 ? 'That was the last lead in the list' : 'That was the first lead in the list' })
        return true
      }
      return false
    }
    const act = (id: string): boolean => {
      if (runHandler(id)) { fire(id); return true }
      const el = marked(id, cursorRow())
      if (!el) return false
      if (id === 'view') {
        const other = el.querySelector<HTMLElement>('[aria-pressed="false"], [role="radio"][aria-checked="false"], [aria-selected="false"]')
        if (!other || !press(other)) return false
      } else if (!press(el)) return false
      fire(id)
      return true
    }
    const tab = (n: number): boolean => {
      const row = tabRow()
      const t = row ? tabsOf(row)[n - 1] : undefined
      if (!t || !press(t)) return false
      fire('tabs'); return true
    }
    const goTo = (c: string) => {
      const g = GO.find((x) => x.key === c)
      if (!g) return
      fire(g.id)
      if (g.href) router.push(g.href)
      else openNotifications()
    }

    /* letters, numbers, ? — first, before a focused control can swallow them */
    const onCapture = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return
      const t = e.target
      const typing = isTyping(t)
      if (!typing && !document.documentElement.hasAttribute('data-hw-keyboard')) document.documentElement.setAttribute('data-hw-keyboard', '')
      const mod = e.metaKey || e.ctrlKey
      if (mod && !e.altKey && (e.key === '/' || e.key === '?')) { e.preventDefault(); toggleShortcuts(); fire('shortcuts'); return }
      if (mod || e.altKey || typing || e.key.length !== 1 || e.key === ' ') return
      if (chordRef.current) { e.preventDefault(); e.stopPropagation(); endChord(); goTo(e.key.toLowerCase()); return }
      if (layerOpen() || ownsKeys(t) || !single()) return
      if (t instanceof Element && t.closest('[role="dialog"]:not([data-kb-panel])')) return   // a drawer or popover in use keeps its keys
      const k = e.key, c = k.toLowerCase()
      let done = false
      if (k === '?') { toggleShortcuts(); fire('shortcuts'); done = true }
      else if (c === 'g') { startChord(); done = true }
      else if (/^[1-9]$/.test(k)) done = tab(Number(k))
      else if (c === 'j' || c === 'k') done = step(c === 'j' ? 1 : -1, false)
      else if (c === 'x') { const r = cursorRow(); done = !!r && toggle(r.querySelector<HTMLElement>('[data-kb-select]')); if (done) fire('list.select') }
      else if (LETTER[c]) done = act(LETTER[c]!)
      if (done) { e.preventDefault(); e.stopPropagation() }
    }

    /* the keys a component may answer itself — last, and only when it did not */
    const onBubble = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return
      const t = e.target, mod = e.metaKey || e.ctrlKey, typing = isTyping(t)
      if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
        /* ⌘Z: the Undo on screen — after an editor's own ⌘Z has had its turn (it marks the key handled) */
        setTimeout(() => { if (!e.defaultPrevented && runUndo()) fire('undo') }, 0)
        return
      }
      if (e.defaultPrevented) return
      if (mod && !e.altKey && e.key === 'Enter') {
        /* ⌘↵ in a dialog: its primary button — the last one in the footer */
        const top = Array.from(document.querySelectorAll<HTMLElement>(MODAL)).filter(isVisible).pop()
        const buttons = top ? Array.from(top.querySelectorAll<HTMLElement>('[data-dialog-foot] button')).filter((b) => isVisible(b) && !(b as HTMLButtonElement).disabled && b.getAttribute('aria-disabled') !== 'true') : []
        const primary = buttons[buttons.length - 1]
        if (primary) { e.preventDefault(); primary.click(); fire('layer.save') }
        return
      }
      if (editor && mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('om:save-now'))
        snackbar({ key: 'kb-save', message: 'Saved — everything saves as you type' })
        fire('save')
        return
      }
      if (layerOpen()) return
      if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'a' && !typing && !ownsKeys(t)) {
        const all = currentList()?.querySelector<HTMLElement>('[data-kb-select-all]')
        if (all && toggle(all)) { e.preventDefault(); fire('list.all') }
        return
      }
      if (mod || e.altKey || typing) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (ownsArrows(t) || (t instanceof Element && t.closest('[role="dialog"]:not([data-kb-panel])'))) return
        if (step(e.key === 'ArrowDown' ? 1 : -1, true)) e.preventDefault()
        return
      }
      if (e.key === 'Enter') {
        const r = cursorRow()
        if (!r || isInteractive(t)) return
        e.preventDefault()
        const list = currentList()
        if (list) keepTrail(list)
        const target = r.querySelector<HTMLElement>('[data-kb-open]') ?? r
        /* a file tile opens on a double-click (its single click ticks it) — the key does what opening does */
        if (target.dataset.kbOpen === 'dblclick') target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }))
        else press(target)
        fire('list.open')
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (ownsKeys(t) || isInteractive(t)) return
        const d = marked('delete')
        if (d && press(d)) { e.preventDefault(); fire('delete') }
        return
      }
      if (e.key === 'Escape') {
        if (chordRef.current) { endChord(); return }
        if (cursorRef.current) { setCursor(null); return }
        if (typing || document.querySelector('[role="dialog"]:not([data-kb-panel])')) return
        const clear = marked('clear')
        if (clear && press(clear)) { fire('clear'); return }
        const back = marked('back')
        if (back && press(back)) fire('back')
      }
    }

    /* the mouse did what a key does: the third time earns one tip (Q-08); a row opened from a list keeps the list for J / K */
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0 || !(e.target instanceof Element)) return
      const t = e.target
      const row = t.closest('[data-kb-row]')
      const list = row?.closest<HTMLElement>('[data-kb-list]')
      if (list) keepTrail(list)
      const tabEl = t.closest<HTMLElement>('[data-kb-tabs] [role="tab"]')
      if (tabEl) {
        const tabs = tabsOf(tabEl.closest<HTMLElement>('[data-kb-tabs]')!)
        const n = tabs.indexOf(tabEl) + 1
        if (n >= 1 && n <= 9 && mouseUse('tabs')) tip('tabs', <>Next time, press <Keys spec={`#${n}`} tone="inverse" /> for {wordsOf(tabEl)}.</>)
        return
      }
      const el = t.closest<HTMLElement>('[data-kb]')
      const id = el?.dataset.kb
      const def = id ? keyDef(id) : undefined
      if (!el || !def || el.closest('[data-kb-panel]') || !(TIPPABLE.has(id!) || id!.startsWith('go.'))) return
      if (!mouseUse(id!)) return
      const words = id!.startsWith('go.') ? GO.find((g) => g.id === id)?.label ?? wordsOf(el) : wordsOf(el)
      tip(id!, <>Next time, press <Keys spec={alternatives(def.keys)[0]} tone="inverse" /> for {words}.</>)
    }

    window.addEventListener('keydown', onCapture, true)
    window.addEventListener('keydown', onBubble)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('keydown', onCapture, true)
      window.removeEventListener('keydown', onBubble)
      document.removeEventListener('click', onClick, true)
    }
  }, [editor, router, snackbar, runUndo, cursorRow, startChord, endChord, tip])

  /* the ? panel pushes the page aside from 1280 (app-shell.module.css), so the keys it lights stay in view */
  useEffect(() => {
    document.documentElement.toggleAttribute('data-kb-open', open)
    return () => document.documentElement.removeAttribute('data-kb-open')
  }, [open])

  /* the cursor's outline and the lit keys follow the page as it scrolls, every frame they are on screen */
  const cursorBox = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!cursor) return
    let raf = 0
    const tick = () => {
      const el = cursorBox.current, r = cursorRow(), list = currentList()
      if (el) {
        if (!r || !list) el.style.display = 'none'
        else {
          const a = r.getBoundingClientRect(), clip = list.getBoundingClientRect()
          const top = Math.max(a.top, clip.top, 0), bottom = Math.min(a.bottom, clip.bottom, window.innerHeight)
          const left = Math.max(a.left, clip.left), right = Math.min(a.right, clip.right)
          if (bottom - top < 4 || right - left < 4) el.style.display = 'none'
          else Object.assign(el.style, { display: 'block', top: `${top}px`, left: `${left}px`, width: `${right - left}px`, height: `${bottom - top}px` })
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cursor, cursorRow])

  const tipsBox = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    let raf = 0, last = 0
    let targets: { el: HTMLElement; text: string }[] = []
    /* on screen and on top: the point at its centre is the control (or inside it) */
    const inView = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2, y = r.top + r.height / 2
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false
      const hit = document.elementFromPoint(x, y)
      return !!hit && (el === hit || el.contains(hit) || hit.contains(el))
    }
    const collect = () => {
      const out: { el: HTMLElement; text: string }[] = []
      const cur = cursorRow()
      document.querySelectorAll<HTMLElement>('[data-kb]').forEach((el) => {
        if (!isVisible(el) || outOfReach(el)) return
        if (el.closest('[data-kb-row]') && !(cur && cur.contains(el))) return   // one row's controls, not every row's
        const d = keyDef(el.dataset.kb ?? '')
        if (!d) return
        if (el.dataset.kb === 'back' || el.dataset.kb === 'clear') return   // Esc is not a key you press "on" a control
        if (!inView(el)) return   // a control the panel, a dialog or the page's own chrome covers wears nothing
        out.push({ el, text: keysPlain(alternatives(d.keys)[0]!, platform) })
      })
      const tabs = tabRow()
      if (tabs) tabsOf(tabs).slice(0, 9).forEach((el, i) => { if (inView(el)) out.push({ el, text: String(i + 1) }) })
      targets = out
    }
    const tick = (now: number) => {
      const box = tipsBox.current
      if (box) {
        if (now - last > 250) { collect(); last = now }
        while (box.children.length < targets.length) box.appendChild(document.createElement('span'))
        Array.from(box.children).forEach((s, i) => {
          const span = s as HTMLSpanElement, tgt = targets[i]
          if (!tgt) { span.style.display = 'none'; return }
          const r = tgt.el.getBoundingClientRect()
          if (span.textContent !== tgt.text) span.textContent = tgt.text
          span.style.display = r.width ? 'inline-flex' : 'none'
          span.style.left = `${Math.min(window.innerWidth - 8, r.right) }px`
          span.style.top = `${Math.max(4, r.top)}px`
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const box = tipsBox.current
    return () => { cancelAnimationFrame(raf); if (box) box.replaceChildren() }
  }, [open, platform, cursorRow])

  return (
    <>
      <ShortcutsPanel editor={editor} />
      {mounted && createPortal(
        <>
          {cursor ? <div ref={cursorBox} className={styles.cursor} aria-hidden /> : null}
          {open ? <div ref={tipsBox} className={styles.tips} aria-hidden /> : null}
          {chord && hint ? (
            <div className={styles.chord} role="status">
              <Keys spec="g" tone="inverse" /><span className={styles.then}>then</span>
              {GO.map((g) => <span key={g.key} className={styles.place}><Keys spec={g.key} tone="inverse" />{g.label}</span>)}
            </div>
          ) : null}
        </>,
        document.body,
      )}
    </>
  )
}
