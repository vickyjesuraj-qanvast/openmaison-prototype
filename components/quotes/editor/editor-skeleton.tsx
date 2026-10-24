'use client'

import { useSearchParams } from 'next/navigation'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { EditorHeadGhost } from '@/components/shell/editor-head-ghost'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { SECTION_KEYS } from '@/lib/quotes/sections'
import bar from '@/components/quotes/screen/screen-bar.module.css'
import styles from './editor-skeleton.module.css'

/**
 * Ghost for the quote editor (1260:31139): the 76px header (back · crumb + title + three chips · Send · Preview · three
 * icon squares), the tab strip, then the General Info card with its eight field bones and the Items card's head, beside
 * the collapsed Create strip — the editor's own layout, never the lead frame (page-checklist › Load & refresh). (REG-708) The header is
 * the editors' shared header ghost, on the header's own classes, so a phone wraps it as the real one wraps.
 * (Quotes on the move, P-01 · P-02 — 2026-10-22) At ≤1024 the page is the Quote screen, the section list or a section screen, by the
 * address (`?edit=`): the ghost draws that shape — the loader (streamed, so it ships both and the stylesheet picks by width) and the
 * reveal (the same component) alike, as REG-708 asks.
 */
export function EditorSkeleton() {
  const edit = useSearchParams().get('edit')
  const shape: 'read' | 'list' | 'section' = edit === null ? 'read' : edit === '1' || !(SECTION_KEYS as readonly string[]).includes(edit) ? 'list' : 'section'
  return (
    <GhostSheet label="Loading quote">
      <div className={`${styles.page} ${styles.desk}`}>
        <EditorHeadGhost crumb={180} title={196} chips={[60, 62, 48, 108]} status={76} primary={54} spans={false} foldable={[36, 76, 36]} />
        <div className={styles.tabs}>
          {[82, 62, 128, 34, 156, 118, 68, 54].map((w, i) => <Bone key={i} w={w} h={20} />)}
        </div>
        <div className={styles.body}>
          <div className={styles.main}>
            <div className={styles.card} data-open>
              <div className={styles.cardHead}>
                <Bone w={112} h={24} />
                <Bone w={84} h={36} r={4} />
              </div>
              <div className={styles.grid}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w="100%" h={48} r={4} />)}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <Bone w={90} h={24} />
                <Bone w={420} h={36} r={4} />
              </div>
            </div>
          </div>
          <div className={styles.strip}>
            <Bone w={20} h={20} r={4} />
            {[0, 1, 2].map((i) => <Bone key={i} w={24} h={24} r={4} />)}   {/* (pending modules S04) Maison AI · Price book · Templates — Brand Catalog left the strip */}
          </div>
        </div>
      </div>
      <div className={`${styles.page} ${styles.touch}`} data-shape={shape}>
        {shape === 'read' ? <ReadGhost /> : (
          /* (responsive audit 2026-10-23, W5-13) a landscape tablet draws the list pane and the open section side by side (General info
             while none is picked) — the page's split; elsewhere the address shows one of the two (editor-skeleton.module.css `.split`) */
          <div className={styles.split} data-open={shape}>
            <div className={styles.splitPane}><ListGhost /></div>
            <div className={styles.splitMain}><SectionGhost k={shape === 'section' ? edit ?? 'general' : 'general'} /></div>
          </div>
        )}
      </div>
    </GhostSheet>
  )
}

/** The 56 bar: a leading icon, the title over its line, the trailing controls. */
function BarGhost({ title = 150, sub = 190, trailing = ['icon'] as ('icon' | number)[] }: { title?: number; sub?: number; trailing?: ('icon' | number)[] }) {
  return (
    <div className={`${bar.bar} ${styles.bar}`}>
      <span className={bar.ctl}><Slot kind="icon" /></span>
      <div className={bar.text}><Line w={title} lh={24} h={16} /><Line w={sub} lh={20} h={12} /></div>
      <div className={bar.trailing}>{trailing.map((t, i) => (t === 'icon' ? <span key={i} className={bar.ctl}><Slot kind="icon" /></span> : <Slot key={i} kind="btn" w={t} />))}</div>
    </div>
  )
}

