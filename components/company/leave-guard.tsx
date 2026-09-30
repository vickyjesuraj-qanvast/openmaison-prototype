'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog, DialogMessage, FootStart } from '@/components/om/dialog'

/**
 * (UX audit 2026-09-30, S2) Unsaved edits on a Company or Settings form are not lost to a move inside the app. While `dirty`, any
 * in-app navigation — a link, a tab, a card, the rail, a crumb, Back, the G and number keys (they press those links) — stops and asks:
 * Save · Discard · Keep editing. A press on a link is caught before Next's own handler (window, capture phase); a navigation a page
 * starts in script goes through `leaveThen(go)` (the Company panel, the module heads' buttons). A tab or a reload keeps the browser's
 * own prompt. One guard per page: the host passes what it would save and how to put it back.
 */
type Asker = { ask: (go: () => void) => void }
let active: Asker | null = null

/** Runs `go` now, or — while a form on the page holds unsaved edits — once the member has saved or discarded them. */
export function leaveThen(go: () => void) {
  if (active) active.ask(go)
  else go()
}

/** Where a press on an anchor would take the app, or null when it stays (a new tab, another site, a download, the same address). */
function destination(e: MouseEvent): string | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
  if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return null
  const url = new URL(a.href, window.location.href)
  if (url.origin !== window.location.origin) return null
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null   // the same page (a hash)
  return `${url.pathname}${url.search}${url.hash}`
}

export function LeaveGuard({ dirty, what, onSave, onDiscard }: {
  dirty: boolean
  /** What holds the edits, as the question reads it: "the company details", "the brand kit", "the quote numbers". */
  what: string
  /** Saves the edits; true when they landed (a refusal or a field's error keeps the member on the page). */
  onSave: () => Promise<boolean>
  onDiscard: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState<{ go: () => void } | null>(null)
  const [busy, setBusy] = useState(false)
  const latest = useRef({ onSave, onDiscard })
  useEffect(() => { latest.current = { onSave, onDiscard } })

  useEffect(() => {
    if (!dirty) return
    const me: Asker = { ask: (go) => setPending({ go }) }
    active = me
    const onClick = (e: MouseEvent) => {
      const to = destination(e)
      if (!to) return
      e.preventDefault(); e.stopPropagation()
      setPending({ go: () => router.push(to) })
    }
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }   // a tab or a reload: the browser's own question
    window.addEventListener('click', onClick, true)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      if (active === me) active = null
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [dirty, router])

  const keep = () => { if (!busy) setPending(null) }
  const discard = () => { const p = pending; setPending(null); latest.current.onDiscard(); p?.go() }
  const save = async () => {
    const p = pending; if (!p || busy) return
    setBusy(true)
    let ok = false
    try { ok = await latest.current.onSave() } catch { ok = false }
    setBusy(false)
    setPending(null)
    if (ok) p.go()   // a save that didn't land says why on the page (its snackbar, its fields) and the member stays
  }
  return (
    <Dialog open={!!pending} onClose={keep} title="Save your changes?" width={400} alert
            footer={<>
              <FootStart><Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={busy}>Discard</Button></FootStart>
              <Button variant="secondary" appearance="outlined" onPress={keep} isDisabled={busy}>Keep editing</Button>
              <Button onPress={() => { void save() }} isDisabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </>}>
      <DialogMessage>{`You changed ${what} and haven’t saved. Save before you go, or discard the changes.`}</DialogMessage>
    </Dialog>
  )
}
