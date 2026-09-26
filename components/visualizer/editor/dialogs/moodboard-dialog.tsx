'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { catalogueItem } from '@/lib/visualizer/catalogue'
import { useSheetLayout } from '@/components/om/sheet'
import type { VersionView } from '@/lib/visualizer/model'
import { extractPalette } from '@/lib/visualizer/engine/palette'
import { loadImg } from '@/lib/visualizer/engine/run'
import { finishBoard, finishGroups, finishName, pieceFacts, type Labels } from './version-facts'
import dialogs from './dialogs.module.css'
import styles from './moodboard.module.css'
import { useEdgeFade } from './use-edge-fade'

const FINISH: Record<string, string> = { matte: 'Matte', satin: 'Satin', gloss: 'Gloss', textured: 'Textured', natural: 'Natural grain' }

/**
 * A version's moodboard (REG-683; the studios' sheet row 46, Hi Reno: "ability to create a moodboard"): the render, the finishes it
 * carries as swatches with their names (a wallpaper wears its motif), the pieces restyled, the style and the light, and the five colours
 * the picture reads as — one page to print or save as PDF for the client's file, or to send with the link.
 * (audit 2026-09-26) A version built on another names every finish it carries — where it goes, and each piece by name (F075: `labels` is
 * the room's reading); a wallpaper's chip is the tile the engine paints (F087); the print is the render at its own height (F088); on a
 * phone the footer's words shorten so all three fit (F141).
 */
export function MoodboardDialog({ open, onClose, version, room, title, studio, onShare, labels }: {
  open: boolean; onClose: () => void; version: VersionView | null; room: string; title: string; studio: string; onShare: () => void
  /** The room's reading (surfaces and furniture by id) — how an inherited finish finds its surface's name. */
  labels?: Labels
}) {
  const phone = useSheetLayout()
  const [palette, setPalette] = useState<{ key: string; hex: string[] } | null>(null)
  const key = version ? `${version.key}|${version.imageUrl.slice(-40)}` : null
  /* (round 3) the side column fades at an edge with more beyond it, as Present's does — it was cut hard on a 768-tall tablet */
  const sideRef = useRef<HTMLElement | null>(null)
  useEdgeFade(sideRef, open && !phone, `${key}|${palette?.hex.length ?? 0}`)
  useEffect(() => {
    if (!open || !version || !key) return
    let alive = true
    loadImg(version.imageUrl).then((img) => { if (alive) setPalette({ key, hex: extractPalette(img).map((p) => p.hex) }) }).catch(() => {})
    return () => { alive = false }
  }, [open, version, key])
  if (!version) return null
  /* (verify round 1) a design named after its room ("Sample · Living room") is not followed by the room again */
  const heading = title.trim().toLowerCase().endsWith(room.trim().toLowerCase()) ? title : `${title} · ${room}`
  const surfaces = finishGroups(version, labels)
  const pieces = pieceFacts(version, labels)
  const colours = palette && palette.key === key ? palette.hex : []
  const print = () => {
    document.body.dataset.printBoard = '1'
    const done = () => { delete document.body.dataset.printBoard; window.removeEventListener('afterprint', done) }
    window.addEventListener('afterprint', done)
    window.print()
    setTimeout(done, 1500)
  }
  return (
    <Dialog open={open} onClose={onClose} title={`Moodboard · ${room} · V${version.n}`} size="modal" fluid
            footer={<div className={dialogs.footRow}>
              <Button appearance="outlined" variant="secondary" iconStart={<Icon name="print" size={20} weight={300} />} onPress={print} aria-label="Print or save as PDF">{phone ? 'Print' : 'Print or save as PDF'}</Button>
              <Button appearance="outlined" variant="secondary" iconStart={<Icon name="send" size={20} weight={300} />} onPress={onShare} aria-label="Share with client">{phone ? 'Share' : 'Share with client'}</Button>
              <Button onPress={onClose}>Done</Button>
            </div>}>
      <div className={styles.board} data-board="" data-testid="viz-moodboard">
        <div className={styles.picture}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={version.imageUrl} alt={`${room} · V${version.n}`} />
        </div>
        <aside ref={sideRef} className={styles.side}>
          <div className={styles.titleBlock}><span className={styles.eyebrow}>{studio}</span><h2 className={styles.title}>{heading}</h2><span className={styles.sub}>V{version.n} · {version.descriptor}</span></div>
          {surfaces.length ? (
            <section className={styles.section}><span className={styles.head}>Finishes</span>
              <div className={styles.swatches}>
                {surfaces.map(({ finish: s, where }) => {
                  const c = catalogueItem(s.materialId)
                  /* where it goes · its kind · its finish — the kind once, even when nothing names where it goes */
                  const sub = [where.join(', ') || null, c?.category ?? null, FINISH[s.finish] ?? s.finish].filter((x, i, all): x is string => !!x && all.indexOf(x) === i).join(' · ')
                  return (
                    <div key={s.materialId} className={styles.swatch}>
                      <span className={styles.chip} style={{ background: finishBoard(s) }} />
                      <span className={styles.swName}>{finishName(s.name)}</span>
                      <span className={styles.swSub}>{sub}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
          {pieces.length ? (
            <section className={styles.section}><span className={styles.head}>Pieces</span>
              <ul className={styles.list}>{pieces.map((p, i) => <li key={i}><b>{p.what}</b> — {p.to}</li>)}</ul>
            </section>
          ) : null}
          {version.finishes.style || version.finishes.lighting ? (
            <section className={styles.section}><span className={styles.head}>Look and light</span>
              <ul className={styles.list}>{version.finishes.style ? <li><b>Style</b> — {version.finishes.style}</li> : null}{version.finishes.lighting ? <li><b>Lighting</b> — {version.finishes.lighting}</li> : null}</ul>
            </section>
          ) : null}
          <section className={styles.section}><span className={styles.head}>The colours it reads as</span>
            <div className={styles.palette}>{colours.length ? colours.map((h) => <span key={h} className={styles.colour}><span style={{ background: h }} /><b>{h}</b></span>) : <span className={styles.sub}>Reading the picture…</span>}</div>
          </section>
        </aside>
      </div>
    </Dialog>
  )
}
