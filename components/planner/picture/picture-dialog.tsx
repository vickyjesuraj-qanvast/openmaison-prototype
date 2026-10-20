'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog, FootStart } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { clipExtension, clipType, recordCanvas } from '@/lib/visualizer/spatial/clip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { withFrom } from '@/lib/nav'
import type { PlanDoc } from '@/lib/planner/model'
import { LOOKS, clipFileName, lookLabel, pictureFileName, type Look } from '@/lib/planner/photo'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import { savePlannerPicture } from '@/app/planner/photo-actions'
import { ThreeView, type ThreeHandle } from '../scene/three-view'
import styles from './picture-dialog.module.css'

/**
 * (pending modules S28 — card studio:floorplan-isometric-ai, "Two looks, Dollhouse and Top-down, and a download") **3D picture** — the layout
 * as 1.0's tool drew it, by the 3D Space Planner instead of an image model: **Dollhouse** (from the front, 45° down, the outer walls square to the
 * frame and cut low so every room shows at once — 1.0's angled cutaway) or **Top-down** (straight down, north up, as the plan reads). Live: a drag turns the
 * dollhouse, a scroll zooms, so the studio frames it before it goes. **Download** saves the frame as a PNG (1.0's one way out); **Save to
 * Files** keeps it in the client's Files › Renders, the house's place for pictures; **Render in AI Visualizer** hands the frame to the
 * Visualizer as a room photo (REG-1658's door), where a photographic look is made and its own price applies. Nothing is charged here —
 * 1.0's tool charged none.
 */