/** (P-01) The Quote screen's shape: the hero, the Next line, the document's folds, the foot. */
function ReadGhost() {
  return (
    <>
      <BarGhost />
      <div className={styles.screenBody}>
        <div className={styles.hero}>
          <div className={styles.heroTop}><Slot kind="btn" w={89} /><Line w={140} lh={20} h={12} /></div>
          <Bone w={180} h={28} r={4} />
          <Line w={240} lh={20} h={12} />
          <div className={styles.heroClient}><Slot kind="avatar40" /><div className={styles.heroText}><Line w={130} lh={24} h={14} /><Line w={96} lh={20} h={12} /></div><Slot kind="icon" /><Slot kind="icon" /></div>
        </div>
        <div className={styles.next}><Slot kind="icon" /><div className={styles.heroText}><Line w="92%" lh={24} h={14} /><Line w="60%" lh={24} h={14} /></div></div>
        <div className={styles.docHead}><Line w={48} lh={20} h={12} /><Slot kind="btn" w={110} /></div>
        <div className={styles.fold} data-open>
          <div className={styles.foldHead}><Line w={110} lh={24} h={14} /><Line w={52} lh={20} h={12} /><Line w={76} lh={24} h={14} /><Slot kind="icon" /></div>
          {[0, 1, 2].map((i) => <div key={i} className={styles.readCard}><div className={styles.heroText}><Line w="80%" lh={24} h={14} /><Line w="40%" lh={20} h={12} /></div><Line w={64} lh={24} h={14} /></div>)}
        </div>
        {[0, 1].map((i) => <div key={i} className={styles.fold}><div className={styles.foldHead}><Line w={96 + i * 24} lh={24} h={14} /><Line w={52} lh={20} h={12} /><Line w={76} lh={24} h={14} /><Slot kind="icon" /></div></div>)}
        <div className={styles.total}><Line w={40} lh={24} h={14} /><Line w={92} lh={24} h={16} /></div>
        {[0, 1, 2].map((i) => <div key={i} className={styles.fold}><div className={styles.foldHead}><div className={styles.heroText}><Line w={120 + i * 20} lh={24} h={14} /><Line w={160} lh={20} h={12} /></div><Slot kind="icon" /></div></div>)}
      </div>
      <div className={styles.foot}><Bone w="100%" h={48} r={4} /><Bone w="100%" h={48} r={4} /></div>
    </>
  )
}

/** (P-02) The section list's shape. */
function ListGhost() {
  return (
    <>
      <BarGhost title={96} sub={170} trailing={[52]} />
      <div className={styles.rows}>
        {([[108, 220], [60, 140], [136, 100], [48, 110], [170, 190], [128, 160], [84, 180]] as [number, number][]).map(([t, s], i) => (
          <div key={i} className={styles.row}><div className={styles.heroText}><Line w={t} lh={24} h={14} /><Line w={s} lh={20} h={12} /></div><Slot kind="icon" /></div>
        ))}
      </div>
    </>
  )
}

/** (P-02) A section screen's shape: the bar with the section's own controls, then its body. */
function SectionGhost({ k }: { k: string }) {
  const title = { general: 108, items: 60, payment: 136, files: 48, terms: 170, notes: 128, signature: 84 }[k] ?? 100
  const trailing: ('icon' | number)[] = k === 'items' ? ['icon', 'icon', 'icon'] : k === 'payment' ? [160] : k === 'files' ? [96] : k === 'terms' || k === 'notes' ? ['icon'] : []
  return (
    <>
      <BarGhost title={title} sub={k === 'items' ? 150 : 0} trailing={trailing} />
      <div className={styles.sectionBody}>
        {k === 'general' ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w="100%" h={48} r={4} />)
          : k === 'items' ? (
            <>
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.readCard}><div className={styles.heroText}><Line w={i % 2 ? '60%' : '82%'} lh={24} h={14} /><Line w="40%" lh={20} h={12} /></div><Line w={64} lh={24} h={14} /></div>)}
              {/* (K2) the phone's Items are the cards with the pinned totals foot — Subtotal · GST · Total, Adjust · Breakdown */}
              <div className={styles.pinnedFoot}>
                <div className={styles.footLines}>{[['Subtotal', 72], ['GST 9%', 48], ['Total', 84]].map(([l, w]) => <div key={String(l)} className={styles.footLine}><Line w={56} lh={20} h={12} /><Line w={Number(w)} lh={24} h={14} /></div>)}</div>
                <div className={styles.footActs}><Slot kind="btn" w={88} /><Slot kind="btn" w={104} /></div>
              </div>
            </>
          )
          : k === 'payment' ? [0, 1, 2, 3].map((i) => <div key={i} className={styles.readCard}><div className={styles.heroText}><Line w={110} lh={24} h={14} /><Line w={160} lh={20} h={12} /></div><Line w={40} lh={24} h={14} /><Line w={76} lh={24} h={14} /></div>)
          : k === 'files' ? <div className={styles.tiles}>{[0, 1].map((i) => <Bone key={i} w="100%" h={183} r={8} />)}</div>
          : k === 'signature' ? [0, 1].map((i) => <Bone key={i} w="100%" h={140} r={8} />)
          : <Bone w="100%" h={320} r={4} />}
      </div>
    </>
  )
}
