'use client'

import { useEffect, useMemo, useState, useSyncExternalStore, type ComponentProps, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useSnackbar, useSnackbarDismiss } from '@/components/om/snackbar'
import { useBookDemo } from '@/components/site/book-demo'
import { SIGN_UP } from '@/lib/site/model'
import { carryTrialRoom, dropTrialRoom } from '@/lib/visualizer/trial/carry'
import { TRIAL_WORDS } from '@/lib/visualizer/trial/content'
import type { TrialTool } from '@/lib/visualizer/trial/policy'
import { pictureReader } from '../editor/picture-reader'
import type { TrialEditor as Editor, TrialRoom } from './trial-editor'
import { TrialStart } from './trial-start'

const noStore = () => () => {}
/** Where sign-up comes from (S31's page says the photo comes along). */
export const FROM_TRIAL = 'try'
/* the editor and the engine, loaded once — when a room is opened, or ahead of it once the start is idle */
let editorP: Promise<typeof import('./trial-editor')> | null = null
let openP: Promise<typeof import('./trial-open')> | null = null
const loadEditor = () => (editorP ??= import('./trial-editor').catch((e) => { editorP = null; throw e }))
const loadOpen = () => (openP ??= import('./trial-open').catch((e) => { openP = null; throw e }))
const COULDNT = 'Couldn’t open the AI Visualizer — please try again'

/**
 * (pending modules S36) The trial's page, in the browser: the start, then — once a photo or a sample room is in — the AI Visualizer over the
 * whole screen (portalled out of the site's frame, the site behind it set inert). The room lives here alone; leaving it (Start over) takes it
 * and its renders away (1.0: "Your renders aren't saved in the free trial"). `left` — the renders this browser has left, as the server's
 * signed count said on the page's first paint; every later figure is the server's own answer to a render. The editor and the engine load
 * only when wanted (the start says "Opening…" meanwhile), so the website's page stays light.
 */
export function TrialVisualizer({ tool, left: left0, botSiteKey }: { tool: TrialTool | null; left: number; botSiteKey: string | null }) {
  const router = useRouter()
  const snack = useSnackbar()
  const unsnack = useSnackbarDismiss()
  const bookDemo = useBookDemo()
  const mounted = useSyncExternalStore(noStore, () => true, () => false)
  const [left, setLeft] = useState(left0)
  const [room, setRoom] = useState<TrialRoom | null>(null)
  const [TrialEditor, setEditor] = useState<ComponentType<ComponentProps<typeof Editor>> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const reader = useMemo(() => pictureReader(snack, unsnack), [snack, unsnack])
  /* once the start has drawn and the browser is idle, the editor's code comes ahead of the first press */
  useEffect(() => {
    const go = () => { void loadOpen().catch(() => {}); void loadEditor().catch(() => {}) }
    const w = window as Window & { requestIdleCallback?: (f: () => void) => number; cancelIdleCallback?: (n: number) => void }
    if (w.requestIdleCallback) { const n = w.requestIdleCallback(go); return () => w.cancelIdleCallback?.(n) }
    const t = window.setTimeout(go, 1500); return () => window.clearTimeout(t)
  }, [])
  const show = async (make: () => Promise<TrialRoom | null>) => {
    const [ed, r] = await Promise.all([loadEditor(), make()])
    if (!r) return
    setEditor(() => ed.TrialEditor)
    setRoom(r)
  }

  /* the visitor's own photo: read in this browser at a web size (HEIC on every browser); nothing is sent anywhere */
  const openFile = async (f: File) => {
    if (busy || !reader.okPhoto(f)) return
    setBusy('upload')
    try {
      const url = await reader.readPicture(f, 1600); if (!url) return
      dropTrialRoom()   // a photo waiting for a new studio was the one before this
      await show(async () => (await loadOpen()).uploadRoom(url, f.name))
    } catch { snack({ message: COULDNT }) }
    finally { setBusy(null) }
  }
  const openSample = async (key: string, asSketch: boolean) => {
    if (busy) return
    setBusy(`${key}${asSketch ? ':sketch' : ''}`)
    try { await show(async () => (await loadOpen()).sampleRoom(key, asSketch)) } catch { snack({ message: TRIAL_WORDS.loadFailed }) }
    finally { setBusy(null) }
  }

  /* while the editor owns the screen, the site behind it is out of reach (its bar, the page, the footer) — but not the snackbar's host,
     nor a dialog opened over the editor (Book a demo arrives after this ran) */
  useEffect(() => {
    if (!room) return
    const frame = document.querySelector('.om-site')
    const behind = frame ? [...frame.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !el.hasAttribute('data-om-snackbar')) : []
    for (const el of behind) el.inert = true
    return () => { for (const el of behind) el.inert = false }
  }, [room])

  const leave = () => {
    dropTrialRoom()
    setRoom(null)
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="trial-upload"]')?.focus({ preventScroll: true }))
  }
  /* Start your studio: the visitor's own photo goes with them (lib/visualizer/trial/carry.ts); a sample room every studio has already */
  const start = () => {
    if (room?.upload) carryTrialRoom({ name: room.name, dataUrl: room.imageUrl })
    else dropTrialRoom()
    router.push(`${SIGN_UP}?from=${FROM_TRIAL}`)
  }

  return (
    <>
      <TrialStart tool={tool} left={left} busy={busy} onFile={(f) => { void openFile(f) }} onSample={(k, sk) => { void openSample(k, sk) }} />
      {/* (the developers' seam, lib/visualizer/trial/server.ts setBotCheck) where Turnstile's widget mounts — only once a real check is plugged in */}
      {botSiteKey ? <div id="trial-bot-check" data-sitekey={botSiteKey} hidden /> : null}
      {room && TrialEditor && mounted ? createPortal(
        <TrialEditor key={room.id} room={room} tool={tool} left={left} onLeft={setLeft} onLeave={leave} onNewPhoto={(f) => { void openFile(f) }}
                     onOpenSketch={() => { void openSample('kitchen', true) }} onStart={start} onBookDemo={bookDemo} />,
        document.body,
      ) : null}
    </>
  )
}