export function PictureDialog({ open, onClose, plan, library, name, layoutId, client, onVisualize, visualizing = false, furnished = null }: {
  open: boolean
  onClose: () => void
  /** the plan on screen — the level being looked at */ plan: PlanDoc
  library: LibraryMaterial[]
  name: string
  layoutId: string
  /** the client whose Files it can be kept in — none for a personal layout or a template */ client: { name: string } | null
  onVisualize: (shot: string) => void
  visualizing?: boolean
  /** the rooms Make the 3D picture furnished on its way here — said in the picture, with its Undo */ furnished?: { rooms: number; onUndo: () => void } | null
}) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const three = useRef<ThreeHandle>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [look, setLook] = useState<Look>('dollhouse')
  const [saving, setSaving] = useState(false)
  /* (S42 D·1 — S41's proposal "Download a turning clip", built as recommended — his "build all of them" 2026-10-11, listed in
     s42/calls-for-vicky.md) the Dollhouse on a turntable, one whole turn, recorded in this browser from the planner's own drawing (the bench's
     Orbit clip, lib/visualizer/spatial/clip.ts) and downloaded — a short video to send a client on WhatsApp. Nothing is invented and nothing
     is charged; a browser that can't record says so in the row. */
  const [clipping, setClipping] = useState<{ until: number } | null>(null)
  const [left, setLeft] = useState(0)
  const session = useRef(0)
  const canRecord = useSyncExternalStore(noSub, () => clipType() !== null, () => true)
  useEffect(() => { if (!open) session.current++ }, [open])   // a clip still recording when the picture closes is dropped, never downloaded
  useEffect(() => {
    if (!clipping) return
    const id = window.setInterval(() => setLeft(Math.max(0, Math.ceil((clipping.until - Date.now()) / 1000))), 250)
    return () => window.clearInterval(id)
  }, [clipping])
  const recordClip = async () => {
    const canvas = stage.current?.querySelector('canvas') ?? null
    if (!canvas || clipping) { if (!canvas) snackbar({ message: 'Couldn’t draw the picture — please try again' }); return }
    const me = ++session.current
    setClipping({ until: Date.now() + TURN_SECONDS * 1000 }); setLeft(TURN_SECONDS)
    try {
      const clip = await recordCanvas(canvas, TURN_SECONDS)
      if (session.current !== me) { URL.revokeObjectURL(clip.url); return }
      const a = document.createElement('a'); a.href = clip.url; a.download = clipFileName(name, clipExtension(clip.type)); document.body.appendChild(a); a.click(); a.remove()
      window.setTimeout(() => URL.revokeObjectURL(clip.url), 60_000)
      snackbar({ key: 'planner-picture', message: 'Turning clip downloaded' })
    } catch (e) {
      if (session.current === me) snackbar({ message: couldnt('record the clip', e instanceof Error ? e.message.replace(/\.$/, '') : null) })
    } finally {
      if (session.current === me) { setClipping(null); three.current?.fit() }
    }
  }
  const shot = () => three.current?.capture() ?? null
  const download = () => {
    const url = shot()
    if (!url) { snackbar({ message: 'Couldn’t draw the picture — please try again' }); return }
    const a = document.createElement('a'); a.href = url; a.download = pictureFileName(name, look); a.click()
    snackbar({ key: 'planner-picture', message: `${lookLabel(look)} picture downloaded` })
  }
  const save = async () => {
    if (saving || !client) return
    const url = shot()
    const data = url ? await jpegOf(url) : null
    if (!data) { snackbar({ message: 'Couldn’t draw the picture — please try again' }); return }
    setSaving(true)
    try {
      const r = await savePlannerPicture(layoutId, { data, look })
      if ('error' in r) { snackbar({ message: couldnt('save it to Files', r.error) }); return }
      const href = r.projectId ? `/projects/${r.projectId}/files/${r.fileId}` : `/leads/${r.leadId}/files/${r.fileId}`
      const here = typeof window === 'undefined' ? '/planner' : `${window.location.pathname}${window.location.search}`
      snackbar({ key: 'planner-picture', message: `Saved to ${client.name}’s Files › Renders as “${r.name}”`, actionLabel: 'Open', onAction: () => router.push(withFrom(href, here)) })
    } catch (e) { snackbar({ message: couldnt('save it to Files', refusalOf(e)) }) } finally { setSaving(false) }
  }
  const visualize = () => { const url = shot(); if (!url) { snackbar({ message: 'Couldn’t draw the picture — please try again' }); return } onVisualize(url) }
  const line = LOOKS.find((l) => l.value === look)?.line ?? ''
  return (
    <Dialog open={open} onClose={onClose} title="3D picture" subtitle={`${name} — drawn from the layout, every room furnished by the planner’s rule.`} size="modal" width={800}
            footer={<>
              <FootStart><Button variant="secondary" appearance="text" onPress={visualize} isDisabled={visualizing || !!clipping} data-testid="picture-visualize">{visualizing ? 'Opening…' : 'Render in AI Visualizer'}</Button></FootStart>
              {client ? <Button variant="secondary" appearance="outlined" onPress={() => { void save() }} isDisabled={saving || !!clipping} data-testid="picture-save">{saving ? 'Saving…' : 'Save to Files'}</Button> : null}
              <Button onPress={download} isDisabled={!!clipping} data-testid="picture-download">Download</Button>
            </>}>
      <div className={styles.body} data-testid="picture-dialog">
        <div className={styles.lookRow}>
          <Chips label="Look" options={LOOKS.map((l) => ({ value: l.value, label: l.label }))} value={look} onChange={(v) => setLook(v as Look)} disabled={!!clipping} testId="picture-look" />
          <span className={styles.line}>{line}</span>
        </div>
        <div ref={stage} className={styles.stage} data-look={look}>
          <ThreeView ref={three} plan={plan} library={library} mode="orbit" low={look === 'dollhouse'} look={look === 'top' ? 'top' : 'front'} label={`${name} — ${lookLabel(look)}`} spin={clipping ? TURN_SECONDS : 0} />
        </div>
        {look === 'dollhouse' ? (
          <div className={styles.clipRow} data-testid="picture-clip">
            <Button variant="secondary" appearance="outlined" size="sm" iconStart={<Icon name="timelapse" size={18} weight={300} />} onPress={() => { void recordClip() }} isDisabled={!!clipping || !canRecord} data-testid="picture-clip-record">
              {clipping ? `Recording… ${left} s` : 'Download a turning clip'}
            </Button>
            <span className={styles.line} role={canRecord ? undefined : 'alert'}>{!canRecord ? 'This browser can’t record a clip — try Chrome, Edge, Firefox or Safari.' : clipping ? 'One whole turn of the Dollhouse — it downloads when the turn ends.' : `One whole turn in ${TURN_SECONDS} seconds, as a video to send on WhatsApp.`}</span>
          </div>
        ) : null}
        {furnished ? (
          <p className={styles.furnished} role="status" data-testid="picture-furnished">
            <span>{`${furnished.rooms === 1 ? '1 room' : `${furnished.rooms} rooms`} furnished by the planner’s rule for the picture — move or change any piece in the layout.`}</span>
            <Button variant="secondary" appearance="text" size="sm" onPress={furnished.onUndo} data-testid="picture-unfurnish">Undo</Button>
          </p>
        ) : null}
        <p className={styles.caption}>{look === 'top' ? 'Scroll or pinch to zoom, drag to move it.' : 'Drag to turn it, scroll or pinch to zoom — the picture is what you see.'} A photographic picture is the AI Visualizer’s: Render in AI Visualizer, where its own price applies.</p>
      </div>
    </Dialog>
  )
}

/** (S42 D·1) One whole turn of the Dollhouse, in seconds — the bench's turntable (S41's Orbit clip › A 3D layout). */
const TURN_SECONDS = 12
const noSub = () => () => {}

/** The frame as a JPEG on white — a smaller file for Files than the PNG a download keeps. */
async function jpegOf(dataUrl: string): Promise<string | null> {
  try {
    const img = new Image()
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('frame')); img.src = dataUrl })
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d'); if (!g) return null
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0)
    return c.toDataURL('image/jpeg', 0.9)
  } catch { return null }
}
